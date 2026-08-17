import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
import { EventItem } from '../types';

export const EventCard: React.FC<{ event: EventItem }> = ({ event }) => {
  const isSoldOut = event.availableSeats <= 0;
  const occupancyPercent = event.totalSeats > 0
    ? Math.round(((event.totalSeats - event.availableSeats) / event.totalSeats) * 100)
    : 0;

  const eventId = event._id || event.id;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col group">
      {/* Image / Header banner */}
      <div className="h-48 bg-slate-100 overflow-hidden relative">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-xl uppercase tracking-widest">
            {event.category || 'Tixora'}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />

        {/* Category Pill */}
        <div className="absolute top-4 left-4">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white/95 text-orange-700 border border-slate-200/80 shadow-xs">
            {event.category}
          </span>
        </div>

        {/* Price Tag */}
        <div className="absolute top-4 right-4">
          <span
            className={`px-3 py-1 rounded-md text-xs font-bold shadow-xs ${
              event.ticketPrice === 0
                ? 'bg-slate-900 text-amber-300 border border-slate-700'
                : 'bg-slate-900 text-white'
            }`}
          >
            {event.ticketPrice === 0 ? 'FREE' : `₹${event.ticketPrice}`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition line-clamp-1 mb-2">
            {event.title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {event.description}
          </p>

          <div className="space-y-2 mb-5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>
                {new Date(event.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          </div>
        </div>

        {/* Seating Progress & Action */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-mono">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {isSoldOut ? (
                <span className="text-rose-600 font-semibold">Sold Out</span>
              ) : (
                <span>
                  <strong className="text-slate-800">{event.availableSeats}</strong> of {event.totalSeats} seats left
                </span>
              )}
            </span>
            <span>{occupancyPercent}% Booked</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-4 border border-slate-200">
            <div
              className={`h-full transition-all duration-500 ${
                isSoldOut ? 'bg-rose-500' : 'bg-orange-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, (event.availableSeats / event.totalSeats) * 100))}%` }}
            />
          </div>

          <Link
            to={`/events/${eventId}`}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-orange-600 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{isSoldOut ? 'View Event Details' : 'Book Tickets'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
export default EventCard;
