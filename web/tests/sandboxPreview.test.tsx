import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Intervention, PersonaReplay, ReplayResult, Sandbox } from "@civic-replay/shared";
import { SandboxPreview } from "../src/components/SandboxPreview.js";
import { labels } from "../src/assets/index.js";
import { useStore } from "../src/store.js";
import { floodSeed } from "./fixtures.js";

const {
  addIntervention,
  removeIntervention,
  replay,
  diff,
  preview,
  saveSandbox,
  updateSandbox,
} = vi.hoisted(() => ({
  addIntervention: vi.fn(),
  removeIntervention: vi.fn(),
  replay: vi.fn(),
  diff: vi.fn(),
  preview: vi.fn(),
  saveSandbox: vi.fn(),
  updateSandbox: vi.fn(),
}));

vi.mock("../src/api.js", () => ({
  api: { addIntervention, removeIntervention, replay, diff, preview, saveSandbox, updateSandbox },
}));

const SUGGESTED_PREVIEW = {
  risks: [],
  suggestedInterventions: [
    { type: "phone_fallback" as const, label: "市內電話通知", rationale: "緩解風險" },
  ],
  estimatedDistribution: { pass: 1, needHelp: 0, blocked: 0 },
  estimateLabel: "AI 估算",
};

const PHONE_FALLBACK: Intervention = {
  id: "iv_1",
  type: "phone_fallback",
  label: "市內電話通知",
  trigger: "line_no_response",
  action: "call_resident",
  stepRef: "alert",
};

function baseSandbox(interventions: Intervention[] = []): Sandbox {
  return { ...floodSeed(), interventions };
}

