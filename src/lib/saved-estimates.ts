import type {
  SavedEstimate,
  SavedEstimateTotals,
  SavedEstimateStatus,
  Estimate,
  ApprovalRecord,
  EstimateLineItem,
} from "@/lib/types";
import {
  calcEquipmentTotal,
  calcLaborRange,
  calcEstimateRange,
} from "@/lib/calculations";

const STORAGE_KEY = "field_estimate_tool.saved_estimates.v1";

function generateId(): string {
  return `est_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateShareToken(): string {
  return `shr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Migrate a raw stored record into the current SavedEstimate shape.
 * - Old records (pre-status/revision/share fields) get sensible defaults.
 * - Returns null when the record is too malformed to use.
 */
function migrate(raw: unknown): SavedEstimate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SavedEstimate> & Record<string, unknown>;

  if (
    typeof r.id !== "string" ||
    typeof r.customerId !== "string" ||
    !Array.isArray(r.lineItems)
  ) {
    return null;
  }

  const now = new Date().toISOString();
  const createdAt = typeof r.createdAt === "string" ? r.createdAt : now;
  const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : createdAt;

  const totals: SavedEstimateTotals = (r.totals as SavedEstimateTotals) ?? {
    equipmentSubtotal: 0,
    laborMin: null,
    laborMax: null,
    totalMin: 0,
    totalMax: 0,
  };

  return {
    id: r.id,
    customerId: r.customerId,
    customerName: typeof r.customerName === "string" ? r.customerName : "Customer",
    createdAt,
    updatedAt,
    lineItems: r.lineItems as SavedEstimate["lineItems"],
    laborRate: (r.laborRate as SavedEstimate["laborRate"]) ?? null,
    notes: typeof r.notes === "string" ? r.notes : "",
    totals,
    status: (r.status as SavedEstimateStatus) ?? "draft",
    revisionNumber: typeof r.revisionNumber === "number" ? r.revisionNumber : 1,
    parentEstimateId:
      typeof r.parentEstimateId === "string" ? r.parentEstimateId : undefined,
    revisionNote: typeof r.revisionNote === "string" ? r.revisionNote : undefined,
    lastActionAt: typeof r.lastActionAt === "string" ? r.lastActionAt : updatedAt,
    visitPurpose: (r.visitPurpose as SavedEstimate["visitPurpose"]) ?? undefined,
    intakeNotes: typeof r.intakeNotes === "string" ? r.intakeNotes : undefined,
    shareToken:
      typeof r.shareToken === "string" && r.shareToken
        ? r.shareToken
        : generateShareToken(),
    approval: (r.approval as ApprovalRecord) ?? undefined,
  };
}

function readAll(): SavedEstimate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed
      .map((item) => migrate(item))
      .filter((x): x is SavedEstimate => x !== null);
    return migrated;
  } catch {
    return [];
  }
}

function writeAll(estimates: SavedEstimate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estimates));
  } catch {
    // localStorage may be unavailable — fail silently
  }
}

function lineItemsFingerprint(items: EstimateLineItem[]): string {
  return JSON.stringify(
    items.map((li) => ({ id: li.equipment.id, q: li.quantity }))
  );
}

