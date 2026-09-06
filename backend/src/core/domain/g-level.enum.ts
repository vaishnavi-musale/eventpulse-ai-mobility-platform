export type GLevel = "G5" | "G3" | "G2" | "G1" | "G0";

/**
 * Guarantee ladder ordering — a token may only degrade down this ladder.
 * G5 (contracted+escrowed+realtime-verified) … G0 (informed adrift).
 */
export const G_LADDER_ORDER: readonly GLevel[] = ["G5", "G3", "G2", "G1", "G0"];

export const G_LADDER_INDEX: Readonly<Record<GLevel, number>> = {
  G5: 0,
  G3: 1,
  G2: 2,
  G1: 3,
  G0: 4,
};

export function degradesGLevel(from: GLevel, to: GLevel): boolean {
  return G_LADDER_INDEX[to] >= G_LADDER_INDEX[from];
}

/** A G5 token may only issue where inventory is verified + escrow funded. */
export function requiresVerifiedInventory(level: GLevel): boolean {
  return level === "G5" || level === "G3";
}

export const G_LEVEL_LABELS: Readonly<Record<GLevel, string>> = {
  G5: "Contracted + escrowed + realtime-verified",
  G3: "Contracted + verified at boundaries",
  G2: "Soft hold / preference",
  G1: "Induced via public channels",
  G0: "Informed adrift",
};
