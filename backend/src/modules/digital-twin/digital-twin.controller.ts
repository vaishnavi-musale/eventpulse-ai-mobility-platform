// §14 — L3 Digital Twin REST API.
import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { DigitalTwinService, TwinEdgeSpec } from "./digital-twin.service";
import { GLevel } from "@core/domain/g-level.enum";

@Controller("twin")
export class DigitalTwinController {
  constructor(private readonly twin: DigitalTwinService) {}

  @Get("nodes")
  nodes() {
    return this.twin.graph.nodesList();
  }

  @Get("edges")
  edges() {
    return this.twin.graph.edgesList();
  }

  @Get("offerable")
  offerable(
    @Query("zone") zone: string,
  ): { zone: string; maxOfferableGLevel: GLevel } {
    return { zone, maxOfferableGLevel: this.twin.maxOfferableInto(zone) };
  }

  @Get("inflow")
  inflow(@Query("zone") zone: string): { zone: string; pressure: number } {
    return { zone, pressure: this.twin.inflowPressure(zone) };
  }

  @Post("unknown-node")
  addUnknownNode(
    @Body() body: { id: string; holdComfort?: number },
  ) {
    this.twin.addUnknownNode(body.id, body.holdComfort ?? 0);
    return { added: true, id: body.id };
  }

  @Post("flow")
  addFlow(@Body() spec: TwinEdgeSpec) {
    this.twin.addFlow(spec);
    return { added: true, edgeId: spec.id };
  }

  @Post("snapshot")
  async snapshot() {
    await this.twin.persistSnapshot();
    return { snapshotted: true };
  }
}
