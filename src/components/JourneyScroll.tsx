import { useEffect, useRef, useState, useCallback } from "react";

/* ═══════════════════════════════════════════════════════
   EVENTPULSE CINEMATIC JOURNEY — "You are travelling through
   EventPulse."

   12 images = 12 shots of ONE continuous film.
   Scroll = camera. Movement = transition. Background = environment.

   Camera paths are ENDLESS: the end pose of scene N is exactly
   the start pose of scene N+1, so the camera never resets.

   Transitions are camera cuts with motion continuity, not
   equal-opacity crossfades:
   - incoming scene enters with directional movement + brief motion blur
   - outgoing scene recedes (soft blur + slight scale) before fading
   - at every scroll position ≥ 1 scene remains visible (never black)

   After scene 12 an epilogue beat lets the camera settle and the
   background return to Warm Stone before the page flows into the
   Orchestration Engine section.
   ═══════════════════════════════════════════════════════ */

const SCENE_COUNT = 12;
const OVERLAP_PX = 150;

/* Per-scene scroll lengths — important beats breathe longer */
const SCENE_LENGTHS = [420, 400, 400, 500, 420, 500, 560, 440, 420, 500, 440, 460];

/* Closing beat after scene 12 — slow settle into the system section */
const EPILOGUE_LEN = 420;

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
const LAST_SEG_END = SEG_END[SCENE_COUNT - 1];
const TOTAL_SCROLL = LAST_SEG_END + EPILOGUE_LEN;

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
  if (scroll >= TOTAL_SCROLL) return SCENE_COUNT - 1;
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
  radial: string;
  env: "topo" | "grid" | "route" | "city" | "clean";
}

/* Bg colors follow the EventPulse palette as one continuous arc:
   Warm Stone · Soft Sage · Deep Green · Burnt Terracotta · Deep Teal · Soft Surface */
const SCENES: SceneData[] = [
  {
    src: "/images/journey/journey-01.png",
    label: "DISCOVER",
    sublabel: "A new event is coming to town.",
    bgStart: "#F3EFE7",
    radial: "rgba(201,166,107,0.14)",
    env: "topo",
  },
  {
    src: "/images/journey/journey-02.png",
    label: "PLAN",
    sublabel: "Every detail, planned ahead.",
    bgStart: "#F3EFE7",
    radial: "rgba(35,135,125,0.12)",
    env: "topo",
  },
  {
    src: "/images/journey/journey-03.png",
    label: "CHOOSE",
    sublabel: "The right option, not the obvious one.",
    bgStart: "#F3EFE7",
    radial: "rgba(185,104,67,0.14)",
    env: "grid",
  },
  {
    src: "/images/journey/journey-04.png",
    label: "SMART RECOMMENDATIONS",
    sublabel: "Prediction backed by live conditions.",
    bgStart: "#DDE5DF",
    radial: "rgba(35,135,125,0.16)",
    env: "route",
  },
  {
    src: "/images/journey/journey-05.png",
    label: "LIVE CROWD",
    sublabel: "The city, reading itself in real time.",
    bgStart: "#DDE5DF",
    radial: "rgba(35,135,125,0.16)",
    env: "route",
  },
  {
    src: "/images/journey/journey-06.png",
    label: "ALERTS",
    sublabel: "Know before it becomes a problem.",
    bgStart: "#18201F",
    radial: "rgba(24,32,31,0.30)",
    env: "route",
  },
  {
    src: "/images/journey/journey-07.png",
    label: "ARRIVAL",
    sublabel: "EventPulse picks the calmer road.",
    bgStart: "#B96843",
    radial: "rgba(185,104,67,0.26)",
    env: "grid",
  },
  {
    src: "/images/journey/journey-08.png",
    label: "EXPERIENCE",
    sublabel: "Every arrival, in full colour.",
    bgStart: "#B96843",
    radial: "rgba(185,104,67,0.22)",
    env: "route",
  },
  {
    src: "/images/journey/journey-09.png",
    label: "CONNECTED CITY",
    sublabel: "Venues, transit and events — one system.",
    bgStart: "#23877D",
    radial: "rgba(35,135,125,0.20)",
    env: "city",
  },
  {
    src: "/images/journey/journey-10.png",
    label: "REAL IMPACT",
    sublabel: "The whole city, in one frame.",
    bgStart: "#23877D",
    radial: "rgba(35,135,125,0.18)",
    env: "city",
  },
  {
    src: "/images/journey/journey-11.png",
    label: "BRIGHTER DAYS",
    sublabel: "Better decisions, city-wide.",
    bgStart: "#23877D",
    radial: "rgba(35,135,125,0.16)",
    env: "city",
  },
  {
    src: "/images/journey/journey-12.png",
    label: "EVENTPULSE CLOSE",
    sublabel: "Always on time. Always ahead.",
    bgStart: "#FAF8F3",
    radial: "rgba(185,104,67,0.10)",
    env: "clean",
  },
];

