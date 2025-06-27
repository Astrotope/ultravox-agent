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
- **Robust Error Handling**: Intelligent 4xx vs 5xx error distinction with appropriate logging levels
- **Phonetic Confirmation Codes**: Smart handling of voice-friendly booking confirmations
- **Complete Tool Integration**: All 9 Ultravox tools implemented (availability, reservations, booking lookup, specials, hours, transfers)
- **Enhanced Monitoring**: Rich emoji-based structured logging with correlation IDs and performance metrics

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
- **Automated Testing**: Comprehensive test suite with 187 tests and zero timeout issues
- **Docker Ready**: Multi-stage builds with Alpine Linux optimization
- **Intelligent Error Logging**: Smart distinction between client errors (4xx) and server errors (5xx)
- **Robust Test Infrastructure**: Isolated test environments with proper cleanup and resource management

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
│   ├── toolController.ts     # AI tool endpoints (enhanced error handling)
│   └── webhookController.ts  # Webhook processing
├── middleware/               # Express middleware
│   ├── auth.middleware.ts    # API key authentication
│   ├── zodValidation.middleware.ts # Input validation
│   ├── security.middleware.ts # Helmet.js security
│   ├── logging.middleware.ts # Winston structured logging
│   └── error.middleware.ts   # Enhanced error handling with smart logging
├── routes/v1/               # API v1 versioned routes
│   ├── admin.routes.ts      # Admin endpoints
│   ├── booking.routes.ts    # Booking operations
│   ├── tool.routes.ts       # AI tool endpoints
│   └── webhook.routes.ts    # Webhook handlers
├── services/                # Business logic layer
│   ├── bookingService.ts    # Reservation logic (phonetic code support)
│   ├── adminService.ts      # Admin operations
│   ├── toolService.ts       # AI tool implementations (smart error handling)
│   ├── callManagerService.ts # Call lifecycle management (test-safe)
│   └── webhookService.ts    # Webhook processing
├── schemas/                 # Zod validation schemas
│   ├── booking.schemas.ts   # Booking validation
│   └── webhook.schemas.ts   # Webhook validation
└── utils/                   # Utility functions
    ├── gracefulShutdown.ts  # Production shutdown handling
    ├── healthChecker.ts     # Health monitoring
    ├── logger.ts           # Winston logger configuration (optimized)
    └── dateUtils.ts        # chrono-node date parsing

scripts/                     # Database and testing scripts
├── reset-test-db.sh        # Complete test database reset
├── clear-test-data.sh      # Quick test data clearing
├── test-endpoints-clean.sh # Clean endpoint testing
├── cleanup-test-bookings.js # Automated test cleanup
└── wait-for-db.sh         # Docker database wait script

tests/                      # Comprehensive test suite (187 tests)
├── unit/                   # Unit tests for individual components
│   ├── services/          # Service layer tests
│   ├── middleware/        # Middleware tests
│   └── utils/            # Utility function tests
├── integration/           # Integration tests
│   ├── api.test.ts       # Comprehensive API tests (22 endpoints)
│   ├── api.simple.test.ts # Core API tests with proper cleanup
│   └── twilio-voice-webhook.test.ts # Webhook integration tests
├── e2e/                   # End-to-end tests
│   └── booking-flow.test.ts # Complete booking workflow tests
└── helpers/               # Test utilities
    └── testApp.ts         # Test application factory

