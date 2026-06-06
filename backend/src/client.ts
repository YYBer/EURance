/**
 * Test client — simulates a user paying for an AI task via x402 on Algorand.
 * Run: npm run client
 */
import "dotenv/config";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
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

  const client = new x402Client();
  client.register("algorand:*", new ExactAvmScheme(signer));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  const payload = {
    prompt: "Write a professional product description for EURance — a MiCA-compliant AI freelancing platform where European users pay AI agents in EURD or USDC stablecoins via the x402 payment protocol on Algorand.",
    type: "copywriting",
  };

  console.log(`\n📤 Sending task to ${SERVER_URL}/task ...`);
  console.log(`   prompt: "${payload.prompt}"`);

  const response = await fetchWithPayment(`${SERVER_URL}/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("❌ Request failed:", response.status, err);
    process.exit(1);
  }

  const body = await response.json();
  const paymentInfo = new x402HTTPClient(client).getPaymentSettleResponse(
    (name) => response.headers.get(name),
  );

  console.log("\n✅ AI Result:");
  console.log("─".repeat(60));
  console.log(body.result);
  console.log("─".repeat(60));
  console.log("\n💰 Payment settled:");
  console.log(`   tx: ${paymentInfo?.transaction ?? "see facilitator logs"}`);
  console.log(`   network: ${paymentInfo?.network ?? "algorand testnet"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
