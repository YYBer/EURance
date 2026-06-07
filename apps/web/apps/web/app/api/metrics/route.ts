import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const totalBridged = (await kv.get<number>("metrics:totalBridged")) || 0;
    const activeAgents = (await kv.get<number>("metrics:activeAgents")) || 3;
    const taskCount = (await kv.get<number>("metrics:taskCount")) || 0;
    const totalSpent = (await kv.get<number>("metrics:totalSpent")) || 0;
    const avgCostPerTask = taskCount > 0 ? totalSpent / taskCount : 5;

    return NextResponse.json({ totalBridged, activeAgents, avgCostPerTask });
  } catch {
    return NextResponse.json({
      totalBridged: 0,
      activeAgents: 3,
      avgCostPerTask: 5,
    });
  }
}
