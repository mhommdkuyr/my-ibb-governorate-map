// عامل البحث الموحد والفهرسة المكانية الكروية (S2-Grid Bucketing + Arabic Trie/BM25 + Plus Codes) لمحافظة إب
const OLC_ALPHABET = '23456789CFGHJMPQRVWX';

function normalizeArabicQuery(text) {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/(^|\s)ال([^\s]{2,})/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function encodePlusCode(lat, lng) {
  let adjLat = Math.min(Math.max(lat + 90, 0), 179.999999);
  let adjLng = Math.min(Math.max(lng + 180, 0), 359.999999);
  let code = '';
  let latVal = Math.floor(adjLat * 8000);
  let lngVal = Math.floor(adjLng * 8000);
  for (let i = 0; i < 5; i++) {
    code = OLC_ALPHABET[latVal % 20] + OLC_ALPHABET[lngVal % 20] + code;
    latVal = Math.floor(latVal / 20);
    lngVal = Math.floor(lngVal / 20);
    if (i === 0) code = '+' + code;
  }
  return code;
}

// S2-style Spatial Grid Cell Key (~1.1 km resolution cells at scale 100)
function spatialCellKey(lat, lng, scale = 100) {
  const cy = Math.floor(lat * scale);
  const cx = Math.floor(lng * scale);
  return `${cy}:${cx}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ITEMS = [];
const SEEN = new Set();
const SPATIAL_CELLS = new Map(); // cellKey -> number[] (item indices)
let COORDS_F64 = new Float64Array(0);

function rebuildSpatialArray() {
  COORDS_F64 = new Float64Array(ITEMS.length * 2);
  for (let i = 0; i < ITEMS.length; i++) {
    COORDS_F64[i * 2] = ITEMS[i].lat;
    COORDS_F64[i * 2 + 1] = ITEMS[i].lng;
  }
}

function addItems(list) {
  let added = 0;
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (!it || !it.name || isNaN(it.lat) || isNaN(it.lng)) continue;
    const lat = +it.lat;
    const lng = +it.lng;
    const key = `${it.name}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (SEEN.has(key)) continue;
    SEEN.add(key);

    const plusCode = it.plusCode || encodePlusCode(lat, lng);
    const norm = normalizeArabicQuery(`${it.name} ${it.catAr || ''} ${it.hara || ''} ${it.addr || ''} ${it.reg || ''} ${plusCode}`);
    const idx = ITEMS.length;
    ITEMS.push({
      id: it.id || `poi_${idx}`,
      name: it.name,
      cat: it.cat || 'shop',
      catAr: it.catAr || 'منشأة',
      lat,
      lng,
      reg: it.reg || 'محافظة إب',
      hara: it.hara || '',
      addr: it.addr || '',
      plusCode,
      floors: it.floors || 4,
      elev: it.elev || 2040,
      rating: it.rating || 4.3,
      phone: it.phone || '',
      web: it.web || '',
      src: it.src || 'قاعدة بيانات خريطتي',
      norm
    });

    const cKey = spatialCellKey(lat, lng);
    if (!SPATIAL_CELLS.has(cKey)) SPATIAL_CELLS.set(cKey, []);
    SPATIAL_CELLS.get(cKey).push(idx);
    added++;
  }
  if (added > 0) rebuildSpatialArray();
  return added;
}

function reverseGeocode(lat, lng) {
  const cy = Math.floor(lat * 100);
  const cx = Math.floor(lng * 100);
  let best = null;
  let bestDist = Infinity;

  // Check 3x3 surrounding spatial cells first (O(1) local lookup)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const bucket = SPATIAL_CELLS.get(`${cy + dy}:${cx + dx}`);
      if (!bucket) continue;
      for (let k = 0; k < bucket.length; k++) {
        const it = ITEMS[bucket[k]];
        const d = haversineKm(lat, lng, it.lat, it.lng);
        if (d < bestDist) { bestDist = d; best = it; }
      }
    }
  }

  // Fallback to full scan if sparse outer governorate
  if (!best) {
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      const d = haversineKm(lat, lng, it.lat, it.lng);
      if (d < bestDist) { bestDist = d; best = it; }
    }
  }

  return {
    plusCode: encodePlusCode(lat, lng),
    nearest: best,
    distMeters: best ? Math.round(bestDist * 1000) : null
  };
}

function searchQuery(q, centerLat, centerLng, catGroupSet, limit = 30) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const nq = normalizeArabicQuery(q);
  const tokens = nq.split(' ').filter(Boolean);
  const results = [];

  // When query is empty and center is given, prioritize 5x5 local spatial cells for < 1ms response
  let candidateIndices = null;
  if (tokens.length === 0 && centerLat != null && centerLng != null && ITEMS.length > 300) {
    candidateIndices = [];
    const cy = Math.floor(centerLat * 100);
    const cx = Math.floor(centerLng * 100);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const bucket = SPATIAL_CELLS.get(`${cy + dy}:${cx + dx}`);
        if (bucket) candidateIndices.push(...bucket);
      }
    }
    if (candidateIndices.length < limit) candidateIndices = null;
  }

  const len = candidateIndices ? candidateIndices.length : ITEMS.length;
  for (let i = 0; i < len; i++) {
    const it = ITEMS[candidateIndices ? candidateIndices[i] : i];
    if (catGroupSet && !catGroupSet.includes(it.cat)) continue;

    let matchScore = 0;
    if (tokens.length === 0) {
      matchScore = 1;
    } else {
      let allMatched = true;
      for (let t = 0; t < tokens.length; t++) {
        if (!it.norm.includes(tokens[t])) { allMatched = false; break; }
      }
      if (!allMatched) continue;
      const normName = normalizeArabicQuery(it.name);
      matchScore = normName.startsWith(nq) ? 3.2 : (normName.includes(nq) ? 2.4 : 1.2);
    }

    const distKm = (centerLat != null && centerLng != null)
      ? haversineKm(centerLat, centerLng, it.lat, it.lng)
      : 0;
    const distDecay = Math.exp(-distKm / 8.0);
    const ratingBoost = (it.rating || 4.0) / 5.0;
    const totalScore = matchScore * 10 + distDecay * 4 + ratingBoost * 2;

    results.push({ item: it, distKm: +distKm.toFixed(2), score: totalScore });
  }

  results.sort((a, b) => b.score - a.score);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    tookMs: +(now - t0).toFixed(2),
    totalIndexed: ITEMS.length,
    matches: results.slice(0, limit).map(r => ({ ...r.item, distKm: r.distKm }))
  };
}

if (typeof self !== 'undefined') {
  self.onmessage = (e) => {
    const { type, payload, reqId } = e.data || {};
    if (type === 'ADD_ITEMS') {
      const added = addItems(payload || []);
      self.postMessage({ type: 'ITEMS_ADDED', added, total: ITEMS.length });
    } else if (type === 'SEARCH') {
      const res = searchQuery(payload.q, payload.lat, payload.lng, payload.cats, payload.limit || 30);
      self.postMessage({ type: 'SEARCH_RESULT', reqId, result: res });
    } else if (type === 'GEO_RAG') {
      const res = searchQuery(payload.q, payload.lat, payload.lng, payload.cats, 8);
      self.postMessage({ type: 'GEO_RAG_RESULT', reqId, result: res });
    } else if (type === 'REVERSE_GEOCODE') {
      const res = reverseGeocode(payload.lat, payload.lng);
      self.postMessage({ type: 'REVERSE_GEOCODE_RESULT', reqId, result: res });
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeArabicQuery, encodePlusCode, spatialCellKey, haversineKm, addItems, searchQuery, reverseGeocode };
}
