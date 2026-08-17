import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { EventItem } from '../types';
import { EventCard } from '../components/EventCard';
import { TixoraLogo } from '../components/TixoraLogo';
import {
  Search,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  Ticket,
  Clock,
  Filter
} from 'lucide-react';

export const Home: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Technology', 'Music', 'Business', 'Art', 'Workshop'];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (search.trim()) params.search = search.trim();

      const res = await axios.get('/api/events', { params });
      setEvents(res.data || []);
    } catch (e) {
      console.error('Error fetching events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xs p-8 sm:p-12 text-center">
        <div className="relative z-10 max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-800">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>Decoupled Microservices Architecture • 2FA Protected</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Book Your Next <span className="text-orange-600">Unforgettable</span> Experience
          </h1>

          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Discover premier tech retreats, concerts, and global summits on <strong className="font-semibold text-slate-900">Tixora</strong>. Built on decoupled, high-resilience microservices with instant 2FA OTP ticketing.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events by title, category, or location..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm shadow-xs focus:outline-none focus:bg-white focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 shadow-xs'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-orange-200 hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Event-Driven Architecture</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Asynchronous Inter-Service EventBus coordinates seating capacity, payment status, and order queues with zero bottlenecks.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-amber-200 hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">2FA OTP Ticket Security</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every booking request and registration is verified through 6-digit one-time passcodes generated by the Notification Microservice.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-200 hover:shadow-md transition space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Decoupled Microservices</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Auth, Events, Bookings, Notifications, and Payments run as decoupled services with discrete responsibilities and clean RPC interfaces.
          </p>
        </div>
      </div>

      {/* Events Listing Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <span>Available Events</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live records from Event Catalog Microservice (Port 5002)
            </p>
          </div>
          <div className="text-xs font-mono font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            {events.length} {events.length === 1 ? 'event' : 'events'} found
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-mono">Querying Event Microservice...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-8 space-y-3 shadow-xs">
            <Ticket className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No events match your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query or reset category filter to "All".
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event._id || event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="pt-12 border-t border-slate-200 text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <TixoraLogo iconClassName="w-6 h-6" textSize="text-base" showText={true} />
        </div>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Tixora distributed event ticketing platform with API Gateway, Auth, Event, Booking, Notification, and Payment Microservices.
        </p>
        <p className="text-[11px] text-slate-400 font-mono">
          &copy; {new Date().getFullYear()} Tixora. High-concurrency microservices architecture.
        </p>
      </footer>
    </div>
  );
};
export default Home;
