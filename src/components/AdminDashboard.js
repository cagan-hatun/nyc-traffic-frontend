import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, X, AlertTriangle, BarChart2,
  Activity, Database, MapPin, RefreshCw,
  Shield, ChevronRight, User, Info, Download, TrendingUp,
  MoreVertical, Eye, Trash2, Navigation, Calendar, FileText,
} from 'lucide-react';
import { getAllReports, getReportStats, updateReportStatus, getGridStats, deleteReport } from '../api';
import RiskMap from './RiskMap';
import ForecastChart from './ForecastChart';
import SeasonCrashChart from './SeasonCrashChart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ComposedChart, Area } from 'recharts';

const categoryLabel = {
  ACCIDENT:          { label:'Kaza',           color:'#e05555' },
  TRAFFIC_VIOLATION: { label:'Trafik İhlali',  color:'#e8a030' },
  ROAD_DAMAGE:       { label:'Yol Sorunu',     color:'#a78bfa' },
  VEHICLE_BREAKDOWN: { label:'Araç Arızası',   color:'#4a9eff' },
  ROAD_OBSTRUCTION:  { label:'Engel / Nesne',  color:'#f472b6' },
  OTHER:             { label:'Diğer',          color:'#6e8899' },
};


function StatCard({ label, value, color, Icon, sub }) {
  return (
    <div style={{
      background:'var(--bg-elevated)', border:'1px solid var(--border)',
      borderRadius:10, padding:'16px 20px',
      display:'flex', alignItems:'center', gap:14, flex:1, minWidth:140,
    }}>
      <div style={{
        width:42, height:42, borderRadius:10,
        background: color + '15', border:`1px solid ${color}30`,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <Icon size={20} strokeWidth={1.8} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{label}</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.6rem', fontWeight:700, color:'var(--text-primary)', lineHeight:1 }}>{value ?? '—'}</div>
        {sub && <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:3 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, darkMode, onLogout, liveWeather, defaultTab = 'overview' }) {
  const navigate = useNavigate();
  const [activeTab,   setActiveTab]   = useState(defaultTab);
  const [stats,       setStats]       = useState(null);
  const [reports,     setReports]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showGrid,    setShowGrid]    = useState(true);
  const [showApproved, setShowApproved] = useState(true);
  const [approvedReports, setApprovedReports] = useState([]);
  const [lastUpdate,  setLastUpdate]  = useState(new Date());
  const [time,        setTime]        = useState(new Date());
  const [gridData,    setGridData]    = useState([]);
  const [next7,       setNext7]       = useState([]);
  const [temporalFactors, setTemporalFactors] = useState(null);
  const [hourlyRisk,      setHourlyRisk]      = useState([]);
  const [mapViewMode,  setMapViewMode]  = useState("default");
  const [selectedHour, setSelectedHour] = useState(8);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': 'Bearer ' + token };
      const [s, r, g, tf, hr] = await Promise.all([
        getReportStats(),
        getAllReports(),
        getGridStats(),
        fetch('http://localhost:8080/api/temporal-factors', { headers }).then(r => r.json()).catch(() => null),
        fetch('http://localhost:8080/api/hourly-risk',      { headers }).then(r => r.json()).catch(() => []),
      ]);
      setTemporalFactors(tf);
      setHourlyRisk(Array.isArray(hr) ? hr : []);
      setStats(s);
      setReports(r || []);
      setApprovedReports((r || []).filter(rep => rep.status === 'APPROVED'));
      setGridData(Array.isArray(g) ? g : []);
      setLastUpdate(new Date());
    } catch {}
    finally { setLoading(false); }
    fetch('http://localhost:8080/api/forecast/next7', {
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
    }).then(r => r.json()).then(d => setNext7(Array.isArray(d) ? d : [])).catch(() => {});
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatus = async (id, status) => {
    try {
      await updateReportStatus(id, status, '');
      fetchData();
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      await deleteReport(id);
      fetchData();
      toast.success('Bildirim silindi');
    } catch {
      toast.error('Silme işlemi başarısız');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'notifications') navigate('/admin/notifications');
    else if (tab === 'forecast') navigate('/admin/forecast');
    else                         navigate('/admin');
  };

  const pending5 = reports.filter(r => r.status === 'PENDING').slice(0, 5);

  const BOROUGHS = [
    { name:'Manhattan',    color:'#e05555', minLat:40.700,maxLat:40.882,minLon:-74.020,maxLon:-73.907 },
    { name:'Brooklyn',     color:'#e8a030', minLat:40.570,maxLat:40.740,minLon:-74.042,maxLon:-73.833 },
    { name:'Queens',       color:'#a78bfa', minLat:40.541,maxLat:40.800,minLon:-73.962,maxLon:-73.700 },
    { name:'Bronx',        color:'#4a9eff', minLat:40.785,maxLat:40.917,minLon:-73.934,maxLon:-73.748 },
    { name:'Staten Island',color:'#3dbd78', minLat:40.477,maxLat:40.651,minLon:-74.259,maxLon:-74.034 },
  ];

  const boroughRisks = BOROUGHS.map(b => {
    const cells = gridData.filter(c =>
      c.BOROUGH && c.BOROUGH.toUpperCase() === b.name.toUpperCase()
    );
    const avg = cells.length > 0
      ? cells.reduce((s, c) => s + (c.DANGER_SCORE || 0), 0) / cells.length
      : 0;
    return { ...b, score: parseFloat(avg.toFixed(2)), count: cells.length };
  });


  const avgRiskScore = gridData.length > 0
    ? (gridData.reduce((s, c) => s + (c.DANGER_SCORE || 0), 0) / gridData.length).toFixed(2)
    : '—';
  const highRiskCount = gridData.filter(c => c.RISK_LEVEL === 'Yuksek').length;

  const weatherLabel = (code) => {
    if (!code && code !== 0) return '';
    if (code === 0)  return 'Açık';
    if (code <= 3)   return 'Parçalı bulutlu';
    if (code <= 69)  return 'Yağmurlu';
    if (code <= 79)  return 'Karlı';
    return 'Fırtınalı';
  };

  return (
    <div className="app dark" style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>

      <div className="top-bar">
        <div className="top-bar-left">
          <svg className="top-bar-logo" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <polygon points="9,1 16,5 16,13 9,17 2,13 2,5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            <circle cx="9" cy="9" r="2" fill="currentColor"/>
          </svg>
          <span className="top-bar-title">NYC Trafik Risk Analizi</span>
          <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginLeft:8 }}>Admin Dashboard</span>
        </div>

        <div style={{ display:'flex', gap:2 }}>
          {[
            { id:'overview',       label:'Genel Bakış',     Icon: BarChart2   },
            { id:'notifications',  label:'Bildirimler',     Icon: Bell        },
            { id:'forecast',       label:'90 Günlük Tahmin', Icon: TrendingUp },
          ].map(({ id, label, Icon }) => (
            <button key={id} onClick={() => handleTabChange(id)} style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'5px 12px', background:'none',
              border:'none', borderBottom: activeTab===id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor:'pointer', fontFamily:'var(--font-ui)', fontSize:'0.8rem',
              color: activeTab===id ? 'var(--accent)' : 'var(--text-secondary)',
              transition:'all .15s',
            }}>
              <Icon size={13} strokeWidth={2}/> {label}
            </button>
          ))}
        </div>

        <div className="top-bar-right">
          {liveWeather && (
            <span className="top-bar-item" style={{ fontSize:'0.78rem' }}>
              {liveWeather.temperature_2m ?? liveWeather.temperature}°C · {weatherLabel(liveWeather.weathercode)}
            </span>
          )}
          <span className="top-bar-time">{time.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</span>
          <div className="top-bar-user">
            <Shield size={13} strokeWidth={2} style={{ color:'var(--accent-amber)' }} />
            <span className="top-bar-username">{user.username}</span>
            <span className="top-bar-role-badge">Admin</span>
          </div>
          <button
            onClick={() => { navigate('/about'); }}
            title="Hakkında"
            style={{
              padding: '6px 8px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 6,
              cursor: 'pointer', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', marginRight: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Info size={13} strokeWidth={2} />
          </button>
          <button className="logout-btn" onClick={onLogout} title="Çıkış yap">
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>

          <div style={{ display:'flex', gap:12, padding:'12px 16px', flexShrink:0 }}>
            <StatCard label="Ort. Risk Skoru"   value={avgRiskScore}    color="var(--accent-red)"   Icon={Activity}   sub="Grid tabanlı ortalama" />
            <StatCard label="Yüksek Riskli"     value={highRiskCount}   color="var(--accent-red)"   Icon={AlertTriangle} sub={`${gridData.length} hücreden`} />
            <StatCard label="Grid Hücresi"      value="3,408"           color="#a78bfa"             Icon={Database}   sub="NYC trafik grid'i" />
            <StatCard label="Toplam Bildirim"   value={stats?.total}    color="var(--accent)"       Icon={Bell}       sub={`Onaylı: ${stats?.approved ?? 0} · Bekleyen: ${stats?.pending ?? 0}`} />
            <StatCard label="Onaylı Bildirim"   value={stats?.approved} color="var(--accent-green)" Icon={Check}      />
            <StatCard label="Son Güncelleme"    value={lastUpdate.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })} color="var(--accent)" Icon={RefreshCw} />
          </div>

          <div style={{ flex:1, overflow:'hidden', display:'flex', gap:0 }}>

            <div style={{ width:340, flexShrink:0, borderRight:'1px solid var(--border)', overflowY:'auto', padding:'12px' }}>

              <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'12px', marginBottom:10 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                  Saatlik Risk Yoğunluğu
                </div>
                {hourlyRisk.length === 0 ? (
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', padding:'8px 0' }}>Yükleniyor...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={hourlyRisk} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                      <XAxis dataKey="hour" tick={{ fontSize:8, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}
                        tickFormatter={h => h % 3 === 0 ? h : ''} />
                      <YAxis tick={{ fontSize:8, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0,1]} />
                      <Tooltip
                        contentStyle={{ background:'#0f1117', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.72rem' }}
                        formatter={(v) => [v.toFixed(2), 'Risk Yoğunluğu']}
                        labelFormatter={(h) => `Saat ${h}:00`}
                      />
                      <Bar dataKey="value" radius={[2,2,0,0]}
                        fill="var(--accent-green)"
                        label={false}>
                        {hourlyRisk.map((entry, index) => (
                          <Cell key={index}
                            fill={entry.level === 'Yuksek' ? 'var(--accent-red)' :
                                  entry.level === 'Orta'   ? 'var(--accent-amber)' :
                                                             'var(--accent-green)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {temporalFactors && (
                <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'12px', marginBottom:10 }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                    Zamansal Risk Faktörleri
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {[
                      { label:'Yoğun Saat Riski',  icon:'🕐', val: temporalFactors.peak_hour?.multiplier,    sub: temporalFactors.peak_hour?.label,    dir: temporalFactors.peak_hour?.direction },
                      { label:'Yağış Çarpanı',      icon:'🌧️', val: temporalFactors.precipitation?.multiplier, sub: temporalFactors.precipitation?.label },
                      { label:'Hafta Sonu Riski',   icon:'📅', val: temporalFactors.weekend?.multiplier,      sub: temporalFactors.weekend?.label,      dir: temporalFactors.weekend?.direction },
                      { label:'Sıcaklık Etkisi',    icon:'🌡️', val: temporalFactors.temperature?.multiplier,  sub: temporalFactors.temperature?.label },
                    ].map((f, i) => {
                      const color = f.val > 1.1 ? 'var(--accent-red)' : f.val > 1.0 ? 'var(--accent-amber)' : 'var(--accent-green)';
                      const arrow = f.dir === 'up' ? '↑' : f.dir === 'down' ? '↓' : '';
                      return (
                        <div key={i} style={{ background:'var(--bg-card)', borderRadius:6, padding:'8px', border:'1px solid var(--border)' }}>
                          <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', marginBottom:4 }}>{f.label}</div>
                          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.9rem', fontWeight:700, color }}>
                            {arrow && <span style={{ marginRight:2 }}>{arrow}</span>}{f.val?.toFixed(2)}x
                          </div>
                          <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', marginTop:2 }}>{f.sub}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'12px', marginBottom:10 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                  İlçe Bazlı Risk Dağılımı
                </div>
                {gridData.length === 0 ? (
                  <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Grid verisi yükleniyor...</div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <ResponsiveContainer width={220} height={220}>
                      <PieChart>
                        <Pie
                          data={boroughRisks}
                          dataKey="score"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={100}
                          strokeWidth={0}
                        >
                          {boroughRisks.map((b) => (
                            <Cell key={b.name} fill={b.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background:'#1a1f2e', border:'1px solid #2e3d4d', borderRadius:6, fontSize:'0.75rem' }}
                          labelStyle={{ color:'#a0adb8' }}
                          formatter={(value, name) => [(value).toFixed(2), name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', flexDirection:'column', gap:7, flex:1 }}>
                      {boroughRisks.map(b => (
                        <div key={b.name} style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <span style={{ width:10, height:10, borderRadius:2, background:b.color, flexShrink:0, display:'inline-block' }} />
                          <span style={{ fontSize:'0.72rem', color:'var(--text-secondary)', flex:1 }}>{b.name}</span>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--text-primary)', fontWeight:600 }}>
                            {(b.score / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'12px', marginBottom:10 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                  7 Günlük Kaza Tahmini
                </div>
                {next7.length === 0 ? (
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', padding:'8px 0' }}>Yükleniyor...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <ComposedChart data={next7.map(d => ({
                      gun: new Date(d.date).toLocaleDateString('tr-TR', { weekday:'short', day:'numeric', month:'short' }),
                      tahmin: Math.round(d.yhat),
                      alt: Math.round(d.yhat_lower),
                      ust: Math.round(d.yhat_upper),
                      yagis: d.weather?.precipitation > 0,
                    }))} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id="confBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.25}/>
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="gun" tick={{ fontSize:9, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:9, fill:'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background:'#0f1117', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.72rem' }}
                        itemStyle={{ color:'#e5e7eb' }}
                        formatter={(v, n) => {
                          if (n === 'tahmin') return [`${v} kaza`, 'Tahmin'];
                          if (n === 'ust')    return [`${v} kaza`, 'Üst sınır (%95)'];
                          if (n === 'alt')    return [`${v} kaza`, 'Alt sınır (%95)'];
                          return null;
                        }}
                        labelStyle={{ color:'var(--text-primary)', fontWeight:600 }}
                      />
                      <Area type="monotone" dataKey="ust" stroke="none" fill="url(#confBand)" isAnimationActive={false} />
                      <Area type="monotone" dataKey="alt" stroke="none" fill="var(--bg-elevated)" isAnimationActive={false} />
                      <Bar dataKey="tahmin" fill="var(--accent)" radius={[3,3,0,0]} barSize={18}
                        isAnimationActive={false}
                        label={{ position:'top', fontSize:8, fill:'var(--text-muted)', formatter: v => v }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
                <div style={{ fontSize:'0.62rem', color:'var(--text-secondary)', marginTop:6, textAlign:'center' }}>
                  Gerçek hava tahmini · Prophet modeli · Gölge alan: %95 güven aralığı
                </div>
              </div>

              <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    Son 5 Bekleyen
                  </div>
                  <button onClick={() => handleTabChange('notifications')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.68rem', color:'var(--accent)', display:'flex', alignItems:'center', gap:3 }}>
                    Tümü <ChevronRight size={11}/>
                  </button>
                </div>
                {pending5.length === 0 ? (
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', padding:'8px 0' }}>Bekleyen bildirim yok.</div>
                ) : pending5.map(r => {
                  const cat = categoryLabel[r.category] || { label:r.category, color:'#6e8899' };
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:'0.65rem', fontWeight:600, padding:'1px 6px', borderRadius:3, background:cat.color+'15', color:cat.color, flexShrink:0 }}>{cat.label}</span>
                      <span style={{ fontSize:'0.72rem', color:'var(--text-secondary)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.address || '—'}</span>
                      <button onClick={() => handleStatus(r.id, 'APPROVED')} style={{ background:'var(--accent-green)', border:'none', borderRadius:4, width:22, height:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Check size={11} strokeWidth={2.5} color="#fff"/>
                      </button>
                      <button onClick={() => handleStatus(r.id, 'REJECTED')} style={{ background:'var(--accent-red)', border:'none', borderRadius:4, width:22, height:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <X size={11} strokeWidth={2.5} color="#fff"/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
              <RiskMap
                origin={null} destination={null}
                route={null} top5={[]}
                onOriginSet={() => {}} onDestinationSet={() => {}}
                onRouteSet={() => {}}
                onOriginClear={() => {}} onDestClear={() => {}}
                darkMode={darkMode} result={null}
                showGrid={showGrid} setShowGrid={setShowGrid}
                reportMode={false} onReportLocationSelect={() => {}}
                approvedReports={showApproved ? approvedReports : []}
                showRouteData={false} showReportMarkers={true}
                viewMode={mapViewMode}
                selectedHour={selectedHour}
              />
              <div style={{ position:'absolute', top:12, left:12, zIndex:10, display:'flex', gap:8 }}>
                <button
                  onClick={() => setShowGrid(v => !v)}
                  style={{ padding:'6px 12px', background: showGrid ? 'var(--accent)' : 'rgba(10,12,15,0.88)', backdropFilter:'blur(12px)', border:`1px solid ${showGrid ? 'var(--accent)' : 'var(--border-bright)'}`, borderRadius:6, cursor:'pointer', fontFamily:'var(--font-ui)', fontSize:'0.75rem', fontWeight:500, color: showGrid ? '#fff' : 'var(--text-secondary)', display:'flex', alignItems:'center', gap:5 }}
                >
                  <Database size={12} strokeWidth={2}/> Grid Heatmap
                </button>
                <button
                  onClick={() => setShowApproved(v => !v)}
                  style={{ padding:'6px 12px', background: showApproved ? 'rgba(232,160,48,0.3)' : 'rgba(10,12,15,0.88)', backdropFilter:'blur(12px)', border:`1px solid ${showApproved ? 'rgba(232,160,48,0.8)' : 'rgba(232,160,48,0.3)'}`, borderRadius:6, cursor:'pointer', fontFamily:'var(--font-ui)', fontSize:'0.75rem', fontWeight:500, color:'var(--accent-amber)', display:'flex', alignItems:'center', gap:5 }}
                >
                  <Bell size={12} strokeWidth={2}/> Onaylı Bildirimler
                </button>
                <button
                  onClick={() => setMapViewMode(v => v === 'hourly' ? 'default' : 'hourly')}
                  style={{ padding:'6px 12px', background: mapViewMode === 'hourly' ? 'rgba(59,130,246,0.25)' : 'rgba(10,12,15,0.88)', backdropFilter:'blur(12px)', border:`1px solid ${mapViewMode === 'hourly' ? 'rgba(59,130,246,0.8)' : 'rgba(59,130,246,0.3)'}`, borderRadius:6, cursor:'pointer', fontFamily:'var(--font-ui)', fontSize:'0.75rem', fontWeight:500, color: mapViewMode === 'hourly' ? '#3b82f6' : 'var(--text-secondary)', display:'flex', alignItems:'center', gap:5 }}
                >
                  🕐 Saatlik Yoğunluk
                </button>
              </div>

              {mapViewMode === 'hourly' && (
                <div style={{ position:'absolute', top:12, right:12, width:320, zIndex:10, padding:'10px 12px', background:'rgba(10,14,26,0.92)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, backdropFilter:'blur(8px)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:11, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', minWidth:40, flexShrink:0 }}>
                      Saat
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={23}
                      value={selectedHour}
                      onChange={e => setSelectedHour(parseInt(e.target.value))}
                      style={{ flex:1, accentColor:'#3b82f6' }}
                    />
                    <div style={{ minWidth:48, textAlign:'right', fontSize:15, fontWeight:700, color:'#3b82f6', flexShrink:0, fontFamily:'var(--font-mono)' }}>
                      {String(selectedHour).padStart(2,'0')}:00
                    </div>
                  </div>
                </div>
              )}

              <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:10, display:'flex', alignItems:'center', gap:14, background:'rgba(10,12,15,0.88)', backdropFilter:'blur(12px)', border:'1px solid rgba(46,61,77,0.6)', borderRadius:8, padding:'7px 16px' }}>
                {mapViewMode === 'hourly' ? (
                  <>
                    {[['#10b981','Az'],['#f59e0b','Orta'],['#ef4444','Yoğun']].map(([color,label]) => (
                      <span key={label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.72rem', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                        <span style={{ width:9, height:9, borderRadius:'50%', background:color, flexShrink:0, display:'inline-block' }}/>
                        {label}
                      </span>
                    ))}
                  </>
                ) : (
                  <>
                    {[['#22c55e','Düşük Risk'],['#f59e0b','Orta Risk'],['#ef4444','Yüksek Risk'],['#e8a030','Onaylı Bildirim']].map(([color,label])=>(
                      <span key={label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.72rem', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                        <span style={{ width:9, height:9, borderRadius:'50%', background:color, flexShrink:0, display:'inline-block' }}/>
                        {label}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div style={{ width:280, flexShrink:0, borderLeft:'1px solid var(--border)', overflowY:'auto', padding:'12px' }}>

              <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'12px', marginBottom:10 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
                  Model Performansı
                </div>
                {[
                  { name:'Random Forest', label:'Kaza Tahmini', metric:'F1 Score', value:'0.755', color:'var(--accent)', pct:75.5, note:'Baseline\'dan %68 iyi' },
                  { name:'Prophet',       label:'Zaman Serisi', metric:'MAPE',     value:'%13.2', color:'var(--accent-green)', pct:86.8, note:'Güven aralığı %95' },
                ].map(m => (
                  <div key={m.name} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <div>
                        <span style={{ fontSize:'0.78rem', fontWeight:600, color:m.color }}>{m.name}</span>
                        <span style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginLeft:6 }}>({m.label})</span>
                      </div>
                    </div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginBottom:4 }}>{m.metric}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.3rem', fontWeight:700, color:'var(--text-primary)', marginBottom:5 }}>{m.value}</div>
                    <div style={{ height:4, background:'var(--border)', borderRadius:2, overflow:'hidden', marginBottom:3 }}>
                      <div style={{ height:'100%', width:`${m.pct}%`, background:m.color, borderRadius:2 }} />
                    </div>
                    <div style={{ fontSize:'0.65rem', color:'var(--accent-green)' }}>↗ {m.note}</div>
                  </div>
                ))}
                <div style={{ paddingTop:10, borderTop:'1px solid var(--border)', fontSize:'0.65rem', color:'var(--text-muted)', lineHeight:1.6 }}>
                  Hébert (2019) PCA ağırlıklı Risk Skoru metodolojisi kullanılmaktadır.
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <SeasonCrashChart />
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <AdminPanelContent reports={reports} onStatus={handleStatus} onDelete={handleDelete} loading={loading} />
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          <ForecastChart />
        </div>
      )}
    </div>
  );
}

function DetailModal({ report, onClose }) {
  if (!report) return null;
  const cat = categoryLabel[report.category] || { label: report.category, color: '#6e8899' };
  const statusLabel = report.status === 'PENDING' ? 'Bekliyor' : report.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi';
  const statusClass = report.status === 'PENDING' ? 'status-pending' : report.status === 'APPROVED' ? 'status-approved' : 'status-rejected';

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onMouseDown={onClose}
    >
      <div
        style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, width:'100%', maxWidth:420, maxHeight:'85vh', overflowY:'auto', padding:20, position:'relative' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <span style={{ fontSize:'0.82rem', fontWeight:700, color:'var(--text-primary)' }}>Bildirim Detayı</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:2, display:'flex' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <DRow icon={<FileText size={11}/>} label="Kategori">
            <span style={{ color: cat.color, fontWeight: 600 }}>{cat.label}</span>
          </DRow>
          {report.user?.username && <DRow icon={<User size={11}/>} label="Kullanıcı">{report.user.username}</DRow>}
          {report.address && <DRow icon={<MapPin size={11}/>} label="Adres">{report.address}</DRow>}
          {(report.latitude != null && report.longitude != null) && (
            <DRow icon={<Navigation size={11}/>} label="Koordinat">
              {Number(report.latitude).toFixed(6)}, {Number(report.longitude).toFixed(6)}
            </DRow>
          )}
          {report.description && <DRow icon={<FileText size={11}/>} label="Açıklama">{report.description}</DRow>}
          {report.createdAt && (
            <DRow icon={<Calendar size={11}/>} label="Tarih">
              {new Date(report.createdAt).toLocaleString('tr-TR')}
            </DRow>
          )}
          <DRow icon={<Info size={11}/>} label="Durum">
            <span className={`report-status-badge ${statusClass}`} style={{ fontSize:'0.7rem' }}>{statusLabel}</span>
          </DRow>
          {report.adminNote && <DRow icon={<FileText size={11}/>} label="Admin Notu">{report.adminNote}</DRow>}
          {report.photoPath && (
            <img src={`http://localhost:8080/uploads/reports/${report.photoPath}`} alt="bildirim"
              style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:6, marginTop:4 }}/>
          )}
        </div>
      </div>
    </div>
  );
}

function DRow({ icon, label, children }) {
  return (
    <div style={{ display:'flex', gap:8, fontSize:'0.78rem' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:5, color:'var(--text-muted)', minWidth:90, paddingTop:1 }}>
        {icon}<span>{label}</span>
      </div>
      <div style={{ color:'var(--text-primary)', flex:1, wordBreak:'break-word' }}>{children}</div>
    </div>
  );
}

function CardMenu({ onDetail, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'2px 4px', display:'flex', alignItems:'center', borderRadius:3 }}
      >
        <MoreVertical size={14} strokeWidth={2}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', right:0, zIndex:200, background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:6, minWidth:155, boxShadow:'0 4px 16px rgba(0,0,0,0.2)', overflow:'hidden', marginTop:4 }}>
          <MenuBtn icon={<Eye size={12}/>} onClick={() => { setOpen(false); onDetail(); }}>Detay Görüntüle</MenuBtn>
          <MenuBtn icon={<Trash2 size={12}/>} onClick={() => { setOpen(false); onDelete(); }} danger>Sil</MenuBtn>
        </div>
      )}
    </div>
  );
}

function MenuBtn({ icon, onClick, danger, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width:'100%', background: hovered ? 'var(--bg-hover)' : 'none',
        border:'none', cursor:'pointer', padding:'8px 12px',
        display:'flex', alignItems:'center', gap:8,
        fontSize:'0.78rem', color: danger ? '#e05c5c' : 'var(--text-primary)', textAlign:'left',
      }}
    >
      {icon}{children}
    </button>
  );
}

function AdminPanelContent({ reports, onStatus, onDelete, loading }) {
  const [filter, setFilter] = useState('ALL');
  const [detailReport, setDetailReport] = useState(null);
  const filtered = filter === 'ALL' ? reports : reports.filter(r => r.status === filter);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;

    // CSV header
    const headers = ['ID', 'Kategori', 'Adres', 'Latitude', 'Longitude', 'Açıklama', 'Kullanıcı', 'Durum', 'Tarih'];

    // CSV rows
    const rows = filtered.map(r => [
      r.id,
      r.category || '',
      (r.address || '').replace(/"/g, '""'),
      r.latitude ?? '',
      r.longitude ?? '',
      (r.description || '').replace(/"/g, '""').replace(/\n/g, ' '),
      r.user?.username || '',
      r.status === 'PENDING' ? 'Bekliyor' : r.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi',
      r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR') : '',
    ]);

    // Build CSV content (with UTF-8 BOM for Excel)
    const csvContent = '﻿' + [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    const filterLabel = filter === 'ALL' ? 'tum' : filter.toLowerCase();
    link.href = url;
    link.download = `bildirimler_${filterLabel}_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteConfirm = (id) => {
    if (!window.confirm('Bu bildirimi silmek istediğinizden emin misiniz?')) return;
    onDelete(id);
  };

  return (
    <div>
      <DetailModal report={detailReport} onClose={() => setDetailReport(null)} />
      <div style={{ display:'flex', gap:4, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {[{id:'ALL',label:'Tümü'},{id:'PENDING',label:'Bekleyen'},{id:'APPROVED',label:'Onaylı'},{id:'REJECTED',label:'Reddedildi'}].map(f => (
          <button key={f.id} className={`panel-nav-btn${filter===f.id?' active':''}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          title="Seçili bildirimleri CSV olarak indir"
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: filtered.length === 0 ? 'var(--bg-elevated)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${filtered.length === 0 ? 'var(--border)' : 'rgba(34,197,94,0.3)'}`,
            borderRadius: 6,
            cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
            color: filtered.length === 0 ? 'var(--text-muted)' : '#22c55e',
            fontSize: '0.78rem',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          <Download size={13} strokeWidth={2}/>
          CSV İndir ({filtered.length})
        </button>
      </div>
      {loading && <div className="info-msg">Yükleniyor...</div>}
      {!loading && filtered.length === 0 && <div className="info-msg">Henüz bildirim yok.</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))', gap:12 }}>
        {filtered.map(report => {
          const cat = categoryLabel[report.category] || { label:report.category, color:'#6e8899' };
          return (
            <div key={report.id} className="admin-report-card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:'0.7rem', fontWeight:600, padding:'2px 8px', borderRadius:3, background:cat.color+'15', color:cat.color, border:`1px solid ${cat.color}30` }}>
                  {cat.label}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>
                    {report.createdAt ? new Date(report.createdAt).toLocaleDateString('tr-TR') : ''}
                  </span>
                  <CardMenu
                    onDetail={() => setDetailReport(report)}
                    onDelete={() => handleDeleteConfirm(report.id)}
                  />
                </div>
              </div>
              {report.address && <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}><MapPin size={11}/>{report.address}</div>}
              {report.user?.username && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}><User size={11}/>{report.user.username}</div>}
              {report.description && <div style={{ fontSize:'0.8rem', color:'var(--text-primary)', marginBottom:8 }}>{report.description}</div>}
              {report.photoPath && <img src={`http://localhost:8080/uploads/reports/${report.photoPath}`} alt="bildirim" style={{ width:'100%', maxHeight:120, objectFit:'cover', borderRadius:4, marginBottom:8 }}/>}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span className={`report-status-badge ${report.status==='PENDING'?'status-pending':report.status==='APPROVED'?'status-approved':'status-rejected'}`}>
                  {report.status==='PENDING'?'Bekliyor':report.status==='APPROVED'?'Onaylandı':'Reddedildi'}
                </span>
                {report.status === 'PENDING' && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="admin-action-btn btn-approve" onClick={() => onStatus(report.id, 'APPROVED')}><Check size={12} strokeWidth={2.5}/> Onayla</button>
                    <button className="admin-action-btn btn-reject"  onClick={() => onStatus(report.id, 'REJECTED')}><X size={12} strokeWidth={2.5}/> Reddet</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}