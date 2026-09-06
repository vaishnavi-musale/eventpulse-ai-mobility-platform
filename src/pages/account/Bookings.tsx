import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Clock3, MapPin, QrCode, Sparkles, Ticket, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COMMITMENT, HISTORY, UPCOMING } from "@/data/mock";
import { getCommitmentToken, listActiveTokens, readStoredTokenId, type BackendToken } from "@/api/backend";
import { useBackend } from "@/api/status";
import { useStore } from "@/store";
import { GBadge } from "@/components/glevels";
import { useNotif } from "@/components/Notifications";
import { buttonCls, GlassCard, Pill, QRBlock, Stat, StatusPill } from "@/components/ui";

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function Bookings() {
  const navigate = useNavigate();
  const { notify } = useNotif();
  const { event, option, commitmentLevel } = useStore();
  const { status } = useBackend();
  const [token, setToken] = useState<BackendToken | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  const live = status === "live";

  useEffect(() => {
    if (!live) {
      setToken(null);
      setActiveCount(null);
      return;
    }
    const id = readStoredTokenId();
    let cancelled = false;
    (async () => {
      const [tok, levels] = await Promise.all([
        id ? getCommitmentToken(id).catch(() => null) : null,
        listActiveTokens().catch(() => null),
      ]);
      if (cancelled) return;
      if (tok?.found && tok.token) setToken(tok.token);
      if (levels) setActiveCount(levels.count);
    })();
    return () => {
      cancelled = true;
    };
  }, [live]);

  const liveId = token?.id ?? readStoredTokenId();
  const liveLevel = (token?.gLevel ?? commitmentLevel) as typeof commitmentLevel;

  const sharePass = () => notify("success", "Pass ready to share", "QR exported to your devices — safe to share.");

  const cancel = (name: string) =>
    notify("warn", "Cancellation window kept open", `${name} can be cancelled anytime up to 30 min before departure.`);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">My commitments</div>
        <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">My Bookings</h1>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-wandor-muted">
          Every committed seat, shuttle slot and verified corridor — with its real G-level reliability, not a promise.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Active Commitments" value={<span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-pulse-600" />{activeCount ?? 2}</span>} sub="incl. this event" tone="blue" />
        <Stat label="On-Time Delivery" value="94%" sub="vs 62% industry avg" tone="green" />
        <Stat label="EP Points Earned" value="18,240" sub="+20 today" tone="cyan" />
        <Stat label="Reliability Credit" value="₹240" sub="refundable balance" tone="violet" />
      </div>

      {/* Active commitment */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-wandor-muted">Active commitment</h2>
          <div className="flex items-center gap-2">
            {live && <Pill tone="green" className="uppercase"><Sparkles className="h-3 w-3" /> backend sync</Pill>}
            <Pill tone="green" className="uppercase"><Sparkles className="h-3 w-3" /> {liveLevel} · live protected</Pill>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <GlassCard strong className="overflow-hidden rounded-[28px]">
            <div className="flex flex-col gap-6 bg-gradient-to-br from-wandor-text/[0.04] to-transparent p-5 md:flex-row md:items-center sm:p-6">
              <div className="flex justify-center md:justify-start">
                <div className="rounded-3xl border border-wandor-text/10 bg-white p-3 shadow-sm">
                  <QRBlock seed={(liveId ?? COMMITMENT.id).slice(-6)} size={128} />
                  <div className="mt-1 text-center text-[9px] font-bold tracking-widest text-wandor-muted">{liveId ?? COMMITMENT.id}</div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-bold text-wandor-text">{option.name}</h3>
                  <GBadge level={liveLevel} size="md" />
                </div>
                <p className="mt-0.5 text-sm font-semibold text-wandor-text/80">{event.name} · {event.date}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Departure</div>
                    <div className="mt-0.5 flex items-center gap-1 font-bold text-wandor-text"><Clock3 className="h-3 w-3 text-pulse-600" /> {token ? fmtTime(token.timeWindowStart) : COMMITMENT.departure}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Boarding</div>
                    <div className="mt-0.5 flex items-center gap-1 font-bold text-wandor-text"><MapPin className="h-3 w-3 text-pulse-600" /> {COMMITMENT.boardingGate}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Arrival target</div>
                    <div className="mt-0.5 font-bold text-wandor-text">{token ? fmtTime(token.timeWindowEnd) : COMMITMENT.arrivalTarget}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Fare</div>
                    <div className="mt-0.5 font-bold text-wandor-text">{option.price} <span className="text-[10px] font-semibold text-wandor-muted">· {option.priceNote}</span></div>
                  </div>
                </div>
                {token && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
                    <StatusPill status={token.state.toUpperCase()} tone={token.state === "fulfilled" ? "cyan" : "green"} />
                    <span>Backend state</span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button onClick={() => navigate("/app/journey")} className={buttonCls("primary", "sm")}>
                  Open Live Journey <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button onClick={sharePass} className={buttonCls("ghost", "sm")}><QrCode className="h-3.5 w-3.5" /> Share pass</button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-wandor-muted">Upcoming</h2>
        <div className="space-y-3">
          {UPCOMING.map((u) => (
            <GlassCard key={u.event} className="flex flex-wrap items-center gap-4 rounded-[24px] p-5 transition hover:border-pulse-600/30">
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
              <StatusPill status={u.status} tone={u.status === "ACTIVE" ? "green" : "cyan"} />
              <div className="flex gap-2">
                <button onClick={() => navigate("/app/journey")} className={buttonCls("outline", "sm")}>View pass</button>
                <button onClick={() => cancel(u.event)} className={buttonCls("ghost", "sm")}>Cancel</button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Past journeys */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-wandor-muted">Past journeys</h2>
        <GlassCard strong className="overflow-hidden rounded-[24px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
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
  );
}