// src/history.js — saved calculator products
window.KSL = window.KSL || {};

KSL.HISTORY_PAGE_SIZE = 5;
KSL.historyState = { page: 1, category: 'all', query: '' };
KSL.historyNoteTimers = {};

KSL.isValidHistoryItem = function (item) {
  if (!item) return false;
  const title = String(item.title || '').trim();
  const skuDigits = String(item.sku || '').replace(/\D/g, '');
  const price = Number(item.productPrice) || 0;
  return title && title !== '—' && skuDigits.length > 0 && price > 0;
};

KSL.getHistoryItems = async function () {
  const data = await KSL.storageGet(['historyItems']);
  const raw = Array.isArray(data.historyItems) ? data.historyItems : [];
  const clean = raw.filter(KSL.isValidHistoryItem);
  if (clean.length !== raw.length) await KSL.storageSet({ historyItems: clean });
  return clean;
};

KSL.saveHistoryItems = async function (items) {
  await KSL.storageSet({ historyItems: items.slice(0, 200) });
};

KSL.createHistoryItem = function (report) {
  return {
    id: Date.now().toString(36),
    savedAt: Date.now(),
    calculationVersion: 1,
    title: report.title || '—',
    sku: report.sku || '—',
    category: report.category || 'Без категории',
    imageUrl: report.imageUrl || '',
    url: report.url || location.href,
    productPrice: Number(report.productPrice) || 0,
    salesCount: Number(report.salesCount) || 0,
    revenue: Number(report.revenue) || 0,
    totalProfit: Number(report.totalProfit) || 0,
    totalFees: Number(report.totalFees) || 0,
    cost: Number(report.cost) || 0,
    cargo: Number(report.cargo) || 0,
    delivery: Number(report.delivery) || 0,
    packaging: Number(report.packaging) || 0,
    commissionPercent: Number(report.commissionPercent) || 0,
    commissionOne: Number(report.commissionOne) || 0,
    reviewBonus: Number(report.reviewBonus) || 0,
    adsPerUnit: Number(report.adsPerUnit) || 0,
    taxPercent: Number(report.taxPercent) || 0,
    taxOne: Number(report.taxOne) || 0,
    expensesOne: Number(report.expensesOne) || Number(report.feesOne) || 0,
    totalExpenses: Number(report.totalExpenses) || Number(report.totalFees) || 0,
    feesOne: Number(report.feesOne) || 0,
    profitOne: Number(report.profitOne) || 0,
    marginPercent: Number(report.marginPercent) || 0,
    roiPercent: report.roiPercent !== null && report.roiPercent !== undefined && Number.isFinite(Number(report.roiPercent))
      ? Number(report.roiPercent)
      : null,
    note: ''
  };
};

KSL.addHistoryItem = async function (report) {
  const item = KSL.createHistoryItem(report);
  if (!KSL.isValidHistoryItem(item)) return null;
  const items = await KSL.getHistoryItems();
  const normalizedSku = String(item.sku || '').replace(/\D/g, '');
  const filtered = items.filter(function (old) {
    const oldSku = String(old.sku || '').replace(/\D/g, '');
    if (normalizedSku && oldSku) return oldSku !== normalizedSku;
    return !(old.title === item.title && old.category === item.category);
  });
  filtered.unshift(item);
  await KSL.saveHistoryItems(filtered);
  return item;
};

