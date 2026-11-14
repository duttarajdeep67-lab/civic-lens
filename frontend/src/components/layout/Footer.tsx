import React from 'react';
import { Building2, ShieldCheck, Cpu, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Civic<span className="text-blue-400">Lens</span></span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              An intelligent civic governance platform bridging citizens and municipal administration through multimodal Vision AI.
            </p>
            <div className="flex items-center space-x-2 text-xs text-teal-400">
              <Cpu className="w-4 h-4" />
              <span>Powered by Google Gemini 2.5 Flash</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-3">Citizens</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/report" className="hover:text-white transition-colors">Report New Civic Problem</Link>
              </li>
              <li>
                <Link to="/citizen/complaints" className="hover:text-white transition-colors">Track Complaint Status</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">Register Citizen Account</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">Citizen Portal Login</Link>
              </li>
            </ul>
          </div>

          {/* Administration */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-3">Department Officers</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">Department Officer Login</Link>
              </li>
              <li>
                <Link to="/officer/dashboard" className="hover:text-white transition-colors">Operational Dashboard</Link>
              </li>
              <li>
                <Link to="/officer/complaints" className="hover:text-white transition-colors">Complaint Resolution Queue</Link>
              </li>
              <li>
                <span className="text-slate-500">Department Access Isolation Enforced</span>
              </li>
            </ul>
          </div>

          {/* Compliance & Architecture */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-3">Civic Architecture</h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Standardized category-to-department routing, GPS reverse-geocoding, transparent audit trail, and verified resolution evidence.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full Audit Trail & Evidence Verification</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CivicLens Municipal Governance Platform. College Capstone & Engineering Demonstration.</p>
          <p className="mt-2 sm:mt-0 font-medium">Tagline: See It. Report It. Resolve It.</p>
        </div>
      </div>
    </footer>
  );
};
