import { describe, expect, it, beforeEach } from "vitest";
import { AdmissionController } from "./admission.js";

function createMemoryRedis() {
  const store = new Map<string, { value: number; tokens: Set<string> }>();
  return {
    async incr(key: string) {
      const cur = store.get(key) ?? { value: 0, tokens: new Set() };
      cur.value += 1;
      store.set(key, cur);
      return cur.value;
    },
    async decr(key: string) {
      const cur = store.get(key) ?? { value: 0, tokens: new Set() };
      cur.value -= 1;
      store.set(key, cur);
      return cur.value;
    },
    async expire() {
      return 1;
    },
    async set(key: string, _v: string, ..._args: unknown[]) {
      const base = key.split(":tok:")[0]!;
      const token = key.split(":tok:")[1];
      if (!token) return "OK";
      const cur = store.get(base) ?? { value: 0, tokens: new Set() };
      cur.tokens.add(token);
      store.set(base, cur);
      return "OK";
    },
    async del(key: string) {
      const base = key.split(":tok:")[0]!;
      const token = key.split(":tok:")[1];
      const cur = store.get(base);
      if (!cur || !token || !cur.tokens.has(token)) return 0;
      cur.tokens.delete(token);
      return 1;
    },
  };
}

describe("AdmissionController", () => {
  let admission: AdmissionController;

  beforeEach(() => {
    admission = new AdmissionController(createMemoryRedis() as never);
  });

  it("allows up to limit then denies", async () => {
    const t1 = await admission.tryAcquire("org:1", 2);
    const t2 = await admission.tryAcquire("org:1", 2);
    const t3 = await admission.tryAcquire("org:1", 2);
    expect(t1).toBeTruthy();
    expect(t2).toBeTruthy();
    expect(t3).toBeNull();
    await admission.release("org:1", t1!);
    const t4 = await admission.tryAcquire("org:1", 2);
    expect(t4).toBeTruthy();
  });

  it("withAdmission releases after success and failure", async () => {
    const result = await admission.withAdmission("c:1", 1, async () => 42);
    expect(result).toBe(42);
    await expect(
      admission.withAdmission("c:1", 1, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const token = await admission.tryAcquire("c:1", 1);
    expect(token).toBeTruthy();
  });
});