/** True when estimate body differs from what was last saved (for invalidating approval). */
function estimateBodyDiffersFromSaved(
  estimate: Estimate,
  saved: SavedEstimate
): boolean {
  const a = {
    lines: lineItemsFingerprint(estimate.lineItems),
    labor: JSON.stringify(estimate.laborRate),
    notes: (estimate.notes ?? "").trim(),
  };
  const b = {
    lines: lineItemsFingerprint(saved.lineItems),
    labor: JSON.stringify(saved.laborRate),
    notes: (saved.notes ?? "").trim(),
  };
  return JSON.stringify(a) !== JSON.stringify(b);
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

export function getSavedEstimateByShareToken(
  token: string
): SavedEstimate | null {
  return readAll().find((e) => e.shareToken === token) ?? null;
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
    status: "draft",
    revisionNumber: 1,
    lastActionAt: now,
    visitPurpose: estimate.visitPurpose,
    intakeNotes: estimate.intakeNotes,
    shareToken: generateShareToken(),
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
  const now = new Date().toISOString();

  const hadFinalCustomerDecision =
    existing.status === "approved" || existing.status === "rejected";
  const bodyChanged = estimateBodyDiffersFromSaved(estimate, existing);
  const forkAfterDecision = hadFinalCustomerDecision && bodyChanged;

  // Keep the approved/rejected snapshot in the list; save edited work as a new draft row.
  if (forkAfterDecision) {
    const lineageRoot = existing.parentEstimateId ?? existing.id;
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
      status: "draft",
      revisionNumber: (existing.revisionNumber ?? 1) + 1,
      parentEstimateId: lineageRoot,
      lastActionAt: now,
      visitPurpose: estimate.visitPurpose ?? existing.visitPurpose,
      intakeNotes: estimate.intakeNotes ?? existing.intakeNotes,
      shareToken: generateShareToken(),
    };
    writeAll([record, ...all]);
    return record;
  }

  const updated: SavedEstimate = {
    ...existing,
    customerId: estimate.customerId,
    customerName,
    updatedAt: now,
    lastActionAt: now,
    lineItems: estimate.lineItems,
    laborRate: estimate.laborRate,
    notes: estimate.notes,
    totals: buildTotals(estimate),
    visitPurpose: estimate.visitPurpose ?? existing.visitPurpose,
    intakeNotes: estimate.intakeNotes ?? existing.intakeNotes,
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
    lastActionAt: now,
    status: "draft",
    revisionNumber: 1,
    parentEstimateId: undefined,
    revisionNote: undefined,
    shareToken: generateShareToken(),
    approval: undefined,
  };
  const all = readAll();
  const originalIdx = all.findIndex((e) => e.id === id);
  all.splice(originalIdx + 1, 0, duplicate);
  writeAll(all);
  return duplicate;
}

/**
 * Save the current edited estimate as a new revision linked to a parent.
 * The new record gets parentEstimateId pointing to the source's lineage root,
 * and revisionNumber = (max revision in lineage) + 1.
 */
export function saveAsNewRevision(
  parentId: string,
  estimate: Estimate,
  customerName: string,
  revisionNote?: string
): SavedEstimate | null {
  const all = readAll();
  const parent = all.find((e) => e.id === parentId);
  if (!parent) return null;

  // Compute lineage root: if parent has parentEstimateId, use that; else use parent.id
  const lineageRootId = parent.parentEstimateId ?? parent.id;

  // Find max revision in lineage (root + all descendants)
  const lineage = all.filter(
    (e) => e.id === lineageRootId || e.parentEstimateId === lineageRootId
  );
  const maxRev = lineage.reduce(
    (m, e) => Math.max(m, e.revisionNumber ?? 1),
    1
  );

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
    status: "draft",
    revisionNumber: maxRev + 1,
    parentEstimateId: lineageRootId,
    revisionNote: revisionNote?.trim() || undefined,
    lastActionAt: now,
    visitPurpose: estimate.visitPurpose ?? parent.visitPurpose,
    intakeNotes: estimate.intakeNotes ?? parent.intakeNotes,
    shareToken: generateShareToken(),
  };

  writeAll([record, ...all]);
  return record;
}

export function setEstimateStatus(
  id: string,
  status: SavedEstimateStatus
): SavedEstimate | null {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  all[idx] = {
    ...all[idx],
    status,
    lastActionAt: now,
    updatedAt: now,
  };
  writeAll(all);
  return all[idx];
}

export function recordApproval(
  id: string,
  decision: "approved" | "rejected",
  note?: string
): SavedEstimate | null {
  const all = readAll();
  const idx = all.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  all[idx] = {
    ...all[idx],
    status: decision,
    approval: { status: decision, at: now, note: note?.trim() || undefined },
    lastActionAt: now,
    updatedAt: now,
  };
  writeAll(all);
  return all[idx];
}
