// ui.js – Разметка панели, вкладки, перевод подписей
window.KSL = window.KSL || {};

KSL.ICON_INVOICES =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M14 3.5V8a1 1 0 0 0 1 1h4M8.5 13h7M8.5 16.5h5"/></svg>';

KSL.buildPanelHtml = function () {
  return (
    '<button class="ksl-fab" id="fab">Kaspi Lens</button>' +
    '<div class="ksl-panel hidden" id="panel">' +
    '<div class="ksl-content" id="invoicesTab">' +
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
    '<div class="invoices-status" id="invoiceStatus"></div>' +
    '<div class="ksl-nav">' +
    '<button class="nav-btn active" data-tab="invoices" data-i18n-aria="navInvoices">' + KSL.ICON_INVOICES + '</button>' +
    '</div>' +
    '</div></div>'
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
    invoices: shadow.getElementById('invoicesTab')
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
