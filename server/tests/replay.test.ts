import { describe, expect, it } from "vitest";
import { computeDiff } from "../src/engine/diff.js";
import { replay } from "../src/engine/replay.js";
import { floodSandbox } from "../src/seeds.js";
import type { Sandbox } from "@civic-replay/shared";

function withAllInterventions(sb: Sandbox): Sandbox {
  const add = (type: Sandbox["interventions"][number]["type"], stepRef: string) => ({
    id: `iv_${type}`,
    type,
    label: type,
    trigger: "t",
    action: "a",
    stepRef,
  });
  return {
    ...sb,
    interventions: [
      add("phone_fallback", "alert"),
      add("volunteer_escalation", "all"),
      add("multilingual_instructions", "understand"),
      add("family_proxy_assistance", "all"),
    ],
  };
}

describe("replay (rule-only)", () => {
  it("is deterministic across runs", async () => {
    const a = await replay(floodSandbox(), { useAi: false });
    const b = await replay(floodSandbox(), { useAi: false });
    expect(stripIds(a)).toEqual(stripIds(b));
  });

  it("produces 6 persona entries with consistent aggregate counts", async () => {
    const r = await replay(floodSandbox(), { useAi: false });
    expect(r.personas).toHaveLength(6);
    expect(r.aggregate.total).toBe(6);
    expect(r.aggregate.ableToAct).toBe(
      r.personas.filter((p) => p.outcome === "PASS").length,
    );
    expect(r.aggregate.unresolved).toBe(
      r.personas.filter((p) => p.outcome === "BLOCKED").length,
    );
    expect(r.aggregate.unresolved).toBeGreaterThan(0);
  });

  it("gives every non-PASS persona a non-empty root cause", async () => {
    const r = await replay(floodSandbox(), { useAi: false });
    for (const p of r.personas) {
      if (p.outcome !== "PASS") {
        expect(p.rootCause, p.personaId).toBeTruthy();
        expect(p.failurePath, p.personaId).not.toBeNull();
      }
    }
  });

  it("interventions reduce the unresolved count to zero", async () => {
    const before = await replay(floodSandbox(), { useAi: false });
    const after = await replay(withAllInterventions(floodSandbox()), {
      useAi: false,
    });
    expect(after.aggregate.unresolved).toBe(0);
    expect(after.aggregate.unresolved).toBeLessThan(before.aggregate.unresolved);
  });
});

describe("computeDiff", () => {
  it("attributes an improvement to phone_fallback alone and reports no change for others", async () => {
    const base = await replay(floodSandbox(), { useAi: false });
    const withPhone: Sandbox = {
      ...floodSandbox(),
      interventions: [
        {
          id: "iv_phone",
          type: "phone_fallback",
          label: "電話 fallback",
          trigger: "line_no_response",
          action: "call_resident",
          stepRef: "alert",
        },
      ],
    };
    const after = await replay(withPhone, { useAi: false });
    const diff = computeDiff(withPhone, base, after);

    const impact = diff.interventionImpacts.find((i) => i.type === "phone_fallback")!;
    expect(impact.movedPersonas.length).toBeGreaterThan(0);
    for (const moved of impact.movedPersonas) {
      const t = diff.personaTransitions.find((x) => x.personaId === moved.personaId)!;
      expect(t.improved).toBe(true);
    }
    // Personas the phone fallback did not touch are reported unchanged.
    const unchanged = diff.personaTransitions.filter((t) => !t.changed);
    expect(unchanged.length).toBeGreaterThan(0);
  });
});

function stripIds(r: Awaited<ReturnType<typeof replay>>) {
  return { ...r, id: "x", createdAt: "x" };
}
