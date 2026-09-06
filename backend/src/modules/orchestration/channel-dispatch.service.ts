// §22 — Channel Dispatch service: six-channel model.
// Reach ≠ delivery ≠ ack ≠ compliance tracked as 4 separate measurements.
// HARD tokens only on confirmable-delivery channels (app/SMS-ack).
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { generateId } from "../../core/common/ids";
import { Result, ok, err } from "../../core/common/result";
import { Channel } from "../../core/domain/commitment-token";
import {
  ChannelDeliveryMetrics,
  ChannelDispatchRequest,
  ChannelDispatchResult,
} from "./types";

/** §22 — Channels that can confirm delivery (for HARD tokens) */
const CONFIRMABLE_CHANNELS: readonly Channel[] = ["app", "sms"];

/** §22 — All six channels in the model */
const ALL_CHANNELS: readonly Channel[] = [
  "app", "sms", "pa", "signage", "staff", "web",
];

@Injectable()
export class ChannelDispatchService {
  private readonly logger = new Logger(ChannelDispatchService.name);

  /** §22 — Per-channel cumulative delivery metrics */
  private readonly metrics = new Map<Channel, ChannelDeliveryMetrics>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {
    // Initialize metrics for all channels
    for (const ch of ALL_CHANNELS) {
      this.metrics.set(ch, {
        channel: ch,
        reach: 0,
        delivery: 0,
        ack: 0,
        compliance: 0,
      });
    }
  }

  /**
   * §22 — Dispatch a message through a channel.
   * HARD tokens (G3/G5) only on confirmable-delivery channels.
   * Unconfirmed persons → G≤2 or public-channel induction.
   */
  async dispatch(request: ChannelDispatchRequest): Promise<Result<ChannelDispatchResult>> {
    const deliveryId = generateId();

    // §22: HARD token guard — must be confirmable channel
    if (request.isHardToken && !CONFIRMABLE_CHANNELS.includes(request.channel)) {
      return err(
        "HARD_TOKEN_CHANNEL_VIOLATION",
        `§22: HARD token (G3/G5) requires confirmable delivery channel; ${request.channel} is not confirmable`,
        { channel: request.channel, confirmable: CONFIRMABLE_CHANNELS },
      );
    }

    // §22: Unconfirmed persons on public channels → G≤2 only
    if (!request.confirmable && request.isHardToken) {
      return err(
        "UNCONFIRMED_HARD_TOKEN",
        "§22: Unconfirmed person cannot receive HARD token on non-confirmable channel",
        { channel: request.channel },
      );
    }

    const metrics = this.metrics.get(request.channel)!;
    metrics.reach++;

    // Simulate delivery success (in production, this would call the actual channel adapter)
    const delivered = this.simulateDelivery(request);
    if (delivered) {
      metrics.delivery++;
    }

    const ackRequired = request.priority === "critical" || request.isHardToken;

    const result: ChannelDispatchResult = {
      dispatched: delivered,
      channel: request.channel,
      deliveryId,
      ackRequired,
      reason: delivered
        ? `Message dispatched via ${request.channel}`
        : `Delivery failed on ${request.channel}`,
    };

    const event = new EventPulseDomainEvent({
      id: deliveryId,
      eventName: "TokenActivated",
      aggregateId: request.recipientRef,
      version: 1,
      payload: {
        channel: request.channel,
        dispatched: delivered,
        ackRequired,
        priority: request.priority,
        isHardToken: request.isHardToken,
      },
    });
    await this.eventBus.publish(event);

    return ok(result);
  }

  /**
   * §22 — Record acknowledgment for a delivery.
   */
  recordAck(deliveryId: string, channel: Channel): void {
    const metrics = this.metrics.get(channel);
    if (metrics) {
      metrics.ack++;
    }
  }

  /**
   * §22 — Record compliance for a delivery.
   */
  recordCompliance(channel: Channel): void {
    const metrics = this.metrics.get(channel);
    if (metrics) {
      metrics.compliance++;
    }
  }

  /**
   * §22 — Get delivery metrics for a channel (4 separate measurements).
   */
  getMetrics(channel: Channel): ChannelDeliveryMetrics {
    return { ...this.metrics.get(channel)! };
  }

  /**
   * §22 — Get all channel metrics.
   */
  getAllMetrics(): ChannelDeliveryMetrics[] {
    return Array.from(this.metrics.values()).map((m) => ({ ...m }));
  }

  /**
   * §22 — Compute the confirmable-delivery fraction.
   * This is an uncertain quantity (uncertainty band → feeds chance constraint).
   * Returns the fraction as an UncertainValue-like structure.
   */
  computeReachableFraction(): {
    fraction: number;
    ciLower: number;
    ciUpper: number;
    confirmableChannels: Channel[];
  } {
    let totalReach = 0;
    let totalDelivery = 0;
    let confirmableReach = 0;

    for (const ch of ALL_CHANNELS) {
      const m = this.metrics.get(ch)!;
      totalReach += m.reach;
      totalDelivery += m.delivery;
      if (CONFIRMABLE_CHANNELS.includes(ch)) {
        confirmableReach += m.reach;
      }
    }

    const fraction = totalReach > 0 ? totalDelivery / totalReach : 0;
    // Simple Wilson-like CI approximation
    const n = totalReach;
    const p = fraction;
    const z = 1.96; // 95% CI
    const denominator = 1 + z * z / n;
    const center = (p + z * z / (2 * n)) / denominator;
    const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denominator;

    return {
      fraction,
      ciLower: Math.max(0, center - spread),
      ciUpper: Math.min(1, center + spread),
      confirmableChannels: [...CONFIRMABLE_CHANNELS],
    };
  }

  /**
   * §22 — Simulate channel delivery (placeholder for real channel adapters).
   */
  private simulateDelivery(request: ChannelDispatchRequest): boolean {
    // In production, this would call the actual SMS/app/PA adapter
    // For now, assume high success rate for confirmable channels
    if (CONFIRMABLE_CHANNELS.includes(request.channel)) {
      return true;
    }
    // Public channels have lower reliability
    return Math.random() > 0.05;
  }
}