function replayResult(id: string, fingerprint: string, personas: PersonaReplay[] = []): ReplayResult {
  return {
    id,
    sandboxId: "sb_heavy_rain_flooding",
    interventionFingerprint: fingerprint,
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

afterEach(() => {
  cleanup();
  useStore.setState({ sandbox: null, preview: null, runs: [], busy: null, savedAt: null });
  vi.resetAllMocks();
});

describe("SandboxPreview risk empty state", () => {
  it("shows the no-results empty state when the preview has zero risks", () => {
    useStore.setState({
      sandbox: floodSeed(),
      preview: {
        risks: [],
        suggestedInterventions: [],
        estimatedDistribution: { pass: 1, needHelp: 0, blocked: 0 },
        estimateLabel: "AI 估算",
      },
    });
    render(<SandboxPreview aiDown={false} />);
    expect(screen.getByText(labels.emptyStates.noResults.title)).toBeTruthy();
    expect(screen.getByText(labels.emptyStates.noResults.body)).toBeTruthy();
  });

  it("shows the risk list instead when risks are present", () => {
    useStore.setState({
      sandbox: floodSeed(),
      preview: {
        risks: [
          { id: "r1", title: "測試風險", severity: "high", cause: "x", affectedPersonaIds: [] },
        ],
        suggestedInterventions: [],
        estimatedDistribution: { pass: 1, needHelp: 0, blocked: 0 },
        estimateLabel: "AI 估算",
      },
    });
    render(<SandboxPreview aiDown={false} />);
    expect(screen.queryByText(labels.emptyStates.noResults.title)).toBeNull();
    expect(screen.getByText(/測試風險/)).toBeTruthy();
  });
});

describe("Suggested Interventions checkbox", () => {
  it("is unchecked for a suggestion not yet applied, checked when already applied", () => {
    const { rerender } = render(<SandboxPreview aiDown={false} />);
    useStore.setState({ sandbox: baseSandbox(), preview: SUGGESTED_PREVIEW });
    rerender(<SandboxPreview aiDown={false} />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);

    useStore.setState({ sandbox: baseSandbox([PHONE_FALLBACK]) });
    rerender(<SandboxPreview aiDown={false} />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });

  it("keeps a checked suggestion visible after the server stops suggesting it", () => {
    // The server excludes already-applied interventions from
    // suggestedInterventions (it's no longer a "suggestion") - the row must
    // still render from sandbox.interventions so the user can see and
    // uncheck it, instead of the checkbox disappearing once checked.
    useStore.setState({
      sandbox: baseSandbox([PHONE_FALLBACK]),
      preview: { ...SUGGESTED_PREVIEW, suggestedInterventions: [] },
    });
    render(<SandboxPreview aiDown={false} />);
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText(/市內電話通知/)).toBeTruthy();
  });

  it("checking a suggestion applies it without triggering a replay", async () => {
    const sandbox = baseSandbox();
    useStore.setState({ sandbox, preview: SUGGESTED_PREVIEW, savedAt: sandbox.updatedAt });
    updateSandbox.mockImplementation(async (s: Sandbox) => s);
    addIntervention.mockResolvedValue(baseSandbox([PHONE_FALLBACK]));
    preview.mockResolvedValue(SUGGESTED_PREVIEW);

    render(<SandboxPreview aiDown={false} />);
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() =>
      expect(addIntervention).toHaveBeenCalledWith(sandbox.id, "phone_fallback", "alert"),
    );
    await waitFor(() =>
      expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true),
    );
    expect(replay).not.toHaveBeenCalled();
    expect(diff).not.toHaveBeenCalled();
  });

  it("unchecking an applied suggestion removes it without triggering a replay", async () => {
    const sandbox = baseSandbox([PHONE_FALLBACK]);
    useStore.setState({ sandbox, preview: SUGGESTED_PREVIEW, savedAt: sandbox.updatedAt });
    removeIntervention.mockResolvedValue(baseSandbox([]));
    preview.mockResolvedValue(SUGGESTED_PREVIEW);

    render(<SandboxPreview aiDown={false} />);
    fireEvent.click(screen.getByRole("checkbox"));

    await waitFor(() => expect(removeIntervention).toHaveBeenCalledWith(sandbox.id, "iv_1"));
    await waitFor(() =>
      expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false),
    );
    expect(replay).not.toHaveBeenCalled();
    expect(diff).not.toHaveBeenCalled();
  });

  it("does not disable another suggestion's checkbox while one toggle is in flight", async () => {
    const sandbox = baseSandbox();
    const twoSuggestions = {
      ...SUGGESTED_PREVIEW,
      suggestedInterventions: [
        { type: "phone_fallback" as const, label: "市內電話通知", rationale: "A" },
        { type: "volunteer_escalation" as const, label: "志工 / 里長人工確認", rationale: "B" },
      ],
    };
    useStore.setState({ sandbox, preview: twoSuggestions, savedAt: sandbox.updatedAt });

    updateSandbox.mockImplementation(async (s: Sandbox) => s);
    preview.mockResolvedValue(twoSuggestions);
    let resolveAddA!: (s: Sandbox) => void;
    addIntervention.mockImplementation((_id: string, type: string) => {
      if (type === "phone_fallback") {
        return new Promise<Sandbox>((res) => (resolveAddA = res));
      }
      return Promise.resolve(
        baseSandbox([{ ...PHONE_FALLBACK, id: "iv_2", type: "volunteer_escalation" }]),
      );
    });

    render(<SandboxPreview aiDown={false} />);
    const [checkboxA, checkboxB] = screen.getAllByRole("checkbox") as HTMLInputElement[];

    fireEvent.click(checkboxA!);
    await waitFor(() => expect(checkboxA!.disabled).toBe(true));
    // Checking A must not disable B.
    expect(checkboxB!.disabled).toBe(false);

    fireEvent.click(checkboxB!);
    await waitFor(() =>
      expect(addIntervention).toHaveBeenCalledWith(sandbox.id, "volunteer_escalation", "all"),
    );

    resolveAddA(baseSandbox([PHONE_FALLBACK]));
    await waitFor(() => expect(checkboxA!.disabled).toBe(false));
  });
});

describe("重新模擬 button", () => {
  it("only runs a replay when clicked, shows a spinner and disables itself while running, with no per-checkbox pending hint", async () => {
    const sandbox = baseSandbox([PHONE_FALLBACK]);
    useStore.setState({ sandbox, preview: SUGGESTED_PREVIEW, savedAt: sandbox.updatedAt, runs: [] });

    updateSandbox.mockImplementation(async (s: Sandbox) => s);
    preview.mockResolvedValue(SUGGESTED_PREVIEW);
    let resolveReplay!: (r: ReplayResult) => void;
    replay.mockReturnValue(new Promise((res) => (resolveReplay = res)));

    const { container } = render(<SandboxPreview aiDown={false} />);
    expect(replay).not.toHaveBeenCalled();
    expect(screen.queryByText("模擬中，稍候查看受影響的角色…")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /重新模擬/ }));

    const busyBtn = await screen.findByRole("button", { name: /模擬中/ });
    expect((busyBtn as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector(".spinner")).toBeTruthy();
    expect(screen.queryByText("模擬中，稍候查看受影響的角色…")).toBeNull();

    resolveReplay(replayResult("rr_1", "fp1"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "重新模擬" })).toBeTruthy(),
    );
  });
});
