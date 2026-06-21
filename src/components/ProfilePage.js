import React, { useState, useEffect } from 'react';
import { User, Lock, Bell, MapPin, LogOut, CheckCircle, XCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { getProfile, changePassword, getMyReports } from '../api';
import toast from 'react-hot-toast';

const categoryLabel = {
  ACCIDENT:          { label:'Kaza',           color:'#e05555' },
  TRAFFIC_VIOLATION: { label:'Trafik İhlali',  color:'#e8a030' },
  ROAD_DAMAGE:       { label:'Yol Sorunu',     color:'#a78bfa' },
  VEHICLE_BREAKDOWN: { label:'Araç Arızası',   color:'#4a9eff' },
  ROAD_OBSTRUCTION:  { label:'Engel / Nesne',  color:'#f472b6' },
  OTHER:             { label:'Diğer',          color:'#6e8899' },
};

const statusBadge = (status) => {
  if (status === 'APPROVED') return { label:'Onaylı',     bg:'rgba(61,189,120,0.1)',  color:'#3dbd78', border:'rgba(61,189,120,0.2)' };
  if (status === 'REJECTED') return { label:'Reddedildi', bg:'rgba(224,85,85,0.1)',   color:'#e05555', border:'rgba(224,85,85,0.2)' };
  return                            { label:'Bekleyen',   bg:'rgba(232,160,48,0.1)',  color:'#e8a030', border:'rgba(232,160,48,0.2)' };
};

export default function ProfilePage({ user, onLogout, onBack }) {
  const [profile,   setProfile]   = useState(null);
  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(0);
  const PAGE_SIZE = 5;

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [newPw2,    setNewPw2]    = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    Promise.all([getProfile(), getMyReports()])
      .then(([p, r]) => { setProfile(p); setReports(r || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError(null); setPwSuccess(false);
    if (newPw !== newPw2) { setPwError('Yeni şifreler eşleşmiyor.'); return; }
    if (newPw.length < 6) { setPwError('Şifre en az 6 karakter olmalı.'); return; }
    setPwLoading(true);
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setNewPw2('');
      toast.success('Şifre güncellendi');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Şifre değiştirilemedi.');
      toast.error('Şifre güncellenemedi');
    } finally { setPwLoading(false); }
  };

  const initials   = user.username?.slice(0,1).toUpperCase() || 'U';
  const approved   = reports.filter(r => r.status === 'APPROVED').length;
  const rejected   = reports.filter(r => r.status === 'REJECTED').length;
  const paged      = reports.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE);
  const totalPages = Math.ceil(reports.length / PAGE_SIZE);

  const formatDate = (str) => {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' });
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', fontSize:'0.85rem' }}>
      Yükleniyor...
    </div>
  );

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

      
      <aside style={{
        width:280, flexShrink:0,
        background:'var(--bg-elevated)', borderRight:'1px solid var(--border)',
        padding:'28px 20px', display:'flex', flexDirection:'column', gap:20, overflowY:'auto',
      }}>
       
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)',
          fontSize: '0.8rem', padding: '0 0 8px 0', marginBottom: 4,
          transition: 'color .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Geri
        </button>

        
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{
            width:80, height:80, borderRadius:'50%',
            background:'linear-gradient(135deg, var(--accent), #1d4ed8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'2rem', fontWeight:700, color:'#fff',
            boxShadow:'0 4px 16px rgba(74,158,255,0.3)',
          }}>
            {initials}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)' }}>{user.username}</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>@{user.username}</div>
            {profile?.email && (
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4 }}>{profile.email}</div>
            )}
            {profile?.createdAt && (
              <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                <Clock size={11} strokeWidth={2} /> Üyelik: {formatDate(profile.createdAt)}
              </div>
            )}
          </div>
        </div>

       
        <div style={{ background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:8, padding:14 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
            Katkı Özeti
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[
              { label:'Toplam',     value:reports.length, color:'var(--accent)',       Icon:Bell },
              { label:'Onaylı',    value:approved,        color:'var(--accent-green)', Icon:CheckCircle },
              { label:'Reddedildi',value:rejected,        color:'var(--accent-red)',   Icon:XCircle },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 6px', textAlign:'center' }}>
                <Icon size={14} strokeWidth={2} style={{ color, marginBottom:4 }} />
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.1rem', color, fontWeight:700 }}>{value}</div>
                <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex:1 }} />

        
        <button onClick={onLogout} style={{
          width:'100%', padding:'9px',
          background:'rgba(224,85,85,0.08)', border:'1px solid rgba(224,85,85,0.25)',
          borderRadius:8, cursor:'pointer', fontFamily:'var(--font-ui)',
          fontSize:'0.85rem', fontWeight:600, color:'var(--accent-red)',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <LogOut size={15} strokeWidth={2} /> Çıkış Yap
        </button>
      </aside>

     
      <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>

       
        <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <Lock size={16} strokeWidth={2} style={{ color:'var(--accent)' }} />
            <div>
              <div style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--text-primary)' }}>Şifre Değiştir</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Hesap güvenliğiniz için düzenli olarak şifrenizi değiştirin.</div>
            </div>
          </div>
          <form onSubmit={handleChangePassword} style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:480 }}>
            {[
              { label:'Mevcut Şifre',        value:currentPw, setter:setCurrentPw },
              { label:'Yeni Şifre',          value:newPw,     setter:setNewPw     },
              { label:'Yeni Şifre (Tekrar)', value:newPw2,    setter:setNewPw2    },
            ].map(({ label, value, setter }) => (
              <div key={label} style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <label style={{ fontSize:'0.72rem', fontWeight:500, color:'var(--text-secondary)' }}>{label}</label>
                <div style={{ position:'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={value}
                    onChange={e => setter(e.target.value)}
                    required
                    style={{
                      width:'100%', padding:'8px 36px 8px 12px',
                      background:'var(--bg-base)', border:'1px solid var(--border-bright)',
                      borderRadius:'var(--radius)', color:'var(--text-primary)',
                      fontFamily:'var(--font-ui)', fontSize:'0.85rem', outline:'none',
                      boxSizing:'border-box',
                    }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:0,
                  }}>
                    {showPw ? <EyeOff size={14} strokeWidth={2}/> : <Eye size={14} strokeWidth={2}/>}
                  </button>
                </div>
              </div>
            ))}
            {pwError   && <div style={{ fontSize:'0.78rem', color:'var(--accent-red)' }}>{pwError}</div>}
            {pwSuccess && <div style={{ fontSize:'0.78rem', color:'var(--accent-green)', display:'flex', alignItems:'center', gap:5 }}><CheckCircle size={14}/> Şifre başarıyla değiştirildi.</div>}
            <button type="submit" disabled={pwLoading} style={{
              alignSelf:'flex-start', padding:'8px 24px',
              background:'var(--accent)', color:'#fff', border:'none',
              borderRadius:'var(--radius)', fontFamily:'var(--font-ui)',
              fontSize:'0.85rem', fontWeight:600, cursor: pwLoading ? 'not-allowed' : 'pointer',
              opacity: pwLoading ? 0.6 : 1, display:'flex', alignItems:'center', gap:6,
            }}>
              <Lock size={13} strokeWidth={2} />
              {pwLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </div>

       
        <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Bell size={16} strokeWidth={2} style={{ color:'var(--accent)' }} />
              <div>
                <div style={{ fontSize:'0.92rem', fontWeight:700, color:'var(--text-primary)' }}>Gönderdiğim Bildirimler</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Tüm bildirimlerinizi buradan görüntüleyebilirsiniz.</div>
              </div>
            </div>
            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Toplam {reports.length} bildirim</span>
          </div>

          {reports.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)', fontSize:'0.82rem' }}>
              Henüz bildirim göndermediniz.
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'140px 130px 1fr 1fr 100px', gap:12, padding:'8px 12px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                {['Tarih','Kategori','Konum','Açıklama','Durum'].map(h => (
                  <div key={h} style={{ fontSize:'0.68rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</div>
                ))}
              </div>
              {paged.map((r, i) => {
                const cat  = categoryLabel[r.category] || { label:r.category, color:'#6e8899' };
                const st   = statusBadge(r.status);
                const date = r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
                return (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'140px 130px 1fr 1fr 100px', gap:12,
                    padding:'10px 12px', borderRadius:6, alignItems:'center',
                    background: i%2===0 ? 'var(--bg-base)' : 'transparent',
                  }}>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{date}</div>
                    <span style={{ fontSize:'0.72rem', fontWeight:600, padding:'2px 8px', borderRadius:4, background:cat.color+'15', color:cat.color, border:`1px solid ${cat.color}30`, whiteSpace:'nowrap' }}>
                      {cat.label}
                    </span>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.address || '—'}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.description || '—'}
                    </div>
                    <span style={{ fontSize:'0.68rem', fontWeight:600, padding:'2px 8px', borderRadius:4, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
              {totalPages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:16 }}>
                  <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0}
                    style={{ padding:'4px 12px', background:'var(--bg-base)', border:'1px solid var(--border-bright)', borderRadius:6, color:'var(--text-secondary)', cursor:page===0?'not-allowed':'pointer', fontSize:'0.78rem', opacity:page===0?0.4:1 }}>
                    Önceki
                  </button>
                  {Array.from({length:totalPages},(_,i)=>(
                    <button key={i} onClick={()=>setPage(i)} style={{
                      width:30, height:30, borderRadius:6,
                      background:page===i?'var(--accent)':'var(--bg-base)',
                      border:`1px solid ${page===i?'var(--accent)':'var(--border-bright)'}`,
                      color:page===i?'#fff':'var(--text-secondary)',
                      cursor:'pointer', fontSize:'0.78rem', fontWeight:page===i?600:400,
                    }}>{i+1}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
                    style={{ padding:'4px 12px', background:'var(--bg-base)', border:'1px solid var(--border-bright)', borderRadius:6, color:'var(--text-secondary)', cursor:page===totalPages-1?'not-allowed':'pointer', fontSize:'0.78rem', opacity:page===totalPages-1?0.4:1 }}>
                    Sonraki
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
