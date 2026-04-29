import type {
  AiAssistRequest,
  AiSuggestionResult,
  EquipmentSuggestion,
  Equipment,
  LaborRate,
  LaborSuggestion,
  MissingInfoPrompt,
  SummaryDraftSuggestion,
  AiConfidence,
} from "@/lib/types";
import { formatLaborLabel } from "@/lib/calculations";

// ──────────────────────────────────────────────────────────────────────────
// Heuristic (fallback) provider
// ──────────────────────────────────────────────────────────────────────────

interface HeuristicContext {
  request: AiAssistRequest;
  equipmentCatalog: Equipment[];
  laborCatalog: LaborRate[];
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreEquipmentMatch(
  item: Equipment,
  tokens: string[]
): { score: number; matched: string[] } {
  const haystack = `${item.name} ${item.brand} ${item.modelNumber} ${item.category}`.toLowerCase();
  const matched: string[] = [];
  let score = 0;
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (haystack.includes(t)) {
      score += t.length >= 5 ? 3 : 2;
      matched.push(t);
    }
  }
  return { score, matched };
}

function pickConfidence(score: number): AiConfidence {
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function heuristicEquipmentSuggestions(
  ctx: HeuristicContext
): { primary: EquipmentSuggestion[]; alternative: EquipmentSuggestion[] } {
  const tokens = [
    ...tokenize(ctx.request.prompt),
    ...tokenize(ctx.request.notes ?? ""),
  ];
  if (tokens.length === 0) return { primary: [], alternative: [] };

  const scored = ctx.equipmentCatalog
    .filter((e) => !ctx.request.selectedEquipmentIds.includes(e.id))
    .map((e) => {
      const { score, matched } = scoreEquipmentMatch(e, tokens);
      return { e, score, matched };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3);
  const alt = scored.slice(3, 6);

  const toSuggestion = (x: typeof scored[number]): EquipmentSuggestion => ({
    equipmentId: x.e.id,
    equipmentName: x.e.name,
    quantity: 1,
    reason: `Matches keyword${x.matched.length > 1 ? "s" : ""}: ${x.matched.slice(0, 3).join(", ")}`,
    confidence: pickConfidence(x.score),
    resolved: true,
  });

  return {
    primary: top.map(toSuggestion),
    alternative: alt.map(toSuggestion),
  };
}

function heuristicLaborSuggestion(
  ctx: HeuristicContext
): { primary: LaborSuggestion | null; alternative: LaborSuggestion | null } {
  const text = `${ctx.request.prompt} ${ctx.request.notes ?? ""} ${ctx.request.visitPurpose ?? ""}`.toLowerCase();
  const isResidential = ctx.request.customerContext.propertyType === "residential";

  let jobType: LaborRate["jobType"] | null = null;
  if (/\binstall|replace|new\b/.test(text)) jobType = "install";
  else if (/\brepair|broken|leak|noisy|fix|fail/.test(text)) jobType = "repair";
  else if (/\bmaint|tune|service|clean|inspect/.test(text)) jobType = "maintenance";
  else if (/\bduct/.test(text)) jobType = "ductwork";
  else if (/\bdiag|check|test/.test(text)) jobType = "diagnostic";

  if (!jobType) {
    if (ctx.request.visitPurpose === "install") jobType = "install";
    else if (ctx.request.visitPurpose === "maintenance") jobType = "maintenance";
    else if (ctx.request.visitPurpose === "diagnostic") jobType = "diagnostic";
    else jobType = "repair";
  }

  const candidates = ctx.laborCatalog.filter((r) => r.jobType === jobType);
  if (candidates.length === 0) return { primary: null, alternative: null };

  let primaryLevel = candidates[0].level;
  if (jobType === "install") {
    primaryLevel = isResidential ? "residential" : "commercial";
  } else if (jobType === "repair") {
    primaryLevel = /\bmajor|severe|extensive\b/.test(text) ? "major" : "minor";
  } else if (jobType === "maintenance") {
    primaryLevel = /\bcomprehensive|full|complete\b/.test(text)
      ? "comprehensive"
      : "standard";
  } else if (jobType === "diagnostic") {
    primaryLevel = /\bcomplex|tricky|intermitt/.test(text) ? "complex" : "standard";
  }

  const primaryRate =
    candidates.find((r) => r.level === primaryLevel) ?? candidates[0];
  const alternativeRate =
    candidates.find((r) => r.level !== primaryRate.level) ?? null;

  const primary: LaborSuggestion = {
    jobType: primaryRate.jobType,
    level: primaryRate.level,
    reason: `Based on ${ctx.request.visitPurpose ?? "context"} and ${ctx.request.customerContext.propertyType} property type.`,
    confidence: "medium",
    resolved: true,
  };
  const alternative: LaborSuggestion | null = alternativeRate
    ? {
        jobType: alternativeRate.jobType,
        level: alternativeRate.level,
        reason: "Alternative within same job type.",
        confidence: "low",
        resolved: true,
      }
    : null;

  return { primary, alternative };
}

function heuristicMissingInfo(ctx: HeuristicContext): MissingInfoPrompt[] {
  const text = `${ctx.request.prompt} ${ctx.request.notes ?? ""}`.toLowerCase();
  const out: MissingInfoPrompt[] = [];
  if (!/\d\s?(ton|tons)\b/.test(text) && /\b(ac|condenser|unit|hvac)\b/.test(text)) {
    out.push({ question: "Need tonnage confirmation", why: "AC sizing affects equipment choice" });
  }
  if (/\bduct/.test(text) && !/(good|new|old|leaking|condition)/.test(text)) {
    out.push({ question: "What is the ductwork condition?" });
  }
  if (
    !ctx.request.customerContext.systemAge &&
    /\b(replace|install)\b/.test(text)
  ) {
    out.push({ question: "Confirm existing system age" });
  }
  return out.slice(0, 3);
}

function heuristicSummaryDraft(
  ctx: HeuristicContext,
  laborPrimary: LaborSuggestion | null,
  primaryEquipment: EquipmentSuggestion[]
): SummaryDraftSuggestion | null {
  const parts: string[] = [];
  const purpose = ctx.request.visitPurpose ?? "service";
  parts.push(
    `Proposed ${purpose} for your ${ctx.request.customerContext.propertyType} ${ctx.request.customerContext.systemType.toLowerCase()} system.`
  );
  if (primaryEquipment.length > 0) {
    parts.push(
      `Includes: ${primaryEquipment.slice(0, 3).map((e) => e.equipmentName).join(", ")}.`
    );
  }
  if (laborPrimary) {
    parts.push(
      `Labor profile: ${laborPrimary.jobType} (${laborPrimary.level}). Final cost may vary based on site conditions.`
    );
  }
  if (parts.length === 1 && primaryEquipment.length === 0 && !laborPrimary) {
    return null;
  }
  return {
    text: parts.join(" "),
    confidence: "medium",
  };
}

export function runHeuristicAssist(
  request: AiAssistRequest,
  equipmentCatalog: Equipment[],
  laborCatalog: LaborRate[],
  reasonCode: string = "fallback_used"
): AiSuggestionResult {
  const ctx: HeuristicContext = { request, equipmentCatalog, laborCatalog };
  const equip = heuristicEquipmentSuggestions(ctx);
  const labor = heuristicLaborSuggestion(ctx);
  const summary = heuristicSummaryDraft(ctx, labor.primary, equip.primary);
  return {
    primaryEquipment: equip.primary,
    alternativeEquipment: equip.alternative,
    laborPrimary: labor.primary,
    laborAlternative: labor.alternative,
    missingInfo: heuristicMissingInfo(ctx),
    customerSummaryDraft: summary,
    providerUsed: "fallback",
    providerReason: reasonCode,
    generatedAt: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Gemini provider — server-only, simple JSON path with bounded retry
// ──────────────────────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 18_000;
const RETRY_DELAY_MS = 800;

type GeminiCallResult =
  | { ok: true; data: string; reason?: undefined }
  | { ok: false; data?: undefined; reason: string };

async function callGeminiOnce(promptText: string): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, reason: "gemini_key_missing" };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return { ok: false, reason: `gemini_error_${resp.status}` };
    }
    const data = await resp.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0] ??
      "";
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, reason: "gemini_empty_response" };
    }
    return { ok: true, data: text };
  } catch (e: unknown) {
    clearTimeout(timeout);
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, reason: "gemini_timeout" };
    }
    return { ok: false, reason: "gemini_network_error" };
  }
}

