"use client";

import { create } from "zustand";
import { api } from "@/lib/api-client";

interface UserPreferences {
  notify_price_drops: boolean;
  notify_new_listings: boolean;
  alert_frequency: string;
  marketing_emails: boolean;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  tier: string;
  is_admin: boolean;
  preferences: UserPreferences;
  created_at: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // true once we know whether the user is logged in or not
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

// If there is no token in localStorage we immediately know the user is not
// authenticated — no network check needed, so we can mark as initialized.
const hasToken =
  typeof window !== "undefined" && !!localStorage.getItem("access_token");

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  isAuthenticated: false,
  isInitialized: !hasToken, // true right away when there is no token to verify
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const tokens = await api.login(email, password);
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      set({ accessToken: tokens.access_token });
      await get().loadUser();
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async (credential) => {
    set({ isLoading: true });
    try {
      const tokens = await api.googleLogin(credential);
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      set({ accessToken: tokens.access_token });
      await get().loadUser();
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      const tokens = await api.register(email, password, fullName);
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      set({ accessToken: tokens.access_token });
      await get().loadUser();
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {}
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, accessToken: null, isAuthenticated: false, isInitialized: true });
  },

  loadUser: async () => {
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isInitialized: true });
    } catch {
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  },

  updateUser: (user: User) => set({ user }),
}));
