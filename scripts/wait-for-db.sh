#!/bin/sh
# wait-for-db.sh - Wait for PostgreSQL to be ready, then run migrations and start app

set -e

# Database connection parameters from environment
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DATABASE_URL##*/}  # Extract database name from URL

# Extract connection details from DATABASE_URL if available
if [ -n "$DATABASE_URL" ]; then
  # Parse DATABASE_URL: postgresql://user:password@host:port/database
  DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*://[^@]*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*://[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')
  DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
  DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')
fi

# Default values if not extracted
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}

# Only show detailed startup logs in development
if [ "$NODE_ENV" = "production" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Starting Twilio Ultravox Agent Server..."
  echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Connecting to database at $DB_HOST:$DB_PORT..."
else
  echo "🔍 Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
  echo "📡 Checking database connection to $DB_HOST:$DB_PORT as user $DB_USER..."
fi

# Wait for PostgreSQL to be ready
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    if [ "$NODE_ENV" = "production" ]; then
      echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Database connection established"
    else
      echo "✅ PostgreSQL is ready!"
    fi
    break
  fi
  
  if [ "$NODE_ENV" != "production" ]; then
    echo "⏳ Attempt $attempt/$max_attempts: PostgreSQL not ready yet..."
  fi
  sleep 2
  attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] Failed to connect to PostgreSQL after $max_attempts attempts"
  exit 1
fi

# Run database migrations
if [ "$NODE_ENV" = "production" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Running database migrations..."
  if npx prisma migrate deploy >/dev/null 2>&1; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Database migrations completed"
  else
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] Database migrations failed"
    exit 1
  fi
else
  echo "🔄 Running database migrations..."
  if npx prisma migrate deploy; then
    echo "✅ Database migrations completed successfully"
  else
    echo "❌ Database migrations failed"
    exit 1
  fi
fi

# Seed database if in development/test environment
if [ "$NODE_ENV" = "development" ] || [ "$NODE_ENV" = "test" ]; then
  echo "🌱 Seeding database for $NODE_ENV environment..."
  if npx prisma db seed; then
    echo "✅ Database seeded successfully"
  else
    echo "⚠️  Database seeding failed (continuing anyway)"
  fi
fi

if [ "$NODE_ENV" = "production" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Application starting..."
else
  echo "🚀 Starting application..."
fi

# Execute the passed command (e.g., "node dist/server.js")
exec "$@"