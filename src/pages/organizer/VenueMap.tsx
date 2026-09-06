import { useRef, useState } from "react";
import { Eye, EyeOff, ImagePlus, MapPin, Trash2, Upload } from "lucide-react";
import { buttonCls, Pill } from "@/components/ui";
import { POI_CATEGORIES, useOrganizer, type VenuePoiCategory } from "@/pages/organizer/state";
import { cn } from "@/utils/cn";

export function clampPct(v: number) {
  return Math.min(98, Math.max(2, v));
}

const META = Object.fromEntries(POI_CATEGORIES.map((c) => [c.key, c]));

export default function VenueMap() {
  const {
    venue,
    setVenueImage,
    addPoi,
    movePoi,
    updatePoi,
    removePoi,
    clearPois,
    togglePublished,
    useSamplePlan,
  } = useOrganizer();

  const [activeCat, setActiveCat] = useState<VenuePoiCategory>("entry");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<string | null>(null);
  const movedRef = useRef(false);

  const counts = POI_CATEGORIES.map((c) => ({ ...c, count: venue.pois.filter((p) => p.category === c.key).length }));
  const selected = venue.pois.find((p) => p.id === selectedId) ?? null;

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setVenueImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clampPct(((e.clientX - rect.left) / rect.width) * 100);
    const y = clampPct(((e.clientY - rect.top) / rect.height) * 100);
    addPoi(activeCat, x, y, `${META[activeCat].label} ${counts.find((c) => c.key === activeCat)!.count + 1}`);
    setSelectedId(null);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">Venue intelligence</div>
            <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">Venue map & floor plan</h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-wandor-muted">
              Upload the event's mega plan and pin everything — entry gates, fire exits, water points, food & seating — so the
              attendee app and live ops share one source of truth.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {venue.published ? (
              <Pill tone="green"><Eye className="h-3 w-3" /> Visible to attendees</Pill>
            ) : (
              <Pill tone="amber"><EyeOff className="h-3 w-3" /> Draft — not published</Pill>
            )}
            <button className={buttonCls("ghost", "sm")} onClick={togglePublished}>
              {venue.published ? "Unpublish" : "Publish"}
            </button>
            <button className={buttonCls("ghost", "sm")} onClick={() => clearPois()}>
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        <div
          ref={boardRef}
          onClick={place}
          className={cn(
            "relative aspect-[4/3] cursor-crosshair touch-none overflow-hidden rounded-3xl border border-wandor-text/10 bg-white select-none",
            "bg-no-repeat",
            "shadow-[inset_0_0_80px_rgba(0,0,0,0.04)]"
          )}
          style={venue.image ? { backgroundImage: `url(${venue.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {!venue.image && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-wandor-text/15">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-wandor-text/5">
                <ImagePlus className="h-7 w-7 text-wandor-muted" />
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-wandor-text">Upload the event floor plan</div>
                <div className="mt-1 max-w-[260px] text-xs text-wandor-muted">
                  PNG / JPG / SVG of the venue layout. Then click anywhere on it to pin a point.
                </div>
              </div>
              <div className="flex gap-2">
                <button className={buttonCls("primary", "sm")} onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                  <Upload className="h-3.5 w-3.5" /> Upload plan
                </button>
                <button className={buttonCls("ghost", "sm")} onClick={(e) => { e.stopPropagation(); useSamplePlan(); }}>
                  Use sample plan
                </button>
              </div>
            </div>
          )}

          {venue.image && (
            <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-wandor-muted shadow-sm">
              <MapPin className="h-3 w-3 text-pulse-600" />
              {venue.pois.length} points placed — drag to reposition
            </div>
          )}

          {venue.pois.map((p) => {
            const meta = META[p.category];
            const Icon = meta.icon;
            const isSel = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none active:cursor-grabbing"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(p.id);
                  dragRef.current = p.id;
                  movedRef.current = false;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    /* capture unavailable */
                  }
                }}
                onPointerMove={(e) => {
                  if (dragRef.current !== p.id) return;
                  const rect = boardRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  movedRef.current = true;
                  movePoi(p.id, clampPct(((e.clientX - rect.left) / rect.width) * 100), clampPct(((e.clientY - rect.top) / rect.height) * 100));
                }}
                onPointerUp={(e) => {
                  dragRef.current = null;
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {
                    /* capture unavailable */
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md ring-2 transition",
                      isSel ? "scale-110 ring-wandor-dark" : "ring-white"
                    )}
                    style={{ background: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] font-bold",
                      isSel ? "bg-wandor-dark text-white" : "bg-white/90 text-wandor-text opacity-0 shadow-sm group-hover:opacity-100"
                    )}
                  >
                    {isSel ? p.label : p.label}
                  </span>
                </span>
              </button>
            );
          })}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onUpload(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-wandor-text/8 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-widest text-wandor-muted">Point types</div>
              <span className="text-[10px] font-semibold text-wandor-muted">click a type, then click the map</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {counts.map((c) => {
                const Icon = c.icon;
                const active = activeCat === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => { setActiveCat(c.key); setSelectedId(null); }}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition",
                      active ? "border-wandor-dark bg-wandor-dark text-white" : "border-wandor-text/10 bg-white text-wandor-text hover:border-wandor-text/25"
                    )}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                      style={{ background: c.color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 text-xs font-bold">{c.label}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", active ? "bg-white/20 text-white" : "bg-wandor-text/5 text-wandor-muted")}>
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected ? (
            <div className="rounded-3xl border border-wandor-dark/40 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-wandor-text">
                <MapPin className="h-4 w-4 text-pulse-600" /> Selected point
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Label</label>
              <input
                value={selected.label}
                onChange={(e) => updatePoi(selected.id, { label: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-wandor-text/12 bg-white px-3 py-2 text-sm font-semibold text-wandor-text outline-none focus:border-pulse-500"
              />
              <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest text-wandor-muted">Type</label>
              <select
                value={selected.category}
                onChange={(e) => updatePoi(selected.id, { category: e.target.value as VenuePoiCategory })}
                className="mt-1 w-full rounded-2xl border border-wandor-text/12 bg-white px-3 py-2 text-sm font-semibold text-wandor-text outline-none focus:border-pulse-500"
              >
                {POI_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <button className={cn(buttonCls("danger", "sm"), "mt-4 w-full")} onClick={() => removePoi(selected.id)}>
                <Trash2 className="h-3.5 w-3.5" /> Remove point
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-wandor-text/15 px-4 py-5 text-[11px] leading-relaxed text-wandor-muted">
              <p className="font-bold text-wandor-text">How it works</p>
              <p className="mt-1">· Pick a point type from the list, then click the map to drop it.</p>
              <p className="mt-1">· Drag any pin to fine-tune its position — it snaps to percentages, so it stays aligned on any screen.</p>
              <p className="mt-1">· Publish to push the plan to attendee boarding passes & the in-app venue map.</p>
              <p className="mt-2 text-[10px]">Fire exits render in a distinct red on attendee devices. Data is stored per event and survives reloads (V2 §19.2).</p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-3xl bg-wandor-text/[0.02] px-4 py-3 text-[11px] leading-relaxed text-wandor-muted">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-700">i</span>
            Tip: label gates with real identifiers (e.g. "Gate A · Metro side") — the arrival map and check-in screens reuse these for wayfinding.
          </div>
        </div>
      </div>
    </div>
  );
}