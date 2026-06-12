import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useComplaints } from '@/hooks/useComplaints';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ComplaintStatus, Complaint } from '@sahayi/types';

const STATUS_FILTERS: { value: ComplaintStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',         label: 'All' },
  { value: 'SUBMITTED',   label: 'Submitted' },
  { value: 'PENDING',     label: 'Pending' },
  { value: 'ASSIGNED',    label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'Active' },
  { value: 'RESOLVED',    label: 'Resolved' },
  { value: 'CLOSED',      label: 'Closed' },
];

export default function ComplaintsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useComplaints({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: search || undefined,
    page,
  });

  const complaints = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="page-content">
      <div className="flex items-center justify-between mb-4 pt-2">
        <h1 className="font-display text-2xl text-slate-900">My Reports</h1>
        <span className="text-sm text-slate-400 font-medium">{data?.meta?.total ?? 0} total</span>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by ID or description…" className="input pl-10 pr-10" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
        {STATUS_FILTERS.map(({ value, label }) => (
          <button key={value} onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter === value ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="card"><div className="skeleton h-4 w-2/3 mb-2" /><div className="skeleton h-3 w-full mb-1" /><div className="skeleton h-3 w-1/2" /></div>)}</div>
      ) : isError ? (
        <div className="card border-red-100 bg-red-50 text-center py-8"><p className="text-red-600 text-sm">Failed to load complaints. Please try again.</p></div>
      ) : complaints.length === 0 ? (
        <EmptyState icon={search || statusFilter !== 'ALL' ? '🔍' : '📋'} title={search || statusFilter !== 'ALL' ? 'No results found' : 'No complaints yet'} description={search || statusFilter !== 'ALL' ? 'Try adjusting your search or filters.' : 'Report a civic issue and track its progress here.'} action={!search && statusFilter === 'ALL' ? <button onClick={() => navigate('/complaints/new')} className="btn-primary text-sm">Report an issue</button> : undefined} />
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {complaints.map((c) => <ComplaintListItem key={c.id} complaint={c} onClick={() => navigate(`/complaints/${c.id}`)} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Previous</button>
              <span className="text-sm text-slate-500">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ComplaintListItem({ complaint, onClick }: { complaint: Complaint; onClick: () => void }) {
  const needsAction = complaint.status === 'MORE_INFO_REQUIRED';
  const isDraft = complaint.status === 'DRAFT';
  return (
    <button onClick={onClick} className={`card w-full text-left hover:shadow-card-hover transition-all active:scale-[0.99] ${needsAction ? 'border-red-200 bg-red-50/50' : ''} ${isDraft ? 'border-dashed border-slate-300' : ''}`}>
      {needsAction && <div className="flex items-center gap-1.5 text-red-600 text-xs font-semibold mb-2"><AlertTriangle size={13} />Action required — additional information needed</div>}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <CategoryChip category={complaint.category} size="sm" />
        <StatusBadge status={complaint.status} size="sm" />
      </div>
      <p className="text-sm text-slate-800 font-medium line-clamp-2 mb-2">{complaint.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono">{complaint.complaint_number ?? 'DRAFT'}</span>
        <span className="text-[11px] text-slate-400">{formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}</span>
      </div>
      {complaint.evidence_files && complaint.evidence_files.length > 0 && (
        <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100">
          {complaint.evidence_files.slice(0, 4).map((f, i) => (
            <div key={i} className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0">
              {f.file_type?.startsWith('image/') ? <img src={f.signed_url || f.storage_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">MP4</div>}
            </div>
          ))}
          {complaint.evidence_files.length > 4 && <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-slate-500">+{complaint.evidence_files.length - 4}</span></div>}
        </div>
      )}
    </button>
  );
}
