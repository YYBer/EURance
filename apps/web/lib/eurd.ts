import algosdk from "algosdk";
import { algodClient } from "./algorand";

export const EURD_ASSET_ID = parseInt(
  process.env.NEXT_PUBLIC_EURD_ASSET_ID || "0"
);

export const USDC_ASSET_ID = parseInt(
  process.env.NEXT_PUBLIC_USDC_ASSET_ID || "0"
);

export const MOCK_ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "";

async function fetchBalanceViaApi(address: string, token: "USDC" | "EURD"): Promise<number> {
  try {
    const res = await fetch(`/api/balance?address=${address}&token=${token}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.balance ?? 0;
  } catch {
    return 0;
  }
}

export async function getEURDBalance(address: string): Promise<number> {
  if (!address) return 0;
  return fetchBalanceViaApi(address, "EURD");
}

export async function getUSDCBalance(address: string): Promise<number> {
  if (!address) return 0;
  return fetchBalanceViaApi(address, "USDC");
}

export async function buildOptInTxn(address: string) {
  const suggestedParams = await algodClient.getTransactionParams().do();
  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: address,
    receiver: address,
    amount: 0,
    assetIndex: EURD_ASSET_ID,
    suggestedParams,
  });
}
