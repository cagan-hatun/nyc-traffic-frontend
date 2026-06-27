import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MapPin, Sun,
  LogOut, User, Navigation, AlertTriangle, Info,
  CloudRain, Cloud, CloudSnow, Zap, Bell,
  ChevronRight, X, Search, Play, Pause, Eye, EyeOff,
} from 'lucide-react';
import ProfilePage     from './ProfilePage';
import RiskMap         from './RiskMap';
import ReportForm      from './ReportForm';
import HourlyRiskChart from './HourlyRiskChart';
import { getRouteRisk, getApprovedReports } from '../api';

const weatherLabel = (code) => {
  if (!code && code !== 0) return '';
  if (code === 0)  return 'Açık';
  if (code <= 3)   return 'Parçalı bulutlu';
  if (code <= 69)  return 'Yağmurlu';
  if (code <= 79)  return 'Karlı';
  return 'Fırtınalı';
};

const WeatherIcon = ({ code, size = 14 }) => {
  if (code === 0)  return <Sun size={size} strokeWidth={2} />;
  if (code <= 3)   return <Cloud size={size} strokeWidth={2} />;
  if (code <= 69)  return <CloudRain size={size} strokeWidth={2} />;
  if (code <= 79)  return <CloudSnow size={size} strokeWidth={2} />;
  return <Zap size={size} strokeWidth={2} />;
};

const THRESHOLD_LOW  = 0.05; 
const THRESHOLD_HIGH = 0.23; 

const riskColor = (score) => {
  if (score >= THRESHOLD_HIGH) return 'var(--accent-red)';
  if (score >= THRESHOLD_LOW)  return 'var(--accent-amber)';
  return 'var(--accent-green)';
};

const riskLabel = (score) => {
  if (score >= THRESHOLD_HIGH) return 'Yüksek Risk';
  if (score >= THRESHOLD_LOW)  return 'Orta Risk';
  return 'Düşük Risk';
};

