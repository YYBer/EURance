import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { Task } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const raw = await kv.get(`task:${id}`);
    if (!raw) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const task = (typeof raw === "string" ? JSON.parse(raw) : raw) as Task;
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Error fetching task" }, { status: 500 });
  }
}
