import { randomUUID } from "node:crypto";
import {
  GenerationSettingsSchema,
  SandboxSkeletonSchema,
  type GenerateRequest,
  type GenerationSettings,
  type Persona,
  type Sandbox,
  type SandboxSkeleton,
  type Service,
} from "@civic-replay/shared";
import type { AIProvider } from "../ai/types.js";
import { canonicalPersonas, templateById, templates } from "../seeds.js";
import { buildGenerationPrompt } from "./prompt.js";
import { mergeUserEdits } from "./merge.js";

const DEFAULT_SETTINGS: GenerationSettings = {
  scenarioType: "公共服務流程",
  channels: [],
  eligibilityRules: [],
  fallbackOptions: [],
  personaCount: 6,
};

export interface GenerateOutcome {
  sandbox: Sandbox;
}

export async function generateSandbox(
  provider: AIProvider,
  req: GenerateRequest,
): Promise<Sandbox> {
  const now = new Date().toISOString();
  const settings = resolveSettings(req);

  let skeleton: SandboxSkeleton | null = null;
  let generatedBy: Sandbox["generatedBy"] = "ai";
  try {
    skeleton = await provider.generateStructured(
      SandboxSkeletonSchema,
      buildGenerationPrompt(req.description, settings),
    );
  } catch {
    generatedBy = "fallback";
  }

  let base: Sandbox;
  if (skeleton) {
    base = assembleFromSkeleton(skeleton, settings, generatedBy, now);
  } else {
    base = fallbackSandbox(req.description, settings, now);
  }

  if (req.previous) {
    const prevSettings = req.previous.settings;
    base.userEdited = mergeUserEdits(
      base,
      req.previous,
      prevSettings,
      settings,
    );
    base.id = req.previous.id;
    base.createdAt = req.previous.createdAt;
    base.interventions = req.previous.interventions;
  }

  return base;
}

/* ------------------------------------------------------------------ */

function resolveSettings(req: GenerateRequest): GenerationSettings {
  const inferredType = inferScenarioType(req.description);
  return GenerationSettingsSchema.parse({
    ...DEFAULT_SETTINGS,
    scenarioType: inferredType,
    ...req.previous?.settings,
    ...req.settings,
  });
}

function inferScenarioType(description: string): string {
  const d = description.toLowerCase();
  if (/(淹水|豪雨|颱風|地震|災害|撤離|避難)/.test(description))
    return "災害通報與救助";
  if (/(現金|普發|一次性|給付)/.test(description)) return "一次性現金給付政策";
  if (/(補助|津貼|補貼)/.test(description)) return "定期性補助 / 給付";
  if (/(預約|接種|疫苗)/.test(description)) return "預約制服務";
  if (d.includes("subsid") || d.includes("grant")) return "subsidy program";
  return DEFAULT_SETTINGS.scenarioType;
}

