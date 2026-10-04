// User / profile service — wraps /users/* endpoints
import apiClient from './apiClient';

/**
 * PATCH /users/me
 * Allowed fields for all users: name, phone
 * Additional for VOLUNTEER: availabilityStatus, currentLocation, maxTravelDistanceKm
 */
export const updateProfile = (payload) =>
  apiClient.patch('/users/me', payload).then((res) => res.data.data);
