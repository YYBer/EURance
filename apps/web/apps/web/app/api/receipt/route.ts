import { NextRequest, NextResponse } from "next/server";
import { indexerClient } from "@/lib/algorand";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txId = searchParams.get("txId");
  if (!txId) {
    return NextResponse.json({ error: "txId required" }, { status: 400 });
  }

  try {
    const result = await indexerClient.lookupTransactionByID(txId).do();
    const txn = result.transaction;
    if (!txn) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const assetTxn = txn.assetTransferTransaction;
    const noteStr = txn.note ? new TextDecoder().decode(txn.note) : undefined;

    return NextResponse.json({
      id: txn.id,
      sender: txn.sender,
      receiver: assetTxn?.receiver,
      amount: assetTxn?.amount !== undefined ? Number(assetTxn.amount) : undefined,
      confirmedRound: Number(txn.confirmedRound),
      roundTime: Number(txn.roundTime),
      note: noteStr,
    });
  } catch {
    return NextResponse.json(
      { error: "Transaction not found or not yet confirmed on Testnet." },
      { status: 404 }
    );
  }
}
