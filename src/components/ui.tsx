import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/utils/cn";

/* ---------------- Buttons (Wandor pill style) ---------------- */

export type BtnVariant = "primary" | "ghost" | "outline" | "success" | "amber" | "danger" | "cyan" | "subtle";
export type BtnSize = "sm" | "md" | "lg";

export function buttonCls(variant: BtnVariant = "primary", size: BtnSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 cursor-pointer select-none whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-600",
    size === "sm" && "h-8 px-4 text-xs",
    size === "md" && "h-10 px-5 text-sm",
    size === "lg" && "h-12 px-7 text-[15px]",
    variant === "primary" && "bg-wandor-dark text-[#FAF8F3] hover:bg-[#232e2c] shadow-[0_2px_10px_rgba(0,0,0,0.14)]",
    variant === "cyan" && "bg-wandor-prompt text-white hover:bg-pulse-600 shadow-[0_2px_12px_rgba(144,88,49,0.3)]",
    variant === "ghost" && "text-wandor-muted hover:text-wandor-text hover:bg-wandor-text/5",
    variant === "subtle" && "bg-wandor-text/[0.05] text-wandor-text hover:bg-wandor-text/10 border border-wandor-text/10",
    variant === "outline" && "border border-wandor-text/25 text-wandor-text hover:bg-wandor-text/5",
    variant === "success" && "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_2px_10px_rgba(5,150,105,0.25)]",
    variant === "amber" && "bg-amber-400 text-wandor-dark hover:bg-amber-300 shadow-[0_2px_10px_rgba(245,158,11,0.25)]",
    variant === "danger" && "bg-red-600 text-white hover:bg-red-500 shadow-[0_2px_10px_rgba(220,38,38,0.25)]",
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <button className={buttonCls(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

/* ---------------- Cards ---------------- */

export function GlassCard({ className, children, strong }: { className?: string; children: ReactNode; strong?: boolean }) {
  return <div className={cn(strong ? "glass-strong" : "glass", "rounded-2xl", className)}>{children}</div>;
}

/* ---------------- Pills & badges ---------------- */

export type Tone = "green" | "cyan" | "amber" | "orange" | "red" | "gray" | "blue" | "violet";

const TONE_TXT: Record<Tone, string> = {
  green: "text-emerald-700",
  cyan: "text-teal-700",
  amber: "text-amber-700",
  orange: "text-orange-700",
  red: "text-red-700",
  gray: "text-slate-500",
  blue: "text-pulse-600",
  violet: "text-violet-700",
};
const TONE_BG: Record<Tone, string> = {
  green: "bg-emerald-600/10 border-emerald-600/25",
  cyan: "bg-teal-600/10 border-teal-600/25",
  amber: "bg-amber-600/10 border-amber-600/25",
  orange: "bg-orange-600/10 border-orange-600/25",
  red: "bg-red-600/10 border-red-600/25",
  gray: "bg-slate-500/10 border-slate-500/25",
  blue: "bg-pulse-600/10 border-pulse-600/25",
  violet: "bg-violet-600/10 border-violet-600/25",
};
const TONE_DOT: Record<Tone, string> = {
  green: "bg-emerald-600",
  cyan: "bg-teal-600",
  amber: "bg-amber-600",
  orange: "bg-orange-600",
  red: "bg-red-600",
  gray: "bg-slate-500",
  blue: "bg-pulse-600",
  violet: "bg-violet-600",
};

export function Pill({ tone = "gray", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", TONE_TXT[tone], TONE_BG[tone], className)}>
      {children}
    </span>
  );
}

export function LivePill({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-600/30 bg-red-600/10 px-2.5 py-0.5 text-[11px] font-bold tracking-widest text-red-700">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
      </span>
      {label}
    </span>
  );
}

export function StatusDot({ tone = "green", pulse = true }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", TONE_DOT[tone])} />}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", TONE_DOT[tone])} />
    </span>
  );
}

export function StatusPill({ status, tone }: { status: string; tone?: Tone }) {
  const t: Tone = tone ?? (status === "FULFILLED" ? "green" : status === "ACTIVE" || status === "LIVE" ? "green" : status === "FAILED" ? "red" : status === "DELAYED" || status === "DISRUPTED" ? "orange" : status === "CANCELLED" ? "gray" : "cyan");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider", TONE_BG[t], TONE_TXT[t])}>
      <StatusDot tone={t} />
      {status}
    </span>
  );
}

/* ---------------- Progress & rings ---------------- */

