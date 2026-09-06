import { useState } from "react";
import { Megaphone, ShieldCheck } from "lucide-react";
import { buttonCls, Pill } from "@/components/ui";
import { MODE_META, useOrganizer } from "@/pages/organizer/state";
import type { OperatingMode } from "@/store";
import { cn } from "@/utils/cn";

export default function Comms() {
  const {
    localMode,
    setLocalMode,
    reason,
    setReason,
    reasonErr,
    setReasonErr,
    expiry,
    setExpiry,
    applyMode,
    sendBroadcast,
    pushSafeExit,
    feeds,
  } = useOrganizer();
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-wandor-muted">
            <ShieldCheck className="h-4 w-4 text-pulse-600" /> Operating mode · event scope
          </div>
          <Pill tone={MODE_META[localMode].tone}>{MODE_META[localMode].label}</Pill>
        </div>
        <p className="mb-3 text-xs text-wandor-muted">{MODE_META[localMode].desc}</p>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(MODE_META) as OperatingMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setLocalMode(m); setReasonErr(false); }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition",
                localMode === m
                  ? cn("text-white", m === "NORMAL" && "border-emerald-600 bg-emerald-600", m === "DEGRADED" && "border-amber-500 bg-amber-500", m === "EMERGENCY" && "border-red-600 bg-red-600", m === "PLATFORM-DEGRADED" && "border-violet-600 bg-violet-600")
                  : "border-wandor-text/15 bg-white text-wandor-muted hover:border-wandor-text/30"
              )}
            >
              {MODE_META[m].label}
            </button>
          ))}
        </div>

        {localMode !== "NORMAL" && (
          <div className="mt-3 space-y-2">
            <input
              value={reason}
              onChange={(e) => { setReason(e.target.value); setReasonErr(false); }}
              placeholder="Reason code (required for override, §26)…"
              className={cn("h-10 w-full rounded-full border bg-white px-4 text-sm text-wandor-text outline-none transition", reasonErr ? "border-red-500 ring-2 ring-red-500/20" : "border-wandor-text/12 focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/20")}
            />
            <div className="flex items-center gap-2">
              <input
                value={expiry}
                onChange={(e) => setExpiry(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-10 w-20 rounded-full border border-wandor-text/12 bg-white px-3 text-center text-sm font-bold text-wandor-text outline-none focus:border-pulse-500"
              />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-wandor-muted">min expiry · named-role override</span>
            </div>
          </div>
        )}
        <button
          className={buttonCls(localMode === "EMERGENCY" ? "danger" : localMode === "NORMAL" ? "primary" : "amber", "sm", "mt-3 w-full")}
          onClick={applyMode}
        >
          Apply & push to attendees
        </button>
      </div>

      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
          <Megaphone className="h-3.5 w-3.5" /> Announcements & broadcasts
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendBroadcast(draft)}
            placeholder="Type an attendee-wide announcement…"
            className="h-10 flex-1 rounded-full border border-wandor-text/12 bg-white px-4 text-sm text-wandor-text outline-none focus:border-pulse-500"
          />
          <button className={buttonCls("ghost", "sm")} onClick={() => sendBroadcast(draft)}>Send</button>
        </div>
        <button className="mt-2 text-[11px] font-bold uppercase tracking-widest text-pulse-600 transition hover:text-pulse-700" onClick={pushSafeExit}>
          Push safe-exit guidance (§27.1)
        </button>

        <div className="mt-3 space-y-2">
          {feeds.slice(0, 8).map((f, i) => (
            <div key={i} className="rounded-xl border border-wandor-text/8 bg-white px-3 py-2 text-xs text-wandor-text/80">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">{f.by}</span>
                <span className="font-mono text-[10px] text-wandor-muted">{f.at}</span>
              </div>
              <p className="mt-0.5 leading-snug">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-3xl bg-wandor-text/[0.02] px-4 py-3 text-[11px] leading-relaxed text-wandor-muted">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-700">i</span>
        Non-normal modes require a reason code and expire automatically; every push here also surfaces in the attendee chat's mode strip (§26) and safe-exit flows stay offline-valid (§27.1).
      </div>
    </div>
  );
}