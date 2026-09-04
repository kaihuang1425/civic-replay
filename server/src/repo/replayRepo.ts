import type { ReplayResult } from "@civic-replay/shared";
import { JsonStore } from "../store/jsonStore.js";

const store = new JsonStore<ReplayResult[]>("replay-results.json", []);

export const replayRepo = {
  async save(result: ReplayResult): Promise<ReplayResult> {
    await store.update((list) => [...list, result]);
    return result;
  },

  async get(id: string): Promise<ReplayResult | undefined> {
    return (await store.read()).find((r) => r.id === id);
  },

  async listForSandbox(sandboxId: string): Promise<ReplayResult[]> {
    return (await store.read())
      .filter((r) => r.sandboxId === sandboxId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Most recent result for a sandbox + intervention fingerprint. */
  async findLatest(
    sandboxId: string,
    fingerprint: string,
  ): Promise<ReplayResult | undefined> {
    return (await this.listForSandbox(sandboxId)).find(
      (r) => r.interventionFingerprint === fingerprint,
    );
  },
};
