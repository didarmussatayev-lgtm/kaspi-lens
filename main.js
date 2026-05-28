/** Точка входа: запуск расширения на kaspi.kz */
(function () {
  if (window.__KSL__) return;
  window.__KSL__ = true;

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = KSL.getRuntimeUrl('styles/styles.css');
  shadow.appendChild(link);

  const m = location.pathname.match(/merchant\/(\d+)/);
  const app = document.createElement('div');
  app.className = 'ksl-app';
  app.innerHTML = KSL.buildPanelHtml(m ? m[1] : null);
  shadow.appendChild(app);
  document.documentElement.appendChild(host);

  const panel = shadow.getElementById('panel');
  const themeToggle = shadow.getElementById('themeToggle');
  const autoOpenToggle = shadow.getElementById('autoOpenToggle');
  const autoOpenInputsToggle = shadow.getElementById('autoOpenInputsToggle');
  const autoOpenExtraToggle = shadow.getElementById('autoOpenExtraToggle');
  const calc = KSL.createCalculator(shadow);

  async function getLang() {
    const d = await KSL.getStore();
    return d.lang === 'kk' ? 'kk' : 'ru';
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    app.classList.toggle('is-dark', isDark);
    if (themeToggle) themeToggle.checked = isDark;
  }

  const tabs = KSL.bindTabs(shadow, function (tab) {
    if (tab === 'calculator') calc.parseLive();
    if (tab === 'merchant') updateMerchantProfile();
    if (tab === 'history') KSL.renderHistory(shadow);
  });

  KSL.Ads.bindEvents(shadow);
  KSL.bindProfiles(shadow, getLang);
  KSL.bindHistory(shadow);

  function textFrom(selector) {
    const el = document.querySelector(selector);
    return el ? KSL.getElementText(el) : '';
  }

  function updateText(id, value) {
    const el = shadow.getElementById(id);
    if (!el) return;
    if (value) {
      el.textContent = value;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function formatMerchantPhone(text) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    const plusMatch = raw.match(/\+7[\s()\-]*\d{3}[\s()\-]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/);
    if (plusMatch) return plusMatch[0].replace(/\s+/g, ' ').trim();
    const groups = raw.match(/\d{10,11}/g) || [];
    const mobile = groups.find(function (group) {
      return group.length === 11 && /^[78]7/.test(group);
    }) || groups.find(function (group) {
      return group.length === 10 && /^7/.test(group);
    });
    if (!mobile) return raw.includes('/') || /tele2|altel|оператор/i.test(raw) ? '' : raw.slice(0, 32);
    const digits = mobile.length === 10 ? '7' + mobile : mobile.replace(/^8/, '7');
    return '+7 (' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7, 9) + '-' + digits.slice(9, 11);
  }

  function updateMerchantProfile() {
    const root = document.querySelector('.merchant-profile__description');
    if (!root) return;
    const title = textFrom('.merchant-profile__description .merchant-profile__title');
    const titleEl = shadow.getElementById('merchantTitleText');
    if (titleEl && title) {
      titleEl.textContent = title;
      titleEl.removeAttribute('data-i18n');
    }
    updateText('merchantRegisterText', '');
    updateText('merchantRatingText', '');
    updateText('merchantPhoneText', '');
  }

  async function refreshAfterSelectorChange() {
    let selectors = await KSL.getSelectors();
    let lang = await getLang();
    calc.updateStatus(selectors, lang);
    try {
      const result = await calc.parseLive();
      if (result) {
        selectors = result.selectors;
        lang = result.lang;
        calc.updateStatus(selectors, lang);
      }
    } catch (err) {
      console.error('KSL selector refresh failed', err);
    }
    panel.classList.remove('hidden');
    if (KSL.hasUsableSelectors ? KSL.hasUsableSelectors(selectors) : KSL.hasRequiredSelectors(selectors)) {
      tabs.openTab('calculator', { silent: true });
    } else {
      tabs.openTab('settings', { silent: true });
    }
  }

  KSL.bindInvoices(shadow, async function () {
    return KSL.getDict(await getLang());
  });

  KSL.initPicker({
    host: host,
    shadow: shadow,
    panel: panel,
    onSaved: refreshAfterSelectorChange
  });

  const selectorStartBtn = shadow.getElementById('selectorStartBtn');
  if (selectorStartBtn) {
    selectorStartBtn.addEventListener('click', function () {
      const key = selectorStartBtn.dataset.key;
      const nextButton = key ? shadow.querySelector('.pick-btn[data-key="' + key + '"]') : null;
      if (nextButton) nextButton.click();
    });
  }

  let panelOpenedAutomatically = false;

  async function getManualOpenTab() {
    if (KSL.isMerchantPage()) return 'merchant';
    if (KSL.isProductPage()) {
      const selectors = await KSL.getSelectors();
      return (KSL.hasUsableSelectors ? KSL.hasUsableSelectors(selectors) : KSL.hasRequiredSelectors(selectors)) ? 'calculator' : 'settings';
    }
    return 'invoices';
  }

  shadow.getElementById('fab').addEventListener('click', async function () {
    if (!panel.classList.contains('hidden')) {
      panel.classList.add('hidden');
      panelOpenedAutomatically = false;
      return;
    }
    panelOpenedAutomatically = false;
    tabs.openTab(await getManualOpenTab(), { silent: true });
    panel.classList.remove('hidden');
  });

  shadow.querySelectorAll('#langToggle .seg-opt').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const lang = btn.dataset.lang === 'kk' ? 'kk' : 'ru';
      await KSL.saveSetting('lang', lang);
      KSL.applyI18n(shadow, lang);
      calc.parseLive();
    });
  });

  if (themeToggle) {
    themeToggle.addEventListener('change', async function () {
      const theme = themeToggle.checked ? 'dark' : 'light';
      applyTheme(theme);
      await KSL.saveSetting('theme', theme);
    });
  }

  autoOpenToggle.addEventListener('change', async function () {
    await KSL.saveSetting('autoOpen', autoOpenToggle.checked);
    if (autoOpenToggle.checked) await applyAutoOpen();
  });

  if (autoOpenInputsToggle) {
    autoOpenInputsToggle.addEventListener('change', async function () {
      await KSL.saveSetting('autoOpenInputs', autoOpenInputsToggle.checked);
      const calcCard = shadow.querySelector('.calc-card');
      if (calcCard) calcCard.classList.toggle('hidden', !autoOpenInputsToggle.checked);
    });
  }

  if (autoOpenExtraToggle) {
    autoOpenExtraToggle.addEventListener('change', async function () {
      await KSL.saveSetting('autoOpenExtra', autoOpenExtraToggle.checked);
      const extraPanel = shadow.getElementById('extraCalcPanel');
      if (extraPanel) extraPanel.classList.toggle('hidden', !autoOpenExtraToggle.checked);
    });
  }

  const copyMerchantBtn = shadow.getElementById('copyMerchantBtn');
  if (copyMerchantBtn) {
    copyMerchantBtn.addEventListener('click', async function () {
      const link = copyMerchantBtn.dataset.link || location.href;
      const dict = KSL.getDict(await getLang());
      const oldText = copyMerchantBtn.textContent;
      try {
        await navigator.clipboard.writeText(link);
        copyMerchantBtn.textContent = dict.merchantCopied;
      } catch (e) {
        copyMerchantBtn.textContent = link;
      }
      setTimeout(function () { copyMerchantBtn.textContent = oldText; }, 1400);
    });
  }

  function bindInlineCopy(btnId, copiedLabelKey, fallbackText, cardId) {
    const btn = shadow.getElementById(btnId);
    if (!btn) return;
    async function copyValue() {
      const value = btn.dataset.copy || fallbackText;
      const dict = KSL.getDict(await getLang());
      const copyLabelKey = btn.dataset.i18nAria;
      try {
        await navigator.clipboard.writeText(value);
        btn.innerHTML = KSL.ICON_CHECK;
        btn.classList.add('is-copied');
        btn.setAttribute('aria-label', dict[copiedLabelKey]);
      } catch (e) {
        btn.setAttribute('aria-label', value);
      }
      setTimeout(function () {
        btn.innerHTML = KSL.ICON_COPY;
        btn.classList.remove('is-copied');
        btn.setAttribute('aria-label', dict[copyLabelKey]);
      }, 1300);
    }
    btn.addEventListener('click', function (event) {
      event.stopPropagation();
      copyValue();
    });
    const card = cardId ? shadow.getElementById(cardId) : null;
    if (card) {
      card.addEventListener('click', copyValue);
      card.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        copyValue();
      });
    }
  }

  bindInlineCopy('copySupportCardBtn', 'supportCardCopied', '4400430384496003');

  const copyProductLinkBtn = shadow.getElementById('copyProductLinkBtn');
  const productCard = shadow.getElementById('productCard');
  const productThumb = shadow.getElementById('productThumb');
  const productImageViewer = shadow.getElementById('productImageViewer');
  const productImagePreview = shadow.getElementById('productImagePreview');
  async function copyProductLink() {
    if (!copyProductLinkBtn) return;
    const dict = KSL.getDict(await getLang());
    try {
      await navigator.clipboard.writeText(location.href);
      copyProductLinkBtn.innerHTML = KSL.ICON_CHECK;
      copyProductLinkBtn.classList.add('is-copied');
      copyProductLinkBtn.setAttribute('aria-label', dict.productLinkCopied);
    } catch (e) {
      copyProductLinkBtn.innerHTML = KSL.ICON_COPY;
    }
    setTimeout(function () {
      copyProductLinkBtn.innerHTML = KSL.ICON_COPY;
      copyProductLinkBtn.classList.remove('is-copied');
      copyProductLinkBtn.setAttribute('aria-label', dict.copyProductLink);
    }, 1300);
  }
  if (copyProductLinkBtn) {
    copyProductLinkBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      copyProductLink();
    });
  }
  if (productCard) {
    productCard.addEventListener('click', function () {
      copyProductLink();
    });
    productCard.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      copyProductLink();
    });
  }
  function openImageViewer(url) {
    if (!productImageViewer || !productImagePreview) return;
    if (!url) return;
    productImagePreview.style.backgroundImage = 'url("' + url.replace(/"/g, '\\"') + '")';
    productImageViewer.classList.remove('hidden');
  }
  KSL.openImageViewer = openImageViewer;
  function closeProductImageViewer() {
    if (!productImageViewer || !productImagePreview) return;
    productImageViewer.classList.add('hidden');
    productImagePreview.style.backgroundImage = '';
  }
  if (productThumb) {
    productThumb.addEventListener('click', function (event) {
      event.stopPropagation();
      openImageViewer(productThumb.dataset.imageUrl || '');
    });
    productThumb.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      openImageViewer(productThumb.dataset.imageUrl || '');
    });
  }
  if (productImageViewer) {
    productImageViewer.addEventListener('click', closeProductImageViewer);
  }
  shadow.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeProductImageViewer();
  });

  async function applyAutoOpen() {
    const data = await KSL.getStore();
    const selectors = await KSL.getSelectors();
    const isProductPage = KSL.isProductPage();
    const isMerchantPage = KSL.isMerchantPage();
    autoOpenToggle.checked = data.autoOpen !== false;
    if (autoOpenInputsToggle) autoOpenInputsToggle.checked = data.autoOpenInputs === true;
    if (autoOpenExtraToggle) autoOpenExtraToggle.checked = data.autoOpenExtra === true;
    if (isProductPage && !(KSL.hasUsableSelectors ? KSL.hasUsableSelectors(selectors) : KSL.hasRequiredSelectors(selectors))) {
      panel.classList.remove('hidden');
      tabs.openTab('settings', { silent: true });
      panelOpenedAutomatically = true;
      return;
    }
    if (data.autoOpen !== false && isMerchantPage) {
      panel.classList.remove('hidden');
      tabs.openTab('merchant', { silent: true });
      panelOpenedAutomatically = true;
      return;
    }
    if (data.autoOpen !== false && isProductPage) {
      panel.classList.remove('hidden');
      tabs.openTab('calculator', { silent: true });
      panelOpenedAutomatically = true;
      return;
    }
    if (panelOpenedAutomatically) {
      panel.classList.add('hidden');
      panelOpenedAutomatically = false;
    }
  }

  let lastHref = location.href;
  setInterval(function () {
    if (location.href === lastHref) return;
    lastHref = location.href;
    applyAutoOpen();
    updateMerchantProfile();
    calc.scheduleParse();
  }, 500);

  (async function init() {
    const data = await KSL.getStore();
    if (data.autoOpen === undefined) await KSL.saveSetting('autoOpen', true);
    const lang = data.lang === 'kk' ? 'kk' : 'ru';
    applyTheme(data.theme === 'dark' ? 'dark' : 'light');
    KSL.applyI18n(shadow, lang);
    await applyAutoOpen();
    updateMerchantProfile();
    calc.parseLive();
  })();
})();
