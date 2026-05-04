import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401, clear auth state
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    return Promise.reject(error);
  }
);

// Typed API methods
export const api = {
  // Search
  searchProperties: (params: Record<string, unknown>) =>
    apiClient.get("/properties", { params }).then((r) => r.data),

  autocomplete: (q: string) =>
    apiClient.get("/search/autocomplete", { params: { q } }).then((r) => r.data),

  // Property detail
  getProperty: (id: string) =>
    apiClient.get(`/properties/${id}`).then((r) => r.data),

  getDealScore: (id: string) =>
    apiClient.get(`/properties/${id}/score`).then((r) => r.data),

  getComps: (id: string, maxDistance: number = 20) =>
    apiClient.get(`/properties/${id}/comps`, { params: { max_distance: maxDistance } }).then((r) => r.data),

  getPriceHistory: (id: string) =>
    apiClient.get(`/properties/${id}/price-history`).then((r) => r.data),

  getAVM: (id: string) =>
    apiClient.get(`/properties/${id}/avm`).then((r) => r.data),

  // Market
  getMarketData: (zip: string) =>
    apiClient.get(`/market/${zip}`).then((r) => r.data),

  getCurrentRates: () =>
    apiClient.get("/market/rates/current").then((r) => r.data),

  // Auth
  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return apiClient.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).then((r) => r.data);
  },

  register: (email: string, password: string, fullName: string) =>
    apiClient.post("/auth/register", { email, password, full_name: fullName }).then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post("/auth/logout", { refresh_token: refreshToken }),

  getMe: () => apiClient.get("/users/me").then((r) => r.data),

  // Saved
  getSavedProperties: () =>
    apiClient.get("/users/saved-properties").then((r) => r.data),

  saveProperty: (propertyId: string, notes?: string) =>
    apiClient.post("/users/saved-properties", { property_id: propertyId, notes }).then((r) => r.data),

  removeSavedProperty: (savedId: string) =>
    apiClient.delete(`/users/saved-properties/${savedId}`),

  getSavedSearches: () =>
    apiClient.get("/users/saved-searches").then((r) => r.data),

  createSavedSearch: (name: string, searchParams: object) =>
    apiClient.post("/users/saved-searches", { name, search_params: searchParams }).then((r) => r.data),
};
