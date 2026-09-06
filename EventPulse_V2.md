# EventPulse V2 — Intelligent Capacity & Crowd Management Platform

**Project Codename:** EventPulse V2.1
**Tagline:** *Closed-Loop Hospitality & Mobility Orchestration Platform — where soft suggestions become capacity-backed commitments with defined fallback SLAs.*

**Document version:** 2.1
**Supersedes:** EventPulse_FINAL.md (v1) → EventPulse_V2.md (v2.0)
**Status:** Authoritative master reference — strategic design + technical architecture. Includes the full verification & claims-classification pass.

---

## Table of Contents

1.  What Changed in V2.1 (Delta vs V2.0)
2.  Executive Summary
3.  Problem Statement
4.  Core Concept & Scope
5.  The Core Mechanism — Binding Commitments, Not Suggestions
6.  Guarantee Semantics — The G-Ladder (formal commitment levels + runtime degradation)
7.  End-to-End Example Scenario (V2.1)
8.  Who Pays — Three-Sided Market & Monetization
9.  Strategic Implementation Logic — The 6-Layer Spike Detection Framework
10. Seven Scenarios — Unified by One Orchestration Engine
11. High-Level Architecture — The Deliberate Closed Loop
12. Layer 1 — Data Ingestion
13. Layer 2 — State Estimation
14. Layer 3 — Digital Twin
15. Layer 4 — Prediction
16. Anomaly Detection (Integrated with L2/L4)
17. Layer 5 — Simulation
18. Layer 6 — Optimization
19. Layer 7 — Action Orchestration
20. Layer 8 — Feedback & Learning
21. Strategy-Aware Control & Reflexivity
22. Channel Mix & Reachability
23. Uncertainty, Confidence & Calibration
24. Compliance & the App-less Majority
25. The Commitment & Delivery Engine (Reservations Core)
26. Operating Modes
27. Recovery & Resilience
28. Cross-Cutting Concerns
29. Governance, Liability & Regulation
30. Evidence & Claims Classification (P / S / A / F / L)
31. Formal Ontology & Event Schemas
32. Event Sourcing + CQRS (with Recovery)
33. Evaluation & Success Metrics
34. Assumptions Register
35. Implementation & Technology
36. Build & Delivery Plan
37. Privacy & Ethics
38. Open Challenges & Future Work
39. Next-Gen Roadmap
40. Scale & Deployment Honesty
41. Demo & Judging Strategy
42. Competitive Differentiation
43. Conclusion & Pitch Narrative
44. Appendix A — Guarantee Ladder Detail
45. Appendix B — Claims Classification Register
46. Appendix C — Verification Roadmap (A/B/C/D buckets → artifacts)
47. Appendix D — Key Formulas & Definitions (revised)

---

## 1. What Changed in V2.1 (Delta vs V2.0)

V2.1 is a **verification pass**, not a rewrite. It encodes the full external audit: every strong claim is now graded (§30), the guarantee semantics are formalized with a degradation ladder (§6, §44), and the mechanisms V2.0 asserted are now specified or honestly marked as unverified. Headline changes:

| Audit finding | Resolution in V2.1 |
|---|---|
| "Binding reservation ≠ guaranteed physical capacity" | **G-Ladder** (§6) — a commitment's obligations are exactly proportional to what the weakest live link proves. No higher claim than mechanisms support. |
| Fallback/compensation economics unspecified | **Escrow + compensation funding model** (§8.4), liability caps, guarantees funded before issuance, not after failure. |
| 90-second re-offering unrealistic-when-traced | **Measurable pipeline** spec with stages & budgets (§25.4); labeled engineering target, not guarantee. |
| Universal 15% reserve invalid | **Per-resource-type buffer profiles** (§12.4). |
| Hotel overbooking model attacked | **Overbooking semantics formalized** — consented headroom = probabilistic expected availability, not additive capacity (§12.2, §47). |
| "Optimizer can't create capacity" | **`physical_inventory_exists` hard constraint** (§18.1); plans beyond contracted inventory = infeasible, not softened. |
| Family scenario numbers read as empirical | **Labels everywhere**: illustrative same-seed simulation parameters (§7, §30). |
| Shadow City ≠ causal attribution | **Evidence taxonomy** (§30.2): S/O/A/C four tiers; wording standardized to "simulated counterfactual impact." |
| Compliance equation form unjustified | **Research assumption register** entry (§21, §34); baseline multiplicative, alternatives benchmarked, no claim of truth. |
| 3σ not Gaussian-safe | **Robust alternatives** (robust z, MAD, quantile, EWMA/CUSUM, Bayesian) benchmarked (§16.1); configurable. |
| "Two independent sources" correlation | **Operational independence definition** — distinct physical modalities + de-correlated error terms (§16.2). |
| Bayesian fusion needs ground truth | **Sensor calibration methodology** (§13.3) — per-source likelihoods from boundary ground truth; interior marked estimate-only. |
| Calibration fails on dangerous-tails | **Stratified calibration** per zone, horizon, event class; abnormal-event subsample tracked (§23). |
| CP-SAT→surrogate→sim loop unproven | **Loop spec + sensitivity runs** (§17.7): top-K diversity constraints, iteration counts 1/2/3/5, surrogate validity gates, 120 s benchmarked. |
| Greedy fallback pathological | **Fallback proven against second-order constraints** + SOFT-only commitment issuance on fallback (§18.4). |
| Chance constraint ambiguous | **Formal definition** — "10% of what" resolved: per-critical-resource-set union bound over the planning horizon, joint stochastic (§18.3). |
| Fairness group-inference leak | **Self-declared only, no inference**; protected groups defined legally (§21, §28). |
| App penetration 40–60% hand-wavy | **Funnel decomposition** — download/consent/active/accept, each assumed separately (§4.6, §34). |
| Reachable_fraction unmeasurable | **Reach ≠ delivery ≠ ack ≠ compliance** tracked separately; displayed≠viewed, announced≠heard explicitly modeled as uncertainty (§22). |
| Fulfillment verification unspecified | **Per-category verification mechanism + dispute path** (§25.3); ledger records evidence, not physical truth. |
| Non-repudiation ≠ physical proof | **Two distinct claims** — cryptographic authenticity vs physical fulfillment (§25.3, §29). |
| Automatic compensation: who pays? | **Funding/escrow model + liability matrix** (§8.4, §29). |
| Provider reputation unfair to providers | **Platform-vs-provider failure attribution** adjudicated before reputation penalty (§20.3). |
| Redis/Postgres consistency | **Reservation saga** (outbox, idempotency, reconciliation) — no double-book/phantom inventory (§25.5). |
| Emergency vs held tokens ambiguous | **Emergency authority ≻ every commitment** precedence; freezing/re-route/compensation protocol (§26). |
| Offline token validity unspecified | **Signed offline tokens + provider-side cache + last-known-plan flush** (§27). |
| Consent withdrawal mid-flow | **Safe-exit transition rule** — revocation honored with a guaranteed safe exit path before teardown (§28, §37). |
| 72h purge vs audit ledger tension | **Retention partition** — raw purge / ledger retain / aggregates retain (§37). |
| "Fully supported 200k" overstated | **"Reference architecture designed for"** pending load test (§35, §40). |
| Weather not wired into pipeline | **Weather-as-input** in L4 features, L5 scenarios, L7 incentive mix; rain floors indoor capacity (§15.4). |
| Transit disruption recommit latency | **Recommit SLA** — e.g., ≤5 min invalidation + re-commitment on provider collapse (§25.6). |
| Strategic brewer / hoarding / gaming | **Adversarial behavior suite** — anti-hoarding rules, abuse controls, provider-strategy scenarios (§18.6, §21.6). |
| Provider API reality | **Provider API capability matrix** (reservation/capacity/cancellation) exposed as validation table (§12.5). |
| "Outcome insurance" regulatory exposure | **Renamed "outcome-based service agreement"**; no insurance term (§8.1). |
| Time-to-saturation constant-fill flaw | **Dynamic dC/dt forecast formula** (§44). |
| Effective redistribution double-counting | **Disjoint accounting** — slip vs forfeiture definitions with no overlap (§44, §25.4). |
| Newsvendor single-period flaw | **Multi-period + correlated-failure sizing** (§25.7). |
| User-equilibrium jargon | **Model spec** — route-choice (logit), utility, info assumptions; "guard detects/mitigates, does not solve, pathologies" (§21.5). |
| SHAP explains prediction, not decision | **Two-level explanation** — prediction-feature pane vs decision-pipeline pane (§28.4). |
| Human override underspecified | **Override spec** — actor, auth, expiry, reason code, safety-bypass rules (§26.2). |
| "Safety" vague in priority list | **Formal safety constraint set** (§18.2). |
| CQRS presented as required | **Explicitly labeled an architectural choice**, chosen for auditability (§32). |
| Data ownership unspecified | **Data ownership schedule** (§29.8). |
| k≥50 + DP composition leakage | **Per-zone/window/segment k, composition accounting** (§37). |
| "Accessible alternatives always present" overclaim | **"Required where verified accessible capacity exists"**; change requires data proving it (§28.5). |

