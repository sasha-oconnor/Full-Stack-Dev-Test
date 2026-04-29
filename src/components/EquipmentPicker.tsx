"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/calculations";
import type { Equipment, EstimateLineItem } from "@/lib/types";
import { Plus, Check } from "lucide-react";

interface EquipmentPickerProps {
  equipment: Equipment[];
  lineItems: EstimateLineItem[];
  onAdd: (equipment: Equipment) => void;
}

export function EquipmentPicker({
  equipment,
  lineItems,
  onAdd,
}: EquipmentPickerProps) {
  const categories = Array.from(
    new Set(equipment.map((e) => e.category))
  ).sort();

  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0] ?? ""
  );

  const filtered = equipment.filter((e) => e.category === activeCategory);

  function getQuantityInEstimate(id: string): number {
    return lineItems.find((li) => li.equipment.id === id)?.quantity ?? 0;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 pb-1 w-max">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((item) => {
          const qty = getQuantityInEstimate(item.id);
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {item.brand} · {item.modelNumber}
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary">
                  {formatCurrency(item.baseCost)}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {qty > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    {qty} added
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={qty > 0 ? "outline" : "default"}
                  onClick={() => onAdd(item)}
                  className="h-8 px-3"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
