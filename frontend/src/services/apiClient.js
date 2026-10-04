// Central Axios instance — all API calls go through here.
// Reads VITE_API_URL from environment; defaults to localhost:5000.
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ─── Request interceptor ───────────────────────────────────────────────────
// Attaches the JWT token from localStorage before every request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('frp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────
// Unwraps { data: { ... } } envelope from the backend.
// On 401 → clears local auth state and reloads to force re-login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('frp_token');
      localStorage.removeItem('frp_user');
      // Avoid redirect loops on the login page itself
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
