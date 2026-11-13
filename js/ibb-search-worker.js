// عامل البحث الموحد والفهرسة المكانية الكروية والعنونة الذكية (Plus Codes + Geo-RAG) لمحافظة إب
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
    .replace(/\s+/g, ' ');
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
    const key = `${it.name}|${it.lat.toFixed(4)}|${it.lng.toFixed(4)}`;
    if (SEEN.has(key)) continue;
    SEEN.add(key);
    const plusCode = it.plusCode || encodePlusCode(it.lat, it.lng);
    const norm = normalizeArabicQuery(`${it.name} ${it.catAr || ''} ${it.hara || ''} ${it.addr || ''} ${it.reg || ''} ${plusCode}`);
    ITEMS.push({
      id: it.id || `poi_${ITEMS.length}`,
      name: it.name,
      cat: it.cat || 'shop',
      catAr: it.catAr || 'منشأة',
      lat: +it.lat,
      lng: +it.lng,
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
    added++;
  }
  if (added > 0) rebuildSpatialArray();
  return added;
}

function searchQuery(q, centerLat, centerLng, catGroupSet, limit = 30) {
  const t0 = performance.now();
  const nq = normalizeArabicQuery(q);
  const tokens = nq.split(' ').filter(Boolean);
  const results = [];

  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
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
      matchScore = it.norm.startsWith(nq) ? 3.0 : (normalizeArabicQuery(it.name).includes(nq) ? 2.2 : 1.2);
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
  return {
    tookMs: +(performance.now() - t0).toFixed(2),
    totalIndexed: ITEMS.length,
    matches: results.slice(0, limit).map(r => ({ ...r.item, distKm: r.distKm }))
  };
}

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
  }
};
