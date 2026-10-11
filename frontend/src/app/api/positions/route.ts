import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mockShockPct = parseFloat(searchParams.get("shock") || "0"); // optional simulated price shock

    // Simulated / active live position on BTC
    const markPriceBase = 83920.0;
    const effectiveMarkPrice = markPriceBase * (1 + mockShockPct / 100);
    const entryPrice = 84000.0;
    const size = 0.15; // 0.15 BTC
    const notionalValue = size * effectiveMarkPrice; // ~$12,588
    const maintenanceMarginFraction = 0.25; // 25% maint margin on Perpl BTC
    const maintenanceMarginRequired = notionalValue * maintenanceMarginFraction; // ~$3,147

    // Base collateral
    const baseCollateral = 3200.0;
    const unrealizedPnl = (effectiveMarkPrice - entryPrice) * size;
    const currentMargin = Math.max(0, baseCollateral + unrealizedPnl);

    // Buffer formula: (Current Margin / Maintenance Margin Required) * 100
    const marginBufferPct =
      maintenanceMarginRequired > 0
        ? (currentMargin / maintenanceMarginRequired) * 100
        : 100.0;

    // Funding rate drain: 8h rate = ~0.0447%
    // Hourly rate = 0.0447% / 8 = 0.00558% of notional per hour
    const hourlyFundingPct = 0.0447 / 8 / 100;
    const hourlyFundingDrainUsd = notionalValue * hourlyFundingPct; // ~$0.70 / hour

    // Time-to-Liquidation / Runway Hours:
    // How many hours before current margin drains down to maintenance margin?
    const excessMargin = Math.max(0, currentMargin - maintenanceMarginRequired);
    const runwayHours =
      hourlyFundingDrainUsd > 0
        ? excessMargin / hourlyFundingDrainUsd
        : 999.0;

    // Distance to liquidation price:
    // Liq price when Equity == Maintenance
    // (P_liq - entry) * size + collateral = size * P_liq * maint_frac
    // P_liq * size * (1 - maint_frac) = entry * size - collateral
    // P_liq = (entry * size - collateral) / (size * (1 - maint_frac))
    const liquidationPrice = Math.max(
      0,
      (entryPrice * size - baseCollateral) / (size * (1 - maintenanceMarginFraction))
    );
    const priceDropToLiqPct =
      effectiveMarkPrice > 0
        ? ((effectiveMarkPrice - liquidationPrice) / effectiveMarkPrice) * 100
        : 0;

    // Escalation ladder status
    let escalationStage = "HEALTHY";
    let stepDescription = "Buffer > 20%: Position safe. Normal monitoring active.";
    if (marginBufferPct < 3.0) {
      escalationStage = "STEP_C_TERMINAL";
      stepDescription = "Buffer < 3%: TERMINAL RISK! Emergency market close initiated.";
    } else if (marginBufferPct < 10.0) {
      escalationStage = "STEP_B_URGENT";
      stepDescription = "Buffer < 10%: URGENT! Urgent market de-risk active.";
    } else if (marginBufferPct < 20.0) {
      escalationStage = "STEP_A_WARNING";
      stepDescription = "Buffer < 20%: WARNING! 50% reduce-only limit maker order active.";
    }

    return NextResponse.json({
      success: true,
      walletAddress: "0xb0c95673c0dd05838723cFBd363dA196803F77b5",
      network: "Monad Testnet (Chain ID 10143)",
      position: {
        symbol: "BTC",
        side: "LONG",
        size,
        entryPrice,
        markPrice: effectiveMarkPrice,
        notionalValue: Math.round(notionalValue * 100) / 100,
        collateral: baseCollateral,
        currentMargin: Math.round(currentMargin * 100) / 100,
        unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
        maintenanceMarginRequired: Math.round(maintenanceMarginRequired * 100) / 100,
        marginBufferPct: Math.round(marginBufferPct * 100) / 100,
        runwayHours: Math.round(runwayHours * 10) / 10,
        hourlyFundingDrainUsd: Math.round(hourlyFundingDrainUsd * 100) / 100,
        liquidationPrice: Math.round(liquidationPrice * 100) / 100,
        priceDropToLiqPct: Math.round(priceDropToLiqPct * 100) / 100,
        escalationStage,
        stepDescription,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to calculate position telemetry", details: error.message },
      { status: 500 }
    );
  }
}
