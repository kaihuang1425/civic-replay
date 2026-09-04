import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { dataDir } from "../config.js";

/**
 * Tiny JSON-file persistence with in-process write serialization.
 *
 * All writes for a given store instance are chained onto a single promise so
 * concurrent requests cannot interleave and corrupt the file. Writes go to a
 * temp file then atomically rename into place.
 */
export class JsonStore<T> {
  private writeChain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly fileName: string,
    private readonly fallback: T,
    private readonly baseDir?: string,
  ) {}

  private get filePath(): string {
    if (this.baseDir) return join(this.baseDir, this.fileName);
    if (isAbsolute(this.fileName)) return this.fileName;
    return join(dataDir(), this.fileName);
  }

  async read(): Promise<T> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return structuredClone(this.fallback);
      }
      throw err;
    }
  }

  /**
   * Serialize a mutation: the updater receives the current value and returns
   * the next value to persist. Returns the persisted value.
   */
  async update(updater: (current: T) => T | Promise<T>): Promise<T> {
    const run = this.writeChain.then(async () => {
      const current = await this.read();
      const next = await updater(current);
      await this.writeAtomic(next);
      return next;
    });
    // Keep the chain alive even if this update rejects.
    this.writeChain = run.catch(() => undefined);
    return run;
  }

  private async writeAtomic(value: T): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
    await rename(tmp, this.filePath);
  }
}
