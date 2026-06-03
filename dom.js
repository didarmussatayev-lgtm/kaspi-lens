/** Поиск элементов на странице Kaspi и CSS-селекторы */
window.KSL = window.KSL || {};

KSL.cssEscape = function (value) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
};

KSL.cssStringEscape = function (value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

KSL.dataAttrName = function (key) {
  return 'data-' + String(key).replace(/[A-Z]/g, function (char) {
    return '-' + char.toLowerCase();
  });
};

KSL.queryDeep = function (selector, root) {
  root = root || document;
  if (!selector) return null;

  try {
    const direct = root.querySelector && root.querySelector(selector);
    if (direct) return direct;
  } catch (e) {
    return null;
  }

  const tree = root.querySelectorAll ? root.querySelectorAll('*') : [];

  for (const node of tree) {
    if (node.shadowRoot) {
      const found = KSL.queryDeep(selector, node.shadowRoot);
      if (found) return found;
    }
  }

  const iframes = root.querySelectorAll ? root.querySelectorAll('iframe') : [];

  for (const frame of iframes) {
    try {
      const doc = frame.contentDocument;
      if (!doc) continue;
      const found = KSL.queryDeep(selector, doc);
      if (found) return found;
    } catch (e) {}
  }

  return null;
};

KSL.findElement = function (selector) {
  return KSL.queryDeep(selector);
};

KSL.getElementText = function (el) {
  if (!el) return '';
  const direct = (el.innerText || el.textContent || '').trim();
  if (direct) return direct;
  const aria = el.getAttribute && el.getAttribute('aria-label');
  if (aria) return aria.trim();
  const content = el.getAttribute && el.getAttribute('content');
  return content ? content.trim() : '';
};

KSL.getElementImageUrl = function (el) {
  if (!el) return '';
  const target = el.matches && el.matches('img') ? el : el.querySelector && el.querySelector('img');
  if (!target) return '';
  return target.currentSrc || target.src || target.getAttribute('data-src') || target.getAttribute('src') || '';
};

KSL.getPickTarget = function (el, key) {
  if (key === 'image') {
    if (el && el.matches && el.matches('img')) return el;
    const img = el && el.querySelector && el.querySelector('img');
    if (img) return img;
  }
  let cur = el;
  for (let i = 0; i < 6 && cur; i++) {
    if (KSL.getElementText(cur)) return cur;
    cur = cur.parentElement;
  }
  return el;
};

KSL.matchesOnly = function (selector, el) {
  try {
    const list = document.querySelectorAll(selector);
    return list.length === 1 && list[0] === el;
  } catch (e) {
    return false;
  }
};

KSL.buildCssPath = function (el) {
  const parts = [];
  let node = el;

  while (node && node.nodeType === 1 && node !== document.documentElement) {
    if (node.id) {
      parts.unshift('#' + KSL.cssEscape(node.id));
      break;
    }
    const parent = node.parentElement;
    if (!parent) break;
    const siblings = [...parent.children].filter(n => n.tagName === node.tagName);
    parts.unshift(node.tagName.toLowerCase() + ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')');
    node = parent;
    if (parts.length > 6) break;
  }

  return parts.join(' > ');
};

KSL.buildSelector = function (el) {
  if (!el || el.nodeType !== 1) return '';

  if (el.id) {
    const sel = '#' + KSL.cssEscape(el.id);
    if (KSL.matchesOnly(sel, el)) return sel;
  }

  if (el.dataset) {
    for (const [key, value] of Object.entries(el.dataset)) {
      if (!value) continue;
      const sel = '[' + KSL.dataAttrName(key) + '="' + KSL.cssStringEscape(value) + '"]';
      if (KSL.matchesOnly(sel, el)) return sel;
    }
  }

  if (el.classList.length) {
    const classes = [...el.classList].map(c => KSL.cssEscape(c)).join('.');
    const full = el.tagName.toLowerCase() + '.' + classes;
    if (KSL.matchesOnly(full, el)) return full;
  }

  const path = KSL.buildCssPath(el);
  if (path && KSL.matchesOnly(path, el)) return path;

  return path || el.tagName.toLowerCase();
};

KSL.waitForElement = function (selector, timeout) {
  timeout = timeout || 15000;
  return new Promise(function (resolve, reject) {
    if (!selector) return reject(new Error('empty'));
    const existing = KSL.findElement(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(function () {
      const el = KSL.findElement(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    setTimeout(function () {
      observer.disconnect();
      reject(new Error('timeout'));
    }, timeout);
  });
};
