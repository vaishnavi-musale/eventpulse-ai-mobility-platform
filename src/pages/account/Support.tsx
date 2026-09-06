import { useState } from "react";
import { ChevronDown, Mail, MessageCircle, PhoneCall, ShieldCheck } from "lucide-react";
import { buttonCls, GlassCard, LivePill, Pill } from "@/components/ui";
import { useNotif } from "@/components/Notifications";
import { cn } from "@/utils/cn";

const FAQS = [
  { q: "What is a G-Level commitment?", a: "Every route carries a verified reliability grade (G0–G5). G3+ locks capacity with providers and auto-protects you with compensation if the link breaks. G5 is the strongest guarantee, G0 is best-effort." },
  { q: "When can I cancel a booking?", a: "Any time up to 30 minutes before the departure window with no fee. Reliability credits from cancelled G3+ slots are returned to your wallet automatically." },
  { q: "How do compensation credits work?", a: "If a G3+ commitment arrives outside its guaranteed window, the fare difference is credited automatically — no forms, no calling us. Credits land in your wallet within minutes." },
  { q: "Can I bring a group on one booking?", a: "Yes — set passengers at the intent step. Group slots reserve capacity as one block and the lead attendee's wallet pays on behalf of all." },
  { q: "What happens during a live disruption?", a: "EventPulse re-routes you in real time and re-verifies the new chain. If the alternative can't hold the grade, compensation is auto-issued and you're notified instantly." },
];

const CHANNELS = [
  { icon: PhoneCall, label: "Call us", desc: "24×7 helpline · < 1 min pickup", tone: "bg-emerald-600/10 text-emerald-700", action: "Call now" },
  { icon: MessageCircle, label: "WhatsApp support", desc: "Chat with a human concierge", tone: "bg-teal-600/10 text-teal-700", action: "Open chat" },
  { icon: Mail, label: "Email", desc: "Response within 4 business hours", tone: "bg-pulse-600/10 text-pulse-600", action: "Write us" },
];

export default function Support() {
  const { notify } = useNotif();
  const [open, setOpen] = useState<number | null>(0);

  const demo = (what: string) => notify("info", what, "Demo channel connected — a real deployment wires this to your support inbox.");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">We've got your back</div>
        <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">Help & Support</h1>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-wandor-muted">
          Answers on commitments, cancellations and compensation — plus humans (real ones) when you need them.
        </p>
      </div>

      <GlassCard strong className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600/10">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </span>
          <div>
            <div className="text-sm font-bold text-wandor-text">All systems operational</div>
            <div className="text-[11px] text-wandor-muted">Platform health 99.8% · your commitments are protected</div>
          </div>
        </div>
        <div className="flex gap-2">
          <LivePill label="OPERATIONAL" />
          <Pill tone="green">Avg. resolve &lt; 4 min</Pill>
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-wandor-muted">Frequently asked</h2>
          <div className="space-y-2">
            {FAQS.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="overflow-hidden rounded-2xl border border-wandor-text/8 bg-white">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="text-[13px] font-bold text-wandor-text">{f.q}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-wandor-muted transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && <div className="border-t border-wandor-text/5 px-4 py-3 text-xs leading-relaxed text-wandor-muted">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-wandor-muted">Contact us</h2>
          <div className="space-y-2.5">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  onClick={() => demo(`${c.label} opened`)}
                  className="flex w-full items-center gap-3.5 rounded-2xl border border-wandor-text/8 bg-white p-4 text-left transition hover:border-pulse-600/30"
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", c.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-wandor-text">{c.label}</span>
                    <span className="block text-[11px] text-wandor-muted">{c.desc}</span>
                  </span>
                  <span className="text-xs font-bold text-pulse-600">{c.action} →</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-3xl border border-dashed border-wandor-text/15 p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-wandor-muted">Refund & protection policy</div>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-wandor-muted">
              <li>· Trip cancelled by provider → 100% refund, auto-credited.</li>
              <li>· G3+ late arrival → fare difference credited as reliability credit.</li>
              <li>· Re-routing keeps your original grade whenever possible.</li>
              <li>· Every credit is ledgered and auditable (see organizer escrow).</li>
            </ul>
            <button onClick={() => demo("Policy PDF requested")} className={buttonCls("subtle", "sm", "mt-4")}>
              Download policy summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}