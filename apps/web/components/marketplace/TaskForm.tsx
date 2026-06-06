"use client";
import { useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import toast from "react-hot-toast";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AgentCard } from "./AgentCard";
import { AgentType, Task, useTaskStore } from "@/lib/store";
import { buildLockTxn, submitSignedTxn } from "@/lib/escrow";
import { nanoid } from "@/lib/nanoid";

export function TaskForm() {
  const { activeAddress, transactionSigner } = useWallet();
  const addTask = useTaskStore((s) => s.addTask);
  const [prompt, setPrompt] = useState("");
  const [agentType, setAgentType] = useState<AgentType | null>(null);
  const [budget, setBudget] = useState("5");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!activeAddress || !transactionSigner) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }
    if (!agentType) {
      toast.error("Select an AI agent");
      return;
    }
    const budgetNum = parseFloat(budget);
    if (!budgetNum || budgetNum < 1) {
      toast.error("Enter a valid budget (min 1 EURD)");
      return;
    }

    setLoading(true);
    const taskId = nanoid();

    try {
      toast.loading("Locking EURD budget on-chain...", { id: "lock" });

      const lockTxn = await buildLockTxn(taskId, budgetNum, activeAddress);

      const signedTxns = await transactionSigner([lockTxn], [0]);
      const txId = await submitSignedTxn(signedTxns[0]);

      toast.success("Budget locked!", { id: "lock" });

      const optimisticTask: Task = {
        id: taskId,
        prompt: prompt.trim(),
        agentType,
        budget: budgetNum,
        status: "LOCKED",
        txId,
        createdAt: Date.now(),
      };
      addTask(optimisticTask);

      await delay(4000);

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          agentType,
          budget: budgetNum,
          walletAddress: activeAddress,
          lockTxId: txId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Task creation failed");

      setPrompt("");
      setAgentType(null);
      setBudget("5");
      toast.success("Task submitted! AI is working...");
    } catch (err) {
      toast.dismiss("lock");
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <AgentCard selected={agentType} onChange={setAgentType} />

      <div>
        <Label className="text-zinc-400 text-xs">Your Prompt</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            agentType === "DESIGNER"
              ? "e.g., A professional logo for a fintech startup in blue and gold..."
              : agentType === "TRANSLATOR"
              ? "e.g., Translate this contract clause to French: ..."
              : "e.g., Write a Python function to calculate compound interest..."
          }
          className="mt-1 bg-zinc-800 border-zinc-700 text-white min-h-[100px] resize-none"
          disabled={loading}
        />
      </div>

      <div>
        <Label className="text-zinc-400 text-xs">Budget (EURD)</Label>
        <div className="relative mt-1 w-40">
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
            min="1"
            max="100"
            disabled={loading}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            EURD
          </span>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!activeAddress || loading}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold h-12"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Lock Budget & Submit
          </>
        )}
      </Button>

      {!activeAddress && (
        <p className="text-center text-sm text-zinc-500">
          Connect your wallet to submit tasks
        </p>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
