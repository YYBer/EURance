"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowRight, RefreshCw, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MintProgressStepper } from "./MintProgressStepper";
import { getEURDBalance } from "@/lib/eurd";

type PaymentMethod = "bank" | "card";

export function FiatBridgeWidget() {
  const { activeAddress } = useWallet();
  const [amount, setAmount] = useState("10");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank");
  const [step, setStep] = useState(-1);
  const [txId, setTxId] = useState<string>();
  const [eurdBalance, setEurdBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeAddress) return;
    getEURDBalance(activeAddress).then(setEurdBalance);
  }, [activeAddress, txId]);

  async function handleBridge() {
    if (!activeAddress) {
      toast.error("Connect your wallet first");
      return;
    }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setLoading(true);
    setStep(0);
    setTxId(undefined);

    try {
      await delay(800);
      setStep(1);
      await delay(1500);
      setStep(2);

      const res = await fetch("/api/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, walletAddress: activeAddress }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bridge failed");

      setTxId(data.txId);
      await delay(600);
      setStep(3);
      toast.success(`Bridged €${parsed} → ${parsed} EURD`);
      getEURDBalance(activeAddress).then(setEurdBalance);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bridge failed");
      setStep(-1);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(-1);
    setTxId(undefined);
    setAmount("10");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Euro className="h-5 w-5 text-emerald-400" />
            From Euro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-zinc-400 text-xs">Payment Method</Label>
            <Tabs
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="mt-1"
            >
              <TabsList className="bg-zinc-800 w-full">
                <TabsTrigger value="bank" className="flex-1 text-sm">
                  Bank Transfer
                </TabsTrigger>
                <TabsTrigger value="card" className="flex-1 text-sm">
                  Debit Card
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            <Label className="text-zinc-400 text-xs">Amount (EUR)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                €
              </span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-zinc-800 border-zinc-700 text-white"
                placeholder="10"
                min="1"
                max="10000"
                disabled={loading || step >= 0}
              />
            </div>
          </div>

          <div className="text-xs text-zinc-500 bg-zinc-800/50 rounded-lg p-3">
            <div className="flex justify-between">
              <span>Exchange Rate</span>
              <span className="text-emerald-400">1 EUR = 1 EURD</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>MiCA Compliance</span>
              <span className="text-emerald-400">✓ Verified</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Powered by</span>
              <span className="text-white">Quantoz × Algorand</span>
            </div>
          </div>

          {step < 0 ? (
            <Button
              onClick={handleBridge}
              disabled={!activeAddress || loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
            >
              Bridge to EURD
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : step < 3 ? (
            <Button disabled className="w-full" variant="outline">
              Processing...
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={reset}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Bridge More
              </Button>
              <a
                href="/marketplace"
                className="flex-1 inline-flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm px-3 h-8 transition-colors"
              >
                Go to Marketplace →
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">To EURD on Algorand</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={amount}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"
              >
                {parseFloat(amount) || 0}
              </motion.div>
            </AnimatePresence>
            <p className="text-zinc-400 mt-1 text-sm">EURD on Algorand Testnet</p>
          </div>

          {activeAddress && (
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Your EURD Balance</span>
                <span className="text-white font-medium">
                  {eurdBalance.toFixed(2)} EURD
                </span>
              </div>
            </div>
          )}

          <AnimatePresence>
            {step >= 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MintProgressStepper
                  currentStep={step < 3 ? step : 4}
                  txId={txId}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!activeAddress && (
            <div className="mt-6 text-center text-sm text-zinc-500">
              Connect your wallet to start bridging
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
