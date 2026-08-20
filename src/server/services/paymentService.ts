import { db } from '../db';
import { eventBus } from '../eventBus';

export class PaymentMicroservice {
  public static readonly SERVICE_NAME = 'payment-service';

  // Process simulated payment
  public static async processPayment(bookingId: string, paymentMethod: 'card' | 'upi' | 'wallet' = 'card') {
    const booking = db.bookings.get(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Update booking payment status
    booking.paymentStatus = 'paid';
    booking.updatedAt = new Date().toISOString();
    db.bookings.set(bookingId, booking);

    eventBus.publish('payment.settled', this.SERVICE_NAME, {
      transactionId,
      bookingId,
      amount: booking.amount,
      paymentMethod,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      transactionId,
      bookingId,
      amount: booking.amount,
      status: 'paid',
      paymentMethod
    };
  }

  // Get revenue metrics
  public static getRevenueAnalytics() {
    const bookings = Array.from(db.bookings.values());
    const confirmedPaid = bookings.filter(b => b.status === 'confirmed' && b.paymentStatus === 'paid');
    const totalRevenue = confirmedPaid.reduce((acc, b) => acc + (b.amount || 0), 0);
    const pendingAmount = bookings.filter(b => b.status === 'pending').reduce((acc, b) => acc + (b.amount || 0), 0);

    return {
      totalRevenue,
      pendingAmount,
      totalConfirmedPaidTickets: confirmedPaid.length,
      totalBookingsCount: bookings.length,
      pendingBookingsCount: bookings.filter(b => b.status === 'pending').length,
      cancelledBookingsCount: bookings.filter(b => b.status === 'cancelled').length
    };
  }
}
