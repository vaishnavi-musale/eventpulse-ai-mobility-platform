import { motion } from "framer-motion";
import {
  ArrowRight, BarChart3, CalendarDays, CheckCircle2, Clock,
  Leaf, LockKeyhole, MapPin, Play, Radar, RefreshCw, ShieldAlert, ShieldCheck,
  Sparkles, TrendingUp, Users, Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EVENTS } from "@/data/mock";
import { useStore } from "@/store";
import { GLadder } from "@/components/glevels";
import { Footer, MarketingNav } from "@/components/layout";
import JourneyScroll from "@/components/JourneyScroll";
import { MapView } from "@/components/MapView";
import { buttonCls, LivePill, Pill, Progress } from "@/components/ui";
import { cn } from "@/utils/cn";

const CAPABILITIES = [
  "AI Intent Capture", "Live Capacity Verification", "Commitment G-Ladder", "Escrow-Backed Guarantees",
  "Closed-Loop Monitoring", "Auto Rerouting", "Compensation Engine", "Fulfilment Proof",
];

const STATS = [
  { value: "100K+", label: "ATTENDEES MOVED" },
  { value: "50+", label: "LIVE EVENTS" },
  { value: "99.8%", label: "ROUTE EFFICIENCY" },
  { value: "24/7", label: "EVENT INTELLIGENCE" },
];

function MarqueeCanvas({ items, reverse = false, fast = false, className, ariaHidden = false }: { items: string[]; reverse?: boolean; fast?: boolean; className?: string; ariaHidden?: boolean }) {
  const Row = (
    <div className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex shrink-0 items-center gap-3 pr-8">
          <span className="whitespace-nowrap">{t}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-500/40" />
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn("flex overflow-hidden", className)} aria-hidden={ariaHidden}>
      <div className={cn("flex min-w-full shrink-0 items-center", fast ? "animate-marquee-fast" : "animate-marquee", reverse && "animate-marquee-reverse")}>
        {Row}
        <div aria-hidden="true">{Row}</div>
      </div>
    </div>
  );
}

