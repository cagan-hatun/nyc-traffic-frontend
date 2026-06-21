import { useState, useEffect } from 'react';
import { Sun, CloudRain, Snowflake } from 'lucide-react';
import { getWeatherCrashStats } from '../api';

const CATEGORY_META = {
  "Açık":     { icon: Sun,       color: "#10b981" },
  "Yağmurlu": { icon: CloudRain, color: "#ef4444" },
  "Karlı":    { icon: Snowflake, color: "#f59e0b" },
};

export default function WeatherCrashChart() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getWeatherCrashStats()
      .then(res => {
        if (res?.data) setData(res.data);
        else setError("Veri alınamadı");
      })
      .catch(err => {
        console.error("[WeatherCrashChart]", err);
        setError("Veri alınamadı");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>
        Yükleniyor...
      </div>
    );
  }
  if (error || data.length === 0) {
    return (
      <div style={{ padding: 16, color: "#9ca3af", fontSize: 12 }}>
        {error || "Veri yok"}
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.avg_daily_crashes));

  return (
    <div style={{
      padding: 16,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
        color: "#9ca3af", textTransform: "uppercase", marginBottom: 4,
      }}>
        Hava Durumuna Göre Kaza Dağılımı
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
        Günlük Ortalama Kaza Sayısı
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map(item => {
          const meta  = CATEGORY_META[item.category] || {};
          const Icon  = meta.icon;
          const color = meta.color || "#6b7280";
          const width = maxVal > 0 ? (item.avg_daily_crashes / maxVal) * 100 : 0;

          return (
            <div key={item.category} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {Icon && <Icon size={16} color={color} style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#e5e7eb", marginBottom: 4 }}>
                  {item.category}
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${width}%`, height: "100%", background: color, transition: "width 0.4s ease" }} />
                </div>
              </div>
              <div style={{ textAlign: "right", minWidth: 60, flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e5e7eb" }}>
                  {item.avg_daily_crashes.toFixed(0)}
                </div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>kaza/gün</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 12, paddingTop: 10,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: 10, color: "#6b7280", fontStyle: "italic",
      }}>
        Sejati (2024), Zhang (2024) yaklaşımı
      </div>
    </div>
  );
}
