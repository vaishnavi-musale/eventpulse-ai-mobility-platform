import type { LucideIcon } from "lucide-react";
import { Music, Trophy, Mic2, Waves, Flag, Cpu } from "lucide-react";

/* ================= EVENTS ================= */

export type CrowdLevel = "Critical" | "High" | "Medium" | "Low";
export type EventStatus = "Live" | "High Demand" | "Upcoming" | "Sold Out";

export interface EventItem {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  crowd: number;
  crowdLevel: CrowdLevel;
  status: EventStatus;
  services: string[];
  tags: string[];
  gradient: string;
  icon: LucideIcon;
  poster: string;
  price: string;
  category: string;
}

export const EVENTS: EventItem[] = [
  {
    id: "mumbai-music-festival",
    name: "Mumbai Music Festival 2026",
    date: "Sat, Sep 12",
    time: "6:00 PM – 12:00 AM",
    venue: "DY Patil Stadium",
    city: "Navi Mumbai",
    crowd: 65000,
    crowdLevel: "High",
    status: "Live",
    services: ["Metro", "Reserved Shuttle", "Parking", "Stay"],
    tags: ["Concert", "This Week"],
    gradient: "from-indigo-500/40 via-purple-500/25 to-fuchsia-500/30",
    icon: Music,
    poster: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=900&fit=crop",
    price: "₹499 onwards",
    category: "Music",
  },
  {
    id: "super-cup-final",
    name: "India Super Cup Final",
    date: "Mon, Sep 14",
    time: "7:30 PM – 10:30 PM",
    venue: "Salt Lake Stadium",
    city: "Kolkata",
    crowd: 90000,
    crowdLevel: "Critical",
    status: "High Demand",
    services: ["Metro", "Shuttle", "Parking", "Rides"],
    tags: ["Sports", "This Week"],
    gradient: "from-emerald-500/35 via-teal-500/25 to-cyan-500/30",
    icon: Trophy,
    poster: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=900&fit=crop",
    price: "₹299 onwards",
    category: "Sports",
  },
  {
    id: "technova-summit",
    name: "TechNova Summit 2026",
    date: "Fri, Sep 18",
    time: "9:00 AM – 6:00 PM",
    venue: "BKC Convention Centre",
    city: "Mumbai",
    crowd: 18000,
    crowdLevel: "Medium",
    status: "Upcoming",
    services: ["Metro", "Rides", "Stay"],
    tags: ["Conference"],
    gradient: "from-sky-500/35 via-blue-500/25 to-indigo-500/30",
    icon: Mic2,
    poster: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=900&fit=crop",
    price: "₹1,499 onwards",
    category: "Conference",
  },
  {
    id: "goa-beach-fest",
    name: "Goa Beach Music Fest",
    date: "Sun, Sep 20",
    time: "4:00 PM – 1:00 AM",
    venue: "Miramar Beach",
    city: "Goa",
    crowd: 40000,
    crowdLevel: "High",
    status: "Live",
    services: ["Shuttle", "Parking", "Stay", "Rides"],
    tags: ["Festival"],
    gradient: "from-amber-500/35 via-orange-500/25 to-rose-500/30",
    icon: Waves,
    poster: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=900&fit=crop",
    price: "₹799 onwards",
    category: "Festival",
  },
  {
    id: "city-marathon-2026",
    name: "City Marathon 2026",
    date: "Mon, Sep 21",
    time: "5:00 AM – 11:00 AM",
    venue: "Marine Drive",
    city: "Mumbai",
    crowd: 55000,
    crowdLevel: "High",
    status: "Upcoming",
    services: ["Metro", "Shuttle", "Road Closures"],
    tags: ["Sports"],
    gradient: "from-cyan-500/35 via-sky-500/25 to-blue-500/30",
    icon: Flag,
    poster: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=600&h=900&fit=crop",
    price: "₹199 onwards",
    category: "Sports",
  },
  {
    id: "ai-mobility-expo",
    name: "AI & Mobility Expo",
    date: "Thu, Sep 25",
    time: "10:00 AM – 7:00 PM",
    venue: "HICC",
    city: "Hyderabad",
    crowd: 22000,
    crowdLevel: "Medium",
    status: "Upcoming",
    services: ["Metro", "Shuttle", "Parking", "Stay"],
    tags: ["Conference", "This Week"],
    gradient: "from-violet-500/35 via-purple-500/25 to-indigo-500/30",
    icon: Cpu,
    poster: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=900&fit=crop",
    price: "₹999 onwards",
    category: "Conference",
  },
];

/* ================= RECOMMENDATIONS ================= */

export type GLevel = "G5" | "G3" | "G2" | "G1" | "G0" | "NC";

export interface Option {
  id: string;
  rank: number;
  name: string;
  mode: string;
  eta: string;
  etaMin: number;
  price: string;
  priceNote: string;
  congestion: "Low" | "Moderate" | "High";
  capacity: "Verified" | "Limited" | "Not Reserved";
  gLevel: GLevel;
  confidence: number;
  steps: string[];
  reasoning: string[];
  matchScore: number;
}