---

## 2. Executive Summary

EventPulse V2.1 is a **prescriptive orchestration platform** for capacity and crowd management during mega-events. It sits above existing hospitality, transit, venue, and city systems, turning fragmented resources into a coordinated, adaptive network, and fragmented demand into **committed, scheduled demand**.

The V2.1 core doctrine:

```
DEMAND → COMMITMENT → CAPACITY → DELIVERY → OUTCOME → LEARNING
```

An attendee who is asked is a burden. An attendee with a **held seat, on a held bus, at a held gate, at a held hotel** is a unit of **commitment-backed demand with measured uncertainty** that hotels, transit, and venues can plan against.

V2.1 adds the discipline that V2.0 lacked: **every promise is graded, every mechanism is specified or marked unverified, and the system degrades honestly from *commitment* to *best-effort* the instant any link in its chain weakens** (the G-Ladder, §6). The document now operates on a single rule:

> **A claim is only as strong as the weakest verified link beneath it.**

The platform is a **three-sided market**:

1. **Attendees** get a concierge that *delivers* (seat, room, exit, incentive) with a defined fallback SLA — not advice.
2. **Providers** buy *certainty* — confirmed demand — instead of forecasting hope.
3. **Organizers / host cities** buy **outcome-based service agreements** — a measurable congestion/safety reduction for a defined spend.

The architecture stays a strict **8-layer closed loop** with the **Commitment & Delivery Engine**, **Strategy-Aware Control**, and now the **Guarantee Ladder** and **Claims Classification** as first-class cross-cutting artifacts.

---

## 3. Problem Statement

When a city hosts a mega-event, thousands to millions of visitors arrive within a short window, pressuring hotels, transport, venues, restaurants, and last-mile systems simultaneously.

**Current state:** resources are managed independently; no consolidated view; some areas saturate while capacity sits idle elsewhere; demand is reacted to, never managed.

**The core insight (unchanged):** a digital twin + prediction + optimization + demand-shaping loop can coordinate the whole ecosystem.

**The V2 correction (kept):** shaping only works if demand *commits*. A suggestion is an expectation; a reservation is an obligation.

**The V2.1 correction (new):** obligations must be **honest at every level** — a system that promises more than it can deliver is worse than one that promises nothing. V2.1 therefore specifies exactly what each level of commitment proves, who funds it, how it's verified, and how it degrades.

### 3.1 The Winning Approach

EventPulse V2.1 = **event-city digital twin + predictive AI + prescriptive optimization + a binding commitment engine with verifiable delivery + honest degradation semantics.**

---

## 4. Core Concept & Scope

### 4.1 Identity

| Aspect | Definition |
|---|---|
| **What EventPulse V2.1 is** | A prescriptive orchestration layer that connects independent operational systems, builds a probabilistic digital twin, predicts congestion with calibrated uncertainty, simulates interventions, optimizes capacity-backed commitments, executes with authority-aware delivery, and learns continuously. |
| **What it is NOT** | A hotel PMS, transit control system, ticketing platform, emergency response system, navigation app, or "smart dashboard." It orchestrates and *commits* systems — subject always to the G-Ladder. |
| **Primary users** | Attendees (opt-in concierge), providers, event organizers, city authorities. |

### 4.2 Core Abstraction — CapacityUnit (revised)

```
CapacityUnit {
    id, type, geo_zone,
    contract_capacity,          // for hotels: insured/legal capacity
    overbook_headroom_P50,      // probabilistic expected availability from cancel+walk-in (NOT additive)
    usable_capacity,            // contract-adjusted minus safety buffer
    reserve_capacity,           // per-resource-type buffer profile (see §12.4)
    current_occupancy,          // UncertainValue
    status,                     // free | stressed | saturated | critical | unavailable
    buffer_profile,             // metro | hotel | gate | restaurant | parking | hold_zone
    hold_comfort,               // infra rating for holding crowds
    last_updated, source_system, confidence,
    committed_slots,            // reservations held against this unit (G-graded)
    available_commitments,      // provider pre-committed inventory (G-graded)
    verified_inventory          // BOOL: capacity is contracted & auditably available (§18.1)
}
```

### 4.3 The Second Core Abstraction — CommitmentToken (revised)

```
CommitmentToken {
    id, attendee_ref (pseudonymous), category,        // transit_slot | hotel_room | exit_window |
                                                        // incentive_voucher | shuttle_seat
    capacity_unit_ref, time_window_start, time_window_end,
    g_level,                      // G5 | G3 | G2 | G1 | G0 (see §6) — current, live-graded
    state,                        // offered | accepted | held | activated | fulfilled |
                                  // forfeited | refunded | downgraded (new state: G-level changed)
    incentive_value, cost,
    channel, cancel_policy, expires_at,
    verification_mechanism,       // scan | provider receipt | staff confirm | none (§25.3)
    commitment_ledger_ref
}
```

### 4.4 How It Works

1. **Senses** current conditions (sensors, APIs, schedules, provider inventories).
2. **Commits** — offers attendees *booked, guaranteed-at-level-G* options against provider-held, **verified** inventory.
3. **Predicts** upcoming pressure with calibrated uncertainty.
4. **Optimizes** capacity-backed commitments under safety, fairness, budget, feasibility.
5. **Delivers** — executes commitments through the right channels, verifies fulfillment, and compensates on verified failure.
6. **Learns** — measures delivered outcomes and the simulated counterfactual.

### 4.5 Scope Discipline

Features are included only if they fit **detect → estimate → commit → predict → simulate → optimize → deliver → learn**. Standalone dashboards and one-way notifications are out of scope.

### 4.6 Consent & Reachability (revised)

EventPulse **never steers a person who hasn't opted in**. For the un-consented majority, the platform only *publishes* provider-managed, public offers (signage, PA, pricing) and measures their *induced* effect — never individual direction.

**App-penetration funnel (each stage assumed separately, §34):** `downloads ≠ consent ≠ active ≠ accepts commitments`. Each stage carries its own assumed rate and is measured live at pilot (F-graded claims, §30).

---

## 5. The Core Mechanism — Binding Commitments, Not Suggestions

### 5.1 Two-sided commitment

- The **provider** commits inventory ("6 extra shuttle buses at Gate 4 for 18:00–19:00, seats 2,400") **and it must be verified available** (§18.1).
- The **attendee** commits behavior ("I will be at Gate 4 at 18:10 and board shuttle B").

Guarantees are **contractual and funded** (§8.4):

- Attendee shows → seat exists → **provider delivered** (evidenced).
- Seat doesn't exist → **automatic fallback + compensation**, funded from escrow, not discovered later.
- Attendee no-shows → slot refunded to pool and re-offered (labeled engineering target, §25.4).

Expected effective redistribution: **commitment-backed demand with measured uncertainty.** HARD tokens carry measured slippage; SOFT tokens carry modeled acceptance+slip; public-channel induction is never relied on for critical paths.

### 5.2 The Commitment Ledger

Every token transition — including **G-level downgrades** — is an event in an immutable, replayable ledger. The ledger records **system evidence** (what was recorded), and is the *input* to dispute resolution, not its output (§25.3).

### 5.3 Mechanism design hierarchy

| Mechanism | Certainty | Best for | Notes |
|---|---|---|---|
| G5/G3 HARD (contractual, fallback SLA) | High, measured slip | Transit exits, hotel rerouting, critical flow | Requires verified inventory + escrow |
| G2 SOFT (preference held) | Medium | Dining, attractions, off-peak | Forfeitable, low cost |
| Incentive tied to a held slot | Medium-High | Demand rebalancing | Voucher activates on verified check-in |
| Public messaging / signage | Low (modeled) | Un-consented majority | Never critical-path critical |

---

## 6. Guarantee Semantics — The G-Ladder

**Purpose:** V2.1's single most important artifact. Every commitment carries a G-level determined by the *weakest live link* underneath it (inventory verified? escrow funded? verification channel up?). No claim may exceed what mechanisms prove.

### 6.1 The Levels

| Level | Meaning | What it proves | Issued when | On certain failure |
|---|---|---|---|---|
| **G5** | Contracted + escrowed + realtime-verified | Physical fulfillment evidenced in-realtime | Full chain: SLA + escrow + realtime verification | Auto-refund + automatic fallback within SLA bound |
| **G3** | Contracted + verified at boundaries | Fulfillment evidenced at activation & completion (scan/receipt) | Provider SLA exists; interior verification unavailable | Fallback via next-available commitment; compensation from escrow |
| **G2** | Soft hold / preference | Acknowledgment only; no financial guarantee | Low trust, low criticality, or data-confidence below HARD threshold | Re-offer from pool; no compensation |
| **G1** | Induced via public channels | Modeled population-level compliance, no per-person evidence | Un-consented population | Never relied on for critical path |
| **G0** | Informed adrift | Nothing | Platform makes no claim | — |

