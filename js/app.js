(() => {
  'use strict';

  // 1. Service Worker & Network Status
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  function updateNetStatus() {
    const dot = document.getElementById('net-dot');
    const txt = document.getElementById('net-text');
    if (navigator.onLine) {
      dot.classList.remove('offline');
      txt.textContent = 'متصل';
    } else {
      dot.classList.add('offline');
      txt.textContent = 'أوفلاين';
    }
  }
  window.addEventListener('online', updateNetStatus);
  window.addEventListener('offline', updateNetStatus);
  updateNetStatus();

  function showToast(msg, ms = 2800) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // 2. Plus Code & Haversine Helpers
  const OLC_CHARS = '23456789CFGHJMPQRVWX';
  function encodePlusCode(lat, lon) {
    lat = Math.min(Math.max(lat + 90.0, 0.0), 179.999999);
    lon = Math.min(Math.max(lon + 180.0, 0.0), 359.999999);
    let latVal = Math.round(lat * 8000), lonVal = Math.round(lon * 8000);
    const latD = [], lonD = [];
    for (let i = 0; i < 5; i++) {
      latD.push(OLC_CHARS[latVal % 20]); lonD.push(OLC_CHARS[lonVal % 20]);
      latVal = Math.floor(latVal / 20); lonVal = Math.floor(lonVal / 20);
    }
    latD.reverse(); lonD.reverse();
    let res = '';
    for (let i = 0; i < 5; i++) { res += latD[i] + lonD[i]; if (i === 3) res += '+'; }
    return res;
  }

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // 3. Regions & Category Taxonomy
  const REGIONS = [
    { code: 'U01_Ibb_City', name_ar: 'مدينة إب (المركز)', name_en: 'Ibb City', lat: 13.9685, lng: 44.1680, zoom: 16.5, kb: 340 },
    { code: 'D02_Al_Dhihar', name_ar: 'مديرية الظهار', name_en: 'Al Dhihar', lat: 13.9789, lng: 44.1525, zoom: 16, kb: 232 },
    { code: 'D03_Al_Mashannah', name_ar: 'مديرية المشنة', name_en: 'Al Mashannah', lat: 13.9571, lng: 44.1815, zoom: 16, kb: 263 },
    { code: 'D01_Ibb', name_ar: 'مديرية إب (ريف إب)', name_en: 'Ibb District', lat: 13.9667, lng: 44.1833, zoom: 15, kb: 424 },
    { code: 'D04_Jiblah', name_ar: 'مديرية جبلة', name_en: 'Jiblah', lat: 13.9241, lng: 44.1459, zoom: 16, kb: 195 },
    { code: 'U03_Al_Qaidah_City', name_ar: 'مدينة القاعدة', name_en: 'Al Qaidah City', lat: 13.7572, lng: 44.1388, zoom: 16.5, kb: 73 },
    { code: 'U04_Yarim_City', name_ar: 'مدينة يريم', name_en: 'Yarim City', lat: 14.2965, lng: 44.3757, zoom: 16.5, kb: 47 },
    { code: 'U02_Al_Udayn_City', name_ar: 'مدينة العدين', name_en: 'Al Udayn City', lat: 13.9700, lng: 43.9900, zoom: 16.5, kb: 20 },
    { code: 'U05_Dhi_As_Sufal_City', name_ar: 'مدينة ذي السفال', name_en: 'Dhi As Sufal', lat: 13.8355, lng: 44.1103, zoom: 16.5, kb: 30 },
    { code: 'U06_Al_Makhadir_City', name_ar: 'مدينة المخادر', name_en: 'Al Makhadir', lat: 14.1111, lng: 44.1993, zoom: 16.5, kb: 27 },
    { code: 'U07_An_Nadirah_City', name_ar: 'مدينة النادرة', name_en: 'An Nadirah', lat: 14.1015, lng: 44.4795, zoom: 16.5, kb: 29 },
    { code: 'U08_As_Saddah_City', name_ar: 'مدينة السدة', name_en: 'As Saddah', lat: 14.1661, lng: 44.3751, zoom: 16.5, kb: 8 },
    { code: 'D05_Badan', name_ar: 'مديرية بعدان', name_en: "Ba'dan", lat: 13.9889, lng: 44.3231, zoom: 15, kb: 102 },
    { code: 'D06_As_Sabrah', name_ar: 'مديرية السبرة', name_en: 'As Sabrah', lat: 13.9160, lng: 44.3240, zoom: 15, kb: 65 },
    { code: 'D07_As_Sayyani', name_ar: 'مديرية السياني', name_en: 'As Sayyani', lat: 13.8139, lng: 44.1613, zoom: 15, kb: 112 },
    { code: 'D08_Dhi_As_Sufal', name_ar: 'مديرية ذي السفال', name_en: 'Dhi As Sufal', lat: 13.8355, lng: 44.1103, zoom: 15, kb: 129 },
    { code: 'D09_Mudhaykhirah', name_ar: 'مديرية مذيخرة', name_en: 'Mudhaykhirah', lat: 13.8661, lng: 43.9689, zoom: 15, kb: 156 },
    { code: 'D10_Al_Udayn', name_ar: 'مديرية العدين', name_en: 'Al Udayn', lat: 13.9700, lng: 43.9900, zoom: 15, kb: 150 },
    { code: 'D11_Far_Al_Udayn', name_ar: 'مديرية فرع العدين', name_en: 'Far Al Udayn', lat: 13.8997, lng: 43.8081, zoom: 15, kb: 184 },
    { code: 'D12_Hazm_Al_Udayn', name_ar: 'مديرية حزم العدين', name_en: 'Hazm Al Udayn', lat: 14.1146, lng: 43.9045, zoom: 15, kb: 35 },
    { code: 'D13_Hubaysh', name_ar: 'مديرية حبيش', name_en: 'Hubaysh', lat: 14.1161, lng: 44.0819, zoom: 15, kb: 96 },
    { code: 'D14_Al_Makhadir', name_ar: 'مديرية المخادر', name_en: 'Al Makhadir', lat: 14.1111, lng: 44.1993, zoom: 15, kb: 113 },
    { code: 'D15_Al_Qafr', name_ar: 'مديرية القفر', name_en: 'Al Qafr', lat: 14.2500, lng: 44.0800, zoom: 14.5, kb: 39 },
    { code: 'D16_Yarim', name_ar: 'مديرية يريم', name_en: 'Yarim', lat: 14.2965, lng: 44.3757, zoom: 15, kb: 137 },
    { code: 'D17_Ar_Radmah', name_ar: 'مديرية الرضمة', name_en: 'Ar Radmah', lat: 14.2000, lng: 44.5900, zoom: 15, kb: 63 },
    { code: 'D18_As_Saddah', name_ar: 'مديرية السدة', name_en: 'As Saddah', lat: 14.1661, lng: 44.3751, zoom: 15, kb: 106 },
    { code: 'D19_An_Nadirah', name_ar: 'مديرية النادرة', name_en: 'An Nadirah', lat: 14.1015, lng: 44.4795, zoom: 15, kb: 130 },
    { code: 'D20_Ash_Shair', name_ar: 'مديرية الشعر', name_en: "Ash Sha'ir", lat: 14.0139, lng: 44.3965, zoom: 15, kb: 82 }
  ];

  const CAT_GROUPS = {
    all: null,
    health: new Set(['hospital', 'clinic', 'pharmacy']),
    food: new Set(['restaurant', 'cafe', 'bakery']),
    mosque: new Set(['mosque']),
    edu: new Set(['school', 'university', 'bookstore']),
    shop: new Set(['shop', 'supermarket', 'clothing', 'furniture', 'jewelry', 'electronics', 'salon']),
    biz: new Set(['bank', 'company']),
    hotel: new Set(['hotel']),
    gas: new Set(['gas', 'auto']),
    street: new Set(['street'])
  };

  const CAT_AR = {
    shop: 'متجر / محل تجاري', hospital: 'مستشفى', clinic: 'عيادة / مركز طبي',
    pharmacy: 'صيدلية', restaurant: 'مطعم', cafe: 'مقهى', bakery: 'مخبز',
    mosque: 'مسجد', school: 'مدرسة', university: 'جامعة / معهد',
    bookstore: 'مكتبة / قرطاسية', supermarket: 'سوبرماركت', bank: 'بنك / صرافة',
    company: 'شركة / مكتب', hotel: 'فندق', gas: 'محطة وقود', auto: 'خدمات سيارات',
    street: 'شارع / طريق', park: 'حديقة / متنزه', gym: 'نادي رياضي',
    electronics: 'إلكترونيات', furniture: 'أثاث ومفروشات', jewelry: 'مجوهرات',
    clothing: 'ملابس', salon: 'صالون تجميل'
  };

  // 4. MapLibre + PMTiles Init
  maplibregl.setRTLTextPlugin(
    'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
    true
  );

  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);

  const PM_BASE = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + '/pmtiles';

  const map = new maplibregl.Map({
    container: 'map',
    center: [44.1680, 13.9685],
    zoom: 16.5,
    pitch: 52,
    bearing: -15,
    maxZoom: 20,
    minZoom: 8,
    antialias: true,
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        gov_pm:      { type: 'vector', url: `pmtiles://${PM_BASE}/governorate.pmtiles` },
        dist_pm:     { type: 'vector', url: `pmtiles://${PM_BASE}/districts.pmtiles` },
        base_pm:     { type: 'vector', url: `pmtiles://${PM_BASE}/base.pmtiles` },
        roads_pm:    { type: 'vector', url: `pmtiles://${PM_BASE}/roads.pmtiles` },
        bld_low_pm:  { type: 'vector', url: `pmtiles://${PM_BASE}/buildings_z14_17.pmtiles` },
        bld_high_pm: { type: 'vector', url: `pmtiles://${PM_BASE}/buildings_z18.pmtiles` },
        places_pm:   { type: 'vector', url: `pmtiles://${PM_BASE}/places.pmtiles` },
        sett_pm:     { type: 'vector', url: `pmtiles://${PM_BASE}/settlements.pmtiles` },
        google_sat: {
          type: 'raster',
          tiles: ['https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
          tileSize: 256, maxzoom: 19
        },
        google_labels: {
          type: 'raster',
          tiles: ['https://mt0.google.com/vt/lyrs=h&hl=ar&gl=YE&x={x}&y={y}&z={z}', 'https://mt1.google.com/vt/lyrs=h&hl=ar&gl=YE&x={x}&y={y}&z={z}'],
          tileSize: 256, maxzoom: 19
        },
        google_hybrid: {
          type: 'raster',
          tiles: ['https://mt0.google.com/vt/lyrs=y&hl=ar&gl=YE&x={x}&y={y}&z={z}', 'https://mt1.google.com/vt/lyrs=y&hl=ar&gl=YE&x={x}&y={y}&z={z}'],
          tileSize: 256, maxzoom: 19
        }
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#f1f5f9' } },
        { id: 'raster-sat', type: 'raster', source: 'google_sat', layout: { visibility: 'none' } },
        { id: 'raster-hybrid', type: 'raster', source: 'google_hybrid', layout: { visibility: 'none' } },
        {
          id: 'landuse-fill', type: 'fill', source: 'base_pm', 'source-layer': 'landuse',
          paint: {
            'fill-color': ['match', ['get', 'subtype'], 'park', '#bbf7d0', 'forest', '#86efac', 'agriculture', '#dcfce7', 'commercial', '#fef08a', '#e2e8f0'],
            'fill-opacity': 0.55
          }
        },
        { id: 'water-fill', type: 'fill', source: 'base_pm', 'source-layer': 'water', paint: { 'fill-color': '#7dd3fc', 'fill-opacity': 0.85 } },
        { id: 'water-line', type: 'line', source: 'base_pm', 'source-layer': 'water', paint: { 'line-color': '#38bdf8', 'line-width': 2 } },
        { id: 'gov-line', type: 'line', source: 'gov_pm', 'source-layer': 'governorate', paint: { 'line-color': '#f59e0b', 'line-width': 2.2, 'line-dasharray': [4, 2] } },
        { id: 'dist-line', type: 'line', source: 'dist_pm', 'source-layer': 'district_area', paint: { 'line-color': '#10b981', 'line-width': 1.2, 'line-opacity': 0.65 } },
        {
          id: 'roads-casing', type: 'line', source: 'roads_pm', 'source-layer': 'segment',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#94a3b8',
            'line-width': ['interpolate', ['linear'], ['zoom'], 11, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 3.5, 1.2], 15, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 10, ['secondary', 'tertiary'], 7, 4], 19, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 22, ['secondary', 'tertiary'], 16, 10]]
          }
        },
        {
          id: 'roads-fill', type: 'line', source: 'roads_pm', 'source-layer': 'segment',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#f59e0b', 'primary', '#fbbf24', ['secondary', 'tertiary'], '#fef08a', '#ffffff'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 11, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 2.2, 0.7], 15, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 7.5, ['secondary', 'tertiary'], 5, 2.5], 19, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 18, ['secondary', 'tertiary'], 13, 7.5]]
          }
        },
        {
          id: 'buildings-3d-low', type: 'fill-extrusion', source: 'bld_low_pm', 'source-layer': 'building',
          minzoom: 14, maxzoom: 18,
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'height'], 8], 4, '#e2e8f0', 12, '#cbd5e1', 25, '#94a3b8'],
            'fill-extrusion-height': ['coalesce', ['get', 'height'], 8],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.90
          }
        },
        {
          id: 'buildings-3d-high', type: 'fill-extrusion', source: 'bld_high_pm', 'source-layer': 'building',
          minzoom: 18,
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'height'], 9], 4, '#e2e8f0', 12, '#cbd5e1', 25, '#94a3b8'],
            'fill-extrusion-height': ['coalesce', ['get', 'height'], 9],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.92
          }
        },
        { id: 'raster-glabels', type: 'raster', source: 'google_labels', layout: { visibility: 'none' } },
        {
          id: 'road-labels', type: 'symbol', source: 'roads_pm', 'source-layer': 'segment',
          minzoom: 15, filter: ['has', 'name'],
          layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-max-angle': 30 },
          paint: { 'text-color': '#1e293b', 'text-halo-color': '#ffffff', 'text-halo-width': 2.2 }
        },
        {
          id: 'district-labels', type: 'symbol', source: 'dist_pm', 'source-layer': 'district_area',
          minzoom: 9, maxzoom: 15,
          layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 13 },
          paint: { 'text-color': '#065f46', 'text-halo-color': '#ffffff', 'text-halo-width': 2.5 }
        },
        {
          id: 'settlement-labels', type: 'symbol', source: 'sett_pm', 'source-layer': 'settlement',
          minzoom: 12.5,
          layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10.5, 16, 13], 'text-padding': 4 },
          paint: { 'text-color': '#0369a1', 'text-halo-color': '#ffffff', 'text-halo-width': 2.2 }
        },
        {
          id: 'ov-places-dots', type: 'circle', source: 'places_pm', 'source-layer': 'place',
          minzoom: 13,
          paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 3.5, 18, 6], 'circle-color': '#10b981', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff' }
        },
        {
          id: 'ov-places-labels', type: 'symbol', source: 'places_pm', 'source-layer': 'place',
          minzoom: 13.5,
          layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-offset': [0, 1.1], 'text-anchor': 'top' },
          paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 2.2 }
        }
      ]
    }
  });

  // 5. Data Stores & Dynamic GeoJSON Layers
  const SEARCH_STORE = [];
  const SEARCH_SEEN = new Set();
  const LOADED_SHARDS = new Map();
  let activeCatFilter = 'all';
  let is3D = true;
  let pickMode = null; // 'origin' | 'dest' | 'contrib'
  let dirProfile = 'driving';
  let dirOrigin = null;
  let dirDest = null;
  let lastSelectedPlace = null;

  function addSearchItem(item) {
    const key = `${item.name}|${item.lat.toFixed(4)}|${item.lng.toFixed(4)}`;
    if (SEARCH_SEEN.has(key)) return;
    SEARCH_SEEN.add(key);
    SEARCH_STORE.push(item);
  }

  // Load core_lite immediately (105 KB), then core_index (684 KB) lazily
  fetch('./data/core_lite.json')
    .then(r => r.json())
    .then(core => {
      (core.overture_places || []).forEach(p => {
        addSearchItem({ name: p.n, cat: p.c || 'company', catAr: p.ca || 'منشأة', lat: p.lat, lng: p.lng, reg: 'محافظة إب', phone: p.ph, web: p.w, src: 'Overture' });
      });
      (core.districts || []).forEach(d => {
        addSearchItem({ name: d.names?.ar || d.name, cat: 'district', catAr: 'مديرية', lat: d.lat, lng: d.lon, reg: 'محافظة إب', src: 'إداري' });
      });
    }).catch(() => {});

  setTimeout(() => {
    fetch('./data/core_index.json')
      .then(r => r.json())
      .then(idx => {
        (idx.major_settlements || []).forEach(s => {
          addSearchItem({ name: s[0], cat: 'settlement', catAr: 'قرية / محلة', lat: s[4], lng: s[5], reg: 'محافظة إب', src: 'التجمعات السكانية' });
        });
        (idx.priority_pois || []).forEach(p => {
          addSearchItem({ name: p[0], cat: p[1] || 'shop', catAr: CAT_AR[p[1]] || p[1], lat: p[2], lng: p[3], reg: p[7] || 'محافظة إب', src: 'المسح الميداني' });
        });
      }).catch(() => {});
  }, 1200);

  // User Contributions Storage
  const CONTRIB_KEY = 'ibb_field_contributions_v1';
  function getContribs() {
    try { return JSON.parse(localStorage.getItem(CONTRIB_KEY) || '[]'); } catch { return []; }
  }
  function saveContribs(list) {
    localStorage.setItem(CONTRIB_KEY, JSON.stringify(list));
    refreshUserLayer();
    renderContribList();
  }

  function refreshUserLayer() {
    if (!map.getSource('user-pois')) return;
    const list = getContribs();
    map.getSource('user-pois').setData({
      type: 'FeatureCollection',
      features: list.map(c => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(c.lng), Number(c.lat)] },
        properties: { id: c.id, name: c.name, cat: c.cat, catAr: CAT_AR[c.cat] || c.cat, phone: c.phone || '', notes: c.notes || '', status: c.status || 'pending', src: 'مساهمة ميدانية' }
      }))
    });
  }

  // On-demand Regional Shard Streaming (Z14.5+)
  async function loadNearestShard(lat, lng) {
    let best = REGIONS[0], bestDist = 1e9;
    for (const r of REGIONS) {
      const d = haversineKm(lat, lng, r.lat, r.lng);
      if (d < bestDist) { bestDist = d; best = r; }
    }
    if (LOADED_SHARDS.has(best.code)) {
      updateShardLayer();
      return;
    }
    try {
      const res = await fetch(`./data/shards/${best.code}.json`);
      if (!res.ok) return;
      const rows = await res.json();
      LOADED_SHARDS.set(best.code, rows);
      rows.forEach(r => {
        addSearchItem({ name: r[0], cat: r[1] || 'shop', catAr: CAT_AR[r[1]] || r[1], lat: r[2], lng: r[3], reg: r[7] || best.name_ar, src: 'المسح الميداني' });
      });
      updateShardLayer();
    } catch {}
  }

  function updateShardLayer() {
    if (!map.getSource('shard-pois')) return;
    const allowed = CAT_GROUPS[activeCatFilter];
    const bounds = map.getBounds();
    const minLng = bounds.getWest() - 0.01, maxLng = bounds.getEast() + 0.01;
    const minLat = bounds.getSouth() - 0.01, maxLat = bounds.getNorth() + 0.01;

    const features = [];
    for (const rows of LOADED_SHARDS.values()) {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const lat = r[2], lng = r[3], cat = r[1] || 'shop';
        if (allowed && !allowed.has(cat)) continue;
        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) continue;
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { name: r[0], cat, catAr: CAT_AR[cat] || cat, reg: r[7] || 'محافظة إب', src: 'المسح الميداني' }
        });
        if (features.length >= 1200) break;
      }
      if (features.length >= 1200) break;
    }
    map.getSource('shard-pois').setData({ type: 'FeatureCollection', features });
  }

  map.on('load', () => {
    map.addSource('shard-pois', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'shard-pois-dots', type: 'circle', source: 'shard-pois', minzoom: 14.5,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14.5, 3.5, 18, 6.5],
        'circle-color': ['match', ['get', 'cat'],
          'hospital', '#ef4444', 'clinic', '#ef4444', 'pharmacy', '#f43f5e',
          'mosque', '#10b981', 'restaurant', '#f59e0b', 'cafe', '#f59e0b',
          'school', '#3b82f6', 'university', '#6366f1', 'bank', '#8b5cf6',
          'hotel', '#ec4899', 'gas', '#eab308', '#0ea5e9'],
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff'
      }
    });
    map.addLayer({
      id: 'shard-pois-labels', type: 'symbol', source: 'shard-pois', minzoom: 15.8,
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-padding': 4 },
      paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }
    });

    map.addSource('user-pois', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'user-pois-dots', type: 'circle', source: 'user-pois',
      paint: { 'circle-radius': 7, 'circle-color': '#f59e0b', 'circle-stroke-width': 2, 'circle-stroke-color': '#0f172a' }
    });
    map.addLayer({
      id: 'user-pois-labels', type: 'symbol', source: 'user-pois',
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top' },
      paint: { 'text-color': '#b45309', 'text-halo-color': '#ffffff', 'text-halo-width': 2.2 }
    });

    map.addSource('route-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'route-line-layer', type: 'line', source: 'route-line',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#38bdf8', 'line-width': 6, 'line-opacity': 0.9 }
    });

    map.addSource('route-pts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'route-pts-layer', type: 'circle', source: 'route-pts',
      paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'kind'], 'origin', '#10b981', '#ef4444'], 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff' }
    });

    refreshUserLayer();
    const c = map.getCenter();
    loadNearestShard(c.lat, c.lng);
  });

  map.on('moveend zoomend', () => {
    const c = map.getCenter();
    const z = map.getZoom();
    document.getElementById('status-zoom').innerHTML = `الزوم: <strong style="color:#34d399;">${z.toFixed(1)}</strong> | WebGL 3D + PMTiles`;
    document.getElementById('status-coords').textContent = `خط العرض: ${c.lat.toFixed(6)}° | خط الطول: ${c.lng.toFixed(6)}° | Plus Code: ${encodePlusCode(c.lat, c.lng)}`;
    if (z >= 14.5) loadNearestShard(c.lat, c.lng);
  });

  map.on('mousemove', (e) => {
    const { lat, lng } = e.lngLat;
    document.getElementById('status-coords').textContent = `خط العرض: ${lat.toFixed(6)}° | خط الطول: ${lng.toFixed(6)}° | Plus Code: ${encodePlusCode(lat, lng)}`;
  });

  // 6. Place Card & Map Clicks
  function showPlaceCard(props, lngLat) {
    const lat = lngLat.lat, lng = lngLat.lng;
    const pcode = encodePlusCode(lat, lng);
    lastSelectedPlace = {
      name: props.name || 'موقع في محافظة إب',
      cat: props.cat || 'shop',
      catAr: props.catAr || CAT_AR[props.cat] || props.basic_category || props.class || 'موقع / مبنى',
      reg: props.reg || 'محافظة إب',
      phone: props.phone || '',
      web: props.web || '',
      notes: props.notes || '',
      height: props.height || '',
      src: props.src || 'بيانات الخريطة',
      lat, lng
    };

    document.getElementById('pc-title').textContent = lastSelectedPlace.name;
    document.getElementById('pc-cat').textContent = lastSelectedPlace.catAr;
    let meta = `<div><i class="fa-solid fa-location-dot" style="color:#10b981;"></i> النطاق: <strong>${lastSelectedPlace.reg}</strong> • <span style="color:#94a3b8;">${lastSelectedPlace.src}</span></div>`;
    if (lastSelectedPlace.phone) meta += `<div><i class="fa-solid fa-phone" style="color:#38bdf8;"></i> الهاتف: <a href="tel:${lastSelectedPlace.phone}">${lastSelectedPlace.phone}</a></div>`;
    if (lastSelectedPlace.web) meta += `<div><i class="fa-solid fa-globe" style="color:#38bdf8;"></i> الموقع: <a href="${lastSelectedPlace.web}" target="_blank" rel="noopener">زيارة الرابط</a></div>`;
    if (lastSelectedPlace.height) meta += `<div><i class="fa-solid fa-building" style="color:#f59e0b;"></i> ارتفاع المبنى 3D: <strong>${lastSelectedPlace.height} متر</strong></div>`;
    if (lastSelectedPlace.notes) meta += `<div><i class="fa-solid fa-note-sticky" style="color:#f59e0b;"></i> ${lastSelectedPlace.notes}</div>`;

    document.getElementById('pc-meta').innerHTML = meta;
    document.getElementById('pc-coords-txt').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('pc-pluscode').textContent = pcode;
    document.getElementById('pc-gmaps').href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    document.getElementById('place-card').classList.add('open');

    document.getElementById('pc-copy').onclick = () => {
      navigator.clipboard.writeText(`${lastSelectedPlace.name} | ${lat.toFixed(6)}, ${lng.toFixed(6)} | ${pcode}`);
      showToast('تم نسخ الإحداثيات ورمز Plus Code');
    };
  }

  map.on('click', (e) => {
    if (pickMode === 'origin') {
      dirOrigin = { lat: e.lngLat.lat, lng: e.lngLat.lng, label: `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}` };
      document.getElementById('dir-origin').value = dirOrigin.label;
      pickMode = null;
      updateRoutePoints();
      showToast('تم تحديد نقطة الانطلاق');
      return;
    }
    if (pickMode === 'dest') {
      dirDest = { lat: e.lngLat.lat, lng: e.lngLat.lng, label: `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}` };
      document.getElementById('dir-dest').value = dirDest.label;
      pickMode = null;
      updateRoutePoints();
      showToast('تم تحديد الوجهة');
      return;
    }
    if (pickMode === 'contrib') {
      document.getElementById('cf-lat').value = e.lngLat.lat.toFixed(6);
      document.getElementById('cf-lng').value = e.lngLat.lng.toFixed(6);
      pickMode = null;
      document.getElementById('drawer').classList.add('open');
      showToast('تم التقاط الإحداثيات بنجاح');
      return;
    }

    const features = map.queryRenderedFeatures(e.point, {
      layers: ['user-pois-dots', 'user-pois-labels', 'shard-pois-dots', 'shard-pois-labels', 'ov-places-labels', 'ov-places-dots', 'settlement-labels', 'buildings-3d-high', 'buildings-3d-low']
    });
    if (features && features.length > 0) {
      showPlaceCard(features[0].properties || {}, e.lngLat);
    } else {
      showPlaceCard({ name: 'نقطة فحص إحداثيات Z' + Math.round(map.getZoom()), catAr: 'إحداثيات حرة' }, e.lngLat);
    }
  });

  // 7. Search & Category Pills
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const clearBtn = document.getElementById('btn-clear-search');

  function runSearch() {
    const q = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = q ? 'block' : 'none';
    if (q.length < 2) { searchResults.classList.remove('open'); return; }
    const allowed = CAT_GROUPS[activeCatFilter];
    const matches = [];
    for (let i = 0; i < SEARCH_STORE.length; i++) {
      const it = SEARCH_STORE[i];
      if (allowed && !allowed.has(it.cat)) continue;
      if (it.name && it.name.toLowerCase().includes(q)) {
        matches.push(it);
        if (matches.length >= 25) break;
      }
    }
    searchResults.innerHTML = '';
    if (matches.length === 0) {
      searchResults.innerHTML = `<div class="search-item"><div><div class="s-title">لا توجد نتائج مطابقة</div><div class="s-sub">جرّب الاقتراب من المديرية لتحميل المزيد أو تغيير التصنيف</div></div></div>`;
    } else {
      matches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `<div><div class="s-title">${m.name}</div><div class="s-sub">${m.reg || 'إب'} • ${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}</div></div><span class="s-tag">${m.catAr || m.cat}</span>`;
        div.onclick = () => {
          searchResults.classList.remove('open');
          map.flyTo({ center: [m.lng, m.lat], zoom: 18, pitch: is3D ? 52 : 0 });
          showPlaceCard(m, { lat: m.lat, lng: m.lng });
        };
        searchResults.appendChild(div);
      });
    }
    searchResults.classList.add('open');
  }

  searchInput.addEventListener('input', runSearch);
  clearBtn.onclick = () => { searchInput.value = ''; clearBtn.style.display = 'none'; searchResults.classList.remove('open'); };

  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCatFilter = btn.getAttribute('data-cat');
      updateShardLayer();
      if (searchInput.value.trim().length >= 2) runSearch();
      showToast(`تصفية: ${btn.textContent.trim()}`);
    };
  });

  // 8. Directions & Routing Engine (OSRM + Offline Fallback)
  function updateRoutePoints() {
    if (!map.getSource('route-pts')) return;
    const pts = [];
    if (dirOrigin) pts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [dirOrigin.lng, dirOrigin.lat] }, properties: { kind: 'origin' } });
    if (dirDest) pts.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [dirDest.lng, dirDest.lat] }, properties: { kind: 'dest' } });
    map.getSource('route-pts').setData({ type: 'FeatureCollection', features: pts });
  }

  async function calculateRoute() {
    if (!dirOrigin || !dirDest) return showToast('يرجى تحديد نقطة الانطلاق والوجهة أولاً');
    const sumEl = document.getElementById('dir-summary');
    sumEl.style.display = 'block';
    sumEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري حساب المسار...';

    const profile = dirProfile === 'walking' ? 'foot' : 'driving';
    const url = `https://router.project-osrm.org/route/v1/${profile}/${dirOrigin.lng},${dirOrigin.lat};${dirDest.lng},${dirDest.lat}?overview=full&geometries=geojson`;

    let coords = null, distKm = 0, mins = 0, isOfflineRoute = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5500);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        coords = data.routes[0].geometry.coordinates;
        distKm = data.routes[0].distance / 1000;
        mins = Math.max(1, Math.round(data.routes[0].duration / 60));
      }
    } catch {}

    if (!coords) {
      isOfflineRoute = true;
      const straight = haversineKm(dirOrigin.lat, dirOrigin.lng, dirDest.lat, dirDest.lng);
      distKm = straight * (dirProfile === 'walking' ? 1.25 : 1.35);
      const speedKmh = dirProfile === 'walking' ? 4.5 : 32;
      mins = Math.max(1, Math.round((distKm / speedKmh) * 60));
      coords = [[dirOrigin.lng, dirOrigin.lat], [dirDest.lng, dirDest.lat]];
    }

    map.getSource('route-line').setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }]
    });
    updateRoutePoints();

    const bounds = new maplibregl.LngLatBounds([dirOrigin.lng, dirOrigin.lat], [dirOrigin.lng, dirOrigin.lat]);
    coords.forEach(c => bounds.extend(c));
    map.fitBounds(bounds, { padding: 70, pitch: 25 });

    const distTxt = distKm < 1 ? `${Math.round(distKm * 1000)} متر` : `${distKm.toFixed(2)} كم`;
    const timeTxt = mins >= 60 ? `${Math.floor(mins / 60)} س ${mins % 60} د` : `${mins} دقيقة`;
    sumEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; font-weight:700; color:#34d399;">
        <span><i class="fa-solid fa-clock"></i> ${timeTxt}</span>
        <span><i class="fa-solid fa-road"></i> ${distTxt}</span>
      </div>
      <div style="font-size:0.74rem; color:#94a3b8; margin-top:4px;">
        ${isOfflineRoute ? 'مسار تقريبي (وضع عدم الاتصال)' : 'مسار فعلي عبر شبكة الطرق (OSRM)'}
      </div>
    `;
  }

  document.querySelectorAll('.dir-mode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.dir-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      dirProfile = btn.getAttribute('data-profile');
      if (dirOrigin && dirDest) calculateRoute();
    };
  });
  document.getElementById('dir-pick-origin').onclick = () => { pickMode = 'origin'; showToast('انقر على الخريطة لتحديد نقطة الانطلاق'); };
  document.getElementById('dir-pick-dest').onclick = () => { pickMode = 'dest'; showToast('انقر على الخريطة لتحديد الوجهة'); };
  document.getElementById('dir-use-gps').onclick = () => {
    if (!navigator.geolocation) return showToast('GPS غير مدعوم');
    navigator.geolocation.getCurrentPosition(p => {
      dirOrigin = { lat: p.coords.latitude, lng: p.coords.longitude, label: 'موقعي الحالي (GPS)' };
      document.getElementById('dir-origin').value = dirOrigin.label;
      updateRoutePoints();
    }, () => showToast('تعذر تحديد الموقع'));
  };
  document.getElementById('dir-calc').onclick = calculateRoute;
  document.getElementById('dir-clear').onclick = () => {
    dirOrigin = null; dirDest = null;
    document.getElementById('dir-origin').value = '';
    document.getElementById('dir-dest').value = '';
    document.getElementById('dir-summary').style.display = 'none';
    if (map.getSource('route-line')) map.getSource('route-line').setData({ type: 'FeatureCollection', features: [] });
    updateRoutePoints();
  };

  function openDirections() {
    document.getElementById('place-card').classList.remove('open');
    document.getElementById('dir-panel').classList.add('open');
  }
  document.getElementById('btn-open-directions').onclick = openDirections;
  document.getElementById('qa-directions').onclick = openDirections;
  document.getElementById('dir-close').onclick = () => document.getElementById('dir-panel').classList.remove('open');

  document.getElementById('pc-route-to').onclick = () => {
    if (!lastSelectedPlace) return;
    dirDest = { lat: lastSelectedPlace.lat, lng: lastSelectedPlace.lng, label: lastSelectedPlace.name };
    document.getElementById('dir-dest').value = dirDest.label;
    openDirections();
    updateRoutePoints();
    if (dirOrigin) calculateRoute();
  };
  document.getElementById('pc-route-from').onclick = () => {
    if (!lastSelectedPlace) return;
    dirOrigin = { lat: lastSelectedPlace.lat, lng: lastSelectedPlace.lng, label: lastSelectedPlace.name };
    document.getElementById('dir-origin').value = dirOrigin.label;
    openDirections();
    updateRoutePoints();
  };

  // 9. Offline Regions Manager
  const OFFLINE_KEY = 'ibb_offline_packs_v1';
  function getOfflineState() {
    try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '{}'); } catch { return {}; }
  }
  function setOfflineState(obj) {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(obj));
  }

  async function downloadUrlsToCache(packId, urls, btnEl) {
    if (!('caches' in window)) return showToast('المتصفح لا يدعم التخزين المحلي');
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري...';
    try {
      const cache = await caches.open('my-ibb-map-v2');
      for (const u of urls) {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      }
      const st = getOfflineState();
      st[packId] = Date.now();
      setOfflineState(st);
      renderOfflineManager();
      showToast('تم الحفظ للعمل بدون إنترنت بنجاح');
    } catch {
      btnEl.disabled = false;
      btnEl.innerHTML = '<i class="fa-solid fa-download"></i> إعادة';
      showToast('حدث خطأ أثناء التحميل');
    }
  }

  function renderOfflineManager() {
    const st = getOfflineState();
    const packsEl = document.getElementById('offline-packs');
    const corePacks = [
      {
        id: 'CORE_PACK',
        title: 'الحزمة الأساسية + القرى والبحث (2.2 MB)',
        desc: 'تشمل core_index و12,788 قرية وطبقات المحافظة والمديريات',
        urls: ['./data/core_lite.json', './data/core_index.json', './data/settlements_full.json', './pmtiles/governorate.pmtiles', './pmtiles/districts.pmtiles', './pmtiles/places.pmtiles', './pmtiles/base.pmtiles']
      },
      {
        id: 'ROADS_PACK',
        title: 'حزمة شبكة الطرق الكاملة (22 MB)',
        desc: '13,125 مقطع طريق لتصفح الشوارع بدون إنترنت',
        urls: ['./pmtiles/roads.pmtiles']
      }
    ];

    packsEl.innerHTML = '';
    corePacks.forEach(p => {
      const done = Boolean(st[p.id]);
      const div = document.createElement('div');
      div.className = 'offline-item';
      div.innerHTML = `
        <div><h4>${p.title}</h4><p>${p.desc}</p></div>
        <button class="btn-action ${done ? '' : 'primary'}" style="padding:6px 10px; white-space:nowrap;">
          ${done ? '<i class="fa-solid fa-check" style="color:#34d399;"></i> محفوظ' : '<i class="fa-solid fa-download"></i> تنزيل'}
        </button>
      `;
      div.querySelector('button').onclick = (e) => downloadUrlsToCache(p.id, p.urls, e.currentTarget);
      packsEl.appendChild(div);
    });

    const regEl = document.getElementById('offline-regions-list');
    regEl.innerHTML = '';
    REGIONS.forEach(r => {
      const done = Boolean(st[r.code]);
      const div = document.createElement('div');
      div.className = 'offline-item';
      div.innerHTML = `
        <div><h4>${r.name_ar}</h4><p>${r.code} • ${r.kb} KB</p></div>
        <button class="btn-action ${done ? '' : 'primary'}" style="padding:5px 10px; white-space:nowrap;">
          ${done ? '<i class="fa-solid fa-check" style="color:#34d399;"></i> متاح أوفلاين' : '<i class="fa-solid fa-download"></i> تنزيل'}
        </button>
      `;
      div.querySelector('button').onclick = (e) => downloadUrlsToCache(r.code, [`./data/shards/${r.code}.json`], e.currentTarget);
      regEl.appendChild(div);
    });
  }

  // 10. Field Contributions & Admin Panel
  function renderContribList() {
    const list = getContribs();
    document.getElementById('contrib-count').textContent = list.length;
    const container = document.getElementById('contrib-list');
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<p style="font-size:0.78rem; color:#94a3b8;">لا توجد مساهمات محفوظة بعد.</p>';
      return;
    }
    list.forEach((c, idx) => {
      const div = document.createElement('div');
      div.className = 'offline-item';
      div.innerHTML = `
        <div style="cursor:pointer;" class="c-jump">
          <h4>${c.name}</h4>
          <p>${CAT_AR[c.cat] || c.cat} • ${Number(c.lat).toFixed(4)}, ${Number(c.lng).toFixed(4)}</p>
        </div>
        <div style="display:flex; gap:4px;">
          <button class="icon-btn c-del" title="حذف"><i class="fa-solid fa-trash" style="color:#ef4444;"></i></button>
        </div>
      `;
      div.querySelector('.c-jump').onclick = () => {
        map.flyTo({ center: [Number(c.lng), Number(c.lat)], zoom: 18 });
        showPlaceCard(c, { lat: Number(c.lat), lng: Number(c.lng) });
      };
      div.querySelector('.c-del').onclick = () => {
        const next = getContribs();
        next.splice(idx, 1);
        saveContribs(next);
        showToast('تم حذف المساهمة');
      };
      container.appendChild(div);
    });
  }

  document.getElementById('cf-pick-map').onclick = () => {
    pickMode = 'contrib';
    document.getElementById('drawer').classList.remove('open');
    showToast('انقر على الخريطة لالتقاط إحداثيات الموقع');
  };

  document.getElementById('contrib-form').onsubmit = (e) => {
    e.preventDefault();
    const list = getContribs();
    const item = {
      id: document.getElementById('cf-id').value || 'u_' + Date.now(),
      name: document.getElementById('cf-name').value.trim(),
      cat: document.getElementById('cf-cat').value,
      lat: parseFloat(document.getElementById('cf-lat').value),
      lng: parseFloat(document.getElementById('cf-lng').value),
      phone: document.getElementById('cf-phone').value.trim(),
      notes: document.getElementById('cf-notes').value.trim(),
      updatedAt: new Date().toISOString()
    };
    const existingIdx = list.findIndex(x => x.id === item.id);
    if (existingIdx >= 0) list[existingIdx] = item;
    else list.unshift(item);

    saveContribs(list);
    addSearchItem({ name: item.name, cat: item.cat, catAr: CAT_AR[item.cat] || item.cat, lat: item.lat, lng: item.lng, reg: 'مساهمة ميدانية', phone: item.phone, notes: item.notes, src: 'مساهمة ميدانية' });
    e.target.reset();
    document.getElementById('cf-id').value = '';
    showToast('تم حفظ المساهمة الميدانية بنجاح');
  };

  document.getElementById('pc-edit').onclick = () => {
    if (!lastSelectedPlace) return;
    document.getElementById('cf-name').value = lastSelectedPlace.name;
    document.getElementById('cf-lat').value = lastSelectedPlace.lat.toFixed(6);
    document.getElementById('cf-lng').value = lastSelectedPlace.lng.toFixed(6);
    document.getElementById('cf-phone').value = lastSelectedPlace.phone || '';
    document.getElementById('cf-notes').value = lastSelectedPlace.notes || '';
    openDrawerTab('tab-contrib');
  };

  function downloadFile(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  document.getElementById('btn-export-geojson').onclick = () => {
    const list = getContribs();
    const fc = {
      type: 'FeatureCollection',
      features: list.map(c => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(c.lng), Number(c.lat)] },
        properties: { id: c.id, name: c.name, category: c.cat, phone: c.phone, notes: c.notes, updatedAt: c.updatedAt }
      }))
    };
    downloadFile('ibb_field_contributions.geojson', JSON.stringify(fc, null, 2), 'application/geo+json');
  };

  document.getElementById('btn-export-json').onclick = () => {
    downloadFile('ibb_field_contributions.json', JSON.stringify(getContribs(), null, 2), 'application/json');
  };

  // 11. Drawer Tabs, Modes & Controls
  function openDrawerTab(tabId) {
    document.getElementById('drawer').classList.add('open');
    document.querySelectorAll('.d-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabId));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === tabId));
  }

  document.querySelectorAll('.d-tab').forEach(tab => {
    tab.onclick = () => openDrawerTab(tab.getAttribute('data-tab'));
  });
  document.getElementById('btn-open-drawer').onclick = () => openDrawerTab('tab-regions');
  document.getElementById('qa-offline').onclick = () => openDrawerTab('tab-offline');
  document.getElementById('qa-contrib').onclick = () => {
    const c = map.getCenter();
    if (!document.getElementById('cf-lat').value) {
      document.getElementById('cf-lat').value = c.lat.toFixed(6);
      document.getElementById('cf-lng').value = c.lng.toFixed(6);
    }
    openDrawerTab('tab-contrib');
  };
  document.getElementById('btn-close-drawer').onclick = () => document.getElementById('drawer').classList.remove('open');

  // Switch Base Map Modes
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');

      map.setLayoutProperty('raster-sat', 'visibility', mode === 'sat_3d' ? 'visible' : 'none');
      map.setLayoutProperty('raster-glabels', 'visibility', mode === 'sat_3d' ? 'visible' : 'none');
      map.setLayoutProperty('raster-hybrid', 'visibility', mode === 'google_hybrid' ? 'visible' : 'none');

      const isVector = (mode === 'white_3d' || mode === 'dark_3d');
      const isDark = (mode === 'dark_3d' || mode === 'sat_3d' || mode === 'google_hybrid');

      map.setPaintProperty('bg', 'background-color', mode === 'dark_3d' ? '#0f172a' : '#f1f5f9');
      map.setLayoutProperty('landuse-fill', 'visibility', isVector ? 'visible' : 'none');
      map.setLayoutProperty('water-fill', 'visibility', isVector ? 'visible' : 'none');
      map.setPaintProperty('roads-fill', 'line-opacity', mode === 'google_hybrid' ? 0.0 : 0.9);
      map.setPaintProperty('roads-casing', 'line-opacity', mode === 'google_hybrid' ? 0.0 : 0.9);

      const bldOp = (mode === 'sat_3d' || mode === 'google_hybrid') ? 0.45 : 0.92;
      map.setPaintProperty('buildings-3d-low', 'fill-extrusion-opacity', bldOp);
      map.setPaintProperty('buildings-3d-high', 'fill-extrusion-opacity', bldOp);

      const txtCol = isDark ? '#f8fafc' : '#0f172a';
      const haloCol = isDark ? '#020617' : '#ffffff';
      ['ov-places-labels', 'road-labels', 'shard-pois-labels'].forEach(lid => {
        if (map.getLayer(lid)) {
          map.setPaintProperty(lid, 'text-color', txtCol);
          map.setPaintProperty(lid, 'text-halo-color', haloCol);
        }
      });
    };
  });

  // Layer toggles & Map Controls
  document.getElementById('chk-3d').onchange = function() {
    const v = this.checked ? 'visible' : 'none';
    map.setLayoutProperty('buildings-3d-low', 'visibility', v);
    map.setLayoutProperty('buildings-3d-high', 'visibility', v);
  };
  document.getElementById('chk-roads').onchange = function() {
    const v = this.checked ? 'visible' : 'none';
    map.setLayoutProperty('roads-casing', 'visibility', v);
    map.setLayoutProperty('roads-fill', 'visibility', v);
  };
  document.getElementById('chk-pois').onchange = function() {
    const v = this.checked ? 'visible' : 'none';
    if (map.getLayer('shard-pois-dots')) map.setLayoutProperty('shard-pois-dots', 'visibility', v);
    if (map.getLayer('shard-pois-labels')) map.setLayoutProperty('shard-pois-labels', 'visibility', v);
  };
  document.getElementById('chk-labels').onchange = function() {
    const v = this.checked ? 'visible' : 'none';
    ['road-labels', 'district-labels', 'settlement-labels', 'ov-places-dots', 'ov-places-labels'].forEach(l => map.setLayoutProperty(l, 'visibility', v));
  };

  document.getElementById('btn-toggle-3d').onclick = () => { is3D = !is3D; map.easeTo({ pitch: is3D ? 52 : 0, bearing: is3D ? -15 : 0, duration: 500 }); };
  document.getElementById('btn-z19').onclick = () => map.easeTo({ zoom: 19, pitch: is3D ? 55 : 0 });
  document.getElementById('btn-plus').onclick = () => map.zoomIn();
  document.getElementById('btn-minus').onclick = () => map.zoomOut();
  document.getElementById('btn-home').onclick = () => map.flyTo({ center: [44.1680, 13.9685], zoom: 16.5, pitch: 52, bearing: -15 });
  document.getElementById('pc-close').onclick = () => document.getElementById('place-card').classList.remove('open');

  document.getElementById('btn-gps').onclick = () => {
    if (!navigator.geolocation) return showToast('GPS غير مدعوم');
    navigator.geolocation.getCurrentPosition(p => {
      map.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 18, pitch: is3D ? 52 : 0 });
    }, () => showToast('تعذر تحديد الموقع'));
  };

  // Populate Region Jump List
  const rList = document.getElementById('region-list');
  REGIONS.forEach(r => {
    const item = document.createElement('div');
    item.className = 'region-item';
    item.innerHTML = `<div><h4>${r.name_ar}</h4><p>${r.name_en} — ${r.code}</p></div><span class="r-badge">Z${r.zoom}</span>`;
    item.onclick = () => {
      map.flyTo({ center: [r.lng, r.lat], zoom: r.zoom, pitch: is3D ? 52 : 0 });
      if (window.innerWidth < 640) document.getElementById('drawer').classList.remove('open');
    };
    rList.appendChild(item);
  });

  renderOfflineManager();
  renderContribList();
})();