export const OPTIONS: Option[] = [
  {
    id: "metro-shuttle",
    rank: 1,
    name: "Metro + Reserved Shuttle",
    mode: "Multi-modal · Verified chain",
    eta: "52 min",
    etaMin: 52,
    price: "₹80",
    priceNote: "Fixed fare",
    congestion: "Low",
    capacity: "Verified",
    gLevel: "G5",
    confidence: 96,
    steps: ["Walk to Metro Station B", "Metro Line 1 → Central", "Reserved Shuttle #S-114", "Drop at Gate A"],
    reasoning: [
      "Traffic prediction analyzed — 92% probability of < 20 min delay window",
      "Metro capacity verified — 1,840 free seats on Line 1 at departure window",
      "Shuttle seat reserved — seat S-114 locked with provider",
      "Weather risk low — no rain expected in the 6–8 PM window",
      "Historical congestion patterns considered — 14 similar events analyzed",
    ],
    matchScore: 96,
  },
  {
    id: "direct-shuttle",
    rank: 2,
    name: "Direct Shuttle",
    mode: "Single mode · Express lane",
    eta: "48 min",
    etaMin: 48,
    price: "₹120",
    priceNote: "Fixed fare",
    congestion: "Moderate",
    capacity: "Limited",
    gLevel: "G2",
    confidence: 87,
    steps: ["Walk to Shuttle Hub B", "Express Shuttle #E-72", "Drop at Gate A"],
    reasoning: [
      "Express lane active — but lane priority not contractually locked",
      "Provider capacity bounded — 62% of fleet already allotted to G3 commitments",
      "Congestion moderate — delay of 8–14 min possible at Gate A access road",
    ],
    matchScore: 88,
  },
  {
    id: "ride-share",
    rank: 3,
    name: "Ride Share",
    mode: "On-demand · Surge exposed",
    eta: "65 min",
    etaMin: 65,
    price: "₹220+",
    priceNote: "Dynamic pricing",
    congestion: "High",
    capacity: "Not Reserved",
    gLevel: "G1",
    confidence: 71,
    steps: ["Request ride at pickup point", "Dynamic matching", "Drop at Gate B"],
    reasoning: [
      "Surge pricing expected — 1.9× multiplier projected at 6:30 PM",
      "No capacity lock — driver availability is a prediction, not a commitment",
      "Arrival confidence drops sharply after 6:45 PM due to gate congestion",
    ],
    matchScore: 62,
  },
];

/* ================= VERIFICATION STEPS ================= */

export const VERIFY_STEPS = [
  { label: "Transport Capacity", detail: "Checking available seats across providers…", result: "1,840 seats free · seat S-114 lockable" },
  { label: "Provider Confirmation", detail: "Contacting shuttle operator…", result: "Provider connected · slot confirmed" },
  { label: "Route Capacity", detail: "Analyzing traffic conditions…", result: "Express lane clear · delay risk < 8 min" },
  { label: "Weather Conditions", detail: "Scanning forecast models…", result: "Low risk · no rain in window" },
  { label: "Delivery Channel", detail: "Validating QR + GPS channel…", result: "Confirmed · encrypted handshake OK" },
  { label: "System Health", detail: "Checking platform integrity…", result: "Operational · 99.8% uptime" },
];

/* ================= COMMITMENT ================= */

export const COMMITMENT = {
  id: "EP-2026-8F72A",
  service: "Metro + Reserved Shuttle",
  level: "G5" as GLevel,
  departure: "6:10 PM – 6:20 PM",
  arrivalTarget: "Before 7:00 PM",
  boardingGate: "Metro Station B",
  verification: "QR + GPS",
  status: "ACTIVE",
  createdAt: "Today, 2:14 PM",
  price: "₹80",
};

/* ================= JOURNEY ================= */

export const TIMELINE = [
  { time: "6:05 PM", label: "Leave Home", icon: "home", done: true },
  { time: "6:20 PM", label: "Reach Metro", icon: "train", done: false },
  { time: "6:35 PM", label: "Board Reserved Shuttle", icon: "bus", done: false },
  { time: "6:55 PM", label: "Arrive Venue", icon: "flag", done: false },
  { time: "7:00 PM", label: "Target Arrival", icon: "target", done: false },
] as const;

export const MONITORS = [
  { key: "Traffic", value: "NORMAL", tone: "green" },
  { key: "Weather", value: "CLEAR", tone: "green" },
  { key: "Shuttle", value: "ON TIME", tone: "green" },
  { key: "Crowd", value: "MODERATE", tone: "cyan" },
] as const;

/* ================= HISTORY / PROFILE ================= */

export const HISTORY = [
  { date: "Sep 06, 2026", event: "Indie Arena Night", service: "Metro + Shuttle", g: "G3" as GLevel, status: "FULFILLED" },
  { date: "Aug 30, 2026", event: "TechNova Summit", service: "Reserved Shuttle", g: "G3" as GLevel, status: "FULFILLED" },
  { date: "Aug 24, 2026", event: "Blockchain Week", service: "Ride Share", g: "G1" as GLevel, status: "FULFILLED" },
  { date: "Aug 18, 2026", event: "City Marathon", service: "Metro Route", g: "G0" as GLevel, status: "CANCELLED" },
  { date: "Aug 12, 2026", event: "Food Carnival", service: "Priority Shuttle", g: "G2" as GLevel, status: "FULFILLED" },
  { date: "Aug 05, 2026", event: "Open Air Cinema", service: "Metro + Shuttle", g: "G3" as GLevel, status: "FAILED" },
];

