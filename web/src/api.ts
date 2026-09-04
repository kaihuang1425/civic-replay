import type {
  AiHealth,
  PreviewAnalysis,
  ReplayDiff,
  ReplayResult,
  Sandbox,
  Template,
} from "@civic-replay/shared";

export interface SandboxSummary {
  id: string;
  name: string;
  scenarioType: string;
  personaCount: number;
  interventionCount: number;
  generatedBy: string;
  updatedAt: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export const api = {
  health: () => fetch("/api/health/ai").then((r) => json<AiHealth>(r)),
  templates: () => fetch("/api/templates").then((r) => json<Template[]>(r)),

  generate: (description: string, settings?: Partial<Sandbox["settings"]>, previous?: Sandbox) =>
    post("/api/generate", { description, settings, previous }).then((r) => json<Sandbox>(r)),

  preview: (sandbox: Sandbox) =>
    post("/api/preview", sandbox).then((r) => json<PreviewAnalysis>(r)),

  listSandboxes: () => fetch("/api/sandboxes").then((r) => json<SandboxSummary[]>(r)),
  getSandbox: (id: string) => fetch(`/api/sandboxes/${id}`).then((r) => json<Sandbox>(r)),
  saveSandbox: (sandbox: Sandbox) =>
    post("/api/sandboxes", sandbox).then((r) => json<Sandbox>(r)),
  updateSandbox: (sandbox: Sandbox) =>
    fetch(`/api/sandboxes/${sandbox.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sandbox),
    }).then((r) => json<Sandbox>(r)),
  exportUrl: (id: string) => `/api/sandboxes/${id}/export`,

  addIntervention: (id: string, type: string, stepRef = "all") =>
    post(`/api/sandboxes/${id}/interventions`, { type, stepRef }).then((r) =>
      json<Sandbox>(r),
    ),
  removeIntervention: (id: string, iid: string) =>
    fetch(`/api/sandboxes/${id}/interventions/${iid}`, { method: "DELETE" }).then(
      (r) => json<Sandbox>(r),
    ),

  replay: (sandboxId: string, useAi: boolean) =>
    post("/api/replay", { sandboxId, useAi }).then((r) => json<ReplayResult>(r)),
  diff: (sandboxId: string, baselineId: string, afterId: string) =>
    post("/api/diff", { sandboxId, baselineId, afterId }).then((r) =>
      json<ReplayDiff>(r),
    ),
};
