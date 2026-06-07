"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { label: "Euro Received", description: "Your payment has been initiated" },
  {
    label: "Quantoz Verification",
    description: "MiCA-compliant KYC check passed",
  },
  {
    label: "EURD Minted on Algorand",
    description: "Stablecoin issued on-chain",
  },
  { label: "Ready to Spend", description: "EURD available in your wallet" },
];

interface Props {
  currentStep: number;
  txId?: string;
}

export function MintProgressStepper({ currentStep, txId }: Props) {
  return (
    <div className="mt-6 space-y-3">
      {STEPS.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;

        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border transition-colors",
              done
                ? "border-emerald-500/30 bg-emerald-500/5"
                : active
                ? "border-cyan-500/50 bg-cyan-500/5"
                : "border-zinc-800 bg-zinc-900/50"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                done
                  ? "bg-emerald-500"
                  : active
                  ? "bg-cyan-500/20 border border-cyan-500"
                  : "bg-zinc-800 border border-zinc-700"
              )}
            >
              {done ? (
                <Check className="h-3 w-3 text-white" />
              ) : active ? (
                <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  done
                    ? "text-emerald-400"
                    : active
                    ? "text-cyan-300"
                    : "text-zinc-500"
                )}
              >
                {step.label}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{step.description}</p>
              <AnimatePresence>
                {done && index === 2 && txId && (
                  <motion.a
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    href={`https://testnet.algoexplorer.io/tx/${txId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline mt-1 block font-mono"
                  >
                    {txId.slice(0, 12)}...{txId.slice(-8)} ↗
                  </motion.a>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
