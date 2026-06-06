import algosdk from "algosdk";
import { algodClient } from "./algorand";

export const EURD_ASSET_ID = parseInt(
  process.env.NEXT_PUBLIC_EURD_ASSET_ID || "0"
);

export const MOCK_ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_MOCK_ESCROW_ADDRESS || "";

export async function getEURDBalance(address: string): Promise<number> {
  if (!address || !EURD_ASSET_ID) return 0;
  try {
    const info = await algodClient.accountInformation(address).do();
    const holding = info.assets?.find(
      (a) => Number(a.assetId) === EURD_ASSET_ID
    );
    return holding ? Number(holding.amount) / 100 : 0;
  } catch {
    return 0;
  }
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