export const UPCOMING = [
  { date: "Sep 12", event: "Mumbai Music Festival 2026", service: "Metro + Reserved Shuttle", g: "G3" as GLevel, depart: "6:10 PM", status: "ACTIVE" },
  { date: "Sep 21", event: "City Marathon 2026", service: "Priority Shuttle", g: "G2" as GLevel, depart: "4:40 AM", status: "CONFIRMED" },
];

export const SAVED_EVENTS = ["India Super Cup Final", "Goa Beach Music Fest", "AI & Mobility Expo"];

/* ================= ADMIN ================= */

export const ADMIN_METRICS = {
  crowd: "48,230",
  capacityPct: 74,
  commitments: "12,482",
  transportUtil: 82,
  health: "99.8",
};

export const CROWD_FORECAST = [
  { time: "6 PM", density: 32000, predicted: 32000, shuttles: 84 },
  { time: "7 PM", density: 41000, predicted: 43000, shuttles: 92 },
  { time: "8 PM", density: 48230, predicted: 51000, shuttles: 104 },
  { time: "9 PM", density: 50200, predicted: 54800, shuttles: 112 },
  { time: "10 PM", density: 46100, predicted: 52700, shuttles: 108 },
  { time: "11 PM", density: 38900, predicted: 46200, shuttles: 96 },
];

export const ZONES = [
  { zone: "Zone A — Main Gate", density: 82, trend: "+6%", risk: "Watch" },
  { zone: "Zone B — North Plaza", density: 61, trend: "+2%", risk: "Stable" },
  { zone: "Zone C — Metro Exit", density: 91, trend: "+14%", risk: "Critical" },
  { zone: "Zone D — Parking West", density: 47, trend: "-3%", risk: "Stable" },
];

export const FLEET = [
  { id: "S-114", route: "Metro B → Gate A", seats: 24, fill: 96, status: "ON ROUTE" },
  { id: "E-72", route: "Hub B → Gate A", seats: 40, fill: 88, status: "ON ROUTE" },
  { id: "S-118", route: "Metro B → Gate A", seats: 24, fill: 100, status: "DEPARTING" },
  { id: "E-75", route: "Hub C → Gate B", seats: 40, fill: 71, status: "HOLDING" },
  { id: "S-121", route: "Metro C → Gate B", seats: 24, fill: 58, status: "QUEUED" },
];

export const PROVIDERS = [
  { name: "Pulse Shuttle Co.", type: "Shuttle", active: 46, capacity: 92, health: "OPTIMAL" },
  { name: "MetroLink", type: "Metro", active: 12, capacity: 84, health: "OPTIMAL" },
  { name: "SwiftPark", type: "Parking", active: 8, capacity: 74, health: "DEGRADED" },
  { name: "UrbanRide", type: "Rides", active: 320, capacity: 61, health: "STRESSED" },
];

export const INCIDENTS = [
  { id: "INC-2041", sev: "HIGH", title: "Shuttle S-114 delayed 18 min", detail: "Gate A access road congestion", time: "6:42 PM", status: "MITIGATING" },
  { id: "INC-2040", sev: "MED", title: "Parking West at 92% capacity", detail: "Overflow lot opening in 10 min", time: "6:31 PM", status: "RESOLVING" },
  { id: "INC-2039", sev: "LOW", title: "Metro Line 1 headway +2 min", detail: "Signal resync in progress", time: "6:18 PM", status: "MONITORING" },
  { id: "INC-2036", sev: "LOW", title: "Zone C density above threshold", detail: "Crowd control staff dispatched", time: "5:52 PM", status: "RESOLVED" },
];

export const ARRIVALS_SERIES = [
  { time: "6 PM", arrivals: 5200, served: 4900 },
  { time: "7 PM", arrivals: 8800, served: 8200 },
  { time: "8 PM", arrivals: 10200, served: 9600 },
  { time: "9 PM", arrivals: 9400, served: 9100 },
  { time: "10 PM", arrivals: 7300, served: 7100 },
];

/* ================= HOTELS ================= */

export interface HotelItem {
  id: string;
  name: string;
  rating: number;
  price: string;
  pricePerNight: number;
  distance: string;
  distanceKm: number;
  image: string;
  amenities: string[];
  available: boolean;
  roomsLeft: number;
  gLevel: GLevel;
}

