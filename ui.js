// ui.js – Разметка панели, вкладки, перевод подписей
window.KSL = window.KSL || {};

KSL.ICON_CALC =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7h7M9 11h.01M12 11h.01M15 11h.01M9 14.5h.01M12 14.5h.01M15 14.5h.01M9 18h3.5M15 18h.01"/></svg>';

KSL.ICON_MERCHANT =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 10.5h16l-1.2-5.2A1.7 1.7 0 0 0 17.2 4H6.8a1.7 1.7 0 0 0-1.6 1.3L4 10.5Z"/><path d="M5 10.5V20h14v-9.5M8 20v-5h8v5M4 10.5c.5 1.3 2.7 1.3 3.2 0 .5 1.3 2.7 1.3 3.2 0 .5 1.3 2.7 1.3 3.2 0 .5 1.3 2.7 1.3 3.2 0"/></svg>';

KSL.ICON_INVOICES =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M14 3.5V8a1 1 0 0 0 1 1h4M8.5 13h7M8.5 16.5h5"/></svg>';

KSL.ICON_SETTINGS =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>';

KSL.ICON_PROFILES =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.3"/><circle cx="16.5" cy="16.5" r="2.3"/></svg>';

KSL.ICON_HISTORY =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4.5v5h5"/><path d="M12 7.5V12l3 1.8"/></svg>';

KSL.ICON_COPY =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>';

KSL.ICON_CHECK =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20 6 9 17l-5-5"/></svg>';


KSL.ICON_PICK =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 5v14M5 12h14"/></svg>';

KSL.ICON_UPLOAD =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h13A1.5 1.5 0 0 0 21 18.5V14"/></svg>';

