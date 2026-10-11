import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Locate receipts.json in the project root data directory
function getReceiptsPath(): string {
  const rootData = path.resolve(process.cwd(), "..", "data", "receipts.json");
  if (fs.existsSync(rootData)) return rootData;
  const localData = path.resolve(process.cwd(), "data", "receipts.json");
  return localData;
}

export async function GET() {
  try {
    const receiptsPath = getReceiptsPath();
    if (!fs.existsSync(receiptsPath)) {
      return NextResponse.json({
        receipts: [],
        stats: {
          total_interventions: 0,
          total_liquidations_avoided: 0,
          total_capital_saved_usd: 0,
          step_a_maker_derisk_count: 0,
          step_b_urgent_market_count: 0,
          step_c_emergency_close_count: 0,
        },
      });
    }

    const raw = fs.readFileSync(receiptsPath, "utf-8");
    const receipts = JSON.parse(raw);

    const step_a = receipts.filter((r: any) => r.action_step === "STEP_A_LIMIT").length;
    const step_b = receipts.filter((r: any) => r.action_step === "STEP_B_URGENT").length;
    const step_c = receipts.filter((r: any) => r.action_step === "STEP_C_TERMINAL").length;
    const total_saved = receipts.reduce(
      (sum: number, r: any) => sum + (Number(r.estimated_penalty_saved) || 0),
      0
    );

    return NextResponse.json({
      receipts,
      stats: {
        total_interventions: receipts.length,
        total_liquidations_avoided: step_b + step_c,
        total_capital_saved_usd: Math.round(total_saved * 100) / 100,
        step_a_maker_derisk_count: step_a,
        step_b_urgent_market_count: step_b,
        step_c_emergency_close_count: step_c,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to read receipts", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const receiptsPath = getReceiptsPath();
    let receipts: any[] = [];
    if (fs.existsSync(receiptsPath)) {
      try {
        receipts = JSON.parse(fs.readFileSync(receiptsPath, "utf-8"));
      } catch {
        receipts = [];
      }
    }

    // Generate a new simulated defense receipt for live demo interaction
    const step = body.step || "STEP_A_LIMIT";
    const market = body.market || "BTC";
    const buffer = body.buffer || (step === "STEP_C_TERMINAL" ? 1.8 : step === "STEP_B_URGENT" ? 8.5 : 16.2);
    const size = body.size || 0.1;
    const price = body.price || 83920.0;
    const notional = size * price;
    const penaltySaved = step === "STEP_C_TERMINAL" ? notional * 0.03 : step === "STEP_B_URGENT" ? notional * 0.025 : notional * 0.015;

    const newReceipt = {
      id: `rcpt_${Math.random().toString(36).substring(2, 10)}`,
      timestamp: Date.now() / 1000,
      timestamp_iso: new Date().toISOString(),
      market,
      market_id: market === "ETH" ? 32 : market === "SOL" ? 48 : 16,
      action_step: step,
      trigger_reason:
        step === "STEP_C_TERMINAL"
          ? `Terminal margin buffer at ${buffer}% (< 3%). Emergency full close executed.`
          : step === "STEP_B_URGENT"
          ? `Urgent de-risk at ${buffer}% (< 10%). Immediate market order executed.`
          : `Warning buffer at ${buffer}% (< 20%). Reduce-only maker limit order placed.`,
      margin_buffer_pct: buffer,
      mark_price: price,
      position_size_before: size,
      size_closed: step === "STEP_A_LIMIT" ? size * 0.5 : size,
      position_size_remaining: step === "STEP_A_LIMIT" ? size * 0.5 : 0.0,
      order_type: step === "STEP_A_LIMIT" ? "LIMIT_MAKER" : "MARKET_TAKER",
      estimated_penalty_saved: Math.round(penaltySaved * 100) / 100,
      monad_tx_id: `0x${Math.random().toString(16).substring(2, 8)}`,
      explorer_url: `https://testnet.monadscan.com/tx/0x${Math.random().toString(16).substring(2, 8)}`,
    };

    receipts.unshift(newReceipt);
    fs.writeFileSync(receiptsPath, JSON.stringify(receipts, null, 2));

    return NextResponse.json({ success: true, receipt: newReceipt });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create simulated receipt", details: error.message },
      { status: 500 }
    );
  }
}
