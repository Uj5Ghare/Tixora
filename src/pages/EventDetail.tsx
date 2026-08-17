import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { AuthContext } from '../context/AuthContext';
import { TelemetryContext } from '../context/TelemetryContext';
import { EventItem } from '../types';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Ticket,
  Mail
} from 'lucide-react';

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const { refreshTelemetry, setIsInboxOpen, latestOTP } = useContext(TelemetryContext);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/events/${id}`);
        setEvent(res.data);
      } catch (err: any) {
        setError('Failed to load event details from Event Microservice');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchEvent();
  }, [id]);

  const handleBooking = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setBookingLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (!showOTP) {
        // Step 1: Request 2FA OTP for booking
        await axios.post(
          '/api/bookings/send-otp',
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setShowOTP(true);
        setSuccessMsg('2FA OTP sent to your email by Notification Microservice!');
        refreshTelemetry();
      } else {
        // Step 2: Submit booking with verified OTP
        const response = await axios.post(
          '/api/bookings',
          {
            eventId: event?._id || event?.id,
            otp: otp.trim()
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setSuccessMsg('Booking request submitted! Awaiting organizer verification.');
        setShowOTP(false);
        setOtp('');
        
        // Decrement local seat display
        if (event) {
          setEvent({
            ...event,
            availableSeats: Math.max(0, event.availableSeats - 1)
          });
        }

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        refreshTelemetry();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Booking request failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleAutofillOTP = () => {
    if (latestOTP) {
      setOtp(latestOTP);
    } else {
      setIsInboxOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-mono text-slate-500">Loading Event Details from Event Microservice...</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4 shadow-xs">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Event Not Found</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>
      </div>
    );
  }

  if (!event) return null;

  const isSoldOut = event.availableSeats <= 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Event Catalog
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Banner image */}
        <div className="h-72 sm:h-96 bg-slate-100 relative overflow-hidden">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-3xl uppercase tracking-widest">
              {event.category}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
          <div className="absolute top-6 left-6">
            <span className="px-3.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider bg-white/95 text-orange-700 border border-slate-200/80 shadow-xs">
              {event.category}
            </span>
          </div>
        </div>

        {/* Content & Booking Grid */}
        <div className="p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                {event.title}
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                {event.description}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-2 text-xs">
              <h4 className="font-bold text-orange-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-600" /> Tixora Microservice Orchestration Notice
              </h4>
              <p className="text-orange-800 leading-relaxed">
                When you book this event, the <strong>Booking Microservice</strong> verifies your 2FA OTP with the <strong>Notification Microservice</strong> and coordinates seat capacity reservations with the <strong>Event Microservice</strong>.
              </p>
            </div>
          </div>

          {/* Booking Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6 h-fit shadow-xs">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-200 pb-3 flex items-center justify-between">
              <span>Ticket Summary</span>
              <Ticket className="w-4 h-4 text-orange-600" />
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center gap-2.5 text-slate-500">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <span>Ticket Price</span>
                </div>
                <span className="font-bold text-base text-slate-900">
                  {event.ticketPrice === 0 ? (
                    <span className="text-blue-900 font-extrabold">FREE</span>
                  ) : (
                    `₹${event.ticketPrice}`
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center gap-2.5 text-slate-500">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span>Available Capacity</span>
                </div>
                <span className="font-semibold text-slate-700">
                  <span className={event.availableSeats < 10 ? 'text-amber-600' : 'text-blue-900'}>
                    {event.availableSeats}
                  </span>{' '}
                  / {event.totalSeats} seats
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center gap-2.5 text-slate-500">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>Date & Time</span>
                </div>
                <span className="font-medium text-slate-800 text-right">
                  {new Date(event.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center gap-2.5 text-slate-500">
                  <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Venue</span>
                </div>
                <span className="font-medium text-slate-800 text-right line-clamp-1 max-w-[140px]">
                  {event.location}
                </span>
              </div>
            </div>

            {/* OTP Input Field if active */}
            {showOTP && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" /> Enter 6-Digit 2FA OTP
                  </label>
                  <button
                    type="button"
                    onClick={handleAutofillOTP}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                  >
                    View / Autofill
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full text-center font-mono text-xl font-bold tracking-widest py-2.5 rounded-lg bg-white border border-amber-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                <p className="text-[11px] text-slate-500 text-center">
                  Check the <button onClick={() => setIsInboxOpen(true)} className="text-amber-700 underline font-semibold cursor-pointer">2FA Mailbox</button> on top right to view the code.
                </p>
              </div>
            )}

            {/* Feedback Messages */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-700" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Booking Trigger Button */}
            <button
              onClick={handleBooking}
              disabled={isSoldOut || bookingLoading || (showOTP && !otp.trim())}
              className={`w-full py-3.5 px-6 rounded-lg font-semibold text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                isSoldOut
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              {bookingLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Microservice RPC...</span>
                </>
              ) : showOTP ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify OTP & Reserve Ticket</span>
                </>
              ) : isSoldOut ? (
                'Sold Out'
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  <span>Request 2FA OTP & Book</span>
                </>
              )}
            </button>

            {user && (
              <p className="text-[11px] text-slate-400 text-center font-mono">
                Logged in as: {user.email}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default EventDetail;
