"use client";
import { useModeStore } from "@/lib/modeStore";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { mode, setMode } = useModeStore();

  return (
    <div className="flex items-center bg-zinc-800/80 rounded-lg p-1 gap-0.5 border border-zinc-700/50">
      <button
        onClick={() => setMode("USDC")}
        className={cn(
          "px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
          mode === "USDC"
            ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        USDC
        <span className={cn("ml-1 font-normal text-[10px]", mode === "USDC" ? "text-blue-500/70" : "text-zinc-600")}>
          Real
        </span>
      </button>
      <button
        onClick={() => setMode("EURD")}
        className={cn(
          "px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
          mode === "EURD"
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        EURD
        <span className={cn("ml-1 font-normal text-[10px]", mode === "EURD" ? "text-emerald-500/70" : "text-zinc-600")}>
          Mock
        </span>
      </button>
    </div>
  );
}
