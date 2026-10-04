/**
 * Frontend mirror of backend/src/utils/constants.js
 * Keep in sync with the backend — do NOT add values that don't exist there.
 */

export const USER_ROLES = Object.freeze({
  DONOR:     'DONOR',
  ORG_ADMIN: 'ORG_ADMIN',
  VOLUNTEER: 'VOLUNTEER',
  ADMIN:     'ADMIN',
});

export const USER_STATUSES = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE:               'ACTIVE',
  REJECTED:             'REJECTED',
  SUSPENDED:            'SUSPENDED',
  DEACTIVATED:          'DEACTIVATED',
});

export const ORGANIZATION_VERIFICATION_STATUSES = Object.freeze({
  PENDING:  'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
});

export const DONATION_STATUSES = Object.freeze({
  DRAFT:              'DRAFT',
  AVAILABLE:          'AVAILABLE',
  PARTIALLY_ALLOCATED:'PARTIALLY_ALLOCATED',
  FULLY_ALLOCATED:    'FULLY_ALLOCATED',
  EXPIRED:            'EXPIRED',
  WITHDRAWN:          'WITHDRAWN',
  CANCELLED:          'CANCELLED',
});

export const FOOD_REQUEST_STATUSES = Object.freeze({
  DRAFT:               'DRAFT',
  OPEN:                'OPEN',
  PARTIALLY_FULFILLED: 'PARTIALLY_FULFILLED',
  FULFILLED:           'FULFILLED',
  EXPIRED:             'EXPIRED',
  CANCELLED:           'CANCELLED',
});

export const ASSIGNMENT_STATUSES = Object.freeze({
  PENDING:          'PENDING',
  ACCEPTED:         'ACCEPTED',
  REJECTED:         'REJECTED',
  PICKUP_STARTED:   'PICKUP_STARTED',
  PICKED_UP:        'PICKED_UP',
  DELIVERY_STARTED: 'DELIVERY_STARTED',
  DELIVERED:        'DELIVERED',
  COMPLETED:        'COMPLETED',
  FAILED:           'FAILED',
  CANCELLED:        'CANCELLED',
});

export const VOLUNTEER_AVAILABILITY_STATUSES = Object.freeze({
  AVAILABLE:   'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
});

export const FOOD_CATEGORIES = Object.freeze({
  PREPARED_MEAL:  'PREPARED_MEAL',
  PRODUCE:        'PRODUCE',
  PACKAGED_FOOD:  'PACKAGED_FOOD',
  BAKERY:         'BAKERY',
  DAIRY:          'DAIRY',
  OTHER:          'OTHER',
});

export const UNITS = Object.freeze({
  MEALS:    'MEALS',
  KILOGRAMS:'KILOGRAMS',
  LITERS:   'LITERS',
  BOXES:    'BOXES',
  PORTIONS: 'PORTIONS',
});

export const STATE_TRANSITIONS = Object.freeze({
  ASSIGNMENT: Object.freeze({
    PENDING: Object.freeze(['ACCEPTED', 'REJECTED', 'CANCELLED']),
    ACCEPTED: Object.freeze(['PICKUP_STARTED', 'CANCELLED']),
    PICKUP_STARTED: Object.freeze(['PICKED_UP', 'FAILED', 'CANCELLED']),
    PICKED_UP: Object.freeze(['DELIVERY_STARTED', 'FAILED']),
    DELIVERY_STARTED: Object.freeze(['DELIVERED', 'FAILED']),
    DELIVERED: Object.freeze(['COMPLETED']),
    COMPLETED: Object.freeze([]),
    REJECTED: Object.freeze([]),
    FAILED: Object.freeze([]),
    CANCELLED: Object.freeze([]),
  }),
});

