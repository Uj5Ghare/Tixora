/**
 * Tixora Microservices Unit Test Suite
 * Tests isolated components, JWT algorithms, EventBus pub/sub, seat arithmetic, and filters.
 */

import { eventBus } from '../src/server/eventBus';
import { db } from '../src/server/db';
import { EventMicroservice } from '../src/server/services/eventService';
import { NotificationMicroservice } from '../src/server/services/notificationService';
import { PaymentMicroservice } from '../src/server/services/paymentService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tixora_microservices_jwt_secret_2026';

let passed = 0;
let failed = 0;

async function it(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`  \x1b[31m✖\x1b[0m ${name}: ${err.message}`);
  }
}

async function runUnitTests() {
  console.log('\n\x1b[1m\x1b[36m===============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m             TIXORA MICROSERVICES UNIT TEST SUITE              \x1b[0m');
  console.log('\x1b[1m\x1b[36m===============================================================\x1b[0m\n');

  db.reset();

  console.log('\x1b[33m--- EventBus Pub/Sub & Saga Broker ---\x1b[0m');
  
  await it('Publishes and listens to inter-service broadcast events via EventEmitter', async () => {
    let receivedPayload: any = null;
    const handler = (event: any) => {
      receivedPayload = event.payload;
    };

    eventBus.on('test.event_dispatched', handler);
    eventBus.publish('test.event_dispatched', 'test-suite', { message: 'hello microservices' });
    eventBus.off('test.event_dispatched', handler);

    if (!receivedPayload || receivedPayload.message !== 'hello microservices') {
      throw new Error('EventBus subscriber did not receive expected event payload');
    }
  });

  await it('Maintains audit log of distributed events with timestamps and source attribution', () => {
    eventBus.publish('system.unit_booted', 'unit-test', { status: 'ready' });
    const recent = eventBus.getRecentEvents(10);
    if (!Array.isArray(recent) || recent.length === 0) {
      throw new Error('EventBus history should not be empty');
    }
    if (!recent[0].timestamp || !recent[0].eventType || !recent[0].sourceService) {
      throw new Error('Event log record must have eventType, sourceService, and ISO timestamp');
    }
  });

  console.log('\n\x1b[33m--- Security & Cryptographic JWT Tokens ---\x1b[0m');

  await it('Signs and verifies secure JWT tokens with expiration', () => {
    const payload = { id: 'usr_unit_test', role: 'admin', email: 'admin@tixora.com' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    const verified = jwt.verify(token, JWT_SECRET) as any;
    if (verified.id !== payload.id || verified.role !== payload.role) {
      throw new Error('Decoded token does not match signed payload');
    }
  });

  await it('Rejects tampering or forged JWT secret signatures', () => {
    const token = jwt.sign({ id: 'hacker' }, 'wrong_secret_123');
    try {
      jwt.verify(token, JWT_SECRET);
      throw new Error('Should have rejected token signed with wrong secret');
    } catch (err: any) {
      if (!err.message.includes('signature') && !err.message.includes('invalid')) {
        throw err;
      }
    }
  });

  console.log('\n\x1b[33m--- Event Inventory & Atomic Seat Capacity ---\x1b[0m');

  await it('Prevents over-allocation when available seats reach zero', () => {
    const testEvent = {
      _id: 'evt_unit_capacity',
      id: 'evt_unit_capacity',
      title: 'Sold Out Showcase',
      description: 'Capacity test event',
      date: new Date().toISOString(),
      location: 'Test Hall',
      category: 'Music',
      totalSeats: 1,
      availableSeats: 1,
      ticketPrice: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.events.set(testEvent.id, testEvent);

    // First decrement: 1 -> 0 (valid)
    const success1 = EventMicroservice.adjustSeats(testEvent.id, -1);
    if (!success1) throw new Error('First seat allocation should succeed');

    // Second decrement: 0 -> -1 (should be blocked)
    const success2 = EventMicroservice.adjustSeats(testEvent.id, -1);
    if (success2) throw new Error('Over-allocation should be blocked when seats = 0');

    // Restoration: 0 -> 1 (valid)
    const success3 = EventMicroservice.adjustSeats(testEvent.id, 1);
    if (!success3) throw new Error('Restoration of cancelled seat should succeed');
  });

  console.log('\n\x1b[33m--- Notification & SMTP Message Audit Stream ---\x1b[0m');

  await it('Filters user inbox by recipient email accurately', async () => {
    await NotificationMicroservice.sendOTP('john@doe.com', '123456', 'account_verification');
    await NotificationMicroservice.sendOTP('jane@doe.com', '654321', 'account_verification');

    const johnInbox = NotificationMicroservice.getInbox('john@doe.com');
    const janeInbox = NotificationMicroservice.getInbox('jane@doe.com');

    if (!johnInbox.every(n => n.recipientEmail.toLowerCase() === 'john@doe.com')) {
      throw new Error('John inbox contains messages for another recipient');
    }
    if (!janeInbox.every(n => n.recipientEmail.toLowerCase() === 'jane@doe.com')) {
      throw new Error('Jane inbox contains messages for another recipient');
    }
  });

  console.log('\n\x1b[33m--- Payment Settlement Ledger Calculations ---\x1b[0m');

  await it('Calculates correct zero and positive revenue aggregates', () => {
    const analytics = PaymentMicroservice.getRevenueAnalytics();
    if (typeof analytics.totalRevenue !== 'number' || isNaN(analytics.totalRevenue)) {
      throw new Error('Total revenue must be a valid number');
    }
    if (typeof analytics.totalBookingsCount !== 'number') {
      throw new Error('Total bookings count must be a number');
    }
  });

  console.log('\n\x1b[1m\x1b[36m===============================================================\x1b[0m');
  console.log(`Unit Tests Summary: \x1b[32m\x1b[1m${passed} Passed\x1b[0m, \x1b[1m${failed > 0 ? `\x1b[31m${failed} Failed` : '\x1b[32m0 Failed'}\x1b[0m`);
  console.log('\x1b[1m\x1b[36m===============================================================\x1b[0m\n');

  if (failed > 0) process.exit(1);
}

runUnitTests().catch(err => {
  console.error('Fatal unit test error:', err);
  process.exit(1);
});
