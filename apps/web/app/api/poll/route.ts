import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { indexerClient } from "@/lib/algorand";
import { MOCK_ESCROW_ADDRESS, EURD_ASSET_ID } from "@/lib/eurd";
import { Task } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!MOCK_ESCROW_ADDRESS || !EURD_ASSET_ID) {
    return NextResponse.json({ skipped: true });
  }

  try {
    const lastRound = (await kv.get<number>("poll:lastRound")) || 0;

    const result = await indexerClient
      .lookupAccountTransactions(MOCK_ESCROW_ADDRESS)
      .assetID(EURD_ASSET_ID)
      .minRound(lastRound)
      .do();

    const txns = result.transactions || [];
    let processed = 0;

    for (const txn of txns) {
      const noteBytes = txn.note;
      if (!noteBytes) continue;
      try {
        const noteStr = new TextDecoder().decode(noteBytes);
        const note = JSON.parse(noteStr);
        if (note.action !== "lock" || !note.taskId) continue;

        const raw = await kv.get(`task:${note.taskId}`);
        if (!raw) continue;
        const task = JSON.parse(raw as string) as Task;

        if (task.status !== "LOCKED") continue;

        fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/ai/trigger`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task }),
          }
        ).catch(() => {});

        processed++;
      } catch {
        continue;
      }
    }

    if (txns.length > 0) {
      const maxRound = txns.reduce(
        (max: number, t) => Math.max(max, Number(t.confirmedRound || 0)),
        0
      );
      if (maxRound > lastRound) {
        await kv.set("poll:lastRound", maxRound + 1);
      }
    }

    return NextResponse.json({ processed, total: txns.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
