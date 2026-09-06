import { useEffect, useRef, useState, useCallback } from "react";

/* ═══════════════════════════════════════════════
   EVENTPULSE CINEMATIC JOURNEY — "You are travelling
   through EventPulse."

   12 images = 12 shots of ONE continuous film.
   Scroll = camera. Movement = transition.
   Background = environment.

   Camera paths are ENDLESS: the end pose of scene N
   is exactly the start pose of scene N+1, so the
   camera never resets between shots.

   Film dissolve crossfade guarantee:
   - Outgoing scene stays ≥ 0.5 opaque while incoming fades in.
   - At least 1 scene always visible. Zero black/blank frames.
   - Preloaded images ensure zero loading flicker.
   ═══════════════════════════════════════════════ */

const SCENE_COUNT = 12;
const OVERLAP_PX = 140;

/* Per-scene scroll lengths — important beats breathe longer */
const SCENE_LENGTHS = [420, 400, 400, 500, 420, 500, 560, 440, 420, 500, 440, 460];

/* Precomputed segment boundaries (cumulative) */
const SEG_START: number[] = [];
const SEG_END: number[] = [];
{
  let acc = 0;
  SCENE_LENGTHS.forEach((len) => {
    SEG_START.push(acc);
    acc += len;
    SEG_END.push(acc);
  });
}
const TOTAL_SCROLL = SEG_END[SCENE_COUNT - 1];

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function smoothstep(t: number) {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}

function lerpColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca.r, cb.r, t))},${Math.round(lerp(ca.g, cb.g, t))},${Math.round(lerp(ca.b, cb.b, t))})`;
}

/* Find the scene whose segment contains the current scroll position */
function findSegment(scroll: number): number {
  let idx = 0;
  for (let i = 0; i < SCENE_COUNT; i++) {
    if (scroll >= SEG_START[i]) idx = i;
    else break;
  }
  return clamp(idx, 0, SCENE_COUNT - 1);
}

interface SceneData {
  src: string;
  label: string;
  sublabel: string;
  bgStart: string;
  bgEnd: string;
  radial: string;
  env: "topo" | "grid" | "route" | "city" | "clean";
}

const SCENES: SceneData[] = [
  {
    src: "/images/journey/journey-01.png",
    label: "DISCOVER",
    sublabel: "A new event is coming to town.",
    bgStart: "#F7F3EA",
    bgEnd: "#F1ECE0",
    radial: "rgba(201,166,107,0.14)",
    env: "topo",
  },
  {
    src: "/images/journey/journey-02.png",
    label: "PLAN",
    sublabel: "Entering the planning experience.",
    bgStart: "#F1ECE0",
    bgEnd: "#ECE5D8",
    radial: "rgba(35,135,125,0.12)",
    env: "topo",
  },
  {
    src: "/images/journey/journey-03.png",
    label: "CHOOSE",
    sublabel: "What works best for me?",
    bgStart: "#ECE5D8",
    bgEnd: "#E3DACB",
    radial: "rgba(185,104,67,0.14)",
    env: "grid",
  },
  {
    src: "/images/journey/journey-04.png",
    label: "OPTIMIZE",
    sublabel: "Prediction backed by live capacity.",
    bgStart: "#DCE2D4",
    bgEnd: "#D3DCCB",
    radial: "rgba(35,135,125,0.16)",
    env: "route",
  },
  {
    src: "/images/journey/journey-05.png",
    label: "MOVE",
    sublabel: "Horizontal tracking through the city.",
    bgStart: "#D3DCCB",
    bgEnd: "#C3CDC0",
    radial: "rgba(35,135,125,0.16)",
    env: "route",
  },
  {
    src: "/images/journey/journey-06.png",
    label: "LIVE CROWD",
    sublabel: "Reading real-time crowd pressure.",
    bgStart: "#C3CDC0",
    bgEnd: "#A3B1A4",
    radial: "rgba(24,32,31,0.28)",
    env: "route",
  },
  {
    src: "/images/journey/journey-07.png",
    label: "REDIRECT",
    sublabel: "EventPulse changes the journey.",
    bgStart: "#C08A64",
    bgEnd: "#3A5A55",
    radial: "rgba(185,104,67,0.26)",
    env: "grid",
  },
  {
    src: "/images/journey/journey-08.png",
    label: "ARRIVE",
    sublabel: "Calm entry along the new route.",
    bgStart: "#3A5A55",
    bgEnd: "#2E4E48",
    radial: "rgba(46,78,72,0.24)",
    env: "route",
  },
  {
    src: "/images/journey/journey-09.png",
    label: "EXPERIENCE",
    sublabel: "Inside the event — celebratory & bright.",
    bgStart: "#D89B6A",
    bgEnd: "#CD8D5F",
    radial: "rgba(216,155,106,0.22)",
    env: "city",
  },
  {
    src: "/images/journey/journey-10.png",
    label: "CONNECT",
    sublabel: "Revealing the connected city around it.",
    bgStart: "#CD8D5F",
    bgEnd: "#C08157",
    radial: "rgba(200,138,94,0.20)",
    env: "city",
  },
  {
    src: "/images/journey/journey-11.png",
    label: "IMPACT",
    sublabel: "Events, transport, venues — one picture.",
    bgStart: "#C08157",
    bgEnd: "#B57A52",
    radial: "rgba(35,135,125,0.16)",
    env: "city",
  },
  {
    src: "/images/journey/journey-12.png",
    label: "BRIGHTER TOMORROW",
    sublabel: "Smarter crowds. Brighter events.",
    bgStart: "#F5EFE3",
    bgEnd: "#FAF6EE",
    radial: "rgba(185,104,67,0.10)",
    env: "clean",
  },
];

/* ═══════════════════════════════════════════════
   CONTINUOUS CAMERA CHOREOGRAPHY

   end state of scene i  ==  start state of scene i+1.
   The camera is ONE continuous lens travelling the story:
   phone → app → choice → recommendation → route → road →
   venue → event → city → tomorrow.

   tx/ty = translate in vw/vh · sc = scale · blur = gaussian · rot = deg
   ═══════════════════════════════════════════════ */
interface CamState {
  tx: number;
  ty: number;
  sc: number;
  blur: number;
  rot: number;
}
interface CamKey {
  start: CamState;
  end: CamState;
}

const CAMERAS: CamKey[] = [
  // 01 DISCOVER — open slightly wide, then slow push into the phone
  {
    start: { tx: 2.2, ty: 1.2, sc: 1.04, blur: 1.2, rot: 0 },
    end:   { tx: 0.0, ty: 0.3, sc: 1.14, blur: 0.1, rot: 0 },
  },
  // 02 PLAN — continue the same lens, move deeper into planning
  {
    start: { tx: 0.0, ty: 0.3, sc: 1.14, blur: 0.1, rot: 0 },
    end:   { tx: 0.4, ty: -0.3, sc: 1.2, blur: 0.2, rot: -0.3 },
  },
  // 03 CHOOSE — gentle horizontal drift, exploring the options
  {
    start: { tx: 0.4, ty: -0.3, sc: 1.2, blur: 0.2, rot: -0.3 },
    end:   { tx: -1.4, ty: -0.15, sc: 1.22, blur: 0.3, rot: 0.4 },
  },
  // 04 OPTIMIZE — slow, deliberate push toward the recommendation
  {
    start: { tx: -1.4, ty: -0.15, sc: 1.22, blur: 0.3, rot: 0.4 },
    end:   { tx: -0.3, ty: 0.15, sc: 1.36, blur: 0.05, rot: 0 },
  },
  // 05 MOVE — shift into horizontal tracking along the route
  {
    start: { tx: -0.3, ty: 0.15, sc: 1.36, blur: 0.05, rot: 0 },
    end:   { tx: 2.8, ty: 0.1, sc: 1.3, blur: 0.2, rot: -1.0 },
  },
  // 06 LIVE CROWD — intensity builds, subtle zoom toward the crowd
  {
    start: { tx: 2.8, ty: 0.1, sc: 1.3, blur: 0.2, rot: -1.0 },
    end:   { tx: 1.8, ty: 0.5, sc: 1.44, blur: 0.3, rot: -0.5 },
  },
  // 07 REDIRECT — THE DIRECTION CHANGE: swing away from the crowded
  // route and follow the alternative. EventPulse changes the journey.
  {
    start: { tx: 1.8, ty: 0.5, sc: 1.44, blur: 0.3, rot: -0.5 },
    end:   { tx: -2.4, ty: 0.0, sc: 1.3, blur: 0.5, rot: 1.4 },
  },
  // 08 ARRIVAL — continue from 07, follow the route to the venue, calm
  {
    start: { tx: -2.4, ty: 0.0, sc: 1.3, blur: 0.5, rot: 1.4 },
    end:   { tx: -0.5, ty: -0.6, sc: 1.4, blur: 0.1, rot: 0 },
  },
  // 09 EXPERIENCE — move INTO the event; warm, bright, energetic payoff
  {
    start: { tx: -0.5, ty: -0.6, sc: 1.4, blur: 0.1, rot: 0 },
    end:   { tx: 0.3, ty: -1.6, sc: 1.52, blur: 0.1, rot: 0.5 },
  },
  // 10 CONNECT — REVERSE DIRECTION: dramatic pull-back revealing the city
  {
    start: { tx: 0.3, ty: -1.6, sc: 1.52, blur: 0.1, rot: 0.5 },
    end:   { tx: 0.0, ty: 2.8, sc: 1.08, blur: 0.9, rot: 0 },
  },
  // 11 IMPACT — continue pulling back; the connected city is the subject
  {
    start: { tx: 0.0, ty: 2.8, sc: 1.08, blur: 0.9, rot: 0 },
    end:   { tx: 0.0, ty: 4.4, sc: 0.96, blur: 1.1, rot: 0 },
  },
  // 12 BRIGHTER TOMORROW — slow emotional pull-back to a clean warm ending
  {
    start: { tx: 0.0, ty: 4.4, sc: 0.96, blur: 1.1, rot: 0 },
    end:   { tx: 0.0, ty: 5.4, sc: 0.88, blur: 0.9, rot: 0 },
  },
];

function getCamera(i: number, p: number): CamState {
  const k = CAMERAS[i];
  const t = smoothstep(p);
  return {
    tx: lerp(k.start.tx, k.end.tx, t),
    ty: lerp(k.start.ty, k.end.ty, t),
    sc: lerp(k.start.sc, k.end.sc, t),
    blur: lerp(k.start.blur, k.end.blur, t),
    rot: lerp(k.start.rot, k.end.rot, t),
  };
}

export default function JourneyScroll() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const smoothScrollRef = useRef(0);
  const loadedRef = useRef<Set<number>>(new Set());
  const [reducedMotion, setReducedMotion] = useState(false);

  /* Eager image preloading on mount */
  useEffect(() => {
    SCENES.forEach((scene, i) => {
      const img = new Image();
      img.src = scene.src;
      img.onload = () => {
        loadedRef.current.add(i);
      };
    });
  }, []);

  /* Check reduced motion */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const tick = useCallback(() => {
    const wrapper = wrapperRef.current;
    const stage = stageRef.current;
    if (!wrapper || !stage) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const wraps = stage.querySelectorAll<HTMLDivElement>("[data-scene]");
    const labels = stage.querySelectorAll<HTMLDivElement>("[data-label]");
    const backdrops = stage.querySelectorAll<HTMLImageElement>("[data-backdrop]");
    const artworks = stage.querySelectorAll<HTMLImageElement>("[data-art]");
    const bgEl = stage.querySelector<HTMLDivElement>("[data-bg]");
    const radialE = stage.querySelector<HTMLDivElement>("[data-radial]");
    const eTopo = stage.querySelector<HTMLDivElement>("[data-env-topo]");
    const eGrid = stage.querySelector<HTMLDivElement>("[data-env-grid]");
    const eRoute = stage.querySelector<HTMLDivElement>("[data-env-route]");
    const eCity = stage.querySelector<HTMLDivElement>("[data-env-city]");
    const pLine = stage.querySelector<HTMLDivElement>("[data-progress]");
    const cEl = stage.querySelector<HTMLDivElement>("[data-counter]");

    const visibleH = window.innerHeight;
    const rect = wrapper.getBoundingClientRect();
    const rawScroll = clamp(-rect.top, 0, wrapper.offsetHeight - visibleH);

    /* Smooth lerp for camera inertia */
    smoothScrollRef.current = reducedMotion
      ? rawScroll
      : smoothScrollRef.current + (rawScroll - smoothScrollRef.current) * 0.09;
    const scroll = smoothScrollRef.current;

    /* ═══════════════════════════════════════════════
       FILM DISSOLVE CROSSFADE ENGINE (segment based)
       Scene A dominant → A+B blended → B dominant.
       At every scroll position ≥ 1 scene is ≥ 0.5 opaque.
       ═══════════════════════════════════════════════ */

    const currentIdx = findSegment(scroll);

    for (let i = 0; i < SCENE_COUNT; i++) {
      const w = wraps[i];
      if (!w) continue;

      const iSegStart = SEG_START[i];
      const iSegEnd = SEG_END[i];

      let opacity = 0;

      const fadeInStart = iSegStart - OVERLAP_PX;
      const fadeInEnd = iSegStart;
      const fadeOutStart = iSegEnd - OVERLAP_PX;
      const fadeOutEnd = iSegEnd;

      if (i === 0 && scroll < fadeInEnd) {
        // First scene is always fully visible before the scrolling begins
        opacity = 1.0;
      } else if (scroll >= fadeInStart && scroll < fadeInEnd) {
        // Incoming phase: fade from 0 to 1
        const t = (scroll - fadeInStart) / OVERLAP_PX;
        opacity = smoothstep(t);
      } else if (scroll >= fadeInEnd && scroll < fadeOutStart) {
        // Dominant phase: fully visible
        opacity = 1.0;
      } else if (scroll >= fadeOutStart && scroll < fadeOutEnd) {
        // Outgoing phase: fade from 1 to 0.5 — NEVER below 0.5
        if (i === SCENE_COUNT - 1) {
          opacity = 1.0; // Last scene stays visible
        } else {
          const t = (scroll - fadeOutStart) / OVERLAP_PX;
          opacity = 1.0 - 0.5 * smoothstep(t);
        }
      } else if (scroll >= fadeOutEnd && scroll < fadeOutEnd + OVERLAP_PX) {
        // Post-outgoing phase: fade from 0.5 to 0 after incoming is dominant
        if (i === SCENE_COUNT - 1) {
          opacity = 1.0;
        } else {
          const t = (scroll - fadeOutEnd) / OVERLAP_PX;
          opacity = 0.5 * (1.0 - smoothstep(t));
        }
      }

      w.style.opacity = String(opacity);

      /* ═══════════════════════════════════════════
         CAMERA + PARALLAX
         The wrapper carries the full camera pose.
         Backdrop and artwork add counter-drift so the
         scene reads as layered depth, not a flat card.
         ═══════════════════════════════════════════ */
      const visibleStart = i === 0 ? 0 : fadeInStart;
      const visibleEnd = i === SCENE_COUNT - 1 ? fadeOutEnd : fadeOutEnd + OVERLAP_PX;
      const progress = clamp((scroll - visibleStart) / (visibleEnd - visibleStart), 0, 1);

      const cam = reducedMotion ? getCamera(i, 0.5) : getCamera(i, progress);
      const blurAmt = reducedMotion ? 0 : cam.blur;

      w.style.transform = `translate(${cam.tx}vw, ${cam.ty}vh) scale(${cam.sc}) rotate(${cam.rot}deg)`;
      w.style.filter = blurAmt > 0.05 ? `blur(${blurAmt}px)` : "none";
      if (w.style.filter === "blur(0px)") w.style.filter = "none";

      const back = backdrops[i];
      if (back) {
        // Far layer — moves slower than the camera (parallax depth)
        back.style.transform = `translate(${cam.tx * -0.55}vw, ${cam.ty * -0.55}vh) scale(1.25)`;
      }

      const art = artworks[i];
      if (art) {
        // Near layer — drifts slightly more than the camera
        art.style.transform = `translate(${cam.tx * 0.28}vw, ${cam.ty * 0.28}vh) scale(1)`;
      }

      /* Editorial label transition */
      const lbl = labels[i];
      if (lbl) {
        const labelIn = smoothstep((scroll - (iSegStart - 40)) / 60);
        const labelOut = smoothstep((scroll - (iSegEnd - 60)) / 60);
        const labelAlpha = labelIn * (1 - labelOut);
        lbl.style.opacity = String(labelAlpha * 0.9);
        lbl.style.transform = `translateY(${(1 - labelIn) * 16}px)`;
      }
    }

    /* ═══════════════════════════════════════════════
       CONTINUOUS BACKGROUND COLOR EVOLUTION
       Blends the scene "color bands" into one smooth arc:
       01-03 warm ivory/stone → 04-06 sage to deep charcoal →
       07-08 terracotta + teal → 09-11 sunset city → 12 clean ivory
       ═══════════════════════════════════════════════ */
    if (bgEl) {
      const globalProgress = clamp(scroll / TOTAL_SCROLL, 0, 0.999);
      const floatIdx = globalProgress * (SCENE_COUNT - 1);
      const bgIdx = Math.floor(floatIdx);
      const bgFrac = floatIdx - bgIdx;
      const nextBgIdx = Math.min(bgIdx + 1, SCENE_COUNT - 1);

      const blendedColor = lerpColor(
        SCENES[bgIdx].bgStart,
        SCENES[nextBgIdx].bgStart,
        smoothstep(bgFrac)
      );
      bgEl.style.backgroundColor = blendedColor;
    }

    /* Radial atmospheric lighting — drifts subtly with the camera */
    const curCam = getCamera(currentIdx, clamp((scroll - SEG_START[currentIdx]) / SCENE_LENGTHS[currentIdx], 0, 1));
    if (radialE) {
      radialE.style.background = `radial-gradient(ellipse 75% 55% at 50% 45%, ${SCENES[currentIdx].radial}, transparent)`;
      radialE.style.transform = `translate(${curCam.tx * -0.6}vw, ${curCam.ty * -0.6}vh)`;
    }

    /* Environment texture layers — crossfade + subtle camera drift */
    const currentEnv = SCENES[currentIdx].env;
    const envDrift = `translate(${curCam.tx * -0.8}vw, ${curCam.ty * -0.8}vh)`;
    const envMap: Record<string, HTMLDivElement | null> = {
      topo: eTopo,
      grid: eGrid,
      route: eRoute,
      city: eCity,
    };
    for (const [key, el] of Object.entries(envMap)) {
      if (el) {
        el.style.opacity = currentEnv === key ? "0.55" : "0";
        el.style.transform = envDrift;
      }
    }

    /* Progress counter & bar */
    if (cEl) {
      cEl.textContent = `${String(currentIdx + 1).padStart(2, "0")} / ${String(SCENE_COUNT).padStart(2, "0")}`;
    }
    if (pLine) {
      pLine.style.transform = `scaleX(${clamp(scroll / TOTAL_SCROLL, 0, 1)})`;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [reducedMotion]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const wrapperHeight = `calc(100vh + ${TOTAL_SCROLL}px)`;

  return (
    <section ref={wrapperRef} style={{ height: wrapperHeight }} className="relative">
      <div
        ref={stageRef}
        className="sticky inset-0 overflow-hidden"
        style={{ top: 0, height: "100vh" }}
      >
        {/* ── Continuous background base ── */}
        <div data-bg className="absolute inset-0" style={{ backgroundColor: SCENES[0].bgStart }} />

        {/* ── Atmospheric radial glow (drifts with camera) ── */}
        <div data-radial className="absolute inset-0 pointer-events-none will-change-transform" />

        {/* ── Environment texture layers (drift with camera) ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div data-env-topo className="journey-env-layer journey-env-topo absolute inset-0 opacity-0 will-change-transform" />
          <div data-env-grid className="journey-env-layer journey-env-grid absolute inset-0 opacity-0 will-change-transform" />
          <div data-env-route className="journey-env-layer journey-env-route absolute inset-0 opacity-0 will-change-transform" />
          <div data-env-city className="journey-env-layer journey-env-city absolute inset-0 opacity-0 will-change-transform" />
        </div>

        {/* ── Subtle film grain ── */}
        <div className="grain absolute inset-0 pointer-events-none" style={{ opacity: 0.02 }} />

        {/* ── Cinematic vignette ── */}
        <div className="cinematic-vignette absolute inset-0 pointer-events-none" style={{ opacity: 0.14 }} />

        {/* ── 12 Scene layers ── */}
        {SCENES.map((scene, i) => (
          <div
            key={scene.src}
            data-scene
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0, zIndex: i + 1, willChange: "opacity, transform, filter" }}
          >
            {/* Soft atmospheric blurred background fill (parallax far layer) */}
            <img
              data-backdrop
              src={scene.src}
              alt=""
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
              style={{
                filter: "blur(54px) brightness(0.68) saturate(0.9)",
                transform: "scale(1.25)",
              }}
            />

            {/* Foreground crisp artwork (parallax near layer, no card framing) */}
            <img
              data-art
              src={scene.src}
              alt={scene.label}
              decoding="async"
              className="relative z-10 h-full w-full object-contain will-change-transform"
              style={{
                filter: "drop-shadow(0 24px 60px rgba(0,0,0,0.28))",
              }}
            />

            {/* Soft bottom fade for legibility (kept light, art stays dominant) */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0.05) 16%, transparent 34%)",
              }}
            />

            {/* Top subtle fade */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 14%)",
              }}
            />

            {/* Editorial label overlay */}
            <div
              data-label
              className="absolute bottom-[8vh] left-[clamp(1.5rem,5vw,4.5rem)] pointer-events-none z-20"
              style={{ opacity: 0, willChange: "opacity, transform" }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-white/40">
                  SCENE {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-px w-6 bg-white/20" />
              </div>
              <div className="mt-1 font-display text-2xl font-bold uppercase tracking-[0.08em] text-white md:text-4xl">
                {scene.label}
              </div>
              <div className="mt-1 max-w-sm text-xs text-white/60 md:text-sm font-medium">
                {scene.sublabel}
              </div>
            </div>
          </div>
        ))}

        {/* ── Progress indicator (bottom right) ── */}
        <div className="absolute bottom-6 right-8 z-30 pointer-events-none flex items-center gap-3 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <span data-counter className="font-mono text-[11px] font-bold tracking-[0.15em] text-white/60">
            01 / 12
          </span>
          <div className="h-[2px] w-20 overflow-hidden rounded-full bg-white/15">
            <div
              data-progress
              className="h-full w-full origin-left bg-pulse-500"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}