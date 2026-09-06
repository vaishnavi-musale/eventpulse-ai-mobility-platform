// §AI — REST surface for the AI concierge.
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiChatMessage, AiChatRequest, AiChatResponse } from "./ai.types";

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** POST /ai/chat — structured concierge reply for the attendee chat. */
  @Post("chat")
  async chat(
    @Body() body: Omit<AiChatRequest, "messages"> & { messages: AiChatMessage[] },
  ): Promise<AiChatResponse> {
    if (!this.ai.enabled) {
      throw new HttpException(
        { statusCode: 501, message: "AI concierge is not configured (set AI_API_KEY)" },
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    return this.ai.chat(body.messages ?? [], body.event);
  }
}