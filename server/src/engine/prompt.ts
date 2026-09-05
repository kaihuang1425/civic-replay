import type {
  CitizenState,
  Persona,
  Sandbox,
  ServiceStep,
} from "@civic-replay/shared";

/** Compact prompt for a single step / persona AI decision. */
export function buildStepPrompt(
  step: ServiceStep,
  persona: Persona,
  state: CitizenState,
  sandbox: Sandbox,
): string {
  const relevantChannels = sandbox.service.channels.filter(
    (ch) => step.channels.length === 0 || step.channels.includes(ch.id),
  );
  const activeInterventions = sandbox.interventions.filter(
    (i) => i.stepRef === "all" || i.stepRef === step.id || i.stepRef === step.kind,
  );

  return [
    `Scenario: ${sandbox.scenario.theme} — ${sandbox.scenario.event} (${sandbox.scenario.location}).`,
    ``,
    `Service step under test:`,
    `- id: ${step.id}`,
    `- kind: ${step.kind}`,
    `- label: ${step.label}`,
    `- resident intent: ${step.intent}`,
    step.jargon.length ? `- terms used: ${step.jargon.join(", ")}` : ``,
    `- channels for this step: ${relevantChannels.map((c) => `${c.id} (${c.label})`).join(", ") || "service default"}`,
    `- requires physical travel: ${step.requiresTravel}`,
    ``,
    `Resident conditions: ${JSON.stringify(persona.conditions)}`,
    `Current citizen state: ${JSON.stringify(state)}`,
    activeInterventions.length
      ? `Active interventions: ${activeInterventions.map((i) => `${i.type} (${i.action})`).join(", ")}`
      : `Active interventions: none`,
    ``,
    `Decide whether THIS resident can complete THIS step:`,
    `- "PASS"  — completes it unaided.`,
    `- "NEED_HELP" — cannot alone, but a listed fallback / intervention carries them through.`,
    `- "BLOCKED" — cannot, and nothing listed helps.`,
    ``,
    `Reply with JSON: { "status", "category" (access|comprehension|action),`,
    `"reason" (one sentence), "evidence" (array of short fact strings),`,
    `"stateChanges" (object of citizen-state keys to update, may be empty) }.`,
    `Write "reason" and every "evidence" string in Traditional Chinese (繁體中文).`,
  ]
    .filter((line) => line !== ``)
    .join("\n");
}

/** Prompt asking for a one-sentence systemic root cause. */
export function buildRootCausePrompt(
  persona: Persona,
  sandbox: Sandbox,
  failedStepLabel: string,
  failedCheck: string,
): string {
  return [
    `Scenario: ${sandbox.scenario.theme} — ${sandbox.scenario.event}.`,
    `Resident: ${persona.name} (${persona.descriptor}). Conditions: ${JSON.stringify(persona.conditions)}.`,
    `They stopped being able to proceed at step "${failedStepLabel}" because: ${failedCheck}.`,
    `Service channels: ${sandbox.service.channels.map((c) => c.label).join(", ")}.`,
    `Fallback options: ${sandbox.service.fallbackOptions.map((f) => f.label).join(", ") || "none"}.`,
    ``,
    `In ONE sentence, state the systemic gap in the public service that caused this`,
    `(not a description of the resident). Reply with JSON: { "rootCause": "..." }.`,
    `Write "rootCause" in Traditional Chinese (繁體中文).`,
  ].join("\n");
}
