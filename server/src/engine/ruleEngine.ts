import {
  INTERVENTION_CATALOG,
  type CitizenState,
  type FailureCategory,
  type Intervention,
  type InterventionType,
  type Persona,
  type PersonaConditions,
  type Sandbox,
  type ServiceChannel,
  type ServiceStep,
  type StateChanges,
  type StepOutcome,
} from "@civic-replay/shared";

/** Chinese label for a persona condition key, used in evidence text. */
const CONDITION_LABELS: Record<string, string> = {
  uses_line: "使用 LINE",
  has_smartphone: "智慧型手機",
  has_internet: "網路連線",
  has_vehicle: "交通工具",
  needs_proxy: "他人代辦",
};

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
    return decided(step, "PASS", "action", "居民可自行準備此步驟所需的文件", [
      "準備文件無障礙",
    ], {});
  }

  // --- Everything else: PASS when no limitation bites on this step ----
  if (!limitationBites(c, step)) {
    return decided(
      step,
      "PASS",
      categoryForStep(step),
      "居民可獨立完成此步驟",
      ["此步驟無限制條件"],
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
      `居民可透過${usable.map((ch) => ch.label).join("、")}完成`,
      [
        `可用管道：${channels.map((ch) => ch.label).join("、")}`,
        `居民可用的管道：${usable.map((ch) => ch.label).join("、")}`,
      ],
      step.kind === "alert" ? { aware: true } : { evacuation_info: "available" },
    );
  }

  const assist = assistanceFor("access", sandbox.interventions, step);
  const hasFallback = sandbox.service.fallbackOptions.length > 0;
  const evidence = [
    ...channelBlockEvidence(channels, persona),
    assist
      ? `已套用介入措施：${assist.label}`
      : hasFallback
        ? "已提供一般備援方案"
        : "沒有備援方案",
  ];

  if (assist) {
    return decided(
      step,
      "NEED_HELP",
      "access",
      `居民無法自行完成此步驟；${assist.label}可協助完成`,
      evidence,
      step.kind === "alert"
        ? { aware: true, needs_assistance: true }
        : { evacuation_info: "available", needs_assistance: true },
      assist.type,
    );
  }
  if (hasFallback) {
    return decided(
      step,
      "NEED_HELP",
      "access",
      "居民無法自行完成此步驟；適用一般備援方案",
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
    "居民無法完成此步驟，且無備援方案",
    evidence,
    step.kind === "alert" ? { aware: false } : { evacuation_info: "unavailable" },
  );
}

function evaluateTravel(step: ServiceStep, sandbox: Sandbox): RuleEvaluation {
  const assist = assistanceFor("action", sandbox.interventions, step);
  const evidence = [
    "行動能力：不便",
    "沒有交通工具",
    assist ? `已套用介入措施：${assist.label}` : "沒有交通協助",
  ];
  if (assist) {
    return decided(
      step,
      "NEED_HELP",
      "action",
      `居民無法自行前往；${assist.label}提供協助`,
      evidence,
      { transport: "unavailable", needs_assistance: true },
      assist.type,
    );
  }
  return decided(
    step,
    "BLOCKED",
    "action",
    "居民無法前往完成此步驟，且無協助方案",
    evidence,
    { transport: "unavailable", needs_assistance: true },
  );
}

function evaluateProxy(step: ServiceStep, sandbox: Sandbox): RuleEvaluation {
  const assist = sandbox.interventions.find(
    (i) => i.type === "family_proxy_assistance" && refMatches(i, step),
  );
  const evidence = [
    "需要他人代辦",
    assist ? `已套用介入措施：${assist.label}` : "不允許他人代辦",
  ];
  if (assist) {
    return decided(
      step,
      "NEED_HELP",
      "action",
      "此步驟需要代辦；已啟用家人／代理協助",
      evidence,
      { needs_assistance: true },
      "family_proxy_assistance",
    );
  }
  return decided(
    step,
    "BLOCKED",
    "action",
    "此步驟須居民本人親自辦理，且不允許他人代辦",
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
      "居民可自行理解說明內容",
      ["中文閱讀：一般", "數位能力：一般以上"],
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
      `居民可能無法自行理解說明內容；${assist.label}提供協助`,
      [
        readingLimited ? "中文閱讀：有限" : "數位能力：低",
        `已套用介入措施：${assist.label}`,
      ],
      { understands: true, needs_assistance: true },
      assist.type,
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
        failing.add(CONDITION_LABELS[key] ? `缺少${CONDITION_LABELS[key]}` : "不符合管道所需條件");
      }
    }
  }
  return [
    `可用管道：${channels.map((ch) => ch.label).join("、")}`,
    ...(failing.size ? [...failing] : ["居民沒有可用的管道"]),
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
  citedInterventionType?: InterventionType,
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
      citedInterventionType,
    },
  };
}
