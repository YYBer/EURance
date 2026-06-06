import { indexerClient } from "../lib/algorand";
import { MOCK_ESCROW_ADDRESS, EURD_ASSET_ID } from "../lib/eurd";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
let lastRound = 0;

async function poll() {
  if (!MOCK_ESCROW_ADDRESS || !EURD_ASSET_ID) return;

  try {
    const result = await indexerClient
      .lookupAccountTransactions(MOCK_ESCROW_ADDRESS)
      .assetID(EURD_ASSET_ID)
      .minRound(lastRound)
      .do();

    const txns = result.transactions || [];

    for (const txn of txns) {
      const noteBytes = txn.note;
      if (!noteBytes) continue;
      try {
        const noteStr = new TextDecoder().decode(noteBytes);
        const note = JSON.parse(noteStr);
        if (note.action !== "lock" || !note.taskId) continue;

        const taskRes = await fetch(`${APP_URL}/api/tasks/${note.taskId}`);
        if (!taskRes.ok) continue;
        const task = await taskRes.json();

        if (task.status !== "LOCKED") continue;

        await fetch(`${APP_URL}/api/ai/trigger`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task }),
        });

        console.log(`[poll] Triggered task ${note.taskId}`);
      } catch {}
    }

    if (txns.length > 0) {
      const maxRound = txns.reduce(
        (max: number, t) => Math.max(max, Number(t.confirmedRound || 0)),
        0
      );
      if (maxRound > lastRound) lastRound = maxRound + 1;
    }
  } catch (err) {
    console.error("[poll] Error:", err);
  }
}

console.log("[poll] Starting dev indexer poller every 10s...");
poll();
setInterval(poll, 10000);
