import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SandboxSchema, type Sandbox } from "@civic-replay/shared";

// vitest runs with cwd = web/
const seedPath = resolve(
  process.cwd(),
  "../data/seeds/scenario.heavy-rain-flooding.json",
);

export function floodSeed(): Sandbox {
  return SandboxSchema.parse(JSON.parse(readFileSync(seedPath, "utf8")));
}