KSL.buildHistoryHtml = function () {
  return (
    '<div class="ksl-content hidden" id="historyTab">' +
    KSL.Ads.getBannerHtml() +
    '<div class="card history-head"><div class="card-title" data-i18n="historyTitle">История</div>' +
    '<p class="history-desc" data-i18n="historyDesc">Сохраняйте товары и сравнивайте доход.</p>' +
    '<input class="history-search" id="historySearch" type="search" autocomplete="off" data-i18n-aria="historySearchAria" data-i18n-placeholder="historySearchPlaceholder" placeholder="Поиск по названию">' +
    '<select class="history-filter" id="historyCategoryFilter" aria-label="Категория"><option value="all" data-i18n="historyAllCategories">Все категории</option></select>' +
    '<button type="button" class="soft-btn history-export" id="historyExportBtn" data-i18n="historyExportAll" disabled>Excel</button></div>' +
    '<div class="history-list" id="historyList"></div>' +
    '<div class="history-empty hidden" id="historyEmpty" data-i18n="historyEmpty">История пока пустая</div>' +
    '<div class="history-pager hidden" id="historyPager">' +
    '<button type="button" class="soft-btn" id="historyPrev" data-i18n="historyPrev">Назад</button>' +
    '<span id="historyPageInfo">1 / 1</span>' +
    '<button type="button" class="soft-btn" id="historyNext" data-i18n="historyNext">Далее</button>' +
    '</div></div>'
  );
};

KSL.renderHistory = async function (shadow) {
  const store = await KSL.getStore();
  const lang = store.lang === 'kk' ? 'kk' : 'ru';
  KSL.historyState.lang = lang;
  const dict = KSL.getDict(lang);
  const locale = KSL.getLocale(lang);
  const items = await KSL.getHistoryItems();
  const list = shadow.getElementById('historyList');
  const empty = shadow.getElementById('historyEmpty');
  const filter = shadow.getElementById('historyCategoryFilter');
  const search = shadow.getElementById('historySearch');
  const pager = shadow.getElementById('historyPager');
  const pageInfo = shadow.getElementById('historyPageInfo');
  const prev = shadow.getElementById('historyPrev');
  const next = shadow.getElementById('historyNext');
  const exportBtn = shadow.getElementById('historyExportBtn');
  if (!list || !filter) return;
  const query = String(KSL.historyState.query || '').trim().toLowerCase();
  if (search && search.value !== (KSL.historyState.query || '')) {
    search.value = KSL.historyState.query || '';
  }
  if (search && dict.historySearchPlaceholder) {
    search.placeholder = dict.historySearchPlaceholder;
  }

  const categories = Array.from(new Set(items.map(function (item) {
    return item.category || 'Без категории';
  }))).sort();
  const current = KSL.historyState.category || 'all';
  filter.innerHTML = '<option value="all">' + KSL.escapeXml(dict.historyAllCategories) + '</option>' + categories.map(function (category) {
    return '<option value="' + KSL.escapeXml(category) + '">' + KSL.escapeXml(category) + '</option>';
  }).join('');
  filter.value = categories.includes(current) ? current : 'all';
  KSL.historyState.category = filter.value;

  const categoryFiltered = KSL.historyState.category === 'all'
    ? items
    : items.filter(function (item) { return item.category === KSL.historyState.category; });
  const filtered = query
    ? categoryFiltered.filter(function (item) {
      return String(item.title || '').toLowerCase().includes(query);
    })
    : categoryFiltered;
  const totalPages = Math.max(1, Math.ceil(filtered.length / KSL.HISTORY_PAGE_SIZE));
  KSL.historyState.page = Math.min(Math.max(1, KSL.historyState.page || 1), totalPages);
  const start = (KSL.historyState.page - 1) * KSL.HISTORY_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + KSL.HISTORY_PAGE_SIZE);

  list.innerHTML = pageItems.map(function (item) {
    const image = item.imageUrl ? ' style="background-image:url(' + String(item.imageUrl).replace(/"/g, '&quot;') + ')"' : '';
    const imageAttr = item.imageUrl ? ' data-history-image="' + KSL.escapeXml(item.imageUrl) + '"' : '';
    const isSelected = KSL.historyState.selectedId === item.id;
    return (
      '<div class="history-item" data-history-id="' + KSL.escapeXml(item.id) + '">' +
      '<button type="button" class="history-thumb"' + image + imageAttr + ' aria-label="' + KSL.escapeXml(dict.viewProductPhoto) + '"></button>' +
      '<div class="history-info"><div class="history-title">' + KSL.escapeXml(item.title) + '</div>' +
      '<div class="history-category">' + KSL.escapeXml(item.category || 'Без категории') + '</div>' +
      (item.note ? '<div class="history-note-preview">' + KSL.escapeXml(item.note) + '</div>' : '') +
      (isSelected ? '<div class="history-actions">' +
        '<button type="button" class="soft-btn" data-history-action="delete" data-history-id="' + KSL.escapeXml(item.id) + '">' + KSL.escapeXml(dict.historyDelete) + '</button>' +
        '<button type="button" class="soft-btn" data-history-action="open" data-history-url="' + KSL.escapeXml(item.url || '') + '">' + KSL.escapeXml(dict.historyOpen) + '</button>' +
        '<button type="button" class="soft-btn" data-history-action="note" data-history-id="' + KSL.escapeXml(item.id) + '">' + KSL.escapeXml(KSL.historyState.noteDirtyId === item.id ? dict.historySaveNote : dict.historyNote) + '</button>' +
        '<button type="button" class="soft-btn" data-history-action="cancel">' + KSL.escapeXml(dict.historyCancel) + '</button>' +
      '</div>' + (KSL.historyState.noteId === item.id
        ? '<div class="history-note-editor"><textarea data-history-note="' + KSL.escapeXml(item.id) + '" data-i18n-placeholder="historyNotePlaceholder" placeholder="' + KSL.escapeXml(dict.historyNotePlaceholder) + '">' + KSL.escapeXml(item.note || '') + '</textarea><div class="history-note-hint">' + KSL.escapeXml(dict.historyNoteAutosave) + '</div></div>'
        : '') : '<div class="history-values">' +
      '<span><small>' + KSL.escapeXml(dict.historyPrice) + '</small><b>' + KSL.formatMoney(Math.round(item.productPrice), locale, true) + '</b></span>' +
      '<span><small>' + KSL.escapeXml(dict.historyTaxUnit) + '</small><b class="is-red">' + KSL.formatMoney(Math.round(item.feesOne), locale, true) + '</b></span>' +
      '<span><small>' + KSL.escapeXml(dict.historyProfitUnit) + '</small><b class="is-green">' + KSL.formatMoney(Math.round(item.profitOne), locale, true) + '</b></span>' +
      '</div>') + '</div></div>'
    );
  }).join('');

  if (empty) {
    empty.textContent = items.length > 0 && filtered.length === 0 ? dict.historySearchEmpty : dict.historyEmpty;
    empty.classList.toggle('hidden', items.length > 0 && filtered.length > 0);
  }
  if (exportBtn) exportBtn.disabled = items.length === 0;
  if (pager) pager.classList.toggle('hidden', filtered.length <= KSL.HISTORY_PAGE_SIZE);
  if (pageInfo) pageInfo.textContent = KSL.historyState.page + ' / ' + totalPages;
  if (prev) prev.disabled = KSL.historyState.page <= 1;
  if (next) next.disabled = KSL.historyState.page >= totalPages;
};

