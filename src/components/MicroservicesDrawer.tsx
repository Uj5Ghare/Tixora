import React, { useContext, useState } from 'react';
import { TelemetryContext } from '../context/TelemetryContext';
import {
  X,
  Activity,
  Server,
  Radio,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  Shield,
  Calendar,
  CreditCard,
  Mail,
  Cpu
} from 'lucide-react';

export const MicroservicesDrawer: React.FC = () => {
  const { isDrawerOpen, setIsDrawerOpen, services, events, dbStats, resetDatabase, refreshTelemetry } =
    useContext(TelemetryContext);
  const [activeTab, setActiveTab] = useState<'topology' | 'events' | 'database'>('topology');
  const [isResetting, setIsResetting] = useState(false);

  if (!isDrawerOpen) return null;

  const handleReset = async () => {
    setIsResetting(true);
    await resetDatabase();
    setIsResetting(false);
  };

  const getServiceIcon = (id: string) => {
    switch (id) {
      case 'api-gateway':
        return <Cpu className="w-5 h-5 text-orange-600" />;
      case 'auth-service':
        return <Shield className="w-5 h-5 text-amber-600" />;
      case 'event-service':
        return <Calendar className="w-5 h-5 text-orange-600" />;
      case 'booking-service':
        return <Activity className="w-5 h-5 text-blue-600" />;
      case 'notification-service':
        return <Mail className="w-5 h-5 text-purple-600" />;
      case 'payment-service':
        return <CreditCard className="w-5 h-5 text-rose-600" />;
      default:
        return <Server className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-all">
      <div
        className="w-full max-w-2xl bg-white border-l border-slate-200 text-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
              <Radio className="w-5 h-5 text-orange-600 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Tixora Microservices Telemetry
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Decoupled Architecture • Event-Driven Core
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-white">
          <button
            onClick={() => setActiveTab('topology')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'topology'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            Services Topology ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'events'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            EventBus Stream ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'database'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            Data State
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'topology' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Active Microservices Cluster</span>
                <span className="text-blue-950 flex items-center gap-1 font-medium bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-900" /> All Services Operational
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-200 transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                          {getServiceIcon(svc.id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{svc.name}</h3>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                              Port {svc.port}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{svc.description}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-blue-50 text-blue-900 border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        {svc.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs font-mono">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">Requests</span>
                        <span className="text-slate-800 font-bold">{svc.requestsHandled}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">Latency</span>
                        <span className="text-orange-600 font-bold">{svc.avgResponseTimeMs}ms</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[10px]">Uptime</span>
                        <span className="text-slate-700 font-bold">{svc.uptimeSeconds}s</span>
                      </div>
                    </div>

                    {svc.dependencies.length > 0 && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <span className="text-slate-400">Depends on:</span>
                        {svc.dependencies.map((dep) => (
                          <span key={dep} className="px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                            {dep}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Distributed Event Stream (Pub/Sub)</span>
                <span className="text-orange-600 font-mono text-[11px] font-semibold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">Real-Time Feed</span>
              </div>

              {events.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-sm">
                  No events recorded yet. Perform actions like booking or creating events to see live bus messages.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-bold text-[11px] border border-orange-200">
                            {evt.eventType}
                          </span>
                          <span className="text-slate-400 text-[10px]">from</span>
                          <span className="text-slate-800 font-semibold">{evt.sourceService}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="mt-2 p-2.5 bg-slate-900 rounded-lg text-slate-200 text-[11px] overflow-x-auto border border-slate-800">
                        {JSON.stringify(evt.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-orange-600" /> Current Distributed Entity Store
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">Users</span>
                    <span className="text-xl font-bold text-slate-900">{dbStats.totalUsers || 0}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">Events</span>
                    <span className="text-xl font-bold text-slate-900">{dbStats.totalEvents || 0}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">Bookings</span>
                    <span className="text-xl font-bold text-slate-900">{dbStats.totalBookings || 0}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">Active OTPs</span>
                    <span className="text-xl font-bold text-amber-600">{dbStats.activeOTPs || 0}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 col-span-2">
                    <span className="text-slate-400 text-[10px] block">Notifications Dispatched</span>
                    <span className="text-xl font-bold text-blue-900">
                      {dbStats.dispatchedNotifications || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Reset Cluster & Seed Data</h4>
                  <p className="text-xs text-slate-500">
                    Restores all microservices with initial users, events, and sample orders.
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  {isResetting ? 'Resetting...' : 'Re-seed All'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span className="text-blue-900 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Cluster Status: ACTIVE
          </span>
          <button
            onClick={() => refreshTelemetry()}
            className="flex items-center gap-1 hover:text-slate-800 transition font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
};
export default MicroservicesDrawer;
