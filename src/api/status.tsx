import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL, ApiError, apiRequest } from "./http";
import { cn } from "@/utils/cn";

export type BackendStatus = "checking" | "live" | "demo";

export interface BackendHealth {
  status: string;
  postgres?: string;
  redis?: string;
}

interface BackendCtx {
  status: BackendStatus;
  health: BackendHealth | null;
  lastChecked: number | null;
  error: string | null;
  forcedOff: boolean;
  setForcedOff: (on: boolean) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<BackendCtx | null>(null);

const STORAGE_KEY = "eventpulse:backend=off";

function readForcedOff(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function BackendProvider({ children }: { children: ReactNode }) {
  const [forcedOff, setForcedOffState] = useState(readForcedOff);
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const probing = useRef(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (readForcedOff()) {
      setStatus((s) => (s === "checking" ? "demo" : s));
      return;
    }
    if (!opts?.silent) setStatus("checking");
    try {
      const res = await apiRequest<{
        status: string;
        info?: { postgres?: { status?: string }; redis?: { status?: string } };
      }>("/health", {}, 4000);
      setHealth({
        status: res.status,
        postgres: res.info?.postgres?.status,
        redis: res.info?.redis?.status,
      });
      setError(null);
      setStatus("live");
    } catch (err) {
      setHealth(null);
      setError(err instanceof ApiError ? err.message : "Backend unreachable");
      setStatus("demo");
    } finally {
      setLastChecked(Date.now());
    }
  }, []);

  const setForcedOff = useCallback(
    (on: boolean) => {
      setForcedOffState(on);
      try {
        if (on) localStorage.setItem(STORAGE_KEY, "1");
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      if (on) setStatus("demo");
      else void refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (!probing.current) {
        probing.current = true;
        void refresh({ silent: true }).finally(() => {
          probing.current = false;
        });
      }
    }, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const value: BackendCtx = {
    status,
    health,
    lastChecked,
    error,
    forcedOff,
    setForcedOff,
    refresh: () => refresh(),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBackend(): BackendCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBackend must be used within BackendProvider");
  return ctx;
}

const DOT: Record<BackendStatus, string> = {
  live: "animate-pulse bg-emerald-600",
  demo: "bg-slate-400",
  checking: "animate-pulse bg-amber-500",
};

const PILL: Record<BackendStatus, string> = {
  live: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/15",
  demo: "border-wandor-text/15 bg-white/70 text-wandor-muted hover:text-wandor-text",
  checking: "border-amber-600/30 bg-amber-600/10 text-amber-700",
};

/** Compact pill showing whether the frontend is talking to the real backend. */
export function BackendBadge({ className, dense }: { className?: string; dense?: boolean }) {
  const { status, health, error, forcedOff, setForcedOff, refresh } = useBackend();

  const title =
    status === "live"
      ? `Connected to ${API_BASE_URL} · postgres ${health?.postgres ?? "?"} · redis ${health?.redis ?? "?"} · checked ${new Date().toLocaleTimeString()}`
      : forcedOff
        ? "Backend disabled — using local demo data. Click to re-enable."
        : `Offline — using local demo data. Click to retry.${error ? ` (${error})` : ""}`;

  return (
    <button
      type="button"
      onClick={() => {
        if (forcedOff) setForcedOff(false);
        else void refresh();
      }}
      title={title}
      aria-label="Backend connection status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-all",
        PILL[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[status])} />
      {!dense &&
        (status === "live" ? "Backend Live" : status === "demo" ? "Demo Data" : "Connecting…")}
      {dense && status === "live" && "LIVE"}
    </button>
  );
}