/**
 * AuthContext — provides authentication state and actions throughout the app.
 *
 * Persists { token, user } in localStorage under keys:
 *   frp_token  — JWT bearer token
 *   frp_user   — serialised safe-user object (from backend)
 *
 * The Axios interceptor in apiClient.js reads frp_token automatically.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContextDef';
import { login as loginApi, getMe } from '../services/authService';

const TOKEN_KEY = 'frp_token';
const USER_KEY  = 'frp_user';

function loadFromStorage() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user  = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const stored = loadFromStorage();
  const [token, setToken]   = useState(stored.token);
  const [user,  setUser]    = useState(stored.user);
  const [loading, setLoading] = useState(Boolean(stored.token && !stored.user));

  // On mount: if we have a token but no user object, hydrate from /auth/me
  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      getMe()
        .then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        })
        .catch(() => {
          // Token is invalid / expired — clear everything
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const { token: newToken, user: newUser } = await loginApi(email, password);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  /** Call after a successful profile update to keep context in sync */
  const refreshUser = useCallback(async () => {
    const freshUser = await getMe();
    setUser(freshUser);
    localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
    return freshUser;
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: Boolean(token),
    login,
    logout,
    refreshUser,
  }), [token, user, loading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

