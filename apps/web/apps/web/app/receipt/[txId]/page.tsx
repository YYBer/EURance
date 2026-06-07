"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, ExternalLink, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface TxData {
  id: string;
  sender: string;
  receiver?: string;
  amount?: number;
  confirmedRound?: number;
  roundTime?: number;
  note?: string;
}

function decodeNote(noteB64?: string): string {
  if (!noteB64) return "—";
  try {
    return Buffer.from(noteB64, "base64").toString("utf8");
  } catch {
    return noteB64;
  }
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp * 1000).toLocaleString();
}

export default function ReceiptPage() {
  const params = useParams<{ txId: string }>();
  const txId = params.txId;
  const [txData, setTxData] = useState<TxData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!txId) return;
    fetch(`/api/receipt?txId=${txId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTxData(data);
      })
      .catch(() => setError("Failed to fetch transaction"))
      .finally(() => setLoading(false));
  }, [txId]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        href="/marketplace"
        className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Receipt className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">On-Chain Receipt</h1>
          <Badge className="bg-emerald-900 text-emerald-300 border-0">
            Algorand Testnet
          </Badge>
        </div>
        <p className="text-zinc-400 mt-2 text-sm">
          Cryptographically verified payment record
        </p>
      </div>

      {loading ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-10 text-center text-zinc-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading transaction...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-10 text-center text-zinc-500">
            {error}
          </CardContent>
        </Card>
      ) : txData ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <Row
                label="Transaction ID"
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-300 break-all">
                      {txId}
                    </span>
                    <a
                      href={`https://testnet.algoexplorer.io/tx/${txId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 flex-shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                }
              />
              <Row
                label="Sender"
                value={
                  <span className="font-mono text-xs text-zinc-300 break-all">
                    {txData.sender || "—"}
                  </span>
                }
              />
              {txData.receiver && (
                <Row
                  label="Receiver"
                  value={
                    <span className="font-mono text-xs text-zinc-300 break-all">
                      {txData.receiver}
                    </span>
                  }
                />
              )}
              {txData.amount !== undefined && (
                <Row
                  label="Amount"
                  value={
                    <span className="text-emerald-400 font-semibold">
                      {(txData.amount / 100).toFixed(2)} EURD
                    </span>
                  }
                />
              )}
              <Row
                label="Confirmed At"
                value={
                  <span className="text-zinc-300">
                    {formatDate(txData.roundTime)}
                  </span>
                }
              />
              <Row
                label="Round"
                value={
                  <span className="font-mono text-xs text-zinc-300">
                    {txData.confirmedRound || "—"}
                  </span>
                }
              />
              <Row
                label="Note"
                value={
                  <span className="font-mono text-xs text-zinc-300 break-all">
                    {decodeNote(txData.note)}
                  </span>
                }
              />
            </dl>

            <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-xs text-zinc-500">
                MiCA-compliant · EURD × Algorand
              </span>
              <button
                onClick={() => window.print()}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                Download PDF ↓
              </button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
      <dt className="text-zinc-500 text-sm flex-shrink-0 w-36">{label}</dt>
      <dd className="flex-1">{value}</dd>
    </div>
  );
}
