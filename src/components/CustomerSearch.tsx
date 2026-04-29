"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CustomerCard } from "@/components/CustomerCard";
import type { Customer } from "@/lib/types";
import { Building2, Home, Search, Users } from "lucide-react";

type PropertyFilter = "all" | "residential" | "commercial";

interface CustomerSearchProps {
  customers: Customer[];
}

export function CustomerSearch({ customers }: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>("all");

  const filtered = customers.filter((c) => {
    const matchesQuery = (() => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.systemType.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    })();

    const matchesType =
      propertyFilter === "all" || c.propertyType === propertyFilter;

    return matchesQuery && matchesType;
  });

  const residentialCount = customers.filter(
    (c) => c.propertyType === "residential"
  ).length;
  const commercialCount = customers.filter(
    (c) => c.propertyType === "commercial"
  ).length;

  const FILTERS: { id: PropertyFilter; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: "all",
      label: "All",
      icon: <Users className="w-3 h-3" />,
      count: customers.length,
    },
    {
      id: "residential",
      label: "Residential",
      icon: <Home className="w-3 h-3" />,
      count: residentialCount,
    },
    {
      id: "commercial",
      label: "Commercial",
      icon: <Building2 className="w-3 h-3" />,
      count: commercialCount,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name, address, or system…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-12 text-base"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* Property type filter chips */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setPropertyFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-full text-xs font-medium transition-colors whitespace-nowrap border ${
              propertyFilter === f.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {f.icon}
            {f.label}
            <span
              className={`ml-0.5 tabular-nums ${
                propertyFilter === f.id
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground/60"
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      {(query.trim() || propertyFilter !== "all") && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} customer{filtered.length === 1 ? "" : "s"} found
          {propertyFilter !== "all" ? ` · ${propertyFilter} only` : ""}
        </p>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            No customers found
          </p>
          <p className="text-xs text-muted-foreground">
            {query.trim()
              ? `Try a different search term or clear the filter.`
              : `No ${propertyFilter} customers in your list.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}