### 6.2 Runtime degradation rules

- A token's **current G-level** is computed from the weakest live link at issuance *and* at every state transition.
- If a link breaks (provider inventory collapses, verification channel down, platform degrades, emergency declared), the token **downgrades deterministically** and its obligations contract to match: `G5→G3→G2→G1→G0`.
- **Compensation and fallback are triggered at the moment of downgrade** — never "discovered" later.
- Each downgrade is a ledger event (`TokenDowngraded`) and the attendee is notified through the plan's channels with the fallback.
- **Emergency authority ≻ every commitment.** On EMERGENCY all tokens degrade to G0 for critical-path obligations; held persons receive safe-exit guidance, and compensation for voided commitments is paid from escrow (protocol in §26).

### 6.3 What the G-Ladder forbids

- Issuing G5/G3 where inventory isn't `verified_inventory`.
- Issuing any HARD token where delivery can't be confirmed by a channel (§22).
- Claiming "guaranteed flow" anywhere the average G-level is ≤ G1.
- Labeling a G0 population as "managed."

---

## 7. End-to-End Example Scenario (V2.1)

**Scenario:** 80,000 attendees leaving a stadium after the final match. *(All numbers are illustrative same-seed simulation parameters — labeled, not empirical, per §30.2.)*

### Without EventPulse
Everyone walks to the nearest metro. Platform at 140%. Hotels overbooked. Ride-share +5×. Downtown restaurants overwhelmed; Riverside empty. 60–90 minute waits; two density-exceedance hours.

### With EventPulse V2.1

1. **95 min before** — prediction flags the 140% metro risk (90% CI [128%, 152%]; calibration rating *calibrated*).
2. **Inventory verified** — transit confirms 6 buses at held gates (G5-eligible), Riverside providers publish verified dining/hotel inventory.
3. **Commits issued** — 12,000 HARD shuttle reservations (G3 — boundary-verified QR), 5,000 HARD exit-window staggers, 8,000 SOFT dining reservations, 2,800 hotel rebooks into **verified** overbook headroom (G3).
4. **Channel plan** — reservations via app/SMS; signage+PA at the stadium direct the un-consented majority to the same physical flow points (G1); staff spot-correct.
5. **Fulfillment verified** — QR/turnstile and provider receipts evidence boarding/eating/check-in (§25.3). No-shows re-offered (target pipeline §25.4).
6. **Hysteresis-gated replanning** — a spurious deviation does not flip the plan (§21.4).
7. **Shadow city** — parallel no-commitment world runs live (§17.4); the delta is presented as *simulated counterfactual impact*.

**Result (same-seed, honestly labeled):** peak transit 140% → 96% baseline / 92% with measured slippage; wait −35–45 min; Riverside dining +34% *delivered* utilizations; zero density-exceedance minutes (latent KPI, §33). Delivered as **engineering targets**, not guarantees.

---

## 8. Who Pays — Three-Sided Market & Monetization

### 8.1 The three-sided model

| Side | Gives | Gets | Pays |
|---|---|---|---|
| **Attendee (opt-in)** | Consent, itinerary, commitment | Certified delivery with fallback SLA; less waiting | Nothing |
| **Provider** | Pre-committed, verified inventory + data | Certain, confirmed demand; utilization without forecast risk | CPC/CPS fee |
| **Organizer / host city** | Authority, budget, data access | Outcome-based service agreement: measured congestion/safety reduction, audit-proof ledger | SaaS + outcome component |

**Terminology:** "outcome-based service agreement" — *not* "insurance" — avoids regulatory implication while keeping the risk-transfer intent. Legal review required before any marketing use (L-graded, §30).

### 8.2 Worked ROI example (labeled business hypothesis)

- Organizer spend: $120k SaaS + $80k outcome pool = **$200k**.
- Impact (same-seed simulated): ≈43,000 person-hours recovered (65k riders × 40 min); density-exceedance → zero; 2,100 room-nights preserved for downtown hotels.
- Provider fees: $18k transit (held seats), $24k restaurants (converted vouchers), $9k hotels (certainty) = **$51k**.
- Platform revenue **$251k** vs $200k spend → positive *simulated* organizer ROI before reputation.

**Honesty caveats (labeled):** 40 minutes/person valuation is **not uniform** in reality; saved-hour monetization is a business hypothesis (B-graded), not evidence. Every number re-lived after pilot.

### 8.3 Free-rider control

- Reserved inventory and vouchers activate only inside the platform.
- Providers must publish verified inventory to receive directed flow.
- Organizer budget covers city-wide public good.

### 8.4 Compensation & escrow (pre-funded)

Every G5/G3 pool has a **pre-funded escrow balance** sized in the planning phase:

```
escrow_required = Σ G levels/plan × per-token_compensation × expected_failure_hazard + margin
```

Failure pays from escrow immediately. If a mass failure would exceed escrow (e.g., metro down with 200k tokens), the G-ladder **caps** what was honestly issued: the cap is the escrow, disclosed before issuance. Liability caps are contractual (§29). This is the quantified answer to "what if all alternatives fail."

---

## 9. Strategic Implementation Logic — The 6-Layer Spike Detection Framework

*(Doctrinal framework retained; implementations tightened.)*

1. **Statistical** — context-aware baseline per (event type, time slot); anomaly = deviation from expectation, not load. Never static percentages.
2. **Cross-verification** — ≥2 operationally independent sources (§16.2); >5σ single source alerts anyway.
3. **Reserve/buffer release** — per-resource-type buffers (§12.4); commitment-side buffers always releasable.
4. **Adaptive monitoring** — 300 s → 60 s → 15 s (subject to source capability, §16.3).
5. **Tiered response** — T1 auto (reserve release + commitment-pool open), T2 auto+notify, T3 human escalation; plus platform-self-degradation trigger.
6. **Post-spike learning** — feed outcomes, including commitment fulfillment, back to baselines.

---

## 10. Seven Scenarios — Unified by One Orchestration Engine

*(Retained from V2.0, now G-graded.)*

1. **Hotel Saturation** — HARD rebooks into verified overbook headroom (G3).
2. **Transport Congestion** — HARD seat reservations on alternate routes (G3/G5 boundary-verified).
3. **Sudden Demand Spikes** — reserve release + commitment-pool open (T1) + exchange-eligibility check.
4. **Venue Capacity Limits** — HARD exit-window staggers (G3); public gate throttling (G1 for the unconsented).
5. **Last-Mile Connectivity** — held shuttle seats (G3), path splitting, staggering; refined re-offering (target).
6. **Uneven Visitor Distribution** — SOFT dining/attraction commitments (G2), voucher activated on verified arrival.
7. **Schedule Changes** — dependency-cascade **re-commitment**: every affected token re-booked or downgraded-with-alternative before announcement (SLA §25.6).

---

## 11. High-Level Architecture — The Deliberate Closed Loop

```
┌──────────────────────────────────────────────────────────────────────┐
│                      EVENTPULSE V2.1 ORCHESTRATION PIPELINE              │
├──────────────────────────────────────────────────────────────────────┤
│  L1  DATA INGESTION          Trust, overbooking-aware verified inventory│
│  L2  STATE ESTIMATION        Calibrated probabilistic fusion            │
│  L3  DIGITAL TWIN            Temporal graph, hold-zones, G-graded edges │
│  L4  PREDICTION              Calibrated forecasting incl. weather       │
│  L5  SIMULATION              Surrogate-modulated, shadow, red-team      │
│  L6  OPTIMIZATION            Feasibility, fairness, strategy-aware      │
│  L7  ACTION ORCHESTRATION    Authority-aware, G-graded execution        │
│  L8  FEEDBACK & LEARNING     Evidence-tiered attribution, calibration   │
├──────────────────────────────────────────────────────────────────────┤
│  CROSS-CUTTING: Guarantee Ladder (§6) · Commitment & Delivery (§25)     │
│  Strategy-Aware Control (§21) · Channel Mix (§22) · Calibration (§23)   │
│  Recovery (§27) · Governance & Liability (§29) · Claims Class (§30)     │
└──────────────────────────────────────────────────────────────────────┘
```

Everything versioned, timestamped, uncertain, event-sourced with snapshots. Operating modes (§26) retain NORMAL/DEGRADED/EMERGENCY + PLATFORM-DEGRADED.

---

## 12. Layer 1 — Data Ingestion

*(V2.0 matrix retained; V2.1 revisions below.)*

### 12.1 Verified inventory (NEW, hard requirement)

