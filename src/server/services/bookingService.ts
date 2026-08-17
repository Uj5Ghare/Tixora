import { db } from '../db';
import { eventBus } from '../eventBus';
import { EventMicroservice } from './eventService';
import { AuthMicroservice } from './authService';
import { NotificationMicroservice } from './notificationService';
import { Booking, OTPRecord } from '../../types';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export class BookingMicroservice {
  public static readonly SERVICE_NAME = 'booking-service';

  // Request a 2FA OTP for booking authorization
  public static async sendBookingOTP(userEmail: string, userId: string) {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const otp = generateOTP();
    const otpId = `otp_${Date.now()}`;

    // Clean up older booking OTPs for this user
    for (const [k, v] of db.otps.entries()) {
      if (v.email.toLowerCase() === normalizedEmail && v.action === 'event_booking') {
        db.otps.delete(k);
      }
    }

    const record: OTPRecord = {
      id: otpId,
      email: normalizedEmail,
      otp,
      action: 'event_booking',
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: new Date().toISOString()
    };

    db.otps.set(otpId, record);

    // Call Notification Microservice
    await NotificationMicroservice.sendOTP(normalizedEmail, otp, 'event_booking');

    eventBus.publish('booking.otp_requested', this.SERVICE_NAME, {
      userId,
      email: normalizedEmail
    });

    return { message: 'OTP sent successfully to your email' };
  }

  // Create booking request (protected with 2FA OTP)
  public static async createBooking(eventId: string, otp: string, userId: string, userEmail: string) {
    const normalizedEmail = userEmail.trim().toLowerCase();

    // 1. Verify 2FA OTP
    let foundOTPKey: string | null = null;
    for (const [k, v] of db.otps.entries()) {
      if (v.email.toLowerCase() === normalizedEmail && v.otp === otp.trim() && v.action === 'event_booking') {
        if (v.expiresAt > Date.now()) {
          foundOTPKey = k;
          break;
        }
      }
    }

    if (!foundOTPKey) {
      throw new Error('Invalid or expired OTP code for booking authorization');
    }

    // Delete used OTP
    db.otps.delete(foundOTPKey);

    // 2. Query Event Microservice for event availability
    const event = await EventMicroservice.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.availableSeats <= 0) {
      throw new Error('No seats available for this event');
    }

    // 3. Check duplicate active booking
    const existing = Array.from(db.bookings.values()).find(b => {
      const bUserId = typeof b.userId === 'string' ? b.userId : b.userId?.id || b.userId?._id;
      const bEventId = typeof b.eventId === 'string' ? b.eventId : b.eventId?.id || b.eventId?._id;
      return bUserId === userId && bEventId === eventId && b.status !== 'cancelled';
    });

    if (existing) {
      throw new Error('You already have an active or pending booking for this event');
    }

    // 4. Create Booking in 'pending' status
    const bookingId = `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const user = AuthMicroservice.getUserById(userId);

    const newBooking: Booking = {
      _id: bookingId,
      id: bookingId,
      userId: user ? { _id: user.id, id: user.id, name: user.name, email: user.email } : userId,
      eventId: {
        _id: event._id,
        id: event.id,
        title: event.title,
        date: event.date,
        location: event.location,
        totalSeats: event.totalSeats,
        availableSeats: event.availableSeats,
        ticketPrice: event.ticketPrice,
        image: event.image
      },
      status: 'pending',
      paymentStatus: 'not_paid',
      amount: event.ticketPrice || 0,
      bookedAt: now,
      createdAt: now,
      updatedAt: now
    };

    db.bookings.set(bookingId, newBooking);

    // Publish to EventBus
    eventBus.publish('booking.requested', this.SERVICE_NAME, {
      bookingId,
      userId,
      eventId,
      amount: newBooking.amount,
      status: 'pending'
    });

    return {
      message: 'Booking request submitted successfully. Awaiting organizer approval.',
      booking: newBooking
    };
  }

  // Confirm booking (Admin)
  public static async confirmBooking(bookingId: string, paymentStatus?: 'paid' | 'not_paid') {
    const booking = db.bookings.get(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'confirmed') {
      throw new Error('Booking is already confirmed');
    }

    const eventId = typeof booking.eventId === 'string' ? booking.eventId : booking.eventId?.id || booking.eventId?._id;
    if (!eventId) {
      throw new Error('Associated event not found');
    }

    const event = await EventMicroservice.getEventById(eventId);
    if (!event) {
      throw new Error('Event no longer exists');
    }

    if (event.availableSeats <= 0) {
      throw new Error('No seats remaining to confirm this ticket');
    }

    // Atomic seat decrement in Event Microservice
    const seatReduced = EventMicroservice.adjustSeats(eventId, -1);
    if (!seatReduced) {
      throw new Error('Failed to reserve seat in Event inventory');
    }

    // Update booking
    booking.status = 'confirmed';
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    } else if (event.ticketPrice === 0) {
      booking.paymentStatus = 'paid';
    }
    booking.updatedAt = new Date().toISOString();

    db.bookings.set(bookingId, booking);

    // Fetch user details for notification
    const userId = typeof booking.userId === 'string' ? booking.userId : booking.userId?.id || booking.userId?._id;
    const user = userId ? AuthMicroservice.getUserById(userId) : null;
    const userEmail = user?.email || (typeof booking.userId === 'object' ? booking.userId.email : '');
    const userName = user?.name || (typeof booking.userId === 'object' ? booking.userId.name : 'Attendee');

    // Trigger Notification Microservice
    if (userEmail) {
      await NotificationMicroservice.sendBookingConfirmation(userEmail, userName, event.title);
    }

    // Publish to EventBus
    eventBus.publish('booking.confirmed', this.SERVICE_NAME, {
      bookingId,
      userId,
      eventId,
      paymentStatus: booking.paymentStatus,
      amount: booking.amount
    });

    return {
      message: 'Booking confirmed successfully',
      booking
    };
  }

  // Cancel booking (User or Admin)
  public static async cancelBooking(bookingId: string, userId: string, role: string) {
    const booking = db.bookings.get(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const bUserId = typeof booking.userId === 'string' ? booking.userId : booking.userId?.id || booking.userId?._id;
    if (bUserId !== userId && role !== 'admin') {
      throw new Error('Not authorized to cancel this booking');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    const wasConfirmed = booking.status === 'confirmed';
    booking.status = 'cancelled';
    booking.updatedAt = new Date().toISOString();
    db.bookings.set(bookingId, booking);

    // If it was confirmed, restore 1 seat in Event Microservice
    const eventId = typeof booking.eventId === 'string' ? booking.eventId : booking.eventId?.id || booking.eventId?._id;
    if (wasConfirmed && eventId) {
      EventMicroservice.adjustSeats(eventId, 1);
    }

    // Trigger cancellation notification
    const user = bUserId ? AuthMicroservice.getUserById(bUserId) : null;
    const event = eventId ? db.events.get(eventId) : null;
    if (user?.email && event?.title) {
      await NotificationMicroservice.sendBookingCancellation(user.email, event.title);
    }

    eventBus.publish('booking.cancelled', this.SERVICE_NAME, {
      bookingId,
      userId,
      eventId,
      wasSeatRestored: wasConfirmed
    });

    return { success: true, message: 'Booking cancelled successfully' };
  }

  // Get user's bookings or all bookings for admin
  public static async getBookings(userId: string, role: string) {
    const list = Array.from(db.bookings.values());

    const filtered = role === 'admin'
      ? list
      : list.filter(b => {
          const bUserId = typeof b.userId === 'string' ? b.userId : b.userId?.id || b.userId?._id;
          return bUserId === userId;
        });

    // Hydrate event and user data
    const hydrated = filtered.map(b => {
      const eId = typeof b.eventId === 'string' ? b.eventId : b.eventId?.id || b.eventId?._id;
      const uId = typeof b.userId === 'string' ? b.userId : b.userId?.id || b.userId?._id;
      
      const event = eId ? db.events.get(eId) : null;
      const user = uId ? AuthMicroservice.getUserById(uId) : null;

      return {
        ...b,
        eventId: event ? {
          _id: event._id,
          id: event.id,
          title: event.title,
          date: event.date,
          location: event.location,
          totalSeats: event.totalSeats,
          availableSeats: event.availableSeats,
          ticketPrice: event.ticketPrice,
          image: event.image,
          category: event.category
        } : b.eventId,
        userId: user ? {
          _id: user.id,
          id: user.id,
          name: user.name,
          email: user.email
        } : b.userId
      };
    });

    // Sort newest first
    hydrated.sort((a, b) => new Date(b.bookedAt || b.createdAt || 0).getTime() - new Date(a.bookedAt || a.createdAt || 0).getTime());

    return hydrated;
  }
}
