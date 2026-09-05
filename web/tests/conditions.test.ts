import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Persona } from "@civic-replay/shared";
import { formatConditions } from "../src/conditions.js";

// vitest runs with cwd = web/
const personasPath = resolve(process.cwd(), "../data/seeds/personas.json");

function seedPersonas(): Persona[] {
  return JSON.parse(readFileSync(personasPath, "utf8")) as Persona[];
}

describe("formatConditions", () => {
  it("renders every canonical seed persona's conditions as Chinese sentences with no key = value pairs", () => {
    for (const persona of seedPersonas()) {
      const sentences = formatConditions(persona.conditions);
      expect(sentences.length, persona.id).toBeGreaterThan(0);
      for (const sentence of sentences) {
        expect(sentence, persona.id).not.toMatch(/[a-z_]+\s*=/);
        expect(sentence, persona.id).not.toMatch(/^(true|false|low|normal|high|limited|alone|with_family)$/);
      }
    }
  });

  it("renders the elderly_alone persona's conditions as the expected Chinese sentences", () => {
    const persona = seedPersonas().find((p) => p.id === "elderly_alone")!;
    expect(formatConditions(persona.conditions)).toEqual([
      "年齡 78 歲",
      "獨居",
      "沒有使用 LINE",
      "持有智慧型手機",
      "沒有網路連線",
      "數位能力：低",
      "行動能力：不便",
      "沒有交通工具",
      "中文閱讀：一般",
      "不需要他人代辦",
    ]);
  });

  it("skips an unmapped custom condition key instead of falling back to key = value", () => {
    const sentences = formatConditions({
      age: 40,
      // @ts-expect-error PersonaConditionsSchema is .passthrough(); custom keys are allowed at runtime
      favorite_color: "blue",
    });
    expect(sentences).toEqual(["年齡 40 歲"]);
    expect(sentences.join(" ")).not.toContain("favorite_color");
    expect(sentences.join(" ")).not.toContain("blue");
  });
});