prisma/
├── migrations/             # Database migration files
│   └── 0_init/            # Initial schema migration
├── schema.prisma          # Database schema definition
└── seed.ts               # Database seeding script
```

### 🎯 **Key Architectural Benefits**

1. **Maintainability**: Clear separation of concerns makes code easier to understand and modify
2. **Testability**: Each component can be unit tested independently with comprehensive coverage
3. **Scalability**: Modular structure supports team development and feature expansion
4. **Type Safety**: TypeScript + Zod provides compile-time and runtime type checking
5. **Production Ready**: Comprehensive error handling, logging, and monitoring
6. **API Versioning**: `/api/v1/` structure supports future API evolution
7. **Zero Timeout Issues**: Robust test infrastructure with proper resource management
8. **Smart Error Handling**: Intelligent distinction between user errors and system errors

### 🔧 **Enhanced Technology Stack**

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime |
| **Framework** | Express.js | Web application framework |
| **Language** | TypeScript | Type-safe JavaScript |
| **Database** | PostgreSQL + Prisma | Persistent data storage |
| **Validation** | Zod | Runtime type validation |
| **Logging** | Winston | Structured logging with smart levels |
| **Security** | Helmet.js | Security middleware |
| **Date Parsing** | chrono-node | Natural language dates |
| **Testing** | Jest + Supertest | Unit & integration testing (187 tests) |
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

### 🧪 **Comprehensive Testing (187 Tests - Zero Timeout Issues)**

#### **Robust Test Infrastructure**

The application now includes comprehensive testing with proper database separation and resource management:

```bash
# Test Database Management (Automatic Separation)
npm run test:reset     # Reset test database (voice-agents-test) to clean state
npm run test:clear     # Clear test data quickly without schema reset

# Full Test Suite (187 Tests)
npm test               # Run all tests with automatic test database
npm run test:coverage  # Run with coverage report
npm run test:watch     # Watch mode for development

# Test Categories
npm test -- tests/unit/        # Unit tests (services, controllers, middleware)
npm test -- tests/integration/ # Integration tests (API endpoints)
npm test -- tests/e2e/        # End-to-end tests (complete workflows)
```

#### **Test Results Summary**
```
Test Suites: 12 passed, 12 total
Tests:       187 passed, 187 total
Snapshots:   0 total
Time:        ~45s (significantly improved from previous timeout issues)
```

#### **Endpoint Testing Script (13 Comprehensive Tests)**

Use the included comprehensive test script that validates all deployment environments:

```bash
# Test localhost (development)
ADMIN_API_KEY=your-actual-api-key ./test-endpoints.sh

# Test with verbose output showing all responses
VERBOSE=true ADMIN_API_KEY=your-actual-api-key ./test-endpoints.sh

# Test production server
./test-endpoints.sh https://your-production-domain.com your-admin-api-key

# Test Docker container
docker run -p 3000:3000 --env-file .env twilio-ultravox-agent
./test-endpoints.sh http://localhost:3000 your-admin-api-key
```

**Test Coverage (13 Endpoint Tests):**
- ✅ **Health Endpoints** (2 tests): Basic and detailed health checks
- ✅ **API v1 Admin** (2 tests): Authentication and stats endpoints  
- ✅ **API v1 Tools** (4 tests): Availability, reservations, and validation
- ✅ **API v1 Webhooks** (3 tests): Twilio, Ultravox, and validation
- ✅ **Error Handling** (2 tests): 404 responses and CORS headers

**Validated Environments:**
- ✅ **npm run dev**: Local development server
- ✅ **Docker Container**: Local containerized deployment
- ✅ **Production**: Live deployment at https://your-production-domain.com

**Sample Test Output:**
```
🧪 Testing Twilio Ultravox Agent Server
Base URL: http://localhost:3000
=== Test Results ===
Total tests: 13
Passed: ✅ 13
Failed: ❌ 0
🎉 All tests passed!
🧹 Cleaning up test booking for TEST_USER_1750831571_63151...
✅ Cleaned up 1 test bookings
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
  -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  --env-file .env \
  twilio-ultravox-agent

# Check container status and health
docker ps
docker logs twilio-ultravox-agent
curl http://localhost:3000/health
```

#### **Docker with Database Migrations**

```bash
# For environments where database schema needs to be created
docker run -d \
  --name twilio-ultravox-agent \
  -p 3000:3000 \
  --env-file .env \
  twilio-ultravox-agent

# Verify deployment with comprehensive testing
ADMIN_API_KEY=your-api-key ./test-endpoints.sh http://localhost:3000
```

### 🔧 **Development Options**

#### **Option 1: Local Development (Enhanced)**
```bash
# Start development server with hot reload
npm run dev

# Watch mode for tests (187 tests)
npm run test:watch

# Test specific categories
npm test -- tests/unit/services/bookingService.test.ts
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

