import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sandbox } from "@civic-replay/shared";
import { floodSeed } from "./fixtures.js";
import { App } from "../src/App.js";

const { generate, preview, replay } = vi.hoisted(() => ({
  generate: vi.fn(),
  preview: vi.fn(),
  replay: vi.fn(),
}));

vi.mock("../src/api.js", () => ({
  api: {
    health: vi.fn().mockResolvedValue({ provider: "ollama", available: true, model: "m" }),
    templates: vi.fn().mockResolvedValue([
      {
        id: "vaccine-booking",
        name: "疫苗預約",
        description: "d",
        scenarioDescription: "疫苗預約情境",
        settings: {
          scenarioType: "預約制服務",
          channels: [],
          eligibilityRules: [],
          fallbackOptions: [],
          personaCount: 6,
        },
      },
    ]),
    listSandboxes: vi.fn().mockResolvedValue([]),
    generate,
    preview,
    replay,
    saveSandbox: vi.fn(async (s: Sandbox) => ({ ...s, id: "sb_saved", updatedAt: "t" })),
    updateSandbox: vi.fn(async (s: Sandbox) => s),
    exportUrl: (id: string) => `/api/sandboxes/${id}/export`,
    addIntervention: vi.fn(),
    diff: vi.fn(),
  },
}));

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  preview.mockResolvedValue({
    risks: [
      { id: "r1", title: "資訊落差", severity: "high", cause: "BLOCKED:access:x", affectedPersonaIds: [] },
    ],
    suggestedInterventions: [
      { type: "phone_fallback", label: "市內電話通知", rationale: "緩解風險" },
    ],
    estimatedDistribution: { pass: 0.5, needHelp: 0.3, blocked: 0.2 },
    estimateLabel: "AI 估算",
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App shell", () => {
  it("renders the header and disables Run Replay until a sandbox exists", async () => {
    mount();
    expect(screen.getByText("Civic Replay")).toBeTruthy();
    const runBtn = screen.getByRole("button", { name: /執行預演/ }) as HTMLButtonElement;
    expect(runBtn.disabled).toBe(true);
  });

  it("shows the brand mark in the header with or without a loaded sandbox", async () => {
    const { container } = mount();
    expect(container.querySelector(".brand img")).toBeTruthy();

    generate.mockResolvedValue(floodSeed());
    fireEvent.change(screen.getByLabelText("模擬情境描述"), {
      target: { value: "豪雨淹水" },
    });
    fireEvent.click(screen.getByRole("button", { name: /生成沙盤/ }));
    await waitFor(() => expect(generate).toHaveBeenCalled());

    expect(container.querySelector(".brand img")).toBeTruthy();
  });

  it("shows a quick-template chip from the templates query", async () => {
    mount();
    expect(await screen.findByText("疫苗預約")).toBeTruthy();
  });

  it("generating a sandbox populates the panels and enables Run Replay", async () => {
    generate.mockResolvedValue(floodSeed());
    mount();

    fireEvent.change(screen.getByLabelText("模擬情境描述"), {
      target: { value: "豪雨淹水" },
    });
    fireEvent.click(screen.getByRole("button", { name: /生成沙盤/ }));

    await waitFor(() => expect(generate).toHaveBeenCalled());
    expect(await screen.findByText("收到警報")).toBeTruthy();
    expect(screen.getByText("風險偵測 Top 5")).toBeTruthy();
    await waitFor(() => {
      const runBtn = screen.getByRole("button", { name: /執行預演/ }) as HTMLButtonElement;
      expect(runBtn.disabled).toBe(false);
    });
  });

  it("shows a spinner and disables Run Replay while a replay is in flight", async () => {
    generate.mockResolvedValue(floodSeed());
    let resolveReplay!: (v: unknown) => void;
    replay.mockReturnValue(new Promise((res) => (resolveReplay = res)));
    const { container } = mount();

    fireEvent.change(screen.getByLabelText("模擬情境描述"), {
      target: { value: "豪雨淹水" },
    });
    fireEvent.click(screen.getByRole("button", { name: /生成沙盤/ }));
    await waitFor(() => {
      const runBtn = screen.getByRole("button", { name: /執行預演/ }) as HTMLButtonElement;
      expect(runBtn.disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: /執行預演/ }));

    const runBtn = await screen.findByRole("button", { name: /預演中/ });
    expect((runBtn as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector(".spinner")).toBeTruthy();

    resolveReplay({
      id: "rr_1",
      sandboxId: "sb",
      interventionFingerprint: "fp",
      useAi: true,
      createdAt: new Date().toISOString(),
      personas: [],
      aggregate: { total: 0, reached: 0, ableToAct: 0, unresolved: 0 },
      requiresHumanValidation: false,
    });
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /執行預演/ }) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });
});
