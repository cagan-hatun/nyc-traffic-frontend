import React, { useState } from 'react';
import { ChevronRight, CalendarDays } from 'lucide-react';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const currentHour = () => new Date().getHours();

export default function RouteForm({ origin, destination, onAnalyze, onOriginClear, onDestClear, loading, error, showGrid, onGridToggle, gridLoading, onClearRoute }) {
  const [showFuture, setShowFuture] = useState(false);
  const [futureDate, setFutureDate] = useState('');
  const [futureHour, setFutureHour] = useState('');

  const canSubmit = origin && destination && !loading &&
    (!showFuture || (futureDate && futureHour !== ''));

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAnalyze({
      date: showFuture ? futureDate : today(),
      hour: showFuture ? parseInt(futureHour, 10) : currentHour(),
    });
  };

  return (
    <form className="route-form card" onSubmit={submit}>
      <div className="section-label">Rota Analizi</div>

      <div className="point-display">
        <div className={`point-box${origin ? ' point-box--set' : ''}`}>
          <span className="point-dot point-dot--origin" />
          <div className="point-info">
            <span className="point-label">Kalkış</span>
            <span className="point-name">
              {origin ? origin.name : 'Haritaya tıklayarak seçin'}
            </span>
          </div>
          {origin && (
            <button type="button" onClick={onOriginClear}
              style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer',
                padding:'2px', color:'var(--text-muted)', display:'flex', alignItems:'center',
                flexShrink:0, borderRadius:'3px', transition:'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color='var(--accent-red)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
              ✕
            </button>
          )}
        </div>
        <div className={`point-box${destination ? ' point-box--set' : ''}`}>
          <span className="point-dot point-dot--dest" />
          <div className="point-info">
            <span className="point-label">Varış</span>
            <span className="point-name">
              {destination ? destination.name : 'Haritaya tıklayarak seçin'}
            </span>
          </div>
          {destination && (
            <button type="button" onClick={onDestClear}
              style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer',
                padding:'2px', color:'var(--text-muted)', display:'flex', alignItems:'center',
                flexShrink:0, borderRadius:'3px', transition:'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color='var(--accent-red)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
              ✕
            </button>
          )}
        </div>
      </div>

      {!showFuture && (
        <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', margin:'6px 0 2px' }}>
          {today()} — {currentHour()}:00 saati kullanılacak
        </p>
      )}

      <div style={{ margin:'8px 0' }}>
        <button type="button" className="future-toggle-btn"
          onClick={() => { setShowFuture(v => !v); setFutureDate(''); setFutureHour(''); }}>
          <ChevronRight size={13} strokeWidth={2}
            style={{ transition:'transform 0.2s', transform: showFuture ? 'rotate(90deg)' : 'rotate(0deg)' }}/>
          İleri tarih için tahmin yap
        </button>

        {showFuture && (
          <div className="coord-row" style={{ marginTop:9 }}>
            <label>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <CalendarDays size={11} strokeWidth={2}/> Tarih
              </span>
              <input type="date" value={futureDate} min={today()}
                onChange={e => setFutureDate(e.target.value)} required/>
            </label>
            <label>
              Saat (0–23)
              <input type="number" value={futureHour}
                onChange={e => setFutureHour(e.target.value)}
                min="0" max="23" placeholder="8" required/>
            </label>
          </div>
        )}
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button type="submit" disabled={!canSubmit}>
        {loading ? 'Analiz ediliyor…' : 'Rotayı Analiz Et'}
      </button>

      <div style={{ display:'flex', gap:6, marginTop:8 }}>
        <button
          type="button"
          className="grid-toggle-btn"
          style={{ flex:1 }}
          onClick={onGridToggle}>
          {gridLoading ? 'Yükleniyor...' : showGrid ? 'Grid Kapat' : 'Grid Göster'}
        </button>
        {(origin || destination) && (
          <button
            type="button"
            className="mbtn-danger"
            style={{ flex:1 }}
            onClick={onClearRoute}>
            Rotayı Kaldır
          </button>
        )}
      </div>
    </form>
  );
}