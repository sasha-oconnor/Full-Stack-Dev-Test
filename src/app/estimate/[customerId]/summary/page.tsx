"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProgressSteps } from "@/components/ProgressSteps";
import { StatusBadge } from "@/components/StatusBadge";
import { getCustomerById } from "@/lib/data";
import {
  formatCurrency,
  calcEquipmentTotal,
  calcLaborRange,
  calcEstimateRange,
  formatLaborLabel,
} from "@/lib/calculations";
import {
  saveEstimate,
  updateEstimate,
  getSavedEstimate,
  setEstimateStatus,
} from "@/lib/saved-estimates";
import type { Estimate, SavedEstimate } from "@/lib/types";
import {
  ArrowLeft,
  Printer,
  PlusCircle,
  Building2,
  Home,
  Zap,
  MapPin,
  Phone,
  Calendar,
  Clock,
  BookmarkCheck,
  Bookmark,
  Link as LinkIcon,
  Send,
  Check,
  Package,
  HardHat,
  FileText,
} from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "updated";

export default function SummaryPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savedRecord, setSavedRecord] = useState<SavedEstimate | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("currentEstimate");
    if (!raw) {
      setLoaded(true);
      return;
    }
    try {
      const parsed: Estimate = JSON.parse(raw);
      setEstimate(parsed);

      const mode = sessionStorage.getItem("currentEstimateMode");
      const existingId = sessionStorage.getItem("currentEstimateId");

      if (mode === "saved" && existingId) {
        const existing = getSavedEstimate(existingId);
        if (existing) {
          const cust = getCustomerById(parsed.customerId);
          if (cust) {
            const updated = updateEstimate(existingId, parsed, cust.name);
            if (updated) {
              setSavedRecord(updated);
              if (updated.id !== existingId) {
                sessionStorage.setItem("currentEstimateId", updated.id);
              }
            } else {
              setSavedRecord(existing);
            }
          } else {
            setSavedRecord(existing);
          }
          setSaveStatus("saved");
        }
      }
    } catch {
      // ignore malformed storage
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customer = getCustomerById(customerId);

  const handleSave = useCallback(() => {
    if (!estimate || !customer) return;
    setSaveStatus("saving");

    if (savedRecord) {
      const prevId = savedRecord.id;
      const updated = updateEstimate(savedRecord.id, estimate, customer.name);
      if (updated) {
        setSavedRecord(updated);
        if (updated.id !== prevId) {
          sessionStorage.setItem("currentEstimateId", updated.id);
        }
      }
      setSaveStatus("updated");
    } else {
      const record = saveEstimate(estimate, customer.name);
      setSavedRecord(record);
      sessionStorage.setItem("currentEstimateId", record.id);
      sessionStorage.setItem("currentEstimateMode", "saved");
      setSaveStatus("saved");
    }
    setTimeout(
      () => setSaveStatus((s) => (s !== "idle" ? "saved" : "idle")),
      2500
    );
  }, [estimate, customer, savedRecord]);

  const handleMarkSent = useCallback(() => {
    if (!savedRecord) return;
    const updated = setEstimateStatus(savedRecord.id, "sent");
    if (updated) setSavedRecord(updated);
  }, [savedRecord]);

  const handleCopyShareLink = useCallback(async () => {
    if (!savedRecord) return;
    const url = `${window.location.origin}/shared/${savedRecord.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // Fallback: prompt the user
      window.prompt("Copy this share link:", url);
    }
  }, [savedRecord]);

  if (!loaded) return null;

  if (!estimate || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">No estimate data found.</p>
          <Link href="/">
            <Button variant="outline">Back to customers</Button>
          </Link>
        </div>
      </div>
    );
  }

  const equipmentTotal = calcEquipmentTotal(estimate.lineItems);
  const laborRange = estimate.laborRate
    ? calcLaborRange(estimate.laborRate)
    : null;
  const totalRange = calcEstimateRange(estimate.lineItems, estimate.laborRate);

  const estimateDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b shadow-sm print:hidden">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2 hover:bg-primary/10 hover:text-primary"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="flex-1 font-semibold text-sm">
              Estimate Summary
            </span>
            {savedRecord && (
              <div className="flex items-center gap-1.5">
                <StatusBadge status={savedRecord.status} />
              </div>
            )}
          </div>
          <ProgressSteps step={3} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4 print:px-0 print:py-0 print:space-y-3 lg:max-w-3xl">
        {/* Print header */}
        <div className="hidden print:block text-center pb-4 border-b">
          <h1 className="text-2xl font-bold">Field Estimate</h1>
          <p className="text-sm text-muted-foreground">{estimateDate}</p>
        </div>

        {/* Customer card */}
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-primary/5 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-base leading-tight text-foreground">{customer.name}</h2>
              <Badge
                variant={
                  customer.propertyType === "commercial" ? "default" : "secondary"
                }
                className="mt-1 text-xs"
              >
                {customer.propertyType === "commercial" ? (
                  <Building2 className="w-3 h-3 mr-1" />
                ) : (
                  <Home className="w-3 h-3 mr-1" />
                )}
                {customer.propertyType}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded border">
              {customer.id}
            </span>
          </div>
          <div className="px-4 py-3 space-y-1.5 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{customer.address}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-primary/80">
                {customer.systemType}
                {customer.systemAge !== undefined &&
                  ` · ${customer.systemAge} yrs old`}
                {customer.squareFootage &&
                  ` · ${customer.squareFootage.toLocaleString()} sq ft`}
              </span>
            </div>
            {customer.lastServiceDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>
                  Last service:{" "}
                  {new Date(customer.lastServiceDate).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" }
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Equipment line items */}
        {estimate.lineItems.length > 0 && (
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b bg-primary/5 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-primary">Equipment &amp; Parts</h3>
            </div>
            <div className="divide-y">
              {estimate.lineItems.map((item) => (
                <div
                  key={item.equipment.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.equipment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.equipment.brand} · {item.equipment.modelNumber}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-sm font-semibold">
                      {formatCurrency(item.equipment.baseCost * item.quantity)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.equipment.baseCost)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t bg-primary/5 flex justify-between text-sm font-semibold text-primary">
              <span>Equipment Subtotal</span>
              <span>{formatCurrency(equipmentTotal)}</span>
            </div>
          </div>
        )}

        {/* Labor */}
        {estimate.laborRate && laborRange && (
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b bg-amber-50 border-amber-100 flex items-center gap-2">
              <HardHat className="w-4 h-4 text-amber-700" />
              <h3 className="font-semibold text-sm text-amber-900">Labor</h3>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {formatLaborLabel(estimate.laborRate)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {estimate.laborRate.estimatedHours.min}–
                      {estimate.laborRate.estimatedHours.max} hrs ·{" "}
                      {formatCurrency(estimate.laborRate.hourlyRate)}/hr
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(laborRange.min)}–
                    {formatCurrency(laborRange.max)}
                  </p>
                  <p className="text-xs text-muted-foreground">estimated</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {estimate.notes?.trim() && (
          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b bg-muted/40 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-muted-foreground">Technician Notes</h3>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {estimate.notes}
              </p>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-card rounded-xl border border-primary/20 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-primary/5 flex items-center gap-2">
            <h3 className="font-semibold text-sm text-primary">Estimate Total</h3>
          </div>
          <div className="px-4 py-3 space-y-2">
            {estimate.lineItems.length > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Equipment subtotal</span>
                <span>{formatCurrency(equipmentTotal)}</span>
              </div>
            )}
            {laborRange ? (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Labor (estimated)</span>
                <span>
                  {formatCurrency(laborRange.min)}–
                  {formatCurrency(laborRange.max)}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No labor selected.
              </p>
            )}
            <Separator className="bg-primary/10" />
            <div className="flex justify-between font-bold text-xl text-primary pt-1">
              <span>Grand Total</span>
              <span>
                {totalRange.min === totalRange.max
                  ? formatCurrency(totalRange.min)
                  : `${formatCurrency(totalRange.min)}–${formatCurrency(totalRange.max)}`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              * Labor is estimated for the full job based on typical job duration
              and hourly rates. Actual cost may vary based on site conditions.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground print:hidden">
          Generated {estimateDate}
        </p>

        {/* CTA group */}
        <div className="space-y-3 pb-8 print:hidden">
          {/* Save / auto-saved indicator */}
          {savedRecord ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 border border-green-200 gap-3">
              <div className="flex items-center gap-2 text-green-700 min-w-0">
                <BookmarkCheck className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold truncate">
                  Estimate saved
                </span>
              </div>
              <Link
                href="/estimates"
                className="text-xs font-semibold text-green-700 underline underline-offset-2 shrink-0"
              >
                View all
              </Link>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-11 border-primary/30 text-primary hover:bg-primary/5"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
            >
              <Bookmark className="w-4 h-4 mr-2" />
              {saveStatus === "saving" ? "Saving…" : "Save Estimate"}
            </Button>
          )}

          {/* Saved-record actions: share, status */}
          {savedRecord && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 col-span-2"
                onClick={handleCopyShareLink}
              >
                <LinkIcon className="w-4 h-4 mr-1.5" />
                {shareCopied ? "Copied!" : "Copy Share Link"}
              </Button>
              <Button
                variant="outline"
                className="h-11 col-span-2"
                onClick={handleMarkSent}
                disabled={savedRecord.status !== "draft"}
                title={
                  savedRecord.status !== "draft"
                    ? `Already ${savedRecord.status}`
                    : "Mark as sent to customer"
                }
              >
                {savedRecord.status === "approved" ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Approved by customer
                  </>
                ) : savedRecord.status === "rejected" ? (
                  <>Customer declined</>
                ) : savedRecord.status === "sent" ? (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Sent — awaiting response
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Mark as sent
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Print */}
          <Button
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-sm"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Share Estimate
          </Button>

          {/* Secondary actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 border-border hover:border-primary/30 hover:text-primary"
              onClick={() => router.push(`/estimate/${customerId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Edit Estimate
            </Button>
            <Link
              href="/"
              className="flex-1"
              onClick={() => {
                sessionStorage.removeItem("currentEstimateId");
                sessionStorage.setItem("currentEstimateMode", "new");
                sessionStorage.removeItem("currentEstimate");
              }}
            >
              <Button variant="outline" className="w-full h-11">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                New Estimate
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
