import {
  INTERVENTION_CATALOG,
  type CitizenState,
  type FailureCategory,
  type Intervention,
  type Persona,
  type PersonaConditions,
  type Sandbox,
  type ServiceChannel,
  type ServiceStep,
  type StateChanges,
  type StepOutcome,
} from "@civic-replay/shared";

export interface RuleEvaluation {
  decided: boolean;
  outcome?: StepOutcome;
}

const UNDECIDED: RuleEvaluation = { decided: false };

/**
 * Deterministic rule evaluation for a single step / persona. Returns
 * `{ decided: false }` for anything that needs semantic judgement — language,
 * wording, and document-preparation difficulty go to the AI Engine.
 */
export function evaluate(
  step: ServiceStep,
  persona: Persona,
  _state: CitizenState,
  sandbox: Sandbox,
): RuleEvaluation {
  const c = persona.conditions;
  const isTravel = step.requiresTravel || step.kind === "obtain_result";

  // --- Access: can the resident reach this step's channel? --------------
  if (step.kind === "alert" || step.kind === "choose_channel") {
    return evaluateAccess(step, persona, sandbox);
  }

  // --- Travel / physical action ---------------------------------------
  if (isTravel && c.mobility === "limited" && c.has_vehicle === false) {
    return evaluateTravel(step, sandbox);
  }

  // --- Identity verification requiring the resident in person ----------
  if (step.kind === "verify_identity" && c.needs_proxy === true) {
    return evaluateProxy(step, sandbox);
  }

  // --- Comprehension: wording judgement is semantic -------------------
  if (step.kind === "understand") {
    return evaluateComprehension(step, persona, sandbox);
  }

  // --- Document preparation: literacy-sensitive → AI Engine ----------
  if (step.kind === "prepare") {
    if (
      c.digital_literacy === "low" ||
      c.needs_proxy === true ||
      c.chinese_reading === "limited"
    ) {
      return UNDECIDED;
    }
    return decided(step, "PASS", "action", "Resident can prepare what the step requires", [
      "no preparation barrier",
    ], {});
  }

  // --- Everything else: PASS when no limitation bites on this step ----
  if (!limitationBites(c, step)) {
    return decided(
      step,
      "PASS",
      categoryForStep(step),
      "Resident completes this step unaided",
      ["no limiting conditions for this step"],
      passStateChanges(step),
    );
  }
  return UNDECIDED;
}

/* ------------------------------------------------------------------ */

function evaluateAccess(
  step: ServiceStep,
  persona: Persona,
  sandbox: Sandbox,
): RuleEvaluation {
  const channelIds =
    step.channels.length > 0
      ? step.channels
      : sandbox.service.channels.map((ch) => ch.id);
  const channels = sandbox.service.channels.filter((ch) =>
    channelIds.includes(ch.id),
  );
  const usable = channels.filter((ch) => canUseChannel(ch.requires, persona));

  if (usable.length > 0) {
    return decided(
      step,
      "PASS",
      "access",
      `Resident can use ${usable.map((ch) => ch.label).join(" / ")}`,
      [
        `channels = [${channels.map((ch) => ch.id).join(", ")}]`,
        `usable_channels = [${usable.map((ch) => ch.id).join(", ")}]`,
      ],
      step.kind === "alert" ? { aware: true } : { evacuation_info: "available" },
    );
  }

  const assist = assistanceFor("access", sandbox.interventions, step);
  const hasFallback = sandbox.service.fallbackOptions.length > 0;
  const evidence = [
    ...channelBlockEvidence(channels, persona),
    assist
      ? `intervention = ${assist.type}`
      : `fallback = ${hasFallback ? "generic" : "none"}`,
  ];

  if (assist) {
    return decided(
      step,
      "NEED_HELP",
      "access",
      `Resident cannot reach this step unaided; ${assist.label} carries them through`,
      evidence,
      step.kind === "alert"
        ? { aware: true, needs_assistance: true }
        : { evacuation_info: "available", needs_assistance: true },
    );
  }
  if (hasFallback) {
    return decided(
      step,
      "NEED_HELP",
      "access",
      "Resident cannot reach this step unaided; a fallback option applies",
      evidence,
      step.kind === "alert"
        ? { aware: true, needs_assistance: true }
        : { evacuation_info: "available", needs_assistance: true },
    );
  }
  return decided(
    step,
    "BLOCKED",
    "access",
    "Resident cannot reach this step and no fallback exists",
    evidence,
    step.kind === "alert" ? { aware: false } : { evacuation_info: "unavailable" },
  );
}

function evaluateTravel(step: ServiceStep, sandbox: Sandbox): RuleEvaluation {
  const assist = assistanceFor("action", sandbox.interventions, step);
  const evidence = [
    "mobility = limited",
    "has_vehicle = false",
    assist ? `intervention = ${assist.type}` : "transport_assistance = none",
  ];
  if (assist) {
    return decided(
      step,
      "NEED_HELP",
      "action",
      `Resident cannot travel unaided; ${assist.label} provides assistance`,
      evidence,
      { transport: "unavailable", needs_assistance: true },
    );
  }
  return decided(
    step,
    "BLOCKED",
    "action",
    "Resident cannot travel to complete this step and no assistance exists",
    evidence,
    { transport: "unavailable", needs_assistance: true },
  );
}