export const HOTELS: HotelItem[] = [
  {
    id: "hotel-1",
    name: "Taj Residency",
    rating: 4.8,
    price: "₹4,200",
    pricePerNight: 4200,
    distance: "0.8 km from venue",
    distanceKm: 0.8,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=260&fit=crop",
    amenities: ["Pool", "Spa", "Free WiFi", "Restaurant"],
    available: true,
    roomsLeft: 12,
    gLevel: "G3",
  },
  {
    id: "hotel-2",
    name: "The Grand Meridian",
    rating: 4.5,
    price: "₹3,100",
    pricePerNight: 3100,
    distance: "1.2 km from venue",
    distanceKm: 1.2,
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=260&fit=crop",
    amenities: ["Free WiFi", "Gym", "Restaurant", "Parking"],
    available: true,
    roomsLeft: 8,
    gLevel: "G2",
  },
  {
    id: "hotel-3",
    name: "Metro Inn Express",
    rating: 4.2,
    price: "₹1,800",
    pricePerNight: 1800,
    distance: "1.8 km from venue",
    distanceKm: 1.8,
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&h=260&fit=crop",
    amenities: ["Free WiFi", "AC", "Breakfast"],
    available: true,
    roomsLeft: 22,
    gLevel: "G2",
  },
  {
    id: "hotel-4",
    name: "Comfort Suites",
    rating: 4.0,
    price: "₹1,200",
    pricePerNight: 1200,
    distance: "2.5 km from venue",
    distanceKm: 2.5,
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=260&fit=crop",
    amenities: ["Free WiFi", "AC", "Parking"],
    available: true,
    roomsLeft: 35,
    gLevel: "G1",
  },
  {
    id: "hotel-5",
    name: "Park View Lodge",
    rating: 3.8,
    price: "₹800",
    pricePerNight: 800,
    distance: "3.2 km from venue",
    distanceKm: 3.2,
    image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400&h=260&fit=crop",
    amenities: ["Free WiFi", "AC"],
    available: true,
    roomsLeft: 50,
    gLevel: "G0",
  },
];

/* ================= TRANSPORT ROUTES ================= */

export type TransportMode = "train" | "cab" | "bus";

export interface TransportRoute {
  id: string;
  mode: TransportMode;
  name: string;
  provider: string;
  eta: string;
  etaMin: number;
  price: string;
  priceValue: number;
  departure: string;
  arrival: string;
  stops: number;
  capacity: "Verified" | "Limited" | "Available";
  gLevel: GLevel;
  available: boolean;
  /** Multi-modal journey legs — venues are never at a single station. */
  legs: TransportLeg[];
}

export type TransportLegMode = TransportMode | "walk" | "ride";

export interface TransportLeg {
  mode: TransportLegMode;
  label: string;
  duration: string;
  /** The specific operator offer for this leg, e.g. "Uber Go". */
  offer?: string;
  /** Per-leg price, e.g. "₹98". Free legs use "₹0" or omit. */
  price?: string;
}

export const TRANSPORT_ROUTES: TransportRoute[] = [
  {
    id: "tr-1",
    mode: "train",
    name: "Metro Express Line 1",
    provider: "MetroLink",
    eta: "44 min",
    etaMin: 44,
    price: "₹136",
    priceValue: 136,
    departure: "6:10 PM",
    arrival: "6:54 PM",
    stops: 4,
    capacity: "Verified",
    gLevel: "G3",
    available: true,
    legs: [
      { mode: "ride", label: "Uber/Ola to Metro Central", duration: "14 min", offer: "Uber Go", price: "₹98" },
      { mode: "walk", label: "Walk to platform", duration: "4 min", price: "₹0" },
      { mode: "train", label: "Metro Express Line 1", duration: "20 min", offer: "MetroLink", price: "₹38" },
      { mode: "walk", label: "Walk to Gate A", duration: "6 min", price: "₹0" },
    ],
  },
  {
    id: "tr-2",
    mode: "train",
    name: "Metro Local Line 2",
    provider: "MetroLink",
    eta: "52 min",
    etaMin: 52,
    price: "₹114",
    priceValue: 114,
    departure: "6:10 PM",
    arrival: "7:02 PM",
    stops: 7,
    capacity: "Available",
    gLevel: "G2",
    available: true,
    legs: [
      { mode: "ride", label: "Uber/Ola to Metro Central", duration: "14 min", offer: "Ola Mini", price: "₹84" },
      { mode: "walk", label: "Walk to platform", duration: "4 min", price: "₹0" },
      { mode: "train", label: "Metro Local Line 2", duration: "26 min", offer: "MetroLink", price: "₹30" },
      { mode: "walk", label: "Walk to Gate B", duration: "8 min", price: "₹0" },
    ],
  },
  {
    id: "tr-3",
    mode: "cab",
    name: "Premium Cab",
    provider: "UrbanRide",
    eta: "35 min",
    etaMin: 35,
    price: "₹320",
    priceValue: 320,
    departure: "6:10 PM",
    arrival: "6:45 PM",
    stops: 0,
    capacity: "Available",
    gLevel: "G2",
    available: true,
    legs: [
      { mode: "ride", label: "Uber/Ola door-to-door", duration: "32 min", offer: "Uber Premier", price: "₹320" },
      { mode: "walk", label: "Walk to Gate A", duration: "3 min", price: "₹0" },
    ],
  },
  {
    id: "tr-4",
    mode: "cab",
    name: "Shared Cab Pool",
    provider: "UrbanRide",
    eta: "45 min",
    etaMin: 45,
    price: "₹132",
    priceValue: 132,
    departure: "6:10 PM",
    arrival: "6:55 PM",
    stops: 2,
    capacity: "Limited",
    gLevel: "G1",
    available: true,
    legs: [
      { mode: "ride", label: "Shared cab pool", duration: "36 min", offer: "Ola Share", price: "₹132" },
      { mode: "walk", label: "Walk to North Plaza Gate", duration: "9 min", price: "₹0" },
    ],
  },
  {
    id: "tr-5",
    mode: "bus",
    name: "AC Express Bus",
    provider: "CityTransit",
    eta: "50 min",
    etaMin: 50,
    price: "₹126",
    priceValue: 126,
    departure: "6:00 PM",
    arrival: "6:50 PM",
    stops: 6,
    capacity: "Verified",
    gLevel: "G2",
    available: true,
    legs: [
      { mode: "ride", label: "Uber/Ola to Central Bus Stop", duration: "10 min", offer: "Uber Go", price: "₹86" },
      { mode: "bus", label: "AC Express Bus", duration: "28 min", offer: "CityTransit", price: "₹40" },
      { mode: "walk", label: "Walk to Gate A", duration: "12 min", price: "₹0" },
    ],
  },
  {
    id: "tr-6",
    mode: "bus",
    name: "Local Route 42",
    provider: "CityTransit",
    eta: "65 min",
    etaMin: 65,
    price: "₹25",
    priceValue: 25,
    departure: "6:05 PM",
    arrival: "7:10 PM",
    stops: 12,
    capacity: "Available",
    gLevel: "G0",
    available: true,
    legs: [
      { mode: "walk", label: "Walk to Local Stop", duration: "5 min", price: "₹0" },
      { mode: "bus", label: "Local Route 42", duration: "48 min", offer: "CityTransit", price: "₹25" },
      { mode: "walk", label: "Walk to Gate C", duration: "12 min", price: "₹0" },
    ],
  },
];

