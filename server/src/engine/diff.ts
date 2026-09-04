import {
  INTERVENTION_CATALOG,
  type FailureCategory,
  type OutcomeStatus,
  type PersonaReplay,
  type ReplayDiff,
  type ReplayResult,
  type Sandbox,
} from "@civic-replay/shared";

const RANK: Record<OutcomeStatus, number> = {
  BLOCKED: 0,
  NEED_HELP: 1,
  PASS: 2,
};

/**
 * Compare a baseline replay with a post-intervention replay and attribute each
 * persona's improvement to the intervention(s) that caused it.
 */
export function computeDiff(
  sandbox: Sandbox,
  baseline: ReplayResult,
  after: ReplayResult,
): ReplayDiff {
  const personaTransitions = after.personas.map((a) => {
    const b = baseline.personas.find((p) => p.personaId === a.personaId);
    const before = b?.outcome ?? a.outcome;
    return {
      personaId: a.personaId,
      personaName: a.personaName,
      before,
      after: a.outcome,
      changed: before !== a.outcome,
      improved: RANK[a.outcome] > RANK[before],
    };
  });

  const improved = personaTransitions.filter((t) => t.improved);

  const interventionImpacts = sandbox.interventions.map((intervention) => {
    const entry = INTERVENTION_CATALOG[intervention.type];
    const moved = improved.filter((t) => {
      const afterPersona = after.personas.find(
        (p) => p.personaId === t.personaId,
      )!;
      const basePersona = baseline.personas.find(
        (p) => p.personaId === t.personaId,
      );
      if (citesIntervention(afterPersona, intervention.type)) return true;
      // No explicit citation (AI-decided): attribute by failure category match.
      if (anyInterventionCited(afterPersona)) return false;
      const cat = baselineFailureCategory(basePersona);
      return cat !== null && entry.categories.includes(cat);
    });
    return {
      interventionId: intervention.id,
      type: intervention.type,
      label: intervention.label,
      movedPersonas: moved.map((t) => ({
        personaId: t.personaId,
        personaName: t.personaName,
        from: t.before,
        to: t.after,
      })),
      summary: moved.length
        ? `${intervention.label} moved ${moved
            .map((t) => `${t.personaName} (${t.before}→${t.after})`)
            .join(", ")}.`
        : `${intervention.label} did not change any persona's outcome.`,
    };
  });

  return {
    sandboxId: sandbox.id,
    baseline: { id: baseline.id, aggregate: baseline.aggregate },
    after: { id: after.id, aggregate: after.aggregate },
    personaTransitions,
    interventionImpacts,
    requiresHumanValidation:
      after.requiresHumanValidation ||
      improved.some((t) => {
        const p = after.personas.find((x) => x.personaId === t.personaId)!;
        return p.outcomes.some(
          (o) => o.decidedBy === "ai" && o.requiresHumanValidation,
        );
      }),
  };
}

function citesIntervention(persona: PersonaReplay, type: string): boolean {
  return persona.outcomes.some((o) =>
    o.evidence.some((e) => e.includes(`intervention = ${type}`)),
  );
}

function anyInterventionCited(persona: PersonaReplay): boolean {
  return persona.outcomes.some((o) =>
    o.evidence.some((e) => e.startsWith("intervention = ")),
  );
}

function baselineFailureCategory(
  persona: PersonaReplay | undefined,
): FailureCategory | null {
  const failing = persona?.outcomes.find((o) => o.status !== "PASS");
  return failing?.category ?? null;
}
