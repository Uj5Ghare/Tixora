# Tixora Microservices Architecture

This directory houses the autonomous, containerized microservices for the Tixora Ticketing & Event Management platform.

## Microservices Directory Map

| Microservice | Port | Directory | Description |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `5000` | `/services/api-gateway` | Single Ingress entry point, reverse proxy, JWT authentication & route dispatcher |
| **Auth Service** | `5001` | `/services/auth-service` | User registration, login, bcrypt password hashing, 2FA OTP verification & JWT issuance |
| **Event Service** | `5002` | `/services/event-service` | Event catalog search, category filtering, admin CRUD & atomic seat capacity inventory |
| **Booking Service** | `5003` | `/services/booking-service` | Ticket order lifecycle, 2FA OTP reservation authorization, admin approval & cancellation |
| **Notification Service** | `5004` | `/services/notification-service` | Async 2FA OTP dispatch, booking confirmation/cancellation email delivery & live audit inbox |
| **Payment Service** | `5005` | `/services/payment-service` | Payment settlement processing, transaction ledger & revenue analytics |

## Orchestration with Docker Compose

Run all microservices concurrently with a single command:

```bash
docker-compose up --build
```
