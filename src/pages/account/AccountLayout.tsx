import { Bell, LifeBuoy, Settings, Ticket, UserRound, Wallet, type LucideIcon } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/utils/cn";

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/app/account/profile", label: "My Profile", icon: UserRound },
  { to: "/app/account/bookings", label: "My Bookings", icon: Ticket },
  { to: "/app/account/wallet", label: "Wallet & Payments", icon: Wallet },
  { to: "/app/account/notifications", label: "Notifications", icon: Bell },
  { to: "/app/account/settings", label: "Settings", icon: Settings },
  { to: "/app/account/support", label: "Help & Support", icon: LifeBuoy },
];

export default function AccountLayout() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">
      <div className="gap-6 md:grid md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <div className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.25em] text-wandor-muted md:block">
            My Account
          </div>
          <nav className="hidden flex-col gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition",
                    isActive ? "bg-wandor-dark text-white" : "text-wandor-muted hover:bg-wandor-text/5 hover:text-wandor-text"
                  )
                }
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto md:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition",
                    isActive ? "border-wandor-dark bg-wandor-dark text-white" : "border-wandor-text/15 bg-white text-wandor-muted"
                  )
                }
              >
                <n.icon className="h-3.5 w-3.5" /> {n.label.replace(" & Payments", "").replace("My ", "")}
              </NavLink>
            ))}
          </div>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}