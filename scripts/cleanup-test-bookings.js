#!/usr/bin/env node

/**
 * Script to clean up test bookings from production database
 * Removes only bookings with TEST_USER_ prefix or "Endpoint test booking" special requirements
 */

const { PrismaClient } = require('@prisma/client');

async function cleanupTestBookings() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧹 Cleaning up test bookings...');
    
    // Delete bookings with TEST_USER_ prefix or test special requirements
    const result = await prisma.booking.deleteMany({
      where: {
        OR: [
          {
            customerName: {
              startsWith: 'TEST_USER_'
            }
          },
          {
            specialRequirements: 'Endpoint test booking'
          }
        ]
      }
    });
    
    console.log(`✅ Cleaned up ${result.count} test bookings`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestBookings();