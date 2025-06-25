# Bella Vista Restaurant AI Voice Agent

A sophisticated AI voice agent for restaurant reservations built with Ultravox, Twilio, and Express. Sofia, our AI host, handles reservations, answers menu questions, and seamlessly transfers complex requests to human staff.

## 🎯 Key Features

- **Intelligent Reservation Management**: Check availability and create bookings with smart scheduling
- **Menu Intelligence**: RAG-powered answers using queryCorpus for accurate menu information
- **Smart Human Transfer**: Seamless handoff to human agents with automatic call ID injection
- **Operating Hours Awareness**: Context-aware responses based on restaurant hours
- **Professional Service Standards**: Hospitality-focused conversation flow with named personality
- **Advanced Call Management**: Direct call creation pattern following Ultravox best practices
- **Production-Ready Architecture**: Modular design with comprehensive testing and monitoring
- **API v1 Endpoints**: Modern RESTful API with Zod validation and proper error handling

## 🏗️ Modern Architecture

### 🔄 **Major Architectural Improvements (2025)**

This system has been completely refactored from a monolithic structure to a modern, production-ready architecture:

#### **Before (Monolithic)**
- Single `server.ts` file with mixed concerns
- Inline validation and error handling
- Basic endpoint structure
- Manual testing only
- No proper database migrations
- Production and test data mixed

#### **After (Modular Production Architecture)**
- **Separation of Concerns**: Clean separation between routing, business logic, and data access
- **API Versioning**: Future-proof `/api/v1/` endpoint structure
- **Comprehensive Validation**: Zod schemas for type-safe input validation
- **Production Middleware**: Security, logging, CORS, rate limiting, graceful shutdown
- **Database Integration**: Prisma ORM with PostgreSQL for persistent data
- **Proper Migrations**: Git-tracked database schema changes with `prisma/migrations/`
- **Database Separation**: Dedicated test database (`voice-agents-test`) vs production (`voice-agents`)
- **Automated Testing**: Comprehensive test suite with 13+ endpoint tests and clean database management
- **Docker Ready**: Multi-stage builds with Alpine Linux optimization

### 📁 **New Modular Structure**

```
src/
├── app.ts                     # Application factory & server orchestrator
├── server.enhanced.ts         # Production entry point
├── config/                    # Configuration management
│   ├── env.ts                # Zod-validated environment variables
│   └── database.ts           # Prisma client configuration
├── controllers/              # Request handlers
│   ├── adminController.ts    # Admin operations
│   ├── bookingController.ts  # Booking management
│   ├── toolController.ts     # AI tool endpoints
│   └── webhookController.ts  # Webhook processing
├── middleware/               # Express middleware
│   ├── auth.middleware.ts    # API key authentication
│   ├── zodValidation.middleware.ts # Input validation
│   ├── security.middleware.ts # Helmet.js security
│   └── logging.middleware.ts # Winston structured logging
├── routes/v1/               # API v1 versioned routes
│   ├── admin.routes.ts      # Admin endpoints
│   ├── booking.routes.ts    # Booking operations
│   ├── tool.routes.ts       # AI tool endpoints
│   └── webhook.routes.ts    # Webhook handlers
├── services/                # Business logic layer
│   ├── bookingService.ts    # Reservation logic
│   ├── adminService.ts      # Admin operations
│   ├── toolService.ts       # AI tool implementations
│   └── webhookService.ts    # Webhook processing
├── schemas/                 # Zod validation schemas
│   ├── booking.schemas.ts   # Booking validation
│   └── webhook.schemas.ts   # Webhook validation
└── utils/                   # Utility functions
    ├── gracefulShutdown.ts  # Production shutdown handling
    ├── healthChecker.ts     # Health monitoring
    ├── logger.ts           # Winston logger configuration
    └── dateUtils.ts        # chrono-node date parsing

scripts/                     # Database and testing scripts
├── reset-test-db.sh        # Complete test database reset
├── clear-test-data.sh      # Quick test data clearing
├── test-endpoints-clean.sh # Clean endpoint testing
└── wait-for-db.sh         # Docker database wait script

prisma/
├── migrations/             # Database migration files
│   └── 0_init/            # Initial schema migration
├── schema.prisma          # Database schema definition
└── seed.ts               # Database seeding script
```

