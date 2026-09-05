import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "../src/components/EmptyState.js";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders image/title/body and no button without onAction", () => {
    render(<EmptyState image="/x.png" title="標題" body="內文" />);
    expect(screen.getByText("標題")).toBeTruthy();
    expect(screen.getByText("內文")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the action button and calls onAction when clicked", () => {
    const onAction = vi.fn();
    render(
      <EmptyState image="/x.png" title="標題" body="內文" action="開始" onAction={onAction} />,
    );
    const btn = screen.getByRole("button", { name: "開始" });
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("shows a spinner and disables the action button while busy", () => {
    const onAction = vi.fn();
    const { container } = render(
      <EmptyState
        image="/x.png"
        title="標題"
        body="內文"
        action="開始"
        onAction={onAction}
        busy
      />,
    );
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(container.querySelector(".spinner")).toBeTruthy();
    expect(screen.queryByText("開始")).toBeNull();
  });
});
