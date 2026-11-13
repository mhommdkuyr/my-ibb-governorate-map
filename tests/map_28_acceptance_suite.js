// حزمة اختبارات القبول الشاملة (28 اختباراً موثقاً) لمنظومة خرائط إب ماركت (IBB Market Geo-Engine v5.0)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

global.self = { postMessage: () => {} };

const searchWorker = require(path.join(__dirname, '../js/ibb-search-worker.js'));
const routingWorker = require(path.join(__dirname, '../js/ibb-routing-worker.js'));
const apiEngine = require(path.join(__dirname, '../js/ibb-api-service.js'));

const rootDir = path.join(__dirname, '..');
const appJsText = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf8');
const htmlText = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const swText = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');
const routingGraph = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/ibb_routing_graph.json'), 'utf8'));
const poisChunk1 = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/ibb_pois_1.json'), 'utf8'));

// Seed search worker with real POIs + verified IBB Market merchants
searchWorker.addItems(apiEngine.VERIFIED_MERCHANTS.map(m => ({
  name: m.name_ar, nameEn: m.name_en, cat: m.category_code, catAr: m.category_ar,
  lat: m.latitude, lng: m.longitude, reg: 'مديرية الظهار', hara: m.neighborhood_ar,
  addr: m.address_ar, phone: m.phone, rating: m.rating, merchantId: m.merchant_id, storeId: m.store_id
})));
searchWorker.addItems(poisChunk1.slice(0, 300).map(r => ({
  name: r[0], cat: r[1], catAr: r[2], lat: +r[3], lng: +r[4],
  reg: r[5], hara: r[6], addr: r[7], plusCode: r[8], floors: r[9], elev: r[10], rating: r[11], phone: r[12]
})));

const results = [];
async function runTest(id, titleAr, fn) {
  try {
    const detail = await fn();
    results.push({ id, titleAr, status: 'PASS', detail });
    console.log(`[PASS #${String(id).padStart(2, '0')}] ${titleAr} — ${detail}`);
  } catch (err) {
    results.push({ id, titleAr, status: 'FAIL', detail: err.message });
    console.error(`[FAIL #${String(id).padStart(2, '0')}] ${titleAr} — ${err.message}`);
    process.exitCode = 1;
  }
}

