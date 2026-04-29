"use client";

import { useState } from "react";
import { formatCurrency, calcLaborRange } from "@/lib/calculations";
import { AnimatedList } from "@/components/AnimatedList";
import type { LaborRate } from "@/lib/types";
import { Check, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const JOB_TYPE_LABELS: Record<string, string> = {
  diagnostic: "Diagnostic",
  repair: "Repair",
  install: "Installation",
  maintenance: "Maintenance",
  ductwork: "Ductwork",
};

interface LaborSelectorProps {
  laborRates: LaborRate[];
  selected: LaborRate | null;
  onSelect: (rate: LaborRate | null) => void;
}

export function LaborSelector({
  laborRates,
  selected,
  onSelect,
}: LaborSelectorProps) {
  const jobTypes = Array.from(new Set(laborRates.map((r) => r.jobType)));

  // Tracks which job type group is expanded — separate from selected level
  const [expandedJobType, setExpandedJobType] = useState<string | null>(
    selected?.jobType ?? null
  );

  const levelsForExpanded = laborRates.filter(
    (r) => r.jobType === expandedJobType
  );

  function handleJobTypeClick(jobType: string) {
    if (expandedJobType === jobType) {
      // Collapse; if this type was selected, clear the selection too
      if (selected?.jobType === jobType) {
        onSelect(null);
      }
      setExpandedJobType(null);
    } else {
      setExpandedJobType(jobType);
    }
  }

  function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
  }

  const selectedLabel = selected
    ? `${JOB_TYPE_LABELS[selected.jobType] ?? selected.jobType} — ${capitalize(selected.level)}`
    : null;

  return (
    <div className="space-y-4">
      {/* Persistent selected chip */}
      {selected && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-primary bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{selectedLabel}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(calcLaborRange(selected).min)}–
                {formatCurrency(calcLaborRange(selected).max)} estimated ·{" "}
                {selected.estimatedHours.min}–{selected.estimatedHours.max} hrs
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onSelect(null);
              setExpandedJobType(null);
            }}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
            aria-label="Clear labor selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Job type buttons */}
      <div className="flex flex-wrap gap-2">
        {jobTypes.map((jobType) => {
          const isExpanded = expandedJobType === jobType;
          const isSelected = selected?.jobType === jobType;
          const buttonClass = isExpanded
            ? "bg-primary text-primary-foreground border-primary"
            : isSelected
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-background text-foreground border-border hover:bg-muted";
          return (
            <button
              key={jobType}
              onClick={() => handleJobTypeClick(jobType)}
              className={`px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors border ${
                buttonClass
              }`}
            >
              {JOB_TYPE_LABELS[jobType] ?? jobType}
            </button>
          );
        })}
      </div>

      {/* Level options — only shown when a job type is expanded */}
      {expandedJobType && (
        <div className="space-y-2">
          {levelsForExpanded.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Select a level to confirm your labor estimate
            </p>
          )}

          <AnimatedList<LaborRate>
            items={levelsForExpanded}
            renderItem={(rate) => {
              const range = calcLaborRange(rate);
              const isSelected =
                selected?.jobType === rate.jobType &&
                selected?.level === rate.level;
              return (
                <button
                  onClick={() => onSelect(rate)}
                  className={`w-full flex items-center gap-3 p-3 min-h-[44px] rounded-lg border text-left transition-colors ${
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{capitalize(rate.level)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />
                      {rate.estimatedHours.min}–{rate.estimatedHours.max} hrs ·{" "}
                      {formatCurrency(rate.hourlyRate)}/hr
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-semibold">
                      {formatCurrency(range.min)}–{formatCurrency(range.max)}
                    </p>
                    <p className="text-xs text-muted-foreground">est. labor</p>
                  </div>
                </button>
              );
            }}
            showGradients={false}
            enableArrowNavigation={false}
            displayScrollbar={false}
            maxHeight="none"
            itemClassName="mb-2"
          />

          {/* Formula hint */}
          <p className="text-xs text-muted-foreground pt-1">
            Estimate = hourly rate × estimated hours (min–max)
          </p>
        </div>
      )}

      {/* Empty state when nothing expanded and nothing selected */}
      {!expandedJobType && !selected && (
        <p className="text-xs text-muted-foreground">
          Tap a service type above to see available levels and pricing.
        </p>
      )}
    </div>
  );
}
