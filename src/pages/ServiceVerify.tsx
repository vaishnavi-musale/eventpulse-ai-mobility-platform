import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, Fingerprint, MapPinned, QrCode, ScanLine, Ticket, UserCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { COMMITMENT } from "@/data/mock";
import { useStore } from "@/store";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Page, Pill, StatusPill } from "@/components/ui";
import { cn } from "@/utils/cn";

const METHODS = [
  { icon: QrCode, name: "Scan QR Code", desc: "Fastest — scan the digital commitment card at the gate", status: "PRIMARY", tone: "blue" },
  { icon: MapPinned, name: "GPS Location Verification", desc: "Auto-verified when you cross the venue geofence", status: "ENABLED", tone: "green" },
  { icon: Fingerprint, name: "Provider Confirmation", desc: "Provider marks delivery complete on their side", status: "CONFIRMED", tone: "green" },
  { icon: Ticket, name: "Digital Ticket", desc: "Presenter link shared with the venue staff", status: "READY", tone: "cyan" },
  { icon: UserCheck, name: "Manual Staff Verification", desc: "Venue staff scans your ID as a fallback", status: "AVAILABLE", tone: "gray" },
] as const;

export default function ServiceVerify() {
  const navigate = useNavigate();
  const { setServiceVerified, serviceVerified } = useStore();
  const { notify } = useNotif();
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(serviceVerified);

  const simulateScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setVerified(true);
      setServiceVerified(true);
      notify("success", "Service successfully verified", "Commitment EP-2026-8F72A fulfilled · delivery confirmed at 6:57 PM.");
    }, 2100);
  };

  return (
    <Page className="max-w-5xl">
      <div className="mb-8 text-center">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-pulse-600">Step 8 · Delivery Confirmation</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-wandor-text md:text-4xl">Verify Your Service</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-wandor-muted">
          You've arrived at Mumbai Music Festival. Confirm delivery to close the loop on your {COMMITMENT.id} commitment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* scanner */}
        <GlassCard className="flex flex-col items-center justify-center p-8" strong>
          <AnimatePresence mode="wait">
            {!verified ? (
              <motion.div key="scan" className="flex w-full flex-col items-center" exit={{ opacity: 0, scale: 0.95 }}>
                <div className="relative mx-auto aspect-square w-full max-w-[320px]">
                  {/* camera frame */}
                  <div className="absolute inset-0 overflow-hidden rounded-[36px] border-2 border-teal-600/40 bg-gradient-to-br from-ink-700 to-ink-850 shadow-[0_10px_40px_rgba(13,148,136,0.12)]">
                    <div className="grid-overlay absolute inset-0 opacity-50" />
                    <QrCode className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 text-teal-700/25" />
                    {/* scan line */}
                    <div className="animate-scanline absolute left-6 right-6 h-0.5 rounded-full bg-teal-600 shadow-[0_0_18px_rgba(13,148,136,0.9)]" />
                    {scanning && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-teal-600/10 backdrop-blur-[2px]">
                        <div className="text-center">
                          <ScanLine className="mx-auto h-8 w-8 animate-pulse text-teal-700" />
                          <div className="mt-2 text-xs font-bold text-teal-800">Validating with provider…</div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  {/* corner brackets */}
                  {[
                    "left-3 top-3 border-l-2 border-t-2 rounded-tl-xl",
                    "right-3 top-3 border-r-2 border-t-2 rounded-tr-xl",
                    "left-3 bottom-3 border-l-2 border-b-2 rounded-bl-xl",
                    "right-3 bottom-3 border-r-2 border-b-2 rounded-br-xl",
                  ].map((c) => (
                    <span key={c} className={cn("absolute h-9 w-9 border-teal-600", c)} />
                  ))}
                </div>
                <button onClick={simulateScan} disabled={scanning} className={buttonCls("cyan", "lg", "mt-7 w-full max-w-[320px]")}>
                  {scanning ? "Scanning…" : "Simulate Scan"}
                </button>
                <p className="mt-3 text-[11px] text-wandor-muted">Show your commitment QR at Gate A · verified in ~2s</p>
              </motion.div>
            ) : (
              <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-6 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 13, delay: 0.1 }}
                  className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-emerald-600/30 bg-emerald-600/10"
                >
                  <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                </motion.div>
                <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-700">Service Verified</div>
                <h2 className="mt-2 font-display text-2xl font-bold text-wandor-text">Your commitment has been successfully fulfilled.</h2>
                <p className="mt-2 max-w-xs text-sm text-wandor-muted">Delivery confirmed 6:57 PM — 3 minutes before your target. Closed loop complete.</p>
                <div className="mt-5 flex items-center gap-2 rounded-full border border-emerald-600/25 bg-emerald-600/10 px-4 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Status</span>
                  <StatusPill status="FULFILLED" tone="green" />
                </div>
                <button onClick={() => navigate("/app/feedback")} className={buttonCls("primary", "lg", "mt-7 w-full")}>
                  Leave Feedback <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* methods */}
        <GlassCard className="rounded-[28px] p-2" strong>
          <div className="border-b border-wandor-text/8 px-5 py-4 text-xs font-bold uppercase tracking-[0.2em] text-wandor-muted">
            Verification Methods
          </div>
          <div className="p-3">
            {METHODS.map((m, i) => {
              const toneCls = m.tone === "green" ? "border-emerald-600/20 bg-emerald-600/[0.04]" : m.tone === "cyan" ? "border-teal-600/20 bg-teal-600/[0.04]" : m.tone === "blue" ? "border-pulse-600/30 bg-pulse-600/[0.06]" : "border-wandor-text/8 bg-white";
              return (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={cn("mb-2 flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition", toneCls, m.status === "PRIMARY" && verified && "opacity-60")}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", m.status === "PRIMARY" ? "border-pulse-600/30 bg-pulse-600/10" : "border-wandor-text/10 bg-white")}>
                    <m.icon className={cn("h-5 w-5", m.status === "PRIMARY" ? "text-pulse-600" : m.tone === "green" ? "text-emerald-700" : m.tone === "cyan" ? "text-teal-700" : "text-wandor-muted")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-wandor-text">{m.name}</div>
                    <div className="text-[11px] text-wandor-muted">{m.desc}</div>
                  </div>
                  <Pill tone={m.tone as "blue"}>{verified && m.status === "PRIMARY" ? "DONE" : m.status}</Pill>
                </motion.div>
              );
            })}
            <div className="mt-2 flex items-center gap-2 rounded-2xl border border-wandor-text/8 bg-white px-4 py-3.5">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-[11px] leading-relaxed text-wandor-muted">
                Multiple channels are cross-checked. Even if one fails, any other method completes verification — that's the redundancy in every EventPulse commitment.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </Page>
  );
}
