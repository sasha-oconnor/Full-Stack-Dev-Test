"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProviderBadge, ProviderTechRow } from "@/components/ProviderBadge";
import type {
  AiSuggestionResult,
  Customer,
  EstimateLineItem,
  EquipmentSuggestion,
  LaborRate,
  LaborSuggestion,
} from "@/lib/types";
import { getEquipmentById } from "@/lib/data";
import { formatLaborLabel } from "@/lib/calculations";
import {
  Sparkles,
  Plus,
  ClipboardList,
  Wrench,
  AlertCircle,
  RefreshCcw,
  Check,
} from "lucide-react";

interface AiAssistPanelProps {
  customer: Customer;
  notes: string;
  selectedLineItems: EstimateLineItem[];
  selectedLabor: LaborRate | null;
  laborRates: LaborRate[];
  onApplyEquipment: (suggestion: EquipmentSuggestion) => void;
  onApplyLabor: (rate: LaborRate) => void;
  onClearLabor: () => void;
  onInsertSummaryDraft: (text: string) => void;
  onAppendNoteLine: (line: string) => void;
}

type GenStatus = "idle" | "loading" | "done" | "error";

function friendlyAiError(message: string | null): string {
  if (!message) return "Could not analyze notes. Please try again.";
  if (message.includes("429") || message.includes("gemini_error_429")) {
    return "Gemini is rate-limited right now. Showing fallback suggestions.";
  }
  if (message.includes("503") || message.includes("gemini_error_503")) {
    return "Gemini is temporarily unavailable. Showing fallback suggestions.";
  }
  if (message.includes("timeout") || message.includes("gemini_timeout")) {
    return "Gemini took too long. Showing fallback suggestions.";
  }
  return `Could not analyze notes (${message}). Please try again.`;
}

