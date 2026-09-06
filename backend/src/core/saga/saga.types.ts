// §25.5 — Saga outcome + Result types
import { Result } from "../common/result";

export interface ReservationDecision {
  reservationId: string;
  intentId: string;
  gLevel: string;
  confirmed: boolean;
  /** Which path executed: redis (fast) or postgres (single-writer fallback) */
  path: "redis" | "postgres";
}

export type ReserveResult = Result<ReservationDecision>;

export type SagaPhase =
  | "INTENT_APPENDED"
  | "PG_DECREMENTED"
  | "LEDGER_ENTRIED"
  | "PUBLISHED"
  | "REDIS_CONFIRMED"
  | "COMPLETED";
