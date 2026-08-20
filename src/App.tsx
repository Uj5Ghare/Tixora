import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TelemetryProvider } from './context/TelemetryContext';
import { Navbar } from './components/Navbar';
import { MicroservicesDrawer } from './components/MicroservicesDrawer';
import { NotificationInboxDrawer } from './components/NotificationInboxDrawer';
import { Home } from './pages/Home';
import { EventDetail } from './pages/EventDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MicroservicesOverview } from './pages/MicroservicesOverview';

export function App() {
  return (
    <AuthProvider>
      <TelemetryProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
            {/* Global Navbar */}
            <Navbar />

            {/* Main Application Routes */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/architecture" element={<MicroservicesOverview />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Interactive Overlays */}
            <MicroservicesDrawer />
            <NotificationInboxDrawer />
          </div>
        </Router>
      </TelemetryProvider>
    </AuthProvider>
  );
}

export default App;
