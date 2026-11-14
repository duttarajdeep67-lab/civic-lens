import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  MapPin, 
  Filter, 
  ArrowRight,
  Layers,
  BarChart3,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { officerService } from '../services/api';
import { DepartmentDashboardStats, Complaint } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { civicMarkerIcon, civicResolvedIcon } from '../utils/leafletIcon';

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#64748b',
};

export const OfficerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DepartmentDashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashStats, deptComplaints] = await Promise.all([
          officerService.getDashboard(),
          officerService.getDepartmentComplaints({ limit: 15 })
        ]);
        setStats(dashStats);
        setComplaints(deptComplaints);
      } catch (err) {
        console.error('Failed to fetch officer dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const priorityPieData = stats?.priority_distribution
    ? Object.entries(stats.priority_distribution)
        .filter(([_, count]) => count > 0)
        .map(([priority, count]) => ({
          name: priority,
          value: count,
          color: PRIORITY_COLORS[priority] || '#94a3b8'
        }))
    : [];

  const categoryBarData = stats?.category_distribution
    ? Object.entries(stats.category_distribution).map(([cat, count]) => ({
        name: cat.length > 18 ? `${cat.substring(0, 16)}...` : cat,
        count
      }))
    : [];

  const geoComplaints = complaints.filter(c => c.latitude && c.longitude);
  const defaultCenter: [number, number] = geoComplaints.length > 0
    ? [geoComplaints[0].latitude!, geoComplaints[0].longitude!]
    : [12.9352, 77.6245];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Department Portal
            </span>
            <span className="text-xs text-slate-500 font-medium">| {user?.department_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Officer Dashboard — {user?.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational triage and resolution dispatch management for {user?.department_name || 'assigned jurisdiction'}.
          </p>
        </div>

        <Link
          to="/officer/complaints"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all self-start sm:self-auto"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Manage Incident Queue</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assigned Total</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{stats?.total ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Department queue</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">New / Submitted</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-extrabold text-blue-600">{stats?.submitted ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Requires review</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Under Review</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600">{stats?.under_review ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Field assessment</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{stats?.in_progress ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Maintenance active</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">{stats?.resolved ?? 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Completed repairs</p>
        </div>
      </div>

      {/* Visual Analytics Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown BarChart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Complaints by Issue Category</span>
            </h3>
            <span className="text-[11px] text-slate-400">Department metrics</span>
          </div>

          <div className="h-64 w-full">
            {categoryBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Priority Breakdown PieChart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-purple-600" />
              <span>Priority Severity Distribution</span>
            </h3>
            <span className="text-[11px] text-slate-400">Triage levels</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {priorityPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {priorityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No priority data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Department Complaint Map & Urgent Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span>Department Incident Geo-Map</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Spatial concentration of active work orders</p>
            </div>
            <span className="text-xs font-mono font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              {geoComplaints.length} locations
            </span>
          </div>

          <div className="h-80 rounded-xl overflow-hidden border border-slate-200">
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
                    <div className="p-1 space-y-1">
                      <p className="text-xs font-bold">{c.title}</p>
                      <p className="text-[10px] text-slate-500">{c.tracking_id}</p>
                      <div className="flex items-center justify-between pt-1">
                        <StatusBadge status={c.status} size="sm" />
                        <Link to={`/complaints/${c.id}`} className="text-xs text-purple-600 font-semibold hover:underline">
                          Triage →
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Priority Queue Sidebar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Urgent Triage Queue</h3>
            <Link to="/officer/complaints" className="text-xs font-semibold text-purple-600 hover:underline">
              All ({complaints.length})
            </Link>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
            {complaints.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No active complaints in department queue.
              </div>
            ) : (
              complaints.slice(0, 6).map(c => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                      {c.tracking_id}
                    </span>
                    <PriorityBadge priority={c.priority} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{c.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                    <StatusBadge status={c.status} size="sm" />
                    <span>{new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
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
