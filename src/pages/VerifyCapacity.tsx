import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2, RefreshCcw, ShieldCheck, ShieldX, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VERIFY_STEPS } from "@/data/mock";
import { useStore } from "@/store";
import { GBadge } from "@/components/glevels";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Grade, Page, Ring } from "@/components/ui";
import { cn } from "@/utils/cn";

export default function VerifyCapacity() {
  const navigate = useNavigate();
  const { option } = useStore();
  const { notify } = useNotif();
  const [stage, setStage] = useState<"running" | "done" | "unavailable">("running");
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (stage !== "running") return;
    setStep(0);
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= VERIFY_STEPS.length) {
          clearInterval(id);
          setStage("done");
          notify("success", "Capacity verified", `${option.name} cleared all 6 live checks. G5 is honestly available.`);
          return s;
        }
        return s + 1;
      });
    }, 750);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const progress = Math.min(100, (step / VERIFY_STEPS.length) * 100);

  return (
    <Page className="max-w-5xl">
      <div className="mb-8 text-center">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">Step 4 · Real-Capacity Check</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-wandor-text md:text-4xl">Verifying Real Capacity</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-wandor-muted">
          {option.name} — EventPulse queries providers, routes and systems live. Nothing is displayed as available unless it is.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {stage === "running" && (
          <motion.div key="run" exit={{ opacity: 0, scale: 0.97 }} className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
            <div className="mx-auto">
              <Ring value={progress} size={170} stroke={10} color="#B96843">
                <div className="text-center">
                  <div className="font-display text-4xl font-bold text-wandor-text">{Math.round(progress)}%</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">verifying</div>
                </div>
              </Ring>
            </div>
            <GlassCard className="rounded-[28px] p-2" strong>
              {VERIFY_STEPS.map((s, i) => {
                const state = i < step ? "done" : i === step ? "active" : "wait";
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: state === "wait" ? 0.45 : 1, x: 0 }}
                    transition={{ delay: 0.05 }}
                    className="flex items-center gap-4 border-b border-wandor-text/5 px-5 py-3.5 last:border-0"
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300", state === "done" ? "border-emerald-600/30 bg-emerald-600/10" : state === "active" ? "border-pulse-600/40 bg-pulse-600/10 shadow-[0_0_14px_rgba(144,88,49,0.2)]" : "border-wandor-text/10 bg-white")}>
                      {state === "done" ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="h-5 w-5 text-emerald-600" /></motion.span>
                      ) : state === "active" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-pulse-600" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-wandor-text/20" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={cn("text-[13px] font-bold", state === "wait" ? "text-wandor-muted" : "text-wandor-text")}>{s.label}</div>
                      <div className="text-[11px] text-wandor-muted">{state === "done" ? s.result : s.detail}</div>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted/70">{i + 1}/6</div>
                    {state === "done" && <Grade g="S" className="ml-1" />}
                  </motion.div>
                );
              })}
            </GlassCard>
          </motion.div>
        )}

        {stage === "done" && (
          <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
            <GlassCard className="relative overflow-hidden rounded-[44px] p-10 text-center" strong>
              <div className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-56 w-96 rounded-full bg-emerald-500/15 blur-[90px]" />
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-600/30 bg-emerald-600/10"
              >
                <Check className="h-12 w-12 text-emerald-600" strokeWidth={3} />
                <span className="absolute inset-0 animate-ping rounded-full border border-emerald-500/30" style={{ animationDuration: "2s" }} />
              </motion.div>
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-700">Capacity Verified</div>
              <h2 className="mt-2 font-display text-3xl font-bold text-wandor-text">EventPulse can safely support this request.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-wandor-muted">
                All 6 checks passed for <b className="text-wandor-text">{option.name}</b>. Provider slot, route, weather and delivery channel are locked in your favor.
              </p>
              <div className="mt-7 flex flex-col items-center gap-2">
                <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Highest Available Commitment</div>
                <div className="flex items-center gap-2">
                  <GBadge level={option.gLevel} size="lg" />
                  <Grade g="S" />
                </div>
                <div className="mt-1 text-[11px] text-wandor-muted">Seat S-114 reserved for you with Pulse Shuttle Co.</div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button onClick={() => navigate("/app/offer")} className={buttonCls("primary", "lg")}>
                  Continue to Offer <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => navigate("/app/options")} className={buttonCls("subtle", "lg")}>
                  <RefreshCcw className="h-4 w-4" /> Compare again
                </button>
              </div>
              <button onClick={() => setStage("unavailable")} className="mt-6 text-[11px] font-semibold text-wandor-muted underline decoration-dotted underline-offset-4 hover:text-wandor-text">
                Demo: simulate capacity unavailable
              </button>
            </GlassCard>
          </motion.div>
        )}

        {stage === "unavailable" && (
          <motion.div key="un" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
            <GlassCard className="relative overflow-hidden rounded-[44px] p-10 text-center" strong>
              <div className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-56 w-96 rounded-full bg-orange-500/15 blur-[90px]" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
                className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-orange-600/30 bg-orange-600/10"
              >
                <ShieldX className="h-12 w-12 text-orange-700" strokeWidth={2} />
              </motion.div>
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-orange-700">Primary option unavailable</div>
              <h2 className="mt-2 font-display text-3xl font-bold text-wandor-text">Seat S-114 was just taken by another traveler.</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-wandor-muted">
                EventPulse checked its dependency graph instantly. We will not sell you a seat that no longer exists — but we found alternatives that were verified minutes ago.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button onClick={() => navigate("/app/options")} className={buttonCls("amber", "lg")}>
                  View 3 Verified Alternatives <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => setStage("running")} className={buttonCls("subtle", "lg")}>
                  <Wrench className="h-4 w-4" /> Re-check capacity
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] font-semibold text-wandor-muted">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> No fake availability — ever</span>
                <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-pulse-600" /> Dependency graph re-evaluated in 1.8s</span>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
