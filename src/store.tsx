import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { EVENTS, OPTIONS, type EventItem, type GLevel, type Option } from "./data/mock";

export interface Intent {
  origin: string;
  destination: string;
  arrival: string;
  passengers: number;
  mode: string;
  constraints: string[];
}

export type JourneyPhase = "on-track" | "disrupted" | "adjusted";

export type OperatingMode = "NORMAL" | "DEGRADED" | "EMERGENCY" | "PLATFORM-DEGRADED";

interface StoreState {
  event: EventItem;
  intent: Intent;
  option: Option;
  commitmentLevel: GLevel;
  mode: OperatingMode;
  journeyPhase: JourneyPhase;
  serviceVerified: boolean;
  alternativeEta: string;
  setEvent: (e: EventItem) => void;
  setIntent: (i: Intent) => void;
  setOption: (o: Option) => void;
  setCommitmentLevel: (g: GLevel) => void;
  setMode: (m: OperatingMode) => void;
  setJourneyPhase: (p: JourneyPhase) => void;
  setServiceVerified: (v: boolean) => void;
  setAlternativeEta: (e: string) => void;
}

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<EventItem>(EVENTS[0]);
  const [intent, setIntent] = useState<Intent>({
    origin: "Andheri West",
    destination: "DY Patil Stadium",
    arrival: "7:00 PM",
    passengers: 1,
    mode: "Fastest + Affordable",
    constraints: ["Avoid heavy traffic"],
  });
  const [option, setOption] = useState<Option>(OPTIONS[0]);
  const [commitmentLevel, setCommitmentLevel] = useState<GLevel>("G5");
  const [mode, setMode] = useState<OperatingMode>("NORMAL");
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>("on-track");
  const [serviceVerified, setServiceVerified] = useState(false);
  const [alternativeEta, setAlternativeEta] = useState("6:58 PM");

  const value = useMemo<StoreState>(
    () => ({
      event,
      intent,
      option,
      commitmentLevel,
      mode,
      journeyPhase,
      serviceVerified,
      alternativeEta,
      setEvent,
      setIntent,
      setOption,
      setCommitmentLevel,
      setMode,
      setJourneyPhase,
      setServiceVerified,
      setAlternativeEta,
    }),
    [event, intent, option, commitmentLevel, mode, journeyPhase, serviceVerified, alternativeEta]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
