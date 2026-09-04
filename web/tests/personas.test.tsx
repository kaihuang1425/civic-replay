import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Personas } from "../src/components/Personas.js";
import { PERSONA_AVATARS } from "../src/assets/index.js";
import { useStore } from "../src/store.js";
import { floodSeed } from "./fixtures.js";

afterEach(() => {
  cleanup();
  useStore.setState({ sandbox: null, runs: [] });
});

describe("Persona avatars", () => {
  it("renders the matching avatar image for each of the 6 canonical personas", () => {
    useStore.setState({ sandbox: floodSeed(), runs: [] });
    const { container } = render(<Personas />);
    const sandbox = floodSeed();
    for (const persona of sandbox.personas) {
      const card = [...container.querySelectorAll(".persona")].find((el) =>
        el.textContent?.includes(persona.name),
      )!;
      const img = card.querySelector("img.persona-avatar") as HTMLImageElement | null;
      expect(img, persona.id).toBeTruthy();
      expect(img!.getAttribute("src")).toBe(PERSONA_AVATARS[persona.id]);
    }
  });

  it("shows the text/initial placeholder, not a guessed avatar, for a non-canonical persona", () => {
    const sandbox = floodSeed();
    sandbox.personas.push({
      id: "custom_7_999",
      name: "自訂居民 7",
      descriptor: "新增樣本",
      primaryChannel: sandbox.service.channels[0]!.id,
      tags: [],
      conditions: {},
    });
    useStore.setState({ sandbox, runs: [] });
    const { container } = render(<Personas />);

    const card = [...container.querySelectorAll(".persona")].find((el) =>
      el.textContent?.includes("自訂居民 7"),
    )!;
    expect(card.querySelector("img.persona-avatar")).toBeNull();
    const placeholder = card.querySelector(".persona-avatar-initial");
    expect(placeholder).toBeTruthy();
    expect(placeholder!.textContent).toBe("自");
    expect(card.textContent).toContain("自訂居民 7");
  });
});
