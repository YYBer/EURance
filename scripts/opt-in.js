import algosdk from "algosdk";

const ALGOD_SERVER = "https://testnet-api.algonode.cloud";
const USDC_ASA_ID = 10458941;

const algodClient = new algosdk.Algodv2("", ALGOD_SERVER, 443);

async function optIn(mnemonic, label) {
  const account = algosdk.mnemonicToSecretKey(mnemonic);
  console.log(`\n[${label}] ${account.addr}`);

  // Check current opt-in status
  try {
    const info = await algodClient.accountInformation(account.addr).do();
    const already = info.assets?.find(a => Number(a.assetId) === USDC_ASA_ID);
    if (already) {
      console.log(`  ✅ Already opted in to USDC (balance: ${Number(already.amount)})`);
      return;
    }
  } catch {
    console.log(`  ⚠️  Account not found on-chain yet — needs ALGO first`);
    return;
  }

  const params = await algodClient.getTransactionParams().do();
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: account.addr,
    receiver: account.addr,
    amount: 0,
    assetIndex: USDC_ASA_ID,
    suggestedParams: params,
  });

  const signed = txn.signTxn(account.sk);
  const { txid } = await algodClient.sendRawTransaction(signed).do();
  console.log(`  ✅ Opted in! txid: ${txid}`);
}

// Replace mnemonics with actual values from key.md
const ACCOUNT1_MNEMONIC = "save learn own cradle gadget novel shrimp galaxy cloud rug vast height prevent eager praise settle undo frame zebra alter dry intact dry above left";
const ACCOUNT2_MNEMONIC = "tool mercy evidence tag web supply empty olympic swift grab magnet base settle random prepare sadness obey sorry rice craft stable merge follow about title";

await optIn(ACCOUNT1_MNEMONIC, "Account1 (Client/Payer)");
await optIn(ACCOUNT2_MNEMONIC, "Account2 (Server/Receiver)");
