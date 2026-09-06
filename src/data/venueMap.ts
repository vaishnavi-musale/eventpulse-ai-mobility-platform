import { Armchair, Bath, Car, DoorOpen, Flame, GlassWater, HeartPulse, Mic2, Utensils, type LucideIcon } from "lucide-react";

/* ================= Venue map / floor plan (per event) ================= */

export type VenuePoiCategory = "entry" | "exit" | "water" | "food" | "seating" | "restroom" | "firstaid" | "parking" | "stage";

export interface VenuePoi {
  id: string;
  category: VenuePoiCategory;
  x: number;
  y: number;
  label: string;
}

export interface VenueConfig {
  image: string | null;
  pois: VenuePoi[];
  published: boolean;
}

export const POI_CATEGORIES: { key: VenuePoiCategory; label: string; icon: LucideIcon; color: string }[] = [
  { key: "entry", label: "Entry Gate", icon: DoorOpen, color: "#0891b2" },
  { key: "exit", label: "Fire Exit", icon: Flame, color: "#dc2626" },
  { key: "water", label: "Water Point", icon: GlassWater, color: "#0284c7" },
  { key: "food", label: "Food & Snacks", icon: Utensils, color: "#ea580c" },
  { key: "seating", label: "Seating", icon: Armchair, color: "#65a30d" },
  { key: "restroom", label: "Restroom", icon: Bath, color: "#9333ea" },
  { key: "firstaid", label: "First Aid", icon: HeartPulse, color: "#e11d48" },
  { key: "parking", label: "Parking", icon: Car, color: "#64748b" },
  { key: "stage", label: "Stage", icon: Mic2, color: "#f59e0b" },
];

const SAMPLE_PLAN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'>" +
  "<rect width='800' height='600' fill='#fbf8f3'/>" +
  "<rect x='40' y='40' width='720' height='520' rx='14' fill='#ffffff' stroke='#ddd4c6' stroke-width='2'/>" +
  "<rect x='90' y='90' width='180' height='90' rx='10' fill='#fde68a' stroke='#f59e0b' stroke-width='2'/>" +
  "<text x='180' y='148' text-anchor='middle' font-size='18' font-weight='700' fill='#92400e' font-family='sans-serif'>MAIN STAGE</text>" +
  "<rect x='90' y='230' width='200' height='110' rx='10' fill='#d9f1dd' stroke='#65a30d'/>" +
  "<rect x='90' y='380' width='200' height='110' rx='10' fill='#d9f1dd' stroke='#65a30d'/>" +
  "<rect x='330' y='230' width='200' height='110' rx='10' fill='#e2e8f0' stroke='#94a3b8'/>" +
  "<rect x='330' y='380' width='200' height='110' rx='10' fill='#e2e8f0' stroke='#94a3b8'/>" +
  "<text x='190' y='292' text-anchor='middle' font-size='15' font-weight='700' fill='#365314' font-family='sans-serif'>SEATING A</text>" +
  "<text x='190' y='442' text-anchor='middle' font-size='15' font-weight='700' fill='#365314' font-family='sans-serif'>SEATING B</text>" +
  "<text x='430' y='292' text-anchor='middle' font-size='15' font-weight='700' fill='#475569' font-family='sans-serif'>SEATING C</text>" +
  "<text x='430' y='442' text-anchor='middle' font-size='15' font-weight='700' fill='#475569' font-family='sans-serif'>SEATING D</text>" +
  "<rect x='570' y='90' width='160' height='70' rx='10' fill='#ffedd5' stroke='#ea580c'/>" +
  "<text x='650' y='133' text-anchor='middle' font-size='15' font-weight='700' fill='#9a3412' font-family='sans-serif'>FOOD COURT</text>" +
  "<rect x='570' y='190' width='160' height='50' rx='10' fill='#e0f2fe' stroke='#0284c7'/>" +
  "<text x='650' y='222' text-anchor='middle' font-size='13' font-weight='700' fill='#075985' font-family='sans-serif'>WATER LINE</text>" +
  "<rect x='570' y='270' width='160' height='50' rx='10' fill='#fce7f3' stroke='#e11d48'/>" +
  "<text x='650' y='302' text-anchor='middle' font-size='13' font-weight='700' fill='#9d174d' font-family='sans-serif'>FIRST AID</text>" +
  "<rect x='340' y='46' width='80' height='24' rx='8' fill='#cffafe' stroke='#0891b2'/>" +
  "<text x='380' y='62' text-anchor='middle' font-size='13' font-weight='700' fill='#155e75' font-family='sans-serif'>GATE A</text>" +
  "<rect x='46' y='230' width='24' height='90' rx='8' fill='#cffafe' stroke='#0891b2'/>" +
  "<rect x='730' y='230' width='24' height='90' rx='8' fill='#cffafe' stroke='#0891b2'/>" +
  "<rect x='340' y='530' width='80' height='24' rx='8' fill='#cffafe' stroke='#0891b2'/>" +
  "<text x='380' y='546' text-anchor='middle' font-size='13' font-weight='700' fill='#155e75' font-family='sans-serif'>GATE D</text>" +
  "<rect x='300' y='330' width='200' height='26' rx='13' fill='#e7f5ec' stroke='#34d399' stroke-width='2'/>" +
  "<text x='400' y='347' text-anchor='middle' font-size='13' font-weight='700' fill='#065f46' font-family='sans-serif'>CONCOURSE / WALKWAY</text>" +
  "</svg>";

