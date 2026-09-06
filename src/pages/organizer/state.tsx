import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  SAMPLE_PLAN,
  SAMPLE_POIS,
  getVenueMap as loadVenue,
  saveVenueMap as persistVenue,
  type VenueConfig,
  type VenuePoi,
  type VenuePoiCategory,
} from "@/data/venueMap";
import {
  EVENTS,
  getEventAttendees,
  getOrganizerEvents,
  ORGANIZER_SUMMARY,
  type Attendee,
  type EventLite,
  type GLevel,
} from "@/data/mock";
import { useNotif } from "@/components/Notifications";
import { useStore, type OperatingMode } from "@/store";
import { emergencyRequest } from "@/api/backend";
import { useBackend } from "@/api/status";
import type { Tone } from "@/components/ui";

/* ================= Shared organizer constants ================= */

export const SLOTS = ["7:00 PM", "9:00 PM", "11:00 PM"] as const;
export const GATE_OPTIONS = ["All Gates", "Gate A", "Gate B", "Gate C", "Gate D"];
export const VENUE_SOLD: Record<string, number> = { "7:00 PM": 4100, "9:00 PM": 3700, "11:00 PM": 2900 };
export const SEED_CAPS: Record<string, number> = { "7:00 PM": 4200, "9:00 PM": 3800, "11:00 PM": 3000 };
export const SEED_HELD: Record<string, number> = { "7:00 PM": 64, "9:00 PM": 98, "11:00 PM": 41 };

type AttendeeStatus = Attendee["status"];

export const STATUS_META: Record<AttendeeStatus, { tone: "green" | "cyan" | "amber" | "gray"; label: string }> = {
  "checked-in": { tone: "green", label: "Checked In" },
  arriving: { tone: "cyan", label: "Arriving" },
  pending: { tone: "amber", label: "Pending" },
  cancelled: { tone: "gray", label: "Cancelled" },
};

export const MODE_META: Record<OperatingMode, { tone: Tone; label: string; desc: string }> = {
  NORMAL: { tone: "green", label: "Normal", desc: "All services running on committed capacity." },
  DEGRADED: { tone: "amber", label: "Degraded", desc: "Some commitments downgraded — G-capping and escrow apply." },
  EMERGENCY: { tone: "red", label: "Emergency", desc: "Event-wide override active — safe-exit guidance pushed to attendees." },
  "PLATFORM-DEGRADED": { tone: "violet", label: "Platform Degraded", desc: "Calibration feeds degraded — all promises capped to best-effort." },
};

export interface LedgerRow {
  id: string;
  service: string;
  ref: string;
  level: GLevel;
  status: "Active" | "Downgraded";
  escrow: "Held" | "Fired";
  comp: number;
}

export const SEED_LEDGER: LedgerRow[] = [
  { id: "CMT-8F72A", service: "Pulse Shuttle S-121", ref: "RCPT-J0E8", level: "G5", status: "Active", escrow: "Held", comp: 120 },
  { id: "CMT-9B41C", service: "Metro Line 1 → Gate A", ref: "RCPT-7F2A", level: "G5", status: "Active", escrow: "Held", comp: 60 },
  { id: "CMT-2K17D", service: "The Oberoi – Marine", ref: "RCPT-3C5B", level: "G3", status: "Active", escrow: "Held", comp: 5200 },
  { id: "CMT-77M30", service: "Pulse Shuttle S-204", ref: "RCPT-G7B5", level: "G3", status: "Downgraded", escrow: "Fired", comp: 160 },
  { id: "CMT-51N88", service: "Hyatt Regency stay", ref: "RCPT-H8C6", level: "G2", status: "Active", escrow: "Held", comp: 4100 },
];

export interface FeedItem {
  text: string;
  at: string;
  by: string;
}

export { POI_CATEGORIES } from "@/data/venueMap";
export type { VenuePoi, VenuePoiCategory, VenueConfig } from "@/data/venueMap";
export { SAMPLE_PLAN, SAMPLE_POIS, getVenueMap, saveVenueMap, getPublishedVenueMap } from "@/data/venueMap";

const SEED_FEEDS: FeedItem[] = [
  { text: "Event onboarded to EventPulse — capacity snapshot synced.", at: "9:12 AM", by: "system" },
  { text: "Shuttle corridor B re-routed; 2 bookings re-verified at G5.", at: "10:04 AM", by: "event-ops" },
];

