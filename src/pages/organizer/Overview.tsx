import { motion } from "framer-motion";
import { ArrowRight, Banknote, Gauge, Radar, ShieldCheck, Ticket, UserCheck2, UserRound, Users2, CheckCircle2, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Grade, Pill } from "@/components/ui";
import { BAND_META, useOrganizer, compact } from "@/pages/organizer/state";
import { cn } from "@/utils/cn";

const QUICK: { to: string; label: string; desc: string; icon: LucideIcon }[] = [
  { to: "check-in", label: "Gate check-in", desc: "Verify QR / offline tokens at the floor", icon: UserCheck2 },
  { to: "capacity", label: "Capacity controls", desc: "Slot caps, held seats, waitlist", icon: Gauge },
  { to: "attendees", label: "Attendee roster", desc: "Bookings, payments, actions", icon: Users2 },
  { to: "escrow", label: "Escrow & ledger", desc: "Commitments backing every promise", icon: Banknote },
  { to: "mode", label: "Mode & alerts", desc: "Operating mode, broadcasts, safe-exit", icon: ShieldCheck },
];

export default function Overview() {
  const { currentEvent, summary, stats, appliedMode, whereabouts } = useOrganizer();

  const KPIS = [
    { icon: Users2, label: "Total Registered", value: compact(summary.registered), sub: `${compact(summary.waitlist)} on waitlist`, tone: "text-pulse-600" },
    { icon: UserCheck2, label: "Checked In", value: compact(summary.checkedIn), sub: "live at venue now", tone: "text-emerald-700" },
    { icon: Ticket, label: "Yet to Arrive", value: compact(summary.pending), sub: "tickets active", tone: "text-amber-700" },
    { icon: ShieldCheck, label: "Committed Capacity", value: `${summary.soldOutPct}%`, sub: "seats sold vs cap", tone: "text-teal-700" },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">Mega Event · Attendee Management</div>
            <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">{currentEvent.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-wandor-muted">
              <span>{currentEvent.venue} · {currentEvent.city}</span>
              <span>·</span>
              <span>{currentEvent.date}, {currentEvent.time}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currentEvent.services.slice(0, 4).map((s) => (
                <Pill key={s} tone="blue">{s}</Pill>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-wandor-muted">
              <span className={cn("h-2 w-2 rounded-full", appliedMode === "NORMAL" ? "bg-emerald-500" : "bg-amber-500")} />
              Event mode: {appliedMode.replace("_", " ")}
            </div>
            <Pill tone="green">SYNCED TO EVENTPULSE</Pill>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {KPIS.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass rounded-3xl p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
              <k.icon className={cn("h-3.5 w-3.5", k.tone)} /> {k.label}
            </div>
            <div className={cn("mt-2 font-display text-2xl font-bold", k.tone)}>{k.value}</div>
            <div className="mt-0.5 text-[10px] font-semibold text-wandor-muted">{k.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-wandor-text/8 bg-white p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Signals & forecast</div>
            <div className="text-[10px] font-semibold text-wandor-muted">observed ↓ · forecast A</div>
          </div>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              { label: "Projected arrival", value: compact(stats.projectedArrival), note: "of registered — by 8:00 PM", g: "A" as const },
              { label: "No-show rate", value: `${stats.noShowPct}%`, note: "of managed bookings", g: "S" as const },
              { label: "Transport attach", value: `${stats.transportPct}%`, note: "booked a ride or metro", g: "A" as const },
              { label: "Stay attach", value: `${stats.hotelPct}%`, note: "booked a night near venue", g: "A" as const },
              { label: "Paid rate", value: `${stats.paidPct}%`, note: "collected, not outstanding", g: "S" as const },
              { label: "Avg booking value", value: `₹${compact(stats.avg)}`, note: "ticket + transport + stay", g: "S" as const },
              { label: "G5 mix", value: `${stats.g5Pct}%`, note: "fully-verified commitments", g: "S" as const },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Grade g={row.g} />
                  <div>
                    <div className="text-xs font-bold text-wandor-text">{row.label}</div>
                    <div className="text-[10px] text-wandor-muted">{row.note}</div>
                  </div>
                </div>
                <span className="font-display text-lg font-bold text-wandor-text">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-wandor-text/[0.03] px-4 py-3 text-[11px] leading-relaxed text-wandor-muted">
            Every figure carries a claim grade (P/S/A/F/L) per V2 §30; grades L/F on a figure mean it is untrusted and unreachable by attendees.
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-wandor-muted">
                <Radar className="h-4 w-4 text-pulse-600" /> Whereabouts snapshot
              </div>
              <Link to="whereabouts" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-pulse-600 transition hover:text-pulse-700">
                Full map <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {whereabouts.bands.map((b) => (
                <div key={b.key} className="flex items-center justify-between rounded-2xl border border-wandor-text/8 px-3.5 py-2.5">
                  <div>
                    <div className="text-xs font-bold text-wandor-text">{BAND_META[b.key].label}</div>
                    <div className="text-[10px] text-wandor-muted">{BAND_META[b.key].range}</div>
                  </div>
                  <span className="font-display text-lg font-bold text-wandor-text">{compact(b.count)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-wandor-text/[0.03] px-3 py-2 text-[10px] font-semibold text-wandor-muted">
              k≥50 anonymized · consent-only · no individual pins
            </div>
          </div>

          <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-wandor-muted">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Floor status
            </div>
            <div className="space-y-2.5">
              {[
                { label: "Live capacity", value: `${summary.soldOutPct}%`, note: "committed", tone: "text-teal-700" },
                { label: "Arriving now", value: compact(summary.pending), note: "in transit", tone: "text-amber-700" },
                { label: "No-shows", value: compact(summary.cancelled), note: "released to waitlist", tone: "text-slate-500" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-2xl border border-wandor-text/8 px-4 py-3">
                  <div>
                    <div className="text-xs font-bold text-wandor-text">{row.label}</div>
                    <div className="text-[10px] text-wandor-muted">{row.note}</div>
                  </div>
                  <span className={cn("font-display text-xl font-bold", row.tone)}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Jump to a workspace</div>
            <div className="grid gap-2">
              {QUICK.map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  className="group flex items-center gap-3 rounded-2xl border border-wandor-text/8 px-4 py-3 transition hover:border-pulse-500/40 hover:bg-pulse-600/[0.04]"
                >
                  <q.icon className="h-4 w-4 shrink-0 text-pulse-600" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-wandor-text">{q.label}</div>
                    <div className="truncate text-[10px] text-wandor-muted">{q.desc}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-wandor-muted transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-3xl bg-wandor-text/[0.02] px-4 py-3 text-[11px] text-wandor-muted">
        <UserRound className="h-4 w-4 text-pulse-600" />
        Attendee counts are scaled from the managed roster you hold; the Gar platform verifies every seat against provider capacity before you see it (V2 §5).
      </div>
    </div>
  );
}