import { getVoiceConfig } from "./config.js";
import { childLogger } from "./logger.js";

const log = childLogger({ component: "api-client" });

export interface CallSessionBootstrap {
  callId: string;
  organizationId: string;
  agentId: string;
  agentVersionId: string;
  campaignId?: string | null;
  contactId?: string | null;
  direction: "inbound" | "outbound";
  systemPrompt: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  voiceId?: string;
  enabledTools: string[];
  agentName: string;
  companyName: string;
  agentPurpose: "sales" | "support" | "whatsapp" | "hybrid";
  openingInstruction: string;
}

/**
 * Load the real published agent prompt for a call.
 * Exotel custom params are too small for system prompts — always bootstrap from API.
 */
export async function fetchCallSessionBootstrap(
  callId: string,
): Promise<CallSessionBootstrap> {
  const config = getVoiceConfig();
  const url = `${config.apiInternalBaseUrl.replace(/\/$/, "")}/voice/calls/${encodeURIComponent(callId)}/session`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.AUTH_SECRET}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error({ callId, status: res.status, text }, "session bootstrap failed");
    throw new Error(`Session bootstrap failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as CallSessionBootstrap;
  if (!data.systemPrompt || data.systemPrompt.length < 40) {
    throw new Error("Session bootstrap returned an empty system prompt");
  }
  return data;
}

export async function transitionCall(
  callId: string,
  to: string,
  reason: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const config = getVoiceConfig();
  const url = `${config.apiInternalBaseUrl.replace(/\/$/, "")}/voice/calls/${encodeURIComponent(callId)}/transition`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.AUTH_SECRET}`,
    },
    body: JSON.stringify({ to, reason, payload }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn(
      { callId, to, status: res.status, text: text.slice(0, 200) },
      "call transition failed",
    );
  }
}

export async function recordConversationMessage(input: {
  callId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  language?: string;
  toolCallId?: string;
}): Promise<void> {
  const config = getVoiceConfig();
  const url = `${config.apiInternalBaseUrl.replace(/\/$/, "")}/voice/calls/${encodeURIComponent(input.callId)}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.AUTH_SECRET}`,
    },
    body: JSON.stringify({
      role: input.role,
      content: input.content,
      language: input.language,
      toolCallId: input.toolCallId,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn(
      { callId: input.callId, status: res.status, text: text.slice(0, 200) },
      "conversation message write failed",
    );
  }
}