/* ================= PARKING ================= */

export interface ParkingSpot {
  id: string;
  name: string;
  type: string;
  price: string;
  priceValue: number;
  distance: string;
  distanceKm: number;
  capacity: number;
  filled: number;
  gLevel: GLevel;
  available: boolean;
}

export const PARKING_SPOTS: ParkingSpot[] = [
  {
    id: "pk-1",
    name: "Gate A Premium Lot",
    type: "Covered",
    price: "₹200",
    priceValue: 200,
    distance: "0.2 km from venue",
    distanceKm: 0.2,
    capacity: 120,
    filled: 98,
    gLevel: "G3",
    available: true,
  },
  {
    id: "pk-2",
    name: "North Plaza Garage",
    type: "Multi-level",
    price: "₹150",
    priceValue: 150,
    distance: "0.5 km from venue",
    distanceKm: 0.5,
    capacity: 300,
    filled: 210,
    gLevel: "G2",
    available: true,
  },
  {
    id: "pk-3",
    name: "Metro Station Parking",
    type: "Open",
    price: "₹80",
    priceValue: 80,
    distance: "1.8 km from venue",
    distanceKm: 1.8,
    capacity: 500,
    filled: 320,
    gLevel: "G2",
    available: true,
  },
  {
    id: "pk-4",
    name: "West Overflow Lot",
    type: "Open",
    price: "₹40",
    priceValue: 40,
    distance: "3.0 km from venue",
    distanceKm: 3.0,
    capacity: 800,
    filled: 410,
    gLevel: "G1",
    available: true,
  },
];

/* ================= HOSTED EVENT (organizer-created) ================= */

export interface HostedEventRecord {
  id: string;
  name: string;
  date: string;
  time: string;
  /** The exact days the event runs (YYYY-MM-DD), from the organizer calendar picker. */
  days?: string[];
  /** The show/session time slots the organizer added (e.g. "6:00 PM"). */
  timeSlots?: string[];
  venue: string;
  city: string;
  about: string;
  category: string;
  price: string;
  capacity: string;
  age: string;
  image: string;
  services: string[];
  organizer: string;
  email: string;
  phone: string;
  createdBy: "organizer";
}

const STORAGE_KEY = "eventpulse:hosted-events";

export function getHostedEvents(): HostedEventRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HostedEventRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveHostedEvent(ev: Omit<HostedEventRecord, "id" | "createdBy">): HostedEventRecord {
  const record: HostedEventRecord = {
    ...ev,
    id: `hosted-${Date.now().toString(36)}`,
    createdBy: "organizer",
  };
  const list = [record, ...getHostedEvents()];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
  return record;
}

/* ================= MEGA EVENT ORGANIZER / ATTENDEES ================= */

export type AttendeeStatus = "checked-in" | "arriving" | "pending" | "cancelled";

export interface AttendeeBooking {
  slot: string;
  tickets: number;
  ticketAmt: number;
  transport: {
    mode: string;
    name: string;
    price: number;
    status: "held" | "fulfilled";
  } | null;
  hotel: {
    name: string;
    nights: number;
    price: number;
    status: "held" | "fulfilled";
  } | null;
  total: number;
  paid: boolean;
  gateway: string;
  reference: string;
}

export interface Attendee {
  id: string;
  name: string;
  age: number;
  city: string;
  phone: string;
  email: string;
  group: string;
  joined: string;
  slot: string;
  gate: string;
  seating: string;
  checkedInAt: string | null;
  status: AttendeeStatus;
  gLevel: GLevel;
  booking: AttendeeBooking;
  eventId?: string;
}

export const ORGANIZER_SUMMARY = {
  totalAttendees: 12482,
  registered: 11304,
  checkedIn: 9411,
  pending: 1893,
  cancelled: 1178,
  soldOutPct: 92,
  waitlist: 342,
};

