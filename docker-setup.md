# Docker Setup Guide

This guide provides instructions for running the Tixora application using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- Ports 3000, 5000-5005, 27017-27020, 6379 available

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your specific configuration:

```bash
nano .env
```

**Required variables to update:**
- `EMAIL_USER` - Your email address for notifications
- `EMAIL_PASS` - Your email app password (not regular password)
- `JWT_SECRET` - Change to a secure random string
- `MONGO_INITDB_ROOT_PASSWORD` - Change to a secure password

**Optional variables:**
- `NODE_ENV` - Set to `development` for local development
- Port configurations - Adjust if ports conflict with other services

### 2. Start All Services

Build and start all containers in detached mode:

```bash
docker compose up -d
```

This will start:
- 4 MongoDB databases (auth, event, booking, payment)
- Redis cache and message broker
- 6 microservices (api-gateway, auth, event, booking, notification, payment)
- Web frontend

### 3. Verify Services Are Running

Check container status:

```bash
docker compose ps
```

All services should show as "Healthy" or "Running". Initial startup may take 1-2 minutes.

View logs for any service:

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api-gateway
docker compose logs -f auth-service
```

### 4. Access the Application

- **Web Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:5000
- **Auth Service**: http://localhost:5001
- **Event Service**: http://localhost:5002
- **Booking Service**: http://localhost:5003
- **Notification Service**: http://localhost:5004
- **Payment Service**: http://localhost:5005

### 5. Health Check Endpoints

Every microservice exposes a `/health` endpoint for monitoring service availability and health status. These endpoints are used by Docker Compose health checks and can be used for custom monitoring.

**Available Health Endpoints:**

```bash
# API Gateway Health
curl http://localhost:5000/health

# Auth Service Health
curl http://localhost:5001/health

# Event Service Health
curl http://localhost:5002/health

# Booking Service Health
curl http://localhost:5003/health

# Notification Service Health
curl http://localhost:5004/health

# Payment Service Health
curl http://localhost:5005/health

# Web Frontend Health
curl http://localhost:3000
```

**Expected Response:**
A successful health check typically returns a `200 OK` status with a JSON response indicating service status.

**Health Check Script:**

You can create a simple script to check all services at once:

```bash
#!/bin/bash
services=("5000" "5001" "5002" "5003" "5004" "5005" "3000")
names=("API Gateway" "Auth Service" "Event Service" "Booking Service" "Notification Service" "Payment Service" "Web Frontend")

for i in "${!services[@]}"; do
  port=${services[$i]}
  name=${names[$i]}
  if curl -s "http://localhost:$port/health" > /dev/null 2>&1 || curl -s "http://localhost:$port" > /dev/null 2>&1; then
    echo "✓ $name (Port $port): Healthy"
  else
    echo "✗ $name (Port $port): Unhealthy"
  fi
done
```

## Service Architecture

```
┌─────────────┐
│   Web App   │ (Port 3000)
└──────┬──────┘
       │
┌──────▼──────┐
│ API Gateway │ (Port 5000)
└──────┬──────┘
       │
  ┌────┴────┬────────┬────────┬────────┐
  │         │        │        │        │
┌─▼──┐  ┌──▼───┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐
│Auth│  │Event │ │Booking│ │Notify│ │Payment│
└─┬──┘  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘
  │       │       │       │       │
┌─▼──┐  ┌▼───┐  ┌▼───┐  ┌▼───┐  ┌▼───┐
│Mongo│  │Mongo│  │Mongo│  │Redis│  │Mongo│
└────┘  └────┘  └────┘  └────┘  └────┘
```

## Common Commands

### Start Services

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d api-gateway
```

### Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (deletes data)
docker compose down -v
```

### Rebuild Services

```bash
# Rebuild after code changes
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build api-gateway
```

### View Logs

```bash
# Follow all logs
docker compose logs -f

# Follow specific service logs
docker compose logs -f auth-service

# View last 100 lines
docker compose logs --tail=100
```

### Execute Commands in Containers

```bash
# Access shell in a service
docker compose exec auth-service sh

# Run Node.js command
docker compose exec api-gateway node -v

# Access MongoDB
docker compose exec auth-db mongosh -u admin -p tixora_secure_mongo_auth_2026
```

### Database Access

Connect to MongoDB databases from host:

```bash
# Auth DB
mongosh mongodb://admin:tixora_secure_mongo_auth_2026@localhost:27017/tixora_auth?authSource=admin

# Event DB
mongosh mongodb://admin:tixora_secure_mongo_auth_2026@localhost:27018/tixora_events?authSource=admin

# Booking DB
mongosh mongodb://admin:tixora_secure_mongo_auth_2026@localhost:27019/tixora_bookings?authSource=admin

# Payment DB
mongosh mongodb://admin:tixora_secure_mongo_auth_2026@localhost:27020/tixora_payments?authSource=admin

# Redis
redis-cli -p 6379
```

## Development Workflow

### Hot Reload

The services are configured with volume mounts for development. Changes to source code in `services/` directory will be reflected automatically.

```bash
# After code changes, restart the specific service
docker compose restart auth-service
```

### Adding New Dependencies

1. Add dependency to `package.json` in the service directory
2. Rebuild the service:
```bash
docker compose up -d --build auth-service
```

## Troubleshooting

### Services Not Starting

1. Check if ports are already in use:
```bash
netstat -tulpn | grep -E '3000|5000|5001|5002|5003|5004|5005|27017|27018|27019|27020|6379'
```

2. Check Docker logs:
```bash
docker compose logs
```

3. Verify Docker is running:
```bash
docker ps
docker info
```

### Database Connection Errors

1. Ensure databases are healthy:
```bash
docker compose ps
```

2. Check database logs:
```bash
docker compose logs auth-db
docker compose logs event-db
```

3. Verify environment variables in `.env` match database credentials

### Permission Issues

If you encounter permission errors with volumes:

```bash
# Stop services
docker compose down

# Remove volumes (WARNING: deletes data)
docker compose down -v

# Start fresh
docker compose up -d
```

### Health Check Failures

Services have health checks that may fail during startup. Wait 1-2 minutes after starting before checking status:

```bash
# Watch health status
watch docker compose ps
```

### Out of Memory

If services crash due to memory issues:

1. Increase Docker memory allocation in Docker Desktop settings
2. Or reduce the number of running services:
```bash
# Start only essential services
docker compose up -d auth-db redis auth-service
```

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use strong, unique passwords for all credentials
3. Remove or comment out port mappings for internal services (keep only api-gateway and web)
4. Use proper SSL/TLS termination
5. Configure proper backup strategies for MongoDB volumes
6. Use Docker secrets or external secret management instead of `.env` file

## Data Persistence

All data is persisted in Docker volumes:

- `tixora_auth_db_data` - Auth service database
- `tixora_event_db data` - Event service database
- `tixora_booking_db_data` - Booking service database
- `tixora_payment_db_data` - Payment service database
- `tixora_redis_data` - Redis cache data

To backup volumes:

```bash
# Backup a specific volume
docker run --rm -v tixora_auth_db_data:/data -v $(pwd):/backup alpine tar czf /backup/auth-db-backup.tar.gz /data

# Restore a volume
docker run --rm -v tixora_auth_db_data:/data -v $(pwd):/backup alpine tar xzf /backup/auth-db-backup.tar.gz -C /
```

## Network Configuration

All services communicate via the `tixora-cluster-network` bridge network. Services can reach each other using their service names (e.g., `auth-service`, `redis`, `auth-db`).

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
- [Redis Docker Image](https://hub.docker.com/_/redis)
