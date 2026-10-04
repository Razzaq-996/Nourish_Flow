// Food-request service — wraps /food-requests/* endpoints
import apiClient from './apiClient';

/** GET /food-requests */
export const listFoodRequests = (params) =>
  apiClient.get('/food-requests', { params }).then((res) => res.data.data);

/** GET /food-requests/:id */
export const getFoodRequest = (id) =>
  apiClient.get(`/food-requests/${id}`).then((res) => res.data.data);

/** POST /food-requests */
export const createFoodRequest = (payload) =>
  apiClient.post('/food-requests', payload).then((res) => res.data.data);

/** PATCH /food-requests/:id */
export const updateFoodRequest = (id, payload) =>
  apiClient.patch(`/food-requests/${id}`, payload).then((res) => res.data.data);

/** POST /food-requests/:id/open */
export const openFoodRequest = (id) =>
  apiClient.post(`/food-requests/${id}/open`).then((res) => res.data.data);

/** POST /food-requests/:id/cancel */
export const cancelFoodRequest = (id) =>
  apiClient.post(`/food-requests/${id}/cancel`).then((res) => res.data.data);
