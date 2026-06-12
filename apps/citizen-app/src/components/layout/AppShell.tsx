import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, FileText, Bell, User, Plus } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

const navItems = [
  { to: '/',              icon: Home,      label: 'Home' },
  { to: '/complaints',    icon: FileText,  label: 'My Reports' },
  { to: '/notifications', icon: Bell,      label: 'Alerts' },
  { to: '/profile',       icon: User,      label: 'Profile' },
];

export function AppShell() {
  const navigate = useNavigate();
  const { data: notifData } = useNotifications();
  const unreadCount = notifData?.meta?.unread_count ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <Outlet />
      </main>

      {/* FAB - Report Issue */}
      <button
        onClick={() => navigate('/complaints/new')}
        aria-label="Report a new issue"
        className="fixed bottom-20 right-4 z-20 w-14 h-14 bg-primary-500 text-white rounded-full
                   shadow-lg flex items-center justify-center
                   hover:bg-primary-600 active:bg-primary-700
                   transition-all duration-150 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-slate-200 safe-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2 pb-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors duration-150 relative
                ${isActive
                  ? 'text-primary-600'
                  : 'text-slate-400 hover:text-slate-600'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-primary-50' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {/* Notification badge */}
                    {label === 'Alerts' && unreadCount > 0 && (
                      <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-primary-600' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
