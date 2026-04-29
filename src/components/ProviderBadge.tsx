import { Sparkles, ShieldAlert } from "lucide-react";
import type { AiProviderName } from "@/lib/types";

interface ProviderBadgeProps {
  providerUsed: AiProviderName;
  providerReason?: string;
  compact?: boolean;
}

function reasonLabel(reason?: string): string | undefined {
  if (!reason) return undefined;
  if (reason === "gemini_error_429") return "rate limited";
  if (reason === "gemini_error_503") return "service busy";
  if (reason === "gemini_backoff_429_active") return "rate-limit cooldown";
  if (reason === "client_rate_limited") return "cooldown active";
  if (reason === "gemini_timeout" || reason === "gemini_stream_stall") {
    return "timeout";
  }
  return reason;
}

export function ProviderBadge({
  providerUsed,
  providerReason,
  compact,
}: ProviderBadgeProps) {
  const isGemini = providerUsed === "gemini";
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        isGemini
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-amber-300 bg-amber-50 text-amber-800"
      }`}
      data-testid="provider-badge"
      data-provider={providerUsed}
      data-reason={providerReason ?? ""}
    >
      {isGemini ? (
        <Sparkles className="w-3 h-3" />
      ) : (
        <ShieldAlert className="w-3 h-3" />
      )}
      <span>{isGemini ? "Powered by Gemini" : "Fallback mode"}</span>
      {!compact && providerReason && (
        <span className="opacity-70">· {reasonLabel(providerReason)}</span>
      )}
    </div>
  );
}

export function ProviderTechRow({
  providerUsed,
  providerReason,
}: ProviderBadgeProps) {
  return (
    <p
      className="text-[10px] text-muted-foreground/80 font-mono"
      data-testid="provider-tech-row"
    >
      Provider: {providerUsed}
      {providerReason ? ` (reason: ${providerReason})` : ""}
    </p>
  );
}
