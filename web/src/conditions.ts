import type { PersonaConditions } from "@civic-replay/shared";

/** Stable, readable ordering of persona condition entries for display. */
const ORDER = [
  "age",
  "living",
  "uses_line",
  "has_smartphone",
  "has_internet",
  "digital_literacy",
  "mobility",
  "has_vehicle",
  "chinese_reading",
  "needs_proxy",
];

export function canonicalConditionEntries(
  conditions: PersonaConditions,
): Array<[string, unknown]> {
  const entries = Object.entries(conditions);
  return entries.sort(
    ([a], [b]) =>
      (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99),
  );
}

/** Per-key formatter to a human-readable Chinese sentence fragment. */
const FORMATTERS: Record<string, (value: unknown) => string | undefined> = {
  age: (v) => (typeof v === "number" ? `年齡 ${v} 歲` : undefined),
  living: (v) =>
    v === "alone" ? "獨居" : v === "with_family" ? "與家人同住" : undefined,
  uses_line: (v) =>
    typeof v === "boolean" ? (v ? "有使用 LINE" : "沒有使用 LINE") : undefined,
  has_smartphone: (v) =>
    typeof v === "boolean"
      ? v
        ? "持有智慧型手機"
        : "沒有智慧型手機"
      : undefined,
  has_internet: (v) =>
    typeof v === "boolean" ? (v ? "有網路連線" : "沒有網路連線") : undefined,
  digital_literacy: (v) =>
    v === "high"
      ? "數位能力：高"
      : v === "normal"
        ? "數位能力：一般"
        : v === "low"
          ? "數位能力：低"
          : undefined,
  mobility: (v) =>
    v === "normal" ? "行動能力：一般" : v === "limited" ? "行動能力：不便" : undefined,
  has_vehicle: (v) =>
    typeof v === "boolean" ? (v ? "有交通工具" : "沒有交通工具") : undefined,
  chinese_reading: (v) =>
    v === "normal" ? "中文閱讀：一般" : v === "limited" ? "中文閱讀：有限" : undefined,
  needs_proxy: (v) =>
    typeof v === "boolean" ? (v ? "需要他人代辦" : "不需要他人代辦") : undefined,
};

/**
 * Render a persona's conditions as plain, human-readable Traditional Chinese
 * sentence fragments (e.g. "年齡 78 歲", "獨居"), never as raw `key = value`
 * pairs. Keys outside the documented `PersonaConditionsSchema` fields (or
 * values outside a mapped key's expected shape) are skipped rather than
 * falling back to an English key/value pair.
 */
export function formatConditions(conditions: PersonaConditions): string[] {
  const sentences: string[] = [];
  for (const [key, value] of canonicalConditionEntries(conditions)) {
    const sentence = FORMATTERS[key]?.(value);
    if (sentence) sentences.push(sentence);
  }
  return sentences;
}
