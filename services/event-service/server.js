const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

// In-Memory Events Store (or MongoDB/PostgreSQL in prod)
const events = new Map();

// Seed initial event catalog
const initialEvents = [
  {
    id: 'evt_1',
    _id: 'evt_1',
    title: 'Global Tech Summit 2026',
    description: 'Explore the future of Cloud Microservices, Distributed Systems, AI Orchestration, and scalable container architectures.',
    date: '2026-09-15T09:00:00.000Z',
    location: 'Silicon Valley Convention Center, CA & Virtual',
    category: 'Technology',
    totalSeats: 250,
    availableSeats: 246,
    ticketPrice: 1999,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString()
  },
  {
    id: 'evt_2',
    _id: 'evt_2',
    title: 'Indie Rock & Jazz Waves Festival',
    description: 'An electrifying 2-day open-air musical festival featuring indie bands, jazz virtuosos, and visual light projections.',
    date: '2026-10-05T17:30:00.000Z',
    location: 'Bayfront Amphitheater, San Francisco',
    category: 'Music',
    totalSeats: 500,
    availableSeats: 498,
    ticketPrice: 1299,
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString()
  },
  {
    id: 'evt_3',
    _id: 'evt_3',
    title: 'AI & Next-Gen Microservices Hackathon',
    description: 'Build enterprise-grade microservice applications with event-driven message brokers, high-throughput caching, and AI logic.',
    date: '2026-11-12T10:00:00.000Z',
    location: 'Innovation Hub, Austin, TX',
    category: 'Workshop',
    totalSeats: 150,
    availableSeats: 148,
    ticketPrice: 0,
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString()
  }
];

initialEvents.forEach(e => events.set(e.id, e));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'event-service',
    status: 'healthy',
    uptime: process.uptime(),
    totalEvents: events.size,
    timestamp: new Date().toISOString()
  });
});

// List Events with search and category filters
app.get('/', (req, res) => {
  const { category, search } = req.query;
  let list = Array.from(events.values());

  if (category && category !== 'All') {
    list = list.filter(e => e.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json(list);
});

// Get Event by ID
app.get('/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  res.json(event);
});

// Create Event (Admin)
app.post('/', (req, res) => {
  try {
    const { title, description, date, location, category, totalSeats, ticketPrice, image } = req.body;
    if (!title || !date || !location) {
      return res.status(400).json({ message: 'Title, date, and location are required' });
    }

    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEvent = {
      _id: id,
      id,
      title,
      description: description || '',
      date: new Date(date).toISOString(),
      location,
      category: category || 'General',
      totalSeats: Number(totalSeats) || 100,
      availableSeats: Number(totalSeats) || 100,
      ticketPrice: Number(ticketPrice) || 0,
      image: image || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    events.set(id, newEvent);
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Event
app.put('/:id', (req, res) => {
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  const updated = {
    ...event,
    ...req.body,
    totalSeats: req.body.totalSeats !== undefined ? Number(req.body.totalSeats) : event.totalSeats,
    ticketPrice: req.body.ticketPrice !== undefined ? Number(req.body.ticketPrice) : event.ticketPrice,
    updatedAt: new Date().toISOString()
  };

  events.set(req.params.id, updated);
  res.json(updated);
});

// Delete Event
app.delete('/:id', (req, res) => {
  if (!events.has(req.params.id)) {
    return res.status(404).json({ message: 'Event not found' });
  }
  events.delete(req.params.id);
  res.json({ message: 'Event deleted successfully' });
});

// Inter-Service Seat Adjustment Endpoint (Atomic Capacity Management)
app.post('/:id/adjust-seats', (req, res) => {
  const { delta } = req.body; // e.g. -1 for booking, +1 for cancellation
  const event = events.get(req.params.id);
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }

  const numericDelta = Number(delta) || 0;
  if (numericDelta < 0 && event.availableSeats + numericDelta < 0) {
    return res.status(400).json({ message: 'Not enough seats available', availableSeats: event.availableSeats });
  }

  event.availableSeats = Math.max(0, Math.min(event.totalSeats, event.availableSeats + numericDelta));
  events.set(req.params.id, event);

  res.json({
    success: true,
    eventId: event.id,
    availableSeats: event.availableSeats,
    totalSeats: event.totalSeats
  });
});

app.listen(PORT, () => {
  console.log(`[Event-Service] Listening on port ${PORT}`);
});
