import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken]                 = useState('');
  const [password, setPassword]           = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  const [error, setError]                 = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) setToken(t);
    else setError('Geçersiz veya eksik token.');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await fetch('http://localhost:8080/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        toast.success('Şifre güncellendi, giriş yapılıyor...');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError(data.error || 'Bir hata oluştu.');
        toast.error(data.error || 'Şifre güncellenemedi');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
      toast.error('Şifre güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0c0f', padding:20 }}>
      <div style={{ background:'#13161c', border:'1px solid #2a2f3a', borderRadius:12, padding:32, width:'100%', maxWidth:420 }}>
        <h2 style={{ color:'#fff', fontSize:'1.4rem', fontWeight:700, marginBottom:8, fontFamily:'Arial, sans-serif' }}>
          Yeni Şifre Belirle
        </h2>
        <p style={{ color:'#8a92a3', fontSize:'0.85rem', marginBottom:24, fontFamily:'Arial, sans-serif' }}>
          Lütfen yeni şifrenizi belirleyin.
        </p>

        {success ? (
          <div style={{ padding:'14px', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, color:'#22c55e', fontSize:'0.9rem', textAlign:'center', fontFamily:'Arial, sans-serif' }}>
            ✓ Şifreniz başarıyla güncellendi!<br/>
            <span style={{ fontSize:'0.78rem', color:'#8a92a3' }}>Giriş sayfasına yönlendiriliyorsunuz...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display:'block', color:'#c5cad3', fontSize:'0.75rem', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Yeni Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              required
              minLength={6}
              style={{ width:'100%', padding:'10px 12px', background:'#0a0c0f', border:'1px solid #2a2f3a', borderRadius:6, color:'#fff', fontSize:'0.9rem', marginBottom:16, boxSizing:'border-box', fontFamily:'Arial, sans-serif' }}
            />

            <label style={{ display:'block', color:'#c5cad3', fontSize:'0.75rem', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Yeni Şifre (Tekrar)
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              style={{ width:'100%', padding:'10px 12px', background:'#0a0c0f', border:'1px solid #2a2f3a', borderRadius:6, color:'#fff', fontSize:'0.9rem', marginBottom:16, boxSizing:'border-box', fontFamily:'Arial, sans-serif' }}
            />

            <button
              type="submit"
              disabled={loading || !token}
              style={{ width:'100%', padding:'12px', background: (loading || !token) ? '#3a4050' : '#1a73e8', border:'none', borderRadius:6, color:'#fff', fontSize:'0.9rem', fontWeight:600, cursor: (loading || !token) ? 'not-allowed' : 'pointer', fontFamily:'Arial, sans-serif', marginBottom:12 }}
            >
              {loading ? 'Güncelleniyor...' : 'Şifremi Güncelle'}
            </button>

            {error && (
              <div style={{ padding:'10px 12px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, color:'#ef4444', fontSize:'0.82rem', marginBottom:8, fontFamily:'Arial, sans-serif' }}>
                {error}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
