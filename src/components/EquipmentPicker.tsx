"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/calculations";
import type { Equipment, EstimateLineItem } from "@/lib/types";
import { Plus, Check, Search } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  const isSearching = search.trim().length > 0;
  const filtered = isSearching
    ? equipment.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.brand.toLowerCase().includes(search.toLowerCase()) ||
          e.modelNumber.toLowerCase().includes(search.toLowerCase())
      )
    : equipment.filter((e) => e.category === activeCategory);

  function getQuantityInEstimate(id: string): number {
    return lineItems.find((li) => li.equipment.id === id)?.quantity ?? 0;
  }

  function handleAdd(item: Equipment) {
    onAdd(item);
    setJustAdded((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      setJustAdded((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 1500);
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, brand, or model…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      {/* Category chips — hidden while searching */}
      {!isSearching && (
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
      )}

      {/* Results */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No equipment found.
          </p>
        )}
        {filtered.map((item) => {
          const qty = getQuantityInEstimate(item.id);
          const added = justAdded.has(item.id);
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
                    {qty}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant={added ? "secondary" : qty > 0 ? "outline" : "default"}
                  onClick={() => handleAdd(item)}
                  className="h-10 px-3 min-w-[64px] transition-all"
                >
                  {added ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                      <span className="text-green-600">Added!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
