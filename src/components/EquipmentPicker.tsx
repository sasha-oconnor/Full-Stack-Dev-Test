"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedList } from "@/components/AnimatedList";
import { formatCurrency } from "@/lib/calculations";
import type { Equipment, EstimateLineItem } from "@/lib/types";
import { Plus, Check, Search, X } from "lucide-react";

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
          className="w-full h-11 pl-9 pr-9 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        {isSearching && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category chips — hidden while searching */}
      {!isSearching && (
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-2 pb-1 w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 min-h-[36px] rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
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

      {/* Search context label */}
      {isSearching && (
        <p className="text-xs text-muted-foreground">
          {filtered.length > 0
            ? `${filtered.length} result${filtered.length === 1 ? "" : "s"} for "${search}"`
            : `No results for "${search}"`}
        </p>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 space-y-1">
          <p className="text-sm text-muted-foreground">
            {isSearching
              ? "No equipment matched your search."
              : "No equipment in this category."}
          </p>
          <p className="text-xs text-muted-foreground">
            {isSearching
              ? "Try a different name, brand, or model number."
              : "Try a different category above."}
          </p>
        </div>
      ) : (
        <AnimatedList<Equipment>
          items={filtered}
          renderItem={(item) => {
            const qty = getQuantityInEstimate(item.id);
            const added = justAdded.has(item.id);
            return (
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  qty > 0
                    ? "bg-primary/5 border-primary/25 shadow-sm"
                    : "bg-card border-border hover:border-primary/20"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.brand} · {item.modelNumber}
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">
                    {formatCurrency(item.baseCost)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {qty > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      <Check className="w-3 h-3" />
                      {qty}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant={added ? "secondary" : qty > 0 ? "outline" : "default"}
                    onClick={() => handleAdd(item)}
                    className={`h-10 px-3 min-w-[68px] transition-all ${
                      !added && qty === 0 ? "bg-primary hover:bg-primary/90 shadow-sm" : ""
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                        <span className="text-green-600 font-medium">Added!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {qty > 0 ? "Add again" : "Add"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          }}
          showGradients={false}
          enableArrowNavigation={false}
          displayScrollbar={false}
          maxHeight="none"
          itemClassName="mb-2"
        />
      )}
    </div>
  );
}
