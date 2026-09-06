// §14 — L3 Digital Twin service.
// Maintains the temporal property graph: zones (nodes), flows (edges) carrying
// G-graded commitments + hold-zone comfort infra. Unknown nodes gate HARD
// offers in their area to G2 (§14). Snapshots are persisted via the EventStore
// (Agent 1) for time-travel (§27).
import { Injectable, Inject } from "@nestjs/common";
import { EVENT_STORE } from "@core/event-sourcing/event-store.token";
import {
  EventStore,
  Snapshot,
} from "@core/event-sourcing/event-store.interface";
import { GLevel } from "@core/domain/g-level.enum";
import { PropertyGraph, TwinNode, TwinEdge } from "./property-graph";
import { EstimatedState } from "@modules/state-estimation/state-estimation.service";

export interface TwinEdgeSpec {
  id: string;
  from: string;
  to: string;
  expectedFlow: number;
  gLevel: GLevel;
  flowLoad?: number;
}

@Injectable()
export class DigitalTwinService {
  readonly graph = new PropertyGraph();

  constructor(@Inject(EVENT_STORE) private readonly eventStore: EventStore) {}

  /** §14 — upsert a zone node from an L2 estimated state. */
  syncZone(state: EstimatedState, holdComfort = 0.8): void {
    const existing = this.graph.getNode(state.zone);
    this.graph.addNode({
      id: state.zone,
      kind: "zone",
      label: `zone:${state.zone}`,
      offerableGLevel:
        existing?.offerableGLevel ?? maxOfferableByStatus(state.status),
      holdComfort,
      isUnknown: false,
      props: { status: state.status, confidence: state.confidence },
    });
  }

  /** §14 — register an `unknown` node (surrogate link). */
  addUnknownNode(id: string, holdComfort = 0): void {
    this.graph.addNode({
      id,
      kind: "unknown",
      label: `unknown:${id}`,
      offerableGLevel: "G2", // unknown nodes hard-cap offers to G2
      holdComfort,
      isUnknown: true,
      props: {},
    });
  }

  /** §14 — upsert a flow edge carrying G-graded commitment load. */
  addFlow(spec: TwinEdgeSpec): void {
    this.graph.addEdge({
      ...spec,
      flowLoad: spec.flowLoad ?? spec.expectedFlow,
      props: {},
    });
  }

  /**
   * §14 — max offerable G-level into a target zone. Unknown nodes (or offers
   * into areas only reachable via unknown nodes) are HARD-capped to G2.
   */
  maxOfferableInto(zone: string): GLevel {
    const node = this.graph.getNode(zone);
    if (!node) return "G2"; // unmodeled area => conservative
    if (node.isUnknown) return "G2"; // §14 gate: unknown nodes => G2
    const incoming = this.graph.incoming(zone);
    const viaUnknown = incoming.some(
      (e) => this.graph.getNode(e.from)?.isUnknown,
    );
    return viaUnknown ? ("G2" as GLevel) : node.offerableGLevel;
  }

  /** §14 — persist a snapshot for time-travel (§27). */
  async persistSnapshot(aggregateId = "digital-twin"): Promise<void> {
    const snap: Snapshot<{ nodes: TwinNode[]; edges: TwinEdge[] }> = {
      aggregateId,
      version: 1,
      stateAtVersion: {
        nodes: this.graph.nodesList(),
        edges: this.graph.edgesList(),
      },
      snapshotAt: new Date(),
    };
    await this.eventStore.saveSnapshot(snap);
  }

  /** §14 — second-order expected inflow into a zone. */
  inflowPressure(zone: string): number {
    return this.graph.inflow(zone) + this.graph.secondOrderImpact(zone);
  }
}

function maxOfferableByStatus(status: EstimatedState["status"]): GLevel {
  switch (status) {
    case "free":
      return "G5";
    case "stressed":
      return "G3";
    case "saturated":
      return "G2";
    default:
      return "G1"; // critical/unavailable
  }
}
