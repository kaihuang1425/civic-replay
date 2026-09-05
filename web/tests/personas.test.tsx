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

describe("Persona panel actions", () => {
  it("does not render an add/adjust-persona control", () => {
    useStore.setState({ sandbox: floodSeed(), runs: [] });
    const { container } = render(<Personas />);
    expect(container.textContent).not.toContain("新增或調整 Persona");
    expect(
      [...container.querySelectorAll("button")].some((b) =>
        b.textContent?.includes("Persona"),
      ),
    ).toBe(false);
  });
});

describe("Persona card conditions", () => {
  it("renders conditions as human-readable Chinese sentences, not key = value pairs", () => {
    useStore.setState({ sandbox: floodSeed(), runs: [] });
    const { container } = render(<Personas />);
    const card = [...container.querySelectorAll(".persona")].find((el) =>
      el.textContent?.includes("獨居長者"),
    )!;
    const text = card.textContent ?? "";

    for (const sentence of ["年齡 78 歲", "獨居", "沒有使用 LINE", "數位能力：低"]) {
      expect(text).toContain(sentence);
    }
    expect(text).not.toMatch(/[a-z_]+ = /);
    expect(text).not.toContain("digital_literacy");
    expect(text).not.toContain("low");
  });
});
