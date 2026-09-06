import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  CircleCheck,
  Clock,
  Sparkles,
  Star,
  Train,
  Car,
  Bus,
  Upload,
  X,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { useNotif } from "@/components/Notifications";
import { useBackend } from "@/api/status";
import { aiChat, type AiChatMessage, type AiChatResponse } from "@/api/backend";
import { useStore } from "@/store";
import { GBadge } from "@/components/glevels";
import { QRBlock } from "@/components/ui";
import { cn } from "@/utils/cn";
import {
  HOTELS,
  TRANSPORT_ROUTES,
  PARKING_SPOTS,
  type HotelItem,
  type TransportRoute,
  type TransportMode,
  type TransportLegMode,
  type ParkingSpot,
} from "@/data/mock";

/* ─── Types ─── */

type BookingCategory = "hotels" | "transport" | "parking";
type PanelState =
  | "closed"
  | "browsing-hotels"
  | "browsing-transport"
  | "browsing-parking"
  | "hotel-form"
  | "transport-form"
  | "parking-form"
  | "confirmed"
  | "payment";

type OnboardStep = "slot" | "count" | "people" | "done";

interface Attendee {
  name: string;
  age: string;
}

const SLOTS = [
  { label: "🕖 7:00 PM Entry", value: "7:00 PM" },
  { label: "🕘 9:00 PM Entry", value: "9:00 PM" },
  { label: "🕚 11:00 PM Entry", value: "11:00 PM" },
];

interface ChatMessage {
  id: number;
  role: "ai" | "user";
  text: string;
  buttons?: { label: string; value: string }[];
  hint?: { title: string; lines: string[] };
}

interface BookingForm {
  name: string;
  yearOfBirth: string;
  persons: number;
  time: string;
}

const INITIAL_FORM: BookingForm = { name: "", yearOfBirth: "", persons: 1, time: "" };

const MODE_ICONS: Record<TransportMode, typeof Train> = { train: Train, cab: Car, bus: Bus };

const LEG_ICON: Record<TransportLegMode, string> = {
  train: "🚇",
  cab: "🚗",
  bus: "🚌",
  walk: "🚶",
  ride: "🛺",
};

const LEG_MODE_LABEL: Record<TransportLegMode, string> = {
  train: "Metro",
  cab: "Cab",
  bus: "Bus",
  walk: "Walk",
  ride: "Ride",
};

let msgId = 0;
function nextId() {
  return ++msgId;
}

/* ─── Component ─── */