#### **Make Reservation (Enhanced with Phonetic Codes)**
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
    "confirmationCode": "XUA",
    "phoneticCode": "X for X-ray, U for Uniform, A for Alpha",
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

#### **Get Booking Details (Phonetic Support)**
```bash
POST /api/v1/tools/get-booking-details
Content-Type: application/json

{
  "confirmationCode": "X-ray Uniform Alpha"  // Supports phonetic input
}
```

**Smart Phonetic Conversion:**
- Handles compound words: "X-ray" → "X"
- Supports multiple formats: "X-ray Uniform Alpha", "XUA", "X for X-ray, U for Uniform"
- Voice-friendly confirmation code lookups

#### **Check Booking (Phonetic Support)**
```bash
POST /api/v1/tools/check-booking
Content-Type: application/json

{
  "confirmationCode": "XUA"  // Also supports phonetic: "X-ray Uniform Alpha"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "confirmationCode": "XUA",
      "phoneticCode": "X for X-ray, U for Uniform, A for Alpha",
      "customerName": "John Doe",
      "phone": "+1234567890",
      "date": "2025-06-30",
      "time": "7:00 PM", 
      "partySize": 4,
      "specialRequirements": "Window table preferred",
      "status": "CONFIRMED"
    },
    "formattedDate": "Monday, June 30, 2025"
  },
  "message": "Booking details retrieved successfully",
  "timestamp": "2025-06-25T07:48:18.019Z"
}
```

#### **Daily Specials**
```bash
GET /api/v1/tools/daily-specials
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Today's specials are: For soup, we have Tuscan White Bean Soup with rosemary and pancetta. And our chef's special meal is Pan-Seared Salmon with lemon herb risotto and seasonal vegetables.",
    "specials": {
      "soup": "Tuscan White Bean Soup with rosemary and pancetta",
      "meal": "Pan-Seared Salmon with lemon herb risotto and seasonal vegetables"
    }
  },
  "message": "Daily specials retrieved successfully",
  "timestamp": "2025-06-25T07:48:18.041Z"
}
```

#### **Opening Hours**
```bash
GET /api/v1/tools/opening-hours
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "isOpen": true,
    "message": "We're currently open until 10 PM today.",
    "hours": {
      "Monday through Thursday": "5:00 PM to 10:00 PM",
      "Friday and Saturday": "5:00 PM to 11:00 PM",
      "Sunday": "5:00 PM to 10:00 PM"
    }
  },
  "message": "Opening hours retrieved successfully",
  "timestamp": "2025-06-25T07:48:18.041Z"
}
```

#### **Transfer Call**
```bash
POST /api/v1/tools/transfer-call
Content-Type: application/json

{
  "callId": "call-123",
  "reason": "Customer requested human agent",
  "customerName": "John Doe",
  "summary": "Customer wants to discuss large party booking"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "message": "Call transfer initiated",
    "transferMessage": "I'm connecting you with our booking team. Please note that during busy serving hours, there may be a brief wait as our staff is focused on providing excellent service to our dining guests.",
    "reason": "Customer requested human agent",
    "customerName": "John Doe",
    "summary": "Customer wants to discuss large party booking"
  },
  "message": "Call transfer initiated successfully",
  "timestamp": "2025-06-25T07:48:18.041Z"
}
```

### 🔐 **API v1 Admin (Authenticated Endpoints)**

All admin endpoints require the `X-API-Key` header:

```bash
X-API-Key: your_admin_api_key_here
```

#### **System Statistics (Enhanced)**
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

### 🔗 **API v1 Webhooks (Enhanced Error Handling)**

#### **Twilio Voice Webhook**
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

#### **Twilio Status Webhook (Smart Error Logging)**
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

**Enhanced Error Handling:**
- 4xx client errors logged as warnings (not noise)
- 5xx server errors logged as errors (requires attention)
- Proper HTTP status codes maintained for API consumers

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

## 🧪 **Testing & Quality Assurance (Major Improvements)**

### 🎯 **Zero Timeout Issues Achievement**

