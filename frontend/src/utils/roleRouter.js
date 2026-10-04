/**
 * Maps a user role to its default dashboard path.
 * Used by GuestRoute and the root redirect.
 */
import { USER_ROLES } from './constants';

export function getDashboardPath(role) {
  switch (role) {
    case USER_ROLES.ADMIN:     return '/admin/dashboard';
    case USER_ROLES.ORG_ADMIN: return '/org/dashboard';
    case USER_ROLES.DONOR:     return '/donor/dashboard';
    case USER_ROLES.VOLUNTEER: return '/volunteer/dashboard';
    default:                   return '/';
  }
}
