import { motion } from "framer-motion";
import { ArrowRight, CalendarPlus, Check, Copy, MapPin, QrCode, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COMMITMENT } from "@/data/mock";
import { useStore } from "@/store";
import { createCommitmentToken, readStoredTokenId, writeStoredTokenId } from "@/api/backend";
import { useBackend } from "@/api/status";
import { GBadge } from "@/components/glevels";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Page, Pill, QRBlock, StatusPill } from "@/components/ui";

const MONITORS = ["Transport", "Traffic", "Weather", "Provider", "Capacity"];

const SPARKS = [
  { x: "12%", y: "18%", d: 0 },
  { x: "88%", y: "22%", d: 0.3 },
  { x: "20%", y: "78%", d: 0.6 },
  { x: "82%", y: "74%", d: 0.9 },
  { x: "50%", y: "8%", d: 1.2 },
];

export default function Confirmation() {
  const navigate = useNavigate();
  const { commitmentLevel, option, event } = useStore();
  const { status } = useBackend();
  const { notify } = useNotif();
  const [tokenId, setTokenId] = useState<string | null>(readStoredTokenId);

  const live = status === "live";

  useEffect(() => {
    notify("success", `Your ${commitmentLevel} commitment is active`, `${tokenId ?? COMMITMENT.id} · ${COMMITMENT.service} · locked and being monitored.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // End-to-end: when the backend is live, mint the commitment there too.
  useEffect(() => {
    if (!live || tokenId) return;
    let cancelled = false;
    (async () => {
      const price = Number((option.price ?? "").replace(/[^0-9]/g, "")) || 0;
      const base = new Date();
      const res = await createCommitmentToken({
        attendeeRef: "aarav-2026",
        category: "shuttle_seat",
        capacityUnitRef: option.name,
        gLevel: commitmentLevel as "G5" | "G3" | "G2" | "G1" | "G0",
        channel: "app",
        verificationMechanism: "scan",
        incentiveValue: 0,
        cost: price,
        expiresAt: new Date(base.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        timeWindowStart: new Date(base.setHours(18, 10, 0, 0)).toISOString(),
        timeWindowEnd: new Date(base.setHours(19, 15, 0, 0)).toISOString(),
        zoneRef: event.name,
      }).catch(() => null);
      if (cancelled || !res?.ok || !res.tokenId) return;
      setTokenId(res.tokenId);
      writeStoredTokenId(res.tokenId);
      notify("success", "Synced to backend", `Commitment token ${res.tokenId} minted on EventPulse backend.`);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, tokenId]);

  const displayId = tokenId ?? COMMITMENT.id;

  const copyId = () => {
    navigator.clipboard?.writeText(displayId).catch(() => undefined);
    notify("info", "Copied to clipboard", `Commitment ID ${displayId}`);
  };

  return (
    <Page className="max-w-4xl">
      <div className="relative text-center">
        {SPARKS.map((s, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute text-lg text-pulse-500"
            style={{ left: s.x, top: s.y }}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: [0, 1.4, 0.8], opacity: [0, 1, 0], rotate: 90 }}
            transition={{ duration: 2.2, delay: 0.4 + s.d, repeat: Infinity, repeatDelay: 1.4 }}
          >
            ✦
          </motion.span>
        ))}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 13, delay: 0.15 }}
          className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-600/30 bg-emerald-600/10"
        >
          <Check className="h-11 w-11 text-emerald-600" strokeWidth={3} />
          <span className="absolute h-24 w-24 animate-ping rounded-full border border-emerald-500/25" style={{ animationDuration: "2.4s" }} />
        </motion.div>
        <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-700">Commitment Locked</div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-wandor-text md:text-5xl">Your Journey Is Confirmed</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-wandor-muted">
          Capacity is locked, the provider is confirmed and monitoring has started. This is a commitment — backed by real, verified capacity.
        </p>
      </div>

      {/* digital commitment card */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-10">
        <GlassCard className="relative overflow-hidden rounded-[44px]" strong>
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-pulse-500/10 blur-[80px]" />
          <div className="flex items-center justify-between gap-2 border-b border-wandor-text/8 px-6 py-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-wandor-muted">
              <Ticket className="h-4 w-4 text-pulse-600" /> Digital Commitment Card
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={COMMITMENT.status} tone="green" />
              {live && <Pill tone="green" className="uppercase">Synced</Pill>}
            </div>
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-3.5">
              {[
                { l: "Commitment ID", v: displayId, copy: true },
                { l: "Service", v: COMMITMENT.service },
                { l: "Commitment Level", g: commitmentLevel },
                { l: "Departure", v: COMMITMENT.departure },
                { l: "Arrival Target", v: COMMITMENT.arrivalTarget },
                { l: "Boarding Gate", v: COMMITMENT.boardingGate },
                { l: "Verification", v: COMMITMENT.verification },
              ].map((row) => (
                <div key={row.l} className="flex items-center justify-between gap-4 border-b border-wandor-text/5 pb-3.5 last:border-0 last:pb-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-wandor-muted">{row.l}</div>
                  <div className="flex items-center gap-2">
                    {row.g ? (
                      <GBadge level={commitmentLevel} size="sm" />
                    ) : (
                      <span className="text-sm font-bold text-wandor-text">{row.v}</span>
                    )}
                    {row.copy && (
                      <button onClick={copyId} className="text-wandor-muted transition hover:text-wandor-text" title="Copy ID">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-wandor-text/8 bg-ink-850 p-5">
              <QRBlock seed={displayId} size={128} />
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
                <QrCode className="h-3.5 w-3.5 text-teal-700" /> Scan at boarding + gate
              </div>
              <div className="flex items-center gap-1.5">
                <Pill tone="green">Offline Valid</Pill>
              </div>
              <p className="max-w-[180px] text-center text-[10px] leading-relaxed text-wandor-muted">
                This token is signed and cached on your device — it verifies at the gate even with no network (§27.1).
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* actions */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={() => navigate("/app/journey")} className={buttonCls("primary", "lg")}>
          View Live Journey <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => notify("success", "Added to calendar", "Mumbai Music Festival 2026 — departure 6:10 PM saved.")}
          className={buttonCls("subtle", "lg")}
        >
          <CalendarPlus className="h-4 w-4" /> Add to Calendar
        </button>
      </motion.div>

      {/* monitoring */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-12">
        <div className="mb-4 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-pulse-600" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-wandor-text">What EventPulse is monitoring</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {MONITORS.map((m, i) => (
            <motion.div
              key={m}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.08 }}
              className="glass flex flex-col items-center gap-2 rounded-3xl px-3 py-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600/12">
                <Check className="h-4 w-4 text-emerald-700" />
              </span>
              <span className="text-xs font-bold text-wandor-text">{m}</span>
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
                <MapPin className="h-2.5 w-2.5" /> live
              </span>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] font-semibold text-wandor-muted/70">
          <Sparkles className="h-3.5 w-3.5 text-pulse-600" />
          Arrival accuracy is updated every 30 seconds. If anything changes, you'll know before it affects you.
        </div>
      </motion.div>
    </Page>
  );
}