export const ATTENDEES: Attendee[] = [
  {
    id: "EP-100481",
    name: "Aarav Sharma",
    age: 27,
    city: "Mumbai",
    phone: "+91 98200 44121",
    email: "aarav.sharma@mail.com",
    group: "G3",
    joined: "Aug 18",
    slot: "7:00 PM",
    gate: "Gate A",
    seating: "Standing – North",
    checkedInAt: "6:12 PM",
    status: "checked-in",
    gLevel: "G3",
    booking: {
      slot: "7:00 PM",
      tickets: 2,
      ticketAmt: 2498,
      transport: { mode: "Metro", name: "Metro Line 1 → Gate A", price: 60, status: "fulfilled" },
      hotel: { name: "The Oberoi – Marine", nights: 1, price: 5200, status: "held" },
      total: 7758,
      paid: true,
      gateway: "UPI",
      reference: "RCPT-7F2A",
    },
  },
  {
    id: "EP-100482",
    name: "Priya Nair",
    age: 24,
    city: "Pune",
    phone: "+91 98450 77321",
    email: "priya.nair@mail.com",
    group: "G2",
    joined: "Aug 19",
    slot: "7:00 PM",
    gate: "Gate B",
    seating: "Balcony – East",
    checkedInAt: "6:38 PM",
    status: "checked-in",
    gLevel: "G2",
    booking: {
      slot: "7:00 PM",
      tickets: 1,
      ticketAmt: 1249,
      transport: { mode: "Cab", name: "UrbanRide Express", price: 820, status: "fulfilled" },
      hotel: null,
      total: 2069,
      paid: true,
      gateway: "Card",
      reference: "RCPT-83BC",
    },
  },
  {
    id: "EP-100483",
    name: "Kabir Malhotra",
    age: 31,
    city: "Delhi",
    phone: "+91 98110 20931",
    email: "kabir.m@mail.com",
    group: "G3",
    joined: "Aug 12",
    slot: "9:00 PM",
    gate: "Gate C",
    seating: "Premium Floor – F1",
    checkedInAt: null,
    status: "arriving",
    gLevel: "G3",
    booking: {
      slot: "9:00 PM",
      tickets: 4,
      ticketAmt: 7496,
      transport: { mode: "Shuttle", name: "Pulse Shuttle S-114", price: 240, status: "held" },
      hotel: { name: "The Taj – Palace", nights: 2, price: 11400, status: "held" },
      total: 19136,
      paid: true,
      gateway: "Card",
      reference: "RCPT-90DE",
    },
  },
  {
    id: "EP-100484",
    name: "Sneha Iyer",
    age: 22,
    city: "Chennai",
    phone: "+91 90030 11542",
    email: "sneha.iyer@mail.com",
    group: "G1",
    joined: "Aug 21",
    slot: "9:00 PM",
    gate: "Gate A",
    seating: "Balcony – West",
    checkedInAt: null,
    status: "pending",
    gLevel: "G1",
    booking: {
      slot: "9:00 PM",
      tickets: 1,
      ticketAmt: 1249,
      transport: null,
      hotel: null,
      total: 1249,
      paid: true,
      gateway: "UPI",
      reference: "RCPT-A1EF",
    },
  },
  {
    id: "EP-100485",
    name: "Rohan Deshmukh",
    age: 35,
    city: "Nagpur",
    phone: "+91 97655 48210",
    email: "rohan.d@mail.com",
    group: "G3",
    joined: "Aug 10",
    slot: "7:00 PM",
    gate: "Gate B",
    seating: "Premium Floor – F2",
    checkedInAt: "6:05 PM",
    status: "checked-in",
    gLevel: "G3",
    booking: {
      slot: "7:00 PM",
      tickets: 3,
      ticketAmt: 3747,
      transport: { mode: "Train", name: "Shatabdi Express Shuttle", price: 180, status: "fulfilled" },
      hotel: { name: "Hyatt Regency", nights: 1, price: 4100, status: "fulfilled" },
      total: 8027,
      paid: true,
      gateway: "UPI",
      reference: "RCPT-B2C0",
    },
  },
  {
    id: "EP-100486",
    name: "Ananya Gupta",
    age: 26,
    city: "Bangalore",
    phone: "+91 99000 67211",
    email: "ananya.g@mail.com",
    group: "G2",
    joined: "Aug 17",
    slot: "7:00 PM",
    gate: "Gate A",
    seating: "Standing – South",
    checkedInAt: "6:52 PM",
    status: "checked-in",
    gLevel: "G2",
    booking: {
      slot: "7:00 PM",
      tickets: 2,
      ticketAmt: 2498,
      transport: { mode: "Cab", name: "UrbanRide Plus", price: 940, status: "fulfilled" },
      hotel: null,
      total: 3438,
      paid: true,
      gateway: "UPI",
      reference: "RCPT-C3D1",
    },
  },
  {
    id: "EP-100487",
    name: "Vikram Singh",
    age: 41,
    city: "Jaipur",
    phone: "+91 98290 30421",
    email: "vikram.singh@mail.com",
    group: "G3",
    joined: "Aug 08",
    slot: "9:00 PM",
    gate: "Gate D",
    seating: "VIP Box – B4",
    checkedInAt: "7:01 PM",
    status: "checked-in",
    gLevel: "G3",
    booking: {
      slot: "9:00 PM",
      tickets: 6,
      ticketAmt: 14992,
      transport: { mode: "Shuttle", name: "Luxe Suite Shuttle", price: 480, status: "fulfilled" },
      hotel: { name: "St. Regis", nights: 2, price: 19800, status: "fulfilled" },
      total: 35272,
      paid: true,
      gateway: "Card",
      reference: "RCPT-D4E2",
    },
  },
  {
    id: "EP-100488",
    name: "Meera Krishnan",
    age: 29,
    city: "Kochi",
    phone: "+91 98476 20984",
    email: "meera.k@mail.com",
    group: "G1",
    joined: "Aug 22",
    slot: "7:00 PM",
    gate: "Gate A",
    seating: "Balcony – North",
    checkedInAt: null,
    status: "pending",
    gLevel: "G1",
    booking: {
      slot: "7:00 PM",
      tickets: 1,
      ticketAmt: 1249,
      transport: null,
      hotel: null,
      total: 1249,
      paid: false,
      gateway: "Pending",
      reference: "RCPT-EXPF",
    },
  },
  {
    id: "EP-100489",
    name: "Aditya Bose",
    age: 23,
    city: "Kolkata",
    phone: "+91 98301 77218",
    email: "aditya.bose@mail.com",
    group: "G2",
    joined: "Aug 15",
    slot: "9:00 PM",
    gate: "Gate C",
    seating: "Standing – West",
    checkedInAt: "7:15 PM",
    status: "checked-in",
    gLevel: "G2",
    booking: {
      slot: "9:00 PM",
      tickets: 2,
      ticketAmt: 2498,
      transport: { mode: "Bus", name: "MetroLink Feeder Bus", price: 100, status: "fulfilled" },
      hotel: null,
      total: 2598,
      paid: true,
      gateway: "UPI",
      reference: "RCPT-E5F3",
    },
  },
  {
    id: "EP-100490",
    name: "Nikhil Verma",
    age: 33,
    city: "Lucknow",
    phone: "+91 98390 11840",
    email: "nikhil.v@mail.com",
    group: "G3",
    joined: "Aug 11",
    slot: "7:00 PM",
    gate: "Gate B",
    seating: "Premium Floor – F3",
    checkedInAt: null,
    status: "arriving",
    gLevel: "G3",
    booking: {
      slot: "7:00 PM",
      tickets: 3,
      ticketAmt: 3747,
      transport: { mode: "Train", name: "Shatabdi Express Shuttle", price: 180, status: "held" },
      hotel: { name: "The Oberoi – Marine", nights: 1, price: 5200, status: "held" },
      total: 9127,
      paid: true,
      gateway: "Card",
      reference: "RCPT-F6A4",
    },
  },
  {
    id: "EP-100491",
    name: "Ishita Rathi",
    age: 25,
    city: "Indore",
    phone: "+91 98930 44109",
    email: "ishita.r@mail.com",
    group: "G1",
    joined: "Aug 20",
    slot: "9:00 PM",
    gate: "Gate A",
    seating: "Standing – East",
    checkedInAt: null,
    status: "cancelled",
    gLevel: "G1",
    booking: {
      slot: "9:00 PM",
      tickets: 1,
      ticketAmt: 1249,
      transport: null,
      hotel: null,
      total: 1249,
      paid: false,
      gateway: "Refunded",
      reference: "RCPT-G7B5",
    },
  },
  {
    id: "EP-100492",
    name: "Farhan Ali",
    age: 38,
    city: "Hyderabad",
    phone: "+91 97000 82341",
    email: "farhan.ali@mail.com",
    group: "G3",
    joined: "Aug 09",
    slot: "7:00 PM",
    gate: "Gate D",
    seating: "VIP Box – B2",
    checkedInAt: "6:25 PM",
    status: "checked-in",
    gLevel: "G3",
    booking: {
      slot: "7:00 PM",
      tickets: 2,
      ticketAmt: 4996,
      transport: { mode: "Shuttle", name: "Pulse Shuttle S-121", price: 120, status: "fulfilled" },
      hotel: { name: "Hyatt Regency", nights: 1, price: 4100, status: "fulfilled" },
      total: 9216,
      paid: true,
      gateway: "UPI",
      reference: "RCPT-H8C6",
    },
  },
  {
    id: "EP-100493",
    name: "Tara Menon",
    age: 21,
    city: "Coimbatore",
    phone: "+91 98422 90017",
    email: "tara.menon@mail.com",
    group: "G2",
    joined: "Aug 23",
    slot: "9:00 PM",
    gate: "Gate B",
    seating: "Balcony – South",
    checkedInAt: "7:44 PM",
    status: "checked-in",
    gLevel: "G2",
    booking: {
      slot: "9:00 PM",
      tickets: 1,
      ticketAmt: 1249,
      transport: { mode: "Cab", name: "UrbanRide Express", price: 610, status: "fulfilled" },
      hotel: null,
      total: 1859,
      paid: true,
      gateway: "UPI",
      reference: "RCPT-I9D7",
    },
  },
  {
    id: "EP-100494",
    name: "Rahul Kulkarni",
    age: 30,
    city: "Pune",
    phone: "+91 98600 33029",
    email: "rahul.k@mail.com",
    group: "G3",
    joined: "Aug 13",
    slot: "7:00 PM",
    gate: "Gate C",
    seating: "Premium Floor – F1",
    checkedInAt: "6:48 PM",
    status: "checked-in",
    gLevel: "G3",
    booking: {
      slot: "7:00 PM",
      tickets: 2,
      ticketAmt: 2498,
      transport: { mode: "Metro", name: "Metro Line 1 → Gate A", price: 60, status: "fulfilled" },
      hotel: { name: "The Taj – Palace", nights: 1, price: 5700, status: "held" },
      total: 8258,
      paid: true,
      gateway: "Card",
      reference: "RCPT-J0E8",
    },
  },
];

