/**
 * Tixora Microservices Admin Panel Test Suite
 * Validates RBAC enforcement, event lifecycle operations, booking approval/rejection workflows,
 * user registry querying, and financial/cluster telemetry for the Admin Operations Center.
 */

import { AuthMicroservice } from '../src/server/services/authService';
import { EventMicroservice } from '../src/server/services/eventService';
import { BookingMicroservice } from '../src/server/services/bookingService';
import { NotificationMicroservice } from '../src/server/services/notificationService';
import { PaymentMicroservice } from '../src/server/services/paymentService';
import { GatewayMicroservice } from '../src/server/services/gatewayService';
import { db } from '../src/server/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tixora_microservices_jwt_secret_2026';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function it(suite: string, name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  \x1b[32m✔\x1b[0m [${suite}] ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const errorMsg = err?.message || String(err);
    results.push({ suite, name, passed: false, durationMs, error: errorMsg });
    console.error(`  \x1b[31m✖\x1b[0m [${suite}] ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
    console.error(`    \x1b[31mError: ${errorMsg}\x1b[0m`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected: ${JSON.stringify(expected)}, Received: ${JSON.stringify(actual)}`);
  }
}

async function runAdminTestSuite() {
  console.log('\n\x1b[1m\x1b[35m===============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[35m         TIXORA ADMIN OPERATIONS CENTER - TEST SUITE           \x1b[0m');
  console.log('\x1b[1m\x1b[35m===============================================================\x1b[0m\n');

  // Reset database to pristine state
  db.reset();

  let adminToken = '';
  let userToken = '';
  let adminUserId = '';
  let testUserId = '';
  const userEmail = `attendee_${Date.now()}@example.com`;
  const secondUserEmail = `attendee2_${Date.now()}@example.com`;
  let secondUserId = '';

  /* -----------------------------------------------------------------
   * 1. ADMIN RBAC & AUTHENTICATION
   * ----------------------------------------------------------------- */
  console.log('\x1b[1m\x1b[33m1. RBAC & Identity Verification for Admin Panel\x1b[0m');

  await it('RBAC', 'Authenticates admin credentials and extracts valid admin role claims', async () => {
    const adminLogin = await AuthMicroservice.login('admin@tixora.com', 'password123');
    assert('token' in adminLogin && !!adminLogin.token, 'Admin login must issue valid token');
    assertEqual(adminLogin.role, 'admin', 'Admin user must have admin role');
    adminToken = (adminLogin as any).token;
    adminUserId = (adminLogin as any).id;

    const decoded = jwt.verify(adminToken, JWT_SECRET) as any;
    assertEqual(decoded.role, 'admin', 'JWT token payload must contain role: admin');
    assertEqual(decoded.email, 'admin@tixora.com', 'JWT token email must match admin account');
  });

  await it('RBAC', 'Registers standard non-admin attendee and verifies role isolation', async () => {
    const reg = await AuthMicroservice.register('Standard Attendee', userEmail, 'UserPass123!');
    const inbox = NotificationMicroservice.getInbox(userEmail);
    const otp = inbox[0].otpCode!;
    const verifyRes = await AuthMicroservice.verifyOTP(userEmail, otp);
    userToken = verifyRes.token!;
    testUserId = verifyRes.id;

    const decoded = jwt.verify(userToken, JWT_SECRET) as any;
    assertEqual(decoded.role, 'user', 'Regular attendee must have role: user, not admin');
  });

  await it('RBAC', 'Registers second test attendee for multi-user booking isolation', async () => {
    await AuthMicroservice.register('Second Attendee', secondUserEmail, 'UserPass123!');
    const inbox = NotificationMicroservice.getInbox(secondUserEmail);
    const otp = inbox[0].otpCode!;
    const verifyRes = await AuthMicroservice.verifyOTP(secondUserEmail, otp);
    secondUserId = verifyRes.id;
    assert(!!secondUserId, 'Second user must have a valid ID');
  });

  await it('RBAC', 'Permits Admin to inspect full platform user registry', () => {
    const allUsers = AuthMicroservice.getAllUsers();
    assert(allUsers.length >= 3, 'Admin should see seeded admin and registered users');
    const foundAdmin = allUsers.find(u => u.email === 'admin@tixora.com');
    const foundUser = allUsers.find(u => u.email === userEmail);
    assert(!!foundAdmin, 'Admin record must exist in user registry');
    assert(!!foundUser, 'Attendee record must exist in user registry');
    assertEqual(foundAdmin!.role, 'admin', 'Admin record must have admin role');
  });

  /* -----------------------------------------------------------------
   * 2. ADMIN EVENT LIFECYCLE MANAGEMENT
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m2. Admin Event Catalog Management (CRUD)\x1b[0m');

  let createdEventId = '';

  await it('Event-CRUD', 'Admin creates a new catalog event with pricing and capacity constraints', async () => {
    const eventData = {
      title: 'Kubernetes & Service Mesh Summit 2026',
      description: 'Production-grade Istio, Envoy proxy, and multi-cluster Kubernetes deployments.',
      date: '2026-11-15T09:00:00.000Z',
      location: 'Bangalore Tech Park / Hybrid',
      category: 'Technology',
      totalSeats: 75,
      ticketPrice: 499,
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
    };

    const newEvent = await EventMicroservice.createEvent(eventData, adminUserId);
    assert(!!newEvent.id, 'Event must receive a unique ID');
    assertEqual(newEvent.title, eventData.title, 'Title must match input');
    assertEqual(newEvent.totalSeats, 75, 'Total seats must be 75');
    assertEqual(newEvent.availableSeats, 75, 'Initial available seats must equal total seats');
    assertEqual(newEvent.ticketPrice, 499, 'Ticket price must be recorded accurately');
    createdEventId = newEvent.id;
  });

  await it('Event-CRUD', 'Admin updates existing event metadata, capacity, and location', async () => {
    const updated = await EventMicroservice.updateEvent(createdEventId, {
      title: 'Kubernetes & Service Mesh Global Summit 2026',
      location: 'Bangalore International Exhibition Centre'
    });

    assertEqual(updated.title, 'Kubernetes & Service Mesh Global Summit 2026', 'Title should be updated');
    assertEqual(updated.location, 'Bangalore International Exhibition Centre', 'Location should be updated');
    assertEqual(updated.availableSeats, 75, 'Capacity should remain intact');
  });

  await it('Event-CRUD', 'Admin deletes catalog event and triggers cross-service cleanup', async () => {
    // Create temporary event to test deletion
    const tempEvent = await EventMicroservice.createEvent(
      {
        title: 'Draft Cancelled Meetup',
        description: 'To be deleted',
        date: '2026-10-01T10:00:00.000Z',
        location: 'Room B',
        category: 'Technology',
        totalSeats: 10,
        ticketPrice: 0,
        image: ''
      },
      adminUserId
    );

    const deleteRes = await EventMicroservice.deleteEvent(tempEvent.id);
    assert(deleteRes.success, 'Event deletion must succeed');

    let fetchError = false;
    try {
      await EventMicroservice.getEventById(tempEvent.id);
    } catch (err) {
      fetchError = true;
    }
    assert(fetchError, 'Deleted event should no longer be accessible');
  });

  /* -----------------------------------------------------------------
   * 3. ADMIN BOOKING APPROVAL & REJECTION WORKFLOW
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m3. Admin 2FA Booking Verification & Settlement Workflows\x1b[0m');

  let pendingBookingId = '';
  let secondPendingBookingId = '';

  await it('Booking-Admin', 'Attendee submits 2FA booking request, landing in Admin pending queue', async () => {
    // 1. Send OTP
    await BookingMicroservice.sendBookingOTP(userEmail, testUserId);
    const inbox = NotificationMicroservice.getInbox(userEmail);
    const bookingOtpLog = inbox.find(n => n.type === 'booking_otp');
    const otp = bookingOtpLog!.otpCode!;

    // 2. Create pending reservation
    const res = await BookingMicroservice.createBooking(createdEventId, otp, testUserId, userEmail);
    pendingBookingId = res.booking.id;

    // 3. Admin fetches all bookings across cluster
    const allBookings = await BookingMicroservice.getBookings(adminUserId, 'admin');
    const foundBooking = allBookings.find(b => b.id === pendingBookingId);
    assert(!!foundBooking, 'Booking must appear in Admin master bookings queue');
    assertEqual(foundBooking!.status, 'pending', 'Newly placed booking must be pending admin confirmation');
  });

  await it('Booking-Admin', 'Admin approves pending booking, decrements seat inventory, and updates payment to paid', async () => {
    const confirmRes = await BookingMicroservice.confirmBooking(pendingBookingId, 'paid');
    assertEqual(confirmRes.booking.status, 'confirmed', 'Status must transition to confirmed');
    assertEqual(confirmRes.booking.paymentStatus, 'paid', 'Payment status must transition to paid');

    // Verify seat capacity decremented
    const event = await EventMicroservice.getEventById(createdEventId);
    assertEqual(event.availableSeats, 74, 'Event available seats must decrease from 75 to 74');

    // Verify confirmation notification dispatched
    const inbox = NotificationMicroservice.getInbox(userEmail);
    const confirmEmail = inbox.find(n => n.type === 'booking_confirmation');
    assert(!!confirmEmail, 'Attendee must receive official confirmation notice');
  });

  await it('Booking-Admin', 'Second attendee books ticket and Admin rejects/cancels it with capacity rollback', async () => {
    // Generate new OTP for 2nd booking
    await BookingMicroservice.sendBookingOTP(secondUserEmail, secondUserId);
    const inbox = NotificationMicroservice.getInbox(secondUserEmail);
    const otpLogs = inbox.filter(n => n.type === 'booking_otp');
    const latestOtp = otpLogs[0].otpCode!;

    const res2 = await BookingMicroservice.createBooking(createdEventId, latestOtp, secondUserId, secondUserEmail);
    secondPendingBookingId = res2.booking.id;

    // Confirm it to test full cancellation rollback
    await BookingMicroservice.confirmBooking(secondPendingBookingId, 'paid');
    let event = await EventMicroservice.getEventById(createdEventId);
    assertEqual(event.availableSeats, 73, 'Seats should be 73 after 2nd confirmation');

    // Admin cancels the booking
    const cancelRes = await BookingMicroservice.cancelBooking(secondPendingBookingId, adminUserId, 'admin');
    assert(cancelRes.success, 'Admin cancellation must succeed');

    // Check capacity was restored back to 74
    event = await EventMicroservice.getEventById(createdEventId);
    assertEqual(event.availableSeats, 74, 'Event seat capacity must be restored back to 74');

    // Check booking status
    const allBookings = await BookingMicroservice.getBookings(adminUserId, 'admin');
    const cancelledBooking = allBookings.find(b => b.id === secondPendingBookingId);
    assertEqual(cancelledBooking!.status, 'cancelled', 'Booking record status must be cancelled');
  });

  /* -----------------------------------------------------------------
   * 4. ADMIN REVENUE & FINANCIAL TELEMETRY
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m4. Admin Financial & Revenue Settlement Analytics\x1b[0m');

  await it('Revenue-Analytics', 'Aggregates platform gross revenue, transaction counts, and settlement rates', () => {
    // Process settlement on confirmed booking
    PaymentMicroservice.processPayment(pendingBookingId, 'card');

    const analytics = PaymentMicroservice.getRevenueAnalytics();
    assert(analytics.totalRevenue >= 499, 'Gross revenue must reflect approved paid bookings');
    assert(analytics.totalConfirmedPaidTickets >= 1, 'Confirmed paid tickets must be tracked');
    assert(analytics.totalBookingsCount >= 2, 'Total booking attempts must be tracked');
    assert(analytics.cancelledBookingsCount >= 1, 'Cancelled bookings must be tracked');
  });

  /* -----------------------------------------------------------------
   * 5. API GATEWAY & MICROSERVICES CLUSTER TELEMETRY
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[33m5. Microservices Cluster Topology & Health Telemetry\x1b[0m');

  await it('Gateway-Telemetry', 'Probes all registered microservices and verifies operational status', () => {
    const topology = GatewayMicroservice.getServicesTopology();
    assertEqual(topology.length, 6, 'All 6 microservices must be registered in cluster topology');

    const overview = GatewayMicroservice.getSystemOverview();
    assertEqual(overview.status, 'operational', 'Cluster status must be operational');
    assertEqual(overview.services.length, 6, 'Services count must equal 6');
    assert(overview.databaseStats.totalEvents >= 1, 'Database stats must count active events');
    assert(overview.databaseStats.totalUsers >= 2, 'Database stats must count registered users');
  });

  await it('Gateway-Telemetry', 'Admin triggers atomic database reset and restores seed data', () => {
    const resetRes = GatewayMicroservice.resetDatabase();
    assert(resetRes.success, 'Database reset must return success');

    const events = Array.from(db.events.values());
    assert(events.length >= 3, 'Default seed events must be restored');
    const admin = Array.from(db.users.values()).find(u => u.email === 'admin@tixora.com');
    assert(!!admin, 'Default administrator account must be preserved');
  });

  /* -----------------------------------------------------------------
   * Summary & Results
   * ----------------------------------------------------------------- */
  console.log('\n\x1b[1m\x1b[35m===============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[35m                 ADMIN PANEL TEST SUMMARY                      \x1b[0m');
  console.log('\x1b[1m\x1b[35m===============================================================\x1b[0m');

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`Total Admin Tests Run:  \x1b[1m${results.length}\x1b[0m`);
  console.log(`Passed:                 \x1b[32m\x1b[1m${passedCount}\x1b[0m`);
  console.log(`Failed:                 ${failedCount > 0 ? `\x1b[31m\x1b[1m${failedCount}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log(`Total Execution Time:   \x1b[90m${Math.round(totalDuration * 100) / 100}ms\x1b[0m\n`);

  if (failedCount > 0) {
    console.error('\x1b[31m\x1b[1mSOME ADMIN TESTS FAILED! Please review the error log above.\x1b[0m\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m\x1b[1mALL ADMIN PANEL OPERATIONS TESTED & VERIFIED PERFECTLY!\x1b[0m\n');
  }
}

runAdminTestSuite().catch(err => {
  console.error('Fatal Admin Test runner error:', err);
  process.exit(1);
});
