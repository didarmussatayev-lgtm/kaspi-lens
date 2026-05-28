// invoices.js – Вкладка «Накладные»: ZIP → PDF на A4/термо
window.KSL = window.KSL || {};

// Размеры страниц (в пунктах, 1/72 дюйма)
KSL.INVOICE_A4_PORTRAIT  = { width: 595.28, height: 841.89 };   // A4 вертикальный
KSL.INVOICE_A4_LANDSCAPE = { width: 841.89, height: 595.28 };   // A4 горизонтальный
KSL.INVOICE_THERMAL      = { width: 212.6,  height: 340.16 };   // 75x120 мм

// Небольшой отступ от пунктирной линии, чтобы было удобно резать.
KSL.INVOICE_CELL_PAD = 5;

// Защита браузера от неподходящих и слишком тяжёлых архивов.
KSL.INVOICE_MAX_ZIP_BYTES = 50 * 1024 * 1024;
KSL.INVOICE_MAX_PDF_FILES = 300;
KSL.INVOICE_MAX_EXTRACTED_PDF_BYTES = 150 * 1024 * 1024;

// Раскладки: ключ должен совпадать с data-layout в кнопках
KSL.INVOICE_LAYOUTS = {
  4:      { cols: 2, rows: 2, perPage: 4,  orientation: 'portrait' },
  8:      { cols: 4, rows: 2, perPage: 8,  orientation: 'landscape' },
  9:      { cols: 3, rows: 3, perPage: 9,  orientation: 'portrait' },
  16:     { cols: 4, rows: 4, perPage: 16, orientation: 'portrait' },
  thermal: { cols: 1, rows: 1, perPage: 1,  orientation: 'thermal', fit: 'contain' }
};

// Получить размер страницы по раскладке
KSL.getPageSize = function(layoutKey) {
  const layout = KSL.INVOICE_LAYOUTS[layoutKey];
  if (!layout) return KSL.INVOICE_A4_PORTRAIT;
  if (layout.orientation === 'landscape') return KSL.INVOICE_A4_LANDSCAPE;
  if (layout.orientation === 'thermal') return KSL.INVOICE_THERMAL;
  return KSL.INVOICE_A4_PORTRAIT;
};

// ========== Извлечение PDF из ZIP ==========
KSL.getInvoicePdfPaths = function(zip) {
  return Object.keys(zip.files).sort().filter(function(path) {
    const entry = zip.files[path];
    return !entry.dir && path.toLowerCase().endsWith('.pdf');
  });
};

KSL.inspectInvoiceZipFile = async function(file, JSZip) {
  if (!file || !/\.zip$/i.test(String(file.name || ''))) return { error: 'wrong_format', pdfCount: 0 };
  if (file.size > KSL.INVOICE_MAX_ZIP_BYTES) return { error: 'zip_too_large', pdfCount: 0 };
  if (file.size < 4 || !file.slice) return { error: 'invalid_zip', pdfCount: 0 };
  try {
    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const validSignature = signature[0] === 0x50 && signature[1] === 0x4b &&
      ((signature[2] === 0x03 && signature[3] === 0x04) ||
       (signature[2] === 0x05 && signature[3] === 0x06) ||
       (signature[2] === 0x07 && signature[3] === 0x08));
    if (!validSignature) return { error: 'invalid_zip', pdfCount: 0 };
    if (JSZip && JSZip.loadAsync) {
      try {
        const zip = await JSZip.loadAsync(file);
        return { error: '', pdfCount: KSL.getInvoicePdfPaths(zip).length };
      } catch (error) {
        return { error: 'invalid_zip', pdfCount: 0 };
      }
    }
    return { error: '', pdfCount: null };
  } catch (error) {
    return { error: 'invalid_zip', pdfCount: 0 };
  }
};

KSL.validateInvoiceZipFile = async function(file, JSZip) {
  const result = await KSL.inspectInvoiceZipFile(file, JSZip);
  return result.error;
};

