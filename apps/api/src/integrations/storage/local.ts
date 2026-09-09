import { mkdir, readFile, unlink, writeFile, access } from "node:fs/promises";
import path from "node:path";
import type { ObjectStorage, PutObjectInput } from "./types.js";

export function createLocalStorage(basePath: string): ObjectStorage {
  const root = path.resolve(basePath);

  async function resolveKey(key: string): Promise<string> {
    const full = path.resolve(root, key);
    if (!full.startsWith(root)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  return {
    async putObject(input: PutObjectInput) {
      const full = await resolveKey(input.key);
      await mkdir(path.dirname(full), { recursive: true });
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
      await writeFile(full, body);
      await writeFile(`${full}.meta.json`, JSON.stringify({ contentType: input.contentType }));
      return { key: input.key, url: `file://${full}` };
    },

    async getObject(key: string) {
      const full = await resolveKey(key);
      const body = await readFile(full);
      let contentType = "application/octet-stream";
      try {
        const meta = JSON.parse(await readFile(`${full}.meta.json`, "utf8")) as {
          contentType?: string;
        };
        contentType = meta.contentType ?? contentType;
      } catch {
        // ignore
      }
      return { body, contentType };
    },

    async deleteObject(key: string) {
      const full = await resolveKey(key);
      await unlink(full).catch(() => undefined);
      await unlink(`${full}.meta.json`).catch(() => undefined);
    },

    async exists(key: string) {
      try {
        await access(await resolveKey(key));
        return true;
      } catch {
        return false;
      }
    },
  };
}
