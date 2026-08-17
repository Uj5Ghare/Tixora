import React, { useContext } from 'react';
import { TelemetryContext } from '../context/TelemetryContext';
import {
  X,
  Mail,
  KeyRound,
  CheckCircle2,
  Copy,
  Clock,
  Sparkles,
  Inbox,
  AlertTriangle
} from 'lucide-react';

export const NotificationInboxDrawer: React.FC = () => {
  const { isInboxOpen, setIsInboxOpen, notifications, refreshTelemetry } = useContext(TelemetryContext);

  if (!isInboxOpen) return null;

  const handleCopyOTP = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-all">
      <div className="w-full max-w-md bg-white border-l border-slate-200 text-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
              <Mail className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                2FA & Email Dispatcher
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Tixora Notification Microservice (Port 5004)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInboxOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Real-time inter-service notifications and 2FA OTP codes are routed here so you can test authentication and bookings immediately!
          </span>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <Inbox className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-semibold text-sm text-slate-700">No notifications sent yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                When you sign up or submit an event booking request, your 6-digit OTP will appear here instantly.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {notif.otpCode ? (
                      <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        <KeyRound className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-900">{notif.subject}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <div className="text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {notif.content}
                </div>

                {notif.otpCode && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-800 uppercase font-mono tracking-wider font-semibold">
                        OTP Code:
                      </span>
                      <span className="font-mono text-base font-black text-slate-900 tracking-widest px-2.5 py-0.5 bg-white rounded border border-amber-300 shadow-xs">
                        {notif.otpCode}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyOTP(notif.otpCode!)}
                      className="px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Code
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                  <span>To: {notif.recipientEmail}</span>
                  <span className="text-blue-900 font-medium">✓ Delivered (Simulated SMTP)</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{notifications.length} Total Messages</span>
          <button
            onClick={() => refreshTelemetry()}
            className="hover:text-slate-800 transition font-medium cursor-pointer"
          >
            Check for New Messages
          </button>
        </div>
      </div>
    </div>
  );
};
export default NotificationInboxDrawer;
