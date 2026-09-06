import { Flame } from "lucide-react";
import { POI_CATEGORIES, type VenuePoi } from "@/data/venueMap";
import { cn } from "@/utils/cn";

const CAT = new Map(POI_CATEGORIES.map((c) => [c.key, c]));

export default function VenueMapView({
  image,
  pois,
  className,
}: {
  image: string;
  pois: VenuePoi[];
  className?: string;
}) {
  return (
    <div
      className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-wandor-text/10 bg-white", className)}
      style={{ backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {pois.map((p) => {
        const meta = CAT.get(p.category);
        if (!meta) return null;
        const Icon = meta.icon;
        const isFire = p.category === "exit";
        return (
          <div
            key={p.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md ring-2 ring-white sm:h-8 sm:w-8",
                isFire && "animate-pulse"
              )}
              style={{ background: meta.color }}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </span>
            <span className="mt-0.5 max-w-[140px] whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-wandor-text shadow-sm">
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function VenueLegend({ pois, className }: { pois: VenuePoi[]; className?: string }) {
  const counts = POI_CATEGORIES.map((c) => ({ ...c, count: pois.filter((p) => p.category === c.key).length })).filter(
    (c) => c.count > 0
  );
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {counts.map((c) => {
        const Icon = c.icon;
        return (
          <span
            key={c.key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
              c.key === "exit"
                ? "border-red-600/30 bg-red-600/10 text-red-700"
                : "border-wandor-text/10 bg-white text-wandor-text"
            )}
          >
            <span className="flex h-4.5 w-4.5 h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: c.color }}>
              <Icon className="h-3 w-3" />
            </span>
            {c.label} · {c.count}
          </span>
        );
      })}
    </div>
  );
}

export function FireExitHint({ count }: { count: number }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-red-600/5 px-4 py-3 text-[11px] leading-relaxed text-red-800">
      <Flame className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      {count > 0 ? (
        <span>
          <b className="font-bold">{count} fire exits</b> marked on this map are urgent-priority on attendee devices and in
          emergency overlays.
        </span>
      ) : (
        <span>No fire exits pinned yet — organizers can add them in the Venue Map editor.</span>
      )}
    </div>
  );
}