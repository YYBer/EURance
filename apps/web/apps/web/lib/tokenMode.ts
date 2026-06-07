export type TokenMode = "USDC" | "EURD";

export const TOKEN_CONFIG = {
  USDC: {
    symbol: "USDC",
    decimals: 6,
    tabLabel: "Testnet · Real Transfer",
    badgeLabel: "Testnet USDC · Real",
    mockBalance: null,
    explorerBase: "https://lora.algokit.io/testnet/transaction",
  },
  EURD: {
    symbol: "EURD",
    decimals: 2,
    tabLabel: "MiCA · Mock Demo",
    badgeLabel: "EURD · Mock Demo",
    mockBalance: 1250.0,
    explorerBase: null,
  },
} as const;

export function atomicToDisplay(atomic: number, mode: TokenMode): number {
  return atomic / Math.pow(10, TOKEN_CONFIG[mode].decimals);
}
