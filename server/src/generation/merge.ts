import type { GenerationSettings, Sandbox } from "@civic-replay/shared";

/** Which generation setting controls a given sandbox dot-path prefix. */
const PATH_TO_SETTING: Array<{ prefix: string; setting: keyof GenerationSettings }> = [
  { prefix: "service.channels", setting: "channels" },
  { prefix: "service.eligibilityRules", setting: "eligibilityRules" },
  { prefix: "service.fallbackOptions", setting: "fallbackOptions" },
  { prefix: "personas", setting: "personaCount" },
];

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function setPath(obj: unknown, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop()!;
  const target = keys.reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
  if (target && typeof target === "object") {
    (target as Record<string, unknown>)[last] = value;
  }
}

function controllingSetting(path: string): keyof GenerationSettings | null {
  return PATH_TO_SETTING.find((m) => path.startsWith(m.prefix))?.setting ?? null;
}

function sameSetting(
  a: GenerationSettings,
  b: GenerationSettings,
  key: keyof GenerationSettings,
): boolean {
  return JSON.stringify(a[key]) === JSON.stringify(b[key]);
}

/**
 * Re-apply the user's hand edits from `previous` onto a freshly generated
 * sandbox, dropping any edit whose controlling generation setting changed.
 * Returns the surviving `userEdited` path list.
 */
export function mergeUserEdits(
  next: Sandbox,
  previous: Sandbox,
  prevSettings: GenerationSettings,
  nextSettings: GenerationSettings,
): string[] {
  const survived: string[] = [];
  for (const path of previous.userEdited) {
    const setting = controllingSetting(path);
    if (setting && !sameSetting(prevSettings, nextSettings, setting)) {
      continue; // the setting that governs this edit changed — drop it
    }
    const value = getPath(previous, path);
    if (value === undefined) continue; // path no longer exists in the new shape
    if (getPath(next, path) === undefined) continue;
    setPath(next, path, value);
    survived.push(path);
  }
  return survived;
}
