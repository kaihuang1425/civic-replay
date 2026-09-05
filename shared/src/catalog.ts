import type { FailureCategory, InterventionType } from "./schemas.js";

/** Static description of each intervention the designer can add to a sandbox. */
export interface InterventionCatalogEntry {
  type: InterventionType;
  label: string;
  trigger: string;
  action: string;
  /** Default step ref this intervention attaches to ("all", a step id, or kind). */
  defaultStepRef: string;
  /** Failure categories this intervention can resolve. */
  categories: FailureCategory[];
  /** Persona condition keys this intervention is relevant to. */
  conditionKeys: string[];
}

export const INTERVENTION_CATALOG: Record<
  InterventionType,
  InterventionCatalogEntry
> = {
  phone_fallback: {
    type: "phone_fallback",
    label: "市內電話通知",
    trigger: "line_no_response",
    action: "call_resident",
    defaultStepRef: "alert",
    categories: ["access"],
    conditionKeys: ["uses_line", "has_smartphone", "has_internet"],
  },
  volunteer_escalation: {
    type: "volunteer_escalation",
    label: "志工 / 里長人工確認",
    trigger: "no_response_after_fallback",
    action: "flag_for_manual_contact_and_assistance",
    defaultStepRef: "all",
    categories: ["access", "action"],
    conditionKeys: ["uses_line", "has_smartphone", "mobility", "has_vehicle"],
  },
  multilingual_instructions: {
    type: "multilingual_instructions",
    label: "多語言說明",
    trigger: "comprehension_barrier",
    action: "provide_multilingual_content",
    defaultStepRef: "understand",
    categories: ["comprehension"],
    conditionKeys: ["chinese_reading", "digital_literacy"],
  },
  family_proxy_assistance: {
    type: "family_proxy_assistance",
    label: "家人 / 代理協助",
    trigger: "cannot_act_alone",
    action: "allow_proxy_to_act_and_verify",
    defaultStepRef: "all",
    categories: ["action", "comprehension"],
    conditionKeys: ["needs_proxy", "mobility", "has_vehicle", "digital_literacy"],
  },
};

export const INTERVENTION_TYPES = Object.keys(
  INTERVENTION_CATALOG,
) as InterventionType[];
