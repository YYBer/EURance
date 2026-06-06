import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import OpenAI from "openai";
import { Task, AgentType } from "@/lib/store";

export const maxDuration = 60;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function runAgent(
  agentType: AgentType,
  prompt: string
): Promise<{ result: string; resultType: "image" | "text" }> {
  const openai = getOpenAI();
  switch (agentType) {
    case "DESIGNER": {
      const res = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Professional design for: ${prompt}`,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      });
      const url = res.data?.[0]?.url;
      return { result: url ?? "Image generation failed", resultType: "image" as const };
    }
    case "TRANSLATOR": {
      const res = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator. Translate the following text accurately and naturally.",
          },
          { role: "user", content: prompt },
        ],
      });
      return {
        result: res.choices[0].message.content || "",
        resultType: "text",
      };
    }
    case "CODER": {
      const res = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an expert software engineer. Write clean, well-structured code with brief explanations.",
          },
          { role: "user", content: prompt },
        ],
      });
      return {
        result: res.choices[0].message.content || "",
        resultType: "text",
      };
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