### 🎯 **Key Architectural Benefits**

1. **Maintainability**: Clear separation of concerns makes code easier to understand and modify
2. **Testability**: Each component can be unit tested independently
3. **Scalability**: Modular structure supports team development and feature expansion
4. **Type Safety**: TypeScript + Zod provides compile-time and runtime type checking
5. **Production Ready**: Comprehensive error handling, logging, and monitoring
6. **API Versioning**: `/api/v1/` structure supports future API evolution

### 🔧 **Enhanced Technology Stack**

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime |
| **Framework** | Express.js | Web application framework |
| **Language** | TypeScript | Type-safe JavaScript |
| **Database** | PostgreSQL + Prisma | Persistent data storage |
| **Validation** | Zod | Runtime type validation |
| **Logging** | Winston | Structured logging |
| **Security** | Helmet.js | Security middleware |
| **Date Parsing** | chrono-node | Natural language dates |
| **Testing** | Jest + Supertest | Unit & integration testing |
| **Containerization** | Docker + Alpine | Production deployment |
| **Process Management** | PM2 (optional) | Production process management |

## 🛠️ Setup & Configuration

### 📋 **Prerequisites**

- Node.js 18 or higher
- PostgreSQL database
- Ultravox API account and key
- Twilio account with phone number
- Docker (for containerized deployment)

### 🔐 **Environment Configuration**

Create a `.env` file with the following variables:

```bash
# Environment
NODE_ENV=production                      # development | production | test
PORT=3000                               # Server port

# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"  # PostgreSQL (note: postgresql:// protocol)

# Ultravox Configuration
ULTRAVOX_API_KEY=your_ultravox_api_key_here
ULTRAVOX_CORPUS_ID=your_corpus_id_for_menu_data
ULTRAVOX_VOICE=Steve-English-Australian  # Voice for Ultravox calls

# Twilio Configuration  
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VOICE=Polly.Aria-Neural           # Voice for Twilio announcements

# Application Configuration
BASE_URL=https://your-domain.com         # Your deployment URL
ADMIN_API_KEY=your_secure_admin_api_key_minimum_32_chars
MAX_CONCURRENT_CALLS=5                   # Maximum simultaneous calls
CALL_CLEANUP_INTERVAL=300000             # Call cleanup interval (5 minutes)
HUMAN_AGENT_PHONE=+1234567890           # Phone number for transfers
AGENT_NAME=Sofia                         # AI agent's name

# Logging
LOG_LEVEL=info                          # error | warn | info | debug
```

### 🔑 **Admin API Key Generation**

Generate a secure admin API key:

```bash
# Option 1: Using Node.js crypto
node -e "console.log('admin-key-' + require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using Python
python3 -c "import secrets; print('admin-key-' + secrets.token_hex(32))"

# Option 3: Using OpenSSL
echo "admin-key-$(openssl rand -hex 32)"
```

Example output: `admin-key-[64-character-hex-string]`

## 🚀 Installation & Development

### 📦 **Quick Start**

```bash
# Clone and install dependencies
git clone <repository-url>
cd twilio_ultravox_agent_server
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npx prisma generate
npx prisma migrate deploy   # Apply migrations
npx prisma db seed         # Seed with test data

# Start development server
npm run dev
```

### 🐳 **Docker Deployment (Recommended)**

#### **Production Docker Setup**

```bash
# Build the optimized production image
docker build -t twilio-ultravox-agent .

# Run with PostgreSQL
docker run -d \
  --name twilio-ultravox-agent \
  -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/dbname" \
  --env-file .env \
  twilio-ultravox-agent

# Check container status
docker ps
docker logs twilio-ultravox-agent
```

#### **Docker with Database Migrations**

