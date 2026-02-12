import { getEnv } from "../env";
import type { StorageAdapter } from "./adapter";
import { LocalStorageAdapter } from "./local";
import { S3StorageAdapter } from "./s3";

let _storage: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!_storage) {
    const env = getEnv();
    if (env.STORAGE_TYPE === "s3") {
      _storage = new S3StorageAdapter();
    } else {
      _storage = new LocalStorageAdapter(env.STORAGE_PATH);
    }
  }
  return _storage;
}

export type { StorageAdapter } from "./adapter";
