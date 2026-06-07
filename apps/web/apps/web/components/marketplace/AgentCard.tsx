"use client";
import { Paintbrush, Languages, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentType } from "@/lib/store";

const AGENTS: { type: AgentType; label: string; description: string; icon: typeof Paintbrush }[] = [
  {
    type: "DESIGNER",
    label: "Designer",
    description: "DALL-E 3 image generation",
    icon: Paintbrush,
  },
  {
    type: "TRANSLATOR",
    label: "Translator",
    description: "GPT-4o language translation",
    icon: Languages,
  },
  {
    type: "CODER",
    label: "Coder",
    description: "GPT-4o code & technical writing",
    icon: Code2,
  },
];

interface Props {
  selected: AgentType | null;
  onChange: (type: AgentType) => void;
}

export function AgentCard({ selected, onChange }: Props) {
  return (
    <div>
      <p className="text-sm text-zinc-400 mb-3">Select AI Agent</p>
      <div className="grid grid-cols-3 gap-3">
        {AGENTS.map(({ type, label, description, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={cn(
              "p-4 rounded-lg border text-left transition-all",
              selected === type
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6 mb-2",
                selected === type ? "text-emerald-400" : "text-zinc-400"
              )}
            />
            <p
              className={cn(
                "font-medium text-sm",
                selected === type ? "text-emerald-300" : "text-white"
              )}
            >
              {label}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
