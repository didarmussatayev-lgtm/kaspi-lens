// src/ads.js — remote configurable service banner module
window.KSL = window.KSL || {};

KSL.ADS_REMOTE_URL = 'https://raw.githubusercontent.com/zhandos256/ksl_data/main/data/ads.json';
KSL.ADS_CACHE_KEY = 'adsCache';
KSL.ADS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

KSL.Ads = {
  fallbackConfig: {
    intervalSeconds: 6,
    banners: [
      {
        "enabled": true,
        "tag": "Реклама",
        "title": "Здесь может быть ваша реклама",
        "description": "Разместите вашу рекламу на 1000+ селлеров Kaspi",
        "url": "https://t.me/digitalcraftzman",
        "theme": {
          "from": "#141414",
          "to": "#606060"
        }
      }
    ]
  },

  timer: null,
  index: 0,
  animationStyle: 'slide',
  config: null,
  bannerHeight: 75,
  cacheKey: KSL.ADS_CACHE_KEY,
  cacheTtlMs: KSL.ADS_CACHE_TTL_MS,

  getBannerHtml: function () {
    const first = KSL.Ads.fallbackConfig.banners[0];
    return (
      '<div class="ksl-banner-slot" data-ksl-ad-banner role="button" tabindex="0">' +
        '<div class="ksl-banner-inner">' +
          '<div class="ksl-banner-text">' +
            '<span class="ksl-banner-tag" data-ksl-ad-tag>' + this.escapeHtml(first.tag) + '</span>' +
            '<span class="ksl-banner-title" data-ksl-ad-title>' + this.escapeHtml(first.title) + '</span>' +
            '<span class="ksl-banner-desc" data-ksl-ad-desc>' + this.escapeHtml(first.description) + '</span>' +
            '<div class="ksl-banner-dots" data-ksl-ad-dots></div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  },

  bindEvents: async function (shadow) {
    const slots = Array.from(shadow.querySelectorAll('[data-ksl-ad-banner]'));
    if (!slots.length) return;

    this.config = await this.loadConfig();
    this.index = 0;
    this.render(shadow);

    slots.forEach(function (slot) {
      slot.addEventListener('click', function (event) {
        const dot = event.target.closest('[data-ksl-ad-dot]');
        if (dot) {
          event.stopPropagation();
          const nextIndex = Number(dot.dataset.kslAdDot) || 0;
          const direction = nextIndex >= KSL.Ads.index ? 'next' : 'prev';
          KSL.Ads.switchBanner(shadow, nextIndex, direction);
          KSL.Ads.restartRotation(shadow);
          return;
        }
        KSL.Ads.openCurrent(slot);
      });

      slot.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        KSL.Ads.openCurrent(slot);
      });
    });

    this.restartRotation(shadow);
  },

  loadConfig: async function () {
    const cached = await this.getCachedConfig();
    if (cached && this.isCacheFresh(cached)) return cached.config;

    const remote = await this.fetchConfig(KSL.ADS_REMOTE_URL);
    if (remote) {
      await this.saveCachedConfig(remote);
      return remote;
    }

    if (cached && cached.config) return cached.config;

    const localUrl = KSL.getRuntimeUrl ? KSL.getRuntimeUrl('data/ads.json') : '';
    const local = await this.fetchConfig(localUrl);
    return local || this.normalizeConfig(this.fallbackConfig);
  },

  getCachedConfig: async function () {
    if (!KSL.storageGet) return null;
    const data = await KSL.storageGet([this.cacheKey]);
    const cached = data[this.cacheKey];
    if (!cached || !cached.config || !cached.savedAt) return null;
    const config = this.normalizeConfig(cached.config);
    if (!config || !config.banners || !config.banners.length) return null;
    return {
      savedAt: Number(cached.savedAt) || 0,
      config: config
    };
  },

  isCacheFresh: function (cached) {
    return Boolean(cached && cached.savedAt && Date.now() - cached.savedAt < this.cacheTtlMs);
  },

  saveCachedConfig: async function (config) {
    if (!KSL.storageSet || !config || !config.banners || !config.banners.length) return;
    await KSL.storageSet({
      [this.cacheKey]: {
        savedAt: Date.now(),
        config: config
      }
    });
  },

  fetchConfig: async function (url) {
    if (!url) return null;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      return this.normalizeConfig(await res.json());
    } catch (error) {
      return null;
    }
  },

  normalizeConfig: function (raw) {
    const input = raw || {};
    const banners = Array.isArray(input.banners) ? input.banners : [];
    const clean = banners
      .filter(function (banner) { return banner && banner.enabled !== false; })
      .map(function (banner) {
        const theme = banner.theme || {};
        const tag = KSL.Ads.compactText(banner.tag || 'Сервис', 18);
        const title = KSL.Ads.compactText(banner.title || '', 44);
        const description = KSL.Ads.compactText(banner.description || '', 86);
        return {
          tag: tag,
          title: title,
          description: description,
          url: KSL.Ads.safeUrl(banner.url),
          theme: {
            from: KSL.Ads.safeColor(theme.from) || '#0A84FF',
            to: KSL.Ads.safeColor(theme.to) || '#0056B3'
          }
        };
      })
      .filter(function (banner) {
        return banner.title || banner.description;
      });

    return {
      intervalSeconds: Math.max(3, Math.min(30, Number(input.intervalSeconds) || 6)),
      banners: clean.length ? clean : this.fallbackConfig.banners
    };
  },

  safeUrl: function (url) {
    const value = String(url || '').trim();
    if (!value) return '';
    try {
      const parsed = new URL(value);
      return /^(https?:|mailto:)$/.test(parsed.protocol) ? parsed.href : '';
    } catch (error) {
      return '';
    }
  },

  safeColor: function (color) {
    const value = String(color || '').trim();
    return /^#[0-9a-f]{3,8}$/i.test(value) ? value : '';
  },

  compactText: function (value, limit) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= limit) return text;
    const sliced = text.slice(0, limit + 1);
    const cut = sliced.lastIndexOf(' ');
    return (cut > limit * 0.55 ? sliced.slice(0, cut) : text.slice(0, limit)).trim();
  },

  getBannerHeight: function (banner) {
    return this.bannerHeight;
  },

  setBannerHeight: function (slot, banner) {
    const height = this.bannerHeight + 'px';
    slot.style.setProperty('--ksl-banner-height', height);
    slot.style.height = height;
    slot.style.minHeight = height;
    slot.style.maxHeight = height;
  },

  restartRotation: function (shadow) {
    if (this.timer) clearInterval(this.timer);
    if (!this.config || this.config.banners.length < 2) return;

    this.timer = setInterval(function () {
      const nextIndex = (KSL.Ads.index + 1) % KSL.Ads.config.banners.length;
      KSL.Ads.switchBanner(shadow, nextIndex, 'next');
    }, this.config.intervalSeconds * 1000);
  },

  render: function (shadow) {
    if (!this.config || !this.config.banners.length) return;
    const banners = this.config.banners;
    const current = banners[this.index] || banners[0];

    shadow.querySelectorAll('[data-ksl-ad-banner]').forEach(function (slot) {
      slot.dataset.kslAdUrl = current.url || '';
      KSL.Ads.setBannerHeight(slot, current);
      KSL.Ads.setGradient(slot, current);
      const inner = slot.querySelector('.ksl-banner-inner');
      if (inner) inner.outerHTML = KSL.Ads.getInnerHtml(current);
      KSL.Ads.renderDots(slot, banners.length, KSL.Ads.index);
    });
  },

  switchBanner: function (shadow, nextIndex, direction) {
    if (!this.config || !this.config.banners.length) return;
    const banners = this.config.banners;
    const safeIndex = ((nextIndex % banners.length) + banners.length) % banners.length;
    if (safeIndex === this.index) return;

    this.index = safeIndex;
    const current = banners[this.index] || banners[0];
    const motion = this.animationStyle === 'fade' ? 'fade' : (direction === 'prev' ? 'prev' : 'next');

    shadow.querySelectorAll('[data-ksl-ad-banner]').forEach(function (slot) {
      const oldInner = slot.querySelector('.ksl-banner-inner');
      if (!oldInner) {
        slot.querySelectorAll('.ksl-banner-inner').forEach(function (inner) { inner.remove(); });
        KSL.Ads.setBannerHeight(slot, current);
        slot.insertAdjacentHTML('afterbegin', KSL.Ads.getInnerHtml(current));
        KSL.Ads.renderDots(slot, banners.length, KSL.Ads.index);
        KSL.Ads.setGradient(slot, current);
        return;
      }

      slot.querySelectorAll('.ksl-banner-inner.is-incoming').forEach(function (inner) {
        inner.remove();
      });

      const incomingWrap = document.createElement('div');
      incomingWrap.innerHTML = KSL.Ads.getInnerHtml(current);
      const incoming = incomingWrap.firstElementChild;
      if (!incoming) return;

      oldInner.classList.remove('is-in-next', 'is-out-next', 'is-in-prev', 'is-out-prev', 'is-fade-in', 'is-fade-out');
      oldInner.classList.add(motion === 'fade' ? 'is-fade-out' : 'is-out-' + motion);
      incoming.classList.add('is-incoming', motion === 'fade' ? 'is-fade-in' : 'is-in-' + motion);

      slot.dataset.kslAdUrl = current.url || '';
      KSL.Ads.setBannerHeight(slot, current);
      KSL.Ads.setGradient(slot, current);
      KSL.Ads.updateDots(slot, banners.length, KSL.Ads.index);
      KSL.Ads.renderDots(incoming, banners.length, KSL.Ads.index);
      slot.appendChild(incoming);

      window.requestAnimationFrame(function () {
        incoming.classList.add('is-animating');
        oldInner.classList.add('is-animating');
      });

      let cleaned = false;
      function cleanup() {
        if (cleaned) return;
        cleaned = true;
        oldInner.remove();
        incoming.classList.remove('is-incoming', 'is-in-next', 'is-in-prev', 'is-fade-in', 'is-animating');
        incoming.removeEventListener('animationend', cleanup);
        incoming.removeEventListener('transitionend', cleanup);
        clearTimeout(fallbackCleanup);
      }

      incoming.addEventListener('animationend', cleanup);
      incoming.addEventListener('transitionend', cleanup);
      const fallbackCleanup = setTimeout(cleanup, 700);
    });
  },

  getInnerHtml: function (banner) {
    return (
      '<div class="ksl-banner-inner">' +
        '<div class="ksl-banner-text">' +
          '<span class="ksl-banner-tag" data-ksl-ad-tag>' + this.escapeHtml(banner.tag) + '</span>' +
          '<span class="ksl-banner-title" data-ksl-ad-title>' + this.escapeHtml(banner.title) + '</span>' +
          '<span class="ksl-banner-desc" data-ksl-ad-desc>' + this.escapeHtml(banner.description) + '</span>' +
          '<div class="ksl-banner-dots" data-ksl-ad-dots></div>' +
        '</div>' +
      '</div>'
    );
  },

  setGradient: function (slot, banner) {
    slot.style.background = 'linear-gradient(135deg, ' + banner.theme.from + ' 0%, ' + banner.theme.to + ' 100%)';
  },

  escapeHtml: function (value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  },

  renderDots: function (slot, total, active) {
    const dots = slot.querySelector('[data-ksl-ad-dots]');
    if (!dots) return;
    if (total < 2) {
      dots.innerHTML = '';
      dots.classList.add('hidden');
      return;
    }
    dots.classList.remove('hidden');
    dots.innerHTML = Array.from({ length: total }).map(function (_, idx) {
      return '<button type="button" class="ksl-banner-dot' + (idx === active ? ' active' : '') + '" data-ksl-ad-dot="' + idx + '" aria-label="Баннер ' + (idx + 1) + '"></button>';
    }).join('');
  },

  updateDots: function (slot, total, active) {
    const dotsList = Array.from(slot.querySelectorAll('[data-ksl-ad-dots]'));
    if (!dotsList.length) return;
    dotsList.forEach(function (dots) {
      if (total < 2 || dots.children.length !== total) {
        KSL.Ads.renderDots(dots.parentElement || slot, total, active);
        return;
      }
      Array.from(dots.children).forEach(function (dot, idx) {
        dot.classList.toggle('active', idx === active);
      });
    });
  },

  openCurrent: function (slot) {
    const url = slot.dataset.kslAdUrl;
    if (!url) return;
    window.open(url, '_blank');
  }
};
