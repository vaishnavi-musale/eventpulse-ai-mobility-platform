import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Heart, MessageSquareText, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { recordOutcome, recordProviderSuccess } from "@/api/backend";
import { useBackend } from "@/api/status";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Page } from "@/components/ui";
import { cn } from "@/utils/cn";
import { useStore } from "@/store";

const CHIPS = ["On Time", "Easy to Follow", "Great Recommendation", "Route Problem", "Provider Issue", "Too Expensive"];
const LABELS = ["Poor", "Okay", "Good", "Great", "Perfect"];

export default function Feedback() {
  const navigate = useNavigate();
  const { notify } = useNotif();
  const { event } = useStore();
  const { status } = useBackend();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [chips, setChips] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const toggleChip = (c: string) => setChips((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const submit = async () => {
    if (!rating) return;
    setSubmitted(true);
    notify("success", "Feedback recorded", "Thank you! This teaches the intent model for upcoming events.");
    if (status === "live") {
      try {
        await recordOutcome({
          providerRef: "provider-shuttle-01",
          zoneRef: event.name,
          tier: "O",
          metric: "user_rating",
          value: rating,
          sampleSize: 1,
          observedAt: new Date().toISOString(),
          isHoldout: false,
          context: { tags: chips, note: text },
        });
        await recordProviderSuccess("provider-shuttle-01");
      } catch {
        /* offline fallback already shown to the attendee */
      }
    }
  };

  const shown = hover || rating;

  return (
    <Page className="max-w-2xl">
      <div className="mb-8 text-center">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">Step 9 · Feedback & Learning</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-wandor-text md:text-4xl">How was your experience?</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-wandor-muted">Your feedback helps EventPulse improve future event experiences.</p>
      </div>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div key="form" exit={{ opacity: 0, y: -12 }} className="space-y-5">
            {/* stars */}
            <GlassCard className="rounded-[36px] p-7 text-center" strong>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">Rate your journey to the event</div>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    whileHover={{ scale: 1.2, y: -3 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        "h-9 w-9 transition-colors",
                        n <= shown ? "fill-amber-500 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "text-wandor-text/20"
                      )}
                    />
                  </motion.button>
                ))}
              </div>
              <div className="mt-2 h-5 text-sm font-bold text-amber-700">{shown ? LABELS[shown - 1] : "Tap a star"}</div>
            </GlassCard>

            {/* chips */}
            <GlassCard className="rounded-[28px] p-6">
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-wandor-muted">What went well — or not?</div>
              <div className="flex flex-wrap gap-2">
                {CHIPS.map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleChip(c)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-all",
                      chips.includes(c)
                        ? "border-wandor-dark bg-wandor-dark text-white shadow-sm"
                        : "border-wandor-text/15 bg-white text-wandor-muted hover:text-wandor-text active:scale-95"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* text */}
            <GlassCard className="rounded-[28px] p-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">
                <MessageSquareText className="h-3.5 w-3.5" /> Tell us more…
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Anything EventPulse should know about this journey? Ambiguity, delays, the AI's reasoning…"
                className="w-full resize-none rounded-3xl border border-wandor-text/15 bg-white p-4 text-sm text-wandor-text placeholder:text-wandor-muted outline-none transition focus:border-pulse-600/50"
              />
            </GlassCard>

            <button onClick={submit} disabled={!rating} className={buttonCls("primary", "lg", "w-full")}>
              Submit Feedback <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-[11px] text-wandor-muted/80">
              <Sparkles className="mr-1 inline h-3 w-3 text-pulse-600" />
              Feedback trains EventPulse's intent, ranking and G-Level models for your next event.
            </p>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard className="rounded-[44px] p-10 text-center" strong>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 13, delay: 0.1 }}
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-600/30 bg-emerald-600/10"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-wandor-text">Thanks, Aarav — the loop is closed.</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-wandor-muted">
                Your {rating}-star rating{(chips.length > 0 || text) && " and notes"} are feeding the learning engine. Every closed loop makes the next commitment smarter.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button onClick={() => navigate("/app/profile")} className={buttonCls("primary", "md")}>
                  <Heart className="h-4 w-4" /> View My Commitments
                </button>
                <button onClick={() => navigate("/app/discover")} className={buttonCls("subtle", "md")}>
                  Explore Next Event
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
