import React, { useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft, ChevronRight, MapPin, Camera, X, CheckCircle,
  Upload, Loader2, AlertCircle,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useCreateComplaint, useUploadEvidence } from '@/hooks/useComplaints';
import { CATEGORIES } from '@/lib/constants';
import { extractError } from '@/lib/api';
import type { ComplaintCategory } from '@sahayi/types';

const STEPS = ['Category', 'Description', 'Location', 'Evidence', 'Review'] as const;

interface FormData {
  category: ComplaintCategory | '';
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  files: File[];
}

const descriptionSchema = z.object({
  description: z.string().min(10, 'Please describe the issue (min 10 characters)').max(1000),
});

export default function NewComplaintPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetCategory = searchParams.get('category') as ComplaintCategory | null;

  const [currentStep, setCurrentStep] = useState<number>(presetCategory ? 1 : 0);
  const [formData, setFormData] = useState<FormData>({
    category: presetCategory || '',
    description: '',
    latitude: null,
    longitude: null,
    address: '',
    files: [],
  });
  const [submittedComplaintId, setSubmittedComplaintId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createComplaint = useCreateComplaint();
  const uploadEvidence = useUploadEvidence();
  const isSubmitting = createComplaint.isPending || uploadEvidence.isPending;

  function goBack() {
    if (currentStep === 0) { navigate(-1); return; }
    setCurrentStep((s) => s - 1);
  }

  function goNext() { setCurrentStep((s) => s + 1); }

  async function handleSubmit() {
    if (!formData.category || formData.latitude === null || formData.longitude === null) return;
    setSubmitError(null);
    try {
      const complaint = await createComplaint.mutateAsync({
        category: formData.category,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
      });
      if (formData.files.length > 0) {
        await uploadEvidence.mutateAsync({ id: complaint.id, files: formData.files });
      }
      setSubmittedComplaintId(complaint.id);
    } catch (err) {
      setSubmitError(extractError(err));
    }
  }

  async function saveDraft() {
    if (!formData.category) return;
    try {
      await createComplaint.mutateAsync({
        category: formData.category,
        description: formData.description || 'Draft',
        latitude: formData.latitude ?? 0,
        longitude: formData.longitude ?? 0,
        address: formData.address,
        is_draft: true,
      } as any);
      navigate('/complaints');
    } catch {}
  }

  if (submittedComplaintId) return <SuccessScreen complaintId={submittedComplaintId} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 pt-4 pb-3 safe-top">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg text-slate-900">Report an Issue</h1>
            <p className="text-xs text-slate-400">Step {currentStep + 1} of {STEPS.length}</p>
          </div>
          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <button onClick={saveDraft} className="text-xs text-slate-400 hover:text-slate-600 font-medium">
              Save draft
            </button>
          )}
        </div>
        <div className="mt-3 max-w-lg mx-auto flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= currentStep ? 'bg-primary-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">
          {currentStep === 0 && <CategoryStep selected={formData.category} onSelect={(cat) => { setFormData((d) => ({ ...d, category: cat })); goNext(); }} />}
          {currentStep === 1 && <DescriptionStep value={formData.description} category={formData.category} onChange={(desc) => setFormData((d) => ({ ...d, description: desc }))} onNext={goNext} />}
          {currentStep === 2 && <LocationStep latitude={formData.latitude} longitude={formData.longitude} address={formData.address} onChange={(lat, lng, addr) => setFormData((d) => ({ ...d, latitude: lat, longitude: lng, address: addr }))} onNext={goNext} />}
          {currentStep === 3 && <EvidenceStep files={formData.files} onChange={(files) => setFormData((d) => ({ ...d, files }))} onNext={goNext} />}
          {currentStep === 4 && <ReviewStep formData={formData} isSubmitting={isSubmitting} submitError={submitError} onSubmit={handleSubmit} onEdit={(step) => setCurrentStep(step)} />}
        </div>
      </div>
    </div>
  );
}

