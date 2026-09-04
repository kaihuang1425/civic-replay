import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BaseProvider } from "../src/ai/baseProvider.js";
import { FakeProvider } from "../src/ai/fakeProvider.js";
import { OllamaProvider } from "../src/ai/providers/ollama.js";
import { AIStructuredOutputError, type GenerateOptions } from "../src/ai/types.js";

const Schema = z.object({ status: z.enum(["PASS", "BLOCKED"]), reason: z.string() });

/** BaseProvider driven by a scripted list of raw responses. */
class ScriptedProvider extends BaseProvider {
  readonly name = "scripted";
  calls = 0;
  constructor(private readonly script: string[]) {
    super();
  }
  protected async chat(_s: string, _p: string, _o: GenerateOptions) {
    return this.script[this.calls++] ?? "";
  }
  async health() {
    return { provider: this.name, available: true };
  }
}

describe("FakeProvider", () => {
  it("satisfies the AIProvider interface and returns canned structured output", async () => {
    const p = new FakeProvider().on("give me", { status: "PASS", reason: "ok" });
    expect(await p.generateStructured(Schema, "give me json")).toEqual({
      status: "PASS",
      reason: "ok",
    });
  });
});

describe("generateStructured repair loop", () => {
  it("passes a valid response straight through", async () => {
    const p = new ScriptedProvider(['{"status":"PASS","reason":"fine"}']);
    expect(await p.generateStructured(Schema, "x")).toEqual({
      status: "PASS",
      reason: "fine",
    });
    expect(p.calls).toBe(1);
  });

  it("repairs a malformed-then-valid response", async () => {
    const p = new ScriptedProvider([
      "not json at all",
      '{"status":"BLOCKED","reason":"repaired"}',
    ]);
    expect(await p.generateStructured(Schema, "x")).toEqual({
      status: "BLOCKED",
      reason: "repaired",
    });
    expect(p.calls).toBe(2);
  });

  it("throws AIStructuredOutputError when it never validates", async () => {
    const p = new ScriptedProvider(['{"status":"NOPE"}', '{"still":"bad"}']);
    await expect(p.generateStructured(Schema, "x")).rejects.toBeInstanceOf(
      AIStructuredOutputError,
    );
  });
});

describe("OllamaProvider", () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
    vi.restoreAllMocks();
  });

  it("returns a schema-valid object from a mocked HTTP call", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ message: { content: '{"status":"PASS","reason":"mock"}' } }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const p = new OllamaProvider("http://localhost:11434", "test-model");
    expect(await p.generateStructured(Schema, "x")).toEqual({
      status: "PASS",
      reason: "mock",
    });
  });

  it("reports unavailable when the host cannot be reached", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const health = await new OllamaProvider("http://localhost:9", "m").health();
    expect(health.available).toBe(false);
    expect(health.reason).toMatch(/Cannot reach Ollama/);
  });
});

describe("provider registry", () => {
  const saved = process.env.AI_PROVIDER;
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    if (saved === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = saved;
  });

  it("defaults to the ollama provider", async () => {
    delete process.env.AI_PROVIDER;
    const { getProvider } = await import("../src/ai/registry.js");
    expect(getProvider().name).toBe("ollama");
  });

  it("fails fast on an unknown provider, listing the registered ones", async () => {
    process.env.AI_PROVIDER = "bogus";
    const mod = await import("../src/ai/registry.js");
    expect(() => mod.getProvider()).toThrow(/Registered providers: ollama/);
  });
});
