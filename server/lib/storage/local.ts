import fs from "fs/promises";
import path from "path";
import type { StorageAdapter } from "./adapter";

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private getFullPath(key: string): string {
    return path.join(this.basePath, key);
  }

  async save(key: string, data: Buffer): Promise<void> {
    const fullPath = this.getFullPath(key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.getFullPath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getFullPath(key));
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getFullPath(key));
      return true;
    } catch {
      return false;
    }
  }
}
