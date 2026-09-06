import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type MapVariant = "hero" | "route" | "journey" | "admin";

interface MapProps {
  variant?: MapVariant;
  emergency?: boolean;
  className?: string;
  children?: ReactNode;
}

/* Deterministic pseudo-random for hero crowd dots */
function dots(seed: number, count: number, cx: number, cy: number, spread: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807) % 2147483647;
    const a = (s / 2147483647) * Math.PI * 2;
    s = (s * 16807) % 2147483647;
    const r = (s / 2147483647) * spread;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, 1.5 + (r / spread) * 3]);
  }
  return out;
}

export function MapView({ variant = "route", emergency = false, className, children }: MapProps) {
  const isHero = variant === "hero";
  const isAdmin = variant === "admin";

  return (
    <div className={cn("relative h-full w-full overflow-hidden rounded-[28px] md:rounded-[36px] border border-card-border bg-[#F3EFE7] shadow-[0_8px_32px_rgba(23,25,24,0.08)]", className)}>
      <svg viewBox="0 0 800 560" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="mapgrid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(144,88,49,0.07)" strokeWidth="1" />
          </pattern>
          <radialGradient id="crowdGrad">
            <stop offset="0%" stopColor="rgba(14,116,144,0.35)" />
            <stop offset="55%" stopColor="rgba(14,116,144,0.12)" />
            <stop offset="100%" stopColor="rgba(14,116,144,0)" />
          </radialGradient>
          <radialGradient id="heatGrad">
            <stop offset="0%" stopColor="rgba(194,101,52,0.45)" />
            <stop offset="60%" stopColor="rgba(154,52,18,0.18)" />
            <stop offset="100%" stopColor="rgba(154,52,18,0)" />
          </radialGradient>
          <radialGradient id="venueGlow">
            <stop offset="0%" stopColor="rgba(35,135,125,0.3)" />
            <stop offset="100%" stopColor="rgba(35,135,125,0)" />
          </radialGradient>
          <filter id="blurS" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* base */}
        <rect width="800" height="560" fill="#F3EFE7" />
        <rect width="800" height="560" fill="url(#mapgrid)" />

        {/* building footprints — subtle sage/stone shapes */}
        {[
          { x: 58, y: 56, w: 68, h: 42, rx: 6 },
          { x: 132, y: 64, w: 50, h: 30, rx: 4 },
          { x: 238, y: 42, w: 56, h: 38, rx: 5 },
          { x: 300, y: 48, w: 42, h: 28, rx: 4 },
          { x: 418, y: 56, w: 62, h: 34, rx: 5 },
          { x: 486, y: 64, w: 48, h: 26, rx: 4 },
          { x: 618, y: 40, w: 54, h: 32, rx: 5 },
          { x: 678, y: 46, w: 40, h: 22, rx: 3 },
          { x: 60, y: 252, w: 48, h: 36, rx: 5 },
          { x: 114, y: 260, w: 38, h: 24, rx: 3 },
          { x: 162, y: 302, w: 54, h: 30, rx: 5 },
          { x: 222, y: 308, w: 36, h: 22, rx: 3 },
          { x: 328, y: 172, w: 50, h: 32, rx: 5 },
          { x: 384, y: 178, w: 34, h: 24, rx: 3 },
          { x: 698, y: 252, w: 42, h: 28, rx: 4 },
          { x: 90, y: 478, w: 58, h: 28, rx: 5 },
          { x: 154, y: 484, w: 40, h: 20, rx: 3 },
          { x: 298, y: 502, w: 66, h: 24, rx: 4 },
          { x: 370, y: 506, w: 44, h: 18, rx: 3 },
          { x: 558, y: 480, w: 52, h: 28, rx: 5 },
          { x: 616, y: 486, w: 38, h: 20, rx: 3 },
        ].map(({ x, y, w, h, rx }, i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx={rx} fill="rgba(176,188,164,0.12)" stroke="rgba(176,188,164,0.22)" strokeWidth="0.8" />
        ))}

        {/* roads */}
        <path d="M -20 200 L 820 210" stroke="#e6dac5" strokeWidth="16" fill="none" />
        <path d="M 380 -20 L 390 580" stroke="#e6dac5" strokeWidth="14" fill="none" />
        <path d="M -20 440 L 820 460" stroke="#ddd0b8" strokeWidth="26" fill="none" />
        <path d="M 120 -20 L 140 580" stroke="#e9ddc8" strokeWidth="10" fill="none" />
        <path d="M 620 220 L 660 580" stroke="#e9ddc8" strokeWidth="8" fill="none" />

        {/* metro line */}
        <path d="M 30 466 Q 400 428 770 466" stroke="#cfdfe1" strokeWidth="7" fill="none" />
        <path d="M 30 466 Q 400 428 770 466" stroke="#23877D" strokeWidth="2" strokeDasharray="10 9" fill="none" opacity="0.75" />
        {[[132, 460], [332, 445], [520, 445], [718, 460]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="9" fill="#FAF8F3" stroke="#23877D" strokeWidth="2" />
            <circle cx={x} cy={y} r="3" fill="#23877D" />
            {(i === 1 || i === 2) && <text x={x} y={y + 24} textAnchor="middle" fill="#8a8072" fontSize="9" fontWeight="700">STATION {i === 1 ? "B" : "C"}</text>}
          </g>
        ))}

        {/* AI prediction lines (hero) */}
        {isHero && (
          <g>
            <path d="M 120 500 C 300 430 420 350 570 250" stroke="#23877D" strokeWidth="1.5" strokeDasharray="6 8" fill="none" opacity="0.5" className="animate-dashflow" />
            <path d="M 210 70 C 340 110 470 150 580 190" stroke="#23877D" strokeWidth="1.5" strokeDasharray="6 8" fill="none" opacity="0.4" className="animate-dashflow" style={{ animationDelay: "-3s" }} />
          </g>
        )}

        {/* recommended route */}
        <path d="M 92 120 C 168 98 238 152 276 204 C 318 260 374 288 440 290 C 522 292 598 262 650 198" stroke="#23877D" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.75" />
        <path d="M 92 120 C 168 98 238 152 276 204 C 318 260 374 288 440 290 C 522 292 598 262 650 198" stroke="#4da8a0" strokeWidth="1.5" strokeDasharray="4 14" fill="none" className="animate-dashflow" />
        {/* walk feeder */}
        <path d="M 92 120 C 150 220 230 350 332 445" stroke="#a89b86" strokeWidth="2" strokeDasharray="3 7" fill="none" opacity="0.8" />
        {/* metro ride highlight */}
        <path d="M 332 445 Q 400 434 520 445" stroke="#23877D" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85" />
        {/* shuttle ride */}
        <path d="M 520 445 C 598 420 632 320 645 214" stroke="#23877D" strokeWidth="3" fill="none" strokeDasharray="8 7" opacity="0.7" />

        {/* venue */}
        <g transform="rotate(-9 650 198)">
          <ellipse cx="650" cy="198" rx="105" ry="70" fill="url(#venueGlow)" />
          <ellipse cx="650" cy="198" rx="76" ry="34" fill="rgba(185,104,67,0.12)" stroke="#B96843" strokeWidth="2" />
          <ellipse cx="650" cy="198" rx="60" ry="24" fill="none" stroke="#B96843" strokeWidth="1" strokeDasharray="4 5" opacity="0.5" />
          <text x="650" y="196" textAnchor="middle" fill="#6b3d25" fontSize="11" fontWeight="700" letterSpacing="1">DY PATIL</text>
          <text x="650" y="210" textAnchor="middle" fill="#B96843" fontSize="8" fontWeight="600" letterSpacing="2">STADIUM</text>
        </g>
        <text x="650" y="258" textAnchor="middle" fill="#8a8072" fontSize="9" fontWeight="700" letterSpacing="1">GATE A · 65K CROWD</text>
        <rect x="592" y="266" width="116" height="18" rx="9" fill="rgba(154,52,18,0.08)" stroke="rgba(154,52,18,0.3)" />
        <text x="650" y="278" textAnchor="middle" fill="#9a3412" fontSize="9" fontWeight="700" letterSpacing="1">HIGH CROWD ZONE</text>

        {/* shuttle */}
        <g>
          <g>
            <rect x="-16" y="-9" width="32" height="18" rx="5" fill="#23877D" stroke="rgba(250,248,243,0.9)" strokeWidth="1.2" />
            <rect x="-11" y="-5" width="7" height="6" rx="1.5" fill="#e0f2f1" />
            <rect x="-1" y="-5" width="7" height="6" rx="1.5" fill="#e0f2f1" />
            <rect x="9" y="-5" width="4" height="6" rx="1.5" fill="#e0f2f1" />
            <circle cx="-8" cy="10" r="2.6" fill="#155e75" />
            <circle cx="8" cy="10" r="2.6" fill="#155e75" />
            <animateMotion dur="13s" repeatCount="indefinite" rotate="auto" path="M 520 445 C 598 420 632 320 645 214" />
          </g>
        </g>

        {/* crowd density zones */}
        <ellipse cx="600" cy="290" rx="140" ry="72" fill="url(#crowdGrad)" className="animate-softpulse" />
        <ellipse cx="735" cy="130" rx="90" ry="52" fill="url(#crowdGrad)" className="animate-softpulse" style={{ animationDelay: "-1.2s" }} />

        {/* hero crowd dots */}
        {isHero &&
          dots(42, 42, 660, 190, 150).map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="rgba(14,116,144,0.35)" className="animate-softpulse" style={{ animationDelay: `${(i % 7) * -0.4}s` }} />
          ))}

        {/* congestion hotspots */}
        <circle cx="252" cy="312" r="42" fill="url(#heatGrad)" filter="url(#blurS)" className="animate-softpulse" />
        <circle cx="566" cy="352" r="50" fill="url(#heatGrad)" filter="url(#blurS)" className="animate-softpulse" style={{ animationDelay: "-1.6s" }} />
        <text x="252" y="300" textAnchor="middle" fill="#9a3412" fontSize="8.5" fontWeight="700" letterSpacing="1">CONGESTION</text>
        <text x="566" y="336" textAnchor="middle" fill="#9a3412" fontSize="8.5" fontWeight="700" letterSpacing="1">SLOW ZONE</text>

        {/* parking & hotels */}
        <g>
          <rect x="688" y="308" width="30" height="30" rx="7" fill="rgba(180,83,9,0.1)" stroke="#b45309" strokeWidth="1.5" />
          <text x="703" y="328" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="800">P</text>
          <text x="703" y="352" textAnchor="middle" fill="#8a8072" fontSize="8.5" fontWeight="700" letterSpacing="1">PARKING</text>
        </g>
        <g>
          <rect x="82" y="392" width="28" height="22" rx="4" fill="none" stroke="#23877D" strokeWidth="1.5" />
          <path d="M 80 392 L 96 380 L 112 392" fill="none" stroke="#23877D" strokeWidth="1.5" />
          <text x="96" y="430" textAnchor="middle" fill="#8a8072" fontSize="8.5" fontWeight="700" letterSpacing="1">HOTELS</text>
        </g>

        {/* admin zones */}
        {isAdmin && (
          <g>
            {[
              [150, 130, "A"], [400, 150, "B"], [640, 330, "C"], [300, 320, "D"],
            ].map(([x, y, z]) => (
              <g key={z as string}>
                <circle cx={x as number} cy={y as number} r="20" fill="rgba(185,104,67,0.07)" stroke={z === "C" ? "rgba(154,52,18,0.55)" : "rgba(185,104,67,0.4)"} strokeWidth="1.2" strokeDasharray="3 4" className="animate-softpulse" />
                <text x={x as number} y={(y as number) + 4} textAnchor="middle" fill={z === "C" ? "#9a3412" : "#B96843"} fontSize="10" fontWeight="800">ZONE {z}</text>
              </g>
            ))}
          </g>
        )}

        {/* emergency overlay */}
        {(emergency || isAdmin) && (
          <g opacity={emergency ? 1 : 0.35}>
            <path d="M 650 198 C 700 280 730 400 745 520" stroke="#dc2626" strokeWidth="3" strokeDasharray="7 7" fill="none" className="animate-dashflow" />
            <path d="M 650 198 C 560 260 480 380 420 520" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="6 8" fill="none" opacity="0.7" />
            {emergency &&
              [[700, 300], [560, 400]].map(([x, y], i) => (
                <g key={i}>
                  <path d={`M ${x - 11} ${y} L ${x} ${y - 16} L ${x + 11} ${y} Z`} fill="#dc2626" opacity="0.9" />
                  <text x={x - 22} y={y - 2} fill="#991b1b" fontSize="7.5" fontWeight="800" letterSpacing="1">EVAC</text>
                </g>
              ))}
          </g>
        )}
      </svg>
      {children}
    </div>
  );
}
