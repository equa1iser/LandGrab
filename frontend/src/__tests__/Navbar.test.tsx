import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

const mockLogout = vi.fn();
const mockLoadUser = vi.fn();

vi.mock("@/lib/store/authStore", () => ({
  useAuthStore: vi.fn(),
}));

import { Navbar } from "@/components/layout/Navbar";
import { useAuthStore } from "@/lib/store/authStore";

beforeEach(() => {
  mockPush.mockClear();
  mockLogout.mockClear();
  mockLoadUser.mockClear();
  // Default: not authenticated
  (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    user: null,
    isAuthenticated: false,
    loadUser: mockLoadUser,
    logout: mockLogout,
  });
});

describe("Navbar", () => {
  it("shows Sign In when not authenticated", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows the user name and Sign Out when authenticated", () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "1", email: "jane@example.com", full_name: "Jane Doe", tier: "free" },
      isAuthenticated: true,
      loadUser: mockLoadUser,
      logout: mockLogout,
    });
    render(<Navbar />);
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByText("JANE")).toBeInTheDocument();
  });

  it("calls logout and pushes to / on sign-out click", async () => {
    mockLogout.mockResolvedValueOnce(undefined);
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "1", email: "jane@example.com", full_name: "Jane Doe", tier: "free" },
      isAuthenticated: true,
      loadUser: mockLoadUser,
      logout: mockLogout,
    });
    render(<Navbar />);
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("has navigation links to Search and Map", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /search/i })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: /map/i })).toHaveAttribute("href", "/map");
  });

  it("renders the LandGrab brand link pointing to /", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /landgrab/i })).toHaveAttribute("href", "/");
  });
});
