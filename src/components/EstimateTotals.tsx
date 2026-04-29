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

  return (
    <div className="border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
        {hasItems && (
          <div className="space-y-1 text-sm">
            {lineItems.length > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Equipment ({lineItems.length} items)</span>
                <span>{formatCurrency(equipmentTotal)}</span>
              </div>
            )}
            {laborRange && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Labor (est.)</span>
                  <span>
                    {formatCurrency(laborRange.min)}–
                    {formatCurrency(laborRange.max)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Labor applies to the full job, not per item.
                </p>
              </>
            )}
            <div className="flex justify-between font-bold text-lg pt-1 border-t">
              <span>Total Estimate</span>
              <span>
                {totalRange.min === totalRange.max
                  ? formatCurrency(totalRange.min)
                  : `${formatCurrency(totalRange.min)}–${formatCurrency(totalRange.max)}`}
              </span>
            </div>
          </div>
        )}

        {showNoLaborWarning && (
          <p className="text-xs text-amber-600 font-medium text-center">
            No labor selected — estimate will show equipment cost only.
          </p>
        )}

        <Button
          className="w-full h-12 text-base"
          onClick={onViewSummary}
          disabled={disabled || (!lineItems.length && !laborRate)}
        >
          View Summary
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