export function AiAssistPanel({
  customer,
  notes,
  selectedLineItems,
  selectedLabor,
  laborRates,
  onApplyEquipment,
  onApplyLabor,
  onClearLabor,
  onInsertSummaryDraft,
  onAppendNoteLine,
}: AiAssistPanelProps) {
  const [status, setStatus] = useState<GenStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiSuggestionResult | null>(null);

  // Track items the user has applied so we can replace the Add button with a
  // brief confirmation. This is *temporary* per-result feedback only; we do
  // not visually lock any "recommended" option.
  const [appliedEquipmentIds, setAppliedEquipmentIds] = useState<Set<string>>(
    new Set()
  );
  const [insertedSummary, setInsertedSummary] = useState(false);
  const [missingAnswers, setMissingAnswers] = useState<Record<number, string>>({});

  const isLoading = status === "loading";

  async function handleAnalyze() {
    if (isLoading) return;
    if (!notes.trim()) {
      setError("Add some notes first, then tap Analyze.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    setResult(null);
    setAppliedEquipmentIds(new Set());
    setInsertedSummary(false);
    setMissingAnswers({});

    try {
      const resp = await fetch("/api/ai/estimate-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "",
          customerContext: {
            propertyType: customer.propertyType,
            systemType: customer.systemType,
            systemAge: customer.systemAge,
            squareFootage: customer.squareFootage,
          },
          notes,
          selectedEquipmentIds: selectedLineItems.map((li) => li.equipment.id),
        }),
      });

      if (!resp.ok) {
        throw new Error(`request_failed_${resp.status}`);
      }

      const data: AiSuggestionResult = await resp.json();
      setResult(data);
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown_error";
      setError(msg);
      setStatus("error");
    }
  }

  function handleApplyEquipment(suggestion: EquipmentSuggestion) {
    onApplyEquipment(suggestion);
    setAppliedEquipmentIds((prev) => {
      const next = new Set(prev);
      next.add(suggestion.equipmentId);
      return next;
    });
  }

  function handleApplyLabor(suggestion: LaborSuggestion) {
    const key = `${suggestion.jobType}/${suggestion.level}`;
    const selectedKey = selectedLabor
      ? `${selectedLabor.jobType}/${selectedLabor.level}`
      : null;
    if (selectedKey === key) {
      onClearLabor();
      return;
    }

    const match = laborRates.find(
      (r) => r.jobType === suggestion.jobType && r.level === suggestion.level
    );
    if (!match) return;
    onApplyLabor(match);
  }

  function handleInsertSummary(text: string) {
    onInsertSummaryDraft(text);
    setInsertedSummary(true);
  }

  function handleMissingAnswerChange(index: number, value: string) {
    setMissingAnswers((prev) => ({ ...prev, [index]: value }));
  }

  function handleInsertMissingAnswer(index: number, question: string) {
    const answer = (missingAnswers[index] ?? "").trim();
    if (!answer) return;
    onAppendNoteLine(`- ${question}: ${answer}`);
    setMissingAnswers((prev) => ({ ...prev, [index]: "" }));
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b bg-violet-50/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">AI notes assistant</p>
            <p className="text-xs text-muted-foreground truncate">
              Analyze your notes for equipment, labor, and a summary draft.
            </p>
          </div>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={isLoading || !notes.trim()}
          size="sm"
          className="h-9 shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCcw className="w-4 h-4 mr-1.5 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Analyze Notes
            </>
          )}
        </Button>
      </div>

      <div className="px-4 py-3 space-y-4">
        {status === "idle" && (
          <p className="text-xs text-muted-foreground">
            Tip: dictate or type notes above, then tap Analyze. Suggestions stay
            advisory — nothing changes until you tap Add or Apply.
          </p>
        )}

        {status === "error" && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            {friendlyAiError(error)}
          </div>
        )}

        {status === "done" && result && (
          <div className="space-y-4">
            {result.providerUsed === "fallback" &&
              (result.providerReason === "gemini_error_429" ||
                result.providerReason === "gemini_error_503" ||
                result.providerReason === "gemini_timeout" ||
                result.providerReason === "client_rate_limited") && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Gemini didn&apos;t respond cleanly. Showing fallback
                  suggestions for now.
                </div>
              )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <ProviderBadge
                providerUsed={result.providerUsed}
                providerReason={result.providerReason}
              />
              <ProviderTechRow
                providerUsed={result.providerUsed}
                providerReason={result.providerReason}
              />
            </div>

            <SuggestionGroup
              title="Suggested service profile"
              icon={<Wrench className="w-3.5 h-3.5" />}
              empty="No labor suggestions"
              items={[result.laborPrimary, result.laborAlternative].filter(
                (x): x is LaborSuggestion => !!x
              )}
              renderItem={(s) => {
                const key = `${s.jobType}/${s.level}`;
                const selectedKey = selectedLabor
                  ? `${selectedLabor.jobType}/${selectedLabor.level}`
                  : null;
                return (
                  <LaborRow
                    key={key}
                    suggestion={s}
                    selected={selectedKey === key}
                    onApply={() => handleApplyLabor(s)}
                  />
                );
              }}
            />

            <SuggestionGroup
              title="Suggested fixes / equipment"
              icon={<Plus className="w-3.5 h-3.5" />}
              empty="No equipment suggestions"
              items={[
                ...result.primaryEquipment,
                ...result.alternativeEquipment,
              ]}
              renderItem={(s) => (
                <EquipmentRow
                  key={s.equipmentId}
                  suggestion={s}
                  applied={appliedEquipmentIds.has(s.equipmentId)}
                  onApply={() => handleApplyEquipment(s)}
                />
              )}
            />

            {result.missingInfo.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Missing info to confirm
                </h4>
                <ul className="rounded-lg border bg-card divide-y">
                  {result.missingInfo.map((m, i) => (
                    <li key={i} className="px-3 py-2 text-sm">
                      <p className="font-medium">{m.question}</p>
                      {m.why && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.why}
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={missingAnswers[i] ?? ""}
                          onChange={(e) =>
                            handleMissingAnswerChange(i, e.target.value)
                          }
                          placeholder="Type answer to add into notes..."
                          className="h-8 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5"
                          onClick={() => handleInsertMissingAnswer(i, m.question)}
                          disabled={!((missingAnswers[i] ?? "").trim())}
                        >
                          Add
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.customerSummaryDraft && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Customer-facing summary draft
                </h4>
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <p className="text-sm whitespace-pre-wrap">
                    {result.customerSummaryDraft.text}
                  </p>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Confidence: {result.customerSummaryDraft.confidence}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleInsertSummary(result.customerSummaryDraft!.text)
                      }
                    >
                      {insertedSummary ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Inserted
                        </>
                      ) : (
                        "Insert into notes"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionGroup<T>({
  title,
  icon,
  empty,
  items,
  renderItem,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {icon}
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{empty}</p>
      ) : (
        <div className="rounded-lg border bg-card divide-y">{items.map(renderItem)}</div>
      )}
    </div>
  );
}

function ConfidenceChip({ value }: { value: "low" | "medium" | "high" }) {
  const cls =
    value === "high"
      ? "bg-emerald-100 text-emerald-800"
      : value === "medium"
        ? "bg-blue-100 text-blue-800"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${cls}`}>
      {value}
    </span>
  );
}

function EquipmentRow({
  suggestion,
  applied,
  onApply,
}: {
  suggestion: EquipmentSuggestion;
  applied: boolean;
  onApply: () => void;
}) {
  const catalogItem = getEquipmentById(suggestion.equipmentId);
  const isResolved = suggestion.resolved && !!catalogItem;
  return (
    <div className="px-3 py-2.5 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium truncate">
            {catalogItem?.name ?? suggestion.equipmentName}
          </p>
          <ConfidenceChip value={suggestion.confidence} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {suggestion.reason}
        </p>
        {!isResolved && (
          <p className="text-[11px] text-amber-700 mt-0.5">
            Not in catalog — review before applying.
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2.5 shrink-0"
        onClick={onApply}
        disabled={!isResolved || applied}
      >
        {applied ? (
          <>
            <Check className="w-3.5 h-3.5 mr-1" />
            Added
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add
          </>
        )}
      </Button>
    </div>
  );
}

function LaborRow({
  suggestion,
  selected,
  onApply,
}: {
  suggestion: LaborSuggestion;
  selected: boolean;
  onApply: () => void;
}) {
  const isResolved = suggestion.resolved;
  return (
    <div className="px-3 py-2.5 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium">
            {formatLaborLabel({
              jobType: suggestion.jobType,
              level: suggestion.level,
              hourlyRate: 0,
              estimatedHours: { min: 0, max: 0 },
            })}
          </p>
          <ConfidenceChip value={suggestion.confidence} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {suggestion.reason}
        </p>
        {!isResolved && (
          <p className="text-[11px] text-amber-700 mt-0.5">
            Not found in current labor catalog.
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 px-2.5 shrink-0"
        onClick={onApply}
        disabled={!isResolved}
      >
        {selected ? (
          <>
            <Check className="w-3.5 h-3.5 mr-1" />
            Unapply
          </>
        ) : (
          "Apply"
        )}
      </Button>
    </div>
  );
}
