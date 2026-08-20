import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { TelemetryContext } from '../context/TelemetryContext';
import { CreateEventModal } from '../components/CreateEventModal';
import { EventItem, Booking, User } from '../types';
import {
  Shield,
  Calendar,
  Ticket,
  DollarSign,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Server
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, token, logout } = useContext(AuthContext);
  const { refreshTelemetry, setIsDrawerOpen } = useContext(TelemetryContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'events' | 'bookings' | 'users' | 'revenue'>('bookings');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [eventsRes, bookingsRes, usersRes, revRes] = await Promise.all([
        axios.get('/api/events'),
        axios.get('/api/bookings', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/payments/analytics', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setEvents(eventsRes.data || []);
      setBookings(bookingsRes.data || []);
      setUsers(usersRes.data || []);
      setRevenueStats(revRes.data || null);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      if (err?.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, token, navigate]);

  const handleConfirmBooking = async (bookingId: string, paymentStatus?: string) => {
    try {
      setActionLoadingId(bookingId);
      await axios.put(
        `/api/bookings/${bookingId}/confirm`,
        { paymentStatus: paymentStatus || 'paid' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchData();
      refreshTelemetry();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Reject and cancel this booking request?')) return;
    try {
      setActionLoadingId(bookingId);
      await axios.delete(`/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData();
      refreshTelemetry();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also remove associated bookings.')) return;
    try {
      await axios.delete(`/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData();
      refreshTelemetry();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete event');
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const totalRevenue = revenueStats?.totalRevenue || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Admin Top Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Tixora Administrator
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Admin Operations Center</h1>
            <p className="text-xs text-slate-500">
              Manage cross-service event catalogs, verify 2FA booking queues, and review revenue telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Server className="w-4 h-4 text-orange-600" />
            <span>Microservices Telemetry</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-blue-900" />
          </div>
          <span className="text-2xl font-bold text-slate-900">₹{totalRevenue.toLocaleString()}</span>
          <span className="text-[10px] text-blue-900 block mt-1 font-mono font-medium">
            {revenueStats?.paidBookingsCount || 0} Paid Settlements
          </span>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-bold text-amber-700">{pendingBookings.length}</span>
          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
            Requires Confirmation
          </span>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Events</span>
            <Calendar className="w-4 h-4 text-orange-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{events.length}</span>
          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
            Published in Catalog
          </span>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-orange-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900">{users.length}</span>
          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
            Auth Service Registry
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'bookings'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Booking Requests ({bookings.length})</span>
          {pendingBookings.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {pendingBookings.length} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'events'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Manage Events ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Users ({users.length})</span>
        </button>
      </div>

      {/* Tab 1: Bookings Management */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm shadow-xs">
              No booking records found across the cluster.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-4">Event</th>
                      <th className="p-4">Attendee</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((booking) => {
                      const eventData = typeof booking.eventId === 'object' ? booking.eventId : null;
                      const userData = typeof booking.userId === 'object' ? booking.userId : null;

                      return (
                        <tr key={booking._id || booking.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-4">
                            <span className="font-bold text-slate-900 block text-sm">
                              {eventData?.title || 'Unknown Event'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {booking._id || booking.id}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-slate-800 block">
                              {userData?.name || 'Attendee'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {userData?.email || booking.recipientEmail || 'User'}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-900">
                            {booking.amount === 0 ? 'FREE' : `₹${booking.amount}`}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                                booking.status === 'confirmed'
                                  ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                  : booking.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                                booking.paymentStatus === 'paid'
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {booking.paymentStatus}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {booking.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleConfirmBooking(booking._id || booking.id!, 'paid')}
                                  disabled={actionLoadingId === (booking._id || booking.id)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="Approve & Mark as Paid"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" /> Approve
                                </button>
                                <button
                                  onClick={() => handleCancelBooking(booking._id || booking.id!)}
                                  disabled={actionLoadingId === (booking._id || booking.id)}
                                  className="px-2.5 py-1 rounded-lg bg-white text-rose-600 hover:bg-rose-50 text-xs font-semibold transition flex items-center gap-1 border border-rose-200 shadow-xs cursor-pointer"
                                  title="Reject Booking"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Events Management */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event._id || event.id}
                className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 hover:border-slate-300 transition shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-100">
                      {event.category}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {event.ticketPrice === 0 ? 'FREE' : `₹${event.ticketPrice}`}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 line-clamp-1 mb-1">{event.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{event.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Available Capacity:</span>
                    <strong className="text-blue-900 font-mono">
                      {event.availableSeats} / {event.totalSeats}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="line-clamp-1 max-w-[150px]">{event.location}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDeleteEvent(event._id || event.id!)}
                    className="px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-200 shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Event
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Users Registry */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Verified</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4 font-bold text-slate-900">{u.name}</td>
                    <td className="p-4 font-mono text-slate-600">{u.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                          u.role === 'admin'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-blue-900 flex items-center gap-1 font-mono font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-800" /> Yes
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={(newEvent) => {
          setEvents([newEvent, ...events]);
        }}
      />
    </div>
  );
};
export default AdminDashboard;