function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1500;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <>
      {decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-IN")}
      {suffix}
    </>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { setEvent } = useStore();

  const goEvent = (id: string) => {
    const ev = EVENTS.find((e) => e.id === id);
    if (ev) {
      setEvent(ev);
      navigate("/app/intent");
    }
  };

  return (
    <div className="overflow-clip max-w-[100vw]">
      <MarketingNav />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative pt-24 md:pt-28">
        {/* ── Hero background: translucent blobs & integrated stadium visual ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[#F3EFE7]" />
          {/* Large soft sage blob - center-left */}
          <div className="absolute -left-[5%] top-[8%] h-[60%] w-[45%] rounded-full bg-[#DDE5DF]/40 blur-[80px]" />
          {/* Overlapping pale peach blob - center */}
          <div className="absolute left-[20%] top-[25%] h-[45%] w-[35%] rounded-full bg-[rgba(185,104,67,0.10)] blur-[70px]" />
          {/* Sage blob - behind map area right */}
          <div className="absolute right-[8%] top-[5%] h-[55%] w-[40%] rounded-full bg-[#DDE5DF]/35 blur-[70px]" />
          {/* Small peach/terracotta blob - bottom right */}
          <div className="absolute right-[15%] bottom-[10%] h-[35%] w-[30%] rounded-full bg-[rgba(185,104,67,0.08)] blur-[60px]" />

          {/* ═══ CINEMATIC STADIUM/VENUE ENVIRONMENTAL LAYER ═══ */}
          <div className="absolute right-0 bottom-0 top-[22%] lg:top-[10%] w-full lg:w-[64%] xl:w-[58%] z-0 overflow-hidden" aria-hidden="true">
            {/* Organic curved-diagonal mask — clearly not a rectangle */}
            <div
              className="relative h-full w-full"
              style={{
                clipPath: "ellipse(100% 96% at 88% 108%)",
                maskImage: "radial-gradient(110% 120% at 84% 104%, black 32%, rgba(0,0,0,0.82) 58%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(110% 120% at 84% 104%, black 32%, rgba(0,0,0,0.82) 58%, transparent 80%)",
              }}
            >
              <img
                src="/images/hero-venue.jpg"
                alt="Stadium at dusk"
                className="h-full w-full object-cover object-bottom"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />

              {/* Warm amber/terracotta sunset highlights */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#B96843]/22 via-[#C9A66B]/12 to-transparent mix-blend-soft-light" />

              {/* Muted teal / deep-green shadow atmosphere for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171918]/60 via-[#23877D]/10 to-[#2C2F2E]/15 mix-blend-multiply" />

              {/* Left-edge dissolve into warm ivory hero background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#F3EFE7] via-[#F3EFE7]/45 to-transparent" />

              {/* Bottom grounding shade — anchors the scene, keeps crowd visible */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171918]/35 via-transparent to-transparent" />

              {/* Soft cinematic inner vignette */}
              <div className="absolute inset-0" style={{ background: "radial-gradient(120% 120% at 50% 50%, transparent 62%, rgba(23,25,24,0.22) 100%)" }} />
            </div>

            {/* Soft warm terracotta glow along the curved boundary transition */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(90% 85% at 58% 52%, rgba(185,104,67,0.16) 0%, transparent 62%)",
                filter: "blur(28px)",
              }}
            />
          </div>
        </div>

        <div className="relative mx-auto grid max-w-7xl items-start gap-12 px-4 pb-16 pt-6 md:px-8 lg:grid-cols-[0.45fr_0.55fr] lg:gap-8">
          {/* ═══ LEFT COLUMN ═══ */}
          <div className="flex flex-col gap-0">
            {/* Live badge */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 self-start rounded-full bg-[rgba(185,104,67,0.08)] px-3.5 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-600 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-700" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B96843]">ORCHESTRATING LIVE EVENTS RIGHT NOW</span>
            </motion.div>

            {/* H1 headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="mt-6 font-display text-[12vw] font-bold leading-[0.92] tracking-[-0.04em] text-wandor-text sm:text-6xl lg:text-[72px] xl:text-[82px]"
            >
              Don't Just
              <br />
              Predict.
              <br />
              <span className="text-gradient-commit">Commit.</span>
            </motion.h1>

            {/* Description paragraph */}
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="mt-6 max-w-xl text-[15px] leading-relaxed text-wandor-muted md:text-[16px]">
              EventPulse uses <b className="font-semibold text-wandor-text">AI, live capacity verification</b> and <b className="font-semibold text-wandor-text">intelligent orchestration</b> so you reach, experience and leave large events with proof — not promises.
            </motion.p>

            {/* CTA buttons */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/app/discover" className="inline-flex items-center gap-2 rounded-full bg-wandor-dark px-6 py-3 text-[14px] font-semibold text-[#FAF8F3] transition-all hover:-translate-y-0.5 hover:bg-[#232e2c] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-95">
                Explore Events <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/admin/host-event" className="inline-flex items-center gap-2 rounded-full border border-wandor-text/20 px-6 py-3 text-[14px] font-semibold text-wandor-text transition-all hover:bg-wandor-text/5">
                Host Event
              </Link>
            </motion.div>

            {/* Feature chips */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-9 grid grid-cols-2 gap-x-5 gap-y-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3">
              {[
                { icon: Users, label: "Capacity-verified\noffers", tint: "chip-icon-sage" },
                { icon: BarChart3, label: "Transparent\nG-Levels", tint: "chip-icon-terra" },
                { icon: RefreshCw, label: "Closed-loop\nmonitoring", tint: "chip-icon-sage" },
                { icon: Leaf, label: "Sustainable\nevent mobility", tint: "chip-icon-terra" },
              ].map((c) => (
                <span key={c.label.split("\n")[0]} className="flex items-center gap-2.5">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", c.tint)}>
                    <c.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[12px] font-semibold leading-tight text-wandor-muted whitespace-pre-line">{c.label}</span>
                </span>
              ))}
            </motion.div>

            {/* Stat row */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 flex items-center gap-0">
              {STATS.map((s, i) => (
                <div key={s.label} className="flex items-center">
                  {i > 0 && <div className="stat-divider mx-4" />}
                  <div>
                    <div className="font-display text-2xl font-bold tracking-tight text-wandor-text sm:text-3xl">{s.value}</div>
                    <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-wandor-muted">{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Trust badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8">
              <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-wandor-muted">TRUSTED BY LEADING EVENT ORGANIZERS</div>
              <div className="flex items-center gap-5 opacity-40">
                {["bookmyshow", "paytm insider", "DY PATIL", "sunburn", "NEXA", "Lollapalooza"].map((name) => (
                  <span key={name} className="text-[11px] font-bold uppercase tracking-wider text-wandor-muted/80">{name}</span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ═══ RIGHT COLUMN — MAP CARD ═══ */}
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
            {/* Green pulse badge - upper right */}
            <div className="absolute right-[-18px] top-[-20px] z-30 hidden lg:block" aria-hidden="true">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#23877D] shadow-[0_4px_16px_rgba(35,135,125,0.3)]">
                <svg viewBox="0 0 100 100" className="h-6 w-6">
                  <path d="M12 52h18l9-26 14 48 12-22h23" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Handwritten phrase — positioned to the right of the map card */}
            <div className="absolute right-[-28px] top-[20px] z-20 hidden -rotate-3 lg:block" aria-hidden="true">
              <div className="script-italic text-[16px] leading-snug text-wandor-text/60">
                Better Events<br />Brighter Journeys
              </div>
              <div className="mt-1.5 h-0.5 w-10 bg-wandor-text/25" />
            </div>

            {/* Stacked words — positioned well below the script text with clear separation */}
            <div className="absolute right-[-10px] top-[110px] z-20 hidden lg:block" aria-hidden="true">
              <div className="stacked-words text-[11px] font-bold uppercase text-wandor-muted/50">
                <div>SAFER</div>
                <div className="-mt-0.5">SMARTER</div>
                <div className="-mt-0.5">TOGETHER</div>
              </div>
            </div>

            {/* Main map card */}
            <div className="glass-strong relative overflow-hidden rounded-[36px] shadow-[0_12px_48px_rgba(23,25,24,0.1)]">
              <div className="relative h-[380px] overflow-hidden sm:h-[480px] lg:h-[520px]">
                <MapView variant="hero" className="h-full w-full" />

                {/* Overlay: LIVE + Crowd pills */}
                <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                  <LivePill />
                  <Pill tone="cyan"><Users className="h-3 w-3" /> Crowd 48,230</Pill>
                </div>

                {/* Floating callout: 87% Capacity Verified */}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="map-callout absolute left-[8%] top-[18%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#23877D]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#23877D]" />
                  </span>
                  <div>
                    <div className="text-[11px] font-bold text-wandor-text">87% Capacity Verified</div>
                    <div className="text-[10px] text-wandor-muted">Metro Line 1 · Live</div>
                  </div>
                </motion.div>

                {/* Floating callout: Traffic Delay */}
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className="map-callout absolute right-[6%] top-[22%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B96843]/10">
                    <ShieldAlert className="h-4 w-4 text-[#B96843]" />
                  </span>
                  <div>
                    <div className="text-[11px] font-bold text-wandor-text">Traffic Delay Detected</div>
                    <div className="text-[10px] text-wandor-muted">Gate A access road</div>
                  </div>
                </motion.div>

                {/* Floating callout: G5 Commitment Ready */}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }} className="map-callout absolute left-[10%] bottom-[26%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#23877D]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#23877D]" />
                  </span>
                  <div>
                    <div className="text-[11px] font-bold text-wandor-text">G5 Commitment Ready</div>
                    <div className="text-[10px] text-wandor-muted">Seat locked · EP-2026-8F72A</div>
                  </div>
                </motion.div>

                {/* Floating callout: AI Route Optimized */}
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 }} className="map-callout absolute right-[2%] bottom-[32%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#23877D]/10">
                    <RefreshCw className="h-4 w-4 text-[#23877D]" />
                  </span>
                  <div>
                    <div className="text-[11px] font-bold text-wandor-text">AI Route Optimized</div>
                    <div className="text-[10px] text-wandor-muted">ETA -12 min vs average</div>
                  </div>
                </motion.div>

                {/* Floating callout: Mumbai Music Festival */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.15 }} className="map-callout absolute left-[12%] bottom-[8%] z-10 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B96843]/10">
                    <MapPin className="h-4 w-4 text-[#B96843]" />
                  </span>
                  <div>
                    <div className="text-[11px] font-bold text-wandor-text">Mumbai Music Festival 2026</div>
                    <div className="text-[10px] text-wandor-muted">DY Patil Stadium · Sat, Sep 12 · LIVE</div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bottom environmental integration row — replacing old rectangular photo card */}
            <div className="relative z-20 mt-4 flex items-center justify-between px-2 pt-1">
              {/* Left tagline */}
              <div className="flex flex-col text-[10px] font-bold uppercase tracking-[0.2em] text-wandor-muted/80">
                <span>PEOPLE MOVE</span>
                <span className="text-[#B96843]">POSSIBILITIES GROW —</span>
              </div>

              {/* Right Watch How It Works floating capsule */}
              <div className="flex items-center gap-3 rounded-full bg-[#171918]/70 px-4 py-2 backdrop-blur-md border border-white/15 text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all hover:bg-[#171918]/85 hover:scale-[1.02]">
                <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#23877D] text-white shadow-md transition-transform active:scale-95" aria-label="Watch how it works">
                  <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 leading-tight">
                  WATCH<br />HOW IT WORKS
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* capability marquee — bridge into journey */}
        <div className="relative border-b border-wandor-text/6 bg-ink-950/60 py-4 backdrop-blur">
          <MarqueeCanvas items={CAPABILITIES} className="text-[11px] font-bold uppercase tracking-[0.22em] text-wandor-muted" />
        </div>
      </section>

      {/* ═══════════════ THE JOURNEY ═══════════════ */}
      <div className="relative bg-[#F3EFE7]">
        <JourneyScroll />
      </div>

      {/* ═══════════════ ENGINE BENTO ═══════════════ */}
      <section id="engine" className="relative py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-pulse-500/[0.05] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">
                <Radar className="h-4 w-4 animate-softpulse" /> The Orchestration Engine
              </div>
              <h2 className="font-display text-4xl font-bold tracking-tight text-wandor-text md:text-6xl">
                A self-correcting
                <br />
                <span className="text-stroke" style={{ WebkitTextStrokeColor: "rgba(185,104,67,0.5)" }}>loop,</span>{" "}
                <span className="text-gradient">not a pitch.</span>
              </h2>
            </div>
            <div className="max-w-sm text-sm leading-relaxed text-wandor-muted">
              Every journey runs a closed loop of intent → verification → commitment → delivery. No step is skipped, no promise is unverified. Four proof points below.
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-6">
            {/* closed loop */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} className="card-surface relative overflow-hidden rounded-[36px] p-7 lg:col-span-4">
              <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 animate-blob rounded-full bg-pulse-500/10 blur-3xl" aria-hidden="true" />
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-wandor-text">The Closed Loop</div>
                <Pill tone="cyan" className="font-mono normal-case tracking-normal">self-healing · every 30s</Pill>
              </div>
              <div className="relative space-y-0">
                <div className="absolute bottom-4 left-[15px] top-3 w-px border-l-2 border-dashed border-pulse-500/40" />
                {["Intent captured", "Capacity verified live", "G-Level committed", "Delivery & proof"].map((n, i) => (
                  <div key={n} className="relative flex items-center gap-3.5 pb-5 last:pb-0">
                    <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold", i === 0 ? "border-pulse-600/40 bg-pulse-600 text-white" : "border-pulse-500/30 bg-card text-pulse-600")}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-wandor-text">{n}</span>
                    <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-wandor-muted sm:block">
                      {["0.3s", "verified", "escalated above G3", "QR + GPS"][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { icon: Radar, t: "Rechecking dependencies", v: "14 healthy", w: 92 },
                  { icon: RefreshCw, t: "Drift correction", v: "automatic", w: 100 },
                  { icon: Zap, t: "SLA slack this run", v: "+9 min", w: 64 },
                ].map((m) => (
                  <div key={m.t} className="rounded-2xl border border-card-border bg-card/70 p-3">
                    <m.icon className="mb-1.5 h-4 w-4 text-pulse-600" />
                    <div className="text-[11px] font-bold text-wandor-text">{m.t}</div>
                    <div className="font-mono text-[10px] text-wandor-muted">{m.v}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-wandor-text/8">
                      <div className="h-full rounded-full bg-gradient-to-r from-pulse-500 to-pulse-300" style={{ width: `${m.w}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* G-ladder */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: 0.08 }} className="card-surface rounded-[36px] p-7 lg:col-span-2">
              <div className="text-sm font-bold text-wandor-text">One ladder. Zero fake promises.</div>
              <p className="mt-1 text-[12px] text-wandor-muted">Every option discloses exactly what is locked, conditional and what happens when it fails.</p>
              <div className="mt-5">
                <GLadder current="G5" compact />
              </div>
              <button onClick={() => navigate("/app/discover")} type="button" className="mt-5 w-full">
                <span className={buttonCls("ghost", "sm", "w-full")}>See guarantees <ArrowRight className="h-3.5 w-3.5" /></span>
              </button>
            </motion.div>

            {/* delivery rate */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} className="relative overflow-hidden rounded-[36px] bg-wandor-dark p-7 text-[#DDE5DF] lg:col-span-2">
              <div className="pointer-events-none absolute -right-12 -bottom-16 h-44 w-44 rounded-full bg-pulse-500/30 blur-3xl" aria-hidden="true" />
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-pulse-300">Commitment delivery</div>
              <div className="mt-3 font-display text-6xl font-bold tracking-tight text-white">
                <Counter to={98.6} decimals={1} suffix="%" />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div initial={{ width: 0 }} whileInView={{ width: "98.6%" }} viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" />
              </div>
              <div className="mt-3 font-mono text-[11px] text-white/55">of 250K+ indexed journeys landed inside their bound</div>
            </motion.div>

            {/* crowd + weather */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: 0.12 }} className="card-surface rounded-[36px] p-7 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-wandor-muted">
                  <Users className="h-4 w-4 text-live" /> Crowd pulse
                </div>
                <Pill tone="amber">HIGH</Pill>
              </div>
              <div className="mt-3 font-display text-4xl font-bold tracking-tight text-wandor-text">
                <Counter to={48230} />
                <span className="ml-1 text-sm font-semibold text-wandor-muted">attendees</span>
              </div>
              <Progress value={74} tone="cyan" className="mt-4" />
              <div className="mt-5 flex items-center justify-between border-t border-wandor-text/8 pt-4">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-wandor-muted">
                  <Clock className="h-3.5 w-3.5 text-pulse-600" /> Weather · clear, 31°C
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-teal-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600" /> Optimal
                </span>
              </div>
            </motion.div>

            {/* no fake promises */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: 0.16 }} className="card-surface rounded-[36px] p-7 lg:col-span-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-600/25 bg-teal-600/10">
                <LockKeyhole className="h-5 w-5 text-teal-700" />
              </div>
              <div className="mt-4 text-sm font-bold text-wandor-text">What is actually guaranteed?</div>
              <ul className="mt-3 space-y-2.5">
                {[
                  { t: "G5 — seat locked + escrow pre-funded", done: true },
                  { t: "G2 — arrival bound with auto-reroute", done: true },
                  { t: "G1 — honest live re-planning", done: false },
                ].map((r) => (
                  <li key={r.t} className="flex items-start gap-2 text-[12px] leading-relaxed text-wandor-muted">
                    {r.done ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
                    <span>{r.t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════ EVENTS MOSAIC ═══════════════ */}
      <section id="events" className="relative py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-pulse-500/[0.05] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">Live Event Intelligence</div>
              <h2 className="font-display text-4xl font-bold tracking-tight text-wandor-text md:text-6xl">This week, in motion.</h2>
            </div>
            <Link to="/app/discover" className={buttonCls("outline", "md")}>
              View all events <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* masonry board */}
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
            {EVENTS.slice(0, 6).map((ev, i) => (
              <motion.button
                key={ev.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                onClick={() => goEvent(ev.id)}
                type="button"
                className={cn(
                  "group relative block w-full overflow-hidden rounded-[32px] text-left break-inside-avoid card-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pulse-600",
                  i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-[4/5]" : "aspect-square",
                )}
              >
                <img
                  src={ev.poster}
                  alt={ev.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-wandor-dark/85 via-wandor-dark/20 to-transparent transition-opacity duration-500" />
                <div className="grain absolute inset-0 opacity-[0.06]" />
                <div className="absolute left-3 top-3">
                  <LivePill label={ev.status === "Live" ? "LIVE" : ev.status === "High Demand" ? "HOT" : "UPCOMING"} />
                </div>
                <div className="absolute right-3 top-3 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-bold text-wandor-text shadow-sm backdrop-blur">
                  <Users className="mr-1 inline h-3 w-3 text-teal-700" />
                  {ev.crowd.toLocaleString()}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-pulse-300">
                    <Sparkles className="h-3 w-3" /> {ev.category}
                  </div>
                  <h3 className="font-display text-xl font-bold leading-tight text-white">{ev.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-white/75">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-pulse-300" /> {ev.date}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-pulse-300" /> {ev.venue}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <ev.icon className="h-4 w-4 text-white/85" />
                    <span className="text-[11px] font-bold text-white">{ev.price}</span>
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-card text-xs font-bold text-wandor-dark px-3 py-1.5 transition-transform group-hover:translate-x-0.5">
                      Plan <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ DARK STATS RAIL ═══════════════ */}
      <div className="h-20 bg-gradient-to-b from-ink-950 to-wandor-dark" aria-hidden="true" />
      <section className="relative overflow-hidden bg-wandor-dark py-24 text-[#DDE5DF] md:py-32">
        <div className="grid-overlay pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-pulse-500/25 blur-[120px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-live/25 blur-[120px]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 text-center md:grid-cols-4 md:px-8">
          {[
            { v: <Counter to={250} suffix="K+" />, l: "Journeys orchestrated" },
            { v: <Counter to={98.6} suffix="%" decimals={1} />, l: "Delivery rate" },
            { v: <><Counter to={4.8} decimals={1} />★</>, l: "Traveler rating" },
            { v: <Counter to={62} />, l: "Venues covered" },
          ].map((s) => (
            <div key={s.l} className="group">
              <div className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl transition-transform duration-300 group-hover:scale-105">{s.v}</div>
              <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-300">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="relative mt-10 flex justify-center">
          <MarqueeCanvas items={["measurable", "transparent", "escrowed", "provable", "human"]} reverse ariaHidden className="w-full max-w-3xl px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40" />
        </div>
      </section>

      {/* ═══════════════ QUOTE SPLAT ═══════════════ */}
      <div className="h-20 bg-gradient-to-b from-wandor-dark to-ink-950" aria-hidden="true" />
      <section className="relative py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <div className="font-type text-2xl leading-snug text-wandor-text md:text-3xl">
            "The difference between a <span className="text-pulse-600 line-through decoration-wandor-muted/60">prediction</span> and a{" "}
            <span className="text-gradient font-bold">commitment</span> is only the receivable part — EventPulse makes it receivable."
          </div>
          <div className="mt-6 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-wandor-muted">
            <span className="h-px w-8 bg-wandor-text/20" /> Editor's note · 2026 <span className="h-px w-8 bg-wandor-text/20" />
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="relative overflow-hidden rounded-[48px] bg-wandor-dark px-6 py-16 text-center md:px-16 md:py-20">
            <div className="grid-overlay pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
            <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[620px] -translate-x-1/2 rounded-full bg-pulse-500/30 blur-[110px]" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-live/25 blur-[100px]" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-pulse-400/25 blur-[100px]" aria-hidden="true" />
            <div className="grain pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true" />

            <div className="relative">
              <div className="mb-5 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-pulse-300">
                <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative h-2 w-2 rounded-full bg-emerald-400" /></span>
                Escrow is live · compensation auto-armed
              </div>
              <h2 className="mx-auto max-w-2xl font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
                Reach the event.
                <br />
                <span className="text-gradient-on-dark">Guaranteed.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/65 md:text-base">
                Join EventPulse and never wonder again which plan you can trust. Your next commitment comes with proof — a bound, a receipt and a pre-funded escape hatch.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link to="/app/discover" className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-bold text-wandor-dark transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(240,237,230,0.2)]">
                  Explore Events <TrendingUp className="h-4 w-4" />
                </Link>
                <Link to="/admin/organizer" className={buttonCls("cyan", "lg")}>
                  Organizer Command Center
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12px] font-semibold text-white/55">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Escrow on every G5</span>
                <span className="flex items-center gap-2"><Radar className="h-4 w-4 text-teal-400" /> Monitored live</span>
                <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-pulse-300" /> Auto-rerouted on drift</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}