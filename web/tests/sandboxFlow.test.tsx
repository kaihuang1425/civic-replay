import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SandboxFlow } from "../src/components/SandboxFlow.js";
import { labels } from "../src/assets/index.js";
import { useStore } from "../src/store.js";
import { floodSeed } from "./fixtures.js";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  useStore.setState({ sandbox: null, runs: [], viewMode: "flow" });
});

describe("SandboxFlow step cards", () => {
  it("shows the number badge and label on one line, with no step-kind icon, in flowchart mode", () => {
    const sandbox = floodSeed();
    useStore.setState({ sandbox, viewMode: "flow", runs: [] });
    const { container } = render(<SandboxFlow />);

    const heads = container.querySelectorAll(".step-head");
    expect(heads).toHaveLength(sandbox.service.steps.length);
    heads.forEach((head, i) => {
      expect(head.querySelector(".n")?.textContent).toBe(String(i + 1));
      expect(head.textContent).toContain(sandbox.service.steps[i]!.label);
      expect(head.querySelector("img")).toBeNull();
    });
  });

  it("shows no step-kind icon in journey mode either", () => {
    useStore.setState({ sandbox: floodSeed(), viewMode: "journey", runs: [] });
    const { container } = render(<SandboxFlow />);
    expect(container.querySelectorAll(".step-head img")).toHaveLength(0);
  });
});

describe("SandboxFlow empty state", () => {
  it("shows the create-scenario empty state before a sandbox exists, and focuses the input", () => {
    useStore.setState({ sandbox: null, runs: [] });
    document.body.innerHTML = '<textarea id="scenario-input"></textarea>';
    const input = document.getElementById("scenario-input") as HTMLTextAreaElement;
    const host = document.createElement("div");
    document.body.appendChild(host);

    render(<SandboxFlow />, { container: host });
    expect(screen.getByText(labels.emptyStates.createScenario.title)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: labels.emptyStates.createScenario.action }));
    expect(document.activeElement).toBe(input);
  });

  it("disappears once a sandbox is loaded", () => {
    useStore.setState({ sandbox: floodSeed(), viewMode: "flow", runs: [] });
    render(<SandboxFlow />);
    expect(screen.queryByText(labels.emptyStates.createScenario.title)).toBeNull();
  });
});
