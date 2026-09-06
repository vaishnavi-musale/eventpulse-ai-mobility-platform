import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bus, Check, ChevronUp, Clock3, Flag, Home, Map as MapIcon, Navigation, Plus, RefreshCw, ShieldCheck, Sparkles, Target, TrainFront, TriangleAlert, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COMMITMENT, MONITORS, TIMELINE, type GLevel } from "@/data/mock";
import { commitmentAction, fulfillCommitmentToken, getCommitmentToken, readStoredTokenId, type BackendToken } from "@/api/backend";
import { useBackend } from "@/api/status";
import { useStore } from "@/store";
import { GBadge } from "@/components/glevels";
import { MapView } from "@/components/MapView";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Page, Pill, Skeleton, StatusPill } from "@/components/ui";
import { getPublishedVenueMap } from "@/data/venueMap";
import VenueMapView, { VenueLegend } from "@/components/VenueMapView";
import { cn } from "@/utils/cn";

const T_ICONS = { home: Home, train: TrainFront, bus: Bus, flag: Flag, target: Target } as const;

export default function Journey() {
  const navigate = useNavigate();
  const { journeyPhase, alternativeEta, serviceVerified, commitmentLevel, setServiceVerified } = useStore();
  const { status } = useBackend();
  const { notify } = useNotif();
  const [load, setLoad] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);
  const [token, setToken] = useState<BackendToken | null>(null);

  const live = status === "live";

  useEffect(() => {
    const t = setTimeout(() => setLoad(false), 700);
    return () => clearTimeout(t);
  }, []);

  // End-to-end: read the live token state when the backend is up.
  useEffect(() => {
    if (!live) {
      setToken(null);
      return;
    }
    const id = readStoredTokenId();
    if (!id) return;
    let cancelled = false;
    const sync = () =>
      getCommitmentToken(id)
        .then((r) => {
          if (cancelled) return;
          if (r.found && r.token) setToken(r.token);
        })
        .catch(() => {
          if (cancelled) return;
          setToken(null);
        });
    sync();
    const interval = setInterval(sync, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [live]);

  const tokenId = token?.id ?? readStoredTokenId();
  const stateOrder = ["offered", "accepted", "held", "activated", "fulfilled"];
  const stateIdx = token?.state ? stateOrder.indexOf(token.state) : -1;
  const publishedVenue = getPublishedVenueMap("mumbai-music-festival");
  const venueMapImage = publishedVenue?.image ?? "/venue-map-default.png";

  const adjusted = journeyPhase === "adjusted";
  const disrupted = journeyPhase === "disrupted";
  const doneCount = token ? Math.max(0, stateIdx) : adjusted ? 3 : 1;
  const eta = adjusted ? alternativeEta : "6:55 PM";
  const shuttleStatus = adjusted ? "RESCHEDULED" : "ON TIME";

  const simulateDisruption = async () => {
    if (live && token) {
      const toLevel: GLevel = commitmentLevel === "G5" ? "G2" : "G1";
      const r = await commitmentAction(token.id, "downgrade", { toLevel, reason: "simulated service disruption" }).catch(() => null);
      if (r?.ok) {
        notify("warn", "Token downgraded on backend", `${token.id} → G${toLevel[1]} · compensation path armed via escrow.`);
        const res = await getCommitmentToken(token.id).catch(() => null);
        if (res?.found && res.token) setToken(res.token);
        setServiceVerified(false);
        return;
      }
    }
    navigate("/app/disruption");
  };

  const verifyService = async () => {
    if (adjusted || serviceVerified || live && token) {
      if (live && token) {
        const r = await fulfillCommitmentToken(token.id, {
          category: "shuttle_seat",
          mechanism: "scan",
          evidenceData: { qr: token.id, boardingGate: COMMITMENT.boardingGate },
          crossCheckPassed: true,
          sourceSystem: "eventpulse-app",
        }).catch(() => null);
        if (r?.ok) {
          const res = await getCommitmentToken(token.id).catch(() => null);
          if (res?.found && res.token) setToken(res.token);
          notify("success", "Service verified", `${token.id} fulfilled on backend with scan evidence.`);
          setServiceVerified(true);
          return;
        }
      }
      navigate("/app/verify-service");
    } else {
      notify("warn", "Not yet", "Arrival at 6:55 PM — verification unlocks at the venue.");
    }
  };

  const banner = disrupted
    ? { tone: "border-orange-600/30 bg-orange-600/[0.06]", icon: TriangleAlert, text: "Disruption detected — your plan needs a decision", cta: "Review Now", action: () => navigate("/app/disruption") }
    : adjusted
      ? { tone: "border-teal-600/30 bg-teal-600/[0.06]", icon: RefreshCw, text: "Adjusted plan active — Express Shuttle E-75 assigned", cta: "Details", action: () => setSheetOpen(true) }
      : { tone: "border-emerald-600/30 bg-emerald-600/[0.06]", icon: ShieldCheck, text: "Everything is on track", cta: null as string | null, action: () => undefined };

  return (
    <Page className="max-w-7xl">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">
            <Activity className="h-3.5 w-3.5" /> Step 7 · Live Journey
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-wandor-text md:text-3xl">Mumbai Music Festival — Live Command</h1>
          <p className="mt-1 text-xs text-wandor-muted">Commitment {tokenId ?? COMMITMENT.id} · monitored every 30 seconds</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={(token?.state ?? "ACTIVE").toUpperCase()} tone={token?.state === "fulfilled" ? "cyan" : "green"} />
          <GBadge level={(token?.gLevel ?? commitmentLevel)} size="sm" />
        </div>
      </div>

      {!disrupted && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("mb-5 flex flex-wrap items-center gap-3 rounded-[24px] border px-4 py-3", banner.tone)}
        >
          <banner.icon className={cn("h-5 w-5", disrupted ? "text-orange-700" : adjusted ? "text-teal-700" : "text-emerald-700")} />
          <span className="text-sm font-bold text-wandor-text">{banner.text}</span>
          <span className="hidden text-xs text-wandor-muted sm:block">Commitment status: {(token?.state ?? "ACTIVE").toUpperCase()} · {(token?.gLevel ?? commitmentLevel)} GUARANTEED{live ? ` · backed by ${tokenId ? "backend" : "demo"}` : ""}</span>
          {banner.cta && (
            <button onClick={banner.action} className={buttonCls(adjusted ? "cyan" : "amber", "sm", "ml-auto")}>
              {banner.cta}
            </button>
          )}
        </motion.div>
      )}

      {disrupted && (
        <motion.button
          onClick={() => navigate("/app/disruption")}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 flex w-full items-center gap-3 rounded-[24px] border border-orange-600/40 bg-orange-600/[0.07] px-4 py-3.5 text-left shadow-[0_8px_28px_rgba(234,88,12,0.12)]"
        >
          <TriangleAlert className="h-5 w-5 shrink-0 animate-pulse text-orange-700" />
          <div className="flex-1">
            <div className="text-sm font-bold text-wandor-text">SERVICE DISRUPTION DETECTED — action required</div>
            <div className="text-xs text-orange-800/80">Reserved shuttle delayed 18 min. AI has found 1 verified alternative.</div>
          </div>
          <button className={buttonCls("amber", "sm")}>Review</button>
        </motion.button>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ============ MAP (left) ============ */}
        <div className="relative">
          <div className="relative h-[420px] overflow-hidden rounded-[36px] border border-wandor-text/10 lg:sticky lg:top-20 lg:h-[640px]">
            <MapView variant="journey" className="h-full w-full" />
            <div className="absolute left-3 top-3 flex flex-col gap-2">
              <div className="glass-strong rounded-2xl px-4 py-3 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Arriving</div>
                <div className="font-display text-2xl font-bold text-wandor-text">
                  {eta}
                  <span className="ml-2 text-xs font-semibold text-emerald-700">{adjusted ? "within G2 bound" : "on target"}</span>
                </div>
              </div>
              <div className="glass-strong flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-sm">
                <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-teal-600 opacity-70" /><span className="relative h-2 w-2 rounded-full bg-teal-700" /></span>
                <span className="text-[11px] font-bold text-wandor-text">Shuttle {adjusted ? "E-75" : "S-114"} · {shuttleStatus}</span>
              </div>
              {serviceVerified && (
                <div className="glass-strong rounded-2xl px-3.5 py-2.5 text-[11px] font-bold text-emerald-700 shadow-sm">✓ Service verified at venue</div>
              )}
            </div>
            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <button className="glass-strong flex h-9 w-9 items-center justify-center rounded-full text-wandor-text shadow-sm"><Plus className="h-4 w-4" /></button>
              <button className="glass-strong flex h-9 w-9 items-center justify-center rounded-full text-wandor-text shadow-sm">−</button>
              <button onClick={() => notify("info", "Location", "GPS locked · precise to 4 m")} className="glass-strong flex h-9 w-9 items-center justify-center rounded-full text-wandor-text shadow-sm"><Navigation className="h-4 w-4 text-pulse-600" /></button>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
              <span className="glass-strong rounded-full px-2.5 py-1.5 shadow-sm">● You</span>
              <span className="glass-strong rounded-full px-2.5 py-1.5 text-teal-700 shadow-sm">◼ Shuttle</span>
              <span className="glass-strong rounded-full px-2.5 py-1.5 shadow-sm">▣ Venue</span>
            </div>
          </div>

          {/* mobile expand handle */}
          <button onClick={() => setSheetOpen(!sheetOpen)} className="mx-auto -mt-3 flex h-7 w-40 items-center justify-center rounded-t-2xl border border-b-0 border-wandor-text/10 bg-white text-wandor-muted shadow-sm lg:hidden">
            <ChevronUp className={cn("h-4 w-4 transition-transform", sheetOpen && "rotate-180")} />
          </button>
        </div>

        {/* ============ RIGHT COLUMN (mobile bottom sheet) ============ */}
        <div
          className={cn(
            "relative z-10 -mt-2 flex flex-col gap-4 rounded-t-3xl border-t border-wandor-text/10 bg-ink-950/95 p-3 pb-6 shadow-[0_-24px_60px_rgba(23,25,24,0.12)] backdrop-blur-xl transition-all duration-300 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pb-0 lg:shadow-none lg:backdrop-blur-none",
            sheetOpen ? "max-h-[75vh] overflow-y-auto" : "max-h-[42vh] overflow-hidden"
          )}
        >
          <AnimatePresence>
            {load ? (
              <GlassCard className="space-y-3 p-5">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-16 w-full" />
                <div className="text-center text-xs font-semibold text-teal-700">◉ Syncing live telemetry…</div>
              </GlassCard>
            ) : (
              <>
                {/* timeline */}
                <GlassCard className="rounded-[28px] p-5" strong>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">
                      <Clock3 className="h-4 w-4 text-pulse-600" /> Journey Timeline
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setVenueOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-wandor-text/15 bg-white px-3 py-1.5 text-[11px] font-bold text-wandor-text shadow-sm transition-all hover:border-pulse-600/40 hover:text-pulse-600 active:scale-[0.97]">
                        <MapIcon className="h-3.5 w-3.5" /> Venue details
                      </button>
                      <Pill tone={adjusted ? "cyan" : "green"}>{adjusted ? "ADJUSTED PLAN" : "ON SCHEDULE"}</Pill>
                    </div>
                  </div>
                  <div className="relative space-y-0">
                    <div className="absolute bottom-5 left-[15px] top-2 w-px bg-gradient-to-b from-emerald-600/50 via-wandor-text/10 to-wandor-text/10" />
                    {TIMELINE.map((t, i) => {
                      const Icon = T_ICONS[t.icon];
                      const done = i < doneCount;
                      const active = i === doneCount && !disrupted;
                      return (
                        <div key={t.time} className="relative flex items-start gap-3.5 pb-5 last:pb-0">
                          <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border", done ? "border-emerald-600/40 bg-emerald-600/10" : active ? "border-pulse-600/40 bg-pulse-600/10 shadow-[0_0_14px_rgba(144,88,49,0.3)]" : "border-wandor-text/10 bg-white")}>
                            {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Icon className={cn("h-4 w-4", active ? "text-pulse-600" : "text-wandor-muted")} />}
                          </span>
                          <div className="pt-1">
                            <div className={cn("text-[13px] font-bold", done ? "text-wandor-muted line-through decoration-wandor-muted/50" : "text-wandor-text")}>
                              {t.label}
                            </div>
                            <div className="text-[11px] font-semibold text-wandor-muted">{t.time}{done && " · done"}{active && " · next"}</div>
                          </div>
                          {i === 3 && adjusted && (
                            <span className="ml-auto mt-1 rounded-xl bg-teal-600/10 px-2 py-1 text-[10px] font-bold text-teal-700">ETA {alternativeEta}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* monitors */}
                <div className="grid grid-cols-2 gap-3">
                  {MONITORS.map((m, i) => {
                    const isShuttle = m.key === "Shuttle";
                    const isTraffic = m.key === "Traffic";
                    const tone = adjusted && isShuttle ? "amber" : adjusted && isTraffic ? "amber" : (m.tone as "green" | "cyan");
                    return (
                      <motion.div
                        key={m.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="glass flex items-center justify-between rounded-3xl px-4 py-3.5"
                      >
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">{m.key}</div>
                          <div className={cn("font-display text-sm font-bold", tone === "green" ? "text-emerald-700" : tone === "cyan" ? "text-teal-700" : "text-amber-700")}>
                            {adjusted && isShuttle ? "RESCHEDULED" : adjusted && isTraffic ? "HEAVY" : m.value}
                          </div>
                        </div>
                        <span className={cn("h-2.5 w-2.5 rounded-full", tone === "green" ? "bg-emerald-600" : tone === "cyan" ? "bg-teal-600" : "bg-amber-600")} />
                      </motion.div>
                    );
                  })}
                </div>

                {/* AI insight */}
                <GlassCard className="relative overflow-hidden rounded-[28px] border-teal-600/20 bg-teal-600/[0.04] p-5">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-600/10 blur-3xl" />
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">
                    <Sparkles className="h-3.5 w-3.5" /> AI Live Insight
                  </div>
                  <p className="text-[13px] leading-relaxed text-wandor-text/85">
                    {adjusted
                      ? "Express Shuttle E-75 confirmed at Metro Exit. Reroute saves 9 minutes vs original path — new arrival 6:58 PM, comfortably inside your G2 bound."
                      : "Traffic near Gate A is increasing. Your current route remains optimal — the reserved metro corridor is unaffected."}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
                    <Zap className="h-3 w-3 text-teal-700" /> Re-evaluated 12s ago · 14 dependencies healthy
                  </div>
                </GlassCard>

                {/* actions */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {!adjusted && (
                    <button onClick={simulateDisruption} className={buttonCls("subtle", "md")}>
                      <TriangleAlert className="h-4 w-4 text-amber-600" /> {live && token ? "Downgrade on backend" : "Demo: simulate disruption"}
                    </button>
                  )}
                  <button
                    onClick={verifyService}
                    className={buttonCls("primary", "md", (adjusted || serviceVerified || live && token) ? "" : "opacity-60")}
                  >
                    <Flag className="h-4 w-4" /> {live && token ? "Verify & Fulfil Service" : "Verify Service at Venue"}
                  </button>
                  <button onClick={() => navigate("/app/profile")} className={buttonCls("ghost", "md", "sm:col-span-2")}>
                    View commitment history
                  </button>
                </div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Venue details — venue map overlay */}
      <AnimatePresence>
        {venueOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVenueOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-wandor-text/10 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-wandor-text/10 px-5 py-3.5">
                <div>
                  <div className="text-sm font-bold text-wandor-text">Venue Map · DY Patil Stadium</div>
                  <div className="text-[11px] text-wandor-muted">{publishedVenue ? "Organizer-published layout with live POI markers" : "Default layout · attendees can follow gates, food & first-aid pins"}</div>
                </div>
                <button onClick={() => setVenueOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-wandor-text/10 bg-white text-wandor-muted transition-colors hover:border-wandor-text/30 hover:text-wandor-text">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                {publishedVenue ? (
                  <VenueMapView image={publishedVenue.image!} pois={publishedVenue.pois} className="rounded-2xl" />
                ) : (
                  <img src={venueMapImage} alt="Venue map" className="h-auto w-full rounded-2xl border border-wandor-text/10" />
                )}
                {publishedVenue && <VenueLegend pois={publishedVenue.pois} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
