"use client";

import { formatCurrency, calcLaborRange } from "@/lib/calculations";
import type { LaborRate } from "@/lib/types";
import { Clock } from "lucide-react";

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

  const activeJobType = selected?.jobType ?? null;
  const levelsForActiveType = laborRates.filter(
    (r) => r.jobType === activeJobType
  );

  function handleJobTypeClick(jobType: string) {
    if (activeJobType === jobType) {
      onSelect(null);
      return;
    }
    const firstLevel = laborRates.find((r) => r.jobType === jobType);
    if (firstLevel) onSelect(firstLevel);
  }

  function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {jobTypes.map((jobType) => (
          <button
            key={jobType}
            onClick={() => handleJobTypeClick(jobType)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeJobType === jobType
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            {JOB_TYPE_LABELS[jobType] ?? jobType}
          </button>
        ))}
      </div>

      {activeJobType && levelsForActiveType.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Select level
          </p>
          <div className="grid grid-cols-1 gap-2">
            {levelsForActiveType.map((rate) => {
              const range = calcLaborRange(rate);
              const isSelected =
                selected?.jobType === rate.jobType &&
                selected?.level === rate.level;
              return (
                <button
                  key={`${rate.jobType}-${rate.level}`}
                  onClick={() => onSelect(rate)}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {capitalize(rate.level)}
                    </p>
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
            })}
          </div>
        </div>
      )}

      {activeJobType && levelsForActiveType.length === 1 && selected && (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/10 border-primary">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {selected.estimatedHours.min}–{selected.estimatedHours.max} hrs ·{" "}
            {formatCurrency(selected.hourlyRate)}/hr
          </div>
          <p className="text-sm font-semibold">
            {formatCurrency(calcLaborRange(selected).min)}–
            {formatCurrency(calcLaborRange(selected).max)}
          </p>
        </div>
      )}
    </div>
  );
}
