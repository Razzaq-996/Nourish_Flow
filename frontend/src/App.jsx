/**
 * App.jsx — root component.
 * Sets up:
 *  - AuthProvider (global auth state)
 *  - React Router with all routes
 *  - Protected/Guest route guards
 *  - Role-based routing to dashboard variants
 *  - DashboardLayout as the authenticated shell
 */
import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { getDashboardPath } from './utils/roleRouter';
import { USER_ROLES } from './utils/constants';

// Guards
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Donor pages
import DonorDashboard from './pages/donor/DonorDashboard';
import DonationsPage from './pages/donor/DonationsPage';

// Org Admin pages
import OrgDashboard from './pages/org/OrgDashboard';
import OrgDonationsPage from './pages/org/OrgDonationsPage';
import OrgRequestsPage from './pages/org/OrgRequestsPage';
import OrgAssignmentsPage from './pages/org/OrgAssignmentsPage';
import OrgProfilePage from './pages/org/OrgProfilePage';

// Volunteer pages
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import VolunteerAssignmentsPage from './pages/volunteer/VolunteerAssignmentsPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage';
import AdminDonationsPage from './pages/admin/AdminDonationsPage';
import AdminRequestsPage from './pages/admin/AdminRequestsPage';
import AdminAssignmentsPage from './pages/admin/AdminAssignmentsPage';

// Utility pages
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import LoadingScreen from './components/common/LoadingScreen';

/** Root redirect: sends / to the role-appropriate dashboard */
function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to={getDashboardPath(user?.role)} replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* ─── Public (guest-only) ─────────────────────────────── */}
      <Route element={<GuestRoute />}>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* ─── DONOR ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.DONOR]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/donor/dashboard" element={<DonorDashboard />} />
          <Route path="/donor/donations" element={<DonationsPage />} />
        </Route>
      </Route>

      {/* ─── ORG_ADMIN ───────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.ORG_ADMIN]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/org/dashboard"   element={<OrgDashboard />} />
          <Route path="/org/donations"   element={<OrgDonationsPage />} />
          <Route path="/org/requests"    element={<OrgRequestsPage />} />
          <Route path="/org/assignments" element={<OrgAssignmentsPage />} />
          <Route path="/org/profile"     element={<OrgProfilePage />} />
        </Route>
      </Route>

      {/* ─── VOLUNTEER ───────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.VOLUNTEER]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/volunteer/dashboard"   element={<VolunteerDashboard />} />
          <Route path="/volunteer/assignments" element={<VolunteerAssignmentsPage />} />
        </Route>
      </Route>

      {/* ─── ADMIN ───────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard"     element={<AdminDashboard />} />
          <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
          <Route path="/admin/donations"     element={<AdminDonationsPage />} />
          <Route path="/admin/requests"      element={<AdminRequestsPage />} />
          <Route path="/admin/assignments"   element={<AdminAssignmentsPage />} />
        </Route>
      </Route>

      {/* ─── Utility ─────────────────────────────────────────── */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*"             element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