/* ================= ORGANIZER: PER-EVENT ATTENDEES ================= */

export interface EventLite {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  services: string[];
  poster: string;
}

export function getOrganizerEvents(): EventLite[] {
  const mine: EventLite[] = EVENTS.filter((e) => e.id === EVENTS[0].id).map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    time: e.time,
    venue: e.venue,
    city: e.city,
    services: e.services,
    poster: e.poster,
  }));
  const hosted = getHostedEvents().map((h): EventLite => ({
    id: h.id,
    name: h.name,
    date: h.date,
    time: h.time,
    venue: h.venue,
    city: h.city,
    services: h.services,
    poster: h.image,
  }));
  return [...mine, ...hosted];
}

const RG_NAME = ["Ananya Rao", "Vikram Joshi", "Riya Kapoor", "Dev Malhotra", "Isha Patel", "Kabir Khanna", "Nisha Verma", "Aditya Nair", "Meera Iyer", "Rohan Mehta", "Sanya Batra", "Arjun Singh", "Pooja Reddy"];
const RG_CITY = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Hyderabad", "Jaipur", "Chennai", "Kolkata"];
const RG_SEATING = ["Standing – North", "Balcony – East", "Premium Floor – F1", "VIP Box – B2", "Balcony – South", "Standing – East"];
const SLOT_POOL = ["7:00 PM", "9:00 PM", "11:00 PM"];
const GATE_POOL = ["Gate A", "Gate B", "Gate C", "Gate D"];
const RG_TRANSPORT = [
  { mode: "Metro", name: "Metro Line 1 → Gate A", price: 60 },
  { mode: "Shuttle", name: "Pulse Shuttle S-121", price: 120 },
  { mode: "Cab", name: "UrbanRide Express", price: 640 },
];
const RG_HOTEL = [
  { name: "The Taj – Palace", nights: 1, price: 5400 },
  { name: "Hyatt Regency", nights: 1, price: 4100 },
  { name: "The Oberoi – Marine", nights: 1, price: 5200 },
];