**Previous Issues Resolved:**
- ❌ Jest tests hanging indefinitely when run as full suite
- ❌ API key mismatches between test and production
- ❌ CallManagerService intervals causing resource leaks in tests
- ❌ Excessive error logging creating test noise
- ❌ Phonetic confirmation code conversion failures

**Solutions Implemented:**
- ✅ Fixed API key configuration alignment between environments
- ✅ Disabled CallManagerService intervals in test mode (`NODE_ENV=test`)
- ✅ Implemented smart error logging (4xx warnings vs 5xx errors)
- ✅ Enhanced phonetic code parsing for compound words ("X-ray")
- ✅ Proper test database isolation and cleanup
- ✅ Resource leak prevention with proper cleanup handlers

### 🔬 **Test Architecture**

```
tests/                          # 187 Tests Total
├── unit/                      # Unit tests for individual components
│   ├── services/             # Service layer tests (45 tests)
│   │   ├── bookingService.test.ts    # Enhanced with phonetic testing
│   │   └── callManagerService.test.ts # Test-safe resource management
│   ├── controllers/          # Controller tests (32 tests)
│   ├── middleware/           # Middleware tests (28 tests)
│   │   ├── logging.middleware.test.ts # Smart error logging tests
│   │   └── zodValidation.middleware.test.ts
│   └── utils/               # Utility function tests (25 tests)
│       ├── dateUtils.test.ts # Natural language date parsing
│       └── healthChecker.test.ts
├── integration/             # Integration tests (35 tests)
│   ├── api.test.ts         # Comprehensive API tests (22 endpoints)
│   ├── api.simple.test.ts  # Core API tests with proper cleanup
│   └── twilio-voice-webhook.test.ts # Webhook integration tests
├── e2e/                    # End-to-end tests (22 tests)
│   └── booking-flow.test.ts # Complete booking workflow tests
└── helpers/                # Test utilities
    └── testApp.ts         # Test application factory
```

### 🎯 **Testing Best Practices Implemented**

1. **Environment Isolation**: Automatic test database separation (`voice-agents-test`)
2. **Resource Management**: Proper cleanup of intervals, database connections, and test data
3. **Mocked Dependencies**: All external services (Ultravox, Twilio) properly mocked
4. **Comprehensive Coverage**: Unit, integration, and E2E tests with edge cases
5. **API Key Security**: Proper test authentication without exposing production keys
6. **Error Scenario Testing**: Validation failures, timeout handling, and edge cases
7. **Smart Cleanup**: Automated test data cleanup with `cleanup-test-bookings.js`

### 🚀 **Deployment Validation Testing**

All three deployment environments validated with comprehensive endpoint testing:

```bash
# Development Environment (npm run dev)
npm run dev &
ADMIN_API_KEY=your-actual-admin-key ./test-endpoints.sh http://localhost:3000
# Result: ✅ 13/13 tests passed

# Docker Container Environment  
docker build -t twilio-ultravox-agent .
docker run -d --name test-container -p 3000:3000 --env-file .env twilio-ultravox-agent
ADMIN_API_KEY=your-actual-admin-key ./test-endpoints.sh http://localhost:3000
# Result: ✅ 13/13 tests passed

# Production Environment
ADMIN_API_KEY=your-actual-admin-key ./test-endpoints.sh https://your-production-domain.com
# Result: ✅ 13/13 tests passed
```

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

### 💾 **Database Operations (Enhanced)**

#### **Production vs Test Database Separation**

The system now maintains separate databases with automatic switching:
- **Production**: `voice-agents` database for live data
- **Test**: `voice-agents-test` database for testing (automatically used by Jest)

```bash
# Development database setup
npx prisma generate          # Generate Prisma client
npx prisma migrate deploy    # Apply migrations (recommended over db push)

# Production database setup  
DATABASE_URL="postgresql://user:pass@host:5432/voice-agents" npx prisma migrate deploy
npx prisma db seed          # Seed with test data

# Test database management (automated)
npm run test:reset          # Reset test database completely
npm run test:clear          # Clear test data only
npm test                    # Automatically uses test database

# Database management
npx prisma studio          # Visual database browser
npx prisma migrate dev     # Create new migration
```

#### **Enhanced Migration Management**

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

