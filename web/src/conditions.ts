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
