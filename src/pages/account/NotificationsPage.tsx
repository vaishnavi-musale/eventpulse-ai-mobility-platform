import { useState } from "react";
import { AlertTriangle, BellOff, BellRing, CheckCircle2, ShieldCheck, Sparkles, Ticket, type LucideIcon } from "lucide-react";
import { useNotif } from "@/components/Notifications";
import { buttonCls, Pill } from "@/components/ui";
import { cn } from "@/utils/cn";

interface Notif {
  icon: LucideIcon;
  tone: string;
  title: string;
  body: string;
  time: string;
}

const SEED: Notif[] = [
  { icon: CheckCircle2, tone: "bg-emerald-600/10 text-emerald-700", title: "Commitment delivered early", body: "Metro + Reserved Shuttle reached Gate A at 6:48 PM — 12 min before target. +20 EP points.", time: "Today, 6:52 PM" },
  { icon: Sparkles, tone: "bg-pulse-600/10 text-pulse-600", title: "Faster route suggested for City Marathon", body: "Priority Shuttle B is now averaging 4 min faster at the same fare — re-route when booking.", time: "Today, 9:10 AM" },
  { icon: ShieldCheck, tone: "bg-violet-600/10 text-violet-700", title: "Reliability credit issued", body: "Your G3 commitment on Aug 30 arrived 9 min late — ₹40 credited automatically. No forms needed.", time: "Sep 01, 4:22 PM" },
  { icon: AlertTriangle, tone: "bg-amber-600/10 text-amber-700", title: "Metro Line 1 delay window cleared", body: "Earlier congestion resolved — your 6:20 PM slot stays inside the guaranteed window.", time: "Aug 24, 6:31 PM" },
  { icon: Ticket, tone: "bg-teal-600/10 text-teal-700", title: "Upcoming: Mumbai Music Festival", body: "Departure window 6:10–6:20 PM · boarding at Metro Station B · shuttle seat S-114 reserved.", time: "Aug 21, 12:00 PM" },
];

export default function NotificationsPage() {
  const { notify } = useNotif();
  const [items, setItems] = useState<Notif[]>(SEED);
  const [readIds, setReadIds] = useState<number[]>([]);
  const unread = items.length - readIds.length;

  const markAll = () => {
    setReadIds(items.map((_, i) => i));
    notify("info", "All marked as read", `${items.length} notifications marked read.`);
  };

  const clearAll = () => {
    setItems([]);
    setReadIds([]);
    notify("info", "Inbox cleared", "Try the demo flows again to generate fresh notifications.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">Activity</div>
          <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">Notifications</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-wandor-muted">
            Commitment nudges, compensation credits and route refreshes — each one earned, none spam.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && <Pill tone="red" className="uppercase">{unread} new</Pill>}
          <button onClick={markAll} className={buttonCls("subtle", "sm")}>Mark all read</button>
          <button onClick={clearAll} className={buttonCls("ghost", "sm")}><BellOff className="h-3.5 w-3.5" /> Clear</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-wandor-text/15 px-6 py-16 text-center">
          <BellRing className="h-9 w-9 text-wandor-muted/50" />
          <div className="mt-3 text-sm font-bold text-wandor-text">You're all caught up</div>
          <div className="mt-1 max-w-sm text-xs text-wandor-muted">
            Book a commitment or trigger a demo disruption to see live notification flows here.
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((n, i) => {
            const read = readIds.includes(i);
            return (
              <button
                key={i}
                onClick={() => setReadIds((r) => (r.includes(i) ? r : [...r, i]))}
                className={cn(
                  "flex w-full items-start gap-3.5 rounded-3xl border p-4 text-left transition hover:border-pulse-600/30",
                  read ? "border-wandor-text/8 bg-white" : "border-pulse-600/25 bg-pulse-600/[0.04]"
                )}
              >
                <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.tone)}>
                  <n.icon className="h-4.5 w-4.5 h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-bold text-wandor-text">{n.title}</span>
                    {!read && <span className="h-2 w-2 shrink-0 rounded-full bg-pulse-600" />}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-wandor-muted">{n.body}</span>
                  <span className="mt-1 block text-[10px] font-semibold uppercase tracking-widest text-wandor-muted/70">{n.time}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}