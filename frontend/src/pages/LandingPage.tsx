import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Users, 
  Building2, 
  FileCheck2,
  AlertTriangle,
  Layers,
  ExternalLink
} from 'lucide-react';
import { publicService } from '../services/api';
import { PublicStats } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const LandingPage: React.FC = () => {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await publicService.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load public stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleQuickDemoLogin = async (email: string, role: string) => {
    try {
      toast.loading(`Signing in as demo ${role}...`, { id: 'demo-login' });
      await login({ email, password: role === 'Citizen' ? 'Citizen123!' : 'Officer123!' });
      toast.success(`Welcome, ${role}!`, { id: 'demo-login' });
      if (role === 'Citizen') {
        navigate('/citizen/dashboard');
      } else {
        navigate('/officer/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Demo login failed', { id: 'demo-login' });
    }
  };

  const categories = [
    { name: 'Roads & Potholes', dept: 'Roads & Public Works', icon: '🛣️', desc: 'Asphalt cavities, craters, paver collapses' },
    { name: 'Garbage & Waste', dept: 'Sanitation', icon: '🗑️', desc: 'Illegal dumps, overflowing bins, uncollected trash' },
    { name: 'Water Pipe Leaks', dept: 'Water Supply', icon: '💧', desc: 'Supply line bursts, valve leaks, street flooding' },
    { name: 'Sewage & Drains', dept: 'Sewerage & Drainage', icon: '🕳️', desc: 'Open manholes, stormwater blocks, sewage backflow' },
    { name: 'Streetlights', dept: 'Electrical & Lighting', icon: '💡', desc: 'Non-functional lamps, damaged poles, dark corridors' },
    { name: 'Parks & Walkways', dept: 'Parks & Recreation', icon: '🌳', desc: 'Broken footpaths, damaged park benches, overgrowth' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-slate-900 text-white pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span>Next-Gen Civic Governance Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              See It. Report It. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-teal-300 to-sky-200">
                Resolve It.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
              Empowering citizens to report municipal hazards with a single photo. 
              Multimodal Vision AI identifies the issue, drafts the complaint, and routes it directly to responsible departments.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={user ? (user.role === 'citizen' ? '/report' : '/officer/dashboard') : '/register'}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 text-base group"
              >
                <Camera className="w-5 h-5 text-blue-200 group-hover:scale-110 transition-transform" />
                <span>Report an Issue</span>
                <ArrowRight className="w-4 h-4 text-blue-200" />
              </Link>

              <Link
                to={user ? (user.role === 'citizen' ? '/citizen/complaints' : '/officer/complaints') : '/login'}
                className="w-full sm:w-auto px-7 py-3.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold rounded-xl border border-slate-700 backdrop-blur transition-all flex items-center justify-center space-x-2 text-base"
              >
                <span>Track Your Complaints</span>
              </Link>
            </div>
          </div>

          {/* Real Live Platform Metrics */}
          <div className="mt-16 max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="text-center p-3">
              <p className="text-3xl sm:text-4xl font-extrabold text-white">
                {loading ? '...' : stats?.total_complaints ?? 0}
              </p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Total Reported</p>
            </div>
            <div className="text-center p-3">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                {loading ? '...' : stats?.resolved_complaints ?? 0}
              </p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Resolved Issues</p>
            </div>
            <div className="text-center p-3">
              <p className="text-3xl sm:text-4xl font-extrabold text-blue-400">
                {loading ? '...' : `${stats?.resolution_rate ?? 0}%`}
              </p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Resolution Rate</p>
            </div>
            <div className="text-center p-3">
              <p className="text-3xl sm:text-4xl font-extrabold text-teal-400">
                {loading ? '...' : stats?.departments_count ?? 7}
              </p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-1">Departments Active</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Guided Workflow Section */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">How It Works</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Three Steps from Problem to Resolution
            </h3>
            <p className="text-slate-600 text-sm mt-3">
              No complex paperwork or lengthy descriptions. Advanced Vision AI does the heavy lifting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Capture the Problem</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Take a photograph using your mobile browser or upload an existing image from your camera roll. No manual typing required.
              </p>
              <div className="flex items-center text-xs font-medium text-blue-600">
                <Camera className="w-4 h-4 mr-1.5" />
                <span>Instant photo preview & capture</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-50/50 to-teal-50/50 border border-teal-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg mb-4 shadow-sm shadow-teal-500/30">
                2
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Let AI Analyze It</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Google Gemini Vision inspects the photo, classifies the civic issue, suggests priority, and assigns the correct government department.
              </p>
              <div className="flex items-center text-xs font-medium text-teal-700">
                <Sparkles className="w-4 h-4 mr-1.5" />
                <span>Multimodal Vision AI Analysis</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Track Its Resolution</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Confirm your GPS location on the interactive map. Receive a unique tracking ID and watch real-time department updates with photo proof.
              </p>
              <div className="flex items-center text-xs font-medium text-emerald-600">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                <span>Transparent resolution evidence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Intelligent Dispatch</h2>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Supported Civic Categories
            </h3>
            <p className="text-slate-600 text-sm mt-3">
              Automated category-to-department routing guarantees complaints land on the desk of the right municipal officers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
                <div className="flex items-start space-x-4">
                  <span className="text-3xl">{cat.icon}</span>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{cat.name}</h4>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {cat.dept}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">{cat.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Demo Accounts Hub */}
      <section className="py-16 bg-navy-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Demonstration Quick Access</span>
            <h3 className="text-2xl sm:text-3xl font-bold mt-1 text-white">One-Click Demonstration Logins</h3>
            <p className="text-xs text-slate-400 mt-2">
              Evaluate citizen reporting workflows and isolated department officer portals instantly without manual registration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {/* Citizen Demo */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Citizen</span>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="font-bold text-sm text-white">Rajesh Sharma</h4>
                <p className="text-xs text-slate-400 mt-1">citizen@civiclens.gov</p>
                <p className="text-[11px] text-slate-500 mt-2">Access citizen dashboard & submit AI complaints</p>
              </div>
              <button
                onClick={() => handleQuickDemoLogin('citizen@civiclens.gov', 'Citizen')}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <span>Login as Citizen</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Roads Officer Demo */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Roads Officer</span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="font-bold text-sm text-white">Vikram Malhotra</h4>
                <p className="text-xs text-slate-400 mt-1">officer.roads@civiclens.gov</p>
                <p className="text-[11px] text-slate-500 mt-2">Roads & Public Works Dept Queue</p>
              </div>
              <button
                onClick={() => handleQuickDemoLogin('officer.roads@civiclens.gov', 'Roads Officer')}
                className="mt-4 w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <span>Login as Roads Officer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sanitation Officer Demo */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Sanitation Officer</span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="font-bold text-sm text-white">Ananya Deshmukh</h4>
                <p className="text-xs text-slate-400 mt-1">officer.sanitation@civiclens.gov</p>
                <p className="text-[11px] text-slate-500 mt-2">Sanitation & Solid Waste Queue</p>
              </div>
              <button
                onClick={() => handleQuickDemoLogin('officer.sanitation@civiclens.gov', 'Sanitation Officer')}
                className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <span>Login as Sanitation Officer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Water Supply Officer Demo */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Water Officer</span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="font-bold text-sm text-white">Suresh Nair</h4>
                <p className="text-xs text-slate-400 mt-1">officer.water@civiclens.gov</p>
                <p className="text-[11px] text-slate-500 mt-2">Water Supply & Pipeline Queue</p>
              </div>
              <button
                onClick={() => handleQuickDemoLogin('officer.water@civiclens.gov', 'Water Officer')}
                className="mt-4 w-full py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <span>Login as Water Officer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
