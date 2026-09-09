export type DomainEventType =
  | "session.created"
  | "session.started"
  | "session.resumed"
  | "session.interrupted"
  | "session.ended"
  | "session.error"
  | "transcript.partial"
  | "transcript.final"
  | "language.detected"
  | "language.switched"
  | "tool.requested"
  | "tool.completed"
  | "audio.outbound"
  | "audio.inbound";

export interface DomainEvent<T = unknown> {
  type: DomainEventType;
  sessionId: string;
  callId?: string;
  organizationId?: string;
  timestamp: string;
  payload: T;
}

export type DomainEventHandler = (event: DomainEvent) => void | Promise<void>;

export class DomainEventBus {
  private handlers = new Map<DomainEventType | "*", Set<DomainEventHandler>>();

  on(type: DomainEventType | "*", handler: DomainEventHandler): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  async emit(event: DomainEvent): Promise<void> {
    const specific = this.handlers.get(event.type);
    const wildcard = this.handlers.get("*");
    const all = [...(specific ?? []), ...(wildcard ?? [])];
    await Promise.all(all.map((h) => h(event)));
  }
}

export function createDomainEvent<T>(
  type: DomainEventType,
  sessionId: string,
  payload: T,
  extras?: Partial<Pick<DomainEvent, "callId" | "organizationId">>,
): DomainEvent<T> {
  return {
    type,
    sessionId,
    callId: extras?.callId,
    organizationId: extras?.organizationId,
    timestamp: new Date().toISOString(),
    payload,
  };
}
