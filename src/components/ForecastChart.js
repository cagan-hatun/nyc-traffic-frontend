import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { getNext90Forecast } from '../api';

function formatDate(ds) {
  const d = new Date(ds);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const get = (key) => payload.find((p) => p.dataKey === key)?.value;
  return (
    <div style={{
      background  : '#181d23',
      border      : '1px solid #2e3d4d',
      borderRadius: 4,
      padding     : '10px 14px',
      fontFamily  : "'IBM Plex Mono', monospace",
      fontSize    : '0.78rem',
      boxShadow   : '0 4px 16px rgba(0,0,0,0.5)',
      color       : '#c8d8e8',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#4a9eff', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.8rem' }}>{label}</div>
      <div>Tahmin &nbsp;<strong style={{ color: '#4a9eff' }}>{get('yhat')?.toFixed(2)}</strong></div>
      <div style={{ color: '#6e8899', marginTop: 2 }}>Alt &nbsp;&nbsp;&nbsp;&nbsp;{get('yhat_lower')?.toFixed(2)}</div>
      <div style={{ color: '#6e8899' }}>Üst &nbsp;&nbsp;&nbsp;&nbsp;{get('yhat_upper')?.toFixed(2)}</div>
    </div>
  );
}

export default function ForecastChart() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [avg, setAvg]         = useState(null);

  useEffect(() => {
    getNext90Forecast()
      .then((rows) => {
        const mapped = rows.map((r) => ({ ...r, label: formatDate(r.ds) }));
        setData(mapped);
        const mean = mapped.reduce((s, r) => s + r.yhat, 0) / mapped.length;
        setAvg(Math.round(mean * 100) / 100);
      })
      .catch((err) => setError(err.response?.data?.message || 'Tahmin verisi alınamadı.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="info-msg">Tahmin verisi yükleniyor...</p>;
  if (error)   return <p className="error-msg">{error}</p>;

  return (
    <div className="forecast-fullwidth">
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#6e8899', marginBottom: 4, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>
            Prophet Model · Hava Regresörü
          </div>
          <h2 style={{ margin: 0 }}>Sonraki 90 Gün — Günlük Kaza Tahmini</h2>
        </div>
        {avg && (
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: '90G Ortalama', value: avg, color: '#4a9eff' },
              { label: 'Veri Noktası', value: data.length, color: '#c8d8e8' },
              { label: 'MAPE', value: '%13', color: '#3dbd78' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: '#6e8899', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2, fontFamily: "'IBM Plex Sans', sans-serif" }}>{label}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1rem', color }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grafik */}
      <div style={{
        background  : '#0a0c0f',
        border      : '1px solid #232c36',
        borderRadius: 4,
        padding     : '20px 16px 12px',
      }}>
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={data} margin={{ top: 8, right: 40, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="2 6" stroke="#1a222a" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#3a4f60' }}
              interval={8}
              axisLine={{ stroke: '#232c36' }}
              tickLine={false}
              label={{ value: 'Tarih (Ay/Gün)', position: 'insideBottom', offset: -12, fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif", fill: '#3a4f60' }}
              height={40}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fill: '#3a4f60' }}
              axisLine={{ stroke: '#232c36' }}
              tickLine={false}
              label={{ value: 'Kaza / Gün', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fontFamily: "'IBM Plex Sans', sans-serif", fill: '#3a4f60' }}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={32}
              wrapperStyle={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.75rem', color: '#6e8899' }}
            />
            {avg && (
              <ReferenceLine
                y={avg}
                stroke="#e8a030"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: `Ort. ${avg}`, position: 'right', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fill: '#e8a030' }}
              />
            )}
            <Line type="monotone" dataKey="yhat_lower" name="Alt Güven" stroke="#232c36" strokeWidth={1} dot={false} activeDot={false} />
            <Line type="monotone" dataKey="yhat_upper" name="Üst Güven" stroke="#232c36" strokeWidth={1} dot={false} activeDot={false} />
            <Line
              type="monotone" dataKey="yhat" name="Tahmin"
              stroke="#4a9eff" strokeWidth={2} dot={false}
              activeDot={{ r: 4, fill: '#4a9eff', stroke: '#0a0c0f', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 10, display: 'flex', gap: 20, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.7rem', color: '#3a4f60', fontWeight: 500, letterSpacing: '0.02em' }}>
        <span>Kaynak: NYC Open Data (2012–2024)</span>
        <span>·</span>
        <span>Hava regresörü: Open-Meteo ERA5</span>
        <span>·</span>
        <span>Güven aralığı: %95</span>
      </div>
    </div>
  );
}