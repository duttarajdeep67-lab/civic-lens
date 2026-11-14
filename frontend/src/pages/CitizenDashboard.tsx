import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Camera, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  MapPin, 
  Building2, 
  Sparkles,
  Layers
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { complaintService } from '../services/api';
import { Complaint } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { civicMarkerIcon, civicResolvedIcon } from '../utils/leafletIcon';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const data = await complaintService.getMyComplaints();
        setComplaints(data);
      } catch (err) {
        console.error('Failed to fetch citizen complaints:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const total = complaints.length;
  const submitted = complaints.filter(c => c.status === 'Submitted').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress' || c.status === 'Under Review').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  // Complaints with valid coordinates for map
  const geoComplaints = complaints.filter(c => c.latitude && c.longitude);
  const defaultCenter: [number, number] = geoComplaints.length > 0 
    ? [geoComplaints[0].latitude!, geoComplaints[0].longitude!]
    : [12.9352, 77.6245]; // Default center

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.full_name}!</h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Citizen</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitor reported civic hazards and track department actions in real time.
          </p>
        </div>

        <Link
          to="/report"
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Camera className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Submitted</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{total}</p>
          <p className="text-[11px] text-slate-400 mt-1">Recorded complaints</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Action</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-extrabold text-blue-600">{submitted}</p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting review</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{inProgress}</p>
          <p className="text-[11px] text-slate-400 mt-1">Field team assigned</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">{resolved}</p>
          <p className="text-[11px] text-slate-400 mt-1">Verified resolutions</p>
        </div>
      </div>

      {/* Map and Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>My Complaint Map</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Geographic distribution of your reports</p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {geoComplaints.length} pin{geoComplaints.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="h-80 sm:h-96 rounded-xl overflow-hidden border border-slate-200 relative">
            {geoComplaints.length > 0 ? (
              <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoComplaints.map(c => (
                  <Marker
                    key={c.id}
                    position={[c.latitude!, c.longitude!]}
                    icon={c.status === 'Resolved' ? civicResolvedIcon : civicMarkerIcon}
                  >
                    <Popup>
                      <div className="p-1 space-y-1.5 max-w-[200px]">
                        <p className="text-xs font-bold text-slate-900">{c.title}</p>
                        <p className="text-[11px] text-slate-600">{c.department_name}</p>
                        <div className="flex items-center justify-between pt-1">
                          <StatusBadge status={c.status} size="sm" />
                          <Link to={`/complaints/${c.id}`} className="text-xs text-blue-600 font-semibold hover:underline">
                            View
                          </Link>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-700">No geo-tagged complaints yet</p>
                <p className="text-xs text-slate-400 mt-1">Submit a report with location to see it mapped here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Complaints List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Recent Reports</h3>
            <Link to="/citizen/complaints" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View All ({complaints.length})
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {complaints.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <Camera className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No complaints reported yet</p>
                <Link to="/report" className="text-xs text-blue-600 font-semibold mt-2 hover:underline">
                  Submit your first issue →
                </Link>
              </div>
            ) : (
              complaints.slice(0, 5).map(c => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="block p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {c.tracking_id}
                    </span>
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">{c.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <span className="truncate max-w-[140px]">{c.department_name}</span>
                    <PriorityBadge priority={c.priority} size="sm" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