function CategoryStep({ selected, onSelect }: { selected: ComplaintCategory | ''; onSelect: (cat: ComplaintCategory) => void }) {
  return (
    <div>
      <h2 className="font-display text-2xl text-slate-900 mb-1">What's the issue?</h2>
      <p className="text-slate-500 text-sm mb-6">Select the category that best describes the problem.</p>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <button key={cat.value} onClick={() => onSelect(cat.value)}
            className={`rounded-2xl border-2 p-5 flex flex-col items-start gap-3 text-left transition-all duration-150 active:scale-95 ${selected === cat.value ? 'border-primary-400 bg-primary-50 shadow-md shadow-primary-100' : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/50'}`}>
            <span className="text-3xl">{cat.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${selected === cat.value ? 'text-primary-700' : 'text-slate-800'}`}>{cat.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {cat.value === 'ROAD' && 'Potholes, damaged roads'}
                {cat.value === 'WATER' && 'Supply issues, leaks'}
                {cat.value === 'ELECTRICITY' && 'Outages, faulty wiring'}
                {cat.value === 'STREET_LIGHT' && 'Broken or missing lights'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DescriptionStep({ value, category, onChange, onNext }: { value: string; category: ComplaintCategory | ''; onChange: (v: string) => void; onNext: () => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(descriptionSchema), defaultValues: { description: value } });
  const charCount = watch('description')?.length ?? 0;

  function onSubmit({ description }: { description: string }) { onChange(description); onNext(); }

  const placeholders: Record<string, string> = {
    ROAD: 'e.g., Large pothole on the main road near the temple causing accidents…',
    WATER: 'e.g., No water supply in the area for the past 3 days…',
    ELECTRICITY: 'e.g., Street transformer sparking for 2 days, posing a safety risk…',
    STREET_LIGHT: 'e.g., Three streetlights on the hospital road have been out for a week…',
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="font-display text-2xl text-slate-900 mb-1">Describe the issue</h2>
      <p className="text-slate-500 text-sm mb-6">Provide clear details to help officers resolve this quickly.</p>
      <div className="relative">
        <textarea
          {...register('description')}
          onChange={(e) => { register('description').onChange(e); onChange(e.target.value); }}
          placeholder={placeholders[category ?? ''] || 'Describe the civic issue in detail…'}
          rows={6}
          className={`input resize-none ${errors.description ? 'input-error' : ''}`}
        />
        <span className={`absolute bottom-3 right-3 text-xs font-medium ${charCount > 900 ? 'text-red-500' : 'text-slate-400'}`}>{charCount}/1000</span>
      </div>
      {errors.description && <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={14} /> {errors.description.message}</p>}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-700 leading-relaxed">💡 <strong>Tip:</strong> Mention how long the issue has persisted, exact landmarks, and any safety hazards for faster resolution.</p>
      </div>
      <button type="submit" className="btn-primary w-full mt-6 flex items-center justify-center gap-2">Continue <ChevronRight size={18} /></button>
    </form>
  );
}

function LocationStep({ latitude, longitude, address, onChange, onNext }: { latitude: number | null; longitude: number | null; address: string; onChange: (lat: number, lng: number, addr: string) => void; onNext: () => void }) {
  const [detecting, setDetecting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: latitude ?? 8.5241, lng: longitude ?? 76.9366 });
  const hasLocation = latitude !== null && longitude !== null;

  function detectGPS() {
    setDetecting(true); setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { const { latitude: lat, longitude: lng } = pos.coords; setMapCenter({ lat, lng }); onChange(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`); setDetecting(false); },
      (err) => { setGpsError(err.code === 1 ? 'Location access denied. Please enable permission and try again.' : 'Could not detect location. Try selecting on the map.'); setDetecting(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function MapEventsHandler() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        onChange(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      },
    });
    return null;
  }

  function MapCenterUpdater({ center }: { center: { lat: number; lng: number } }) {
    const map = useMap();
    React.useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
    return null;
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-slate-900 mb-1">Where is the issue?</h2>
      <p className="text-slate-500 text-sm mb-4">Use GPS or tap the map to pin the exact location.</p>
      <button onClick={detectGPS} disabled={detecting} className="w-full flex items-center justify-center gap-2 bg-primary-50 border-2 border-primary-200 text-primary-700 font-semibold py-3.5 rounded-xl mb-4 hover:bg-primary-100 disabled:opacity-60 transition-colors">
        {detecting ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
        {detecting ? 'Detecting location…' : 'Use my current location'}
      </button>
      {gpsError && <p className="text-sm text-red-600 mb-3 flex items-center gap-1.5"><AlertCircle size={14} /> {gpsError}</p>}
      <div className="rounded-2xl overflow-hidden border border-slate-200 mb-4" style={{ height: 240, position: 'relative', zIndex: 0 }}>
        <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hasLocation && <Marker position={{ lat: latitude!, lng: longitude! }} />}
          <MapEventsHandler />
          <MapCenterUpdater center={mapCenter} />
        </MapContainer>
      </div>
      <p className="text-xs text-slate-400 text-center mb-4">Tap anywhere on the map to set location manually</p>
      {hasLocation && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-700">Location confirmed</p>
              <p className="text-xs text-green-600 mt-0.5">{address || `${latitude!.toFixed(5)}, ${longitude!.toFixed(5)}`}</p>
            </div>
          </div>
        </div>
      )}
      <button onClick={onNext} disabled={!hasLocation} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">Continue <ChevronRight size={18} /></button>
    </div>
  );
}