/**
 * Calls Gemini once, then optionally one retry on transient errors (429/503/timeout).
 * No long lockout: if both attempts fail, caller falls back to heuristic.
 */
async function callGeminiWithRetry(promptText: string): Promise<GeminiCallResult> {
  const first = await callGeminiOnce(promptText);
  if (first.ok) return first;

  const retriable =
    first.reason === "gemini_error_429" ||
    first.reason === "gemini_error_503" ||
    first.reason === "gemini_timeout" ||
    first.reason === "gemini_network_error";

  if (!retriable) return first;

  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  return callGeminiOnce(promptText);
}

function buildAssistPrompt(
  req: AiAssistRequest,
  equipmentCatalog: Equipment[],
  laborCatalog: LaborRate[]
): string {
  const equipList = equipmentCatalog
    .map((e) => `${e.id}|${e.name}|${e.category}`)
    .join("\n");
  const laborList = laborCatalog
    .map((l) => `${l.jobType}/${l.level}`)
    .join("\n");

  const notes = (req.notes ?? "").slice(0, 2000);

  return `HVAC estimate assistant. Reply ONLY with a JSON object. No prose, no code fences.

CONTEXT: property=${req.customerContext.propertyType} system="${req.customerContext.systemType}"${req.customerContext.systemAge !== undefined ? ` age=${req.customerContext.systemAge}yr` : ""} purpose=${req.visitPurpose ?? "?"}
SELECTED: ${req.selectedEquipmentIds.join(",") || "none"}
PROMPT: ${req.prompt || "(none)"}
NOTES: ${notes || "(none)"}

EQUIPMENT (use only these ids):
${equipList}

LABOR (jobType/level only):
${laborList}

JSON schema:
{"primaryEquipment":[{"equipmentId":"","quantity":1,"reason":"","confidence":"medium"}],"alternativeEquipment":[{"equipmentId":"","quantity":1,"reason":"","confidence":"low"}],"laborPrimary":{"jobType":"","level":"","reason":"","confidence":"medium"},"laborAlternative":{"jobType":"","level":"","reason":"","confidence":"low"},"missingInfo":[{"question":"","why":""}],"customerSummaryDraft":{"text":"","confidence":"medium"}}`;
}

