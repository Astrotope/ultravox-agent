#!/usr/bin/env node

/**
 * DANGEROUS: Script to clear ALL data from production database
 * Run with: node scripts/clear-test-data.js
 * 
 * WARNING: This will permanently delete ALL bookings and call logs!
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function confirmDeletion() {
  console.log('⚠️  WARNING: DATABASE DELETION SCRIPT ⚠️');
  console.log('This script will PERMANENTLY DELETE ALL data from the database!');
  console.log('');
  
  // First confirmation
  const confirm1 = await askQuestion('Are you sure you want to delete ALL bookings and call logs? (yes/no): ');
  if (confirm1 !== 'yes') {
    console.log('❌ Operation cancelled.');
    rl.close();
    process.exit(0);
  }
  
  console.log('');
  console.log('🚨 FINAL WARNING 🚨');
  console.log('You understand that running this script will:');
  console.log('  - DELETE ALL booking records permanently');
  console.log('  - DELETE ALL call log records permanently');
  console.log('  - This action CANNOT be undone');
  console.log('');
  
  // Second confirmation
  const confirm2 = await askQuestion('Do you understand the consequences and wish to proceed? (yes/no): ');
  if (confirm2 !== 'yes') {
    console.log('❌ Operation cancelled.');
    rl.close();
    process.exit(0);
  }
  
  rl.close();
  return true;
}

async function clearTestData() {
  // Require double confirmation
  await confirmDeletion();
  
  const prisma = new PrismaClient();
  
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Delete all bookings (since they're all test data)
    const deletedBookings = await prisma.booking.deleteMany({});
    console.log(`✅ Deleted ${deletedBookings.count} test bookings`);
    
    // Delete all call logs (if any)
    const deletedCalls = await prisma.callLog.deleteMany({});
    console.log(`✅ Deleted ${deletedCalls.count} call logs`);
    
    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData();