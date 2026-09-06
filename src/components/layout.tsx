import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarCheck2, Compass, Home, LayoutGrid, Search, UserRound, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";

/* ---------------- Logo ---------------- */

export function Logo({ small, withTagline = false }: { small?: boolean; withTagline?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-105" style={{ background: "conic-gradient(from 0deg, #23877D, #B96843, #e07a8a, #23877D)", padding: "2px" }}>
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[#FAF8F3]">
          <svg viewBox="0 0 100 100" className="h-5 w-5">
            <path d="M12 52h18l9-26 14 48 12-22h23" stroke="#23877D" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      {!small && (
        <span className="font-display text-[22px] font-semibold leading-none text-wandor-text tracking-tight">
          eventpulse
        </span>
      )}
      {withTagline && !small && (
        <>
          <span className="ml-2 h-8 w-px bg-wandor-text/15" />
          <span className="ml-2 hidden text-[9px] font-bold uppercase leading-[1.35] tracking-[0.18em] text-wandor-muted xl:block">
            EVENTS FLOW<br />PEOPLE FURTHER
          </span>
        </>
      )}
    </Link>
  );
}

/* ---------------- Marketing navbar ---------------- */

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links: { label: string; scroll?: string; to?: string; id?: string }[] = [
    { label: "How It Works", scroll: "how", id: "how" },
    { label: "Live Events", scroll: "events", id: "events" },
    { label: "My Bookings", to: "/app/account/bookings" },
    { label: "For Organizers", to: "/admin/organizer" },
  ];
  const go = (l: { label: string; scroll?: string; to?: string }) => {
    if (l.scroll) document.getElementById(l.scroll)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  const isActive = (l: { to?: string; id?: string }) => {
    if (l.to) return location.pathname === l.to;
    return false;
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-shadow duration-300",
        scrolled
          ? "border-card-border bg-card/95 shadow-[0_2px_16px_rgba(23,25,24,0.06)] backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Logo withTagline />
        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                className={cn(
                  "nav-link text-[13px] font-semibold tracking-[0.02em] transition-colors duration-200",
                  isActive(l) ? "active text-wandor-text" : "text-wandor-muted hover:text-wandor-text"
                )}
              >
                {l.label}
              </Link>
            ) : (
              <button
                key={l.label}
                onClick={() => go(l)}
                className={cn(
                  "nav-link text-[13px] font-semibold tracking-[0.02em] transition-colors duration-200",
                  isActive(l) ? "active text-wandor-text" : "text-wandor-muted hover:text-wandor-text"
                )}
              >
                {l.label}
              </button>
            )
          )}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-wandor-text/15 text-wandor-muted transition-colors hover:border-wandor-text/30 hover:text-wandor-text" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/app/account/profile"
            className="inline-flex h-9 items-center rounded-full border border-wandor-text/20 px-4 text-[13px] font-semibold text-wandor-text transition-all hover:bg-wandor-text/5"
          >
            Login
          </Link>
          <Link to="/app/discover" className="inline-flex items-center gap-2 rounded-full bg-wandor-dark px-5 py-2.5 text-[13px] font-semibold text-[#FAF8F3] transition-all hover:bg-[#232e2c] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] active:scale-95">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <button onClick={() => setOpen(!open)} className="lg:hidden" aria-label="Menu">
          <LayoutGrid className="h-5 w-5 text-wandor-text" />
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-card-border lg:hidden"
          >
            {links.map((l) =>
              l.to ? (
                <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="block px-5 py-3 text-sm font-semibold text-wandor-text hover:bg-wandor-text/5">
                  {l.label}
                </Link>
              ) : (
                <button key={l.label} onClick={() => go(l)} className="block w-full px-5 py-3 text-left text-sm font-semibold text-wandor-text hover:bg-wandor-text/5">
                  {l.label}
                </button>
              )
            )}
            <div className="flex gap-2 px-5 py-4">
              <Link to="/app/discover" className={buttonClsL("primary", "sm", "flex-1")}>Get Started</Link>
              <Link to="/app/account/profile" className={buttonClsL("subtle", "sm", "flex-1")}>Login</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function buttonClsL(variant: "primary" | "ghost" | "subtle" = "primary", size: "sm" | "md" = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 cursor-pointer active:scale-95 whitespace-nowrap",
    size === "sm" ? "h-9 px-4 text-xs" : "h-10 px-5 text-sm",
    variant === "primary" && "bg-[#B96843] text-white hover:bg-[#18201F] shadow-[0_2px_10px_rgba(185,104,67,0.25)]",
    variant === "ghost" && "text-wandor-muted hover:text-wandor-text hover:bg-wandor-text/5",
    variant === "subtle" && "bg-wandor-text/[0.05] text-wandor-text hover:bg-wandor-text/10 border border-wandor-text/10",
    className
  );
}

/* ---------------- Demo stages ---------------- */

export const STAGES = [
  { label: "Discover", path: "/app/discover" },
  { label: "Intent", path: "/app/intent" },
  { label: "Options", path: "/app/options" },
  { label: "Verify", path: "/app/verify" },
  { label: "Offer", path: "/app/offer" },
  { label: "Confirm", path: "/app/confirm" },
  { label: "Journey", path: "/app/journey" },
  { label: "Deliver", path: "/app/verify-service" },
  { label: "Feedback", path: "/app/feedback" },
];

export function DemoStepper({ compact }: { compact?: boolean }) {
  const { pathname } = useLocation();
  const current = STAGES.findIndex((s) => pathname.startsWith(s.path));
  return (
    <div className={cn("no-scrollbar flex items-center gap-1 overflow-x-auto", compact ? "px-3" : "px-4")}>
      {STAGES.map((s, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <Link
            key={s.path}
            to={s.path}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
              active
                ? "border-pulse-600/40 bg-pulse-600/10 text-pulse-600 shadow-sm"
                : done
                  ? "border-emerald-600/25 bg-emerald-600/10 text-emerald-700"
                  : "border-wandor-text/10 bg-white text-wandor-muted hover:text-wandor-text"
            )}
          >
            {done ? <CalendarCheck2 className="h-3 w-3" /> : <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px]", active ? "bg-pulse-500 text-white" : "bg-wandor-text/10")}>{i + 1}</span>}
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ---------------- App shell (all /app pages) ---------------- */

export function AppNav({ right, floating }: { right?: React.ReactNode; floating?: boolean }) {
  const navigate = useNavigate();
  const links: { label: string; to: string }[] = [
    { label: "How It Works", to: "/" },
    { label: "Live Events", to: "/app/discover" },
    { label: "My Bookings", to: "/app/account/bookings" },
  ];
  const navBtn = "bg-transparent border-none cursor-pointer font-sans text-[15px] font-medium uppercase text-wandor-text tracking-[0.04em] transition-opacity hover:opacity-55";
  return (
    <header className={cn("z-40", floating ? "absolute inset-x-0 top-0" : "sticky top-0")}>
      <div className={cn("mx-auto max-w-7xl px-5 md:px-8", floating ? "py-4" : "pt-4")}>
        <div
          className={cn(
            "flex items-center gap-6 rounded-full border px-5 py-3 shadow-sm backdrop-blur-xl md:py-3.5",
            floating
              ? "border-white/70 bg-white/75 shadow-[0_10px_36px_rgba(0,0,0,0.22)]"
              : "border-wandor-text/10 bg-white/80"
          )}
        >
          <button onClick={() => navigate("/")} className="bg-transparent border-none cursor-pointer font-type text-[28px] leading-none text-wandor-text select-none md:text-[32px]">
            eventpulse
          </button>
          <div className="hidden md:flex items-center gap-6 ml-1">
            {links.map((l) => (
              <button key={l.label} onClick={() => navigate(l.to)} className={navBtn}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={() => navigate("/app/account/profile")} className={cn(navBtn, "font-semibold text-[#292929]")}>
              Login
            </button>
            {right ?? (
              <button onClick={() => navigate("/app/discover")} className="bg-wandor-dark text-[#FAF8F3] border-none cursor-pointer font-sans text-[14px] font-medium uppercase tracking-[0.04em] px-4 py-2 rounded-full transition-all hover:bg-[#232e2c] active:scale-95">
                Plan My Trip
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <div className="hidden md:block">
        {!pathname.startsWith("/app/discover") && <AppNav />}
      </div>
      <Outlet />

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-wandor-text/10 bg-white/95 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5">
          {[
            { icon: Home, label: "Home", to: "/" },
            { icon: Compass, label: "Explore", to: "/app/discover" },
            { icon: Zap, label: "Journey", to: "/app/journey" },
            { icon: CalendarCheck2, label: "Bookings", to: "/app/account/bookings" },
            { icon: UserRound, label: "Profile", to: "/app/account/profile" },
          ].map((m) => (
            <NavLink
              key={m.label}
              to={m.to}
              end={m.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition",
                  isActive ? "text-pulse-600" : "text-wandor-muted"
                )
              }
            >
              <m.icon className="h-5 w-5" />
              {m.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ---------------- Footer ---------------- */

export function Footer() {
  return (
    <footer className="border-t border-wandor-text/5 bg-ink-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-wandor-muted">
            AI-powered event mobility and service orchestration. Every commitment carries a verified reliability level — not a promise, a fact.
          </p>
        </div>
        {[
          { h: "Product", items: ["How It Works", "Live Journey", "G-Level System", "Capacity Verification"] },
          { h: "Platform", items: ["For Organizers", "Admin Command Center", "Provider Network", "API & Integrations"] },
          { h: "Company", items: ["About", "Careers", "Trust & Safety", "Contact"] },
        ].map((c) => (
          <div key={c.h}>
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-wandor-muted">{c.h}</div>
            <ul className="space-y-2.5">
              {c.items.map((i) => (
                <li key={i}>
                  {i === "For Organizers" ? (
                    <Link to="/admin/organizer" className="text-sm text-wandor-muted/80 transition hover:text-wandor-text">
                      {i}
                    </Link>
                  ) : (
                    <button className="text-sm text-wandor-muted/80 transition hover:text-wandor-text">{i}</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-wandor-text/5 py-5 text-center text-xs text-wandor-muted/70">
        © 2026 EventPulse · Built for Smart India Hackathon · Don't just predict — commit responsibly.
      </div>
    </footer>
  );
}
