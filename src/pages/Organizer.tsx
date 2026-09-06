import { Banknote, Gauge, LayoutDashboard, Map, Radar, ShieldCheck, UserCheck2, Users2, type LucideIcon } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "@/components/layout";
import { LivePill, Pill } from "@/components/ui";
import { EVENTS } from "@/data/mock";
import { MODE_META, OrganizerProvider, useOrganizer } from "@/pages/organizer/state";
import { cn } from "@/utils/cn";

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "overview", label: "Overview", icon: LayoutDashboard },
  { to: "whereabouts", label: "Whereabouts", icon: Radar },
  { to: "venue-map", label: "Venue Map", icon: Map },
  { to: "check-in", label: "Check-in", icon: UserCheck2 },
  { to: "capacity", label: "Capacity", icon: Gauge },
  { to: "attendees", label: "Attendees", icon: Users2 },
  { to: "escrow", label: "Escrow & Ledger", icon: Banknote },
  { to: "mode", label: "Mode & Alerts", icon: ShieldCheck },
];

function NavList({ vertical = false }: { vertical?: boolean }) {
  return (
    <>
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) =>
            cn(
              vertical
                ? "flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition"
                : "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition",
              isActive
                ? vertical
                  ? "bg-wandor-dark text-white"
                  : "border-wandor-dark bg-wandor-dark text-white"
                : vertical
                  ? "text-wandor-muted hover:bg-wandor-text/5 hover:text-wandor-text"
                  : "border-wandor-text/15 bg-white text-wandor-muted hover:border-wandor-text/30"
            )
          }
        >
          <n.icon className="h-4 w-4" /> {n.label}
        </NavLink>
      ))}
    </>
  );
}

function OrganizerShell() {
  const { events, eventId, selectEvent, appliedMode } = useOrganizer();

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <header className="sticky top-0 z-50 border-b border-wandor-text/5 bg-white/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden rounded-full border border-wandor-text/10 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-wandor-muted sm:block">
              Organizer Portal
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <Pill tone={MODE_META[appliedMode].tone} className="hidden lg:inline-flex">
              {MODE_META[appliedMode].label}
            </Pill>
            {eventId === EVENTS[0].id ? <LivePill label="LIVE" /> : <Pill tone="cyan">PRE-EVENT</Pill>}
            <label className="hidden w-[240px] sm:block">
              <select
                value={eventId}
                onChange={(e) => selectEvent(e.target.value)}
                className="h-9 w-full rounded-full border border-wandor-text/12 bg-white px-3 text-xs font-semibold text-wandor-text outline-none focus:border-pulse-500"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="md:flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-1 border-r border-wandor-text/5 px-3 py-5 md:flex">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-wandor-muted">Manage</div>
          <NavList vertical />
          <div className="mt-auto space-y-1">
            <select
              value={eventId}
              onChange={(e) => selectEvent(e.target.value)}
              className="w-full rounded-2xl border border-wandor-text/12 bg-white px-3 py-2.5 text-xs font-semibold text-wandor-text outline-none focus:border-pulse-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 px-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-wandor-muted">
              <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-500")} />
              Event scope · event-ops (organizer)
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-4 md:hidden">
            <NavList />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function Organizer() {
  return (
    <OrganizerProvider>
      <OrganizerShell />
    </OrganizerProvider>
  );
}