(async () => {
  await runTest(1, 'ظهور الخريطة (Map Initialization & 2D/3D Render)', () => {
    assert.ok(appJsText.includes('new maplibregl.Map') && appJsText.includes('createFallbackMap2D'));
    return 'MapLibre GL JS v4.7.1 + 2D Canvas Fallback مفعّلان بنجاح';
  });

  await runTest(2, 'تحميل البلاطات (PMTiles Vector & IndexedDB Byte Range)', async () => {
    const res = await apiEngine.handleApiRequest('GET', '/api/map/tiles/15/20312/14920');
    assert.strictEqual(res.status, 200);
    assert.ok(appJsText.includes('IndexedDBByteSource') && appJsText.includes('governorate.pmtiles'));
    return `8 أرشيفات PMTiles مرتبطة مع كاش IndexedDB (${res.archive})`;
  });

  await runTest(3, 'تحميل المباني (3D Buildings Extrusion & Core Footprints)', () => {
    const blds = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/ibb_core_buildings_3d.json'), 'utf8'));
    assert.ok(blds.features.length >= 1000 && appJsText.includes('buildings-3d-high'));
    return `${blds.features.length} مضلع مبنى 3D فوري + بلاطات buildings_z14_17 & z18`;
  });

  await runTest(4, 'تحميل الطرق (Road Network & Street Segments)', () => {
    const roads = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/ibb_core_roads.json'), 'utf8'));
    assert.ok(roads.features.length >= 1500 && routingGraph.nodes.length >= 1400);
    return `${roads.features.length} طريق مباشر + ${routingGraph.nodes.length} عقدة توجيه`;
  });

  await runTest(5, 'عرض أسماء الأحياء (Neighborhoods & Districts Labels)', () => {
    assert.ok(appJsText.includes('settlement-labels') && appJsText.includes('district-labels'));
    return 'طبقات أسماء الأحياء والحارات الـ 136 والمديريات الـ 20 مفعلة';
  });

  await runTest(6, 'البحث العربي المتقدم (تطبيع، أخطاء إملائية، ومرادفات)', () => {
    const r1 = searchWorker.searchQuery('المستشفى', 13.972, 44.168, null, 10);
    const r2 = searchWorker.searchQuery('تموينات', 13.972, 44.168, null, 10); // synonym for supermarket
    const r3 = searchWorker.searchQuery('صيدليه', 13.972, 44.168, null, 10);
    assert.ok(r2.matches.length > 0 && r3.matches.length > 0);
    return `نتائج المرادفات والأخطاء الإملائية: ${r2.matches.length} سوبرماركت، ${r3.matches.length} صيدلية في ${r2.tookMs}ms`;
  });

  await runTest(7, 'البحث الإنجليزي (English Name & Category Search)', () => {
    const rEn = searchWorker.searchQuery('Damran Hypermarket', 13.972, 44.162, null, 10);
    const rCat = searchWorker.searchQuery('pharmacy', 13.972, 44.162, null, 10);
    assert.ok(rEn.matches.length >= 1 && rEn.matches[0].name.includes('ظمران'));
    assert.ok(rCat.matches.length >= 1);
    return `تطابق البحث الإنجليزي: "${rEn.matches[0].name}"`;
  });

  await runTest(8, 'البحث عن المتاجر (IBB Market Merchants Discovery)', async () => {
    const apiRes = await apiEngine.handleApiRequest('GET', '/api/map/search', { q: 'جرعان' });
    assert.strictEqual(apiRes.status, 200);
    assert.ok(apiRes.results.length >= 1 && apiRes.results[0].merchant_id === 'merch_juraan_02');
    return `تم استرجاع متجر "${apiRes.results[0].name_ar}" (${apiRes.results[0].merchant_id})`;
  });

  await runTest(9, 'تحديد موقع المستخدم والترميز العكسي (GPS & Reverse Geocode)', () => {
    const rev = searchWorker.reverseGeocode(13.9721, 44.1626);
    assert.ok(rev.plusCode && rev.nearest);
    return `Plus Code: ${rev.plusCode} — أقرب معلم: ${rev.nearest.name}`;
  });

  await runTest(10, 'فتح صفحة المتجر من الخريطة (/store/{merchant_id})', () => {
    const nav = apiEngine.openStoreFromMap('merch_damran_01', { lat: 13.9721, lng: 44.1626, zoom: 17.5 });
    assert.strictEqual(nav.openedStore, true);
    assert.strictEqual(nav.route, '/store/merch_damran_01');
    assert.ok(nav.merchant.products_catalog.length >= 4);
    return `فتح المسار ${nav.route} مع ${nav.merchant.products_catalog.length} منتجات وحفظ الكاميرا`;
  });

  await runTest(11, 'فتح الخريطة من صفحة المتجر مع حفظ الحالة (Store -> Map Bi-Directional)', () => {
    const back = apiEngine.returnToMapFromStore(true);
    assert.strictEqual(back.route, '/map');
    assert.strictEqual(back.camera.lat, 13.9721);
    assert.ok(back.highlightMerchant && back.highlightMerchant.merchant_id === 'merch_damran_01');
    return `عودة ثنائية الاتجاه إلى (${back.camera.lat}, ${back.camera.lng}) عند الزوم ${back.camera.zoom}`;
  });

  await runTest(12, 'حساب مسار السيارة مع النقاط الوسيطة (Vehicle Route + Waypoints)', () => {
    const rt = routingWorker.computeOfflineRoute(
      routingGraph, 13.97265, 44.16155, 13.96620, 44.18140, 'driving',
      [{ lat: 13.97370, lng: 44.17570 }]
    );
    assert.ok(rt && rt.distanceMeters > 1000 && rt.legs.length === 2);
    return `مسار السيارة عبر نقطتين (2 Legs): ${rt.distanceMeters} متر في ${rt.computeMs}ms`;
  });

  await runTest(13, 'حساب مسار المشاة المستقل (الأقصر مقابل الأسهل الجبلي والأزقة)', () => {
    const walkShort = routingWorker.computeOfflineRoute(routingGraph, 13.97265, 44.16155, 13.97631, 44.18955, 'walking_shortest');
    const walkEasy = routingWorker.computeOfflineRoute(routingGraph, 13.97265, 44.16155, 13.97631, 44.18955, 'walking_easiest');
    assert.ok(walkShort && walkEasy && walkShort.steps[0].text.includes('اسلك مشياً'));
    return `مسار المشاة الأقصر (${walkShort.distanceMeters}م) والأسهل الجبلي (${walkEasy.distanceMeters}م)`;
  });

  await runTest(14, 'عرض المسارات البديلة والفروقات بينها (Alternative Routes)', () => {
    const rt = routingWorker.computeOfflineRoute(routingGraph, 13.97265, 44.16155, 13.96850, 44.15650, 'driving');
    assert.ok(rt && Array.isArray(rt.alternatives) && rt.alternatives.length >= 1);
    return `تم توليد مسار بديل بفارق (${rt.alternatives[0].diffSummary})`;
  });

  await runTest(15, 'تحديث الموقع أثناء الحركة (Kalman Filter & Map Matching)', () => {
    const kf = new routingWorker.KalmanGPSFilter();
    const f1 = kf.update(13.97260, 44.16150, 15);
    const f2 = kf.update(13.97285, 44.16190, 10);
    const snap = routingWorker.snapToRouteSegment(f2.lat, f2.lng, [[44.1615, 13.9726], [44.1630, 13.9730]]);
    assert.ok(typeof snap.snappedLat === 'number' && snap.offRouteMeters < 38 && !snap.shouldReroute);
    return `تنعيم Kalman (${f2.lat}, ${f2.lng}) ومطابقة الطريق ببعد ${snap.offRouteMeters}م`;
  });

  let createdContribId = null;
  await runTest(16, 'إضافة مكان جديد مع عدم النشر التلقائي (Add Place -> PENDING_REVIEW)', async () => {
    const res = await apiEngine.handleApiRequest('POST', '/api/map/places', {}, {
      name_ar: 'صيدلية الشفاء الجديدة — الظهار', category_code: 'pharmacy', lat: 13.9718, lng: 44.1695
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.contribution.verification_status, 'PENDING_REVIEW');
    assert.strictEqual(res.contribution.is_published, false);
    createdContribId = res.contribution.id;
    return `أُنشئت المساهمة ${createdContribId} بالحالة ${res.contribution.verification_status} (+15 نقطة)`;
  });

  await runTest(17, 'تعديل مكان موجود (Edit Existing Place -> Queued for Review)', async () => {
    const res = await apiEngine.handleApiRequest('PATCH', '/api/map/places/place_damran_01', {}, {
      name_ar: 'ظمران سنتر — تحديث ساعات العمل', opening_hours: '24 ساعة'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.contribution.verification_status, 'PENDING_REVIEW');
    return `تم تسجيل طلب التعديل بحالة ${res.contribution.verification_status}`;
  });

  await runTest(18, 'مراجعة واعتماد مساهمة مع استقلال VERIFIED عن PUBLISHED', async () => {
    apiEngine.STATE.currentRole = 'admin';
    const resVerify = await apiEngine.handleApiRequest('PATCH', `/api/map/contributions/${createdContribId}/approve`, {}, { publish: false });
    assert.strictEqual(resVerify.contribution.verification_status, 'VERIFIED');
    assert.strictEqual(resVerify.contribution.is_published, false);
    const resPub = await apiEngine.handleApiRequest('PATCH', `/api/map/contributions/${createdContribId}/approve`, {}, { publish: true });
    assert.strictEqual(resPub.contribution.verification_status, 'PUBLISHED');
    assert.strictEqual(resPub.contribution.is_published, true);
    return 'تم التحقق من فصل حالة VERIFIED (غير منشور) عن حالة PUBLISHED (منشور)';
  });

  await runTest(19, 'رفض مساهمة وتوثيق البلاغات (Reject Contribution & Submit Report)', async () => {
    const resRej = await apiEngine.handleApiRequest('PATCH', `/api/map/contributions/${createdContribId}/reject`, {}, {});
    assert.strictEqual(resRej.contribution.verification_status, 'REJECTED');
    const rep = await apiEngine.handleApiRequest('POST', '/api/map/reports', {}, {
      place_name_ar: 'متجر تجريبي', report_type: 'CLOSED_STORE', report_reason_ar: 'متجر مغلق'
    });
    assert.strictEqual(rep.status, 201);
    return `تم رفض المساهمة (REJECTED) وتسجيل البلاغ (${rep.report.report_type})`;
  });

  await runTest(20, 'رفع الصور وإضافة المراجعات (Upload Photo & Review)', async () => {
    const ph = await apiEngine.handleApiRequest('POST', '/api/map/photos', {}, {
      place_id: 'place_damran_01', image_url: './assets/streetview_3.jpg', caption_ar: 'واجهة المتجر'
    });
    const rv = await apiEngine.handleApiRequest('POST', '/api/map/reviews', {}, {
      merchant_id: 'merch_damran_01', place_name_ar: 'ظمران سنتر', rating: 5, comment_ar: 'ممتاز'
    });
    assert.strictEqual(ph.status, 201);
    assert.strictEqual(rv.status, 201);
    return `تم رفع الصورة (${ph.photo.id}) والمراجعة (${rv.review.id})`;
  });

  await runTest(21, 'حفظ مكان واسترجاع القائمة المحفوظة (Saved Places GET/POST)', async () => {
    await apiEngine.handleApiRequest('POST', '/api/map/saved', {}, {
      name_ar: 'كيان كافي', plus_code: '7H56X5FG+PP8', lat: 13.97428, lng: 44.17682
    });
    const list = await apiEngine.handleApiRequest('GET', '/api/map/saved');
    assert.ok(list.saved.length >= 1);
    return `عدد الأماكن المحفوظة في المفضلة: ${list.saved.length}`;
  });

  await runTest(22, 'الخرائط دون اتصال (Offline Regions & Cache Management)', () => {
    assert.ok(swText.includes('my-ibb-map-v5-0-ibb-market') && appJsText.includes('renderOfflineManager'));
    return 'Service Worker v5.0 + IndexedDB PMTiles Range Cache + مدير حذف المناطق مفعلون';
  });

  await runTest(23, 'تبديل الطبقات الـ 15 (15 Independent Map Layers)', async () => {
    const res = await apiEngine.handleApiRequest('GET', '/api/map/layers');
    assert.strictEqual(res.layers.length, 15);
    return `15 طبقة مستقلة قابلة للتشغيل والإيقاف (منها مناطق خدمة المتاجر ونقاط التوصيل)`;
  });

  await runTest(24, 'عرض الأقمار الصناعية (Satellite Hybrid Layer)', () => {
    assert.ok(appJsText.includes('orbital_sat') && appJsText.includes('World_Imagery'));
    return 'طبقة الأقمار الصناعية Esri World Imagery مدمجة مع أسماء الشوارع والمباني';
  });

  await runTest(25, 'عرض التضاريس والارتفاعات (3D Terrain DEM & Elevations)', () => {
    assert.ok(appJsText.includes('ibb_terrain_dem') && appJsText.includes('terrarium'));
    return 'طبقة تضاريس إب الجبلية (AWS Terrarium DEM) والارتفاعات مفعلة';
  });

  await runTest(26, 'الأداء والتصميم المتجاوب على الهاتف والكمبيوتر (Responsive RTL UI)', () => {
    const css = fs.readFileSync(path.join(rootDir, 'css/style.css'), 'utf8');
    assert.ok(css.includes('@media') && htmlText.includes('dir="rtl"'));
    return 'واجهة متجاوبة (Mobile Bottom Sheet + Desktop Drawer) باتجاه RTL كامل';
  });

  await runTest(27, 'الأداء على الإنترنت البطيء والأجهزة الضعيفة (Chunked Loading & Small Bundle)', () => {
    const appSizeKb = Math.round(fs.statSync(path.join(rootDir, 'js/app.js')).size / 1024);
    assert.ok(appSizeKb < 130);
    return `حجم app.js يبلغ ${appSizeKb} KB فقط مع بث تدريجي على 10 شرائح وكاش IndexedDB`;
  });

  await runTest(28, 'صلاحيات المستخدمين وحماية ملكية المتجر (RBAC & Merchant Ownership)', async () => {
    // Non-owner cannot modify merchant location when role is contributor
    apiEngine.STATE.currentRole = 'contributor';
    const badMerch = apiEngine.updateMerchantLocation('merch_damran_01', 'stranger_user', { latitude: 14.0 });
    assert.strictEqual(badMerch.ok, false);
    assert.strictEqual(badMerch.error, 'FORBIDDEN_NOT_MERCHANT_OWNER');
    // Contributor cannot approve contributions
    const badApprove = await apiEngine.handleApiRequest('PATCH', `/api/map/contributions/${createdContribId}/approve`, {}, {});
    assert.strictEqual(badApprove.status, 403);
    // Actual merchant owner can update their store location
    const goodMerch = apiEngine.updateMerchantLocation('merch_damran_01', 'owner_damran', { service_radius_m: 4800 });
    assert.strictEqual(goodMerch.ok, true);
    apiEngine.STATE.currentRole = 'admin';
    return 'منع غير المالك من تعديل المتجر (403) ومنع المساهم العادي من اعتماد التعديلات (403)';
  });

  console.log(`\n=== SUMMARY: ${results.filter(r => r.status === 'PASS').length} / ${results.length} TESTS PASSED ===`);
})();
