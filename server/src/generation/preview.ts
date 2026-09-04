import {
  INTERVENTION_CATALOG,
  type FailureCategory,
  type InterventionType,
  type PreviewAnalysis,
  type RiskItem,
  type RiskSeverity,
  type Sandbox,
} from "@civic-replay/shared";
import { initialCitizenState } from "../engine/citizenState.js";
import { evaluate as evaluateRule } from "../engine/ruleEngine.js";

interface RawIssue {
  personaId: string;
  stepId: string;
  stepLabel: string;
  category: FailureCategory;
  status: "NEED_HELP" | "BLOCKED" | "UNCERTAIN";
  key: string;
  label: string;
}

/**
 * Cheap rule-only dry analysis for the preview panel — no AI calls, no
 * BLOCKED short-circuit, so every latent risk surfaces.
 */
export function analyzeSandbox(sandbox: Sandbox): PreviewAnalysis {
  const issues: RawIssue[] = [];
  const outcomeCounts = { pass: 0, needHelp: 0, blocked: 0 };

  for (const persona of sandbox.personas) {
    const state = initialCitizenState(sandbox.scenario, persona);
    let personaOutcome: "PASS" | "NEED_HELP" | "BLOCKED" = "PASS";
    let stopped = false;

    for (const step of sandbox.service.steps) {
      const ruled = evaluateRule(step, persona, state, sandbox);
      if (!ruled.decided || !ruled.outcome) {
        issues.push({
          personaId: persona.id,
          stepId: step.id,
          stepLabel: step.label,
          category: step.kind === "understand" ? "comprehension" : "action",
          status: "UNCERTAIN",
          key: `uncertain:${step.kind}`,
          label: `「${step.label}」需人工 / AI 判讀是否可完成`,
        });
        if (personaOutcome === "PASS") personaOutcome = "NEED_HELP";
        continue;
      }
      const o = ruled.outcome;
      if (o.status === "NEED_HELP") {
        issues.push(issueOf(persona.id, step.label, step.id, o.category, "NEED_HELP", o.evidence));
        if (personaOutcome === "PASS") personaOutcome = "NEED_HELP";
      } else if (o.status === "BLOCKED") {
        issues.push(issueOf(persona.id, step.label, step.id, o.category, "BLOCKED", o.evidence));
        personaOutcome = "BLOCKED";
        stopped = true;
      }
      if (stopped) break;
    }

    if (personaOutcome === "PASS") outcomeCounts.pass++;
    else if (personaOutcome === "NEED_HELP") outcomeCounts.needHelp++;
    else outcomeCounts.blocked++;
  }

  const risks = rankRisks(issues);
  const total = sandbox.personas.length || 1;

  return {
    risks,
    suggestedInterventions: suggestInterventions(risks, sandbox),
    estimatedDistribution: {
      pass: round(outcomeCounts.pass / total),
      needHelp: round(outcomeCounts.needHelp / total),
      blocked: round(outcomeCounts.blocked / total),
    },
    estimateLabel: "AI 估算，實際結果將依資料與政策調整",
  };
}

function issueOf(
  personaId: string,
  stepLabel: string,
  stepId: string,
  category: FailureCategory,
  status: "NEED_HELP" | "BLOCKED",
  evidence: string[],
): RawIssue {
  const cause = evidence.find((e) => e.includes("=")) ?? category;
  return {
    personaId,
    stepId,
    stepLabel,
    category,
    status,
    key: `${status}:${category}:${cause}`,
    label:
      status === "BLOCKED"
        ? `「${stepLabel}」有居民完全無法完成（${category}）`
        : `「${stepLabel}」有居民需要協助才能完成（${category}）`,
  };
}

function rankRisks(issues: RawIssue[]): RiskItem[] {
  const groups = new Map<string, RawIssue[]>();
  for (const issue of issues) {
    const arr = groups.get(issue.key) ?? [];
    arr.push(issue);
    groups.set(issue.key, arr);
  }

  const items: RiskItem[] = [...groups.entries()].map(([key, group], i) => {
    const affected = [...new Set(group.map((g) => g.personaId))];
    const worst = group.some((g) => g.status === "BLOCKED")
      ? "BLOCKED"
      : group.some((g) => g.status === "NEED_HELP")
        ? "NEED_HELP"
        : "UNCERTAIN";
    return {
      id: `risk_${i + 1}`,
      title: group[0]!.label,
      severity: severityOf(worst, affected.length),
      cause: key,
      affectedPersonaIds: affected,
    };
  });

  return items
    .sort(
      (a, b) =>
        severityRank(b.severity) - severityRank(a.severity) ||
        b.affectedPersonaIds.length - a.affectedPersonaIds.length,
    )
    .slice(0, 5);
}

function severityOf(
  worst: "BLOCKED" | "NEED_HELP" | "UNCERTAIN",
  affected: number,
): RiskSeverity {
  if (worst === "BLOCKED") return affected >= 2 ? "high" : "medium-high";
  if (worst === "NEED_HELP") return affected >= 2 ? "medium-high" : "medium";
  return "medium";
}

function severityRank(s: RiskSeverity): number {
  return { high: 3, "medium-high": 2, medium: 1, low: 0 }[s];
}

function suggestInterventions(risks: RiskItem[], sandbox: Sandbox) {
  const present = new Set(sandbox.interventions.map((i) => i.type));
  const byCategory: Record<FailureCategory, InterventionType[]> = {
    access: ["phone_fallback", "volunteer_escalation"],
    comprehension: ["multilingual_instructions", "family_proxy_assistance"],
    action: ["volunteer_escalation", "family_proxy_assistance"],
  };
  const seen = new Set<InterventionType>();
  const out: PreviewAnalysis["suggestedInterventions"] = [];
  for (const risk of risks) {
    const category = (risk.cause.split(":")[1] as FailureCategory) ?? "access";
    for (const type of byCategory[category] ?? []) {
      if (seen.has(type) || present.has(type)) continue;
      seen.add(type);
      out.push({
        type,
        label: INTERVENTION_CATALOG[type].label,
        rationale: `緩解「${risk.title}」`,
      });
    }
  }
  return out.slice(0, 4);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
