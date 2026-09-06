/**
 * Typed bindings to the EventPulse NestJS backend.
 * Mirrors the REST surface in backend/src/modules — one function per endpoint
 * the frontend actually exercises, all behind the same auth'd JSON client.
 */
import { apiRequest } from "./http";

const TOKEN_KEY = "eventpulse:tokenId";

/** The attendee's active commitment token id, persisted across pages. */
export function readStoredTokenId(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeStoredTokenId(id: string | null): void {
  try {
    if (id) localStorage.setItem(TOKEN_KEY, id);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// ── Domain types (mirror backend/src/core/domain) ──────────────────────────

export type BackendGLevel = "G5" | "G3" | "G2" | "G1" | "G0";

export type BackendCommitmentType =
  | "transit_slot"
  | "hotel_room"
  | "exit_window"
  | "incentive_voucher"
  | "shuttle_seat";

export type BackendCommitmentState =
  | "offered"
  | "accepted"
  | "held"
  | "activated"
  | "fulfilled"
  | "forfeited"
  | "refunded"
  | "downgraded";

export interface BackendToken {
  id: string;
  attendeeRef: string;
  category: string;
  capacityUnitRef: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  gLevel: BackendGLevel;
  state: BackendCommitmentState;
  incentiveValue: number;
  cost: number;
  channel: string;
  cancelPolicy: string;
  expiresAt: string;
  verificationMechanism: string;
  commitmentLedgerRef: string;
  version: number;
}

export interface BackendEscrow {
  id: string;
  zoneRef: string;
  fundedAmount: number;
  availableBalance: number;
  perTokenCompensation: number;
  expectedFailureHazard: number;
  margin: number;
  issuedCap: number;
  issuedCount: number;
  heldCount: number;
  lastAdjustment: string;
}

// ── Health / connectivity ───────────────────────────────────────────────────

export interface BackendHealthInfo {
  status: string;
  postgres?: string;
  redis?: string;
}

export async function apiHealth(): Promise<BackendHealthInfo> {
  const res = await apiRequest<{
    status: string;
    info?: { postgres?: { status?: string }; redis?: { status?: string } };
  }>("/health", {}, 4000);
  return {
    status: res.status,
    postgres: res.info?.postgres?.status,
    redis: res.info?.redis?.status,
  };
}

// ── Commitment & Delivery Engine (§25) ─────────────────────────────────────

export interface CreateCommitmentInput {
  attendeeRef: string;
  category: BackendCommitmentType;
  capacityUnitRef: string;
  gLevel: BackendGLevel;
  channel: "app" | "sms" | "pa" | "signage" | "staff" | "web";
  verificationMechanism: "scan" | "provider_receipt" | "staff_confirm" | "none";
  incentiveValue: number;
  cost: number;
  expiresAt: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  zoneRef: string;
}

/** POST /commitment/tokens — offer a new commitment token. */
export async function createCommitmentToken(
  input: CreateCommitmentInput,
): Promise<{ ok: boolean; tokenId?: string; error?: string }> {
  return apiRequest("/commitment/tokens", { method: "POST", body: JSON.stringify(input) });
}

/** GET /commitment/tokens/:id — read the live token state. */
export async function getCommitmentToken(
  id: string,
): Promise<{ found: boolean; token?: BackendToken }> {
  return apiRequest(`/commitment/tokens/${encodeURIComponent(id)}`);
}

export type CommitmentAction =
  | "accept"
  | "hold"
  | "activate"
  | "forfeit"
  | "refund"
  | "downgrade"
  | "reoffering";

/** POST /commitment/tokens/:id/:action — a lifecycle transition. */
export async function commitmentAction(
  id: string,
  action: CommitmentAction,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  return apiRequest(`/commitment/tokens/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export interface FulfillEvidenceInput {
  category: BackendCommitmentType;
  mechanism: "scan" | "provider_receipt" | "staff_confirm" | "none";
  evidenceData: Record<string, unknown>;
  crossCheckPassed: boolean;
  sourceSystem: string;
}

/** POST /commitment/tokens/:id/fulfill — close the loop with evidence. */
export async function fulfillCommitmentToken(
  id: string,
  evidence: FulfillEvidenceInput,
): Promise<{ ok: boolean; error?: string }> {
  return apiRequest(`/commitment/tokens/${encodeURIComponent(id)}/fulfill`, {
    method: "POST",
    body: JSON.stringify(evidence),
  });
}

// ── Read-model projections (§35) ─────────────────────────────────────────────

/** GET /projections/tokens/active — every currently active token. */
export async function listActiveTokens(): Promise<{ count: number; tokens: BackendToken[] }> {
  return apiRequest("/projections/tokens/active");
}

/** GET /projections/zones/:zoneRef — zone-level projection aggregates. */
export async function getZoneProjection(
  zoneRef: string,
): Promise<{ found: boolean; zone?: Record<string, unknown> }> {
  return apiRequest(`/projections/zones/${encodeURIComponent(zoneRef)}`);
}

// ── Feedback & Learning (§20/§21/§33.2) ─────────────────────────────────────

export interface ReportedOutcomeInput {
  providerRef: string;
  zoneRef: string;
  tier: "S" | "O" | "A" | "C";
  metric: string;
  value: number;
  sampleSize: number;
  observedAt: string;
  isHoldout: boolean;
  context: Record<string, unknown>;
}

/** POST /feedback/evidence/record — record an attributed journey outcome. */
export async function recordOutcome(
  outcome: ReportedOutcomeInput,
): Promise<{ recorded: boolean; error?: string }> {
  return apiRequest("/feedback/evidence/record", {
    method: "POST",
    body: JSON.stringify(outcome),
  });
}

/** POST /feedback/reputation/success — bump a provider's success ledger. */
export async function recordProviderSuccess(
  providerRef: string,
): Promise<{ recorded: boolean }> {
  return apiRequest("/feedback/reputation/success", {
    method: "POST",
    body: JSON.stringify({ providerRef }),
  });
}

// ── Guarantee ladder (§6/§44) ────────────────────────────────────────────────

/** GET /guarantee/levels — label G-levels straight from the backend */
export async function getGuaranteeLevels(): Promise<
  { level: string; index: number; label: string }[]
> {
  return apiRequest("/guarantee/levels");
}

// ── Escrow (§8.4) ─────────────────────────────────────────────────────────────

/** GET /commitment/escrow/:zoneRef — live pre-funded compensation pool. */
export async function getEscrow(
  zoneRef: string,
): Promise<{ found: boolean; escrow?: BackendEscrow }> {
  return apiRequest(`/commitment/escrow/${encodeURIComponent(zoneRef)}`);
}

/** POST /commitment/escrow/fund — pre-fund the pool for a zone/event. */
export async function fundEscrow(input: {
  zoneRef: string;
  amount: number;
  perTokenCompensation: number;
  expectedFailureHazard: number;
  margin: number;
}): Promise<{ ok: boolean; escrow?: BackendEscrow; error?: string }> {
  return apiRequest("/commitment/escrow/fund", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ── AI concierge (§AI) ───────────────────────────────────────────────────────

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatResponse {
  reply: string;
  intent: string;
  choices?: { label: string; value: string }[];
}

/** POST /ai/chat — semantically sensible concierge reply routed via the backend. */
export async function aiChat(
  messages: AiChatMessage[],
  event: { name: string; venue: string; date?: string },
  timeoutMs = 45000,
): Promise<AiChatResponse> {
  return apiRequest(
    "/ai/chat",
    { method: "POST", body: JSON.stringify({ messages, event }) },
    timeoutMs,
  );
}

// ── Action orchestration (§19/§21/§22) ──────────────────────────────────────

/** POST /orchestration/emergency/request — escalate a zone into emergency. */
export async function emergencyRequest(input: {
  zoneRef: string;
  action: string;
  reason: string;
}): Promise<Record<string, unknown>> {
  return apiRequest("/orchestration/emergency/request", {
    method: "POST",
    body: JSON.stringify(input),
  });
}