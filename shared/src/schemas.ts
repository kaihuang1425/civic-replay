import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export const OutcomeStatus = z.enum(["PASS", "NEED_HELP", "BLOCKED"]);
export type OutcomeStatus = z.infer<typeof OutcomeStatus>;

export const FailureCategory = z.enum(["access", "comprehension", "action"]);
export type FailureCategory = z.infer<typeof FailureCategory>;

/** Deterministic step-kind vocabulary the rule engine reasons about. */
export const StepKind = z.enum([
  "alert",
  "understand",
  "choose_channel",
  "prepare",
  "verify_identity",
  "obtain_result",
]);
export type StepKind = z.infer<typeof StepKind>;

export const DecidedBy = z.enum(["rule", "ai"]);
export type DecidedBy = z.infer<typeof DecidedBy>;

export const GeneratedBy = z.enum(["ai", "fallback", "seed", "manual"]);
export type GeneratedBy = z.infer<typeof GeneratedBy>;

export const InterventionType = z.enum([
  "phone_fallback",
  "volunteer_escalation",
  "multilingual_instructions",
  "family_proxy_assistance",
]);
export type InterventionType = z.infer<typeof InterventionType>;

/* ------------------------------------------------------------------ *
 * Scenario / Service
 * ------------------------------------------------------------------ */

export const ScenarioSchema = z.object({
  theme: z.string().min(1),
  location: z.string().min(1),
  event: z.string().min(1),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const ServiceChannelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Persona condition keys a resident must satisfy to use this channel. */
  requires: z.array(z.string()).default([]),
});
export type ServiceChannel = z.infer<typeof ServiceChannelSchema>;

export const EligibilityRuleSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export type EligibilityRule = z.infer<typeof EligibilityRuleSchema>;

export const FallbackOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});
export type FallbackOption = z.infer<typeof FallbackOptionSchema>;

export const ServiceStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: StepKind,
  /** Resident-facing intent, shown as the step sub-label. */
  intent: z.string().min(1),
  /** Channels available for this step; empty means "inherits service channels". */
  channels: z.array(z.string()).default([]),
  /** True when completing the step requires physically travelling somewhere. */
  requiresTravel: z.boolean().default(false),
  /** Administrative / disaster-management terms that may impede comprehension. */
  jargon: z.array(z.string()).default([]),
});
export type ServiceStep = z.infer<typeof ServiceStepSchema>;

export const ServiceSchema = z.object({
  steps: z.array(ServiceStepSchema).min(1),
  channels: z.array(ServiceChannelSchema).min(1),
  eligibilityRules: z.array(EligibilityRuleSchema).default([]),
  fallbackOptions: z.array(FallbackOptionSchema).default([]),
});
export type Service = z.infer<typeof ServiceSchema>;

/* ------------------------------------------------------------------ *
 * Persona
 * ------------------------------------------------------------------ */

const DigitalLiteracy = z.enum(["low", "normal", "high"]);
const Mobility = z.enum(["normal", "limited"]);
const ReadingLevel = z.enum(["normal", "limited"]);

export const PersonaConditionsSchema = z
  .object({
    age: z.number().int().positive().optional(),
    living: z.string().optional(),
    uses_line: z.boolean().optional(),
    has_smartphone: z.boolean().optional(),
    has_internet: z.boolean().optional(),
    digital_literacy: DigitalLiteracy.optional(),
    mobility: Mobility.optional(),
    has_vehicle: z.boolean().optional(),
    chinese_reading: ReadingLevel.optional(),
    needs_proxy: z.boolean().optional(),
  })
  .passthrough();
export type PersonaConditions = z.infer<typeof PersonaConditionsSchema>;

export const PersonaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  descriptor: z.string().min(1),
  primaryChannel: z.string().min(1),
  tags: z.array(z.string()).default([]),
  conditions: PersonaConditionsSchema,
});
export type Persona = z.infer<typeof PersonaSchema>;

/* ------------------------------------------------------------------ *
 * Intervention
 * ------------------------------------------------------------------ */

export const InterventionSchema = z.object({
  id: z.string().min(1),
  type: InterventionType,
  label: z.string().min(1),
  trigger: z.string().min(1),
  action: z.string().min(1),
  /** Step id, step kind, or "all". */
  stepRef: z.string().min(1),
});
export type Intervention = z.infer<typeof InterventionSchema>;

/* ------------------------------------------------------------------ *
 * Citizen State
 * ------------------------------------------------------------------ */

