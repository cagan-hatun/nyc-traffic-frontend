import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState(null);
  const [error, setError]       = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      const res = await fetch('http://localhost:8080/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Eğer bu email kayıtlıysa sıfırlama bağlantısı gönderildi.');
        toast.success('Mail gönderildi (kayıtlıysa)');
      } else {
        setError(data.error || 'Bir hata oluştu.');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
      toast.error(err.message || 'İşlem başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0c0f', padding:20 }}>
      <div style={{ background:'#13161c', border:'1px solid #2a2f3a', borderRadius:12, padding:32, width:'100%', maxWidth:420 }}>
        <h2 style={{ color:'#fff', fontSize:'1.4rem', fontWeight:700, marginBottom:8, fontFamily:'Arial, sans-serif' }}>
          Şifremi Unuttum
        </h2>
        <p style={{ color:'#8a92a3', fontSize:'0.85rem', marginBottom:24, fontFamily:'Arial, sans-serif' }}>
          Email adresinizi girin, şifre sıfırlama bağlantısı gönderelim.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display:'block', color:'#c5cad3', fontSize:'0.75rem', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ornek@mail.com"
            required
            style={{ width:'100%', padding:'10px 12px', background:'#0a0c0f', border:'1px solid #2a2f3a', borderRadius:6, color:'#fff', fontSize:'0.9rem', marginBottom:16, boxSizing:'border-box', fontFamily:'Arial, sans-serif' }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{ width:'100%', padding:'12px', background: loading ? '#3a4050' : '#1a73e8', border:'none', borderRadius:6, color:'#fff', fontSize:'0.9rem', fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'Arial, sans-serif', marginBottom:12 }}
          >
            {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
          </button>

          {message && (
            <div style={{ padding:'10px 12px', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:6, color:'#22c55e', fontSize:'0.82rem', marginBottom:8, fontFamily:'Arial, sans-serif' }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ padding:'10px 12px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, color:'#ef4444', fontSize:'0.82rem', marginBottom:8, fontFamily:'Arial, sans-serif' }}>
              {error}
            </div>
          )}
        </form>

        <div style={{ marginTop:20, textAlign:'center' }}>
          <Link
            to="/login"
            style={{ color:'#1a73e8', fontSize:'0.82rem', textDecoration:'none', fontFamily:'Arial, sans-serif' }}
          >
            ← Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
