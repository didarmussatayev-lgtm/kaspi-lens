/** Вкладка «Калькулятор»: парсинг цены, отзывов, выручки */
window.KSL = window.KSL || {};

KSL.extractNumber = function (text) {
  const raw = String(text).replace(/\u00a0/g, ' ').trim();
  if (!raw) return 0;
  const digitsOnly = raw.replace(/[^\d]/g, '');
  if (digitsOnly) return Number(digitsOnly) || 0;
  const match = raw.match(/[\d]+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) || 0 : 0;
};

KSL.extractInputNumber = function (text) {
  const raw = String(text).replace(',', '.').trim();
  if (!raw) return 0;
  if (raw.includes('.')) return Number(raw.replace(/[^\d.]/g, '')) || 0;
  return KSL.extractNumber(raw);
};

KSL.normalizeCalcInput = function (input) {
  const value = KSL.extractInputNumber(input.value);
  input.value = String(value);
  return value;
};

KSL.extractSkuDigits = function (text) {
  return String(text).replace(/\D/g, '');
};

KSL.validateSelectorValueSync = function (key, el) {
  if (!el) return { ok: false, reason: 'selectorInvalid' };
  const text = KSL.getElementText(el);
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const number = KSL.extractNumber(normalized);
  const hasMoney = /₸|тг|тенге/i.test(normalized);

  if (key === 'image') {
    return { ok: Boolean(KSL.getElementImageUrl(el)), reason: 'selectorInvalid' };
  }
  if (key === 'title') {
    return {
      ok: normalized.length >= 5 && !hasMoney && !/код\s*товара|артикул|kaspi магазин/i.test(lower),
      reason: 'selectorInvalid'
    };
  }
  if (key === 'price') {
    return {
      ok: number > 0 && hasMoney && !/рассроч|мес|ай|x\s*\d/i.test(lower),
      reason: 'selectorInvalid'
    };
  }
  if (key === 'reviews') {
    const hasReviewsWord = /отзыв|пікір|review|продаж|сатылым/i.test(lower);
    return {
      ok: number > 0 && !hasMoney && (hasReviewsWord || /\(\s*\d+\s*\)/i.test(lower)),
      reason: 'selectorInvalid'
    };
  }
  if (key === 'sku') {
    const digits = KSL.extractSkuDigits(normalized);
    return { ok: digits.length >= 6 && digits.length <= 20 && !hasMoney, reason: 'selectorInvalid' };
  }
  if (key === 'category') {
    const data = KSL.kaspiCommissions;
    const categories = data && data.categories ? data.categories : null;
    if (!categories) return { ok: normalized.length > 0, reason: 'categoryInvalid' };
    const found = categories.find(function (item) {
      const name = KSL.normalizeCategoryName(item.name);
      const value = KSL.normalizeCategoryName(normalized);
      return value.includes(name) || name.includes(value);
    });
    return { ok: Boolean(found), reason: 'categoryInvalid' };
  }
  return { ok: normalized.length > 0, reason: 'selectorInvalid' };
};

KSL.validateSelectorValue = async function (key, el) {
  if (key !== 'category') return KSL.validateSelectorValueSync(key, el);
  const text = KSL.getElementText(el);
  const foundCategory = KSL.findKaspiCommission ? await KSL.findKaspiCommission(text) : null;
  return { ok: Boolean(foundCategory), reason: 'categoryInvalid' };
};

KSL.formatEmpty = function () {
  return '—';
};

KSL.formatMoney = function (value, locale, showZero) {
  const format = function (number) {
    return Number(number || 0).toLocaleString('en-US').replace(/\s|\u00a0/g, ',');
  };
  if (value === 0 && showZero) return format(0) + ' ₸';
  if (!value) return KSL.formatEmpty();
  return format(value) + ' ₸';
};

KSL.setMetricText = function (el, text, small) {
  el.textContent = text;
  const sizes = small ? [20, 17, 15, 13, 11] : [24, 21, 18, 15, 13];
  el.style.fontSize = '';
  requestAnimationFrame(function () {
    for (let i = 0; i < sizes.length; i++) {
      el.style.fontSize = sizes[i] + 'px';
      if (el.scrollWidth <= el.clientWidth + 1) return;
    }
  });
};

KSL.setOneLineText = function (el, text, sizes) {
  el.textContent = text;
  const fitSizes = sizes || [12, 11, 10, 9, 8];
  el.style.fontSize = '';
  requestAnimationFrame(function () {
    for (let i = 0; i < fitSizes.length; i++) {
      el.style.fontSize = fitSizes[i] + 'px';
      if (el.scrollWidth <= el.clientWidth + 1) return;
    }
  });
};

