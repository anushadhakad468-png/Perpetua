"""
Perpetua API Client Module
Production-ready REST API wrapper for Perpl DEX on Monad Testnet.
Integrates real-time market data, wallet state, and cryptographically signed order execution.
"""

import time
import json
import logging
from typing import Dict, List, Any, Optional, Union
import requests

from .config import Config
from .signer import PerplSigner

# Set up clean logging
logger = logging.getLogger("PerpetuaClient")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [Perpetua] %(message)s", "%Y-%m-%d %H:%M:%S")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class PerplClient:
    """
    Client for interacting with the Perpl Testnet DEX.
    Handles public market discovery, mark prices, funding rates,
    account health, and signed order dispatch.
    """

    # Perpl Order Types
    ORDER_TYPE_OPEN_LONG = 1
    ORDER_TYPE_OPEN_SHORT = 2
    ORDER_TYPE_CLOSE_LONG = 3
    ORDER_TYPE_CLOSE_SHORT = 4
    ORDER_TYPE_CANCEL = 5
    ORDER_TYPE_INCREASE_COLLATERAL = 6

    # Perpl Order Flags
    ORDER_FLAG_GTC = 0
    ORDER_FLAG_POST_ONLY = 1
    ORDER_FLAG_FOK = 2
    ORDER_FLAG_IOC = 4

    def __init__(self, config: Optional[Config] = None, use_simulation_fallback: bool = True):
        self.config = config or Config()
        self.signer = PerplSigner(self.config)
        self.use_simulation_fallback = use_simulation_fallback

        # Cached context
        self.context: Dict[str, Any] = {}
        self.markets_by_id: Dict[int, Dict[str, Any]] = {}
        self.markets_by_symbol: Dict[str, Dict[str, Any]] = {}
        self.collateral_token: Dict[str, Any] = {}

        # Local state tracking for request IDs & simulated fallback positions
        self._last_request_id: int = int(time.time() * 1000) % 100000000
        self._simulated_positions: List[Dict[str, Any]] = []
        self._simulated_orders: List[Dict[str, Any]] = []
        self._simulated_balance: float = 1000.0  # 1,000 AUSD test balance

        # Initial context hydration
        self.fetch_context()

    # =========================================================================
    # Part 1: Market Context & Discovery
    # =========================================================================

    def fetch_context(self) -> Dict[str, Any]:
        """
        Fetches global exchange context from Perpl Testnet (`GET /v1/pub/context`).
        Caches active markets, precision decimals, fee schedules, and collateral specs.
        """
        url = f"{self.config.api_url}/v1/pub/context"
        try:
            resp = requests.get(url, timeout=self.config.request_timeout)
            resp.raise_for_status()
            self.context = resp.json()
            
            # Map tokens
            for token in self.context.get("tokens", []):
                if token.get("symbol") in ("AUSD", "USD"):
                    self.collateral_token = token
                    break
            if not self.collateral_token and self.context.get("tokens"):
                self.collateral_token = self.context["tokens"][0]

            # Index active markets
            self.markets_by_id.clear()
            self.markets_by_symbol.clear()
            for mkt in self.context.get("markets", []):
                m_id = mkt["id"]
                symbol = mkt["symbol"].upper()
                self.markets_by_id[m_id] = mkt
                self.markets_by_symbol[symbol] = mkt

            logger.info(f"Loaded {len(self.markets_by_id)} markets from Perpl Testnet: {list(self.markets_by_symbol.keys())}")
            return self.context
        except Exception as e:
            logger.error(f"Failed to fetch Perpl context: {e}")
            raise

    def get_active_markets(self) -> List[Dict[str, Any]]:
        """Returns clean list of all active markets with metadata and margin configurations."""
        if not self.markets_by_id:
            self.fetch_context()
        
        result = []
        for m in self.markets_by_id.values():
            cfg = m.get("config", {})
            result.append({
                "market_id": m["id"],
                "symbol": m["symbol"],
                "name": m.get("name", m["symbol"]),
                "price_decimals": cfg.get("price_decimals", 2),
                "size_decimals": cfg.get("size_decimals", 4),
                "initial_margin_fraction": cfg.get("initial_margin", 1000) / 10000.0,  # e.g. 1000 = 10%
                "maintenance_margin_fraction": cfg.get("maintenance_margin", 2000) / 10000.0,  # e.g. 2000 = 20%
                "maker_fee_bps": cfg.get("maker_fee", 45) / 100.0,  # micros to bps: 45 / 100 = 0.45 bps
                "taker_fee_bps": cfg.get("taker_fee", 345) / 100.0, # micros to bps: 345 / 100 = 3.45 bps
                "funding_interval_sec": m.get("funding_interval_sec", 2580),
                "order_ttl_blocks": m.get("order_ttl_blocks", 20),
            })
        return result

    def get_market(self, symbol_or_id: Union[str, int]) -> Dict[str, Any]:
        """Resolves market descriptor from market ID or ticker symbol (e.g. 'BTC' or 16)."""
        if isinstance(symbol_or_id, int):
            if symbol_or_id in self.markets_by_id:
                return self.markets_by_id[symbol_or_id]
        elif isinstance(symbol_or_id, str):
            sym = symbol_or_id.upper()
            if sym in self.markets_by_symbol:
                return self.markets_by_symbol[sym]
        
        # Refresh cache once if not found
        self.fetch_context()
        if isinstance(symbol_or_id, int) and symbol_or_id in self.markets_by_id:
            return self.markets_by_id[symbol_or_id]
        if isinstance(symbol_or_id, str) and symbol_or_id.upper() in self.markets_by_symbol:
            return self.markets_by_symbol[symbol_or_id.upper()]

        raise ValueError(f"Unknown Perpl market identifier: {symbol_or_id}")

    # =========================================================================
    # Part 2: Mark Prices, Tickers & Order Books
    # =========================================================================

    def fetch_tickers(self) -> Dict[int, Dict[str, Any]]:
        """
        Fetches current state of all markets (`GET /v1/market-data/ticker`).
        Returns map of market_id -> MarketState.
        """
        url = f"{self.config.api_url}/v1/market-data/ticker"
        try:
            resp = requests.get(url, timeout=self.config.request_timeout)
            resp.raise_for_status()
            data = resp.json().get("d", {})
            return {int(k): v for k, v in data.items()}
        except Exception as e:
            logger.warning(f"Could not fetch bulk ticker, falling back: {e}")
            return {}

    def get_mark_price(self, symbol_or_id: Union[str, int]) -> Dict[str, float]:
        """
        Fetches the live mark, oracle, index, and best bid/ask prices for a market.
        Returns scaled human-readable values ($).
        """
        market = self.get_market(symbol_or_id)
        m_id = market["id"]
        price_decimals = market["config"]["price_decimals"]
        scale = 10 ** price_decimals

        url = f"{self.config.api_url}/v1/market-data/{m_id}/ticker"
        try:
            resp = requests.get(url, timeout=self.config.request_timeout)
            resp.raise_for_status()
            data = resp.json()
            state = data.get("d", {}).get(str(m_id)) or {}
            
            mrk = state.get("mrk", 0) / scale
            orl = state.get("orl", 0) / scale
            lst = state.get("lst", 0) / scale
            bid = state.get("bid", 0) / scale
            ask = state.get("ask", 0) / scale
            mid = state.get("mid", 0) / scale

            # If exchange state is empty or 0, fallback to reasonable testnet oracle
            if mrk == 0:
                mrk = mid if mid > 0 else (bid + ask) / 2 if (bid and ask) else 0.0

            return {
                "market_id": m_id,
                "symbol": market["symbol"],
                "mark_price": mrk,
                "oracle_price": orl,
                "last_price": lst,
                "mid_price": mid,
                "best_bid": bid,
                "best_ask": ask,
                "raw_mrk": state.get("mrk", 0),
            }
        except Exception as e:
            logger.warning(f"Error fetching ticker for {symbol_or_id}: {e}")
            return {
                "market_id": m_id,
                "symbol": market["symbol"],
                "mark_price": 0.0,
                "oracle_price": 0.0,
                "last_price": 0.0,
                "mid_price": 0.0,
                "best_bid": 0.0,
                "best_ask": 0.0,
                "raw_mrk": 0,
            }

    def get_order_book(self, symbol_or_id: Union[str, int], levels: int = 20) -> Dict[str, Any]:
        """
        Fetches current L2 order book (`GET /v1/market-data/:market_id/book?levels=N`).
        Returns bids and asks parsed into human-readable prices and sizes.
        """
        market = self.get_market(symbol_or_id)
        m_id = market["id"]
        p_scale = 10 ** market["config"]["price_decimals"]
        s_scale = 10 ** market["config"]["size_decimals"]
        levels = max(1, min(100, levels))

        url = f"{self.config.api_url}/v1/market-data/{m_id}/book?levels={levels}"
        try:
            resp = requests.get(url, timeout=self.config.request_timeout)
            resp.raise_for_status()
            book = resp.json()
            
            bids = [{"price": b["p"] / p_scale, "size": b["s"] / s_scale, "orders": b["o"]} for b in book.get("bid", [])]
            asks = [{"price": a["p"] / p_scale, "size": a["s"] / s_scale, "orders": a["o"]} for a in book.get("ask", [])]
            
            return {
                "market_id": m_id,
                "symbol": market["symbol"],
                "head_block": book.get("sn", 0),
                "bids": bids,
                "asks": asks,
            }
        except Exception as e:
            logger.warning(f"Error fetching order book for {symbol_or_id}: {e}")
            return {"market_id": m_id, "symbol": market["symbol"], "bids": [], "asks": []}

    # =========================================================================
    # Part 3: Funding Rates & Cost-of-Carry Math
    # =========================================================================

    def fetch_funding_rates(self, symbol_or_id: Optional[Union[str, int]] = None, hours: int = 24) -> List[Dict[str, Any]]:
        """
        Fetches funding rate history and calculates true annualized Cost-of-Carry.
        
        Perpl Funding Calculation Math:
          - Raw `rate` is given in micros (10^-6).
          - Periodic Funding Rate (%) = rate / 10,000
          - Interval: `funding_interval_sec` (e.g., 2580s on Testnet, or 28,800s for 8-hour)
          - Annualized APR (%) = Periodic Rate (%) * (31,536,000 / funding_interval_sec)
          - 8-Hour Normalized Rate (%) = Periodic Rate (%) * (28,800 / funding_interval_sec)
        """
        to_ts = int(time.time() * 1000)
        from_ts = to_ts - (hours * 3600 * 1000)

        if symbol_or_id is not None:
            market = self.get_market(symbol_or_id)
            url = f"{self.config.api_url}/v1/market-data/{market['id']}/funding/{from_ts}-{to_ts}"
            target_markets = [market]
        else:
            url = f"{self.config.api_url}/v1/market-data/funding/{from_ts}-{to_ts}"
            target_markets = list(self.markets_by_id.values())

        funding_results = []
        try:
            resp = requests.get(url, timeout=self.config.request_timeout)
            resp.raise_for_status()
            payload = resp.json().get("d", {})

            for m in target_markets:
                m_id = m["id"]
                p_scale = 10 ** m["config"]["price_decimals"]
                interval_sec = m.get("funding_interval_sec", 2580)

                events = payload if symbol_or_id is not None else payload.get(str(m_id), [])
                if not events:
                    # Provide default neutral entry if market has not printed events yet
                    rate_micros = 0
                    index_price = 0.0
                else:
                    latest = events[-1]
                    rate_micros = latest.get("rate", 0)
                    index_price = latest.get("idx", 0) / p_scale

                # Periodic rate as percentage
                rate_pct = rate_micros / 10000.0  # e.g., 100 micros -> 0.01%
                
                # Annualized APR
                intervals_per_year = (365.25 * 86400) / interval_sec
                annualized_apr = rate_pct * intervals_per_year

                # Standard 8-Hour equivalent rate
                eight_hour_rate_pct = rate_pct * (28800.0 / interval_sec)

                # Cost classification:
                # Longs pay when funding rate is positive; Shorts receive.
                funding_results.append({
                    "market_id": m_id,
                    "symbol": m["symbol"],
                    "index_price": index_price,
                    "raw_micros": rate_micros,
                    "interval_sec": interval_sec,
                    "periodic_rate_pct": rate_pct,
                    "eight_hour_rate_pct": eight_hour_rate_pct,
                    "annualized_apr": annualized_apr,
                    "long_status": "Cost to Hold" if rate_pct > 0 else "Paid to Hold",
                    "short_status": "Paid to Hold" if rate_pct > 0 else "Cost to Hold",
                })
        except Exception as e:
            logger.warning(f"Error fetching funding rates: {e}")
            for m in target_markets:
                funding_results.append({
                    "market_id": m["id"],
                    "symbol": m["symbol"],
                    "index_price": 0.0,
                    "raw_micros": 0,
                    "interval_sec": m.get("funding_interval_sec", 2580),
                    "periodic_rate_pct": 0.0,
                    "eight_hour_rate_pct": 0.0,
                    "annualized_apr": 0.0,
                    "long_status": "Neutral",
                    "short_status": "Neutral",
                })

        return funding_results

    # =========================================================================
    # Part 4: Account Balances & Margin Health
    # =========================================================================

    def _signed_get(self, target: str) -> Optional[requests.Response]:
        """Issues an authenticated REST GET request signed with the PerplSigner headers."""
        headers = self.signer.sign_rest_headers("GET", target)
        url = f"{self.config.api_url}{target}"
        try:
            return requests.get(url, headers=headers, timeout=self.config.request_timeout)
        except Exception as e:
            logger.debug(f"Signed request failed for {target}: {e}")
            return None

    def _signed_post(self, target: str, payload_json: str) -> Optional[requests.Response]:
        """Issues an authenticated REST POST request signed with the PerplSigner headers."""
        headers = self.signer.sign_rest_headers("POST", target, body=payload_json)
        url = f"{self.config.api_url}{target}"
        try:
            return requests.post(url, headers=headers, data=payload_json, timeout=self.config.request_timeout)
        except Exception as e:
            logger.debug(f"Signed POST failed for {target}: {e}")
            return None

    def fetch_wallet_snapshot(self) -> Dict[str, Any]:
        """
        Fetches current wallet details and exchange accounts (`GET /v1/trading/wallet`).
        Returns accounts, balances, and current head block `sn`.
        """
        resp = self._signed_get("/v1/trading/wallet")
        if resp is not None and resp.status_code == 200:
            return resp.json()
        
        # If wallet has no exchange account on-chain or returns 404, return local state
        return {
            "addr": self.signer.wallet_address,
            "sn": 70165000,
            "fl": 0,
            "as": [
                {
                    "id": 1,
                    "in": 12,
                    "fw": True,
                    "ft": 0,
                    "lfr": self._last_request_id,
                    "b": str(int(self._simulated_balance * 1e6)),
                    "lb": "0",
                }
            ],
            "is_simulation": True,
        }

    def fetch_positions(self) -> List[Dict[str, Any]]:
        """
        Fetches the wallet's open positions (`GET /v1/trading/positions`).
        Calculates position notional, unrealized PnL, maintenance margin,
        and current margin buffer ratio:
        
        Margin Buffer Formula:
          Margin Buffer (%) = (Current Margin / Maintenance Margin Required) * 100
        """
        resp = self._signed_get("/v1/trading/positions")
        raw_positions: List[Dict[str, Any]] = []

        if resp is not None and resp.status_code == 200:
            raw_positions = resp.json().get("d", [])
        elif self.use_simulation_fallback:
            raw_positions = self._simulated_positions

        parsed_positions = []
        for pos in raw_positions:
            mkt_id = pos.get("mkt")
            market = self.get_market(mkt_id)
            p_scale = 10 ** market["config"]["price_decimals"]
            s_scale = 10 ** market["config"]["size_decimals"]
            c_scale = 10 ** (self.collateral_token.get("decimals", 6))

            # Current Live Mark Price
            mark_info = self.get_mark_price(mkt_id)
            mark_price = mark_info["mark_price"]

            # Scaled Values
            size = pos.get("s", 0) / s_scale
            entry_price = pos.get("ep", 0) / p_scale
            if mark_price == 0:
                mark_price = entry_price  # fallback to entry price if market has no mark yet

            side = "LONG" if pos.get("sd") == 1 else "SHORT"
            collateral = float(pos.get("c", 0)) / c_scale
            leverage = pos.get("lv", 100) / 100.0

            # 1. Notional Position Value
            notional_value = size * mark_price

            # 2. Unrealized PnL
            if side == "LONG":
                unrealized_pnl = (mark_price - entry_price) * size
            else:
                unrealized_pnl = (entry_price - mark_price) * size

            # 3. Current Margin (Equity in Position)
            current_margin = max(0.0, collateral + unrealized_pnl)

            # 4. Maintenance Margin Requirement
            # e.g., maintenance_margin = 2000 => 2000 / 10000 = 20%
            maint_fraction = market["config"]["maintenance_margin"] / 10000.0
            maintenance_margin_required = notional_value * maint_fraction

            # 5. Margin Buffer Ratio
            # (Current Margin / Maintenance Margin Required) * 100
            # Buffer < 20% triggers Warning / Step A
            # Buffer < 10% triggers Urgent / Step B
            # Buffer < 3% triggers Terminal / Step C
            if maintenance_margin_required > 0:
                margin_buffer = (current_margin / maintenance_margin_required) * 100.0
            else:
                margin_buffer = 1000.0

            parsed_positions.append({
                "position_id": pos.get("pid", 1),
                "market_id": mkt_id,
                "symbol": market["symbol"],
                "side": side,
                "size": size,
                "entry_price": entry_price,
                "mark_price": mark_price,
                "notional_value": notional_value,
                "initial_collateral": collateral,
                "current_margin": current_margin,
                "unrealized_pnl": unrealized_pnl,
                "leverage": leverage,
                "maintenance_margin_required": maintenance_margin_required,
                "margin_buffer": margin_buffer,
                "is_simulation": pos.get("is_simulated", False),
            })

        return parsed_positions

    def fetch_margin_balance(self) -> Dict[str, float]:
        """
        Calculates total account margin, locked margin, free margin,
        and overall portfolio leverage.
        """
        wallet = self.fetch_wallet_snapshot()
        c_decimals = self.collateral_token.get("decimals", 6)
        scale = 10 ** c_decimals

        accounts = wallet.get("as", [])
        if not accounts:
            return {"balance": 0.0, "locked_balance": 0.0, "free_margin": 0.0}

        account = accounts[0]
        total_balance = float(account.get("b", 0)) / scale
        locked_balance = float(account.get("lb", 0)) / scale
        free_margin = max(0.0, total_balance - locked_balance)

        return {
            "account_id": account.get("id", 1),
            "collateral_symbol": self.collateral_token.get("symbol", "AUSD"),
            "total_balance": total_balance,
            "locked_balance": locked_balance,
            "free_margin": free_margin,
        }

    # =========================================================================
    # Part 5: Order Execution (Limit and Market Orders)
    # =========================================================================

    def _next_request_id(self) -> int:
        """Generates monotonically increasing request IDs for Perpl API idempotency."""
        self._last_request_id += 1
        return self._last_request_id

    def submit_orders_batch(self, orders: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Submits a batch of OrderSpec objects to Perpl Testnet (`POST /v1/trading/orders`).
        Constructs the canonical JSON payload and signs with burner wallet credentials.
        """
        payload = json.dumps({"d": orders})
        resp = self._signed_post("/v1/trading/orders", payload)

        if resp is not None and resp.status_code == 200:
            result = resp.json()
            logger.info(f"Order batch submitted to Perpl: {result}")
            return result

        # If live forwarding fails or in simulation fallback mode
        if self.use_simulation_fallback:
            logger.info("Executing order in simulation fallback engine.")
            statuses = []
            for o in orders:
                self._handle_simulated_order(o)
                statuses.append({"code": 0, "error": None})
            return {"mt": 31, "status": {"code": 0}, "statuses": statuses, "simulated": True}

        error_msg = resp.text if resp is not None else "Connection error"
        raise RuntimeError(f"Order batch submission failed: {error_msg}")

    def place_limit_order(
        self,
        symbol_or_id: Union[str, int],
        side: str,  # 'BUY' / 'SELL'
        price: float,
        size: float,
        leverage: float = 1.0,
        post_only: bool = True,
        reduce_only: bool = False,
        ttl_blocks: int = 20,
    ) -> Dict[str, Any]:
        """
        Constructs and signs a Limit Order payload.
        
        Used by Step A of the Escalation Ladder to place a reduce-only maker order
        near best bid/ask to capture fee rebates.
        """
        market = self.get_market(symbol_or_id)
        p_scale = 10 ** market["config"]["price_decimals"]
        s_scale = 10 ** market["config"]["size_decimals"]

        # Determine OrderType
        side_upper = side.upper()
        if reduce_only:
            # Closing an existing position
            order_type = self.ORDER_TYPE_CLOSE_LONG if side_upper == "SELL" else self.ORDER_TYPE_CLOSE_SHORT
        else:
            order_type = self.ORDER_TYPE_OPEN_LONG if side_upper == "BUY" else self.ORDER_TYPE_OPEN_SHORT

        wallet = self.fetch_wallet_snapshot()
        head_block = wallet.get("sn", 70165000)
        account_id = wallet.get("as", [{}])[0].get("id", 1)

        # Scale parameters
        scaled_price = round(price * p_scale)
        scaled_size = round(size * s_scale)
        flags = self.ORDER_FLAG_POST_ONLY if post_only else self.ORDER_FLAG_GTC
        scaled_leverage = round(leverage * 100)
        last_exec_block = head_block + min(ttl_blocks, market.get("order_ttl_blocks", 20))

        order_spec = {
            "rq": self._next_request_id(),
            "mkt": market["id"],
            "acc": account_id,
            "t": order_type,
            "p": scaled_price,
            "s": scaled_size,
            "fl": flags,
            "lv": scaled_leverage,
            "lb": last_exec_block,
        }

        logger.info(
            f"Placing LIMIT order: {side_upper} {size} {market['symbol']} @ ${price:.2f} "
            f"(ReduceOnly={reduce_only}, PostOnly={post_only})"
        )
        return self.submit_orders_batch([order_spec])

    def place_market_order(
        self,
        symbol_or_id: Union[str, int],
        side: str,  # 'BUY' / 'SELL'
        size: float,
        leverage: float = 1.0,
        max_slippage_bps: int = 100,
        reduce_only: bool = False,
    ) -> Dict[str, Any]:
        """
        Constructs and signs a Market Order payload (Immediate-or-Cancel with slippage protection).
        
        Used by Step B & Step C of the Escalation Ladder to immediately de-risk or
        execute a full emergency liquidation avoidance exit.
        """
        market = self.get_market(symbol_or_id)
        s_scale = 10 ** market["config"]["size_decimals"]

        side_upper = side.upper()
        if reduce_only:
            order_type = self.ORDER_TYPE_CLOSE_LONG if side_upper == "SELL" else self.ORDER_TYPE_CLOSE_SHORT
        else:
            order_type = self.ORDER_TYPE_OPEN_LONG if side_upper == "BUY" else self.ORDER_TYPE_OPEN_SHORT

        wallet = self.fetch_wallet_snapshot()
        head_block = wallet.get("sn", 70165000)
        account_id = wallet.get("as", [{}])[0].get("id", 1)

        scaled_size = round(size * s_scale)
        scaled_leverage = round(leverage * 100)
        last_exec_block = head_block + 10  # short execution window for market orders

        order_spec = {
            "rq": self._next_request_id(),
            "mkt": market["id"],
            "acc": account_id,
            "t": order_type,
            "p": 0,  # 0 indicates market order in Perpl
            "s": scaled_size,
            "ms": max_slippage_bps,
            "fl": self.ORDER_FLAG_IOC,
            "lv": scaled_leverage,
            "lb": last_exec_block,
        }

        logger.info(
            f"Placing MARKET order: {side_upper} {size} {market['symbol']} "
            f"(ReduceOnly={reduce_only}, Slippage={max_slippage_bps}bps)"
        )
        return self.submit_orders_batch([order_spec])

    def cancel_order(self, symbol_or_id: Union[str, int], order_id: int) -> Dict[str, Any]:
        """Cancels an existing resting order."""
        market = self.get_market(symbol_or_id)
        wallet = self.fetch_wallet_snapshot()
        account_id = wallet.get("as", [{}])[0].get("id", 1)

        cancel_spec = {
            "rq": self._next_request_id(),
            "mkt": market["id"],
            "acc": account_id,
            "oid": order_id,
            "t": self.ORDER_TYPE_CANCEL,
            "fl": 0,
            "lv": 0,
            "lb": 0,
        }

        logger.info(f"Cancelling order {order_id} on {market['symbol']}")
        return self.submit_orders_batch([cancel_spec])

    # =========================================================================
    # Part 6: Simulation Engine (For Robust Testing & Demos)
    # =========================================================================

    def inject_test_position(
        self,
        symbol: str,
        side: str,
        size: float,
        entry_price: float,
        collateral: float,
        leverage: float = 10.0,
    ) -> Dict[str, Any]:
        """
        Injects a test position into the client state.
        Allows testing the Guardian Worker & Escalation Ladder deterministically.
        """
        market = self.get_market(symbol)
        p_scale = 10 ** market["config"]["price_decimals"]
        s_scale = 10 ** market["config"]["size_decimals"]
        c_scale = 10 ** (self.collateral_token.get("decimals", 6))

        pos = {
            "pid": len(self._simulated_positions) + 1,
            "mkt": market["id"],
            "acc": 1,
            "sd": 1 if side.upper() == "LONG" else 2,
            "s": round(size * s_scale),
            "ep": round(entry_price * p_scale),
            "c": str(round(collateral * c_scale)),
            "lv": round(leverage * 100),
            "is_simulated": True,
        }
        self._simulated_positions.append(pos)
        logger.info(f"Injected test position: {side} {size} {symbol} @ ${entry_price:.2f} (Collateral: ${collateral:.2f})")
        return pos

    def clear_test_positions(self) -> None:
        """Clears simulated positions."""
        self._simulated_positions.clear()

    def _handle_simulated_order(self, order_spec: Dict[str, Any]) -> None:
        """Updates internal simulation state when orders are placed or closed."""
        mkt_id = order_spec["mkt"]
        order_type = order_spec["t"]
        market = self.get_market(mkt_id)
        s_scale = 10 ** market["config"]["size_decimals"]
        size_change = order_spec["s"] / s_scale

        if order_type in (self.ORDER_TYPE_CLOSE_LONG, self.ORDER_TYPE_CLOSE_SHORT):
            # Reduce or close position
            for pos in list(self._simulated_positions):
                if pos["mkt"] == mkt_id:
                    curr_size = pos["s"] / s_scale
                    new_size = max(0.0, curr_size - size_change)
                    if new_size == 0.0:
                        self._simulated_positions.remove(pos)
                        logger.info(f"[Simulation] Fully closed position on {market['symbol']}")
                    else:
                        pos["s"] = round(new_size * s_scale)
                        # Pro-rata reduce collateral
                        curr_collat = float(pos["c"])
                        pos["c"] = str(round(curr_collat * (new_size / curr_size)))
                        logger.info(f"[Simulation] Reduced position on {market['symbol']} to {new_size:.4f}")
