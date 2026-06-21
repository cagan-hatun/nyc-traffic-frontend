import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

const DEFAULT_CENTER = [-74.006, 40.7128];
const DEFAULT_ZOOM   = 11;

const NYC_BOUNDS = {
  minLat: 40.4774, maxLat: 40.9176,
  minLon: -74.2591, maxLon: -73.7004,
};

const isInNYCBounds = (lat, lon) =>
  lat >= NYC_BOUNDS.minLat && lat <= NYC_BOUNDS.maxLat &&
  lon >= NYC_BOUNDS.minLon && lon <= NYC_BOUNDS.maxLon;

const NYC_BOROUGHS = new Set([
  'new york', 'new york city', 'nyc', 'manhattan', 'new york county',
  'brooklyn', 'kings county', 'queens', 'queens county',
  'bronx', 'the bronx', 'bronx county', 'staten island', 'richmond county',
]);

const isNYCAddress = (address) => {
  if (!address) return false;
  if (address.country_code && address.country_code !== 'us') return false;
  const state = (address.state || '').toLowerCase();
  if (state && state !== 'new york') return false;
  const candidates = [address.city, address.town, address.county, address.suburb, address.borough]
    .filter(Boolean).map(v => v.toLowerCase());
  return candidates.some(v => NYC_BOROUGHS.has(v) || [...NYC_BOROUGHS].some(b => v.includes(b)));
};

async function reverseGeocode(lat, lon) {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&countrycodes=us&zoom=18&addressdetails=1`);
    const data = await res.json();
    if (!data.address || !isNYCAddress(data.address)) return { name: null, isNYC: false };
    const parts = [data.address.road, data.address.house_number].filter(Boolean);
    const name  = parts.length > 0
      ? parts.reverse().join(', ')
      : data.display_name?.split(', ').slice(0, 2).join(', ') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    return { name, isNYC: true };
  } catch {
    return { name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, isNYC: isInNYCBounds(lat, lon) };
  }
}

export default function ReportMap({ reportMode, onLocationSelect, approvedReports, darkMode }) {
  const mapContainer  = useRef(null);
  const map           = useRef(null);
  const markerRef     = useRef(null);
  const reportMarkers = useRef([]);

  const TILE_URL = darkMode
    ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png'
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  useEffect(() => {
    if (map.current) return;
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: [TILE_URL], tileSize: 256, attribution: '© OpenStreetMap' } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      maxBounds: [
        [NYC_BOUNDS.minLon - 0.01, NYC_BOUNDS.minLat - 0.01],
        [NYC_BOUNDS.maxLon + 0.01, NYC_BOUNDS.maxLat + 0.01],
      ],
    });
    map.current.addControl(new maplibregl.NavigationControl(), 'top-left');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-left');
    return () => { map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!map.current) return;
    const handler = async (e) => {
      if (!reportMode) return;
      const { lng: lon, lat } = e.lngLat;
      if (!isInNYCBounds(lat, lon)) return;
      const { name, isNYC } = await reverseGeocode(lat, lon);
      if (!isNYC) return;
      markerRef.current?.remove();
      const el = document.createElement('div');
      el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#4a9eff;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);';
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(map.current);
      onLocationSelect({ lat, lon, name });
    };
    map.current.on('click', handler);
    return () => map.current?.off('click', handler);
  }, [reportMode, onLocationSelect]);

  useEffect(() => {
    if (!map.current) return;
    map.current.getCanvas().style.cursor = reportMode ? 'crosshair' : '';
  }, [reportMode]);

  useEffect(() => {
    if (!map.current) return;
    const addMarkers = () => {
      reportMarkers.current.forEach(m => m.remove());
      reportMarkers.current = [];
      (approvedReports || []).forEach(report => {
        const lat = report.lat ?? report.latitude;
        const lon = report.lon ?? report.longitude;
        if (lat == null || lon == null) return;
        const el = document.createElement('div');
        el.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#e8a030;border:2px solid #fff;box-shadow:0 0 5px rgba(232,160,48,0.5);cursor:pointer;';
        reportMarkers.current.push(
          new maplibregl.Marker({ element: el })
            .setLngLat([lon, lat])
            .setPopup(new maplibregl.Popup().setHTML(
              `<strong>${report.category || ''}</strong><br/>${report.description || ''}`
            ))
            .addTo(map.current)
        );
      });
    };
    if (map.current.loaded()) addMarkers();
    else map.current.once('load', addMarkers);
  }, [approvedReports]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
      {reportMode && (
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(74,158,255,0.15)', border: '1px solid var(--accent)',
          borderRadius: 8, padding: '6px 16px', fontSize: '0.75rem', color: 'var(--accent)',
          zIndex: 5, pointerEvents: 'none',
        }}>
          Olayın gerçekleştiği yere tıklayın
        </div>
      )}
    </div>
  );
}