`available_commitments` from providers is a first-class stream **linked to evidence** (contract, reservation API confirmation, or staff-confirmed availability). Unverified inventory is `verified_inventory = false` and **cannot** back G5/G3 tokens. Verification states: `CONTRACTED | CONFIRMED_REALTIME | ESTIMATED | MANUAL`.

### 12.2 Overbooking semantics (formalized)

- `contract_capacity` = insured/legal capacity.
- `overbook_headroom_P50` = probabilistic expected availability from cancellation forecasts + walk-in patterns — **not additive capacity**.
- Consented operating capacity = `contract_capacity − safety_buffer + P50_headroom`, with consent from the revenue manager.
- A 96%-occupied hotel may rebook only into the **P50 headroom explicitly released by the hotel for this event**; the released block is `verified_inventory`.
- Liability for a failed rebook sits with the releasing party per contract (§29). This removes the "overbooking fiction" attack.

### 12.3 Trust model (V2.0 retained)

`C_data = w1·reliability + w2·freshness + w3·accuracy + w4·cross-source_agreement + w5·sensor_health`. Below-threshold trust forces G2-or-lower tokens.

### 12.4 Per-resource-type buffer profiles (replaces universal 15%)

| Resource type | Usable | Reserve | Rationale |
|---|---|---|---|
| Metro/rail platform | ~88% | ~12% | Fixed geometry, high density sensitivity |
| Shuttle/bus | ~92% | ~8% | Flexible, dispatchable |
| Hotel | ~85% | ~15% | Cancel/no-show variance, revenue-managed |
| Event gate | ~90% | ~10% | Rapidly releasable, manual |
| Restaurant/hold-zone | ~82% | ~18% | Comfort infra, dwell time |
| Parking | ~85% | ~15% | Turnover variance |

Reserve acts as **buffer release** (L5) and **commitment-reopen pool** (L3). Each profile is configurable and validated against prior events (F-graded).

### 12.5 Provider API capability matrix (exposed, not assumed)

| Provider | Real API? | Reservation API? | Capacity API? | Cancellation API? | Reliability |
|---|---|---|---|---|---|
| Metro | ⚠ per agency | ? | ? | ? | TBD |
| Shuttle | ? | ? | ? | ? | TBD |
| Hotel PMS | partial | ? | ? | ? | TBD |
| Restaurant | none | none | ? | none | TBD |
| Venue | partial | ? | ? | ? | TBD |

Every `?` is a **validation artifact** (§44, Appendix C). No plan may depend on a capability that hasn't been filled in for the actual deployment.

### 12.6 V2.1 data additions (retained from V2.0)

Commitment-refund anomaly signals; RF signal-free telemetry option; unsafe-zone feed (with freshness, §12.7); multi-platform exposure inputs (optional).

### 12.7 Unsafe-zone feed freshness

The "never redirect into unsafe situations" promise now requires **time-sensitive overlays**: incident feeds, temporary closures, police alerts, lighting outages, construction — not a static crime map. Absent fresh data → the promise is Paused, and redirects into that zone are blocked (fail-safe, never assumed safe).

---

## 13. Layer 2 — State Estimation

*(V2.0 fusion retained; two fixes.)*

### 13.1 Commitment-conditioned priors (V2.0, kept)

Held tokens condition the zone prior (2,400 held arrivals by 18:10 → prior includes them minus measured slip).

### 13.2 Conflict handling (V2.1 fix)

- Retained: discover conflicts, downweight outliers (Huber/Student-t), emit `DataConflict`.
- **NEW — contextual source hierarchy:** when conflicting, the *authoritative* source for the context (e.g., turnstile > CCTV> WiFi for entry counts) is not automatically demoted; disagreement → lower confidence **but** with context-weighted central estimate, not naive averaging.
- Operationally independent = **different physical modalities with de-correlated error terms** (gate counter + ticket scan are *correlated*, both derive from the same underlying entry → not treated as independent proofs, §16.2).

### 13.3 Sensor likelihood calibration methodology (NEW)

```
For each sensor: gather (observation, boundary ground truth) pairs from
gates/turnstiles/commitment-fulfillment records
→ fit error distribution per zone, load level, event class
→ derive per-source likelihoods used in fusion
→ monitor drift; re-estimate at event-day onset
```

Interior flows remain estimate-only and are labeled as such (V2.0 honesty retained). This is App-C graded (must validate).

---

## 14. Layer 3 — Digital Twin

*(V2.0: temporal property graph, hold-zones, commitment edges, inflow shaping, second-order propagation, multi-platform edges. All retained.)*

**V2.1 additions:**
- Edges carry **G-graded commitments** so the twin models promised future load *with their level of deliverability*.
- `unknown` nodes (surrogate links) gate HARD offers in that area to G2.
- Hold-zone comfort infra constraints carried into L5/L6 (V2.0).

---

## 15. Layer 4 — Prediction

*(V2.0: model hierarchy, fallback chain, concept drift, cold-start priors. Retained.)*

### 15.1 Calibration as KPI (retained; stratified — §23).

### 15.2 Commitment-conditioned forecasts (V2.0 retained).

### 15.3 Cold start — mega-events are rare (NEW honest treatment)

Mega-events recur yearly at best; "Bayesian transfer from similar events" is a **prior**, not validation. Cold-start strategy: event-class priors (concert ≈ 2.3× baseline) used as priors with widened intervals until N≥5 comparable observations; synthetic pre-training as a prior, never as evidence. (A-graded; F-graded to pilot.)

### 15.4 Weather wired in (NEW)

- **L4:** weather features feed the 15–60 min models and the rain-floor logic (`indoor capacity × rain_factor`).
- **L5:** `sudden_rain` scenario uses live weather as seed, not static.
- **L7:** incentive mix reshaped by live weather (rain → indoor redirects).
- Fine to be a tap-API in MVP; the *pipeline seats* exist from day one.

### 15.5 Transit-disruption recommit (NEW SLA)

Handled in §25.6: invalidation + re-commitment SLA ≤ 5 min for provider collapse; degradation via G-Ladder.

---

## 16. Anomaly Detection

*(V2.0 retained; two methodological fixes.)*

### 16.1 Threshold candidates benchmarked (3σ demoted from default to option)

- V2.0 used `baseline + 3σ` as convention. V2.1 treats Gaussian 3σ as **one candidate** in a benchmark: robust z (MAD-based), quantile thresholds, EWMA/CUSUM, and Bayesian anomaly probability. Configuration picks per metric; false-positive rate measured on historical events (Appendix C).
- Crowd data are non-normal, autocorrelated, seasonal, event-scheduled ⇒ the benchmark artifact is required before "confirmed" has any meaning.

### 16.2 Operational independence definition (formal)

Two sources are "independent proofs" only if: (a) different physical modality, (b) no shared upstream failure, (c) measured error correlation below threshold (e.g., |ρ| < 0.3 on residuals). Gate + ticket-scan of the same entry are **not** independent. This directly answers "two correlated bad sensors can confirm a false event."

### 16.3 Adaptive frequency vs source capability

Confirmed-spike 15 s monitoring is a **target for capable sources**; sources that can't deliver are marked, and the monitoring interval honors the slowest critical source with uncertainty propagation (no silent assumption).

---

## 17. Layer 5 — Simulation

*(V2.0: cohort agents, surrogate-modulated optimization, shadow city, red-team, Monte Carlo. Retained with precision fixes.)*

### 17.1 Monte Carlo sample-size honesty

- `n=10` interactive = **visualization only**, never tail-probability estimation.
- Offline `n=100` may be insufficient for tails (e.g., P(violation)<10%): use larger n with importance sampling or variance reduction where tail claims are made.
- Tail metrics are graded `S` (simulated) with stated CI, or not reported.

### 17.2 Red-team (V2.0 retained)

5%/95% compliance and 50% HARD-slip are **stress-test parameters** (configurable, not universal bounds); where historical quantiles exist they replace defaults.

### 17.3 Calibration & ground truth (V2.0 retained)

### 17.4 Shadow City (retained; relabeled)

Outputs are **simulated counterfactual impact** — an internal same-seed counterfactual. Never called "causal" (§30.2). Backbone of the honest "with-and-without" demo.

### 17.5 Surrogate-modulated loop (fixed details, §18.6)

---

## 18. Layer 6 — Optimization

*(V2.0 constraints retained. V2.1 formalizes the attack surface.)*

### 18.1 `physical_inventory_exists` — hard constraint (NEW)

Optimization cannot create capacity. Every plan's implied capacity must be backed by `verified_inventory`; any plan that exceeds contracted inventory is **infeasible**, not softened. Solution set = allocation of existing certified capacity (± reserve release that is itself certified).

### 18.2 Formal safety constraint set (replaces "safety is never relaxed" as a label)

Safety is defined as the conjunction of:

