import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { usersApi, authApi } from '../api-client';
import type { User, TokenResponse } from '../../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (tokens: TokenResponse) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (u: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  login: async (tokens) => {
    await SecureStore.setItemAsync('access_token', tokens.access_token);
    await SecureStore.setItemAsync('refresh_token', tokens.refresh_token);
    await get().loadUser();
  },

  logout: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {}
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false, isInitialized: true });
  },

  loadUser: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) {
      set({ isInitialized: true, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await usersApi.me();
      set({ user: data, isAuthenticated: true, isInitialized: true });
    } catch {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({ user: null, isAuthenticated: false, isInitialized: true });
    }
  },

  updateUser: (updates) =>
    set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
}));
