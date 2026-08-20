import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { TelemetryContext } from '../context/TelemetryContext';
import { Booking } from '../types';
import {
  Ticket,
  User as UserIcon,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Trash2,
  ArrowRight,
  Sparkles,
  MapPin
} from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const { user, token, logout } = useContext(AuthContext);
  const { refreshTelemetry } = useContext(TelemetryContext);
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get('/api/bookings/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data || []);
    } catch (err: any) {
      console.error('Error loading bookings:', err);
      if (err?.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [user, token, navigate]);

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) return;
    try {
      setCancellingId(id);
      await axios.delete(`/api/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchBookings();
      refreshTelemetry();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const handlePayNow = async (bookingId: string) => {
    try {
      setPayingId(bookingId);
      await axios.post(
        '/api/payments/process',
        { bookingId, paymentMethod: 'card' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchBookings();
      refreshTelemetry();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-mono text-slate-500">Loading User Dashboard & Bookings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Profile Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
        <div className="w-16 h-16 rounded-xl bg-orange-600 text-white flex items-center justify-center text-2xl font-bold uppercase shadow-xs shrink-0">
          {user?.name ? user.name.charAt(0) : 'U'}
        </div>
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Verified Tixora Attendee
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome, {user?.name}!
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            {user?.email} • {bookings.length} Total Bookings Managed
          </p>
        </div>
      </div>

      {/* Bookings Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-orange-600" />
            <span>My Bookings & Requests</span>
          </h2>
          <Link
            to="/"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition flex items-center gap-1"
          >
            Explore More Events <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-4 shadow-xs">
            <Ticket className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No bookings yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't requested any tickets yet. Explore upcoming conferences, festivals, and workshops.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              Browse Event Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking) => {
              const eventData = typeof booking.eventId === 'object' ? booking.eventId : null;

              return (
                <div
                  key={booking._id || booking.id}
                  className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div className="p-5 space-y-4">
                    {/* Top Status Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                        {eventData?.title || 'Event Booking'}
                      </h3>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider ${
                            booking.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-900 border border-blue-200'
                              : booking.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {booking.status}
                        </span>
                        {booking.status !== 'cancelled' && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase ${
                              booking.paymentStatus === 'paid'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {booking.paymentStatus === 'paid' ? 'PAID' : 'NOT PAID'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Booking metadata */}
                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {eventData?.date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span>{new Date(eventData.date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {eventData?.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span className="line-clamp-1">{eventData.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {booking.amount === 0 ? 'Free Ticket' : `₹${booking.amount}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    {eventData && (
                      <Link
                        to={`/events/${eventData._id || eventData.id}`}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                      >
                        View Event
                      </Link>
                    )}

                    {booking.status !== 'cancelled' ? (
                      <div className="flex items-center gap-2">
                        {booking.paymentStatus !== 'paid' && booking.amount > 0 && (
                          <button
                            onClick={() => handlePayNow(booking._id || booking.id!)}
                            disabled={payingId === (booking._id || booking.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                            {payingId === (booking._id || booking.id) ? 'Paying...' : 'Pay ₹' + booking.amount}
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelBooking(booking._id || booking.id!)}
                          disabled={cancellingId === (booking._id || booking.id)}
                          className="px-2.5 py-1 rounded-lg bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 text-xs font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {cancellingId === (booking._id || booking.id) ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400 italic">Cancelled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default UserDashboard;
