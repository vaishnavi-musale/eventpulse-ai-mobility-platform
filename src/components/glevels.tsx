import { Anchor, Info, Lock, ShieldCheck, Waves, XOctagon, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import type { GLevel } from "@/data/mock";
import { Pill } from "./ui";

export interface GInfo {
  id: GLevel | "NC";
  level: string;
  label: string;
  short: string;
  locked: string;
  conditional: string;
  onFail: string;
  icon: LucideIcon;
  tone: "green" | "cyan" | "amber" | "gray" | "red";
  hex: string;
}

export const G_INFO: GInfo[] = [
  {
    id: "G5",
    level: "G5",
    label: "Fully Verified / Escrowed",
    short: "Every link verified & escrow-funded",
    locked: "Seat + time window locked, compensation prefunded",
    conditional: "Nothing — the contract is closed and escrowed",
    onFail: "Automatic escrow payout + verified rebooking",
    icon: Lock,
    tone: "green",
    hex: "#047857",
  },
  {
    id: "G3",
    level: "G3",
    label: "Guaranteed / Reserved",
    short: "Real capacity locked in your name",
    locked: "Seat + time window reserved with provider",
    conditional: "Nothing — the contract is closed",
    onFail: "Compensation protection + automatic verified rebooking",
    icon: ShieldCheck,
    tone: "green",
    hex: "#059669",
  },
  {
    id: "G2",
    level: "G2",
    label: "Conditional / Bounded",
    short: "Capacity verified, bounded window",
    locked: "Verified capacity + bounded arrival window",
    conditional: "No hard seat lock — provider priority only",
    onFail: "Automatic rerouting to a verified alternative",
    icon: Anchor,
    tone: "cyan",
    hex: "#23877D",
  },
  {
    id: "G1",
    level: "G1",
    label: "Soft Hold / Best Effort",
    short: "AI-monitored recommendation",
    locked: "Only what is publicly available",
    conditional: "Schedules, surge and crowd forecasts",
    onFail: "Live re-planning — no penalty coverage",
    icon: Waves,
    tone: "amber",
    hex: "#b45309",
  },
  {
    id: "G0",
    level: "G0",
    label: "Public Information",
    short: "Published schedules and crowd data",
    locked: "Nothing",
    conditional: "Everything is informational",
    onFail: "No commitment of any kind",
    icon: Info,
    tone: "gray",
    hex: "#64748b",
  },
  {
    id: "NC",
    level: "NO G-LEVEL",
    label: "No Commitment",
    short: "No reliable capacity detected",
    locked: "Nothing — EventPulse never fabricates availability",
    conditional: "All options flagged as unverifiable",
    onFail: "You are protected from false promises",
    icon: XOctagon,
    tone: "red",
    hex: "#dc2626",
  },
];

export const G_TONES: Record<string, { text: string; bg: string; border: string; dot: string; glow: string }> = {
  G5: { text: "text-emerald-800", bg: "bg-emerald-600/15", border: "border-emerald-700/40", dot: "bg-emerald-700", glow: "shadow-[0_4px_20px_rgba(4,120,87,0.15)]" },
  G3: { text: "text-emerald-700", bg: "bg-emerald-600/10", border: "border-emerald-600/30", dot: "bg-emerald-600", glow: "shadow-[0_4px_20px_rgba(5,150,105,0.12)]" },
  G2: { text: "text-teal-700", bg: "bg-teal-600/10", border: "border-teal-600/30", dot: "bg-teal-600", glow: "shadow-[0_4px_20px_rgba(13,148,136,0.12)]" },
  G1: { text: "text-amber-700", bg: "bg-amber-600/10", border: "border-amber-600/30", dot: "bg-amber-600", glow: "shadow-[0_4px_20px_rgba(180,83,9,0.12)]" },
  G0: { text: "text-slate-600", bg: "bg-slate-500/10", border: "border-slate-500/30", dot: "bg-slate-500", glow: "" },
  NC: { text: "text-red-700", bg: "bg-red-600/10", border: "border-red-600/30", dot: "bg-red-600", glow: "shadow-[0_4px_20px_rgba(220,38,38,0.12)]" },
};

export function gTone(level: string | undefined): (typeof G_TONES)["G3"] {
  return G_TONES[level ?? "NC"] ?? G_TONES.NC;
}

/* Compact G-Level badge, e.g. "G3 GUARANTEED" */
export function GBadge({ level, size = "md", showLabel = true }: { level: GLevel; size?: "sm" | "md" | "lg"; showLabel?: boolean }) {
  const t = gTone(level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-display font-bold tracking-wide",
        t.border,
        t.bg,
        t.text,
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3.5 py-1.5 text-sm"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
      {level}
      {showLabel && (
        <span className="opacity-70">
          {level === "G5" ? "FULLY VERIFIED" : level === "G3" ? "GUARANTEED" : level === "G2" ? "CONDITIONAL" : level === "G1" ? "BEST EFFORT" : level === "G0" ? "INFORMATION" : "NONE"}
        </span>
      )}
    </span>
  );
}

/* Full G-Ladder visual component */
export function GLadder({ current, compact, className }: { current?: GLevel | "NC"; compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {G_INFO.map((g) => (
          <div
            key={g.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
              current === g.id ? "bg-white text-wandor-text shadow-sm ring-2" : "border-wandor-text/10 bg-white/60 text-wandor-muted"
            )}
            style={current === g.id ? { borderColor: g.hex, boxShadow: `0 0 0 2px ${g.hex}33` } : undefined}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: current === g.id ? g.hex : "#c9c2b8" }} />
            {g.level}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {G_INFO.map((g, i) => {
        const active = current === g.id;
        return (
          <div
            key={g.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border transition-all duration-300",
              active ? "border-wandor-text/15 bg-white shadow-[0_10px_30px_rgba(23,25,24,0.08)]" : "border-wandor-text/8 bg-white/50",
              !active && i > 2 && "opacity-45"
            )}
          >
            {active && <div className="absolute inset-y-0 left-0 w-1" style={{ background: g.hex, boxShadow: `0 0 18px ${g.hex}` }} />}
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-44 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-wandor-text/10 bg-ink-850" style={{ color: g.hex }}>
                  <g.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-bold text-wandor-text">
                    {g.level}
                    <span className="ml-2 normal-case text-xs font-semibold" style={{ color: g.hex }}>
                      {g.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-wandor-muted">{g.short}</div>
                </div>
              </div>
              <div className="grid flex-1 gap-2 text-[11px] leading-relaxed sm:grid-cols-3 sm:text-xs">
                <div className="rounded-lg bg-wandor-text/[0.04] px-3 py-2">
                  <div className="mb-0.5 font-bold uppercase tracking-wider text-wandor-muted">Locked</div>
                  <div className="text-wandor-text/80">{g.locked}</div>
                </div>
                <div className="rounded-lg bg-wandor-text/[0.04] px-3 py-2">
                  <div className="mb-0.5 font-bold uppercase tracking-wider text-wandor-muted">Conditional</div>
                  <div className="text-wandor-text/80">{g.conditional}</div>
                </div>
                <div className="rounded-lg bg-wandor-text/[0.04] px-3 py-2">
                  <div className="mb-0.5 font-bold uppercase tracking-wider text-wandor-muted">If it fails</div>
                  <div className="text-wandor-text/80">{g.onFail}</div>
                </div>
              </div>
              {active && (
                <Pill tone={g.tone as "green"} className="shrink-0">
                  Your level
                </Pill>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
