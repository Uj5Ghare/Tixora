import { MicroserviceStatus } from '../../types';
import { db } from '../db';
import { eventBus } from '../eventBus';

const START_TIME = Date.now();
const requestStats: Record<string, { requests: number; totalDurationMs: number }> = {
  'api-gateway': { requests: 0, totalDurationMs: 0 },
  'auth-service': { requests: 0, totalDurationMs: 0 },
  'event-service': { requests: 0, totalDurationMs: 0 },
  'booking-service': { requests: 0, totalDurationMs: 0 },
  'notification-service': { requests: 0, totalDurationMs: 0 },
  'payment-service': { requests: 0, totalDurationMs: 0 }
};

export class GatewayMicroservice {
  public static readonly SERVICE_NAME = 'api-gateway';

  public static recordRequest(serviceName: string, durationMs: number) {
    if (!requestStats[serviceName]) {
      requestStats[serviceName] = { requests: 0, totalDurationMs: 0 };
    }
    requestStats[serviceName].requests += 1;
    requestStats[serviceName].totalDurationMs += durationMs;
  }

  public static getServicesTopology(): MicroserviceStatus[] {
    const uptimeSec = Math.floor((Date.now() - START_TIME) / 1000);

    return [
      {
        id: 'api-gateway',
        name: 'API Gateway & Ingress Router',
        port: 5000,
        status: 'healthy',
        uptimeSeconds: uptimeSec,
        requestsHandled: requestStats['api-gateway']?.requests || 0,
        avgResponseTimeMs: requestStats['api-gateway']?.requests
          ? Math.round(requestStats['api-gateway'].totalDurationMs / requestStats['api-gateway'].requests)
          : 4,
        dependencies: ['auth-service', 'event-service', 'booking-service', 'notification-service', 'payment-service'],
        description: 'Single ingress reverse proxy with JWT authentication, routing, telemetry, and rate limiting'
      },
      {
        id: 'auth-service',
        name: 'Authentication & Identity Service',
        port: 5001,
        status: 'healthy',
        uptimeSeconds: uptimeSec,
        requestsHandled: requestStats['auth-service']?.requests || 0,
        avgResponseTimeMs: requestStats['auth-service']?.requests
          ? Math.round(requestStats['auth-service'].totalDurationMs / requestStats['auth-service'].requests)
          : 12,
        dependencies: ['notification-service'],
        description: 'User registration, login, 2FA OTP verification, password hashing, and JWT issuance'
      },
      {
        id: 'event-service',
        name: 'Event Catalog & Inventory Service',
        port: 5002,
        status: 'healthy',
        uptimeSeconds: uptimeSec,
        requestsHandled: requestStats['event-service']?.requests || 0,
        avgResponseTimeMs: requestStats['event-service']?.requests
          ? Math.round(requestStats['event-service'].totalDurationMs / requestStats['event-service'].requests)
          : 8,
        dependencies: [],
        description: 'Event catalog search, categorisation, ticket pricing, and atomic seating capacity'
      },
      {
        id: 'booking-service',
        name: 'Booking & Order Management Service',
        port: 5003,
        status: 'healthy',
        uptimeSeconds: uptimeSec,
        requestsHandled: requestStats['booking-service']?.requests || 0,
        avgResponseTimeMs: requestStats['booking-service']?.requests
          ? Math.round(requestStats['booking-service'].totalDurationMs / requestStats['booking-service'].requests)
          : 15,
        dependencies: ['event-service', 'auth-service', 'notification-service', 'payment-service'],
        description: 'Manages ticket booking queue, 2FA verification, admin approval workflows, and seat reservations'
      },
      {
        id: 'notification-service',
        name: 'Notification & Messaging Service',
        port: 5004,
        status: 'healthy',
        uptimeSeconds: uptimeSec,
        requestsHandled: requestStats['notification-service']?.requests || 0,
        avgResponseTimeMs: requestStats['notification-service']?.requests
          ? Math.round(requestStats['notification-service'].totalDurationMs / requestStats['notification-service'].requests)
          : 6,
        dependencies: [],
        description: 'Asynchronous 2FA OTP delivery, booking email notifications, and live inbox stream'
      },
      {
        id: 'payment-service',
        name: 'Payment & Settlement Service',
        port: 5005,
        status: 'healthy',
        uptimeSeconds: uptimeSec,
        requestsHandled: requestStats['payment-service']?.requests || 0,
        avgResponseTimeMs: requestStats['payment-service']?.requests
          ? Math.round(requestStats['payment-service'].totalDurationMs / requestStats['payment-service'].requests)
          : 10,
        dependencies: ['booking-service'],
        description: 'Payment settlements, simulated transaction routing, revenue accounting, and receipt generation'
      }
    ];
  }

  public static getSystemOverview() {
    return {
      status: 'operational',
      architecture: 'Microservices Architecture',
      broker: 'In-Memory Distributed EventBus',
      services: this.getServicesTopology(),
      recentEvents: eventBus.getRecentEvents(25),
      databaseStats: {
        totalUsers: db.users.size,
        totalEvents: db.events.size,
        totalBookings: db.bookings.size,
        activeOTPs: db.otps.size,
        dispatchedNotifications: db.notifications.length
      }
    };
  }

  public static probeService(serviceId: string) {
    const topology = this.getServicesTopology();
    const service = topology.find((s) => s.id === serviceId);
    if (!service) {
      return {
        serviceId,
        status: 'unknown',
        httpStatus: 404,
        error: 'Service not registered in gateway topology'
      };
    }

    const jitter = Math.floor(Math.random() * 8) - 4;
    const latency = Math.max(2, service.avgResponseTimeMs + jitter);

    return {
      serviceId: service.id,
      name: service.name,
      port: service.port,
      status: 'healthy',
      httpStatus: 200,
      responseTimeMs: latency,
      uptimeSeconds: service.uptimeSeconds,
      timestamp: new Date().toISOString(),
      healthEndpoint: `http://localhost:${service.port}/health`,
      memoryUsageMb: Math.round(48 + (service.port % 10) * 4.5 + Math.random() * 6),
      cpuUsagePercent: Number((1.2 + Math.random() * 2.8).toFixed(1)),
      checkedVia: 'Tixora Gateway Health Monitor'
    };
  }

  public static resetDatabase() {
    db.seed();
    eventBus.clearHistory();
    eventBus.publish('system.database_reseeded', this.SERVICE_NAME, {
      message: 'All services reseeded with initial dataset'
    });
    return { success: true, message: 'Database reset and re-seeded successfully' };
  }
}
