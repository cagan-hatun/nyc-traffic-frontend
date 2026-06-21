import React from 'react';
import {
  Cloud, Truck, Cpu, AlertTriangle, TriangleAlert,
  Sun, CloudFog, CloudRain, CloudSnow, CloudLightning,
  Clock, TrendingUp,
} from 'lucide-react';
import HourlyRiskChart from './HourlyRiskChart';
import MiniForecastChart from './MiniForecastChart';

const weatherCodeLabel = (code) => {
  if (code === undefined || code === null) return '';
  if (code === 0)  return 'Açık';
  if (code <= 3)   return 'Parçalı bulutlu';
  if (code <= 49)  return 'Sisli';
  if (code <= 69)  return 'Yağmurlu';
  if (code <= 79)  return 'Karlı';
  return 'Fırtınalı';
};

const weatherSourceLabel = (source) => {
  if (source === 'live')              return 'Anlık';
  if (source === 'forecast')          return 'Tahmin';
  if (source === 'seasonal_estimate') return 'Mevsimsel';
  return '';
};

function WeatherIcon({ code, size }) {
  const props = { size, strokeWidth: 1.5 };
  if (code === 0)  return <Sun {...props} />;
  if (code <= 3)   return <Cloud {...props} />;
  if (code <= 49)  return <CloudFog {...props} />;
  if (code <= 69)  return <CloudRain {...props} />;
  if (code <= 79)  return <CloudSnow {...props} />;
  return <CloudLightning {...props} />;
}

export default function RightPanel({ result, selectedRoute, liveWeather }) {
  const traffic = selectedRoute?.traffic ?? result?.traffic;
  return (
    <>
      {/* Anlık Hava */}
      <div className="card">
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <Cloud size={11} strokeWidth={2} />
          Anlık Hava
          {liveWeather?.source && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '0.6rem',
              padding: '1px 6px',
              borderRadius: 3,
              fontWeight: 600,
              background: liveWeather.source === 'live' ? 'rgba(61,189,120,0.15)' : 'rgba(74,158,255,0.15)',
              color: liveWeather.source === 'live' ? 'var(--accent-green)' : 'var(--accent)',
              border: `1px solid ${liveWeather.source === 'live' ? 'rgba(61,189,120,0.3)' : 'rgba(74,158,255,0.3)'}`,
            }}>
              {weatherSourceLabel(liveWeather.source)}
            </span>
          )}
        </div>
        {liveWeather ? (
          <>
            <div className="weather-display">
              <div className="weather-icon">
                <WeatherIcon code={liveWeather.weathercode} size={32} />
              </div>
              <div>
                <div className="weather-temp">{liveWeather.temperature_2m}°C</div>
                <div className="weather-cond">{weatherCodeLabel(liveWeather.weathercode)}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
              <div className="metric-box">
                <span className="metric-label">Rüzgar</span>
                <span className="metric-value" style={{ fontSize: '0.8rem' }}>
                  {liveWeather.windspeed_10m}<span style={{ fontSize: '0.55rem', marginLeft: 1 }}>km/h</span>
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Yağış</span>
                <span className="metric-value" style={{ fontSize: '0.8rem' }}>
                  {liveWeather.precipitation}<span style={{ fontSize: '0.55rem', marginLeft: 1 }}>mm</span>
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Kar</span>
                <span className="metric-value" style={{ fontSize: '0.8rem' }}>
                  {liveWeather.snowfall}<span style={{ fontSize: '0.55rem', marginLeft: 1 }}>cm</span>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="info-msg">Hava verisi yükleniyor…</div>
        )}
      </div>

      <div className="card">
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <Truck size={11} strokeWidth={2} />
          Trafik Durumu
        </div>
        {traffic && traffic.source !== 'not_available' && traffic.eta_minutes ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <div className="metric-box">
              <span className="metric-label">ETA</span>
              <span className="metric-value" style={{ fontSize: '0.85rem' }}>{traffic.eta_minutes} dk</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Trafiksiz</span>
              <span className="metric-value" style={{ fontSize: '0.85rem' }}>{traffic.no_traffic_minutes} dk</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Gecikme</span>
              <span className="metric-value" style={{
                fontSize: '0.85rem',
                color: traffic.delay_minutes > 10 ? 'var(--accent-red)' : 'var(--accent-green)',
              }}>
                +{traffic.delay_minutes} dk
              </span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Mesafe</span>
              <span className="metric-value" style={{ fontSize: '0.85rem' }}>{traffic.distance_km} km</span>
            </div>
          </div>
        ) : (
          <div className="info-msg">Rota analizi sonrası gösterilecek</div>
        )}
      </div>

      <div className="card">
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <Cpu size={11} strokeWidth={2} />
          Model Performansı
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Random Forest</span>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>F1=0.755</span>
            </div>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: '75.5%', background: 'var(--accent)' }} />
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Baseline'dan %68 iyi</div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Prophet</span>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>MAPE=%13.2</span>
            </div>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: '87%', background: 'var(--accent-green)' }} />
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Güven aralığı %95</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
          <Clock size={11} strokeWidth={2} />
          Saatlik Risk Dağılımı
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          Seçilen güzergah · saat bazlı çarpan
        </div>
        <HourlyRiskChart result={selectedRoute ?? result} />
      </div>

      <div className="card">
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <TriangleAlert size={11} strokeWidth={2} />
          Uyarılar
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{
            padding: '8px 10px',
            borderRadius: 'var(--radius)',
            background: 'rgba(224,85,85,0.08)',
            border: '1px solid rgba(224,85,85,0.25)',
            fontSize: '0.72rem',
            color: 'var(--accent-red)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              <AlertTriangle size={10} strokeWidth={2} />
              Yüksek riskli 3 segment
            </div>
            <div style={{ opacity: 0.7, fontSize: '0.65rem', marginTop: 2 }}>5 dk önce</div>
          </div>
          <div style={{
            padding: '8px 10px',
            borderRadius: 'var(--radius)',
            background: 'rgba(232,160,48,0.08)',
            border: '1px solid rgba(232,160,48,0.22)',
            fontSize: '0.72rem',
            color: 'var(--accent-amber)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              <AlertTriangle size={10} strokeWidth={2} />
              Hava koşulları riski artırıyor
            </div>
            <div style={{ opacity: 0.7, fontSize: '0.65rem', marginTop: 2 }}>12 dk önce</div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          Bildirim sistemi yakında aktif olacak
        </div>
      </div>

      <div className="card" style={{padding: '10px 8px'}}>
        <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <TrendingUp size={11} strokeWidth={2} />
          14 Günlük Tahmin
        </div>
        <MiniForecastChart />
      </div>

    </>
  );
}
