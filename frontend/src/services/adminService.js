// Admin / verification service — wraps /admin/* endpoints (ADMIN only)
import apiClient from './apiClient';

/**
 * GET /admin/verifications
 * Returns pending users and organizations awaiting verification.
 */
export const getPendingVerifications = () =>
  apiClient.get('/admin/verifications').then((res) => res.data.data);

/**
 * PATCH /admin/users/:userId/verification
 * status: 'ACTIVE' | 'REJECTED'
 */
export const verifyUser = (userId, status) =>
  apiClient
    .patch(`/admin/users/${userId}/verification`, { status })
    .then((res) => res.data.data);

/**
 * PATCH /admin/organizations/:organizationId/verification
 * status: 'VERIFIED' | 'REJECTED'
 */
export const verifyOrganization = (organizationId, status) =>
  apiClient
    .patch(`/admin/organizations/${organizationId}/verification`, { status })
    .then((res) => res.data.data);
