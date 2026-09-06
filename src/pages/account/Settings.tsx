import { useState } from "react";
import { BellRing, Coins, Globe, Languages, Moon, RotateCcw, ShieldCheck, Smartphone, WifiOff, Zap } from "lucide-react";
import { useNotif } from "@/components/Notifications";
import { buttonCls, Pill } from "@/components/ui";
import { SettingRow, Toggle } from "@/pages/account/parts";
import { cn } from "@/utils/cn";
import { useStore } from "@/store";
import type { GLevel } from "@/data/mock";

const KEY = "eventpulse:settings";

interface SettingsShape {
  pushNotifications: boolean;
  etaAlerts: boolean;
  liveTracking: boolean;
  expressCheckin: boolean;
  offlinePass: boolean;
  darkMode: boolean;
  language: string;
  units: string;
  currency: string;
  defaultGrade: GLevel;
}

const DEFAULT: SettingsShape = {
  pushNotifications: true,
  etaAlerts: true,
  liveTracking: true,
  expressCheckin: true,
  offlinePass: false,
  darkMode: false,
  language: "en",
  units: "km",
  currency: "INR (₹)",
  defaultGrade: "G5",
};

const GRADES: { g: GLevel; note: string }[] = [
  { g: "G5", note: "Highest protection" },
  { g: "G3", note: "Balanced" },
  { g: "G2", note: "Budget commute" },
  { g: "G1", note: "Baseline coverage" },
];

function load(): SettingsShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* fall through */
  }
  return DEFAULT;
}

export default function Settings() {
  const { notify } = useNotif();
  const { setCommitmentLevel } = useStore();
  const [s, setS] = useState<SettingsShape>(load);

  const set = (patch: Partial<SettingsShape>) => {
    const next = { ...s, ...patch };
    setS(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    if (patch.defaultGrade) {
      setCommitmentLevel(patch.defaultGrade);
      notify("info", "Default commitment set", `Future bookings will target ${patch.defaultGrade}.`);
    }
  };

  const reset = () => {
    set(DEFAULT);
    setCommitmentLevel(DEFAULT.defaultGrade);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    notify("info", "Settings reset", "All preferences restored to defaults.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">Preferences</div>
          <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">Settings</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-wandor-muted">
            Tune how EventPulse nudges, tracks and commits for you. Changes apply instantly across devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="green" className="uppercase">Synced to cloud</Pill>
          <button onClick={reset} className={buttonCls("ghost", "sm")}><RotateCcw className="h-3.5 w-3.5" /> Reset defaults</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">Journey & alerts</div>
            <div className="space-y-2">
              <SettingRow icon={BellRing} title="Push notifications" desc="Commitment confirmations, reroutes and compensation credits"
                control={<Toggle on={s.pushNotifications} onClick={() => set({ pushNotifications: !s.pushNotifications })} />} />
              <SettingRow icon={Zap} title="ETA alerts before departure" desc="Nudge before your 20-min departure window opens"
                control={<Toggle on={s.etaAlerts} onClick={() => set({ etaAlerts: !s.etaAlerts })} />} />
              <SettingRow icon={Smartphone} title="Express check-in" desc="Auto-instantiate at the boarding gate via beacon"
                control={<Toggle on={s.expressCheckin} onClick={() => set({ expressCheckin: !s.expressCheckin })} />} />
              <SettingRow icon={ShieldCheck} title="Share live position for rerouting" desc="Lets protection routes catch you when a link breaks (G3+)"
                control={<Toggle on={s.liveTracking} onClick={() => set({ liveTracking: !s.liveTracking })} />} />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">Tickets & pass</div>
            <div className="space-y-2">
              <SettingRow icon={WifiOff} title="Offline tickets" desc="Store QR locally so the pass works without a network"
                control={<Toggle on={s.offlinePass} onClick={() => set({ offlinePass: !s.offlinePass })} />} />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">Appearance</div>
            <div className="space-y-2">
              <SettingRow icon={Moon} title="Dark mode" desc="Demo toggle — theme engine ships with V3"
                control={<Toggle on={s.darkMode} onClick={() => set({ darkMode: !s.darkMode })} />} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">Language & region</div>
            <div className="space-y-2">
              <SettingRow icon={Languages} title="Language" control={
                <select value={s.language} onChange={(e) => set({ language: e.target.value })}
                  className="h-8 cursor-pointer rounded-full border border-wandor-text/12 bg-white px-3 text-xs font-bold text-wandor-text outline-none focus:border-pulse-500">
                  {[["en", "English"], ["hi", "हिन्दी"], ["mr", "मराठी"]].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              } />
              <SettingRow icon={Globe} title="Distance units" control={
                <select value={s.units} onChange={(e) => set({ units: e.target.value })}
                  className="h-8 cursor-pointer rounded-full border border-wandor-text/12 bg-white px-3 text-xs font-bold text-wandor-text outline-none focus:border-pulse-500">
                  {[["km", "Kilometers"], ["mi", "Miles"]].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              } />
              <SettingRow icon={Coins} title="Currency display" control={
                <select value={s.currency} onChange={(e) => set({ currency: e.target.value })}
                  className="h-8 cursor-pointer rounded-full border border-wandor-text/12 bg-white px-3 text-xs font-bold text-wandor-text outline-none focus:border-pulse-500">
                  {[["INR (₹)", "INR (₹)"], ["USD ($)", "USD ($)"], ["EUR (€)", "EUR (€)"]].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              } />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">Default commitment level</div>
            <div className="grid grid-cols-2 gap-2">
              {GRADES.map(({ g, note }) => (
                <button
                  key={g}
                  onClick={() => set({ defaultGrade: g })}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    s.defaultGrade === g ? "border-wandor-dark bg-wandor-dark text-white" : "border-wandor-text/10 bg-white text-wandor-text hover:border-wandor-text/25"
                  )}
                >
                  <div className="font-display text-lg font-bold">{g}</div>
                  <div className={cn("text-[10px] font-semibold", s.defaultGrade === g ? "text-white/70" : "text-wandor-muted")}>{note}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-wandor-muted">
              Higher grades reserve capacity and guarantee on-time protection; lower grades keep fares minimal. You can override per journey.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-2xl bg-wandor-text/[0.03] px-4 py-3 text-[11px] leading-relaxed text-wandor-muted">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-700">i</span>
            Location sharing here only enables aggregate, k≥50 protections. Raw positions are never stored — see privacy in My Profile.
          </div>
        </section>
      </div>
    </div>
  );
}