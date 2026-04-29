"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { getCustomerById } from "@/lib/data";
import {
  formatCurrency,
  formatLaborLabel,
  calcEquipmentTotal,
  calcLaborRange,
  calcEstimateRange,
} from "@/lib/calculations";
import {
  getSavedEstimateByShareToken,
  recordApproval,
} from "@/lib/saved-estimates";
import type { SavedEstimate } from "@/lib/types";
import {
  Building2,
  Home,
  MapPin,
  Phone,
  Zap,
  Clock,
  Check,
  X,
  Info,
  AlertTriangle,
} from "lucide-react";

export default function SharedEstimatePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = use(params);
  const [estimate, setEstimate] = useState<SavedEstimate | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [decisionView, setDecisionView] = useState<
    "none" | "approving" | "rejecting"
  >("none");
  const [decisionNote, setDecisionNote] = useState("");

  useEffect(() => {
    setEstimate(getSavedEstimateByShareToken(shareToken));
    setLoaded(true);
  }, [shareToken]);

  function handleDecision(decision: "approved" | "rejected") {
    if (!estimate) return;
    const updated = recordApproval(estimate.id, decision, decisionNote);
    if (updated) setEstimate(updated);
    setDecisionView("none");
    setDecisionNote("");
  }

  if (!loaded) return null;

  if (!estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="max-w-md w-full bg-background border rounded-xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="font-bold text-lg">Estimate not found</h1>
          <p className="text-sm text-muted-foreground">
            This share link doesn&apos;t match any estimate on this device.
            Estimates are stored locally — links only work on the same browser
            and device where the estimate was created.
          </p>
          <Link href="/">
            <Button variant="outline" className="mt-2">
              Go to home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const customer = getCustomerById(estimate.customerId);
  const equipmentTotal = calcEquipmentTotal(estimate.lineItems);
  const laborRange = estimate.laborRate
    ? calcLaborRange(estimate.laborRate)
    : null;
  const totalRange = calcEstimateRange(estimate.lineItems, estimate.laborRate);

  const decided =
    estimate.status === "approved" || estimate.status === "rejected";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight truncate">
              Your Estimate
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              From your service technician
              {estimate.revisionNumber > 1
                ? ` · Revision v${estimate.revisionNumber}`
                : ""}
            </p>
          </div>
          <StatusBadge status={estimate.status} size="md" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900 flex gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            This is a read-only view of your estimate. This link is local to
            your technician&apos;s device — it can only be opened on the same
            device and browser that created it.
          </p>
        </div>

        {/* Customer */}
        {customer && (
          <div className="bg-background rounded-xl border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-bold text-lg leading-tight">
                  {customer.name}
                </h2>
                <Badge
                  variant={
                    customer.propertyType === "commercial"
                      ? "default"
                      : "secondary"
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
            </div>
            <Separator />
            <div className="space-y-1.5 text-sm">
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
                <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{customer.systemType}</span>
              </div>
            </div>
          </div>
        )}

        {/* Equipment */}
        {estimate.lineItems.length > 0 && (
          <div className="bg-background rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/50">
              <h3 className="font-semibold text-sm">Equipment &amp; Parts</h3>
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
                      {formatCurrency(
                        item.equipment.baseCost * item.quantity
                      )}
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
            <div className="px-4 py-3 border-t bg-muted/30 flex justify-between text-sm font-medium">
              <span>Equipment Subtotal</span>
              <span>{formatCurrency(equipmentTotal)}</span>
            </div>
          </div>
        )}

        {/* Labor */}
        {estimate.laborRate && laborRange && (
          <div className="bg-background rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/50">
              <h3 className="font-semibold text-sm">Labor</h3>
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {estimate.notes?.trim() && (
          <div className="bg-background rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/50">
              <h3 className="font-semibold text-sm">Notes</h3>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {estimate.notes}
              </p>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-background rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/50">
            <h3 className="font-semibold text-sm">Estimate Total</h3>
          </div>
          <div className="px-4 py-3 space-y-2">
            {estimate.lineItems.length > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Equipment subtotal</span>
                <span>{formatCurrency(equipmentTotal)}</span>
              </div>
            )}
            {laborRange && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Labor (estimated)</span>
                <span>
                  {formatCurrency(laborRange.min)}–
                  {formatCurrency(laborRange.max)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Grand Total</span>
              <span>
                {totalRange.min === totalRange.max
                  ? formatCurrency(totalRange.min)
                  : `${formatCurrency(totalRange.min)}–${formatCurrency(totalRange.max)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Approval / decision */}
        {decided ? (
          <div
            className={`rounded-xl border p-4 ${
              estimate.status === "approved"
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
            }`}
          >
            <p className="font-semibold text-sm">
              {estimate.status === "approved"
                ? "Thank you — you approved this estimate."
                : "You declined this estimate."}
            </p>
            {estimate.approval?.at && (
              <p className="text-xs text-muted-foreground mt-1">
                Recorded {new Date(estimate.approval.at).toLocaleString()}
              </p>
            )}
            {estimate.approval?.note && (
              <p className="text-sm mt-2 italic">
                &ldquo;{estimate.approval.note}&rdquo;
              </p>
            )}
          </div>
        ) : decisionView !== "none" ? (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h4 className="font-semibold text-sm">
              {decisionView === "approving"
                ? "Approve this estimate"
                : "Decline this estimate"}
            </h4>
            <textarea
              placeholder={
                decisionView === "approving"
                  ? "Optional message to your technician (e.g., schedule preference)"
                  : "Optional reason for declining"
              }
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              className="w-full min-h-[100px] rounded-md border bg-background p-2 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setDecisionView("none");
                  setDecisionNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  handleDecision(
                    decisionView === "approving" ? "approved" : "rejected"
                  )
                }
                variant={
                  decisionView === "approving" ? "default" : "destructive"
                }
              >
                Confirm {decisionView === "approving" ? "Approval" : "Decline"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-12 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setDecisionView("approving")}
            >
              <Check className="w-4 h-4 mr-1.5" />
              Approve
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={() => setDecisionView("rejecting")}
            >
              <X className="w-4 h-4 mr-1.5" />
              Decline
            </Button>
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground py-2">
          Estimate ID: <span className="font-mono">{estimate.id}</span>
        </p>
      </main>
    </div>
  );
}
