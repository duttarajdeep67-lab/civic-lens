import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft,
  Calendar,
  FileText,
  ShieldCheck,
  User,
  PlusCircle,
  Upload,
  Check
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { toast } from 'sonner';

import { complaintService, officerService } from '../services/api';
import { Complaint, ComplaintUpdate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { civicMarkerIcon, civicResolvedIcon } from '../utils/leafletIcon';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isOfficer } = useAuth();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Officer action dialog state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [actionNote, setActionNote] = useState<string>('');
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // If officer, call officerService, else complaintService
      let data: Complaint;
      if (user?.role === 'officer') {
        data = await officerService.getComplaintDetail(id);
      } else {
        data = await complaintService.getComplaintDetail(id);
      }
      setComplaint(data);
    } catch (err: any) {
      console.error('Failed to load complaint detail:', err);
      setError(err.response?.data?.detail || 'Unable to access complaint. You may not be authorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id, user]);

  const handleOpenAction = (status: string) => {
    setTargetStatus(status);
    setActionNote('');
    setResolutionFile(null);
    setActionModalOpen(true);
  };

  const handleExecuteStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;

    if ((targetStatus === 'Resolved' || targetStatus === 'Rejected') && (!actionNote || actionNote.trim().length < 5)) {
      toast.error(`A detailed note (min 5 characters) is required when setting status to ${targetStatus}.`);
      return;
    }

    setIsUpdating(true);
    try {
      let resolutionImageUrl: string | undefined = undefined;
      if (resolutionFile) {
        const uploadResp = await officerService.uploadResolutionImage(complaint.id, resolutionFile);
        resolutionImageUrl = uploadResp.resolution_image_url;
      }

      await officerService.updateStatus(complaint.id, {
        status: targetStatus,
        note: actionNote.trim(),
        resolution_image_url: resolutionImageUrl
      });

      toast.success(`Complaint status successfully updated to ${targetStatus}!`);
      setActionModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      console.error('Status update failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNoteOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !actionNote.trim()) return;

    setIsUpdating(true);
    try {
      await officerService.addProgressNote(complaint.id, actionNote.trim());
      toast.success('Progress note recorded to complaint audit trail.');
      setActionModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add progress note');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading complaint dossier...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted or Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This complaint does not exist or you do not have permission to view it.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Previous Page</span>
        </button>
      </div>
    );
  }

  const isAssignedOfficer = user?.role === 'officer' && user?.department_id === complaint.department_id;
  const coordinates: [number, number] = [
    complaint.latitude || 12.9352,
    complaint.longitude || 77.6245
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {complaint.tracking_id}
              </span>
              <StatusBadge status={complaint.status} size="md" />
              <PriorityBadge priority={complaint.priority} size="md" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{complaint.title}</h1>
          </div>
        </div>

        {/* Officer Actions Bar */}
        {isAssignedOfficer && (
          <div className="flex flex-wrap items-center gap-2">
            {complaint.status === 'Submitted' && (
              <button
                onClick={() => handleOpenAction('Under Review')}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Mark Under Review
              </button>
            )}
            {(complaint.status === 'Submitted' || complaint.status === 'Under Review') && (
              <button
                onClick={() => handleOpenAction('In Progress')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Dispatch / In Progress
              </button>
            )}
            {complaint.status === 'In Progress' && (
              <button
                onClick={() => handleOpenAction('Resolved')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                Mark Resolved
              </button>
            )}
            {complaint.status !== 'Resolved' && complaint.status !== 'Rejected' && (
              <button
                onClick={() => handleOpenAction('Rejected')}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-all"
              >
                Reject
              </button>
            )}
            <button
              onClick={() => handleOpenAction('Note')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Add Note
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Dossier / Right Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Evidence Photos, AI Details, Location */}
        <div className="lg:col-span-2 space-y-6">

          {/* Photographic Record: Original vs Resolution Evidence */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
              Photographic Evidence
            </h3>

            <div className={`grid gap-4 ${complaint.updates?.some(u => u.resolution_image_url) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
                  Original Citizen Report Photo
                </span>
                <div className="rounded-xl overflow-hidden bg-slate-950 max-h-72 flex items-center justify-center border border-slate-200">
                  <img
                    src={complaint.image_url}
                    alt="Original Problem"
                    className="max-h-72 w-full object-cover"
                  />
                </div>
              </div>

              {/* Resolution Image */}
              {complaint.updates?.find(u => u.resolution_image_url) && (
                <div>
                  <span className="text-[11px] font-semibold text-emerald-600 mb-1.5 block flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Official Resolution Evidence</span>
                  </span>
                  <div className="rounded-xl overflow-hidden bg-slate-950 max-h-72 flex items-center justify-center border border-emerald-300">
                    <img
                      src={complaint.updates.find(u => u.resolution_image_url)?.resolution_image_url}
                      alt="Resolution Evidence"
                      className="max-h-72 w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Multimodal Analysis Metadata Card */}
          {complaint.ai_detected && (
            <div className="bg-gradient-to-r from-blue-50/80 to-teal-50/80 p-5 rounded-2xl border border-teal-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-teal-800 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Google Gemini Multimodal AI Classification</span>
                </div>
                {complaint.ai_confidence && (
                  <span className="text-[10px] font-bold bg-white text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                    Confidence: {complaint.ai_confidence}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">Visual Reasoning: </span>
                {complaint.ai_reasoning_summary || 'Visual surface characteristics matched standard municipal infrastructure damage patterns.'}
              </p>
            </div>
          )}

          {/* Issue Details & Assignment */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500">
              Complaint Specifics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Category</span>
                <p className="font-bold text-slate-900 mt-0.5">{complaint.category_name}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Responsible Department</span>
                <p className="font-bold text-slate-900 mt-0.5">{complaint.department_name}</p>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Detailed Description</span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Location & Interactive Map */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Geographic Location</span>
              </h3>
              {complaint.latitude && complaint.longitude && (
                <span className="text-[11px] font-mono text-slate-500">
                  {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 font-medium">{complaint.address || 'Address provided by GPS'}</p>

            <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
              <MapContainer
                center={coordinates}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={coordinates}
                  icon={complaint.status === 'Resolved' ? civicResolvedIcon : civicMarkerIcon}
                >
                  <Popup>
                    <div className="p-1">
                      <p className="text-xs font-bold">{complaint.title}</p>
                      <p className="text-[11px] text-slate-600">{complaint.address}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Audit Trail & Timeline */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Status & Audit History</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Real-Time</span>
            </div>

            {/* Timeline Events List */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {complaint.updates && complaint.updates.length > 0 ? (
                complaint.updates.map((up, idx) => (
                  <div key={up.id || idx} className="relative group">
                    {/* Dot */}
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={up.new_status} size="sm" />
                        <span className="text-[10px] text-slate-400">
                          {new Date(up.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {up.note && (
                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                          {up.note}
                        </p>
                      )}

                      <div className="flex items-center space-x-1 text-[10px] text-slate-400 pt-0.5">
                        <User className="w-3 h-3" />
                        <span>{up.officer_name || 'System / Citizen'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No status events recorded yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* OFFICER ACTION MODAL */}
      {actionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {targetStatus === 'Note' ? 'Add Progress Note' : `Update Status: ${targetStatus}`}
              </h3>
              <button
                onClick={() => setActionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={targetStatus === 'Note' ? handleAddNoteOnly : handleExecuteStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {targetStatus === 'Resolved' 
                    ? 'Resolution Note (Required - min 5 chars)' 
                    : targetStatus === 'Rejected'
                    ? 'Rejection Reason (Required)'
                    : 'Officer Note / Remarks'}
                </label>
                <textarea
                  rows={3}
                  required={targetStatus === 'Resolved' || targetStatus === 'Rejected' || targetStatus === 'Note'}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Detail work performed, field inspection notes, or rejection rationale..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>

              {/* Resolution Image Evidence Upload */}
              {targetStatus === 'Resolved' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload Resolution Evidence Photo (Recommended)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setResolutionFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {resolutionFile && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                      Selected: {resolutionFile.name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  {isUpdating ? 'Recording...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
