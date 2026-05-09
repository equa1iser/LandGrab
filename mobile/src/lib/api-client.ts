import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

// In dev, point to your machine's local IP (not localhost — device can't reach it)
// Change this to your computer's LAN IP when testing on a physical device
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

// On 401: try refresh once, then clear auth and signal logout
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('no_refresh_token');
        const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
        await SecureStore.setItemAsync('access_token', data.access_token);
        processQueue(null, data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Dynamically import to avoid circular dependency
        const { useAuthStore } = await import('./store/authStore');
        useAuthStore.getState().logout();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { username: email, password }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (email: string, password: string, full_name: string) =>
    api.post('/auth/register', { email, password, full_name }),
  google: (credential: string) =>
    api.post('/auth/google', { credential }),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),
};

// Property endpoints
export const propertiesApi = {
  search: (params: Record<string, unknown>) =>
    api.get('/properties', { params }),
  detail: (id: string) =>
    api.get(`/properties/${id}`),
  score: (id: string) =>
    api.get(`/properties/${id}/score`),
  comps: (id: string, max_distance = 20) =>
    api.get(`/properties/${id}/comps`, { params: { max_distance } }),
  priceHistory: (id: string) =>
    api.get(`/properties/${id}/price-history`),
  avm: (id: string) =>
    api.get(`/properties/${id}/avm`),
};

// User endpoints
export const usersApi = {
  me: () => api.get('/users/me'),
  usage: () => api.get('/users/usage'),
  updateProfile: (data: { full_name?: string; email?: string }) =>
    api.patch('/users/me', data),
  updatePreferences: (prefs: Record<string, unknown>) =>
    api.put('/users/preferences', prefs),
  changePassword: (current_password: string, new_password: string) =>
    api.put('/users/password', { current_password, new_password }),
  savedProperties: () => api.get('/users/saved-properties'),
  saveProperty: (property_id: string, alert_enabled = false) =>
    api.post('/users/saved-properties', { property_id, alert_enabled }),
  unsaveProperty: (saved_id: string) =>
    api.delete(`/users/saved-properties/${saved_id}`),
  savedSearches: () => api.get('/users/saved-searches'),
  createSearch: (data: Record<string, unknown>) =>
    api.post('/users/saved-searches', data),
  updateSearch: (id: string, data: Record<string, unknown>) =>
    api.put(`/users/saved-searches/${id}`, data),
  deleteSearch: (id: string) =>
    api.delete(`/users/saved-searches/${id}`),
};

// Market endpoints
export const marketApi = {
  rates: () => api.get('/market/rates/current'),
  byZip: (zip: string) => api.get(`/market/${zip}`),
};

// Search autocomplete
export const searchApi = {
  autocomplete: (q: string) => api.get('/search/autocomplete', { params: { q } }),
};

// Admin endpoints
export const adminApi = {
  overview: () => api.get('/admin/overview'),
  users: (page = 1, per_page = 20) =>
    api.get('/admin/users', { params: { page, per_page } }),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/users/${id}`, data),
};
