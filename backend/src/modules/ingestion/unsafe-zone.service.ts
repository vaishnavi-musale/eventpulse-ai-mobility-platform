// §12.7 — Unsafe-zone feed.
// Time-sensitive incident/closure overlays with freshness. Absent fresh data
// => promise is Paused and redirects into that zone are blocked (fail-safe,
// never assumed safe).
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_BUS } from "@core/messaging/event-bus.token";
import { EventBus } from "@core/messaging/event-bus.interface";
import { EventPulseDomainEvent } from "@core/domain/events/base-event";
import { generateId } from "@core/common/ids";

export type UnsafeZoneKind =
  | "incident"
  | "closure"
  | "police_alert"
  | "lighting_outage"
  | "construction"
  | "air_quality";

export interface UnsafeZoneOverlay {
  zone: string;
  kind: UnsafeZoneKind;
  /** Freshness gate — data older than this is treated as absent (§12.7). */
  validUntil: Date;
  source: string;
  severity: "caution" | "no_entry";
}

export interface RedirectGuardResult {
  zone: string;
  /** true when the zone is safe to redirect INTO. */
  redirectAllowed: boolean;
  paused: boolean;
  activeOverlay?: UnsafeZoneOverlay;
}

@Injectable()
export class UnsafeZoneService {
  @Inject(EVENT_BUS) private readonly eventBus: EventBus;
  private readonly overlays = new Map<string, UnsafeZoneOverlay>();

  /** §12.7 — upsert a time-sensitive overlay with its expiry. */
  async applyOverlay(overlay: UnsafeZoneOverlay): Promise<void> {
    this.overlays.set(overlay.zone, overlay);
    const ev = new EventPulseDomainEvent({
      id: generateId(),
      eventName: "UnsafeZoneChanged",
      aggregateId: overlay.zone,
      timestamp: new Date(),
      version: 1,
      payload: overlay,
    });
    await this.eventBus.publish(ev);
  }

  /**
   * §12.7 — fail-safe redirect guard. Absent fresh overlay data must NOT be
   * treated as "safe" for zones that are actively closed; but for a zone with
   * no active overlay, redirect is allowed. Only actively-overlaid zones are
   * blocked. The "never assume safe" rule applies to zones the system has
   * reason to track — those must carry fresh data to be un-blocked.
   */
  canRedirectInto(zone: string, now: Date = new Date()): RedirectGuardResult {
    const overlay = this.overlays.get(zone);
    if (!overlay) {
      // No active overlay on file — zone is not currently flagged unsafe.
      return { zone, redirectAllowed: true, paused: false };
    }
    const fresh = now <= overlay.validUntil;
    if (!fresh) {
      // Stale overlay => treat as absent but flag pause (never assume safe
      // from stale data).
      this.overlays.delete(zone);
      return {
        zone,
        redirectAllowed: false,
        paused: true,
        activeOverlay: overlay,
      };
    }
    const blocked = overlay.severity === "no_entry";
    return {
      zone,
      redirectAllowed: !blocked,
      paused: false,
      activeOverlay: overlay,
    };
  }
}
