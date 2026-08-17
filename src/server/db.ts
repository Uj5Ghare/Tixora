import bcrypt from 'bcryptjs';
import { User, EventItem, Booking, OTPRecord, NotificationLog } from '../types';

class InDatabase {
  public users: Map<string, User> = new Map();
  public events: Map<string, EventItem> = new Map();
  public bookings: Map<string, Booking> = new Map();
  public otps: Map<string, OTPRecord> = new Map();
  public notifications: NotificationLog[] = [];

  constructor() {
    this.seed();
  }

  public reset() {
    this.seed();
  }

  public seed() {
    this.users.clear();
    this.events.clear();
    this.bookings.clear();
    this.otps.clear();
    this.notifications = [];

    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('password123', salt);

    // Seed Users
    const seedUsersData: Array<Omit<User, 'id' | 'createdAt'>> = [
      { name: 'Admin User', email: 'admin@tixora.com', role: 'admin', isVerified: true, password: defaultPasswordHash },
      { name: 'Admin User', email: 'admin@tixora.com', role: 'admin', isVerified: true, password: defaultPasswordHash },
      { name: 'Admin User', email: 'admin@tixora.io', role: 'admin', isVerified: true, password: defaultPasswordHash },
      { name: 'Demo User', email: 'user@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Demo User', email: 'user@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Demo User', email: 'user@tixora.io', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Alice Smith', email: 'alice@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Bob Johnson', email: 'bob@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Charlie Dave', email: 'charlie@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Diana Prince', email: 'diana@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Ethan Hunt', email: 'ethan@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Fiona Gallagher', email: 'fiona@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'George Miller', email: 'george@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash },
      { name: 'Hannah Montana', email: 'hannah@tixora.com', role: 'user', isVerified: true, password: defaultPasswordHash }
    ];

    let userIndex = 1;
    let adminUserId = '';
    const userIds: string[] = [];

    for (const u of seedUsersData) {
      const id = `usr_${userIndex++}`;
      if (u.role === 'admin') adminUserId = id;
      else userIds.push(id);

      this.users.set(id, {
        id,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        isVerified: u.isVerified,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Seed Events
    const seedEventsData: Array<Omit<EventItem, '_id' | 'id'>> = [
      {
        title: 'React & Node.js Developer Retreat',
        description: 'Join us for a 3-day deep dive into modern full-stack web development, microservices patterns, and scalable cloud architectures. Perfect for developers looking to take their craft to the next level.',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Silicon Valley Innovation Center, CA',
        category: 'Technology',
        totalSeats: 200,
        availableSeats: 194,
        ticketPrice: 0,
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800',
        createdBy: { id: adminUserId, _id: adminUserId, name: 'Admin User', email: 'admin@tixora.com' },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Neon Nights EDM Festival',
        description: 'Experience an unforgettable night of high-energy EDM, techno, visual laser syncs, and dazzling light shows featuring top international DJs from around the globe.',
        date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Grand Arena, New York, NY',
        category: 'Music',
        totalSeats: 500,
        availableSeats: 488,
        ticketPrice: 1500,
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800',
        createdBy: { id: adminUserId, _id: adminUserId, name: 'Admin User', email: 'admin@tixora.com' },
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Global Leaders Business Summit',
        description: 'A premier executive gathering of CEOs, founders, and venture capitalists discussing the future of global commerce, AI integration, and cross-border innovation.',
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'The Ritz-Carlton, London, UK',
        category: 'Business',
        totalSeats: 150,
        availableSeats: 142,
        ticketPrice: 5000,
        image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800',
        createdBy: { id: adminUserId, _id: adminUserId, name: 'Admin User', email: 'admin@tixora.com' },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Modern Art & Design Expo 2026',
        description: 'Discover breathtaking contemporary and modern art, interactive digital installations, and experimental sculptures from trending underground creators.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Downtown Art Museum, Chicago, IL',
        category: 'Art',
        totalSeats: 300,
        availableSeats: 295,
        ticketPrice: 200,
        image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&q=80&w=800',
        createdBy: { id: adminUserId, _id: adminUserId, name: 'Admin User', email: 'admin@tixora.com' },
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Startup Pitch & Seed Competition',
        description: 'Watch 25 top emerging startups pitch live for $1.5 million in equity-free venture prizes. High-value networking for tech entrepreneurs and angel syndicates.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Convention Center, Miami, FL',
        category: 'Business',
        totalSeats: 250,
        availableSeats: 240,
        ticketPrice: 100,
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
        createdBy: { id: adminUserId, _id: adminUserId, name: 'Admin User', email: 'admin@tixora.com' },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: 'Cloud Computing & Distributed Systems Conference',
        description: 'A technical breakdown of scalable microservice topologies, event streaming, Kubernetes orchestration, and fault-tolerant cloud computing paradigms.',
        date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Tech Hub Arena, Seattle, WA',
        category: 'Technology',
        totalSeats: 100,
        availableSeats: 96,
        ticketPrice: 600,
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
        createdBy: { id: adminUserId, _id: adminUserId, name: 'Admin User', email: 'admin@tixora.com' },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    let eventIndex = 1;
    const eventIds: string[] = [];

    for (const e of seedEventsData) {
      const id = `evt_${eventIndex++}`;
      eventIds.push(id);
      this.events.set(id, {
        _id: id,
        id,
        ...e
      });
    }

    // Seed Sample Bookings
    const sampleBookingsData = [
      {
        userId: 'usr_2', // Demo User
        eventId: 'evt_1',
        status: 'confirmed' as const,
        paymentStatus: 'paid' as const,
        amount: 0,
        bookedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'usr_2', // Demo User
        eventId: 'evt_2',
        status: 'pending' as const,
        paymentStatus: 'not_paid' as const,
        amount: 1500,
        bookedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'usr_3', // Alice Smith
        eventId: 'evt_3',
        status: 'confirmed' as const,
        paymentStatus: 'paid' as const,
        amount: 5000,
        bookedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'usr_4', // Bob Johnson
        eventId: 'evt_4',
        status: 'pending' as const,
        paymentStatus: 'not_paid' as const,
        amount: 200,
        bookedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'usr_5', // Charlie Dave
        eventId: 'evt_5',
        status: 'confirmed' as const,
        paymentStatus: 'paid' as const,
        amount: 100,
        bookedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'usr_6', // Diana Prince
        eventId: 'evt_6',
        status: 'pending' as const,
        paymentStatus: 'not_paid' as const,
        amount: 600,
        bookedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ];

    let bookingIndex = 1;
    for (const b of sampleBookingsData) {
      const id = `bkg_${bookingIndex++}`;
      this.bookings.set(id, {
        _id: id,
        id,
        ...b,
        createdAt: b.bookedAt,
        updatedAt: b.bookedAt
      });
    }

    // Seed sample notification
    this.notifications.push({
      id: `notif_init`,
      recipientEmail: 'user@tixora.com',
      recipientName: 'Demo User',
      type: 'booking_confirmation',
      subject: '🎟️ Booking Confirmed: React & Node.js Developer Retreat',
      content: 'Your registration for React & Node.js Developer Retreat has been approved and verified by the Tixora team.',
      status: 'delivered',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
}

export const db = new InDatabase();
