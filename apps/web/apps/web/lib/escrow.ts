import algosdk from "algosdk";
import { algodClient } from "./algorand";
import { EURD_ASSET_ID, USDC_ASSET_ID, MOCK_ESCROW_ADDRESS } from "./eurd";
import type { TokenMode } from "./tokenMode";

export async function buildLockTxn(
  taskId: string,
  amount: number,
  senderAddress: string,
  mode: TokenMode = "USDC"
) {
  const assetId = mode === "USDC" ? USDC_ASSET_ID : EURD_ASSET_ID;
  const decimals = mode === "USDC" ? 6 : 2;

  if (!assetId) {
    throw new Error(
      mode === "USDC"
        ? "NEXT_PUBLIC_USDC_ASSET_ID is not configured"
        : "NEXT_PUBLIC_EURD_ASSET_ID is not configured"
    );
  }
  if (!MOCK_ESCROW_ADDRESS) {
    throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS is not configured");
  }
  const suggestedParams = await algodClient.getTransactionParams().do();
  const atomicAmount = Math.round(amount * Math.pow(10, decimals));
  const note = new TextEncoder().encode(
    JSON.stringify({ taskId, action: "lock" })
  );
  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: senderAddress,
    receiver: MOCK_ESCROW_ADDRESS,
    amount: atomicAmount,
    assetIndex: assetId,
    suggestedParams,
    note,
  });
}

export async function submitSignedTxn(signedTxn: Uint8Array): Promise<string> {
  const { txid } = await algodClient.sendRawTransaction(signedTxn).do();
  return txid;
}
