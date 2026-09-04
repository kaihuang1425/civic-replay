import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SandboxPreview } from "../src/components/SandboxPreview.js";
import { labels } from "../src/assets/index.js";
import { useStore } from "../src/store.js";
import { floodSeed } from "./fixtures.js";

afterEach(() => {
  cleanup();
  useStore.setState({ sandbox: null, preview: null });
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
    render(<SandboxPreview />);
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
    render(<SandboxPreview />);
    expect(screen.queryByText(labels.emptyStates.noResults.title)).toBeNull();
    expect(screen.getByText(/測試風險/)).toBeTruthy();
  });
});
