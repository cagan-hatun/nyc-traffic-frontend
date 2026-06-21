import React, { useEffect, useState } from 'react';
import { getSearchHistory } from '../api';

export default function SearchHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSearchHistory()
      .then((data) => setHistory(data.slice(0, 10)))
      .catch(() => setError('Arama geçmişi yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="info-msg">Yükleniyor...</p>;
  if (error)   return <p className="error-msg">{error}</p>;
  if (!history.length) return <p className="info-msg">Henüz arama yapılmamış.</p>;

  return (
    <div className="search-history card">
      <h2>Arama Geçmişi</h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>Kalkış</th>
            <th>Varış</th>
            <th>Tarih</th>
            <th>Saat</th>
            <th>Risk Çarpanı</th>
            <th>Ort. Skor</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, i) => (
            <tr key={i}>
              <td>{row.originName}</td>
              <td>{row.destName}</td>
              <td>{row.travelDate}</td>
              <td>{row.travelHour}</td>
              <td>{row.riskMultiplier?.toFixed(3)}</td>
              <td>{row.overallScore?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