export const SAMPLE_PLAN = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SAMPLE_PLAN_SVG)}`;

export const SAMPLE_POIS: VenuePoi[] = [
  { id: "sp-1", category: "stage", x: 22, y: 21, label: "Main Stage" },
  { id: "sp-2", category: "entry", x: 48, y: 8, label: "Gate A · Entry" },
  { id: "sp-3", category: "entry", x: 6, y: 43, label: "Gate B · Entry" },
  { id: "sp-4", category: "entry", x: 94, y: 43, label: "Gate C · Entry" },
  { id: "sp-5", category: "entry", x: 48, y: 92, label: "Gate D · Entry" },
  { id: "sp-6", category: "exit", x: 12, y: 12, label: "Fire exit · North-West" },
  { id: "sp-7", category: "exit", x: 88, y: 12, label: "Fire exit · North-East" },
  { id: "sp-8", category: "exit", x: 12, y: 82, label: "Fire exit · South-West" },
  { id: "sp-9", category: "exit", x: 88, y: 82, label: "Fire exit · South-East" },
  { id: "sp-10", category: "water", x: 75, y: 32, label: "Water filling point" },
  { id: "sp-11", category: "food", x: 80, y: 16, label: "Food Court" },
  { id: "sp-12", category: "seating", x: 28, y: 45, label: "Seating A" },
  { id: "sp-13", category: "seating", x: 28, y: 72, label: "Seating B" },
  { id: "sp-14", category: "firstaid", x: 79, y: 52, label: "First Aid point" },
  { id: "sp-15", category: "restroom", x: 50, y: 55, label: "Restrooms (main block)" },
];

function venueKey(eventId: string) {
  return `eventpulse:venue-map:${eventId}`;
}

export function getVenueMap(eventId: string): VenueConfig {
  try {
    const raw = localStorage.getItem(venueKey(eventId));
    if (raw) return JSON.parse(raw) as VenueConfig;
  } catch {
    /* fall through to fresh config */
  }
  return { image: null, pois: [], published: false };
}

export function saveVenueMap(eventId: string, v: VenueConfig) {
  try {
    localStorage.setItem(venueKey(eventId), JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export function getPublishedVenueMap(eventId: string): VenueConfig | null {
  const v = getVenueMap(eventId);
  return v.published && v.image && v.pois.length > 0 ? v : null;
}