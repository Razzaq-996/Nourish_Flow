// Donation service — wraps /donations/* endpoints
import apiClient from './apiClient';

/** GET /donations  — list donations (filtered by role on backend) */
export const listDonations = (params) =>
  apiClient.get('/donations', { params }).then((res) => res.data.data);

/** GET /donations/:id */
export const getDonation = (id) =>
  apiClient.get(`/donations/${id}`).then((res) => res.data.data);

/** POST /donations */
export const createDonation = (payload) =>
  apiClient.post('/donations', payload).then((res) => res.data.data);

/** PATCH /donations/:id */
export const updateDonation = (id, payload) =>
  apiClient.patch(`/donations/${id}`, payload).then((res) => res.data.data);

/** POST /donations/:id/publish */
export const publishDonation = (id) =>
  apiClient.post(`/donations/${id}/publish`).then((res) => res.data.data);

/** POST /donations/:id/withdraw */
export const withdrawDonation = (id) =>
  apiClient.post(`/donations/${id}/withdraw`).then((res) => res.data.data);