KSL.hasHistoryBreakdown = function (item) {
  return item && Number(item.calculationVersion) >= 1;
};

KSL.historyXlsxCell = function (rowIndex, colIndex, cell) {
  const ref = KSL.xlsxCol(colIndex) + rowIndex;
  const styleAttr = cell.style ? ' s="' + cell.style + '"' : '';
  if (cell.formula) {
    const hasCachedValue = cell.value !== null && cell.value !== undefined && cell.value !== '';
    const cached = hasCachedValue && Number.isFinite(Number(cell.value)) ? '<v>' + Number(cell.value) + '</v>' : '';
    return '<c r="' + ref + '"' + styleAttr + '><f>' + KSL.escapeXml(cell.formula) + '</f>' + cached + '</c>';
  }
  return KSL.xlsxCell(rowIndex, colIndex, cell.value, cell.style || 0);
};

KSL.buildHistoryXlsxSheet = function (rows, columns, options) {
  const settings = options || {};
  const lastColumn = KSL.xlsxCol(columns.length);
  const lastRow = rows.length;
  const xmlRows = rows.map(function (row, rowIdx) {
    const rowIndex = rowIdx + 1;
    const height = row.height ? ' ht="' + row.height + '" customHeight="1"' : '';
    const cells = row.cells.map(function (cell, cellIdx) {
      return KSL.historyXlsxCell(rowIndex, cellIdx + 1, {
        value: cell.value,
        formula: cell.formula,
        style: cell.style || row.style || 0
      });
    }).join('');
    return '<row r="' + rowIndex + '"' + height + '>' + cells + '</row>';
  }).join('');
  const cols = columns.map(function (width, index) {
    const col = index + 1;
    return '<col min="' + col + '" max="' + col + '" width="' + width + '" customWidth="1"/>';
  }).join('');
  const merged = '<mergeCells count="2"><mergeCell ref="A1:' + lastColumn + '1"/><mergeCell ref="A2:' + lastColumn + '2"/></mergeCells>';
  const filter = settings.filter
    ? '<autoFilter ref="A4:' + lastColumn + lastRow + '"/>'
    : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="18"/><cols>' + cols + '</cols><sheetData>' + xmlRows + '</sheetData>' + filter + merged + '</worksheet>';
};