```bash
# For environments where database schema needs to be created
docker run -d \
  --name twilio-ultravox-agent \
  -p 3000:3000 \
  --env-file .env \
  twilio-ultravox-agent
```

### 🧪 **Comprehensive Testing**

#### **Database-Aware Testing**

The application now includes proper database separation and management:

```bash
# Test Database Management
npm run test:reset     # Reset test database (voice-agents-test) to clean state
npm run test:clear     # Clear test data quickly without schema reset

# Testing with Clean Database
./scripts/test-endpoints-clean.sh                    # Test localhost with clean test database
./scripts/test-endpoints-clean.sh http://localhost:3001  # Test specific URL with clean database
```

#### **Automated Test Suite**

```bash
# Run all tests with test database
npm test               # Uses voice-agents-test database automatically

# Run with coverage
npm run test:coverage

# Run integration tests only
npm test -- tests/integration/

# Run unit tests only
npm test -- tests/unit/
```

#### **Endpoint Testing Script**

Use the included comprehensive test script:

```bash
# Test localhost (API key from ADMIN_API_KEY environment variable)
ADMIN_API_KEY=your-actual-api-key ./test-endpoints.sh

# Test with verbose output showing all responses
VERBOSE=true ADMIN_API_KEY=your-actual-api-key ./test-endpoints.sh

# Test production server with custom API key
./test-endpoints.sh https://your-server.com your-admin-api-key

# Test specific endpoints only
ADMIN_API_KEY=your-actual-api-key ./test-endpoints.sh | grep "Admin"
```

**Test Coverage:**
- ✅ **Health Endpoints** (2 tests): Basic and detailed health checks
- ✅ **API v1 Admin** (2 tests): Authentication and stats endpoints
- ✅ **API v1 Tools** (4 tests): Availability, reservations, and validation
- ✅ **API v1 Webhooks** (3 tests): Twilio, Ultravox, and validation
- ✅ **Error Handling** (2 tests): 404 responses and CORS headers

**Sample Test Output:**
```
🧪 Testing Twilio Ultravox Agent Server
Base URL: http://localhost:3000
=== Test Results ===
Total tests: 13
Passed: ✅ 13
Failed: ❌ 0
🎉 All tests passed!
```

### 🔧 **Development Options**

#### **Option 1: Local Development**
```bash
# Start development server with hot reload
npm run dev

# Watch mode for tests
npm run test:watch
```

#### **Option 2: Docker Development**
```bash
# Development with hot reload
docker-compose up -d  # If you have docker-compose.yml
# OR
docker run -p 3000:3000 -v $(pwd):/app --env-file .env twilio-ultravox-agent npm run dev
```

#### **Option 3: Local with ngrok (for webhook testing)**
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Copy the HTTPS URL to BASE_URL in your .env file
# Update Twilio webhook URL to: https://abc123.ngrok-free.app/api/v1/webhook/twilio
```

## 🎛️ **Modern API Endpoints (v1)**

### 🔧 **API v1 Tools (AI Agent Endpoints)**

#### **Check Availability**
```bash
POST /api/v1/tools/check-availability
Content-Type: application/json

{
  "date": "2025-06-30",
  "partySize": 4
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "message": "Found 10 available time slots for 4 people on Monday, June 30, 2025",
    "slots": [
      {
        "date": "2025-06-30",
        "time": "7:00 PM",
        "available": true,
        "remainingCapacity": 8
      }
    ]
  },
  "message": "Availability checked successfully",
  "timestamp": "2025-06-24T06:16:17.343Z"
}
```

#### **Make Reservation**
```bash
POST /api/v1/tools/make-reservation
Content-Type: application/json