export default function IntentCapture() {
  const navigate = useNavigate();
  const location = useLocation();
  const { event, mode, commitmentLevel } = useStore();
  const { notify } = useNotif();
  const { status: backendStatus } = useBackend();

  /* Chat */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Panel */
  const [panel, setPanel] = useState<PanelState>("closed");
  const [chatActive, setChatActive] = useState(false);
  /* Guard against StrictMode double-run on mount; resets on every real remount */
  const autoOpenedRef = useRef(false);

  /* Booking */
  const [selectedHotel, setSelectedHotel] = useState<HotelItem | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<TransportRoute | null>(null);
  const [selectedParking, setSelectedParking] = useState<ParkingSpot | null>(null);
  const [form, setForm] = useState<BookingForm>(INITIAL_FORM);
  const [transportFilter, setTransportFilter] = useState<TransportMode | "all">("all");
  const [bookingId, setBookingId] = useState("");
  const [userInput, setUserInput] = useState("");

  /* Onboarding (guided booking conversation) */
  const [onboardStep, setOnboardStep] = useState<OnboardStep>("done");
  const [slot, setSlot] = useState("");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [pendingPeople, setPendingPeople] = useState(0);

  /* Chained service booking */
  const [bookedServices, setBookedServices] = useState<BookingCategory[]>([]);
  const [skippedServices, setSkippedServices] = useState<BookingCategory[]>([]);
  const [paid, setPaid] = useState(false);
  const [committed, setCommitted] = useState<{ cat: BookingCategory; label: string; qty: number; unit: string; amount: number }[]>([]);

  const addAiMessage = useCallback((text: string, buttonList?: ChatMessage["buttons"], hint?: ChatMessage["hint"]) => {
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId(), role: "ai", text, buttons: buttonList, hint }]);
      setTyping(false);
    }, 800);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
  }, []);

  /* Append an AI message instantly (LLM replies already waited on the network). */
  const pushAi = useCallback((text: string, buttons?: ChatMessage["buttons"]) => {
    setMessages((prev) => [...prev, { id: nextId(), role: "ai", text, buttons }]);
  }, []);

  /* Greet on first chat open */
  const openChat = useCallback((initial: string | null = null) => {
    if (chatActive) return;
    setChatActive(true);
    setMessages([]);
    msgId = 0;
    if (initial) {
      setTimeout(() => {
        addUserMessage(initial);
        setOnboardStep("slot");
        addAiMessage(
          `Got it! To get you booked for ${event.name}, let's start with your details.

Which time slot would you like to attend?`,
          SLOTS.map((s) => ({ label: s.label, value: `slot:${s.value}` }))
        );
      }, 600);
      return;
    }
    addAiMessage(
      `Hey! I'm your EventPulse AI concierge for ${event.name}. What would you like to book?`,
      [
        { label: "🚗 Transport & Route", value: "transport" },
        { label: "🏨 Hotels & Stay", value: "hotels" },
      ]
    );
  }, [addAiMessage, addUserMessage, chatActive, event.name]);

  /* Auto-open chat with booking message when arriving from an event's Book button */
  useEffect(() => {
    const state = location.state as { bookEvent?: boolean } | null;
    if (!state?.bookEvent) return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    window.history.replaceState({}, "");
    openChat(`I'd like to book everything for ${event.name} — tickets, travel & stay.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-scroll */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* Category selected */
  const handleCategory = (cat: BookingCategory) => {
    const label = cat === "hotels" ? "🏨 Hotels & Stay" : cat === "parking" ? "🅿️ Parking" : "🚗 Transport & Route";
    addUserMessage(label);
    if (cat === "hotels") {
      setPanel("browsing-hotels");
      addAiMessage(
        `Here are the best hotels near ${event.venue}. Tap one to book.`,
        [{ label: "💡 Why these options?", value: "why:hotels" }],
        {
          title: "Why these hotels?",
          lines: [
            "Within 1.2 km verified walk of Gate A",
            "Live room inventory — 12 rooms free right now",
            "Price vs walking-time trade-off shown on each card",
            "G3 hotels lock availability + include free cancellation",
          ],
        }
      );
    } else if (cat === "parking") {
      setPanel("browsing-parking");
      addAiMessage(
        `Here are verified parking options near ${event.venue}. Tap one to reserve.`,
        [{ label: "💡 Why these options?", value: "why:parking" }],
        {
          title: "Why these parking options?",
          lines: [
            "Live slot counts refreshed from each lot — no overselling",
            "Closer lots cost more; walking time printed on every card",
            "G3 lots pre-hold your bay; G2/G1 are cheaper but weaker",
            "If the venue opens overflow, this lot slots in automatically",
          ],
        }
      );
    } else {
      setPanel("browsing-transport");
      addAiMessage(
        `Here are the best routes to ${event.venue}. Filter by mode or pick one.`,
        [{ label: "💡 Why these options?", value: "why:transport" }],
        {
          title: "Why these routes?",
          lines: [
            "Your 7:00 PM arrival deadline applied to every option",
            "Full door-to-door journey: first-mile ride + walk + transit + last-mile walk",
            "Seats verified live with each operator before listing",
            "Metro preferred first per your travel preference",
            "G5/G3 routes hold the seat; G2 & G1 are cheaper but weaker",
          ],
        }
      );
    }
  };

  /* ─── Onboarding (slot → count → people) ─── */

  const handleSlotSelect = (time: string) => {
    setSlot(time);
    addUserMessage(time);
    setOnboardStep("count");
    addAiMessage(
      `Perfect — ${time} slot secured for you.

How many people are attending?`,
      Array.from({ length: 4 }, (_, i) => ({
        label: `${i + 1} ${i === 0 ? "person" : "people"}`,
        value: `count:${i + 1}`,
      }))
    );
  };

  const handleCountSelect = (count: number) => {
    setPendingPeople(count);
    setAttendees([]);
    addUserMessage(count === 1 ? "Just me" : `${count} people`);
    setOnboardStep("people");
    addAiMessage(`Great! Please enter the name and age of person 1 (e.g. "Rohan, 24").`);
  };

  const handleAttendeeEntry = (text: string) => {
    let name = "";
    let age = "";
    if (text.includes(",")) {
      const parts = text.split(",").map((p) => p.trim());
      name = parts[0];
      age = parts[1];
    } else {
      const m = text.match(/^(.*?)\s+(\d{1,3})\s*$/);
      if (m) {
        name = m[1].trim();
        age = m[2];
      }
    }
    if (!name || !age) {
      addAiMessage(`Please include the person's age, like "Rohan, 24" or "Rohan 24".`);
      return;
    }
    const next = [...attendees, { name, age }];
    setAttendees(next);
    if (next.length < pendingPeople) {
      addAiMessage(`Thanks, ${name}! Now person ${next.length + 1} of ${pendingPeople} — name and age (e.g. "Sara, 22").`);
    } else {
      setOnboardStep("done");
      const list = next.map((a, i) => `${i + 1}. ${a.name} (${a.age})`).join("\n");
      addAiMessage(
        `All set! Here's your group for ${event.name}:\n${list}

Selected slot: ${slot}

Now let's sort your travel to ${event.venue}.`,
        [
          { label: "🚗 Arrange transport", value: "transport" },
          { label: "Skip travel 🙈", value: "skip:transport" },
          { label: "💡 What does G5 mean?", value: "why:g5" },
        ]
      );
    }
  };

  /* Route chat buttons: onboard vs category */
  const handleQuickAction = (value: string) => {
    if (value.startsWith("slot:")) {
      handleSlotSelect(value.slice(5));
    } else if (value.startsWith("count:")) {
      handleCountSelect(Number(value.slice(6)));
    } else if (value.startsWith("skip:")) {
      handleSkipService(value.slice(5) as BookingCategory);
    } else if (value.startsWith("transport:")) {
      handleCategory("transport");
    } else if (value.startsWith("hotels:")) {
      handleCategory("hotels");
    } else if (value === "why:g5") {
      addAiMessage(
        `The G-Ladder is how EventPulse guarantees honestly — every plan is graded by how much is actually locked behind it.

G5 → every link verified and your compensation is already sitting in escrow. If anything fails, it pays out automatically.
G3 → real capacity reserved in your name, no escrow.
G2 → capacity verified, but arrival window is only bounded.
G1 → a monitored recommendation — best effort.
G0 → public information only.

You'll always see your current level on your plan. If a link breaks, the level steps down honestly — never silently.`,
        undefined,
        {
          title: "How the ladder protects you",
          lines: [
            "Every level shows exactly what is locked, conditional, and what happens on failure",
            "A broken link downgrades your level in seconds and fires compensation from escrow",
            "EventPulse never promises more than the weakest verified link allows",
          ],
        }
      );
    } else if (value === "why:hotels" || value === "why:transport" || value === "why:parking") {
      const isHotels = value === "why:hotels";
      const isParking = value === "why:parking";
      addAiMessage(
        isHotels
          ? `Here's the decision trace for these hotels 👇`
          : isParking
            ? `Here's the decision trace for these parking options 👇`
            : `Here's the decision trace for these routes 👇`,
        undefined,
        {
          title: isHotels
            ? "Why these hotels were chosen"
            : isParking
              ? "Why these parking options were chosen"
              : "Why these routes were chosen",
          lines: isHotels
            ? [
                "Deadline: reach the venue by 7:00 PM — only hotels within a verified 1.2 km walk of Gate A qualify",
                "Capacity: live inventory showed free rooms tonight; everything listed is bookable right now",
                "Trade-off: cheaper rooms are farther away — the walk time is printed on every card",
              ]
            : isParking
              ? [
                  "Deadline: lots within a verified 3 km radius of the venue were shortlisted",
                  "Live slots: counts are pulled in real time — a spot you see is a spot you can hold",
                  "Trade-off: closer lots are pricier; overflow lot opens automatically if needed",
                ]
              : [
                  "Deadline: arrival by 7:00 PM — options that could not clear the time bound were discarded",
                  "Verified links: seats were confirmed with each operator before listing (not assumed)",
                  "Preference: metro-first matched your stated preference; price and certainty trade-off shown per route",
                ],
        }
      );
    } else if (value === "restart") {
      handleRestart();
    } else {
      handleCategory(value as BookingCategory);
    }
  };

  /* Item selected */
  const prefilledForm = (): BookingForm => ({
    name: attendees[0]?.name ?? "",
    yearOfBirth: attendees[0]?.age ? `${new Date().getFullYear() - Number(attendees[0].age)}` : "",
    persons: attendees.length > 0 ? attendees.length : 1,
    time: slot || "",
  });
  const openForm = (setter: () => void) => {
    setForm(prefilledForm());
    setter();
  };
  const handleHotelSelect = (h: HotelItem) => {
    setSelectedHotel(h);
    openForm(() => setPanel("hotel-form"));
    addUserMessage(h.name);
    addAiMessage(`${h.name} — ${h.rating}★, ${h.price}/night. Fill in your details to reserve.`);
  };
  const handleRouteSelect = (r: TransportRoute) => {
    setSelectedRoute(r);
    openForm(() => setPanel("transport-form"));
    addUserMessage(r.name);
    addAiMessage(`${r.name} via ${r.provider} — ${r.eta}, ${r.price}. Enter your details.`);
  };
  const handleParkingSelect = (p: ParkingSpot) => {
    setSelectedParking(p);
    openForm(() => setPanel("parking-form"));
    addUserMessage(p.name);
    addAiMessage(`${p.name} — ${p.distance}, ${p.price} per vehicle. Enter your details to reserve.`);
  };

  /* Submit */
  const handleBookingSubmit = () => {
    if (!form.name.trim() || !form.yearOfBirth.trim() || !form.time.trim()) return;
    const id = `EP-${Date.now().toString(36).toUpperCase()}`;
    setBookingId(id);
    setPanel("confirmed");
    const cat: BookingCategory = selectedHotel ? "hotels" : selectedParking ? "parking" : "transport";
    const name = selectedHotel?.name || selectedRoute?.name || selectedParking?.name || "";
    const slotInfo = slot ? ` Slots: ${slot}` : "";
    const peopleInfo = attendees.length > 0 ? ` · ${attendees.length} attendee(s)` : ` · ${form.persons} person(s)`;
    if (selectedRoute) {
      setCommitted((prev) => [...prev, { cat, label: selectedRoute.name, qty: personCount, unit: selectedRoute.price, amount: (selectedRoute.priceValue || 0) * personCount }]);
    } else if (selectedHotel) {
      setCommitted((prev) => [...prev, { cat, label: selectedHotel.name, qty: 1, unit: `${selectedHotel.price}/night`, amount: selectedHotel.pricePerNight || 0 }]);
    } else if (selectedParking) {
      setCommitted((prev) => [...prev, { cat, label: selectedParking.name, qty: 1, unit: selectedParking.price, amount: selectedParking.priceValue || 0 }]);
    }
    addUserMessage(`Name: ${form.name}, Year: ${form.yearOfBirth}, ${form.persons} person(s), Time: ${form.time}`);
    addAiMessage(
      `Reservation confirmed at ${name}! Booking ID: ${id}.${slotInfo}${peopleInfo}\n\n✓ ${name} is now added to your plan for ${event.name}.`
    );
    setBookedServices((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
  };

  /* Recommend the next relevant service after a booking (pure — chain: transport → parking → stay) */
  const nextRecommendationFrom = (
    booked: BookingCategory[],
    skipped: BookingCategory[],
  ): { cat: BookingCategory; label: string } | null => {
    if (!booked.includes("transport") && !skipped.includes("transport")) {
      return { cat: "transport", label: "Arrange your travel to the venue" };
    }
    if (!booked.includes("parking") && !skipped.includes("parking")) {
      return { cat: "parking", label: "Reserve venue parking" };
    }
    if (!booked.includes("hotels") && !skipped.includes("hotels")) {
      return { cat: "hotels", label: "Book a hotel near the venue" };
    }
    return null;
  };

  const nextRecommendation = () => nextRecommendationFrom(bookedServices, skippedServices);

  const catLabel = (cat: BookingCategory): string =>
    cat === "hotels" ? "hotel" : cat === "parking" ? "parking" : "travel";

  const allResolved = (): boolean =>
    nextRecommendation() === null ||
    (bookedServices.includes("transport") || skippedServices.includes("transport")) &&
    (bookedServices.includes("parking") || skippedServices.includes("parking")) &&
    (bookedServices.includes("hotels") || skippedServices.includes("hotels"));

  const handleSkipService = (cat: BookingCategory) => {
    const label = catLabel(cat);
    closePanel();
    addUserMessage(`Skip ${label}`);
    const nextSkipped = skippedServices.includes(cat) ? skippedServices : [...skippedServices, cat];
    setSkippedServices(nextSkipped);
    const rec = nextRecommendationFrom(bookedServices, nextSkipped);
    if (rec) {
      addAiMessage(`No problem — we'll skip the ${label}. Next up: ${rec.label}.`, [
        { label: `Continue — ${rec.label}`, value: rec.cat },
        { label: "Skip this too 🙈", value: `skip:${rec.cat}` },
      ]);
    } else {
      handleProceedToPayment();
    }
  };

  const handleProceedToPayment = () => {
    closePanel();
    setPaid(false);
    setPanel("payment");
    addAiMessage(
      `🛒 Let's review your booking and payment for ${event.name}.\n\nAmount will be shown in the payment panel.`
    );
  };

  const personCount = attendees.length > 0 ? attendees.length : form.persons;
  const eventTicketPrice = Number(event.price.replace(/[^\d]/g, "")) || 0;
  const bookingLines = () => {
    const lines: { label: string; qty: number; unit: string; amount: number }[] = [];
    lines.push({ label: "Event Tickets", qty: personCount, unit: event.price, amount: eventTicketPrice * personCount });
    committed.forEach((c) => {
      lines.push({ label: c.label, qty: c.qty, unit: c.unit, amount: c.amount });
    });
    return lines.filter((l) => l.amount > 0);
  };
  const totalAmount = () => bookingLines().reduce((s, l) => s + l.amount, 0);
  const gst = Math.round(totalAmount() * 0.18);
  const grandTotal = totalAmount() + gst;
  const payId = () => `PAY-${Date.now().toString(36).toUpperCase()}`;

  const handlePay = () => {
    const id = payId();
    setBookingId(id);
    setPaid(true);
    notify("success", "Booking Confirmed & Paid", `Amount ₹${grandTotal.toLocaleString("en-IN")} paid — Booking ID ${id}.`);
    generateReceiptPdf(id);
    addAiMessage(
      `✅ Payment of ₹${grandTotal.toLocaleString("en-IN")} was successful!\n\nYour receipt PDF has been downloaded. Booking ID: ${id}.\n\nThank you for booking with EventPulse — enjoy ${event.name}! 🎉`
    );
  };

  const generateReceiptPdf = (id: string) => {
    const doc = new jsPDF();
    doc.setFillColor(144, 88, 49);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("EventPulse", 14, 17);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Event Mobility Platform", 14, 24);

    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Payment Receipt", 14, 44);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipt No: ${id}`, 14, 54);
    doc.text(`Date: ${new Date().toLocaleString("en-IN")}`, 14, 60);
    doc.text(`Event: ${event.name}`, 14, 66);
    doc.text(`Slot: ${slot || "—"}`, 14, 72);
    doc.text(`Venue: ${event.venue}, ${event.city}`, 14, 78);

    doc.line(14, 84, 196, 84);
    doc.setFont("helvetica", "bold");
    doc.text("Item", 14, 92);
    doc.text("Qty", 110, 92);
    doc.text("Amount (INR)", 150, 92);
    doc.line(14, 95, 196, 95);

    let y = 102;
    doc.setFont("helvetica", "normal");
    bookingLines().forEach((l) => {
      doc.text(l.label, 14, y);
      doc.text(String(l.qty), 112, y);
      doc.text(l.amount.toLocaleString("en-IN"), 160, y, { align: "right" });
      y += 7;
    });

    y += 4;
    doc.line(14, y, 196, y);
    y += 7;
    doc.text("Subtotal", 14, y);
    doc.text(totalAmount().toLocaleString("en-IN"), 160, y, { align: "right" });
    y += 7;
    doc.text("GST (18%)", 14, y);
    doc.text(gst.toLocaleString("en-IN"), 160, y, { align: "right" });
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Total Paid", 14, y);
    doc.text(grandTotal.toLocaleString("en-IN"), 160, y, { align: "right" });

    y += 14;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120);
    if (attendees.length) {
      doc.text(`Attendees: ${attendees.map((a) => `${a.name} (${a.age})`).join(", ")}`, 14, y);
    }
    doc.text(`This is a computer-generated receipt. Booking subject to EventPulse terms.`, 14, y + 8);

    doc.save(`EventPulse-Receipt-${id}.pdf`);
  };

  const handleContinueBooking = () => {
    const rec = nextRecommendation();
    closePanel();
    if (!rec) {
      handleProceedToPayment();
      return;
    }
    handleCategory(rec.cat);
  };

  /* Back */
  const handleBack = () => {
    setSelectedHotel(null);
    setSelectedRoute(null);
    setSelectedParking(null);
    if (panel === "hotel-form") setPanel("browsing-hotels");
    else if (panel === "transport-form") setPanel("browsing-transport");
    else if (panel === "parking-form") setPanel("browsing-parking");
  };

  /* Close panel */
  const closePanel = () => {
    setPanel("closed");
    setSelectedHotel(null);
    setSelectedRoute(null);
    setSelectedParking(null);
    setForm(INITIAL_FORM);
  };

  /* Restart */
  const handleRestart = () => {
    closePanel();
    setBookingId("");
    setMessages([]);
    msgId = 0;
    setChatActive(false);
    setOnboardStep("done");
    setSlot("");
    setAttendees([]);
    setPendingPeople(0);
    setBookedServices([]);
    setSkippedServices([]);
    setPaid(false);
    setCommitted([]);
  };

  /* Route a structured AI verdict into the existing booking flows. */
  const routeAiVerdict = (res: AiChatResponse) => {
    const v = res.intent;
    if (v === "transport" || v === "hotels" || v === "parking") {
      handleCategory(v);
      return;
    }
    if (
      v &&
      ["restart", "why:g5", "why:transport", "why:hotels", "why:parking", "skip:transport", "skip:hotels", "skip:parking"].includes(v)
    ) {
      handleQuickAction(v);
      return;
    }
    pushAi(res.reply, res.choices && res.choices.length > 0 ? res.choices : undefined);
  };

  /* Deterministic fallback when the backend/AI is not reachable. */
  const fallbackReply = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("hotel") || lower.includes("stay") || lower.includes("room")) {
      handleCategory("hotels");
    } else if (lower.includes("parking") || lower.includes("park") || lower.includes("vehicle")) {
      handleCategory("parking");
    } else if (lower.includes("transport") || lower.includes("route") || lower.includes("metro") || lower.includes("cab") || lower.includes("bus")) {
      handleCategory("transport");
    } else if (lower.includes("why") || lower.includes("how do you know") || lower.includes("trust")) {
      addAiMessage(
        `Great question — EventPulse never asks you to take a number on faith. Every claim carries a grade, every plan carries a G-level, and you can always inspect why an option was chosen.
\nTap below for the decision trace, or ask me about the G-Ladder.`,
        [
          { label: "💡 Why these options?", value: "why:transport" },
          { label: "📖 What does G5 mean?", value: "why:g5" },
        ]
      );
    } else if (lower.includes("mode") || lower.includes("degraded") || lower.includes("emergency")) {
      addAiMessage(
        mode !== "NORMAL"
          ? `We're currently operating in ${mode} mode — new plans are capped at G2, and escrow compensation is frozen for new commitments. Your existing G5 stays honored.`
          : `We're in NORMAL mode right now — the full G-Ladder (G5 → G3 → G2 → G1) is available for verified plans.`,
        undefined,
        {
          title: "Operating mode (V2.1 §26)",
          lines: [
            "NORMAL — all levels allowed, per verified trust",
            "DEGRADED — new commitments capped at G2, no auto incentives",
            "EMERGENCY — new G≥2 frozen, safe-exit guidance broadcast",
            "PLATFORM-DEGRADED — held tokens honored if cryptographically valid",
          ],
        }
      );
    } else {
      addAiMessage(`Great question! For ${event.name}, I can help you with transport or hotels. What would you like to book?`, [
        { label: "🚗 Transport & Route", value: "transport" },
        { label: "🏨 Hotels & Stay", value: "hotels" },
      ]);
    }
  };

  /* Send free-text message — real LLM first, deterministic fallback offline */
  const handleSend = async () => {
    const text = userInput.trim();
    if (!text || typing) return;
    addUserMessage(text);
    setUserInput("");
    if (onboardStep === "people") {
      handleAttendeeEntry(text);
      return;
    }
    if (backendStatus !== "live") {
      fallbackReply(text);
      return;
    }
    setTyping(true);
    try {
      const history: AiChatMessage[] = messages
        .slice(-12)
        .filter((m) => m.role === "ai" || m.role === "user")
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.text,
        }));
      const res = await aiChat(
        [...history, { role: "user", content: text }],
        { name: event.name, venue: event.venue, date: event.date },
      );
      setTyping(false);
      if (res.reply) {
        routeAiVerdict(res);
      } else {
        pushAi(res.reply || `I couldn't parse that — could you rephrase? For ${event.name} I can help with transport or hotels.`, [
          { label: "🚗 Transport & Route", value: "transport" },
          { label: "🏨 Hotels & Stay", value: "hotels" },
        ]);
      }
    } catch {
      setTyping(false);
      fallbackReply(text);
    }
  };

  const filteredRoutes = transportFilter === "all" ? TRANSPORT_ROUTES : TRANSPORT_ROUTES.filter((r) => r.mode === transportFilter);
  const panelOpen = panel !== "closed";

  /* ─── RENDER ─── */

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-white font-sans">
      {/* Background video */}
      <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover z-0">
        <source src="/videos/figma-video.mp4" type="video/mp4" />
      </video>

      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-[687px] pointer-events-none z-[1]" style={{ background: "linear-gradient(180deg, rgba(243,239,231,1) 0%, rgba(243,239,231,0) 100%)" }} />

      {/* ─── MAIN LAYOUT: flex row when panel open ─── */}
      <div className={cn("relative z-[2] flex h-svh transition-all duration-500", panelOpen && "gap-0")}>

        {/* ══════ LEFT COLUMN: Original hero page ══════ */}
        <div className={cn("flex-1 overflow-y-auto transition-all duration-500", panelOpen && "lg:w-[440px] lg:shrink-0")}>
          <div className="max-w-[1360px] mx-auto">
            {/* Hero body */}
            <div className="flex flex-col items-center px-6 pt-16 pb-24 text-center">
              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="font-sans text-[clamp(40px,6vw,68px)] font-medium text-wandor-text leading-[1.05] tracking-[-0.04em] max-w-[820px] mb-5">
                How can EventPulse help you?
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} className="font-sans text-xl font-medium text-wandor-muted leading-relaxed max-w-[500px] mb-10">
                Tell our AI what you need for {event.name} — arrival time, budget, constraints. It builds a verified journey plan, with real capacity behind every claim.
              </motion.p>

              {/* ─── PROMPT CARD / CHAT ─── */}
              <motion.div initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }} className="relative w-[701px] max-md:w-[calc(100vw-48px)] bg-white/[0.06] border-[3px] border-white rounded-[44px] shadow-[0_0_4px_0_rgba(0,0,0,0.15)] overflow-hidden backdrop-blur-[20px] text-left">
                <AnimatePresence mode="wait">
                  {!chatActive ? (
                    /* ── IDLE: original prompt card ── */
                    <motion.div key="idle" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="min-h-[208px]">
                      <p className="absolute left-[29px] top-[57px] -translate-y-1/2 w-[609px] max-md:w-[calc(100%-58px)] font-sans text-xl max-md:text-[17px] font-medium text-wandor-prompt leading-relaxed break-words max-md:relative max-md:top-[38px] max-md:translate-y-0 max-md:mb-[124px]">
                        I'm attending {event.name} on Sep 12 at {event.venue}. I need to reach the venue by 7 PM, I prefer metro, and I want to avoid heavy traffic....
                      </p>
                      <button onClick={() => fileRef.current?.click()} aria-label="Upload inspiration" className="absolute left-[21px] top-[137px] max-md:top-auto max-md:bottom-[79px] w-11 h-11 bg-transparent border border-white/70 rounded-full cursor-pointer flex items-center justify-center backdrop-blur-[14px] transition-transform hover:scale-105">
                        <Upload className="w-[18px] h-[18px] text-wandor-text flex-shrink-0" />
                      </button>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                        if (e.target.files?.length) notify("info", "Inspiration received", "Ticket or map attached — the AI will factor it into your plan.");
                        e.target.value = "";
                      }} />
                      <button onClick={() => openChat()} className="absolute bottom-[21px] right-[21px] w-[156px] h-14 bg-black border-none rounded-[44px] shadow-[0_0_2px_0_rgba(0,0,0,0.05)] cursor-pointer flex items-center justify-center font-sans text-base font-medium text-[#fafafa] uppercase tracking-[0.02em] transition-all hover:bg-[#333] active:scale-95">
                        Plan My Trip
                      </button>
                    </motion.div>
                  ) : (
                    /* ── CHAT ACTIVE ── */
                    <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col max-h-[560px]">
                      {/* Messages area (scrollable) */}
                      <div className="flex-1 overflow-y-auto px-[26px] py-7 md:px-[29px] md:py-8">
                      {/* Header */}
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-wandor-muted mb-4">
                        <Sparkles className="h-3.5 w-3.5 text-wandor-prompt" />
                        EventPulse Concierge
                        <span className="ml-1 flex items-center gap-1 rounded-full border border-wandor-text/10 bg-white/50 px-2 py-0.5 text-[9px] font-bold tracking-widest text-wandor-muted">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" /> ONLINE
                        </span>
                      </div>

                      {mode !== "NORMAL" && (
                        <div className={cn("mb-4 rounded-2xl border px-3.5 py-2.5 text-[12px] font-medium leading-relaxed", mode === "EMERGENCY" ? "border-red-600/30 bg-red-600/10 text-red-800" : mode === "PLATFORM-DEGRADED" ? "border-violet-600/30 bg-violet-600/10 text-violet-800" : "border-amber-600/30 bg-amber-600/10 text-amber-800")}>
                          ⚠ <b>{mode} MODE</b> — {mode === "EMERGENCY" ? "no new G≥2 commitments and safe-exit guidance is being broadcast" : mode === "DEGRADED" ? "new bookings are capped at G2 · auto incentives paused" : "new G≥2 frozen · held tokens honored if valid (V2.1 §27.1)"}. Existing commitments stay honored.
                        </div>
                      )}

                      {/* Messages */}
                      {messages.map((m) => (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mb-3", m.role === "user" && "text-right")}>
                          {m.role === "ai" ? (
                            <div className="flex items-start gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wandor-dark/10 mt-0.5">
                                <Bot className="h-3.5 w-3.5 text-wandor-dark" />
                              </div>
                              <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/70 backdrop-blur border border-white/50 px-4 py-2.5 text-[14px] leading-relaxed text-wandor-text">
                                {m.text}
                                {m.hint && (
                                  <div className="mt-2.5 rounded-xl border border-dashed border-wandor-prompt/30 bg-white/60 p-3 text-left">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-wandor-prompt">{m.hint.title}</div>
                                    <ul className="mt-1.5 space-y-1">
                                      {m.hint.lines.map((l) => (
                                        <li key={l} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-wandor-muted">
                                          <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-wandor-prompt" /> {l}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {m.buttons && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {m.buttons.map((b) => (
                                      <button key={b.value} onClick={() => handleQuickAction(b.value)} className="rounded-full border border-wandor-text/15 bg-[#fafaf8]/80 backdrop-blur px-4 py-2 text-[13px] font-medium text-wandor-text transition-all hover:bg-white active:scale-95">
                                        {b.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="inline-block rounded-2xl rounded-tr-md bg-wandor-dark px-4 py-2.5 text-[14px] font-medium text-white">
                              {m.text}
                            </div>
                          )}
                        </motion.div>
                      ))}

                      {/* Typing */}
                      {typing && (
                        <div className="flex items-start gap-2 mb-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wandor-dark/10 mt-0.5">
                            <Bot className="h-3.5 w-3.5 text-wandor-dark" />
                          </div>
                          <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white/70 backdrop-blur border border-white/50 px-4 py-3">
                            {[0, 1, 2].map((i) => (
                              <motion.span key={i} className="h-2 w-2 rounded-full bg-wandor-text/30" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                      </div>

                      {/* Input (fixed at bottom) */}
                      <div className="shrink-0 border-t border-wandor-text/8 px-[26px] py-3 md:px-[29px]">
                        <div className="flex items-center gap-2">
                          <input
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Type a message…"
                            className="flex-1 rounded-full border border-wandor-text/15 bg-white/60 backdrop-blur px-4 py-2.5 text-[14px] text-wandor-text placeholder:text-wandor-muted/60 outline-none transition focus:border-wandor-prompt/50"
                          />
                          <button
                            onClick={handleSend}
                            disabled={!userInput.trim() || typing}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wandor-dark text-white transition-all hover:bg-[#333] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Quick prompts (only when chat not active) */}
              {!chatActive && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.65, ease: [0.22, 1, 0.36, 1] }} className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                  {["🏨 Book a hotel near the venue", "🚗 Find best route to venue"].map((q, i) => (
                    <motion.button key={q} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.75 + i * 0.1 }} onClick={() => openChat(q)} className="rounded-full border border-white/80 bg-white/50 px-4 py-2 text-[13px] font-medium text-wandor-text backdrop-blur-[10px] transition-all hover:bg-white active:scale-95">
                      {q}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* ══════ RIGHT PANEL: Booking (slides in) ══════ */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex flex-col overflow-hidden border-l border-wandor-text/8 bg-[#fafaf8]"
              style={{ maxWidth: panel === "confirmed" || panel === "payment" ? "520px" : "640px" }}
            >
              {/* Panel header */}
              <div className="flex items-center gap-3 border-b border-wandor-text/8 bg-white px-5 py-3.5 shrink-0">
                {(panel === "hotel-form" || panel === "transport-form" || panel === "parking-form") ? (
                  <button onClick={handleBack} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-wandor-text/5 transition-colors">
                    <ChevronLeft className="h-4 w-4 text-wandor-muted" />
                  </button>
                ) : null}
                <div className="flex-1">
                  <div className="text-sm font-semibold text-wandor-text">
                    {panel === "browsing-hotels" && "Hotels near " + event.venue}
                    {panel === "browsing-transport" && "Routes to " + event.venue}
                    {panel === "browsing-parking" && "Parking near " + event.venue}
                    {panel === "hotel-form" && "Book Hotel"}
                    {panel === "transport-form" && "Book Route"}
                    {panel === "parking-form" && "Reserve Parking"}
                    {panel === "confirmed" && "Reservation Confirmed"}
                    {panel === "payment" && (paid ? "Payment Successful" : "Review & Pay")}
                  </div>
                </div>
                <button onClick={closePanel} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-wandor-text/5 transition-colors">
                  <X className="h-4 w-4 text-wandor-muted" />
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {/* ── BROWSING HOTELS ── */}
                  {panel === "browsing-hotels" && (
                    <motion.div key="bh" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5 space-y-3">
                      {HOTELS.map((h) => (
                        <button key={h.id} onClick={() => handleHotelSelect(h)} className="flex w-full overflow-hidden rounded-2xl border border-wandor-text/8 bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-wandor-prompt/30 hover:shadow-md active:scale-[0.99]">
                          <img src={h.image} alt={h.name} className="h-[120px] w-[140px] shrink-0 object-cover" />
                          <div className="flex flex-1 flex-col justify-between p-3.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-semibold text-wandor-text">{h.name}</span>
                                <span className="rounded-full bg-wandor-prompt/10 px-2 py-0.5 text-[10px] font-bold text-wandor-prompt">{h.gLevel}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-wandor-muted">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {h.rating} · {h.distance}
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {h.amenities.map((a) => (
                                  <span key={a} className="rounded-full bg-wandor-text/5 px-2 py-0.5 text-[10px] font-medium text-wandor-muted">{a}</span>
                                ))}
                              </div>
                            </div>
                            <div className="mt-2 flex items-end justify-between">
                              <span className="text-base font-bold text-wandor-text">{h.price}<span className="text-xs font-normal text-wandor-muted">/night</span></span>
                              <span className="text-[11px] font-medium text-emerald-600">{h.roomsLeft} rooms left</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {/* ── BROWSING TRANSPORT ── */}
                  {panel === "browsing-transport" && (
                    <motion.div key="bt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                      {/* Mode filter */}
                      <div className="mb-4 flex gap-2">
                        {(["all", "train", "cab", "bus"] as const).map((m) => (
                          <button key={m} onClick={() => setTransportFilter(m)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-all", transportFilter === m ? "border-wandor-dark bg-wandor-dark text-white" : "border-wandor-text/15 bg-white text-wandor-text hover:border-wandor-text/40")}>
                            {m === "all" ? "All" : m === "train" ? "🚆 Train" : m === "cab" ? "🚗 Cab" : "🚌 Bus"}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2.5">
                        {filteredRoutes.map((r) => {
                          const Icon = MODE_ICONS[r.mode];
                          return (
                            <button key={r.id} onClick={() => handleRouteSelect(r)} className="flex w-full items-center gap-3 rounded-2xl border border-wandor-text/8 bg-white p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-wandor-prompt/30 hover:shadow-md active:scale-[0.99]">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wandor-prompt/10">
                                <Icon className="h-5 w-5 text-wandor-prompt" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold text-wandor-text">{r.name}</span>
                                  <span className="rounded-full bg-wandor-prompt/10 px-2 py-0.5 text-[10px] font-bold text-wandor-prompt">{r.gLevel}</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-wandor-muted">{r.provider} · {r.departure} → {r.arrival}</div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                  {r.legs.map((leg, i) => (
                                    <span key={i} className="flex items-center">
                                      {i > 0 && <span className="mx-0.5 text-[9px] text-wandor-muted/50">→</span>}
                                      <span className="rounded-md bg-wandor-text/[0.06] px-1.5 py-0.5 text-[10px] font-medium leading-none text-wandor-muted">
                                        {LEG_ICON[leg.mode]} {leg.label} {leg.duration}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-[11px] text-wandor-muted">
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.eta}</span>
                                  <span>{r.stops > 0 ? `${r.stops} stops` : "Direct"}</span>
                                  <span className={cn("font-medium", r.capacity === "Verified" ? "text-emerald-600" : r.capacity === "Limited" ? "text-amber-600" : "")}>{r.capacity}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-base font-bold text-wandor-text">{r.price}</div>
                                <div className="text-[10px] text-wandor-muted">per person</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* ── HOTEL FORM ── */}
                  {panel === "hotel-form" && selectedHotel && (
                    <motion.div key="hf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                      <div className="mb-4 overflow-hidden rounded-2xl border border-wandor-text/8 bg-white">
                        <img src={selectedHotel.image} alt={selectedHotel.name} className="h-[140px] w-full object-cover" />
                        <div className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-wandor-text">{selectedHotel.name}</span>
                            <span className="rounded-full bg-wandor-prompt/10 px-2 py-0.5 text-[10px] font-bold text-wandor-prompt">{selectedHotel.gLevel}</span>
                          </div>
                          <div className="mt-1 text-xs text-wandor-muted"><Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> {selectedHotel.rating} · {selectedHotel.distance}</div>
                        </div>
                      </div>
                      <BookingFormWidget form={form} setForm={setForm} label="Persons" max={10} onSubmit={handleBookingSubmit} submitLabel={`Confirm Reservation — ${selectedHotel.price}/night`} />
                    </motion.div>
                  )}

                  {/* ── TRANSPORT FORM ── */}
                  {panel === "transport-form" && selectedRoute && (
                    <motion.div key="tf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                      <div className="mb-4 rounded-2xl border border-wandor-text/8 bg-white p-4">
                        <div className="flex items-center gap-3">
                          {(() => { const I = MODE_ICONS[selectedRoute.mode]; return <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wandor-prompt/10"><I className="h-5 w-5 text-wandor-prompt" /></div>; })()}
                          <div>
                            <div className="text-base font-semibold text-wandor-text">{selectedRoute.name}</div>
                            <div className="text-xs text-wandor-muted">{selectedRoute.provider} · {selectedRoute.eta} · {selectedRoute.price}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-4 text-[11px] text-wandor-muted">
                          <span>Departs {selectedRoute.departure}</span>
                          <span>Arrives {selectedRoute.arrival}</span>
                        </div>
                        <div className="mt-3 border-t border-wandor-text/6 pt-3">
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-wandor-muted">Journey flow</div>
                          <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
                            {selectedRoute.legs.map((leg, i) => (
                              <Fragment key={i}>
                                <div className="flex w-[134px] shrink-0 flex-col gap-1 rounded-xl border border-wandor-text/8 bg-wandor-prompt/[0.04] p-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-base leading-none">{LEG_ICON[leg.mode]}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-wandor-prompt">{LEG_MODE_LABEL[leg.mode]}</span>
                                  </div>
                                  <span className="mt-1 text-[11px] font-semibold leading-tight text-wandor-text">{leg.label}</span>
                                  <span className="text-[10px] text-wandor-muted">{leg.offer ?? "—"}</span>
                                  <div className="mt-auto flex items-center justify-between pt-1.5">
                                    <span className="text-[10px] text-wandor-muted">{leg.duration}</span>
                                    <span className="text-[12px] font-bold text-wandor-text">{leg.price ?? "₹0"}</span>
                                  </div>
                                </div>
                                {i < selectedRoute.legs.length - 1 && (
                                  <div className="flex shrink-0 items-center">
                                    <ArrowRight className="h-3.5 w-3.5 text-wandor-muted/50" />
                                  </div>
                                )}
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      </div>
                      <BookingFormWidget form={form} setForm={setForm} label="Passengers" max={10} onSubmit={handleBookingSubmit} submitLabel={`Book Route — ${selectedRoute.price} × ${form.persons}`} />
                    </motion.div>
                  )}

                  {/* ── BROWSING PARKING ── */}
                  {panel === "browsing-parking" && (
                    <motion.div key="bp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5 space-y-3">
                      {PARKING_SPOTS.map((p) => (
                        <button key={p.id} onClick={() => handleParkingSelect(p)} className="flex w-full items-center gap-3 rounded-2xl border border-wandor-text/8 bg-white p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-wandor-prompt/30 hover:shadow-md active:scale-[0.99]">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wandor-prompt/10">
                            <Car className="h-5 w-5 text-wandor-prompt" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-wandor-text">{p.name}</span>
                              <span className="rounded-full bg-wandor-prompt/10 px-2 py-0.5 text-[10px] font-bold text-wandor-prompt">{p.gLevel}</span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-wandor-muted">{p.type} · {p.distance}</div>
                            <div className="mt-1 flex items-center gap-3 text-[11px] text-wandor-muted">
                              <span>{p.filled}/{p.capacity} filled</span>
                              <span className={cn("font-medium", p.filled >= p.capacity * 0.85 ? "text-amber-600" : "text-emerald-600")}>{p.available ? "Available now" : "Full"}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-bold text-wandor-text">{p.price}</div>
                            <div className="text-[10px] text-wandor-muted">per vehicle</div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}

                  {/* ── PARKING FORM ── */}
                  {panel === "parking-form" && selectedParking && (
                    <motion.div key="pf" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
                      <div className="mb-4 rounded-2xl border border-wandor-text/8 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wandor-prompt/10">
                            <Car className="h-5 w-5 text-wandor-prompt" />
                          </div>
                          <div>
                            <div className="text-base font-semibold text-wandor-text">{selectedParking.name}</div>
                            <div className="text-xs text-wandor-muted">{selectedParking.type} · {selectedParking.distance} · {selectedParking.price}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-4 text-[11px] text-wandor-muted">
                          <span>{selectedParking.filled}/{selectedParking.capacity} filled</span>
                          <span>{selectedParking.available ? "Available now" : "Full"}</span>
                        </div>
                      </div>
                      <BookingFormWidget form={form} setForm={setForm} label="Vehicle" max={5} onSubmit={handleBookingSubmit} submitLabel={`Reserve Parking — ${selectedParking.price}`} />
                    </motion.div>
                  )}

                  {/* ── CONFIRMED ── */}
                  {panel === "confirmed" && (
                    <motion.div key="cf" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-8 text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }} className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                        <CircleCheck className="h-8 w-8 text-emerald-600" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-wandor-text">Reservation Confirmed!</h3>
                      <p className="mt-1 text-sm text-wandor-muted">Your booking for <span className="font-medium text-wandor-text">{event.name}</span> is secured.</p>

                      <div className="mt-5 w-full rounded-2xl border border-wandor-text/8 bg-white p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-wandor-muted">Booking ID</div>
                        <div className="mt-1 text-base font-bold font-mono text-wandor-text">{bookingId}</div>
                        <div className="mt-3 h-px w-full bg-wandor-text/8" />
                        <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
                          <div><div className="text-wandor-muted">Service</div><div className="mt-0.5 font-medium text-wandor-text">{selectedHotel?.name || selectedRoute?.name || selectedParking?.name}</div></div>
                          <div><div className="text-wandor-muted">Amount</div><div className="mt-0.5 font-medium text-wandor-text">{selectedHotel?.price || selectedRoute?.price || selectedParking?.price}</div></div>
                          <div><div className="text-wandor-muted">Name</div><div className="mt-0.5 font-medium text-wandor-text">{form.name}</div></div>
                          <div><div className="text-wandor-muted">Persons</div><div className="mt-0.5 font-medium text-wandor-text">{form.persons}</div></div>
                          <div className="col-span-2"><div className="text-wandor-muted">Backed as</div><div className="mt-0.5"><GBadge level={commitmentLevel} size="sm" /></div></div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center gap-4 rounded-2xl border border-emerald-600/20 bg-emerald-600/[0.05] p-4">
                        <QRBlock seed={bookingId || "EP"} size={72} />
                        <div className="text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-800">Offline valid</span>
                          </div>
                          <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-wandor-muted">
                            This token verifies at the gate even without network — signed and cached on your device (V2.1 §27.1).
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 w-full space-y-2">
                        {nextRecommendation() && (
                          <>
                            <button onClick={handleContinueBooking} className="w-full rounded-full bg-wandor-prompt py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                              Continue — {nextRecommendation()!.label} <ArrowRight className="inline h-4 w-4" />
                            </button>
                            <button onClick={() => handleSkipService(nextRecommendation()!.cat)} className="w-full rounded-full border border-wandor-text/15 bg-white py-2.5 text-sm font-medium text-wandor-muted hover:bg-wandor-text/5 transition-colors">
                              Skip {catLabel(nextRecommendation()!.cat)}
                            </button>
                          </>
                        )}
                        {allResolved() && (
                          <button onClick={handleProceedToPayment} className="w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
                            Proceed to Payment 💳
                          </button>
                        )}
                        <div className="flex gap-3">
                          <button onClick={handleRestart} className="flex-1 rounded-full border border-wandor-text/15 bg-white px-4 py-2 text-sm font-medium text-wandor-text hover:bg-wandor-text/5 transition-colors">Book Another</button>
                          <button onClick={() => navigate("/app/discover")} className="flex-1 rounded-full bg-wandor-dark px-4 py-2 text-sm font-medium text-white hover:bg-[#333] transition-colors">Browse Events</button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── PAYMENT ── */}
                  {panel === "payment" && (
                    <motion.div key="pay" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-5">
                      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-wandor-text/8 bg-white p-4">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-wandor-text">{event.name}</div>
                          <div className="text-xs text-wandor-muted">{event.date} · {slot || event.time} · {attendees.length || form.persons} attendee(s)</div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-wandor-text/8 bg-white p-4 text-sm">
                        {bookingLines().map((l, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5">
                            <span className="text-wandor-text">{l.label} <span className="text-wandor-muted">×{l.qty} ({l.unit})</span></span>
                            <span className="font-medium text-wandor-text">₹{l.amount.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                        <div className="mt-2 border-t border-wandor-text/8 pt-2">
                          <div className="flex items-center justify-between py-1 text-wandor-muted">
                            <span>Subtotal</span><span>₹{totalAmount().toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 text-wandor-muted">
                            <span>GST (18%)</span><span>₹{gst.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex items-center justify-between py-1.5 text-base font-bold text-wandor-text">
                            <span>Total</span><span>₹{grandTotal.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>

                      {paid ? (
                        <div className="mt-4 flex flex-col items-center rounded-2xl bg-emerald-50 p-5 text-center">
                          <CircleCheck className="h-9 w-9 text-emerald-600" />
                          <div className="mt-2 text-sm font-semibold text-emerald-800">Payment Successful</div>
                          <div className="mt-1 text-xs text-emerald-700">Receipt PDF downloaded · ID {bookingId}</div>
                          <button onClick={() => navigate("/app/discover")} className="mt-4 rounded-full bg-wandor-dark px-5 py-2 text-sm font-medium text-white hover:bg-[#333] transition-colors">Done</button>
                        </div>
                      ) : (
                        <button onClick={handlePay} className="mt-4 w-full rounded-2xl bg-wandor-dark py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#333] active:scale-[0.98]">
                          Pay ₹{grandTotal.toLocaleString("en-IN")} securely
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile bottom indicator */}
      {panelOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-wandor-text/8 bg-white/95 backdrop-blur px-5 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-wandor-text">
              {panel.startsWith("browsing") ? "Select an option above" : panel === "confirmed" ? "Booking confirmed!" : panel === "payment" ? (paid ? "Payment successful" : "Review your payment") : "Fill in the form"}
            </span>
            <button onClick={closePanel} className="rounded-full bg-wandor-text/10 p-1.5"><X className="h-4 w-4 text-wandor-muted" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable booking form ─── */

function BookingFormWidget({
  form, setForm, label, max, onSubmit, submitLabel,
}: {
  form: BookingForm;
  setForm: React.Dispatch<React.SetStateAction<BookingForm>>;
  label: string;
  max: number;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const ready = form.name.trim() && form.yearOfBirth.trim() && form.time.trim();
  return (
    <div className="space-y-3.5 rounded-2xl border border-wandor-text/8 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div>
        <label className="mb-1 block text-xs font-medium text-wandor-muted">Full Name</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter your full name" className="w-full rounded-xl border border-wandor-text/10 bg-[#fafaf8] px-3.5 py-2.5 text-sm text-wandor-text outline-none transition-colors focus:border-wandor-prompt" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-wandor-muted">Year of Birth</label>
          <input type="text" value={form.yearOfBirth} onChange={(e) => setForm({ ...form, yearOfBirth: e.target.value })} placeholder="e.g. 1995" className="w-full rounded-xl border border-wandor-text/10 bg-[#fafaf8] px-3.5 py-2.5 text-sm text-wandor-text outline-none transition-colors focus:border-wandor-prompt" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-wandor-muted">{label}</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setForm({ ...form, persons: Math.max(1, form.persons - 1) })} className="flex h-9 w-9 items-center justify-center rounded-xl border border-wandor-text/10 bg-[#fafaf8] text-lg font-medium text-wandor-text hover:bg-wandor-text/5 transition-colors">−</button>
            <span className="w-8 text-center text-sm font-semibold text-wandor-text">{form.persons}</span>
            <button onClick={() => setForm({ ...form, persons: Math.min(max, form.persons + 1) })} className="flex h-9 w-9 items-center justify-center rounded-xl border border-wandor-text/10 bg-[#fafaf8] text-lg font-medium text-wandor-text hover:bg-wandor-text/5 transition-colors">+</button>
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-wandor-muted">Time</label>
        <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full rounded-xl border border-wandor-text/10 bg-[#fafaf8] px-3.5 py-2.5 text-sm text-wandor-text outline-none transition-colors focus:border-wandor-prompt" />
      </div>
      <button onClick={onSubmit} disabled={!ready} className={cn("mt-1 w-full rounded-2xl border-none py-3 text-sm font-semibold text-white transition-all active:scale-[0.98]", ready ? "bg-wandor-dark hover:bg-[#333] cursor-pointer" : "bg-wandor-text/20 cursor-not-allowed")}>
        {submitLabel}
      </button>
    </div>
  );
}
