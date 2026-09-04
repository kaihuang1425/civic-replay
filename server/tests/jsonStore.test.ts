import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JsonStore } from "../src/store/jsonStore.js";

describe("JsonStore", () => {
  it("returns the fallback when the file is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cr-store-"));
    const store = new JsonStore<Record<string, number>>("x.json", {}, dir);
    expect(await store.read()).toEqual({});
  });

  it("serializes 20 parallel writes without corruption", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cr-store-"));
    const store = new JsonStore<Record<string, number>>("recs.json", {}, dir);

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        store.update((cur) => ({ ...cur, [`k${i}`]: i })),
      ),
    );

    const raw = readFileSync(join(dir, "recs.json"), "utf8");
    const parsed = JSON.parse(raw) as Record<string, number>;
    expect(Object.keys(parsed)).toHaveLength(20);
    for (let i = 0; i < 20; i++) expect(parsed[`k${i}`]).toBe(i);
  });
});
