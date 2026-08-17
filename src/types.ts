export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
}

export interface EventItem {
  _id: string;
  id?: string;
  title: string;
  description: string;
  date: string;
  location: string;
  category: string;
  totalSeats: number;
  availableSeats: number;
  ticketPrice: number;
  image?: string;
  createdBy?: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
  } | string;
  createdAt?: string;
  updatedAt?: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'paid' | 'not_paid';

export interface Booking {
  _id: string;
  id?: string;
  userId: {
    _id?: string;
    id?: string;
    name: string;
    email: string;
  } | string;
  eventId: {
    _id?: string;
    id?: string;
    title: string;
    date: string;
    location?: string;
    totalSeats?: number;
    availableSeats?: number;
    ticketPrice?: number;
    image?: string;
  } | string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  bookedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OTPRecord {
  id: string;
  email: string;
  otp: string;
  action: 'account_verification' | 'event_booking';
  expiresAt: number;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  type: 'account_verification_otp' | 'booking_otp' | 'booking_confirmation' | 'booking_cancellation';
  subject: string;
  otpCode?: string;
  content: string;
  status: 'delivered' | 'simulated';
  timestamp: string;
}

export interface MicroserviceStatus {
  id: string;
  name: string;
  port: number;
  status: 'healthy' | 'degraded' | 'offline';
  uptimeSeconds: number;
  requestsHandled: number;
  avgResponseTimeMs: number;
  dependencies: string[];
  description: string;
}

export interface InterServiceEvent {
  id: string;
  eventType: string;
  sourceService: string;
  targetService?: string;
  payload: Record<string, any>;
  timestamp: string;
}