export function compact(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function nowTime() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function initSlotCaps(eventId: string) {
  return eventId === EVENTS[0].id ? { ...SEED_CAPS } : { "7:00 PM": 8, "9:00 PM": 7, "11:00 PM": 6 };
}

function initHeld(eventId: string) {
  return eventId === EVENTS[0].id ? { ...SEED_HELD } : { "7:00 PM": 1, "9:00 PM": 0, "11:00 PM": 2 };
}

function initLedger(eventId: string, attendees: Attendee[]): LedgerRow[] {
  if (eventId === EVENTS[0].id) return SEED_LEDGER.map((r) => ({ ...r }));
  return attendees.slice(0, 5).map((a, i) => ({
    id: `CMT-${a.id.replace("EP-", "").slice(0, 4)}${String.fromCharCode(65 + i)}`,
    service: a.booking.transport?.name ?? a.booking.hotel?.name ?? "Entry ticket",
    ref: a.booking.reference,
    level: a.gLevel,
    status: "Active",
    escrow: "Held",
    comp: a.booking.transport?.price ?? a.booking.hotel?.price ?? a.booking.ticketAmt,
  }));
}

export interface Stats {
  noShowPct: number;
  transportPct: number;
  hotelPct: number;
  paidPct: number;
  g5Pct: number;
  avg: number;
  projectedArrival: number;
}

/* ================= Arrival & whereabouts (aggregate, privacy-safe) ================= */

export type BandKey = "onsite" | "approach" | "enroute" | "awaited";

export const BAND_META: Record<BandKey, { label: string; range: string; desc: string }> = {
  onsite: { label: "On-site", range: "< 1 km", desc: "Inside the venue footprint — gate zones" },
  approach: { label: "Approach", range: "1–10 km", desc: "On the metro/shuttle corridor inbound" },
  enroute: { label: "En-route", range: "10–30 km", desc: "Trip started, still regional" },
  awaited: { label: "Not-departed", range: "> 30 km", desc: "Haven't left yet — waitlist lever" },
};

export interface WhereaboutsBand {
  key: BandKey;
  count: number;
  pct: number;
}

export interface Whereabouts {
  bands: WhereaboutsBand[];
  corridors: { name: string; count: number; pct: number }[];
  arrival: { label: string; count: number; g: "S" | "A" }[];
  consent: { contributed: number; withheld: number; pct: number };
}

function hashNum(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* ================= Context ================= */

interface OrganizerCtx {
  events: EventLite[];
  eventId: string;
  currentEvent: EventLite;
  selectEvent: (id: string) => void;
  attendees: Attendee[];
  patch: (id: string, p: Partial<Attendee>) => void;
  slotData: { s: string; sold: number; cap: number; held: number; pct: number }[];
  slotCaps: Record<string, number>;
  adjustCap: (slot: string, delta: number) => void;
  releaseHeld: (slot: string) => void;
  summary: typeof ORGANIZER_SUMMARY;
  stats: Stats;
  whereabouts: Whereabouts;
  ledger: LedgerRow[];
  downgrade: (id: string) => void;
  escrow: { firedTotal: number; fundedTotal: number; pct: number };
  feeds: FeedItem[];
  sendBroadcast: (text: string) => void;
  pushSafeExit: () => void;
  localMode: OperatingMode;
  setLocalMode: (m: OperatingMode) => void;
  appliedMode: OperatingMode;
  reason: string;
  setReason: (s: string) => void;
  reasonErr: boolean;
  setReasonErr: (b: boolean) => void;
  expiry: string;
  setExpiry: (s: string) => void;
  applyMode: () => void;
  checkInAttendee: (id: string) => void;
  cancelAttendee: (id: string) => void;
  reissue: (id: string) => void;
  venue: VenueConfig;
  setVenueImage: (image: string | null) => void;
  addPoi: (category: VenuePoiCategory, x: number, y: number, label: string) => void;
  movePoi: (id: string, x: number, y: number) => void;
  updatePoi: (id: string, patch: Partial<Pick<VenuePoi, "label" | "category">>) => void;
  removePoi: (id: string) => void;
  clearPois: () => void;
  togglePublished: () => void;
  useSamplePlan: () => void;
}

const Ctx = createContext<OrganizerCtx | null>(null);

export function useOrganizer(): OrganizerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOrganizer outside OrganizerProvider");
  return c;
}

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const { setMode } = useStore();
  const { status: backendStatus } = useBackend();
  const { notify } = useNotif();

  const events = useMemo(() => getOrganizerEvents(), []);
  const [eventId, setEventId] = useState(events[0]?.id ?? EVENTS[0].id);
  const base = useMemo(() => getEventAttendees(eventId), [eventId]);
  const [patches, setPatches] = useState<Record<string, Partial<Attendee>>>({});
  const attendees = useMemo(() => base.map((a) => ({ ...a, ...patches[a.id] })), [base, patches]);

  const [slotCaps, setSlotCaps] = useState<Record<string, number>>(() => initSlotCaps(eventId));
  const [held, setHeld] = useState<Record<string, number>>(() => initHeld(eventId));
  const [ledger, setLedger] = useState<LedgerRow[]>(() => initLedger(eventId, base));
  const [feeds, setFeeds] = useState<FeedItem[]>(SEED_FEEDS);
  const [localMode, setLocalMode] = useState<OperatingMode>("NORMAL");
  const [appliedMode, setAppliedMode] = useState<OperatingMode>("NORMAL");
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState(false);
  const [expiry, setExpiry] = useState("45");

  const [venue, setVenue] = useState<VenueConfig>(() => loadVenue(eventId));

  useEffect(() => {
    persistVenue(eventId, venue);
  }, [eventId, venue]);

  const currentEvent: EventLite = events.find((e) => e.id === eventId) ?? events[0] ?? EVENTS[0];

  const patch = (id: string, p: Partial<Attendee>) => setPatches((prev) => ({ ...prev, [id]: p }));

  const selectEvent = (id: string) => {
    setEventId(id);
    setPatches({});
    setSlotCaps(initSlotCaps(id));
    setHeld(initHeld(id));
    setLedger(initLedger(id, getEventAttendees(id)));
    setLocalMode("NORMAL");
    setAppliedMode("NORMAL");
    setReason("");
    setReasonErr(false);
    setMode("NORMAL");
    setVenue(loadVenue(id));
    notify("info", "Event switched", events.find((e) => e.id === id)?.name ?? id);
  };

  const adjustCap = (slot: string, delta: number) => {
    const min = eventId === EVENTS[0].id ? 500 : 1;
    setSlotCaps((prev) => ({ ...prev, [slot]: Math.max(min, (prev[slot] ?? 0) + delta) }));
    notify("info", "Slot capacity adjusted", `${slot} cap is now ${compact(Math.max(min, (slotCaps[slot] ?? 0) + delta))}`);
  };

  const releaseHeld = (slot: string) => {
    const released = held[slot] ?? 0;
    setHeld((prev) => ({ ...prev, [slot]: 0 }));
    if (released > 0) notify("refresh", "Held capacity released", `${slot}: ${released} seats back on the market`);
  };

  const downgrade = (id: string) => {
    const row = ledger.find((r) => r.id === id);
    if (!row || row.status === "Downgraded") return;
    setLedger((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Downgraded", escrow: "Fired" } : r)));
    notify("warn", `Escrow fired · ₹${compact(row.comp)}`, `${row.id} · ${row.service} downgraded from ${row.level} — compensation auto-paid to attendee.`);
  };

  const applyMode = () => {
    if (localMode !== "NORMAL" && reason.trim().length < 3) {
      setReasonErr(true);
      return;
    }
    setReasonErr(false);
    setAppliedMode(localMode);
    setMode(localMode);
    if (backendStatus === "live" && localMode !== "NORMAL") {
      void emergencyRequest({
        zoneRef: currentEvent.name,
        action: localMode === "EMERGENCY" ? "lockdown" : localMode === "DEGRADED" ? "reduce_capacity" : "safe_exit_broadcast",
        reason: reason.trim() || "manual operator action",
      }).catch(() => undefined);
    }
    const at = nowTime();
    setFeeds((f) => [
      { text: `Operating mode set to ${MODE_META[localMode].label} — ${reason.trim() || "routine ops"}. Live for ${expiry} min.`, at, by: "event-ops" },
      ...f,
    ]);
    notify(localMode === "EMERGENCY" ? "danger" : localMode === "NORMAL" ? "success" : "warn", `Mode → ${MODE_META[localMode].label}`, MODE_META[localMode].desc);
  };

  const sendBroadcast = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setFeeds((f) => [{ text: `Broadcast: ${t}`, at: nowTime(), by: "event-ops" }, ...f]);
    notify("info", "Announcement released", t.slice(0, 90));
  };

  const pushSafeExit = () => {
    setFeeds((f) => [
      { text: "Safe-exit guidance pushed: safest decks, shuttle boarding windows, halo-route TBD — with offline QR validity.", at: nowTime(), by: "event-ops" },
      ...f,
    ]);
    notify("info", "Safe-exit guidance pushed", "Attendees see updated exit routes; offline tokens remain valid (§27.1).");
  };

  const checkInAttendee = (id: string) => {
    patch(id, { status: "checked-in", checkedInAt: nowTime() });
    notify("success", "Checked in", `${id} is now at the venue.`);
  };

  const cancelAttendee = (id: string) => {
    const a = attendees.find((x) => x.id === id);
    if (!a) return;
    patch(id, { status: "cancelled", checkedInAt: null, booking: { ...a.booking, paid: false } });
    notify("warn", "Booking cancelled · refund issued", `${id} — ₹${compact(a.booking.total)} returned, escrow released.`);
  };

  const reissue = (id: string) => {
    const a = attendees.find((x) => x.id === id);
    if (!a) return;
    const ref = `RCPT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    patch(id, { booking: { ...a.booking, reference: ref } });
    notify("info", "Token reissued", `${id} → new QR reference ${ref}`);
  };

  const setVenueImage = (image: string | null) => setVenue((v) => ({ ...v, image }));

  const addPoi = (category: VenuePoiCategory, x: number, y: number, label: string) =>
    setVenue((v) => ({
      ...v,
      pois: [
        ...v.pois,
        {
          id: `poi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          category,
          x,
          y,
          label,
        },
      ],
    }));

  const movePoi = (id: string, x: number, y: number) =>
    setVenue((v) => ({ ...v, pois: v.pois.map((p) => (p.id === id ? { ...p, x, y } : p)) }));

  const updatePoi = (id: string, patchV: Partial<Pick<VenuePoi, "label" | "category">>) =>
    setVenue((v) => ({ ...v, pois: v.pois.map((p) => (p.id === id ? { ...p, ...patchV } : p)) }));

  const removePoi = (id: string) => setVenue((v) => ({ ...v, pois: v.pois.filter((p) => p.id !== id) }));

  const clearPois = () => setVenue((v) => ({ ...v, pois: [] }));

  const togglePublished = () => setVenue((v) => ({ ...v, published: !v.published }));

  const useSamplePlan = () => setVenue((v) => ({ ...v, image: SAMPLE_PLAN, pois: SAMPLE_POIS.map((p) => ({ ...p })) }));

  const summary = useMemo<typeof ORGANIZER_SUMMARY>(() => {
    if (eventId === EVENTS[0].id) return { ...ORGANIZER_SUMMARY };
    const c = Math.max(attendees.length, 1);
    const cIn = attendees.filter((a) => a.status === "checked-in" || a.status === "arriving").length;
    const pend = attendees.filter((a) => a.status === "pending").length;
    const scale = 90;
    return {
      totalAttendees: c * scale,
      registered: Math.round(c * scale * 0.86),
      checkedIn: Math.round(cIn * scale),
      pending: Math.round(pend * scale),
      cancelled: Math.round(attendees.filter((a) => a.status === "cancelled").length * scale),
      soldOutPct: Math.min(96, Math.round((c * scale) / (c * 100) * 100)),
      waitlist: Math.round(c * 0.3),
    };
  }, [eventId, attendees]);

  const stats = useMemo<Stats>(() => {
    const total = Math.max(attendees.length, 1);
    const cancelled = attendees.filter((a) => a.status === "cancelled").length;
    const withTransport = attendees.filter((a) => a.booking.transport).length;
    const withHotel = attendees.filter((a) => a.booking.hotel).length;
    const paid = attendees.filter((a) => a.booking.paid).length;
    const g5 = attendees.filter((a) => a.gLevel === "G5").length;
    return {
      noShowPct: Math.round((cancelled / total) * 100),
      transportPct: Math.round((withTransport / total) * 100),
      hotelPct: Math.round((withHotel / total) * 100),
      paidPct: Math.round((paid / total) * 100),
      g5Pct: Math.round((g5 / total) * 100),
      avg: Math.round(attendees.reduce((s, a) => s + a.booking.total, 0) / total),
      projectedArrival: Math.round(summary.registered * 0.86),
    };
  }, [attendees, summary.registered]);

  const slotData = SLOTS.map((s) => {
    const cap = slotCaps[s] ?? 0;
    const sold = eventId === EVENTS[0].id ? VENUE_SOLD[s] : attendees.filter((a) => a.booking.slot === s).length;
    const heldNow = held[s] ?? 0;
    return { s, sold, cap, held: heldNow, pct: cap ? Math.min(100, Math.round((sold / cap) * 100)) : 0 };
  });

  const whereabouts = useMemo<Whereabouts>(() => {
    const active = attendees.filter((a) => a.status !== "cancelled");
    const activeTotal = Math.max(active.length, 1);
    const factor = Math.round(summary.registered / activeTotal) || 1;

    const bandCount: Record<BandKey, number> = { onsite: 0, approach: 0, enroute: 0, awaited: 0 };
    active.forEach((a) => {
      if (a.status === "checked-in") {
        bandCount.onsite += 1;
        return;
      }
      let d = 12 + (hashNum(a.id) % 280) / 10;
      const m = a.booking.transport?.mode;
      if (m === "Metro") d = d * 0.25;
      else if (m === "Shuttle") d = d * 0.4;
      else if (m === "Cab") d = d * 0.8;
      if (a.city === "Mumbai" || a.city === "Navi Mumbai") d = Math.min(d, 8);
      if (a.status === "arriving") d = Math.min(d, 9);
      const band: BandKey = d < 1 ? "onsite" : d <= 10 ? "approach" : d <= 30 ? "enroute" : "awaited";
      bandCount[band] += 1;
    });

    const bands: WhereaboutsBand[] = (Object.keys(BAND_META) as BandKey[]).map((k) => ({
      key: k,
      count: bandCount[k] * factor,
      pct: Math.round((bandCount[k] / activeTotal) * 100),
    }));

    const rawCorr: Record<string, number> = {};
    active.forEach((a) => {
      const name = a.booking.transport ? a.booking.transport.name : "Self-arranged";
      rawCorr[name] = (rawCorr[name] ?? 0) + 1;
    });
    const corridors = Object.entries(rawCorr)
      .map(([name, c]) => ({ name, count: c * factor, pct: Math.round((c / activeTotal) * 100) }))
      .sort((x, y) => y.count - x.count);

    const slotHours = SLOTS.map((s) => active.filter((a) => a.booking.slot === s).length);
    const arrival = [
      { label: "Before 7:00 PM window", count: summary.checkedIn, g: "S" as const },
      { label: "7:00 – 9:00 PM window", count: slotHours[0] * factor, g: "A" as const },
      { label: "9:00 – 11:00 PM window", count: (slotHours[1] + slotHours[2]) * factor, g: "A" as const },
      { label: "Late / no-show", count: summary.cancelled, g: "A" as const },
    ];

    const contributed = Math.round(summary.registered * 0.88);
    const consent = {
      contributed,
      withheld: Math.round(summary.registered - contributed),
      pct: 88,
    };

    return { bands, corridors, arrival, consent };
  }, [attendees, summary]);

  const firedTotal = ledger.filter((r) => r.escrow === "Fired").reduce((s, r) => s + r.comp, 0);
  const fundedTotal = ledger.reduce((s, r) => s + r.comp, 0);
  const escrow = { firedTotal, fundedTotal, pct: fundedTotal ? Math.round((firedTotal / fundedTotal) * 100) : 0 };

  const value: OrganizerCtx = {
    events,
    eventId,
    currentEvent,
    selectEvent,
    attendees,
    patch,
    slotData,
    slotCaps,
    adjustCap,
    releaseHeld,
    summary,
    stats,
    whereabouts,
    ledger,
    downgrade,
    escrow,
    feeds,
    sendBroadcast,
    pushSafeExit,
    localMode,
    setLocalMode,
    appliedMode,
    reason,
    setReason,
    reasonErr,
    setReasonErr,
    expiry,
    setExpiry,
    applyMode,
    checkInAttendee,
    cancelAttendee,
    reissue,
    venue,
    setVenueImage,
    addPoi,
    movePoi,
    updatePoi,
    removePoi,
    clearPois,
    togglePublished,
    useSamplePlan,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}