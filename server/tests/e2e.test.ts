import { describe, expect, it } from "vitest";
import request from "supertest";
import { useTempDataDir, fakeProvider } from "./helpers.js";
import { setProvider } from "../src/ai/registry.js";
import { createApp } from "../src/app.js";
import { floodSandbox } from "../src/seeds.js";

useTempDataDir();
setProvider(fakeProvider());
const app = createApp();

/**
 * Scripted walkthrough of the fixed `heavy-rain-flooding` scenario:
 * load → replay (rule-only) → add interventions → replay → diff.
 */
describe("e2e: heavy-rain-flooding", () => {
  it("finds failure paths and shows interventions closing them", async () => {
    const created = await request(app)
      .post("/api/sandboxes")
      .send({ ...floodSandbox(), id: "" });
    const id = created.body.id as string;

    const baseline = await request(app)
      .post("/api/replay")
      .send({ sandboxId: id, useAi: false });
    expect(baseline.body.personas).toHaveLength(6);
    const baseUnresolved = baseline.body.aggregate.unresolved as number;
    expect(baseUnresolved).toBeGreaterThan(0);
    // Every blocked/need-help persona carries a failure path + root cause.
    for (const p of baseline.body.personas) {
      if (p.outcome !== "PASS") {
        expect(p.failurePath).not.toBeNull();
        expect(p.rootCause).toBeTruthy();
      }
    }

    for (const [type, stepRef] of [
      ["phone_fallback", "alert"],
      ["volunteer_escalation", "all"],
      ["multilingual_instructions", "understand"],
      ["family_proxy_assistance", "all"],
    ] as const) {
      await request(app)
        .post(`/api/sandboxes/${id}/interventions`)
        .send({ type, stepRef });
    }

    const after = await request(app)
      .post("/api/replay")
      .send({ sandboxId: id, useAi: false });
    expect(after.body.aggregate.unresolved).toBeLessThan(baseUnresolved);

    const diff = await request(app).post("/api/diff").send({
      sandboxId: id,
      baselineId: baseline.body.id,
      afterId: after.body.id,
    });
    const impactful = diff.body.interventionImpacts.filter(
      (i: { movedPersonas: unknown[] }) => i.movedPersonas.length > 0,
    );
    expect(impactful.length).toBeGreaterThan(0);
    for (const i of impactful) expect(i.summary).toMatch(/→/);
  });
});
