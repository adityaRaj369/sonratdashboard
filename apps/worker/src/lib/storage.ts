import { mkdir, readFile, unlink, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { getConfig } from "@sonrat/config";

export interface ObjectStorage {
  getObject(key: string): Promise<{ body: Buffer; contentType: string }>;
  putObject(input: {
    key: string;
    body: Buffer | string;
    contentType?: string;
  }): Promise<{ key: string }>;
}

function createLocalStorage(basePath: string): ObjectStorage {
  const root = path.resolve(basePath);

  async function resolveKey(key: string): Promise<string> {
    const full = path.resolve(root, key);
    if (!full.startsWith(root)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  return {
    async putObject(input) {
      const full = await resolveKey(input.key);
      await mkdir(path.dirname(full), { recursive: true });
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
      await writeFile(full, body);
      return { key: input.key };
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
  };
}

let storage: ObjectStorage | null = null;

export function getStorage(): ObjectStorage {
  if (storage) return storage;
  const config = getConfig();
  // Local filesystem is shared with the API via LOCAL_STORAGE_PATH.
  // S3/mock providers can be added later; local/dev is the primary path.
  storage = createLocalStorage(config.LOCAL_STORAGE_PATH);
  return storage;
}

export async function objectExists(key: string): Promise<boolean> {
  const config = getConfig();
  const full = path.resolve(config.LOCAL_STORAGE_PATH, key);
  try {
    await access(full);
    return true;
  } catch {
    return false;
  }
}

export async function safeUnlink(key: string): Promise<void> {
  const config = getConfig();
  const full = path.resolve(config.LOCAL_STORAGE_PATH, key);
  await unlink(full).catch(() => undefined);
}
