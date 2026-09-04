import { describe, expect, it } from "vitest";
import { OutcomeStatus, StepKind } from "@civic-replay/shared";
import {
  CATEGORY_ICONS,
  PERSONA_AVATARS,
  STATUS_ICONS,
  STEP_ICONS,
} from "../src/assets/index.js";

const CANONICAL_PERSONA_IDS = [
  "general",
  "elderly_alone",
  "new_immigrant",
  "mobility_impaired",
  "no_smartphone",
  "family_proxy",
];

describe("asset lookup maps", () => {
  it("STEP_ICONS has exactly the step-kind keys", () => {
    expect(Object.keys(STEP_ICONS).sort()).toEqual([...StepKind.options].sort());
    for (const url of Object.values(STEP_ICONS)) expect(url).toBeTruthy();
  });

  it("STATUS_ICONS has exactly the outcome-status keys", () => {
    expect(Object.keys(STATUS_ICONS).sort()).toEqual(
      [...OutcomeStatus.options].sort(),
    );
  });

  it("PERSONA_AVATARS has exactly the 6 canonical persona ids, no more", () => {
    expect(Object.keys(PERSONA_AVATARS).sort()).toEqual(
      [...CANONICAL_PERSONA_IDS].sort(),
    );
  });

  it("PERSONA_AVATARS has no entry for a non-canonical id", () => {
    expect(PERSONA_AVATARS["custom_7_123"]).toBeUndefined();
    expect(PERSONA_AVATARS["some_ai_generated_id"]).toBeUndefined();
  });

  it("CATEGORY_ICONS covers the known template ids", () => {
    expect(Object.keys(CATEGORY_ICONS).sort()).toEqual(
      [
        "childcare-subsidy",
        "disaster-relief",
        "heavy-rain-flooding",
        "rent-subsidy",
        "vaccine-booking",
      ].sort(),
    );
  });
});