KSL.extractPdfsFromZip = async function(file, JSZip) {
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (error) {
    throw new Error('invalid_zip');
  }
  const pdfs = [];
  const paths = KSL.getInvoicePdfPaths(zip);
  if (paths.length > KSL.INVOICE_MAX_PDF_FILES) throw new Error('too_many_pdfs');

  const knownBytes = paths.reduce(function(total, path) {
    const data = zip.files[path] && zip.files[path]._data;
    return total + (data && Number(data.uncompressedSize) || 0);
  }, 0);
  if (knownBytes > KSL.INVOICE_MAX_EXTRACTED_PDF_BYTES) throw new Error('pdfs_too_large');

  let extractedBytes = 0;
  for (const path of paths) {
    const entry = zip.files[path];
    const data = await entry.async('uint8array');
    extractedBytes += data.byteLength;
    if (extractedBytes > KSL.INVOICE_MAX_EXTRACTED_PDF_BYTES) {
      throw new Error('pdfs_too_large');
    }
    pdfs.push({
      name: path.split('/').pop(),
      data: data
    });
  }
  return pdfs;
};

KSL.getInvoiceCropBox = function(srcPage) {
  const pageW = srcPage.getWidth();
  const pageH = srcPage.getHeight();
  const isA4Portrait = Math.abs(pageW - KSL.INVOICE_A4_PORTRAIT.width) < 6 &&
    Math.abs(pageH - KSL.INVOICE_A4_PORTRAIT.height) < 6;

  if (isA4Portrait) {
    return {
      left: pageW * 0.012,
      bottom: pageH * 0.507,
      right: pageW * 0.49,
      top: pageH * 0.995
    };
  }

  return { left: 0, bottom: 0, right: pageW, top: pageH };
};

// ========== Рисование пунктирной сетки (только если ячеек > 1) ==========
KSL.drawInvoiceGrid = function(page, pageW, pageH, cols, rows, rgb) {
  if (cols === 1 && rows === 1) return; // для термопринтера сетка не нужна
  const cellW = pageW / cols;
  const cellH = pageH / rows;
  const lineStyle = {
    thickness: 0.8,
    color: rgb(0.55, 0.55, 0.55),
    dashArray: [4, 4],
    dashPhase: 0
  };
  for (let c = 1; c < cols; c++) {
    const x = c * cellW;
    page.drawLine({ start: { x, y: 0 }, end: { x, y: pageH }, ...lineStyle });
  }
  for (let r = 1; r < rows; r++) {
    const y = r * cellH;
    page.drawLine({ start: { x: 0, y }, end: { x: pageW, y }, ...lineStyle });
  }
};

// ========== Вставка PDF в ячейку с автоматическим заполнением ==========
KSL.drawInvoiceInCell = function(page, embedded, col, row, pageW, pageH, cols, rows, pad, PDFLib, fit) {
  const cellW = pageW / cols;
  const cellH = pageH / rows;
  const innerX = col * cellW + pad;
  const innerY = pageH - (row + 1) * cellH + pad;
  const innerW = Math.max(1, cellW - pad * 2);
  const innerH = Math.max(1, cellH - pad * 2);
  const canClip = PDFLib && PDFLib.pushGraphicsState && PDFLib.popGraphicsState &&
    PDFLib.rectangle && PDFLib.clip && PDFLib.endPath;
  const scale = fit === 'contain' || !canClip
    ? Math.min(innerW / embedded.width, innerH / embedded.height)
    : Math.max(innerW / embedded.width, innerH / embedded.height);
  const w = embedded.width * scale;
  const h = embedded.height * scale;
  const x = innerX + (innerW - w) / 2;
  const y = innerY + (innerH - h) / 2;

  if (canClip) {
    page.pushOperators(
      PDFLib.pushGraphicsState(),
      PDFLib.rectangle(innerX, innerY, innerW, innerH),
      PDFLib.clip(),
      PDFLib.endPath()
    );
  }

  page.drawPage(embedded, { x, y, width: w, height: h });

  if (canClip) {
    page.pushOperators(PDFLib.popGraphicsState());
  }
};

