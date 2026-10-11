"""
Perpetua Guardian Worker CLI
Starts the 24/7 risk guardian daemon or runs a stress-test demo.

Usage:
  python run_guardian.py
  python run_guardian.py --demo
  python run_guardian.py --interval 2.5
"""

import sys
import io
import time
import argparse
import signal

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from perpetua.config import Config
from perpetua.client import PerplClient
from perpetua.guardian import GuardianWorker
from perpetua.receipts import ReceiptsManager


def run_demo(worker: GuardianWorker, client: PerplClient):
    """
    Executes a high-drama demonstration of the Escalation Ladder:
    1. Injects a high-leverage position.
    2. Drops the margin buffer into Step A Warning (< 20%) -> 50% Limit Order placed.
    3. Simulates timeout on limit order -> Step B Urgent Market De-Risk fires.
    4. Simulates flash drop into Terminal (< 3%) -> Step C Full Emergency Close fires.
    5. Displays the resulting Transparency Receipts.
    """
    print("\n" + "=" * 70)
    print("🔥 RUNNING GUARDIAN ESCALATION LADDER DEMO")
    print("=" * 70)

    receipts_mgr = worker.receipts
    receipts_mgr.clear()

    # Step 0: Inject Long Position with 80% Buffer (Healthy)
    print("\n[Stage 1] Initializing healthy position on BTC...")
    mark_info = client.get_mark_price("BTC")
    btc_mark = mark_info["mark_price"]
    maint_req = 0.2 * btc_mark * 0.25  # 25% maint margin on BTC
    init_collat = maint_req * 0.80     # 80% margin buffer

    client.clear_test_positions()
    client.inject_test_position(
        symbol="BTC",
        side="LONG",
        size=0.2,
        entry_price=btc_mark,
        collateral=init_collat,
        leverage=20.0,
    )

    pos = client.fetch_positions()[0]
    buffer_1 = worker.evaluate_margin_buffer(pos)
    print(f"  • Position: LONG {pos['size']} {pos['symbol']} @ ${pos['entry_price']:,.2f}")
    print(f"  • Initial Margin Buffer: {buffer_1:.2f}% (Status: HEALTHY)")

    # Step 1: Market drop triggers Step A (Buffer < 20%)
    print("\n[Stage 2] Simulating price drop -> Margin Buffer drops to 16.0% (< 20%)...")
    step_a_collat = maint_req * 0.16
    client._simulated_positions[0]["c"] = str(int(step_a_collat * 1e6))
    worker.poll_once()

    receipts = receipts_mgr.get_all_receipts()
    assert len(receipts) == 1, "Expected 1 receipt for Step A"
    print(f"  ✓ Step A triggered successfully! Order placed: {receipts[0]['order_type']}")

    # Step 2: Timeout triggers Step B
    print(f"\n[Stage 3] Simulating Step A Maker Timeout ({worker.step_a_timeout_sec}s elapsed without fill)...")
    pos_key = str(pos["position_id"])
    worker.position_states[pos_key].step_a_timestamp = time.time() - (worker.step_a_timeout_sec + 2)
    worker.poll_once()

    receipts = receipts_mgr.get_all_receipts()
    assert len(receipts) == 2, "Expected 2 receipts"
    print(f"  ✓ Step B triggered via Timeout! Urgent Market Order executed: {receipts[0]['action_step']}")

    # Step 3: Flash drop triggers Step C (Buffer < 3%)
    print("\n[Stage 4] Simulating Flash Crash -> Buffer drops to 1.8% (< 3%)...")
    eth_info = client.get_mark_price("ETH")
    eth_mark = eth_info["mark_price"]
    eth_maint = 2.0 * eth_mark * 0.20
    step_c_collat = eth_maint * 0.018

    client.inject_test_position(
        symbol="ETH",
        side="LONG",
        size=2.0,
        entry_price=eth_mark,
        collateral=step_c_collat,
        leverage=50.0,
    )
    worker.poll_once()

    receipts = receipts_mgr.get_all_receipts()
    assert any(r["action_step"] == "STEP_C_TERMINAL" for r in receipts), "Expected Step C receipt"
    print("  ✓ Step C Terminal emergency close executed! Exchange liquidation averted.")

    # Step 4: Summary
    stats = receipts_mgr.get_summary_stats()
    print("\n" + "=" * 70)
    print("📊 DEFENSE SUMMARY & TRANSPARENCY AUDIT")
    print("=" * 70)
    print(f"  • Total Defensive Interventions:  {stats['total_interventions']}")
    print(f"  • Liquidations Averted:           {stats['total_liquidations_avoided']}")
    print(f"  • Total Capital Saved:            ${stats['total_capital_saved_usd']:,.2f}")
    print(f"  • Step A Maker Limit Cut Count:   {stats['step_a_maker_derisk_count']}")
    print(f"  • Step B Urgent Market Cut Count: {stats['step_b_urgent_market_count']}")
    print(f"  • Step C Terminal Close Count:    {stats['step_c_emergency_close_count']}")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Perpetua Guardian Worker Daemon")
    parser.add_argument("--interval", type=float, default=3.0, help="Polling interval in seconds (default: 3.0)")
    parser.add_argument("--timeout", type=float, default=10.0, help="Step A limit timeout in seconds (default: 10.0)")
    parser.add_argument("--demo", action="store_true", help="Run the Escalation Ladder stress-test demo and exit")
    args = parser.parse_args()

    config = Config()
    client = PerplClient(config)
    worker = GuardianWorker(
        client=client,
        poll_interval_sec=args.interval,
        step_a_timeout_sec=args.timeout,
    )

    if args.demo:
        run_demo(worker, client)
        return

    # Handle graceful exit
    def sig_handler(sig, frame):
        print("\nStopping Guardian Worker gracefully...")
        worker.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)

    print("=" * 70)
    print("🛡️ PERPETUA GUARDIAN WORKER ONLINE")
    print(f"  • Monad Network:    Chain ID {config.chain_id} (Testnet)")
    print(f"  • Polling Cadence:  {args.interval}s")
    print(f"  • Step A Timeout:   {args.timeout}s")
    print(f"  • Burner Wallet:    {worker.client.signer.wallet_address}")
    print("=" * 70)

    worker.run_loop()


if __name__ == "__main__":
    main()
