// §23 — UncertainValue + §6/§26 G-Ladder & mode coupling unit tests
import { createUncertainValue } from "../common/uncertain-value";
import {
  G_LADDER_ORDER,
  G_LADDER_INDEX,
  degradesGLevel,
  requiresVerifiedInventory,
} from "../domain/g-level.enum";
import { OperatingMode, MODE_MAX_G_LEVEL } from "../domain/operating-mode.enum";

describe("Domain contracts (§4.2/§6/§23/§26)", () => {
  it("G-ladder orders and indexes as specified (§6)", () => {
    expect(G_LADDER_ORDER).toEqual(["G5", "G3", "G2", "G1", "G0"]);
    expect(G_LADDER_INDEX.G5).toBe(0);
    expect(G_LADDER_INDEX.G0).toBe(4);
  });

  it("degradesGLevel follows the ladder (downgrade only)", () => {
    expect(degradesGLevel("G5", "G2")).toBe(true);
    expect(degradesGLevel("G5", "G5")).toBe(true);
    // upgrade is not a degradation
    expect(degradesGLevel("G2", "G5")).toBe(false);
  });

  it("only G5/G3 require verified inventory (§6.3)", () => {
    expect(requiresVerifiedInventory("G5")).toBe(true);
    expect(requiresVerifiedInventory("G3")).toBe(true);
    expect(requiresVerifiedInventory("G2")).toBe(false);
    expect(requiresVerifiedInventory("G1")).toBe(false);
    expect(requiresVerifiedInventory("G0")).toBe(false);
  });

  it("mode caps issuance per §26.1", () => {
    expect(MODE_MAX_G_LEVEL[OperatingMode.NORMAL]).toBe("G5");
    expect(MODE_MAX_G_LEVEL[OperatingMode.DEGRADED]).toBe("G2");
    expect(MODE_MAX_G_LEVEL[OperatingMode.EMERGENCY]).toBe("G1");
    expect(MODE_MAX_G_LEVEL[OperatingMode.PLATFORM_DEGRADED]).toBe("G1");
  });

  it("constructs an UncertainValue with CI + calibration rating (§23)", () => {
    const uv = createUncertainValue(100, 90, 110, 0.9, "calibrated");
    expect(uv.value).toBe(100);
    expect(uv.ciLower).toBe(90);
    expect(uv.ciUpper).toBe(110);
    expect(uv.confidenceLevel).toBe(0.9);
    expect(uv.calibrationRating).toBe("calibrated");
  });
});
