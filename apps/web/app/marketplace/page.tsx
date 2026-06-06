"use client";
import { useEffect } from "react";
import { useWallet } from "@txnlab/use-wallet-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskForm } from "@/components/marketplace/TaskForm";
import { TaskStatusBadge } from "@/components/marketplace/TaskStatusBadge";
import { Task, useTaskStore } from "@/lib/store";
import { ExternalLink, Bot, ImageIcon, FileText } from "lucide-react";
import Image from "next/image";

export default function MarketplacePage() {
  const { activeAddress } = useWallet();
  const { tasks, addTask, updateTask } = useTaskStore();

  useEffect(() => {
    if (!activeAddress) return;

    async function fetchTasks() {
      const res = await fetch(`/api/tasks?wallet=${activeAddress}`);
      if (!res.ok) return;
      const fetched: Task[] = await res.json();
      fetched.forEach(addTask);
    }

    fetchTasks();
  }, [activeAddress, addTask]);

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
          if (updated.status !== task.status) {
            updateTask(task.id, updated);
          }
        } catch {}
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [tasks, updateTask]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">AI Task Marketplace</h1>
        <p className="text-zinc-400 mt-2">
          Choose an AI agent, lock EURD as payment, and get work done on-chain.
        </p>
      </div>

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
              <TaskForm />
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-zinc-800 bg-zinc-800/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TaskStatusBadge status={task.status} />
            <span className="text-xs text-zinc-500">{task.agentType}</span>
            <span className="text-xs text-zinc-500">·</span>
            <span className="text-xs text-emerald-400">{task.budget} EURD</span>
          </div>
          <p className="text-sm text-zinc-300 truncate">{task.prompt}</p>
          {task.txId && (
            <a
              href={`https://testnet.algoexplorer.io/tx/${task.txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mt-1"
            >
              <span className="font-mono">
                {task.txId.slice(0, 8)}...
              </span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {(task.status === "COMPLETED" || task.status === "RELEASED") &&
        task.aiResult && (
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
            <a
              href={`/receipt/${task.txId}`}
              className="text-xs text-emerald-400 hover:underline mt-2 block"
            >
              View on-chain receipt →
            </a>
          </div>
        )}
    </motion.div>
  );
}
