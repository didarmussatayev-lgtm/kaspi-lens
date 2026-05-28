/** Сохранение настроек в chrome.storage */
window.KSL = window.KSL || {};

KSL.DEFAULT_SELECTORS = { title: '', image: '', category: '', sku: '', price: '', reviews: '' };
KSL.REQUIRED_SELECTORS = ['title', 'image', 'category', 'price', 'reviews', 'sku'];
KSL.DEFAULT_CALC_SETTINGS = {
  cost: 0,
  cargo: 0,
  delivery: 500,
  packaging: 250,
  commissionPercent: 10.9,
  reviewBonus: 0,
  adsPerUnit: 0,
  taxPercent: 4
};
KSL.PRODUCT_CALC_KEYS = ['cost', 'cargo', 'delivery', 'packaging', 'commissionPercent', 'reviewBonus', 'adsPerUnit', 'taxPercent'];
KSL.MAX_PRODUCT_CALCULATIONS = 300;
KSL.productCalcWriteQueue = Promise.resolve();

KSL.isExtensionContextError = function (err) {
  return err && /Extension context invalidated|context invalidated/i.test(String(err.message || err));
};

KSL.markContextInvalidated = function (err) {
  if (!KSL.isExtensionContextError(err)) throw err;
  KSL.contextInvalidated = true;
  console.warn('Kaspi Seller Lens (Unofficial): extension was reloaded. Refresh the page to reconnect the content script.');
};

KSL.getRuntimeUrl = function (path) {
  try {
    if (KSL.contextInvalidated || !chrome.runtime || !chrome.runtime.id) return '';
    return chrome.runtime.getURL(path);
  } catch (err) {
    KSL.markContextInvalidated(err);
    return '';
  }
};

KSL.storageGet = async function (keys) {
  try {
    if (KSL.contextInvalidated || !chrome.storage || !chrome.storage.local) return {};
    return await chrome.storage.local.get(keys);
  } catch (err) {
    KSL.markContextInvalidated(err);
    return {};
  }
};

KSL.storageSet = async function (value) {
  try {
    if (KSL.contextInvalidated || !chrome.storage || !chrome.storage.local) return;
    await chrome.storage.local.set(value);
  } catch (err) {
    KSL.markContextInvalidated(err);
  }
};

KSL.getStore = async function () {
  return await KSL.storageGet(['selectors', 'productCalcSettings', 'categoryProfiles', 'historyItems', 'lang', 'theme', 'autoOpen', 'autoOpenInputs', 'autoOpenExtra']);
};

KSL.normalizeSavedSelector = function (selector) {
  return String(selector || '').replace(/\[data-([a-z][A-Za-z0-9]*)=/g, function (match, key) {
    const attr = key.replace(/[A-Z]/g, function (char) {
      return '-' + char.toLowerCase();
    });
    return '[data-' + attr + '=';
  });
};

KSL.normalizeSelectors = function (selectors) {
  const normalized = {};
  Object.keys(KSL.DEFAULT_SELECTORS).forEach(function (key) {
    normalized[key] = KSL.normalizeSavedSelector(selectors[key]);
  });
  return normalized;
};

KSL.getSelectors = async function () {
  const data = await KSL.getStore();
  const merged = { ...KSL.DEFAULT_SELECTORS, ...(data.selectors || {}) };
  const normalized = KSL.normalizeSelectors(merged);
  if (JSON.stringify(merged) !== JSON.stringify(normalized)) {
    await KSL.storageSet({ selectors: normalized });
  }
  return normalized;
};

KSL.saveSelector = async function (key, value) {
  const selectors = await KSL.getSelectors();
  selectors[key] = value;
  await KSL.storageSet({ selectors });
};

KSL.getProductCalcKey = function (url) {
  try {
    const parsed = new URL(url || location.href, location.href);
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.origin + pathname;
  } catch (error) {
    return String(url || '').split(/[?#]/)[0].replace(/\/+$/, '');
  }
};

KSL.getProductCalcSettings = async function (url) {
  const key = KSL.getProductCalcKey(url);
  if (!key) return {};
  const data = await KSL.storageGet(['productCalcSettings']);
  return { ...((data.productCalcSettings || {})[key] || {}) };
};

KSL.saveProductCalcSetting = function (url, key, value) {
  if (!KSL.PRODUCT_CALC_KEYS.includes(key)) return;
  const productKey = KSL.getProductCalcKey(url);
  if (!productKey) return;
  KSL.productCalcWriteQueue = KSL.productCalcWriteQueue.then(async function () {
    const data = await KSL.storageGet(['productCalcSettings']);
    const productCalcSettings = { ...(data.productCalcSettings || {}) };
    const current = { ...(productCalcSettings[productKey] || {}) };
    current[key] = Number(value) || 0;
    delete productCalcSettings[productKey];
    productCalcSettings[productKey] = current;
    const keys = Object.keys(productCalcSettings);
    keys.slice(0, Math.max(0, keys.length - KSL.MAX_PRODUCT_CALCULATIONS)).forEach(function (oldKey) {
      delete productCalcSettings[oldKey];
    });
    await KSL.storageSet({ productCalcSettings: productCalcSettings });
  });
  return KSL.productCalcWriteQueue;
};

KSL.hasRequiredSelectors = function (selectors) {
  return KSL.REQUIRED_SELECTORS.every(function (key) {
    return Boolean(selectors[key]);
  });
};

KSL.hasUsableSelectors = function (selectors) {
  if (!KSL.hasRequiredSelectors(selectors)) return false;
  if (!KSL.isProductPage()) return true;
  return KSL.REQUIRED_SELECTORS.every(function (key) {
    const el = KSL.findElement ? KSL.findElement(selectors[key]) : null;
    if (!el) return false;
    const validation = KSL.validateSelectorValueSync ? KSL.validateSelectorValueSync(key, el) : { ok: true };
    return validation.ok;
  });
};

KSL.saveSetting = async function (key, value) {
  await KSL.storageSet({ [key]: value });
};

KSL.isProductPage = function () {
  return /\/shop\/p\//.test(location.pathname);
};

KSL.isMerchantPage = function () {
  return /\/shop\/info\/merchant\/\d+/.test(location.pathname);
};