### 🔍 **Data Validation with Zod (Enhanced)**

```typescript
// Enhanced booking validation with better error messages
const makeReservationSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number"),
  date: z.string().min(1, "Date is required"),
  time: z.string().regex(/^(1[0-2]|[1-9]):[0-5][0-9]\s?(AM|PM)$/i, "Invalid time format"),
  partySize: z.number().int().min(1).max(12, "Party size must be between 1 and 12"),
  specialRequirements: z.string().optional()
});
```

### 🔧 **Enhanced Features**

#### **Smart Phonetic Confirmation Code Handling**

```typescript
// BookingService.convertPhoneticToLetters() enhanced
// Supports various input formats:
"X-ray Uniform Alpha" → "XUA"
"Delta Uniform X-ray" → "DUX" 
"XUA" → "XUA"
"X for X-ray, U for Uniform, A for Alpha" → "XUA"
```

**Key Improvements:**
- Handles compound words like "X-ray" correctly
- Supports multiple phonetic input formats
- Voice-friendly confirmation code lookups
- Robust parsing with fallback mechanisms

#### **Intelligent Error Logging**

```typescript
// Smart error distinction in controllers and services
const statusCode = (error as any).statusCode || 500;
const isClientError = statusCode >= 400 && statusCode < 500;

if (isClientError) {
  logger.warn('Client Error', { error, context }); // 4xx = warnings
} else {
  logger.error('Application Error', { error, context }); // 5xx = errors
}
```

**Benefits:**
- Reduces log noise from expected client errors (404s, validation failures)
- Highlights actual system errors that need attention
- Maintains proper HTTP status codes for API consumers
- Improves production monitoring and alerting

## 🔐 **Security & Production Considerations**

### 🛡️ **Security Features (Enhanced)**

1. **Input Validation**: Comprehensive Zod schemas validate all inputs with detailed error messages
2. **API Authentication**: API key required for admin endpoints with proper error handling
3. **Security Headers**: Helmet.js provides comprehensive security headers
4. **CORS Configuration**: Properly configured cross-origin requests
5. **Rate Limiting**: Protection against abuse with configurable limits
6. **SQL Injection Protection**: Prisma ORM prevents SQL injection
7. **Environment Variable Protection**: Sensitive data properly isolated
8. **Error Information Disclosure**: Smart error messages that don't leak sensitive data

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

- [x] Strong admin API keys (32+ characters)
- [x] Environment variables secured
- [x] Database credentials protected  
- [x] HTTPS enforced in production
- [x] Webhook signature validation preparation
- [x] Rate limiting configured
- [x] Comprehensive input validation on all endpoints
- [x] Smart error messages (no sensitive data leaked)
- [x] Security-focused logging configured
- [x] Test environment isolation

## 📈 **Monitoring & Observability (Enhanced)**

### 📊 **Built-in Monitoring**

1. **Multi-Level Health Checks**: Basic, detailed, and readiness endpoints
2. **Comprehensive Metrics**: Memory, CPU, call counts, response times, database status
3. **Intelligent Logging**: Winston logger with correlation IDs and smart error levels
4. **Error Tracking**: Comprehensive error logging with context and stack traces
5. **Performance Monitoring**: Request duration tracking and system metrics
6. **Call Lifecycle Management**: Real-time call status tracking and cleanup

### 🔍 **Enhanced Logging Configuration**

```javascript
// Winston logger with smart error level detection
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? productionFormat : devFormat
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.File({ filename: 'logs/http.log', level: 'http' })
  ]
});
```

**Logging Improvements:**
- Smart error level detection (4xx warnings vs 5xx errors)
- Correlation ID tracking for request tracing
- Structured JSON logging for production parsing
- Separate log files by severity level
- Performance metrics with request duration tracking

### 📱 **Health Check Endpoints for Monitoring**

```bash
# Basic health (uptime monitoring)
curl https://your-production-domain.com/health

# Detailed health (system diagnostics)  
curl https://your-production-domain.com/health/detailed

# Readiness check (load balancer health)
curl https://your-production-domain.com/ready
```

## 🚀 **Production Deployment (Validated)**

### 🌐 **Deployment Options (All Tested)**

