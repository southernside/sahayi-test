import React, { useState } from 'react';
import {
  LogOut, ChevronRight, User, Bell, Shield, Globe,
  FileText, Star, Info, Loader2,
} from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import { useUserStats } from '@/hooks/useUserStats';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { appUser, signOut } = useAuth();
  const { data: stats } = useUserStats();
  const [signingOut, setSigningOut] = useState(false);
  const [notifications, setNotifications] = useState(true);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  if (!appUser) return null;

  return (
    <div className="page-content">
      <h1 className="font-display text-2xl text-slate-900 mb-5 pt-2">Profile</h1>

      {/* Avatar & info card */}
      <div className="card mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-100 shrink-0 flex items-center justify-center">
          {appUser.avatar_url ? (
            <img src={appUser.avatar_url} alt={appUser.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-primary-600">
              {appUser.name?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{appUser.name}</p>
          <p className="text-sm text-slate-400 truncate">{appUser.email}</p>
          {appUser.panchayat && (
            <p className="text-xs text-primary-600 mt-0.5 font-medium">
              📍 {appUser.panchayat.name}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Active', value: stats.pending + stats.in_progress },
            { label: 'Resolved', value: stats.resolved },
            { label: 'Pending', value: stats.pending },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center py-3">
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-[10px] text-slate-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Settings sections */}
      <div className="space-y-3">
        {/* Account */}
        <SettingsSection title="Account">
          <SettingsItem icon={<User size={18} />} label="Personal Information" />
          <SettingsItem icon={<Shield size={18} />} label="Privacy & Security" />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences">
          <SettingsItem
            icon={<Bell size={18} />}
            label="Push Notifications"
            right={
              <button
                onClick={() => setNotifications((n) => !n)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  notifications ? 'bg-primary-500' : 'bg-slate-300'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  notifications ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            }
          />
          <SettingsItem icon={<Globe size={18} />} label="Language" value="English" />
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About">
          <SettingsItem icon={<FileText size={18} />} label="Terms of Service" />
          <SettingsItem icon={<Shield size={18} />} label="Privacy Policy" />
          <SettingsItem icon={<Star size={18} />} label="Rate the App" />
          <SettingsItem icon={<Info size={18} />} label="App Version" value="1.0.0" />
        </SettingsSection>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full card flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
        >
          {signingOut ? (
            <Loader2 size={18} className="animate-spin text-red-400" />
          ) : (
            <LogOut size={18} />
          )}
          <span className="font-semibold text-sm">
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </span>
        </button>
      </div>

      <p className="text-center text-xs text-slate-300 mt-6">
        Sahayi Civic Platform · Made for Kerala
      </p>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">{title}</p>
      <div className="card divide-y divide-slate-100 p-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingsItem({
  icon,
  label,
  value,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 cursor-pointer">
      <span className="text-slate-500 w-5">{icon}</span>
      <span className="flex-1 text-sm text-slate-700 font-medium">{label}</span>
      {value && <span className="text-xs text-slate-400">{value}</span>}
      {right ?? <ChevronRight size={16} className="text-slate-300" />}
    </div>
  );
}