KSL.exportHistoryXlsx = async function (items) {
  if (!window.JSZip || !items || !items.length) return false;
  const zip = new window.JSZip();
  const exportedAt = new Date().toLocaleDateString('ru-RU');
  const subtitle = items.length + ' товаров · экспорт ' + exportedAt;
  const overviewRows = [
    { style: 1, height: 29, cells: [{ value: 'Kaspi Seller Lens (Unofficial) · История товаров' }] },
    { style: 2, height: 21, cells: [{ value: subtitle }] },
    { height: 8, cells: [{ value: '' }] },
    { style: 3, height: 38, cells: [
      { value: '#' }, { value: 'Название' }, { value: 'Код товара' }, { value: 'Категория' },
      { value: 'Цена товара' }, { value: 'Продажи' }, { value: 'Выручка' },
      { value: 'Расход / шт' }, { value: 'Доход / шт' }, { value: 'Маржа' },
      { value: 'ROI' }, { value: 'Сохранено' }, { value: 'Ссылка' }
    ] }
  ];
  const detailRows = [
    { style: 1, height: 29, cells: [{ value: 'Расходы на 1 товар · сохранённый расчёт' }] },
    { style: 2, height: 21, cells: [{ value: subtitle + ' · суммы указаны за 1 шт' }] },
    { height: 8, cells: [{ value: '' }] },
    { style: 3, height: 42, cells: [
      { value: '#' }, { value: 'Название' }, { value: 'Код товара' }, { value: 'Категория' },
      { value: 'Цена товара' }, { value: 'Продажи' }, { value: 'Цена закупа' },
      { value: 'Доставка Kaspi' }, { value: 'Комиссия %' }, { value: 'Комиссия' },
      { value: 'Упаковка' }, { value: 'Карго' }, { value: 'Бонус за отзыв' },
      { value: 'Реклама' }, { value: 'ИПН %' }, { value: 'ИПН' },
      { value: 'Всего расходов' }, { value: 'Доход / шт' }, { value: 'Маржа' },
      { value: 'ROI' }, { value: 'Детализация' }, { value: 'Ссылка' }
    ] }
  ];

  items.forEach(function (item, index) {
    const detailRowIndex = index + 5;
    const hasDetails = KSL.hasHistoryBreakdown(item);
    const savedDate = item.savedAt ? new Date(item.savedAt).toLocaleDateString('ru-RU') : '';
    const expense = Number(item.expensesOne !== undefined ? item.expensesOne : item.feesOne) || 0;
    const sales = Number(item.salesCount) || 0;
    const price = Number(item.productPrice) || 0;
    const profit = Number(item.profitOne) || 0;
    const revenue = Number(item.revenue) || price * sales;
    const margin = item.marginPercent !== null && item.marginPercent !== undefined && Number.isFinite(Number(item.marginPercent))
      ? Number(item.marginPercent) / 100
      : (price ? profit / price : null);
    const roi = item.roiPercent !== null && item.roiPercent !== undefined && Number.isFinite(Number(item.roiPercent))
      ? Number(item.roiPercent) / 100
      : null;
    const hasRoi = hasDetails && Number(item.cost) > 0 && roi !== null;
    const detailStatus = hasDetails ? 'Полный снимок' : 'Сохраните заново для детализации';
    const detailRef = "'Расходы на 1 шт'!";

    overviewRows.push({ height: 36, cells: [
      { value: index + 1, style: 4 },
      { value: item.title || '', style: 4 },
      { value: item.sku || '', style: 4 },
      { value: item.category || 'Без категории', style: 4 },
      { formula: detailRef + 'E' + detailRowIndex, value: price, style: 5 },
      { value: sales, style: 4 },
      { value: revenue, style: 5 },
      { formula: detailRef + 'Q' + detailRowIndex, value: expense, style: 6 },
      { formula: detailRef + 'R' + detailRowIndex, value: profit, style: 7 },
      { formula: detailRef + 'S' + detailRowIndex, value: margin, style: 8 },
      { formula: hasRoi ? detailRef + 'T' + detailRowIndex : '', value: hasRoi ? roi : '—', style: hasRoi ? 8 : 11 },
      { value: savedDate, style: 4 },
      { value: item.url || '', style: 10 }
    ] });

    detailRows.push({ height: 36, cells: [
      { value: index + 1, style: 4 },
      { value: item.title || '', style: 4 },
      { value: item.sku || '', style: 4 },
      { value: item.category || 'Без категории', style: 4 },
      { value: price, style: 5 },
      { value: sales, style: 4 },
      { value: hasDetails ? Number(item.cost) || 0 : null, style: 6 },
      { value: hasDetails ? Number(item.delivery) || 0 : null, style: 6 },
      { value: hasDetails ? (Number(item.commissionPercent) || 0) / 100 : null, style: 8 },
      { formula: hasDetails ? 'E' + detailRowIndex + '*I' + detailRowIndex : '', value: hasDetails ? Number(item.commissionOne) || 0 : null, style: 6 },
      { value: hasDetails ? Number(item.packaging) || 0 : null, style: 6 },
      { value: hasDetails ? Number(item.cargo) || 0 : null, style: 6 },
      { value: hasDetails ? Number(item.reviewBonus) || 0 : null, style: 6 },
      { value: hasDetails ? Number(item.adsPerUnit) || 0 : null, style: 6 },
      { value: hasDetails ? (Number(item.taxPercent) || 0) / 100 : null, style: 8 },
      { formula: hasDetails ? 'E' + detailRowIndex + '*O' + detailRowIndex : '', value: hasDetails ? Number(item.taxOne) || 0 : null, style: 6 },
      { formula: hasDetails ? 'SUM(G' + detailRowIndex + ',H' + detailRowIndex + ',J' + detailRowIndex + ':N' + detailRowIndex + ',P' + detailRowIndex + ')' : '', value: expense, style: 6 },
      { formula: hasDetails ? 'E' + detailRowIndex + '-Q' + detailRowIndex : '', value: profit, style: 7 },
      { formula: hasDetails ? 'IF(E' + detailRowIndex + '>0,R' + detailRowIndex + '/E' + detailRowIndex + ',\"\")' : '', value: margin, style: 8 },
      { formula: hasRoi ? 'IF(Q' + detailRowIndex + '>0,R' + detailRowIndex + '/Q' + detailRowIndex + ',\"\")' : '', value: hasRoi ? roi : '—', style: hasRoi ? 8 : 11 },
      { value: detailStatus, style: hasDetails ? 9 : 11 },
      { value: item.url || '', style: 10 }
    ] });
  });

  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>');
  zip.folder('_rels').file('.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>');
  zip.folder('xl').file('workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Обзор" sheetId="1" r:id="rId1"/><sheet name="Расходы на 1 шт" sheetId="2" r:id="rId2"/></sheets>' +
    '<calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
  zip.folder('xl').folder('_rels').file('workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>');
  zip.folder('xl').folder('worksheets').file('sheet1.xml', KSL.buildHistoryXlsxSheet(
    overviewRows,
    [5, 34, 16, 22, 15, 12, 16, 16, 16, 12, 12, 14, 45],
    { filter: true }
  ));
  zip.folder('xl').folder('worksheets').file('sheet2.xml', KSL.buildHistoryXlsxSheet(
    detailRows,
    [5, 34, 16, 22, 15, 12, 15, 17, 13, 15, 14, 13, 17, 14, 12, 14, 17, 16, 12, 12, 30, 45],
    { filter: true }
  ));
  zip.folder('xl').file('styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0&quot; ₸&quot;;[Red]-#,##0&quot; ₸&quot;;-"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>' +
    '<fonts count="7">' +
    '<font><sz val="10.5"/><name val="Arial"/><color rgb="FF202124"/></font>' +
    '<font><b/><sz val="16"/><name val="Arial"/><color rgb="FFFFFFFF"/></font>' +
    '<font><sz val="10"/><name val="Arial"/><color rgb="FF667085"/></font>' +
    '<font><b/><sz val="10"/><name val="Arial"/><color rgb="FF202124"/></font>' +
    '<font><b/><sz val="10.5"/><name val="Arial"/><color rgb="FF1A7F37"/></font>' +
    '<font><sz val="10"/><name val="Arial"/><color rgb="FF0A66C2"/><u/></font>' +
    '<font><b/><sz val="10.5"/><name val="Arial"/><color rgb="FFB42318"/></font>' +
    '</fonts>' +
    '<fills count="7">' +
    '<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF111111"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFECEFF1"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFDEBEC"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF7EE"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4E5"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left/><right/><top/><bottom style="thin"><color rgb="FFDADDE1"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="12">' +
    '<xf fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="0" fillId="0" borderId="1" xfId="0" numFmtId="164" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="6" fillId="4" borderId="1" xfId="0" numFmtId="164" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="4" fillId="5" borderId="1" xfId="0" numFmtId="164" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="0" fillId="0" borderId="1" xfId="0" numFmtId="165" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="4" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="5" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf fontId="2" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>');
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kaspi-seller-lens-history-full.xlsx';
  a.click();
  URL.revokeObjectURL(url);
  return true;
};

KSL.deleteHistoryItem = async function (id) {
  const items = await KSL.getHistoryItems();
  await KSL.saveHistoryItems(items.filter(function (item) { return item.id !== id; }));
};

KSL.setHistoryNoteButton = function (shadow, id, isDirty) {
  const button = shadow.querySelector('[data-history-action="note"][data-history-id="' + CSS.escape(id) + '"]');
  if (!button) return;
  const dict = KSL.getDict((KSL.historyState.lang || 'ru') === 'kk' ? 'kk' : 'ru');
  button.textContent = isDirty ? dict.historySaveNote : dict.historyNote;
};

KSL.updateHistoryNote = async function (id, note) {
  const items = await KSL.getHistoryItems();
  const cleanNote = String(note || '').slice(0, 500);
  const next = items.map(function (item) {
    return item.id === id ? { ...item, note: cleanNote } : item;
  });
  await KSL.saveHistoryItems(next);
};

KSL.bindHistory = function (shadow) {
  const filter = shadow.getElementById('historyCategoryFilter');
  const search = shadow.getElementById('historySearch');
  const exportBtn = shadow.getElementById('historyExportBtn');
  const prev = shadow.getElementById('historyPrev');
  const next = shadow.getElementById('historyNext');
  if (filter) {
    filter.addEventListener('change', function () {
      KSL.historyState.category = filter.value;
      KSL.historyState.page = 1;
      KSL.renderHistory(shadow);
    });
  }
  if (search) {
    search.addEventListener('input', function () {
      KSL.historyState.query = search.value.trim();
      KSL.historyState.page = 1;
      KSL.historyState.selectedId = null;
      KSL.renderHistory(shadow);
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', async function () {
      const store = await KSL.getStore();
      const dict = KSL.getDict(store.lang === 'kk' ? 'kk' : 'ru');
      const items = await KSL.getHistoryItems();
      if (!items.length) {
        exportBtn.disabled = true;
        exportBtn.textContent = dict.historyExportEmpty;
        setTimeout(function () { exportBtn.textContent = dict.historyExportAll; }, 1200);
        return;
      }
      await KSL.exportHistoryXlsx(items);
    });
  }
  if (prev) {
    prev.addEventListener('click', function () {
      KSL.historyState.page = Math.max(1, KSL.historyState.page - 1);
      KSL.renderHistory(shadow);
    });
  }
  if (next) {
    next.addEventListener('click', function () {
      KSL.historyState.page += 1;
      KSL.renderHistory(shadow);
    });
  }
  const list = shadow.getElementById('historyList');
  if (list) {
    list.addEventListener('click', async function (event) {
      if (event.target.closest('[data-history-note]')) return;
      const thumb = event.target.closest('[data-history-image]');
      if (thumb) {
        event.preventDefault();
        event.stopPropagation();
        if (KSL.openImageViewer) KSL.openImageViewer(thumb.dataset.historyImage || '');
        return;
      }
      const action = event.target.closest('[data-history-action]');
      if (action) {
        event.stopPropagation();
        const type = action.dataset.historyAction;
        if (type === 'delete') {
          await KSL.deleteHistoryItem(action.dataset.historyId);
          KSL.historyState.selectedId = null;
          KSL.historyState.noteId = null;
          await KSL.renderHistory(shadow);
        } else if (type === 'open') {
          const url = action.dataset.historyUrl;
          if (url) location.href = url;
        } else if (type === 'note') {
          const id = action.dataset.historyId;
          if (KSL.historyState.noteDirtyId === id) {
            const textarea = list.querySelector('[data-history-note="' + CSS.escape(id) + '"]');
            clearTimeout(KSL.historyNoteTimers[id]);
            if (textarea) await KSL.updateHistoryNote(id, textarea.value);
            KSL.historyState.noteDirtyId = null;
            KSL.setHistoryNoteButton(shadow, id, false);
          } else {
            KSL.historyState.noteId = KSL.historyState.noteId === id ? null : id;
            await KSL.renderHistory(shadow);
          }
        } else {
          KSL.historyState.selectedId = null;
          KSL.historyState.noteId = null;
          await KSL.renderHistory(shadow);
        }
        return;
      }
      const item = event.target.closest('[data-history-id]');
      if (!item) return;
      const nextSelected = KSL.historyState.selectedId === item.dataset.historyId ? null : item.dataset.historyId;
      KSL.historyState.selectedId = nextSelected;
      if (!nextSelected) KSL.historyState.noteId = null;
      await KSL.renderHistory(shadow);
    });
    list.addEventListener('input', function (event) {
      const textarea = event.target.closest('[data-history-note]');
      if (!textarea) return;
      const id = textarea.dataset.historyNote;
      KSL.historyState.noteDirtyId = id;
      KSL.setHistoryNoteButton(shadow, id, true);
      clearTimeout(KSL.historyNoteTimers[id]);
      KSL.historyNoteTimers[id] = setTimeout(function () {
        KSL.updateHistoryNote(id, textarea.value);
      }, 250);
    });
    list.addEventListener('blur', function (event) {
      const textarea = event.target.closest('[data-history-note]');
      if (!textarea) return;
      const id = textarea.dataset.historyNote;
      clearTimeout(KSL.historyNoteTimers[id]);
      KSL.updateHistoryNote(id, textarea.value);
      const related = event.relatedTarget;
      if (related && related.closest && related.closest('[data-history-action="note"][data-history-id="' + CSS.escape(id) + '"]')) return;
      KSL.historyState.noteDirtyId = null;
      KSL.setHistoryNoteButton(shadow, id, false);
    }, true);
  }
  KSL.renderHistory(shadow);
};