const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return '—';
  const m = Math.round(minutes);
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} saat` : `${h} saat ${rem} dk`;
};

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};


const SIM_INTERVAL_MS       = 3000;
const SIM_STEP_METERS       = 200;
const SIM_WARN_METERS       = 500;
const ROUTE_PROXIMITY_METERS = 150;


const SIM_RELEVANT_CATEGORIES = ['ACCIDENT', 'VEHICLE_BREAKDOWN', 'ROAD_OBSTRUCTION'];


const SYNTHETIC_REPORT = {
  id: '__synthetic__',
  category: 'ACCIDENT',
  description: 'Test: Simülasyon uyarı bildirimi',
  lat: 40.7549, latitude: 40.7549,
  lon: -73.9840, longitude: -73.9840,
  user: { username: 'sistem' },
};

export default function UserApp({ user, darkMode, onLogout, liveWeather }) {
  const navigate = useNavigate();
  const [showUserMenu,    setShowUserMenu]    = useState(false);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest,   setSearchingDest]   = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchResults,   setSearchResults]   = useState([]);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const searchDebounce = useRef(null);
  const [origin, setOrigin]           = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute]             = useState(null);
  const [routeData, setRouteData]     = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [showGrid, setShowGrid]       = useState(false);
  const [reportMode, setReportMode]         = useState(false);
  const [reportLocation, setReportLocation] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [approvedReports, setApprovedReports] = useState([]);
  const [showResult, setShowResult]   = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [showFuture, setShowFuture]   = useState(false);
  const [futureDate, setFutureDate]   = useState('');
  const [futureHour, setFutureHour]   = useState('');
  const [isFutureAnalysis, setIsFutureAnalysis] = useState(false); 
  const [weatherOpen, setWeatherOpen] = useState(true);
  const [trafficOpen, setTrafficOpen] = useState(true);
  const [hourlyOpen,  setHourlyOpen]  = useState(false);
  const [activePage,  setActivePage]  = useState('route');
  const [mobileInfoPanelOpen, setMobileInfoPanelOpen] = useState(false);

  const [simRunning,       setSimRunning]       = useState(false);
  const [simIndex,         setSimIndex]         = useState(0);
  const [simCoord,         setSimCoord]         = useState(null);
  const [simShowReports,   setSimShowReports]   = useState(true);
  const [simWarnReports,   setSimWarnReports]   = useState([]); 
  const [simFinished,      setSimFinished]      = useState(false);
  const simIntervalRef = useRef(null);
  const prevWarnIdsRef = useRef(new Set()); 

  const fetchApprovedReports = async () => {
    try { setApprovedReports(await getApprovedReports()); } catch {}
  };
  useEffect(() => { fetchApprovedReports(); }, []); 

  const getSimCoords = useCallback(() => {
    const r = routeData?.routes?.[selectedRouteIndex];
    return r?.coords || []; // [[lat, lon], ...]
  }, [routeData, selectedRouteIndex]);

  const routeTotalKm = useMemo(() => {
    const coords = getSimCoords();
    if (coords.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[i + 1];
      total += haversineMeters(lat1, lon1, lat2, lon2);
    }
    return total / 1000;
  }, [getSimCoords]);

  const remainingRouteKm = useMemo(() => {
    const coords = getSimCoords();
    if (coords.length < 2) return routeTotalKm;
    if (simIndex >= coords.length - 1) return 0;
    let total = 0;
    for (let i = simIndex; i < coords.length - 1; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[i + 1];
      total += haversineMeters(lat1, lon1, lat2, lon2);
    }
    return total / 1000;
  }, [getSimCoords, simIndex, routeTotalKm]);

  const categorizedReports = useMemo(() => {
    const coords = getSimCoords();
    if (coords.length < 2) return [];
    return (approvedReports || [])
      .filter(rep => SIM_RELEVANT_CATEGORIES.includes(rep.category))
      .map(rep => {
        const rLat = rep.lat ?? rep.latitude;
        const rLon = rep.lon ?? rep.longitude;
        if (rLat == null || rLon == null) return null;
        const onRoute = coords.some(([lat, lon]) =>
          haversineMeters(rLat, rLon, lat, lon) <= ROUTE_PROXIMITY_METERS
        );
        return { ...rep, onRoute };
      })
      .filter(Boolean);
  }, [approvedReports, getSimCoords]);

  const stopSim = useCallback(() => {
    clearInterval(simIntervalRef.current);
    simIntervalRef.current = null;
    setSimRunning(false);
  }, []);

  const resetSim = useCallback(() => {
    stopSim();
    setSimIndex(0);
    setSimCoord(null);
    setSimWarnReports([]);
    setSimFinished(false);
    prevWarnIdsRef.current = new Set();
  }, [stopSim]);

  useEffect(() => { resetSim(); }, [routeData, selectedRouteIndex]); // eslint-disable-line

  const startSim = useCallback(() => {
    const coords = getSimCoords();
    if (coords.length < 2) return;
    setSimFinished(false);
    setSimWarnReports([]);
    setSimIndex(0);
    prevWarnIdsRef.current = new Set();
    setSimCoord({ lat: coords[0][0], lon: coords[0][1] });
    setSimRunning(true);
  }, [getSimCoords]);

  useEffect(() => {
    if (!simRunning) { clearInterval(simIntervalRef.current); return; }
    const coords = getSimCoords();
    if (coords.length < 2) { stopSim(); return; }

    simIntervalRef.current = setInterval(() => {
      setSimIndex(prev => {
        let idx = prev;
        let traveled = 0;
        while (idx + 1 < coords.length && traveled < SIM_STEP_METERS) {
          const [lat1, lon1] = coords[idx];
          const [lat2, lon2] = coords[idx + 1];
          traveled += haversineMeters(lat1, lon1, lat2, lon2);
          idx++;
        }

        if (idx >= coords.length - 1) {
          setSimCoord({ lat: coords[coords.length - 1][0], lon: coords[coords.length - 1][1] });
          setSimRunning(false);
          setSimFinished(true);
          clearInterval(simIntervalRef.current);
          toast.success('Hedefe ulaşıldı! 🏁', { duration: 3000 });
          return coords.length - 1;
        }

        const [lat, lon] = coords[idx];
        setSimCoord({ lat, lon });

        const allReports = simShowReports
          ? [...categorizedReports, { ...SYNTHETIC_REPORT, onRoute: true }]
          : [];
        const near = allReports.filter(rep => {
          const rLat = rep.lat ?? rep.latitude;
          const rLon = rep.lon ?? rep.longitude;
          if (rLat == null || rLon == null) return false;
          return haversineMeters(lat, lon, rLat, rLon) <= SIM_WARN_METERS;
        });

        setSimWarnReports(near);

        const nearIds = new Set(near.map(r => r.id));
        const newlyEntered = near.filter(r => !prevWarnIdsRef.current.has(r.id));
        newlyEntered.forEach(rep => {
          const catLabels = {
            ACCIDENT: 'Kaza', TRAFFIC_VIOLATION: 'Trafik İhlali',
            ROAD_DAMAGE: 'Yol Sorunu', VEHICLE_BREAKDOWN: 'Araç Arızası',
            ROAD_OBSTRUCTION: 'Engel', OTHER: 'Bildirim',
          };
          const catLabel = catLabels[rep.category] || 'Bildirim';
          if (rep.onRoute === true) {
            toast(`⚠️ ${catLabel} 500m ileride!`, {
              duration: 4000,
              style: { background: '#7c1f1f', color: '#fff', border: '1px solid #e05555' },
            });
          } else {
            toast(`ℹ️ ${catLabel} yakın bölgede bildirildi (rotanız üzerinde değil)`, {
              duration: 4000,
              style: { background: '#1e3a5f', color: '#fff', border: '1px solid #4a9eff' },
            });
          }
        });
        prevWarnIdsRef.current = nearIds;

        return idx;
      });
    }, SIM_INTERVAL_MS);

    return () => clearInterval(simIntervalRef.current);
  }, [simRunning]);

  useEffect(() => {
    if (activePage !== 'report') {
      setReportMode(false);
      setReportLocation(null);
    }
  }, [activePage]);

  const handleOriginClear = () => { setOrigin(null); setRouteData(null); setRoute(null); setShowResult(false); };
  const handleDestClear   = () => { setDestination(null); setRouteData(null); setRoute(null); setShowResult(false); };

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const searchNominatim = async (q) => {
    if (q.length < 3) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=us&viewbox=-74.2591,40.9176,-73.7004,40.4774&bounded=1`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  };

  const handleSearchChange = (e) => {
    const v = e.target.value;
    setSearchQuery(v);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => searchNominatim(v), 400);
  };

  const handleSearchSelect = (r, type) => {
    const name = r.display_name.split(',').slice(0, 2).join(',').trim();
    const loc  = { lat: parseFloat(r.lat), lon: parseFloat(r.lon), name };
    if (type === 'origin') { setOrigin(loc); setSearchingOrigin(false); }
    else                   { setDestination(loc); setSearchingDest(false); }
    setSearchQuery('');
    setSearchResults([]);
  };

  const closeSearch = () => {
    setSearchingOrigin(false);
    setSearchingDest(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAnalyze = async () => {
    if (!origin || !destination) return;
    setError(null); setLoading(true);
    const loadingId = toast.loading('Rota analiz ediliyor...');
    try {
      const date = showFuture ? futureDate : todayStr();
  const hour = showFuture
    ? parseInt(futureHour, 10)
    : parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }), 10);      setIsFutureAnalysis(showFuture); // simülasyon: gelecek tarih ise butonlar gizlenecek
      const data = await getRouteRisk({
        origin_name : origin.name,     origin_lat  : origin.lat,
        origin_lon  : origin.lon,      dest_name   : destination.name,
        dest_lat    : destination.lat, dest_lon    : destination.lon,
        travel_date : date,            travel_hour : hour,
      });
      setRouteData(data);
      const safestIdx = (data.routes || []).findIndex(
        r => r.label === 'en_guvenli' || r.label === 'en_hizli_ve_guvenli'
      );
      setSelectedRouteIndex(safestIdx >= 0 ? safestIdx : 0);
      setShowResult(true);
      toast.success('Rota analiz edildi', { id: loadingId });
    } catch (err) {
      setError(err.response?.data?.message || 'İstek başarısız oldu.');
      toast.error(err.response?.data?.message || 'Rota hesaplanamadı', { id: loadingId });
    } finally {
      setLoading(false);
      setShowFuture(false);
      setFutureDate('');
      setFutureHour('');
    }
  };

  const selectedRoute = routeData?.routes?.[selectedRouteIndex] || null;

  const routeAlerts = routeData && approvedReports.length > 0
    ? approvedReports.filter(r => {
        if (!origin || !destination) return false;
        const minLat = Math.min(origin.lat, destination.lat) - 0.05;
        const maxLat = Math.max(origin.lat, destination.lat) + 0.05;
        const minLon = Math.min(origin.lon, destination.lon) - 0.05;
        const maxLon = Math.max(origin.lon, destination.lon) + 0.05;
        const lat = r.lat ?? r.latitude;
        const lon = r.lon ?? r.longitude;
        return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
      })
    : [];

  const score          = selectedRoute ? selectedRoute.overall_score : null;
  const top5           = selectedRoute?.top5 || [];
  const displayWeather = (showResult && routeData?.weather) ? routeData.weather : liveWeather;

  return (
    <div className="app dark">
      <div className="top-bar">
        <div className="top-bar-left">
          <svg className="top-bar-logo" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <polygon points="9,1 16,5 16,13 9,17 2,13 2,5"
              stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            <circle cx="9" cy="9" r="2" fill="currentColor"/>
          </svg>
          <span className="top-bar-title">NYC Trafik Risk Analizi</span>
          <div className="top-bar-sep" />
          <span className="top-bar-item">
            <MapPin size={11} strokeWidth={2} /> New York City
          </span>
        </div>

        <div className="top-bar-right">

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: showUserMenu ? 'var(--bg-hover)' : 'transparent',
                border: '1px solid var(--border-bright)',
                borderRadius: 8, padding: '5px 10px',
                cursor: 'pointer', color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', fontSize: '0.82rem',
                transition: 'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => !showUserMenu && (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {user.username?.slice(0,1).toUpperCase()}
              </div>
              <span>{user.username}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6, transition: 'transform .15s', transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
                borderRadius: 10, overflow: 'hidden', minWidth: 160,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}
              onMouseLeave={() => setShowUserMenu(false)}
              >
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Kullanıcı</div>
                </div>

                {[
                  { label: 'Profil',    icon: <User size={14} strokeWidth={2}/>, onClick: () => { setActivePage('profile'); setShowUserMenu(false); } },
                  { label: 'Hakkında',  icon: <Info size={14} strokeWidth={2}/>, onClick: () => { navigate('/about'); } },
                ].map(({ label, icon, onClick }) => (
                  <button key={label} onClick={onClick} style={{
                    width: '100%', padding: '9px 14px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 9,
                    fontFamily: 'var(--font-ui)', fontSize: '0.82rem',
                    color: 'var(--text-secondary)', textAlign: 'left',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    {icon} {label}
                  </button>
                ))}

                <div style={{ borderTop: '1px solid var(--border)' }} />

                <button onClick={() => { setShowUserMenu(false); onLogout(); }} style={{
                  width: '100%', padding: '9px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 9,
                  fontFamily: 'var(--font-ui)', fontSize: '0.82rem',
                  color: 'var(--accent-red)', textAlign: 'left',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,85,85,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={14} strokeWidth={2}/> Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="app-body">
        {activePage === 'profile' ? (
          <ProfilePage user={user} onLogout={onLogout} onBack={() => setActivePage('route')} />
        ) : (
        <>
          <main className="map-area">
          <RiskMap
            origin={origin} destination={destination}
            route={route} top5={top5}
            onOriginSet={setOrigin} onDestinationSet={setDestination}
            onRouteSet={setRoute}
            onOriginClear={handleOriginClear} onDestClear={handleDestClear}
            darkMode={darkMode}
            result={null}
            routes={routeData?.routes || null}
            selectedRouteIndex={selectedRouteIndex}
            onRouteSelect={setSelectedRouteIndex}
            showGrid={showGrid} setShowGrid={setShowGrid}
            reportMode={reportMode}
            onReportLocationSelect={(loc) => {
              setReportLocation(loc);
              setReportMode(false);
            }}
            approvedReports={approvedReports}
            showReportMarkers={activePage === 'report' || (simRunning || simIndex > 0)}
            showRouteData={activePage === 'route'}
            simulationCoord={simCoord}
            simShowReports={simShowReports}
          />
          <button
            className="mobile-info-toggle-btn"
            onClick={() => setMobileInfoPanelOpen(v => !v)}
            aria-label="Bilgi panelini ac/kapat"
          >
            {mobileInfoPanelOpen ? '✕' : '☰'}
          </button>
        </main>

        <aside className="user-panel">
          <div style={{ display:'flex', gap:6, marginBottom:6 }}>
            <button
              onClick={() => { setActivePage('route'); setReportMode(false); }}
              style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'9px 12px',
                background: activePage === 'route' ? 'var(--accent)' : 'rgba(10,12,15,0.85)',
                border: activePage === 'route' ? '1px solid var(--accent)' : '1px solid var(--border-bright)',
                borderRadius: 8, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '0.82rem', fontWeight: 600,
                color: activePage === 'route' ? '#fff' : 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
                transition: 'all .15s',
              }}
            >
              <Navigation size={14} strokeWidth={2} /> Rota
            </button>
            <button
              onClick={() => setActivePage('report')}
              style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'9px 12px',
                background: activePage === 'report' ? 'var(--accent)' : 'rgba(10,12,15,0.85)',
                border: activePage === 'report' ? '1px solid var(--accent)' : '1px solid var(--border-bright)',
                borderRadius: 8, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '0.82rem', fontWeight: 600,
                color: activePage === 'report' ? '#fff' : 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
                transition: 'all .15s',
              }}
            >
              <Bell size={14} strokeWidth={2} /> Bildirim
            </button>
          </div>

          {activePage === 'route' && (
            <>
              {!showResult && <>
              {searchingOrigin ? (
                <div style={{ position:'relative' }}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:6,
                    background:'var(--bg-base)', border:'1px solid var(--accent)',
                    borderRadius:8, padding:'7px 10px',
                    boxShadow:'0 0 0 3px rgba(74,158,255,0.1)',
                  }}>
                    <Search size={12} strokeWidth={2} style={{ color:'var(--accent)', flexShrink:0 }} />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Kalkış noktası ara..."
                      style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'var(--font-ui)', fontSize:'0.82rem', color:'var(--text-primary)' }}
                    />
                    {searchLoading && <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>...</span>}
                    <button onClick={closeSearch} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
                      <X size={13} strokeWidth={2} />
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{
                      position:'absolute', top:'100%', left:0, right:0, zIndex:50,
                      background:'rgba(15,19,24,0.98)', backdropFilter:'blur(12px)',
                      border:'1px solid var(--border-bright)', borderRadius:8, marginTop:4,
                      overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.5)',
                    }}>
                      {searchResults.map((r, i) => {
                        const main = r.display_name.split(',').slice(0,2).join(',').trim();
                        const sub  = r.display_name.split(',').slice(2,4).join(',').trim();
                        return (
                          <button key={i} onMouseDown={() => handleSearchSelect(r, 'origin')}
                            style={{ width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom: i < searchResults.length-1 ? '1px solid var(--border)' : 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background='none'}
                          >
                            <div style={{ fontSize:'0.8rem', color:'var(--text-primary)', fontWeight:500 }}>{main}</div>
                            {sub && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:1 }}>{sub}</div>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`user-point-box${origin ? ' set' : ''}`}>
                  <div className="user-point-dot origin" />
                  <div className="user-point-info">
                    <span className="user-point-label">Kalkış</span>
                    <span className="user-point-name">
                      {origin ? origin.name : 'Haritaya tıklayarak seçin'}
                    </span>
                  </div>
                  {origin
                    ? <button className="user-clear-btn" onClick={e => { e.stopPropagation(); handleOriginClear(); }}>✕</button>
                    : <button onClick={() => { setSearchingDest(false); setSearchingOrigin(true); setSearchQuery(''); setSearchResults([]); }}
                        style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:2, flexShrink:0 }}
                        onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}
                        title="Ara">
                        <Search size={13} strokeWidth={2} />
                      </button>
                  }
                </div>
              )}

              {searchingDest ? (
                <div style={{ position:'relative' }}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:6,
                    background:'var(--bg-base)', border:'1px solid var(--accent)',
                    borderRadius:8, padding:'7px 10px',
                    boxShadow:'0 0 0 3px rgba(74,158,255,0.1)',
                  }}>
                    <Search size={12} strokeWidth={2} style={{ color:'var(--accent)', flexShrink:0 }} />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Varış noktası ara..."
                      style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'var(--font-ui)', fontSize:'0.82rem', color:'var(--text-primary)' }}
                    />
                    {searchLoading && <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>...</span>}
                    <button onClick={closeSearch} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}>
                      <X size={13} strokeWidth={2} />
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{
                      position:'absolute', top:'100%', left:0, right:0, zIndex:50,
                      background:'rgba(15,19,24,0.98)', backdropFilter:'blur(12px)',
                      border:'1px solid var(--border-bright)', borderRadius:8, marginTop:4,
                      overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.5)',
                    }}>
                      {searchResults.map((r, i) => {
                        const main = r.display_name.split(',').slice(0,2).join(',').trim();
                        const sub  = r.display_name.split(',').slice(2,4).join(',').trim();
                        return (
                          <button key={i} onMouseDown={() => handleSearchSelect(r, 'dest')}
                            style={{ width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderBottom: i < searchResults.length-1 ? '1px solid var(--border)' : 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background='none'}
                          >
                            <div style={{ fontSize:'0.8rem', color:'var(--text-primary)', fontWeight:500 }}>{main}</div>
                            {sub && <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:1 }}>{sub}</div>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`user-point-box${destination ? ' set dest' : ''}`}>
                  <div className="user-point-dot dest" />
                  <div className="user-point-info">
                    <span className="user-point-label">Varış</span>
                    <span className="user-point-name">
                      {destination ? destination.name : 'Haritaya tıklayarak seçin'}
                    </span>
                  </div>
                  {destination
                    ? <button className="user-clear-btn" onClick={e => { e.stopPropagation(); handleDestClear(); }}>✕</button>
                    : <button onClick={() => { setSearchingOrigin(false); setSearchingDest(true); setSearchQuery(''); setSearchResults([]); }}
                        style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:2, flexShrink:0 }}
                        onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}
                        title="Ara">
                        <Search size={13} strokeWidth={2} />
                      </button>
                  }
                </div>
              )}

              <div style={{ margin: '4px 0' }}>
                <button
                  type="button"
                  className="future-toggle-btn"
                  onClick={() => { setShowFuture(v => !v); setFutureDate(''); setFutureHour(''); }}
                >
                  <ChevronRight size={13} strokeWidth={2}
                    style={{ transition: 'transform 0.2s', transform: showFuture ? 'rotate(90deg)' : 'rotate(0deg)' }}/>
                  İleri tarih için tahmin yap
                </button>
                {showFuture && (
                  <div className="coord-row" style={{ marginTop: 8 }}>
                    <label className="user-date-label">
                      Tarih
                      <input type="date" value={futureDate} min={todayStr()}
                        onChange={e => setFutureDate(e.target.value)}
                        className="login-input" style={{ fontSize: '0.78rem', padding: '5px 8px' }} />
                    </label>
                    <label className="user-date-label">
                      Saat
                      <input type="number" value={futureHour} min="0" max="23" placeholder="8"
                        onChange={e => setFutureHour(e.target.value)}
                        className="login-input" style={{ fontSize: '0.78rem', padding: '5px 8px' }} />
                    </label>
                  </div>
                )}
              </div>

              </>}

              {showResult && (
                <button
                  type="button"
                  onClick={() => {
                    resetSim();
                    setShowResult(false);
                    setRouteData(null);
                    setRoute(null);
                  }}
                  style={{
                    width:'100%', padding:'7px',
                    background:'transparent',
                    border:'1px solid var(--border-bright)',
                    borderRadius:8, cursor:'pointer',
                    fontFamily:'var(--font-ui)', fontSize:'0.78rem',
                    color:'var(--text-secondary)',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    backdropFilter:'blur(12px)',
                  }}
                >
                  <Navigation size={12} strokeWidth={2} /> Rotayı Değiştir
                </button>
              )}


              {showResult && selectedRoute && !isFutureAnalysis && (
                <div style={{
                  background: 'rgba(10,12,15,0.85)',
                  border: `1px solid ${simRunning ? 'rgba(74,158,255,0.5)' : 'var(--border-bright)'}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  backdropFilter: 'blur(12px)',
                }}>
                  <div style={{ fontSize:'0.62rem', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>
                    Sürüş Simülasyonu
                  </div>

                  <div style={{ display:'flex', gap:6, marginBottom: simWarnReports.length > 0 ? 8 : 0 }}>
                    <button
                      onClick={() => simRunning ? stopSim() : (simFinished ? startSim() : (simIndex === 0 ? startSim() : setSimRunning(true)))}
                      disabled={getSimCoords().length < 2}
                      style={{
                        flex: 1, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                        padding:'7px 10px',
                        background: simRunning ? 'rgba(224,85,85,0.15)' : 'rgba(74,158,255,0.15)',
                        border: `1px solid ${simRunning ? 'rgba(224,85,85,0.4)' : 'rgba(74,158,255,0.4)'}`,
                        borderRadius: 8, cursor:'pointer',
                        fontFamily:'var(--font-ui)', fontSize:'0.78rem', fontWeight:600,
                        color: simRunning ? 'var(--accent-red)' : 'var(--accent)',
                      }}
                    >
                      {simRunning
                        ? <><Pause size={12} strokeWidth={2}/> Durdur</>
                        : simFinished
                        ? <><Play  size={12} strokeWidth={2}/> Yeniden Başlat</>
                        : simIndex > 0
                        ? <><Play  size={12} strokeWidth={2}/> Devam Et</>
                        : <><Play  size={12} strokeWidth={2}/> Simülasyonu Başlat</>}
                    </button>

                    <button
                      onClick={() => setSimShowReports(v => !v)}
                      title={simShowReports ? 'Bildirimleri gizle' : 'Bildirimleri göster'}
                      style={{
                        display:'flex', alignItems:'center', justifyContent:'center', gap:4,
                        padding:'7px 10px',
                        background: simShowReports ? 'rgba(248,163,72,0.12)' : 'transparent',
                        border: `1px solid ${simShowReports ? 'rgba(248,163,72,0.35)' : 'var(--border-bright)'}`,
                        borderRadius: 8, cursor:'pointer',
                        color: simShowReports ? '#f8a348' : 'var(--text-muted)',
                        fontSize:'0.72rem', fontFamily:'var(--font-ui)',
                      }}
                    >
                      {simShowReports ? <Eye size={12} strokeWidth={2}/> : <EyeOff size={12} strokeWidth={2}/>}
                      {simShowReports ? 'Uyarılar Açık' : 'Uyarılar Kapalı'}
                    </button>
                  </div>

                  {/* İlerleme çubuğu */}
                  {(simRunning || simIndex > 0) && !simFinished && (() => {
                    const total = getSimCoords().length;
                    const pct   = total > 1 ? Math.round((simIndex / (total - 1)) * 100) : 0;

                    return (
                      <div style={{ marginTop:6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.62rem', color:'var(--text-muted)', marginBottom:3 }}>
                          <span>İlerleme</span><span>%{pct}</span>
                        </div>
                        <div style={{ height:4, background:'var(--border)', borderRadius:2 }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:'var(--accent)', borderRadius:2, transition:'width 0.3s' }}/>
                        </div>
                        <div style={{ fontSize:'0.7rem', color:'var(--text-secondary)', marginTop:5 }}>
                          {remainingRouteKm.toFixed(1)} km kaldı
                        </div>
                      </div>
                    );
                  })()}

                  {simFinished && (
                    <div style={{ marginTop:6, padding:'6px 8px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:6, fontSize:'0.72rem', color:'#10b981', textAlign:'center' }}>
                      🏁 Hedefe ulaşıldı!
                    </div>
                  )}

                  {simWarnReports.length > 0 && (
                    <div style={{
                      marginTop:8, padding:'8px 10px',
                      background:'rgba(224,85,85,0.1)',
                      border:'1px solid rgba(224,85,85,0.4)',
                      borderRadius:8,
                    }}>
                      <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--accent-red)', marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
                        <AlertTriangle size={11} strokeWidth={2}/> {simWarnReports.length} Bildirim Yakında!
                      </div>
                      {simWarnReports.map((rep, i) => {
                        const catLabels = {
                          ACCIDENT:'Trafik Kazası', TRAFFIC_VIOLATION:'Trafik İhlali',
                          ROAD_DAMAGE:'Yol Sorunu', VEHICLE_BREAKDOWN:'Araç Arızası',
                          ROAD_OBSTRUCTION:'Yol Engeli', OTHER:'Diğer',
                        };
                        return (
                          <div key={rep.id ?? i} style={{ fontSize:'0.7rem', color: rep.onRoute ? 'var(--text-secondary)' : 'var(--text-muted)', marginTop:2 }}>
                            {!rep.onRoute && <span style={{ marginRight:4 }}>(Rota dışı)</span>}
                            • {catLabels[rep.category] || rep.category}
                            {rep.description && ` — ${rep.description.slice(0, 40)}`}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!showResult && origin && destination && (
                <button
                  className="user-analyze-btn"
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  <Navigation size={14} strokeWidth={2} />
                  {loading ? 'Analiz ediliyor...' : 'Rotayı Analiz Et'}
                </button>
              )}

              {!showResult && (origin || destination) && (
                <button
                  type="button"
                  className="mbtn-danger"
                  style={{ width:'100%', marginTop: 4, padding: '7px', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
                  onClick={() => {
                    handleOriginClear();
                    handleDestClear();
                    setShowResult(false);
                    setShowFuture(false);
                    setFutureDate('');
                    setFutureHour('');
                  }}
                >
                  Rotayı Kaldır
                </button>
              )}

              {error && <p className="error-msg">{error}</p>}

              {showResult && selectedRoute && (
                <div className="user-result-card">
                  <div style={{ fontSize:'0.68rem', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    Rota Risk Özeti
                    <button
                      onClick={() => setShowExplain(v => !v)}
                      style={{ background:'none', border:'1px solid var(--border-bright)', borderRadius:'50%', width:18, height:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent)', fontSize:'0.65rem', fontWeight:700, flexShrink:0 }}
                      title="Skoru açıkla"
                    >?</button>
                  </div>

                  {routeData?.routes && routeData.routes.length > 1 && (
                    <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                      {routeData.routes.map((r, idx) => {
                        const isSelected = idx === selectedRouteIndex;
                        const labelText = {
                          en_hizli: 'En Hızlı',
                          en_guvenli: 'En Güvenli',
                          en_hizli_ve_guvenli: 'En Hızlı + Güvenli',
                          denge: 'Denge',
                        }[r.label] || `Rota ${idx + 1}`;
                        const colorByLabel = {
                          en_hizli:            '#3b82f6',
                          en_guvenli:          '#10b981',
                          en_hizli_ve_guvenli: '#10b981',
                          denge:               '#f59e0b',
                        }[r.label] || '#6b7280';
                        const etaMin = r.traffic?.eta_minutes ?? (r.osrm_duration_sec / 60);
                        const distKm = (r.osrm_distance_m / 1000).toFixed(1);
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedRouteIndex(idx)}
                            style={{
                              flex:1, minWidth:100,
                              padding:'8px 10px',
                              border:`2px solid ${isSelected ? colorByLabel : '#374151'}`,
                              borderRadius:8,
                              background: isSelected ? `${colorByLabel}22` : 'transparent',
                              color:'#e5e7eb',
                              cursor:'pointer',
                              textAlign:'left',
                              transition:'all .15s',
                            }}
                          >
                            <div style={{ fontSize:11, color:colorByLabel, fontWeight:600, marginBottom:4 }}>{labelText}</div>
                            <div style={{ fontSize:13, fontWeight:700 }}>{formatDuration(etaMin)} · {distKm} km</div>
                            <div style={{ fontSize:11, color:'#9ca3af' }}>Risk: {r.overall_score?.toFixed(2) ?? '—'}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {showExplain && (
                    <div style={{ background:'rgba(74,158,255,0.06)', border:'1px solid rgba(74,158,255,0.2)', borderRadius:6, padding:'10px 12px', marginBottom:8, fontSize:'0.72rem', lineHeight:1.7 }}>
                      <div style={{ fontWeight:600, color:'var(--accent)', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                        <span>Skor Açıklaması</span>
                      </div>
                      <div style={{ color:'var(--text-secondary)', marginBottom:4 }}>
                        <span style={{ color:'var(--text-primary)', fontWeight:500 }}>Temporal Çarpan ({routeData?.risk_multiplier?.toFixed(2)}x): </span>
                        {routeData?.risk_multiplier >= 1.3
                          ? 'Sabah/akşam yoğun saatinde seyahat — kaza riski belirgin artıyor.'
                          : routeData?.risk_multiplier >= 1.2
                          ? 'Gece geç saatte seyahat — görüş mesafesi azalıyor.'
                          : 'Normal saatte seyahat — temporal risk düşük.'}
                      </div>
                      {selectedRoute?.traffic_multiplier && selectedRoute.traffic_multiplier > 1.0 && (
                        <div style={{ color:'var(--text-secondary)', marginBottom:4 }}>
                          <span style={{ color:'var(--text-primary)', fontWeight:500 }}>Trafik Çarpanı ({selectedRoute.traffic_multiplier?.toFixed(2)}x): </span>
                          {selectedRoute.traffic?.delay_minutes > 20
                            ? `TomTom verisi: +${selectedRoute.traffic.delay_minutes}dk ciddi gecikme — yoğun trafik risk artırıyor.`
                            : selectedRoute.traffic?.delay_minutes > 10
                            ? `TomTom verisi: +${selectedRoute.traffic.delay_minutes}dk gecikme — orta düzey trafik yoğunluğu.`
                            : `TomTom verisi: +${selectedRoute.traffic?.delay_minutes}dk gecikme — düşük trafik etkisi.`}
                        </div>
                      )}
                      <div style={{ color:'var(--text-secondary)', marginBottom:4 }}>
                        <span style={{ color:'var(--text-primary)', fontWeight:500 }}>Ayarlanmış Risk Skoru ({selectedRoute?.overall_score?.toFixed(2)}): </span>
                        {selectedRoute?.overall_score > 0.60
                          ? 'Güzergah yüksek kaza yoğunluklu grid hücrelerinden geçiyor (Hébert 2019 PCA skoru).'
                          : selectedRoute?.overall_score > 0.35
                          ? 'Güzergah orta yoğunluklu bölgelerden geçiyor.'
                          : 'Güzergah görece güvenli grid hücrelerinden geçiyor.'}
                      </div>
                      {selectedRoute?.risk_counts && (
                        <div style={{ color:'var(--text-secondary)' }}>
                          <span style={{ color:'var(--text-primary)', fontWeight:500 }}>Risk Dağılımı: </span>
                          {`Güzergah üzerinde ${selectedRoute.risk_counts.Yuksek ?? 0} yüksek, ${selectedRoute.risk_counts.Orta ?? 0} orta, ${selectedRoute.risk_counts.Dusuk ?? 0} düşük riskli grid hücresi tespit edildi.`}
                        </div>
                      )}
                      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid rgba(74,158,255,0.15)', fontSize:'0.65rem', color:'var(--text-muted)' }}>
                        Metodoloji: PCA ağırlıklı Danger Score (Hébert 2019) × Temporal Çarpan × Trafik Çarpanı
                      </div>
                    </div>
                  )}
                  <div className="user-risk-score">
                    <span className="user-risk-number" style={{ color: riskColor(score) }}>
                      {score?.toFixed(2)}
                    </span>
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      <span className="user-risk-label" style={{
                        background: riskColor(score) + '20',
                        color: riskColor(score),
                        border: `1px solid ${riskColor(score)}40`,
                      }}>
                        {riskLabel(score)}
                      </span>
                      <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>/ 1.00 maksimum</span>
                    </div>
                  </div>
                  <div className="user-score-bar-track">
                    <div className="user-score-bar-fill" style={{
                      width: `${Math.min(score * 100, 100)}%`,
                      background: riskColor(score),
                    }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.62rem', color:'var(--text-muted)', marginTop:2 }}>
                    <span>0 — Güvenli</span>
                    <span>0.50</span>
                    <span>1.0 — Kritik</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:12 }}>
                    {[
                      { label:'Temporal Çarpan', value:`${routeData?.risk_multiplier?.toFixed(2)}x`, color:'var(--text-primary)' },
                      { label:'Toplam Çarpan',   value:`${selectedRoute?.total_multiplier?.toFixed(2)}x`, color:'var(--accent-red)', highlight: true },
                      { label:'Trafik Çarpanı',  value: selectedRoute?.traffic_multiplier ? `${selectedRoute.traffic_multiplier?.toFixed(2)}x` : '—', color:'var(--accent-green)' },
                    ].map(({ label, value, color, highlight }) => (
                      <div key={label} style={{
                        background: highlight ? 'rgba(224,85,85,0.04)' : 'var(--bg-base)',
                        border: `1px solid ${highlight ? 'rgba(224,85,85,0.2)' : 'var(--border)'}`,
                        borderRadius: 8,
                        padding: '14px 10px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, fontWeight:600 }}>
                          {label}
                        </div>
                        <div style={{
                          fontFamily:'var(--font-mono)', fontSize:'1.5rem',
                          color, fontWeight:700, lineHeight:1,
                        }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedRoute?.risk_counts && (
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:8 }}>
                        Risk Dağılımı
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                        {[
                          { key:'Yuksek', label:'Yüksek', color:'var(--accent-red)' },
                          { key:'Orta',   label:'Orta',   color:'var(--accent-amber)' },
                          { key:'Dusuk',  label:'Düşük',  color:'var(--accent-green)' },
                        ].map(({ key, label, color }) => {
                          const count = selectedRoute.risk_counts[key] ?? 0;
                          const total = (selectedRoute.risk_counts.Yuksek ?? 0) + (selectedRoute.risk_counts.Orta ?? 0) + (selectedRoute.risk_counts.Dusuk ?? 0);
                          const pct   = total > 0 ? Math.round(count / total * 100) : 0;
                          return (
                            <div key={key} style={{
                              background: color + '0D',
                              border: `1px solid ${color}30`,
                              borderRadius:8, padding:'14px 10px', textAlign:'center',
                            }}>
                              <div style={{ fontSize:'0.62rem', fontWeight:600, color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                                {label}
                              </div>
                              <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.5rem', color, fontWeight:700, lineHeight:1 }}>
                                {count}
                              </div>
                              <div style={{ fontSize:'0.62rem', color, opacity:0.7, marginTop:4 }}>
                                %{pct}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </>
          )}

          {activePage === 'report' && (
            <>
              <button
                className={`user-report-btn${reportMode ? ' active' : ''}`}
                onClick={() => {
                  if (reportMode) {
                    setReportMode(false);
                    setReportLocation(null);
                    setShowReportForm(false);
                  } else {
                    setShowReportForm(true);
                  }
                }}
              >
                <Bell size={13} strokeWidth={2} />
                {reportMode ? 'Konum Seçimini İptal Et' : 'Bildirim Gönder'}
              </button>
              {reportMode && (
                <p style={{ fontSize: '0.72rem', color: 'var(--accent)', textAlign: 'center' }}>
                  Haritada olayın konumuna tıklayın...
                </p>
              )}
            </>
          )}

          <div className="user-footer">
            © 2026 NYC Trafik Risk Analizi — Tüm hakları saklıdır.
          </div>
        </aside>

        <aside className={`user-right-panel ${mobileInfoPanelOpen ? 'mobile-open' : ''}`}>
          <div className="user-rp-card">
            <button className="user-rp-header" onClick={() => setWeatherOpen(v => !v)}>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Cloud size={12} strokeWidth={2} /> Hava Durumu
                {displayWeather && <span className="top-bar-item" style={{ marginLeft:4, fontSize:'0.72rem' }}>
                  {displayWeather.temperature_2m ?? displayWeather.temperature}°C
                </span>}
              </span>
              <ChevronRight size={13} strokeWidth={2} style={{
                transition:'transform 0.2s',
                transform: weatherOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}/>
            </button>
            {weatherOpen && displayWeather && (
              <div className="user-rp-body">
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <WeatherIcon code={displayWeather.weathercode} size={28} />
                  <div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'1.4rem', color:'var(--text-primary)' }}>
                      {displayWeather.temperature_2m ?? displayWeather.temperature}°C
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>
                      {weatherLabel(displayWeather.weathercode)}
                    </div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                  {[
                    { label:'Rüzgar', value:`${displayWeather.windspeed_10m ?? displayWeather.windspeed} km/h` },
                    { label:'Yağış',  value:`${displayWeather.precipitation ?? 0} mm` },
                    { label:'Kar',    value:`${displayWeather.snowfall ?? 0} cm` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:4, padding:'5px 6px', textAlign:'center' }}>
                      <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.82rem', color:'var(--text-primary)', marginTop:2 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="user-rp-card">
            <button className="user-rp-header" onClick={() => setTrafficOpen(v => !v)}>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Navigation size={12} strokeWidth={2} /> Trafik Durumu
              </span>
              <ChevronRight size={13} strokeWidth={2} style={{
                transition:'transform 0.2s',
                transform: trafficOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}/>
            </button>
            {trafficOpen && (
              <div className="user-rp-body">
                {selectedRoute?.traffic?.eta_minutes ? (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {[
                      { label:'ETA',       value: formatDuration(selectedRoute.traffic.eta_minutes) },
                      { label:'Trafiksiz', value: formatDuration(selectedRoute.traffic.no_traffic_minutes) },
                      { label:'Gecikme',   value:`+${formatDuration(selectedRoute.traffic.delay_minutes)}`,
                        color: selectedRoute.traffic.delay_minutes > 10 ? 'var(--accent-red)' : 'var(--accent-green)' },
                      { label:'Mesafe',    value:`${selectedRoute.traffic.distance_km} km` },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:4, padding:'6px 8px' }}>
                        <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.9rem', color: color || 'var(--text-primary)', marginTop:2, fontWeight:500 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', padding:'4px 0' }}>
                    Rota analizi sonrası gösterilecek
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Saatlik Risk */}
          <div className="user-rp-card">
            <button className="user-rp-header" onClick={() => setHourlyOpen(v => !v)}>
              <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                <AlertTriangle size={12} strokeWidth={2} /> Saatlik Risk Dağılımı
              </span>
              <ChevronRight size={13} strokeWidth={2} style={{
                transition:'transform 0.2s',
                transform: hourlyOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              }}/>
            </button>
            {hourlyOpen && (
              <div className="user-rp-body">
                <HourlyRiskChart result={selectedRoute} />
              </div>
            )}
          </div>
        </aside>
        </>
        )}
      </div>

      {showReportForm && (
        <ReportForm
          location={reportLocation}
          onClose={() => {
            setShowReportForm(false);
            setReportLocation(null);
            setReportMode(false);
          }}
          onRequestLocation={(cat) => {
            setReportMode(true);
          }}
          onChangeLocation={() => {
            setReportLocation(null);
            setReportMode(true);
          }}
          onSubmit={() => {
            setShowReportForm(false);
            setReportLocation(null);
            setReportMode(false);
            fetchApprovedReports();
          }}
        />
      )}
    </div>
  );
}