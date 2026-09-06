import { EyeOff, Lock, Map, Timer } from "lucide-react";
import { Grade, Pill, Progress } from "@/components/ui";
import ArrivalMap from "@/pages/organizer/ArrivalMap";
import { BAND_META, compact, useOrganizer, type BandKey } from "@/pages/organizer/state";

const BAND_STYLE: Record<BandKey, { dot: string; bar: "green" | "cyan" | "amber" | "gray"; text: string; swatch: string }> = {
  onsite: { dot: "bg-emerald-500", bar: "green", text: "text-emerald-700", swatch: "#059669" },
  approach: { dot: "bg-teal-500", bar: "cyan", text: "text-teal-700", swatch: "#0d9488" },
  enroute: { dot: "bg-amber-500", bar: "amber", text: "text-amber-700", swatch: "#f59e0b" },
  awaited: { dot: "bg-slate-400", bar: "gray", text: "text-slate-500", swatch: "#94a3b8" },
};

const CORRIDOR_SWATCH: Record<string, string> = {
  Metro: "#0d9488",
  "Pulse Shuttle": "#7c3aed",
  Cab: "#b45309",
  UrbanRide: "#b45309",
};

export default function Whereabouts() {
  const { whereabouts, currentEvent } = useOrganizer();
  const { bands, corridors, arrival, consent } = whereabouts;
  const total = bands.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">Arrival & whereabouts</div>
            <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">Where is my crowd?</h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-wandor-muted">
              Aggregate attendee positions around {currentEvent.venue}, inferred from booked transports and commitment ETAs —{" "}
              <span className="font-semibold text-wandor-text">never from individual GPS pins</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="green"><Lock className="h-3 w-3" /> k≥50 anonymized</Pill>
            <Pill tone="cyan"><Timer className="h-3 w-3" /> 24h retention</Pill>
            <Pill tone="blue"><EyeOff className="h-3 w-3" /> Consent-only</Pill>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-wandor-muted">
            <Map className="h-4 w-4 text-pulse-600" /> Live arrival map
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-wandor-muted">
            <Grade g="S" /> aggregate · {compact(total)} contributing attendees
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_250px]">
          <ArrivalMap bands={bands} corridors={corridors} />

          <aside className="space-y-4">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Distance bands</div>
              <div className="space-y-1.5">
                {bands.map((b) => {
                  const s = BAND_STYLE[b.key];
                  return (
                    <div key={b.key} className="flex items-center justify-between rounded-xl border border-wandor-text/8 px-3 py-2">
                      <span className="flex items-center gap-2 text-xs font-bold text-wandor-text">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.swatch }} />
                        {BAND_META[b.key].label}
                        <span className="text-[10px] font-semibold text-wandor-muted">· {BAND_META[b.key].range}</span>
                      </span>
                      <span className={s.text + " font-display text-base font-bold"}>{compact(b.count)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Inbound corridors</div>
              <div className="space-y-1.5">
                {corridors.slice(0, 5).map((c) => {
                  const sw = Object.entries(CORRIDOR_SWATCH).find(([k]) => c.name.includes(k))?.[1];
                  return (
                    <div key={c.name} className="flex items-center gap-2 rounded-xl border border-wandor-text/8 px-3 py-2">
                      <span className="h-[3px] w-5 rounded-full" style={{ background: sw ?? "#b45309" }} />
                      <span className="flex-1 truncate text-xs font-semibold text-wandor-text">{c.name}</span>
                      <span className="text-[10px] font-bold text-wandor-muted">{compact(c.count)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-wandor-text/15 px-3 py-3 text-[10px] leading-relaxed text-wandor-muted">
              Awaited attendees (&gt;30 km) are counted but never drawn on the map. Clusters group many attendees — one badge ≈ hundreds of people, so no single attendee is locatable.
            </div>
          </aside>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Band occupancy</div>
          <div className="space-y-3">
            {bands.map((b) => {
              const s = BAND_STYLE[b.key];
              const meta = BAND_META[b.key];
              return (
                <div key={b.key}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-wandor-text">{meta.label} <span className="text-[10px] font-semibold text-wandor-muted">· {meta.range}</span></span>
                    <span className={s.text + " font-display text-lg font-bold"}>{compact(b.count)}</span>
                  </div>
                  <Progress value={b.pct} tone={s.bar} />
                  <div className="mt-0.5 text-[10px] text-wandor-muted">{meta.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Inbound corridors</div>
            <Grade g="S" />
          </div>
          <div className="space-y-3">
            {corridors.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-wandor-text">{c.name}</span>
                  <span className="font-semibold text-wandor-muted">{compact(c.count)} · {c.pct}%</span>
                </div>
                <Progress value={c.pct} tone="blue" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Arrival forecast</div>
            <div className="text-[10px] font-semibold text-wandor-muted">S observed · A forecast</div>
          </div>
          <div className="space-y-2.5">
            {arrival.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-2 rounded-2xl border border-wandor-text/8 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Grade g={r.g} />
                  <span className="text-xs font-bold text-wandor-text">{r.label}</span>
                </div>
                <span className="font-display text-lg font-bold text-wandor-text">{compact(r.count)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-wandor-muted">
            <Lock className="h-4 w-4 text-pulse-600" /> Consent & anonymization
          </div>
          <div className="text-[10px] font-semibold text-wandor-muted">how much of the crowd you may see</div>
        </div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-wandor-muted">
            Sharing status <span className="font-bold text-emerald-700">{compact(consent.contributed)}</span> opted-in ·{" "}
            <span className="font-bold text-slate-500">{compact(consent.withheld)}</span> withheld
          </span>
          <span className="font-bold text-wandor-text">{consent.pct}%</span>
        </div>
        <Progress value={consent.pct} tone="green" />
        <div className="mt-3 space-y-1.5 rounded-2xl bg-wandor-text/[0.03] px-4 py-3 text-[11px] leading-relaxed text-wandor-muted">
          <p>· Only attendees who opted in to "share travel status (aggregate only)" contribute to the map (V2 §27).</p>
          <p>· No live pin, street address, or personal identifier ever reaches this page — single attendee = never locatable (k≥50).</p>
          <p>· Positions are inferred from booked transports + commitment ETAs, so the map keeps working even during a network/offline event.</p>
          <p>· Contribution data auto-deletes after 24h post-event.</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-3xl bg-wandor-text/[0.02] px-4 py-3 text-[11px] leading-relaxed text-wandor-muted">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-700">i</span>
        Operational levers: Approach-ring growth → open extra shuttle corridors. En-route thinning → release held seats to the waitlist. Awaited → keep waiting, don't staff extra gates yet.
      </div>
    </div>
  );
}