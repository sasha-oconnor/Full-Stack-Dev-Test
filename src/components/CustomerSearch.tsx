"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { CustomerCard } from "@/components/CustomerCard";
import type { Customer } from "@/lib/types";
import { Search } from "lucide-react";

interface CustomerSearchProps {
  customers: Customer[];
}

export function CustomerSearch({ customers }: CustomerSearchProps) {
  const [query, setQuery] = useState("");

  const filtered = customers.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.systemType.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search customers, address, or system…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-12 text-base"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm">No customers found for &ldquo;{query}&rdquo;</p>
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
