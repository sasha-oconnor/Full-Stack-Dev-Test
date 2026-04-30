"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EquipmentPicker } from "@/components/EquipmentPicker";
import { LaborSelector } from "@/components/LaborSelector";
import { LineItemRow } from "@/components/LineItemRow";
import { EstimateTotals } from "@/components/EstimateTotals";
import { ProgressSteps } from "@/components/ProgressSteps";
import { VoiceNotesField } from "@/components/VoiceNotesField";
import { AiAssistPanel } from "@/components/AiAssistPanel";
import { getCustomerById, getEquipment, getLaborRates } from "@/lib/data";
import type {
  Equipment,
  EquipmentSuggestion,
  EstimateLineItem,
  LaborRate,
} from "@/lib/types";
import { ArrowLeft, Package, HardHat, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

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
    "notes" | "equipment" | "labor"
  >("notes");

  // Restore draft or clear stale saved context depending on session mode
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("currentEstimate");
      const mode = sessionStorage.getItem("currentEstimateMode");

      if (!raw) {
        sessionStorage.removeItem("currentEstimateId");
        sessionStorage.setItem("currentEstimateMode", "new");
        return;
      }

      const draft = JSON.parse(raw);

      const applyDraft = () => {
        if (Array.isArray(draft.lineItems)) setLineItems(draft.lineItems);
        if (draft.laborRate !== undefined) setSelectedLabor(draft.laborRate);
        if (typeof draft.notes === "string") setNotes(draft.notes);
      };

      if (mode === "saved" && draft.customerId === customerId) {
        applyDraft();
      } else {
        sessionStorage.removeItem("currentEstimateId");
        sessionStorage.setItem("currentEstimateMode", "new");
        if (draft.customerId === customerId) {
          applyDraft();
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

  function handleApplyEquipmentSuggestion(s: EquipmentSuggestion) {
    const item = allEquipment.find((e) => e.id === s.equipmentId);
    if (!item) return;
    setLineItems((prev) => {
      const existing = prev.find((li) => li.equipment.id === item.id);
      const qty = Math.max(1, s.quantity);
      if (existing) {
        return prev.map((li) =>
          li.equipment.id === item.id
            ? { ...li, quantity: li.quantity + qty }
            : li
        );
      }
      return [...prev, { equipment: item, quantity: qty }];
    });
  }

  function handleApplyLaborSuggestion(rate: LaborRate) {
    setSelectedLabor(rate);
  }

  function handleInsertSummary(text: string) {
    setNotes((prev) => {
      const trimmed = prev.trim();
      const bullets = text
        .split(/\n+/)
        .flatMap((line) => line.split(/(?<=[.!?])\s+/))
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- ${line}`)
        .join("\n");
      const block = bullets || `- ${text.trim()}`;
      return trimmed ? `${trimmed}\n\n${block}` : block;
    });
  }

  function handleAppendNoteLine(line: string) {
    const cleaned = line.trim();
    if (!cleaned) return;
    setNotes((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n${cleaned}` : cleaned;
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

  const SECTION_ORDER = ["notes", "equipment", "labor"] as const;
  type Section = typeof SECTION_ORDER[number];
  const currentIdx = SECTION_ORDER.indexOf(activeSection as Section);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === SECTION_ORDER.length - 1;

  function goNext() {
    if (!isLast) setActiveSection(SECTION_ORDER[currentIdx + 1]);
  }
  function goBack() {
    if (!isFirst) setActiveSection(SECTION_ORDER[currentIdx - 1]);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 hover:bg-primary/10 hover:text-primary">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate text-foreground">{customer.name}</p>
              <p className="text-xs text-primary/70 font-medium truncate">
                {customer.systemType}
                {customer.systemAge !== undefined
                  ? ` · ${customer.systemAge} yrs old`
                  : ""}
              </p>
            </div>
          </div>

          <ProgressSteps step={2} />
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-0">
          <div className="flex border-b overflow-x-auto">
            {(
              [
                {
                  key: "notes",
                  label: "Notes",
                  icon: FileText,
                  count: notes.trim() ? 1 : 0,
                  activeColor: "border-primary text-primary",
                  dotColor: "bg-primary",
                },
                {
                  key: "equipment",
                  label: "Equipment",
                  icon: Package,
                  count: itemCount,
                  activeColor: "border-primary text-primary",
                  dotColor: "bg-primary",
                },
                {
                  key: "labor",
                  label: "Service",
                  icon: HardHat,
                  count: selectedLabor ? 1 : 0,
                  activeColor: "border-amber-500 text-amber-700",
                  dotColor: "bg-amber-500",
                },
            ] as const
            ).map(({ key, label, icon: Icon, count, activeColor, dotColor }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
                  activeSection === key
                    ? activeColor
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {count > 0 && (
                  <span className={`w-4 h-4 rounded-full ${dotColor} text-white text-[10px] flex items-center justify-center font-bold`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 pb-28 space-y-4 lg:max-w-3xl">
          {activeSection === "equipment" && (
            <>
              {lineItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Selected Items
                  </h3>
                  <div className="rounded-lg border border-primary/20 bg-card px-3">
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
              <div className="rounded-lg bg-amber-50 border border-amber-200/60 px-4 py-3">
                <h3 className="text-sm font-semibold text-amber-900 mb-0.5 flex items-center gap-1.5">
                  <HardHat className="w-4 h-4" />
                  Choose Primary Service
                </h3>
                <p className="text-xs text-amber-800/80">
                  Select one service type for this job.{" "}
                  {customer.propertyType === "residential"
                    ? "This customer is residential."
                    : "This customer is commercial."}
                </p>
              </div>

              {!selectedLabor && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
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
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-primary/70 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Technician Notes
                </h3>
                <VoiceNotesField
                  value={notes}
                  onChange={setNotes}
                  placeholder="Add notes about the job, site conditions, customer requests…"
                />
              </div>
            </div>
          )}

          {/* Keep mounted while switching tabs so Gemini results & UI state persist */}
          <div
            className={cn(
              activeSection !== "notes" && "hidden",
              activeSection === "notes" && "mt-4"
            )}
          >
            <AiAssistPanel
              customer={customer}
              notes={notes}
              selectedLineItems={lineItems}
              selectedLabor={selectedLabor}
              laborRates={laborRates}
              onApplyEquipment={handleApplyEquipmentSuggestion}
              onApplyLabor={handleApplyLaborSuggestion}
              onClearLabor={() => setSelectedLabor(null)}
              onInsertSummaryDraft={handleInsertSummary}
              onAppendNoteLine={handleAppendNoteLine}
            />
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 z-10">
        <EstimateTotals
          lineItems={lineItems}
          laborRate={selectedLabor}
          onViewSummary={handleViewSummary}
          onNext={goNext}
          onBack={goBack}
          isFirst={isFirst}
          isLast={isLast}
          showNoLaborWarning={showNoLaborWarning}
        />
      </div>
    </div>
  );
}
