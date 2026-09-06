import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageIcon,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  Plus,
  Sparkles,
  Tag,
  Ticket,
  Type,
  Users2,
  Video,
  Baby,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { saveHostedEvent, type HostedEventRecord } from "@/data/mock";
import { Logo } from "@/components/layout";
import { buttonCls, Pill } from "@/components/ui";
import { cn } from "@/utils/cn";

const CATEGORIES = ["Music", "Sports", "Conference", "Festival", "Cultural", "Expo", "Food"];
const SERVICES = ["Metro", "Shuttle", "Parking", "Stay", "Rides", "Road Closures"];
const AGE_OPTIONS = ["All ages", "18+", "21+"];
const TIME_SUGGESTIONS = ["6:00 PM", "6:30 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM", "11:30 PM"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n: number) => String(n).padStart(2, "0");

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function labelOf(key: string): string {
  const [y, m, dd] = key.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function to12(h: number, m: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}:${pad(m)} ${ampm}`;
}

/* Multi-day event calendar — tap any day in the month grid to add/remove it. */
function MiniCalendar({
  selected,
  onToggle,
  onClear,
}: {
  selected: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
}) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const sel = new Set(selected);

  const first = new Date(view.y, view.m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first grid offset
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(keyOf(new Date(view.y, view.m, d)));

  const shift = (delta: number) =>
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 0) {
        m = 11;
        y--;
      } else if (m > 11) {
        m = 0;
        y++;
      }
      return { y, m };
    });

  return (
    <div className="rounded-2xl border border-wandor-text/12 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center rounded-full text-wandor-muted transition hover:bg-wandor-text/5 hover:text-wandor-text">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-xs font-bold uppercase tracking-widest text-wandor-text">
          {MONTHS[view.m]} {view.y}
        </div>
        <button type="button" onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center rounded-full text-wandor-muted transition hover:bg-wandor-text/5 hover:text-wandor-text">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1">{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((k, i) =>
          k == null ? (
            <span key={i} />
          ) : (
            <button
              key={k}
              type="button"
              onClick={() => onToggle(k)}
              className={cn(
                "flex h-9 items-center justify-center rounded-xl text-xs font-bold transition",
                sel.has(k)
                  ? "bg-wandor-dark text-white shadow-sm"
                  : "text-wandor-text hover:bg-wandor-text/5 active:scale-95"
              )}
            >
              {k.slice(-2).replace(/^0/, "")}
            </button>
          )
        )}
      </div>
      {selected.length > 0 && (
        <div className="mt-2 flex items-center justify-between border-t border-wandor-text/5 pt-2">
          <span className="text-[11px] font-bold text-pulse-600">
            {selected.length} day{selected.length > 1 ? "s" : ""} selected
          </span>
          <button type="button" onClick={onClear} className="text-[10px] font-bold uppercase tracking-wide text-wandor-muted transition hover:text-red-600">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-wandor-muted">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-wandor-muted/80">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-wandor-text/12 bg-white px-3.5 py-2.5 text-sm text-wandor-text outline-none transition focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/20";

export default function HostEvent() {
  const [done, setDone] = useState(false);
  const [created, setCreated] = useState<HostedEventRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [form, setForm] = useState({
    name: "",
    about: "",
    category: "Music",
    venue: "",
    city: "",
    dates: [] as string[],
    times: [] as string[],
    capacity: "",
    price: "",
    age: "All ages",
    organizer: "",
    email: "",
    phone: "",
    image: "",
    services: ["Metro", "Shuttle"] as string[],
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleService = (s: string) =>
    setForm((f) => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s],
    }));

  const toggleDay = (k: string) =>
    setForm((f) => ({
      ...f,
      dates: f.dates.includes(k) ? f.dates.filter((x) => x !== k) : [...f.dates, k].sort(),
    }));

  const toggleTime = (t: string) =>
    setForm((f) => ({
      ...f,
      times: f.times.includes(t) ? f.times.filter((x) => x !== t) : [...f.times, t].sort(),
    }));

  const addCustomSlot = () => {
    if (!customTime) return;
    const [h, m] = customTime.split(":").map(Number);
    const label = to12(h, m);
    if (!form.times.includes(label)) {
      setForm((f) => ({ ...f, times: [...f.times, label].sort() }));
    }
    setCustomTime("");
  };

  const dateSummary =
    form.dates.length === 0
      ? ""
      : form.dates.length === 1
        ? labelOf(form.dates[0])
        : `${form.dates.slice(0, 2).map(labelOf).join(" · ")}${form.dates.length > 2 ? ` · ${form.dates.length} days` : ""}`;

  const timeSummary = form.times.length <= 1 ? (form.times[0] ?? "") : form.times.join(" · ");

  const onImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("image", String(reader.result));
    reader.readAsDataURL(file);
  };

  const canSubmit =
    !!form.name.trim() &&
    !!form.about.trim() &&
    !!form.venue.trim() &&
    !!form.city.trim() &&
    form.dates.length > 0 &&
    form.times.length > 0 &&
    !!form.capacity.trim() &&
    !!form.price.trim() &&
    !!form.organizer.trim() &&
    !!form.email.trim() &&
    !!form.phone.trim() &&
    !!form.image;

  const submit = () => {
    if (!canSubmit) return;
    const rec = saveHostedEvent({
      ...form,
      date: dateSummary,
      time: timeSummary,
    });
    setCreated(rec);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#faf7f2]">
        <header className="sticky top-0 z-50 border-b border-wandor-text/5 bg-white/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
              <Logo />
              <span className="hidden rounded-full border border-wandor-text/10 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-wandor-muted sm:block">
                Host Event
              </span>
            </div>
            <Link to="/" className={buttonCls("ghost", "sm")}>Exit</Link>
          </div>
        </header>

        <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10"
          >
            <PartyPopper className="h-9 w-9 text-emerald-600" />
          </motion.div>
          <h1 className="font-display text-2xl font-bold text-wandor-text md:text-3xl">Your event is live!</h1>
          <p className="mt-3 text-sm leading-relaxed text-wandor-muted">
            <span className="font-bold text-wandor-text">{created?.name || "Your event"}</span> has been created with
            EventPulse orchestration. Attendees can now discover it and book capacity-verified transport, stay, and tickets.
          </p>
          {created && (
            <div className="mt-6 w-full overflow-hidden rounded-3xl border border-wandor-text/8 bg-white text-left">
              {created.image && <img src={created.image} alt={created.name} className="h-40 w-full object-cover" />}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Pill tone="green">LIVE</Pill>
                  <span className="text-xs text-wandor-muted">{created.category} · {created.age}</span>
                </div>
                <div className="text-lg font-bold text-wandor-text">{created.name}</div>
                {created.about && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-wandor-muted">{created.about}</p>}
                <div className="mt-3 space-y-1.5 text-sm text-wandor-muted">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-pulse-600" />{created.venue}, {created.city}</div>
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-pulse-600" />{created.date} · {created.time}</div>
                  <div className="flex items-center gap-2"><Users2 className="h-4 w-4 text-pulse-600" />{created.capacity} capacity · {created.price} onwards</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {created.services.map((s) => (
                    <span key={s} className="rounded-full bg-wandor-text/5 px-2.5 py-1 text-[11px] font-semibold text-wandor-text">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/admin/organizer" className={buttonCls("primary")}>Manage attendees</Link>
            <Link to="/app/discover" className={buttonCls("subtle")}>View on Explore</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf7f2] pb-16">
      <header className="sticky top-0 z-50 border-b border-wandor-text/5 bg-white/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden rounded-full border border-wandor-text/10 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-wandor-muted sm:block">
              Host Event
            </span>
          </div>
          <Link to="/" className={buttonCls("ghost", "sm")}><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-pulse-600">
            <Sparkles className="h-3.5 w-3.5" /> EventPulse for Organizers
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-wandor-text md:text-3xl">Host a new mega event</h1>
          <p className="mt-1 text-xs text-wandor-muted">
            Tell us everything attendees need to know — image, about, when & where, pricing, age. All required fields are marked *.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 rounded-3xl border border-wandor-text/8 bg-white p-6">
            {/* ── Basics ── */}
            <div className="border-b border-wandor-text/5 pb-5">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-pulse-600">Basics</div>
              <div className="space-y-5">
                <Field label="Event name" required>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <input className={cn(inputCls, "pl-9")} placeholder="e.g. Sunset Rooftop Music Fest" value={form.name} onChange={(e) => set("name", e.target.value)} />
                  </div>
                </Field>

                <Field label="Event image / poster" required hint="Upload a JPG or PNG cover. You can also paste an image URL.">
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onImage(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-wandor-text/20 bg-wandor-text/[0.02] text-wandor-muted transition hover:border-pulse-500 hover:text-pulse-600"
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Upload</span>
                    </button>
                    {form.image ? (
                      <img src={form.image} alt="preview" className="h-24 w-40 rounded-2xl border border-wandor-text/10 object-cover" />
                    ) : (
                      <div className="hidden h-24 w-40 items-center justify-center rounded-2xl bg-wandor-text/[0.03] text-xs text-wandor-muted sm:flex">Poster preview</div>
                    )}
                    <input
                      className={cn(inputCls, "flex-1")}
                      placeholder="…or paste an image URL"
                      value={form.image.startsWith("data:") ? "" : form.image}
                      onChange={(e) => set("image", e.target.value)}
                    />
                  </div>
                </Field>

                <Field label="About the event" required hint="What attendees can expect — line-up, experience, highlights, policies.">
                  <textarea
                    className={cn(inputCls, "min-h-[110px] resize-y")}
                    placeholder="Describe your event…"
                    value={form.about}
                    onChange={(e) => set("about", e.target.value)}
                  />
                </Field>

                <Field label="Category" required>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set("category", c)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                          form.category === c ? "border-wandor-dark bg-wandor-dark text-white" : "border-wandor-text/15 bg-white text-wandor-muted hover:border-wandor-text/30"
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            {/* ── When & where ── */}
            <div className="border-b border-wandor-text/5 pb-5">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-pulse-600">When & Where</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Venue" required>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <input className={cn(inputCls, "pl-9")} placeholder="e.g. Jio World Garden" value={form.venue} onChange={(e) => set("venue", e.target.value)} />
                  </div>
                </Field>
                <Field label="City" required>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <input className={cn(inputCls, "pl-9")} placeholder="e.g. Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} />
                  </div>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Event dates" required hint="Open the calendar and tap every day the event runs.">
                  <button
                    type="button"
                    onClick={() => setCalOpen((o) => !o)}
                    className={cn(inputCls, "flex items-center justify-between text-left")}
                  >
                    <span className={form.dates.length ? "font-semibold text-wandor-text" : "text-wandor-muted"}>
                      {dateSummary || "Tap to choose days…"}
                    </span>
                    <CalendarDays className="h-4 w-4 shrink-0 text-wandor-muted" />
                  </button>
                  {calOpen && (
                    <div className="mt-2">
                      <MiniCalendar
                        selected={form.dates}
                        onToggle={toggleDay}
                        onClear={() => setForm((f) => ({ ...f, dates: [] }))}
                      />
                    </div>
                  )}
                  {form.dates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.dates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-wandor-text/15 bg-white px-2.5 py-1 text-[11px] font-bold text-wandor-text transition hover:border-red-500/40 hover:text-red-700"
                        >
                          {labelOf(d)}
                          <X className="h-3 w-3 text-wandor-muted" />
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Time slots" required hint="Pick session/show times — you can add as many as you need.">
                  <div className="flex flex-wrap gap-2">
                    {TIME_SUGGESTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTime(t)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                          form.times.includes(t)
                            ? "border-wandor-dark bg-wandor-dark text-white"
                            : "border-wandor-text/15 bg-white text-wandor-muted hover:border-wandor-text/30"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-wandor-muted" />
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className={cn(inputCls, "w-36")}
                    />
                    <button
                      type="button"
                      onClick={addCustomSlot}
                      disabled={!customTime}
                      className={buttonCls("outline", "sm", customTime ? "" : "opacity-40")}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add slot
                    </button>
                  </div>
                  {form.times.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {form.times.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTime(t)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-pulse-600/30 bg-pulse-600/10 px-2.5 py-1 text-[11px] font-bold text-pulse-800 transition hover:border-red-500/40 hover:text-red-700"
                        >
                          {t}
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            </div>

            {/* ── Tickets & rules ── */}
            <div className="border-b border-wandor-text/5 pb-5">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-pulse-600">Tickets & Rules</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ticket price (from)" required>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <input className={cn(inputCls, "pl-9")} placeholder="e.g. ₹499" value={form.price} onChange={(e) => set("price", e.target.value)} />
                  </div>
                </Field>
                <Field label="Capacity limit" required>
                  <div className="relative">
                    <Users2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <input className={cn(inputCls, "pl-9")} placeholder="e.g. 25000" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
                  </div>
                </Field>
                <Field label="Allowed ages" required>
                  <div className="relative">
                    <Baby className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <div className="flex gap-2 pl-1">
                      {AGE_OPTIONS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => set("age", a)}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                            form.age === a ? "border-wandor-dark bg-wandor-dark text-white" : "border-wandor-text/15 bg-white text-wandor-muted hover:border-wandor-text/30"
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </Field>
                <Field label="Bookable services">
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleService(s)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          form.services.includes(s)
                            ? "border-pulse-600 bg-pulse-600 text-white"
                            : "border-wandor-text/15 bg-white text-wandor-muted hover:border-wandor-text/30"
                        )}
                      >
                        {form.services.includes(s) && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>

            {/* ── Organizer contact ── */}
            <div>
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-pulse-600">Organizer Contact</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organizer / organizer name" required>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <input className={cn(inputCls, "pl-9")} placeholder="e.g. Vibrant Nights Events" value={form.organizer} onChange={(e) => set("organizer", e.target.value)} />
                  </div>
                </Field>
                <Field label="Contact email" required>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <input className={cn(inputCls, "pl-9")} placeholder="events@org.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </div>
                </Field>
                <Field label="Contact phone" required>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wandor-muted" />
                    <input className={cn(inputCls, "pl-9")} placeholder="+91 98XXX XXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                </Field>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-pulse-600/15 bg-white">
              {form.image && <img src={form.image} alt="preview" className="h-36 w-full object-cover" />}
              <div className="p-5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">
                  <Video className="h-3.5 w-3.5 text-pulse-600" /> Event preview
                </div>
                {form.name ? (
                  <div className="text-base font-bold text-wandor-text">{form.name}</div>
                ) : (
                  <div className="text-sm text-wandor-muted">Your event preview appears here</div>
                )}
                <div className="mt-1.5 flex gap-1.5">
                  <Pill tone="cyan">{form.category}</Pill>
                  <Pill tone="amber">{form.age}</Pill>
                </div>
                {form.about && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-wandor-muted">{form.about}</p>}
                <div className="mt-3 space-y-1.5 text-xs text-wandor-muted">
                  {form.venue && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-pulse-600" />{form.venue}, {form.city || "—"}</div>}
                  {dateSummary && <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-pulse-600" />{dateSummary} · {timeSummary || "—"}</div>}
                  <div className="flex items-center gap-2"><Ticket className="h-3.5 w-3.5 text-pulse-600" />{form.price ? `${form.price} onwards` : "Pricing TBD"}</div>
                  {form.capacity && <div className="flex items-center gap-2"><Users2 className="h-3.5 w-3.5 text-pulse-600" />Cap {form.capacity}</div>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {form.services.map((s) => (
                    <span key={s} className="rounded-full bg-wandor-text/5 px-2.5 py-1 text-[10px] font-semibold text-wandor-text">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-wandor-text/8 bg-white p-5">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-wandor-muted">What you get</div>
              <ul className="space-y-2 text-xs text-wandor-muted">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Live listing on Explore</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Capacity-verified attendee commitments</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Full attendee & booking management</li>
              </ul>
            </div>

            <button onClick={submit} disabled={!canSubmit} className={buttonCls("primary", "lg", "w-full")}>
              Publish event
            </button>
            <div className="rounded-2xl border border-dashed border-wandor-text/15 px-3 py-2 text-center text-[11px] leading-relaxed text-wandor-muted">
              Required before publishing: {[
                !form.name && "name",
                !form.image && "image",
                !form.about && "about",
                !form.venue && "venue",
                !form.city && "city",
                form.dates.length === 0 && "days",
                form.times.length === 0 && "time slots",
                !form.price && "price",
                !form.capacity && "capacity",
                !form.organizer && "organizer",
                !form.email && "email",
                !form.phone && "phone",
              ].filter(Boolean).join(" · ") || "all set — you're good to go"}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}