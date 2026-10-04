/**
 * GuestRoute — redirects already-authenticated users to their dashboard.
 * Wrap login/register pages with this so they can't be visited while logged in.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingScreen from '../common/LoadingScreen';
import { getDashboardPath } from '../../utils/roleRouter';

export default function GuestRoute() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to={getDashboardPath(user?.role)} replace />;

  return <Outlet />;
}