KSL.buildPanelHtml = function (merchantId) {
  const merchantLink = merchantId ? 'https://kaspi.kz/shop/search/?q=%3AallMerchants%3A' + merchantId : '';
  const merchantInfoLink = merchantId ? 'https://kaspi.kz/shop/info/merchant/' + merchantId + '/reviews/' : '';
  const isMerchantMode = Boolean(merchantId);
  const isProductMode = KSL.isProductPage && KSL.isProductPage();
  const merchantNav = isProductMode ? '' : '<button class="nav-btn active" data-tab="merchant" data-i18n-aria="navMerchant">' + KSL.ICON_MERCHANT + '</button>';
  const calculatorNav = isMerchantMode ? '' : '<button class="nav-btn' + (isProductMode ? ' active' : '') + '" data-tab="calculator" data-i18n-aria="navCalculator">' + KSL.ICON_CALC + '</button>';

  return (
    '<button class="ksl-fab" id="fab">KSL</button>' +
    '<div class="ksl-panel hidden" id="panel">' +
    '<div class="ksl-content" id="merchantTab">' +
    KSL.Ads.getBannerHtml() +
    '<div class="card merchant-card">' +
    '<div class="card-title merchant-title" id="merchantTitleText" data-i18n="merchantTitle">Магазин Kaspi</div>' +
    (merchantId
      ? '<div class="merchant-meta"><span data-i18n="merchantId">Merchant ID</span><b id="merchantId">' + merchantId + '</b></div>' +
        '<div class="merchant-page hidden" id="merchantRegisterText"></div>' +
        '<div class="merchant-page hidden" id="merchantRatingText"></div>' +
        '<div class="merchant-contact hidden" id="merchantPhoneText"></div>'
      : '<div class="merchant-page" data-i18n="merchantUnavailable">Магазин не найден на этой странице</div>') +
    '</div>' +
    (merchantId
      ? '<div class="merchant-actions">' +
        '<a class="btn" target="_blank" data-i18n="openMerchant" href="' + merchantLink + '">Товары</a>' +
        '<button type="button" class="soft-btn" id="copyMerchantBtn" data-link="' + merchantInfoLink + '" data-i18n="copyMerchantLink">Копировать</button>' +
        '</div>'
      : '') +
    '</div>' +
    '<div class="ksl-content hidden" id="calculatorTab">' +
    KSL.Ads.getBannerHtml() +
    '<div class="card metric"><div class="metric-tip" data-i18n-tooltip="revenueTip"><div class="metric-label" data-i18n="revenue">Оценка выручки</div>' +
    '<div class="metric-value" id="revenue">—</div></div>' +
    '<div class="profit-strip"><div class="metric-tip" data-i18n-tooltip="netProfitTip"><span data-i18n="netProfit">Доход после налогов</span><strong class="metric-positive" id="netProfitTotal">—</strong></div>' +
    '<div class="metric-tip" data-i18n-tooltip="profitPerUnitTip"><span data-i18n="profitPerUnit">Доход / 1 шт</span><strong class="metric-positive" id="profitPerUnit">—</strong></div>' +
    '<div class="metric-tip" data-i18n-tooltip="totalFeesTip"><span data-i18n="totalFees">Все расходы + налоги</span><strong class="metric-negative" id="totalFees">—</strong><small id="totalFeesPercent"></small></div></div></div>' +
    '<div class="card product-card" id="productCard" role="button" tabindex="0" data-i18n-aria="copyProductLink">' +
    '<div class="product-summary"><div class="product-thumb" id="productThumb" role="button" tabindex="0" data-i18n-aria="viewProductPhoto"></div><div class="product-info">' +
    '<div class="product-title" id="productTitle">—</div>' +
    '<div class="product-meta product-fact-row"><span class="product-meta-label" data-i18n="productSkuLabel">Арт.</span>' +
    '<span class="product-sku" id="productSku">—</span>' +
    '<button type="button" class="product-copy-btn" id="copyProductLinkBtn" data-i18n-aria="copyProductLink">' + KSL.ICON_COPY + '</button></div></div></div></div>' +
    '<div class="calc-actions"><button type="button" class="soft-btn" id="extraCalcBtn" data-i18n="extraCalculations">Расходы</button>' +
    '<div class="card extra-card hidden" id="extraCalcPanel">' +
    '<div class="extra-head"><span></span><b data-i18n="extraAll">Все</b><em data-i18n="extraUnit">Шт</em></div>' +
    '<div class="extra-row"><span data-i18n="extraPurchase">Цена закупа</span><b id="extraPurchaseTotal">—</b><em id="extraPurchaseUnit">—</em></div>' +
    '<div class="extra-row"><span data-i18n="extraDelivery">Доставка Kaspi</span><b id="extraDeliveryTotal">—</b><em id="extraDeliveryUnit">—</em></div>' +
    '<div class="extra-row"><span data-i18n="extraCommission">Комиссия категории</span><b id="extraCommissionTotal">—</b><em id="extraCommissionUnit">—</em></div>' +
    '<div class="extra-row"><span data-i18n="extraPackaging">Упаковка</span><b id="extraPackagingTotal">—</b><em id="extraPackagingUnit">—</em></div>' +
    '<div class="extra-row"><span data-i18n="extraCargo">Карго</span><b id="extraCargoTotal">—</b><em id="extraCargoUnit">—</em></div>' +
    '<div class="extra-row"><span data-i18n="extraReviewBonus">Бонус за отзыв</span><b id="extraReviewBonusTotal">—</b><em id="extraReviewBonusUnit">—</em></div>' +
    '<div class="extra-row"><span data-i18n="extraAds">Реклама</span><b id="extraAdsTotal">—</b><em id="extraAdsUnit">—</em></div>' +
    '<div class="extra-row"><span data-i18n="extraTax">ИПН</span><b id="extraTaxTotal">—</b><em id="extraTaxUnit">—</em></div>' +
    '<div class="extra-row is-total"><span data-i18n="extraTotal">Всего расходов</span><b id="extraCostTotal">—</b><em id="extraCostUnit">—</em></div>' +
    '<div class="extra-row is-ratio"><span data-i18n="extraMargin">Маржа</span><b id="extraMarginValue">—</b></div>' +
    '<div class="extra-row is-ratio"><span id="extraRoiLabel" data-i18n="extraRoi">ROI</span><b id="extraRoiValue">—</b></div>' +
    '</div>' +
    '<button type="button" class="soft-btn calc-inputs-toggle" id="calcInputsToggle" data-i18n="calcInputsToggle">Параметры</button>' +
    '<div class="card calc-card hidden">' +
    '<div class="calc-row"><label for="calcProductPrice" data-i18n="calcProductPrice">Цена товара</label><div class="input-affix money"><input id="calcProductPrice" data-calc-key="productPrice" inputmode="numeric" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcSalesCount" data-i18n="calcSalesCount">Отзывы/продажи</label><div class="input-affix"><input id="calcSalesCount" data-calc-key="salesCount" inputmode="numeric" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcCost" data-i18n="calcCost">Цена закупа</label><div class="input-affix money"><input id="calcCost" data-calc-key="cost" inputmode="numeric" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcCargo" data-i18n="calcCargo">Карго / шт</label><div class="input-affix money"><input id="calcCargo" data-calc-key="cargo" inputmode="numeric" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcDelivery" data-i18n="calcDelivery">Доставка Kaspi / шт</label><div class="input-affix money"><input id="calcDelivery" data-calc-key="delivery" inputmode="numeric" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcPackaging" data-i18n="calcPackaging">Упаковка / шт</label><div class="input-affix money"><input id="calcPackaging" data-calc-key="packaging" inputmode="numeric" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcCommission" data-i18n="calcCommission">Kaspi категория</label><div class="input-affix percent"><input id="calcCommission" data-calc-key="commissionPercent" inputmode="decimal" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcReviewBonus" data-i18n="calcReviewBonus">Бонус за отзыв / шт</label><div class="input-affix money"><input id="calcReviewBonus" data-calc-key="reviewBonus" inputmode="numeric" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcAds" data-i18n="calcAds">Реклама / шт</label><div class="input-affix money"><input id="calcAds" data-calc-key="adsPerUnit" inputmode="numeric" type="text"></div></div>' +
    '<div class="calc-row"><label for="calcTax" data-i18n="calcTax">ИПН</label><div class="input-affix percent"><input id="calcTax" data-calc-key="taxPercent" inputmode="decimal" type="text"></div></div>' +
    '</div>' +
    '<div class="calc-quick-actions">' +
    '<button type="button" class="soft-btn" id="exportMenuBtn" data-i18n="exportMenu" aria-expanded="false" aria-controls="exportOptionsPanel">Экспорт</button>' +
    '<button type="button" class="soft-btn" id="downloadPhotosBtn" data-i18n="downloadPhotos">Скачать фото товара</button>' +
    '<button type="button" class="soft-btn" id="addHistoryBtn" data-i18n="addToHistory">В историю</button></div>' +
    '<div class="export-options hidden" id="exportOptionsPanel">' +
    '<button type="button" class="soft-btn" id="exportReportBtn" data-i18n="exportReport">Excel-отчёт</button>' +
    '<button type="button" class="soft-btn" id="screenshotReportBtn" data-i18n="screenshotReport">Фото-отчёт</button></div></div>' +
    '</div>' +
    KSL.buildProfilesHtml() +
    KSL.buildHistoryHtml() +
    '<div class="ksl-content hidden" id="invoicesTab">' +
    KSL.Ads.getBannerHtml() +
    '<div class="card"><div class="card-title" data-i18n="invoicesTitle">Объединение накладных</div>' +
    '<p class="invoices-desc" data-i18n="invoicesDesc">Загрузите ZIP от Kaspi. PDF внутри станут одним файлом.</p>' +
    '<label class="file-wrap"><input type="file" id="invoiceZip" accept=".zip,application/zip" class="file-hidden">' +
    '<span class="upload-zone"><span class="upload-title" data-i18n="invoicesDropTitle">Перетащите ZIP сюда</span>' +
    '<span class="upload-hint" data-i18n="invoicesDropHint">или нажмите для выбора</span></span></label>' +
    '<div class="invoice-file-card hidden" id="invoiceFileCard">' +
    '<div class="invoice-file-icon"><span>ZIP</span></div>' +
    '<div class="invoice-file-info"><div class="invoice-file-name" id="invoiceFileName">—</div>' +
    '<div class="invoice-file-meta" id="invoiceFileMeta">—</div></div>' +
    '<button type="button" class="invoice-file-clear" id="invoiceFileClear" aria-label="Очистить файл">×</button></div></div>' +
    '<div class="card layout-card">' +
    '<p class="invoices-desc layout-desc" data-i18n="invoicesLayoutDesc">A4: несколько накладных на лист.\nТермо: одна накладная 75x120 мм.</p>' +
    '<div class="layout-grid">' +
    '<button type="button" class="layout-btn active" data-layout="4" data-i18n="layout4">4</button>' +
    '<button type="button" class="layout-btn" data-layout="8" data-i18n="layout8">8</button>' +
    '<button type="button" class="layout-btn" data-layout="9" data-i18n="layout9">9</button>' +
    '<button type="button" class="layout-btn" data-layout="16" data-i18n="layout16">16 на 1</button>' +
    '<button type="button" class="layout-btn" data-layout="thermal" data-i18n="layoutThermal">Термо 75x120</button>' +
    '</div></div>' +
    '<button type="button" class="btn" id="invoiceMergeBtn" data-i18n="invoicesMerge" disabled>Объединить PDF</button>' +
    '<div class="invoices-status" id="invoiceStatus"></div></div>' +
    '<div class="ksl-content hidden" id="settingsTab">' +
    KSL.Ads.getBannerHtml() +
    '<div class="card selector-card" id="selectorCard"><div class="selector-head"><div class="card-title" data-i18n="selectors">Данные товара</div>' +
    '<span class="selector-count" id="selectorCount">0 из 6</span></div>' +
    '<p class="selector-intro" id="selectorIntro" data-i18n="selectorsIntro">Выберите данные товара на странице Kaspi.</p>' +
    '<button type="button" class="btn selector-start-btn" id="selectorStartBtn" data-key="title" data-i18n="selectorsStart">Начать настройку</button>' +
    '<div class="selector-item" data-selector-item="title"><div class="setting-row"><span data-i18n="title">Название товара</span><button class="pick-btn" data-key="title" data-i18n-aria="pick"><span>' + KSL.ICON_PICK + '</span></button></div>' +
    '<div class="selector-help" data-i18n="titleHelp">Нажмите на название товара.</div>' +
    '<div class="selector-status is-pick" data-status="title">Нужно выбрать</div></div>' +
    '<div class="selector-item" data-selector-item="image"><div class="setting-row"><span data-i18n="image">Фото карточки</span><button class="pick-btn" data-key="image" data-i18n-aria="pick"><span>' + KSL.ICON_PICK + '</span></button></div>' +
    '<div class="selector-help" data-i18n="imageHelp">Нажмите на главное фото.</div>' +
    '<div class="selector-status is-pick" data-status="image">Нужно выбрать</div></div>' +
    '<div class="selector-item" data-selector-item="category"><div class="setting-row"><span data-i18n="category">Категория товара</span><button class="pick-btn" data-key="category" data-i18n-aria="pick"><span>' + KSL.ICON_PICK + '</span></button></div>' +
    '<div class="selector-help" data-i18n="categoryHelp">Нужно для комиссии.</div>' +
    '<div class="selector-status is-pick" data-status="category">Нужно выбрать</div></div>' +
    '<div class="selector-item" data-selector-item="price"><div class="setting-row"><span data-i18n="price">Цена товара</span><button class="pick-btn" data-key="price" data-i18n-aria="pick"><span>' + KSL.ICON_PICK + '</span></button></div>' +
    '<div class="selector-help" data-i18n="priceHelp">Нажмите на цену товара.</div>' +
    '<div class="selector-status is-pick" data-status="price">Нужно выбрать</div></div>' +
    '<div class="selector-item" data-selector-item="reviews"><div class="setting-row"><span data-i18n="sales">Отзывы/продажи</span><button class="pick-btn" data-key="reviews" data-i18n-aria="pick"><span>' + KSL.ICON_PICK + '</span></button></div>' +
    '<div class="selector-help" data-i18n="salesHelp">Нажмите на строку отзывов.</div>' +
    '<div class="selector-status is-pick" data-status="reviews">Нужно выбрать</div></div>' +
    '<div class="selector-item" data-selector-item="sku"><div class="setting-row"><span data-i18n="sku">Код товара</span><button class="pick-btn" data-key="sku" data-i18n-aria="pick"><span>' + KSL.ICON_PICK + '</span></button></div>' +
    '<div class="selector-help" data-i18n="skuHelp">Нажмите на код товара.</div>' +
    '<div class="selector-status is-pick" data-status="sku">Нужно выбрать</div></div></div>' +
    '<div class="card settings-control-card"><div class="setting-row"><span data-i18n="lang">Язык</span>' +
    '<div class="seg-toggle" id="langToggle">' +
    '<button type="button" class="seg-opt" data-lang="kk">KZ</button>' +
    '<button type="button" class="seg-opt active" data-lang="ru">RU</button></div></div>' +
    '<div class="setting-row setting-row-last"><span data-i18n="darkMode">Тёмная тема</span>' +
    '<label class="switch"><input type="checkbox" id="themeToggle"><span class="switch-slider"></span></label></div>' +
    '<div class="setting-note" data-i18n="darkModeHint">Удобно вечером.</div>' +
    '<div class="setting-row setting-row-last"><span data-i18n="autoOpen">Авто-открытие</span>' +
    '<label class="switch"><input type="checkbox" id="autoOpenToggle" checked><span class="switch-slider"></span></label></div>' +
    '<div class="setting-note" data-i18n="autoOpenHint">Панель откроется сама.</div>' +
    '<div class="setting-row setting-row-last"><span data-i18n="autoOpenInputs">Авто-параметры</span>' +
    '<label class="switch"><input type="checkbox" id="autoOpenInputsToggle"><span class="switch-slider"></span></label></div>' +
    '<div class="setting-note" data-i18n="autoOpenInputsHint">Сразу открыть параметры.</div>' +
    '<div class="setting-row setting-row-last"><span data-i18n="autoOpenExtra">Авто-расходы</span>' +
    '<label class="switch"><input type="checkbox" id="autoOpenExtraToggle"><span class="switch-slider"></span></label></div>' +
    '<div class="setting-note" data-i18n="autoOpenExtraHint">Сразу открыть расходы.</div></div></div>' +
    '<div class="ksl-nav">' +
    merchantNav +
    calculatorNav +
    '<button class="nav-btn" data-tab="profiles" data-i18n-aria="navProfiles">' + KSL.ICON_PROFILES + '</button>' +
    '<button class="nav-btn" data-tab="history" data-i18n-aria="navHistory">' + KSL.ICON_HISTORY + '</button>' +
    '<button class="nav-btn" data-tab="invoices" data-i18n-aria="navInvoices">' + KSL.ICON_INVOICES + '</button>' +
    '<button class="nav-btn" data-tab="settings" data-i18n-aria="navSettings">' + KSL.ICON_SETTINGS + '</button>' +
    '</div>' +
    '<div class="image-viewer hidden" id="productImageViewer"><div class="image-viewer-photo" id="productImagePreview"></div></div></div>'
  );
};

