// §27.1 — Signed Offline Token service.
// HMAC-signed credentials with validity window, provider-side verify
// using signature cache. Held tokens valid only within window;
// window end → treated as released, re-offer on recovery with compensation.
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  signOfflineToken,
  verifySignedToken,
  SignedTokenPayload,
  SignedCredential,
} from "../../core/resilience/signed-token";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { EVENT_NAMES } from "../../core/domain/events/event-names";
import { generateId } from "../../core/common/ids";
import { Result, ok, err } from "../../core/common/result";
import { GLevel } from "../../core/domain/g-level.enum";
import { OfflineTokenEntry, SignatureCacheEntry } from "./types";

/** §27.1 — Default validity window for offline tokens */
const DEFAULT_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class SignedOfflineTokenService {
  private readonly logger = new Logger(SignedOfflineTokenService.name);

  /** Active offline tokens */
  private readonly tokens = new Map<string, OfflineTokenEntry>();

  /** Provider-side signature cache */
  private readonly signatureCache = new Map<string, SignatureCacheEntry>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §27.1 — Issue a signed offline token credential.
   */
  async issueOfflineToken(params: {
    tokenId: string;
    capacityUnitRef: string;
    attendeeRef: string;
    gLevel: GLevel;
    providerRef: string;
    secret: string;
    validityMs?: number;
  }): Promise<Result<OfflineTokenEntry>> {
    const now = new Date();
    const validityMs = params.validityMs ?? DEFAULT_VALIDITY_MS;
    const validUntil = new Date(now.getTime() + validityMs);

    const payload: SignedTokenPayload = {
      tokenId: params.tokenId,
      capacityUnitRef: params.capacityUnitRef,
      attendeeRef: params.attendeeRef,
      gLevel: params.gLevel,
      validFrom: now.toISOString(),
      validUntil: validUntil.toISOString(),
    };

    const signed = signOfflineToken(payload, params.secret, now);

    const entry: OfflineTokenEntry = {
      tokenId: params.tokenId,
      signature: signed.credential.signature,
      payloadJson: signed.credential.payloadJson,
      validFrom: now,
      validUntil,
      held: true,
      providerRef: params.providerRef,
      gLevel: params.gLevel,
      cacheTtlSeconds: Math.ceil(validityMs / 1000),
    };

    this.tokens.set(params.tokenId, entry);

    // Cache for provider-side verification
    this.signatureCache.set(params.tokenId, {
      signature: signed.credential.signature,
      cachedAt: now,
      ttlSeconds: entry.cacheTtlSeconds,
      tokenState: "held",
    });

    return ok(entry);
  }

  /**
   * §27.1 — Provider-side verify of a signed offline token.
   */
  verifyOfflineToken(
    credential: SignedCredential,
    secret: string,
  ): { valid: boolean; reason?: string; payload?: SignedTokenPayload } {
    return verifySignedToken(credential, secret);
  }

  /**
   * §27.1 — Check if a held token's validity window has expired.
   * Expired tokens are treated as released → re-offer on recovery.
   */
  checkValidity(tokenId: string): {
    valid: boolean;
    expired: boolean;
    reason?: string;
  } {
    const token = this.tokens.get(tokenId);
    if (!token) {
      return { valid: false, expired: false, reason: "token not found" };
    }

    const now = new Date();
    if (now > token.validUntil) {
      return {
        valid: false,
        expired: true,
        reason: `§27.1: Validity window expired at ${token.validUntil.toISOString()}`,
      };
    }

    if (!token.held) {
      return { valid: false, expired: false, reason: "token is not held" };
    }

    return { valid: true, expired: false };
  }

  /**
   * §27.1 — Release an expired token (treat as released → re-offer).
   */
  async releaseExpiredToken(tokenId: string): Promise<Result<void>> {
    const token = this.tokens.get(tokenId);
    if (!token) return err("TOKEN_NOT_FOUND", `Token ${tokenId} not found`);

    const check = this.checkValidity(tokenId);
    if (!check.expired) {
      return err("NOT_EXPIRED", `Token ${tokenId} has not expired yet`);
    }

    token.held = false;

    // Update cache
    const cached = this.signatureCache.get(tokenId);
    if (cached) {
      cached.tokenState = "released";
    }

    const event = new EventPulseDomainEvent({
      id: generateId(),
      eventName: EVENT_NAMES.TokenRefunded,
      aggregateId: tokenId,
      gLevel: token.gLevel,
      version: 1,
      payload: {
        tokenId,
        reason: "§27.1: Validity window expired; treated as released",
        validUntil: token.validUntil.toISOString(),
        providerRef: token.providerRef,
      },
    });
    await this.eventBus.publish(event);

    return ok(undefined);
  }

  /**
   * §27.1 — Get signature cache entry (provider-side).
   */
  getSignatureCache(tokenId: string): SignatureCacheEntry | undefined {
    return this.signatureCache.get(tokenId);
  }

  /**
   * §27.1 — Check if signature cache entry is still valid (not expired).
   */
  isSignatureCacheValid(tokenId: string): boolean {
    const entry = this.signatureCache.get(tokenId);
    if (!entry) return false;

    const elapsed = (Date.now() - entry.cachedAt.getTime()) / 1000;
    return elapsed < entry.ttlSeconds;
  }

  /**
   * §27.1 — Get all held tokens for a provider.
   */
  getHeldTokens(providerRef: string): OfflineTokenEntry[] {
    return Array.from(this.tokens.values()).filter(
      (t) => t.providerRef === providerRef && t.held,
    );
  }

  /**
   * §27.1 — Get all tokens that need re-offering (expired held tokens).
   */
  getTokensForRecovery(): OfflineTokenEntry[] {
    const now = new Date();
    return Array.from(this.tokens.values()).filter(
      (t) => t.held && now > t.validUntil,
    );
  }
}
