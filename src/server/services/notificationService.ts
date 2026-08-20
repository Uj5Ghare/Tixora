import { db } from '../db';
import { eventBus } from '../eventBus';
import { NotificationLog } from '../../types';

export class NotificationMicroservice {
  public static readonly SERVICE_NAME = 'notification-service';

  // Send 2FA OTP notification
  public static async sendOTP(email: string, otp: string, action: 'account_verification' | 'event_booking') {
    const isBooking = action === 'event_booking';
    const subject = isBooking
      ? `🔐 Tixora Booking Verification Code: ${otp}`
      : `🚀 Verify your Tixora Account: ${otp}`;
    
    const content = isBooking
      ? `Use verification code ${otp} to confirm your ticket reservation on Tixora. This code expires in 10 minutes.`
      : `Welcome to Tixora! Your 6-digit account activation code is ${otp}. Please enter it to complete your registration.`;

    const log: NotificationLog = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: email,
      type: isBooking ? 'booking_otp' : 'account_verification_otp',
      subject,
      otpCode: otp,
      content,
      status: 'delivered',
      timestamp: new Date().toISOString()
    };

    db.notifications.unshift(log);

    // Publish inter-service event
    eventBus.publish('notification.otp_dispatched', this.SERVICE_NAME, {
      recipientEmail: email,
      action,
      otp,
      logId: log.id
    });

    console.log(`[${this.SERVICE_NAME}] OTP dispatched to ${email} (Code: ${otp})`);
    return log;
  }

  // Send Booking Confirmation Email
  public static async sendBookingConfirmation(email: string, userName: string, eventTitle: string) {
    const subject = `🎉 Ticket Confirmed: ${eventTitle}`;
    const content = `Hello ${userName},\n\nGreat news! Your booking for "${eventTitle}" has been approved and confirmed by the event organizers. You are all set to attend!\n\nAccess your tickets and details in your Tixora User Dashboard.`;

    const log: NotificationLog = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: email,
      recipientName: userName,
      type: 'booking_confirmation',
      subject,
      content,
      status: 'delivered',
      timestamp: new Date().toISOString()
    };

    db.notifications.unshift(log);

    eventBus.publish('notification.booking_confirmed', this.SERVICE_NAME, {
      recipientEmail: email,
      userName,
      eventTitle,
      logId: log.id
    });

    console.log(`[${this.SERVICE_NAME}] Booking confirmation sent to ${email} for event "${eventTitle}"`);
    return log;
  }

  // Send Booking Cancellation Notification
  public static async sendBookingCancellation(email: string, eventTitle: string) {
    const subject = `❌ Booking Cancellation: ${eventTitle}`;
    const content = `Your booking for "${eventTitle}" has been cancelled. If any seats were allocated, they have been returned to the event capacity.`;

    const log: NotificationLog = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: email,
      type: 'booking_cancellation',
      subject,
      content,
      status: 'delivered',
      timestamp: new Date().toISOString()
    };

    db.notifications.unshift(log);

    eventBus.publish('notification.booking_cancelled', this.SERVICE_NAME, {
      recipientEmail: email,
      eventTitle
    });

    return log;
  }

  // Get notifications inbox
  public static getInbox(email?: string) {
    if (email) {
      return db.notifications.filter(n => n.recipientEmail.toLowerCase() === email.toLowerCase());
    }
    return db.notifications.slice(0, 50);
  }

  public static getStats() {
    return {
      totalDispatched: db.notifications.length,
      otpCount: db.notifications.filter(n => n.otpCode).length,
      bookingConfirmations: db.notifications.filter(n => n.type === 'booking_confirmation').length
    };
  }
}
