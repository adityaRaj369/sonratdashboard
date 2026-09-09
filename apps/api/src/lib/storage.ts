import { getConfig } from "@sonrat/config";
import type { ObjectStorage } from "../integrations/storage/types.js";
import { createLocalStorage } from "../integrations/storage/local.js";
import { createS3Storage } from "../integrations/storage/s3.js";
import { createMockStorage } from "../integrations/storage/mock.js";

let storage: ObjectStorage | null = null;

export function getStorage(): ObjectStorage {
  if (storage) return storage;

  const config = getConfig();
  switch (config.STORAGE_PROVIDER) {
    case "s3":
      storage = createS3Storage(config);
      break;
    case "mock":
      storage = createMockStorage();
      break;
    case "local":
    default:
      storage = createLocalStorage(config.LOCAL_STORAGE_PATH);
      break;
  }
  return storage;
}

export function resetStorage(): void {
  storage = null;
}
