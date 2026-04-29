import type { EstimateLineItem, LaborRate } from "@/lib/types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calcEquipmentTotal(items: EstimateLineItem[]): number {
  return items.reduce((sum, i) => sum + i.equipment.baseCost * i.quantity, 0);
}

export function calcLaborRange(rate: LaborRate): { min: number; max: number } {
  return {
    min: rate.hourlyRate * rate.estimatedHours.min,
    max: rate.hourlyRate * rate.estimatedHours.max,
  };
}

export function calcEstimateRange(
  items: EstimateLineItem[],
  rate: LaborRate | null
): { min: number; max: number } {
  const equipment = calcEquipmentTotal(items);
  const labor = rate ? calcLaborRange(rate) : { min: 0, max: 0 };
  return {
    min: equipment + labor.min,
    max: equipment + labor.max,
  };
}

export function formatLaborLabel(rate: LaborRate): string {
  const jobTypeLabels: Record<string, string> = {
    diagnostic: "Diagnostic",
    repair: "Repair",
    install: "Installation",
    maintenance: "Maintenance",
    ductwork: "Ductwork",
  };
  const label = jobTypeLabels[rate.jobType] ?? rate.jobType;
  return `${label} — ${capitalize(rate.level)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}
