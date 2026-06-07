"use client";
import { useEffect } from "react";
import { useModeStore } from "@/lib/modeStore";

export function ModeHydration() {
  useEffect(() => {
    useModeStore.persist.rehydrate();
  }, []);
  return null;
}
