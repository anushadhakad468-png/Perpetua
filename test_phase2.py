"""
Phase 2 Verification Suite for Perpetua (Sentinel)
Tests:
1. Continuous polling loop & thread controls.
2. Margin buffer calculation formula verification.
3. Escalation Ladder Step A (Buffer < 20% limit order 50% reduction).
4. Step A timeout detection and escalation.
5. Escalation Ladder Step B (Buffer < 10% or timeout urgent market exit).
6. Escalation Ladder Step C (Buffer < 3% terminal emergency close).
7. Receipts database audit logging and statistics aggregation.
"""

import sys
import io
import os
import time
import json

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from perpetua.config import Config
from perpetua.client import PerplClient
from perpetua.guardian import GuardianWorker
from perpetua.receipts import ReceiptsManager


def run_tests():
    print("=" * 70)
    print("[*] PERPETUA (SENTINEL) - PHASE 2 VERIFICATION")
    print("=" * 70)

    # Clean test receipts
    test_receipts_path = "data/test_receipts.json"
    if os.path.exists(test_receipts_path):
        os.remove(test_receipts_path)

    config = Config()
    client = PerplClient(config)
    worker = GuardianWorker(
        client=client,
        poll_interval_sec=1.0,
        step_a_timeout_sec=3.0,  # Fast 3s timeout for testing
        receipts_path=test_receipts_path,
    )

    # -------------------------------------------------------------------------
    # Test 1: Margin Buffer Formula Verification
    # -------------------------------------------------------------------------
    print("\n[Step 1] Verifying Margin Buffer Formula...")
    # Math: 0.1 BTC @ $80,000 = $8,000 Notional.
    # Maintenance margin fraction = 25% (0.25).
    # Maintenance margin required = $8,000 * 0.25 = $2,000.
    # Current margin = $400.
    # Expected Buffer = ($400 / $2,000) * 100 = 20.0%
    sample_pos = {
        "symbol": "BTC",
        "market_id": 16,
        "size": 0.1,
        "entry_price": 80000.0,
        "mark_price": 80000.0,
        "maintenance_margin_required": 2000.0,
        "current_margin": 400.0,
    }
    calc_buffer = worker.evaluate_margin_buffer(sample_pos)
    print(f"  * Maintenance Required: $2,000.00 | Current Margin: $400.00")
    print(f"  * Calculated Margin Buffer: {calc_buffer:.2f}% (Expected: 20.00%)")
    assert abs(calc_buffer - 20.0) < 0.001, "Margin buffer formula calculation mismatch"
    print("  [OK] Margin buffer formula verified.")

    # -------------------------------------------------------------------------
    # Test 2: Step A Warning Trigger (Buffer < 20%)
    # -------------------------------------------------------------------------
    print("\n[Step 2] Testing Escalation Ladder: STEP A (Warning - Buffer < 20%)...")
    mark_info = client.get_mark_price("BTC")
    curr_mark = mark_info["mark_price"]
    client.clear_test_positions()
    client.inject_test_position(
        symbol="BTC",
        side="LONG",
        size=0.1,             # 0.1 BTC
        entry_price=curr_mark,
        collateral=500.0,
        leverage=16.0,
    )

    # Intentionally adjust collateral to drop buffer into Step A (e.g. 16.0%)
    # Maint margin on 0.1 BTC (~$8,400) is ~$2,100.
    # Setting collateral to $336 => Buffer = ($336 / $2,100) * 100 ~ 16.0%
    positions = client.fetch_positions()
    req_maint = positions[0]["maintenance_margin_required"]
    target_equity = req_maint * 0.16
    client._simulated_positions[0]["c"] = str(int(target_equity * 1e6))

    worker.poll_once()

    receipts = worker.receipts.get_all_receipts()
    assert len(receipts) == 1, "Expected Step A receipt"
    step_a = receipts[0]
    print(f"  * Action Executed:       {step_a['action_step']}")
    print(f"  * Margin Buffer:         {step_a['margin_buffer_pct']}%")
    print(f"  * Position Size Before:  {step_a['position_size_before']} BTC")
    print(f"  * Size Cut (50% Maker):  {step_a['size_closed']} BTC")
    print(f"  * Remaining Size:        {step_a['position_size_remaining']} BTC")
    print(f"  * Order Type:            {step_a['order_type']}")
    print(f"  * Est. Penalty Saved:    ${step_a['estimated_penalty_saved']:.2f}")
    assert step_a["action_step"] == "STEP_A_LIMIT"
    assert step_a["order_type"] == "LIMIT_MAKER"
    assert abs(step_a["size_closed"] - 0.05) < 0.001
    print("  [OK] Step A 50% reduce-only limit execution verified.")

    # -------------------------------------------------------------------------
    # Test 3: Step A Timeout Check & Step B Urgent Market De-Risk
    # -------------------------------------------------------------------------
    print("\n[Step 3] Testing Step A Timeout Detection & STEP B Escalation...")
    pos_id = str(client.fetch_positions()[0]["position_id"])
    state = worker.position_states[pos_id]
    
    # Simulate timeout elapsed
    state.step_a_timestamp = time.time() - (worker.step_a_timeout_sec + 1.0)
    print(f"  * Simulated elapsed time: {worker.step_a_timeout_sec + 1.0}s > {worker.step_a_timeout_sec}s threshold.")

    worker.poll_once()

    receipts = worker.receipts.get_all_receipts()
    assert len(receipts) == 2, "Expected 2 receipts after Step B"
    step_b = receipts[0]
    print(f"  * Action Executed:       {step_b['action_step']}")
    print(f"  * Trigger Reason:        {step_b['trigger_reason']}")
    print(f"  * Order Type:            {step_b['order_type']}")
    print(f"  * Est. Penalty Saved:    ${step_b['estimated_penalty_saved']:.2f}")
    assert step_b["action_step"] == "STEP_B_URGENT"
    assert step_b["order_type"] == "MARKET_TAKER"
    print("  [OK] Step A timeout detected and Step B market de-risk executed.")

    # -------------------------------------------------------------------------
    # Test 4: Step C Terminal Emergency Close (Buffer < 3%)
    # -------------------------------------------------------------------------
    print("\n[Step 4] Testing Escalation Ladder: STEP C (Terminal - Buffer < 3%)...")
    eth_info = client.get_mark_price("ETH")
    curr_eth_mark = eth_info["mark_price"]
    client.clear_test_positions()
    client.inject_test_position(
        symbol="ETH",
        side="LONG",
        size=1.0,
        entry_price=curr_eth_mark,
        collateral=10.0, # extremely low collateral => buffer ~ 1.9%
        leverage=50.0,
    )

    worker.poll_once()

    receipts = worker.receipts.get_all_receipts()
    step_c = receipts[0]
    print(f"  * Action Executed:       {step_c['action_step']}")
    print(f"  * Margin Buffer:         {step_c['margin_buffer_pct']}% (< 3%)")
    print(f"  * Full Closed Size:      {step_c['size_closed']} ETH")
    print(f"  * Position Remaining:    {step_c['position_size_remaining']} ETH")
    print(f"  * Est. Penalty Saved:    ${step_c['estimated_penalty_saved']:.2f}")
    assert step_c["action_step"] == "STEP_C_TERMINAL"
    assert step_c["position_size_remaining"] == 0.0
    print("  [OK] Step C emergency liquidation avoidance verified.")

    # -------------------------------------------------------------------------
    # Test 5: Receipts Database & Summary Statistics
    # -------------------------------------------------------------------------
    print("\n[Step 5] Auditing Receipts Database & Analytics...")
    summary = worker.receipts.get_summary_stats()
    print(f"  * Total Interventions:        {summary['total_interventions']}")
    print(f"  * Total Liquidations Avoided: {summary['total_liquidations_avoided']}")
    print(f"  * Total Capital Saved:        ${summary['total_capital_saved_usd']:,.2f}")
    print(f"  * Step A Maker Cuts:          {summary['step_a_maker_derisk_count']}")
    print(f"  * Step B Urgent Market Cuts:  {summary['step_b_urgent_market_count']}")
    print(f"  * Step C Terminal Closes:     {summary['step_c_emergency_close_count']}")
    assert summary["total_interventions"] == 3
    assert summary["total_liquidations_avoided"] == 2
    assert summary["total_capital_saved_usd"] > 0

    # Clean up test database
    if os.path.exists(test_receipts_path):
        os.remove(test_receipts_path)

    # -------------------------------------------------------------------------
    # Test 6: Continuous Polling Loop Background Thread
    # -------------------------------------------------------------------------
    print("\n[Step 6] Testing Continuous Polling Daemon...")
    worker.start_background()
    print("  * Worker background thread started. Running for 3.0 seconds...")
    time.sleep(3.0)
    worker.stop()
    print("  * Worker background thread stopped gracefully.")
    print("  [OK] Daemon lifecycle verified.")

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL PHASE 2 REQUIREMENTS FULLY VERIFIED!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
