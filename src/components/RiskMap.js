import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { LocateFixed } from 'lucide-react';
import { getGridStats, getHourlyGridStats } from '../api';
 
const DEFAULT_CENTER = [-74.006, 40.7128];
const DEFAULT_ZOOM   = 11;
const SIM_ZOOM       = 16; 

const computeBearing = (lat1, lon1, lat2, lon2) => {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360;
};

const haversineMetersLocal = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};
 
const NYC_BOUNDS = {
  minLat: 40.4774, maxLat: 40.9176,
  minLon: -74.2591, maxLon: -73.7004,
};
 
const isInNYCBounds = (lat, lon) =>
  lat >= NYC_BOUNDS.minLat && lat <= NYC_BOUNDS.maxLat &&
  lon >= NYC_BOUNDS.minLon && lon <= NYC_BOUNDS.maxLon;
 
const NYC_BOROUGHS = new Set([
  'new york', 'new york city', 'nyc',
  'manhattan', 'new york county',
  'brooklyn', 'kings county',
  'queens', 'queens county',
  'bronx', 'the bronx', 'bronx county',
  'staten island', 'richmond county',
]);
 
const isNYCAddress = (address) => {
  if (!address) return false;
 
  if (address.country_code && address.country_code !== 'us') return false;
 
  const state = (address.state || '').toLowerCase();
  if (state && state !== 'new york') return false;
 
  const candidates = [
    address.city,
    address.town,
    address.county,
    address.suburb,
    address.borough,
    address.district,
    address.municipality,
  ]
    .filter(Boolean)
    .map(v => v.toLowerCase());
 
  return candidates.some(v =>
    NYC_BOROUGHS.has(v) ||
    [...NYC_BOROUGHS].some(b => v.includes(b))
  );
};
 
const RISK_COLORS = {
  'Yuksek': '#d32f2f',
  'Orta'  : '#f57c00',
  'Dusuk' : '#388e3c',
};
 
const TILE_STYLES = {
  dark: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© Stadia Maps © OpenStreetMap',
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  },
  light: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap',
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  },
};
 
const weatherLabel = (code) => {
  if (code === 0) return 'Açık';
  if (code <= 3)  return 'Bulutlu';
  if (code <= 69) return 'Yağmurlu';
  if (code <= 79) return 'Karlı';
  return 'Fırtınalı';
};
 
async function reverseGeocode(lat, lon) {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&countrycodes=us&zoom=18&addressdetails=1`
    );
    const data = await res.json();
 
    if (!data.address || !isNYCAddress(data.address)) {
      return { name: null, isNYC: false };
    }
 
    const parts = [data.address.road, data.address.house_number].filter(Boolean);
    const name  = parts.length > 0
      ? parts.reverse().join(', ')
      : data.display_name?.split(', ').slice(0, 2).join(', ') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
 
    return { name, isNYC: true };
  } catch {
    return { name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, isNYC: isInNYCBounds(lat, lon) };
  }
}
 
async function fetchOsrmRoute(origin, dest) {
  try {
    const url  = `http://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();
    return data.routes?.[0]?.geometry || null;
  } catch {
    return null;
  }
}
 
const reportCategoryLabel = {
  ACCIDENT:      'Trafik Kazası',
  DANGEROUS_ROAD:'Tehlikeli Yol',
  TRAFFIC_JAM:   'Trafik Sıkışıklığı',
  OTHER:         'Diğer',
};

const ROUTE_COLORS = {
  en_hizli:            '#3b82f6',
  en_guvenli:          '#10b981',
  en_hizli_ve_guvenli: '#10b981',
  denge:               '#f59e0b',
};

