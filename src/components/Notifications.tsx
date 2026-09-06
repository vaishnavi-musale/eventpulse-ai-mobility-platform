import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle2, Info, RefreshCw, Siren, Trash2, X, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export type NotifTone = "success" | "warn" | "danger" | "info" | "refresh";

export interface NotifItem {
  id: number;
  tone: NotifTone;
  title: string;
  message: string;
  time: string;
}

const TONE_CFG: Record<NotifTone, { icon: LucideIcon; cls: string; bar: string }> = {
  success: { icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-600/10 border-emerald-600/25", bar: "bg-emerald-600" },
  warn: { icon: AlertTriangle, cls: "text-amber-700 bg-amber-600/10 border-amber-600/25", bar: "bg-amber-500" },
  danger: { icon: Siren, cls: "text-red-700 bg-red-600/10 border-red-600/25", bar: "bg-red-600" },
  info: { icon: Info, cls: "text-pulse-600 bg-pulse-600/10 border-pulse-600/25", bar: "bg-pulse-500" },
  refresh: { icon: RefreshCw, cls: "text-teal-700 bg-teal-600/10 border-teal-600/25", bar: "bg-teal-600" },
};

interface NotifCtx {
  feed: NotifItem[];
  notify: (tone: NotifTone, title: string, message: string) => void;
  clear: () => void;
}

const Ctx = createContext<NotifCtx | null>(null);

export function useNotif(): NotifCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNotif outside provider");
  return c;
}

let uid = 100;

export function NotifProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<NotifItem[]>([]);
  const [toasts, setToasts] = useState<NotifItem[]>([]);
  const timers = useRef<number[]>([]);

  const notify = useCallback((tone: NotifTone, title: string, message: string) => {
    const item: NotifItem = {
      id: ++uid,
      tone,
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setFeed((f) => [item, ...f].slice(0, 30));
    setToasts((t) => [...t, item]);
    const id = window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== item.id)), 5600);
    timers.current.push(id);
  }, []);

  const clear = useCallback(() => setFeed([]), []);

  return (
    <Ctx.Provider value={{ feed, notify, clear }}>
      {children}
      {/* Toast viewport */}
      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const c = TONE_CFG[t.tone];
            const Icon = c.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="glass-strong pointer-events-auto relative overflow-hidden rounded-2xl p-3.5 shadow-2xl"
              >
                <div className={cn("absolute inset-y-0 left-0 w-1", c.bar)} />
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", c.cls)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13px] font-bold text-wandor-text">{t.title}</div>
                      <button
                        onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                        className="text-wandor-muted hover:text-wandor-text"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-0.5 text-xs leading-relaxed text-wandor-muted">{t.message}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-wandor-muted/70">{t.time}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

/* Bell + dropdown used in app header */
export function NotificationBell() {
  const { feed, clear, notify } = useNotif();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-wandor-text/10 bg-white text-wandor-text transition hover:bg-wandor-text/5"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {feed.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pulse-500 px-1 text-[9px] font-bold text-white">
            {feed.length > 9 ? "9+" : feed.length}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="glass-strong absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-wandor-text/10 px-4 py-3">
                <div className="text-sm font-bold text-wandor-text">Notifications</div>
                <div className="flex items-center gap-2">
                  <button onClick={clear} className="flex items-center gap-1 text-[11px] font-semibold text-wandor-muted hover:text-wandor-text">
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                  <button onClick={() => setOpen(false)} className="text-wandor-muted hover:text-wandor-text">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {feed.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-wandor-muted">No notifications yet.</div>
                ) : (
                  feed.map((n) => {
                    const c = TONE_CFG[n.tone];
                    const Icon = c.icon;
                    return (
                      <div key={n.id} className="flex gap-3 border-b border-wandor-text/5 px-4 py-3 transition-colors hover:bg-wandor-text/[0.03]">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", c.cls)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-wandor-text">{n.title}</div>
                          <div className="mt-0.5 text-xs leading-relaxed text-wandor-muted">{n.message}</div>
                          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-wandor-muted/70">{n.time}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  notify("info", "Demo tip", "Use the demo stepper above to jump between flow stages.");
                }}
                className="block w-full bg-wandor-text/[0.03] px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-wandor-muted hover:text-wandor-text"
              >
                Notification center
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
