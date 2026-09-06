import { useState } from "react";
import { CheckCircle2, Search, Ticket, UserCheck2, Users2 } from "lucide-react";
import { buttonCls, Pill } from "@/components/ui";
import { useOrganizer, nowTime } from "@/pages/organizer/state";
import { cn } from "@/utils/cn";

export default function Checkin() {
  const { attendees, patch, summary } = useOrganizer();
  const [token, setToken] = useState("");
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const verify = () => {
    const q = token.trim().toLowerCase();
    const hit = attendees.find(
      (a) => a.id.toLowerCase() === q || a.booking.reference.toLowerCase() === q || (q.length > 2 && a.name.toLowerCase().includes(q))
    );
    if (!hit) {
      setVerifyMsg({ ok: false, text: "No attendee matches that token. Try an ID like EP-100481 or a reference like RCPT-7F2A." });
      return;
    }
    patch(hit.id, { status: "checked-in", checkedInAt: nowTime() });
    setVerifyMsg({ ok: true, text: `${hit.name} (${hit.id}) admitted · gate ${hit.gate}.` });
    setToken("");
  };

  const live = [
    { icon: Users2, label: "Live at venue", value: summary.checkedIn, tone: "text-emerald-700" },
    { icon: Ticket, label: "Arriving now", value: summary.pending, tone: "text-amber-700" },
    { icon: UserCheck2, label: "Scanned today", value: summary.checkedIn, tone: "text-pulse-600" },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Gate check-in · token verification</div>
          <Pill tone="green">QR / offline tokens accepted (§27.1)</Pill>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
            <input
              value={token}
              onChange={(e) => { setToken(e.target.value); setVerifyMsg(null); }}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              placeholder="Scan or paste an attendee token (e.g. EP-100481, RCPT-7F2A)…"
              className="h-11 w-full rounded-full border border-wandor-text/12 bg-white pl-10 pr-4 text-sm text-wandor-text outline-none transition focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/20"
            />
          </div>
          <button className={buttonCls("cyan", "md")} onClick={verify}>
            <UserCheck2 className="h-4 w-4" /> Verify token
          </button>
        </div>
        {verifyMsg && (
          <div className={cn("mt-3 rounded-2xl px-4 py-3 text-xs font-semibold", verifyMsg.ok ? "bg-emerald-600/[0.07] text-emerald-700" : "bg-red-600/[0.07] text-red-700")}>
            {verifyMsg.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {live.map((l) => (
          <div key={l.label} className="glass rounded-3xl p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
              <l.icon className={cn("h-3.5 w-3.5", l.tone)} /> {l.label}
            </div>
            <div className={cn("mt-2 font-display text-2xl font-bold", l.tone)}>{l.value.toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-wandor-muted">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> How check-in works at the floor
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-wandor-muted">
          <li>Attendee scans the QR from their confirmation — it stays valid offline (V2 §27.1).</li>
          <li>The token resolves to a named commitment with its G-level; gate staff admit or route to help desk.</li>
          <li>Check-in status flips here instantly and counts toward your live floor occupancy.</li>
          <li>No-shows auto-release their slot to the waitlist after the window closes.</li>
        </ol>
      </div>

      <div className="flex items-start gap-2 rounded-3xl bg-wandor-text/[0.02] px-4 py-3 text-[11px] leading-relaxed text-wandor-muted">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-700">i</span>
        Token checks are claim-grade verified (S) — a token never grants entry to a seat the ledger hasn't confirmed as available (V2 §5, §30).
      </div>
    </div>
  );
}