// Matching service — wraps /matching/* endpoints
import apiClient from './apiClient';

/**
 * POST /matching/allocations
 * Allocates a donation to a food request.
 * payload: { donationId, requestId?, quantity? }
 */
export const allocate = (payload) =>
  apiClient.post('/matching/allocations', payload).then((res) => res.data.data);
