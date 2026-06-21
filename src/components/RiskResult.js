import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';

const THRESHOLD_LOW  = 0.05;
const THRESHOLD_HIGH = 0.23;

const levelLabel = { 'Yuksek': 'Yüksek', 'Orta': 'Orta', 'Dusuk': 'Düşük' };
const levelClass = { 'Yuksek': 'high',   'Orta': 'medium', 'Dusuk': 'low' };

const ROUTE_COLORS = {
  en_hizli:            '#3b82f6',
  en_guvenli:          '#10b981',
  en_hizli_ve_guvenli: '#10b981',
  denge:               '#f59e0b',
};

const ROUTE_LABELS = {
  en_hizli:            'En Hızlı',
  en_guvenli:          'En Güvenli',
  en_hizli_ve_guvenli: 'En Hızlı + Güvenli',
  denge:               'Denge',
};

function SectionHeader({ icon: Icon, label, sub }) {
  return (
    <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon size={12} strokeWidth={2} style={{ opacity: 0.5 }} />
      {label}
      {sub && <span style={{ fontWeight: 400, opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>{sub}</span>}
    </h3>
  );
}

const formatDuration = (minutes) => {
  if (minutes == null || isNaN(minutes)) return '—';
  const m = Math.round(minutes);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} sa` : `${h} sa ${rem} dk`;
};

export default function RiskResult({ selectedRoute, routes, selectedRouteIndex, onRouteSelect, weather }) {
  if (!selectedRoute) return null;

  const { risk_counts, top5, overall_score, total_multiplier, traffic_multiplier } = selectedRoute;

  const showTraffic = selectedRoute.traffic &&
    selectedRoute.traffic.source !== 'not_available' && selectedRoute.traffic.eta_minutes;

  const scoreColor = overall_score == null ? 'var(--accent)'
    : overall_score < THRESHOLD_LOW  ? 'var(--accent-green)'
    : overall_score < THRESHOLD_HIGH ? 'var(--accent-amber)'
    : 'var(--accent-red)';
  const scoreLabel = overall_score == null ? ''
    : overall_score < THRESHOLD_LOW  ? 'Düşük Risk'
    : overall_score < THRESHOLD_HIGH ? 'Orta Risk'
    : 'Yüksek Risk';

  return (
    <div className="risk-result card">
      <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Activity size={11} strokeWidth={2} />
        Analiz Sonucu
      </div>

      {/* Rota seçici kartlar */}
      {routes && routes.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {routes.map((r, idx) => {
            const isSelected = idx === selectedRouteIndex;
            const labelText = ROUTE_LABELS[r.label] || `Rota ${idx + 1}`;
            const color = ROUTE_COLORS[r.label] || '#6b7280';
            const etaMinRaw = r.traffic?.eta_minutes ?? (r.osrm_duration_sec / 60);
            const etaText   = formatDuration(etaMinRaw);
            const distKm    = (r.osrm_distance_m / 1000).toFixed(1);
            return (
              <button
                key={idx}
                onClick={() => onRouteSelect(idx)}
                style={{
                  flex: 1, minWidth: 100,
                  padding: '8px 10px',
                  border: `2px solid ${isSelected ? color : '#374151'}`,
                  borderRadius: 8,
                  background: isSelected ? `${color}22` : 'transparent',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .15s',
                }}
              >
                <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 4 }}>{labelText}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{etaText} · {distKm} km</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Risk: {r.overall_score?.toFixed(2) ?? '—'}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Çarpanlar */}
      <div className="summary-row">
        <div className="metric-box">
          <span className="metric-label">Trafik</span>
          <span className="metric-value">
            {showTraffic ? `${traffic_multiplier?.toFixed(2)}x` : '—'}
          </span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Toplam</span>
          <span className="metric-value" style={{ color: 'var(--accent-red)' }}>
            {total_multiplier?.toFixed(2)}x
          </span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Ort. Skor</span>
          <span className="metric-value">{overall_score?.toFixed(2)}</span>
        </div>
      </div>

      {/* Rota Risk Skoru */}
      {overall_score != null && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rota Risk Skoru</span>
            <span style={{
              fontSize: '0.72rem', padding: '2px 8px', borderRadius: 3, fontWeight: 600,
              color: scoreColor,
              background: overall_score < THRESHOLD_LOW ? 'rgba(61,189,120,0.15)' : overall_score < THRESHOLD_HIGH ? 'rgba(232,160,48,0.08)' : 'rgba(224,85,85,0.08)',
              border: `1px solid ${overall_score < THRESHOLD_LOW ? 'rgba(61,189,120,0.3)' : overall_score < THRESHOLD_HIGH ? 'rgba(232,160,48,0.22)' : 'rgba(224,85,85,0.25)'}`,
            }}>
              {scoreLabel}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>
            {overall_score.toFixed(2)} / 1.00
          </div>
          <div className="score-bar-track" style={{ height: '7px' }}>
            <div className="score-bar-fill" style={{ width: `${Math.min(overall_score * 100, 100)}%`, background: scoreColor }} />
          </div>
          <div className="score-labels">
            <span>0 — Güvenli</span>
            <span>0.50</span>
            <span>1.0 — Kritik</span>
          </div>
        </div>
      )}

      {/* Risk Dağılımı */}
      <SectionHeader icon={AlertTriangle} label="Risk Dağılımı" />
      {(() => {
        const total = (risk_counts?.Yuksek ?? 0) + (risk_counts?.Orta ?? 0) + (risk_counts?.Dusuk ?? 0);
        return (
          <div className="dist-row">
            {['Yuksek', 'Orta', 'Dusuk'].map(lvl => (
              <div key={lvl} className={`dist-box ${levelClass[lvl]}`}>
                <span className="dist-label">{levelLabel[lvl]}</span>
                <span className="dist-count">{risk_counts?.[lvl] ?? 0}</span>
                <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>
                  %{total > 0 ? Math.round((risk_counts?.[lvl] ?? 0) / total * 100) : 0}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Top 5 */}
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertTriangle size={12} strokeWidth={2} style={{ opacity: 0.5 }} />
        En Tehlikeli 5 Nokta
      </h3>
      <table className="top5-table">
        <thead>
          <tr>
            <th>Grid ID</th>
            <th>Risk</th>
            <th>Skor</th>
            <th>Kaza</th>
          </tr>
        </thead>
        <tbody>
          {(top5 || []).map((pt, i) => (
            <tr key={i}>
              <td>{pt.GRID_ID}</td>
              <td className={levelClass[pt.RISK_LEVEL]}>{levelLabel[pt.RISK_LEVEL] || pt.RISK_LEVEL}</td>
              <td>{pt.ADJUSTED_SCORE?.toFixed(2)}</td>
              <td>{pt.kaza_sayisi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
