// طبقة واجهات البرمجة والتكامل مع إب ماركت وإدارة الجودة (IBB Market Map API & Store Engine v5.0)
// تنفذ الواجهات الـ 20 المطلوبة (/api/map/*)، الربط الثنائي (/store/{merchant_id})، لوحة الإدارة، ونظام الصلاحيات

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.IbbMarketEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUPABASE_URL = 'https://gdgtwonxbujgxfiqivvp.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZ3R3b254YnVqZ3hmaXFpdnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MjYzODAsImV4cCI6MjExMDEwMjM4MH0.F5Kq1s5pyIMch3aQGIOfU-B0V9fMVVvtO1Bm1y3FILI';

  const RECORD_STATUSES = ['RAW', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'];

  const REPORT_TYPES = [
    { code: 'CLOSED_STORE', labelAr: 'متجر مغلق' },
    { code: 'WRONG_LOCATION', labelAr: 'موقع خاطئ على الخريطة' },
    { code: 'NON_EXISTENT_STREET', labelAr: 'شارع غير موجود' },
    { code: 'BLOCKED_ROAD', labelAr: 'طريق مغلق أو مسدود' },
    { code: 'WRONG_NAME', labelAr: 'اسم غير صحيح' },
    { code: 'DUPLICATE_PLACE', labelAr: 'مكان مكرر' },
    { code: 'INCORRECT_INFO', labelAr: 'معلومات غير صحيحة' },
    { code: 'INAPPROPRIATE_PHOTO', labelAr: 'صورة غير مناسبة' },
    { code: 'REMOVED_PLACE', labelAr: 'مكان لم يعد موجوداً' }
  ];

  const EXPLORE_17_CATEGORIES = [
    { code: 'restaurant', nameAr: 'مطاعم', nameEn: 'Restaurants', icon: 'fa-utensils', color: '#f97316' },
    { code: 'cafe', nameAr: 'مقاهٍ', nameEn: 'Cafes', icon: 'fa-mug-hot', color: '#d97706' },
    { code: 'grocery', nameAr: 'بقالات', nameEn: 'Groceries', icon: 'fa-basket-shopping', color: '#10b981' },
    { code: 'supermarket', nameAr: 'أسواق', nameEn: 'Markets & Malls', icon: 'fa-cart-shopping', color: '#059669' },
    { code: 'pharmacy', nameAr: 'صيدليات', nameEn: 'Pharmacies', icon: 'fa-prescription-bottle-medical', color: '#ef4444' },
    { code: 'hospital', nameAr: 'مستشفيات', nameEn: 'Hospitals', icon: 'fa-hospital', color: '#dc2626' },
    { code: 'clinic', nameAr: 'عيادات', nameEn: 'Clinics', icon: 'fa-user-doctor', color: '#f43f5e' },
    { code: 'school', nameAr: 'مدارس', nameEn: 'Schools', icon: 'fa-school', color: '#3b82f6' },
    { code: 'university', nameAr: 'جامعات', nameEn: 'Universities', icon: 'fa-graduation-cap', color: '#2563eb' },
    { code: 'hotel', nameAr: 'فنادق', nameEn: 'Hotels', icon: 'fa-hotel', color: '#8b5cf6' },
    { code: 'gas', nameAr: 'محطات وقود', nameEn: 'Gas Stations', icon: 'fa-gas-pump', color: '#eab308' },
    { code: 'auto', nameAr: 'خدمات السيارات', nameEn: 'Auto Services', icon: 'fa-car-wrench', color: '#64748b' },
    { code: 'electronics', nameAr: 'أجهزة وصيانة', nameEn: 'Electronics', icon: 'fa-mobile-screen-button', color: '#0ea5e9' },
    { code: 'home_services', nameAr: 'خدمات منزلية', nameEn: 'Home Services', icon: 'fa-couch', color: '#14b8a6' },
    { code: 'tourism', nameAr: 'سياحة', nameEn: 'Tourism', icon: 'fa-mountain-sun', color: '#22c55e' },
    { code: 'landmark', nameAr: 'معالم', nameEn: 'Landmarks', icon: 'fa-mosque', color: '#0d9488' },
    { code: 'entertainment', nameAr: 'أماكن ترفيه', nameEn: 'Entertainment', icon: 'fa-futbol', color: '#ec4899' }
  ];

  const MAP_15_LAYERS = [
    { id: 'roads', nameAr: 'الطرق والشوارع', enabled: true },
    { id: 'buildings', nameAr: 'المباني ثلاثية الأبعاد', enabled: true },
    { id: 'stores', nameAr: 'متاجر إب ماركت', enabled: true },
    { id: 'restaurants', nameAr: 'المطاعم والمقاهي', enabled: true },
    { id: 'services', nameAr: 'الخدمات والمستشفيات', enabled: true },
    { id: 'landmarks', nameAr: 'المعالم التاريخية والمساجد', enabled: true },
    { id: 'neighborhoods', nameAr: 'الأحياء والحارات', enabled: true },
    { id: 'admin_bounds', nameAr: 'الحدود الإدارية للمديريات', enabled: true },
    { id: 'terrain', nameAr: 'التضاريس الجبلية', enabled: false },
    { id: 'elevations', nameAr: 'الارتفاعات والكنتور', enabled: true },
    { id: 'routes', nameAr: 'المسارات النشطة', enabled: true },
    { id: 'user_motion', nameAr: 'حركة المستخدم والمندوب', enabled: true },
    { id: 'service_zones', nameAr: 'مناطق خدمة المتاجر (Geofences)', enabled: true },
    { id: 'delivery_points', nameAr: 'نقاط التوصيل والاستلام', enabled: true },
    { id: 'pois', nameAr: 'نقاط الاهتمام العامة', enabled: true }
  ];

  const VERIFIED_MERCHANTS = [
    {
      merchant_id: 'merch_damran_01',
      store_id: 'store_damran_01',
      map_place_id: 'place_damran_01',
      location_id: 'loc_merch_damran_01',
      name_ar: 'ظمران سنتر — هايبرماركت إب ماركت',
      name_en: 'Damran Center Hypermarket',
      slug: 'damran-center',
      category_code: 'supermarket',
      category_ar: 'أسواق ومولات وتوصيل فوري',
      description_ar: 'أكبر مركز تسوق وتموينات غذائية واستهلاكية في محافظة إب مع توصيل فوري خلال 25 دقيقة عبر أسطول إب ماركت.',
      cover_image_url: './assets/streetview_3.jpg',
      logo_url: 'fa-cart-shopping',
      address_ar: 'طريق الدائري الغربي، جوار جولة العدين، إب (7H56X5C7+R2M)',
      neighborhood_ar: 'الدائري الغربي',
      phone: '+967 4 456 747',
      opening_hours: 'يومياً: 7:30 ص - 12:00 ص',
      is_open_now: true,
      rating: 4.7,
      reviews_count: 342,
      delivery_fee_yer: 500,
      delivery_eta_min: 20,
      owner_user_id: 'owner_damran',
      latitude: 13.97210,
      longitude: 44.16260,
      entrance_lat: 13.97214,
      entrance_lng: 44.16264,
      service_radius_m: 4500,
      verification_status: 'PUBLISHED',
      products_catalog: [
        { id: 'prd_101', name: 'أرز بسمتي هندي درجة أولى (10 كجم)', category: 'مواد غذائية', price_yer: 11500, in_stock: true, badge: 'الأكثر مبيعاً' },
        { id: 'prd_102', name: 'زيت طبخ نقي عبوة عائلية (4 لتر)', category: 'زيوت وسمن', price_yer: 4800, in_stock: true, badge: 'عرض خاص' },
        { id: 'prd_103', name: 'حليب مجفف كامل الدسم (2.5 كجم)', category: 'ألبان وأجبان', price_yer: 7900, in_stock: true, badge: 'متوفر' },
        { id: 'prd_104', name: 'عسل سدر يمني طبيعي (500 جرام)', category: 'منتجات يمنية', price_yer: 9500, in_stock: true, badge: 'أصلي موثق' }
      ],
      reviews: [
        { author_name: 'أكرم الحبيشي', rating: 5, comment_ar: 'خدمة توصيل ممتازة وسريعة وأسعار المواد الغذائية مناسبة جداً.' },
        { author_name: 'نبيل الورافي', rating: 5, comment_ar: 'المنتجات طازجة وموقع المتجر دقيق جداً على الخريطة.' }
      ]
    },
    {
      merchant_id: 'merch_juraan_02',
      store_id: 'store_juraan_02',
      map_place_id: 'place_juraan_02',
      location_id: 'loc_merch_juraan_02',
      name_ar: 'مركز جرعان التجاري — شارع العدين',
      name_en: 'Juraan Commercial Center',
      slug: 'juraan-center',
      category_code: 'supermarket',
      category_ar: 'مول تسوق ومستلزمات العائلة',
      description_ar: 'مركز تسوق متكامل في قلب شارع العدين التجاري يضم قسم المواد الغذائية، الأزياء، الإلكترونيات، والعطور.',
      cover_image_url: './assets/streetview_1.jpg',
      logo_url: 'fa-bag-shopping',
      address_ar: 'شارع العدين التجاري، وسط مدينة إب (7H56X5FG+F7G)',
      neighborhood_ar: 'شارع العدين',
      phone: '+967 777 402 624',
      opening_hours: 'يومياً: 8:00 ص - 11:30 م',
      is_open_now: true,
      rating: 4.6,
      reviews_count: 218,
      delivery_fee_yer: 600,
      delivery_eta_min: 18,
      owner_user_id: 'owner_juraan',
      latitude: 13.97370,
      longitude: 44.17570,
      entrance_lat: 13.97374,
      entrance_lng: 44.17574,
      service_radius_m: 4500,
      verification_status: 'PUBLISHED',
      products_catalog: [
        { id: 'prd_201', name: 'طقم قهوة عربية وبن يمني خولاني محمص (1 كجم)', category: 'قهوة وتمور', price_yer: 4200, in_stock: true, badge: 'بن يمني' },
        { id: 'prd_202', name: 'حقيبة مدرسية ظهر مقاومة للماء', category: 'قرطاسية وحقائب', price_yer: 6500, in_stock: true, badge: 'جديد' },
        { id: 'prd_203', name: 'طقم أواني منزلية جرانيت (9 قطع)', category: 'أدوات منزلية', price_yer: 24000, in_stock: true, badge: 'ضمان سنة' }
      ],
      reviews: [
        { author_name: 'سارة البعداني', rating: 5, comment_ar: 'كل مستلزمات الأسرة متوفرة في مكان واحد والتعامل راقٍ.' }
      ]
    },
    {
      merchant_id: 'merch_mazaya_03',
      store_id: 'store_mazaya_03',
      map_place_id: 'place_mazaya_03',
      location_id: 'loc_merch_mazaya_03',
      name_ar: 'مزايا سنتر Mazaia Center — شارع تعز',
      name_en: 'Mazaia Center Mall',
      slug: 'mazaia-center',
      category_code: 'supermarket',
      category_ar: 'مول تجاري وتسوق عائلي',
      description_ar: 'وجهة التسوق المتكاملة في شارع تعز العام للأغذية، الملبوسات، الهدايا، ومستلزمات الأطفال.',
      cover_image_url: './assets/streetview_4.jpg',
      logo_url: 'fa-store',
      address_ar: 'شارع تعز العام، مديرية الظهار، إب (7H56X58J+8H)',
      neighborhood_ar: 'شارع تعز',
      phone: '+967 771 725 322',
      opening_hours: 'يومياً: 8:30 ص - 11:30 م',
      is_open_now: true,
      rating: 4.5,
      reviews_count: 194,
      delivery_fee_yer: 550,
      delivery_eta_min: 22,
      owner_user_id: 'owner_mazaya',
      latitude: 13.96620,
      longitude: 44.18140,
      entrance_lat: 13.96624,
      entrance_lng: 44.18144,
      service_radius_m: 4500,
      verification_status: 'PUBLISHED',
      products_catalog: [
        { id: 'prd_301', name: 'صندوق تمور ملكية فاخرة (3 كجم)', category: 'تمور وحلويات', price_yer: 5400, in_stock: true, badge: 'طازج' },
        { id: 'prd_302', name: 'عطر شرقي فاخر بالعود والعنبر (100 مل)', category: 'عطور وتجميل', price_yer: 8500, in_stock: true, badge: 'مميز' }
      ],
      reviews: []
    },
    {
      merchant_id: 'merch_kayan_04',
      store_id: 'store_kayan_04',
      map_place_id: 'place_kayan_04',
      location_id: 'loc_merch_kayan_04',
      name_ar: 'كيان كافي — قهوة مختصة وحلويات',
      name_en: 'Kayan Specialty Cafe',
      slug: 'kayan-cafe',
      category_code: 'cafe',
      category_ar: 'مقهى مختص ومخبوزات طازجة',
      description_ar: 'أشهى أنواع القهوة المختصة والمشروبات الساخنة والباردة والحلويات الطازجة في شارع العدين.',
      cover_image_url: './assets/streetview_1.jpg',
      logo_url: 'fa-mug-hot',
      address_ar: 'شارع العدين التجاري، إب (7H56X5FG+PP8)',
      neighborhood_ar: 'شارع العدين',
      phone: '+967 770 634 720',
      opening_hours: 'يومياً: 8:00 ص - 11:45 م',
      is_open_now: true,
      rating: 4.8,
      reviews_count: 165,
      delivery_fee_yer: 450,
      delivery_eta_min: 15,
      owner_user_id: 'owner_kayan',
      latitude: 13.97428,
      longitude: 44.17682,
      entrance_lat: 13.97430,
      entrance_lng: 44.17685,
      service_radius_m: 3800,
      verification_status: 'PUBLISHED',
      products_catalog: [
        { id: 'prd_401', name: 'سبانيش لاتيه بارد (حجم كبير)', category: 'قهوة باردة', price_yer: 1400, in_stock: true, badge: 'الأكثر طلباً' },
        { id: 'prd_402', name: 'قهوة يمنية مقطرة V60 (بن حراز/عديني)', category: 'قهوة مختصة', price_yer: 1600, in_stock: true, badge: 'مختصة' },
        { id: 'prd_403', name: 'كيكة سان سيباستيان بالشوكلاتة البلجيكية', category: 'حلويات', price_yer: 1800, in_stock: true, badge: 'طازج يومياً' }
      ],
      reviews: [
        { author_name: 'محمد السراجي', rating: 5, comment_ar: 'أفضل قهوة مختصة في شارع العدين وجلسات هادئة.' }
      ]
    },
    {
      merchant_id: 'merch_noor_pharma_05',
      store_id: 'store_noor_pharma_05',
      map_place_id: 'place_noor_05',
      location_id: 'loc_merch_noor_pharma_05',
      name_ar: 'صيدلية نور فارما — خدمة دوائية 24 ساعة',
      name_en: 'Noor Pharma 24h Pharmacy',
      slug: 'noor-pharma',
      category_code: 'pharmacy',
      category_ar: 'صيدلية ومستلزمات طبية 24 ساعة',
      description_ar: 'توفير الأدوية والمستلزمات الطبية وأغذية الأطفال ومستحضرات العناية على مدار 24 ساعة مع توصيل سريع.',
      cover_image_url: './assets/streetview_2.jpg',
      logo_url: 'fa-prescription-bottle-medical',
      address_ar: 'شارع تعز العام، إب (7H56X55J+V7H)',
      neighborhood_ar: 'شارع تعز',
      phone: '+967 774 612 370',
      opening_hours: 'مفتوح 24 ساعة',
      is_open_now: true,
      rating: 4.9,
      reviews_count: 280,
      delivery_fee_yer: 400,
      delivery_eta_min: 14,
      owner_user_id: 'owner_noor',
      latitude: 13.95970,
      longitude: 44.18070,
      entrance_lat: 13.95972,
      entrance_lng: 44.18072,
      service_radius_m: 5000,
      verification_status: 'PUBLISHED',
      products_catalog: [
        { id: 'prd_501', name: 'جهاز قياس ضغط الدم الرقمي الأوتوماتيكي', category: 'أجهزة طبية', price_yer: 14500, in_stock: true, badge: 'طبي معتمد' },
        { id: 'prd_502', name: 'حليب أطفال مدعم بالفيتامينات (900 جرام)', category: 'عناية بالطفل', price_yer: 5200, in_stock: true, badge: 'متوفر' }
      ],
      reviews: []
    },
    {
      merchant_id: 'merch_ayman_tech_06',
      store_id: 'store_ayman_tech_06',
      map_place_id: 'place_ayman_06',
      location_id: 'loc_merch_ayman_tech_06',
      name_ar: 'أبو أيمن للأجهزة الذكية والطاقة الشمسية',
      name_en: 'Abu Ayman Smart Devices & Solar',
      slug: 'abu-ayman-tech',
      category_code: 'electronics',
      category_ar: 'هواتف ذكية وإلكترونيات وطاقة شمسية',
      description_ar: 'بيع وصيانة الهواتف الذكية وملحقاتها ومنظومات الطاقة الشمسية والبطاريات في شارع العدين.',
      cover_image_url: './assets/streetview_1.jpg',
      logo_url: 'fa-mobile-screen-button',
      address_ar: 'شارع العدين التجاري، إب (7H56X5FG+F80)',
      neighborhood_ar: 'شارع العدين',
      phone: '+967 771 882 410',
      opening_hours: 'السبت - الخميس: 8:30 ص - 10:00 م',
      is_open_now: true,
      rating: 4.7,
      reviews_count: 142,
      delivery_fee_yer: 600,
      delivery_eta_min: 25,
      owner_user_id: 'owner_ayman',
      latitude: 13.97405,
      longitude: 44.17510,
      entrance_lat: 13.97408,
      entrance_lng: 44.17512,
      service_radius_m: 4500,
      verification_status: 'PUBLISHED',
      products_catalog: [
        { id: 'prd_601', name: 'خازن طاقة باور بانك شحن سريع 20,000mAh', category: 'ملحقات الهواتف', price_yer: 8900, in_stock: true, badge: 'شحن سريع PD' },
        { id: 'prd_602', name: 'لوح طاقة شمسية مونو كريستال 200 واط', category: 'طاقة شمسية', price_yer: 36000, in_stock: true, badge: 'كفاءة عالية' }
      ],
      reviews: []
    }
  ];

  // In-memory state for fast testing and offline resilience
  const STATE = {
    currentRole: 'admin', // 'contributor' | 'reviewer' | 'admin' | 'merchant'
    currentUserId: 'owner_damran',
    contributorPoints: 120,
    savedMapCamera: { lat: 13.9715, lng: 44.1680, zoom: 16.2, pitch: 54, bearing: -16, query: '' },
    activeStoreId: null,
    contributions: [
      {
        id: 'contrib_seed_01',
        contribution_type: 'ADD_PLACE',
        name_ar: 'مخبز وحلويات اللواء الأخضر',
        category_code: 'bakery',
        neighborhood_ar: 'شارع العدين',
        lat: 13.97390,
        lng: 44.17320,
        old_data: {},
        new_data: { name_ar: 'مخبز وحلويات اللواء الأخضر', phone: '+967 777 112 233' },
        contributor_id: 'user_ibb_10',
        contributor_name: 'عمار البعداني',
        points_awarded: 15,
        verification_status: 'PENDING_REVIEW',
        is_published: false,
        created_at: new Date().toISOString()
      }
    ],
    reports: [],
    reviews: [],
    photos: [],
    savedPlaces: [],
    auditLog: []
  };

  function getBadgeForPoints(pts) {
    if (pts >= 200) return 'خبير خرائط إب الماسي 💎';
    if (pts >= 100) return 'مستكشف إب الذهبي 🥇';
    if (pts >= 50) return 'مساهم فضي موثق 🥈';
    return 'مساهم محلي صاعد 🥉';
  }

  function checkPermission(requiredRoles) {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(STATE.currentRole) || STATE.currentRole === 'admin';
  }

  function findMerchantForPlace(placeOrId) {
    if (!placeOrId) return null;
    if (typeof placeOrId === 'string') {
      return VERIFIED_MERCHANTS.find(m => m.merchant_id === placeOrId || m.store_id === placeOrId || m.slug === placeOrId) || null;
    }
    if (placeOrId.merchantId || placeOrId.merchant_id) {
      const id = placeOrId.merchantId || placeOrId.merchant_id;
      const byId = VERIFIED_MERCHANTS.find(m => m.merchant_id === id || m.store_id === id);
      if (byId) return byId;
    }
    const pName = (placeOrId.name || placeOrId.name_ar || '').trim();
    return VERIFIED_MERCHANTS.find(m => {
      const shortName = m.name_ar.split('—')[0].trim();
      return (pName && (m.name_ar.includes(pName) || pName.includes(shortName))) ||
        (placeOrId.lat && Math.abs(m.latitude - placeOrId.lat) < 0.0004 && Math.abs(m.longitude - placeOrId.lng) < 0.0004);
    }) || null;
  }

  // Bi-directional Navigation: Map <-> Store (/store/{merchant_id})
  function openStoreFromMap(merchantId, currentCameraState) {
    const merch = findMerchantForPlace(merchantId);
    if (!merch) return { openedStore: false, fallbackToPlaceCard: true, route: null };
    if (currentCameraState) {
      STATE.savedMapCamera = { ...STATE.savedMapCamera, ...currentCameraState };
    }
    STATE.activeStoreId = merch.merchant_id;
    return {
      openedStore: true,
      route: `/store/${merch.merchant_id}`,
      merchant: merch,
      preservedCamera: STATE.savedMapCamera
    };
  }

  function returnToMapFromStore(locateStoreOnMap = false) {
    const merch = findMerchantForPlace(STATE.activeStoreId);
    STATE.activeStoreId = null;
    if (locateStoreOnMap && merch) {
      return {
        route: '/map',
        camera: { lat: merch.latitude, lng: merch.longitude, zoom: 18.4, pitch: 58, bearing: -12 },
        highlightMerchant: merch
      };
    }
    return {
      route: '/map',
      camera: { ...STATE.savedMapCamera },
      highlightMerchant: null
    };
  }

  // Merchant Portal: Update pin, entrance, or delivery zone (requires ownership or admin)
  function updateMerchantLocation(merchantId, actorUserId, updates) {
    const merch = findMerchantForPlace(merchantId);
    if (!merch) return { ok: false, error: 'MERCHANT_NOT_FOUND' };
    if (merch.owner_user_id !== actorUserId && STATE.currentRole !== 'admin') {
      return { ok: false, error: 'FORBIDDEN_NOT_MERCHANT_OWNER' };
    }
    if (typeof updates.latitude === 'number') merch.latitude = updates.latitude;
    if (typeof updates.longitude === 'number') merch.longitude = updates.longitude;
    if (typeof updates.entrance_lat === 'number') merch.entrance_lat = updates.entrance_lat;
    if (typeof updates.entrance_lng === 'number') merch.entrance_lng = updates.entrance_lng;
    if (typeof updates.opening_hours === 'string') merch.opening_hours = updates.opening_hours;
    if (typeof updates.service_radius_m === 'number') merch.service_radius_m = updates.service_radius_m;

    STATE.auditLog.push({
      action: 'UPDATE_MERCHANT_LOCATION',
      merchant_id: merch.merchant_id,
      actor: actorUserId,
      timestamp: new Date().toISOString()
    });
    return { ok: true, merchant: merch };
  }

  // Unified API Router covering all 20 required endpoints (/api/map/*)
  async function handleApiRequest(method, path, params = {}, body = {}) {
    const m = method.toUpperCase();

    // 1. GET /api/map/tiles/{z}/{x}/{y}
    if (m === 'GET' && path.startsWith('/api/map/tiles/')) {
      const parts = path.replace('/api/map/tiles/', '').split('/');
      return { status: 200, endpoint: 'GET /api/map/tiles/{z}/{x}/{y}', z: +parts[0], x: +parts[1], y: +parts[2], archive: './pmtiles/base.pmtiles' };
    }
    // 2. GET /api/map/features
    if (m === 'GET' && path === '/api/map/features') {
      return { status: 200, count: VERIFIED_MERCHANTS.length, features: VERIFIED_MERCHANTS };
    }
    // 3. GET /api/map/places
    if (m === 'GET' && path === '/api/map/places') {
      return { status: 200, verification_filter: 'PUBLISHED', places: VERIFIED_MERCHANTS };
    }
    // 4. GET /api/map/search
    if (m === 'GET' && path === '/api/map/search') {
      const q = (params.q || '').toLowerCase();
      const hits = VERIFIED_MERCHANTS.filter(x => x.name_ar.includes(q) || (x.name_en || '').toLowerCase().includes(q));
      return { status: 200, query: params.q, results: hits };
    }
    // 5. GET /api/map/nearby
    if (m === 'GET' && path === '/api/map/nearby') {
      return { status: 200, center: { lat: params.lat || 13.972, lng: params.lng || 44.168 }, results: VERIFIED_MERCHANTS };
    }
    // 6. GET /api/map/place/{id}
    if (m === 'GET' && path.startsWith('/api/map/place/')) {
      const id = path.replace('/api/map/place/', '');
      const found = findMerchantForPlace(id) || VERIFIED_MERCHANTS[0];
      return { status: 200, place: found };
    }
    // 7 & 8. GET /api/map/route & GET /api/map/directions
    if (m === 'GET' && (path === '/api/map/route' || path === '/api/map/directions')) {
      return { status: 200, mode: params.mode || 'driving', waypoints: params.waypoints || [], engine: 'IBB_A_STAR_CH' };
    }
    // 9. GET /api/map/layers
    if (m === 'GET' && path === '/api/map/layers') {
      return { status: 200, layers: MAP_15_LAYERS };
    }
    // 10. GET /api/map/merchant/{id}
    if (m === 'GET' && path.startsWith('/api/map/merchant/')) {
      const id = path.replace('/api/map/merchant/', '');
      const merch = findMerchantForPlace(id);
      return merch ? { status: 200, merchant: merch } : { status: 404, error: 'MERCHANT_NOT_FOUND' };
    }
    // 11 & 12. POST /api/map/contributions & POST /api/map/places
    if (m === 'POST' && (path === '/api/map/contributions' || path === '/api/map/places')) {
      // Rule 6 & 10: Raw/Community submissions NEVER auto-promote to VERIFIED or PUBLISHED
      const item = {
        id: 'contrib_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        contribution_type: body.contribution_type || (path === '/api/map/places' ? 'ADD_PLACE' : 'EDIT_PLACE'),
        name_ar: body.name_ar || 'معلم جديد',
        category_code: body.category_code || 'shop',
        lat: +body.lat || 13.972,
        lng: +body.lng || 44.168,
        geometry_geojson: body.geometry_geojson || null,
        old_data: body.old_data || {},
        new_data: body.new_data || body,
        contributor_id: body.contributor_id || STATE.currentUserId,
        points_awarded: 15,
        verification_status: 'PENDING_REVIEW',
        is_published: false,
        created_at: new Date().toISOString()
      };
      STATE.contributions.unshift(item);
      STATE.contributorPoints += 15;
      STATE.auditLog.push({ action: 'CREATE_CONTRIBUTION', id: item.id, status: item.verification_status });
      return { status: 201, contribution: item, contributorPoints: STATE.contributorPoints, badge: getBadgeForPoints(STATE.contributorPoints) };
    }
    // 13. POST /api/map/reviews
    if (m === 'POST' && path === '/api/map/reviews') {
      const rev = {
        id: 'rev_' + Date.now(),
        place_name_ar: body.place_name_ar || 'منشأة في إب',
        merchant_id: body.merchant_id || null,
        author_name: body.author_name || 'مستخدم إب ماركت',
        rating: Math.max(1, Math.min(5, +body.rating || 5)),
        comment_ar: body.comment_ar || '',
        created_at: new Date().toISOString()
      };
      STATE.reviews.unshift(rev);
      STATE.contributorPoints += 10;
      return { status: 201, review: rev };
    }
    // 14. POST /api/map/photos
    if (m === 'POST' && path === '/api/map/photos') {
      const ph = {
        id: 'photo_' + Date.now(),
        place_id: body.place_id || null,
        image_url: body.image_url || './assets/streetview_1.jpg',
        caption_ar: body.caption_ar || 'صورة ميدانية موثقة',
        lat: +body.lat || 13.972,
        lng: +body.lng || 44.168,
        captured_at: new Date().toISOString(),
        source_code: body.source_code || 'user_upload'
      };
      STATE.photos.unshift(ph);
      STATE.contributorPoints += 10;
      return { status: 201, photo: ph };
    }
    // 15. POST /api/map/reports
    if (m === 'POST' && path === '/api/map/reports') {
      const rep = {
        id: 'rep_' + Date.now(),
        place_name_ar: body.place_name_ar || 'موقع على الخريطة',
        report_type: body.report_type || 'INCORRECT_INFO',
        report_reason_ar: body.report_reason_ar || 'معلومات غير صحيحة',
        details_ar: body.details_ar || '',
        lat: +body.lat || 13.972,
        lng: +body.lng || 44.168,
        verification_status: 'PENDING_REVIEW',
        created_at: new Date().toISOString()
      };
      STATE.reports.unshift(rep);
      return { status: 201, report: rep };
    }
    // 16. PATCH /api/map/places/{id}
    if (m === 'PATCH' && path.startsWith('/api/map/places/')) {
      const id = path.replace('/api/map/places/', '');
      const editItem = {
        id: 'edit_' + Date.now(),
        contribution_type: 'EDIT_PLACE',
        target_place_id: id,
        name_ar: body.name_ar || 'تعديل مكان',
        old_data: body.old_data || {},
        new_data: body,
        verification_status: 'PENDING_REVIEW',
        is_published: false,
        created_at: new Date().toISOString()
      };
      STATE.contributions.unshift(editItem);
      return { status: 200, queued_for_review: true, contribution: editItem };
    }
    // 17. PATCH /api/map/contributions/{id}/approve
    if (m === 'PATCH' && path.endsWith('/approve')) {
      if (!checkPermission(['reviewer', 'admin'])) {
        return { status: 403, error: 'FORBIDDEN_REVIEWER_OR_ADMIN_REQUIRED' };
      }
      const id = path.replace('/api/map/contributions/', '').replace('/approve', '');
      const item = STATE.contributions.find(c => c.id === id);
      if (!item) return { status: 404, error: 'CONTRIBUTION_NOT_FOUND' };
      // Section 16 invariant: VERIFIED does NOT automatically mean PUBLISHED unless explicitly requested
      item.verification_status = body.publish === true ? 'PUBLISHED' : 'VERIFIED';
      item.is_published = (item.verification_status === 'PUBLISHED');
      item.reviewer_id = body.reviewer_id || 'admin_reviewer';
      STATE.auditLog.push({ action: 'APPROVE_CONTRIBUTION', id: item.id, new_status: item.verification_status });
      return { status: 200, contribution: item };
    }
    // 18. PATCH /api/map/contributions/{id}/reject
    if (m === 'PATCH' && path.endsWith('/reject')) {
      if (!checkPermission(['reviewer', 'admin'])) {
        return { status: 403, error: 'FORBIDDEN_REVIEWER_OR_ADMIN_REQUIRED' };
      }
      const id = path.replace('/api/map/contributions/', '').replace('/reject', '');
      const item = STATE.contributions.find(c => c.id === id);
      if (!item) return { status: 404, error: 'CONTRIBUTION_NOT_FOUND' };
      item.verification_status = 'REJECTED';
      item.is_published = false;
      item.reviewer_id = body.reviewer_id || 'admin_reviewer';
      STATE.auditLog.push({ action: 'REJECT_CONTRIBUTION', id: item.id, new_status: 'REJECTED' });
      return { status: 200, contribution: item };
    }
    // 19 & 20. GET /api/map/saved & POST /api/map/saved
    if (path === '/api/map/saved') {
      if (m === 'GET') return { status: 200, saved: STATE.savedPlaces };
      if (m === 'POST') {
        const sp = {
          id: 'saved_' + Date.now(),
          name_ar: body.name_ar || 'مكان محفوظ',
          category_ar: body.category_ar || 'المفضلة',
          plus_code: body.plus_code || '',
          lat: +body.lat || 13.972,
          lng: +body.lng || 44.168,
          created_at: new Date().toISOString()
        };
        STATE.savedPlaces.unshift(sp);
        return { status: 201, savedPlace: sp };
      }
    }

    return { status: 404, error: 'ENDPOINT_NOT_FOUND', path };
  }

  return {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    RECORD_STATUSES,
    REPORT_TYPES,
    EXPLORE_17_CATEGORIES,
    MAP_15_LAYERS,
    VERIFIED_MERCHANTS,
    STATE,
    getBadgeForPoints,
    checkPermission,
    findMerchantForPlace,
    openStoreFromMap,
    returnToMapFromStore,
    updateMerchantLocation,
    handleApiRequest
  };
});
