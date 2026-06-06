"use client";
import { WalletProvider as UseWalletProvider, WalletManager, WalletId, NetworkId } from "@txnlab/use-wallet-react";
import { ReactNode, useMemo } from "react";

export function WalletProvider({ children }: { children: ReactNode }) {
  const manager = useMemo(
    () =>
      new WalletManager({
        wallets: [WalletId.PERA, WalletId.DEFLY],
        defaultNetwork: NetworkId.TESTNET,
        networks: {
          [NetworkId.TESTNET]: {
            algod: {
              baseServer:
                process.env.NEXT_PUBLIC_ALGORAND_ALGOD_URL ||
                "https://testnet-api.algonode.cloud",
              port: 443,
              token: "",
            },
          },
        },
      }),
    []
  );

  return <UseWalletProvider manager={manager}>{children}</UseWalletProvider>;
}
