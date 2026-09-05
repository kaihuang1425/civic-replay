import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PersonaReplay, ReplayResult } from "@civic-replay/shared";
import { ReplayView } from "../src/components/ReplayView.js";
import { STATUS_ICONS, labels } from "../src/assets/index.js";
import { useStore } from "../src/store.js";
import { floodSeed } from "./fixtures.js";

const { diff } = vi.hoisted(() => ({ diff: vi.fn() }));
vi.mock("../src/api.js", () => ({ api: { diff } }));

afterEach(() => {
  cleanup();
  useStore.setState({ sandbox: null, runs: [], busy: null });
  vi.resetAllMocks();
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

  it("shows a spinner and disables the start-simulation action while a replay is running", () => {
    const sandbox = floodSeed();
    useStore.setState({ sandbox, runs: [], busy: "replaying" });
    const { container } = render(<ReplayView aiDown={false} />);

    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(container.querySelector(".spinner")).toBeTruthy();
    expect(screen.queryByText(labels.emptyStates.startSimulation.action)).toBeNull();
  });
});

describe("ReplayView before/after transition", () => {
  it("shows a changed persona's before -> after status inline once a diff against the baseline run resolves", async () => {
    const sandbox = floodSeed();
    const before = result([personaResult("p1", "NEED_HELP"), personaResult("p2", "PASS")]);
    const after = { ...result([personaResult("p1", "PASS"), personaResult("p2", "PASS")]), id: "rr_2" };

    diff.mockResolvedValue({
      sandboxId: sandbox.id,
      baseline: { id: before.id, aggregate: before.aggregate },
      after: { id: after.id, aggregate: after.aggregate },
      personaTransitions: [
        { personaId: "p1", personaName: "p1", before: "NEED_HELP", after: "PASS", changed: true, improved: true },
        { personaId: "p2", personaName: "p2", before: "PASS", after: "PASS", changed: false, improved: false },
      ],
      interventionImpacts: [],
      requiresHumanValidation: false,
    });

    useStore.setState({
      sandbox,
      runs: [
        { fingerprint: "fp0", interventionCount: 0, result: before },
        { fingerprint: "fp1", interventionCount: 1, result: after },
      ],
    });
    render(<ReplayView aiDown={false} />);

    await waitFor(() => expect(diff).toHaveBeenCalledWith(sandbox.id, before.id, after.id));
    expect(await screen.findByText(/🟠 需要協助 → 🟢 順利完成/)).toBeTruthy();
    // p2 didn't change - shown as plain current status, no arrow.
    const rows = [...document.querySelectorAll(".results-row")];
    const p2Row = rows.find((r) => r.textContent?.includes("p2"))!;
    expect(p2Row.textContent).toContain("🟢 順利完成");
    expect(p2Row.textContent).not.toContain("→");
  });

  it("does not show the separate Replay Diff comparison block anymore", () => {
    const sandbox = floodSeed();
    useStore.setState({
      sandbox,
      runs: [{ fingerprint: "fp0", interventionCount: 0, result: result([personaResult("p1", "PASS")]) }],
    });
    render(<ReplayView aiDown={false} />);
    expect(screen.queryByText(/比較前後/)).toBeNull();
    expect(diff).not.toHaveBeenCalled();
  });
});
