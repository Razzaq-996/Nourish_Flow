/**
 * DashboardLayout — the authenticated shell layout.
 * Supports desktop sticky sidebar, mobile drawer, top header with theme toggle,
 * and a scrollable content area.
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100/80 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <AppSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/70 dark:bg-[#090d16]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