function assembleFromSkeleton(
  skeleton: SandboxSkeleton,
  settings: GenerationSettings,
  generatedBy: Sandbox["generatedBy"],
  now: string,
): Sandbox {
  const service = ensureInPersonChannel(skeleton.service);
  const personas = adaptPersonas(settings.personaCount, service);
  return {
    id: `sb_${randomUUID()}`,
    name: skeleton.name,
    description: skeleton.scenario.event,
    scenario: skeleton.scenario,
    service,
    personas,
    interventions: [],
    highlights: skeleton.highlights,
    settings: {
      ...settings,
      channels: settings.channels.length
        ? settings.channels
        : service.channels.map((c) => c.label),
      eligibilityRules: settings.eligibilityRules.length
        ? settings.eligibilityRules
        : service.eligibilityRules.map((r) => r.text),
      fallbackOptions: settings.fallbackOptions.length
        ? settings.fallbackOptions
        : service.fallbackOptions.map((f) => f.label),
    },
    generatedBy,
    userEdited: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Guarantee at least one channel any resident can use. */
function ensureInPersonChannel(service: Service): Service {
  if (service.channels.some((c) => c.requires.length === 0)) return service;
  return {
    ...service,
    channels: [
      ...service.channels,
      { id: "in_person", label: "臨櫃 / 現場辦理", requires: [] },
    ],
  };
}

function adaptPersonas(count: number, service: Service): Persona[] {
  const seeds = canonicalPersonas();
  const chosen: Persona[] = [];
  for (let i = 0; i < count; i++) {
    const seed = seeds[i % seeds.length]!;
    const persona =
      i < seeds.length
        ? seed
        : { ...seed, id: `${seed.id}_${i}`, name: `${seed.name} #${i + 1}` };
    chosen.push({ ...persona, primaryChannel: pickChannel(persona, service) });
  }
  return chosen;
}

function pickChannel(persona: Persona, service: Service): string {
  const usable = service.channels.find((ch) =>
    ch.requires.every(
      (k) => (persona.conditions as Record<string, unknown>)[k] !== false,
    ),
  );
  return usable?.id ?? service.channels[0]?.id ?? "in_person";
}

/** Deterministic sandbox when the AI provider is unavailable. */
export function fallbackSandbox(
  description: string,
  settings: GenerationSettings,
  now: string,
): Sandbox {
  const template = closestTemplate(description);
  if (template.sandbox) {
    const sb = structuredClone(template.sandbox);
    return {
      ...sb,
      id: `sb_${randomUUID()}`,
      generatedBy: "fallback",
      description,
      createdAt: now,
      updatedAt: now,
      settings: { ...sb.settings, ...settings, personaCount: settings.personaCount },
      personas: sb.personas.slice(0, settings.personaCount),
      userEdited: [],
    };
  }

  const channels = (settings.channels.length ? settings.channels : ["線上申請", "臨櫃辦理"]).map(
    (label, i) => ({
      id: i === 0 ? "online" : `ch_${i}`,
      label,
      requires: i === 0 ? ["has_internet"] : [],
    }),
  );
  const service: Service = {
    steps: [
      { id: "learn", label: "知道服務", kind: "alert", intent: "接收服務資訊", channels: [], requiresTravel: false, jargon: [] },
      { id: "eligibility", label: "確認資格", kind: "understand", intent: "確認自己是否符合", channels: [], requiresTravel: false, jargon: ["排富", "設籍"] },
      { id: "choose", label: "選擇管道", kind: "choose_channel", intent: "決定如何申請", channels: [], requiresTravel: false, jargon: [] },
      { id: "prepare", label: "準備文件", kind: "prepare", intent: "備妥必要文件", channels: [], requiresTravel: false, jargon: [] },
      { id: "verify", label: "身分驗證", kind: "verify_identity", intent: "完成身分確認", channels: [], requiresTravel: false, jargon: [] },
      { id: "result", label: "取得結果", kind: "obtain_result", intent: "領取或入帳", channels: [], requiresTravel: false, jargon: [] },
    ],
    channels,
    eligibilityRules: (settings.eligibilityRules.length
      ? settings.eligibilityRules
      : ["設籍於服務範圍"]
    ).map((text, i) => ({ id: `r${i + 1}`, text })),
    fallbackOptions: settings.fallbackOptions.map((label, i) => ({
      id: `f${i + 1}`,
      label,
    })),
  };
  return {
    id: `sb_${randomUUID()}`,
    name: settings.scenarioType,
    description,
    scenario: {
      theme: settings.scenarioType,
      location: "Demo Community",
      event: description.slice(0, 80),
    },
    service,
    personas: adaptPersonas(settings.personaCount, service),
    interventions: [],
    highlights: {
      theme: settings.scenarioType,
      serviceGoal: "協助符合資格的居民順利完成申請並取得服務",
      coreConstraints: ["資訊落差", "數位落差", "文件準備", "流程複雜"],
      mainChannels: service.channels.map((c) => c.label),
    },
    settings,
    generatedBy: "fallback",
    userEdited: [],
    createdAt: now,
    updatedAt: now,
  };
}

function closestTemplate(description: string) {
  const all = templates();
  const scored = all
    .map((t) => ({
      t,
      score: overlap(description, `${t.name} ${t.description} ${t.scenarioDescription}`),
    }))
    .sort((a, b) => b.score - a.score);
  return templateById(scored[0]!.t.id) ?? all[0]!;
}

function overlap(a: string, b: string): number {
  const grams = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/\s+/g, "")
        .match(/.{2}/g) ?? [],
    );
  const ga = grams(a);
  const gb = grams(b);
  let hits = 0;
  for (const g of ga) if (gb.has(g)) hits++;
  return hits;
}
