import { cn } from "@/utils/cn";

export function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-40",
        on ? "bg-emerald-600" : "bg-wandor-text/20"
      )}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function SettingRow({
  icon: Icon,
  title,
  desc,
  control,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  desc?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-wandor-text/8 bg-white p-3.5 transition hover:border-pulse-600/30">
      <span className="flex min-w-0 items-center gap-3">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-pulse-600" />}
        <span className="min-w-0">
          <span className="block text-[12.5px] font-bold text-wandor-text">{title}</span>
          {desc && <span className="mt-0.5 block text-[11px] leading-snug text-wandor-muted">{desc}</span>}
        </span>
      </span>
      <span className="shrink-0">{control}</span>
    </div>
  );
}