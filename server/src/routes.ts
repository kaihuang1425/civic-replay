import { Router, type Request, type Response } from "express";
import { ZodError } from "zod";
import {
  AddInterventionRequestSchema,
  DiffRequestSchema,
  GenerateRequestSchema,
  ReplayRequestSchema,
  SandboxDraftSchema,
  SandboxSchema,
} from "@civic-replay/shared";
import { getProvider } from "./ai/registry.js";
import { computeDiff } from "./engine/diff.js";
import { interventionFingerprint, replay } from "./engine/replay.js";
import { generateSandbox } from "./generation/generate.js";
import { analyzeSandbox } from "./generation/preview.js";
import { replayRepo } from "./repo/replayRepo.js";
import { sandboxRepo } from "./repo/sandboxRepo.js";
import { templates } from "./seeds.js";

export const api = Router();

/** Route params under `noUncheckedIndexedAccess`. */
const p = (req: Request, key: string): string =>
  (req.params as Record<string, string>)[key] ?? "";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response) => {
    fn(req, res).catch((err: unknown) => {
      if (err instanceof ZodError) {
        res.status(400).json({ error: "invalid_request", issues: err.issues });
        return;
      }
      const message = err instanceof Error ? err.message : "unknown error";
      res.status(500).json({ error: "internal_error", message });
    });
  };

/* --- health ------------------------------------------------------- */
api.get(
  "/health/ai",
  wrap(async (_req, res) => {
    res.json(await getProvider().health());
  }),
);

/* --- templates --------------------------------------------------- */
api.get(
  "/templates",
  wrap(async (_req, res) => {
    res.json(templates());
  }),
);

/* --- generation ------------------------------------------------- */
api.post(
  "/generate",
  wrap(async (req, res) => {
    const parsed = GenerateRequestSchema.parse(req.body);
    const sandbox = await generateSandbox(getProvider(), parsed);
    res.json(sandbox);
  }),
);

api.post(
  "/preview",
  wrap(async (req, res) => {
    const sandbox = SandboxSchema.parse(req.body);
    res.json(analyzeSandbox(sandbox));
  }),
);

/* --- sandboxes ------------------------------------------------- */
api.get(
  "/sandboxes",
  wrap(async (_req, res) => {
    const list = await sandboxRepo.list();
    res.json(
      list.map((s) => ({
        id: s.id,
        name: s.name,
        scenarioType: s.settings.scenarioType,
        personaCount: s.personas.length,
        interventionCount: s.interventions.length,
        generatedBy: s.generatedBy,
        updatedAt: s.updatedAt,
      })),
    );
  }),
);

api.post(
  "/sandboxes",
  wrap(async (req, res) => {
    const sandbox = SandboxDraftSchema.parse(req.body);
    const saved = await sandboxRepo.save(sandbox);
    res.status(201).json(saved);
  }),
);

api.get(
  "/sandboxes/:id",
  wrap(async (req, res) => {
    const sandbox = await sandboxRepo.get(p(req, "id"));
    if (!sandbox) return res.status(404).json({ error: "not_found" });
    res.json(sandbox);
  }),
);

api.put(
  "/sandboxes/:id",
  wrap(async (req, res) => {
    const sandbox = SandboxDraftSchema.parse({ ...req.body, id: p(req, "id") });
    const saved = await sandboxRepo.save(sandbox);
    res.json(saved);
  }),
);

api.get(
  "/sandboxes/:id/export",
  wrap(async (req, res) => {
    const sandbox = await sandboxRepo.get(p(req, "id"));
    if (!sandbox) return res.status(404).json({ error: "not_found" });
    res
      .setHeader("Content-Disposition", `attachment; filename="${sandbox.id}.json"`)
      .setHeader("Content-Type", "application/json")
      .send(JSON.stringify(sandbox, null, 2));
  }),
);

/* --- interventions ------------------------------------------- */
api.post(
  "/sandboxes/:id/interventions",
  wrap(async (req, res) => {
    const parsed = AddInterventionRequestSchema.parse(req.body);
    const updated = await sandboxRepo.addIntervention(p(req, "id"), parsed);
    if (!updated) return res.status(404).json({ error: "not_found" });
    res.json(updated);
  }),
);

api.delete(
  "/sandboxes/:id/interventions/:iid",
  wrap(async (req, res) => {
    const updated = await sandboxRepo.removeIntervention(
      p(req, "id"),
      p(req, "iid"),
    );
    if (!updated) return res.status(404).json({ error: "not_found" });
    res.json(updated);
  }),
);

/* --- replay + diff ------------------------------------------ */
api.post(
  "/replay",
  wrap(async (req, res) => {
    const parsed = ReplayRequestSchema.parse(req.body);
    const sandbox = await sandboxRepo.get(parsed.sandboxId);
    if (!sandbox) return res.status(404).json({ error: "not_found" });
    const result = await replay(sandbox, {
      useAi: parsed.useAi,
      provider: parsed.useAi ? getProvider() : undefined,
    });
    await replayRepo.save(result);
    res.json(result);
  }),
);

api.get(
  "/sandboxes/:id/replays",
  wrap(async (req, res) => {
    res.json(await replayRepo.listForSandbox(p(req, "id")));
  }),
);

api.post(
  "/diff",
  wrap(async (req, res) => {
    const parsed = DiffRequestSchema.parse(req.body);
    const sandbox = await sandboxRepo.get(parsed.sandboxId);
    if (!sandbox) return res.status(404).json({ error: "not_found" });
    const baseline = await replayRepo.get(parsed.baselineId);
    const after = await replayRepo.get(parsed.afterId);
    if (!baseline || !after) {
      return res.status(404).json({ error: "replay_not_found" });
    }
    res.json(computeDiff(sandbox, baseline, after));
  }),
);

export { interventionFingerprint };
