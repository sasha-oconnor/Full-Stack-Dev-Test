"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { EquipmentPicker } from "@/components/EquipmentPicker";
import { LaborSelector } from "@/components/LaborSelector";
import { LineItemRow } from "@/components/LineItemRow";
import { EstimateTotals } from "@/components/EstimateTotals";
import { ProgressSteps } from "@/components/ProgressSteps";
import { getCustomerById, getEquipment, getLaborRates } from "@/lib/data";
import type { Equipment, EstimateLineItem, LaborRate } from "@/lib/types";
import { ArrowLeft, Package, HardHat, FileText } from "lucide-react";

export default function EstimateBuilderPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);
  const router = useRouter();

  const customer = getCustomerById(customerId);
  const allEquipment = getEquipment();
  const laborRates = getLaborRates();

  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [selectedLabor, setSelectedLabor] = useState<LaborRate | null>(null);
  const [notes, setNotes] = useState("");
  const [activeSection, setActiveSection] = useState<
    "equipment" | "labor" | "notes"
  >("equipment");

  // Restore draft or clear stale saved context depending on session mode
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("currentEstimate");
      const mode = sessionStorage.getItem("currentEstimateMode");

      if (!raw) {
        // No draft at all — definitely a fresh start, purge any stale saved context
        sessionStorage.removeItem("currentEstimateId");
        sessionStorage.setItem("currentEstimateMode", "new");
        return;
      }

      const draft = JSON.parse(raw);

      if (mode === "saved" && draft.customerId === customerId) {
        // Legitimate edit-saved-estimate flow (arrived via /estimates Open or Edit Estimate)
        // Restore draft and preserve saved context so summary can auto-save
        if (Array.isArray(draft.lineItems)) setLineItems(draft.lineItems);
        if (draft.laborRate !== undefined) setSelectedLabor(draft.laborRate);
        if (typeof draft.notes === "string") setNotes(draft.notes);
      } else {
        // Fresh flow or wrong customer — clear stale saved context
        sessionStorage.removeItem("currentEstimateId");
        sessionStorage.setItem("currentEstimateMode", "new");
        // Still restore this customer's last draft (if one exists)
        if (draft.customerId === customerId) {
          if (Array.isArray(draft.lineItems)) setLineItems(draft.lineItems);
          if (draft.laborRate !== undefined) setSelectedLabor(draft.laborRate);
          if (typeof draft.notes === "string") setNotes(draft.notes);
        }
      }
    } catch {
      sessionStorage.removeItem("currentEstimateId");
      sessionStorage.setItem("currentEstimateMode", "new");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Customer not found.</p>
          <Link href="/">
            <Button variant="outline">Back to customers</Button>
          </Link>
        </div>
      </div>
    );
  }

  function handleAddEquipment(equipment: Equipment) {
    setLineItems((prev) => {
      const existing = prev.find((li) => li.equipment.id === equipment.id);
      if (existing) {
        return prev.map((li) =>
          li.equipment.id === equipment.id
            ? { ...li, quantity: li.quantity + 1 }
            : li
        );
      }
      return [...prev, { equipment, quantity: 1 }];
    });
  }

  function handleIncrement(id: string) {
    setLineItems((prev) =>
      prev.map((li) =>
        li.equipment.id === id ? { ...li, quantity: li.quantity + 1 } : li
      )
    );
  }

  function handleDecrement(id: string) {
    setLineItems((prev) =>
      prev.map((li) =>
        li.equipment.id === id
          ? { ...li, quantity: Math.max(1, li.quantity - 1) }
          : li
      )
    );
  }

  function handleRemove(id: string) {
    setLineItems((prev) => prev.filter((li) => li.equipment.id !== id));
  }

  function handleViewSummary() {
    const estimate = {
      customerId,
      lineItems,
      laborRate: selectedLabor,
      notes,
    };
    sessionStorage.setItem("currentEstimate", JSON.stringify(estimate));
    router.push(`/estimate/${customerId}/summary`);
  }

  const itemCount = lineItems.reduce((sum, li) => sum + li.quantity, 0);
  const hasEquipment = lineItems.length > 0;
  const showNoLaborWarning = hasEquipment && !selectedLabor;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{customer.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {customer.systemType}
                {customer.systemAge !== undefined
                  ? ` · ${customer.systemAge} yrs old`
                  : ""}
              </p>
            </div>
          </div>

          <ProgressSteps step={2} />
        </div>

        {/* Section tabs */}
        <div className="max-w-lg mx-auto px-4 pb-0">
          <div className="flex border-b">
            {(
              [
                {
                  key: "equipment",
                  label: "Equipment",
                  icon: Package,
                  count: itemCount,
                },
                {
                  key: "labor",
                  label: "Service",
                  icon: HardHat,
                  count: selectedLabor ? 1 : 0,
                },
                {
                  key: "notes",
                  label: "Notes",
                  icon: FileText,
                  count: notes.trim() ? 1 : 0,
                },
              ] as const
            ).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeSection === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-4">
          {activeSection === "equipment" && (
            <>
              {lineItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Selected Items
                  </h3>
                  <div className="rounded-lg border bg-card px-3">
                    {lineItems.map((item) => (
                      <LineItemRow
                        key={item.equipment.id}
                        item={item}
                        onIncrement={() => handleIncrement(item.equipment.id)}
                        onDecrement={() => handleDecrement(item.equipment.id)}
                        onRemove={() => handleRemove(item.equipment.id)}
                      />
                    ))}
                  </div>
                  <Separator className="my-4" />
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Add Equipment
                </h3>
                <EquipmentPicker
                  equipment={allEquipment}
                  lineItems={lineItems}
                  onAdd={handleAddEquipment}
                />
              </div>
            </>
          )}

          {activeSection === "labor" && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-0.5">
                  Choose Primary Service
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select one service type for this job.{" "}
                  {customer.propertyType === "residential"
                    ? "This customer is residential."
                    : "This customer is commercial."}
                </p>
              </div>

              {/* Property-type hint when nothing selected yet */}
              {!selectedLabor && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {customer.propertyType === "residential"
                    ? "Tip: For residential customers, Installation (Residential) or Repair (Minor) are common choices."
                    : "Tip: For commercial customers, Installation (Commercial) or Maintenance (Comprehensive) are common choices."}
                </div>
              )}

              <LaborSelector
                laborRates={laborRates}
                selected={selectedLabor}
                onSelect={setSelectedLabor}
              />
            </div>
          )}

          {activeSection === "notes" && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Technician Notes
              </h3>
              <Textarea
                placeholder="Add notes about the job, site conditions, customer requests…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[180px] text-base resize-none"
              />
            </div>
          )}
        </div>
      </main>

      {/* Sticky bottom totals */}
      <div className="sticky bottom-0 z-10">
        <EstimateTotals
          lineItems={lineItems}
          laborRate={selectedLabor}
          onViewSummary={handleViewSummary}
          showNoLaborWarning={showNoLaborWarning}
        />
      </div>
    </div>
  );
}
