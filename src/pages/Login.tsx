import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { TelemetryContext } from '../context/TelemetryContext';
import { TixoraLogo } from '../components/TixoraLogo';
import { Shield, KeyRound, Mail, Lock, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, verifyOTP, quickLoginAs } = useContext(AuthContext);
  const { setIsInboxOpen, latestOTP, refreshTelemetry } = useContext(TelemetryContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!showOTP) {
        const data = await login(email.trim(), password);
        refreshTelemetry();
        if (data.role === 'admin') navigate('/admin');
        else navigate('/dashboard');
      } else {
        const data = await verifyOTP(email.trim(), otp.trim());
        refreshTelemetry();
        if (data.role === 'admin') navigate('/admin');
        else navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.needsVerification) {
        setShowOTP(true);
        setError('2FA Verification Required: A 6-digit OTP has been dispatched to your email.');
        refreshTelemetry();
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutofillLatestOTP = () => {
    if (latestOTP) {
      setOtp(latestOTP);
    } else {
      setIsInboxOpen(true);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 space-y-6">
      {/* Quick Demo Switcher Card */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 text-orange-600 font-semibold">
            <Sparkles className="w-4 h-4" /> Quick 1-Click Login
          </span>
          <span className="font-mono text-[10px]">Pre-seeded Credentials</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                setError('');
                const data = await quickLoginAs('admin');
                refreshTelemetry();
                if (data.role === 'admin') navigate('/admin');
                else navigate('/dashboard');
              } catch (err: any) {
                setError(err.message || 'Admin login failed');
              } finally {
                setLoading(false);
              }
            }}
            className="py-2 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Shield className="w-3.5 h-3.5" /> Login as Admin
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                setError('');
                const data = await quickLoginAs('user');
                refreshTelemetry();
                navigate('/dashboard');
              } catch (err: any) {
                setError(err.message || 'Demo user login failed');
              } finally {
                setLoading(false);
              }
            }}
            className="py-2 px-3 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5" /> Login as Demo User
          </button>
        </div>
      </div>

      {/* Main Login Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <TixoraLogo iconClassName="w-8 h-8" textSize="text-xl" showText={true} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign In to Tixora</h2>
          <p className="text-xs text-slate-500">Secure access via Auth Microservice (Port 5001)</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!showOTP ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-orange-600" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tixora.com or user@tixora.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-600 focus:bg-white text-sm transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-orange-600" /> Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-600 focus:bg-white text-sm font-mono transition"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Admin: <strong>admin@tixora.com</strong></span>
                  <span className="text-slate-400">pass: password123</span>
                </div>
                <div className="flex justify-between">
                  <span>User: <strong>user@tixora.com</strong></span>
                  <span className="text-slate-400">pass: password123</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-800 flex items-center gap-1">
                  <KeyRound className="w-4 h-4 text-amber-600" /> 6-Digit 2FA OTP
                </label>
                <button
                  type="button"
                  onClick={handleAutofillLatestOTP}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-900 underline cursor-pointer"
                >
                  Autofill from Mailbox
                </button>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full text-center font-mono text-xl font-bold tracking-widest py-3 rounded-lg bg-white border border-amber-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating with Auth Service...</span>
              </>
            ) : showOTP ? (
              'Verify 2FA OTP & Sign In'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-orange-600 hover:text-orange-700 font-semibold underline">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
};
export default Login;
