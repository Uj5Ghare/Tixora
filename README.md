# Tixora Microservices Platform

**Refactored from Monolithic MERN to Decoupled Microservices Architecture**

Tixora is a modern event discovery, ticketing, and booking platform. Originally built as a single monolithic MERN application, this repository has been refactored into a high-concurrency, resilient, and event-driven **Microservices Architecture**.

---

## Architecture Overview

```
                           +------------------------+
                           |  React 19 / Vite SPA   |
                           +-----------+------------+
                                       |
                                       | HTTP / REST
                                       v
                           +------------------------+
                           |   API Gateway Proxy    | (Port 5000 / Ingress)
                           +-----------+------------+
                                       |
         +-------------+---------------+--------------+--------------+
         |             |               |              |              |
         v             v               v              v              v
  +------------+ +------------+ +--------------+ +------------+ +------------+
  |    Auth    | |   Event    | |   Booking    | |Notification| |  Payment   |
  |  Service   | |  Service   | |   Service    | |  Service   | |  Service   |
  | (Port 5001)| |(Port 5002) | | (Port 5003)  | |(Port 5004) | |(Port 5005) |
  +------+-----+ +-----+------+ +------+-------+ +-----+------+ +-----+------+
         |             |               |               |              |
         +-------------+---------------+---------------+--------------+
                                       |
                                       v
                      +----------------------------------+
                      | Distributed EventBus (Pub / Sub) |
                      +----------------------------------+
```

---

## Microservices Breakdown

| Service | Port | Responsibilities | Key Endpoints |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `5000` / `3000` | Ingress routing, JWT verification, rate telemetry, service health | `/api/*` |
| **Auth Service** | `5001` | User registration, login, JWT issuance, 2FA OTP verification | `/api/auth/login`, `/api/auth/register`, `/api/auth/verify-otp` |
| **Event Service** | `5002` | Event catalog, category filters, atomic seating decrement/increment | `/api/events`, `/api/events/:id` |
| **Booking Service** | `5003` | 2FA OTP ticket reservations, attendee booking state, admin approval queue | `/api/bookings`, `/api/bookings/send-otp`, `/api/bookings/:id/confirm` |
| **Notification Service**| `5004` | Simulated SMTP email dispatcher, 2FA passcode delivery, booking alerts | `/api/notifications/inbox`, `/api/notifications/stats` |
| **Payment Service** | `5005` | Transaction processing, payment settlements, revenue telemetry | `/api/payments/process`, `/api/payments/analytics` |

---

## Key Refactoring Improvements

1. **Domain Isolation**: Split monolithic controller methods into distinct microservice boundaries with isolated state.
2. **Event-Driven Messaging**: Asynchronous `eventBus` publishes lifecycle events (`auth.user_registered`, `event.seats_modified`, `booking.created`, `booking.confirmed`, `booking.cancelled`) to decouple inter-service dependencies.
3. **Live 2FA OTP Verification**: Embedded notification simulator allows end-to-end 2FA OTP ticket booking with real-time in-app delivery.
4. **Live Cluster Telemetry**: Built-in architecture dashboard shows real-time request counts, response latency, and cluster health.
5. **Docker Compose Support**: Ready-to-run `docker-compose.yml` for multi-container orchestration.

---

## Quick Demo Credentials
- **Admin**: `admin@tixora.com` / `password123`
- **User**: `user@tixora.com` / `password123`
