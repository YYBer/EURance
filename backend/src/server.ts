import "dotenv/config";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import OpenAI from "openai";

const AVM_ADDRESS   = process.env.AVM_SERVER_ADDRESS!;
const FACILITATOR   = process.env.X402_FACILITATOR_URL!;
const AVM_NETWORK   = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as const;

if (!AVM_ADDRESS || !FACILITATOR) {
  console.error("❌ Missing AVM_SERVER_ADDRESS or X402_FACILITATOR_URL in .env");
  process.exit(1);
}

// Featherless AI (OpenAI-compatible)
const ai = new OpenAI({
  apiKey: process.env.FEATHERLESS_API!,
  baseURL: "https://api.featherless.ai/v1",
});

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  AVM_NETWORK,
  new ExactAvmScheme(),
);

const app = express();
app.use(express.json());

// x402 payment middleware — $0.10 USDC per AI task
app.use(
  paymentMiddleware(
    {
      "POST /task": {
        accepts: [{ scheme: "exact", price: "$0.10", network: AVM_NETWORK, payTo: AVM_ADDRESS }],
        description: "EURance AI task — pay 0.10 USDC, get AI output",
      },
    },
    resourceServer,
  ),
);

// Protected endpoint — only reached after payment verified
app.post("/task", async (req, res) => {
  const { prompt, type = "general" } = req.body as { prompt: string; type?: string };

  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  console.log(`✅ Payment verified. Running AI task: [${type}] "${prompt}"`);

  try {
    const completion = await ai.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
      messages: [
        {
          role: "system",
          content: `You are an expert AI freelancer specializing in ${type}. Deliver high-quality, professional output.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
    });

    const result = completion.choices[0].message.content;
    console.log(`🤖 AI output ready, returning to client.`);

    res.json({
      success: true,
      type,
      prompt,
      result,
      model: completion.model,
      network: AVM_NETWORK,
      payTo: AVM_ADDRESS,
    });
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", address: AVM_ADDRESS }));

const PORT = process.env.PORT || 4021;
app.listen(PORT, () => {
  console.log(`🚀 EURance backend running at http://localhost:${PORT}`);
  console.log(`   payTo:       ${AVM_ADDRESS}`);
  console.log(`   network:     ${AVM_NETWORK}`);
  console.log(`   facilitator: ${FACILITATOR}`);
});
