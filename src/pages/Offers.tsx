import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Check, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GLevel } from "@/data/mock";
import { useStore } from "@/store";
import { GBadge, gTone } from "@/components/glevels";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Page, Tip } from "@/components/ui";
import { cn } from "@/utils/cn";

interface Offer {
  level: GLevel;
  name: string;
  price: string;
  features: { ok: boolean; text: string }[];
  note: string;
  tag?: string;
}

const OFFERS: Offer[] = [
  {
    level: "G5",
    name: "Reserved Shuttle",
    price: "₹120",
    tag: "Best for your arrival deadline",
    features: [
      { ok: true, text: "Seat Reserved" },
      { ok: true, text: "Fixed Departure Window" },
      { ok: true, text: "Escrow-Funded Compensation" },
      { ok: true, text: "Priority Support" },
    ],
    note: "Locked with provider · cancellation protection included",
  },
  {
    level: "G2",
    name: "Priority Shuttle",
    price: "₹90",
    features: [
      { ok: true, text: "Capacity Expected" },
      { ok: true, text: "Bounded Arrival Window" },
      { ok: true, text: "Automatic Rerouting" },
      { ok: false, text: "Hard Seat Lock" },
    ],
    note: "Verified boarding priority · arrival bounded ±15 min",
  },
  {
    level: "G1",
    name: "Public Transit Route",
    price: "₹50",
    features: [
      { ok: true, text: "AI Recommended" },
      { ok: true, text: "Live Monitoring" },
      { ok: false, text: "No Reserved Capacity" },
      { ok: false, text: "Compensation Coverage" },
    ],
    note: "Best-effort route · monitored, not guaranteed",
  },
];

export default function Offers() {
  const navigate = useNavigate();
  const { setCommitmentLevel, intent } = useStore();
  const { notify } = useNotif();

  const select = (o: Offer) => {
    setCommitmentLevel(o.level);
    notify(
      o.level === "G5" ? "success" : o.level === "G2" ? "info" : "warn",
      `${o.level} commitment created`,
      o.level === "G5"
        ? "Capacity locked with provider + escrow funded. Your arrival is now a commitment, not a wish."
        : o.level === "G2"
          ? "Bounded commitment active — automatic rerouting if the window is at risk."
          : "Soft hold active — EventPulse will monitor and re-plan live."
    );
    navigate("/app/confirm");
  };

  return (
    <Page>
      <div className="mb-8 text-center">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">Step 5 · Offer Selection</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-wandor-text md:text-4xl">Choose Your Commitment</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-wandor-muted">
          Same destination, three honest commitment levels for {intent.destination}. Pick the guarantee you want — not the one you hope for.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {OFFERS.map((o, i) => {
          const t = gTone(o.level);
          const featured = o.level === "G5";
          return (
            <motion.div
              key={o.level}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={cn("relative", featured && "lg:-my-3")}
            >
              {o.tag && (
                <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-wandor-dark px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#fafafa] shadow-[0_4px_14px_rgba(0,0,0,0.2)]">
                    <BadgeCheck className="h-3.5 w-3.5" /> {o.tag}
                  </span>
                </div>
              )}
              <GlassCard
                strong={featured}
                className={cn(
                  "flex h-full flex-col rounded-[36px] p-6 transition-all duration-300",
                  featured && "border-pulse-600/30 shadow-[0_20px_50px_rgba(144,88,49,0.16)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <GBadge level={o.level} size="lg" />
                  <Tip label={<span className={cn("text-[11px] font-bold", t.text)}>What does {o.level} mean?</span>}>
                    <b className="text-wandor-text">{o.level} — {o.level === "G5" ? "Fully Verified / Escrowed" : o.level === "G2" ? "Conditional / Bounded" : "Soft Hold / Best Effort"}</b>
                    <br />
                    {o.level === "G5" && "Every link in the chain is verified AND compensation is pre-funded in escrow. If anything fails, the payout fires automatically on top of verified rebooking — the strongest commitment EventPulse offers."}
                    {o.level === "G2" && "Capacity is verified and your arrival window is bounded, but the seat is priority-allocated — not hard-reserved. Automatic rerouting covers failures."}
                    {o.level === "G1" && "This is a monitored recommendation. Schedules and forecasts, no reserved capacity. EventPulse re-plans live if conditions change."}
                  </Tip>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-wandor-text">{o.name}</h3>
                <div className="mt-1 text-xs text-wandor-muted">{o.note}</div>
                <div className="mt-5 space-y-2.5">
                  {o.features.map((f) => (
                    <div key={f.text} className="flex items-center gap-2.5 text-[13px]">
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", f.ok ? "bg-emerald-600/12" : "bg-red-600/10")}>
                        {f.ok ? <Check className="h-3 w-3 text-emerald-700" /> : <X className="h-3 w-3 text-red-700/70" />}
                      </span>
                      <span className={cn("font-semibold", f.ok ? "text-wandor-text" : "text-wandor-muted line-through decoration-wandor-muted/50")}>{f.text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-end justify-between border-t border-wandor-text/8 pt-5">
                  <div>
                    <div className={cn("font-display text-3xl font-bold", t.text)}>{o.price}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">fixed fare · incl. taxes</div>
                  </div>
                </div>
                <button
                  onClick={() => select(o)}
                  className={cn(buttonCls(featured ? "primary" : "subtle", "lg", "mt-5 w-full"))}
                >
                  Select {o.level} <ArrowRight className="h-4 w-4" />
                </button>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-[28px] border border-wandor-text/10 bg-white/60 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pulse-600" />
        <p className="text-xs leading-relaxed text-wandor-muted">
          <b className="text-wandor-text">Why not always G5?</b> Because G5 requires every link to be locked <b>and</b> its compensation to sit in escrow — and real capacity, plus escrow funding, are finite. EventPulse shows you exactly how strong each commitment is, so you can trade price against certainty with full knowledge. If you need a hard guarantee by 7:00 PM, choose G5. If flexibility is fine, G2 or G1 save you money.
        </p>
      </div>
    </Page>
  );
}
