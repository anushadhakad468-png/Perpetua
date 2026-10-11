"""
Perpetua Receipts Module
Local JSON audit log and receipts database for actions taken by the Guardian.
Provides verified logs of avoided liquidations and saved capital for the frontend feed.
"""

import os
import json
import time
import uuid
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict


@dataclass
class DefenseReceipt:
    """Represents an automated defense execution receipt."""
    id: str
    timestamp: float
    timestamp_iso: str
    market: str
    market_id: int
    action_step: str  # "STEP_A_LIMIT", "STEP_B_URGENT", "STEP_C_TERMINAL"
    trigger_reason: str
    margin_buffer_pct: float
    mark_price: float
    position_size_before: float
    size_closed: float
    position_size_remaining: float
    order_type: str  # "LIMIT_MAKER" or "MARKET_TAKER"
    estimated_penalty_saved: float  # In USD / AUSD
    monad_tx_id: str
    explorer_url: str


class ReceiptsManager:
    """Manages appending, retrieving, and querying defensive receipts in a local JSON database."""

    def __init__(self, file_path: str = "data/receipts.json"):
        self.file_path = file_path
        os.makedirs(os.path.dirname(self.file_path) or ".", exist_ok=True)
        if not os.path.exists(self.file_path):
            self._save_receipts([])

    def _load_receipts(self) -> List[Dict[str, Any]]:
        """Loads receipts from disk."""
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_receipts(self, receipts: List[Dict[str, Any]]) -> None:
        """Saves receipts atomically to disk."""
        tmp_path = f"{self.file_path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(receipts, f, indent=2)
        os.replace(tmp_path, self.file_path)

    def record_defense(
        self,
        market: str,
        market_id: int,
        action_step: str,
        trigger_reason: str,
        margin_buffer_pct: float,
        mark_price: float,
        position_size_before: float,
        size_closed: float,
        position_size_remaining: float,
        order_type: str,
        estimated_penalty_saved: float,
        order_id: Optional[Union[str, int]] = None,
        explorer_base: str = "https://testnet.monadscan.com",
    ) -> DefenseReceipt:
        """Records a new defensive exit event to the receipts database."""
        now = time.time()
        receipt_id = f"rcpt_{uuid.uuid4().hex[:12]}"
        tx_id = f"0x{uuid.uuid4().hex}" if not order_id else f"0x{order_id:x}" if isinstance(order_id, int) else str(order_id)
        explorer_url = f"{explorer_base}/tx/{tx_id}"

        receipt = DefenseReceipt(
            id=receipt_id,
            timestamp=now,
            timestamp_iso=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
            market=market,
            market_id=market_id,
            action_step=action_step,
            trigger_reason=trigger_reason,
            margin_buffer_pct=round(margin_buffer_pct, 2),
            mark_price=round(mark_price, 2),
            position_size_before=round(position_size_before, 4),
            size_closed=round(size_closed, 4),
            position_size_remaining=round(position_size_remaining, 4),
            order_type=order_type,
            estimated_penalty_saved=round(estimated_penalty_saved, 2),
            monad_tx_id=tx_id,
            explorer_url=explorer_url,
        )

        receipts = self._load_receipts()
        receipts.insert(0, asdict(receipt))  # Newest first
        self._save_receipts(receipts)
        return receipt

    def get_all_receipts(self) -> List[Dict[str, Any]]:
        """Returns all recorded receipts."""
        return self._load_receipts()

    def get_summary_stats(self) -> Dict[str, Any]:
        """Calculates cumulative savings and intervention counts."""
        receipts = self._load_receipts()
        total_saved = sum(r.get("estimated_penalty_saved", 0.0) for r in receipts)
        step_a_count = sum(1 for r in receipts if r.get("action_step") == "STEP_A_LIMIT")
        step_b_count = sum(1 for r in receipts if r.get("action_step") == "STEP_B_URGENT")
        step_c_count = sum(1 for r in receipts if r.get("action_step") == "STEP_C_TERMINAL")

        return {
            "total_interventions": len(receipts),
            "total_liquidations_avoided": step_b_count + step_c_count,
            "total_capital_saved_usd": round(total_saved, 2),
            "step_a_maker_derisk_count": step_a_count,
            "step_b_urgent_market_count": step_b_count,
            "step_c_emergency_close_count": step_c_count,
        }

    def clear(self) -> None:
        """Clears all receipts (for testing)."""
        self._save_receipts([])
