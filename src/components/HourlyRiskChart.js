import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TICKS = [0, 6, 12, 18, 23];

function getHourFactor(hour) {
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) return 1.30;
  if (hour >= 22 || hour <= 5) return 1.20;
  return 1.00;
}

function getColor(val) {
  if (val > 1.25) return 'var(--accent-red)';
  if (val > 1.10) return 'var(--accent-amber)';
  return 'var(--accent-green)';
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-bright)',
      borderRadius: 4,
      padding: '5px 8px',
      fontSize: '0.72rem',
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-primary)',
    }}>
      <div style={{ color: 'var(--text-secondary)' }}>{label}:00</div>
      <div>Risk Çarpanı: {payload[0].value}x</div>
    </div>
  );
}

export default function HourlyRiskChart({ result }) {
  if (!result) return null;

  const snowfall = result.weather?.snowfall ?? 0;
  const precipitation = result.weather?.precipitation ?? 0;
  const dayFactor = result.risk_multiplier ?? 1;
  const weatherFactor = snowfall > 2 ? 1.25 : precipitation > 2 ? 1.08 : 1.0;

  const data = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    multiplier: +(getHourFactor(hour) * weatherFactor * dayFactor).toFixed(3),
  }));

  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={data} margin={{ top: 4, right: 2, left: -28, bottom: 0 }}>
        <XAxis
          dataKey="hour"
          ticks={TICKS}
          tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="multiplier" radius={[1, 1, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.hour} fill={getColor(entry.multiplier)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