export const CitizenStateSchema = z
  .object({
    safe: z.boolean(),
    location: z.string(),
    aware: z.boolean(),
    understands: z.boolean().nullable(),
    evacuation_info: z.enum(["available", "unavailable"]).nullable(),
    transport: z.enum(["available", "unavailable"]).nullable(),
    needs_assistance: z.boolean(),
  })
  .passthrough();
export type CitizenState = z.infer<typeof CitizenStateSchema>;

export const StateChangesSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);
export type StateChanges = z.infer<typeof StateChangesSchema>;

/* ------------------------------------------------------------------ *
 * Step Outcome
 * ------------------------------------------------------------------ */

export const StepOutcomeSchema = z.object({
  stepId: z.string().min(1),
  status: OutcomeStatus,
  category: FailureCategory,
  reason: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  decidedBy: DecidedBy,
  requiresHumanValidation: z.boolean(),
  stateChanges: StateChangesSchema.default({}),
});
export type StepOutcome = z.infer<typeof StepOutcomeSchema>;

/** Schema handed to the AI provider — the engine fills in stepId/decidedBy. */
export const AiStepDecisionSchema = z.object({
  status: OutcomeStatus,
  category: FailureCategory,
  reason: z.string().min(1),
  evidence: z.array(z.string()).default([]),
  stateChanges: StateChangesSchema.default({}),
});
export type AiStepDecision = z.infer<typeof AiStepDecisionSchema>;

/* ------------------------------------------------------------------ *
 * Generation settings / highlights / sandbox
 * ------------------------------------------------------------------ */

export const GenerationSettingsSchema = z.object({
  scenarioType: z.string().min(1),
  channels: z.array(z.string()).default([]),
  eligibilityRules: z.array(z.string()).default([]),
  fallbackOptions: z.array(z.string()).default([]),
  personaCount: z.number().int().min(1).max(12),
});
export type GenerationSettings = z.infer<typeof GenerationSettingsSchema>;

export const HighlightsSchema = z.object({
  theme: z.string().min(1),
  serviceGoal: z.string().min(1),
  coreConstraints: z.array(z.string()).min(1),
  mainChannels: z.array(z.string()).min(1),
});
export type Highlights = z.infer<typeof HighlightsSchema>;

export const SandboxSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
  scenario: ScenarioSchema,
  service: ServiceSchema,
  personas: z.array(PersonaSchema).min(1),
  interventions: z.array(InterventionSchema).default([]),
  highlights: HighlightsSchema,
  settings: GenerationSettingsSchema,
  generatedBy: GeneratedBy,
  /** Dot-paths (e.g. "service.eligibilityRules.0.text") the user edited by hand. */
  userEdited: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Sandbox = z.infer<typeof SandboxSchema>;

/** Sandbox as accepted by create/update endpoints — server fills id + timestamps. */
export const SandboxDraftSchema = SandboxSchema.extend({
  id: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type SandboxDraft = z.infer<typeof SandboxDraftSchema>;

/** Sub-schema the AI generator returns; personas/interventions added by code. */
export const SandboxSkeletonSchema = z.object({
  name: z.string().min(1),
  scenario: ScenarioSchema,
  service: ServiceSchema,
  highlights: HighlightsSchema,
});
export type SandboxSkeleton = z.infer<typeof SandboxSkeletonSchema>;

/* ------------------------------------------------------------------ *
 * Replay result / diff
 * ------------------------------------------------------------------ */

export const FailurePathNodeSchema = z.object({
  stepId: z.string(),
  label: z.string(),
  check: z.string(),
  passed: z.boolean(),
  note: z.string().optional(),
});
export type FailurePathNode = z.infer<typeof FailurePathNodeSchema>;

export const PersonaReplaySchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  outcomes: z.array(StepOutcomeSchema),
  finalState: CitizenStateSchema,
  outcome: OutcomeStatus,
  failurePath: z.array(FailurePathNodeSchema).nullable(),
  rootCause: z.string().nullable(),
});
export type PersonaReplay = z.infer<typeof PersonaReplaySchema>;

export const ReplayAggregateSchema = z.object({
  total: z.number().int(),
  reached: z.number().int(),
  ableToAct: z.number().int(),
  unresolved: z.number().int(),
});
export type ReplayAggregate = z.infer<typeof ReplayAggregateSchema>;

