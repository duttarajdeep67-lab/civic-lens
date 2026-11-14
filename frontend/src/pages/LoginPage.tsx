import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, LogIn, Building2, Shield, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleTab, setRoleTab] = useState<'citizen' | 'officer'>('citizen');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const resp = await login(data);
      toast.success(`Welcome back, ${resp.user.full_name}!`);
      
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      } else if (resp.user.role === 'officer' || resp.user.role === 'admin') {
        navigate('/officer/dashboard', { replace: true });
      } else {
        navigate('/citizen/dashboard', { replace: true });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDemoCredentials = (email: string, role: 'citizen' | 'officer') => {
    setRoleTab(role);
    setValue('email', email);
    setValue('password', role === 'citizen' ? 'Citizen123!' : 'Officer123!');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign in to CivicLens
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Select your role to access your civic portal
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setRoleTab('citizen')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              roleTab === 'citizen' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen Portal</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleTab('officer')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              roleTab === 'officer' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Department Officer</span>
          </button>
        </div>

        {/* Form */}
        <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder={roleTab === 'citizen' ? 'citizen@civiclens.gov' : 'officer.roads@civiclens.gov'}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.email ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500'
              }`}
            />
            {errors.email && (
              <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm pr-10 focus:outline-none focus:ring-2 transition-all ${
                  errors.password ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-100 focus:border-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-xl text-sm font-semibold text-white shadow-sm flex items-center justify-center space-x-2 transition-all ${
              roleTab === 'citizen'
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                : 'bg-purple-700 hover:bg-purple-800 shadow-purple-500/20'
            } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{roleTab === 'citizen' ? 'Sign In as Citizen' : 'Sign In as Officer'}</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Fill Buttons */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
            Quick Fill Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDemoCredentials('citizen@civiclens.gov', 'citizen')}
              className="p-2 text-left bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors"
            >
              <div className="font-semibold text-slate-800">Rajesh Sharma</div>
              <div className="text-[10px] text-blue-600">Citizen</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('officer.roads@civiclens.gov', 'officer')}
              className="p-2 text-left bg-slate-50 hover:bg-purple-50 rounded-lg border border-slate-200 hover:border-purple-200 transition-colors"
            >
              <div className="font-semibold text-slate-800">Vikram Malhotra</div>
              <div className="text-[10px] text-purple-600">Roads Officer</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('officer.sanitation@civiclens.gov', 'officer')}
              className="p-2 text-left bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200 hover:border-amber-200 transition-colors"
            >
              <div className="font-semibold text-slate-800">Ananya Deshmukh</div>
              <div className="text-[10px] text-amber-600">Sanitation Officer</div>
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('officer.water@civiclens.gov', 'officer')}
              className="p-2 text-left bg-slate-50 hover:bg-teal-50 rounded-lg border border-slate-200 hover:border-teal-200 transition-colors"
            >
              <div className="font-semibold text-slate-800">Suresh Nair</div>
              <div className="text-[10px] text-teal-600">Water Officer</div>
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-600">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
            Register as Citizen
          </Link>
        </p>
      </div>
    </div>
  );
};