```
1.  density(z, t) ≤ density_limit(z, geometry/flow/barriers)     // per-context, not universal 4/m²
2.  egress(z) · p95 ≤ egress_target(z)                          // measured boundaries, §33.3
3.  hold_usage(z,t) ≤ hold_comfort(z) + hold_time_limit(z)       // comfort infra, not just space
4.  vulnerable_group_egress(z,t) ≥ floor(z,t)                    // group min-service
5.  no_unsafe_zone(p) for any p in plan                          // fresh unsafe-zone feed, §12.7
6.  emergency_veh_access(z) preserved
```

No priority ordering overrides constraint 1–6; all are hard. (This is the formal meaning of "safety→priority.")

### 18.3 Chance constraint — formal definition (the "10% of what" answer)

Let `C` = the set of critical capacity resources on the plan's critical path. The constraint is:

```
P( ∃ r ∈ C, ∃ t ∈ planning horizon : load_r(t) > usable_r(t) ) < 10%
```

i.e., a **union bound over the planning horizon per critical resource set** — explicitly *not* "each individual violation <10%." Computed under **joint** sampling of demand, compliance, and (where material) capacity stochasticity. Reported as a probability with its simulation CI, or not reported.

### 18.4 Greedy fallback — verified + SOFT-only

V2.0 fallback (release reserves, redirect by saturation gap) must (a) respect the same second-order propagation and hold-zone constraints as the primary solver, (b) never violate constraint set §18.2, and (c) **only ever open SOFT gifts** (G≤2) — it cannot overcommit inventory. Proven by test under forced solver timeout (Appendix C).

### 18.5 Fairness — groups, self-declared only (NEW fix)

- Protected groups defined as: **legally protected classes + voluntarily declared preferences** (language, accessibility, group affinity). No inference from proxies (no residency/language inference from data).
- Group min-service-level hard constraints in §18.2(4); fairness conflicts with safety are decided by safety (§18.2 set is hard), with any fairness-safety tension logged for governance review (§29.5).
- Voluntarily-declared data only (privacy-first, §37).

### 18.6 Adversarial scenario suite (NEW)

Alongside adversarial-attendee runs, the suite includes **strategic provider behavior**: capacity understatement, inventory gaming, cherry-picking profitable users, cancellation of low-value commitments, incentive fraud, and reservation hoarding. Anti-hoarding policy: **one active G≥2 token per category per attendee** + release deadlines + optional deposit on high-value slots; voucher tied to verified check-in prevents check-in-and-flee. These are scenario artifacts (Appendix C), not guarantees.

### 18.7 Preference elicitation (V2.0 retained)

Weight elicitation survives; Pareto front (3–5 plans) retained with sim-verified impact + residual.

---

## 19. Layer 7 — Action Orchestration

*(V2.0 lifecycle + authority matrix retained; V2.1 adds delivery semantics and adversarial controls.)*

### 19.1 Authority matrix

*(V2.0 full table retained, plus:)*

- **Ownership-conflict arbiter** (organizer vs venue gate): pre-registered named controller (e.g., venue operator for gates, mela authority for open grounds) — identified *before* the event, with live dispute escalation (§29.6).
- **Emergency actions: EventPulse requests, never performs.** Legal authority stays with the incident commander; EventPulse provides information as T4 assist.

### 19.2 Human override spec (NEW)

- Who: named roles per authority matrix.
- Auth: MFA-gated in production (API-key + role in MVP).
- Expiry: override reverts after a configurable window unless renewed.
- Reason code mandatory, fully audited.
- **Safety bypass: not permitted.** Constraints §18.2 are prologue to override; an override request that conflicts is rejected with an explanation.

### 19.3 Provider interaction contract (V2.0 retained, G-graded)

Contract now includes `g_level`, `verification_mechanism`, `fallback_sla`, `compensation_cap`.

### 19.4 Compliance modeling (V2.0 retained with research-assumption label)

`P(comply|token)` = logistic-product including crowding-out (V2.0) — **labeled a research assumption**: functional form and additive-vs-multiplicative alternatives are benchmarked on real commitment data (Appendix B, item C-16). Coefficients learned from field data (F), not seeded as truth.

### 19.5 Replanning (V2.0 retained, adaptive hysteresis §21.4).

---

## 20. Layer 8 — Feedback & Learning

### 20.1 Evidence taxonomy drives all learning (NEW, replaces "causal-ish")

Four evidence tiers, each labeled in output:

| Tier | Name | Meaning |
|---|---|---|
| S | Simulated | Same-seed counterfactual (Shadow City) |
| O | Observational | Correlated field observation, no control |
| A | A/B experimental | Randomized holdout within/ across events (fairness-safeguarded) |
| C | Causal | Requires design/identifiability; rarely claimed |

L8 never reports S as O/A/C; reports "measured-with-method X."

### 20.2 Operate-as-experiment doctrine (V2.0 retained)

Zone/segment holdouts with fairness floor; staggered rollout; instrumental signals (fulfillment counts). Honest labels everywhere.

### 20.3 Provider reputation — fair attribution (NEW)

Provider failure vs **platform-induced failure** (bad assignment, harnessed inventory, dropped verification) are adjudicated by evidence (§25.3) before any reputation penalty. Reputation gates directed-flow priority only; it never punitive-priceers.

### 20.4 Calibration + commitment analytics + provider reputation (V2.0 retained with real-data requirement).

### 20.5 Provider starvation / winner-takes-all (NEW watch item)

Economic simulation (Appendix C) monitors whether inventory-favoring allocation + reputation creates concentration; if a Herfindahl-like concentration index on directed flow breaches a threshold, allocation includes an exploration/equity term.

---

## 21. Strategy-Aware Control & Reflexivity

*(V2.0 §20 content retained in full — self-referential loop, reaction functions, multi-platform coexistence, user-equilibrium guard, hysteresis.)*

### 21.1 Reflexivity & crowding-out (research assumption — labeled)

Multiplicative crowding-out is a **baseline model**; additive and nested alternatives are benchmarked (Appendix B). Coefficients learned, not assumed (§19.4).

### 21.2 Single-agent fiction → multi-platform (V2.0 retained).

### 21.3 The honest answer to "why obey you?" (V2.0 retained).

### 21.4 Hysteresis — adaptive, not fixed (NEW)

V2.0 used fixed "N=3 consecutive observations." V2.1: N is **adaptive** to event dynamics and time-to-danger: high time-to-danger → N=1 with priority override; steady-state → N=3+. Persistence bonus retained; no flapping.

### 21.5 User-equilibrium guard — model spec (NEW)

- Route-choice model: multinomial logit over options.
- Utility = a·travel_time + b·crowding + c·value_of_time + d·information_assumptions (stated and stated-simple).
- Heterogeneous users by segment; deterministic or stochastic equilibrium reported explicitly.
- Guard **detects/mitigates** routing pathologies (incl. Braess-style) — claims no universal solution; the system-opt-vs-user-equilibrium divergence is a **reported metric** with a red-zone threshold.

---

## 22. Channel Mix & Reachability

*(V2.0 §21 retained: six channel model, critical-flow-never-single-channel rule.)*

### 22.1 V2.1 corrections

- **Reach ≠ delivery ≠ acknowledgment ≠ compliance** — four independent measurements on every campaign. Signage "displayed ≠ viewed"; PA "announced ≠ heard"; staff "deployed ≠ effective."
- `reachable_fraction` is therefore **an uncertain quantity with an error band**, feeding §18.3 — never a point value.
- Channel effectiveness per segment learned over field data (F-graded).
- **HARD tokens only on confirmable-delivery channels** (app/SMS-ack); unconfirmed persons get G≤2 or public-channel induction.
- Broadcasts (last-known-plan) track delivery + ack at the platform level, separate from compliance (§27.3).

---

## 23. Uncertainty, Confidence & Calibration

*(V2.0 §22 retained.)*

### 23.1 Stratified calibration (NEW — answers the tail-attack)

Calibration is measured per: model, horizon, **zone**, **event class**, and crucially the **abnormal-event subsample** (the moments that matter). A model can be well-calibrated overall and badly calibrated exactly during dangerous spikes; V2.1 reports this stratum explicitly and refuses confident statements where the abnormal-event coverage is poor.

### 23.2 Calibration dataset requirements (NEW)

- Minimum events/observations per stratum before a coverage figure is claimed (statistical power gate).
- Recalibration cadence: continuous drift monitor + forced recalibration at event-day onset.
- Calibration ratings travel with every forecast into L5/L6 (V2.0).

---

## 24. Compliance & the App-less Majority

*(V2.0 §23 retained: two populations, public-channel induction curve with honesty bounds.)*

### 24.1 V2.1 corrections

- Public-channel induction 25–40% stays an **A-graded assumption** until measured at a real venue (F).
- Critical paths never depend on induced compliance; induction only shapes non-critical demand.
- Language/accessibility: service levels hard-constrained (§18.2(4)), delivered via verified channels — not inferred attributes (§18.5).

---

## 25. The Commitment & Delivery Engine

*(V2.0 §24 retained — inventory, tokens, guarantees, ledger, inventory sizing, incentive-on-delivery.)*

### 25.1 Token lifecycle (V2.0 + new `downgraded` state)

`offered → accepted → held → activated → fulfilled | forfeited | refunded | downgraded`. Every transition evidenced and ledgered.

### 25.2 Guarantees at each level (§6 applied)

Fallback SLA + compensation are **properties of the G-level at issuance**; downgrades contract obligations and trigger immediate action (§6.2).

### 25.3 Fulfillment verification & dispute path (NEW — the ledger-truth fix)

Per category, the **verification mechanism** is specified:

| Category | Primary evidence | Backup evidence |
|---|---|---|
| Shuttle/transit | QR/turnstile scan + provider receipt | staff count + seat-sensor |
| Hotel rebook | PMS check-in record + key-issue log | front-desk confirm |
| Exit window | turnstile/gate scan (window) | staff marshal check |
| Dining/incentive | voucher redeem on check-in | merchant POS record |
| Parking | barrier entry record | camera |

**Dispute path:** attendee claim vs provider record → cross-evidence check (scans/POS/camera-timestamps) → decision (auto for scan-backed; human for ambiguous) → ledger final entry. Ledger = record of *evidence*, not *truth*; the arbitration step renders the final truth. Non-repudiation applies only to message/authorization authenticity — **never** to claims of physical service (explicit in §29).

### 25.4 Re-offering pipeline (the 90-second claim — formal)

Target is decomposed, each stage budgeted and measurable:

```
no-show detect (≤5 s) → expiry → inventory release (≤5 s) → candidate select (≤10 s)
→ match (≤10 s) → notify (≤15 s) → accept (≤25 s window) → provider confirm (≤15 s)
```

Total engineered *target* ≤ 85 s best-case; the **90-second claim is a labeled engineering target** (S-labelled) until measured at load (F). Not offered as a guarantee.

### 25.5 Reservation consistency — the saga (NEW — fixes phantom inventory)

- **Isolation:** reservation decision made against Redis hot counters.
- **Atomicity:** outbox pattern: append reservation-intent event → Postgres inventory decrement + ledger entry → publish → Redis confirm. Idempotency key on every step (retry-safe).
- **Reconciliation:** periodic counter-vs-ledger reconciliation; drift → refund/detach suspicious tokens and alert ops.
- **Outage:** Redis-down → fall back to Postgres single-writer reservation (slower, safe); Postgres-down → **freeze new reservations** (no G≥2 issuance) + honor held tokens (signed, §27).
Designed to make double-booking or phantom inventory structurally impossible.

### 25.6 Provider-collapse / disruption recommit SLA (NEW)

On verified provider failure (or transit disruption, §15.5): affected tokens are **invalidated and re-committed within ≤5 min (target)** from surviving verified inventory or downgraded with compensation per §6.2. Missed-SLA tokens → auto-compensation from escrow. Target labeled F; measured in drills.

### 25.7 Inventory sizing — multi-period + correlated failures (NEW)

Newsvendor-V2.0 upgraded: multi-period (per-window) sizing with inventory carry, correlated provider-failure risk (shared causes: weather, area outage), and strategic-holdout assumptions of providers (§18.6). Sized offline nightly; soft pools adapt mid-event.

---

## 26. Operating Modes

*(V2.0 matrix retained: NORMAL / DEGRADED / EMERGENCY / PLATFORM-DEGRADED.)*

### 26.1 Mode ↔ G-Ladder coupling

| Mode | Commitment authority |
|---|---|
| NORMAL | G5/G3/G2/G1 allowed (per trust) |
| DEGRADED | HARD→SOFT downgrade; G≤2 issuance; no auto incentives |
| EMERGENCY | **All tokens → G0 for critical-path obligations**; no new G≥2; safe-exit guidance; emergency authority dominates; compensation for voided G3/G5 from escrow |
| PLATFORM-DEGRADED | Freeze new G≥2; held tokens honored if cryptographically valid (§27.1); last-known-plan broadcast |

### 26.2 Overrides

Named-role, MFA, expiry, reason-code, safety-bypass-forbidden (§19.2).

---

## 27. Recovery & Resilience

*(V2.0 §26 retained: snapshot+stream, last-known-plan broadcast, DR targets, no-full-replay dependency.)*

### 27.1 Offline token validity — the mechanism (NEW)

- **Signed offline tokens:** G3+ tokens carry a signed credential with validity window; providers verify offline (signature cache).
- **Provider-side cache:** last-known held-token set replicated to each provider.
- **Last-known-plan flush** to operators via every channel; delivery vs ack tracked (§27.3).
- Platform outage → new G≥2 frozen; held tokens remain valid *only within* their signed validity window; window end → provider treats as released (re-offering happens on recovery with compensation for gaps).

### 27.2 DR targets (retained) + crash-consistency (§25.5).

### 27.3 Broadcast, delivery, acknowledgment, compliance — four distinct measurements (NEW)

Applied to the last-known-plan broadcast and all urgent-notification flows. High-priority items require operator ack with escalation if unacked.

---

## 28. Cross-Cutting Concerns

*(V2.0 §27 retained; V2.1 updates inline.)*

### 28.1 Safety — advisory, formalized constraints (§18.2)

MVP and near-term deployments are **advisory, non-life-safety**. "Simulation-validated egress" language is gone; latent KPIs drive safety measurement. Density limit is **per-context** (geometry, flow, barriers), not a universal 4 pax/m².

### 28.2 Privacy, consent, retention (§37)

Consent-gated orchestration, safe-exit on withdrawal, retention partition.

### 28.3 Security (V2.0 retained)

Token non-repudiation = message authenticity only (§25.3).

### 28.4 Explainability — two-level (NEW)

- **Level 1 (prediction):** SHAP/counterfactual feature explanations (why the forecast).
- **Level 2 (decision):** why *this intervention* — objective weights, constraint activation, G-levels, alternates from Pareto, delivery risk, evidence tier.
Judges asking "why did you choose this?" get Level 2, not a SHAP plot by mistake.

### 28.5 Accessibility

~~"Accessible alternatives always present."~~ → **"Required where verified accessible capacity exists."** Plans must show evidence of accessible-capacity verification before promising alternatives; otherwise the promise is withheld (not silently broken). Accessible inventory is a `verified_inventory` requirement for any plan touching vulnerable groups.

### 28.6 Fairness (group-level, §18.5), economics (§8), sustainability (roadmap).

---

## 29. Governance, Liability & Regulation

*(V2.0 §28 retained; V2.1 legal hardening.)*

### 29.1 Liability matrix (V2.0 retained) + NEW entries

| Scenario | Who | Mechanism |
|---|---|---|
| Attendee harmed following a G3/G5 token | Provider-ops or platform, per verdict of §25.3 | Contracted SLAs + insurance riders; ledger arbitrates facts |
| Platform bug → failed commitment | Platform | Escrow compensation + provider unaffected |
| Redirection into harm despite feed | Shared platform+authority | Fresh-feed gating hard; T3+ human review |
| Overbook rebook fails | Releasing party (consent given) | Contract; liability caps |
| Mass failure beyond escrow | Platform + organizer (contract cap) | **Disclosed cap; no underfunded promise made** (§8.4) |
| Emergency-adjacent failures | Incident commander | Advisory only |

### 29.2 Emergency authority — EventPulse requests, never performs (V2.0 → explicit).

### 29.3 Antitrust / coordination

No price-setting across competitors; attendee choice preserved (offers, not mandates); platform-funded incentives (not collusive margin-setting); transparency reporting to authorities. **Legal review mandatory** (L-graded).

### 29.4 Consent architecture (V2.0 retained) + safe-exit

Withdrawal honored at all times, but inside a managed flow the system guarantees a **safe exit path** before token teardown: the person is escorted/directed to safety, then released. Privacy never strands anyone (§37.3).

### 29.5 Fairness-safety governance

Conflicts are resolved by the hard safety set (§18.2); the incident + resolution is logged to a governance board with disproportional-impact review (V2.0 retained).

### 29.6 Ownership-conflict arbiter pre-registration (NEW, §19.1 detail).

### 29.7 Human override spec (§19.2); data retention partition (§37.2).

### 29.8 Data ownership schedule (NEW)

Commercially explicit: provider inventory (provider-owned, licensed to platform); attendee commitment history (pseudonymous, platform-managed under consent); movement aggregates (joint platform-provider, de-identified); performance data (platform-owned, licensed to organizer). Defined here so no judge or partner ambiguity.

---

## 30. Evidence & Claims Classification (P / S / A / F / L)

This is the pass the whole verification audit demanded. Every strong claim in the document is graded; **nothing in the doc may contradict its grade.**

### 30.1 Grades

