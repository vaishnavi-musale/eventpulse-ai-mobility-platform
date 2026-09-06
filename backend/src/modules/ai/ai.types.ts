// §AI — Type contracts for the AI concierge endpoint.
// The chat returns a structured verdict so the frontend can both render a
// conversational reply AND drive its existing booking flows off the intent.

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChoice {
  label: string;
  value: string;
}

export interface AiChatRequest {
  messages: Omit<AiChatMessage, "role" | "system">[] | AiChatMessage[];
  event: {
    name: string;
    venue: string;
    date?: string;
  };
}

export interface AiChatResponse {
  reply: string;
  intent: string;
  choices: AiChoice[];
}