import { GLevel } from "./g-level.enum";

export type CommitmentType =
  | "transit_slot"
  | "hotel_room"
  | "exit_window"
  | "incentive_voucher"
  | "shuttle_seat";

export type CommitmentState =
  | "offered"
  | "accepted"
  | "held"
  | "activated"
  | "fulfilled"
  | "forfeited"
  | "refunded"
  | "downgraded";

export type VerificationMechanism =
  "scan" | "provider_receipt" | "staff_confirm" | "none";

export type Channel = "app" | "sms" | "pa" | "signage" | "staff" | "web";

/**
 * §4.3 core abstraction.
 * A HARD (G3/G5) token requires verified inventory + confirmable delivery channel.
 * G-level is LIVE — recomputed at issuance AND every state transition (§6.2).
 */
export interface CommitmentToken {
  id: string;
  attendeeRef: string; // pseudonymous
  category: CommitmentType;
  capacityUnitRef: string;
  timeWindowStart: Date;
  timeWindowEnd: Date;
  gLevel: GLevel; // current live-graded
  state: CommitmentState;
  incentiveValue: number;
  cost: number;
  channel: Channel;
  cancelPolicy: string;
  expiresAt: Date;
  verificationMechanism: VerificationMechanism;
  commitmentLedgerRef: string;
  version: number;
}
