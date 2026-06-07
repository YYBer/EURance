/**
 * Test client — simulates a user paying for an AI task via x402 on Algorand.
 * Run: npm run client
 */
import "dotenv/config";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { toClientAvmSigner } from "@x402/avm";
import { ExactAvmScheme } from "@x402/avm/exact/client";

const AVM_PRIVATE_KEY = process.env.AVM_CLIENT_PRIVATE_KEY!;
const SERVER_URL      = process.env.RESOURCE_SERVER_URL || "http://localhost:4021";

if (!AVM_PRIVATE_KEY) {
  console.error("❌ Missing AVM_CLIENT_PRIVATE_KEY in .env");
  process.exit(1);
}

async function main() {
  const signer = toClientAvmSigner(AVM_PRIVATE_KEY);
  console.log(`💳 Client address: ${signer.address}`);

  const algodUrl = process.env.ALGOD_SERVER;
  const algodToken = process.env.ALGOD_TOKEN || "";

  const client = new x402Client();
  client.register("algorand:*", new ExactAvmScheme(signer, { algodUrl, algodToken }));

  const payload = {
    prompt: "Write a professional product description for EURance — a MiCA-compliant AI freelancing platform where European users pay AI agents in EURD or USDC stablecoins via the x402 payment protocol on Algorand.",
    type: "copywriting",
  };

  console.log(`\n📤 Sending task to ${SERVER_URL}/task ...`);
  console.log(`   prompt: "${payload.prompt}"`);

  // ── Step 1: probe the endpoint (expect 402) ──────────────────────────────
  const probeRes = await fetch(`${SERVER_URL}/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (probeRes.status !== 402) {
    console.error("❌ Expected 402, got:", probeRes.status);
    process.exit(1);
  }

  const paymentHeader = probeRes.headers.get("PAYMENT-REQUIRED");
  if (!paymentHeader) {
    console.error("❌ No PAYMENT-REQUIRED header in 402 response");
    process.exit(1);
  }
  console.log("🔐 Got 402 with payment requirements");

  const httpClient = new x402HTTPClient(client);
  const paymentRequired = httpClient.getPaymentRequiredResponse(
    (name) => probeRes.headers.get(name),
  );
  console.log("   network:", paymentRequired.accepts[0]?.network);
  console.log("   amount: ", paymentRequired.accepts[0]?.amount, "atomic units");
  console.log("   asset:  ", paymentRequired.accepts[0]?.asset);
  console.log("   payTo:  ", paymentRequired.accepts[0]?.payTo);

  // ── Step 2: create and sign the payment payload ──────────────────────────
  console.log("\n✍️  Creating payment payload...");
  let paymentPayload: Awaited<ReturnType<typeof client.createPaymentPayload>>;
  try {
    paymentPayload = await client.createPaymentPayload(paymentRequired);
    console.log("   payload created ✓");
  } catch (err) {
    console.error("❌ createPaymentPayload failed:", err);
    process.exit(1);
  }

  // ── Step 3: send the paid request ────────────────────────────────────────
  console.log("\n💸 Sending payment to server...");
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

  const paidRes = await fetch(`${SERVER_URL}/task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...paymentHeaders,
    },
    body: JSON.stringify(payload),
  });

  console.log("   server response status:", paidRes.status);

  if (!paidRes.ok) {
    const body = await paidRes.text();
    const paymentResponseHeader = paidRes.headers.get("PAYMENT-RESPONSE") ?? paidRes.headers.get("X-PAYMENT-RESPONSE");
    console.error("❌ Payment rejected by server. Status:", paidRes.status);
    console.error("   body:", body);
    console.error("   PAYMENT-RESPONSE header:", paymentResponseHeader);
    process.exit(1);
  }

  // ── Step 4: print result ─────────────────────────────────────────────────
  const body = await paidRes.json();
  const paymentInfo = httpClient.getPaymentSettleResponse(
    (name) => paidRes.headers.get(name),
  );

  console.log("\n✅ AI Result:");
  console.log("─".repeat(60));
  console.log(body.result);
  console.log("─".repeat(60));
  console.log("\n💰 Payment settled:");
  console.log(`   tx:      ${paymentInfo?.transaction ?? "see facilitator logs"}`);
  console.log(`   network: ${paymentInfo?.network ?? "algorand testnet"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
