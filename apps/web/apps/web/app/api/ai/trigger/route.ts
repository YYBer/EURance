import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import OpenAI from "openai";
import { Task, AgentType } from "@/lib/store";

export const maxDuration = 60;

const MODEL = "deepseek-ai/DeepSeek-V3-0324";

function getClient() {
  return new OpenAI({
    baseURL: "https://api.featherless.ai/v1",
    apiKey: process.env.FEATHERLESS_API_KEY,
  });
}

async function runAgent(
  agentType: AgentType,
  prompt: string
): Promise<{ result: string; resultType: "image" | "text" }> {
  const client = getClient();
  switch (agentType) {
    case "DESIGNER": {
      const res = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a professional visual designer. When given a design brief, produce a detailed design specification including layout, color palette, typography, and component structure. Be specific and actionable.",
          },
          { role: "user", content: prompt },
        ],
      });
      return { result: res.choices[0].message.content || "", resultType: "text" };
    }
    case "TRANSLATOR": {
      const res = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator. Translate the following text accurately and naturally.",
          },
          { role: "user", content: prompt },
        ],
      });
      return { result: res.choices[0].message.content || "", resultType: "text" };
    }
    case "CODER": {
      const res = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an expert software engineer. Write clean, well-structured code with brief explanations.",
          },
          { role: "user", content: prompt },
        ],
      });
      return { result: res.choices[0].message.content || "", resultType: "text" };
    }
  }
}

async function updateTask(task: Task, patch: Partial<Task>) {
  const updated = { ...task, ...patch };
  await kv.set(`task:${task.id}`, JSON.stringify(updated));
  return updated;
}

export async function POST(req: NextRequest) {
  try {
    const { task } = (await req.json()) as { task: Task };

    await updateTask(task, { status: "PROCESSING" });

    const { result, resultType } = await runAgent(task.agentType, task.prompt);

    const completed = await updateTask(task, {
      status: "COMPLETED",
      aiResult: result,
      aiResultType: resultType,
    });

    await updateTask(completed, { status: "RELEASED" });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
