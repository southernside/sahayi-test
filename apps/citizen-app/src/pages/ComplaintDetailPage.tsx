import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Share2, Star, RotateCcw, Upload, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useComplaint, useReopenComplaint, useSubmitFeedback, useUploadEvidence } from '@/hooks/useComplaints';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { extractError } from '@/lib/api';
import { STATUS_PROGRESS_STEPS } from '@/lib/constants';
import type { StatusLog, EvidenceFile } from '@sahayi/types';

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: complaint, isLoading, isError } = useComplaint(id!);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !complaint) return (
    <div className="page-content pt-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 mb-4"><ChevronLeft size={18} />Back</button>
      <div className="card border-red-100 bg-red-50 text-center py-8"><p className="text-red-600">Complaint not found.</p></div>
    </div>
  );

  const canReopen = complaint.status === 'RESOLVED';
  const canFeedback = complaint.status === 'RESOLVED' && !complaint.feedback;
  const stepIndex = STATUS_PROGRESS_STEPS.indexOf(complaint.status);

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: `Complaint ${complaint.complaint_number}`, text: complaint.description, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-4 pb-3 safe-top">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600"><ChevronLeft size={22} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg text-slate-900 truncate">{complaint.complaint_number ?? 'Draft'}</h1>
            <p className="text-xs text-slate-400">{format(new Date(complaint.created_at), 'dd MMM yyyy, h:mm a')}</p>
          </div>
          <button onClick={handleShare} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><Share2 size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-10">
          {/* Status + category */}
          <div className="card">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <CategoryChip category={complaint.category} />
              <StatusBadge status={complaint.status} />
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">{complaint.description}</p>
          </div>

          {/* Action needed banner */}
          {complaint.status === 'MORE_INFO_REQUIRED' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Additional information needed</p>
                <p className="text-xs text-red-600 mt-0.5">Please upload additional evidence to continue.</p>
                <UploadMoreEvidence complaintId={complaint.id} className="mt-2" />
              </div>
            </div>
          )}

          {/* Progress tracker */}
          {stepIndex >= 0 && (
            <div className="card">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Progress</h3>
              <div className="relative">
                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
                <div className="space-y-4">
                  {STATUS_PROGRESS_STEPS.map((step, i) => {
                    const done = i < stepIndex;
                    const current = i === stepIndex;
                    const upcoming = i > stepIndex;
                    return (
                      <div key={step} className="flex items-center gap-3 relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${done ? 'bg-green-500' : current ? 'bg-primary-500' : 'bg-slate-200'}`}>
                          {done ? <CheckCircle size={14} className="text-white" /> : current ? <div className="w-2.5 h-2.5 rounded-full bg-white" /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                        </div>
                        <span className={`text-sm ${done ? 'text-green-700 font-medium' : current ? 'text-primary-700 font-semibold' : 'text-slate-400'}`}>
                          {step.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        {current && <span className="ml-auto text-xs text-primary-500 font-medium">Current</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Map */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <MapPin size={14} className="text-primary-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</span>
            </div>
            <div style={{ height: 180, position: 'relative', zIndex: 0 }}>
              <MapContainer center={{ lat: complaint.latitude, lng: complaint.longitude }} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={{ lat: complaint.latitude, lng: complaint.longitude }} />
              </MapContainer>
            </div>
            {complaint.address && <p className="px-4 py-3 text-xs text-slate-500">{complaint.address}</p>}
          </div>

          {/* Evidence gallery */}
          {complaint.evidence_files && complaint.evidence_files.length > 0 && (
            <div className="card">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Evidence ({complaint.evidence_files.length})</h3>
              <EvidenceGallery files={complaint.evidence_files} />
            </div>
          )}

          {/* Activity log */}
          {complaint.status_logs && complaint.status_logs.length > 0 && (
            <div className="card">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Activity Log</h3>
              <div className="space-y-4">
                {[...complaint.status_logs].reverse().map((log) => (
                  <ActivityLogItem key={log.id} log={log} />
                ))}
              </div>
            </div>
          )}

          {/* Feedback / Reopen */}
          {canFeedback && <FeedbackForm complaintId={complaint.id} />}
          {canReopen && !canFeedback && <ReopenForm complaintId={complaint.id} />}

          {/* Existing feedback */}
          {complaint.feedback && (
            <div className="card bg-green-50 border-green-200">
              <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Your Feedback</h3>
              <div className="flex items-center gap-1 mb-1">
                {[1,2,3,4,5].map((s) => <Star key={s} size={16} className={s <= complaint.feedback!.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'} />)}
              </div>
              {complaint.feedback.comment && <p className="text-sm text-slate-600 mt-1">{complaint.feedback.comment}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EvidenceGallery({ files }: { files: EvidenceFile[] }) {
  const [selected, setSelected] = useState<EvidenceFile | null>(null);
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {files.map((f, i) => (
          <button key={f.id} onClick={() => setSelected(f)} className="aspect-square rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity">
            {f.file_type?.startsWith('image/') ? <img src={f.signed_url || f.storage_url} alt={f.file_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400"><span className="text-xl">🎬</span><span className="text-[10px]">Video</span></div>}
          </button>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <img src={selected.signed_url || selected.storage_url} alt={selected.file_name} className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}

function ActivityLogItem({ log }: { log: StatusLog }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0"><Clock size={14} className="text-slate-400" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 font-medium">
          {log.to_status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
        {log.notes && <p className="text-xs text-slate-500 mt-0.5">{log.notes}</p>}
        <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
      </div>
    </div>
  );
}

function FeedbackForm({ complaintId }: { complaintId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const submitFeedback = useSubmitFeedback();
  const reopenComplaint = useReopenComplaint();
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (rating === 0) { setError('Please select a rating'); return; }
    try { await submitFeedback.mutateAsync({ id: complaintId, rating, comment }); } catch (e) { setError(extractError(e)); }
  }

  async function handleReopen() {
    try { await reopenComplaint.mutateAsync({ id: complaintId, reason: 'Issue not fully resolved' }); } catch (e) { setError(extractError(e)); }
  }

  return (
    <div className="card border-primary-200 bg-primary-50/50">
      <h3 className="font-display text-base text-slate-800 mb-1">Resolution Review</h3>
      <p className="text-xs text-slate-500 mb-4">Was this issue resolved to your satisfaction?</p>
      <div className="flex items-center gap-2 mb-4">
        {[1,2,3,4,5].map((s) => (
          <button key={s} onMouseEnter={() => setHoveredRating(s)} onMouseLeave={() => setHoveredRating(0)} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
            <Star size={28} className={s <= (hoveredRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'} />
          </button>
        ))}
        {rating > 0 && <span className="text-sm text-slate-500 ml-1">{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}</span>}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience (optional)…" rows={3} className="input resize-none mb-3 text-sm" />
      {error && <p className="text-xs text-red-600 mb-3 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleReopen} disabled={reopenComplaint.isPending} className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5">
          {reopenComplaint.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reopen
        </button>
        <button onClick={handleSubmit} disabled={submitFeedback.isPending || rating === 0} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
          {submitFeedback.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Accept & Close
        </button>
      </div>
    </div>
  );
}

function ReopenForm({ complaintId }: { complaintId: string }) {
  const [reason, setReason] = useState('');
  const reopenComplaint = useReopenComplaint();
  return (
    <div className="card border-orange-200 bg-orange-50/50">
      <h3 className="font-display text-base text-slate-800 mb-1">Not satisfied?</h3>
      <p className="text-xs text-slate-500 mb-3">You can reopen this complaint if the issue persists.</p>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe why the issue is not resolved…" rows={3} className="input resize-none mb-3 text-sm" />
      <button onClick={() => reopenComplaint.mutate({ id: complaintId, reason })} disabled={reopenComplaint.isPending} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
        {reopenComplaint.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reopen Complaint
      </button>
    </div>
  );
}

function UploadMoreEvidence({ complaintId, className }: { complaintId: string; className?: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const uploadEvidence = useUploadEvidence();
  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadEvidence.mutate({ id: complaintId, files });
  }
  return (
    <div className={className}>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={handleFiles} />
      <button onClick={() => inputRef.current?.click()} disabled={uploadEvidence.isPending} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 underline underline-offset-2">
        {uploadEvidence.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        Upload additional evidence
      </button>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="page-content pt-4">
      <div className="skeleton h-8 w-40 mb-6" />
      <div className="card mb-4"><div className="skeleton h-4 w-1/3 mb-3" /><div className="skeleton h-3 w-full mb-2" /><div className="skeleton h-3 w-3/4" /></div>
      <div className="card mb-4" style={{ height: 220 }}><div className="skeleton w-full h-full rounded-xl" /></div>
      <div className="card"><div className="skeleton h-4 w-1/4 mb-4" />{[1,2,3].map((i) => <div key={i} className="flex gap-3 mb-4"><div className="skeleton w-8 h-8 rounded-full" /><div className="flex-1"><div className="skeleton h-3 w-1/2 mb-1" /><div className="skeleton h-3 w-1/3" /></div></div>)}</div>
    </div>
  );
}
