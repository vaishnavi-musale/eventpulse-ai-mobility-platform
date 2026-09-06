import { ArrowLeft, Lock, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import VenueMapView, { FireExitHint, VenueLegend } from "@/components/VenueMapView";
import { buttonCls, Pill } from "@/components/ui";
import { EVENTS, getHostedEvents } from "@/data/mock";
import { getPublishedVenueMap, POI_CATEGORIES, type VenuePoi } from "@/data/venueMap";

function resolveEvent(id: string) {
  const ev = EVENTS.find((e) => e.id === id);
  if (ev) return ev;
  const h = getHostedEvents().find((x) => x.id === id);
  return h ? { name: h.name, venue: h.venue, city: h.city } : { name: "Event", venue: "Venue", city: "City" };
}

export default function VenueMapPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const venue = getPublishedVenueMap(id ?? "");
  const ev = resolveEvent(id ?? "");
  const fireCount = venue?.pois.filter((p: VenuePoi) => p.category === "exit").length ?? 0;

  if (!venue) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-wandor-text/5">
          <MapPin className="h-7 w-7 text-wandor-muted" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-wandor-text">No venue map shared yet</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-wandor-muted">
          The organizer hasn't published a floor plan for this event. Maps appear here automatically once they're uploaded and
          published from the organizer's Venue Map editor.
        </p>
        <button onClick={() => navigate(`/app/event/${id}`)} className={buttonCls("primary", "md", "mt-6")}>
          <ArrowLeft className="h-4 w-4" /> Back to event
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 md:px-8 md:pt-8">
      <button
        onClick={() => navigate(`/app/event/${id}`)}
        className="inline-flex items-center gap-1.5 rounded-full border border-wandor-text/10 bg-white px-4 py-2 text-xs font-bold text-wandor-text transition hover:border-pulse-600/40"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to event
      </button>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">Venue guide</div>
          <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">{ev.name} — floor plan</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-wandor-muted">
            {ev.venue} · {ev.city} · published by the organizer. Gates, fire exits, water, food and seating, exactly where they
            are on site.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="green">Official venue plan</Pill>
          <Pill tone="gray"><Lock className="h-3 w-3" /> Static map · no live pins</Pill>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <VenueMapView image={venue.image!} pois={venue.pois} className="aspect-[4/3] border-wandor-text/15 shadow-[0_10px_40px_rgba(0,0,0,0.1)]" />

        <div className="space-y-4">
          <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-wandor-muted">Legend</div>
            <VenueLegend pois={venue.pois} className="flex-col items-stretch" />
          </div>

          <FireExitHint count={fireCount} />

          <div className="space-y-2">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">Everything on the map</div>
            {POI_CATEGORIES.map((cat) => {
              const items = venue.pois.filter((p) => p.category === cat.key);
              if (items.length === 0) return null;
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="rounded-2xl border border-wandor-text/8 bg-white px-3.5 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-wandor-text">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: cat.color }}>
                      <Icon className="h-3 w-3" />
                    </span>
                    {cat.label}
                    <span className="ml-auto text-[10px] font-semibold text-wandor-muted">{items.length}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {items.map((p) => (
                      <span key={p.id} className="rounded-md bg-wandor-text/[0.04] px-2 py-0.5 text-[10px] font-semibold text-wandor-muted">
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-6 rounded-2xl bg-wandor-text/[0.03] px-5 py-4 text-[11px] leading-relaxed text-wandor-muted">
        This floor plan reflects the organizer's published layout. Wayfinding icons (entry gates, fire exits) also appear in the
        live journey screen and emergency overlays. Fire exits are highlighted for safety — always follow signage and staff
        instructions on site.
      </p>
    </div>
  );
}