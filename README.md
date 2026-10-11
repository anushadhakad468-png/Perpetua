# 🛡️ Perpetua (Sentinel)

**A self-custodied, risk-first on-chain guardian for perpetual traders on the Monad Testnet.**

Built for the **Monad Metropolis Hackathon (Onchain Finance & Trading Track)**, Perpetua is an automated risk-management assistant that integrates with the Perpl DEX to protect retail traders from invisible funding rate drains and brutal exchange liquidation penalties.

---

## 🛑 The Problem
Retail crypto traders trading perpetual futures constantly lose capital to two hidden mechanics that standard exchanges do not highlight:
1. **The Funding Drain:** Holding a position against the market trend incurs a continuous "Cost of Carry." A trader can be liquidated without the asset's price ever dropping, simply because negative funding rates bled their margin to zero.
2. **Dumb Stop-Losses & Liquidation Penalties:** A standard stop-loss executes a 100% Market Order, incurring terrible slippage and max taker fees. If a stop-loss is missed, the exchange triggers a liquidation and steals the remaining margin as an "Insurance Fund Penalty" (often 3-5%).

## 💡 The Solution
Perpetua acts as an algorithmic trading desk for retail users. It continuously monitors the on-chain health of a position and executes a smart **Escalation Ladder** to de-risk the trade safely *before* the exchange liquidator steps in.

### Core Features
*   **Cost-of-Carry Screener:** A dashboard that ranks Perpl markets by true holding cost (funding + fees + spread), labeling them cleanly as "Cost to Hold" or "Paid to Hold."
*   **Live Runway Gauge:** Calculates exactly how many hours a trade can survive current funding rates before hitting bankruptcy.
*   **The Guardian Escalation Ladder:** A 24/7 Python daemon that steps in during margin crashes:
    *   **Step A (Warning):** Places a cheap `reduce-only` Limit Order to cut the position by 50% with zero slippage.
    *   **Step B (Urgent):** If the limit order times out during a flash crash, it escalates to a Market Order to guarantee safety.
    *   **Step C (Terminal):** Emergency full-close right before exchange liquidation, successfully saving the user from the massive liquidation penalty.
*   **Transparency Receipts:** Logs every automated intervention, proving on-chain how much capital the bot saved the user.

---

## ⚙️ Tech Stack
*   **Backend / Guardian Worker:** Python 3, `web3.py`, `eth-account`, `requests`, `python-dotenv`.
*   **Frontend Dashboard:** Next.js (App Router), React, TailwindCSS.
*   **Network:** Monad Testnet (Chain ID: 10143).
*   **DeFi Integration:** Perpl DEX (REST API & WebSockets).

---

## 🚀 How to Run Locally

To test the full Perpetua pipeline, you will need to run the Python Guardian Worker and the Next.js Frontend simultaneously.

### 1. Clone the Repository
```bash
git clone [https://github.com/anushadhakad468-png/Perpetua.git](https://github.com/anushadhakad468-png/Perpetua.git)
cd Perpetua
