import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarDays, MapPin, Search, SearchX, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EVENTS, getHostedEvents, type EventItem, type HostedEventRecord } from "@/data/mock";
import { useStore } from "@/store";
import { AppNav } from "@/components/layout";
import { buttonCls, EmptyState, LivePill, Skeleton } from "@/components/ui";
import { cn } from "@/utils/cn";

function hostedToEvent(h: HostedEventRecord): EventItem {
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

const CATEGORIES = [
  { label: "All", icon: "✨" },
  { label: "Music", icon: "🎵" },
  { label: "Sports", icon: "⚽" },
  { label: "Conference", icon: "💼" },
  { label: "Festival", icon: "🎉" },
];

export default function Discovery() {
  const navigate = useNavigate();
  const { setEvent } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, []);

  const events = useMemo(() => {
    const all = [...EVENTS, ...getHostedEvents().map(hostedToEvent)];
    return all.filter((e) => {
      const q = query.toLowerCase();
      const matchQ = !q || e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q) || e.city.toLowerCase().includes(q);
      const matchF = filter === "All" || e.category === filter || (filter === "All");
      return matchQ && matchF;
    });
  }, [query, filter]);

  const featured = EVENTS[0];

  return (
    <div className="min-h-screen bg-ink-950">
      {/* ── Featured Hero ── */}
      <section className="relative w-full overflow-hidden">
        <AppNav floating />
        <div className="relative h-[460px] w-full md:h-[560px]">
          <img
            src={featured.poster}
            alt={featured.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

          <div className="relative z-10 flex h-full items-end pb-10 px-5 md:px-10 lg:px-16">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <LivePill label={featured.status === "Live" ? "LIVE" : "UPCOMING"} />
                <span className="rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-white">
                  {featured.category}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold text-white md:text-5xl leading-tight">
                {featured.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {featured.date} · {featured.time}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {featured.venue}, {featured.city}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-lg font-bold text-white">{featured.price}</span>
                <button
                  onClick={() => {
                    setEvent(featured);
                    navigate(`/app/event/${featured.id}`);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-card px-6 py-3 text-sm font-bold text-wandor-dark transition-all hover:bg-card/90 active:scale-95"
                >
                  Plan My Journey <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search ── */}
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, venues, cities…"
            className="h-12 w-full rounded-xl border border-card-border bg-card pl-11 pr-4 text-sm text-wandor-text placeholder:text-wandor-muted outline-none transition focus:border-wandor-text/30 focus:ring-2 focus:ring-wandor-text/10"
          />
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="mx-auto max-w-7xl px-4 pb-6 md:px-8">
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setFilter(cat.label)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all",
                filter === cat.label
                  ? "border-wandor-dark bg-wandor-dark text-white shadow-sm"
                  : "border-card-border bg-card text-wandor-muted hover:border-wandor-text/30 hover:text-wandor-text"
              )}
            >
              <span className="text-base">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── All Events heading ── */}
      <section className="mx-auto max-w-7xl px-4 pb-4 md:px-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-wandor-text/20 to-transparent" />
          <h2 className="whitespace-nowrap text-xl font-semibold text-wandor-text">All Events</h2>
          <div className="h-px flex-1 bg-gradient-to-l from-wandor-text/20 to-transparent" />
        </div>
      </section>

      {/* ── Event Grid ── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-card-border">
                <Skeleton className="h-[340px] rounded-none rounded-t-2xl" />
                <div className="space-y-2.5 p-3">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No events match"
            desc="Try a different keyword or filter."
            action={
              <button
                className={buttonCls("subtle", "sm")}
                onClick={() => { setQuery(""); setFilter("All"); }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {events.map((ev, i) => (
                <motion.div
                  layout
                  key={ev.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  onClick={() => {
                    setEvent(ev);
                    navigate(`/app/event/${ev.id}`);
                  }}
                  className="group cursor-pointer overflow-hidden rounded-2xl card-surface transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(23,25,24,0.08)]"
                >
                  {/* Poster image */}
                  <div className="relative h-[340px] overflow-hidden">
                    <img
                      src={ev.poster}
                      alt={ev.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3">
                      <LivePill
                        label={
                          ev.status === "Live"
                            ? "LIVE"
                            : ev.status === "High Demand"
                              ? "HIGH DEMAND"
                              : "UPCOMING"
                        }
                      />
                    </div>
                    {ev.status !== "Live" && (
                      <div className="absolute right-3 top-3 rounded-lg bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-white">
                        {ev.category}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <div className="text-[13px] font-medium text-wandor-muted">
                      {ev.date} · {ev.time}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold leading-snug text-wandor-text line-clamp-2">
                      {ev.name}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-1 text-sm font-medium text-wandor-muted">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{ev.venue}, {ev.city}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-wandor-text">{ev.price}</span>
                      <span className="flex items-center gap-1 text-xs font-medium text-wandor-muted">
                        <Users className="h-3.5 w-3.5" />
                        {ev.crowd.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
