import algosdk from "algosdk";
import { algodClient } from "./algorand";
import { EURD_ASSET_ID, MOCK_ESCROW_ADDRESS } from "./eurd";

export async function buildLockTxn(
  taskId: string,
  amountEURD: number,
  senderAddress: string
) {
  const suggestedParams = await algodClient.getTransactionParams().do();
  const microAmount = Math.round(amountEURD * 1_000_000); // USDC testnet: 6 decimals
  const note = new TextEncoder().encode(
    JSON.stringify({ taskId, action: "lock" })
  );
  return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: senderAddress,
    receiver: MOCK_ESCROW_ADDRESS,
    amount: microAmount,
    assetIndex: EURD_ASSET_ID,
    suggestedParams,
    note,
  });
}

export async function submitSignedTxn(signedTxn: Uint8Array): Promise<string> {
  const { txid } = await algodClient.sendRawTransaction(signedTxn).do();
  return txid;
}
