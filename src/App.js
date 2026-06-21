import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import LoginPage      from './pages/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';
import About          from './pages/About';
import { Toaster }    from 'react-hot-toast';
import UserApp        from './components/UserApp';
import AdminDashboard from './components/AdminDashboard';

function AppMain() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const token    = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (!token || !username) return null;
    return { token, username, role: localStorage.getItem('role'), userId: localStorage.getItem('userId') };
  });
  const [liveWeather, setLiveWeather] = useState(null);
  const darkMode = true;

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m,precipitation,snowfall,weathercode,windspeed_10m&timezone=America/New_York'
        );
        const data = await res.json();
        setLiveWeather({ ...data.current, source: 'live' });
      } catch {}
    })();
  }, []);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setUser(null);
    navigate('/login');
  };

  const shared = { darkMode, onLogout: handleLogout, liveWeather };

  return (
    <Routes>
      <Route path="/login" element={
        user
          ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />
          : <div className="app dark"><LoginPage onLogin={handleLogin} /></div>
      } />
      <Route path="/forgot-password" element={<div className="app dark"><ForgotPassword /></div>} />
      <Route path="/reset-password"  element={<div className="app dark"><ResetPassword /></div>} />
      <Route path="/about"           element={<div className="app dark"><About /></div>} />
      <Route path="/dashboard" element={
        user
          ? <UserApp user={user} {...shared} />
          : <Navigate to="/login" replace />
      } />
      <Route path="/admin" element={
        !user               ? <Navigate to="/login"     replace /> :
        user.role !== 'ADMIN' ? <Navigate to="/dashboard" replace /> :
        <AdminDashboard user={user} {...shared} />
      } />
      <Route path="/admin/notifications" element={
        !user               ? <Navigate to="/login"     replace /> :
        user.role !== 'ADMIN' ? <Navigate to="/dashboard" replace /> :
        <AdminDashboard user={user} {...shared} defaultTab="notifications" />
      } />
      <Route path="/admin/forecast" element={
        !user               ? <Navigate to="/login"     replace /> :
        user.role !== 'ADMIN' ? <Navigate to="/dashboard" replace /> :
        <AdminDashboard user={user} {...shared} defaultTab="forecast" />
      } />
      <Route path="/" element={
        user
          ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#13161c',
            color: '#fff',
            border: '1px solid #2a2f3a',
            fontFamily: 'Arial, sans-serif',
            fontSize: '0.85rem',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#13161c' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#13161c' } },
        }}
      />
      <AppMain />
    </BrowserRouter>
  );
}