// ========== Главная функция слияния ==========
KSL.mergeInvoicesPdf = async function(pdfItems, layoutKey, PDFLib) {
  const PDFDocument = PDFLib.PDFDocument;
  const rgb = PDFLib.rgb;
  const layout = KSL.INVOICE_LAYOUTS[layoutKey];
  if (!layout) throw new Error('Unknown layout: ' + layoutKey);
  const pageSize = KSL.getPageSize(layoutKey);
  const pageW = pageSize.width;
  const pageH = pageSize.height;

  const slots = [];
  for (const item of pdfItems) {
    const doc = await PDFDocument.load(item.data);
    if (doc.getPageCount() > 0) {
      const srcPage = doc.getPage(0);
      slots.push({ page: srcPage, cropBox: KSL.getInvoiceCropBox(srcPage) });
    }
  }
  if (slots.length === 0) throw new Error('no_pages');

  const outDoc = await PDFDocument.create();

  for (let i = 0; i < slots.length; i += layout.perPage) {
    const page = outDoc.addPage([pageW, pageH]);
    KSL.drawInvoiceGrid(page, pageW, pageH, layout.cols, layout.rows, rgb);

    const chunk = slots.slice(i, i + layout.perPage);
    for (let j = 0; j < chunk.length; j++) {
      const slot = chunk[j];
      const col = j % layout.cols;
      const row = Math.floor(j / layout.cols);
      const embedded = await outDoc.embedPage(slot.page, slot.cropBox);
      KSL.drawInvoiceInCell(
        page, embedded, col, row,
        pageW, pageH, layout.cols, layout.rows,
        KSL.INVOICE_CELL_PAD, PDFLib, layout.fit
      );
    }
  }

  return await outDoc.save();
};

// ========== Скачивание PDF ==========
KSL.uuid4 = function() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

