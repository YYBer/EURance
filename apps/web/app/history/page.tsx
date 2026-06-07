"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskStatusBadge } from "@/components/marketplace/TaskStatusBadge";
import { Task, useTaskStore } from "@/lib/store";
import { useModeStore } from "@/lib/modeStore";
import { ExternalLink, History, Wallet } from "lucide-react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { formatDistanceToNow } from "date-fns";

export default function HistoryPage() {
  const { activeAddress } = useWallet();
  const { tasks, addTask } = useTaskStore();
  const { mode } = useModeStore();
  const [chainTasks, setChainTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "USDC" || !activeAddress) return;
    setLoading(true);
    fetch(`/api/tasks?wallet=${activeAddress}`)
      .then((r) => r.json())
      .then((fetched: Task[]) => {
        fetched.forEach(addTask);
        setChainTasks(fetched);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeAddress, mode, addTask]);

  const displayTasks =
    mode === "USDC"
      ? chainTasks
      : tasks.filter((t) => t.isMock);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <History className="h-7 w-7 text-emerald-400" />
          <h1 className="text-3xl font-bold text-white">Task History</h1>
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
        {mode === "USDC" && !activeAddress && <ConnectButton />}
      </div>

      {mode === "USDC" && !activeAddress ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Wallet className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
            <p className="text-zinc-500">Connect your wallet to view on-chain task history.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : displayTasks.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <History className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
            <p className="text-zinc-500">
              {mode === "USDC"
                ? "No tasks found for this wallet on-chain."
                : "No mock tasks yet. Submit one from the Marketplace."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-sm font-medium text-zinc-400">
              {displayTasks.length} task{displayTasks.length !== 1 ? "s" : ""}
              {mode === "USDC" ? " on-chain" : " (mock)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {displayTasks.map((task, i) => (
                <HistoryRow key={task.id} task={task} index={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HistoryRow({ task, index }: { task: Task; index: number }) {
  const explorerUrl = task.isMock
    ? null
    : `https://lora.algokit.io/testnet/transaction/${task.txId}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <div className="shrink-0">
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 truncate">{task.prompt}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-zinc-600">{task.agentType}</span>
          {task.txId && (
            explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
              >
                <span className="font-mono">{task.txId.slice(0, 10)}...</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-zinc-600 font-mono">
                {task.txId.slice(0, 14)}... · Mock
              </span>
            )
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className={`text-sm font-semibold ${task.isMock ? "text-emerald-400" : "text-blue-400"}`}>
          {task.budget} {task.isMock ? "EURD" : "USDC"}
        </div>
        <div className="text-xs text-zinc-600">
          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
        </div>
      </div>
    </motion.div>
  );
}