export function Progress({ value, tone = "blue", className }: { value: number; tone?: Tone; className?: string }) {
  const color: Record<Tone, string> = {
    green: "bg-emerald-500",
    cyan: "bg-teal-600",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    gray: "bg-slate-400",
    blue: "bg-pulse-500",
    violet: "bg-violet-500",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-wandor-text/10", className)}>
      <motion.div
        className={cn("h-full rounded-full", color[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </div>
  );
}

export function Ring({ value, size = 92, stroke = 7, color = "#B96843", track = "rgba(23,25,24,0.08)", children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * Math.min(100, value)) / 100 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------------- Stat & headings ---------------- */

export function Stat({ label, value, sub, tone = "blue" }: { label: string; value: ReactNode; sub?: string; tone?: Tone }) {
  return (
    <div className="card-surface rounded-2xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-wandor-muted">{label}</div>
      <div className={cn("mt-1.5 font-display text-2xl font-bold", TONE_TXT[tone])}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-wandor-muted">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ kicker, title, desc, center }: { kicker?: string; title: ReactNode; desc?: string; center?: boolean }) {
  return (
    <div className={cn("mb-8", center && "text-center")}>
      {kicker && <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">{kicker}</div>}
      <h2 className="font-display text-3xl font-bold tracking-tight text-wandor-text md:text-4xl">{title}</h2>
      {desc && <p className={cn("mt-3 max-w-2xl text-sm leading-relaxed text-wandor-muted md:text-base", center && "mx-auto")}>{desc}</p>}
    </div>
  );
}

/* ---------------- Page transition wrapper ---------------- */

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8", className)}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Tooltip ---------------- */

export function Tip({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <span className="cursor-help underline decoration-dotted decoration-wandor-text/40 underline-offset-4">{label}</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-64 -translate-x-1/2 rounded-2xl border border-card-border bg-card p-3 text-xs leading-relaxed text-wandor-muted opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100">
        {children}
      </span>
    </span>
  );
}

/* ---------------- Skeletons / empty ---------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-xl", className)} />;
}

export function EmptyState({ icon: Icon, title, desc, action }: { icon: LucideIcon; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="glass flex flex-col items-center rounded-2xl px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pulse-600/10">
        <Icon className="h-7 w-7 text-pulse-600" />
      </div>
      <h3 className="font-display text-lg font-bold text-wandor-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-wandor-muted">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------- Claim grades (P / S / A / F / L) ---------------- */

export type ClaimGrade = "P" | "S" | "A" | "F" | "L";

const GRADE_META: Record<ClaimGrade, { label: string; desc: string; txt: string; bg: string }> = {
  P: { label: "PROVEN", desc: "Backed by recorded outcome data", txt: "text-emerald-800", bg: "bg-emerald-600/12 border-emerald-700/30" },
  S: { label: "SIMULATED", desc: "From the V2.1 demo simulation", txt: "text-pulse-600", bg: "bg-pulse-600/10 border-pulse-600/25" },
  A: { label: "ASSUMED", desc: "Research assumption — explicitly labeled", txt: "text-amber-700", bg: "bg-amber-600/12 border-amber-700/30" },
  F: { label: "FIELD-VALIDATED", desc: "Validated in a pilot deployment", txt: "text-teal-700", bg: "bg-teal-600/12 border-teal-700/30" },
  L: { label: "LEGAL", desc: "Legally unverified for this market", txt: "text-violet-700", bg: "bg-violet-600/12 border-violet-700/30" },
};

export function Grade({ g, className }: { g: ClaimGrade; className?: string }) {
  const m = GRADE_META[g];
  return (
    <Tip label={<span className={cn("inline-flex cursor-help items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest", m.bg, m.txt, className)}>{g}</span>}>
      <b>{g} — {m.label}.</b>
      <br />
      {m.desc} (claim-grade classification, EventPulse V2 §30).
    </Tip>
  );
}

/* ---------------- QR placeholder ---------------- */

export function QRBlock({ seed = "EP", size = 128, className }: { seed?: string; size?: number; className?: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const n = 13;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    const v = (h ^ (i * 2654435761)) % 7;
    cells.push(i % 17 === 0 || v < 3);
  }
  const cell = size / n;
  return (
    <div className={cn("rounded-xl border border-card-border bg-card p-2.5 shadow-sm", className)} style={{ width: size + 20, height: size + 20 }}>
      <div className="grid" style={{ width: size, height: size, gridTemplateColumns: `repeat(${n}, ${cell}px)` }}>
        {cells.map((on, i) => (
          <div key={i} style={{ width: cell, height: cell }} className={on ? "bg-wandor-text" : "bg-transparent"} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Misc ---------------- */

export function IconChip({ icon: Icon, tone = "blue", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", TONE_BG[tone], TONE_TXT[tone], className)}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function GlowDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-gradient-to-r from-transparent via-pulse-500/30 to-transparent", className)} />;
}

export function styleVar(v: Record<string, string>): CSSProperties {
  return v as CSSProperties;
}
