// §26/§25.5 — Operating-mode service. Postgres-down guard: freeze new
// reservations (no G≥2 issuance) but honor held signed tokens.
import { Injectable } from "@nestjs/common";
import { OperatingMode, MODE_MAX_G_LEVEL } from "../domain/operating-mode.enum";
import { GLevel } from "../domain/g-level.enum";

export interface ModeDecision {
  mode: OperatingMode;
  maxGLevel: GLevel;
  canIssueG2Plus: boolean;
  reason: string;
}

const G_INDEX: Record<GLevel, number> = { G5: 5, G3: 3, G2: 2, G1: 1, G0: 0 };

@Injectable()
export class OperatingModeService {
  private _mode: OperatingMode = OperatingMode.NORMAL;

  currentMode(): OperatingMode {
    return this._mode;
  }

  setMode(mode: OperatingMode, reason: string): ModeDecision {
    this._mode = mode;
    const d = this.decide();
    d.reason = `${d.reason} (override: ${reason})`;
    return d;
  }

  /**
   * §26.1 — What commitments may be issued under the current mode.
   * Postgres-down maps to PLATFORM_DEGRADED: freeze new G≥2 but honor held
   * signed tokens (§27.1) — handled by the caller via canIssueG2Plus=false.
   */
  decide(): ModeDecision {
    const maxG = MODE_MAX_G_LEVEL[this._mode] as GLevel;
    const canIssueG2Plus = G_INDEX[maxG] >= 2;
    return {
      mode: this._mode,
      maxGLevel: maxG,
      canIssueG2Plus,
      reason: `mode ${this._mode} caps issuance at ${maxG} (§26.1)`,
    };
  }

  /**
   * §25.5 — Guard used by the saga: reject G≥2 issuance when platform is
   * degraded or Postgres is down.
   */
  canIssue(requested: GLevel): {
    allowed: boolean;
    maxGLevel: GLevel;
    mode: OperatingMode;
  } {
    const d = this.decide();
    const allowed = G_INDEX[requested] <= G_INDEX[d.maxGLevel];
    return { allowed, maxGLevel: d.maxGLevel, mode: d.mode };
  }
}
