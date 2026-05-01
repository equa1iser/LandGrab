import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRegister = vi.fn();
vi.mock("@/lib/store/authStore", () => ({
  useAuthStore: () => ({
    register: mockRegister,
    isLoading: false,
  }),
}));

import RegisterPage from "@/app/auth/register/page";

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPush.mockClear();
  mockRegister.mockClear();
});

// Guard against fake timers leaking between tests
afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("RegisterPage", () => {
  it("renders the registration form", () => {
    render(<RegisterPage />);
    expect(screen.getByPlaceholderText("John Smith")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min. 8 characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows an error when the password is too short", async () => {
    render(<RegisterPage />);
    await userEvent.type(screen.getByPlaceholderText("John Smith"), "Jane Doe");
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "jane@example.com");
    await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "short");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("calls register, shows success banner, then redirects after 1.5s", async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    render(<RegisterPage />);

    await userEvent.type(screen.getByPlaceholderText("John Smith"), "Jane Doe");
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "jane@example.com");
    await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    // Success banner must appear immediately after the API call resolves
    await waitFor(() => expect(screen.getByText(/account created/i)).toBeInTheDocument());

    // Router push fires after the 1500ms setTimeout — give it up to 3s
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"), { timeout: 3000 });
  }, 10000);

  it("shows a network error when the backend is unreachable", async () => {
    mockRegister.mockRejectedValueOnce({ code: "ERR_NETWORK" });
    render(<RegisterPage />);

    await userEvent.type(screen.getByPlaceholderText("John Smith"), "Jane Doe");
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "jane@example.com");
    await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/cannot connect to server/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a conflict error for a duplicate email", async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { detail: "Email already registered" } },
    });
    render(<RegisterPage />);

    await userEvent.type(screen.getByPlaceholderText("John Smith"), "Jane Doe");
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "dup@example.com");
    await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });

  it("shows a generic error for unexpected failures", async () => {
    mockRegister.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    render(<RegisterPage />);

    await userEvent.type(screen.getByPlaceholderText("John Smith"), "Jane Doe");
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "jane@example.com");
    await userEvent.type(screen.getByPlaceholderText("Min. 8 characters"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/registration failed/i)).toBeInTheDocument();
  });

  it("has a link to the sign-in page", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/auth/login");
  });
});