KSL.downloadPdf = function(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ========== Привязка UI ==========
KSL.bindInvoices = function(shadow, getDictAsync) {
  const zipInput   = shadow.getElementById('invoiceZip');
  const fileNameEl = shadow.getElementById('invoiceFileName');
  const fileCardEl = shadow.getElementById('invoiceFileCard');
  const fileMetaEl = shadow.getElementById('invoiceFileMeta');
  const clearFileBtn = shadow.getElementById('invoiceFileClear');
  const mergeBtn   = shadow.getElementById('invoiceMergeBtn');
  const statusEl   = shadow.getElementById('invoiceStatus');
  const layoutBtns = shadow.querySelectorAll('[data-layout]');
  const fileWrap   = shadow.querySelector('.file-wrap');

  if (!zipInput || !fileNameEl || !mergeBtn || !statusEl || layoutBtns.length === 0) {
    console.error('KSL.bindInvoices: элементы не найдены', { zipInput, fileNameEl, mergeBtn, statusEl, layoutBtns: layoutBtns.length });
    return;
  }

  let currentFile = null;
  let currentPdfCount = null;
  let currentLayout = '4';
  let mergeBtnText = mergeBtn.textContent;
  let fileSelectionId = 0;

  const formatPdfCount = (count, dict) => {
    if (!Number.isFinite(count)) return '';
    const lastTwo = count % 100;
    const last = count % 10;
    const key = last === 1 && lastTwo !== 11
      ? 'invoicesPdfOne'
      : (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'invoicesPdfFew' : 'invoicesPdfMany');
    return count + ' ' + (dict && dict[key] || 'PDF');
  };

  const formatBytes = (bytes, pdfCount, dict) => {
    if (!bytes) return formatPdfCount(pdfCount, dict);
    const mb = bytes / (1024 * 1024);
    const size = mb >= 1
      ? mb.toFixed(mb >= 10 ? 0 : 1) + ' MB'
      : Math.max(1, Math.round(bytes / 1024)) + ' KB';
    const countText = formatPdfCount(pdfCount, dict);
    return countText ? size + ' · ' + countText : size;
  };

  const setFile = (file, pdfCount, dict) => {
    currentFile = file || null;
    currentPdfCount = currentFile ? pdfCount : null;
    if (fileCardEl) fileCardEl.classList.toggle('hidden', !currentFile);
    fileNameEl.textContent = currentFile ? currentFile.name.replace(/\.zip$/i, '') : '—';
    if (fileMetaEl) fileMetaEl.textContent = currentFile ? formatBytes(currentFile.size, currentPdfCount, dict) : '—';
    mergeBtn.disabled = !currentFile;
    statusEl.textContent = '';
    statusEl.className = 'invoices-status';
    mergeBtn.textContent = mergeBtnText;
  };

  const getValidationMessage = (dict, code) => {
    if (code === 'wrong_format') return dict.invoicesWrongFormat || 'Только ZIP-архив';
    if (code === 'zip_too_large') return dict.invoicesZipTooLarge || 'ZIP больше 50 MB';
    if (code === 'invalid_zip') return dict.invoicesInvalidZip || 'ZIP повреждён';
    if (code === 'too_many_pdfs') return dict.invoicesTooManyPdf || 'Не более 300 PDF';
    if (code === 'pdfs_too_large') return dict.invoicesPdfsTooLarge || 'PDF больше 150 MB';
    return dict.invoicesError || 'Ошибка обработки';
  };

  const showFileError = (message) => {
    setFile(null);
    mergeBtn.textContent = message;
    setTimeout(() => {
      if (!currentFile) mergeBtn.textContent = mergeBtnText;
    }, 1800);
  };

  const acceptFile = async (file) => {
    const selectionId = ++fileSelectionId;
    if (!file) {
      setFile(null);
      return;
    }
    const dict = await getDictAsync();
    const inspection = await KSL.inspectInvoiceZipFile(file, window.JSZip);
    if (selectionId !== fileSelectionId) return;
    if (inspection.error) {
      zipInput.value = '';
      showFileError(getValidationMessage(dict, inspection.error));
      return;
    }
    setFile(file, inspection.pdfCount, dict);
  };

  const setActiveLayout = (layout) => {
    layoutBtns.forEach(btn => {
      const val = btn.getAttribute('data-layout');
      if (val === layout) {
        btn.classList.add('active');
        if (btn.tagName === 'INPUT' && btn.type === 'radio') btn.checked = true;
      } else {
        btn.classList.remove('active');
      }
    });
  };

  layoutBtns.forEach(btn => {
    const handler = () => {
      let newLayout = btn.getAttribute('data-layout');
      if (btn.tagName === 'INPUT' && btn.type === 'radio') {
        if (!btn.checked) return;
        newLayout = btn.value;
      }
      currentLayout = newLayout;
      setActiveLayout(currentLayout);
    };
    btn.addEventListener('click', handler);
    if (btn.tagName === 'INPUT' && btn.type === 'radio') {
      btn.addEventListener('change', handler);
    }
  });

  zipInput.addEventListener('change', async () => {
    await acceptFile(zipInput.files[0] || null);
  });

  if (clearFileBtn) {
    clearFileBtn.addEventListener('click', () => {
      fileSelectionId++;
      zipInput.value = '';
      setFile(null);
    });
  }

  if (fileWrap) {
    ['dragenter', 'dragover'].forEach(eventName => {
      fileWrap.addEventListener(eventName, (event) => {
        event.preventDefault();
        fileWrap.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      fileWrap.addEventListener(eventName, (event) => {
        event.preventDefault();
        fileWrap.classList.remove('is-dragover');
      });
    });
    fileWrap.addEventListener('drop', async (event) => {
      const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
      if (file) await acceptFile(file);
    });
  }

  mergeBtn.addEventListener('click', async () => {
    const dict = await getDictAsync();
    if (!currentFile) {
      mergeBtn.textContent = dict.invoicesPickFile || 'Выберите ZIP-файл';
      return;
    }

    mergeBtn.disabled = true;
    mergeBtn.textContent = dict.invoicesProcessing || 'Обработка...';
    statusEl.textContent = '';
    statusEl.className = 'invoices-status';

    try {
      if (!window.JSZip || !window.PDFLib) {
        throw new Error('Библиотеки JSZip или pdf-lib не загружены. Проверьте manifest.json');
      }
      const pdfs = await KSL.extractPdfsFromZip(currentFile, window.JSZip);
      if (pdfs.length === 0) throw new Error('no_pdf');

      const mergedPdf = await KSL.mergeInvoicesPdf(pdfs, currentLayout, window.PDFLib);

      KSL.downloadPdf(mergedPdf, KSL.uuid4() + '.pdf');

      mergeBtn.textContent = `${dict.invoicesDone || 'Готово'} · ${pdfs.length} PDF`;
    } catch (err) {
      console.error(err);
      let errorMsg = err.message;
      if (err.message === 'no_pdf') {
        errorMsg = dict.invoicesNoPdf || 'В ZIP-архиве нет PDF-файлов';
      } else if (err.message === 'no_pages') {
        errorMsg = dict.invoicesNoPages || 'PDF не содержат страниц';
      } else if (['wrong_format', 'zip_too_large', 'invalid_zip', 'too_many_pdfs', 'pdfs_too_large'].includes(err.message)) {
        errorMsg = getValidationMessage(dict, err.message);
      } else {
        errorMsg = dict.invoicesError || `Ошибка: ${err.message}`;
      }
      mergeBtn.textContent = errorMsg;
    } finally {
      mergeBtn.disabled = !currentFile;
      setTimeout(() => {
        if (!currentFile) return;
        mergeBtn.textContent = mergeBtnText;
      }, 1600);
    }
  });

  setActiveLayout(currentLayout);
};
