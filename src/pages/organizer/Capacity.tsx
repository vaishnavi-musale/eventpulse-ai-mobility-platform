import { Minus, Plus, ShieldCheck } from "lucide-react";
import { Grade, Pill, Progress } from "@/components/ui";
import { EVENTS } from "@/data/mock";
import { SLOTS, compact, useOrganizer } from "@/pages/organizer/state";

export default function Capacity() {
  const { eventId, slotData, slotCaps, adjustCap, releaseHeld, summary } = useOrganizer();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Slot pipeline · sold vs capacity</div>
            <div className="mt-0.5 text-[10px] font-semibold text-wandor-muted">
              {eventId === EVENTS[0].id ? "Venue-scale bookings (managed roster in Attendees)" : "Scaled from managed roster"}
            </div>
          </div>
          <Grade g="S" />
        </div>

        <div className="mt-5 space-y-5">
          {SLOTS.map((s) => {
            const d = slotData.find((x) => x.s === s);
            if (!d) return null;
            return (
              <div key={s}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-wandor-text">{s}</span>
                  <span className="font-semibold text-wandor-muted">
                    {compact(d.sold)} / {compact(d.cap)} sold
                    {d.held > 0 && <span className="ml-1.5 text-amber-600"> · {compact(d.held)} held</span>}
                  </span>
                </div>
                <Progress value={d.pct} tone={d.pct >= 95 ? "red" : d.pct >= 80 ? "amber" : "blue"} />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-wandor-text/15 text-wandor-muted transition hover:border-wandor-text/30 hover:text-wandor-text"
                    onClick={() => adjustCap(s, eventId === EVENTS[0].id ? -100 : -1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Cap {compact(d.cap)}</span>
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-wandor-text/15 text-wandor-muted transition hover:border-wandor-text/30 hover:text-wandor-text"
                    onClick={() => adjustCap(s, eventId === EVENTS[0].id ? 100 : 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className={d.held > 0
                      ? "rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 transition hover:bg-amber-500/20"
                      : "cursor-not-allowed rounded-full border border-wandor-text/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-wandor-muted opacity-50"}
                    onClick={() => releaseHeld(s)}
                    disabled={d.held === 0}
                  >
                    Release held
                  </button>
                  {d.pct >= 95 && <Pill tone="red">Near overbook</Pill>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-wandor-text/[0.03] px-4 py-3 text-xs font-semibold text-wandor-muted">
          <ShieldCheck className="h-4 w-4 text-teal-700" />
          No phantom inventory: every seat above is a live commitment backed by the ledger — {compact(summary.waitlist)} on the waitlist.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="glass rounded-3xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Total capacity</div>
          <div className="mt-2 font-display text-2xl font-bold text-wandor-text">{compact(Object.values(slotCaps).reduce((s, c) => s + c, 0))}</div>
          <div className="mt-0.5 text-[10px] font-semibold text-wandor-muted">across {SLOTS.length} entry slots</div>
        </div>
        <div className="glass rounded-3xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Committed</div>
          <div className="mt-2 font-display text-2xl font-bold text-teal-700">{summary.soldOutPct}%</div>
          <div className="mt-0.5 text-[10px] font-semibold text-wandor-muted">{compact(summary.registered)} tickets active</div>
        </div>
        <div className="glass rounded-3xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Waitlist</div>
          <div className="mt-2 font-display text-2xl font-bold text-amber-700">{compact(summary.waitlist)}</div>
          <div className="mt-0.5 text-[10px] font-semibold text-wandor-muted">auto-fills released capacity</div>
        </div>
      </div>
    </div>
  );
}