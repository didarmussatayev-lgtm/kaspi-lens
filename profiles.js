// src/profiles.js — category profile presets for calculator defaults
window.KSL = window.KSL || {};

KSL.PROFILE_FIELDS = [
  { key: 'commissionPercent', label: 'Kaspi %', affix: '%' },
  { key: 'cargo', label: 'Карго / шт', affix: '₸' },
  { key: 'delivery', label: 'Доставка / шт', affix: '₸' },
  { key: 'packaging', label: 'Упаковка / шт', affix: '₸' },
  { key: 'adsPerUnit', label: 'Реклама / шт', affix: '₸' },
  { key: 'reviewBonus', label: 'Бонус за отзыв / шт', affix: '₸' },
  { key: 'taxPercent', label: 'ИПН', affix: '%' }
];

KSL.profileIdFromName = function (name) {
  return KSL.normalizeCategoryName ? KSL.normalizeCategoryName(name).replace(/\s+/g, '-') : String(name || '').toLowerCase().replace(/\s+/g, '-');
};

KSL.getCategoryProfileDefaults = async function () {
  const data = KSL.loadKaspiCommissions ? await KSL.loadKaspiCommissions() : { categories: [] };
  return (data.categories || []).map(function (category) {
    return {
      id: KSL.profileIdFromName(category.name),
      name: category.name,
      commissionPercent: Number(category.default) || 0,
      cargo: 0,
      delivery: 500,
      packaging: 250,
      adsPerUnit: 0,
      reviewBonus: 0,
      taxPercent: 4
    };
  });
};

KSL.getCategoryProfiles = async function () {
  const data = await KSL.storageGet(['categoryProfiles']);
  const saved = data.categoryProfiles || {};
  const defaults = await KSL.getCategoryProfileDefaults();
  return defaults.map(function (profile) {
    return { ...profile, ...(saved[profile.id] || {}) };
  });
};

KSL.saveCategoryProfiles = async function (profiles) {
  const packed = {};
  profiles.forEach(function (profile) {
    packed[profile.id] = {};
    KSL.PROFILE_FIELDS.forEach(function (field) {
      packed[profile.id][field.key] = Number(profile[field.key]) || 0;
    });
  });
  await KSL.storageSet({ categoryProfiles: packed });
};

KSL.findCategoryProfile = async function (category) {
  const needle = String(category || '').toLowerCase();
  if (!needle) return null;
  const profiles = await KSL.getCategoryProfiles();
  return profiles.find(function (profile) {
    const name = String(profile.name || '').toLowerCase();
    return needle.includes(name) || name.includes(needle);
  }) || null;
};

KSL.buildProfilesHtml = function () {
  return (
    '<div class="ksl-content hidden" id="profilesTab">' +
    KSL.Ads.getBannerHtml() +
    '<div class="card profiles-intro"><div class="card-title" data-i18n="profilesTitle">Профили категорий</div>' +
    '<p class="profiles-desc" data-i18n="profilesDesc">Сохраните расходы для каждой категории.</p></div>' +
    '<div class="profiles-list" id="profilesList"></div></div>'
  );
};

KSL.renderProfiles = function (shadow, profiles) {
  const list = shadow.getElementById('profilesList');
  if (!list) return;
  list.innerHTML = profiles.map(function (profile) {
    const fields = KSL.PROFILE_FIELDS.map(function (field) {
      const value = profile[field.key];
      const affixClass = field.affix === '%' ? ' percent' : ' money';
      return (
        '<div class="profile-field">' +
        '<label>' + field.label + '</label>' +
        '<div class="input-affix' + affixClass + '"><input type="text" inputmode="decimal" data-profile-id="' + profile.id + '" data-profile-key="' + field.key + '" value="' + value + '"></div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="profile-card" data-profile-card="' + profile.id + '">' +
      '<button type="button" class="profile-head" data-profile-toggle="' + profile.id + '" aria-expanded="false">' +
      '<b>' + KSL.escapeXml(profile.name) + '</b>' +
      '<span data-profile-status="' + profile.id + '"></span>' +
      '<i aria-hidden="true">›</i></button>' +
      '<div class="profile-body hidden" data-profile-body="' + profile.id + '">' +
      '<div class="profile-grid">' + fields + '</div></div>' +
      '</div>'
    );
  }).join('');
};

KSL.bindProfiles = function (shadow, getLang) {
  function readProfilesFromUi() {
    const cards = Array.from(shadow.querySelectorAll('[data-profile-card]'));
    return cards.map(function (card) {
      const id = card.dataset.profileCard;
      const title = card.querySelector('.profile-head b');
      const base = { id: id, name: title ? title.textContent : id };
      const profile = { ...base };
      KSL.PROFILE_FIELDS.forEach(function (field) {
        const input = shadow.querySelector('[data-profile-id="' + id + '"][data-profile-key="' + field.key + '"]');
        profile[field.key] = input ? Number(String(input.value).replace(',', '.')) || 0 : Number(base[field.key]) || 0;
      });
      return profile;
    });
  }

  KSL.getCategoryProfiles().then(function (profiles) {
    KSL.renderProfiles(shadow, profiles);
    shadow.querySelectorAll('[data-profile-toggle]').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        const id = toggle.dataset.profileToggle;
        const card = toggle.closest('[data-profile-card]');
        const body = shadow.querySelector('[data-profile-body="' + id + '"]');
        const isOpen = body && !body.classList.contains('hidden');
        shadow.querySelectorAll('[data-profile-card]').forEach(function (item) {
          item.classList.remove('is-open');
        });
        shadow.querySelectorAll('[data-profile-body]').forEach(function (item) {
          item.classList.add('hidden');
        });
        shadow.querySelectorAll('[data-profile-toggle]').forEach(function (item) {
          item.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen && body) {
          body.classList.remove('hidden');
          toggle.setAttribute('aria-expanded', 'true');
          if (card) card.classList.add('is-open');
        }
      });
    });
    shadow.querySelectorAll('[data-profile-id][data-profile-key]').forEach(function (input) {
      input.addEventListener('input', async function () {
        await KSL.saveCategoryProfiles(readProfilesFromUi());
        const status = shadow.querySelector('[data-profile-status="' + input.dataset.profileId + '"]');
        if (status) status.textContent = KSL.getDict(await getLang()).profilesSaved;
      });
    });
  });
};
