import type { GenerationSettings } from "@civic-replay/shared";

export function buildGenerationPrompt(
  description: string,
  settings: GenerationSettings,
): string {
  return [
    `Design a testable "sandbox" for this public service, described by a designer:`,
    `"""${description}"""`,
    ``,
    `Inferred settings (respect these):`,
    `- scenario type: ${settings.scenarioType}`,
    `- service channels: ${settings.channels.join(", ") || "(you choose 2–4)"}`,
    `- eligibility rules: ${settings.eligibilityRules.join(" / ") || "(you choose 1–3)"}`,
    `- fallback options already offered: ${settings.fallbackOptions.join(", ") || "none"}`,
    ``,
    `Produce JSON with this exact shape:`,
    `{`,
    `  "name": "<short Traditional Chinese name for the sandbox>",`,
    `  "scenario": { "theme": "...", "location": "Demo Community 或情境地點", "event": "..." },`,
    `  "service": {`,
    `    "steps": [ 6 ordered steps, each`,
    `      { "id": "<snake_case>", "label": "<zh label>", "kind": "<one of: alert, understand, choose_channel, prepare, verify_identity, obtain_result>",`,
    `        "intent": "<resident-facing one-liner>", "channels": ["<subset of channel ids or empty>"],`,
    `        "requiresTravel": <bool>, "jargon": ["<administrative terms a resident might not understand>"] } ],`,
    `    "channels": [ { "id": "<snake_case>", "label": "<zh>", "requires": ["<persona condition keys required, e.g. has_internet, uses_line; [] if none>"] } ],`,
    `    "eligibilityRules": [ { "id": "r1", "text": "<zh>" } ],`,
    `    "fallbackOptions": [ { "id": "f1", "label": "<zh>" } ]`,
    `  },`,
    `  "highlights": { "theme": "<zh>", "serviceGoal": "<zh>", "coreConstraints": ["<zh>", "..."], "mainChannels": ["<zh>", "..."] }`,
    `}`,
    ``,
    `The 6 steps should cover: learning the service exists, checking eligibility,`,
    `choosing how to apply, preparing documents, verifying identity, and obtaining the result.`,
    `Keep at least one channel with "requires": [] so an in-person path always exists.`,
    `Return only the JSON object.`,
  ].join("\n");
}
