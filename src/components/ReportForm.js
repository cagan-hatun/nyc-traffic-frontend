import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  X, MapPin, Car, AlertTriangle, Construction,
  Wrench, ShieldAlert, PackageOpen, ChevronRight,
  CheckCircle, Camera,
} from 'lucide-react';
import { createReport } from '../api';

const CATEGORIES = [
  { value: 'ACCIDENT',          label: 'Kaza',           desc: 'Trafik kazası, çarpışma vb.',      icon: Car,         color: '#e05555', bg: 'rgba(224,85,85,0.08)',    border: 'rgba(224,85,85,0.25)' },
  { value: 'TRAFFIC_VIOLATION', label: 'Trafik İhlali',  desc: 'Aşırı hız, agresif sürüş vb.',    icon: ShieldAlert,  color: '#e8a030', bg: 'rgba(232,160,48,0.08)',   border: 'rgba(232,160,48,0.25)' },
  { value: 'ROAD_DAMAGE',       label: 'Yol Sorunu',     desc: 'Çukur, bozuk yol, çökme vb.',     icon: Construction, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',  border: 'rgba(167,139,250,0.25)' },
  { value: 'VEHICLE_BREAKDOWN', label: 'Araç Arızası',   desc: 'Yolda kalan araç, arıza vb.',     icon: Wrench,       color: '#4a9eff', bg: 'rgba(74,158,255,0.08)',   border: 'rgba(74,158,255,0.25)' },
  { value: 'ROAD_OBSTRUCTION',  label: 'Engel / Nesne',  desc: 'Yolda engel, düşmüş nesne vb.',  icon: PackageOpen,  color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.25)' },
  { value: 'OTHER',             label: 'Diğer',          desc: 'Diğer trafik durumları',          icon: AlertTriangle,color: '#6e8899', bg: 'rgba(110,136,153,0.08)', border: 'rgba(110,136,153,0.25)' },
];

const STEPS = [
  { n: 1, label: 'Bildirim Türü' },
  { n: 2, label: 'Konum' },
  { n: 3, label: 'Detaylar' },
  { n: 4, label: 'Gönderildi' },
];

function StepIndicator({ step }) {
  return (
    <div style={{ display:'flex', alignItems:'center', margin:'16px 0', padding:'0 2px' }}>
      {STEPS.map(({ n, label }, i, arr) => (
        <React.Fragment key={n}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: step >= n ? 'var(--accent)' : 'var(--bg-hover)',
              border: `2px solid ${step >= n ? 'var(--accent)' : 'var(--border-bright)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
              color: step >= n ? '#fff' : 'var(--text-muted)',
              transition: 'all .2s',
            }}>
              {step > n ? '✓' : n}
            </div>
            <span style={{
              fontSize: '0.6rem',
              color: step >= n ? 'var(--accent)' : 'var(--text-muted)',
              whiteSpace: 'nowrap',
              fontWeight: step === n ? 600 : 400,
            }}>
              {label}
            </span>
          </div>
          {i < arr.length - 1 && (
            <div style={{
              flex: 1, height: 2,
              background: step > n ? 'var(--accent)' : 'var(--border)',
              margin: '0 4px', marginBottom: 20,
              transition: 'background .2s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function CategoryCard({ cat, selected, onClick }) {
  const Icon = cat.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 6, padding: '12px',
        background: selected ? cat.bg : 'var(--bg-base)',
        border: `1px solid ${selected ? cat.border : 'var(--border)'}`,
        borderRadius: 8, cursor: 'pointer', transition: 'all .15s', textAlign: 'left',
        outline: selected ? `2px solid ${cat.color}` : 'none', outlineOffset: -1,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: cat.bg, border: `1px solid ${cat.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} strokeWidth={2} style={{ color: cat.color }} />
      </div>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{cat.desc}</div>
      </div>
    </button>
  );
}


export default function ReportForm({ onClose, onSubmit, onRequestLocation, location, onChangeLocation }) {
  const [step, setStep]               = useState(1);
  const [category, setCategory]       = useState(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto]             = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [reportId, setReportId]       = useState(null);

  // Adım 1 → 2: konum isteği
  const handleCategoryNext = () => {
    if (!category) return;
    onRequestLocation(category); // UserApp harita modunu açar
    setStep(2);
  };

  // Konum gelince adım 3'e geç (UserApp location prop'u set eder)
  React.useEffect(() => {
    if (step === 2 && location) {
      setStep(3);
    }
  }, [location, step]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !location || !description.trim() || !photo) return;
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category',    category.value);
      formData.append('description', description);
      formData.append('lat',         location.lat);
      formData.append('lon',         location.lon);
      formData.append('address',     location.name || '');
      formData.append('photo',       photo);
      const result = await createReport(formData);
      setReportId(result?.id || Math.floor(Math.random() * 9000 + 1000));
      setStep(4);
      toast.success('Bildirim alındı, yetkililere iletilecek');
    } catch (err) {
      setError(err.response?.data?.message || 'Gönderim başarısız oldu.');
      toast.error('Bildirim gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 2) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        background: 'rgba(10,12,15,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--accent)',
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        minWidth: 320,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(74,158,255,0.15)',
          border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <MapPin size={18} strokeWidth={2} style={{ color: 'var(--accent)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Haritadan Konum Seçin
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Olayın gerçekleştiği yere tıklayın
          </div>
        </div>
        <button
          onClick={() => setStep(1)}
          style={{ background: 'none', border: '1px solid var(--border-bright)', borderRadius: 6, padding: '5px 12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0 }}
        >
          Geri
        </button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
        >
          <X size={14} strokeWidth={2} />
        </button>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  return (
    <div className="report-modal-overlay" onClick={step === 4 ? onClose : undefined}>
      <div
        className="report-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: 480,
        }}
      >
        <div className="report-modal-header">
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <AlertTriangle size={15} strokeWidth={2} style={{ color:'var(--accent-amber)' }} />
              <span style={{ fontWeight:600, fontSize:'0.9rem' }}>Bildirim / Şikayet</span>
            </div>
            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginLeft:23 }}>
              Yolda karşılaştığınız durumu bildirin
            </span>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {step < 4 && <StepIndicator step={step} />}

        {step === 1 && (
          <div>
            <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Bildirim Türü Seçin
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {CATEGORIES.map(cat => (
                <CategoryCard
                  key={cat.value} cat={cat}
                  selected={category?.value === cat.value}
                  onClick={() => setCategory(cat)}
                />
              ))}
            </div>
            <div style={{ marginTop:14, padding:'10px 12px', background:'var(--bg-base)', borderRadius:6, border:'1px solid var(--border)', display:'flex', gap:8 }}>
              <AlertTriangle size={13} strokeWidth={2} style={{ color:'var(--accent)', flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', lineHeight:1.5 }}>
                Bildiriminiz diğer kullanıcılarla paylaşılacak ve yetkililere iletilecektir. Acil durumlarda 911'i arayın.
              </p>
            </div>
            <button
              type="button" disabled={!category}
              onClick={handleCategoryNext}
              style={{
                width:'100%', marginTop:14, padding:'10px',
                background: category ? 'var(--accent)' : 'var(--bg-hover)',
                color: category ? '#fff' : 'var(--text-muted)',
                border:'none', borderRadius:'var(--radius)',
                fontFamily:'var(--font-ui)', fontSize:'0.88rem', fontWeight:600,
                cursor: category ? 'pointer' : 'not-allowed',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              }}
            >
              Devam Et <ChevronRight size={14} strokeWidth={2} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign:'center', padding:'10px 0 16px' }}>
            <div style={{
              width:56, height:56, borderRadius:'50%',
              background:'rgba(74,158,255,0.1)', border:'2px solid var(--accent)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 14px',
              animation:'pulse 1.5s ease-in-out infinite',
            }}>
              <MapPin size={24} strokeWidth={2} style={{ color:'var(--accent)' }} />
            </div>
            <div style={{ fontSize:'0.88rem', fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>
              Haritadan Konum Seçin
            </div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', lineHeight:1.6 }}>
              Olayın gerçekleştiği yere<br/>haritada tıklayın
            </div>
            <button
              type="button" onClick={() => setStep(1)}
              style={{ marginTop:16, background:'none', border:'1px solid var(--border-bright)', borderRadius:'var(--radius)', padding:'6px 16px', color:'var(--text-secondary)', fontFamily:'var(--font-ui)', fontSize:'0.8rem', cursor:'pointer' }}
            >
              Geri Dön
            </button>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {category && (() => {
              const Icon = category.icon;
              return (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:category.bg, border:`1px solid ${category.border}`, borderRadius:8 }}>
                  <Icon size={15} strokeWidth={2} style={{ color:category.color }} />
                  <span style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text-primary)' }}>{category.label}</span>
                  <button type="button" onClick={() => { setStep(1); }} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'var(--accent)' }}>Değiştir</button>
                </div>
              );
            })()}

            {location && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 10px', background:'var(--bg-base)', borderRadius:'var(--radius)', border:'1px solid var(--border)' }}>
                <MapPin size={13} strokeWidth={2} style={{ color:'var(--accent)', flexShrink:0 }} />
                <span style={{ fontSize:'0.78rem', color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                  {location.name || `${location.lat?.toFixed(4)}, ${location.lon?.toFixed(4)}`}
                </span>
                <button type="button" onClick={() => { onChangeLocation(); setStep(2); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', color:'var(--accent)', flexShrink:0 }}>Değiştir</button>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:'0.72rem', fontWeight:500, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}>
                Açıklama <span style={{ color:'var(--accent-red)' }}>*</span>
              </label>
              <textarea
                className="report-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Durumu kısaca açıklayın... (en az 10 karakter)"
                required minLength={10} rows={3}
              />
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:'0.72rem', fontWeight:500, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}>
                <Camera size={12} strokeWidth={2} />
                Fotoğraf <span style={{ color:'var(--accent-red)' }}>*</span>
                <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(doğruluk için zorunlu)</span>
              </label>
              <input
                type="file" accept="image/*" required
                onChange={e => setPhoto(e.target.files[0] || null)}
                style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}
              />
              {photo && (
                <span style={{ fontSize:'0.7rem', color:'var(--accent-green)' }}>✓ {photo.name}</span>
              )}
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button type="button" onClick={() => {
                setStep(2);
                onChangeLocation && onChangeLocation();
              }}
                style={{ flex:1, padding:'8px', background:'transparent', border:'1px solid var(--border-bright)', borderRadius:'var(--radius)', color:'var(--text-secondary)', fontFamily:'var(--font-ui)', fontSize:'0.85rem', cursor:'pointer' }}>
                Geri
              </button>
              <button type="submit"
                disabled={submitting || !description.trim() || description.length < 10 || !photo}
                style={{ flex:2, padding:'8px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontFamily:'var(--font-ui)', fontSize:'0.85rem', fontWeight:600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: (submitting || !description.trim() || !photo) ? 0.5 : 1 }}>
                {submitting ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </form>
        )}

        {/* ── ADIM 4: Başarı ── */}
        {step === 4 && (
          <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
            <div style={{
              width:64, height:64, borderRadius:'50%',
              background:'rgba(61,189,120,0.1)', border:'2px solid var(--accent-green)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 16px',
            }}>
              <CheckCircle size={30} strokeWidth={1.5} style={{ color:'var(--accent-green)' }} />
            </div>
            <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
              Bildiriminiz Alındı!
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.85rem', color:'var(--accent)', background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:6, padding:'6px 16px', display:'inline-block', marginBottom:14 }}>
              Şikayet No: #{String(reportId).padStart(4,'0')}
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', lineHeight:1.7, marginBottom:20 }}>
              Bildiriminiz yetkililer tarafından incelenecek<br/>
              ve onaylanması durumunda haritada<br/>
              diğer kullanıcılara gösterilecektir.
            </div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:20, padding:'8px 12px', background:'var(--bg-base)', borderRadius:6, border:'1px solid var(--border)' }}>
              Doğrulanmış bildirimleriniz itibar puanınızı artırır.<br/>
              Yanlış bildirimler puan kaybına neden olur.
            </div>
            <button type="button" onClick={() => { onSubmit(); }}
              style={{ padding:'9px 28px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--radius)', fontFamily:'var(--font-ui)', fontSize:'0.88rem', fontWeight:600, cursor:'pointer' }}>
              Tamam
            </button>
          </div>
        )}
      </div>
    </div>
  );
}