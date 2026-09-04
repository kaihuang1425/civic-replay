import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Template } from "@civic-replay/shared";
import { GenerationSettings } from "../src/components/GenerationSettings.js";
import { CATEGORY_ICONS } from "../src/assets/index.js";
import { useStore } from "../src/store.js";

afterEach(() => {
  cleanup();
  useStore.setState({ sandbox: null });
});

const baseSettings: Template["settings"] = {
  scenarioType: "x",
  channels: [],
  eligibilityRules: [],
  fallbackOptions: [],
  personaCount: 6,
};

function template(id: string, name: string): Template {
  return { id, name, description: "d", scenarioDescription: "s", settings: baseSettings };
}

describe("Template chip category icons", () => {
  it("shows the category icon for each mapped template and none for an unmapped one", () => {
    const templates: Template[] = [
      template("heavy-rain-flooding", "豪雨／淹水"),
      template("disaster-relief", "災害救助"),
      template("childcare-subsidy", "育兒補助"),
      template("vaccine-booking", "疫苗預約"),
      template("rent-subsidy", "租屋補貼"),
      template("unmapped-template", "更多模板"),
    ];

    const { getByText } = render(
      <GenerationSettings description="" setDescription={() => {}} templates={templates} />,
    );

    for (const t of templates) {
      const chip = getByText(t.name).closest("button")!;
      const icon = chip.querySelector("img.category-icon");
      const expected = CATEGORY_ICONS[t.id];
      if (expected) {
        expect(icon?.getAttribute("src"), t.id).toBe(expected);
      } else {
        expect(icon, t.id).toBeNull();
      }
    }
  });
});
