import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import algosdk from "algosdk";
import { algodClient } from "@/lib/algorand";
import { EURD_ASSET_ID, getEURDBalance } from "@/lib/eurd";

const BridgeSchema = z.object({
  amount: z.number().min(1).max(10000),
  walletAddress: z.string().min(58).max(58),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, walletAddress } = BridgeSchema.parse(body);

    const mnemonic = process.env.FAUCET_MNEMONIC;
    if (!mnemonic) {
      return NextResponse.json(
        { error: "Faucet not configured" },
        { status: 500 }
      );
    }

    const faucetAccount = algosdk.mnemonicToSecretKey(mnemonic);
    const suggestedParams = await algodClient.getTransactionParams().do();
    const microAmount = Math.round(amount * 100);

    const note = new TextEncoder().encode(
      JSON.stringify({ action: "bridge", amount, to: walletAddress })
    );

    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: faucetAccount.addr,
      receiver: walletAddress,
      amount: microAmount,
      assetIndex: EURD_ASSET_ID,
      suggestedParams,
      note,
    });

    const signedTxn = txn.signTxn(faucetAccount.sk);
    const { txid } = await algodClient.sendRawTransaction(signedTxn).do();

    return NextResponse.json({ txId: txid, amount, timestamp: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  const balance = await getEURDBalance(address);
  return NextResponse.json({ balance });
}