function EvidenceStep({ files, onChange, onNext }: { files: File[]; onChange: (files: File[]) => void; onNext: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>(files.map((f) => URL.createObjectURL(f)));

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    const combined = [...files, ...selected].slice(0, 5);
    onChange(combined); setPreviews(combined.map((f) => URL.createObjectURL(f))); e.target.value = '';
  }

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index);
    onChange(updated); setPreviews(updated.map((f) => URL.createObjectURL(f)));
  }

  return (
    <div>
      <h2 className="font-display text-2xl text-slate-900 mb-1">Add evidence</h2>
      <p className="text-slate-500 text-sm mb-2">Photos help officers understand the severity. Up to 5 files.</p>
      <p className="text-xs text-slate-400 mb-5">Accepted: JPEG, PNG, WebP, MP4 (max 20 MB each)</p>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" className="hidden" onChange={handleFileSelect} />
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img src={src} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
              <button onClick={() => removeFile(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {files.length < 5 && (
        <button onClick={() => inputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-2xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-primary-300 hover:text-primary-500 hover:bg-primary-50/40 transition-colors mb-6">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center"><Camera size={22} /></div>
          <span className="text-sm font-medium">Tap to add photos</span>
          <span className="text-xs">{files.length}/5 added</span>
        </button>
      )}
      <div className="flex gap-3">
        <button onClick={onNext} className="btn-secondary flex-1">Skip for now</button>
        <button onClick={onNext} disabled={files.length === 0} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">Continue <ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

function ReviewStep({ formData, isSubmitting, submitError, onSubmit, onEdit }: { formData: FormData; isSubmitting: boolean; submitError: string | null; onSubmit: () => void; onEdit: (step: number) => void }) {
  const cat = CATEGORIES.find((c) => c.value === formData.category);
  return (
    <div>
      <h2 className="font-display text-2xl text-slate-900 mb-1">Review & submit</h2>
      <p className="text-slate-500 text-sm mb-6">Check the details before submitting your complaint.</p>
      <div className="space-y-3 mb-6">
        <div className="card"><div className="flex items-start justify-between gap-2"><div className="flex-1"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Category</p><span className={`inline-flex items-center gap-1.5 text-sm font-medium ${cat?.color}`}>{cat?.icon} {cat?.label}</span></div><button onClick={() => onEdit(0)} className="text-xs text-primary-600 font-medium">Edit</button></div></div>
        <div className="card"><div className="flex items-start justify-between gap-2"><div className="flex-1"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Description</p><p className="text-sm text-slate-700 line-clamp-3">{formData.description}</p></div><button onClick={() => onEdit(1)} className="text-xs text-primary-600 font-medium">Edit</button></div></div>
        <div className="card"><div className="flex items-start justify-between gap-2"><div className="flex-1"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Location</p><p className="text-sm text-slate-700">{formData.address || `${formData.latitude?.toFixed(5)}, ${formData.longitude?.toFixed(5)}`}</p></div><button onClick={() => onEdit(2)} className="text-xs text-primary-600 font-medium">Edit</button></div></div>
        <div className="card"><div className="flex items-start justify-between gap-2"><div className="flex-1"><p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Evidence</p>{formData.files.length === 0 ? <p className="text-sm text-slate-400">No files added</p> : <div className="flex gap-1.5">{formData.files.slice(0, 3).map((f, i) => <div key={i} className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100"><img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" /></div>)}{formData.files.length > 3 && <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><span className="text-xs text-slate-500">+{formData.files.length - 3}</span></div>}</div>}</div><button onClick={() => onEdit(3)} className="text-xs text-primary-600 font-medium">Edit</button></div></div>
      </div>
      {submitError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2"><AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-red-700">{submitError}</p></div>}
      <button onClick={onSubmit} disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
        {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : <><Upload size={18} /> Submit Complaint</>}
      </button>
      <p className="text-center text-xs text-slate-400 mt-3">You'll receive a unique complaint ID after submission.</p>
    </div>
  );
}

function SuccessScreen({ complaintId }: { complaintId: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-xs">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={40} className="text-green-600" /></div>
        <h1 className="font-display text-2xl text-slate-900 mb-2">Complaint Submitted!</h1>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">Your complaint has been registered. You'll receive notifications as it progresses.</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate(`/complaints/${complaintId}`)} className="btn-primary w-full">Track my complaint</button>
          <button onClick={() => navigate('/')} className="btn-secondary w-full">Back to home</button>
        </div>
      </div>
    </div>
  );
}
