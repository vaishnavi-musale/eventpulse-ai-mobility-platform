import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, ArrowRight, Bus, Check, ChevronDown, Clock3, RefreshCw, ShieldCheck, Siren, Sparkles, Wallet } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import { GBadge, GLadder } from "@/components/glevels";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Grade, Page, Pill, StatusPill } from "@/components/ui";
import { cn } from "@/utils/cn";

export default function Disruption() {
  const navigate = useNavigate();
  const { setJourneyPhase, setAlternativeEta, alternativeEta, setMode } = useStore();
  const { notify } = useNotif();
  const [protection, setProtection] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const accept = () => {
    setJourneyPhase("adjusted");
    setAlternativeEta("6:58 PM");
    setMode("DEGRADED");
    notify("refresh", "AI found a verified alternative", "Metro Exit → Express Shuttle E-75 · new ETA 6:58 PM · G5→G2 · escrow fired");
    navigate("/app/journey");
  };

  return (
    <Page className="max-w-4xl">
      {/* alert hero */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[44px] border border-orange-600/30 bg-gradient-to-br from-orange-600/10 via-red-600/[0.04] to-transparent p-7 md:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange-500/15 blur-[80px]" />
        <div className="flex items-start gap-5">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-600/30 bg-orange-600/10"
          >
            <Siren className="h-7 w-7 text-orange-700" />
          </motion.div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-700">⚠ Service Disruption Detected</div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-wandor-text md:text-3xl">Your reserved shuttle is delayed by 18 minutes.</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-wandor-muted">
              Gate A access road congestion. Your G5 commitment is affected — EventPulse re-evaluated 14 dependencies and found a verified alternative. Transparency first: this is what changed and why.
            </p>
          </div>
        </div>
      </motion.div>

      {/* original vs alternative */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <GlassCard className="relative overflow-hidden rounded-[32px] p-5 opacity-90">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-wandor-muted">Original Plan</div>
            <StatusPill status="DELAYED" tone="orange" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-wandor-text/10 bg-white"><Bus className="h-5 w-5 text-wandor-muted" /></div>
            <div>
              <div className="text-sm font-bold text-wandor-text line-through decoration-orange-600/70">Reserved Shuttle S-114</div>
              <div className="text-xs text-wandor-muted">6:35 PM · Gate A access road</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-[12px] text-wandor-muted">
            <div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-wandor-muted" /> New ETA: <b className="text-orange-700">6:55 PM + 18 min = 7:13 PM</b></div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-wandor-muted" /> Arrival target 7:00 PM <b className="text-red-700">MISSED</b></div>
          </div>
        </GlassCard>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="relative overflow-hidden rounded-[32px] border-teal-600/25 bg-teal-600/[0.04] p-5 shadow-[0_14px_40px_rgba(13,148,136,0.1)]" strong>
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-600 to-pulse-500" />
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-teal-700">
                <Sparkles className="h-3.5 w-3.5" /> Alternative Found · Verified
              </div>
              <Pill tone="cyan">auto-selected</Pill>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-600/30 bg-teal-600/10"><RefreshCw className="h-5 w-5 text-teal-700" /></div>
              <div>
                <div className="text-sm font-bold text-wandor-text">Metro Exit → Express Shuttle</div>
                <div className="text-xs text-wandor-muted">E-75 · departs Metro Exit 6:48 PM</div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-[12px] text-wandor-text/80">
              <div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-teal-700" /> New ETA: <b className="font-display text-base font-bold text-wandor-text">{alternativeEta}</b> <span className="text-emerald-700">✓ before 7:00 PM</span> <Grade g="S" /></div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-teal-700" /> Boarding: Metro Exit North · QR verified</div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* downgrade explanation */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-5">
        <GlassCard className="rounded-[32px] p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="text-sm font-bold text-wandor-text">Commitment level update</div>
            <div className="flex items-center gap-2">
              <GBadge level="G5" size="sm" />
              <ArrowRight className="h-4 w-4 text-wandor-muted" />
              <GBadge level="G3" size="sm" />
              <ArrowRight className="h-4 w-4 text-wandor-muted" />
              <GBadge level="G2" size="sm" />
            </div>
            <Pill tone="amber">Downgraded G5 → G2 · escrow fired</Pill>
          </div>
          <div className="mb-4 rounded-2xl border border-wandor-text/8 bg-white p-4 text-[13px] leading-relaxed text-wandor-text/80">
            Your original <b className="text-wandor-text">escrowed arrival window can no longer be maintained</b> — the reserved shuttle physically cannot reach the venue before 7:00 PM. As each link broke, the commitment stepped down honestly: <b className="text-emerald-800">G5 → G3</b> (lost escrow) → <b className="text-teal-700">G2</b> (bounded). EventPulse has automatically found a verified alternative and moved you to a <b className="text-teal-700">G2 bounded commitment</b>: you will arrive by 6:58 PM, inside the bound. If the express shuttle also fails, live re-routing kicks in automatically.
          </div>
          <GLadder current="G2" compact />
          <button
            onClick={() => setEvaluating(!evaluating)}
            className="mt-3 text-[11px] font-semibold text-pulse-600 underline decoration-dotted underline-offset-4 hover:text-pulse-500"
          >
            {evaluating ? "Hide" : "Show"} how the AI evaluated alternatives
          </button>
          <AnimatePresence>
            {evaluating && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-2 overflow-hidden">
                {[
                  "3 alternative chains evaluated in 1.8 seconds",
                  "Express shuttle E-75 had 12 verified free seats — capacity check passed",
                  "Metro corridor confirmed unaffected by Gate A congestion",
                  "Weather risk re-scanned: clear",
                  "Historical match: similar event pattern resolved 9 min faster via this route",
                ].map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[12.5px] text-wandor-muted">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" /> {r}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 flex flex-wrap gap-3">
        <button onClick={accept} className={buttonCls("cyan", "lg", "min-w-56 flex-1")}>
          Accept New Plan — arrive {alternativeEta} <ArrowRight className="h-4 w-4" />
        </button>
        <button onClick={() => navigate("/app/options")} className={buttonCls("subtle", "lg")}>
          View Other Options
        </button>
      </motion.div>

      {/* compensation */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-5">
        <GlassCard className="rounded-[32px] border-emerald-600/20 bg-emerald-600/[0.04] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-600/30 bg-emerald-600/10">
                <Wallet className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <div className="text-sm font-bold text-wandor-text">Because your G5 commitment was affected, escrow has fired.</div>
                <div className="text-xs text-wandor-muted">Full fare refund + ₹200 travel credit · auto-claimed when the alternative completes</div>
              </div>
            </div>
            <button onClick={() => setProtection(!protection)} className={buttonCls("subtle", "sm")}>
              View Protection Details <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", protection && "rotate-180")} />
            </button>
          </div>
          <AnimatePresence>
            {protection && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  {[
                    { t: "Automatic claim", d: "No forms. Verified delivery failure triggers payout in < 24h." },
                    { t: "Prefunded escrow", d: "Compensation sat in escrow since booking — it fires automatically, no claims process." },
                    { t: "Fallback chain", d: "If the alternative also fails: metro-only route + full refund + credit." },
                  ].map((c) => (
                    <div key={c.t} className="rounded-2xl border border-wandor-text/8 bg-white p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                        <AlertOctagon className="h-3 w-3" /> {c.t}
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-wandor-muted">{c.d}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </Page>
  );
}