{
  "customerName": "John Doe",
  "date": "2025-06-30",
  "time": "7:00 PM",
  "partySize": 4,
  "phone": "+1234567890",
  "specialRequirements": "Window table preferred"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "confirmationCode": "HVQ",
    "phoneticCode": "Hotel, V for Victor, Q for Quebec",
    "message": "Reservation confirmed for John Doe, party of 4, on Monday, June 30, 2025 at 7:00 PM",
    "booking": {
      "customerName": "John Doe",
      "date": "2025-06-30",
      "time": "7:00 PM",
      "partySize": 4
    }
  },
  "message": "Reservation created successfully",
  "timestamp": "2025-06-24T06:16:27.912Z"
}
```

### 🔐 **API v1 Admin (Authenticated Endpoints)**

All admin endpoints require the `X-API-Key` header:

```bash
X-API-Key: your_admin_api_key_here
```

#### **System Statistics**
```bash
GET /api/v1/admin/stats
X-API-Key: your_admin_api_key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBookings": 5,
    "activeBookings": 5,
    "cancelledBookings": 0,
    "totalCalls": 0,
    "activeCalls": 0,
    "bookingsByDate": {
      "2025-06-25": 1,
      "2025-06-26": 1,
      "2025-06-30": 3
    },
    "systemStatus": {
      "database": "healthy",
      "memory": {
        "used": "16.32 MB",
        "total": "18.32 MB",
        "percentage": 89
      },
      "uptime": "5m"
    }
  },
  "message": "System statistics retrieved successfully",
  "timestamp": "2025-06-24T06:20:31.388Z"
}
```

### 🔗 **API v1 Webhooks**

#### **Twilio Voice Webhook (NEW)**
```bash
POST /api/v1/webhook/twilio/voice
Content-Type: application/json

{
  "CallSid": "CA12345",
  "From": "+1234567890",
  "To": "+0987654321"
}
```

**Response (TwiML XML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://api.ultravox.ai/ws/..." name="bella-vista-agent"/>
  </Connect>
</Response>
```

#### **Twilio Status Webhook**
```bash
POST /api/v1/webhook/twilio
Content-Type: application/json

{
  "CallSid": "CA12345",
  "CallStatus": "in-progress",
  "From": "+1234567890",
  "To": "+0987654321"
}
```

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "status": "in_progress",
    "call_sid": "CA12345"
  },
  "message": "Webhook processed successfully",
  "timestamp": "2025-06-24T06:16:10.248Z"
}
```

#### **Ultravox Webhook**
```bash
POST /api/v1/webhook/ultravox
Content-Type: application/json

{
  "event_type": "call_started",
  "call_id": "call_12345"
}
```

### 🏥 **Health & Monitoring Endpoints**

#### **Basic Health Check**
```bash
GET /health

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-06-24T06:15:49.959Z",
    "uptime": 37.487498673,
    "version": "v1"
  }
}
```

#### **Detailed Health Check**
```bash
GET /health/detailed

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "database": {"status": "pass", "duration": 45},
      "memory": {"status": "warn", "details": {"usagePercent": 89}},
      "server": {"status": "pass", "responseTime": 5}
    },
    "metrics": {
      "memoryUsage": {...},
      "cpuUsage": {...}
    }
  }
}
```

#### **Readiness Check**
```bash
GET /ready

Response:
{
  "success": true,
  "data": {
    "status": "ready",
    "timestamp": "2025-06-24T06:15:49.959Z"
  }
}
```

## 🧪 **Testing & Quality Assurance**

### 🔬 **Test Architecture**

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── services/           # Service layer tests
│   ├── controllers/        # Controller tests
│   ├── middleware/         # Middleware tests
│   └── utils/             # Utility function tests
├── integration/            # Integration tests
│   ├── api.simple.test.ts # Comprehensive API tests
│   └── database.test.ts   # Database integration tests
└── helpers/               # Test utilities
    └── testApp.ts         # Test application factory
```

### 📊 **Test Coverage Report**

```bash
npm run test:coverage

# Example output:
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
All files              |   94.21 |    89.47 |   95.65 |   94.89
src/controllers         |   92.31 |    85.71 |   100.0 |   92.31
src/middleware          |   96.77 |    91.67 |   100.0 |   96.77
src/services           |   95.45 |    88.89 |   94.44 |   95.45
src/utils              |   91.30 |    85.71 |   90.91 |   91.30
```

### 🎯 **Testing Best Practices**