#### **Option 1: Docker Container (Recommended) ✅**

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

# Validate deployment
curl http://localhost:3000/health
ADMIN_API_KEY=your-key ./test-endpoints.sh http://localhost:3000
```

#### **Option 2: Cloud Platform (Sliplane.io) ✅**

```bash
# Deploy to Sliplane.io (validated production environment)
git push origin main

# Configure environment variables in platform dashboard
# Set webhook URLs in Twilio configuration
# Verify deployment with comprehensive testing
./test-endpoints.sh https://your-production-domain.com your-api-key
# Result: ✅ 13/13 tests passed
```

#### **Option 3: Traditional Server (PM2) ✅**

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

# Validate deployment
./test-endpoints.sh http://localhost:3000 your-api-key
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
DATABASE_URL=postgresql://user:password@production-db:5432/voice-agents
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

## 🐛 **Troubleshooting & Common Issues (Updated)**

### 🔧 **Common Issues & Solutions**

#### **Test Timeout Issues (RESOLVED)**
```bash
# Previous Issue: Tests hanging indefinitely
# ❌ Problem: API key mismatches, resource leaks, excessive logging

# ✅ Solution Implemented:
# - Fixed API key configuration alignment
# - Disabled CallManagerService intervals in test mode
# - Implemented smart error logging levels
# - Enhanced phonetic code parsing
# - Proper test database isolation

# Verify resolution:
npm test  # Should complete in ~45s with 187/187 tests passing
```

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

#### **Phonetic Code Issues (RESOLVED)**
```bash
# Previous Issue: "X-ray Uniform Alpha" not converting to "XUA"
# ✅ Solution: Enhanced BookingService.convertPhoneticToLetters()

# Test phonetic conversion:
curl -X POST http://localhost:3000/api/v1/tools/get-booking-details \
  -H "Content-Type: application/json" \
  -d '{"confirmationCode": "X-ray Uniform Alpha"}'
# Should now return booking data correctly
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

# Use comprehensive test script
./test-endpoints.sh http://localhost:3000 your-api-key

# Check logs for errors
docker logs twilio-ultravox-agent
# OR
tail -f logs/combined.log
```

#### **Error Logging Issues (RESOLVED)**
```bash
# Previous Issue: Too much noise from 404 errors
# ✅ Solution: Smart error level detection

# Verify smart logging:
# 4xx errors (client issues) → logged as warnings
# 5xx errors (server issues) → logged as errors

# Check logs for proper categorization:
tail -f logs/combined.log | grep -E "(WARN|ERROR)"
```

### 📞 **Testing Webhook Integration**

```bash
# Use ngrok for local webhook testing
ngrok http 3000

# Update Twilio webhook URL to:
# https://abc123.ngrok-free.app/api/v1/webhook/twilio

# Monitor webhook calls with smart logging
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
6. **Test Environment**: Set up separate test database configuration
7. **Update Error Handling**: Review error responses for new format

### 📝 **Breaking Changes**

- **Endpoint URLs**: All endpoints now prefixed with `/api/v1/`
- **Response Format**: Standardized response format with `success`, `data`, `message`
- **Authentication**: Admin endpoints now require API key authentication
- **Validation**: Stricter input validation with detailed error messages
- **Database**: New Prisma schema with proper relationships and migrations
- **Error Logging**: Smart error level detection (may affect log monitoring)
- **Test Isolation**: Test database automatically separated from production

## 📚 **API Reference Quick Guide**

### 🔗 **Endpoint Summary (Enhanced)**

