import { createHash, randomUUID } from "node:crypto";
import {
  type FailurePathNode,
  type OutcomeStatus,
  type PersonaReplay,
  type ReplayResult,
  type Sandbox,
  type StepOutcome,
} from "@civic-replay/shared";
import type { AIProvider } from "../ai/types.js";
import { deriveRootCause, evaluateStep } from "./aiEngine.js";
import { applyStateChanges, initialCitizenState } from "./citizenState.js";
import { evaluate as evaluateRule } from "./ruleEngine.js";

export interface ReplayOptions {
  useAi?: boolean;
  provider?: AIProvider;
}

/** Fingerprint of the active intervention set — for matching baseline/after runs. */
export function interventionFingerprint(sandbox: Sandbox): string {
  const key = sandbox.interventions
    .map((i) => `${i.type}@${i.stepRef}`)
    .sort()
    .join("|");
  return createHash("sha1").update(key).digest("hex").slice(0, 12);
}

export async function replay(
  sandbox: Sandbox,
  options: ReplayOptions = {},
): Promise<ReplayResult> {
  const useAi = options.useAi ?? true;
  const provider = options.provider;

  const personas: PersonaReplay[] = [];
  for (const persona of sandbox.personas) {
    let state = initialCitizenState(sandbox.scenario, persona);
    const outcomes: StepOutcome[] = [];

    for (const step of sandbox.service.steps) {
      const ruled = evaluateRule(step, persona, state, sandbox);
      let outcome: StepOutcome;
      if (ruled.decided && ruled.outcome) {
        outcome = ruled.outcome;
      } else if (useAi && provider) {
        outcome = await evaluateStep(provider, step, persona, state, sandbox);
      } else {
        outcome = {
          stepId: step.id,
          status: "NEED_HELP",
          category: "comprehension",
          reason: "undetermined (AI disabled)",
          evidence: ["ai_engine = disabled"],
          decidedBy: "ai",
          requiresHumanValidation: true,
          stateChanges: { needs_assistance: true },
        };
      }
      state = applyStateChanges(state, outcome.stateChanges);
      outcomes.push(outcome);
      if (outcome.status === "BLOCKED") break;
    }

    const outcome = rollUp(outcomes);
    const failurePath =
      outcome === "PASS" ? null : buildFailurePath(sandbox, outcomes);
    let rootCause: string | null = null;
    if (outcome !== "PASS" && failurePath) {
      const failed = failurePath.find((n) => !n.passed) ?? failurePath.at(-1)!;
      rootCause =
        useAi && provider
          ? await deriveRootCause(
              provider,
              persona,
              sandbox,
              failed.label,
              failed.check,
            )
          : null;
      rootCause ??= ruleRootCause(sandbox, outcomes);
    }

    personas.push({
      personaId: persona.id,
      personaName: persona.name,
      outcomes,
      finalState: state,
      outcome,
      failurePath,
      rootCause,
    });
  }

  const aggregate = aggregateOutcomes(personas, sandbox.service.steps.length);

  return {
    id: `rr_${randomUUID()}`,
    sandboxId: sandbox.id,
    interventionFingerprint: interventionFingerprint(sandbox),
    useAi,
    createdAt: new Date().toISOString(),
    personas,
    aggregate,
    requiresHumanValidation: personas.some((p) =>
      p.outcomes.some((o) => o.requiresHumanValidation),
    ),
  };
}

/** BLOCKED if any step blocked; else NEED_HELP if any needs help; else PASS. */
export function rollUp(outcomes: StepOutcome[]): OutcomeStatus {
  if (outcomes.some((o) => o.status === "BLOCKED")) return "BLOCKED";
  if (outcomes.some((o) => o.status === "NEED_HELP")) return "NEED_HELP";
  return "PASS";
}

function buildFailurePath(
  sandbox: Sandbox,
  outcomes: StepOutcome[],
): FailurePathNode[] {
  return outcomes.map((o) => {
    const step = sandbox.service.steps.find((s) => s.id === o.stepId)!;
    return {
      stepId: o.stepId,
      label: step.label,
      check: o.evidence[0] ?? o.reason,
      passed: o.status === "PASS",
      note: o.status === "PASS" ? undefined : o.reason,
    };
  });
}

function ruleRootCause(sandbox: Sandbox, outcomes: StepOutcome[]): string {
  const failed = outcomes.find((o) => o.status !== "PASS");
  if (!failed) return "No systemic gap identified.";
  const step = sandbox.service.steps.find((s) => s.id === failed.stepId)!;
  const cat =
    failed.category === "access"
      ? "the resident cannot reach the service through the available channels"
      : failed.category === "comprehension"
        ? "the resident cannot understand what the step requires"
        : "the resident cannot physically carry out the step";
  return `At "${step.label}", ${cat}, and the service provides no fallback that covers this resident (${failed.evidence.join("; ")}).`;
}

export function aggregateOutcomes(
  personas: PersonaReplay[],
  stepCount: number,
) {
  const reached = personas.filter(
    (p) => p.outcomes.length === stepCount || p.outcome !== "BLOCKED",
  ).length;
  const ableToAct = personas.filter((p) => p.outcome === "PASS").length;
  const unresolved = personas.filter((p) => p.outcome === "BLOCKED").length;
  return { total: personas.length, reached, ableToAct, unresolved };
}