/* Per-scene subtle brightness / contrast tuning */
const ART_BRIGHTNESS = [1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 1.02, 1.02, 1.05, 1.06, 1.05, 1.04];
const ART_CONTRAST = [1.0, 1.0, 1.0, 1.0, 1.0, 1.04, 1.0, 1.0, 1.0, 1.0, 1.0, 0.98];

/* ═══════════════════════════════════════════════════════
   CONTINUOUS CAMERA CHOREOGRAPHY

   end state of scene i  ==  start state of scene i+1.
   tx/ty = translate in vw/vh · sc = scale · blur = px · rot = deg
   ═══════════════════════════════════════════════════════ */
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

/* All poses are kept within a tight framing band (±<=1.2vw / ty≈-1..2.8vh,
   scale 1.0–1.3) so the subject stays inside the 100vh stage. Scene 01
   begins exactly centered (0,0,1.0) — the first visible frame is fully
   composed, then the camera eases forward. */
const CAMERAS: CamKey[] = [
  // 01 DISCOVER — begins CENTERED, then a subtle forward push
  {
    start: { tx: 0.0, ty: 0.0, sc: 1.0, blur: 0.8, rot: 0 },
    end:   { tx: 0.4, ty: 0.3, sc: 1.08, blur: 0.08, rot: 0 },
  },
  // 02 PLAN — gentle forward drift
  {
    start: { tx: 0.4, ty: 0.3, sc: 1.08, blur: 0.08, rot: 0 },
    end:   { tx: 0.7, ty: -0.3, sc: 1.12, blur: 0.15, rot: 0.2 },
  },
  // 03 CHOOSE — subtle horizontal movement
  {
    start: { tx: 0.7, ty: -0.3, sc: 1.12, blur: 0.15, rot: 0.2 },
    end:   { tx: -0.8, ty: -0.15, sc: 1.15, blur: 0.2, rot: 0.3 },
  },
  // 04 SMART RECOMMENDATIONS — deeper push toward the visual focus
  {
    start: { tx: -0.8, ty: -0.15, sc: 1.15, blur: 0.2, rot: 0.3 },
    end:   { tx: -0.1, ty: 0.2, sc: 1.24, blur: 0.05, rot: 0.1 },
  },
  // 05 LIVE CROWD — horizontal tracking
  {
    start: { tx: -0.1, ty: 0.2, sc: 1.24, blur: 0.05, rot: 0.1 },
    end:   { tx: 1.2, ty: 0.15, sc: 1.2, blur: 0.18, rot: -0.5 },
  },
  // 06 ALERTS — controlled zoom, emphasis
  {
    start: { tx: 1.2, ty: 0.15, sc: 1.2, blur: 0.18, rot: -0.5 },
    end:   { tx: 0.9, ty: 0.35, sc: 1.3, blur: 0.28, rot: -0.3 },
  },
  // 07 ARRIVAL — directional movement navigating toward the destination
  {
    start: { tx: 0.9, ty: 0.35, sc: 1.3, blur: 0.28, rot: -0.3 },
    end:   { tx: -0.9, ty: -0.2, sc: 1.22, blur: 0.4, rot: 0.5 },
  },
  // 08 EXPERIENCE — forward movement, arrival
  {
    start: { tx: -0.9, ty: -0.2, sc: 1.22, blur: 0.4, rot: 0.5 },
    end:   { tx: -0.4, ty: -0.6, sc: 1.3, blur: 0.1, rot: 0.3 },
  },
  // 09 CONNECTED CITY — slight lateral / environmental movement
  {
    start: { tx: -0.4, ty: -0.6, sc: 1.3, blur: 0.1, rot: 0.3 },
    end:   { tx: 0.3, ty: -0.9, sc: 1.26, blur: 0.15, rot: 0.2 },
  },
  // 10 REAL IMPACT — reverse direction, begin pulling the camera back
  {
    start: { tx: 0.3, ty: -0.9, sc: 1.26, blur: 0.15, rot: 0.2 },
    end:   { tx: 0.0, ty: 1.2, sc: 1.04, blur: 0.7, rot: 0 },
  },
  // 11 BRIGHTER DAYS — continue the slow pullback, room to breathe
  {
    start: { tx: 0.0, ty: 1.2, sc: 1.04, blur: 0.7, rot: 0 },
    end:   { tx: 0.0, ty: 2.0, sc: 0.97, blur: 0.9, rot: 0 },
  },
  // 12 EVENTPULSE CLOSE — elegant slow pullback; epilogue extends it
  {
    start: { tx: 0.0, ty: 2.0, sc: 0.97, blur: 0.9, rot: 0 },
    end:   { tx: 0.0, ty: 2.8, sc: 0.92, blur: 0.8, rot: 0 },
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

interface StageEls {
  scenes: HTMLDivElement[];
  cams: HTMLDivElement[];
  labels: HTMLDivElement[];
  backs: HTMLImageElement[];
  arts: HTMLImageElement[];
  bg: HTMLDivElement | null;
  radial: HTMLDivElement | null;
  eTopo: HTMLDivElement | null;
  eGrid: HTMLDivElement | null;
  eRoute: HTMLDivElement | null;
  eCity: HTMLDivElement | null;
  fin: HTMLDivElement | null;
  vignette: HTMLDivElement | null;
  grain: HTMLDivElement | null;
}

export default function JourneyScroll() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const smoothScrollRef = useRef(0);
  const loadedRef = useRef<Set<number>>(new Set());
  const elsRef = useRef<StageEls | null>(null);
  const envEase = useRef({ topo: 0, grid: 0, route: 0, city: 0 });
  const vigEase = useRef(0.14);
  const grainEase = useRef(0.02);
  const radialEase = useRef(1);
  const [reducedMotion, setReducedMotion] = useState(false);

  /* Eager image preloading on mount — zero black frames */
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

  /* Cache DOM nodes once (perf: no per-frame querySelectorAll) */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    elsRef.current = {
      scenes: Array.from(stage.querySelectorAll<HTMLDivElement>("[data-scene]")),
      cams: Array.from(stage.querySelectorAll<HTMLDivElement>("[data-scene] > [data-camera]")),
      labels: Array.from(stage.querySelectorAll<HTMLDivElement>("[data-label]")),
      backs: Array.from(stage.querySelectorAll<HTMLImageElement>("[data-backdrop]")),
      arts: Array.from(stage.querySelectorAll<HTMLImageElement>("[data-art]")),
      bg: stage.querySelector<HTMLDivElement>("[data-bg]"),
      radial: stage.querySelector<HTMLDivElement>("[data-radial]"),
      eTopo: stage.querySelector<HTMLDivElement>("[data-env-topo]"),
      eGrid: stage.querySelector<HTMLDivElement>("[data-env-grid]"),
      eRoute: stage.querySelector<HTMLDivElement>("[data-env-route]"),
      eCity: stage.querySelector<HTMLDivElement>("[data-env-city]"),
      fin: stage.querySelector<HTMLDivElement>("[data-fin]"),
      vignette: stage.querySelector<HTMLDivElement>("[data-vignette]"),
      grain: stage.querySelector<HTMLDivElement>("[data-grain]"),
    };
  }, []);

  const tick = useCallback(() => {
    const wrapper = wrapperRef.current;
    const els = elsRef.current;
    if (!wrapper || !els) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const visibleH = window.innerHeight;
    const rect = wrapper.getBoundingClientRect();
    const rawScroll = clamp(-rect.top, 0, wrapper.offsetHeight - visibleH);

    /* Smooth lerp for camera inertia */
    smoothScrollRef.current = reducedMotion
      ? rawScroll
      : smoothScrollRef.current + (rawScroll - smoothScrollRef.current) * 0.09;
    const scroll = smoothScrollRef.current;

    /* Epilogue proportion: the closing beat after scene 12 */
    const epRaw = scroll > LAST_SEG_END ? (scroll - LAST_SEG_END) / EPILOGUE_LEN : 0;
    const ep = smoothstep(clamp(epRaw, 0, 1));
    const epSmooth = reducedMotion ? 0.5 : ep;

    const currentIdx = findSegment(scroll);

    /* ═══════════════════════════════════════════════════
       FILM DISSOLVE ENGINE (cover-dissolve)

       Incoming ramps 0→1 while outgoing HOLDS, then shelves
       off quickly once the incoming is dominant. No extended
       50/50 double-image crossfade. ≥1 scene always visible.
       ═══════════════════════════════════════════════════ */
    for (let i = 0; i < SCENE_COUNT; i++) {
      const s = els.scenes[i];
      const camEl = els.cams[i];
      if (!s || !camEl) continue;

      const iSegStart = SEG_START[i];
      const iSegEnd = SEG_END[i];
      const isLast = i === SCENE_COUNT - 1;

      const fadeInStart = iSegStart - OVERLAP_PX;
      const fadeInEnd = iSegStart;
      const fadeOutStart = iSegEnd - OVERLAP_PX;
      const fadeOutEnd = iSegEnd;

      let opacity = 0;
      let transition = 0; // 0..1 identifying mid-transition motion energy

      if (i === 0 && scroll < fadeInEnd) {
        // First scene is fully present before scrolling begins
        opacity = 1.0;
      } else if (scroll >= fadeInStart && scroll < fadeInEnd) {
        // Incoming: ramps 0 → 1
        const s = smoothstep((scroll - fadeInStart) / OVERLAP_PX);
        opacity = s;
        transition = s;
      } else if (scroll >= fadeInEnd && scroll < fadeOutStart) {
        // Dominant: fully visible
        opacity = 1.0;
      } else if (scroll >= fadeOutStart && scroll < fadeOutEnd) {
        // Outgoing: hold, then shelf off as the incoming becomes dominant
        if (isLast) {
          opacity = 1.0;
        } else {
          const s = smoothstep((scroll - fadeOutStart) / OVERLAP_PX);
          opacity = 1.0 - smoothstep(Math.max(0, (s - 0.42) / 0.52));
          transition = s;
        }
      } else if (scroll >= fadeOutEnd && scroll < fadeOutEnd + OVERLAP_PX) {
        // Post-outgoing: residual leaps off frame after incoming dominates
        if (isLast) {
          opacity = 1.0;
        } else {
          const t = smoothstep((scroll - fadeOutEnd) / OVERLAP_PX);
          opacity = 0.3 * (1.0 - t);
          transition = t;
        }
      }

      s.style.opacity = String(opacity);

      /* ═══════════════════════════════════════════════
         CAMERA + PARALLAX + TRANSITION MOTION
         The camera-layer (backdrop + art ONLY) carries the
         full camera pose. Captions and fades are siblings of
         the camera-layer, so they never scale/translate/rotate
         with the camera — only their opacity/translateY fade
         (handled separately above) affects them.
         ═══════════════════════════════════════════════ */
      const visibleStart = i === 0 ? 0 : fadeInStart;
      const visibleEnd = isLast ? fadeOutEnd : fadeOutEnd + OVERLAP_PX;
      const progress = clamp((scroll - visibleStart) / (visibleEnd - visibleStart), 0, 1);

      let cam = reducedMotion ? getCamera(i, 0.5) : getCamera(i, progress);

      /* Epilogue: continue the final pull-back so scene 12 settles */
      if (isLast && scroll >= iSegEnd) {
        const e = CAMERAS[SCENE_COUNT - 1].end;
        cam = {
          tx: e.tx,
          ty: e.ty + 1.4 * (reducedMotion ? 0.5 : epSmooth),
          sc: e.sc - 0.09 * (reducedMotion ? 0.5 : epSmooth),
          blur: lerp(e.blur, 0.6, epSmooth),
          rot: 0,
        };
      }

      /* Directional entry offset — the incoming scene "arrives" from the
         direction the camera is already travelling (clamped so it never
         pushes the artwork out of the viewport) */
      const k = CAMERAS[i];
      const dirX = k.end.tx - k.start.tx;
      const dirY = k.end.ty - k.start.ty;
      const entry = !reducedMotion ? (1 - smoothstep(transition)) : 0;
      const entryX = clamp(dirX, -1.0, 1.0) * 1.2 * entry;
      const entryY = clamp(dirY, -1.0, 1.0) * 1.2 * entry;

      /* Motion blur peak at the middle of a transition (camera-like) */
      const motionBlur = !reducedMotion
        ? (opacity > 0 && opacity < 1 && transition > 0
            ? 8 * Math.sin(Math.PI * clamp(transition, 0, 1))
            : 0)
        : 0;

      /* Outgoing micro recession — very slight pull-back as it yields */
      const recess = !reducedMotion && opacity < 1 && opacity > 0 && i < SCENE_COUNT - 1
        ? 0.02 * Math.sin(Math.PI * clamp(transition, 0, 1))
        : 0;

      const blurAmt = reducedMotion ? 0 : cam.blur + motionBlur;

      camEl.style.transform =
        `translate(${cam.tx + entryX}vw, ${cam.ty + entryY}vh) ` +
        `scale(${cam.sc * (1 + recess)}) rotate(${cam.rot}deg)`;
      camEl.style.filter = blurAmt > 0.05 ? `blur(${blurAmt.toFixed(2)}px)` : "none";

      const back = els.backs[i];
      if (back) {
        // Far layer — counter-drift for depth (restrained)
        back.style.transform = `translate(${cam.tx * -0.5}vw, ${cam.ty * -0.5}vh) scale(1.25)`;
      }

      const art = els.arts[i];
      if (art) {
        // Near layer — subtle extra drift for depth
        art.style.transform = `translate(${cam.tx * 0.24}vw, ${cam.ty * 0.24}vh) scale(1)`;
        art.style.filter =
          `drop-shadow(0 24px 60px rgba(0,0,0,0.28)) ` +
          `brightness(${ART_BRIGHTNESS[i]}) contrast(${ART_CONTRAST[i]})`;
      }

      /* Editorial label — brief, framed to each shot */
      const lbl = els.labels[i];
      if (lbl) {
        const labelIn = smoothstep((scroll - (iSegStart - 40)) / 60);
        const labelOut = smoothstep((scroll - (isLast ? iSegEnd + 120 : iSegEnd - 60)) / 60);
        const labelAlpha = labelIn * (1 - labelOut);
        lbl.style.opacity = String(labelAlpha * 0.9);
        lbl.style.transform = `translateY(${(1 - labelIn) * 16}px)`;
      }
    }

    /* ═══════════════════════════════════════════════
       CONTINUOUS BACKGROUND EVOLUTION
       One smooth arc through the EventPulse palette —
       no abrupt colour jumps.
       ═══════════════════════════════════════════════ */
    if (els.bg) {
      if (ep > 0) {
        // Epilogue: settle naturally into Warm Stone
        els.bg.style.backgroundColor = lerpColor("#FAF8F3", "#F3EFE7", epSmooth);
      } else {
        const globalProgress = clamp(scroll / TOTAL_SCROLL, 0, 0.999);
        const floatIdx = globalProgress * (SCENE_COUNT - 1);
        const bgIdx = Math.floor(floatIdx);
        const bgFrac = floatIdx - bgIdx;
        const nextBgIdx = Math.min(bgIdx + 1, SCENE_COUNT - 1);
        els.bg.style.backgroundColor = lerpColor(
          SCENES[bgIdx].bgStart,
          SCENES[nextBgIdx].bgStart,
          smoothstep(bgFrac)
        );
      }
    }

    /* Radial atmosphere — light source drifts gently with the camera */
    if (els.radial) {
      const curCam = getCamera(currentIdx, clamp((scroll - SEG_START[currentIdx]) / SCENE_LENGTHS[currentIdx], 0, 1));
      radialEase.current += (1 - 0.85 * epSmooth - radialEase.current) * 0.12;
      els.radial.style.backgroundColor = SCENES[currentIdx].radial;
      els.radial.style.background = `radial-gradient(ellipse 75% 55% at 50% 45%, ${SCENES[currentIdx].radial}, transparent)`;
      els.radial.style.transform = `translate(${curCam.tx * -0.6}vw, ${curCam.ty * -0.6}vh)`;
      els.radial.style.opacity = String(radialEase.current);
    }

    /* Environment texture layers — eased crossfade + camera drift */
    const currentEnv = SCENES[currentIdx].env;
    const curCamEnv = getCamera(currentIdx, clamp((scroll - SEG_START[currentIdx]) / SCENE_LENGTHS[currentIdx], 0, 1));
    const envDrift = `translate(${curCamEnv.tx * -0.8}vw, ${curCamEnv.ty * -0.8}vh)`;
    const envList = [
      ["topo", els.eTopo],
      ["grid", els.eGrid],
      ["route", els.eRoute],
      ["city", els.eCity],
    ] as const;
    for (const [key, el] of envList) {
      if (!el) continue;
      const target = ep > 0 || currentEnv === key ? (currentEnv === key ? 0.55 : 0) : 0;
      envEase.current[key] += (target - envEase.current[key]) * 0.14;
      el.style.opacity = String(envEase.current[key]);
      el.style.transform = envDrift;
    }

    /* Epilogue softens grain + vignette for a clean settle */
    vigEase.current += (0.14 * (1 - 0.6 * epSmooth) - vigEase.current) * 0.1;
    grainEase.current += (0.02 * (1 - 0.6 * epSmooth) - grainEase.current) * 0.1;
    if (els.vignette) els.vignette.style.opacity = String(vigEase.current);
    if (els.grain) els.grain.style.opacity = String(grainEase.current);

    /* Closing narration caption for the epilogue */
    if (els.fin) {
      els.fin.style.opacity = String(smoothstep((epSmooth - 0.3) / 0.45) * 0.9);
      els.fin.style.transform = `translateY(${(1 - smoothstep((epSmooth - 0.3) / 0.45)) * 14}px)`;
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
        style={{ top: 0, width: "100%", height: "100vh" }}
      >
        {/* ── Continuous background base ── */}
        <div data-bg className="absolute inset-0" style={{ backgroundColor: SCENES[0].bgStart }} />

        {/* ── Atmospheric radial glow (drifts with camera) ── */}
        <div data-radial className="absolute inset-0 pointer-events-none will-change-transform" />

        {/* ── Environment texture layers (drift with camera) ── */}
        <div className="absolute inset-0 pointer-events-none">
          {(["topo", "grid", "route", "city"] as const).map((key) => (
            <div
              key={key}
              data-env-topo={key === "topo" ? "" : undefined}
              data-env-grid={key === "grid" ? "" : undefined}
              data-env-route={key === "route" ? "" : undefined}
              data-env-city={key === "city" ? "" : undefined}
              className={`journey-env-layer journey-env-${key} absolute inset-0 will-change-transform`}
              style={{ opacity: 0, transition: "none" }}
            />
          ))}
        </div>

        {/* ── Subtle film grain ── */}
        <div data-grain className="grain absolute inset-0 pointer-events-none" style={{ opacity: 0.02 }} />

        {/* ── Cinematic vignette ── */}
        <div data-vignette className="cinematic-vignette absolute inset-0 pointer-events-none" style={{ opacity: 0.14 }} />

        {/* ── 12 Scene layers ── */}
        {SCENES.map((scene, i) => (
          <div
            key={scene.src}
            data-scene
            className="absolute inset-0"
            style={{ opacity: 0, zIndex: i + 1, willChange: "opacity" }}
          >
            {/* Camera layer — ONLY backdrop + art move/scale/rotate with the
                camera. Its own overflow:hidden is a second clipping boundary
                so no zoomed/panned content can escape the scene bounds. */}
            <div
              data-camera
              className="camera-layer absolute inset-0 overflow-hidden"
              style={{ willChange: "transform, filter" }}
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

              {/* Foreground crisp artwork (parallax near layer — no card framing) */}
              <img
                data-art
                src={scene.src}
                alt={scene.label}
                decoding="async"
                className="absolute inset-0 z-10 h-full w-full object-contain will-change-transform"
                style={{
                  filter: "drop-shadow(0 24px 60px rgba(0,0,0,0.28))",
                }}
              />
            </div>

            {/* Soft bottom fade for legibility (kept light, art stays dominant).
                Sibling of the camera layer — never transformed. */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.04) 16%, transparent 34%)",
              }}
            />

            {/* Top subtle fade */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 14%)",
              }}
            />

            {/* Editorial label overlay — direct sibling of the camera layer,
                so it stays fixed in place no matter how the camera zooms/pans. */}
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

        {/* ── Epilogue closing caption — the journey lands at the system ── */}
        <div
          data-fin
          className="absolute bottom-[18vh] left-[clamp(1.5rem,5vw,4.5rem)] pointer-events-none z-20"
          style={{ opacity: 0, willChange: "opacity, transform" }}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-white/40">
              THE SYSTEM BEHIND EVERY JOURNEY
            </span>
            <span className="h-px w-6 bg-white/25" />
          </div>
          <div className="mt-1 font-display text-2xl font-bold uppercase tracking-[0.08em] text-white md:text-3xl">
            One journey, one system.
          </div>
          <div className="mt-1 max-w-sm text-xs text-white/60 md:text-sm font-medium">
            From the first notice to brighter days — a single connected EventPulse.
          </div>
        </div>
      </div>
    </section>
  );
}