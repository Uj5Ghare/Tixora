import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { TelemetryContext } from '../context/TelemetryContext';
import { TixoraLogo } from '../components/TixoraLogo';
import { User, KeyRound, Mail, Lock, Sparkles, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, verifyOTP } = useContext(AuthContext);
  const { setIsInboxOpen, latestOTP, refreshTelemetry } = useContext(TelemetryContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!showOTP) {
        await register(name.trim(), email.trim(), password);
        setShowOTP(true);
        refreshTelemetry();
      } else {
        await verifyOTP(email.trim(), otp.trim());
        refreshTelemetry();
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <TixoraLogo iconClassName="w-8 h-8" textSize="text-xl" showText={true} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Create a Tixora Account</h2>
          <p className="text-xs text-slate-500">Autonomous microservices ticketing ecosystem</p>
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
                  <User className="w-3.5 h-3.5 text-orange-600" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-600 focus:bg-white text-sm transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-orange-600" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya@example.com"
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
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-600 focus:bg-white text-sm font-mono transition"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="p-3 bg-white border border-amber-200 rounded-lg text-amber-950 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-900" />
                <span>An activation OTP was sent to {email} by Notification Service.</span>
              </div>

              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-amber-800 flex items-center gap-1">
                  <KeyRound className="w-4 h-4 text-amber-600" /> Enter 6-Digit OTP
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
                <span>Registering on Auth Microservice...</span>
              </>
            ) : showOTP ? (
              'Verify 2FA OTP & Activate'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-600 hover:text-orange-700 font-semibold underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
export default Register;
