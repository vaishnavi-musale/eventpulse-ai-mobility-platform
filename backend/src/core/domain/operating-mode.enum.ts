/** §26 Operating modes. Each constrains what commitments may be issued. */
export enum OperatingMode {
  NORMAL = "NORMAL",
  DEGRADED = "DEGRADED",
  EMERGENCY = "EMERGENCY",
  PLATFORM_DEGRADED = "PLATFORM_DEGRADED",
}

/** §26.1 — Max G-level issuable under an operating mode. */
export const MODE_MAX_G_LEVEL: Readonly<Record<OperatingMode, string>> = {
  NORMAL: "G5",
  DEGRADED: "G2",
  EMERGENCY: "G1",
  PLATFORM_DEGRADED: "G1",
};
