// Organization service — wraps /organizations/* endpoints
import apiClient from './apiClient';

/** POST /organizations */
export const createOrganization = (payload) =>
  apiClient.post('/organizations', payload).then((res) => res.data.data);

/** GET /organizations/:id */
export const getOrganization = (id) =>
  apiClient.get(`/organizations/${id}`).then((res) => res.data.data);

/** PATCH /organizations/:id */
export const updateOrganization = (id, payload) =>
  apiClient.patch(`/organizations/${id}`, payload).then((res) => res.data.data);
