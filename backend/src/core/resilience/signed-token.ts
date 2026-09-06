// §27.1 — Signed offline token credential helpers (HMAC signature + validity window).
import { createHmac, timingSafeEqual } from "crypto";

export interface SignedTokenPayload {
  tokenId: string;
  capacityUnitRef: string;
  attendeeRef: string;
  gLevel: string;
  /** ISO string validity window */
  validFrom: string;
  validUntil: string;
}

export interface SignedCredential {
  /** base64url signature over the payload */
  signature: string;
  /** the signed payload, JSON-encoded */
  payloadJson: string;
}

export interface SignedToken {
  credential: SignedCredential;
  issuedAt: Date;
}

/**
 * §27.1 — Sign an offline token credential. Providers verify offline via a
 * shared secret cache; validity is bounded by the signed window.
 */
export function signOfflineToken(
  payload: SignedTokenPayload,
  secret: string,
  issuedAt: Date = new Date(),
): SignedToken {
  const payloadJson = JSON.stringify(payload);
  const signature = createHmac("sha256", secret)
    .update(payloadJson)
    .digest("base64url");
  return { credential: { signature, payloadJson }, issuedAt };
}

/**
 * §27.1 — Verify a signed credential (signature + within validity window).
 */
export function verifySignedToken(
  credential: SignedCredential,
  secret: string,
): {
  valid: boolean;
  reason?: string;
  payload?: SignedTokenPayload;
} {
  let payload: SignedTokenPayload;
  try {
    payload = JSON.parse(credential.payloadJson) as SignedTokenPayload;
  } catch {
    return { valid: false, reason: "malformed payload" };
  }

  const expected = createHmac("sha256", secret)
    .update(credential.payloadJson)
    .digest("base64url");
  const a = Buffer.from(credential.signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "signature mismatch" };
  }

  const now = Date.now();
  const from = new Date(payload.validFrom).getTime();
  const until = new Date(payload.validUntil).getTime();
  if (now < from) return { valid: false, reason: "not yet valid" };
  if (now > until) return { valid: false, reason: "validity window expired" };

  return { valid: true, payload };
}

/**
 * §27.1 — Provider-side cache helpers: replicate the last-known held-token set.
 */
export interface ProviderTokenCacheEntry {
  signed: SignedToken;
  state: string;
}

export function providerCacheKey(providerRef: string): string {
  return `ep:providertoken:${providerRef}`;
}