interface GeminiAssistRaw {
  primaryEquipment?: Array<{
    equipmentId?: string;
    quantity?: number;
    reason?: string;
    confidence?: AiConfidence;
  }>;
  alternativeEquipment?: Array<{
    equipmentId?: string;
    quantity?: number;
    reason?: string;
    confidence?: AiConfidence;
  }>;
  laborPrimary?: {
    jobType?: string;
    level?: string;
    reason?: string;
    confidence?: AiConfidence;
  } | null;
  laborAlternative?: {
    jobType?: string;
    level?: string;
    reason?: string;
    confidence?: AiConfidence;
  } | null;
  missingInfo?: Array<{ question?: string; why?: string }>;
  customerSummaryDraft?: { text?: string; confidence?: AiConfidence } | null;
}

function resolveEquipmentSuggestion(
  raw: NonNullable<GeminiAssistRaw["primaryEquipment"]>[number],
  catalog: Equipment[]
): EquipmentSuggestion | null {
  const id = raw.equipmentId?.trim();
  if (!id) return null;
  const match = catalog.find((e) => e.id === id);
  return {
    equipmentId: id,
    equipmentName: match?.name ?? "(unknown item)",
    quantity: Math.max(1, Math.min(50, Math.round(raw.quantity ?? 1))),
    reason: raw.reason?.toString().slice(0, 200) ?? "AI suggestion",
    confidence: (raw.confidence as AiConfidence) ?? "medium",
    resolved: !!match,
  };
}