1. **Mocked Dependencies**: All external services (Prisma, APIs) are mocked
2. **Environment Isolation**: Tests use separate test database
3. **Comprehensive Coverage**: Unit, integration, and E2E tests
4. **Automated Validation**: Input validation testing with invalid data
5. **Security Testing**: Authentication and authorization testing

## 📊 **Database & Data Management**

### 🗄️ **Database Schema (Prisma)**

```prisma
model Booking {
  id                   String        @id @default(cuid())
  confirmationCode     String        @unique
  customerName         String
  phone               String
  date                String
  time                String
  partySize           Int
  specialRequirements String?
  status              BookingStatus @default(CONFIRMED)
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@map("bookings")
}

model CallLog {
  id              String    @id @default(cuid())
  ultravoxCallId  String?   @unique
  twilioCallSid   String?   @unique
  status          CallStatus @default(ACTIVE)
  startTime       DateTime  @default(now())
  endTime         DateTime?
  duration        Int?      // in seconds
  transferredTo   String?   // phone number if transferred
  endReason       String?
  metadata        Json?     // additional call data

  @@map("call_logs")
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

enum CallStatus {
  ACTIVE
  COMPLETED
  FAILED
  TRANSFERRED
}
```

### 💾 **Database Operations**

#### **Production vs Test Database Separation**

The system now maintains separate databases:
- **Production**: `voice-agents` database for live data
- **Test**: `voice-agents-test` database for testing (automatically used by test scripts)

```bash
# Development database setup
npx prisma generate          # Generate Prisma client
npx prisma migrate deploy    # Apply migrations (recommended over db push)

# Production database setup  
DATABASE_URL="postgresql://user:pass@host:5432/voice-agents" npx prisma migrate deploy
npx prisma db seed          # Seed with test data

# Test database management
npm run test:reset          # Reset test database completely
npm run test:clear          # Clear test data only

# Database management
npx prisma studio          # Visual database browser
npx prisma migrate dev     # Create new migration
```

#### **Migration Management**

The application now includes proper migration files:

```bash
# View migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name add_new_feature

# Apply migrations in production
npx prisma migrate deploy

# Reset migrations (dangerous - only for development)
npx prisma migrate reset
```

### 🔍 **Data Validation with Zod**

```typescript
// Example: Booking validation schema
const makeReservationSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number"),
  date: z.string().min(1, "Date is required"),
  time: z.string().regex(/^(1[0-2]|[1-9]):[0-5][0-9]\s?(AM|PM)$/i, "Invalid time format"),
  partySize: z.number().int().min(1).max(12, "Party size must be between 1 and 12"),
  specialRequirements: z.string().optional()
});
```

## 🔐 **Security & Production Considerations**

### 🛡️ **Security Features**

1. **Input Validation**: Zod schemas validate all inputs
2. **API Authentication**: API key required for admin endpoints  
3. **Security Headers**: Helmet.js provides security headers
4. **CORS Configuration**: Properly configured cross-origin requests
5. **Rate Limiting**: Protection against abuse
6. **SQL Injection Protection**: Prisma ORM prevents SQL injection
7. **Environment Variable Protection**: Sensitive data in environment variables

### 🔒 **Security Headers Applied**

```javascript
// Applied automatically via Helmet.js
Content-Security-Policy: default-src 'self'
Cross-Origin-Opener-Policy: same-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
```

### 🚨 **Production Security Checklist**

- [ ] Strong admin API keys (32+ characters)
- [ ] Environment variables secured
- [ ] Database credentials protected
- [ ] HTTPS enforced in production
- [ ] Webhook signature validation (Twilio)
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Proper error messages (no sensitive data leaked)
- [ ] Logging configured for security events

## 📈 **Monitoring & Observability**

### 📊 **Built-in Monitoring**

1. **Health Checks**: Multiple health endpoints for monitoring
2. **Metrics Collection**: Memory, CPU, call counts, response times
3. **Structured Logging**: Winston logger with correlation IDs
4. **Error Tracking**: Comprehensive error logging and stack traces
5. **Performance Monitoring**: Request duration and system metrics

