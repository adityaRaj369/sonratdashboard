import type { ObjectStorage, PutObjectInput } from "./types.js";

const store = new Map<string, { body: Buffer; contentType: string }>();

export function createMockStorage(): ObjectStorage {
  return {
    async putObject(input: PutObjectInput) {
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
      store.set(input.key, { body, contentType: input.contentType });
      return { key: input.key, url: `mock://${input.key}` };
    },

    async getObject(key: string) {
      const item = store.get(key);
      if (!item) throw new Error(`Mock storage miss: ${key}`);
      return item;
    },

    async deleteObject(key: string) {
      store.delete(key);
    },

    async exists(key: string) {
      return store.has(key);
    },

    async getSignedUrl(key: string) {
      return `mock://signed/${key}`;
    },
  };
}

export function clearMockStorage(): void {
  store.clear();
}
