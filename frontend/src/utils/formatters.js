/**
 * Shared formatting utilities used across the UI.
 */
import {
  DONATION_STATUSES,
  FOOD_REQUEST_STATUSES,
  ASSIGNMENT_STATUSES,
  USER_STATUSES,
  ORGANIZATION_VERIFICATION_STATUSES,
} from './constants';

// ─── Date / time ───────────────────────────────────────────────────────────

const dateFormatter  = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const dtFormatter    = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const relFormatter   = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

export function formatDate(date) {
  if (!date) return '—';
  return dateFormatter.format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return '—';
  return dtFormatter.format(new Date(date));
}

export function formatRelative(date) {
  if (!date) return '—';
  const diff = (new Date(date) - Date.now()) / 1000;
  const abs  = Math.abs(diff);
  if (abs < 60)       return relFormatter.format(Math.round(diff), 'second');
  if (abs < 3600)     return relFormatter.format(Math.round(diff / 60), 'minute');
  if (abs < 86400)    return relFormatter.format(Math.round(diff / 3600), 'hour');
  return relFormatter.format(Math.round(diff / 86400), 'day');
}

// ─── Status → badge class mapping ─────────────────────────────────────────

export function donationStatusBadge(status) {
  const map = {
    [DONATION_STATUSES.DRAFT]:               'badge-slate',
    [DONATION_STATUSES.AVAILABLE]:           'badge-green',
    [DONATION_STATUSES.PARTIALLY_ALLOCATED]: 'badge-blue',
    [DONATION_STATUSES.FULLY_ALLOCATED]:     'badge-green',
    [DONATION_STATUSES.EXPIRED]:             'badge-red',
    [DONATION_STATUSES.WITHDRAWN]:           'badge-yellow',
    [DONATION_STATUSES.CANCELLED]:           'badge-red',
  };
  return map[status] ?? 'badge-slate';
}

export function requestStatusBadge(status) {
  const map = {
    [FOOD_REQUEST_STATUSES.DRAFT]:               'badge-slate',
    [FOOD_REQUEST_STATUSES.OPEN]:                'badge-green',
    [FOOD_REQUEST_STATUSES.PARTIALLY_FULFILLED]: 'badge-blue',
    [FOOD_REQUEST_STATUSES.FULFILLED]:           'badge-green',
    [FOOD_REQUEST_STATUSES.EXPIRED]:             'badge-red',
    [FOOD_REQUEST_STATUSES.CANCELLED]:           'badge-red',
  };
  return map[status] ?? 'badge-slate';
}

export function assignmentStatusBadge(status) {
  const map = {
    [ASSIGNMENT_STATUSES.PENDING]:          'badge-yellow',
    [ASSIGNMENT_STATUSES.ACCEPTED]:         'badge-blue',
    [ASSIGNMENT_STATUSES.REJECTED]:         'badge-red',
    [ASSIGNMENT_STATUSES.PICKUP_STARTED]:   'badge-blue',
    [ASSIGNMENT_STATUSES.PICKED_UP]:        'badge-blue',
    [ASSIGNMENT_STATUSES.DELIVERY_STARTED]: 'badge-orange',
    [ASSIGNMENT_STATUSES.DELIVERED]:        'badge-green',
    [ASSIGNMENT_STATUSES.COMPLETED]:        'badge-green',
    [ASSIGNMENT_STATUSES.FAILED]:           'badge-red',
    [ASSIGNMENT_STATUSES.CANCELLED]:        'badge-red',
  };
  return map[status] ?? 'badge-slate';
}

export function userStatusBadge(status) {
  const map = {
    [USER_STATUSES.PENDING_VERIFICATION]: 'badge-yellow',
    [USER_STATUSES.ACTIVE]:               'badge-green',
    [USER_STATUSES.REJECTED]:             'badge-red',
    [USER_STATUSES.SUSPENDED]:            'badge-red',
    [USER_STATUSES.DEACTIVATED]:          'badge-slate',
  };
  return map[status] ?? 'badge-slate';
}

export function orgStatusBadge(status) {
  const map = {
    [ORGANIZATION_VERIFICATION_STATUSES.PENDING]:  'badge-yellow',
    [ORGANIZATION_VERIFICATION_STATUSES.VERIFIED]: 'badge-green',
    [ORGANIZATION_VERIFICATION_STATUSES.REJECTED]: 'badge-red',
    [ORGANIZATION_VERIFICATION_STATUSES.SUSPENDED]:'badge-red',
  };
  return map[status] ?? 'badge-slate';
}

// ─── Label helpers ──────────────────────────────────────────────────────────

export function humanizeSnake(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extracts a user-readable error message from an Axios error.
 */
export function extractErrorMessage(err) {
  return (
    err?.response?.data?.error?.message ??
    err?.response?.data?.message ??
    err?.message ??
    'An unexpected error occurred.'
  );
}
