"use client";
import Link from "next/link";
import { useModeStore } from "@/lib/modeStore";
import { cn } from "@/lib/utils";
import { ArrowRight, Zap, Shield, Coins } from "lucide-react";

export default function LandingPage() {
  const { mode, setMode } = useModeStore();

  return (
    <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-12">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-full px-4 py-1.5 text-xs text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live on Algorand Testnet
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Pay AI Agents
          </span>
          <br />
          <span className="text-white">with Stablecoins</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Submit tasks to on-chain AI agents, lock payment in escrow, and receive work — all settled on Algorand. MiCA-compliant.
        </p>
      </div>

      <div className="w-full max-w-md space-y-3">
        <p className="text-sm text-zinc-500 uppercase tracking-wider">Select mode</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("USDC")}
            className={cn(
              "p-5 rounded-xl border text-left transition-all",
              mode === "USDC"
                ? "bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30"
                : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
            )}
          >
            <div className={cn("text-sm font-bold mb-1", mode === "USDC" ? "text-blue-400" : "text-white")}>
              USDC
            </div>
            <div className="text-xs text-zinc-500">Testnet · Real Transfer</div>
            <div className="mt-2 text-[10px] text-zinc-600">
              Wallet required · On-chain tx
            </div>
          </button>

          <button
            onClick={() => setMode("EURD")}
            className={cn(
              "p-5 rounded-xl border text-left transition-all",
              mode === "EURD"
                ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30"
                : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
            )}
          >
            <div className={cn("text-sm font-bold mb-1", mode === "EURD" ? "text-emerald-400" : "text-white")}>
              EURD
            </div>
            <div className="text-xs text-zinc-500">MiCA · Mock Demo</div>
            <div className="mt-2 text-[10px] text-zinc-600">
              No wallet · Instant demo
            </div>
          </button>
        </div>
      </div>

      <Link
        href="/marketplace"
        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-8 py-3 rounded-lg transition-colors"
      >
        Enter Marketplace
        <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full pt-4 border-t border-zinc-800">
        {[
          {
            icon: Coins,
            title: "On-chain Escrow",
            desc: "Budget is locked on Algorand before AI starts working",
          },
          {
            icon: Zap,
            title: "Instant AI",
            desc: "Designer, Translator, and Coder agents powered by GPT-4o",
          },
          {
            icon: Shield,
            title: "MiCA-Ready",
            desc: "EURD is a Quantoz-issued e-money token. One KYC swap away from live.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="text-left space-y-1">
            <Icon className="h-5 w-5 text-emerald-400 mb-2" />
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-xs text-zinc-500">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
