// §12.5 — Provider API capability matrix (exposed, not assumed).
// Unverified capabilities are marked `verified: false` (TBD) — never assumed.
// A plan may not depend on a capability that hasn't been filled in for the
// actual deployment (§12.5 / Appendix C validation artifact).
import {
  ProviderAdapter,
  ProviderKind,
  ProviderCapabilities,
} from "./provider-adapter.interface";

export type ProviderCapabilityStatus =
  | "verified" // confirmed for this deployment/contract
  | "partial" // limited for this deployment
  | "none" // explicitly unavailable
  | "tbd"; // unverified validation artifact — never assume

export interface ProviderCapabilityFlag {
  capability: keyof ProviderCapabilities;
  status: ProviderCapabilityStatus;
  note?: string;
}

/** §12.5 — per-provider capability flags; all `?`/TBD are `tbd`, never assumed. */
const MATRIX: Record<ProviderKind, ProviderCapabilityFlag[]> = {
  metro: [
    { capability: "reservationApi", status: "verified" },
    {
      capability: "capacityApi",
      status: "tbd",
      note: "per-agency validation artifact",
    },
    { capability: "cancellationApi", status: "tbd" },
    { capability: "reliability", status: "tbd" },
  ],
  shuttle: [
    { capability: "reservationApi", status: "tbd" },
    { capability: "capacityApi", status: "tbd" },
    { capability: "cancellationApi", status: "tbd" },
    { capability: "reliability", status: "tbd" },
  ],
  "hotel-pms": [
    { capability: "reservationApi", status: "partial" },
    { capability: "capacityApi", status: "tbd" },
    { capability: "cancellationApi", status: "tbd" },
    { capability: "reliability", status: "tbd" },
  ],
  restaurant: [
    {
      capability: "reservationApi",
      status: "none",
      note: "no API (spec §12.5)",
    },
    { capability: "capacityApi", status: "tbd" },
    { capability: "cancellationApi", status: "none" },
    { capability: "reliability", status: "tbd" },
  ],
  venue: [
    { capability: "reservationApi", status: "partial" },
    { capability: "capacityApi", status: "tbd" },
    { capability: "cancellationApi", status: "tbd" },
    { capability: "reliability", status: "tbd" },
  ],
};

/** Resolve the capability status flag for a provider + capability. */
export function capabilityStatusFor(
  provider: ProviderKind,
  capability: keyof ProviderCapabilities,
): ProviderCapabilityStatus {
  const flag = MATRIX[provider].find((f) => f.capability === capability);
  return flag?.status ?? "tbd";
}

/** True only when a platform dependency on this capability is safe (verified). */
export function isCapabilityUsable(
  provider: ProviderKind,
  capability: keyof ProviderCapabilities,
): boolean {
  return capabilityStatusFor(provider, capability) === "verified";
}

/** Assert all capabilities required to serve HARD (G3/G5) tokens are verified. */
export function requireVerifiedCapabilities(
  adapter: ProviderAdapter,
  required: Array<keyof ProviderCapabilities>,
): Array<keyof ProviderCapabilities> {
  return required.filter(
    (cap) => capabilityStatusFor(adapter.kind, cap) !== "verified",
  );
}