function resolveLaborSuggestion(
  raw: GeminiAssistRaw["laborPrimary"],
  catalog: LaborRate[]
): LaborSuggestion | null {
  if (!raw || !raw.jobType || !raw.level) return null;
  const match = catalog.find(
    (r) => r.jobType === raw.jobType && r.level === raw.level
  );
  return {
    jobType: raw.jobType as LaborRate["jobType"],
    level: raw.level,
    reason: raw.reason?.toString().slice(0, 200) ?? "AI suggestion",
    confidence: (raw.confidence as AiConfidence) ?? "medium",
    resolved: !!match,
  };
}

function parseGeminiAssistJson(
  text: string,
  catalog: Equipment[],
  labor: LaborRate[]
): AiSuggestionResult | null {
  const clean = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  let parsed: GeminiAssistRaw;
  try {
    parsed = JSON.parse(clean);
  } catch {
    return null;
  }

  const primaryEquipment =
    (parsed.primaryEquipment ?? [])
      .map((r) => resolveEquipmentSuggestion(r, catalog))
      .filter((x): x is EquipmentSuggestion => x !== null);
  const alternativeEquipment =
    (parsed.alternativeEquipment ?? [])
      .map((r) => resolveEquipmentSuggestion(r, catalog))
      .filter((x): x is EquipmentSuggestion => x !== null);
  const laborPrimary = resolveLaborSuggestion(parsed.laborPrimary, labor);
  const laborAlternative = resolveLaborSuggestion(parsed.laborAlternative, labor);
  const missingInfo: MissingInfoPrompt[] = (parsed.missingInfo ?? [])
    .filter((m) => typeof m?.question === "string")
    .map((m) => ({
      question: m.question!.toString().slice(0, 200),
      why: m.why?.toString().slice(0, 200),
    }));
  const summary: SummaryDraftSuggestion | null = parsed.customerSummaryDraft
    ?.text
    ? {
        text: parsed.customerSummaryDraft.text.toString().slice(0, 1000),
        confidence:
          (parsed.customerSummaryDraft.confidence as AiConfidence) ?? "medium",
      }
    : null;

  return {
    primaryEquipment,
    alternativeEquipment,
    laborPrimary,
    laborAlternative,
    missingInfo,
    customerSummaryDraft: summary,
    providerUsed: "gemini",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Server-only entry: try Gemini once with one bounded retry on transient failures,
 * then fall back to heuristic. Always returns a result — never throws.
 * No long-running lockout.
 */
export async function runEstimateAssist(
  req: AiAssistRequest,
  equipmentCatalog: Equipment[],
  laborCatalog: LaborRate[]
): Promise<AiSuggestionResult> {
  const promptText = buildAssistPrompt(req, equipmentCatalog, laborCatalog);
  const result = await callGeminiWithRetry(promptText);
  if (result.ok !== true) {
    return runHeuristicAssist(
      req,
      equipmentCatalog,
      laborCatalog,
      result.reason ?? "gemini_unknown_error"
    );
  }
  const parsed = parseGeminiAssistJson(result.data, equipmentCatalog, laborCatalog);
  if (!parsed) {
    return runHeuristicAssist(
      req,
      equipmentCatalog,
      laborCatalog,
      "gemini_parse_error"
    );
  }
  return parsed;
}

export { formatLaborLabel };
