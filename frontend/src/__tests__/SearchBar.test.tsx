import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "@/components/search/SearchBar";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  mockPush.mockClear();
});

describe("SearchBar", () => {
  it("renders the input and GO button", () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText("Address, city, or ZIP...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go/i })).toBeInTheDocument();
  });

  it("shows the initial value when provided", () => {
    render(<SearchBar initialValue="Austin TX" />);
    expect(screen.getByDisplayValue("Austin TX")).toBeInTheDocument();
  });

  it("updates the input as the user types", async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText("Address, city, or ZIP...");
    await userEvent.type(input, "Denver CO");
    expect(input).toHaveValue("Denver CO");
  });

  it("navigates to /search on form submit", async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText("Address, city, or ZIP...");
    await userEvent.type(input, "Austin TX");
    await userEvent.click(screen.getByRole("button", { name: /go/i }));
    expect(mockPush).toHaveBeenCalledWith("/search?q=Austin%20TX");
  });

  it("does not navigate when the query is empty", async () => {
    render(<SearchBar />);
    await userEvent.click(screen.getByRole("button", { name: /go/i }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not navigate for a whitespace-only query", async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText("Address, city, or ZIP...");
    await userEvent.type(input, "   ");
    await userEvent.click(screen.getByRole("button", { name: /go/i }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows the clear button only when there is text", async () => {
    render(<SearchBar />);
    expect(screen.queryByRole("button", { name: "" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Address, city, or ZIP..."), "X");
    // There are now two buttons: clear (no text) and GO
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("clears the input when the clear button is clicked", async () => {
    render(<SearchBar initialValue="Austin" />);
    const input = screen.getByDisplayValue("Austin");
    const buttons = screen.getAllByRole("button");
    const clearBtn = buttons.find((b) => b.getAttribute("type") === "button");
    await userEvent.click(clearBtn!);
    expect(input).toHaveValue("");
  });

  it("renders in compact mode without visual errors", () => {
    render(<SearchBar compact />);
    expect(screen.getByPlaceholderText("Address, city, or ZIP...")).toBeInTheDocument();
  });
});
