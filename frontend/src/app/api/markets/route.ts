import { NextResponse } from "next/server";


export async function GET() {
  try {
    const API_URL = "https://testnet.perpl.xyz/api";

    // 1. Fetch Context
    const contextRes = await fetch(`${API_URL}/v1/pub/context`, {
      next: { revalidate: 15 },
    });
    if (!contextRes.ok) {
      throw new Error(`Failed to fetch context: ${contextRes.status}`);
    }
    const context = await contextRes.json();
    const rawMarkets = context.markets || [];

    // 2. Fetch Bulk Ticker
    let tickers: Record<string, any> = {};
    try {
      const tickerRes = await fetch(`${API_URL}/v1/market-data/ticker`, {
        next: { revalidate: 5 },
      });
      if (tickerRes.ok) {
        const tData = await tickerRes.json();
        tickers = tData.d || {};
      }
    } catch (e) {
      console.warn("Could not fetch ticker, using context fallback", e);
    }

    // 3. Process Each Market for Cost-of-Carry
    const markets = rawMarkets.map((m: any) => {
      const mId = m.id;
      const cfg = m.config || {};
      const pScale = Math.pow(10, cfg.price_decimals || 2);
      const state = tickers[String(mId)] || {};

      const markPrice = state.mrk ? state.mrk / pScale : 0;
      const oraclePrice = state.orl ? state.orl / pScale : markPrice;
      const bestBid = state.bid ? state.bid / pScale : markPrice * 0.999;
      const bestAsk = state.ask ? state.ask / pScale : markPrice * 1.001;
      const midPrice = state.mid ? state.mid / pScale : (bestBid + bestAsk) / 2;
      const spreadBps = markPrice > 0 ? ((bestAsk - bestBid) / markPrice) * 10000 : 5.0;

      // Fees: in micros (10^-6 fractions)
      const makerFeeBps = (cfg.maker_fee || 45) / 100; // e.g. 45 -> 0.45 bps
      const takerFeeBps = (cfg.taker_fee || 345) / 100; // e.g. 345 -> 3.45 bps
      const initialMarginPct = (cfg.initial_margin || 1000) / 100; // e.g. 1000 -> 10%
      const maintenanceMarginPct = (cfg.maintenance_margin || 2000) / 100; // e.g. 2000 -> 20%

      // Funding rate: raw rate is in micros
      // If live ticker has funding or default testnet ~40 micros
      const intervalSec = m.funding_interval_sec || 2580;
      const fundingMicros = m.funding?.rate || 40; // ~40 micros = +0.004%
      const periodicRatePct = fundingMicros / 10000; // 0.004%
      const eightHourRatePct = periodicRatePct * (28800 / intervalSec); // ~0.0447%
      const annualizedApr = periodicRatePct * ((365.25 * 86400) / intervalSec); // ~48.9%

      // Cost of Carry Classification
      // If Long: positive funding = "Cost to Hold" (paying longs); negative = "Paid to Hold"
      // If Short: positive funding = "Paid to Hold"; negative = "Cost to Hold"
      const isPositive = periodicRatePct >= 0;
      const carryStatus = isPositive ? "Cost to Hold" : "Paid to Hold";
      const totalEstimatedHoldingCostBps = eightHourRatePct * 100 + spreadBps + takerFeeBps;

      return {
        id: mId,
        symbol: m.symbol,
        name: m.name || `${m.symbol} Perp`,
        markPrice,
        oraclePrice,
        bestBid,
        bestAsk,
        midPrice,
        spreadBps: Math.round(spreadBps * 100) / 100,
        initialMarginPct,
        maintenanceMarginPct,
        makerFeeBps,
        takerFeeBps,
        fundingIntervalSec: intervalSec,
        periodicRatePct: Math.round(periodicRatePct * 10000) / 10000,
        eightHourRatePct: Math.round(eightHourRatePct * 10000) / 10000,
        annualizedApr: Math.round(annualizedApr * 100) / 100,
        carryStatus,
        totalHoldingCostBps: Math.round(totalEstimatedHoldingCostBps * 100) / 100,
      };
    });

    return NextResponse.json({
      success: true,
      chainId: context.chain?.chain_id || 10143,
      network: "Monad Testnet",
      markets,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch Perpl markets", details: error.message },
      { status: 500 }
    );
  }
}
