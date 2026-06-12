import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Bell, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/store/AuthContext';
import { useComplaints } from '@/hooks/useComplaints';
import { useUserStats } from '@/hooks/useUserStats';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Complaint } from '@sahayi/types';

export default function HomePage() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { data: complaintsData, isLoading: complaintsLoading } = useComplaints({ page: 1 });
  const { data: stats } = useUserStats();

  const complaints = complaintsData?.data ?? [];
  const recentComplaints = complaints.slice(0, 3);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pt-2">
        <div>
          <p className="text-sm text-slate-500 font-medium">{greeting()},</p>
          <h1 className="font-display text-2xl text-slate-900 leading-tight">
            {appUser?.name?.split(' ')[0] || 'Citizen'} 👋
          </h1>
          {appUser?.panchayat && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <span>📍</span>
              {appUser.panchayat.name}, {appUser.panchayat.district}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="w-10 h-10 bg-white rounded-xl shadow-card flex items-center justify-center
                     text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Bell size={20} />
        </button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: 'Total',      value: stats.total,       color: 'text-slate-700', bg: 'bg-white' },
            { label: 'Pending',    value: stats.pending,     color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Active',     value: stats.in_progress, color: 'text-teal-600',  bg: 'bg-teal-50' },
            { label: 'Resolved',   value: stats.resolved,    color: 'text-green-600', bg: 'bg-green-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-3 text-center shadow-card`}>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report an Issue CTA */}
      <button
        onClick={() => navigate('/complaints/new')}
        className="w-full bg-primary-500 text-white rounded-2xl p-4 mb-6
                   flex items-center justify-between shadow-lg shadow-primary-200
                   hover:bg-primary-600 active:bg-primary-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Plus size={22} strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-base">Report an Issue</p>
            <p className="text-primary-200 text-xs">Takes less than 3 minutes</p>
          </div>
        </div>
        <ArrowRight size={20} className="text-primary-200" />
      </button>

      {/* Quick action categories */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { icon: '🛣️', label: 'Road',         category: 'ROAD' },
          { icon: '💧', label: 'Water',        category: 'WATER' },
          { icon: '⚡', label: 'Electricity', category: 'ELECTRICITY' },
          { icon: '💡', label: 'Street Light', category: 'STREET_LIGHT' },
        ].map(({ icon, label, category }) => (
          <button
            key={category}
            onClick={() => navigate(`/complaints/new?category=${category}`)}
            className="bg-white rounded-2xl p-3 flex flex-col items-center gap-1 shadow-card
                       hover:shadow-card-hover hover:bg-slate-50 transition-all active:scale-95"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-[10px] text-slate-500 font-medium text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* Recent reports */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg text-slate-800">Recent Reports</h2>
        <button
          onClick={() => navigate('/complaints')}
          className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
        >
          View all <ArrowRight size={14} />
        </button>
      </div>

      {complaintsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-4 w-3/4 mb-2" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : recentComplaints.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No complaints yet"
          description="Spotted a civic issue? Report it and we'll make sure it gets fixed."
          action={
            <button
              onClick={() => navigate('/complaints/new')}
              className="btn-primary text-sm"
            >
              Report your first issue
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {recentComplaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              onClick={() => navigate(`/complaints/${complaint.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ComplaintCard({
  complaint,
  onClick,
}: {
  complaint: Complaint;
  onClick: () => void;
}) {
  const needsAction = complaint.status === 'MORE_INFO_REQUIRED';

  return (
    <button
      onClick={onClick}
      className="card w-full text-left hover:shadow-card-hover transition-shadow active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryChip category={complaint.category} size="sm" />
          <StatusBadge status={complaint.status} size="sm" />
        </div>
        {needsAction && (
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
        )}
      </div>
      <p className="text-sm text-slate-800 font-medium line-clamp-2 mb-1.5">
        {complaint.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {complaint.complaint_number || 'Draft'}
        </span>
        <span className="text-[11px] text-slate-400">
          {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
}
