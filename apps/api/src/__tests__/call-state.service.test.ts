import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@sonrat/shared";

vi.mock("@sonrat/database", () => {
  const call = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };
  const callEvent = {
    create: vi.fn(),
  };
  return {
    db: {
      call,
      callEvent,
      $transaction: vi.fn(async (fn: (tx: { call: typeof call; callEvent: typeof callEvent }) => Promise<unknown>) =>
        fn({ call, callEvent }),
      ),
    },
  };
});

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { db } from "@sonrat/database";
import { CallStateService } from "../services/call-state.service.js";

describe("CallStateService", () => {
  const service = new CallStateService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unknown calls", async () => {
    vi.mocked(db.call.findFirst).mockResolvedValue(null);
    await expect(
      service.transition({
        organizationId: "org-1",
        callId: "call-1",
        to: "INITIATING",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows valid transitions and writes an event", async () => {
    const existing = {
      id: "call-1",
      organizationId: "org-1",
      status: "QUEUED",
      startedAt: null,
      connectedAt: null,
    };
    vi.mocked(db.call.findFirst).mockResolvedValue(existing as never);
    vi.mocked(db.call.update).mockResolvedValue({
      ...existing,
      status: "INITIATING",
    } as never);
    vi.mocked(db.callEvent.create).mockResolvedValue({} as never);

    const result = await service.transition({
      organizationId: "org-1",
      callId: "call-1",
      to: "INITIATING",
      actor: "test",
    });

    expect(result.status).toBe("INITIATING");
    expect(db.callEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "status.initiating",
          callId: "call-1",
        }),
      }),
    );
  });

  it("rejects invalid transitions", async () => {
    vi.mocked(db.call.findFirst).mockResolvedValue({
      id: "call-1",
      organizationId: "org-1",
      status: "COMPLETED",
      startedAt: new Date(),
      connectedAt: new Date(),
    } as never);

    await expect(
      service.transition({
        organizationId: "org-1",
        callId: "call-1",
        to: "QUEUED",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("is a no-op when already in target status", async () => {
    const existing = {
      id: "call-1",
      organizationId: "org-1",
      status: "RINGING",
      startedAt: new Date(),
      connectedAt: null,
    };
    vi.mocked(db.call.findFirst).mockResolvedValue(existing as never);

    const result = await service.transition({
      organizationId: "org-1",
      callId: "call-1",
      to: "RINGING",
    });

    expect(result).toEqual(existing);
    expect(db.call.update).not.toHaveBeenCalled();
  });
});
