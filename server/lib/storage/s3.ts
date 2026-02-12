import type { StorageAdapter } from "./adapter";

export class S3StorageAdapter implements StorageAdapter {
  async save(key: string, data: Buffer): Promise<void> {
    throw new Error("S3StorageAdapter not yet implemented. Set STORAGE_TYPE=local for development.");
  }

  async get(key: string): Promise<Buffer> {
    throw new Error("S3StorageAdapter not yet implemented.");
  }

  async delete(key: string): Promise<void> {
    throw new Error("S3StorageAdapter not yet implemented.");
  }

  async exists(key: string): Promise<boolean> {
    throw new Error("S3StorageAdapter not yet implemented.");
  }
}
