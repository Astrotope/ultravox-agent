import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/testApp';

describe('End-to-End Booking Flow', () => {
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
    // Clean database before each test
    await prisma.booking.deleteMany();
    await prisma.callLog.deleteMany();
  });

  describe('Complete Reservation Flow', () => {
    it('should complete a full booking workflow', async () => {
      // Step 1: Check availability
      const availabilityResponse = await request(app)
        .post('/api/v1/tools/check-availability')
        .send({
          date: 'tomorrow',
          partySize: 4
        })
        .expect(200);

      expect(availabilityResponse.body.success).toBe(true);
      expect(availabilityResponse.body.data.available).toBe(true);
      expect(availabilityResponse.body.data.slots).toBeDefined();

      const availableSlot = availabilityResponse.body.data.slots[0];

      // Step 2: Make reservation
      const reservationData = {
        customerName: 'John Smith',
        phone: '+1-555-123-4567',
        date: 'tomorrow',
        time: availableSlot.time,
        partySize: 4,
        specialRequirements: 'Window table please'
      };

      const reservationResponse = await request(app)
        .post('/api/v1/tools/make-reservation')
        .send(reservationData)
        .expect(201);

      expect(reservationResponse.body.success).toBe(true);
      
      const booking = reservationResponse.body.data;
      expect(booking).toMatchObject({
        confirmationCode: expect.any(String),
        phoneticCode: expect.any(String),
        booking: expect.objectContaining({
          customerName: 'John Smith',
          partySize: 4,
          specialRequirements: 'Window table please'
        })
      });

      const confirmationCode = booking.confirmationCode;

      // Step 3: Verify booking details
      const detailsResponse = await request(app)
        .post('/api/v1/tools/get-booking-details')
        .send({
          confirmationCode
        })
        .expect(200);

      expect(detailsResponse.body.success).toBe(true);
      expect(detailsResponse.body.data.booking).toMatchObject({
        confirmationCode,
        customerName: 'John Smith',
        phone: '+1-555-123-4567',
        partySize: 4,
        specialRequirements: 'Window table please',
        status: 'CONFIRMED'
      });

      // Step 4: Verify booking exists in database
      const dbBooking = await prisma.booking.findUnique({
        where: { confirmationCode }
      });

      expect(dbBooking).toBeTruthy();
      expect(dbBooking!.customerName).toBe('John Smith');
      expect(dbBooking!.partySize).toBe(4);
      expect(dbBooking!.status).toBe('CONFIRMED');

      // Step 5: Check that availability is reduced
      const newAvailabilityResponse = await request(app)
        .post('/api/v1/tools/check-availability')
        .send({
          date: 'tomorrow',
          time: availableSlot.time,
          partySize: 4
        })
        .expect(200);

      const updatedSlot = newAvailabilityResponse.body.data.slots?.[0];
      if (updatedSlot) {
        expect(updatedSlot.remainingCapacity).toBeLessThan(availableSlot.remainingCapacity);
      }
    });

    it('should handle booking conflicts correctly', async () => {
      // Step 1: Make first reservation
      const firstReservation = {
        customerName: 'Alice Johnson',
        date: '2025-06-30',
        time: '8:00 PM',
        partySize: 6
      };

      const firstResponse = await request(app)
        .post('/api/v1/tools/make-reservation')
        .send(firstReservation)
        .expect(201);

      expect(firstResponse.body.success).toBe(true);

      // Step 2: Try to make conflicting reservation (same time, would exceed capacity)
      const conflictingReservation = {
        customerName: 'Bob Wilson',
        date: '2025-06-30',
        time: '8:00 PM',
        partySize: 6  // This should conflict if slot capacity is < 12
      };

      // This should either succeed (if capacity allows) or fail gracefully
      const conflictResponse = await request(app)
        .post('/api/v1/tools/make-reservation')
        .send(conflictingReservation);

      // Response could be 201 (success) or 400/409 (conflict)
      expect([201, 400, 409]).toContain(conflictResponse.status);

      if (conflictResponse.status === 201) {
        // If successful, verify both bookings exist
        const alice = await prisma.booking.findFirst({
          where: { customerName: 'Alice Johnson' }
        });
        const bob = await prisma.booking.findFirst({
          where: { customerName: 'Bob Wilson' }
        });

        expect(alice).toBeTruthy();
        expect(bob).toBeTruthy();
      } else {
        // If failed, verify only first booking exists
        const bookings = await prisma.booking.findMany({
          where: {
            date: '2025-06-30',
            time: '8:00 PM'
          }
        });

        expect(bookings).toHaveLength(1);
        expect(bookings[0].customerName).toBe('Alice Johnson');
      }
    });

    it('should handle phonetic confirmation codes', async () => {
      // Create a booking
      const reservationResponse = await request(app)
        .post('/api/v1/tools/make-reservation')
        .send({
          customerName: 'Test User',
          date: '2025-07-01',
          time: '7:00 PM',
          partySize: 2
        })
        .expect(201);

      const confirmationCode = reservationResponse.body.data.confirmationCode;
      const phoneticCode = reservationResponse.body.data.phoneticCode;

      // Try to retrieve with phonetic code
      const retrieveResponse = await request(app)
        .post('/api/v1/tools/get-booking-details')
        .send({
          confirmationCode: phoneticCode
        })
        .expect(200);

      expect(retrieveResponse.body.success).toBe(true);
      expect(retrieveResponse.body.data.booking.confirmationCode).toBe(confirmationCode);
    });
  });

  describe('Date Parsing Integration', () => {
    it('should handle various date formats', async () => {
      const dateFormats = [
        'tomorrow',
        'Wednesday',
        'next Friday',
        '2025-06-30',
        'June 30th'
      ];

      for (const dateFormat of dateFormats) {
        const response = await request(app)
          .post('/api/v1/tools/check-availability')
          .send({
            date: dateFormat,
            partySize: 2
          });

        // Should either succeed (200) or fail with validation error (400)
        expect([200, 400]).toContain(response.status);

        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          expect(response.body.data.available).toBeDefined();
        }
      }
    });

    it('should reject past dates', async () => {
      const response = await request(app)
        .post('/api/v1/tools/check-availability')
        .send({
          date: '2020-01-01', // Past date
          partySize: 2
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('past');
    });
  });

  describe('Webhook Integration', () => {
    it('should handle call lifecycle through webhooks', async () => {
      const callId = 'test-call-12345';

      // Step 1: Call started
      const startResponse = await request(app)
        .post('/api/v1/webhook/ultravox')
        .send({
          event_type: 'call_started',
          call_id: callId
        })
        .expect(200);

      expect(startResponse.body.success).toBe(true);

      // Step 2: Call ended
      const endResponse = await request(app)
        .post('/api/v1/webhook/ultravox')
        .send({
          event_type: 'call_ended',
          call_id: callId,
          end_reason: 'completed'
        })
        .expect(200);

      expect(endResponse.body.success).toBe(true);
    });

    it('should handle Twilio webhook lifecycle', async () => {
      const callSid = 'CA1234567890abcdef';

      // Step 1: Call ringing
      const ringingResponse = await request(app)
        .post('/api/v1/webhook/twilio')
        .send({
          CallSid: callSid,
          CallStatus: 'ringing',
          From: '+1234567890',
          To: '+0987654321'
        })
        .expect(200);

      expect(ringingResponse.body.success).toBe(true);

      // Step 2: Call in progress
      const progressResponse = await request(app)
        .post('/api/v1/webhook/twilio')
        .send({
          CallSid: callSid,
          CallStatus: 'in-progress'
        })
        .expect(200);

      expect(progressResponse.body.success).toBe(true);

      // Step 3: Call completed
      const completedResponse = await request(app)
        .post('/api/v1/webhook/twilio')
        .send({
          CallSid: callSid,
          CallStatus: 'completed'
        })
        .expect(200);

      expect(completedResponse.body.success).toBe(true);
    });
  });

  describe('Admin Flow Integration', () => {
    const adminApiKey = process.env.ADMIN_API_KEY || 'test-admin-key-1234567890123456';

    it('should provide comprehensive admin statistics', async () => {
      // Create some test data
      await prisma.booking.createMany({
        data: [
          {
            confirmationCode: 'AA1',
            customerName: 'Customer 1',
            date: '2025-06-30',
            time: '7:00 PM',
            partySize: 2,
            status: 'CONFIRMED'
          },
          {
            confirmationCode: 'BB2',
            customerName: 'Customer 2',
            date: '2025-07-01',
            time: '8:00 PM',
            partySize: 4,
            status: 'CONFIRMED'
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/admin/stats')
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          totalBookings: 2,
          activeBookings: 2,
          cancelledBookings: 0,
          bookingsByDate: expect.objectContaining({
            '2025-06-30': 1,
            '2025-07-01': 1
          }),
          systemStatus: expect.objectContaining({
            database: 'healthy',
            memory: expect.any(Object),
            uptime: expect.any(String)
          })
        })
      });
    });

    it('should allow booking queries with filters', async () => {
      // Create test bookings
      await prisma.booking.createMany({
        data: [
          {
            confirmationCode: 'CC3',
            customerName: 'John Doe',
            date: '2025-06-30',
            time: '7:00 PM',
            partySize: 2,
            status: 'CONFIRMED'
          },
          {
            confirmationCode: 'DD4',
            customerName: 'Jane Smith',
            date: '2025-07-01',
            time: '8:00 PM',
            partySize: 4,
            status: 'CANCELLED'
          }
        ]
      });

      // Query by status
      const confirmedResponse = await request(app)
        .get('/api/v1/admin/bookings?status=CONFIRMED')
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(confirmedResponse.body.data.bookings).toHaveLength(1);
      expect(confirmedResponse.body.data.bookings[0].status).toBe('CONFIRMED');

      // Query by customer name
      const nameResponse = await request(app)
        .get('/api/v1/admin/bookings?customerName=John')
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(nameResponse.body.data.bookings).toHaveLength(1);
      expect(nameResponse.body.data.bookings[0].customerName).toBe('John Doe');
    });
  });
});