### 🔍 **Logging Configuration**

```javascript
// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### 📱 **Health Check Endpoints for Monitoring**

```bash
# Basic health (uptime monitoring)
curl https://your-domain.com/health

# Detailed health (system diagnostics)  
curl https://your-domain.com/health/detailed

# Readiness check (load balancer health)
curl https://your-domain.com/ready
```

## 🚀 **Production Deployment**

### 🌐 **Deployment Options**

#### **Option 1: Docker Container (Recommended)**

```bash
# Build production image
docker build -t twilio-ultravox-agent:latest .

# Run with production configuration
docker run -d \
  --name twilio-ultravox-prod \
  -p 3000:3000 \
  --restart unless-stopped \
  --env-file .env.production \
  twilio-ultravox-agent:latest

# Health check
curl http://localhost:3000/health
```

#### **Option 2: Cloud Platform (e.g., Sliplane.io)**

```bash
# Deploy to Sliplane.io or similar platform
git push origin main

# Configure environment variables in platform dashboard
# Set webhook URLs in Twilio configuration
# Verify deployment with test script
./test-endpoints.sh https://your-domain.com your-api-key
```

#### **Option 3: Traditional Server (PM2)**

```bash
# Install PM2 globally
npm install -g pm2

# Build application  
npm run build

# Start with PM2
pm2 start dist/src/server.enhanced.js --name "twilio-ultravox-agent"

# Configure PM2 for restart
pm2 startup
pm2 save
```

### ⚙️ **Production Configuration**

#### **Twilio Webhook Configuration**

Set your Twilio phone number's webhook URL to:

```
https://your-domain.com/api/v1/webhook/twilio
```

#### **Environment Variables for Production**

```bash
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgres://user:password@production-db:5432/voiceagent
BASE_URL=https://your-production-domain.com
# ... other production values
```

#### **Database Migration for Production**

```bash
# Run migrations on production database
DATABASE_URL="postgresql://user:pass@host:5432/voice-agents" npx prisma migrate deploy

# Verify database schema
DATABASE_URL="postgresql://user:pass@host:5432/voice-agents" npx prisma db pull

# Important: Ensure postgresql:// protocol (not postgres://) for Prisma compatibility
```

## 🐛 **Troubleshooting & Common Issues**

### 🔧 **Common Issues & Solutions**

#### **Database Connection Issues**
```bash
# Check database connectivity
DATABASE_URL="postgresql://user:pass@host:5432/dbname" npx prisma db pull

# Common fix: Ensure correct protocol
# ❌ Wrong: DATABASE_URL="postgres://..."
# ✅ Correct: DATABASE_URL="postgresql://..."

# Update Prisma client
npx prisma generate

# For Docker: Ensure proper binary targets
# In prisma/schema.prisma:
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

#### **Migration Issues**
```bash
# If database schema exists but no migrations
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
# Copy output to prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init

# For test database separation issues
npm run test:reset  # Ensures clean test database state

# Migration conflicts
npx prisma migrate status    # Check current status
npx prisma migrate resolve   # Resolve conflicts
```

#### **Docker Build Issues**
```bash
# Clear Docker cache
docker system prune -a

# Build with no cache
docker build --no-cache -t twilio-ultravox-agent .

# Check Alpine Linux compatibility
docker run --rm twilio-ultravox-agent node --version
```

#### **API Endpoint Issues**
```bash
# Test individual endpoints
curl -X GET http://localhost:3000/health
curl -X GET http://localhost:3000/api/v1/admin/stats -H "X-API-Key: your-key"

# Check logs for errors
docker logs twilio-ultravox-agent
# OR
tail -f logs/combined.log
```

#### **Webhook Validation Failures**
```bash
# Test webhook endpoints directly
curl -X POST http://localhost:3000/api/v1/webhook/twilio \
  -H "Content-Type: application/json" \
  -d '{"CallSid": "test", "CallStatus": "test"}'

# Should return 400 for missing fields
curl -X POST http://localhost:3000/api/v1/webhook/twilio \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 📞 **Testing Webhook Integration**

```bash
# Use ngrok for local webhook testing
ngrok http 3000

