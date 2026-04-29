"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  listSavedEstimates,
  deleteEstimate,
  duplicateEstimate,
} from "@/lib/saved-estimates";
import type { SavedEstimate } from "@/lib/types";
import { formatCurrency } from "@/lib/calculations";
import {
  ArrowLeft,
  PlusCircle,
  Search,
  Printer,
  Copy,
  Trash2,
  BookmarkCheck,
  Clock,
  X,
} from "lucide-react";

export default function SavedEstimatesPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<SavedEstimate[]>([]);
  const [query, setQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEstimates(listSavedEstimates());
    setLoaded(true);
  }, []);

  const filtered = estimates.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.customerName.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.customerId.toLowerCase().includes(q)
    );
  });

  const handleOpen = useCallback(
    (est: SavedEstimate) => {
      const sessionData = {
        customerId: est.customerId,
        lineItems: est.lineItems,
        laborRate: est.laborRate,
        notes: est.notes,
      };
      sessionStorage.setItem("currentEstimate", JSON.stringify(sessionData));
      sessionStorage.setItem("currentEstimateId", est.id);
      sessionStorage.setItem("currentEstimateMode", "saved");
      router.push(`/estimate/${est.customerId}/summary`);
    },
    [router]
  );

  const handleDuplicate = useCallback((id: string) => {
    const dup = duplicateEstimate(id);
    if (dup) setEstimates(listSavedEstimates());
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteEstimate(id);
    setEstimates(listSavedEstimates());
    setConfirmDeleteId(null);
  }, []);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatTotalRange(est: SavedEstimate): string {
    const { totalMin, totalMax } = est.totals;
    if (totalMin === totalMax) return formatCurrency(totalMin);
    return `${formatCurrency(totalMin)}–${formatCurrency(totalMax)}`;
  }

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-tight">Saved Estimates</h1>
            <p className="text-xs text-muted-foreground">
              {estimates.length} estimate{estimates.length === 1 ? "" : "s"} saved
            </p>
          </div>
          <Link href="/">
            <Button size="sm" className="gap-1.5 h-9">
              <PlusCircle className="w-4 h-4" />
              New
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        {estimates.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name or estimate ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-11 pl-9 pr-9 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Empty state — no saved estimates at all */}
        {estimates.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <BookmarkCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">No saved estimates yet</p>
              <p className="text-xs text-muted-foreground">
                Build an estimate and tap &ldquo;Save Estimate&rdquo; on the summary screen.
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="mt-2">
                <PlusCircle className="w-4 h-4 mr-2" />
                Start an estimate
              </Button>
            </Link>
          </div>
        )}

        {/* Empty search state */}
        {estimates.length > 0 && filtered.length === 0 && (
          <div className="text-center py-10 space-y-1">
            <p className="text-sm text-muted-foreground">No estimates match &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-muted-foreground">Try a different customer name or ID.</p>
          </div>
        )}

        {/* Estimate cards */}
        <div className="space-y-3">
          {filtered.map((est) => (
            <div
              key={est.id}
              className="bg-background rounded-xl border overflow-hidden"
            >
              {/* Card header */}
              <div className="px-4 py-3 flex items-start justify-between gap-2 border-b bg-muted/30">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{est.customerName}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{est.customerId}</span>
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(est.updatedAt)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{formatTotalRange(est)}</p>
                  <p className="text-xs text-muted-foreground">
                    {est.laborRate ? "incl. labor" : "equip. only"}
                  </p>
                </div>
              </div>

              {/* Line item summary */}
              <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                {est.lineItems.length > 0 ? (
                  <span>
                    {est.lineItems.length} equipment item{est.lineItems.length === 1 ? "" : "s"}
                    {" · "}
                    {formatCurrency(est.totals.equipmentSubtotal)} subtotal
                  </span>
                ) : (
                  <span>No equipment — labor only</span>
                )}
                {est.laborRate && (
                  <span className="ml-2">
                    · Labor:{" "}
                    {formatCurrency(est.totals.laborMin ?? 0)}–
                    {formatCurrency(est.totals.laborMax ?? 0)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="px-3 py-2 flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-10"
                  onClick={() => handleOpen(est)}
                >
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-3"
                  onClick={() => {
                    const sessionData = {
                      customerId: est.customerId,
                      lineItems: est.lineItems,
                      laborRate: est.laborRate,
                      notes: est.notes,
                    };
                    sessionStorage.setItem("currentEstimate", JSON.stringify(sessionData));
                    sessionStorage.removeItem("currentEstimateId");
                    sessionStorage.setItem("currentEstimateMode", "new");
                    router.push(`/estimate/${est.customerId}/summary`);
                  }}
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-3"
                  onClick={() => handleDuplicate(est.id)}
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                {confirmDeleteId === est.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-10 px-3 text-xs"
                      onClick={() => handleDelete(est.id)}
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 px-2"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDeleteId(est.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {estimates.length > 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">
            Estimates are stored locally on this device only.
          </p>
        )}
      </main>
    </div>
  );
}
