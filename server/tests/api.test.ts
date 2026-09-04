import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { useTempDataDir, fakeProvider } from "./helpers.js";
import { setProvider } from "../src/ai/registry.js";
import { createApp } from "../src/app.js";
import { floodSandbox } from "../src/seeds.js";

useTempDataDir();
setProvider(fakeProvider());
const app = createApp();

describe("API", () => {
  it("GET /api/health/ai returns provider + availability", async () => {
    const res = await request(app).get("/api/health/ai");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ provider: "fake", available: true });
  });

  it("GET /api/templates returns all 5 templates", async () => {
    const res = await request(app).get("/api/templates");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
  });

  it("POST /api/generate returns a schema-valid sandbox", async () => {
    const res = await request(app)
      .post("/api/generate")
      .send({ description: "育兒補助", settings: { personaCount: 6 } });
    expect(res.status).toBe(200);
    expect(res.body.service.steps.length).toBeGreaterThan(0);
    expect(res.body.personas).toHaveLength(6);
  });

  it("saves, lists, gets and exports a sandbox", async () => {
    const sandbox = { ...floodSandbox(), id: "", name: "我的測試沙盤" };
    const created = await request(app).post("/api/sandboxes").send(sandbox);
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    const list = await request(app).get("/api/sandboxes");
    expect(list.body.some((s: { id: string }) => s.id === id)).toBe(true);

    const got = await request(app).get(`/api/sandboxes/${id}`);
    expect(got.body.name).toBe("我的測試沙盤");
    expect(got.body.service).toEqual(created.body.service);

    const exported = await request(app).get(`/api/sandboxes/${id}/export`);
    expect(exported.headers["content-disposition"]).toContain(`${id}.json`);
    expect(JSON.parse(exported.text).id).toBe(id);
  });

  it("runs replay, adds an intervention, re-replays and diffs", async () => {
    const created = await request(app)
      .post("/api/sandboxes")
      .send({ ...floodSandbox(), id: "" });
    const id = created.body.id as string;

    const baseline = await request(app)
      .post("/api/replay")
      .send({ sandboxId: id, useAi: false });
    expect(baseline.status).toBe(200);
    expect(baseline.body.personas).toHaveLength(6);
    expect(baseline.body.aggregate.unresolved).toBeGreaterThan(0);

    await request(app)
      .post(`/api/sandboxes/${id}/interventions`)
      .send({ type: "phone_fallback", stepRef: "alert" });
    await request(app)
      .post(`/api/sandboxes/${id}/interventions`)
      .send({ type: "volunteer_escalation", stepRef: "all" });
    await request(app)
      .post(`/api/sandboxes/${id}/interventions`)
      .send({ type: "multilingual_instructions", stepRef: "understand" });
    await request(app)
      .post(`/api/sandboxes/${id}/interventions`)
      .send({ type: "family_proxy_assistance", stepRef: "all" });

    const after = await request(app)
      .post("/api/replay")
      .send({ sandboxId: id, useAi: false });
    expect(after.body.aggregate.unresolved).toBeLessThan(
      baseline.body.aggregate.unresolved,
    );

    // Stored results are retrievable per sandbox (id + fingerprint recorded).
    const stored = await request(app).get(`/api/sandboxes/${id}/replays`);
    expect(stored.body).toHaveLength(2);
    expect(stored.body[0].interventionFingerprint).not.toBe(
      stored.body[1].interventionFingerprint,
    );

    const diff = await request(app).post("/api/diff").send({
      sandboxId: id,
      baselineId: baseline.body.id,
      afterId: after.body.id,
    });
    expect(diff.status).toBe(200);
    expect(diff.body.personaTransitions).toHaveLength(6);
    expect(
      diff.body.interventionImpacts.some(
        (i: { movedPersonas: unknown[] }) => i.movedPersonas.length > 0,
      ),
    ).toBe(true);
  });
});

afterAll(() => setProvider(null));
beforeAll(() => undefined);
