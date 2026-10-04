/**
 * DashboardLayout — the main authenticated shell layout.
 * Sidebar (left) + header (top) + scrollable content area (right).
 * All protected pages render inside the <Outlet /> here.
 */
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
