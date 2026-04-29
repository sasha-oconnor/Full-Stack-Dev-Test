export interface Customer {
  id: string;
  name: string;
  address: string;
  phone?: string;
  propertyType: "residential" | "commercial";
  squareFootage?: number;
  systemType: string;
  systemAge?: number;
  lastServiceDate?: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  brand: string;
  modelNumber: string;
  baseCost: number;
}

export interface LaborRate {
  jobType: "diagnostic" | "repair" | "install" | "maintenance" | "ductwork";
  level: string;
  hourlyRate: number;
  estimatedHours: { min: number; max: number };
}

export interface EstimateLineItem {
  equipment: Equipment;
  quantity: number;
}

export type VisitPurpose = "repair" | "install" | "maintenance" | "diagnostic";

export interface Estimate {
  customerId: string;
  lineItems: EstimateLineItem[];
  laborRate: LaborRate | null;
  notes: string;
  visitPurpose?: VisitPurpose;
  intakeNotes?: string;
}

export interface SavedEstimateTotals {
  equipmentSubtotal: number;
  laborMin: number | null;
  laborMax: number | null;
  totalMin: number;
  totalMax: number;
}

export type SavedEstimateStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected";

export interface ApprovalRecord {
  status: "approved" | "rejected";
  at: string;
  note?: string;
}

export interface SavedEstimate {
  id: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  lineItems: EstimateLineItem[];
  laborRate: LaborRate | null;
  notes: string;
  totals: SavedEstimateTotals;

  // Phase: status + revisioning
  status: SavedEstimateStatus;
  revisionNumber: number;
  parentEstimateId?: string;
  revisionNote?: string;
  lastActionAt: string;

  // Phase: visit context
  visitPurpose?: VisitPurpose;
  intakeNotes?: string;

  // Phase: share + approval
  shareToken: string;
  approval?: ApprovalRecord;
}

// ──────────────────────────────────────────────────────────────────────────
// AI Assist contracts
// ──────────────────────────────────────────────────────────────────────────

export type AiConfidence = "low" | "medium" | "high";

export interface EquipmentSuggestion {
  equipmentId: string;
  equipmentName: string;
  quantity: number;
  reason: string;
  confidence: AiConfidence;
  /** equipmentId references current catalog; if false, treat as unresolved */
  resolved: boolean;
}

export interface LaborSuggestion {
  jobType: LaborRate["jobType"];
  level: string;
  reason: string;
  confidence: AiConfidence;
  /** matches a real labor rate in current catalog */
  resolved: boolean;
}

export interface MissingInfoPrompt {
  question: string;
  why?: string;
}

export interface SummaryDraftSuggestion {
  text: string;
  confidence: AiConfidence;
}

export type AiProviderName = "gemini" | "fallback";

export interface AiSuggestionResult {
  primaryEquipment: EquipmentSuggestion[];
  alternativeEquipment: EquipmentSuggestion[];
  laborPrimary: LaborSuggestion | null;
  laborAlternative: LaborSuggestion | null;
  missingInfo: MissingInfoPrompt[];
  customerSummaryDraft: SummaryDraftSuggestion | null;
  /** Which provider produced this result */
  providerUsed: AiProviderName;
  /** Optional code/explanation when fallback is used */
  providerReason?: string;
  generatedAt: string;
}

export interface AiAssistRequest {
  prompt: string;
  customerContext: {
    propertyType: Customer["propertyType"];
    systemType: string;
    systemAge?: number;
    squareFootage?: number;
  };
  notes?: string;
  selectedEquipmentIds: string[];
  visitPurpose?: VisitPurpose;
}

export interface AiCleanupRequest {
  text: string;
}

export interface AiCleanupResult {
  cleaned: string;
  providerUsed: AiProviderName;
  providerReason?: string;
}
