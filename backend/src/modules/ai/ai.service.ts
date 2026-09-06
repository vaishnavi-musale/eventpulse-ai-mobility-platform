// §AI — NVIDIA NIM (OpenAI-compatible) chat completions proxy.
// The frontend never sees the API key: the client posts chat context here and
// the service calls https://integrate.api.nvidia.com/v1/chat/completions.
import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_CONFIG } from "../../config/config.module";
import { AppConfig } from "../../config/app-config.type";
import { AiChatMessage, AiChatRequest, AiChatResponse } from "./ai.types";

const ALLOWED_INTENTS = [
  "transport",
  "parking",
  "hotels",
  "why:g5",
  "why:transport",
  "why:parking",
  "why:hotels",
  "restart",
  "skip:transport",
  "skip:parking",
  "skip:hotels",
] as const;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get enabled(): boolean {
    return Boolean(this.config.ai.apiKey);
  }

  /** §AI — Ask the concierge for a structured reply + intent. */
  async chat(messages: AiChatMessage[], event: AiChatRequest["event"]): Promise<AiChatResponse> {
    const system = this.buildSystemPrompt(event);
    const payload = {
      model: this.config.ai.model,
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        { role: "system" as const, content: system },
        ...messages.slice(-16).map((m) => ({
          role: m.role === "system" ? ("user" as const) : m.role,
          content: m.content,
        })),
      ],
      response_format: { type: "json_object" },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.ai.timeoutMs);
    const attempt = async (isRetry: boolean): Promise<string> => {
      const res = await fetch(`${this.config.ai.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.ai.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        const err = new Error(
          `AI provider responded ${res.status}: ${detail.slice(0, 300)}`,
        );
        if (!isRetry && res.status >= 500 && res.status !== 501) {
          (err as Error & { retryable?: boolean }).retryable = true;
        }
        throw err;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? "";
    };
    try {
      let raw: string;
      try {
        raw = await attempt(false);
      } catch (firstErr) {
        if (
          firstErr instanceof Error &&
          (firstErr as Error & { retryable?: boolean }).retryable
        ) {
          this.logger.warn(
            `AI provider 5xx on first attempt, retrying: ${String(firstErr)}`,
          );
          raw = await attempt(true);
        } else {
          throw firstErr;
        }
      }
      return this.parseVerdict(raw);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        this.logger.warn(`AI request timed out after ${this.config.ai.timeoutMs}ms`);
      } else {
        this.logger.warn(`AI request failed: ${String(err)}`);
      }
      return {
        reply:
          "My reasoning server is feeling slow right now — give it a second and try again, or tap Transport / Hotels / Parking and I'll jump straight in.",
        intent: "",
        choices: [],
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildSystemPrompt(event: AiChatRequest["event"]): string {
    const when = event.date ? ` (${event.date})` : "";
    return [
      `You are the EventPulse AI concierge, embedded in the attendee booking chat for "${event.name}" at ${event.venue}${when}.`,
      `You help event attendees book combined tickets, transport, and hotels, with honest verified guarantees (the G-Ladder).`,
      `Ground rules: never invent prices, venues, routes, hotels, or numbers. If asked something you cannot verify, say so and offer transport or hotels.`,
      ``,
      `Transport options are door-to-door MULTI-LEG journeys (the venue is not at a single station): each trip chains legs like ride (Uber/Ola) → walk → metro or bus → walk. Each leg has its own operator and fare; the route price shown is the whole door-to-door total. When the user asks about reaching the venue, mention that the trip is combined (pickup cab first, then transit), not a single metro ride. NEVER quote route fares, per-leg prices, or pickup-location totals — the exact prices are visible in the transport panel once it opens.`,
      ``,
      `When the user's message maps to a booking flow, set "intent" to EXACTLY one of:`,
      ALLOWED_INTENTS.join(", "),
      `Otherwise set "intent" to "" (empty string) for general conversation.`,
      ``,
      `Attach at most 3 short "choices" only when they genuinely move the booking forward. Each choice MUST be an object: {"label": "human readable", "value": "<one of the intents above or a slot:/count:/skip:/transport:/hotels:/parking: value>"} — never a bare string.`,
      `Respond ONLY with the final JSON object — everything you want to tell the user goes inside the "reply" field.`,
      `Do NOT include any reasoning, chain-of-thought, markdown fences, or text outside the JSON object.`,
      `Example: {"reply": "Sure! Which time slot?", "intent": "", "choices": [{"label": "🕖 7:00 PM Entry", "value": "slot:7pm"}]}`,
    ].join("\n");
  }

  private parseVerdict(raw: string): AiChatResponse {
    const fallbackReply =
      this.stripFences(raw).trim() ||
      "I'm not sure I caught that — want to arrange transport or a hotel stay?";
    const fallback: AiChatResponse = {
      reply: fallbackReply.slice(0, 800),
      intent: "",
      choices: [],
    };
    try {
      const parsed = JSON.parse(this.extractJson(raw)) as {
        reply?: unknown;
        intent?: unknown;
        choices?: unknown;
      };
      const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
      return {
        reply,
        intent: this.sanitizeIntent(parsed.intent),
        choices: this.sanitizeChoices(parsed.choices),
      };
    } catch {
      return fallback;
    }
  }

  private stripFences(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1] : text;
  }

  /** Fence-agnostic: grab the first balanced object {...} in the model output. */
  private extractJson(text: string): string {
    const cleaned = this.stripFences(text).trim();
    const start = cleaned.indexOf("{");
    if (start < 0) return cleaned;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return cleaned.slice(start, i + 1);
      }
    }
    return cleaned;
  }

  private sanitizeIntent(raw: unknown): string {
    if (typeof raw !== "string") return "";
    const value = raw.trim().toLowerCase();
    return ALLOWED_INTENTS.includes(value as (typeof ALLOWED_INTENTS)[number]) ? value : "";
  }

  private sanitizeChoices(raw: unknown): AiChatResponse["choices"] {
    if (!Array.isArray(raw)) return [];
    const normalized: { label: unknown; value: unknown }[] = raw
      .map((c) => {
        if (typeof c === "string") return { label: c, value: c };
        if (c && typeof c === "object" && "value" in (c as Record<string, unknown>)) {
          return {
            label: (c as Record<string, unknown>).label,
            value: (c as Record<string, unknown>).value,
          };
        }
        return null;
      })
      .filter((c): c is { label: unknown; value: unknown } => !!c);
    return normalized
      .map((c) => ({
        label: String(c.label).slice(0, 60),
        value: String(c.value).slice(0, 40),
      }))
      .filter((c) => this.isActionableChoice(c.value))
      .slice(0, 3);
  }

  private isActionableChoice(value: string): boolean {
    return (
      ALLOWED_INTENTS.includes(value as (typeof ALLOWED_INTENTS)[number]) ||
      /^(slot:|count:|skip:|transport:|hotels:|parking:)/.test(value)
    );
  }
}