import { useState } from "react";
import { Banknote, CreditCard, Plus, ShieldCheck, Smartphone, Wallet as WalletIcon } from "lucide-react";
import { useNotif } from "@/components/Notifications";
import { buttonCls, Pill } from "@/components/ui";
import { Toggle } from "@/pages/account/parts";
import { cn } from "@/utils/cn";

const KEY = "eventpulse:wallet";

interface Tx {
  id: string;
  label: string;
  note: string;
  amount: string;
  at: string;
  kind: "in" | "out";
}

interface Method {
  kind: "UPI" | "Card";
  label: string;
  default?: boolean;
}

const SEED: { balance: number; methods: Method[]; txns: Tx[] } = {
  balance: 1240,
  methods: [
    { kind: "UPI" as const, label: "aarav.sharma@okhdfc", default: true as const },
    { kind: "Card" as const, label: "HDFC Visa •• 4321" },
  ],
  txns: [
    { id: "t1", label: "Subscribed shuttle fare", note: "Metro + Reserved Shuttle · Mumbai Music Festival", amount: "−₹80", at: "Today, 2:16 PM", kind: "out" as const },
    { id: "t2", label: "Top-up", note: "Added via UPI", amount: "+₹500", at: "Today, 9:04 AM", kind: "in" as const },
    { id: "t3", label: "Reliability credit", note: "G3 compensation · Aug 30 journey", amount: "+₹40", at: "Sep 01, 4:22 PM", kind: "in" as const },
    { id: "t4", label: "Top-up", note: "Added via HDFC Visa", amount: "+₹1,000", at: "Aug 24, 11:40 AM", kind: "in" as const },
    { id: "t5", label: "Refund · cancelled slot", note: "City Marathon · Priority Shuttle", amount: "+₹220", at: "Aug 18, 7:05 PM", kind: "in" as const },
  ],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as typeof SEED;
  } catch {
    /* fall through */
  }
  return SEED;
}

export default function Wallet() {
  const { notify } = useNotif();
  const [data, setData] = useState(load);
  const [autoTopup, setAutoTopup] = useState(true);

  const persist = (next: typeof data) => {
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const addMoney = (amount: number) => {
    const next = {
      ...data,
      balance: data.balance + amount,
      txns: [
        { id: `t${Date.now()}`, label: "Top-up", note: `Added via ${data.methods.find((m) => m.default)?.label ?? "UPI"}`, amount: `+₹${amount.toLocaleString("en-IN")}`, at: "Just now", kind: "in" as const },
        ...data.txns,
      ],
    };
    persist(next);
    notify("success", `₹${amount.toLocaleString("en-IN")} added`, "Balance credited instantly to your travel wallet.");
  };

  const setDefault = (label: string) =>
    persist({ ...data, methods: data.methods.map((m) => ({ ...m, default: m.label === label })) });

  const addMethod = () => {
    persist({ ...data, methods: [...data.methods, { kind: "Card", label: "Rupay •• 8876" }] });
    notify("info", "Payment method linked", "Rupay •• 8876 added (demo flow).");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">Payments</div>
        <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">Wallet & Payments</h1>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-wandor-muted">
          Pre-pay fares once, travel everywhere — refunds and reliability credits land here automatically.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          {/* balance */}
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-wandor-dark to-[#3a3a3a] p-6 text-white shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
            <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
                  <WalletIcon className="h-3.5 w-3.5" /> Travel balance
                </div>
                <div className="mt-2 font-display text-4xl font-bold tracking-tight">
                  ₹{data.balance.toLocaleString("en-IN")}
                </div>
                <div className="mt-1 text-xs font-semibold text-white/60">Covers fares, passes & priority slots · ₹0 in transit</div>
              </div>
              <Pill tone="green" className="border-emerald-400/30 bg-emerald-400/15 text-emerald-300">Auto top-up on</Pill>
            </div>
            <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          </div>

          {/* add money */}
          <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-wandor-muted">Add money</div>
            <div className="flex flex-wrap gap-2.5">
              {[500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => addMoney(amt)}
                  className={buttonCls("subtle", "sm")}
                >
                  <Plus className="h-3.5 w-3.5" /> ₹{amt.toLocaleString("en-IN")}
                </button>
              ))}
              <button onClick={() => addMoney(250)} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-4 text-xs font-semibold text-pulse-600 transition hover:text-pulse-500">
                Custom amount
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-wandor-text/[0.03] px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-bold text-wandor-text">
                <ShieldCheck className="h-4 w-4 text-emerald-700" /> Auto top-up when balance &lt; ₹100
              </span>
              <Toggle on={autoTopup} onClick={() => setAutoTopup(!autoTopup)} />
            </div>
          </div>

          {/* methods */}
          <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-wandor-muted">Payment methods</div>
              <button onClick={addMethod} className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-pulse-600 hover:text-pulse-500">
                <Plus className="h-3.5 w-3.5" /> Add method
              </button>
            </div>
            <div className="space-y-2">
              {data.methods.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setDefault(m.label)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                    m.default ? "border-pulse-600/40 bg-pulse-600/5" : "border-wandor-text/8 bg-white hover:border-wandor-text/25"
                  )}
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", m.kind === "UPI" ? "bg-violet-600/10" : "bg-teal-600/10")}>
                    {m.kind === "UPI" ? <Smartphone className="h-4.5 w-4.5 h-5 w-5 text-violet-700" /> : <CreditCard className="h-5 w-5 text-teal-700" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-wandor-text">{m.label}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-wandor-muted">{m.kind} {m.default && "· Default"}</span>
                  </span>
                  {m.default && (
                    <span className="relative h-4 w-4 rounded-full border-2 border-pulse-600">
                      <span className="absolute inset-1 rounded-full bg-pulse-600" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* transactions */}
        <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-wandor-muted">
              <Banknote className="h-4 w-4 text-pulse-600" /> Transactions
            </div>
            <span className="text-[10px] font-semibold text-wandor-muted">ledger · secure</span>
          </div>
          <div className="space-y-1.5">
            {data.txns.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-wandor-text/6 px-3.5 py-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    t.kind === "in" ? "bg-emerald-600/10 text-emerald-700" : "bg-wandor-text/5 text-wandor-muted"
                  )}
                >
                  {t.kind === "in" ? "IN" : "OUT"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-bold text-wandor-text">{t.label}</span>
                  <span className="block truncate text-[10px] text-wandor-muted">{t.note} · {t.at}</span>
                </span>
                <span className={cn("shrink-0 font-display text-sm font-bold", t.kind === "in" ? "text-emerald-700" : "text-wandor-text")}>
                  {t.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}