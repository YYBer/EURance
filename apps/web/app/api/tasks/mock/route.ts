import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@vercel/kv";
import { nanoid } from "@/lib/nanoid";
import { Task, AgentType } from "@/lib/store";

const MockTaskSchema = z.object({
  prompt: z.string().min(1).max(1000),
  agentType: z.enum(["DESIGNER", "TRANSLATOR", "CODER"]),
  budget: z.number().min(0.01).max(100),
});

const MOCK_RESULTS: Record<AgentType, { result: string; resultType: "image" | "text" }> = {
  DESIGNER: {
    result: "https://placehold.co/1024x1024/0d1117/22c55e?text=Mock+Design+Output",
    resultType: "image",
  },
  TRANSLATOR: {
    result:
      "[Mock Translation — EURD Demo Mode]\n\nTranslation completed successfully.\n\nNote: This is a simulated result. Real EURD deployment requires a Quantoz KYC whitelist and an ASA ID swap. All infrastructure, escrow logic, and AI pipelines are production-ready.",
    resultType: "text",
  },
  CODER: {
    result:
      "// [Mock Code Output — EURD Demo Mode]\n// Real EURD deployment: swap Quantoz KYC whitelist + ASA ID\n\nfunction mockAgent() {\n  return {\n    status: 'RELEASED',\n    payment: 'EURD escrowed on Algorand',\n    note: 'All logic is production-ready',\n  };\n}",
    resultType: "text",
  },
};

export async function POST(req: NextRequest) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const body = await req.json();
    const { prompt, agentType, budget } = MockTaskSchema.parse(body);

    const taskId = nanoid();
    const mockTxId = `MOCK-${nanoid().toUpperCase()}`;

    if (process.env.FEATHERLESS_API) {
      const task: Task = {
        id: taskId,
        prompt,
        agentType,
        budget,
        status: "LOCKED",
        txId: mockTxId,
        isMock: true,
        createdAt: Date.now(),
      };

      try {
        await kv.set(`task:${taskId}`, JSON.stringify(task));
      } catch {}

      fetch(`${appUrl}/api/ai/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      }).catch(() => {});

      return NextResponse.json(task, { status: 201 });
    }

    const { result, resultType } = MOCK_RESULTS[agentType];
    const task: Task = {
      id: taskId,
      prompt,
      agentType,
      budget,
      status: "RELEASED",
      txId: mockTxId,
      aiResult: result,
      aiResultType: resultType,
      isMock: true,
      createdAt: Date.now(),
    };

    try {
      await kv.set(`task:${taskId}`, JSON.stringify(task));
    } catch {}

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
