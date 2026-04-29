"use client";

import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  calcEquipmentTotal,
  calcLaborRange,
  calcEstimateRange,
} from "@/lib/calculations";
import type { EstimateLineItem, LaborRate } from "@/lib/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface EstimateTotalsProps {
  lineItems: EstimateLineItem[];
  laborRate: LaborRate | null;
  onViewSummary: () => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  showNoLaborWarning?: boolean;
}

export function EstimateTotals({
  lineItems,
  laborRate,
  onViewSummary,
  onNext,
  onBack,
  isFirst,
  isLast,
  disabled,
  showNoLaborWarning,
}: EstimateTotalsProps) {
  const equipmentTotal = calcEquipmentTotal(lineItems);
  const laborRange = laborRate ? calcLaborRange(laborRate) : null;
  const totalRange = calcEstimateRange(lineItems, laborRate);

  const hasItems = lineItems.length > 0 || laborRate !== null;
  const canProceed = lineItems.length > 0 || laborRate !== null;

  return (
    <div className="border-t shadow-[0_-4px_12px_rgba(15,76,129,0.08)] bg-card">
      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 pt-3 pb-4 space-y-3">

        {/* Totals breakdown */}
        {hasItems && (
          <div className="space-y-1.5 text-sm">
            {lineItems.length > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Equipment
                  <span className="ml-1 text-xs opacity-70">
                    ({lineItems.length} {lineItems.length === 1 ? "item" : "items"})
                  </span>
                </span>
                <span>{formatCurrency(equipmentTotal)}</span>
              </div>
            )}
            {laborRange && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Labor (est.)</span>
                  <span>
                    {formatCurrency(laborRange.min)}–{formatCurrency(laborRange.max)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 leading-snug">
                  Labor applies to the full job, not per item.
                </p>
              </>
            )}
            <div className="flex justify-between font-bold text-lg pt-1.5 border-t border-primary/10 text-primary">
              <span>Total Estimate</span>
              <span>
                {totalRange.min === totalRange.max
                  ? formatCurrency(totalRange.min)
                  : `${formatCurrency(totalRange.min)}–${formatCurrency(totalRange.max)}`}
              </span>
            </div>
          </div>
        )}

        {/* Idle prompt when nothing added yet */}
        {!hasItems && (
          <p className="text-xs text-muted-foreground text-center pb-1">
            Add equipment or select a service to see your estimate.
          </p>
        )}

        {/* No-labor warning */}
        {showNoLaborWarning && (
          <p className="text-xs text-amber-600 font-medium text-center -mt-1">
            No labor selected — estimate shows equipment cost only.
          </p>
        )}

        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button
              variant="outline"
              className="h-12 w-24 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          {isLast ? (
            <Button
              className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-sm"
              onClick={onViewSummary}
              disabled={disabled || !canProceed}
            >
              View Summary
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="flex-1 h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-sm"
              onClick={onNext}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