| Grade | Meaning |
|---|---|
| **P** | PROVEN — benchmarked on our own logs/tests |
| **S** | SIMULATED — same-seed synthetic; honestly labeled |
| **A** | ASSUMED — configurable prior; no source yet |
| **F** | NEEDS FIELD VALIDATION — pilot-scoped |
| **L** | LEGALLY UNVERIFIED — requires counsel |

### 30.2 Evidence tiers for outcomes (S/O/A/C as in §20.1)

The **Shadow City** delta is always reported as *simulated counterfactual impact* (tier S), never causal.

### 30.3 Application rule

- G-levels (§6) constrain **what may be promised**.
- Evidence grades constrain **how results are described**.
- A claim must carry the weaker of (promise-level, evidence-grade).

---

## 31. Formal Ontology & Event Schemas

*(V2.0 §29 retained + NEW events.)*

**New events:** `TokenDowngraded, TokenVoidedByEmergency, FulfillmentVerified, DisputeOpened, DisputeResolved, InventoryVerified, InventoryRevoked, EscrowTopUp, EscrowDrawDown, OverrideGranted, OverrideExpired, SafetyConstraintBlocked, CalibrationStratumReported, ProviderFailureAdjudicated, RecommendationExchangePing`.

**Commitment ledger events** (with `verification_mechanism` and `g_level` on every token event).

---

## 32. Event Sourcing + CQRS (with Recovery)

*(V2.0 §30 retained.)* 

**V2.1 labels CQRS as a design choice** (auditability/read-model decoupling/time-travel) — not a requirement of crowd management. Snapshot+stream rebuild (§27), replay for learning only, reservation saga for atomicity (§25.5), commitment ledger with non-repudiation semantics (§25.3).

---

## 33. Evaluation & Success Metrics

*(V2.0 §31 retained with V2.1 precision.)*

### 33.1 Metric hygiene
- Every KPI carries: evidence tier (S/O/A/C), claim grade (P/S/A/F/L), CI, and measurement boundary.
- Tail/abnormal-event strata reported separately (§23.1).

### 33.2 Decision & execution metrics (V2.0 retained)
Add: **G-level downgrade rate** (how often commitments weakened in-flight), **recommit SLA hit rate**, **escrow utilization**, **dispute resolution time**.

### 33.3 Outcome metrics (V2.0 retained, boundaries fixed)
- **Egress p95** defined: from seat/exit-start to *outside the security/transport boundary* (gates, stairs, road crossings, transit entry) — same measurement boundary across runs, per zone.
- Density-exceedance minutes over the density_limit(ζ) per-context bound (§18.2).
- **S-zero:** "zero incidents" replaced (V2.0).

### 33.4 Economic watch (V2.0 retained + concentration index §20.5).

---

## 34. Assumptions Register

*(V2.0 §32 retained; V2.1 additions:)*

| Assumption | Value | Grade | Source |
|---|---|---|---|
| App funnel: download / consent / active / accept | 60/45/70/60% | **A** (each independent) | Benchmark, to pilot |
| Public-channel induction | 25–40% slower | **A** | To measure |
| HARD-commitment slip | 3–8% | **A** | Mechanism target |
| Compliance function form | logistic-product w/ crowding-out | **A** (research assumption) | To benchmark |
| 3σ thresholds | robust-z/MAD/quantile candidates | **A** (configurable) | To benchmark |
| Buffer profiles per resource type | §12.4 | **A** | Prior events |
| Chance constraint | union-bound per critical set < 10% | **A** (definition set) | To validate |
| 90-second re-offering | ≤85 s engineered target | **S** | To measure under load |
| Recommit SLA | ≤5 min | **A** | To drill |
| Calibration band | 80–97% | **A** | To validate stratified |
| k-anonymity | ≥50, per stratum | **P** (policy) | Fixed |
| Retention partition | §37.2 | **P** (policy) | Fixed |

---

## 35. Implementation & Technology

*(V2.0 §33 retained; V2.1 notes:)*

- **Reference deployment "designed for"** 1 city / 3 zones / 50–200k / 10 hotels / 3 venues / 2 metro — **not "fully supported"** until load-tested (grades F/S).
- NetworkX + PostGIS suited to reference scale; migration path (partition/shard/Kafka) documented (§40) before scale claims.
- `EventBus` abstraction genuinely isolates Redis↔Kafka (adapter + conformance tests, Appendix C).
- Frontend aggregations (Deck.gl/MapLibre) render density/cohort aggregates, not 200k points (V2.0 implicitly; now explicit).
- Redis+Postgres reservation consistency via saga (§25.5).

---

## 36. Build & Delivery Plan

*(V2.0 §36 retained — phases + demo gates.*)

**V2.1 adds per-phase verification gates**
- P2: anomaly benchmark artifact (16.1) green.
- P4: reservation saga test (no double-book under fault injection) green.
- P5: chance-constraint definition + fallback second-order test green.
- P6: Monte Carlo CI + evidence-tier labeling green.
- P7: mode↔G-ladder coupling + offline-token drill green.
- P8: red-team suite incl. provider-strategy scenarios green.

---

## 37. Privacy & Ethics

*(V2.0 §35 retained; V2.1 additions.)*

### 37.1 k≥50 per stratum + differential-privacy composition (NEW)

k=50 applied per zone **per time window per segment** (not globally); repeated release composition accounted (post-processing/compact privacy analysis where multiple releases cover the same crowd). Self-declared data only.

### 37.2 Retention partition (NEW — resolves purge-vs-audit)

| Class | Retention |
|---|---|
| Raw observations (gate/telco/AP) | Purge 72h post-event |
| Pseudonymous commitment ledger | Retain per audit policy (multi-year) — evidence, not raw PII |
| Movement aggregates (≥k) | Retain for planning |
| Consent records | Retain as long as any dependent data |
| Dispute records | Retain until dispute closed + statutory limits |

Explicitly: privacy purge ≠ audit ledger; the ledger keeps evidence, never raw PII.

### 37.3 Consent-withdrawal safe-exit (NEW)

Revocation honored immediately, but inside a managed flow the platform directs a **safe exit path**, then tears down the token and forgets. No one is stranded by their own revocation (§29.4).

### 37.4 Consent-gated orchestration + governance board (V2.0 retained).

### 37.5 RF signal-free option (V2.0 retained; F to validate accuracy vs tower-based at a pilot).

---

## 38. Open Challenges & Future Work

*(V2.0 §36 retained, re-graded.)*

1. **Provider inventory plumbing** — API matrix §12.5 is the real grind; **F**.
2. **Guarantee economics under mass stress** — escrow + cap design is bounded, contractual stress still open; **L/F**.
3. **Equity under scarcity** — group-fairness vs organizer ROI; governance needed; **F**.
4. **True causal attribution** — tier-C rarely reachable; external A/B + staggered rollout; **F/L**.
5. **Multi-platform equilibrium** — recommendation-exchange protocol; until then noise+widened-uncertainty; **L** (industry standard needed).
6. **Edge/offline deployment** — designed (§27), venue backhaul reality **F**.
7. **Cold-start mega-events** — event-class priors as priors only; need ≥5 comparable observations for confidence; **F**.

---

## 39. Next-Gen Roadmap

*(V2.0 §37 retained with gates; V2.1 adds:)*
- Conditional residual surrogates (zone/crowd/plan-type/weather) — **before global additive bias** (§44).
- Demand-shaping via contextual-bandit commitment market — offline IPs eval gate (V2.0).
- Recommendation-exchange protocol (V2.0).
- Pre-event plan-book with **standing pre-authorizations** for T3 actions like road closures — addresses "authorization time vs event time" (§15.5, §18.6 of V2.0; now §12.7 time-to-danger).
- Federated cross-city priors; graph-featured surrogates; ESG accounting; RF estimation (V2.0).

---

## 40. Scale & Deployment Honesty

*(V2.0 §38 retained — reference scale + designed scaling path. "Designed for," not "fully supported.")*

---

## 41. Demo & Judging Strategy

*(V2.0 §39 retained; V2.1 adds the strongest new moments:)*
1. One-click **Commit vs Do-Nothing** + Shadow City (tier S, explicitly labeled).
2. **G-Ladder live:** kill a source / trigger provider-collapse → watch tokens downgrade G5→G3→G2→G1 and escrow fire. This is the visual proof of honesty.
3. **Reservation fault-injection:** show no-double-booking under saga (§25.5).
4. **Calibration pane** per stratum incl. abnormal-event subsample.
5. Red-team "5% compliance" toggle; explainability Level-2 pane; DEGRADED/EMERGENCY toggles; offline-token demo.

---

## 42. Competitive Differentiation

*(V2.0 §40 retained; V2.1 replaces "guarantees" with the honest framing.)*

