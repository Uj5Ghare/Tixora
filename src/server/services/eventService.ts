import { db } from '../db';
import { eventBus } from '../eventBus';
import { AuthMicroservice } from './authService';
import { EventItem } from '../../types';

export class EventMicroservice {
  public static readonly SERVICE_NAME = 'event-service';

  // Get events with optional search, category filters
  public static async getEvents(filters: { category?: string; search?: string } = {}) {
    let list = Array.from(db.events.values());

    if (filters.category && filters.category !== 'All') {
      list = list.filter(e => e.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(e => 
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }

    // Sort by event date ascending
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return list;
  }

  // Get single event by id
  public static async getEventById(id: string) {
    const event = db.events.get(id);
    if (!event) {
      throw new Error('Event not found');
    }
    return event;
  }

  // Create new event (Admin)
  public static async createEvent(data: {
    title: string;
    description: string;
    date: string;
    location: string;
    category: string;
    totalSeats: number;
    ticketPrice?: number;
    image?: string;
  }, userId: string) {
    const user = AuthMicroservice.getUserById(userId);
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newEvent: EventItem = {
      _id: id,
      id,
      title: data.title,
      description: data.description,
      date: new Date(data.date).toISOString(),
      location: data.location,
      category: data.category || 'General',
      totalSeats: Number(data.totalSeats) || 100,
      availableSeats: Number(data.totalSeats) || 100,
      ticketPrice: Number(data.ticketPrice) || 0,
      image: data.image || '',
      createdBy: user ? { id: user.id, _id: user.id, name: user.name, email: user.email } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.events.set(id, newEvent);

    eventBus.publish('event.created', this.SERVICE_NAME, {
      eventId: id,
      title: newEvent.title,
      totalSeats: newEvent.totalSeats,
      ticketPrice: newEvent.ticketPrice
    });

    return newEvent;
  }

  // Update existing event (Admin)
  public static async updateEvent(id: string, data: Partial<EventItem>) {
    const event = db.events.get(id);
    if (!event) {
      throw new Error('Event not found');
    }

    const updated: EventItem = {
      ...event,
      ...data,
      totalSeats: data.totalSeats !== undefined ? Number(data.totalSeats) : event.totalSeats,
      ticketPrice: data.ticketPrice !== undefined ? Number(data.ticketPrice) : event.ticketPrice,
      updatedAt: new Date().toISOString()
    };

    db.events.set(id, updated);

    eventBus.publish('event.updated', this.SERVICE_NAME, {
      eventId: id,
      changes: Object.keys(data)
    });

    return updated;
  }

  // Delete event (Admin)
  public static async deleteEvent(id: string) {
    const exists = db.events.has(id);
    if (!exists) {
      throw new Error('Event not found');
    }

    db.events.delete(id);

    eventBus.publish('event.deleted', this.SERVICE_NAME, {
      eventId: id
    });

    return { success: true, message: 'Event deleted successfully' };
  }

  // Atomic Inter-Service RPC: Adjust available seats
  public static adjustSeats(eventId: string, delta: number): boolean {
    const event = db.events.get(eventId);
    if (!event) return false;

    if (delta < 0 && event.availableSeats + delta < 0) {
      return false; // Not enough seats
    }

    event.availableSeats = Math.max(0, Math.min(event.totalSeats, event.availableSeats + delta));
    db.events.set(eventId, event);

    eventBus.publish('event.seats_modified', this.SERVICE_NAME, {
      eventId,
      delta,
      newAvailableSeats: event.availableSeats,
      totalSeats: event.totalSeats
    });

    return true;
  }
}
