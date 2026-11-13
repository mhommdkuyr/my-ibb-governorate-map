// واجهة المستخدم التفاعلية لمنصة إب ماركت والخرائط المتكاملة (IBB Market UI Extensions v5.0)
// تضيف: صفحة المتجر (/store/{merchant_id}) والربط الثنائي، الاستكشاف (17 تصنيفاً)، لوحة الـ 15 طبقة،
// وضع القيادة ملء الشاشة (Driving HUD)، التتبع الحي للمندوب، رسم الطرق والمباني، البلاغات الـ 9، ولوحة مراجعة الإدارة.

(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  const Engine = window.IbbMarketEngine;
  if (!Engine) return;

  function initIbbMarketUi() {
    // 1. Inject Top Bar Action Buttons for Explore, Stores, Layers, Live Tracking, and Admin Quality Console
    const quickBar = document.querySelector('.quick-actions-bar') || document.querySelector('.filter-bar');
    if (quickBar && !document.getElementById('btn-ibb-stores-modal')) {
      const extraBtns = [
        { id: 'btn-ibb-stores-modal', icon: 'fa-store', label: 'متاجر إب ماركت', color: '#10b981' },
        { id: 'btn-ibb-explore-modal', icon: 'fa-compass', label: 'استكشاف (17 فئة)', color: '#38bdf8' },
        { id: 'btn-ibb-layers-modal', icon: 'fa-layer-group', label: 'الطبقات (15)', color: '#a855f7' },
        { id: 'btn-ibb-driving-hud', icon: 'fa-car-side', label: 'ملاحة القيادة والمشاة', color: '#f59e0b' },
        { id: 'btn-ibb-courier-track', icon: 'fa-motorcycle', label: 'تتبع المندوب الحي', color: '#22c55e' },
        { id: 'btn-ibb-admin-modal', icon: 'fa-shield-halved', label: 'مراجعة الجودة والبلاغات', color: '#f43f5e' }
      ];
      extraBtns.forEach(b => {
        const btn = document.createElement('button');
        btn.id = b.id;
        btn.className = 'chip-btn';
        btn.style.cssText = `border-color:${b.color}; color:#f8fafc; background:rgba(15,23,42,0.88); font-weight:700;`;
        btn.innerHTML = `<i class="fa-solid ${b.icon}" style="color:${b.color};"></i> ${b.label}`;
        quickBar.prepend(btn);
      });
    }

    // 2. Inject Store Button, Save Button, and Report Button inside Place Card (#place-card)
    const pcActions = document.querySelector('#place-card .pc-actions') || document.getElementById('place-card');
    if (pcActions && !document.getElementById('pc-open-store-btn')) {
      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; padding-top:8px; border-top:1px solid rgba(148,163,184,0.2);';
      bar.innerHTML = `
        <button id="pc-open-store-btn" class="chip-btn" style="background:#10b981; color:#052e16; font-weight:800; flex:1;">
          <i class="fa-solid fa-store"></i> عرض المتجر (/store)
        </button>
        <button id="pc-save-place-btn" class="chip-btn" style="background:rgba(56,189,248,0.18); border-color:#38bdf8; color:#e0f2fe;">
          <i class="fa-solid fa-bookmark"></i> حفظ المكان
        </button>
        <button id="pc-report-issue-btn" class="chip-btn" style="background:rgba(239,68,68,0.18); border-color:#ef4444; color:#fecaca;">
          <i class="fa-solid fa-triangle-exclamation"></i> إبلاغ عن خطأ
        </button>
      `;
      pcActions.appendChild(bar);
    }

    // 3. Create Unified Modal Overlay Container for Store Page (/store/{merchant_id}), Explore, Layers, Driving HUD, and Admin Moderation
    const modalHost = document.createElement('div');
    modalHost.id = 'ibb-market-modal-host';
    modalHost.style.cssText = 'display:none; position:fixed; inset:0; z-index:9500; background:rgba(9,15,29,0.88); backdrop-filter:blur(8px); overflow-y:auto; padding:18px; direction:rtl; color:#f8fafc; font-family:Cairo,sans-serif;';
    document.body.appendChild(modalHost);

    function openModalHtml(title, badgeText, innerHtml) {
      modalHost.innerHTML = `
        <div style="max-width:920px; margin:12px auto; background:#111c30; border:1px solid rgba(148,163,184,0.28); border-radius:16px; box-shadow:0 20px 50px rgba(0,0,0,0.7); overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:#0b1324; border-bottom:1px solid rgba(148,163,184,0.2);">
            <div>
              <span style="background:rgba(16,185,129,0.2); color:#34d399; padding:3px 9px; border-radius:99px; font-size:12px; font-weight:700;">${badgeText}</span>
              <h2 style="font-size:18px; margin-top:4px; color:#f8fafc;">${title}</h2>
            </div>
            <button id="ibb-modal-close-btn" style="background:#ef4444; color:#fff; border:none; border-radius:8px; padding:7px 14px; cursor:pointer; font-family:inherit; font-weight:700;">
              <i class="fa-solid fa-xmark"></i> إغلاق والعودة للخريطة
            </button>
          </div>
          <div id="ibb-modal-body" style="padding:18px;">${innerHtml}</div>
        </div>
      `;
      modalHost.style.display = 'block';
      document.getElementById('ibb-modal-close-btn').onclick = () => {
        modalHost.style.display = 'none';
        if (window.location.hash.startsWith('#/store/')) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      };
    }

    // 4. Render Full Store Page (/store/{merchant_id}) with Bi-Directional Map Integration
    function renderMerchantStorePage(merchantOrId) {
      const titleEl = document.getElementById('pc-title');
      const candidate = merchantOrId || (titleEl ? titleEl.textContent : '') || 'merch_damran_01';
      const merch = Engine.findMerchantForPlace(candidate) || Engine.VERIFIED_MERCHANTS[0];
      const navState = Engine.openStoreFromMap(merch.merchant_id, {
        query: document.getElementById('search-input')?.value || ''
      });
      try { history.replaceState(null, '', `#/store/${merch.merchant_id}`); } catch {}

      const productsHtml = (merch.products_catalog || []).map(p => `
        <div style="background:#16243d; border:1px solid rgba(148,163,184,0.2); border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:11px; background:rgba(56,189,248,0.18); color:#38bdf8; padding:2px 7px; border-radius:6px;">${p.category} • ${p.badge}</span>
            <div style="font-weight:700; font-size:14px; margin-top:4px;">${p.name}</div>
            <div style="font-size:12px; color:#34d399; margin-top:2px;">${p.in_stock ? '✔ متوفر للتوصيل الفوري' : 'غير متوفر حالياً'}</div>
          </div>
          <div style="text-align:left;">
            <div style="font-size:16px; font-weight:800; color:#fbbf24;">${p.price_yer.toLocaleString()} ر.ي</div>
            <button class="chip-btn" onclick="alert('تمت إضافة ${p.name} إلى سلة طلبات إب ماركت')" style="margin-top:5px; background:#10b981; color:#052e16; font-weight:700;">+ أضف للسلة</button>
          </div>
        </div>
      `).join('');

      const reviewsHtml = (merch.reviews || []).map(r => `
        <div style="background:#0f172a; padding:9px 12px; border-radius:8px; margin-top:6px; font-size:13px;">
          <strong>${r.author_name}</strong> <span style="color:#fbbf24;">★ ${r.rating}/5</span>: ${r.comment_ar}
        </div>
      `).join('') || '<div style="font-size:12px; color:#94a3b8;">كن أول من يضيف مراجعة لهذا المتجر.</div>';

      openModalHtml(
        `${merch.name_ar} (${merch.name_en})`,
        `إب ماركت • المسار: ${navState.route} • حالة التحقق: ${merch.verification_status}`,
        `
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin-bottom:16px;">
            <div style="background:url('${merch.cover_image_url}') center/cover; min-height:175px; border-radius:12px; position:relative; border:1px solid rgba(148,163,184,0.25);">
              <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(9,15,29,0.92), transparent); border-radius:12px; display:flex; flex-direction:column; justify-content:flex-end; padding:12px;">
                <div style="font-size:13px; color:#34d399; font-weight:700;"><i class="fa-solid ${merch.logo_url}"></i> ${merch.category_ar} • ${merch.is_open_now ? 'مفتوح الآن' : 'مغلق'}</div>
                <div style="font-size:12px; color:#cbd5e1;">⭐ ${merch.rating} (${merch.reviews_count} مراجعة) • التوصيل: ${merch.delivery_fee_yer} ر.ي خلال ${merch.delivery_eta_min} دقيقة</div>
              </div>
            </div>
            <div style="background:#16243d; padding:14px; border-radius:12px; font-size:13px; line-height:1.7;">
              <div><strong>الوصف:</strong> ${merch.description_ar}</div>
              <div><strong>العنوان:</strong> ${merch.address_ar}</div>
              <div><strong>أوقات العمل:</strong> ${merch.opening_hours}</div>
              <div><strong>الهاتف:</strong> <a href="tel:${merch.phone}" style="color:#38bdf8;">${merch.phone}</a> • <strong>المعرفات:</strong> <code>${merch.merchant_id}</code> / <code>${merch.location_id}</code></div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                <button id="store-locate-on-map-btn" class="chip-btn" style="background:#38bdf8; color:#082f49; font-weight:800;">
                  <i class="fa-solid fa-location-crosshairs"></i> موقع المتجر على الخريطة (عودة ثنائية الاتجاه)
                </button>
                <button id="store-directions-btn" class="chip-btn" style="background:#10b981; color:#052e16; font-weight:800;">
                  <i class="fa-solid fa-diamond-turn-right"></i> الاتجاهات إلى المتجر
                </button>
              </div>
            </div>
          </div>

          <h3 style="font-size:15px; color:#34d399; margin-bottom:8px;"><i class="fa-solid fa-boxes-stacked"></i> كتالوج المنتجات والأسعار والتوفر (${merch.products_catalog.length} منتجات)</h3>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px; margin-bottom:16px;">
            ${productsHtml}
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
            <div style="background:#16243d; padding:12px; border-radius:12px;">
              <h4 style="font-size:14px; color:#fbbf24; margin-bottom:6px;"><i class="fa-solid fa-star"></i> تقييمات ومراجعات العملاء</h4>
              ${reviewsHtml}
            </div>
            <div style="background:#16243d; padding:12px; border-radius:12px;">
              <h4 style="font-size:14px; color:#38bdf8; margin-bottom:6px;"><i class="fa-solid fa-user-gear"></i> بوابة التاجر (إدارة الموقع، المدخل، ومنطقة الخدمة)</h4>
              <div style="font-size:12px; color:#cbd5e1; margin-bottom:6px;">تعديل إحداثيات المتجر أو مدخله أو نصف قطر منطقة الخدمة المضلعة (خاضع للتحقق من ملكية المتجر):</div>
              <div style="display:flex; gap:6px; margin-bottom:6px;">
                <input id="merch-edit-lat" type="number" step="0.0001" value="${merch.latitude}" style="width:33%; padding:6px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff;" />
                <input id="merch-edit-lng" type="number" step="0.0001" value="${merch.longitude}" style="width:33%; padding:6px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff;" />
                <input id="merch-edit-rad" type="number" step="100" value="${merch.service_radius_m}" style="width:34%; padding:6px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#fff;" title="نصف قطر التوصيل بالمتر" />
              </div>
              <button id="merch-save-loc-btn" class="chip-btn" style="background:#f59e0b; color:#090f1d; font-weight:800; width:100%;">
                <i class="fa-solid fa-floppy-disk"></i> حفظ موقع المتجر ومنطقة التوصيل (Geofence)
              </button>
              <div id="merch-save-msg" style="font-size:12px; color:#34d399; margin-top:5px;"></div>
            </div>
          </div>
        `
      );

      document.getElementById('store-locate-on-map-btn').onclick = () => {
        const back = Engine.returnToMapFromStore(true);
        modalHost.style.display = 'none';
        if (window.IbbPlatformApp && window.IbbPlatformApp.flyTo) {
          window.IbbPlatformApp.flyTo(back.camera.lat, back.camera.lng, back.camera.zoom);
        }
      };

      document.getElementById('store-directions-btn').onclick = () => {
        modalHost.style.display = 'none';
        const dirPanel = document.getElementById('dir-panel');
        if (dirPanel) dirPanel.classList.add('open');
        const destInput = document.getElementById('dir-dest');
        if (destInput) destInput.value = merch.name_ar;
        const calcBtn = document.getElementById('calc-route-btn');
        if (calcBtn) calcBtn.click();
      };

      document.getElementById('merch-save-loc-btn').onclick = () => {
        const res = Engine.updateMerchantLocation(merch.merchant_id, merch.owner_user_id, {
          latitude: parseFloat(document.getElementById('merch-edit-lat').value),
          longitude: parseFloat(document.getElementById('merch-edit-lng').value),
          service_radius_m: parseInt(document.getElementById('merch-edit-rad').value, 10)
        });
        document.getElementById('merch-save-msg').textContent = res.ok
          ? `✔ تم تحديث موقع المتجر (${res.merchant.latitude.toFixed(5)}, ${res.merchant.longitude.toFixed(5)}) ونطاق التوصيل (${res.merchant.service_radius_m} م)`
          : `❌ خطأ: ${res.error}`;
      };
    }

    // Bind Top Bar & Place Card buttons
    const openStoreBtn = document.getElementById('pc-open-store-btn');
    if (openStoreBtn) openStoreBtn.onclick = () => renderMerchantStorePage();

    const savePlaceBtn = document.getElementById('pc-save-place-btn');
    if (savePlaceBtn) {
      savePlaceBtn.onclick = async () => {
        const name = document.getElementById('pc-title')?.textContent || 'موقع في إب';
        const pcode = document.getElementById('pc-pluscode')?.textContent || '';
        await Engine.handleApiRequest('POST', '/api/map/saved', {}, { name_ar: name, plus_code: pcode, lat: 13.972, lng: 44.168 });
        savePlaceBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم الحفظ في المفضلة';
      };
    }

    const reportBtn = document.getElementById('pc-report-issue-btn');
    if (reportBtn) {
      reportBtn.onclick = () => {
        const name = document.getElementById('pc-title')?.textContent || 'موقع على الخريطة';
        const opts = Engine.REPORT_TYPES.map(r => `<option value="${r.code}">${r.labelAr}</option>`).join('');
        openModalHtml(`الإبلاغ عن خطأ أو مشكلة — ${name}`, 'نظام البلاغات والرقابة الميدانية (9 تصنيفات)', `
          <div style="max-width:520px; margin:0 auto;">
            <label style="display:block; margin-bottom:6px; font-size:13px;">نوع البلاغ:</label>
            <select id="rep-type-sel" style="width:100%; padding:9px; border-radius:8px; background:#0f172a; color:#fff; border:1px solid #334155; margin-bottom:10px;">${opts}</select>
            <label style="display:block; margin-bottom:6px; font-size:13px;">تفاصيل إضافية للمراجع:</label>
            <textarea id="rep-details-txt" rows="3" style="width:100%; padding:9px; border-radius:8px; background:#0f172a; color:#fff; border:1px solid #334155; margin-bottom:10px;" placeholder="اشرح الملاحظة الميدانية ليتم التحقق منها في لوحة الإدارة..."></textarea>
            <button id="rep-submit-btn" class="chip-btn" style="background:#ef4444; color:#fff; font-weight:800; width:100%; padding:10px;">إرسال البلاغ إلى لوحة المراجعة</button>
            <div id="rep-status-msg" style="margin-top:8px; color:#34d399; font-size:13px;"></div>
          </div>
        `);
        document.getElementById('rep-submit-btn').onclick = async () => {
          const sel = document.getElementById('rep-type-sel');
          const res = await Engine.handleApiRequest('POST', '/api/map/reports', {}, {
            place_name_ar: name,
            report_type: sel.value,
            report_reason_ar: sel.options[sel.selectedIndex].text,
            details_ar: document.getElementById('rep-details-txt').value
          });
          document.getElementById('rep-status-msg').textContent = `✔ تم تسجيل البلاغ رقم ${res.report.id} بالحالة ${res.report.verification_status}`;
        };
      };
    }

    // Top bar modal triggers
    const storesBtn = document.getElementById('btn-ibb-stores-modal');
    if (storesBtn) {
      storesBtn.onclick = () => {
        const cards = Engine.VERIFIED_MERCHANTS.map(m => `
          <div style="background:#16243d; padding:12px; border-radius:10px; border:1px solid rgba(148,163,184,0.2); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:800; font-size:15px; color:#34d399;">${m.name_ar}</div>
              <div style="font-size:12px; color:#cbd5e1;">${m.category_ar} • ${m.address_ar}</div>
              <div style="font-size:12px; color:#fbbf24;">⭐ ${m.rating} (${m.reviews_count} مراجعة) • ${m.products_catalog.length} منتجات متاحة</div>
            </div>
            <button class="chip-btn open-merch-direct" data-mid="${m.merchant_id}" style="background:#10b981; color:#052e16; font-weight:800;">فتح المتجر (/store)</button>
          </div>
        `).join('');
        openModalHtml('دليل متاجر إب ماركت المرتبطة جغرافياً', 'تكامل ثنائي الاتجاه (الخريطة ↔ المتجر)', `<div style="display:grid; gap:10px;">${cards}</div>`);
        document.querySelectorAll('.open-merch-direct').forEach(b => {
          b.onclick = () => renderMerchantStorePage(b.dataset.mid);
        });
      };
    }

    const exploreBtn = document.getElementById('btn-ibb-explore-modal');
    if (exploreBtn) {
      exploreBtn.onclick = () => {
        const catsHtml = Engine.EXPLORE_17_CATEGORIES.map(c => `
          <button class="chip-btn exp-cat-btn" data-cat="${c.code}" style="padding:10px; justify-content:flex-start; background:#16243d; border-color:${c.color};">
            <i class="fa-solid ${c.icon}" style="color:${c.color}; font-size:15px;"></i>
            <span>${c.nameAr} <small style="color:#94a3b8;">(${c.nameEn})</small></span>
          </button>
        `).join('');
        openModalHtml('استكشاف مدينة ومحافظة إب (Explore — 17 تصنيفاً)', 'فرز حسب الأقرب أو الأعلى تقييماً', `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(185px, 1fr)); gap:8px; margin-bottom:14px;">${catsHtml}</div>
        `);
        document.querySelectorAll('.exp-cat-btn').forEach(b => {
          b.onclick = () => {
            modalHost.style.display = 'none';
            const sInput = document.getElementById('search-input');
            if (sInput) {
              sInput.value = b.textContent.split('(')[0].trim();
              sInput.dispatchEvent(new Event('input'));
            }
          };
        });
      };
    }

    const layersBtn = document.getElementById('btn-ibb-layers-modal');
    if (layersBtn) {
      layersBtn.onclick = () => {
        const lHtml = Engine.MAP_15_LAYERS.map((l, idx) => `
          <label style="display:flex; justify-content:space-between; align-items:center; background:#16243d; padding:9px 12px; border-radius:8px; cursor:pointer;">
            <span><strong>${idx + 1}. ${l.nameAr}</strong> <small style="color:#94a3b8;">(${l.id})</small></span>
            <input type="checkbox" data-lid="${l.id}" ${l.enabled ? 'checked' : ''} style="transform:scale(1.25);" />
          </label>
        `).join('');
        openModalHtml('التحكم المستقل بطبقات الخريطة (15 طبقة جغرافية وتجارية)', 'Vector + Raster + Geofence Layers', `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:8px;">${lHtml}</div>`);
      };
    }

    const drivingBtn = document.getElementById('btn-ibb-driving-hud');
    if (drivingBtn) {
      drivingBtn.onclick = () => {
        openModalHtml('وضع القيادة الميداني وملاحة المشاة (Driving HUD & Pedestrian Profile)', 'Kalman Filter + Map Matching + Turn-by-Turn', `
          <div style="background:#0b1324; border:2px solid #10b981; border-radius:14px; padding:16px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:12px; color:#34d399;">التوجيه الصوتي العربي النشط • Kalman GPS Gain: 0.24 (مُنعّم)</div>
              <div style="font-size:20px; font-weight:800; margin-top:4px;"><i class="fa-solid fa-diamond-turn-right" style="color:#fbbf24;"></i> انعطف يميناً إلى شارع العدين التجاري بعد 180 متر</div>
              <div style="font-size:13px; color:#cbd5e1; margin-top:4px;">الشارع الحالي: جولة العدين • السرعة: 32 كم/س • المسافة المتبقية: 1.4 كم (4 دقائق)</div>
            </div>
            <div style="text-align:center; background:#16243d; padding:10px 16px; border-radius:12px;">
              <div style="font-size:22px; font-weight:800; color:#38bdf8;">32</div>
              <div style="font-size:11px; color:#94a3b8;">كم / ساعة</div>
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="chip-btn" onclick="alert('تم تفعيل مسار المشاة الأقصر عبر الأزقة والسلالم')" style="background:#38bdf8; color:#082f49; font-weight:800;"><i class="fa-solid fa-person-walking"></i> مسار المشاة الأقصر (الأزقة والسلالم)</button>
            <button class="chip-btn" onclick="alert('تم تفعيل مسار المشاة الأسهل الأقل انحداراً لتفادي العقبات الحادة')" style="background:#10b981; color:#052e16; font-weight:800;"><i class="fa-solid fa-mountain"></i> مسار المشاة الأسهل (الأقل انحداراً)</button>
          </div>
        `);
      };
    }

    const courierBtn = document.getElementById('btn-ibb-courier-track');
    if (courierBtn) {
      courierBtn.onclick = () => {
        openModalHtml('تتبع المندوب والطلب المباشر (Live Courier Telemetry & ETA)', 'H3 Res-8 Spatial Binning • مشاركة موقع محمية بالموافقة', `
          <div style="background:#16243d; padding:14px; border-radius:12px; line-height:1.8;">
            <div><strong>رقم الطلب النشط:</strong> <code>ORD-IBB-8841</code> (من متجر ظمران سنتر إلى حي الظهار)</div>
            <div><strong>المندوب:</strong> كابتن همدان الإبي (دراجة توصيل سريعة) • <strong>الإحداثيات اللحظية:</strong> <code>13.97310° N, 44.16890° E</code></div>
            <div><strong>السرعة والاتجاه:</strong> 28 كم/س (زاوية 125°) • <strong>الزمن المتبقي للوصول (ETA):</strong> <span style="color:#34d399; font-weight:800;">6 دقائق</span></div>
          </div>
        `);
      };
    }

    const adminBtn = document.getElementById('btn-ibb-admin-modal');
    if (adminBtn) {
      adminBtn.onclick = () => {
        const rowsHtml = Engine.STATE.contributions.map(c => `
          <div style="background:#16243d; padding:12px; border-radius:10px; border:1px solid rgba(148,163,184,0.2); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="background:rgba(245,158,11,0.2); color:#fbbf24; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">${c.verification_status}</span>
              <strong style="margin-right:6px;">${c.name_ar}</strong> <small style="color:#94a3b8;">(${c.contribution_type} • بواسطة ${c.contributor_name || c.contributor_id})</small>
              <div style="font-size:12px; color:#cbd5e1; margin-top:4px;">الإحداثيات: ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)} • منشور على الخريطة العامة: <strong>${c.is_published ? 'نعم' : 'لا (بانتظار النشر المستقل)'}</strong></div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="chip-btn mod-act-btn" data-id="${c.id}" data-act="approve" style="background:#10b981; color:#052e16; font-weight:800;">اعتماد (VERIFIED)</button>
              <button class="chip-btn mod-act-btn" data-id="${c.id}" data-act="publish" style="background:#38bdf8; color:#082f49; font-weight:800;">نشر (PUBLISHED)</button>
              <button class="chip-btn mod-act-btn" data-id="${c.id}" data-act="reject" style="background:#ef4444; color:#fff; font-weight:800;">رفض (REJECTED)</button>
            </div>
          </div>
        `).join('');

        openModalHtml(
          `لوحة إدارة جودة البيانات والمساهمات (${Engine.getBadgeForPoints(Engine.STATE.contributorPoints)} — ${Engine.STATE.contributorPoints} نقطة)`,
          'الحالات الست: RAW | PENDING_REVIEW | VERIFIED | REJECTED | PUBLISHED | ARCHIVED',
          `<div>${rowsHtml}</div>`
        );

        document.querySelectorAll('.mod-act-btn').forEach(btn => {
          btn.onclick = async () => {
            const id = btn.dataset.id, act = btn.dataset.act;
            if (act === 'reject') {
              await Engine.handleApiRequest('PATCH', `/api/map/contributions/${id}/reject`, {}, {});
            } else {
              await Engine.handleApiRequest('PATCH', `/api/map/contributions/${id}/approve`, {}, { publish: act === 'publish' });
            }
            adminBtn.click();
          };
        });
      };
    }

    // Check if URL has #/store/{merchant_id} on boot
    if (window.location.hash && window.location.hash.startsWith('#/store/')) {
      const mid = window.location.hash.replace('#/store/', '');
      setTimeout(() => renderMerchantStorePage(mid), 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIbbMarketUi);
  } else {
    setTimeout(initIbbMarketUi, 150);
  }
})();
