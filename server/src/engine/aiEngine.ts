import { z } from "zod";
import {
  AiStepDecisionSchema,
  type AiStepDecision,
  type CitizenState,
  type Persona,
  type Sandbox,
  type ServiceStep,
  type StepOutcome,
} from "@civic-replay/shared";
import type { AIProvider } from "../ai/types.js";
import { buildRootCausePrompt, buildStepPrompt } from "./prompt.js";

const DEGRADED_REASON = "AI 判讀暫時無法使用，需人工確認";

/**
 * Cache AI answers by the exact prompt sent. The prompt already encodes
 * every input that should legitimately change the answer (persona
 * conditions, citizen state, and the interventions active for that specific
 * step) - so an unrelated change elsewhere in the sandbox (e.g. adding an
 * intervention scoped to a different step) produces the same prompt and
 * reuses the same answer. Without this, a fresh replay re-asks the LLM for
 * every AI-decided step on every persona, and even at temperature 0 a local
 * model backend is not guaranteed bit-identical across separate calls - so a
 * step nothing changed for could flip PASS/NEED_HELP/BLOCKED at random,
 * making an added intervention look like it *hurt* an unrelated persona.
 */
const stepDecisionCache = new Map<string, AiStepDecision>();
const rootCauseCache = new Map<string, string>();

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
  const prompt = buildStepPrompt(step, persona, state, sandbox);
  try {
    let decision = stepDecisionCache.get(prompt);
    if (!decision) {
      decision = await provider.generateStructured(AiStepDecisionSchema, prompt);
      stepDecisionCache.set(prompt, decision);
    }
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
      evidence: ["AI 引擎目前無法使用"],
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
  const prompt = buildRootCausePrompt(persona, sandbox, failedStepLabel, failedCheck);
  try {
    let rootCause = rootCauseCache.get(prompt);
    if (rootCause === undefined) {
      rootCause = (await provider.generateStructured(RootCauseSchema, prompt)).rootCause;
      rootCauseCache.set(prompt, rootCause);
    }
    return rootCause;
  } catch {
    return null;
  }
}
