import { randomUUID } from "node:crypto";
import {
  INTERVENTION_CATALOG,
  type AddInterventionRequest,
  type Intervention,
  type Sandbox,
  type SandboxDraft,
} from "@civic-replay/shared";
import { JsonStore } from "../store/jsonStore.js";
import { floodSandbox } from "../seeds.js";

type SandboxMap = Record<string, Sandbox>;

const store = new JsonStore<SandboxMap>("sandboxes.json", {});

/** Seed the fixed validated sandbox on first use so it is always listable. */
async function ensureSeeded(map: SandboxMap): Promise<SandboxMap> {
  const flood = floodSandbox();
  if (!map[flood.id]) map[flood.id] = flood;
  return map;
}

export const sandboxRepo = {
  async list(): Promise<Sandbox[]> {
    const map = await ensureSeeded(await store.read());
    return Object.values(map).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  },

  async get(id: string): Promise<Sandbox | undefined> {
    const map = await ensureSeeded(await store.read());
    return map[id];
  },

  async save(sandbox: SandboxDraft): Promise<Sandbox> {
    const id = sandbox.id && sandbox.id.length ? sandbox.id : `sb_${randomUUID()}`;
    const now = new Date().toISOString();
    const record: Sandbox = {
      ...sandbox,
      id,
      createdAt: sandbox.createdAt ?? now,
      updatedAt: now,
    };
    await store.update(async (map) => {
      const seeded = await ensureSeeded(map);
      return { ...seeded, [id]: record };
    });
    return record;
  },

  async addIntervention(
    id: string,
    req: AddInterventionRequest,
  ): Promise<Sandbox | undefined> {
    const entry = INTERVENTION_CATALOG[req.type];
    const intervention: Intervention = {
      id: `iv_${randomUUID()}`,
      type: req.type,
      label: entry.label,
      trigger: entry.trigger,
      action: entry.action,
      stepRef: req.stepRef && req.stepRef !== "all" ? req.stepRef : entry.defaultStepRef,
    };
    return this.mutate(id, (sb) => ({
      ...sb,
      interventions: [
        ...sb.interventions.filter(
          (i) => !(i.type === intervention.type && i.stepRef === intervention.stepRef),
        ),
        intervention,
      ],
    }));
  },

  async removeIntervention(
    id: string,
    interventionId: string,
  ): Promise<Sandbox | undefined> {
    return this.mutate(id, (sb) => ({
      ...sb,
      interventions: sb.interventions.filter((i) => i.id !== interventionId),
    }));
  },

  async mutate(
    id: string,
    fn: (sb: Sandbox) => Sandbox,
  ): Promise<Sandbox | undefined> {
    let updated: Sandbox | undefined;
    await store.update(async (map) => {
      const seeded = await ensureSeeded(map);
      const current = seeded[id];
      if (!current) return seeded;
      updated = { ...fn(current), updatedAt: new Date().toISOString() };
      return { ...seeded, [id]: updated };
    });
    return updated;
  },
};