function lcg(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function hashStr(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(rand: () => number, pool: T[]): T {
  return pool[Math.floor(rand() * pool.length)];
}

export function getEventAttendees(eventId: string): Attendee[] {
  if (eventId === EVENTS[0].id) return ATTENDEES.map((a) => ({ ...a, eventId }));

  const rand = lcg(hashStr(eventId) || 1);
  const count = 10 + Math.floor(rand() * 6);
  const baseId = 200000 + (hashStr(eventId) % 90000);
  const t0 = Date.parse("2026-08-16T00:00:00");
  const list: Attendee[] = [];

  for (let i = 0; i < count; i++) {
    const name = RG_NAME[Math.floor(rand() * RG_NAME.length)];
    const city = pick(rand, RG_CITY);
    const age = 19 + Math.floor(rand() * 20);
    const slot = pick(rand, SLOT_POOL);
    const gate = pick(rand, GATE_POOL);
    const seating = pick(rand, RG_SEATING);
    const tickets = 1 + Math.floor(rand() * 2);
    const ticketAmt = tickets * 1249;
    const transport = rand() < 0.68 ? { ...pick(rand, RG_TRANSPORT), status: "fulfilled" as const } : null;
    const hotel = rand() < 0.42 ? { ...pick(rand, RG_HOTEL), nights: 1 + Math.floor(rand() * 2), status: (rand() < 0.6 ? "fulfilled" : "held") as "fulfilled" | "held" } : null;
    const total = ticketAmt + (transport?.price ?? 0) + (hotel?.price ?? 0);
    const statusRoll = rand();
    const status: AttendeeStatus = statusRoll < 0.45 ? "checked-in" : statusRoll < 0.72 ? "arriving" : statusRoll < 0.9 ? "pending" : "cancelled";
    const joined = new Date(t0 + Math.floor(rand() * 14) * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const levelRoll = rand();
    const gLevel: GLevel = levelRoll < 0.12 ? "G5" : levelRoll < 0.5 ? "G3" : levelRoll < 0.85 ? "G2" : "G1";

    list.push({
      id: `EP-${baseId + i}`,
      name,
      age,
      city,
      phone: `+91 ${90000 + Math.floor(rand() * 9999)} ${10000 + Math.floor(rand() * 89999)}`,
      email: `${name.toLowerCase().replace(/[^a-z]/g, "")}${i}@mail.com`,
      group: gLevel,
      joined,
      slot,
      gate,
      seating,
      checkedInAt: status === "checked-in" ? "6:18 PM" : null,
      status,
      gLevel,
      booking: {
        slot,
        tickets,
        ticketAmt,
        transport,
        hotel,
        total,
        paid: status !== "cancelled" && rand() < 0.92,
        gateway: pick(rand, ["UPI", "Card", "UPI", "Wallet"]),
        reference: `RCPT-${(hashStr(eventId + i).toString(36) + "A1").slice(0, 5).toUpperCase()}`,
      },
      eventId,
    });
  }
  return list;
}
