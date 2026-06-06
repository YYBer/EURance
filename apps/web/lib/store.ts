"use client";
import { create } from "zustand";

export type AgentType = "DESIGNER" | "TRANSLATOR" | "CODER";
export type TaskStatus =
  | "PENDING"
  | "LOCKED"
  | "PROCESSING"
  | "COMPLETED"
  | "RELEASED";

export interface Task {
  id: string;
  prompt: string;
  agentType: AgentType;
  budget: number;
  status: TaskStatus;
  txId?: string;
  aiResult?: string;
  aiResultType?: "image" | "text";
  createdAt: number;
}

interface Store {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
}

export const useTaskStore = create<Store>((set) => ({
  tasks: [],
  addTask: (task) =>
    set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, patch) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
}));
