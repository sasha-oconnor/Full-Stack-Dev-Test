import type { SavedEstimate, SavedEstimateTotals, Estimate } from "@/lib/types";
import {
  calcEquipmentTotal,
  calcLaborRange,
  calcEstimateRange,
} from "@/lib/calculations";

const STORAGE_KEY = "field_estimate_tool.saved_estimates.v1";

function generateId(): string {
  return `est_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): SavedEstimate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedEstimate[];
  } catch {
    return [];
  }
}

function writeAll(estimates: SavedEstimate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estimates));
  } catch {
    // localStorage may be unavailable in some environments — fail silently
  }
}

function buildTotals(estimate: Estimate): SavedEstimateTotals {
  const equipmentSubtotal = calcEquipmentTotal(estimate.lineItems);
  const laborRng = estimate.laborRate
    ? calcLaborRange(estimate.laborRate)
    : null;
  const totalRange = calcEstimateRange(estimate.lineItems, estimate.laborRate);
  return {
    equipmentSubtotal,
    laborMin: laborRng?.min ?? null,
    laborMax: laborRng?.max ?? null,
    totalMin: totalRange.min,
    totalMax: totalRange.max,
  };
}

export function listSavedEstimates(): SavedEstimate[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getSavedEstimate(id: string): SavedEstimate | null {
  return readAll().find((e) => e.id === id) ?? null;
}

export function saveEstimate(
  estimate: Estimate,
  customerName: string
): SavedEstimate {
  const all = readAll();
  const now = new Date().toISOString();
  const record: SavedEstimate = {
    id: generateId(),
    customerId: estimate.customerId,
    customerName,
    createdAt: now,
    updatedAt: now,
    lineItems: estimate.lineItems,
    laborRate: estimate.laborRate,
    notes: estimate.notes,
    totals: buildTotals(estimate),
  };
  writeAll([record, ...all]);
  return record;
}

export function updateEstimate(
  id: string,
  estimate: Estimate,
  customerName: string
): SavedEstimate | null {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const existing = all[idx];
  const updated: SavedEstimate = {
    ...existing,
    customerId: estimate.customerId,
    customerName,
    updatedAt: new Date().toISOString(),
    lineItems: estimate.lineItems,
    laborRate: estimate.laborRate,
    notes: estimate.notes,
    totals: buildTotals(estimate),
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function deleteEstimate(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function duplicateEstimate(id: string): SavedEstimate | null {
  const original = getSavedEstimate(id);
  if (!original) return null;
  const now = new Date().toISOString();
  const duplicate: SavedEstimate = {
    ...original,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  const all = readAll();
  const originalIdx = all.findIndex((e) => e.id === id);
  all.splice(originalIdx + 1, 0, duplicate);
  writeAll(all);
  return duplicate;
}
