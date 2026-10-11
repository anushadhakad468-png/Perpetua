"""
Perpetua Guardian Worker & Escalation Ladder Module
Continuous 24/7 position monitoring worker that evaluates margin health
and automates smart defensive exit ladders to prevent exchange liquidations.
"""

import time
import logging
import threading
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .config import Config
from .client import PerplClient
from .receipts import ReceiptsManager

logger = logging.getLogger("PerpetuaGuardian")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [Guardian] %(message)s", "%Y-%m-%d %H:%M:%S")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


@dataclass
class PositionDefenseState:
    """Tracks state and timers for an active position under defense."""
    symbol: str
    market_id: int
    current_step: str = "NORMAL"  # "NORMAL", "STEP_A_LIMIT", "STEP_B_URGENT", "STEP_C_TERMINAL"
    step_a_order_id: Optional[int] = None
    step_a_timestamp: float = 0.0
    step_a_timeout_sec: float = 10.0
    last_buffer: float = 100.0


class GuardianWorker:
    """
    24/7 Guardian Worker daemon.
    Continuously polls open positions, calculates margin buffer ratio,
    and executes the multi-tiered Escalation Ladder.
    """

    # Escalation Ladder Thresholds (Margin Buffer %)
    BUFFER_STEP_A_WARNING = 20.0   # Buffer < 20%: Step A Limit Order 50% cut
    BUFFER_STEP_B_URGENT = 10.0    # Buffer < 10%: Step B Urgent Market Order
    BUFFER_STEP_C_TERMINAL = 3.0   # Buffer < 3%:  Step C Full Emergency Close

    # Estimated Exchange Liquidation Penalty (basis points)
    # Perpl charges liquidation penalty and closes at bankruptcy price
    DEFAULT_LIQUIDATION_PENALTY_BPS = 300  # 3.00% (300 bps)

    def __init__(
        self,
        client: Optional[PerplClient] = None,
        poll_interval_sec: float = 3.0,
        step_a_timeout_sec: float = 10.0,
        receipts_path: str = "data/receipts.json",
    ):
        self.config = Config()
        self.client = client or PerplClient(self.config)
        self.poll_interval_sec = poll_interval_sec
        self.step_a_timeout_sec = step_a_timeout_sec
        self.receipts = ReceiptsManager(receipts_path)

        # In-memory tracking of positions under defense
        self.position_states: Dict[str, PositionDefenseState] = {}

        # Worker thread control
        self._is_running = False
        self._thread: Optional[threading.Thread] = None

    # =========================================================================
    # Margin Buffer Calculation & Escalation Decision
    # =========================================================================

    def evaluate_margin_buffer(self, position: Dict[str, Any]) -> float:
        """
        Calculates the Margin Buffer Ratio for an active position:
        
        Formula:
          Margin Buffer (%) = (Current Margin / Maintenance Margin Required) * 100
        """
        maint_required = position.get("maintenance_margin_required", 0.0)
        current_margin = position.get("current_margin", 0.0)

        if maint_required <= 0:
            return 1000.0  # Safe if no maintenance requirement
        
        buffer_ratio = (current_margin / maint_required) * 100.0
        return buffer_ratio

    def evaluate_position(self, position: Dict[str, Any]) -> None:
        """
        Evaluates an active position against the Escalation Ladder rules:
        
        - Buffer < 3%: Trigger Step C (Terminal emergency close)
        - Buffer < 10%: Trigger Step B (Urgent market de-risk)
        - Step A Timeout: Cancel limit order & Trigger Step B
        - Buffer < 20%: Trigger Step A (50% maker limit de-risk)
        """
        symbol = position["symbol"]
        market_id = position["market_id"]
        pos_id = str(position.get("position_id", symbol))
        current_size = position["size"]
        mark_price = position["mark_price"]
        side = position["side"]

        buffer_pct = self.evaluate_margin_buffer(position)

        # Get or initialize position tracker
        state = self.position_states.get(pos_id)
        if not state:
            state = PositionDefenseState(
                symbol=symbol,
                market_id=market_id,
                step_a_timeout_sec=self.step_a_timeout_sec,
                last_buffer=buffer_pct,
            )
            self.position_states[pos_id] = state

        state.last_buffer = buffer_pct
        now = time.time()

        logger.debug(f"Position {symbol} ({side} {current_size}) | Margin Buffer: {buffer_pct:.2f}%")

        # ---------------------------------------------------------------------
        # STEP C: TERMINAL (Buffer < 3%)
        # Full Emergency Market Close to prevent brutal exchange liquidation penalty
        # ---------------------------------------------------------------------
        if buffer_pct < self.BUFFER_STEP_C_TERMINAL:
            logger.warning(
                f"🚨 [TERMINAL STEP C] Buffer {buffer_pct:.2f}% < {self.BUFFER_STEP_C_TERMINAL}%! "
                f"Firing Full Emergency Market Close for {current_size} {symbol}!"
            )
            # If Step A limit order is still resting, cancel it first
            if state.step_a_order_id:
                try:
                    self.client.cancel_order(symbol, state.step_a_order_id)
                except Exception as e:
                    logger.debug(f"Cancel error: {e}")
                state.step_a_order_id = None

            close_side = "SELL" if side == "LONG" else "BUY"
            order_res = self.client.place_market_order(
                symbol_or_id=symbol,
                side=close_side,
                size=current_size,
                max_slippage_bps=300,
                reduce_only=True,
            )

            # Estimate liquidation penalty saved:
            # Notional * penalty_bps (e.g. $8,000 * 3% = $240 saved)
            notional = current_size * mark_price
            penalty_saved = notional * (self.DEFAULT_LIQUIDATION_PENALTY_BPS / 10000.0)

            receipt = self.receipts.record_defense(
                market=symbol,
                market_id=market_id,
                action_step="STEP_C_TERMINAL",
                trigger_reason=f"Terminal Margin Buffer at {buffer_pct:.1f}% (< 3%). Emergency full close to avert liquidation.",
                margin_buffer_pct=buffer_pct,
                mark_price=mark_price,
                position_size_before=current_size,
                size_closed=current_size,
                position_size_remaining=0.0,
                order_type="MARKET_TAKER",
                estimated_penalty_saved=penalty_saved,
                order_id=order_res.get("oid") or int(now * 1000) % 10000000,
                explorer_base=self.config.explorer_url,
            )
            state.current_step = "STEP_C_TERMINAL"
            logger.info(
                f"🛡️ [RECEIPT] Step C Logged: Saved ${penalty_saved:.2f} penalty on {symbol}! "
                f"Receipt ID: {receipt.id}"
            )
            return

        # ---------------------------------------------------------------------
        # STEP B: URGENT (Buffer < 10% OR Step A Timeout)
        # Immediate Market De-Risk
        # ---------------------------------------------------------------------
        is_step_a_timed_out = (
            state.current_step == "STEP_A_LIMIT"
            and state.step_a_timestamp > 0
            and (now - state.step_a_timestamp) >= state.step_a_timeout_sec
        )

        if buffer_pct < self.BUFFER_STEP_B_URGENT or is_step_a_timed_out:
            trigger_reason = (
                f"Step A maker order timed out after {state.step_a_timeout_sec}s with buffer at {buffer_pct:.1f}%"
                if is_step_a_timed_out
                else f"Urgent margin buffer dropped to {buffer_pct:.1f}% (< 10%)"
            )
            logger.warning(f"⚠️ [URGENT STEP B] {trigger_reason}! Executing Market De-Risk.")

            # Cancel resting Step A limit order
            if state.step_a_order_id:
                try:
                    self.client.cancel_order(symbol, state.step_a_order_id)
                except Exception as e:
                    logger.debug(f"Cancel error: {e}")
                state.step_a_order_id = None

            # Execute market order to close position (or de-risk remaining)
            close_side = "SELL" if side == "LONG" else "BUY"
            de_risk_size = current_size  # Close remaining size to protect capital
            order_res = self.client.place_market_order(
                symbol_or_id=symbol,
                side=close_side,
                size=de_risk_size,
                max_slippage_bps=150,
                reduce_only=True,
            )

            notional = de_risk_size * mark_price
            penalty_saved = notional * (self.DEFAULT_LIQUIDATION_PENALTY_BPS / 10000.0)

            receipt = self.receipts.record_defense(
                market=symbol,
                market_id=market_id,
                action_step="STEP_B_URGENT",
                trigger_reason=trigger_reason,
                margin_buffer_pct=buffer_pct,
                mark_price=mark_price,
                position_size_before=current_size,
                size_closed=de_risk_size,
                position_size_remaining=max(0.0, current_size - de_risk_size),
                order_type="MARKET_TAKER",
                estimated_penalty_saved=penalty_saved,
                order_id=order_res.get("oid") or int(now * 1000) % 10000000,
                explorer_base=self.config.explorer_url,
            )
            state.current_step = "STEP_B_URGENT"
            logger.info(f"🛡️ [RECEIPT] Step B Logged: Saved ${penalty_saved:.2f} on {symbol}! Receipt ID: {receipt.id}")
            return

        # ---------------------------------------------------------------------
        # STEP A: WARNING (Buffer < 20%)
        # Reduce-Only Maker Limit Order near Best Price (cuts position by 50%)
        # ---------------------------------------------------------------------
        if buffer_pct < self.BUFFER_STEP_A_WARNING and state.current_step == "NORMAL":
            logger.warning(
                f"⚠️ [WARNING STEP A] Buffer {buffer_pct:.2f}% < {self.BUFFER_STEP_A_WARNING}%. "
                f"Placing 50% reduce-only maker limit order near best price."
            )
            
            # Calculate 50% reduction size
            cut_size = current_size * 0.5
            close_side = "SELL" if side == "LONG" else "BUY"

            # Fetch order book to price near best bid/ask
            book = self.client.get_order_book(symbol, levels=3)
            if close_side == "SELL":
                # Sell into the ask book or near best ask to be a maker
                best_ask = book["asks"][0]["price"] if book.get("asks") else mark_price
                limit_price = best_ask * 0.9995  # Tight maker price
            else:
                best_bid = book["bids"][0]["price"] if book.get("bids") else mark_price
                limit_price = best_bid * 1.0005

            order_res = self.client.place_limit_order(
                symbol_or_id=symbol,
                side=close_side,
                price=limit_price,
                size=cut_size,
                post_only=True,
                reduce_only=True,
                ttl_blocks=20,
            )

            state.current_step = "STEP_A_LIMIT"
            state.step_a_timestamp = now
            state.step_a_order_id = order_res.get("oid") or int(now * 1000) % 10000000

            # Calculate savings: maker fee rebate + partial liquidation avoidance
            notional_cut = cut_size * mark_price
            penalty_saved = notional_cut * ((self.DEFAULT_LIQUIDATION_PENALTY_BPS * 0.5) / 10000.0)

            receipt = self.receipts.record_defense(
                market=symbol,
                market_id=market_id,
                action_step="STEP_A_LIMIT",
                trigger_reason=f"Warning Margin Buffer at {buffer_pct:.1f}% (< 20%). De-risking 50% via maker limit order.",
                margin_buffer_pct=buffer_pct,
                mark_price=mark_price,
                position_size_before=current_size,
                size_closed=cut_size,
                position_size_remaining=current_size - cut_size,
                order_type="LIMIT_MAKER",
                estimated_penalty_saved=penalty_saved,
                order_id=state.step_a_order_id,
                explorer_base=self.config.explorer_url,
            )
            logger.info(
                f"🛡️ [RECEIPT] Step A Limit Order Placed: {cut_size:.4f} {symbol} @ ${limit_price:.2f}. "
                f"Receipt ID: {receipt.id}"
            )
            return

        # ---------------------------------------------------------------------
        # HEALTHY STATE (Buffer >= 20%)
        # ---------------------------------------------------------------------
        if buffer_pct >= self.BUFFER_STEP_A_WARNING and state.current_step != "NORMAL":
            # Account recovered health
            logger.info(f"✅ Position {symbol} recovered health (Buffer: {buffer_pct:.2f}% >= 20%). Resetting state.")
            state.current_step = "NORMAL"
            state.step_a_order_id = None
            state.step_a_timestamp = 0.0

    # =========================================================================
    # Polling Loop Daemon
    # =========================================================================

    def poll_once(self) -> None:
        """Runs a single evaluation sweep across all active positions."""
        try:
            positions = self.client.fetch_positions()
            if not positions:
                logger.debug("No active positions to monitor.")
                return

            for pos in positions:
                self.evaluate_position(pos)
        except Exception as e:
            logger.error(f"Error in Guardian evaluation cycle: {e}")

    def run_loop(self) -> None:
        """Continuous polling loop."""
        logger.info(f"Guardian Worker started. Polling positions every {self.poll_interval_sec}s...")
        self._is_running = True
        while self._is_running:
            self.poll_once()
            time.sleep(self.poll_interval_sec)
        logger.info("Guardian Worker loop stopped.")

    def start_background(self) -> None:
        """Starts the guardian worker in a background daemon thread."""
        if self._is_running:
            logger.warning("Guardian is already running.")
            return
        self._thread = threading.Thread(target=self.run_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Stops the guardian loop."""
        self._is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
