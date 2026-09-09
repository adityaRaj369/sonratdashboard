import { ToolExecutionError } from "@sonrat/shared";
import type { ToolRegistry } from "./registry.js";
import { childLogger } from "../lib/logger.js";

export interface ToolExecutionContext {
  organizationId: string;
  callId: string;
  sessionId: string;
  contactId?: string;
  campaignId?: string;
  idempotencyKey: string;
}

export interface ToolExecutorOptions {
  apiInternalBaseUrl: string;
  /** Shared secret / service token for internal API calls */
  internalToken?: string;
  fetchImpl?: typeof fetch;
}

export class ToolExecutor {
  private readonly fetchImpl: typeof fetch;
  private readonly log = childLogger({ component: "tool-executor" });

  constructor(
    private readonly registry: ToolRegistry,
    private readonly options: ToolExecutorOptions,
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
  ): Promise<unknown> {
    const def = this.registry.get(name);
    if (!def) {
      throw new ToolExecutionError(`Unknown tool: ${name}`);
    }

    // Prefer call-scoped internal route; fall back to legacy static path.
    const path = def.internalPath.includes(":callId")
      ? def.internalPath
          .replace(":callId", encodeURIComponent(ctx.callId))
          .replace(":toolName", encodeURIComponent(name))
      : `/voice/calls/${encodeURIComponent(ctx.callId)}/tools/${encodeURIComponent(name)}`;
    const url = `${this.options.apiInternalBaseUrl.replace(/\/$/, "")}${path}`;
    const started = Date.now();

    try {
      const res = await this.fetchImpl(url, {
        method: def.method ?? "POST",
        headers: {
          "content-type": "application/json",
          "x-organization-id": ctx.organizationId,
          "x-call-id": ctx.callId,
          "x-session-id": ctx.sessionId,
          "x-idempotency-key": ctx.idempotencyKey,
          ...(this.options.internalToken
            ? { authorization: `Bearer ${this.options.internalToken}` }
            : {}),
        },
        body: JSON.stringify({
          args: {
            ...args,
            organizationId: ctx.organizationId,
            callId: ctx.callId,
            contactId: ctx.contactId,
            campaignId: ctx.campaignId,
            sessionId: ctx.sessionId,
          },
          idempotencyKey: ctx.idempotencyKey,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as unknown;
      const durationMs = Date.now() - started;

      if (!res.ok) {
        this.log.warn(
          { name, status: res.status, durationMs, body, url },
          "tool call failed",
        );
        throw new ToolExecutionError(`Tool ${name} failed with ${res.status}`, {
          status: res.status,
          body,
        });
      }

      this.log.info({ name, durationMs }, "tool call completed");
      return body;
    } catch (err) {
      if (err instanceof ToolExecutionError) throw err;
      throw new ToolExecutionError(
        `Tool ${name} network error: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err instanceof Error ? err.message : String(err) },
      );
    }
  }
}
