import { useMemo } from "react";
import { compact, type BandKey, type WhereaboutsBand } from "@/pages/organizer/state";

const W = 760;
const H = 520;
const CX = 376;
const CY = 268;

const BAND_HEX: Record<BandKey, string> = {
  onsite: "#059669",
  approach: "#0d9488",
  enroute: "#f59e0b",
  awaited: "#94a3b8",
};

const GRID_X = [130, 250, 376, 500, 620];
const GRID_Y = [100, 186, 268, 350, 432];

interface CorridorDef {
  color: string;
  path: string;
  label: string;
  labelPos: [number, number];
  match: (name: string) => boolean;
}

const CORRIDOR_DEFS: CorridorDef[] = [
  {
    color: "#0d9488",
    path: "M376,268 C420,312 500,352 640,392",
    label: "Metro Line 1",
    labelPos: [668, 402],
    match: (n) => n.includes("Metro"),
  },
  {
    color: "#7c3aed",
    path: "M376,268 C322,220 232,158 128,92",
    label: "Pulse Shuttle",
    labelPos: [150, 84],
    match: (n) => n.includes("Pulse Shuttle"),
  },
  {
    color: "#b45309",
    path: "M376,268 C318,312 232,384 132,436",
    label: "Ride / cab corridors",
    labelPos: [122, 452],
    match: (n) => n.includes("Cab") || n.includes("UrbanRide"),
  },
];

interface ClusterDef {
  x: number;
  y: number;
  band: BandKey;
  share: number;
}

const CLUSTERS: ClusterDef[] = [
  { x: 352, y: 252, band: "onsite", share: 1 },
  { x: 462, y: 306, band: "approach", share: 0.38 },
  { x: 548, y: 352, band: "approach", share: 0.22 },
  { x: 604, y: 372, band: "approach", share: 0.1 },
  { x: 300, y: 202, band: "approach", share: 0.16 },
  { x: 216, y: 148, band: "approach", share: 0.14 },
  { x: 176, y: 96, band: "enroute", share: 0.3 },
  { x: 606, y: 416, band: "enroute", share: 0.24 },
  { x: 330, y: 408, band: "enroute", share: 0.22 },
  { x: 146, y: 310, band: "enroute", share: 0.12 },
  { x: 520, y: 132, band: "enroute", share: 0.12 },
];

export default function ArrivalMap({ bands, corridors }: { bands: WhereaboutsBand[]; corridors: { name: string; count: number }[] }) {
  const bandCount = useMemo(() => {
    const m = {} as Record<BandKey, number>;
    bands.forEach((b) => {
      m[b.key] = b.count;
    });
    return m;
  }, [bands]);

  const routeLines = CORRIDOR_DEFS.map((c) => {
    const hit = corridors.find((x) => c.match(x.name));
    return { ...c, count: hit?.count ?? 0 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl font-sans" role="img" aria-label="Live arrival map">
      <rect width={W} height={H} fill="#fbf8f3" rx="18" />

      {GRID_X.map((x) => (
        <line key={`v${x}`} x1={x} y1={16} x2={x} y2={H - 16} stroke="#efe9df" strokeWidth={1.5} />
      ))}
      {GRID_Y.map((y) => (
        <line key={`h${y}`} x1={16} y1={y} x2={W - 16} y2={y} stroke="#efe9df" strokeWidth={1.5} />
      ))}
      {[200, 200].map((_, i) => (
        <line key={`a${i}`} x1={140 + i * 40} y1={H - 40 - i * 30} x2={620 + i * 40} y2={40 + i * 20} stroke="#f3ede3" strokeWidth={2} />
      ))}

      <circle cx={CX} cy={CY} r={236} fill="#ffffff00" stroke="#dfd6c6" strokeWidth={1.5} strokeDasharray="7 7" />
      <text x={CX} y={CY - 236 + 18} textAnchor="middle" fontSize={9} fontWeight={800} letterSpacing={2} fill="#8d8578">
        30 KM
      </text>

      <circle cx={CX} cy={CY} r={108} fill="#0d948805" stroke="#0d94884d" strokeWidth={1.5} strokeDasharray="7 7" />
      <text x={CX + 108 + 10} y={CY + 4} textAnchor="start" fontSize={9} fontWeight={800} letterSpacing={2} fill="#0d9488">
        10 KM
      </text>

      <circle cx={CX} cy={CY} r={22} fill="#05966914" stroke="#05966973" strokeWidth={2} />
      <text x={CX + 28} y={CY + 26} textAnchor="start" fontSize={9} fontWeight={800} letterSpacing={2} fill="#059669">
        1 KM
      </text>

      {routeLines.map((c) => (
        <g key={c.label}>
          <path d={c.path} fill="none" stroke={c.color} strokeWidth={7} strokeLinecap="round" opacity={0.16} />
          <path d={c.path} fill="none" stroke={c.color} strokeWidth={1.5} strokeDasharray="10 7" opacity={0.8} />
          <g transform={`translate(${c.labelPos[0]}, ${c.labelPos[1]})`}>
            <rect x={-2} y={-9} width={0} height={0} rx={0} fill="#ffffff80" />
            <text textAnchor="middle" fontSize={9.5} fontWeight={800} fill={c.color}>
              {c.label}
            </text>
            <text y={11} textAnchor="middle" fontSize={10} fontWeight={700} fill="#6b645a">
              {c.count ? compact(c.count) : "—"}
              <tspan fontSize={8} fontWeight={600} fill="#8d8578"> inbound</tspan>
            </text>
          </g>
        </g>
      ))}

      {CLUSTERS.map((c, i) => {
        const count = Math.round((bandCount[c.band] ?? 0) * c.share);
        const r = Math.min(30, 7 + Math.sqrt(Math.max(count, 1)) / 9);
        const hex = BAND_HEX[c.band];
        return (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={r} fill={hex} opacity={0.18} />
            <circle cx={c.x} cy={c.y} r={Math.max(3, r * 0.32)} fill={hex} opacity={0.85} />
            {count > 0 && (
              <text x={c.x} y={c.y - r - 4} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={hex}>
                ~{compact(count)}
              </text>
            )}
          </g>
        );
      })}

      <g transform={`translate(${CX}, ${CY})`}>
        <circle r={8} fill="#1f2937" stroke="#ffffff" strokeWidth={2} />
        <circle r={3} fill="#34d399" />
        <rect x={-64} y={14} width={128} height={16} rx={8} fill="#ffffff" stroke="#e7e0d3" />
        <text y={26} textAnchor="middle" fontSize={9} fontWeight={800} letterSpacing={1} fill="#1f2937">
          DY PATIL STADIUM
        </text>
      </g>
    </svg>
  );
}