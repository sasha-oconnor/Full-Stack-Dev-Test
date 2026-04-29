import { getEquipment, getLaborRates } from "@/lib/data";
import { runEstimateAssist, runHeuristicAssist } from "@/lib/ai-assist";
import type { AiAssistRequest, AiSuggestionResult } from "@/lib/types";

export const runtime = "nodejs";

interface IncomingRequest {
  prompt?: string;
  customerContext?: AiAssistRequest["customerContext"];
  notes?: string;
  selectedEquipmentIds?: string[];
  visitPurpose?: AiAssistRequest["visitPurpose"];
}

// Light client throttle to keep Gemini quotas civilized in demo mode.
const MIN_REQUEST_GAP_MS = 4_000;
const recentByClient = new Map<string, number>();

function getClientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "unknown_ip";
  const ua = req.headers.get("user-agent") ?? "unknown_ua";
  return `${fwd.split(",")[0].trim()}|${ua.slice(0, 120)}`;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  let body: IncomingRequest;
  try {
    body = (await req.json()) as IncomingRequest;
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  if (!body.customerContext) {
    return jsonResponse({ error: "missing_customer_context" }, 400);
  }

  const request: AiAssistRequest = {
    prompt: typeof body.prompt === "string" ? body.prompt.slice(0, 2000) : "",
    customerContext: {
      propertyType: body.customerContext.propertyType,
      systemType: body.customerContext.systemType ?? "",
      systemAge: body.customerContext.systemAge,
      squareFootage: body.customerContext.squareFootage,
    },
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : "",
    selectedEquipmentIds: Array.isArray(body.selectedEquipmentIds)
      ? body.selectedEquipmentIds.filter((s): s is string => typeof s === "string")
      : [],
    visitPurpose: body.visitPurpose,
  };

  const equipment = getEquipment();
  const labor = getLaborRates();

  // Server-side throttle: if user spams Analyze, return heuristic immediately
  // so they still get something useful and we don't burn quota.
  const clientKey = getClientKey(req);
  const now = Date.now();
  const last = recentByClient.get(clientKey) ?? 0;
  if (now - last < MIN_REQUEST_GAP_MS) {
    const throttled = runHeuristicAssist(
      request,
      equipment,
      labor,
      "client_rate_limited"
    );
    return jsonResponse(throttled);
  }
  recentByClient.set(clientKey, now);

  let result: AiSuggestionResult;
  try {
    result = await runEstimateAssist(request, equipment, labor);
  } catch {
    result = runHeuristicAssist(request, equipment, labor, "server_error");
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(
      `[ai-assist] providerUsed=${result.providerUsed}` +
        (result.providerReason ? ` reason=${result.providerReason}` : "")
    );
  }

  return jsonResponse(result);
}
