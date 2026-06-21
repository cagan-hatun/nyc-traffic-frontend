import React, { useState } from 'react';
import { User, Lock, Mail, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authLogin, authRegister } from '../api';
import toast from 'react-hot-toast';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode]         = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const passwordRules = [
    { label: 'En az 8 karakter',          test: p => p.length >= 8 },
    { label: 'En az 1 büyük harf (A-Z)',  test: p => /[A-Z]/.test(p) },
    { label: 'En az 1 rakam (0-9)',       test: p => /[0-9]/.test(p) },
    { label: 'En az 1 özel karakter (!@#$%^&* vb.)', test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
  ];

  const passwordValid = mode === 'register'
    ? passwordRules.every(r => r.test(password))
    : true;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !passwordValid) {
      setError('Şifre gerekli kurallara uymuyor.');
      return;
    }
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await authLogin({ username, password })
        : await authRegister({ username, email, password });

      localStorage.setItem('token',    data.token);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role',     data.role);
      localStorage.setItem('userId',   data.userId);
      toast.success(mode === 'login' ? `Hoş geldin, ${data.username}!` : 'Kayıt başarılı, giriş yapılıyor...');
      onLogin({ token: data.token, username: data.username, role: data.role, userId: data.userId });
      navigate(data.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Bir hata oluştu.');
      toast.error(err.response?.data?.error || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo + başlık */}
        <div className="login-header">
          <svg width="32" height="32" viewBox="0 0 18 18" fill="none" className="login-logo">
            <polygon points="9,1 16,5 16,13 9,17 2,13 2,5"
              stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            <circle cx="9" cy="9" r="2" fill="currentColor"/>
          </svg>
          <div>
            <div className="login-title">NYC Trafik Risk Analizi</div>
            <div className="login-subtitle">Karar Destek Sistemi</div>
          </div>
        </div>

        {/* Tab */}
        <div className="login-tabs">
          <button
            className={`login-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
            type="button"
          >
            <LogIn size={13} strokeWidth={2} /> Giriş Yap
          </button>
          <button
            className={`login-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
            type="button"
          >
            <UserPlus size={13} strokeWidth={2} /> Kayıt Ol
          </button>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={submit}>
          <label className="login-label">
            <span><User size={12} strokeWidth={2} /> Kullanıcı Adı</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="kullanıcı_adı"
              required
              autoFocus
              className="login-input"
            />
          </label>

          {mode === 'register' && (
            <label className="login-label">
              <span><Mail size={12} strokeWidth={2} /> E-posta</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@eposta.com"
                className="login-input"
              />
            </label>
          )}

          <label className="login-label">
            <span><Lock size={12} strokeWidth={2} /> Şifre</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="login-input"
            />
          </label>

          {mode === 'register' && password.length > 0 && (
            <div style={{ marginTop: -6, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {passwordRules.map((rule, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.72rem',
                  color: rule.test(password) ? '#10b981' : '#9ca3af',
                }}>
                  <span style={{ fontSize: '0.65rem' }}>{rule.test(password) ? '✓' : '✗'}</span>
                  {rule.label}
                </div>
              ))}
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 4 }}>
              <Link
                to="/forgot-password"
                style={{
                  color: 'var(--accent)',
                  fontSize: '0.78rem',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-ui)',
                }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                onMouseLeave={e => e.target.style.textDecoration = 'none'}
              >
                Şifremi unuttum
              </Link>
            </div>
          )}

          {error && (
            <div className="login-error">
              <AlertCircle size={13} strokeWidth={2} />
              {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading || (mode === 'register' && !passwordValid)}>
            {loading
              ? 'Bekleniyor...'
              : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        {/* Admin bilgisi */}
        {mode === 'login' && (
          <div className="login-hint">
            Admin girişi için: <code>admin</code> / <code>admin123</code>
          </div>
        )}
      </div>
    </div>
  );
}