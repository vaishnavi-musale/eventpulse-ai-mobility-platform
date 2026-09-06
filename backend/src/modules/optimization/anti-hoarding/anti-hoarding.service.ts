// §18.6 — Anti-hoarding: one active G≥2 token per category per attendee + release deadlines
// Voucher tied to verified check-in prevents check-in-and-flee
import type { CommitmentToken } from "@core/domain/commitment-token";
import type { GLevel } from "@core/domain/g-level.enum";
import type { AntiHoardingConstraint } from "../types/constraint.types";

const HIGH_G_LEVELS: GLevel[] = ["G5", "G3", "G2"];

function isHighGLevel(level: GLevel): boolean {
  return HIGH_G_LEVELS.includes(level);
}

/**
 * §18.6 — Check anti-hoarding constraints for all attendees.
 * One active G≥2 token per category per attendee.
 * Release deadlines enforced.
 * Voucher tied to verified check-in.
 */
export function checkAntiHoarding(
  tokens: CommitmentToken[],
  now: Date = new Date(),
): AntiHoardingConstraint[] {
  // Group tokens by attendee + category
  const tokenGroups = new Map<string, CommitmentToken[]>();
  for (const token of tokens) {
    if (!isHighGLevel(token.gLevel)) continue;
    if (token.state === "forfeited" || token.state === "refunded") continue;

    const key = `${token.attendeeRef}:${token.category}`;
    const group = tokenGroups.get(key) ?? [];
    group.push(token);
    tokenGroups.set(key, group);
  }

  const constraints: AntiHoardingConstraint[] = [];

  for (const [key, groupTokens] of tokenGroups) {
    const [attendeeRef, category] = key.split(":");

    // §18.6 — Release deadline check
    const activeTokens = groupTokens.filter(
      (t) => t.expiresAt > now || t.state === "held" || t.state === "activated",
    );

    const releaseDeadline = activeTokens.reduce(
      (latest, t) => (t.expiresAt > latest ? t.expiresAt : latest),
      new Date(0),
    );

    // §18.6 — Voucher tied to verified check-in
    const hasVerifiedCheckIn = activeTokens.some(
      (t) =>
        t.verificationMechanism !== "none" &&
        (t.state === "activated" || t.state === "fulfilled"),
    );

    // §18.6 — One active G≥2 token per category per attendee
    const maxAllowed = 1;
    const satisfied = activeTokens.length <= maxAllowed;

    constraints.push({
      attendeeRef,
      commitmentCategory: category,
      activeHighGTokenCount: activeTokens.length,
      maxAllowed,
      releaseDeadline,
      checkInVerified: hasVerifiedCheckIn,
      satisfied,
    });
  }

  return constraints;
}

/**
 * §18.6 — Enforce anti-hoarding: reject new token if would violate constraint.
 */
export function canIssueToken(
  existingTokens: CommitmentToken[],
  newToken: CommitmentToken,
  now: Date = new Date(),
): { allowed: boolean; reason?: string } {
  if (!isHighGLevel(newToken.gLevel)) {
    return { allowed: true };
  }

  // Check existing tokens for same attendee + category
  const conflicting = existingTokens.filter(
    (t) =>
      t.attendeeRef === newToken.attendeeRef &&
      t.category === newToken.category &&
      isHighGLevel(t.gLevel) &&
      (t.expiresAt > now || t.state === "held" || t.state === "activated"),
  );

  if (conflicting.length >= 1) {
    return {
      allowed: false,
      reason: `Anti-hoarding violation: attendee ${newToken.attendeeRef} already has ${conflicting.length} active G≥2 token(s) for category ${newToken.category}`,
    };
  }

  // Check release deadline
  if (newToken.expiresAt <= now) {
    return {
      allowed: false,
      reason: `Release deadline already passed for token ${newToken.id}`,
    };
  }

  return { allowed: true };
}
