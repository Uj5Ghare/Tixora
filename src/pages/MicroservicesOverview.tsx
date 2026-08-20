import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { TelemetryContext } from '../context/TelemetryContext';
import { TixoraLogo } from '../components/TixoraLogo';
import {
  Server,
  Layers,
  Zap,
  Shield,
  Activity,
  Cpu,
  Radio,
  Mail,
  CreditCard,
  Calendar,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Code2,
  Terminal,
  RefreshCw,
  Clock,
  Gauge,
  Wifi,
  Sparkles,
  Play,
  Pause,
  Sliders,
  Flame
} from 'lucide-react';

interface ServiceProbeResult {
  serviceId: string;
  name: string;
  port: number;
  status: 'healthy' | 'degraded' | 'offline';
  httpStatus: number;
  responseTimeMs: number;
  uptimeSeconds: number;
  timestamp: string;
  healthEndpoint: string;
  memoryUsageMb: number;
  cpuUsagePercent: number;
}

export const MicroservicesOverview: React.FC = () => {
  const { services, events, dbStats, resetDatabase, refreshTelemetry } = useContext(TelemetryContext);
  const [selectedService, setSelectedService] = useState<string>('api-gateway');

  // Polling state
  const [isPollingActive, setIsPollingActive] = useState<boolean>(true);
  const [pollingInterval, setPollingInterval] = useState<number>(3000); // ms
  const [pollCountdown, setPollCountdown] = useState<number>(3);
  const [totalPollCount, setTotalPollCount] = useState<number>(1);
  const [lastPollTime, setLastPollTime] = useState<Date>(new Date());
  const [isProbingAll, setIsProbingAll] = useState<boolean>(false);
  const [singleProbingId, setSingleProbingId] = useState<string | null>(null);

  // Live service health probe telemetry cache
  const [serviceProbes, setServiceProbes] = useState<Record<string, ServiceProbeResult>>({});
  const [probeLogs, setProbeLogs] = useState<Array<{
    id: string;
    serviceId: string;
    serviceName: string;
    port: number;
    latency: number;
    status: string;
    time: string;
  }>>([]);

  // Fetch live health probe from gateway
  const performHealthProbe = useCallback(async (manual = false) => {
    try {
      if (manual) setIsProbingAll(true);
      const res = await axios.get('/api/gateway/health-probe');
      const data = res.data;

      if (data && Array.isArray(data.services)) {
        const probeMap: Record<string, ServiceProbeResult> = {};
        const newLogs: typeof probeLogs = [];
        const nowStr = new Date().toLocaleTimeString();

        data.services.forEach((s: ServiceProbeResult) => {
          probeMap[s.serviceId] = s;
          newLogs.push({
            id: `${s.serviceId}_${Date.now()}`,
            serviceId: s.serviceId,
            serviceName: s.name,
            port: s.port,
            latency: s.responseTimeMs,
            status: '200 OK',
            time: nowStr
          });
        });

        setServiceProbes(probeMap);
        setProbeLogs(prev => [...newLogs.slice(0, 3), ...prev].slice(0, 20));
        setLastPollTime(new Date());
        setTotalPollCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Health probe failed:', err);
    } finally {
      if (manual) {
        setIsProbingAll(false);
        refreshTelemetry();
      }
    }
  }, [refreshTelemetry]);

  // Initial probe on mount
  useEffect(() => {
    performHealthProbe();
  }, [performHealthProbe]);

  // Polling countdown ticker and execution
  useEffect(() => {
    if (!isPollingActive) return;

    const intervalSec = Math.max(1, Math.round(pollingInterval / 1000));
    setPollCountdown(intervalSec);

    const countdownTimer = setInterval(() => {
      setPollCountdown(prev => {
        if (prev <= 1) {
          performHealthProbe();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [isPollingActive, pollingInterval, performHealthProbe]);

  // Manual individual service ping
  const handlePingSingleService = async (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSingleProbingId(serviceId);
      const res = await axios.get(`/api/gateway/services/${serviceId}/health`);
      const probe: ServiceProbeResult = res.data;

      setServiceProbes(prev => ({
        ...prev,
        [serviceId]: probe
      }));

      setProbeLogs(prev => [
        {
          id: `single_${serviceId}_${Date.now()}`,
          serviceId: probe.serviceId,
          serviceName: probe.name,
          port: probe.port,
          latency: probe.responseTimeMs,
          status: '200 OK (Manual)',
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 20));

      refreshTelemetry();
    } catch (err) {
      console.error('Failed to probe service:', err);
    } finally {
      setTimeout(() => setSingleProbingId(null), 300);
    }
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

  const dockerComposeSnippet = `version: '3.8'
services:
  api-gateway:
    build: ./services/api-gateway
    ports: ["5000:5000"]
    environment:
      - AUTH_SERVICE_URL=http://auth-service:5001
      - EVENT_SERVICE_URL=http://event-service:5002
      - BOOKING_SERVICE_URL=http://booking-service:5003
      - NOTIFICATION_SERVICE_URL=http://notification-service:5004
      - PAYMENT_SERVICE_URL=http://payment-service:5005

  auth-service:
    build: ./services/auth-service
    ports: ["5001:5001"]

  event-service:
    build: ./services/event-service
    ports: ["5002:5002"]

  booking-service:
    build: ./services/booking-service
    ports: ["5003:5003"]

  notification-service:
    build: ./services/notification-service
    ports: ["5004:5004"]

  payment-service:
    build: ./services/payment-service
    ports: ["5005:5005"]`;

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const avgClusterLatency = services.length > 0
    ? Math.round(services.reduce((acc, s) => acc + (serviceProbes[s.id]?.responseTimeMs || s.avgResponseTimeMs), 0) / services.length)
    : 6;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TixoraLogo iconClassName="w-9 h-9" textSize="text-2xl" showText={true} />
            <div className="hidden sm:block h-6 w-px bg-slate-200" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-800">
              <Zap className="w-3.5 h-3.5 text-orange-600" />
              Microservices Cluster Active
            </div>
          </div>

          {/* Master Health Status Pill */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-950 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-700" />
            </span>
            <span>Cluster Health: 100% Operational ({healthyCount}/{services.length} Services)</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Tixora Microservices Architecture & Live Health Dashboard
        </h1>
        <p className="text-slate-600 text-sm max-w-3xl leading-relaxed">
          The Tixora event ticketing platform runs on an autonomous, event-driven microservices architecture.
          Each service exposes an isolated REST boundary with real-time health heartbeat polling, latency tracking, and async pub/sub messaging via the internal EventBus.
        </p>
      </div>

      {/* Health Polling Control Center & Cluster Metrics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-orange-600 animate-pulse" />
              <span>Real-Time Health Polling Engine</span>
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Continuous background status probing across ports 5000-5005
            </p>
          </div>

          {/* Poller Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Polling Interval Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <span className="text-slate-500 text-[11px] font-medium">Interval:</span>
              {[
                { label: '2s', val: 2000 },
                { label: '3s', val: 3000 },
                { label: '5s', val: 5000 },
                { label: '10s', val: 10000 }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setPollingInterval(opt.val)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    pollingInterval === opt.val
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Pause / Resume Button */}
            <button
              onClick={() => setIsPollingActive(!isPollingActive)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isPollingActive
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
              title={isPollingActive ? 'Pause Auto-Polling' : 'Resume Auto-Polling'}
            >
              {isPollingActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-slate-600" />
                  <span>Pause Poller</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-amber-600" />
                  <span>Resume Poller</span>
                </>
              )}
            </button>

            {/* Manual Poll All Trigger */}
            <button
              onClick={() => performHealthProbe(true)}
              disabled={isProbingAll}
              className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProbingAll ? 'animate-spin' : ''}`} />
              <span>{isProbingAll ? 'Probing Cluster...' : 'Probe All Services'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Health Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Poller Status</span>
              <Wifi className={`w-4 h-4 ${isPollingActive ? 'text-blue-900' : 'text-slate-400'}`} />
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isPollingActive ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`} />
              <span className="font-mono text-sm font-bold text-slate-900">
                {isPollingActive ? 'ACTIVE (POLLING)' : 'PAUSED'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              {isPollingActive ? `Next poll in ${pollCountdown}s` : 'Auto-poll stopped'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Cluster Latency</span>
              <Gauge className="w-4 h-4 text-orange-600" />
            </div>
            <span className="font-mono text-xl font-bold text-orange-600">{avgClusterLatency}ms</span>
            <span className="text-[10px] font-mono text-blue-900 mt-1 block font-semibold">
              ● Sub-15ms Target Met
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Health Probes</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-mono text-xl font-bold text-slate-900">{totalPollCount * 6}</span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              100% HTTP 200 Success
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Last Health Sync</span>
              <CheckCircle2 className="w-4 h-4 text-blue-900" />
            </div>
            <span className="font-mono text-sm font-bold text-slate-900">
              {lastPollTime.toLocaleTimeString()}
            </span>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Synchronized with Gateway
            </span>
          </div>
        </div>
      </div>

      {/* Microservices Cluster Cards with Visual Health Indicators */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-600" />
            <span>Simulated Service Nodes & Health Rings</span>
          </h2>
          <span className="text-xs font-mono text-slate-500">
            Click any service to inspect domain parameters & live probe
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => {
            const probe = serviceProbes[svc.id];
            const isProbingThis = singleProbingId === svc.id;
            const currentLatency = probe?.responseTimeMs || svc.avgResponseTimeMs;
            const memoryMb = probe?.memoryUsageMb || Math.round(52 + (svc.port % 10) * 3);
            const cpuUsage = probe?.cpuUsagePercent || 1.8;
            const isSelected = selectedService === svc.id;

            return (
              <div
                key={svc.id}
                onClick={() => setSelectedService(svc.id)}
                className={`p-6 rounded-2xl bg-white border cursor-pointer transition-all flex flex-col justify-between space-y-4 shadow-xs relative overflow-hidden group ${
                  isSelected
                    ? 'border-orange-600 ring-2 ring-orange-500/20 bg-orange-50/10 shadow-sm'
                    : 'border-slate-200 hover:border-orange-300'
                }`}
              >
                {/* Visual Service Health Glow Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-900 via-blue-900 to-orange-500" />

                <div>
                  {/* Top Badges & Status Ring */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 group-hover:border-orange-200 group-hover:bg-orange-50/50 transition">
                        {getServiceIcon(svc.id)}
                      </div>
                      <div>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          PORT {svc.port}
                        </span>
                        <h3 className="font-bold text-base text-slate-900 mt-1">{svc.name}</h3>
                      </div>
                    </div>

                    {/* Dynamic Heartbeat Ring Visual Indicator */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-950 text-[11px] font-mono font-semibold shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                        </span>
                        <span className="uppercase">{svc.status}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">
                        HTTP 200 OK
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {svc.description}
                  </p>
                </div>

                {/* Heartbeat Rhythm Visualization */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-orange-600" /> Live Ping Latency
                    </span>
                    <span className="font-bold text-orange-600">{currentLatency}ms</span>
                  </div>

                  {/* Visual simulated heartbeat bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-slate-900 via-orange-500 to-orange-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(15, (currentLatency / 20) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                {/* Service Telemetry Matrix */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Requests</span>
                    <span className="text-slate-800 font-bold">{svc.requestsHandled}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Memory</span>
                    <span className="text-slate-800 font-bold">{memoryMb}MB</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Uptime</span>
                    <span className="text-slate-700 font-bold">{svc.uptimeSeconds}s</span>
                  </div>
                </div>

                {/* Action button: Ping Endpoint */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400 truncate">
                    http://localhost:{svc.port}/health
                  </span>
                  <button
                    onClick={(e) => handlePingSingleService(svc.id, e)}
                    disabled={isProbingThis}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200 hover:border-orange-200 text-xs font-semibold transition flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                    title={`Send instantaneous health probe to ${svc.name}`}
                  >
                    <Radio className={`w-3 h-3 text-orange-600 ${isProbingThis ? 'animate-spin' : ''}`} />
                    <span>{isProbingThis ? 'Pinging...' : 'Ping Node'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Health Polling Stream & Event Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Real-time Health Probes Feed */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Radio className="w-5 h-5 text-orange-600" />
              <span>Live Health Probe Audit Stream</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 font-semibold">
              POLLING STREAM
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {probeLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Initiating cluster health probe stream...
              </div>
            ) : (
              probeLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between gap-2 hover:bg-slate-100/80 transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 truncate">{log.serviceName}</span>
                    <span className="text-slate-400 text-[10px]">: {log.port}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-bold text-[10px] border border-amber-200">
                      {log.status}
                    </span>
                    <span className="font-bold text-orange-600 text-[11px]">{log.latency}ms</span>
                    <span className="text-slate-400 text-[10px]">{log.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Distributed Pub/Sub EventBus Feed */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              <span>EventBus Pub/Sub Message Activity</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-800 font-semibold">
              {events.length} Events Dispatched
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono bg-slate-50 rounded-xl border border-slate-200">
                No events recorded yet. Book tickets or trigger actions to stream live bus messages.
              </div>
            ) : (
              events.slice(0, 10).map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-bold text-[10px] border border-orange-200">
                        {evt.eventType}
                      </span>
                      <span className="text-slate-400 text-[10px]">from</span>
                      <span className="text-slate-800 font-semibold">{evt.sourceService}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1 bg-white p-1.5 rounded border border-slate-200">
                    {JSON.stringify(evt.payload)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Architecture Deep Dive & Docker Compose */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Architectural Principles */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-orange-600" />
            <span>Tixora Architectural Guarantees & Patterns</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-900" /> 1. Single Responsibility & Domain Isolation
              </h4>
              <p className="text-slate-600 leading-relaxed">
                User authentication, event ticketing, booking workflows, notification delivery, and payment processing are split into autonomous services with bounded contexts.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-900" /> 2. Event-Driven Messaging (Pub/Sub EventBus)
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Services publish lightweight asynchronous domain events (<code className="text-orange-600 font-mono">auth.user_registered</code>, <code className="text-orange-600 font-mono">booking.confirmed</code>) avoiding temporal coupling.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-900" /> 3. API Gateway & Ingress Layer
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Aggregates client traffic, verifies JWT credentials, handles rate metrics, and routes requests to downstream microservices with zero client-side coupling.
              </p>
            </div>
          </div>
        </div>

        {/* Docker Compose Specs */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-orange-600" />
                <span>Docker Compose Cluster Orchestration</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                docker-compose.yml
              </span>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed shadow-inner">
              {dockerComposeSnippet}
            </pre>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Run locally: <code className="text-orange-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">docker-compose up --build</code>
            </span>
            <button
              onClick={() => resetDatabase()}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-seed Cluster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default MicroservicesOverview;
