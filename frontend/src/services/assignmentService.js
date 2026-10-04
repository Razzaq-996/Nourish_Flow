// Assignment service — wraps /assignments/* endpoints
import apiClient from './apiClient';

/** GET /assignments */
export const listAssignments = (params) =>
  apiClient.get('/assignments', { params }).then((res) => res.data.data);

/** GET /assignments/:id */
export const getAssignment = (id) =>
  apiClient.get(`/assignments/${id}`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments  (ORG_ADMIN / ADMIN only) */
export const createAssignment = (payload) =>
  apiClient.post('/assignments', payload).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments/:id/accept  (VOLUNTEER only) */
export const acceptAssignment = (id) =>
  apiClient.post(`/assignments/${id}/accept`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments/:id/reject  (VOLUNTEER only) */
export const rejectAssignment = (id) =>
  apiClient.post(`/assignments/${id}/reject`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments/:id/cancel */
export const cancelAssignment = (id) =>
  apiClient.post(`/assignments/${id}/cancel`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments/:id/pickup-start  (VOLUNTEER only) */
export const startPickup = (id) =>
  apiClient.post(`/assignments/${id}/pickup-start`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments/:id/picked-up  (VOLUNTEER only) */
export const confirmPickedUp = (id) =>
  apiClient.post(`/assignments/${id}/picked-up`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments/:id/delivery-start  (VOLUNTEER only) */
export const startDelivery = (id) =>
  apiClient.post(`/assignments/${id}/delivery-start`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments/:id/delivered  (VOLUNTEER only) */
export const confirmDelivered = (id) =>
  apiClient.post(`/assignments/${id}/delivered`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** POST /assignments/:id/complete  (ORG_ADMIN / ADMIN only) */
export const completeAssignment = (id) =>
  apiClient.post(`/assignments/${id}/complete`).then((res) => res.data?.data?.assignment ?? res.data?.data);

/** GET /assignments/volunteers/available  (ORG_ADMIN / ADMIN only) */
export const listAvailableVolunteers = () =>
  apiClient.get('/assignments/volunteers/available').then((res) => res.data?.data?.volunteers || []);

