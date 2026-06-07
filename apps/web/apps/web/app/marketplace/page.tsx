"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskForm } from "@/components/marketplace/TaskForm";
import { TaskStatusBadge } from "@/components/marketplace/TaskStatusBadge";
import { Task, useTaskStore } from "@/lib/store";
import { useModeStore } from "@/lib/modeStore";
import { TOKEN_CONFIG } from "@/lib/tokenMode";
import { getEURDBalance, getUSDCBalance } from "@/lib/eurd";
import { ExternalLink, Bot, ImageIcon, FileText, Info } from "lucide-react";
import Image from "next/image";

export default function MarketplacePage() {
  const { activeAddress } = useWallet();
  const { tasks, addTask, updateTask } = useTaskStore();
  const { mode } = useModeStore();
  const config = TOKEN_CONFIG[mode];

  const [balance, setBalance] = useState<number | null>(null);

  const refreshBalance = () => {
    if (mode === "EURD") { setBalance(config.mockBalance); return; }
    if (!activeAddress) { setBalance(null); return; }
    const fetchBalance = mode === "USDC" ? getUSDCBalance : getEURDBalance;
    fetchBalance(activeAddress).then(setBalance);
  };

  useEffect(() => {
    refreshBalance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeAddress, config.mockBalance]);

  useEffect(() => {
    if (!activeAddress || mode !== "USDC") return;
    async function fetchTasks() {
      const res = await fetch(`/api/tasks?wallet=${activeAddress}`);
      if (!res.ok) return;
      const fetched: Task[] = await res.json();
      fetched.forEach(addTask);
    }
    fetchTasks();
  }, [activeAddress, addTask, mode]);

  useEffect(() => {
    const activeTasks = tasks.filter(
      (t) => t.status === "LOCKED" || t.status === "PROCESSING"
    );
    if (activeTasks.length === 0) return;

    const interval = setInterval(async () => {
      for (const task of activeTasks) {
        try {
          const res = await fetch(`/api/tasks/${task.id}`);
          if (!res.ok) continue;
          const updated: Task = await res.json();
          if (updated.status !== task.status) updateTask(task.id, updated);
        } catch {}
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [tasks, updateTask]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">AI Task Marketplace</h1>
            {mode === "USDC" ? (
              <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
                Testnet USDC · Real
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                EURD · Mock Demo
              </Badge>
            )}
          </div>
          <p className="text-zinc-400">
            {mode === "USDC"
              ? "Lock USDC as payment on Algorand Testnet and get real AI work done on-chain."
              : "Submit tasks without a wallet. All AI pipelines are real — payment is mocked."}
          </p>
        </div>

        {balance !== null && (
          <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-5 py-3 text-right">
            <div className="text-xs text-zinc-500 mb-1">Balance</div>
            <div className={`text-xl font-bold ${mode === "USDC" ? "text-blue-400" : "text-emerald-400"}`}>
              {balance.toFixed(2)} {config.symbol}
            </div>
            {mode === "EURD" && (
              <div className="text-[10px] text-zinc-600 mt-0.5">Mock</div>
            )}
          </div>
        )}
      </div>

      {mode === "EURD" && (
        <div className="mb-6 flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
          <Info className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-sm text-zinc-400">
            <span className="text-emerald-400 font-medium">EURD Mock Demo — </span>
            This demo skips on-chain payment. Real EURD deployment requires only a{" "}
            <span className="text-white">Quantoz KYC whitelist</span> and an{" "}
            <span className="text-white">ASA ID swap</span>. All escrow logic, AI agents,
            and infrastructure are production-ready.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-400" />
                New Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskForm onSuccess={refreshBalance} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Task Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No tasks yet. Submit one to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {tasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const explorerUrl = task.isMock
    ? null
    : `https://lora.algokit.io/testnet/transaction/${task.txId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-zinc-800 bg-zinc-800/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <TaskStatusBadge status={task.status} />
            <span className="text-xs text-zinc-500">{task.agentType}</span>
            <span className="text-xs text-zinc-500">·</span>
            <span className={`text-xs font-medium ${task.isMock ? "text-emerald-400" : "text-blue-400"}`}>
              {task.budget} {task.isMock ? "EURD" : "USDC"}
            </span>
            {task.isMock && (
              <span className="text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">
                Mock
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-300 truncate">{task.prompt}</p>
          {task.txId && (
            explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mt-1"
              >
                <span className="font-mono">{task.txId.slice(0, 8)}...</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-zinc-600 font-mono mt-1 block">
                {task.txId.slice(0, 16)}... · Mock
              </span>
            )
          )}
        </div>
      </div>

      {(task.status === "COMPLETED" || task.status === "RELEASED") && task.aiResult && (
        <div className="mt-3 pt-3 border-t border-zinc-700">
          {task.aiResultType === "image" ? (
            <div>
              <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2">
                <ImageIcon className="h-3 w-3" />
                Generated Image
              </div>
              <div className="relative w-full aspect-square max-w-xs rounded-lg overflow-hidden">
                <Image
                  src={task.aiResult}
                  alt="AI generated result"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2">
                <FileText className="h-3 w-3" />
                AI Response
              </div>
              <pre className="text-xs text-zinc-300 bg-zinc-900 p-3 rounded-lg whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                {task.aiResult}
              </pre>
            </div>
          )}
          {!task.isMock && task.txId && (
            <a
              href={`/receipt/${task.txId}`}
              className="text-xs text-blue-400 hover:underline mt-2 block"
            >
              View on-chain receipt →
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