# Update Twilio webhook URL to:
# https://abc123.ngrok-free.app/api/v1/webhook/twilio

# Monitor webhook calls
tail -f logs/combined.log | grep "webhook"
```

## 📋 **Migration Guide (Legacy to v1)**

### 🔄 **For Existing Implementations**

If upgrading from the legacy monolithic version:

1. **Update Webhook URLs**: Change from `/webhook/twilio` to `/api/v1/webhook/twilio`
2. **Update Admin Endpoints**: Add `/api/v1/` prefix to admin calls
3. **Add API Keys**: Ensure `X-API-Key` header for admin endpoints
4. **Update Environment**: Add new required environment variables
5. **Database Migration**: Run Prisma migrations for new schema

### 📝 **Breaking Changes**

- **Endpoint URLs**: All endpoints now prefixed with `/api/v1/`
- **Response Format**: Standardized response format with `success`, `data`, `message`
- **Authentication**: Admin endpoints now require API key authentication
- **Validation**: Stricter input validation with detailed error messages
- **Database**: New Prisma schema with proper relationships

## 📚 **API Reference Quick Guide**

### 🔗 **Endpoint Summary**

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | ❌ | Basic health check |
| `/health/detailed` | GET | ❌ | Detailed system health |
| `/ready` | GET | ❌ | Readiness probe |
| `/api/v1/tools/check-availability` | POST | ❌ | Check reservation availability |
| `/api/v1/tools/make-reservation` | POST | ❌ | Create new reservation |
| `/api/v1/webhook/twilio` | POST | ❌ | Twilio webhook handler |
| `/api/v1/webhook/ultravox` | POST | ❌ | Ultravox webhook handler |
| `/api/v1/admin/stats` | GET | ✅ | System statistics |

### 🔑 **Authentication**

Admin endpoints require the `X-API-Key` header:

```bash
X-API-Key: admin-key-your-generated-key-here
```

### 📊 **Response Format**

All API v1 endpoints return standardized responses:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Operation completed successfully",
  "timestamp": "2025-06-24T06:16:27.912Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2025-06-24T06:16:27.912Z",
  "details": [ /* validation errors if applicable */ ]
}
```

---

## 🎉 **Getting Started Checklist**

### ✅ **Setup Checklist**

1. **Environment Setup**
   - [ ] Node.js 18+ installed
   - [ ] PostgreSQL database available
   - [ ] Ultravox API account and key
   - [ ] Twilio account with phone number
   - [ ] Generated admin API key

2. **Installation**
   - [ ] `npm install` completed
   - [ ] `.env` file configured
   - [ ] Database schema deployed (`npx prisma db push`)
   - [ ] Prisma client generated (`npx prisma generate`)

3. **Testing**
   - [ ] Health check responds: `curl http://localhost:3000/health`
   - [ ] Test script passes: `./test-endpoints.sh`
   - [ ] All 13 endpoint tests pass
   - [ ] Admin authentication working

4. **Production Deployment**
   - [ ] Docker image builds successfully
   - [ ] Container runs and stays healthy
   - [ ] Webhook URLs configured in Twilio
   - [ ] Production database migrated
   - [ ] Monitoring configured

5. **Integration Testing**
   - [ ] Test phone call flows through system
   - [ ] Verify reservation creation works
   - [ ] Confirm webhook processing
   - [ ] Validate human transfer functionality

### 🚀 **Next Steps**

1. **Customize Configuration**: Update agent name, voices, and business logic
2. **Add Menu Data**: Populate Ultravox corpus with restaurant menu information
3. **Configure Monitoring**: Set up uptime monitoring and alerting
4. **Scale Infrastructure**: Configure load balancing and horizontal scaling if needed
5. **Monitor Performance**: Use health endpoints to track system performance

---

**For additional support, feature requests, or bug reports, please refer to the project documentation or contact the development team.**

**🎯 Happy building with your modern, production-ready Twilio Ultravox Agent Server!**