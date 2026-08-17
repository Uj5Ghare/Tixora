import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { TelemetryContext } from '../context/TelemetryContext';
import { TixoraLogo } from './TixoraLogo';
import {
  Server,
  Mail,
  User as UserIcon,
  Shield,
  LogOut,
  Sparkles,
  Layers,
  CheckCircle2,
  Activity
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, quickLoginAs } = useContext(AuthContext);
  const { services, notifications, setIsDrawerOpen, setIsInboxOpen } = useContext(TelemetryContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const healthyServicesCount = services.filter(s => s.status === 'healthy').length;

  return (
    <nav className="h-16 bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="group flex items-center hover:opacity-95 transition" title="Tixora Event Platform">
              <TixoraLogo
                iconClassName="w-8 h-8"
                textSize="text-xl"
                subtitle="MICROSERVICES ARCHITECTURE"
              />
            </Link>

            {/* Microservices Topology status pill button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-orange-50/60 border border-slate-200 hover:border-orange-200 text-xs font-medium text-slate-600 hover:text-orange-950 transition shadow-xs cursor-pointer"
              title="View Live Microservices Architecture & Telemetry"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="font-mono font-semibold text-slate-800">
                {healthyServicesCount}/{services.length || 6} Services Live
              </span>
              <Layers className="w-3.5 h-3.5 text-orange-600 ml-0.5" />
            </button>
          </div>

          {/* Navigation Links & Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                location.pathname === '/'
                  ? 'bg-orange-50 text-orange-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Events
            </Link>

            {/* Architecture Overview Page link */}
            <Link
              to="/architecture"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                location.pathname === '/architecture'
                  ? 'bg-orange-50 text-orange-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Server className="w-4 h-4 text-orange-600" />
              <span>Microservices</span>
            </Link>

            {/* Live 2FA / OTP Inbox Trigger */}
            <button
              onClick={() => setIsInboxOpen(true)}
              className="relative p-2 rounded-lg bg-slate-50 hover:bg-orange-50/60 text-slate-700 hover:text-orange-600 transition border border-slate-200 shadow-xs cursor-pointer"
              title="Open Live 2FA & Notification Inbox"
            >
              <Mail className="w-4 h-4 text-orange-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-orange-600 text-[10px] font-bold text-white shadow-xs">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Quick Demo Login Switcher */}
            {!user && (
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-[11px] text-slate-500 px-1 font-medium">Demo:</span>
                <button
                  onClick={() => quickLoginAs('admin')}
                  className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium transition border border-amber-200/60 cursor-pointer"
                >
                  Admin
                </button>
                <button
                  onClick={() => quickLoginAs('user')}
                  className="px-2 py-1 rounded bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium transition border border-orange-200/60 cursor-pointer"
                >
                  User
                </button>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    location.pathname.startsWith('/admin') || location.pathname.startsWith('/dashboard')
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {user.role === 'admin' ? <Shield className="w-4 h-4 text-amber-400" /> : <UserIcon className="w-4 h-4 text-orange-400" />}
                  <span>{user.role === 'admin' ? 'Admin Panel' : 'My Dashboard'}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-rose-600 transition border border-slate-200 cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 hover:bg-orange-500 text-white transition shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
