import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { MicroserviceStatus, InterServiceEvent, NotificationLog } from '../types';
import { AuthContext } from './AuthContext';

export interface TelemetryContextType {
  services: MicroserviceStatus[];
  events: InterServiceEvent[];
  notifications: NotificationLog[];
  dbStats: Record<string, number>;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isInboxOpen: boolean;
  setIsInboxOpen: (open: boolean) => void;
  refreshTelemetry: () => Promise<void>;
  resetDatabase: () => Promise<void>;
  latestOTP: string | null;
}

export const TelemetryContext = createContext<TelemetryContextType>({} as TelemetryContextType);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [services, setServices] = useState<MicroserviceStatus[]>([]);
  const [events, setEvents] = useState<InterServiceEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [latestOTP, setLatestOTP] = useState<string | null>(null);

  const refreshTelemetry = useCallback(async () => {
    try {
      const [telemetryRes, inboxRes] = await Promise.all([
        axios.get('/api/gateway/telemetry'),
        axios.get('/api/notifications/inbox')
      ]);

      if (telemetryRes.data) {
        setServices(telemetryRes.data.services || []);
        setEvents(telemetryRes.data.recentEvents || []);
        setDbStats(telemetryRes.data.databaseStats || {});
      }

      if (inboxRes.data) {
        setNotifications(inboxRes.data);
        const otps = inboxRes.data.filter((n: NotificationLog) => n.otpCode);
        if (otps.length > 0) {
          setLatestOTP(otps[0].otpCode);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh telemetry:', e);
    }
  }, []);

  useEffect(() => {
    refreshTelemetry();
    const interval = setInterval(refreshTelemetry, 3000);
    return () => clearInterval(interval);
  }, [refreshTelemetry]);

  const resetDatabase = async () => {
    try {
      await axios.post('/api/gateway/reset-db');
      await refreshTelemetry();
    } catch (e) {
      console.error('Failed to reset database:', e);
    }
  };

  return (
    <TelemetryContext.Provider
      value={{
        services,
        events,
        notifications,
        dbStats,
        isDrawerOpen,
        setIsDrawerOpen,
        isInboxOpen,
        setIsInboxOpen,
        refreshTelemetry,
        resetDatabase,
        latestOTP
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};