export const ReplayResultSchema = z.object({
  id: z.string(),
  sandboxId: z.string(),
  interventionFingerprint: z.string(),
  useAi: z.boolean(),
  createdAt: z.string(),
  personas: z.array(PersonaReplaySchema),
  aggregate: ReplayAggregateSchema,
  requiresHumanValidation: z.boolean(),
});
export type ReplayResult = z.infer<typeof ReplayResultSchema>;

export const PersonaTransitionSchema = z.object({
  personaId: z.string(),
  personaName: z.string(),
  before: OutcomeStatus,
  after: OutcomeStatus,
  changed: z.boolean(),
  improved: z.boolean(),
});
export type PersonaTransition = z.infer<typeof PersonaTransitionSchema>;

export const InterventionImpactSchema = z.object({
  interventionId: z.string(),
  type: InterventionType,
  label: z.string(),
  movedPersonas: z.array(
    z.object({
      personaId: z.string(),
      personaName: z.string(),
      from: OutcomeStatus,
      to: OutcomeStatus,
    }),
  ),
  summary: z.string(),
});
export type InterventionImpact = z.infer<typeof InterventionImpactSchema>;

export const ReplayDiffSchema = z.object({
  sandboxId: z.string(),
  baseline: z.object({ id: z.string(), aggregate: ReplayAggregateSchema }),
  after: z.object({ id: z.string(), aggregate: ReplayAggregateSchema }),
  personaTransitions: z.array(PersonaTransitionSchema),
  interventionImpacts: z.array(InterventionImpactSchema),
  requiresHumanValidation: z.boolean(),
});
export type ReplayDiff = z.infer<typeof ReplayDiffSchema>;

/* ------------------------------------------------------------------ *
 * Preview analysis (cheap rule-only dry pass)
 * ------------------------------------------------------------------ */

export const RiskSeverity = z.enum(["high", "medium-high", "medium", "low"]);
export type RiskSeverity = z.infer<typeof RiskSeverity>;

export const RiskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: RiskSeverity,
  cause: z.string(),
  affectedPersonaIds: z.array(z.string()),
});
export type RiskItem = z.infer<typeof RiskItemSchema>;

export const SuggestedInterventionSchema = z.object({
  type: InterventionType,
  label: z.string(),
  rationale: z.string(),
});
export type SuggestedIntervention = z.infer<typeof SuggestedInterventionSchema>;

export const PreviewAnalysisSchema = z.object({
  risks: z.array(RiskItemSchema),
  suggestedInterventions: z.array(SuggestedInterventionSchema),
  estimatedDistribution: z.object({
    pass: z.number(),
    needHelp: z.number(),
    blocked: z.number(),
  }),
  estimateLabel: z.string(),
});
export type PreviewAnalysis = z.infer<typeof PreviewAnalysisSchema>;

/* ------------------------------------------------------------------ *
 * Template
 * ------------------------------------------------------------------ */

export const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  scenarioDescription: z.string().min(1),
  settings: GenerationSettingsSchema,
  /** Optional fully pre-built sandbox (used by the fixed validated scenario). */
  sandbox: z.lazy(() => SandboxSchema).optional(),
});
export type Template = z.infer<typeof TemplateSchema>;

/* ------------------------------------------------------------------ *
 * API payloads
 * ------------------------------------------------------------------ */

export const GenerateRequestSchema = z.object({
  description: z.string().min(1),
  settings: GenerationSettingsSchema.partial().optional(),
  /** When regenerating an existing sandbox, its previous state for edit-merge. */
  previous: SandboxSchema.optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const ReplayRequestSchema = z.object({
  sandboxId: z.string().min(1),
  useAi: z.boolean().default(true),
});
export type ReplayRequest = z.infer<typeof ReplayRequestSchema>;

export const DiffRequestSchema = z.object({
  sandboxId: z.string().min(1),
  baselineId: z.string().min(1),
  afterId: z.string().min(1),
});
export type DiffRequest = z.infer<typeof DiffRequestSchema>;

export const AddInterventionRequestSchema = z.object({
  type: InterventionType,
  stepRef: z.string().min(1).default("all"),
});
export type AddInterventionRequest = z.infer<typeof AddInterventionRequestSchema>;

export const AiHealthSchema = z.object({
  provider: z.string(),
  available: z.boolean(),
  model: z.string().optional(),
  reason: z.string().optional(),
});
export type AiHealth = z.infer<typeof AiHealthSchema>;
