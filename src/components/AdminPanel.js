import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Clock, AlertTriangle, User, MapPin, Tag, MoreVertical, Eye, Trash2, Navigation, Calendar, FileText } from 'lucide-react';
import { getAllReports, updateReportStatus, deleteReport } from '../api';
import toast from 'react-hot-toast';

const categoryLabel = {
  ACCIDENT:          'Kaza',
  TRAFFIC_VIOLATION: 'Trafik İhlali',
  ROAD_DAMAGE:       'Yol Sorunu',
  VEHICLE_BREAKDOWN: 'Araç Arızası',
  ROAD_OBSTRUCTION:  'Engel / Nesne',
  OTHER:             'Diğer',
};

const FILTERS = [
  { id: 'ALL',      label: 'Tümü' },
  { id: 'PENDING',  label: 'Bekleyen' },
  { id: 'APPROVED', label: 'Onaylı' },
  { id: 'REJECTED', label: 'Reddedildi' },
];

function DetailModal({ report, onClose }) {
  if (!report) return null;

  const statusLabel =
    report.status === 'PENDING'  ? 'Bekliyor'  :
    report.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi';

  const statusClass =
    report.status === 'PENDING'  ? 'status-pending'  :
    report.status === 'APPROVED' ? 'status-approved' : 'status-rejected';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          width: '100%', maxWidth: 400,
          maxHeight: '85vh', overflowY: 'auto',
          padding: 20,
          position: 'relative',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Bildirim Detayı
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          <Row icon={<Tag size={11} strokeWidth={2} />} label="Kategori">
            {categoryLabel[report.category] || report.category}
          </Row>

          {report.username && (
            <Row icon={<User size={11} strokeWidth={2} />} label="Kullanıcı">
              {report.username}
            </Row>
          )}

          {report.address && (
            <Row icon={<MapPin size={11} strokeWidth={2} />} label="Adres">
              {report.address}
            </Row>
          )}

          {(report.latitude != null && report.longitude != null) && (
            <Row icon={<Navigation size={11} strokeWidth={2} />} label="Koordinat">
              {Number(report.latitude).toFixed(6)}, {Number(report.longitude).toFixed(6)}
            </Row>
          )}

          {report.description && (
            <Row icon={<FileText size={11} strokeWidth={2} />} label="Açıklama">
              {report.description}
            </Row>
          )}

          {report.createdAt && (
            <Row icon={<Calendar size={11} strokeWidth={2} />} label="Tarih">
              {new Date(report.createdAt).toLocaleString('tr-TR')}
            </Row>
          )}

          <Row icon={<Clock size={11} strokeWidth={2} />} label="Durum">
            <span className={`report-status-badge ${statusClass}`} style={{ fontSize: '0.7rem' }}>
              {statusLabel}
            </span>
          </Row>

          {report.adminNote && (
            <Row icon={<FileText size={11} strokeWidth={2} />} label="Admin Notu">
              {report.adminNote}
            </Row>
          )}

          {report.photoPath && (
            <img
              src={`http://localhost:8080/uploads/reports/${report.photoPath}`}
              alt="bildirim"
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6, marginTop: 4 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: '0.78rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, color: 'var(--text-muted)', minWidth: 90, paddingTop: 1 }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ color: 'var(--text-primary)', flex: 1, wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}

function CardMenu({ report, onDetail, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: '2px 4px',
          display: 'flex', alignItems: 'center', borderRadius: 3,
          lineHeight: 1,
        }}
      >
        <MoreVertical size={14} strokeWidth={2} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 100,
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 6, minWidth: 150, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          overflow: 'hidden', marginTop: 4,
        }}>
          <button
            onClick={() => { setOpen(false); onDetail(); }}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.78rem', color: 'var(--text-primary)', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Eye size={12} strokeWidth={2} /> Detay Görüntüle
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            style={{
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.78rem', color: '#e05c5c', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Trash2 size={12} strokeWidth={2} /> Sil
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [filter, setFilter]           = useState('ALL');
  const [detailReport, setDetailReport] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllReports();
      setReports(data);
    } catch {
      setError('Bildirimler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleStatus = async (id, status) => {
    try {
      await updateReportStatus(id, status, '');
      fetchReports();
      toast.success(status === 'APPROVED' ? 'Bildirim onaylandı' : 'Bildirim reddedildi');
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu bildirimi silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteReport(id);
      fetchReports();
      toast.success('Bildirim silindi');
    } catch {
      toast.error('Silme işlemi başarısız');
    }
  };

  const filtered = filter === 'ALL' ? reports : reports.filter(r => r.status === filter);

  return (
    <div>
      <DetailModal report={detailReport} onClose={() => setDetailReport(null)} />

      <div className="section-label" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertTriangle size={11} strokeWidth={2} /> Bildirim Yönetimi
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`panel-nav-btn${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="info-msg">Yükleniyor...</div>}
      {error   && <div className="error-msg">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="info-msg">Henüz bildirim yok.</div>
      )}

      {filtered.map(report => (
        <div key={report.id} className="admin-report-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 3, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <Tag size={10} strokeWidth={2} />
              {categoryLabel[report.category] || report.category}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {report.createdAt ? new Date(report.createdAt).toLocaleDateString('tr-TR') : ''}
              </span>
              <CardMenu
                report={report}
                onDetail={() => setDetailReport(report)}
                onDelete={() => handleDelete(report.id)}
              />
            </div>
          </div>

          {report.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <MapPin size={11} strokeWidth={2} style={{ flexShrink: 0 }} />
              {report.address}
            </div>
          )}

          {report.username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <User size={11} strokeWidth={2} style={{ flexShrink: 0 }} />
              {report.username}
            </div>
          )}

          {report.description && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 8 }}>
              {report.description}
            </div>
          )}

          {report.photoPath && (
            <img
              src={`http://localhost:8080/uploads/reports/${report.photoPath}`}
              alt="bildirim"
              style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className={`report-status-badge ${
              report.status === 'PENDING'  ? 'status-pending'  :
              report.status === 'APPROVED' ? 'status-approved' : 'status-rejected'
            }`}>
              {report.status === 'PENDING'  && <Clock size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
              {report.status === 'APPROVED' && <Check size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
              {report.status === 'REJECTED' && <X     size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
              {report.status === 'PENDING'  ? 'Bekliyor'   :
               report.status === 'APPROVED' ? 'Onaylandı'  : 'Reddedildi'}
            </span>

            {report.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="admin-action-btn btn-approve" onClick={() => handleStatus(report.id, 'APPROVED')}>
                  <Check size={12} strokeWidth={2.5} /> Onayla
                </button>
                <button className="admin-action-btn btn-reject" onClick={() => handleStatus(report.id, 'REJECTED')}>
                  <X size={12} strokeWidth={2.5} /> Reddet
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
