"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/calculations";
import type { EstimateLineItem } from "@/lib/types";
import { Minus, Plus, Trash2 } from "lucide-react";

interface LineItemRowProps {
  item: EstimateLineItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function LineItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: LineItemRowProps) {
  const lineTotal = item.equipment.baseCost * item.quantity;

  return (
    <div className="flex items-center gap-2 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">
          {item.equipment.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(item.equipment.baseCost)} each
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={onDecrement}
          disabled={item.quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className="w-6 text-center text-sm font-medium tabular-nums">
          {item.quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={onIncrement}
          aria-label="Increase quantity"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <div className="w-16 text-right shrink-0">
        <span className="text-sm font-semibold">{formatCurrency(lineTotal)}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
        onClick={onRemove}
        aria-label="Remove item"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
