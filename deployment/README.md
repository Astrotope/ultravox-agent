# Deployment Guide - Separate Containers

This guide explains how to deploy the restaurant voice agent using separate containers for the application and PostgreSQL database.

## Prerequisites

- Docker installed on your VM
- Environment variables configured
- Network access between containers

## Deployment Steps

### 1. Create a Docker Network

```bash
# Create a custom network for container communication
docker network create restaurant-network
```

### 2. Deploy PostgreSQL Container

```bash
# Run PostgreSQL container
docker run -d \
  --name restaurant-db \
  --network restaurant-network \
  -e POSTGRES_DB=restaurant_booking \
  -e POSTGRES_USER=app_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_HOST_AUTH_METHOD=md5 \
  -v restaurant_db_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine

# Wait for PostgreSQL to be ready
docker logs -f restaurant-db
```

### 3. Build Application Image

```bash
# Build the application image
docker build -t restaurant-voice-agent:latest .
```

### 4. Deploy Application Container

```bash
# Run application container
docker run -d \
  --name restaurant-app \
  --network restaurant-network \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://app_user:your_secure_password@restaurant-db:5432/restaurant_booking" \
  -e ULTRAVOX_API_KEY="your_ultravox_api_key" \
  -e TWILIO_ACCOUNT_SID="your_twilio_account_sid" \
  -e TWILIO_AUTH_TOKEN="your_twilio_auth_token" \
  -e ADMIN_API_KEY="your_secure_admin_key_32_chars_min" \
  -e BASE_URL="https://your-domain.com" \
  -e LOG_LEVEL="info" \
  -p 3000:3000 \
  restaurant-voice-agent:latest
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `ULTRAVOX_API_KEY` | Ultravox API key | `uk_live_...` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `...` |
| `ADMIN_API_KEY` | Admin API key (32+ chars) | `secure_admin_key_123...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `LOG_LEVEL` | Logging level | `info` |
| `MAX_CONCURRENT_CALLS` | Max concurrent calls | `5` |
| `AGENT_NAME` | Voice agent name | `Sofia` |

## Health Checks

```bash
# Check application health
curl http://localhost:3000/health

# Check container health
docker ps
docker logs restaurant-app
docker logs restaurant-db
```

## Database Management

```bash
# Run database migrations manually
docker exec restaurant-app npx prisma migrate deploy

# Access database directly
docker exec -it restaurant-db psql -U app_user -d restaurant_booking

# View logs
docker logs restaurant-app
docker logs restaurant-db
```

## Monitoring

```bash
# Monitor container resources
docker stats restaurant-app restaurant-db

# View application metrics (requires admin API key)
curl -H "X-API-Key: your_admin_key" http://localhost:3000/metrics

# View active calls
curl -H "X-API-Key: your_admin_key" http://localhost:3000/active-calls
```

## Backup and Recovery

```bash
# Backup database
docker exec restaurant-db pg_dump -U app_user restaurant_booking > backup.sql

# Restore database
docker exec -i restaurant-db psql -U app_user restaurant_booking < backup.sql
```

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker logs restaurant-app
docker logs restaurant-db

# Check container status
docker ps -a

# Restart containers
docker restart restaurant-db
docker restart restaurant-app
```

### Database Connection Issues

```bash
# Test database connectivity
docker exec restaurant-app pg_isready -h restaurant-db -p 5432 -U app_user

# Check network connectivity
docker exec restaurant-app ping restaurant-db
```

### Application Issues

```bash
# Check application logs
docker logs -f restaurant-app

# Execute shell in container
docker exec -it restaurant-app sh

# Check environment variables
docker exec restaurant-app env | grep -E "(DATABASE|TWILIO|ULTRAVOX)"
```

## Security Considerations

1. **Use strong passwords** for database and admin API key
2. **Limit port exposure** - only expose necessary ports
3. **Regular updates** - keep base images updated
4. **Log monitoring** - monitor application logs for security events
5. **Network isolation** - use custom networks instead of default bridge

## Performance Tuning

```bash
# Monitor resource usage
docker stats

# Adjust container resources
docker run --memory=1g --cpus=0.5 ...

# Scale horizontally
docker run --name restaurant-app-2 ... -p 3001:3000 ...
```