import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  PersonaSchema,
  SandboxSchema,
  TemplateSchema,
  type Persona,
  type Sandbox,
  type Template,
} from "@civic-replay/shared";
import { SEEDS_DIR } from "./config.js";

function load<T>(file: string, schema: { parse: (value: unknown) => T }): T {
  const raw = readFileSync(join(SEEDS_DIR, file), "utf8");
  return schema.parse(JSON.parse(raw));
}

let personasCache: Persona[] | null = null;
let floodCache: Sandbox | null = null;
let templatesCache: Template[] | null = null;

export function canonicalPersonas(): Persona[] {
  personasCache ??= load("personas.json", z.array(PersonaSchema));
  return structuredClone(personasCache);
}

export function floodSandbox(): Sandbox {
  floodCache ??= load("scenario.heavy-rain-flooding.json", SandboxSchema);
  return structuredClone(floodCache);
}

export function templates(): Template[] {
  if (!templatesCache) {
    const base = load("templates.json", z.array(TemplateSchema));
    templatesCache = base.map((t) =>
      t.id === "heavy-rain-flooding" ? { ...t, sandbox: floodSandbox() } : t,
    );
  }
  return structuredClone(templatesCache);
}

export function templateById(id: string): Template | undefined {
  return templates().find((t) => t.id === id);
}
