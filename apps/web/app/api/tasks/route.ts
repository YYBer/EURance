import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@vercel/kv";
import { nanoid } from "@/lib/nanoid";
import { indexerClient } from "@/lib/algorand";
import { Task } from "@/lib/store";

const CreateTaskSchema = z.object({
  prompt: z.string().min(1).max(1000),
  agentType: z.enum(["DESIGNER", "TRANSLATOR", "CODER"]),
  budget: z.number().min(1).max(100),
  walletAddress: z.string().length(58),
  lockTxId: z.string(),
});

async function verifyLockTxn(txId: string, walletAddress: string): Promise<boolean> {
  try {
    const result = await indexerClient.lookupTransactionByID(txId).do();
    const txn = result.transaction;
    if (!txn) return false;
    const sender = txn.sender;
    return sender === walletAddress;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, agentType, budget, walletAddress, lockTxId } =
      CreateTaskSchema.parse(body);

    const valid = await verifyLockTxn(lockTxId, walletAddress);
    if (!valid) {
      return NextResponse.json(
        { error: "Lock transaction not confirmed or invalid" },
        { status: 400 }
      );
    }

    const task: Task = {
      id: nanoid(),
      prompt,
      agentType,
      budget,
      status: "LOCKED",
      txId: lockTxId,
      createdAt: Date.now(),
    };

    await kv.hset(`tasks:${walletAddress}`, { [task.id]: JSON.stringify(task) });
    await kv.set(`task:${task.id}`, JSON.stringify(task));

    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/ai/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task }),
    }).catch(() => {});

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  try {
    const raw = await kv.hgetall(`tasks:${wallet}`);
    if (!raw) return NextResponse.json([]);
    const tasks = Object.values(raw)
      .map((v) => JSON.parse(v as string) as Task)
      .sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json([]);
  }
}