export default function RiskMap({
  origin, destination, route, top5,
  onOriginSet, onDestinationSet, onRouteSet,
  onOriginClear, onDestClear,
  darkMode, result,
  routes, selectedRouteIndex, onRouteSelect,
  showGrid, setShowGrid,
  reportMode, onReportLocationSelect, approvedReports,
  showReportMarkers = true,
  showRouteData = true,
  viewMode = "default",
  selectedHour = 8,
  simulationCoord = null,
  simShowReports = true,
}) {
  const mapContainer = useRef(null);
  const map          = useRef(null);
  const markersRef   = useRef([]);
  const reportMarkersRef          = useRef([]);
  const reportModeRef             = useRef(false);
  const onReportLocationSelectRef = useRef(null);
  const onRouteSelectRef          = useRef(null);
  const simMarkerRef              = useRef(null); 
  const prevSimCoordRef           = useRef(null); 
  const lastBearingRef            = useRef(0);    

  const [gridData, setGridData]   = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [outOfBounds, setOutOfBounds] = useState(false);
  const [followMode, setFollowMode] = useState(true); 
  const fetchedRef = useRef(false);

  useEffect(() => { reportModeRef.current = reportMode; }, [reportMode]);
  useEffect(() => { onReportLocationSelectRef.current = onReportLocationSelect; }, [onReportLocationSelect]);
  useEffect(() => { onRouteSelectRef.current = onRouteSelect; }, [onRouteSelect]);

  useEffect(() => {
    if (!map.current || !showRouteData) return;

    const SEG_SUFFIXES = ['low', 'mid', 'high', 'unk'];
    const removeBRoutes = () => {
      for (let i = 0; i < 5; i++) {
        if (map.current?.getLayer(`broute-${i}`))      map.current.removeLayer(`broute-${i}`);
        if (map.current?.getSource(`broute-${i}-src`)) map.current.removeSource(`broute-${i}-src`);
        SEG_SUFFIXES.forEach(sfx => {
          if (map.current?.getLayer(`broute-${i}-${sfx}`))      map.current.removeLayer(`broute-${i}-${sfx}`);
          if (map.current?.getSource(`broute-${i}-${sfx}-src`)) map.current.removeSource(`broute-${i}-${sfx}-src`);
        });
      }
    };

    if (!routes || routes.length === 0) { removeBRoutes(); return; }

    const drawRoutes = () => {
      if (!map.current) return;
      removeBRoutes();

      routes.forEach((r, idx) => {
        const rawCoords = r.coords || []; 
        if (rawCoords.length < 2) return;
        const isSelected = idx === selectedRouteIndex;

        if (!isSelected) {
          const color    = ROUTE_COLORS[r.label] || '#6b7280';
          const mlCoords = rawCoords.map(([lat, lon]) => [lon, lat]);
          map.current.addSource(`broute-${idx}-src`, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: mlCoords } },
          });
          map.current.addLayer({
            id: `broute-${idx}`, type: 'line', source: `broute-${idx}-src`,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': color, 'line-width': 4, 'line-opacity': 0.4 },
          });
          map.current.on('click',      `broute-${idx}`, () => onRouteSelectRef.current?.(idx));
          map.current.on('mouseenter', `broute-${idx}`, () => { map.current.getCanvas().style.cursor = 'pointer'; });
          map.current.on('mouseleave', `broute-${idx}`, () => { map.current.getCanvas().style.cursor = ''; });
        } else {
          const levels  = r.coord_levels || [];
          const buckets = { Yuksek: [], Orta: [], Dusuk: [], Unknown: [] };
          for (let i = 0; i < rawCoords.length - 1; i++) {
            const [lat1, lon1] = rawCoords[i];
            const [lat2, lon2] = rawCoords[i + 1];
            const level = levels[i] || 'Unknown';
            (buckets[level] || buckets.Unknown).push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[lon1, lat1], [lon2, lat2]] },
            });
          }
          const segConfig = [
            { key: 'Dusuk',   color: '#10b981', sfx: 'low'  },
            { key: 'Orta',    color: '#f59e0b', sfx: 'mid'  },
            { key: 'Yuksek',  color: '#ef4444', sfx: 'high' },
            { key: 'Unknown', color: '#6b7280', sfx: 'unk'  },
          ];
          segConfig.forEach(({ key, color, sfx }) => {
            const feats = buckets[key];
            if (!feats || feats.length === 0) return;
            const layerId = `broute-${idx}-${sfx}`;
            map.current.addSource(`${layerId}-src`, {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: feats },
            });
            map.current.addLayer({
              id: layerId, type: 'line', source: `${layerId}-src`,
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': color, 'line-width': 6, 'line-opacity': 1.0 },
            });
          });
        }
      });
    };

    if (map.current.isStyleLoaded()) drawRoutes();
    else map.current.once('style.load', drawRoutes);

    return removeBRoutes;
  }, [routes, selectedRouteIndex, showRouteData]);

  useEffect(() => {
    if (map.current) return;
 
    const popupStyle = document.createElement('style');
    popupStyle.textContent = `
      .maplibregl-popup-content {
        background: #161b22 !important;
        color: #e0e0e0 !important;
        border: 1px solid #30363d !important;
        border-radius: 8px !important;
        padding: 12px !important;
        font-size: 0.85rem !important;
        box-shadow: 0 2px 12px rgba(0,0,0,0.5) !important;
      }
      .maplibregl-popup-tip { border-top-color: #161b22 !important; border-bottom-color: #161b22 !important; }
      .maplibregl-popup-close-button { color: #58a6ff !important; font-size: 1.1rem !important; }
    `;
    document.head.appendChild(popupStyle);
 
    map.current = new maplibregl.Map({
      container : mapContainer.current,
      style     : darkMode ? TILE_STYLES.dark : TILE_STYLES.light,
      center    : DEFAULT_CENTER,
      zoom      : DEFAULT_ZOOM,
      maxBounds : [
        [NYC_BOUNDS.minLon - 0.01, NYC_BOUNDS.minLat - 0.01],
        [NYC_BOUNDS.maxLon + 0.01, NYC_BOUNDS.maxLat + 0.01]
      ],
    });
 
    map.current.addControl(new maplibregl.NavigationControl(), 'top-left');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');


    const handleUserInteraction = (e) => {
      if (e.originalEvent) setFollowMode(false);
    };
    map.current.on('dragstart',   handleUserInteraction);
    map.current.on('zoomstart',   handleUserInteraction);
    map.current.on('rotatestart', handleUserInteraction);
    map.current.on('pitchstart',  handleUserInteraction);
 
    map.current.on('click', async (e) => {
      const features = map.current.isStyleLoaded()
        ? map.current.queryRenderedFeatures(e.point, { layers: ['grid-fill'] })
        : [];
      if (features.length > 0) return;

      const { lng: lon, lat } = e.lngLat;

      if (reportModeRef.current) {
        if (!isInNYCBounds(lat, lon)) return;
        const { name, isNYC } = await reverseGeocode(lat, lon);
        if (!isNYC) return;
        onReportLocationSelectRef.current?.({ lat, lon, name });
        return;
      }

      if (map.current._originSet && map.current._destSet) return;

      if (!isInNYCBounds(lat, lon)) {
        setOutOfBounds(true);
        setTimeout(() => setOutOfBounds(false), 3000);
        return;
      }
 
      const { name, isNYC } = await reverseGeocode(lat, lon);
      if (!isNYC) {
        setOutOfBounds(true);
        setTimeout(() => setOutOfBounds(false), 3000);
        return;
      }
 
      if (!map.current._originSet) {
        map.current._originSet = true;
        onOriginSet({ lat, lon, name });
      } else if (!map.current._destSet) {
        map.current._destSet = true;
        onDestinationSet({ lat, lon, name });
      } else {
        map.current._originSet = true;
        map.current._destSet   = false;
        onOriginSet({ lat, lon, name });
        onDestinationSet(null);
        onRouteSet(null);
      }
    });
 
    return () => { map.current?.remove(); map.current = null; };
  }, []);
 
  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(darkMode ? TILE_STYLES.dark : TILE_STYLES.light);
  }, [darkMode]);

  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = reportMode ? 'crosshair' : '';
  }, [reportMode]);

  useEffect(() => {
    if (!map.current) return;

    const addMarkers = () => {
      reportMarkersRef.current.forEach(m => m.remove());
      reportMarkersRef.current = [];

      if (!simShowReports) return;

      (approvedReports || []).forEach(report => {
        const lat = report.lat ?? report.latitude;
        const lon = report.lon ?? report.longitude;
        if (lat == null || lon == null) return;
        const catColors = {
          ACCIDENT:          '#e05555',
          TRAFFIC_VIOLATION: '#e8a030',
          ROAD_DAMAGE:       '#a78bfa',
          VEHICLE_BREAKDOWN: '#4a9eff',
          ROAD_OBSTRUCTION:  '#f472b6',
          OTHER:             '#6e8899',
        };
        const color    = catColors[report.category] || '#e8a030';
        const username = report.user?.username || '';
        const catLabel = reportCategoryLabel[report.category] || report.category;
        const el = document.createElement('div');
        el.style.cssText = 'cursor:pointer;display:flex;align-items:center;justify-content:center;';
        el.classList.add('report-marker-pulse');
        el.innerHTML = `<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="10,1 19,17 1,17" fill="${color}" fill-opacity="0.92" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>
          <line x1="10" y1="6" x2="10" y2="11" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="10" cy="13.5" r="0.8" fill="#fff"/>
        </svg>`;
        reportMarkersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lon, lat])
            .setPopup(new maplibregl.Popup().setHTML(
              `<strong>${catLabel}</strong><br/>${report.description || ''}<br/><small>${username}</small>`
            ))
            .addTo(map.current)
        );
      });
    };

    if (!showReportMarkers) {
      reportMarkersRef.current.forEach(m => m.remove());
      reportMarkersRef.current = [];
      return;
    }

    if (map.current.loaded()) {
      addMarkers();
    } else {
      map.current.once('load', addMarkers);
    }
  }, [approvedReports, showReportMarkers, simShowReports]);

  useEffect(() => {
    if (!map.current) return;

    if (simMarkerRef.current) {
      simMarkerRef.current.remove();
      simMarkerRef.current = null;
    }

    if (!simulationCoord) return;

    if (!document.getElementById('sim-marker-style')) {
      const s = document.createElement('style');
      s.id = 'sim-marker-style';
      s.textContent = `
        @keyframes simHaloPulse {
          0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.55; }
          50%  { transform: translate(-50%,-50%) scale(1.25); opacity: 0.15; }
          100% { transform: translate(-50%,-50%) scale(0.85); opacity: 0.55; }
        }
        .sim-marker-halo {
          position: absolute;
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(74,158,255,0.35);
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          animation: simHaloPulse 1.8s ease-in-out infinite;
          pointer-events: none;
        }
        .sim-marker-arrow {
          position: relative;
          display: block;
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
        }
      `;
      document.head.appendChild(s);
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;';

    const halo = document.createElement('div');
    halo.className = 'sim-marker-halo';
    wrapper.appendChild(halo);

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'sim-marker-arrow');
    arrow.setAttribute('width', '26');
    arrow.setAttribute('height', '26');
    arrow.setAttribute('viewBox', '0 0 26 26');
    arrow.innerHTML = `
      <path d="M13 1.5 L23.5 23 L13 17.5 L2.5 23 Z"
            fill="#4a9eff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    `;
    wrapper.appendChild(arrow);

    const isFirstCoord = !prevSimCoordRef.current;
    let bearing = lastBearingRef.current;
    if (!isFirstCoord) {
      const dist = haversineMetersLocal(
        prevSimCoordRef.current.lat, prevSimCoordRef.current.lon,
        simulationCoord.lat, simulationCoord.lon
      );
      if (dist > 5) {
        bearing = computeBearing(
          prevSimCoordRef.current.lat, prevSimCoordRef.current.lon,
          simulationCoord.lat, simulationCoord.lon
        );
        lastBearingRef.current = bearing;
      }
    }

    simMarkerRef.current = new maplibregl.Marker({
      element: wrapper,
      anchor: 'center',
      rotationAlignment: 'map',
      rotation: bearing,
    })
      .setLngLat([simulationCoord.lon, simulationCoord.lat])
      .addTo(map.current);

    const easeOptions = {
      center: [simulationCoord.lon, simulationCoord.lat],
      duration: 800,
    };

    if (isFirstCoord) {
      easeOptions.zoom    = SIM_ZOOM;
      easeOptions.pitch   = 45;
      easeOptions.bearing = bearing;
      setFollowMode(true);
      map.current.easeTo(easeOptions);
    } else if (followMode) {
      easeOptions.bearing = bearing;
      map.current.easeTo(easeOptions);
    }

    prevSimCoordRef.current = { lat: simulationCoord.lat, lon: simulationCoord.lon };

  }, [simulationCoord]);

  useEffect(() => {
    if (simulationCoord === null) {
      if (simMarkerRef.current) {
        simMarkerRef.current.remove();
        simMarkerRef.current = null;
      }
      if (prevSimCoordRef.current && map.current) {
        map.current.easeTo({ bearing: 0, pitch: 0, duration: 600 });
      }
      prevSimCoordRef.current = null;
      lastBearingRef.current  = 0;
      setFollowMode(true);
    }
  }, [simulationCoord]);
 
  useEffect(() => {
    if (map.current) {
      map.current._originSet = !!origin;
      map.current._destSet   = !!destination;
    }
  }, [origin, destination]);

  useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!showRouteData) return;

    if (origin) {
      const el = document.createElement('div');
      el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#1f6feb;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;';
      markersRef.current.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([origin.lon, origin.lat])
          .setPopup(new maplibregl.Popup().setHTML(`<strong>Kalkış</strong><br/>${origin.name}`))
          .addTo(map.current)
      );
    }
 
    if (destination) {
      const el = document.createElement('div');
      el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#f85149;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;';
      markersRef.current.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([destination.lon, destination.lat])
          .setPopup(new maplibregl.Popup().setHTML(`<strong>Varış</strong><br/>${destination.name}`))
          .addTo(map.current)
      );
    }
 
    if (showRouteData) {
      (top5 || []).forEach((pt, idx) => {
        const color = RISK_COLORS[pt.RISK_LEVEL] || '#e05555';
        const el    = document.createElement('div');
        el.style.cssText = 'cursor:pointer;display:flex;align-items:center;justify-content:center;';
        el.innerHTML = `<svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="11,1 21,19 1,19" fill="${color}" fill-opacity="0.95" stroke="rgba(255,255,255,0.8)" stroke-width="1" stroke-linejoin="round"/>
          <text x="11" y="16" text-anchor="middle" font-size="9" font-weight="700" font-family="sans-serif" fill="#fff">${idx + 1}</text>
        </svg>`;
        markersRef.current.push(
          new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([pt.merkez_lon, pt.merkez_lat])
            .setPopup(new maplibregl.Popup().setHTML(
              `<strong>Risk #${idx + 1}:</strong> ${pt.RISK_LEVEL}<br/>
               <strong>Skor:</strong> ${pt.ADJUSTED_SCORE?.toFixed(2)}<br/>
               <strong>Kaza:</strong> ${pt.kaza_sayisi}`
            ))
            .addTo(map.current)
        );
      });
    }
  }, [origin, destination, top5, showRouteData]);
 
  useEffect(() => {
    if (!map.current) return;

    const removeRoute = () => {
      ['route-high','route-medium','route-low','route-default'].forEach(id => {
        if (map.current.getLayer(id)) map.current.removeLayer(id);
      });
      ['route-high-src','route-medium-src','route-low-src','route-default-src'].forEach(id => {
        if (map.current.getSource(id)) map.current.removeSource(id);
      });
    };

    if (!showRouteData || !origin || !destination) { removeRoute(); return; }
    if (routes && routes.length > 0) { removeRoute(); return; }

    fetchOsrmRoute(origin, destination).then(geometry => {
      if (!geometry || !map.current) return;
      onRouteSet(geometry.coordinates.map(([lon, lat]) => [lat, lon]));
      removeRoute();

      const coords = geometry.coordinates; 

      if (!gridData || gridData.length === 0) {
        if (map.current.getSource('route-default-src')) {
          map.current.removeLayer('route-default');
          map.current.removeSource('route-default-src');
        }
        map.current.addSource('route-default-src', { type: 'geojson', data: { type: 'Feature', geometry } });
        map.current.addLayer({
          id: 'route-default', type: 'line', source: 'route-default-src',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#58a6ff', 'line-width': 5, 'line-opacity': 0.9 },
        });
        return;
      }

      const getSegmentRisk = (lon, lat) => {
        let minDist = Infinity;
        let risk = 'Dusuk';
        for (const cell of gridData) {
          const dLat = cell.merkez_lat - lat;
          const dLon = cell.merkez_lon - lon;
          const dist = dLat * dLat + dLon * dLon;
          if (dist < minDist) {
            minDist = dist;
            risk = cell.RISK_LEVEL;
          }
        }
        return risk;
      };

      const segments = { Yuksek: [], Orta: [], Dusuk: [] };
      for (let i = 0; i < coords.length - 1; i++) {
        const [lon, lat] = coords[i];
        const risk = getSegmentRisk(lon, lat);
        segments[risk].push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [coords[i], coords[i + 1]] },
        });
      }

      const riskConfig = [
        { key: 'Dusuk',   color: '#22c55e', width: 5, id: 'route-low' },
        { key: 'Orta',    color: '#f59e0b', width: 5, id: 'route-medium' },
        { key: 'Yuksek',  color: '#ef4444', width: 5, id: 'route-high' },
      ];

      riskConfig.forEach(({ key, color, width, id }) => {
        const segs = segments[key];
        if (!segs || segs.length === 0) return;
        const srcId = id + '-src';
        map.current.addSource(srcId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: segs },
        });
        map.current.addLayer({
          id, type: 'line', source: srcId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': color, 'line-width': width, 'line-opacity': 0.92 },
        });
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, showRouteData, gridData, routes]);
 
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    getGridStats()
      .then(data => setGridData(Array.isArray(data) ? data : []))
      .catch(() => setGridData([]));
    getHourlyGridStats()
      .then(res => { if (res?.hourly_counts) setHourlyData(res); })
      .catch(err => console.error("[hourly-grid-stats]", err));
  }, []);
 
  useEffect(() => {
    if (!map.current) return;

    const removeGrid = () => {
      if (map.current.getLayer('grid-fill'))   map.current.removeLayer('grid-fill');
      if (map.current.getLayer('grid-border')) map.current.removeLayer('grid-border');
      if (map.current.getSource('grid'))       map.current.removeSource('grid');
    };

    if (!showGrid || !gridData) { removeGrid(); return; }

    const buildFeatures = () => gridData.map(pt => {
      let fillColor, fillOpacity;
      if (viewMode === 'hourly' && hourlyData?.hourly_counts) {
        const counts = hourlyData.hourly_counts[pt.GRID_ID];
        const cnt    = counts ? counts[selectedHour] : 0;
        const ratio  = Math.min(cnt / (hourlyData.global_max || 1), 1);
        if (ratio === 0)      { fillColor = '#000000'; fillOpacity = 0;    }
        else if (ratio < 0.2) { fillColor = '#10b981'; fillOpacity = 0.55; }
        else if (ratio < 0.5) { fillColor = '#f59e0b'; fillOpacity = 0.55; }
        else                  { fillColor = '#ef4444';  fillOpacity = 0.55; }
      } else {
        fillColor   = pt.RISK_LEVEL === 'Yuksek' ? '#f85149' : pt.RISK_LEVEL === 'Orta' ? '#e3b341' : '#3fb950';
        fillOpacity = pt.RISK_LEVEL === 'Yuksek' ? 0.55 : pt.RISK_LEVEL === 'Orta' ? 0.35 : 0.2;
      }
      return {
        type: 'Feature',
        properties: { risk: pt.RISK_LEVEL, score: pt.DANGER_SCORE, kaza: pt.kaza_sayisi, fillColor, fillOpacity },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [pt.merkez_lon - 0.0025, pt.merkez_lat - 0.002],
            [pt.merkez_lon + 0.0025, pt.merkez_lat - 0.002],
            [pt.merkez_lon + 0.0025, pt.merkez_lat + 0.002],
            [pt.merkez_lon - 0.0025, pt.merkez_lat + 0.002],
            [pt.merkez_lon - 0.0025, pt.merkez_lat - 0.002],
          ]],
        },
      };
    });

    if (map.current.isStyleLoaded() && map.current.getSource('grid')) {
      map.current.getSource('grid').setData({ type: 'FeatureCollection', features: buildFeatures() });
      return;
    }

    const doAdd = () => {
      if (!map.current) return;
      if (map.current.getLayer('grid-fill'))   map.current.removeLayer('grid-fill');
      if (map.current.getLayer('grid-border')) map.current.removeLayer('grid-border');
      if (map.current.getSource('grid'))       map.current.removeSource('grid');

      map.current.addSource('grid', { type: 'geojson', data: { type: 'FeatureCollection', features: buildFeatures() } });
      map.current.addLayer({
        id: 'grid-fill', type: 'fill', source: 'grid',
        paint: {
          'fill-color'  : ['get', 'fillColor'],
          'fill-opacity': ['get', 'fillOpacity'],
        },
      });
      map.current.addLayer({
        id: 'grid-border', type: 'line', source: 'grid',
        paint: { 'line-color': '#ffffff', 'line-width': 0.3, 'line-opacity': 0.2 },
      });
      map.current.on('click', 'grid-fill', (e) => {
        const p = e.features[0].properties;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `<strong>Risk Seviyesi:</strong> ${p.risk}<br/>
             <strong>Tehlike Skoru:</strong> ${parseFloat(p.score).toFixed(2)}<br/>
             <strong>Kaza Sayısı:</strong> ${p.kaza}`
          )
          .addTo(map.current);
      });
      map.current.on('mouseenter', 'grid-fill', () => { map.current.getCanvas().style.cursor = 'pointer'; });
      map.current.on('mouseleave', 'grid-fill', () => { map.current.getCanvas().style.cursor = ''; });
    };

    if (map.current.isStyleLoaded()) doAdd();
    else map.current.once('style.load', doAdd);
  }, [showGrid, gridData, viewMode, selectedHour, hourlyData]);
 
  const showWeather = result?.weather;
  const showTraffic = result?.traffic && result.traffic.source !== 'not_available' && result.traffic.eta_minutes;

  const handleRecenter = () => {
    if (!map.current || !simulationCoord) return;
    setFollowMode(true);
    map.current.easeTo({
      center : [simulationCoord.lon, simulationCoord.lat],
      zoom   : SIM_ZOOM,
      pitch  : 45,
      bearing: lastBearingRef.current,
      duration: 800,
    });
  };

  return (
    <div className="map-wrapper card" style={{ position: 'relative', height: '100%' }}>
      {showGrid && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 14,
          zIndex: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(10,12,15,0.7)',
          backdropFilter: 'blur(8px)',
          padding: '5px 10px',
          borderRadius: 4,
          border: '1px solid rgba(46,61,77,0.5)',
        }}>
          {[['#3dbd78','Düşük'],['#e8a030','Orta'],['#e05555','Yüksek']].map(([color,label]) => (
            <span key={label} style={{display:'flex', alignItems:'center', gap:4, fontSize:'0.72rem', color:'#c8d8e8'}}>
              <span style={{width:8, height:8, borderRadius:'50%', background:color, display:'inline-block'}}/>
              {label}
            </span>
          ))}
        </div>
      )}


 
      {outOfBounds && (
        <div style={{
          position  : 'absolute',
          top       : 80,
          left      : '50%',
          transform : 'translateX(-50%)',
          zIndex    : 20,
          background: '#f85149',
          color     : '#fff',
          padding   : '8px 16px',
          borderRadius: 8,
          fontSize  : '0.85rem',
          fontWeight: 600,
          boxShadow : '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          Lütfen New York City sınırları içinde bir nokta seçin
        </div>
      )}
 
      {(showWeather || showTraffic) && (
        <div style={{
          position    : 'absolute',
          top         : 60,
          right       : 12,
          zIndex      : 10,
          background  : darkMode ? 'rgba(22,27,34,0.95)' : 'rgba(255,255,255,0.95)',
          color       : darkMode ? '#e0e0e0' : '#212121',
          borderRadius: 10,
          padding     : '10px 14px',
          fontSize    : '0.8rem',
          boxShadow   : '0 2px 10px rgba(0,0,0,0.4)',
          minWidth    : 155,
          border      : darkMode ? '1px solid #30363d' : '1px solid #e0e0e0',
          lineHeight  : 1.6,
        }}>
          {showWeather && (
            <div style={{ marginBottom: showTraffic ? 10 : 0 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: darkMode ? '#58a6ff' : '#1a237e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hava Durumu
              </div>
              <div>{result.weather.temperature}°C — {weatherLabel(result.weather.weathercode)}</div>
              <div style={{ opacity: 0.7 }}>Rüzgar: {result.weather.windspeed} km/h</div>
              <div style={{ opacity: 0.7 }}>Yağış: {result.weather.precipitation} mm</div>
            </div>
          )}
          {showTraffic && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4, color: darkMode ? '#58a6ff' : '#1a237e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Trafik
              </div>
              <div>ETA: {result.traffic.eta_minutes} dk</div>
              <div style={{ color: result.traffic.delay_minutes > 10 ? '#f85149' : '#3fb950' }}>
                Gecikme: +{result.traffic.delay_minutes} dk
              </div>
              <div style={{ opacity: 0.7 }}>{result.traffic.distance_km} km</div>
            </div>
          )}
        </div>
      )}
 
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      {simulationCoord && !followMode && (
        <button
          onClick={handleRecenter}
          style={{
            position: 'absolute',
            bottom: 28,
            right: 12,
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(10,12,15,0.85)',
            border: '1px solid rgba(74,158,255,0.5)',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#4a9eff',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          <LocateFixed size={14} strokeWidth={2} />
          Ortala
        </button>
      )}
    </div>
  );
}