function evaluateProxy(step: ServiceStep, sandbox: Sandbox): RuleEvaluation {
  const assist = sandbox.interventions.find(
    (i) => i.type === "family_proxy_assistance" && refMatches(i, step),
  );
  const evidence = [
    "needs_proxy = true",
    assist ? "intervention = family_proxy_assistance" : "proxy_allowed = false",
  ];
  if (assist) {
    return decided(
      step,
      "NEED_HELP",
      "action",
      "Identity step needs a proxy; family / proxy assistance is enabled",
      evidence,
      { needs_assistance: true },
    );
  }
  return decided(
    step,
    "BLOCKED",
    "action",
    "Identity step requires the resident in person and no proxy is allowed",
    evidence,
    { needs_assistance: true },
  );
}

function evaluateComprehension(
  step: ServiceStep,
  persona: Persona,
  sandbox: Sandbox,
): RuleEvaluation {
  const c = persona.conditions;
  const readingLimited = c.chinese_reading === "limited";
  const lowLiteracy = c.digital_literacy === "low";

  if (!readingLimited && !lowLiteracy) {
    return decided(
      step,
      "PASS",
      "comprehension",
      "Resident reads the information without difficulty",
      ["chinese_reading = normal", "digital_literacy >= normal"],
      { understands: true },
    );
  }

  // A multilingual / proxy intervention deterministically carries them through.
  const assist = assistanceFor("comprehension", sandbox.interventions, step);
  if (assist) {
    return decided(
      step,
      "NEED_HELP",
      "comprehension",
      `Resident may not understand the wording unaided; ${assist.label} helps`,
      [
        readingLimited ? "chinese_reading = limited" : "digital_literacy = low",
        `intervention = ${assist.type}`,
      ],
      { understands: true, needs_assistance: true },
    );
  }

  // Whether the specific wording actually blocks them is a semantic call.
  return UNDECIDED;
}

/* ------------------------------------------------------------------ */

function canUseChannel(requires: string[], persona: Persona): boolean {
  return requires.every((key) => {
    const value = (persona.conditions as Record<string, unknown>)[key];
    if (typeof value === "boolean") return value;
    return value !== false;
  });
}

function channelBlockEvidence(
  channels: ServiceChannel[],
  persona: Persona,
): string[] {
  const failing = new Set<string>();
  for (const ch of channels) {
    for (const key of ch.requires) {
      if ((persona.conditions as Record<string, unknown>)[key] === false) {
        failing.add(`${key} = false`);
      }
    }
  }
  return [
    `channels = [${channels.map((ch) => ch.id).join(", ")}]`,
    ...(failing.size ? [...failing] : ["no usable channel for resident"]),
  ];
}

function refMatches(intervention: Intervention, step: ServiceStep): boolean {
  return (
    intervention.stepRef === "all" ||
    intervention.stepRef === step.id ||
    intervention.stepRef === step.kind
  );
}

function assistanceFor(
  category: FailureCategory,
  interventions: Intervention[],
  step: ServiceStep,
): Intervention | undefined {
  return interventions.find(
    (i) =>
      INTERVENTION_CATALOG[i.type].categories.includes(category) &&
      refMatches(i, step),
  );
}

/** Does any of this persona's limitations bite on this step's kind? */
function limitationBites(c: PersonaConditions, step: ServiceStep): boolean {
  const access =
    c.uses_line === false ||
    c.has_smartphone === false ||
    c.has_internet === false;
  const literacy = c.digital_literacy === "low";
  const reading = c.chinese_reading === "limited";
  const travel = c.mobility === "limited" && c.has_vehicle === false;
  const proxy = c.needs_proxy === true;

  switch (step.kind) {
    case "alert":
      return access;
    case "choose_channel":
      return access || literacy;
    case "understand":
      return reading || literacy;
    case "prepare":
      return reading || literacy || proxy;
    case "verify_identity":
      return proxy || literacy;
    case "obtain_result":
      return step.requiresTravel ? travel : false;
    default:
      return step.requiresTravel ? travel : false;
  }
}

function categoryForStep(step: ServiceStep): FailureCategory {
  if (step.kind === "alert" || step.kind === "choose_channel") return "access";
  if (step.kind === "understand") return "comprehension";
  return "action";
}

function passStateChanges(step: ServiceStep): StateChanges {
  switch (step.kind) {
    case "alert":
      return { aware: true };
    case "understand":
      return { understands: true };
    case "choose_channel":
      return { evacuation_info: "available" };
    case "obtain_result":
      return step.requiresTravel ? { transport: "available" } : {};
    default:
      return {};
  }
}

function decided(
  step: ServiceStep,
  status: StepOutcome["status"],
  category: FailureCategory,
  reason: string,
  evidence: string[],
  stateChanges: StateChanges,
): RuleEvaluation {
  return {
    decided: true,
    outcome: {
      stepId: step.id,
      status,
      category,
      reason,
      evidence,
      decidedBy: "rule",
      requiresHumanValidation: false,
      stateChanges,
    },
  };
}
