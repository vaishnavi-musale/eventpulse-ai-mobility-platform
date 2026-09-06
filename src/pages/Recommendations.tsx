import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Brain, Check, ChevronDown, Clock3, IndianRupee, Info, Lightbulb, Route, ShieldCheck, Sparkles, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OPTIONS, type Option } from "@/data/mock";
import { useStore } from "@/store";
import { GBadge } from "@/components/glevels";
import { MapView } from "@/components/MapView";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Page, Pill, Progress, Skeleton } from "@/components/ui";
import { cn } from "@/utils/cn";

function OptionCard({ o, selected, onSelect, onContinue }: { o: Option; selected: boolean; onSelect: () => void; onContinue: () => void }) {
  const [open, setOpen] = useState(false);
  const capacityTone = o.capacity === "Verified" ? "green" : o.capacity === "Limited" ? "cyan" : "amber";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass relative overflow-hidden rounded-[32px] p-5 transition-all duration-300",
        selected ? "border-pulse-600/40 shadow-[0_14px_40px_rgba(144,88,49,0.14)]" : "hover:border-wandor-text/20"
      )}
    >
      {selected && <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-pulse-500 to-pulse-300" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold", o.rank === 1 ? "bg-wandor-dark text-white shadow-sm" : "bg-wandor-text/8 text-wandor-muted")}>
            {o.rank}
          </span>
          <div>
            <div className="text-[15px] font-bold text-wandor-text">{o.name}</div>
            <div className="text-[11px] text-wandor-muted">{o.mode}</div>
          </div>
          {o.rank === 1 && (
            <Pill tone="blue" className="ml-1">
              <Sparkles className="h-3 w-3" /> Recommended
            </Pill>
          )}
        </div>
        <GBadge level={o.gLevel} size="sm" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-wandor-text/8 bg-white px-3 py-2.5">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-wandor-muted"><Clock3 className="h-3 w-3" /> ETA</div>
          <div className="mt-0.5 font-display text-lg font-bold text-wandor-text">{o.eta}</div>
        </div>
        <div className="rounded-2xl border border-wandor-text/8 bg-white px-3 py-2.5">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-wandor-muted"><IndianRupee className="h-3 w-3" /> Price</div>
          <div className="mt-0.5 font-display text-lg font-bold text-wandor-text">{o.price}</div>
          <div className="text-[9px] text-wandor-muted">{o.priceNote}</div>
        </div>
        <div className="rounded-2xl border border-wandor-text/8 bg-white px-3 py-2.5">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-wandor-muted"><TrendingDown className="h-3 w-3" /> Congestion</div>
          <div className={cn("mt-0.5 font-display text-sm font-bold", o.congestion === "Low" ? "text-emerald-700" : o.congestion === "Moderate" ? "text-amber-700" : "text-red-700")}>{o.congestion}</div>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pill tone={capacityTone as "green"}>{o.capacity} capacity</Pill>
          <span className="text-[11px] text-wandor-muted">confidence</span>
        </div>
        <div className="flex w-28 items-center gap-2">
          <Progress value={o.confidence} tone={o.confidence >= 90 ? "green" : o.confidence >= 80 ? "cyan" : "amber"} className="flex-1" />
          <span className="font-display text-xs font-bold text-wandor-text">{o.confidence}%</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-pulse-600 hover:text-pulse-500">
          {o.rank === 1 ? "Why this recommendation?" : "Show journey details"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 rounded-2xl border border-teal-600/20 bg-teal-600/[0.05] p-4">
              <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-teal-700">
                <Brain className="h-3.5 w-3.5" /> AI Reasoning — transparent
              </div>
              <ul className="space-y-2">
                {o.reasoning.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-wandor-text/80">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" /> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3 rounded-2xl border border-wandor-text/8 bg-white p-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Journey steps</div>
              <div className="flex flex-wrap items-center gap-2">
                {o.steps.map((s, i) => (
                  <span key={s} className="flex items-center gap-2 text-[12px] font-semibold text-wandor-text/80">
                    <span className="rounded-xl border border-wandor-text/10 bg-ink-850 px-2.5 py-1.5">{s}</span>
                    {i < o.steps.length - 1 && <ArrowRight className="h-3 w-3 text-wandor-muted/60" />}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex gap-2">
        <button onClick={onSelect} className={cn(buttonCls("subtle", "md"), "flex-1")}>
          {selected ? <><Check className="h-4 w-4 text-emerald-600" /> Selected</> : "Select"}
        </button>
        <button onClick={onContinue} className={buttonCls(o.rank === 1 ? "primary" : "outline", "md", "flex-1")}>
          Verify Capacity <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default function Recommendations() {
  const navigate = useNavigate();
  const { option, setOption, intent, event } = useStore();
  const { notify } = useNotif();
  const [selected, setSelected] = useState<string>(option.id);
  const [loading, setLoading] = useState(true);
  const [showExplain, setShowExplain] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  const sel = OPTIONS.find((o) => o.id === selected) ?? OPTIONS[0];

  const verify = (o: Option) => {
    setOption(o);
    notify("info", "Option selected", `${o.name} queued for real-capacity verification.`);
    navigate("/app/verify");
  };

  return (
    <Page>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">
            <Sparkles className="h-3.5 w-3.5" /> Step 3 · Smart Recommendations
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-wandor-text md:text-4xl">AI has analyzed your request</h1>
          <p className="mt-2 max-w-2xl text-sm text-wandor-muted">
            Recommendations are ranked by feasibility, travel time, cost and verified capacity — for {event.name} at {intent.destination}, arriving by <b className="text-wandor-text">{intent.arrival}</b>.
          </p>
        </div>
        <button onClick={() => setShowExplain(!showExplain)} className={buttonCls("subtle", "sm")}>
          <Info className="h-3.5 w-3.5" /> Ranking methodology
        </button>
      </div>

      {showExplain && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[24px] px-5 py-3.5 text-[12px] font-semibold text-wandor-muted">
          <span><b className="text-emerald-700">Feasibility</b> — verified capacity first</span>
          <span><b className="text-teal-700">Travel time</b> — arrival before deadline</span>
          <span><b className="text-pulse-600">Cost</b> — within your budget profile</span>
          <span><b className="text-amber-700">Congestion</b> — live + historical models</span>
          <span className="text-wandor-muted/70">No option is ever ranked above its honest G-Level.</span>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* map */}
        <GlassCard className="relative h-[420px] overflow-hidden rounded-[32px] p-0 lg:sticky lg:top-24 lg:h-auto lg:min-h-[560px]" strong>
          <MapView variant="route" className="h-full min-h-[420px]" />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
            <div className="glass-strong rounded-2xl px-3 py-2 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Selected route</div>
              <div className="text-xs font-bold text-wandor-text">{sel.name}</div>
            </div>
            <div className="glass-strong rounded-2xl px-3 py-2 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-700">Live ETA</div>
              <div className="font-display text-lg font-bold text-wandor-text">{sel.eta}</div>
            </div>
          </div>
          <div className="absolute bottom-3 right-3 rounded-full border border-wandor-text/10 bg-white/90 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted shadow-sm backdrop-blur">
            Gate A · Metro Station B → Shuttle Hub
          </div>
        </GlassCard>

        {/* options */}
        <div className="flex flex-col gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <GlassCard key={i} className="space-y-3 p-5">
                <div className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-6 w-1/2" /></div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-full" />
              </GlassCard>
            ))
          ) : (
            <>
              {OPTIONS.map((o) => (
                <OptionCard key={o.id} o={o} selected={selected === o.id} onSelect={() => setSelected(o.id)} onContinue={() => verify(o)} />
              ))}
              <GlassCard className="flex items-center gap-3 border-emerald-600/20 bg-emerald-600/[0.04] p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-[12.5px] leading-relaxed text-wandor-text/80">
                  <b className="text-wandor-text">Honest by design:</b> only options that pass live capacity checks can reach G3. Everything else is shown at its true level — never inflated.
                </p>
                <Route className="ml-auto hidden h-4 w-4 shrink-0 text-emerald-600/50 sm:block" />
              </GlassCard>
              <button onClick={() => verify(sel)} className={buttonCls("primary", "lg", "w-full")}>
                <Lightbulb className="h-4 w-4" /> Verify capacity for "{sel.name}"
              </button>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
