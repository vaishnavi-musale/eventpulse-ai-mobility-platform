import { useEffect, useState } from "react";
import { Banknote, Database, Zap } from "lucide-react";
import { Grade, Pill, Progress } from "@/components/ui";
import { GBadge } from "@/components/glevels";
import { getEscrow, type BackendEscrow } from "@/api/backend";
import { useBackend } from "@/api/status";
import { compact, useOrganizer } from "@/pages/organizer/state";

export default function Escrow() {
  const { ledger, downgrade, escrow, currentEvent } = useOrganizer();
  const { status } = useBackend();
  const [liveEscrow, setLiveEscrow] = useState<BackendEscrow | null>(null);

  const live = status === "live";

  useEffect(() => {
    if (!live) {
      setLiveEscrow(null);
      return;
    }
    let cancelled = false;
    getEscrow(currentEvent.name)
      .then((r) => {
        if (cancelled || !r.found || !r.escrow) return;
        setLiveEscrow(r.escrow);
      })
      .catch(() => {
        if (!cancelled) setLiveEscrow(null);
      });
    return () => {
      cancelled = true;
    };
  }, [live, currentEvent.name]);

  const fired = liveEscrow
    ? Math.max(0, liveEscrow.fundedAmount - liveEscrow.availableBalance)
    : escrow.firedTotal;
  const funded = liveEscrow?.fundedAmount ?? escrow.fundedTotal;
  const pct = funded > 0 ? Math.round((fired / funded) * 100) : escrow.pct;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {liveEscrow && (
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-emerald-600/25 bg-emerald-600/[0.06] px-4 py-3">
          <Database className="h-4 w-4 text-emerald-700" />
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">Live pool from backend</div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] font-bold text-wandor-muted">
            <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-pulse-600" /> funded ₹{compact(liveEscrow.fundedAmount)}</span>
            <span>· available ₹{compact(liveEscrow.availableBalance)}</span>
            <span>· <span className="text-wandor-text">{liveEscrow.issuedCount}</span> issued / {liveEscrow.heldCount} held</span>
            <Pill tone="green">SYNCED</Pill>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Commitment ledger · escrow pool</div>
            <div className="mt-0.5 text-[10px] font-semibold text-wandor-muted">Every promise an attendee sees is backed here</div>
          </div>
          <Grade g="S" />
        </div>

        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-wandor-muted">
            Fired <span className="font-bold text-red-700">₹{compact(fired)}</span> / funded ₹{compact(funded)}
          </span>
          <span className="font-bold text-wandor-text">{pct}%</span>
        </div>
        <Progress value={pct} tone={pct > 0 ? "red" : "green"} />

        <div className="mt-3 space-y-2">
          {ledger.map((r) => (
            <div key={r.id} className="rounded-2xl border border-wandor-text/8 bg-wandor-text/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GBadge level={r.level} size="sm" />
                  <span className="text-xs font-bold text-wandor-text">{r.service}</span>
                </div>
                <Pill tone={r.escrow === "Fired" ? "red" : "green"}>{r.escrow}</Pill>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="font-mono text-[10px] text-wandor-muted">{r.id} · {r.ref}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-wandor-text">₹{compact(r.comp)}</span>
                  {r.status === "Active" ? (
                    <button
                      className="rounded-full border border-wandor-text/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-wandor-muted transition hover:border-amber-500/50 hover:text-amber-700"
                      onClick={() => downgrade(r.id)}
                    >
                      Simulate disruption
                    </button>
                  ) : (
                    <Pill tone="amber">Downgraded</Pill>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-wandor-text/[0.03] px-4 py-3 text-xs font-semibold text-wandor-muted">
          <Banknote className="h-4 w-4 text-emerald-700" />
          Downgrades auto-pay compensation from pre-funded escrow; G5 promises are the only ones that fire cash-back (V2 §25.1).
        </div>
      </div>

      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">How the pool works</div>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-wandor-muted">
          <li>When an attendee books at G5/G3, the compensation amount is pre-funded into the escrow pool — money is already set aside, not promised later.</li>
          <li>Providers and the organizer jointly sign each commitment; the platform can see the joint account on the ledger (§8.3 mutual escrow).</li>
          <li>If a promise breaks (Simulate disruption), the token downgrades and compensation auto-pays from the pool — no dispute queue.</li>
          <li>The organizer never touches fired funds; they flow straight to the attendee wallet.</li>
        </ol>
      </div>
    </div>
  );
}