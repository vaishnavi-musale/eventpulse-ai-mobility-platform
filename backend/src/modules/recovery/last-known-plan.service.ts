// §27.3 — Last-Known-Plan Broadcast service.
// Broadcast with delivery-vs-ack tracking.
// High-priority items require operator ack with escalation.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventBus } from "../../core/messaging/event-bus.interface";
import { EVENT_BUS } from "../../core/messaging/event-bus.token";
import { EventPulseDomainEvent } from "../../core/domain/events/base-event";
import { generateId } from "../../core/common/ids";
import { Result, ok, err } from "../../core/common/result";
import { Channel } from "../../core/domain/commitment-token";
import { LastKnownPlanMessage, DeliveryRecord } from "./types";

/** §27.3 — Ack timeout for critical messages (seconds) */
const CRITICAL_ACK_TIMEOUT_MS = 30_000;

/** §27.3 — Ack timeout for high-priority messages (seconds) */
const HIGH_ACK_TIMEOUT_MS = 60_000;

@Injectable()
export class LastKnownPlanService {
  private readonly logger = new Logger(LastKnownPlanService.name);

  /** Active broadcast messages */
  private readonly messages = new Map<string, LastKnownPlanMessage>();

  /** Delivery records per message */
  private readonly deliveries = new Map<string, DeliveryRecord[]>();

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  /**
   * §27.3 — Broadcast the last-known plan to operators/agents.
   * Returns delivery records; ack is tracked separately.
   */
  async broadcast(
    planId: string,
    channel: Channel,
    body: string,
    priority: "normal" | "high" | "critical",
    recipients: string[],
  ): Promise<Result<LastKnownPlanMessage>> {
    const messageId = generateId();

    const message: LastKnownPlanMessage = {
      id: messageId,
      planId,
      channel,
      body,
      sentAt: new Date(),
      priority,
    };
    this.messages.set(messageId, message);

    // Create delivery records for each recipient
    const deliveryRecords: DeliveryRecord[] = recipients.map((ref) => ({
      messageId,
      recipientRef: ref,
      ackRequired: priority === "critical" || priority === "high",
      escalationNeeded: false,
    }));
    this.deliveries.set(messageId, deliveryRecords);

    // Emit broadcast event
    const event = new EventPulseDomainEvent({
      id: messageId,
      eventName: "PlanCommitted",
      aggregateId: planId,
      version: 1,
      payload: {
        messageId,
        channel,
        priority,
        recipientCount: recipients.length,
        bodyPreview: body.substring(0, 100),
      },
    });
    await this.eventBus.publish(event);

    this.logger.log(
      `§27.3: Broadcast plan ${planId} via ${channel} to ${recipients.length} recipients (priority: ${priority})`,
    );

    return ok(message);
  }

  /**
   * §27.3 — Record delivery for a message to a recipient.
   */
  recordDelivery(messageId: string, recipientRef: string): void {
    const records = this.deliveries.get(messageId) ?? [];
    const record = records.find((r) => r.recipientRef === recipientRef);
    if (record) {
      record.deliveredAt = new Date();
    }
  }

  /**
   * §27.3 — Record acknowledgment for a message from a recipient.
   */
  recordAck(messageId: string, recipientRef: string): Result<void> {
    const records = this.deliveries.get(messageId) ?? [];
    const record = records.find((r) => r.recipientRef === recipientRef);
    if (!record) {
      return err("DELIVERY_NOT_FOUND", `No delivery record for ${recipientRef} on message ${messageId}`);
    }

    record.acknowledgedAt = new Date();
    return ok(undefined);
  }

  /**
   * §27.3 — Check for messages that need escalation.
   * High-priority items require operator ack with escalation.
   */
  checkEscalations(): DeliveryRecord[] {
    const now = Date.now();
    const escalations: DeliveryRecord[] = [];

    for (const [, records] of this.deliveries) {
      for (const record of records) {
        if (!record.ackRequired || record.acknowledgedAt) continue;

        const message = this.messages.get(record.messageId);
        if (!message) continue;

        const timeoutMs =
          message.priority === "critical"
            ? CRITICAL_ACK_TIMEOUT_MS
            : message.priority === "high"
              ? HIGH_ACK_TIMEOUT_MS
              : Infinity;

        const elapsed = now - message.sentAt.getTime();
        if (elapsed > timeoutMs) {
          record.escalationNeeded = true;
          escalations.push(record);
        }
      }
    }

    return escalations;
  }

  /**
   * §27.3 — Get delivery status for a message.
   */
  getDeliveryStatus(
    messageId: string,
  ): { total: number; delivered: number; acked: number; pendingAck: number } {
    const records = this.deliveries.get(messageId) ?? [];
    const total = records.length;
    const delivered = records.filter((r) => r.deliveredAt).length;
    const acked = records.filter((r) => r.acknowledgedAt).length;
    const pendingAck = records.filter((r) => r.ackRequired && !r.acknowledgedAt).length;
    return { total, delivered, acked, pendingAck };
  }

  /**
   * §27.3 — Get a message by ID.
   */
  getMessage(messageId: string): LastKnownPlanMessage | undefined {
    return this.messages.get(messageId);
  }

  /**
   * §27.3 — Get all messages for a plan.
   */
  getMessagesForPlan(planId: string): LastKnownPlanMessage[] {
    return Array.from(this.messages.values()).filter((m) => m.planId === planId);
  }
}
