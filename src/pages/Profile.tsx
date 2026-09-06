import { motion } from "framer-motion";
import { ArrowRight, Award, CalendarDays, CheckCircle2, Clock3, Download, MapPin, ShieldCheck, Star, Ticket, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis } from "recharts";
import { HISTORY, SAVED_EVENTS, UPCOMING } from "@/data/mock";
import { GBadge } from "@/components/glevels";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Grade, Pill, Stat, StatusPill } from "@/components/ui";
import { cn } from "@/utils/cn";

const STATS = [
  { icon: Ticket, label: "Total Commitments", value: "29", tone: "text-pulse-600", sub: "since Mar 2026" },
  { icon: CheckCircle2, label: "Successful Deliveries", value: "22", tone: "text-emerald-700", sub: "91.7% success rate" },
  { icon: Clock3, label: "Average On-Time Rate", value: "94%", tone: "text-teal-700", sub: "vs 62% industry avg" },
  { icon: ShieldCheck, label: "G3 Commitments Used", value: "8", tone: "text-emerald-700", sub: "2 with compensation" },
];

const G_MIX = [
  { name: "G5", value: 5, color: "#047857" },
  { name: "G3", value: 8, color: "#059669" },
  { name: "G2", value: 6, color: "#23877D" },
  { name: "G1", value: 7, color: "#b45309" },
  { name: "G0", value: 3, color: "#94a3b8" },
];

const MONTHLY = [
  { m: "Apr", v: 2 }, { m: "May", v: 3 }, { m: "Jun", v: 4 }, { m: "Jul", v: 5 }, { m: "Aug", v: 5 }, { m: "Sep", v: 5 },
];

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid rgba(23,25,24,0.1)",
  borderRadius: 14,
  fontSize: 12,
  color: "#1a1a1a",
  boxShadow: "0 8px 24px rgba(23,25,24,0.08)",
};

const CONSENT_KEY = "eventpulse:consent";
const DEFAULT_CONSENT = { location: true, personalization: false };