| Endpoint | Method | Auth | Purpose | Status |
|----------|--------|------|---------|--------|
| `/health` | GET | ❌ | Basic health check | ✅ Tested |
| `/health/detailed` | GET | ❌ | Detailed system health | ✅ Tested |
| `/ready` | GET | ❌ | Readiness probe | ✅ Tested |
| `/api/v1/tools/check-availability` | POST | ❌ | Check reservation availability | ✅ Tested |
| `/api/v1/tools/make-reservation` | POST | ❌ | Create new reservation | ✅ Tested |
| `/api/v1/tools/modify-reservation` | POST | ❌ | Modify existing reservation | ✅ Tested |
| `/api/v1/tools/cancel-reservation` | POST | ❌ | Cancel reservation | ✅ Tested |
| `/api/v1/tools/get-booking-details` | POST | ❌ | Get booking (phonetic support) | ✅ Enhanced |
| `/api/v1/tools/check-booking` | POST | ❌ | Get booking (alias) | ✅ **New** |
| `/api/v1/tools/daily-specials` | GET | ❌ | Get daily specials | ✅ **New** |
| `/api/v1/tools/opening-hours` | GET | ❌ | Get opening hours | ✅ **New** |
| `/api/v1/tools/transfer-call` | POST | ❌ | Transfer call to human | ✅ **New** |
| `/api/v1/webhook/twilio` | POST | ❌ | Twilio webhook handler | ✅ Tested |
| `/api/v1/webhook/ultravox` | POST | ❌ | Ultravox webhook handler | ✅ Tested |
| `/api/v1/admin/stats` | GET | ✅ | System statistics | ✅ Tested |

### 🔑 **Authentication**

Admin endpoints require the `X-API-Key` header:

```bash
X-API-Key: admin-key-your-generated-key-here
```

### 📊 **Response Format (Standardized)**

All API v1 endpoints return standardized responses:

```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Operation completed successfully",
  "timestamp": "2025-06-24T06:16:27.912Z"
}
```

Error responses (with smart error level detection):

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

## 🎉 **Getting Started Checklist (Updated)**

### ✅ **Setup Checklist**

1. **Environment Setup**
   - [x] Node.js 18+ installed
   - [x] PostgreSQL database available
   - [x] Ultravox API account and key
   - [x] Twilio account with phone number
   - [x] Generated admin API key

2. **Installation**
   - [x] `npm install` completed
   - [x] `.env` file configured
   - [x] Database schema deployed (`npx prisma migrate deploy`)
   - [x] Prisma client generated (`npx prisma generate`)

3. **Testing (Zero Timeout Issues)**
   - [x] Health check responds: `curl http://localhost:3000/health`
   - [x] Full test suite passes: `npm test` (187/187 tests)
   - [x] Endpoint test script passes: `./test-endpoints.sh` (13/13 tests)
   - [x] Admin authentication working
   - [x] Phonetic confirmation codes working

4. **Production Deployment (Validated)**
   - [x] Docker image builds successfully
   - [x] Container runs and stays healthy
   - [x] Webhook URLs configured in Twilio
   - [x] Production database migrated
   - [x] Monitoring configured
   - [x] All three environments validated (dev, Docker, production)

5. **Integration Testing**
   - [x] Test phone call flows through system
   - [x] Verify reservation creation works
   - [x] Confirm webhook processing
   - [x] Validate human transfer functionality
   - [x] Phonetic confirmation code lookup

### 🚀 **Next Steps**

1. **Customize Configuration**: Update agent name, voices, and business logic
2. **Add Menu Data**: Populate Ultravox corpus with restaurant menu information
3. **Configure Monitoring**: Set up uptime monitoring and alerting using health endpoints
4. **Scale Infrastructure**: Configure load balancing and horizontal scaling if needed
5. **Monitor Performance**: Use enhanced health endpoints to track system performance
6. **Review Logs**: Monitor smart error logging for 4xx vs 5xx error patterns

### 🎯 **Recent Major Improvements Summary**

- ✅ **Resolved all test timeout issues** (187 tests now run reliably in ~45s)
- ✅ **Enhanced phonetic confirmation code handling** (supports "X-ray" and other compound words)
- ✅ **Implemented smart error logging** (4xx warnings vs 5xx errors)
- ✅ **Validated all three deployment environments** (dev, Docker, production)
- ✅ **Improved test infrastructure** with proper resource management and cleanup
- ✅ **Enhanced database isolation** between test and production environments
- ✅ **Comprehensive endpoint testing** with automated cleanup

---

**For additional support, feature requests, or bug reports, please refer to the project documentation or contact the development team.**

**🎯 Happy building with your modern, production-ready, fully-tested Twilio Ultravox Agent Server!**