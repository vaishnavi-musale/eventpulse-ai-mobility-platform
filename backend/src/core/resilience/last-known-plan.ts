// §27.3 — Last-known-plan broadcast interface with separate delivery vs ack.
// Reach ≠ delivery ≠ acknowledgment ≠ compliance tracked separately (§22, §27.3).

export interface BroadcastMessage {
  id: string;
  planId: string;
  channel: "app" | "sms" | "pa" | "signage" | "staff" | "web";
  body: string;
  sentAt: Date;
}

export interface BroadcastDelivery {
  messageId: string;
  recipientRef: string;
  deliveredAt: Date;
  acknowledgedAt?: Date;
  ackRequired: boolean;
}

export interface LastKnownPlanBroadcaster {
  /**
   * Broadcast the last-known plan to operators/agents over a channel.
   * Returns delivery records — ack is tracked separately by ack().
   */
  broadcast(
    message: BroadcastMessage,
    recipients: string[],
  ): Promise<BroadcastDelivery[]>;

  /**
   * Record an independent acknowledgment for a delivery (or escalate if
   * ackRequired and missing — caller may implement escalation policy).
   */
  ack(deliveryRef: string): Promise<void>;

  /**
   * Query ack status for a message (delivered vs acked vs escalated).
   */
  status(messageId: string): Promise<BroadcastDelivery[]>;
}
