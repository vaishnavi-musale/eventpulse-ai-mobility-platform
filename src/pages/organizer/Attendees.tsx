import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  BedDouble,
  Bus,
  CheckCircle2,
  ChevronDown,
  CircleUser,
  Crown,
  Download,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  ShieldCheck,
  Ticket,
  UserCheck2,
  UserRound,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { buttonCls, Pill } from "@/components/ui";
import { GBadge } from "@/components/glevels";
import { EVENTS } from "@/data/mock";
import type { Attendee as AttendeeT } from "@/data/mock";
import { GATE_OPTIONS, STATUS_META, compact, useOrganizer } from "@/pages/organizer/state";
import { cn } from "@/utils/cn";

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const palette = ["bg-pulse-600/15 text-pulse-700", "bg-teal-600/15 text-teal-700", "bg-emerald-600/15 text-emerald-700", "bg-violet-600/15 text-violet-700", "bg-amber-600/15 text-amber-700"];
  return palette[h % palette.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AttendeeRow({ a }: { a: AttendeeT }) {
  const [open, setOpen] = useState(false);
  const { checkInAttendee, cancelAttendee, reissue } = useOrganizer();
  const meta = STATUS_META[a.status];
  const isSeeded = a.eventId === EVENTS[0].id;
  return (
    <div className="overflow-hidden rounded-2xl border border-wandor-text/8 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-wandor-text/[0.02]"
      >
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold", avatarColor(a.name))}>
          {initials(a.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-wandor-text">{a.name}</span>
            <span className="hidden text-[11px] font-semibold text-wandor-muted sm:inline">{a.age} yrs</span>
            {(a.gLevel === "G5" || a.gLevel === "G3") && <Crown className="h-3.5 w-3.5 text-amber-500" />}
            <span className="hidden sm:inline"><GBadge level={a.gLevel} size="sm" showLabel={false} /></span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-wandor-muted">
            <span className="font-semibold text-wandor-text/70">{a.id}</span>
            <span>·</span>
            <span>{a.slot}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{a.city}</span>
          </div>
        </div>
        <div className="hidden shrink-0 text-right md:block">
          <div className="text-xs font-bold text-wandor-text">{compact(a.booking.total)}</div>
          <div className="text-[10px] text-wandor-muted">{a.booking.tickets} ticket{a.booking.tickets > 1 ? "s" : ""}</div>
        </div>
        <Pill tone={meta.tone}>{meta.label}</Pill>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-wandor-muted transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 border-t border-wandor-text/5 bg-wandor-text/[0.015] p-4 md:grid-cols-3">
              <div className="space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Attendee</div>
                <div className="flex items-center gap-2 text-sm font-semibold text-wandor-text"><CircleUser className="h-4 w-4 text-pulse-600" />{a.name}</div>
                <div className="flex items-center gap-2 text-xs text-wandor-muted"><Phone className="h-3.5 w-3.5" />{a.phone}</div>
                <div className="flex items-center gap-2 text-xs text-wandor-muted"><Mail className="h-3.5 w-3.5" />{a.email}</div>
                <div className="flex items-center gap-2 text-xs text-wandor-muted"><MapPin className="h-3.5 w-3.5" />{a.city} · joined {a.joined}</div>
                <div className="flex items-center gap-2 text-xs text-wandor-muted"><UserRound className="h-3.5 w-3.5" />Gate {a.gate} · {a.seating}</div>
                <div className="flex items-center gap-2 text-xs text-wandor-muted"><ShieldCheck className="h-3.5 w-3.5" />Commitment level <GBadge level={a.gLevel} size="sm" /></div>
              </div>

              <div className="space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Bookings</div>
                <div className="flex items-center justify-between rounded-xl border border-wandor-text/8 bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-wandor-text"><Ticket className="h-4 w-4 text-pulse-600" />Tickets · {a.booking.slot}</div>
                  <span className="text-sm font-bold text-wandor-text">₹{compact(a.booking.ticketAmt)}</span>
                </div>
                {a.booking.transport ? (
                  <div className="flex items-center justify-between rounded-xl border border-wandor-text/8 bg-white px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-wandor-text"><Bus className="h-4 w-4 text-teal-700" />{a.booking.transport.mode} · {a.booking.transport.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-wandor-text">₹{compact(a.booking.transport.price)}</span>
                      <Pill tone={a.booking.transport.status === "fulfilled" ? "green" : "cyan"}>{a.booking.transport.status}</Pill>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-wandor-text/15 px-3 py-2.5 text-xs text-wandor-muted">No transport booked</div>
                )}
                {a.booking.hotel ? (
                  <div className="flex items-center justify-between rounded-xl border border-wandor-text/8 bg-white px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-wandor-text"><BedDouble className="h-4 w-4 text-amber-700" />{a.booking.hotel.name} · {a.booking.hotel.nights}n</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-wandor-text">₹{compact(a.booking.hotel.price)}</span>
                      <Pill tone={a.booking.hotel.status === "fulfilled" ? "green" : "cyan"}>{a.booking.hotel.status}</Pill>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-wandor-text/15 px-3 py-2.5 text-xs text-wandor-muted">No hotel booked</div>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Payment</div>
                <div className="rounded-xl border border-wandor-text/8 bg-white p-3">
                  <div className="flex items-center justify-between text-xs text-wandor-muted">
                    <span>Total payable</span><span className="font-bold text-wandor-text">₹{compact(a.booking.total)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-wandor-muted">
                    <span>Gateway</span><span className="inline-flex items-center gap-1 font-semibold text-wandor-text"><Wallet className="h-3.5 w-3.5" />{a.booking.gateway}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-wandor-muted">
                    <span>Reference</span><span className="font-mono font-semibold text-wandor-text">{a.booking.reference}</span>
                  </div>
                </div>
                <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold", a.booking.paid ? "bg-emerald-600/[0.06] text-emerald-700" : "bg-amber-600/[0.08] text-amber-700")}>
                  <Banknote className="h-4 w-4" />
                  {a.booking.paid ? "Payment received" : "Payment outstanding / refunded"}
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-wandor-text/8 bg-white px-3 py-2.5 text-xs text-wandor-muted">
                  <CheckCircle2 className="h-4 w-4 text-pulse-600" />
                  Check-in: {a.checkedInAt ?? "Not yet checked in"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:col-span-3">
                {a.status !== "checked-in" && a.status !== "cancelled" && (
                  <button className={buttonCls("success", "sm")} onClick={() => checkInAttendee(a.id)}>
                    <UserCheck2 className="h-3.5 w-3.5" /> Check in now
                  </button>
                )}
                {a.status !== "cancelled" && (
                  <button className={buttonCls("danger", "sm")} onClick={() => cancelAttendee(a.id)}>
                    <Banknote className="h-3.5 w-3.5" /> Cancel & refund
                  </button>
                )}
                <button className={buttonCls("ghost", "sm")} onClick={() => reissue(a.id)}>
                  <RefreshCcw className="h-3.5 w-3.5" /> Reissue token
                </button>
                {!isSeeded && (
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-wandor-muted">
                    Managed from host intake
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Attendees() {
  const { eventId, attendees, summary } = useOrganizer();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendeeT["status"]>("all");
  const [gate, setGate] = useState("All Gates");

  const filtered = useMemo(() => {
    return attendees.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (gate !== "All Gates" && a.gate !== gate) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    });
  }, [attendees, query, statusFilter, gate]);

  const exportRoster = () => {
    const rows = [["ID", "Name", "Age", "City", "Slot", "Gate", "Status", "G-Level", "Total", "Paid", "Reference"]];
    filtered.forEach((a) =>
      rows.push([a.id, a.name, String(a.age), a.city, a.booking.slot, a.gate, a.status, a.gLevel, String(a.booking.total), a.booking.paid ? "Yes" : "No", a.booking.reference])
    );
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventId}-roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Managed roster · ticketed operations</div>
            <div className="mt-0.5 text-[10px] font-semibold text-wandor-muted">Tap a row for the full breakdown + actions</div>
          </div>
          <button className={buttonCls("outline", "sm")} onClick={exportRoster}>
            <Download className="h-3.5 w-3.5" /> Export roster
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, city, or email…"
              className="h-11 w-full rounded-full border border-wandor-text/12 bg-white pl-10 pr-4 text-sm text-wandor-text outline-none transition focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "checked-in", "arriving", "pending", "cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition",
                  statusFilter === s ? "border-wandor-dark bg-wandor-dark text-white" : "border-wandor-text/15 bg-white text-wandor-muted hover:border-wandor-text/30"
                )}
              >
                {s === "all" ? "All" : STATUS_META[s].label}
              </button>
            ))}
            {GATE_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGate(g)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition",
                  gate === g ? "border-pulse-600 bg-pulse-600 text-white" : "border-wandor-text/15 bg-white text-wandor-muted hover:border-wandor-text/30"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="font-semibold text-wandor-muted">
            Showing <span className="font-bold text-wandor-text">{filtered.length}</span> of {attendees.length} managed records · capacity {summary.soldOutPct}%
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-wandor-muted sm:block">
            G5 · G3 · G2 · G1 commitments
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          <AnimatePresence>
            {filtered.map((a) => (
              <motion.div key={a.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AttendeeRow a={a} />
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-wandor-text/15 bg-white py-14 text-center text-sm text-wandor-muted">
              No attendees match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}