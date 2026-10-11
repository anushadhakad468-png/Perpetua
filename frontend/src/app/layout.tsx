import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perpetua (Sentinel) | DeFi Risk Guardian on Monad Perpl DEX",
  description:
    "Self-custodied, risk-first perpetual trading assistant and automated liquidation shield built on Perpl DEX (Monad Testnet).",
  keywords: [
    "Monad",
    "Perpl DEX",
    "Perpetual Trading",
    "Risk Management",
    "Liquidation Shield",
    "DeFi",
    "Monad Metropolis Hackathon",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#080a0f] text-gray-100 flex flex-col">{children}</body>
    </html>
  );
}
