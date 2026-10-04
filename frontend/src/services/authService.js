// Auth service — wraps /auth/* endpoints
import apiClient from './apiClient';

/**
 * POST /auth/register
 * Allowed roles: DONOR | ORG_ADMIN | VOLUNTEER
 */
export const register = (payload) =>
  apiClient.post('/auth/register', payload).then((res) => res.data.data);

/**
 * POST /auth/login
 * Returns { token, user }
 */
export const login = (email, password) =>
  apiClient.post('/auth/login', { email, password }).then((res) => res.data.data);

/**
 * GET /auth/me
 * Returns the currently authenticated user.
 */
export const getMe = () =>
  apiClient.get('/auth/me').then((res) => res.data.data.user);
