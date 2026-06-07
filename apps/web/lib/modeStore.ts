"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TokenMode } from "./tokenMode";

interface ModeStore {
  mode: TokenMode;
  setMode: (mode: TokenMode) => void;
}

export const useModeStore = create<ModeStore>()(
  persist(
    (set) => ({
      mode: "USDC" as TokenMode,
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "eurance-token-mode",
      skipHydration: true,
    }
  )
);
