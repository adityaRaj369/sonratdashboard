export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Internal API path relative to apiInternalBaseUrl (/internal). */
  internalPath: string;
  method?: "POST" | "PUT";
}

const callToolPath = "/voice/calls/:callId/tools/:toolName";

export const DEFAULT_TOOLS: ToolDefinition[] = [
  {
    name: "create_lead",
    description: "Create or update a sales lead from the conversation",
    parameters: {
      type: "object",
      properties: {
        interestLevel: { type: "string" },
        notes: { type: "string" },
        status: { type: "string" },
      },
    },
    internalPath: callToolPath,
  },
  {
    name: "schedule_callback",
    description: "Schedule a callback with the contact",
    parameters: {
      type: "object",
      properties: {
        scheduledAt: { type: "string" },
        timezone: { type: "string" },
        notes: { type: "string" },
      },
      required: ["scheduledAt"],
    },
    internalPath: callToolPath,
  },
  {
    name: "book_appointment",
    description: "Book an appointment",
    parameters: {
      type: "object",
      properties: {
        scheduledAt: { type: "string" },
        timezone: { type: "string" },
        notes: { type: "string" },
      },
      required: ["scheduledAt"],
    },
    internalPath: callToolPath,
  },
  {
    name: "transfer_to_human",
    description: "Escalate the call to a human agent",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
    },
    internalPath: callToolPath,
  },
  {
    name: "end_call",
    description: "End the call gracefully with an outcome",
    parameters: {
      type: "object",
      properties: {
        outcome: { type: "string" },
        summary: { type: "string" },
      },
    },
    internalPath: callToolPath,
  },
  {
    name: "mark_do_not_call",
    description: "Mark the contact as do-not-call",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
    },
    internalPath: callToolPath,
  },
];

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor(defs: ToolDefinition[] = DEFAULT_TOOLS) {
    for (const def of defs) this.tools.set(def.name, def);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  toAiTools(enabledNames?: string[]): Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> {
    const list =
      enabledNames && enabledNames.length > 0
        ? this.list().filter((t) => enabledNames.includes(t.name))
        : this.list();
    return list.map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }
}
