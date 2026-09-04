import { create } from "zustand";
import type {
  PreviewAnalysis,
  ReplayResult,
  Sandbox,
} from "@civic-replay/shared";
import { api } from "./api.js";

type ViewMode = "flow" | "journey";

interface ReplayRun {
  fingerprint: string;
  interventionCount: number;
  result: ReplayResult;
}

interface State {
  sandbox: Sandbox | null;
  preview: PreviewAnalysis | null;
  runs: ReplayRun[];
  busy: string | null;
  viewMode: ViewMode;
  savedAt: string | null;
  error: string | null;

  setViewMode: (m: ViewMode) => void;
  loadSandbox: (sandbox: Sandbox) => Promise<void>;
  generate: (description: string, settings?: Partial<Sandbox["settings"]>) => Promise<void>;
  regenerate: (description: string) => Promise<void>;
  patchSandbox: (next: Sandbox, editedPaths?: string[]) => Promise<void>;
  addIntervention: (type: string, stepRef?: string) => Promise<void>;
  removeIntervention: (iid: string) => Promise<void>;
  runReplay: (useAi: boolean) => Promise<void>;
  save: () => Promise<void>;
}

async function refreshPreview(sandbox: Sandbox) {
  try {
    return await api.preview(sandbox);
  } catch {
    return null;
  }
}

export const useStore = create<State>((set, get) => ({
  sandbox: null,
  preview: null,
  runs: [],
  busy: null,
  viewMode: "flow",
  savedAt: null,
  error: null,

  setViewMode: (viewMode) => set({ viewMode }),

  async loadSandbox(sandbox) {
    set({ busy: "loading", error: null });
    const preview = await refreshPreview(sandbox);
    set({ sandbox, preview, runs: [], busy: null, savedAt: sandbox.updatedAt });
  },

  async generate(description, settings) {
    set({ busy: "generating", error: null });
    try {
      const sandbox = await api.generate(description, settings);
      const preview = await refreshPreview(sandbox);
      set({ sandbox, preview, runs: [], busy: null, savedAt: null });
    } catch (e) {
      set({ busy: null, error: (e as Error).message });
    }
  },

  async regenerate(description) {
    const prev = get().sandbox;
    if (!prev) return;
    set({ busy: "generating", error: null });
    try {
      const sandbox = await api.generate(description, prev.settings, prev);
      const preview = await refreshPreview(sandbox);
      set({ sandbox, preview, runs: [], busy: null });
    } catch (e) {
      set({ busy: null, error: (e as Error).message });
    }
  },

  async patchSandbox(next, editedPaths = []) {
    const merged: Sandbox = {
      ...next,
      userEdited: [...new Set([...next.userEdited, ...editedPaths])],
    };
    set({ sandbox: merged });
    const preview = await refreshPreview(merged);
    set({ preview });
  },

  async addIntervention(type, stepRef = "all") {
    const sb = get().sandbox;
    if (!sb) return;
    set({ busy: "intervention" });
    const saved = await ensureSaved(sb, set);
    const updated = await api.addIntervention(saved.id, type, stepRef);
    const preview = await refreshPreview(updated);
    set({ sandbox: updated, preview, busy: null });
  },

  async removeIntervention(iid) {
    const sb = get().sandbox;
    if (!sb) return;
    const updated = await api.removeIntervention(sb.id, iid);
    const preview = await refreshPreview(updated);
    set({ sandbox: updated, preview });
  },

  async runReplay(useAi) {
    const sb = get().sandbox;
    if (!sb) return;
    set({ busy: "replaying", error: null });
    try {
      const saved = await ensureSaved(sb, set);
      const result = await api.replay(saved.id, useAi);
      const run: ReplayRun = {
        fingerprint: result.interventionFingerprint,
        interventionCount: saved.interventions.length,
        result,
      };
      const runs = [
        ...get().runs.filter((r) => r.fingerprint !== run.fingerprint),
        run,
      ];
      set({ sandbox: saved, runs, busy: null, savedAt: saved.updatedAt });
    } catch (e) {
      set({ busy: null, error: (e as Error).message });
    }
  },

  async save() {
    const sb = get().sandbox;
    if (!sb) return;
    await ensureSaved(sb, set);
  },
}));

type Setter = (partial: Partial<State>) => void;

/** Persist the working copy, creating it on first save then updating in place. */
async function ensureSaved(sb: Sandbox, set: Setter): Promise<Sandbox> {
  const persisted = useStore.getState().savedAt !== null;
  const saved = persisted
    ? await api.updateSandbox(sb)
    : await api.saveSandbox(sb);
  set({ sandbox: saved, savedAt: saved.updatedAt });
  return saved;
}
