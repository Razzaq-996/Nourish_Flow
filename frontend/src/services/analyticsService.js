// Analytics service — wraps /analytics/* endpoints
import apiClient from './apiClient';

/** GET /analytics/platform (ADMIN only) */
export const getPlatformAnalytics = () =>
  apiClient.get('/analytics/platform').then((res) => res.data?.data ?? res.data);

/** GET /analytics/organizations/:organizationId (ORG_ADMIN / ADMIN) */
export const getOrganizationAnalytics = (organizationId) =>
  apiClient.get(`/analytics/organizations/${organizationId}`).then((res) => res.data?.data ?? res.data);

/** GET /analytics/donors/me (DONOR) */
export const getDonorAnalytics = () =>
  apiClient.get('/analytics/donors/me').then((res) => res.data?.data ?? res.data);

/** GET /analytics/volunteers/me (VOLUNTEER) */
export const getVolunteerAnalytics = () =>
  apiClient.get('/analytics/volunteers/me').then((res) => res.data?.data ?? res.data);
