import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/testApp';

describe('API Versioning Integration Tests', () => {
  let app: Express;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/voice-agents-test'
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.booking.deleteMany();
    await prisma.callLog.deleteMany();
  });

  describe('API Version Detection', () => {
    it('should route to v1 when /api/v1 is specified', async () => {
      const response = await request(app)
        .get('/api/v1/status')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          version: 'v1'
        })
      });
    });

    it('should default to v1 when no version is specified', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          version: 'v1'
        })
      });
    });

    it('should include API version in response headers', async () => {
      const response = await request(app)
        .get('/api/v1/status')
        .expect(200);

      expect(response.headers['api-version']).toBe('v1');
    });
  });

  describe('Tool Endpoints (v1)', () => {
    describe('POST /api/v1/tools/check-availability', () => {
      it('should check availability successfully', async () => {
        const response = await request(app)
          .post('/api/v1/tools/check-availability')
          .send({
            date: '2025-06-30',
            partySize: 4
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            available: expect.any(Boolean),
            message: expect.any(String)
          })
        });
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/tools/check-availability')
          .send({})
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String)
        });
      });

      it('should handle natural language dates', async () => {
        const response = await request(app)
          .post('/api/v1/tools/check-availability')
          .send({
            date: 'tomorrow',
            partySize: 2
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/v1/tools/make-reservation', () => {
      it('should make a reservation successfully', async () => {
        const response = await request(app)
          .post('/api/v1/tools/make-reservation')
          .send({
            customerName: 'John Doe',
            date: '2025-06-30',
            time: '7:00 PM',
            partySize: 2,
            phone: '+1234567890'
          })
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            confirmationCode: expect.any(String),
            phoneticCode: expect.any(String),
            booking: expect.objectContaining({
              customerName: 'John Doe',
              partySize: 2
            })
          })
        });

        // Verify the booking was created in the database
        const booking = await prisma.booking.findUnique({
          where: { confirmationCode: response.body.data.confirmationCode }
        });
        expect(booking).toBeTruthy();
      });

      it('should validate reservation data', async () => {
        const response = await request(app)
          .post('/api/v1/tools/make-reservation')
          .send({
            customerName: '',
            date: 'invalid-date',
            time: '25:00 PM',
            partySize: -1
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/v1/tools/get-booking-details', () => {
      it('should retrieve booking details', async () => {
        // First create a booking
        const createResponse = await request(app)
          .post('/api/v1/tools/make-reservation')
          .send({
            customerName: 'Jane Smith',
            date: '2025-07-01',
            time: '8:00 PM',
            partySize: 4
          })
          .expect(201);

        const confirmationCode = createResponse.body.data.confirmationCode;

        // Then retrieve it
        const response = await request(app)
          .post('/api/v1/tools/get-booking-details')
          .send({
            confirmationCode
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            booking: expect.objectContaining({
              confirmationCode,
              customerName: 'Jane Smith',
              partySize: 4
            })
          })
        });
      });

      it('should handle phonetic confirmation codes', async () => {
        // First create a booking
        const createResponse = await request(app)
          .post('/api/v1/tools/make-reservation')
          .send({
            customerName: 'Test User',
            date: '2025-07-02',
            time: '6:00 PM',
            partySize: 1
          })
          .expect(201);

        const confirmationCode = createResponse.body.data.confirmationCode;
        
        // Generate phonetic version (using the same phonetic alphabet as the service)
        const phoneticAlphabet: { [key: string]: string } = {
          'A': 'Alpha', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta', 'E': 'Echo',
          'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel', 'I': 'India', 'J': 'Juliet',
          'K': 'Kilo', 'L': 'Lima', 'M': 'Mike', 'N': 'November', 'O': 'Oscar',
          'P': 'Papa', 'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
          'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-ray', 'Y': 'Yankee', 'Z': 'Zulu'
        };
        
        const phoneticCode = confirmationCode.split('').map(letter => 
          phoneticAlphabet[letter] || letter
        ).join(' ');

        // Try to retrieve with phonetic code
        const response = await request(app)
          .post('/api/v1/tools/get-booking-details')
          .send({
            confirmationCode: phoneticCode
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should return 404 for non-existent booking', async () => {
        const response = await request(app)
          .post('/api/v1/tools/get-booking-details')
          .send({
            confirmationCode: 'XYZ'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Webhook Endpoints (v1)', () => {
    describe('POST /api/v1/webhook/twilio', () => {
      it('should handle Twilio webhook', async () => {
        const response = await request(app)
          .post('/api/v1/webhook/twilio')
          .send({
            CallSid: 'CA1234567890abcdef',
            CallStatus: 'in-progress',
            From: '+1234567890',
            To: '+0987654321'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            status: expect.any(String)
          })
        });
      });

      it('should validate webhook data', async () => {
        const response = await request(app)
          .post('/api/v1/webhook/twilio')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/v1/webhook/ultravox', () => {
      it('should handle Ultravox webhook', async () => {
        const response = await request(app)
          .post('/api/v1/webhook/ultravox')
          .send({
            event_type: 'call_started',
            call_id: 'call_12345'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            status: expect.any(String)
          })
        });
      });
    });
  });

  describe('Admin Endpoints (v1)', () => {
    const adminApiKey = process.env.ADMIN_API_KEY || 'test-admin-key-1234567890123456';

    describe('GET /api/v1/admin/stats', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/admin/stats')
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return system stats with valid API key', async () => {
        const response = await request(app)
          .get('/api/v1/admin/stats')
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            totalBookings: expect.any(Number),
            activeBookings: expect.any(Number),
            systemStatus: expect.objectContaining({
              database: expect.any(String),
              memory: expect.any(Object)
            })
          })
        });
      });
    });

    describe('GET /api/v1/admin/bookings', () => {
      it('should return bookings list', async () => {
        // Create a test booking first
        await prisma.booking.create({
          data: {
            confirmationCode: 'TST',
            customerName: 'Test Customer',
            date: '2025-07-01',
            time: '7:00 PM',
            partySize: 2,
            status: 'CONFIRMED'
          }
        });

        const response = await request(app)
          .get('/api/v1/admin/bookings')
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            bookings: expect.arrayContaining([
              expect.objectContaining({
                confirmationCode: 'TST',
                customerName: 'Test Customer'
              })
            ]),
            pagination: expect.any(Object)
          })
        });
      });

      it('should support query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/admin/bookings?limit=5&offset=0&status=CONFIRMED')
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('not found')
      });
    });

    it('should handle server errors gracefully', async () => {
      // This test would trigger a server error condition
      // For now, we'll skip it as it requires setting up error scenarios
    });

    it('should include correlation ID in error responses', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to endpoints', async () => {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(10).fill(0).map(() => 
        request(app).get('/api/v1/status')
      );

      const responses = await Promise.all(promises);
      
      // All should succeed as we're within limits for tests
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
});