import { Check, Clock, Send, X } from "lucide-react";
import type { SavedEstimateStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: SavedEstimateStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const cls = size === "md" ? "text-xs px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  switch (status) {
    case "approved":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200 ${cls}`}
        >
          <Check className="w-3 h-3" />
          Approved
        </span>
      );
    case "rejected":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-200 ${cls}`}
        >
          <X className="w-3 h-3" />
          Rejected
        </span>
      );
    case "sent":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide bg-blue-100 text-blue-800 border border-blue-200 ${cls}`}
        >
          <Send className="w-3 h-3" />
          Sent
        </span>
      );
    case "draft":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide bg-muted text-muted-foreground border border-border ${cls}`}
        >
          <Clock className="w-3 h-3" />
          Draft
        </span>
      );
  }
}