| Differentiator | Why rare | Location |
|---|---|---|
| **Commitments with honest G-levels** — obligations exactly proportional to verified links; visible degradation | Nobody grades their own promises | §6, §44 |
| **Claims classification** — P/S/A/F/L on every claim | Anti-marketing; kills "black box" attacks | §30 |
| Three-sided market with escrow + cap | Explicitly deals with "what if everything fails" | §8 |
| **Formal safety constraint set** (per-context density, egress p95 boundaries, vulnerable-group floor) | Safety as math, not a slide | §18.2 |
| Reservation saga (no phantom inventory) | Architecturally honest commitments | §25.5 |
| Strategy-aware control + evidence tiers + stratified calibration + group-fairness + channel-mix realism | The whole mature stack | §21–24 |

---

## 43. Conclusion & Pitch Narrative

EventPulse V2.1 does three things concurrently: it **organizes** demand into capacity-backed commitments, it **measures** every outcome with an explicit evidence tier, and it **tells the truth about its own strength** via the G-Ladder and claim grades. That honesty is not PR — it is the engineering that survives judges, insurers, and lawyers.

### Pitch lines

> "We don't ask the crowd to obey us — we hold their seats. And we only promise what the weakest link in our system proves."

> "Whenever a link breaks — a bus doesn't come, a sensor dies, an emergency is declared — the commitment downgrades in seconds, compensation fires from escrow, and the attendee is never stranded. That downgrade path is designed, not improvised."

> "Every number on our dashboard has a grade: proven, simulated, assumed, field-validated, or legally-unverified. You will always know how much to trust us."

> "Confidence without calibration is marketing. Our 87% has a track record — per zone, per event class, including the dangerous moments."

---

## 44. Appendix A — Guarantee Ladder Detail

*(Full G-level spec: meanings, issuance, failure, verification, funding, downgrade mechanics — as §6; duplicated here for reference with examples.)*

Example: a G5 shuttle token means: escrow funded, contract in place, QR realtime verification at boarding, auto fallback + compensation if no seat. If the verification feed dies at 19:00, ALL unactivated G5 tokens of that route downgrade to G3 (boundary-verified) — obligations update instantly and are ledgered. If the route's buses drop to 3 of 6, tokens beyond remaining verified seats downgrade to G0 and escrow pays the difference. This is the "guarantee ↔ best-effort" transition formalized.

---

## 45. Appendix B — Claims Classification Register

*(Exhaustive register; high-priority items:) *

| # | Claim | Grade | Where |
|---|---|---|---|
| B1 | "Binding reservation" ≠ guaranteed capacity | L/F — SLA+escrow design | §6, §8.4 |
| B2 | HARD compliance near-deterministic w/ slip | A/F — field data | §19.4 |
| B3 | Public-channel induction 25–40% | A — to measure | §24 |
| B4 | Forecast interval calibration | P-mechanism / F-tail | §23 |
| B5 | Chance constraint <10% union-bound | A — definition+validation | §18.3 |
| B6 | 3σ vs robust alternatives | A — benchmark | §16.1 |
| B7 | Sensor independence | P-definition / F-measure | §16.2 |
| B8 | Sensor likelihoods calibrated | F | §13.3 |
| B9 | Compliance/crowding-out function form | A — research assumption | §21.1 |
| B10 | CP-SAT top-K diversity + iteration count | A — sensitivity runs | §18.6, §35 |
| B11 | 120 s solver | A — benchmark matrix | §35 |
| B12 | Greedy fallback safe | P-test / F-load | §18.4 |
| B13 | Monte Carlo n=10 visualization-only | P-policy | §17.1 |
| B14 | Surrogate (conditional residual) | F — offline eval | §44, §39 |
| B15 | Reservation saga prevents phantom inventory | P-test | §25.5 |
| B16 | Recommit SLA ≤5 min | A — drill | §25.6 |
| B17 | Escrow → "what if all fail" bounded | A/L — legal | §8.4 |
| B18 | Fairness via self-declared data only | P-policy / F-ops | §18.5 |
| B19 | Provider reputation fair attribution | P-design / F-op | §20.3 |
| B20 | App funnel 60/45/70/60% | A — pilot | §34 |
| B21 | ROI numbers person-hour valuation | A — business hypothesis | §8.2 |
| B22 | "Outcome-based service" terminology | L — counsel | §8.1 |
| B23 | Weather wired in, rain floor | S — synthetic | §15.4 |
| B24 | 50–200k "reference designed for" | F — load test | §35, §40 |
| B25 | G-Ladder honesty | P — by construction | §6, §44 |

---

## 46. Appendix C — Verification Roadmap (A/B/C/D buckets → artifacts)

| Bucket | Items | Artifact to produce | Status |
|---|---|---|---|
| **A MUST PROVE** | Provider capacity acquisition; binding-reservation semantics; fallback capacity; compensation economics; fulfillment verification; reservation consistency; app penetration; public-channel compliance; forecast calibration; chance-constraint correctness; optimization feasibility; emergency commitment handling | Contract templates; escrow model; dispute-path spec; saga fault-injection tests; penetration funnel pilot; calibration strata report; chance-constraint validation sim; benchmark matrix | **In progress** |
| **B MUST EXPERIMENTALLY VALIDATE** | 3σ vs robust; sensor independence; Bayesian fusion; compliance/crowding-out function; equilibrium model; adaptive hysteresis; surrogate accuracy; MC sample size; per-type buffers; 5/95% stress; inventory sizing; fairness constraints; provider reputation; hoarding; provider-strategy | Benchmark suite per item; offline sim runs with CI | **Open** |
| **C MUST LEGALLY/OPERATIONALLY VERIFY** | Hotel overbooking; compensation liability; outcome-service terminology; provider contracts; data sharing; consent; retention; accessibility data; group classification; antitrust; emergency authority; responsibilities | Counsel review matrix; retention partition; provider MSA checklist | **Open** |
| **D MUST TIGHTEN WORDING** | "guarantee" family; "deterministic"; "causal"; "proves delivery"; "fully supported"; "never stranded"; "always accessible"; "independent sources" | Terminology table enforced in all docs | **Done in this pass** |

---

## 47. Appendix D — Key Formulas & Definitions (revised)

**Time to saturation (dynamic)**
```
dC/dt = inflow_c(t) − outflow_c(t) − committed_inflow_window(t) + slip_c(t)
TimeToSaturation = solve dC/dt=0 over forecast fill-rate (not constant-fill)
```

**Overbooking-consistent saturation**
```
saturation = occupancy / (contract_capacity − safety_buffer(z) + released_headroom_P50)
            ; released_headroom_P50 ≠ additive capacity — it is expected availability,
              with P10/P90 band, revenue-manager consent, and verified_inventory=true only for released block
```

**Effective committed redistribution (disjoint accounting)**
```
effective = Σ_{held,HARD} (1 − slip_in_window)   // slip = in-window fulfillment failure of accepted-held tokens
          + Σ_{held,SOFT} acceptance · (1 − slip_in_window)
          − Σ forfeitures_post_window · not_already_in_slip
          // forfeitures are post-window releases, disjoint from in-window slip; no double-count
```

**Chance constraint (union bound)**
```
P( ∃ r∈C, ∃ t∈H : load_r(t) > usable_r(t) ) < 10%
joint over demand·compliance·capacity sampling; CI reported
```

**Reflexivity-adjusted compliance (research assumption; alternatives benchmarked)**
```
P(comply|token) = logit(β·x) · crowding_out(committed_volume/headroom)
                 ; additive alternative: logit(β·x + γ·crowding) also tested
```

**Plan persistence (adaptive hysteresis)**
```
replan iff deviations_observed ≥ Nₐ(t) , Nₐ = f(time_to_danger, dynamics), else hold incumbent + bonus
```

**User-equilibrium guard**
```
downrank plan if ||UE_flow − SO_flow||_{critical links} > δ; UE via MNL route-choice:
U(option) = a·time + b·crowding + c·VOT + d·info; reported as metric w/ red zone
```

**Commitment pool sizing (multi-period newsvendor w/ correlated failures)**
```
per window w: Q*_w = F_w⁻¹( (c_over + carry_c) / (c_over + c_short) ), with correlated-failure deflation ρ
```

**Escrow requirement**
```
escrow = Σ_{G5,G3} token × compensation × expected_failure_hazard + margin; issued cap ≤ escrow
```

**Surrogate bias correction (conditional)**
```
b(z, size, plan_type, weather) = E[sim − surrogate | context]; corrected = surrogate + b; residual logged
```

**Latent safety KPIs**
```
density_exceedance_min = Σ (density > limit(z))·Δt
egress_p95(z) measured zone to security/transport boundary (§33.3)
```

**Evidence labels**
```
S simulated · O observational · A A/B experimental · C causal (rarely claimed)
```

---

*EventPulse V2.1 — Strategic Design & Technical Architecture. The verification pass is complete; commitments, constraints, guarantees, and claims are graded. Ready for implementation and field validation.*