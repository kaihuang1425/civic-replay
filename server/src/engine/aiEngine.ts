import { z } from "zod";
import {
  AiStepDecisionSchema,
  type CitizenState,
  type Persona,
  type Sandbox,
  type ServiceStep,
  type StepOutcome,
} from "@civic-replay/shared";
import type { AIProvider } from "../ai/types.js";
import { buildRootCausePrompt, buildStepPrompt } from "./prompt.js";

const DEGRADED_REASON = "undetermined (AI unavailable)";

/**
 * Ask the AI Engine to decide a single step. Any failure degrades safely to
 * NEED_HELP with `requiresHumanValidation: true` so the replay can continue.
 */
export async function evaluateStep(
  provider: AIProvider,
  step: ServiceStep,
  persona: Persona,
  state: CitizenState,
  sandbox: Sandbox,
): Promise<StepOutcome> {
  try {
    const decision = await provider.generateStructured(
      AiStepDecisionSchema,
      buildStepPrompt(step, persona, state, sandbox),
    );
    return {
      stepId: step.id,
      status: decision.status,
      category: decision.category,
      reason: decision.reason,
      evidence: decision.evidence,
      decidedBy: "ai",
      requiresHumanValidation: true,
      stateChanges: decision.stateChanges,
    };
  } catch {
    return {
      stepId: step.id,
      status: "NEED_HELP",
      category: "comprehension",
      reason: DEGRADED_REASON,
      evidence: ["ai_engine = unavailable"],
      decidedBy: "ai",
      requiresHumanValidation: true,
      stateChanges: { needs_assistance: true },
    };
  }
}

const RootCauseSchema = z.object({ rootCause: z.string().min(1) });

export async function deriveRootCause(
  provider: AIProvider,
  persona: Persona,
  sandbox: Sandbox,
  failedStepLabel: string,
  failedCheck: string,
): Promise<string | null> {
  try {
    const { rootCause } = await provider.generateStructured(
      RootCauseSchema,
      buildRootCausePrompt(persona, sandbox, failedStepLabel, failedCheck),
    );
    return rootCause;
  } catch {
    return null;
  }
}
