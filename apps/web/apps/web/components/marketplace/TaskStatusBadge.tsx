import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Pending", className: "bg-zinc-700 text-zinc-300" },
  LOCKED: { label: "Locked", className: "bg-blue-900 text-blue-300" },
  PROCESSING: {
    label: "Processing",
    className: "bg-amber-900 text-amber-300 animate-pulse",
  },
  COMPLETED: { label: "Completed", className: "bg-emerald-900 text-emerald-300" },
  RELEASED: {
    label: "Released",
    className: "bg-purple-900 text-purple-300",
  },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <Badge className={cn("text-xs font-medium border-0", className)}>
      {label}
    </Badge>
  );
}
