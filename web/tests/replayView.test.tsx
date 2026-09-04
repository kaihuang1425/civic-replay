import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PersonaReplay, ReplayResult } from "@civic-replay/shared";
import { ReplayView } from "../src/components/ReplayView.js";
import { STATUS_ICONS, labels } from "../src/assets/index.js";
import { useStore } from "../src/store.js";
import { floodSeed } from "./fixtures.js";

afterEach(() => {
  cleanup();
  useStore.setState({ sandbox: null, runs: [] });
});

function personaResult(id: string, outcome: PersonaReplay["outcome"]): PersonaReplay {
  return {
    personaId: id,
    personaName: id,
    outcomes: [],
    finalState: {
      safe: true,
      location: "home",
      aware: true,
      understands: true,
      evacuation_info: null,
      transport: null,
      needs_assistance: false,
    },
    outcome,
    failurePath: null,
    rootCause: null,
  };
}

function result(personas: PersonaReplay[]): ReplayResult {
  return {
    id: "rr_1",
    sandboxId: "sb_1",
    interventionFingerprint: "fp",
    useAi: false,
    createdAt: new Date().toISOString(),
    personas,
    aggregate: {
      total: personas.length,
      reached: personas.length,
      ableToAct: personas.filter((p) => p.outcome === "PASS").length,
      unresolved: personas.filter((p) => p.outcome === "BLOCKED").length,
    },
    requiresHumanValidation: false,
  };
}

describe("ReplayView status icons", () => {
  it("shows the completed/blocker/failed icon for PASS/NEED_HELP/BLOCKED rows", () => {
    const sandbox = floodSeed();
    const r = result([
      personaResult("p1", "PASS"),
      personaResult("p2", "NEED_HELP"),
      personaResult("p3", "BLOCKED"),
    ]);
    useStore.setState({
      sandbox,
      runs: [{ fingerprint: "fp", interventionCount: 0, result: r }],
    });

    const { container } = render(<ReplayView aiDown={false} />);
    const rows = [...container.querySelectorAll(".results-row")];
    expect(rows).toHaveLength(3);

    const iconSrc = (row: Element) =>
      row.querySelector("img.status-icon-sm")?.getAttribute("src");

    expect(iconSrc(rows[0]!)).toBe(STATUS_ICONS.PASS);
    expect(iconSrc(rows[1]!)).toBe(STATUS_ICONS.NEED_HELP);
    expect(iconSrc(rows[2]!)).toBe(STATUS_ICONS.BLOCKED);
  });
});

describe("ReplayView empty state", () => {
  it("shows the start-simulation empty state before any replay, and the results list after one completes", () => {
    const sandbox = floodSeed();
    useStore.setState({ sandbox, runs: [] });
    const { rerender } = render(<ReplayView aiDown={false} />);

    expect(screen.getByText(labels.emptyStates.startSimulation.title)).toBeTruthy();
    expect(screen.queryByRole("button", { name: labels.emptyStates.startSimulation.action })).toBeTruthy();

    const r = result([personaResult("p1", "PASS")]);
    useStore.setState({ sandbox, runs: [{ fingerprint: "fp", interventionCount: 0, result: r }] });
    rerender(<ReplayView aiDown={false} />);

    expect(screen.queryByText(labels.emptyStates.startSimulation.title)).toBeNull();
    expect(screen.getByText("p1")).toBeTruthy();
  });
});
