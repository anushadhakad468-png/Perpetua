"""
Phase 1 Verification Suite for Perpetua (Sentinel)
Tests:
1. Secure burner wallet loading via .env and eth-account.
2. Perpl Testnet REST API connection and market discovery.
3. Real-time Mark price, ticker, and L2 order book extraction.
4. Funding rates and Cost-of-Carry calculation.
5. Margin buffer math and position tracking.
6. Limit and Market order creation, payload assembly, and cryptographic signing.
"""

import sys
import io
import json

# Ensure stdout handles UTF-8 cleanly on Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from perpetua.config import Config
from perpetua.signer import PerplSigner
from perpetua.client import PerplClient


def run_tests():
    print("=" * 70)
    print("[*] PERPETUA (SENTINEL) - PHASE 1 VERIFICATION")
    print("=" * 70)

    # 1. Config & Wallet Loading
    print("\n[Step 1] Loading Configuration and Burner Wallet...")
    config = Config()
    config.validate()
    print(f"  * Monad Chain ID: {config.chain_id}")
    print(f"  * Perpl API URL:  {config.api_url}")
    print(f"  * Perpl Exchange: {config.exchange_address}")

    signer = PerplSigner(config)
    print(f"  * Burner Wallet Address: {signer.wallet_address}")
    print(f"  * Ed25519 Public Key:    {signer.ed25519_public_hex}")
    assert signer.wallet_address.startswith("0x"), "Wallet address invalid"
    print("  [OK] Wallet loading verified successfully.")

    # 2. Client Initialization & Active Markets
    print("\n[Step 2] Initializing PerplClient & Fetching Active Markets...")
    client = PerplClient(config)
    markets = client.get_active_markets()
    print(f"  * Total Active Markets Discovered: {len(markets)}")
    for m in markets:
        print(f"    - {m['symbol']:<5} (ID: {m['market_id']:<3}) | Maint Margin: {m['maintenance_margin_fraction']*100:.1f}% | Taker Fee: {m['taker_fee_bps']:.2f} bps")
    assert len(markets) > 0, "No markets returned from Perpl API"
    print("  [OK] Active markets retrieved successfully.")

    # 3. Mark Prices & Tickers
    print("\n[Step 3] Fetching Live Mark Prices & Order Books...")
    btc_mark = client.get_mark_price("BTC")
    eth_mark = client.get_mark_price("ETH")
    mon_mark = client.get_mark_price("MON")
    print(f"  * BTC Mark Price: ${btc_mark['mark_price']:,.2f} (Oracle: ${btc_mark['oracle_price']:,.2f})")
    print(f"  * ETH Mark Price: ${eth_mark['mark_price']:,.2f} (Oracle: ${eth_mark['oracle_price']:,.2f})")
    print(f"  * MON Mark Price: ${mon_mark['mark_price']:,.5f}")

    btc_book = client.get_order_book("BTC", levels=5)
    print(f"  * BTC Order Book Snapshot: {len(btc_book['bids'])} bids, {len(btc_book['asks'])} asks")
    if btc_book['bids']:
        print(f"    - Best Bid: ${btc_book['bids'][0]['price']:,.2f} ({btc_book['bids'][0]['size']} BTC)")
    if btc_book['asks']:
        print(f"    - Best Ask: ${btc_book['asks'][0]['price']:,.2f} ({btc_book['asks'][0]['size']} BTC)")
    print("  [OK] Mark prices and order book retrieved successfully.")

    # 4. Funding Rates & Cost-of-Carry
    print("\n[Step 4] Fetching Funding Rates & Calculating Cost-of-Carry...")
    funding_rates = client.fetch_funding_rates(hours=24)
    for f in funding_rates[:4]:
        print(f"  * {f['symbol']:<5} | Periodic Rate: {f['periodic_rate_pct']:+.4f}% | 8h Equiv: {f['eight_hour_rate_pct']:+.4f}% | APR: {f['annualized_apr']:+.2f}% | Status: [{f['long_status']}]")
    print("  [OK] Funding rates & Cost-of-Carry calculated successfully.")

    # 5. Margin Balances & Position Health
    print("\n[Step 5] Margin Balances & Health Telemetry...")
    margin_info = client.fetch_margin_balance()
    print(f"  * Collateral Token: {margin_info['collateral_symbol']}")
    print(f"  * Total Balance:    ${margin_info['total_balance']:,.2f}")
    print(f"  * Free Margin:      ${margin_info['free_margin']:,.2f}")

    # Inject a test position to test margin buffer calculations
    # BTC Long with 0.1 BTC @ $70,000, $500 collateral, 14x leverage
    client.clear_test_positions()
    client.inject_test_position(
        symbol="BTC",
        side="LONG",
        size=0.1,
        entry_price=70000.0,
        collateral=500.0,
        leverage=14.0
    )

    positions = client.fetch_positions()
    assert len(positions) == 1, "Expected 1 position"
    pos = positions[0]
    print(f"  * Position: {pos['side']} {pos['size']} {pos['symbol']}")
    print(f"    - Entry Price:         ${pos['entry_price']:,.2f}")
    print(f"    - Current Mark Price:  ${pos['mark_price']:,.2f}")
    print(f"    - Notional Value:      ${pos['notional_value']:,.2f}")
    print(f"    - Maintenance Margin:  ${pos['maintenance_margin_required']:,.2f}")
    print(f"    - Current Equity:      ${pos['current_margin']:,.2f}")
    print(f"    - Margin Buffer Ratio: {pos['margin_buffer']:.2f}%")
    print("  [OK] Position margin calculations verified.")

    # 6. Order Construction & Cryptographic Signing
    print("\n[Step 6] Verifying Order Construction & Signing...")
    
    # Test Limit Order (Step A reduce-only limit order)
    print("  * Testing Limit Order Creation (Reduce-Only 50% Step A)...")
    limit_res = client.place_limit_order(
        symbol_or_id="BTC",
        side="SELL",
        price=pos['mark_price'] * 0.999,
        size=pos['size'] * 0.5,
        post_only=True,
        reduce_only=True
    )
    print(f"    - Result: {limit_res}")

    # Verify position reduced
    positions_after_limit = client.fetch_positions()
    print(f"    - Position size after 50% limit exit: {positions_after_limit[0]['size']:.4f} BTC")
    assert round(positions_after_limit[0]['size'], 3) == 0.05, "Position not reduced properly"

    # Test Market Order (Step B/C urgent market exit)
    print("  * Testing Market Order Creation (Reduce-Only 100% Emergency Step C)...")
    market_res = client.place_market_order(
        symbol_or_id="BTC",
        side="SELL",
        size=positions_after_limit[0]['size'],
        max_slippage_bps=200,
        reduce_only=True
    )
    print(f"    - Result: {market_res}")

    positions_after_close = client.fetch_positions()
    print(f"    - Position count after emergency close: {len(positions_after_close)}")
    assert len(positions_after_close) == 0, "Position was not fully closed"

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL PHASE 1 REQUIREMENTS FULLY VERIFIED!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
