// §14 — In-memory temporal property graph (NetworkX-style grid library port).
// Nodes = zones; edges = flows. Edges carry G-graded commitments and hold-zone
// comfort infra attributes. Supports second-order propagation (flow across a
// path of length 2).
import { GLevel, G_LADDER_INDEX } from "@core/domain/g-level.enum";

export interface TwinNode {
  id: string;
  kind: "zone" | "hold_zone" | "unknown" | "transit" | "venue";
  label: string;
  /** G-graded deliverability of offers touching this node. */
  offerableGLevel: GLevel;
  /** hold-zone comfort infra rating (space + facilities), §14/§18.2(3). */
  holdComfort: number;
  /** True when this node is connected via surrogate/unknown links (§14 unknown nodes). */
  isUnknown: boolean;
  props: Record<string, unknown>;
}

export interface TwinEdge {
  id: string;
  from: string;
  to: string;
  /** expected flow volume (committed + induced) — uncertain. */
  expectedFlow: number;
  /** G-grade of commitments riding this edge. */
  gLevel: GLevel;
  /** implied capacity draw this edge exerts on destination. */
  flowLoad: number;
  props: Record<string, unknown>;
}

export class PropertyGraph {
  private readonly nodes = new Map<string, TwinNode>();
  private readonly edges = new Map<string, TwinEdge>();

  addNode(node: TwinNode): void {
    this.nodes.set(node.id, node);
  }

  getNode(id: string): TwinNode | undefined {
    return this.nodes.get(id);
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  addEdge(edge: TwinEdge): void {
    this.edges.set(edge.id, edge);
  }

  getEdge(id: string): TwinEdge | undefined {
    return this.edges.get(id);
  }

  outgoing(zone: string): TwinEdge[] {
    return [...this.edges.values()].filter((e) => e.from === zone);
  }

  incoming(zone: string): TwinEdge[] {
    return [...this.edges.values()].filter((e) => e.to === zone);
  }

  /**
   * §14 — second-order propagation: for each incoming edge into `zone`, look at
   * the edges that feed the *source* of that edge and accumulate impact onto
   * `zone` weighted by deliverability (G-level).
   */
  secondOrderImpact(zone: string): number {
    const direct = this.incoming(zone);
    const secondOrder = direct
      .map((e) => this.incoming(e.from))
      .flat()
      .filter((ee) => ee.to !== zone);
    const impact = secondOrder.reduce((s, ee) => {
      const fromNode = this.getNode(ee.from);
      const gFactor = 1 / (G_LADDER_INDEX[ee.gLevel] + 1); // G5 >> G0
      return s + ee.expectedFlow * gFactor * (fromNode?.isUnknown ? 0.5 : 1);
    }, 0);
    return impact;
  }

  /** Total expected inflow into a zone (direct edges). */
  inflow(zone: string): number {
    return this.incoming(zone).reduce((s, e) => s + e.expectedFlow, 0);
  }

  nodesList(): TwinNode[] {
    return [...this.nodes.values()];
  }

  edgesList(): TwinEdge[] {
    return [...this.edges.values()];
  }

  snapshot(): { nodes: TwinNode[]; edges: TwinEdge[]; at: Date } {
    return { nodes: this.nodesList(), edges: this.edgesList(), at: new Date() };
  }
}