export default function Profile() {
  const navigate = useNavigate();
  const { notify } = useNotif();

  const [consent, setConsent] = useState<{ location: boolean; personalization: boolean }>(() => {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      return raw ? { ...DEFAULT_CONSENT, ...JSON.parse(raw) } : DEFAULT_CONSENT;
    } catch {
      return DEFAULT_CONSENT;
    }
  });

  const updateConsent = (patch: Partial<typeof DEFAULT_CONSENT>) => {
    const next = { ...consent, ...patch };
    setConsent(next);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    notify("info", "Consent updated", "Applied to orchestration. You can change this anytime.");
  };

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: { name: "Aarav Sharma", verified: true },
      consent,
      commitments: HISTORY.length,
      retention: "k≥50 aggregation · raw data purged after 24h",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eventpulse-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("success", "Data exported", "eventpulse-my-data.json downloaded.");
  };

  const safeExit = () => {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem("eventpulse:hosted-events");
    setConsent(DEFAULT_CONSENT);
    notify("warn", "Safe-exit complete", "Consent + stored records deleted (V2.1 §37.3).");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">
      {/* identity */}
      <GlassCard className="mb-6 flex flex-wrap items-center gap-5 rounded-[36px] p-6" strong>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pulse-500 to-pulse-300 font-display text-xl font-bold text-white shadow-[0_6px_18px_rgba(144,88,49,0.35)]">
          AS
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-wandor-text">Aarav Sharma</h1>
            <Pill tone="violet"><Award className="h-3 w-3" /> Verified Traveler</Pill>
            <Pill tone="green">G3 Member</Pill>
          </div>
          <p className="mt-1 text-sm text-wandor-muted">Mumbai · 214 journeys planned · 118 events attended with EventPulse</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/app/discover")} className={buttonCls("primary", "sm")}>Plan Next Journey</button>
          <button onClick={() => navigate("/")} className={buttonCls("ghost", "sm")}>Home</button>
        </div>
      </GlassCard>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Stat label={s.label} value={s.value} sub={s.sub} tone="blue" />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          {/* upcoming */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-wandor-muted">Upcoming Commitments</h2>
            <div className="space-y-3">
              {UPCOMING.map((u) => (
                <GlassCard key={u.event} className="flex flex-wrap items-center gap-4 rounded-[28px] p-5 transition hover:border-pulse-600/30">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-pulse-600/25 bg-pulse-600/10">
                    <Ticket className="h-5 w-5 text-pulse-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-wandor-text">{u.event}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-wandor-muted">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {u.date}</span>
                      <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> depart {u.depart}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {u.service}</span>
                    </div>
                  </div>
                  <GBadge level={u.g} size="sm" />
                  <StatusPill status={u.status === "ACTIVE" ? "ACTIVE" : "CONFIRMED"} tone={u.status === "ACTIVE" ? "green" : "cyan"} />
                </GlassCard>
              ))}
            </div>
          </div>

          {/* history table */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-wandor-muted">Past Journeys</h2>
            <GlassCard className="overflow-hidden rounded-[28px]" strong>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-wandor-text/8 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Event</th>
                      <th className="px-5 py-3.5">Service</th>
                      <th className="px-5 py-3.5">G-Level</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HISTORY.map((h) => (
                      <tr key={h.date + h.event} className="border-b border-wandor-text/5 text-[13px] transition hover:bg-wandor-text/[0.03] last:border-0">
                        <td className="px-5 py-3.5 font-semibold text-wandor-muted">{h.date}</td>
                        <td className="px-5 py-3.5 font-bold text-wandor-text">{h.event}</td>
                        <td className="px-5 py-3.5 text-wandor-muted">{h.service}</td>
                        <td className="px-5 py-3.5"><GBadge level={h.g} size="sm" showLabel={false} /></td>
                        <td className="px-5 py-3.5"><StatusPill status={h.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </div>

        <div className="space-y-5">
          {/* commitment stats */}
          <GlassCard className="rounded-[28px] p-5" strong>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-wandor-muted">Commitment Statistics</h2>
            <div className="flex items-center gap-5">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={G_MIX} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                      {G_MIX.map((g) => (
                        <Cell key={g.name} fill={g.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-2xl font-bold text-wandor-text">29</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-wandor-muted">total</div>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                {G_MIX.map((g) => (
                  <div key={g.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold text-wandor-text/80">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} /> {g.name}
                    </span>
                    <span className="font-display font-bold text-wandor-text">{g.value} journeys</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* monthly activity */}
          <GlassCard className="rounded-[28px] p-5" strong>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-wandor-muted">Monthly Activity</h2>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY} barSize={22}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#767676", fontSize: 11, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(23,25,24,0.04)" }} />
                  <Bar dataKey="v" radius={[6, 6, 2, 2]} fill="#B96843" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* saved events */}
          <GlassCard className="rounded-[28px] p-5" strong>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-wandor-muted">Saved Events</h2>
            <div className="flex flex-wrap gap-2">
              {SAVED_EVENTS.map((e) => (
                <button key={e} onClick={() => navigate("/app/discover")} className="group flex items-center gap-2 rounded-full border border-wandor-text/15 bg-white px-3.5 py-2 text-xs font-bold text-wandor-text transition hover:border-pulse-600/40">
                  <Star className="h-3 w-3 text-amber-600" /> {e}
                </button>
              ))}
            </div>
            <button onClick={() => navigate("/app/discover")} className="mt-4 flex items-center gap-1.5 text-xs font-bold text-pulse-600 hover:text-pulse-500">
              Discover more events <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </GlassCard>

          {/* privacy & data */}
          <GlassCard className="rounded-[28px] p-5" strong>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-wandor-muted">
              <ShieldCheck className="h-4 w-4 text-pulse-600" /> Privacy & Data
            </h2>
            <div className="space-y-3">
              <button
                role="switch"
                aria-checked={consent.location}
                onClick={() => updateConsent({ location: !consent.location })}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-wandor-text/8 bg-white p-3.5 text-left transition hover:border-pulse-600/30"
              >
                <span>
                  <span className="block text-[12.5px] font-bold text-wandor-text">Share location for live rerouting</span>
                  <span className="mt-0.5 block text-[11px] text-wandor-muted">Lets EventPulse auto-route you when a link breaks (G3+ protection)</span>
                </span>
                <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", consent.location ? "bg-emerald-600" : "bg-wandor-text/20")}>
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", consent.location ? "left-[22px]" : "left-0.5")} />
                </span>
              </button>
              <button
                role="switch"
                aria-checked={consent.personalization}
                onClick={() => updateConsent({ personalization: !consent.personalization })}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-wandor-text/8 bg-white p-3.5 text-left transition hover:border-pulse-600/30"
              >
                <span>
                  <span className="block text-[12.5px] font-bold text-wandor-text">Personalized offers from partners</span>
                  <span className="mt-0.5 block text-[11px] text-wandor-muted">Third-party deals shown only with your permission</span>
                </span>
                <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", consent.personalization ? "bg-emerald-600" : "bg-wandor-text/20")}>
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", consent.personalization ? "left-[22px]" : "left-0.5")} />
                </span>
              </button>
              <div className="rounded-2xl border border-wandor-text/8 bg-white p-3.5 text-[11.5px] leading-relaxed text-wandor-muted">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-wandor-text">
                  <ShieldCheck className="h-3.5 w-3.5 text-pulse-600" /> How your data is handled <Grade g="S" />
                </div>
                Every crowd figure is aggregated so no individual is identifiable <b className="text-wandor-text">(k ≥ 50 per stratum)</b>. Raw location and booking fields are purged after 24 hours; a separate auditable partition keeps only compliance records (V2.1 §37.1–37.2).
              </div>
              <div className="flex gap-2">
                <button onClick={exportData} className={buttonCls("subtle", "sm", "flex-1")}>
                  <Download className="h-3.5 w-3.5" /> Export my data
                </button>
                <button
                  onClick={safeExit}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-600/30 bg-red-600/10 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-600/20 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Safe-exit
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
