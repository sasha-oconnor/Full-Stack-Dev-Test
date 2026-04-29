"use client";

import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  calcEquipmentTotal,
  calcLaborRange,
  calcEstimateRange,
} from "@/lib/calculations";
import type { EstimateLineItem, LaborRate } from "@/lib/types";
import { ArrowRight } from "lucide-react";

interface EstimateTotalsProps {
  lineItems: EstimateLineItem[];
  laborRate: LaborRate | null;
  onViewSummary: () => void;
  disabled?: boolean;
  showNoLaborWarning?: boolean;
}

export function EstimateTotals({
  lineItems,
  laborRate,
  onViewSummary,
  disabled,
  showNoLaborWarning,
}: EstimateTotalsProps) {
  const equipmentTotal = calcEquipmentTotal(lineItems);
  const laborRange = laborRate ? calcLaborRange(laborRate) : null;
  const totalRange = calcEstimateRange(lineItems, laborRate);

  const hasItems = lineItems.length > 0 || laborRate !== null;
  const canProceed = lineItems.length > 0 || laborRate !== null;

  return (
    <div className="border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="max-w-lg mx-auto px-4 pt-3 pb-4 space-y-3">

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
            <div className="flex justify-between font-bold text-lg pt-1.5 border-t">
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

        {/* CTA */}
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={onViewSummary}
          disabled={disabled || !canProceed}
        >
          View Summary
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
