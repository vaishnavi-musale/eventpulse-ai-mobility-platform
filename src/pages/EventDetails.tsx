import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Ticket,
  Building2,
  Radar,
  Map as MapIcon,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EVENTS, getHostedEvents, type EventItem, type HostedEventRecord } from "@/data/mock";
import { getPublishedVenueMap } from "@/data/venueMap";
import VenueMapView, { VenueLegend } from "@/components/VenueMapView";
import { useStore } from "@/store";
import { buttonCls, Pill } from "@/components/ui";
import { cn } from "@/utils/cn";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setEvent } = useStore();

  const ev = EVENTS.find((e) => e.id === id) ?? hostedToEvent(getHostedEvents().find((h) => h.id === id)) ?? EVENTS[0];

function hostedToEvent(h?: HostedEventRecord): EventItem | undefined {
  if (!h) return undefined;
  return {
    id: h.id,
    name: h.name,
    date: h.date,
    time: h.time,
    venue: h.venue,
    city: h.city,
    crowd: 0,
    crowdLevel: "Low",
    status: "Upcoming",
    services: h.services,
    tags: ["Hosted"],
    gradient: "from-pulse-500/35 via-orange-500/25 to-amber-500/30",
    icon: Sparkles,
    poster: h.image,
    price: h.price,
    category: h.category,
  };
}

  const goBook = () => {
    setEvent(ev);
    navigate("/app/intent", { state: { bookEvent: true } });
  };

  const goBack = () => navigate("/app/discover");

  const publishedVenue = getPublishedVenueMap(ev.id);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero poster ── */}
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[360px] w-full md:h-[440px]">
          <img src={ev.poster} alt={ev.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />
          <button
            onClick={goBack}
            className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-black/70"
          >
            <ArrowLeft className="h-4 w-4" /> Back to events
          </button>
          <div className="absolute bottom-6 left-0 right-0 px-5 md:px-10">
            <div className="mx-auto max-w-7xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Pill tone="red">{ev.status === "Live" ? "LIVE" : ev.status === "High Demand" ? "HIGH DEMAND" : "UPCOMING"}</Pill>
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  {ev.category}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold text-white leading-tight md:text-5xl">{ev.name}</h1>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body ── */}
      <section className="mx-auto max-w-7xl px-5 py-8 md:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Left: details */}
          <div>
            {/* When / where cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                  <CalendarDays className="h-5 w-5 text-pulse-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">When</div>
                  <div className="mt-0.5 text-sm font-semibold text-gray-900">{ev.date}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" /> {ev.time}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                  <MapPin className="h-5 w-5 text-pulse-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Where</div>
                  <div className="mt-0.5 text-sm font-semibold text-gray-900">{ev.venue}</div>
                  <div className="text-xs text-gray-500">{ev.city}</div>
                </div>
              </div>
            </div>

            {/* About */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900">About the event</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {ev.name} is one of the most anticipated events of the season at {ev.venue}, drawing an expected
                crowd of {ev.crowd.toLocaleString()}. EventPulse has pre-verified mobility capacity and bundled
                services to ensure a smooth, stress-free arrival — no matter how big the crowd gets.
              </p>
            </div>

            {/* Crowd & capacity */}
            <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar className="h-4 w-4 text-pulse-600" />
                  <span className="text-sm font-semibold text-gray-900">Expected crowd load</span>
                </div>
                <span className={cn(
                  "text-sm font-bold",
                  ev.crowdLevel === "Critical" ? "text-red-600" : ev.crowdLevel === "High" ? "text-amber-600" : "text-teal-600"
                )}>
                  {ev.crowdLevel}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Users className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div className={cn(
                    "h-full rounded-full",
                    ev.crowdLevel === "Critical" ? "bg-red-500" : ev.crowdLevel === "High" ? "bg-amber-500" : "bg-teal-500"
                  )} style={{ width: `${Math.min(100, (ev.crowd / 90000) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-900">{ev.crowd.toLocaleString()}</span>
              </div>
            </div>

            {/* Venue map (published by organizer) */}
            {publishedVenue && (
              <div className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Venue map & floor plan</h3>
                  <Link
                    to={`/app/event/${ev.id}/venue-map`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-pulse-600 transition hover:text-pulse-500"
                  >
                    Open full map <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100">
                  <VenueMapView image={publishedVenue.image!} pois={publishedVenue.pois} />
                </div>
                <div className="mt-3 flex items-start gap-2">
                  <MapIcon className="mt-0.5 h-4 w-4 shrink-0 text-pulse-600" />
                  <div className="flex-1">
                    <VenueLegend pois={publishedVenue.pois} />
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      Gates, fire exits and essentials as published by the organizer — fire exits are highlighted for safety.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Services */}
            <div className="mt-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Bundled services</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {ev.services.map((s) => (
                  <span key={s} className="flex items-center gap-1.5 rounded-full border border-pulse-600/20 bg-pulse-600/5 px-3.5 py-1.5 text-sm font-medium text-pulse-600">
                    <Building2 className="h-4 w-4" /> {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: book card */}
          <div>
            <div className="lg:sticky lg:top-28">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
              >
                <div className="border-b border-gray-100 p-5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <Ticket className="h-4 w-4" /> Tickets
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-bold text-gray-900">{ev.price}</div>
                      <div className="text-xs text-gray-400">per person</div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <div>Expected attendance</div>
                      <div className="text-sm font-semibold text-gray-900">{ev.crowd.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <button onClick={goBook} className={buttonCls("primary", "lg", "w-full")}>
                    Book Now <ArrowRight className="h-4 w-4" />
                  </button>
                  <button onClick={goBook} className={cn(buttonCls("outline", "md"), "mt-3 w-full")}>
                    Plan my journey with AI
                  </button>

                  <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-xs leading-relaxed text-emerald-700">
                      Mobility capacity pre-verified for this event. Secure your tickets, travel, and stay through
                      EventPulse.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
