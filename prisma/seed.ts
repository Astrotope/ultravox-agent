import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.booking.deleteMany();
  await prisma.callLog.deleteMany();

  // Create test bookings
  const testBookings = [
    {
      confirmationCode: 'ABC',
      customerName: 'Test Customer 1',
      phone: '+1234567890',
      date: '2025-06-25',
      time: '7:00 PM',
      partySize: 2,
      specialRequirements: 'Window table preferred'
    },
    {
      confirmationCode: 'XYZ',
      customerName: 'Test Customer 2',
      date: '2025-06-26',
      time: '8:30 PM',
      partySize: 4,
      specialRequirements: 'Birthday celebration'
    }
  ];

  for (const booking of testBookings) {
    await prisma.booking.create({
      data: booking
    });
  }

  console.log('✅ Database seeded successfully');
  console.log(`📝 Created ${testBookings.length} test bookings`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });