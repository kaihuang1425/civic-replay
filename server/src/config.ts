import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Repo root — server/src is two levels down. */
export const REPO_ROOT = resolve(here, "..", "..");
export const SEEDS_DIR = resolve(REPO_ROOT, "data", "seeds");

/** Runtime data directory — overridable in tests via CIVIC_DATA_DIR. */
export function dataDir(): string {
  return process.env.CIVIC_DATA_DIR
    ? resolve(process.env.CIVIC_DATA_DIR)
    : resolve(REPO_ROOT, "data");
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  aiProvider: process.env.AI_PROVIDER ?? "ollama",
  ollama: {
    host: process.env.OLLAMA_HOST ?? "http://localhost:11434",
    model: process.env.OLLAMA_MODEL ?? "gpt-oss:120b-cloud",
  },
};
