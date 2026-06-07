import { NextRequest, NextResponse } from "next/server";
import { algodClient } from "@/lib/algorand";

const USDC_ASSET_ID = parseInt(process.env.NEXT_PUBLIC_USDC_ASSET_ID || "0");
const EURD_ASSET_ID = parseInt(process.env.NEXT_PUBLIC_EURD_ASSET_ID || "0");

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const token = req.nextUrl.searchParams.get("token") as "USDC" | "EURD" | null;

  if (!address || !token) {
    return NextResponse.json({ error: "Missing address or token" }, { status: 400 });
  }

  const assetId = token === "USDC" ? USDC_ASSET_ID : EURD_ASSET_ID;
  const decimals = token === "USDC" ? 6 : 2;

  if (!assetId) {
    return NextResponse.json({ balance: 0 });
  }

  try {
    const info = await algodClient.accountInformation(address).do();
    const holding = info.assets?.find((a: { assetId: bigint | number }) => Number(a.assetId) === assetId);
    const balance = holding ? Number(holding.amount) / Math.pow(10, decimals) : 0;
    return NextResponse.json({ balance });
  } catch {
    return NextResponse.json({ balance: 0 });
  }
}
