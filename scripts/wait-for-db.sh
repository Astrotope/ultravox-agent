#!/bin/sh
# wait-for-db.sh - Wait for PostgreSQL to be ready, then run migrations and start app

set -e

# Database connection parameters from environment
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DATABASE_URL##*/}  # Extract database name from URL

echo "🔍 Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

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

echo "📡 Checking database connection to $DB_HOST:$DB_PORT as user $DB_USER..."

# Wait for PostgreSQL to be ready
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  
  echo "⏳ Attempt $attempt/$max_attempts: PostgreSQL not ready yet..."
  sleep 2
  attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
  echo "❌ Failed to connect to PostgreSQL after $max_attempts attempts"
  exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migrations failed"
  exit 1
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

echo "🚀 Starting application..."

# Execute the passed command (e.g., "node dist/server.js")
exec "$@"