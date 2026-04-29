"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProgressSteps } from "@/components/ProgressSteps";
import { getCustomerById } from "@/lib/data";
import {
  formatCurrency,
  calcEquipmentTotal,
  calcLaborRange,
  calcEstimateRange,
  formatLaborLabel,
} from "@/lib/calculations";
import type { Estimate } from "@/lib/types";
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
} from "lucide-react";

export default function SummaryPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("currentEstimate");
    if (raw) {
      try {
        setEstimate(JSON.parse(raw));
      } catch {
        // ignore parse errors
      }
    }
    setLoaded(true);
  }, []);

  const customer = getCustomerById(customerId);

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
    <div className="min-h-screen bg-muted/30">
      {/* Header — hidden when printing */}
      <header className="sticky top-0 z-10 bg-background border-b print:hidden">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -ml-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="flex-1 font-semibold text-sm">Estimate Summary</span>
          </div>
          <ProgressSteps step={3} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 print:px-0 print:py-0 print:space-y-3">
        {/* Company header (print only) */}
        <div className="hidden print:block text-center pb-4 border-b">
          <h1 className="text-2xl font-bold">Field Estimate</h1>
          <p className="text-sm text-muted-foreground">{estimateDate}</p>
        </div>

        {/* Customer card */}
        <div className="bg-background rounded-xl border p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-bold text-lg leading-tight">{customer.name}</h2>
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
            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              {customer.id}
            </span>
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
              <span>
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
                  <p className="text-xs text-muted-foreground">estimated</p>
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

        {/* Totals */}
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
            <Separator />
            <div className="flex justify-between font-bold text-lg">
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

        {/* Estimate date */}
        <p className="text-center text-xs text-muted-foreground print:hidden">
          Generated {estimateDate}
        </p>

        {/* CTA group */}
        <div className="space-y-3 pb-8 print:hidden">
          <Button
            className="w-full h-12 text-base"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Share Estimate
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Edit Estimate
            </Button>
            <Link href="/" className="flex-1">
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