KSL.applyI18n = function (shadow, lang) {
  const dict = KSL.getDict(lang);
  shadow.querySelectorAll('[data-i18n]').forEach(function (el) {
    if (dict[el.dataset.i18n]) el.textContent = dict[el.dataset.i18n];
  });
  shadow.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
    if (dict[el.dataset.i18nAria]) el.setAttribute('aria-label', dict[el.dataset.i18nAria]);
  });
  shadow.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    if (dict[el.dataset.i18nPlaceholder]) el.setAttribute('placeholder', dict[el.dataset.i18nPlaceholder]);
  });
  shadow.querySelectorAll('[data-i18n-tooltip]').forEach(function (el) {
    if (dict[el.dataset.i18nTooltip]) el.setAttribute('data-tooltip', dict[el.dataset.i18nTooltip]);
  });
  shadow.querySelectorAll('#langToggle .seg-opt').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
};

KSL.bindTabs = function (shadow, onTab) {
  const tabs = {
    merchant: shadow.getElementById('merchantTab'),
    calculator: shadow.getElementById('calculatorTab'),
    profiles: shadow.getElementById('profilesTab'),
    history: shadow.getElementById('historyTab'),
    invoices: shadow.getElementById('invoicesTab'),
    settings: shadow.getElementById('settingsTab')
    
  };

  function openTab(name, options) {
    options = options || {};
    shadow.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    Object.keys(tabs).forEach(function (key) {
      if (!tabs[key]) return;
      tabs[key].classList.toggle('hidden', key !== name);
      if (key !== name) tabs[key].classList.remove('is-tab-entering');
    });
    const activeTab = tabs[name];
    if (activeTab && !options.silent) {
      if (activeTab._kslEnterTimer) clearTimeout(activeTab._kslEnterTimer);
      activeTab.classList.remove('is-tab-entering');
      void activeTab.offsetWidth;
      activeTab.classList.add('is-tab-entering');
      activeTab._kslEnterTimer = setTimeout(function () {
        activeTab.classList.remove('is-tab-entering');
        activeTab._kslEnterTimer = null;
      }, 420);
    }
    if (onTab && !options.silent) onTab(name);
    if (!options.keepScroll && tabs[name]) {
      tabs[name].scrollTop = 0;
      requestAnimationFrame(function () {
        tabs[name].scrollTop = 0;
      });
    }
  }

  shadow.querySelectorAll('.nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openTab(btn.dataset.tab);
    });
  });

  return { openTab: openTab };
};