KSL.escapeXml = function (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

KSL.slugFileName = function (value, fallback) {
  const name = String(value || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return name || fallback || 'ksl-report';
};

KSL.xlsxCol = function (index) {
  let col = '';
  let n = index;
  while (n > 0) {
    const rem = (n - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    n = Math.floor((n - 1) / 26);
  }
  return col;
};

KSL.xlsxCell = function (rowIndex, colIndex, value, style) {
  const ref = KSL.xlsxCol(colIndex) + rowIndex;
  const styleAttr = style ? ' s="' + style + '"' : '';
  if (value === null || value === undefined || value === '') {
    return '<c r="' + ref + '"' + styleAttr + '/>';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return '<c r="' + ref + '"' + styleAttr + '><v>' + value + '</v></c>';
  }
  return '<c r="' + ref + '"' + styleAttr + ' t="inlineStr"><is><t>' + KSL.escapeXml(value) + '</t></is></c>';
};

KSL.buildXlsxSheet = function (rows) {
  const xmlRows = rows.map(function (row, rowIdx) {
    const rowIndex = rowIdx + 1;
    const height = row.height ? ' ht="' + row.height + '" customHeight="1"' : '';
    const cells = row.cells.map(function (cell, cellIdx) {
      return KSL.xlsxCell(rowIndex, cellIdx + 1, cell.value, cell.style || row.style || 0);
    }).join('');
    return '<row r="' + rowIndex + '"' + height + '>' + cells + '</row>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="20"/>' +
    '<cols>' +
    '<col min="1" max="1" width="21" customWidth="1"/>' +
    '<col min="2" max="2" width="19" customWidth="1"/>' +
    '<col min="3" max="3" width="21" customWidth="1"/>' +
    '<col min="4" max="4" width="19" customWidth="1"/>' +
    '</cols>' +
    '<sheetData>' + xmlRows + '</sheetData>' +
    '<mergeCells count="6">' +
    '<mergeCell ref="A1:D1"/><mergeCell ref="B2:D2"/><mergeCell ref="B4:D4"/>' +
    '<mergeCell ref="A6:D6"/><mergeCell ref="A12:D12"/><mergeCell ref="C18:D18"/>' +
    '</mergeCells>' +
    '</worksheet>';
};

KSL.exportReportXlsx = async function (report) {
  if (!window.JSZip || !report) return;
  const zip = new window.JSZip();
  const hasRoi = Number(report.cost) > 0 && report.roiPercent !== null && report.roiPercent !== undefined;
  const margin = Number(report.marginPercent) / 100 || 0;
  const roi = hasRoi ? Number(report.roiPercent) / 100 || 0 : '—';
  const rows = [
    { style: 1, height: 23, cells: [{ value: 'Товар' }] },
    { height: 34, cells: [{ value: 'Название', style: 2 }, { value: report.title || '—', style: 3 }] },
    { height: 30, cells: [{ value: 'Код товара', style: 2 }, { value: report.sku || '—', style: 3 }, { value: 'Категория', style: 2 }, { value: report.category || 'Без категории', style: 3 }] },
    { height: 30, cells: [{ value: 'Ссылка', style: 2 }, { value: report.url || '', style: 8 }] },
    { height: 8, cells: [{ value: '' }] },
    { style: 1, height: 23, cells: [{ value: 'Итоги' }] },
    { cells: [{ value: 'Цена товара', style: 2 }, { value: Math.round(report.productPrice), style: 4 }, { value: 'Продажи', style: 2 }, { value: Math.round(report.salesCount), style: 3 }] },
    { cells: [{ value: 'Выручка', style: 2 }, { value: Math.round(report.revenue), style: 4 }, { value: 'Расходы всего', style: 2 }, { value: Math.round(report.totalExpenses), style: 6 }] },
    { cells: [{ value: 'Доход всего', style: 2 }, { value: Math.round(report.totalProfit), style: 5 }, { value: 'Доход / 1 шт', style: 2 }, { value: Math.round(report.profitOne), style: 5 }] },
    { cells: [{ value: 'Маржа', style: 2 }, { value: margin, style: 7 }, { value: hasRoi ? 'ROI' : 'Без цены закупа', style: 2 }, { value: roi, style: hasRoi ? 7 : 9 }] },
    { height: 8, cells: [{ value: '' }] },
    { style: 1, height: 23, cells: [{ value: 'Расходы / 1 шт' }] },
    { cells: [{ value: 'Цена закупа', style: 2 }, { value: Math.round(report.cost), style: 6 }, { value: 'Доставка Kaspi', style: 2 }, { value: Math.round(report.delivery), style: 6 }] },
    { cells: [{ value: 'Комиссия %', style: 2 }, { value: Number(report.commissionPercent) / 100, style: 7 }, { value: 'Комиссия', style: 2 }, { value: Math.round(report.commissionOne), style: 6 }] },
    { cells: [{ value: 'Упаковка', style: 2 }, { value: Math.round(report.packaging), style: 6 }, { value: 'Карго', style: 2 }, { value: Math.round(report.cargo), style: 6 }] },
    { cells: [{ value: 'Бонус за отзыв', style: 2 }, { value: Math.round(report.reviewBonus), style: 6 }, { value: 'Реклама', style: 2 }, { value: Math.round(report.adsPerUnit), style: 6 }] },
    { cells: [{ value: 'ИПН %', style: 2 }, { value: Number(report.taxPercent) / 100, style: 7 }, { value: 'ИПН', style: 2 }, { value: Math.round(report.taxOne), style: 6 }] },
    { height: 30, cells: [{ value: 'Всего расходов / шт', style: 2 }, { value: Math.round(report.expensesOne), style: 6 }, { value: 'Все суммы указаны за 1 шт', style: 9 }] }
  ];
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>');
  zip.folder('_rels').file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>');
  zip.folder('xl').file('workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Расчёт" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.folder('xl').folder('_rels').file('workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>');
  zip.folder('xl').folder('worksheets').file('sheet1.xml', KSL.buildXlsxSheet(rows));
  zip.folder('xl').file('styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0&quot; ₸&quot;;[Red]-#,##0&quot; ₸&quot;;-"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>' +
    '<fonts count="6">' +
    '<font><sz val="10.5"/><name val="Arial"/><color rgb="FF202124"/></font>' +
    '<font><b/><sz val="10.5"/><name val="Arial"/><color rgb="FF202124"/></font>' +
    '<font><sz val="10.5"/><name val="Arial"/><color rgb="FF667085"/></font>' +
    '<font><b/><sz val="10.5"/><name val="Arial"/><color rgb="FF1A7F37"/></font>' +
    '<font><b/><sz val="10.5"/><name val="Arial"/><color rgb="FFB42318"/></font>' +
    '<font><sz val="10.5"/><name val="Arial"/><color rgb="FF0A66C2"/><u/></font>' +
    '</fonts>' +
    '<fills count="6">' +
    '<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFECEFF1"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF7EE"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFDEBEC"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4E5"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left/><right/><top/><bottom style="thin"><color rgb="FFDADDE1"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="10">' +
    '<xf fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="0" fillId="0" borderId="1" xfId="0" numFmtId="164" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="3" fillId="3" borderId="1" xfId="0" numFmtId="164" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="4" fillId="4" borderId="1" xfId="0" numFmtId="164" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="0" fillId="0" borderId="1" xfId="0" numFmtId="165" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="5" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="2" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>');
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = KSL.slugFileName(report.title, 'ksl-report') + '.xlsx';
  a.click();
  URL.revokeObjectURL(url);
};

KSL.getGalleryImageUrls = function () {
  const images = Array.from(document.querySelectorAll('.item__slider-controls a img.item__slider-thumb-pic'));
  const urls = images.map(function (img) {
    return img.currentSrc || img.src || img.getAttribute('src') || '';
  }).filter(Boolean);
  return Array.from(new Set(urls));
};

KSL.imageFileName = function (url, index) {
  try {
    const parsed = new URL(url, location.href);
    const clean = parsed.pathname.split('/').pop() || ('photo-' + index + '.jpg');
    return String(index).padStart(2, '0') + '-' + clean.replace(/[\\/:*?"<>|]+/g, '-');
  } catch (e) {
    return String(index).padStart(2, '0') + '-photo.jpg';
  }
};

KSL.downloadGalleryPhotosZip = async function (report) {
  if (!window.JSZip) return { count: 0 };
  const urls = KSL.getGalleryImageUrls();
  if (urls.length === 0) return { count: 0 };
  const zip = new window.JSZip();
  let count = 0;
  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i]);
      if (!res.ok) continue;
      const blob = await res.blob();
      zip.file(KSL.imageFileName(urls[i], i + 1), blob);
      count++;
    } catch (e) {}
  }
  if (!count) return { count: 0 };
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = KSL.slugFileName(report && report.title, 'kaspi-photos') + '-photos.zip';
  a.click();
  URL.revokeObjectURL(url);
  return { count: count };
};

KSL.copyComputedStyles = function (source, target) {
  if (!source || !target || source.nodeType !== 1 || target.nodeType !== 1) return;
  const computed = window.getComputedStyle(source);
  let style = '';
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    style += prop + ':' + computed.getPropertyValue(prop) + ';';
  }
  target.setAttribute('style', style);
  if (source.tagName === 'INPUT') {
    target.setAttribute('value', source.value);
  }
  if (target.style.backgroundImage && target.style.backgroundImage !== 'none') {
    target.style.backgroundImage = 'none';
  }
  const srcChildren = source.children || [];
  const dstChildren = target.children || [];
  for (let j = 0; j < srcChildren.length; j++) {
    KSL.copyComputedStyles(srcChildren[j], dstChildren[j]);
  }
};

KSL.imageUrlToDataUrl = async function (url) {
  if (!url) return '';
  if (/^data:image\/svg/i.test(url)) return '';
  if (/^data:/i.test(url)) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const blob = await res.blob();
    if (/svg/i.test(blob.type || '')) return '';
    return await new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { resolve(''); };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return '';
  }
};

KSL.exportCalcScreenshot = async function (shadow, report) {
  if (!shadow || !report) return;
  const locale = report.locale || 'ru-RU';
  const money = function (value) { return KSL.formatMoney(Math.round(value || 0), locale, true); };
  const percent = function (value) { return (Number(value) || 0).toLocaleString(locale) + ' %'; };
  const imageData = await KSL.imageUrlToDataUrl(report.imageUrl);
  const width = 720;
  const pad = 24;
  const gap = 16;
  const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
  const rows = [
    ['Доставка Kaspi', report.delivery],
    ['Комиссия категории', report.commissionOne],
    ['Упаковка', report.packaging],
    ['Карго', report.cargo],
    ['Бонус за отзыв', report.reviewBonus],
    ['Реклама', report.adsPerUnit],
    ['ИПН', report.taxOne],
    ['Всего расходов', report.expensesOne]
  ];
  const hasPurchasePrice = Number(report.cost) > 0;
  const ratios = [
    ['Маржа', percent(report.marginPercent), report.marginPercent < 0 ? '#b42318' : '#1a7f37'],
    [hasPurchasePrice ? 'ROI' : 'Без цены закупа', hasPurchasePrice ? percent(report.roiPercent) : '—', hasPurchasePrice ? (report.roiPercent < 0 ? '#b42318' : '#1a7f37') : '#666']
  ];
  const params = [
    ['Цена товара', money(report.productPrice)],
    ['Отзывы/продажи', String(Math.round(report.salesCount || 0))],
    ['Цена закупа', money(report.cost)],
    ['Карго / шт', money(report.cargo)],
    ['Доставка / шт', money(report.delivery)],
    ['Упаковка / шт', money(report.packaging)],
    ['Kaspi категория', percent(report.commissionPercent)],
    ['Бонус за отзыв / шт', money(report.reviewBonus)],
    ['Реклама / шт', money(report.adsPerUnit)],
    ['ИПН', percent(report.taxPercent)]
  ];

  function loadSafeImage(src) {
    return new Promise(function (resolve) {
      if (!src || !/^data:/i.test(src)) return resolve(null);
      const image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { resolve(null); };
      image.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function fillRound(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  }

  function text(ctx, value, x, y, opts) {
    opts = opts || {};
    ctx.fillStyle = opts.color || '#111';
    ctx.font = (opts.weight || 700) + ' ' + (opts.size || 16) + 'px Inter, Arial, sans-serif';
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(value || '—'), x, y);
  }

  function fitText(ctx, value, x, y, maxWidth, opts) {
    opts = opts || {};
    let size = opts.size || 18;
    const min = opts.min || 11;
    do {
      ctx.font = (opts.weight || 700) + ' ' + size + 'px Inter, Arial, sans-serif';
      if (ctx.measureText(String(value || '—')).width <= maxWidth || size <= min) break;
      size -= 1;
    } while (size >= min);
    text(ctx, value, x, y, { ...opts, size: size });
  }

  function wrapText(ctx, value, x, y, maxWidth, lineHeight, maxLines, opts) {
    const words = String(value || '—').split(/\s+/);
    const lines = [];
    let line = '';
    ctx.font = (opts.weight || 500) + ' ' + opts.size + 'px Inter, Arial, sans-serif';
    words.forEach(function (word) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach(function (lineText, index) {
      text(ctx, lineText, x, y + index * lineHeight, opts);
    });
    return Math.min(lines.length, maxLines) * lineHeight;
  }

  function drawImageContain(ctx, image, x, y, w, h) {
    if (!image) return;
    const ratio = Math.min(w / image.width, h / image.height);
    const iw = image.width * ratio;
    const ih = image.height * ratio;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    ctx.restore();
  }

  const productHeight = 124;
  const extraHeight = 34 + (rows.length + ratios.length) * 36;
  const paramsHeight = 44 + Math.ceil(params.length / 2) * 82;
  const metricHeight = 394;
  const height = pad * 2 + metricHeight + productHeight + extraHeight + paramsHeight + gap * 3;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#F8F9FA';
  ctx.fillRect(0, 0, width, height);

  let y = pad;
  fillRound(ctx, pad, y, width - pad * 2, metricHeight, 26, '#111');
  text(ctx, 'Оценка выручки', pad + 24, y + 24, { color: '#d0d0d0', size: 19, weight: 720 });
  fitText(ctx, money(report.revenue), pad + 24, y + 54, width - pad * 2 - 48, { color: '#fff', size: 31, min: 22, weight: 850 });
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad + 24, y + 114);
  ctx.lineTo(width - pad - 24, y + 114);
  ctx.stroke();
  const metricItems = [
    ['Доход после налогов', money(report.totalProfit), '#43e36d'],
    ['Доход / 1 шт', money(report.profitOne), '#43e36d'],
    ['Все расходы + налоги', money(report.totalFees), '#ff5f6f'],
    ['Расход / 1 шт', money(report.feesOne), '#ff5f6f']
  ];
  metricItems.forEach(function (item, index) {
    const yy = y + 136 + index * 58;
    text(ctx, item[0], pad + 24, yy, { color: '#d8d8d8', size: 18, weight: 750 });
    fitText(ctx, item[1], pad + 24, yy + 24, width - pad * 2 - 48, { color: item[2], size: 31, min: 21, weight: 850 });
  });

  y += metricHeight + gap;
  fillRound(ctx, pad, y, width - pad * 2, productHeight, 24, '#fff');
  const image = await loadSafeImage(imageData);
  const thumbX = pad + 22;
  const thumbY = y + 23;
  const thumbSize = 78;
  if (image) {
    drawImageContain(ctx, image, thumbX, thumbY, thumbSize, thumbSize);
  } else {
    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize);
  }
  const infoX = thumbX + thumbSize + 20;
  wrapText(ctx, report.title || '—', infoX, y + 24, width - infoX - pad - 22, 27, 2, { color: '#222', size: 23, weight: 760 });
  text(ctx, 'Арт.', infoX, y + 90, { color: '#666', size: 20, weight: 520 });
  fitText(ctx, report.sku || '—', infoX + 54, y + 90, width - infoX - pad - 78, { color: '#222', size: 21, min: 15, weight: 850 });

  y += productHeight + gap;
  fillRound(ctx, pad, y, width - pad * 2, extraHeight, 24, '#fff');
  rows.forEach(function (row, index) {
    const yy = y + 22 + index * 36;
    if (index === rows.length - 1) {
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + 22, yy - 10);
      ctx.lineTo(width - pad - 22, yy - 10);
      ctx.stroke();
    }
    const total = (row[1] || 0) * report.salesCount;
    text(ctx, row[0], pad + 22, yy, { color: '#444', size: 18, weight: index === rows.length - 1 ? 850 : 720 });
    fitText(ctx, money(total), width - pad - 144, yy, 152, { color: '#1a7f37', size: 19, min: 14, weight: 850, align: 'right' });
    fitText(ctx, money(row[1]), width - pad - 22, yy, 118, { color: '#b42318', size: 19, min: 14, weight: 850, align: 'right' });
  });
  ratios.forEach(function (row, index) {
    const yy = y + 22 + rows.length * 36 + index * 36;
    if (index === 0) {
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + 22, yy - 10);
      ctx.lineTo(width - pad - 22, yy - 10);
      ctx.stroke();
    }
    text(ctx, row[0], pad + 22, yy, { color: '#444', size: 18, weight: 720 });
    fitText(ctx, row[1], width - pad - 22, yy, 180, { color: row[2], size: 19, min: 14, weight: 850, align: 'right' });
  });

  y += extraHeight + gap;
  fillRound(ctx, pad, y, width - pad * 2, paramsHeight, 24, '#fff');
  params.forEach(function (row, index) {
    const col = index % 2;
    const rowIndex = Math.floor(index / 2);
    const cardW = (width - pad * 2 - 44 - 14) / 2;
    const x = pad + 22 + col * (cardW + 14);
    const yy = y + 22 + rowIndex * 82;
    text(ctx, row[0], x, yy, { color: '#4a4a4a', size: 18, weight: 800 });
    fillRound(ctx, x, yy + 28, cardW, 48, 13, '#eeeeee');
    fitText(ctx, row[1], x + cardW - 14, yy + 40, cardW - 28, { color: '#111', size: 22, min: 15, weight: 850, align: 'right' });
  });

  try {
    canvas.toBlob(function (blob) {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = KSL.slugFileName(report.title, 'ksl-calc') + '-report.png';
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  } catch (e) {
    if (imageData) {
      await KSL.exportCalcScreenshot(shadow, { ...report, imageUrl: '' });
    } else {
      throw e;
    }
  }
};

KSL.normalizeCategoryName = function (text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
};

KSL.loadKaspiCommissions = async function () {
  if (KSL.kaspiCommissions) return KSL.kaspiCommissions;
  const fallback = { categories: [] };
  try {
    const url = KSL.getRuntimeUrl('data/kaspi-commissions.json');
    if (!url) return fallback;
    const res = await fetch(url);
    KSL.kaspiCommissions = res.ok ? await res.json() : fallback;
  } catch (e) {
    KSL.kaspiCommissions = fallback;
  }
  return KSL.kaspiCommissions;
};

KSL.findKaspiCommission = async function (categoryText) {
  const normalized = KSL.normalizeCategoryName(categoryText);
  if (!normalized) return null;
  const data = await KSL.loadKaspiCommissions();
  const categories = data.categories || [];
  return categories.find(function (item) {
    const name = KSL.normalizeCategoryName(item.name);
    return normalized.includes(name) || name.includes(normalized);
  }) || null;
};

KSL.readCalcInput = function (shadow, key, fallback) {
  const input = shadow.querySelector('[data-calc-key="' + key + '"]');
  if (!input) return fallback || 0;
  const value = KSL.extractInputNumber(input.value);
  return Number.isFinite(value) ? value : (fallback || 0);
};

KSL.createCalculator = function (shadow) {
  const nodes = {
    revenue: shadow.getElementById('revenue'),
    netProfitTotal: shadow.getElementById('netProfitTotal'),
    profitPerUnit: shadow.getElementById('profitPerUnit'),
    totalFees: shadow.getElementById('totalFees'),
    feesPerUnit: shadow.getElementById('feesPerUnit'),
    extraPanel: shadow.getElementById('extraCalcPanel'),
    thumb: shadow.getElementById('productThumb'),
    title: shadow.getElementById('productTitle'),
    sku: shadow.getElementById('productSku'),
    calcInputs: shadow.querySelectorAll('[data-calc-key]')
  };

  let parseGen = 0;
  let parseTimer = null;
  let didInitInputs = false;
  let manualPrice = false;
  let manualSales = false;
  let activeProductContext = '';
  let lastReport = null;

  async function readField(selector) {
    const sync = KSL.findElement(selector);
    if (sync) return KSL.getElementText(sync);
    try {
      const el = await Promise.race([
        KSL.waitForElement(selector),
        new Promise(function (_, rej) {
          setTimeout(function () { rej(new Error('quick')); }, 400);
        })
      ]);
      return KSL.getElementText(el);
    } catch (e) {
      const late = KSL.findElement(selector);
      return late ? KSL.getElementText(late) : '';
    }
  }

  function updateStatus(selectors, lang) {
    const dict = KSL.getDict(lang);
    const canCheckDom = KSL.isProductPage();
    let completed = 0;
    let nextKey = '';
    shadow.querySelectorAll('[data-status]').forEach(function (node) {
      const key = node.dataset.status;
      const sel = selectors[key];
      const el = sel ? KSL.findElement(sel) : null;
      const validation = sel && canCheckDom && el && KSL.validateSelectorValueSync ? KSL.validateSelectorValueSync(key, el) : { ok: true };
      const isReady = Boolean(sel && (!canCheckDom || (el && validation.ok)));
      const item = shadow.querySelector('[data-selector-item="' + key + '"]');
      if (isReady) {
        completed++;
        node.textContent = dict.statusOk;
        node.className = 'selector-status is-ok';
      } else {
        if (!nextKey) nextKey = key;
        const isInvalid = Boolean(sel && el && validation && validation.ok === false);
        node.textContent = isInvalid ? (dict[validation.reason] || dict.selectorInvalid) : dict.statusPick;
        node.className = isInvalid ? 'selector-status is-invalid' : 'selector-status is-pick';
      }
      if (item) item.classList.toggle('is-complete', isReady);
    });
    const total = KSL.REQUIRED_SELECTORS.length;
    const isReady = completed === total;
    const selectorCard = shadow.getElementById('selectorCard');
    const count = shadow.getElementById('selectorCount');
    const intro = shadow.getElementById('selectorIntro');
    const startBtn = shadow.getElementById('selectorStartBtn');
    shadow.querySelectorAll('[data-selector-item]').forEach(function (item) {
      item.classList.toggle('is-next', !isReady && item.dataset.selectorItem === nextKey);
    });
    if (selectorCard) selectorCard.classList.toggle('is-ready', isReady);
    if (count) count.textContent = dict.selectorsProgress.replace('{done}', completed).replace('{total}', total);
    if (intro) {
      intro.dataset.i18n = isReady ? 'selectorsReady' : 'selectorsIntro';
      intro.textContent = isReady ? dict.selectorsReady : dict.selectorsIntro;
    }
    if (startBtn) {
      startBtn.classList.toggle('hidden', isReady);
      startBtn.dataset.key = nextKey;
      startBtn.dataset.i18n = completed ? 'selectorsContinue' : 'selectorsStart';
      startBtn.textContent = completed ? dict.selectorsContinue : dict.selectorsStart;
    }
  }

  async function parseLive() {
    const gen = ++parseGen;
    const selectors = await KSL.getSelectors();
    const data = await KSL.getStore();
    const lang = data.lang === 'kk' ? 'kk' : 'ru';
    const dict = KSL.getDict(lang);
    const locale = KSL.getLocale(lang);

    let pagePrice = 0;
    let reviews = 0;
    let category = '';
    let imageUrl = '';
    const tasks = [];

    if (selectors.price) {
      tasks.push(readField(selectors.price).then(function (t) { pagePrice = KSL.extractNumber(t); }));
    }
    if (selectors.reviews) {
      tasks.push(readField(selectors.reviews).then(function (t) { reviews = KSL.extractNumber(t); }));
    }
    if (selectors.category) {
      tasks.push(readField(selectors.category).then(function (t) { category = t.trim(); }));
    }
    if (selectors.title) {
      tasks.push(readField(selectors.title).then(function (t) {
        nodes.title.innerText = t.trim().slice(0, 80) || KSL.formatEmpty();
      }));
    } else {
      nodes.title.innerText = KSL.formatEmpty();
    }
    if (selectors.image) {
      const img = KSL.findElement(selectors.image);
      const url = KSL.getElementImageUrl(img);
      imageUrl = url || '';
      nodes.thumb.dataset.imageUrl = imageUrl;
      nodes.thumb.style.backgroundImage = url ? 'url("' + url.replace(/"/g, '\\"') + '")' : '';
      nodes.thumb.classList.toggle('has-image', Boolean(url));
    } else {
      imageUrl = '';
      nodes.thumb.dataset.imageUrl = '';
      nodes.thumb.style.backgroundImage = '';
      nodes.thumb.classList.remove('has-image');
    }
    if (selectors.sku) {
      tasks.push(readField(selectors.sku).then(function (t) {
        const sku = KSL.extractSkuDigits(t).slice(0, 20);
        KSL.setOneLineText(nodes.sku, sku || KSL.formatEmpty(), [12, 11, 10, 9, 8]);
      }));
    } else {
      KSL.setOneLineText(nodes.sku, KSL.formatEmpty(), [12, 11, 10, 9, 8]);
    }

    await Promise.all(tasks);
    if (gen !== parseGen) return;

    const productKey = KSL.isProductPage() ? KSL.getProductCalcKey(location.href) : '';
    const productContext = productKey + '|' + category;
    const categoryProfile = category && KSL.findCategoryProfile ? await KSL.findCategoryProfile(category) : null;
    if (gen !== parseGen) return;
    if (productContext !== activeProductContext) {
      const productSettings = productKey ? await KSL.getProductCalcSettings(location.href) : {};
      let commissionDefault = KSL.DEFAULT_CALC_SETTINGS.commissionPercent;
      if (categoryProfile) {
        commissionDefault = categoryProfile.commissionPercent;
      } else if (category) {
        const found = await KSL.findKaspiCommission(category);
        if (found) commissionDefault = found.default;
      }
      if (gen !== parseGen) return;
      const defaults = {
        ...KSL.DEFAULT_CALC_SETTINGS,
        ...(categoryProfile || {}),
        commissionPercent: commissionDefault
      };
      KSL.PRODUCT_CALC_KEYS.forEach(function (key) {
        const input = shadow.querySelector('[data-calc-key="' + key + '"]');
        if (!input) return;
        input.value = String(productSettings[key] !== undefined ? productSettings[key] : defaults[key]);
      });
      manualPrice = false;
      manualSales = false;
      activeProductContext = productContext;
    }

    if (!manualPrice && pagePrice) {
      const priceInput = shadow.getElementById('calcProductPrice');
      if (priceInput) priceInput.value = String(pagePrice);
    }
    if (!manualSales && reviews) {
      const salesInput = shadow.getElementById('calcSalesCount');
      if (salesInput) salesInput.value = String(reviews);
    }

    const productPrice = KSL.readCalcInput(shadow, 'productPrice', pagePrice);
    const salesCount = KSL.readCalcInput(shadow, 'salesCount', reviews);
    const cost = KSL.readCalcInput(shadow, 'cost', 0);
    const cargo = KSL.readCalcInput(shadow, 'cargo', 0);
    const delivery = KSL.readCalcInput(shadow, 'delivery', 0);
    const packaging = KSL.readCalcInput(shadow, 'packaging', 0);
    const commissionPercent = KSL.readCalcInput(shadow, 'commissionPercent', 0);
    const reviewBonus = KSL.readCalcInput(shadow, 'reviewBonus', 0);
    const adsPerUnit = KSL.readCalcInput(shadow, 'adsPerUnit', 0);
    const taxPercent = KSL.readCalcInput(shadow, 'taxPercent', 0);
    const commission = productPrice * commissionPercent / 100;
    const tax = productPrice * taxPercent / 100;
    const expensesOne = cost + cargo + delivery + packaging + commission + reviewBonus + adsPerUnit + tax;
    const feesOne = expensesOne;
    const profitOne = productPrice - expensesOne;
    const totalRevenue = productPrice * salesCount;
    const totalProfit = profitOne * salesCount;
    const totalFees = expensesOne * salesCount;
    const format = function (value) { return KSL.formatMoney(Math.round(value), locale, true); };
    const formatRatio = function (value) {
      if (value === null || value === undefined || !Number.isFinite(value)) return KSL.formatEmpty();
      return value.toLocaleString(locale, { maximumFractionDigits: 1 }) + ' %';
    };
    const setRatio = function (id, value) {
      const el = shadow.getElementById(id);
      if (!el) return;
      el.textContent = formatRatio(value);
      el.classList.toggle('is-bad', value < 0);
    };
    const setExtra = function (key, unit) {
      const totalEl = shadow.getElementById('extra' + key + 'Total');
      const unitEl = shadow.getElementById('extra' + key + 'Unit');
      if (totalEl) totalEl.textContent = format(unit * salesCount);
      if (unitEl) unitEl.textContent = format(unit);
    };
    setExtra('Purchase', cost);
    setExtra('Delivery', delivery);
    setExtra('Commission', commission);
    setExtra('Packaging', packaging);
    setExtra('Cargo', cargo);
    setExtra('ReviewBonus', reviewBonus);
    setExtra('Ads', adsPerUnit);
    setExtra('Tax', tax);
    setExtra('Cost', expensesOne);
    const marginPercent = productPrice ? profitOne / productPrice * 100 : 0;
    const hasPurchasePrice = cost > 0;
    const roiPercent = hasPurchasePrice && expensesOne ? profitOne / expensesOne * 100 : null;
    const roiLabel = shadow.getElementById('extraRoiLabel');
    if (roiLabel) {
      roiLabel.dataset.i18n = hasPurchasePrice ? 'extraRoi' : 'extraNoPurchase';
      roiLabel.textContent = hasPurchasePrice ? dict.extraRoi : dict.extraNoPurchase;
    }
    setRatio('extraMarginValue', marginPercent);
    setRatio('extraRoiValue', roiPercent);
    lastReport = {
      title: nodes.title.textContent,
      sku: nodes.sku.textContent,
      category: category || 'Без категории',
      imageUrl: imageUrl,
      url: location.href,
      locale: locale,
      productPrice: productPrice,
      salesCount: salesCount,
      revenue: totalRevenue,
      profitOne: profitOne,
      totalProfit: totalProfit,
      feesOne: feesOne,
      totalFees: totalFees,
      marginPercent: marginPercent,
      roiPercent: roiPercent,
      cost: cost,
      cargo: cargo,
      delivery: delivery,
      packaging: packaging,
      expensesOne: expensesOne,
      totalExpenses: expensesOne * salesCount,
      commissionPercent: commissionPercent,
      commissionOne: commission,
      reviewBonus: reviewBonus,
      adsPerUnit: adsPerUnit,
      taxPercent: taxPercent,
      taxOne: tax
    };

    if (selectors.price && selectors.reviews) {
      KSL.setMetricText(nodes.revenue, KSL.formatMoney(Math.round(totalRevenue), locale, true));
      nodes.netProfitTotal.textContent = KSL.formatMoney(Math.round(totalProfit), locale, true);
      nodes.profitPerUnit.textContent = KSL.formatMoney(Math.round(profitOne), locale, true);
      nodes.totalFees.textContent = KSL.formatMoney(Math.round(totalFees), locale, true);
      nodes.feesPerUnit.textContent = KSL.formatMoney(Math.round(feesOne), locale, true);
    } else {
      KSL.setMetricText(nodes.revenue, KSL.formatEmpty());
      nodes.netProfitTotal.textContent = KSL.formatEmpty();
      nodes.profitPerUnit.textContent = KSL.formatEmpty();
      nodes.totalFees.textContent = KSL.formatEmpty();
      nodes.feesPerUnit.textContent = KSL.formatEmpty();
    }

    updateStatus(selectors, lang);
    return { selectors: selectors, lang: lang };
  }

  function scheduleParse() {
    clearTimeout(parseTimer);
    parseTimer = setTimeout(parseLive, 300);
  }

  new MutationObserver(scheduleParse).observe(document.body, { childList: true, subtree: true });

  async function initInputs() {
    if (didInitInputs) return;
    didInitInputs = true;
    manualPrice = false;
    manualSales = false;
    nodes.calcInputs.forEach(function (input) {
      const key = input.dataset.calcKey;
      input.value = key === 'productPrice' || key === 'salesCount' ? '0' : String(KSL.DEFAULT_CALC_SETTINGS[key] || 0);
      input.addEventListener('focus', function () {
        if (input.value.trim() === '0') input.value = '';
      });
      input.addEventListener('input', async function () {
        if (key === 'productPrice') manualPrice = true;
        if (key === 'salesCount') manualSales = true;
        if (KSL.PRODUCT_CALC_KEYS.includes(key) && KSL.isProductPage()) {
          await KSL.saveProductCalcSetting(location.href, key, KSL.extractInputNumber(input.value));
        }
        parseLive();
      });
      input.addEventListener('blur', async function () {
        const value = KSL.normalizeCalcInput(input);
        if (KSL.PRODUCT_CALC_KEYS.includes(key) && KSL.isProductPage()) {
          await KSL.saveProductCalcSetting(location.href, key, value);
        }
        parseLive();
      });
    });
  }

  initInputs();

  const extraBtn = shadow.getElementById('extraCalcBtn');
  const exportMenuBtn = shadow.getElementById('exportMenuBtn');
  const exportOptionsPanel = shadow.getElementById('exportOptionsPanel');
  const screenshotBtn = shadow.getElementById('screenshotReportBtn');
  const exportBtn = shadow.getElementById('exportReportBtn');
  const downloadPhotosBtn = shadow.getElementById('downloadPhotosBtn');
  const addHistoryBtn = shadow.getElementById('addHistoryBtn');
  const inputsToggleBtn = shadow.getElementById('calcInputsToggle');
  const calcCard = shadow.querySelector('.calc-card');
  if (extraBtn && nodes.extraPanel) {
    extraBtn.addEventListener('click', function () {
      nodes.extraPanel.classList.toggle('hidden');
    });
    KSL.getStore().then(function (store) {
      nodes.extraPanel.classList.toggle('hidden', store.autoOpenExtra !== true);
    });
  }
  if (exportMenuBtn && exportOptionsPanel) {
    exportMenuBtn.addEventListener('click', function () {
      const willOpen = exportOptionsPanel.classList.contains('hidden');
      exportOptionsPanel.classList.toggle('hidden', !willOpen);
      exportMenuBtn.setAttribute('aria-expanded', String(willOpen));
    });
  }

  function closeExportOptions() {
    if (!exportMenuBtn || !exportOptionsPanel) return;
    exportOptionsPanel.classList.add('hidden');
    exportMenuBtn.setAttribute('aria-expanded', 'false');
  }

  async function canUseReport(button) {
    const store = await KSL.getStore();
    const dict = KSL.getDict(store.lang === 'kk' ? 'kk' : 'ru');
    const selectors = { ...KSL.DEFAULT_SELECTORS, ...(store.selectors || {}) };
    const validReport = lastReport && (!KSL.isValidHistoryItem || KSL.isValidHistoryItem(lastReport));
    const validSelectors = KSL.hasUsableSelectors ? KSL.hasUsableSelectors(selectors) : KSL.hasRequiredSelectors(selectors);
    if (validReport && validSelectors) return true;
    if (button) {
      const oldText = button.textContent;
      button.textContent = dict.historyMissing;
      setTimeout(function () { button.textContent = oldText; }, 1200);
    }
    return false;
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async function () {
      if (!(await canUseReport(exportBtn))) return;
      await KSL.exportReportXlsx(lastReport);
      closeExportOptions();
    });
  }
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', async function () {
      if (!(await canUseReport(screenshotBtn))) return;
      await KSL.exportCalcScreenshot(shadow, lastReport);
      closeExportOptions();
    });
  }
  if (downloadPhotosBtn) {
    downloadPhotosBtn.addEventListener('click', async function () {
      const store = await KSL.getStore();
      const dict = KSL.getDict(store.lang === 'kk' ? 'kk' : 'ru');
      const oldText = downloadPhotosBtn.textContent;
      downloadPhotosBtn.textContent = dict.photosDownloading;
      const result = await KSL.downloadGalleryPhotosZip(lastReport || {});
      downloadPhotosBtn.textContent = result.count ? dict.photosDownloaded : dict.photosNotFound;
      setTimeout(function () { downloadPhotosBtn.textContent = oldText; }, 1400);
    });
  }
  if (addHistoryBtn) {
    addHistoryBtn.addEventListener('click', async function () {
      const store = await KSL.getStore();
      const dict = KSL.getDict(store.lang === 'kk' ? 'kk' : 'ru');
      const oldText = addHistoryBtn.textContent;
      if (!KSL.addHistoryItem || !(await canUseReport(addHistoryBtn))) return;
      const item = await KSL.addHistoryItem(lastReport);
      if (!item) {
        addHistoryBtn.textContent = dict.historyMissing;
        setTimeout(function () { addHistoryBtn.textContent = oldText; }, 1200);
        return;
      }
      if (KSL.renderHistory) await KSL.renderHistory(shadow);
      addHistoryBtn.textContent = dict.historySaved;
      setTimeout(function () { addHistoryBtn.textContent = oldText; }, 1200);
    });
  }
  if (inputsToggleBtn && calcCard) {
    inputsToggleBtn.addEventListener('click', function () {
      calcCard.classList.toggle('hidden');
    });
    KSL.getStore().then(function (store) {
      calcCard.classList.toggle('hidden', store.autoOpenInputs !== true);
    });
  }

  return { parseLive: parseLive, scheduleParse: scheduleParse, updateStatus: updateStatus };
};
