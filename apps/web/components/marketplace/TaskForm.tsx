"use client";
import { useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import toast from "react-hot-toast";
import { Lock, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AgentCard } from "./AgentCard";
import { AgentType, Task, useTaskStore } from "@/lib/store";
import { buildLockTxn, submitSignedTxn } from "@/lib/escrow";
import { nanoid } from "@/lib/nanoid";
import { useModeStore } from "@/lib/modeStore";

export function TaskForm({ onSuccess }: { onSuccess?: () => void }) {
  const { activeAddress, transactionSigner } = useWallet();
  const { mode } = useModeStore();
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const [prompt, setPrompt] = useState("");
  const [agentType, setAgentType] = useState<AgentType | null>(null);
  const [budget, setBudget] = useState("5");
  const [loading, setLoading] = useState(false);

  async function handleSubmitUSdc() {
    if (!activeAddress || !transactionSigner) {
      toast.error("Connect your wallet first");
      return;
    }
    const budgetNum = parseFloat(budget);
    const taskId = nanoid();

    toast.loading("Locking budget on-chain...", { id: "lock" });

    const lockTxn = await buildLockTxn(taskId, budgetNum, activeAddress, mode);
    const signedTxns = await transactionSigner([lockTxn], [0]);
    const txId = await submitSignedTxn(signedTxns[0]);

    toast.success("Budget locked!", { id: "lock" });

    const optimisticTask: Task = {
      id: taskId,
      prompt: prompt.trim(),
      agentType: agentType!,
      budget: budgetNum,
      status: "LOCKED",
      txId,
      isMock: false,
      createdAt: Date.now(),
    };
    addTask(optimisticTask);

    await delay(4000);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        prompt: prompt.trim(),
        agentType,
        budget: budgetNum,
        walletAddress: activeAddress,
        lockTxId: txId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Task creation failed");

    // Sync optimistic task with server response (IDs should now match)
    updateTask(taskId, data);
    pollTask(taskId);
  }

  async function handleSubmitMock() {
    const budgetNum = parseFloat(budget);

    toast.loading("Submitting mock task...", { id: "mock" });

    const res = await fetch("/api/tasks/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.trim(),
        agentType,
        budget: budgetNum,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Mock task failed");

    toast.success("Mock task submitted!", { id: "mock" });
    addTask(data as Task);

    if (data.status === "LOCKED" || data.status === "PROCESSING") {
      pollTask(data.id);
    }
  }

  function pollTask(taskId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) return;
        const updated: Task = await res.json();
        updateTask(taskId, updated);
        if (updated.status === "RELEASED" || updated.status === "COMPLETED") {
          clearInterval(interval);
        }
      } catch {}
    }, 3000);
    setTimeout(() => clearInterval(interval), 120_000);
  }

  async function handleSubmit() {
    if (!prompt.trim()) { toast.error("Enter a prompt"); return; }
    if (!agentType) { toast.error("Select an AI agent"); return; }
    const budgetNum = parseFloat(budget);
    if (!budgetNum || budgetNum < 0.01) { toast.error("Enter a valid budget (min 0.01)"); return; }

    setLoading(true);
    try {
      if (mode === "USDC") {
        await handleSubmitUSdc();
      } else {
        await handleSubmitMock();
      }
      setPrompt("");
      setAgentType(null);
      setBudget("5");
      if (mode === "USDC") toast.success("Task submitted! AI is working...");
      onSuccess?.();
    } catch (err) {
      toast.dismiss("lock");
      toast.dismiss("mock");
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = mode === "USDC" ? !activeAddress || loading : loading;
  const symbol = mode === "USDC" ? "USDC" : "EURD";

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
        <Label className="text-zinc-400 text-xs">Budget ({symbol})</Label>
        <div className="relative mt-1 w-40">
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white"
            min="0.01"
            step="0.01"
            max="100"
            disabled={loading}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {symbol}
          </span>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isDisabled}
        className={
          mode === "USDC"
            ? "w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold h-12"
            : "w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold h-12"
        }
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : mode === "USDC" ? (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Lock Budget & Submit
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Submit Mock Task
          </>
        )}
      </Button>

      {mode === "USDC" && !activeAddress && (
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
