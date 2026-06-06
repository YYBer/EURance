import algosdk from "algosdk";

export const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  443
);

export const indexerClient = new algosdk.Indexer(
  "",
  "https://testnet-idx.algonode.cloud",
  443
);
