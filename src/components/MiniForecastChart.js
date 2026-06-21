import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts';
import { getNext90Forecast } from '../api';

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MiniForecastChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [todayDate] = useState(getTodayStr);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await getNext90Forecast();
        if (!Array.isArray(raw) || !raw.length) {
          setLoading(false);
          return;
        }

        const normalized = raw.map((d) => ({
          date: String(d.ds).slice(0, 10),
          value: d.yhat ?? 0,
        }));

        const todayIdx = normalized.findIndex((d) => d.date === todayDate);
        const start = todayIdx >= 0 ? Math.max(0, todayIdx - 7) : 0;
        const end   = todayIdx >= 0 ? Math.min(normalized.length, todayIdx + 8) : Math.min(normalized.length, 14);

        setData(normalized.slice(start, end));
        setLoading(false);
      } catch (err) {
        console.error('[MiniForecastChart] Veri yüklenemedi:', err);
        setError(true);
        setLoading(false);
      }
    };

    load();
  }, [todayDate]);

  if (loading) return <p className="info-msg">Yükleniyor...</p>;
  if (error)   return <p className="info-msg">Tahmin verisi yüklenemedi.</p>;
  if (!data.length) return null;


  const pastData   = data.map((d) => ({ ...d, past:   d.date <= todayDate ? d.value : null }));
  const futureData = data.map((d) => ({ ...d, future: d.date >= todayDate ? d.value : null }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart
        data={pastData.map((d, i) => ({ ...d, ...futureData[i] }))}
        margin={{ top: 8, right: 8, left: -10, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="2 4" stroke="#1e2830" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 9, fill: '#6e8899' }}
          axisLine={false}
          tickLine={false}
          interval={1}
          angle={-40}
          textAnchor="end"
          height={40}
        />
        <YAxis
          width={28}
          tick={{ fontSize: 9, fill: '#6e8899' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          labelFormatter={(label) => label}
          formatter={(val) => [Math.round(val) + ' kaza', 'Tahmin']}
          contentStyle={{
            background: '#161c22',
            border: '1px solid #232c36',
            borderRadius: 4,
            fontSize: 11,
          }}
          itemStyle={{ color: '#4a9eff' }}
          labelStyle={{ color: '#6e8899' }}
        />
        <ReferenceLine
          x={todayDate}
          stroke="#4a9eff"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: 'Bugün', position: 'top', fontSize: 10, fill: '#4a9eff' }}
        />
        <Line
          type="monotone"
          dataKey="past"
          stroke="#3a4f60"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: '#3a4f60' }}
          connectNulls={true}
        />
        <Line
          type="monotone"
          dataKey="future"
          stroke="#4a9eff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: '#4a9eff' }}
          connectNulls={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
