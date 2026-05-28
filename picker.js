/** Выбор CSS-селекторов на странице (подсказка + overlay) */
window.KSL = window.KSL || {};

KSL.initPicker = function (ctx) {
  const host = ctx.host;
  const shadow = ctx.shadow;
  const panel = ctx.panel;
  const onSaved = ctx.onSaved;

  if (!document.getElementById('ksl-global-style')) {
    const link = document.createElement('link');
    link.id = 'ksl-global-style';
    link.rel = 'stylesheet';
    link.href = KSL.getRuntimeUrl('styles/styles.css');
    document.head.appendChild(link);
  }

  const overlay = document.createElement('div');
  overlay.className = 'ksl-pick-overlay';
  const pickHint = document.createElement('div');
  pickHint.className = 'ksl-pick-hint';

  document.body.appendChild(overlay);
  document.body.appendChild(pickHint);

  let hover = null;

  function elementAt(x, y) {
    const stack = document.elementsFromPoint(x, y);
    return stack.find(function (el) {
      if (el === overlay || el === host || el === pickHint) return false;
      if (shadow.contains(el)) return false;
      return true;
    }) || null;
  }

  function stopPick() {
    overlay.style.display = 'none';
    pickHint.style.display = 'none';
    document.body.classList.remove('ksl-picking');
  }

  shadow.querySelectorAll('.pick-btn').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const key = btn.dataset.key;
      const data = await KSL.getStore();
      const lang = data.lang === 'kk' ? 'kk' : 'ru';

      panel.classList.add('hidden');
      const pickTitle = (KSL.PICK_FIELD[lang] && KSL.PICK_FIELD[lang][key]) || key;
      pickHint.innerHTML = '<b>' + KSL.escapeXml(pickTitle) + '</b><span>' + KSL.escapeXml(KSL.getPickHint(key, lang)) + '</span><small>Esc — отмена</small>';
      pickHint.style.display = 'block';
      document.body.classList.add('ksl-picking');

      function move(e) {
        const el = elementAt(e.clientX, e.clientY);
        if (!el) {
          overlay.style.display = 'none';
          return;
        }
        hover = el;
        const r = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.left = r.left + 'px';
        overlay.style.top = r.top + 'px';
        overlay.style.width = r.width + 'px';
        overlay.style.height = r.height + 'px';
      }

      async function click(e) {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('mousemove', move);
        document.removeEventListener('click', click, true);
        document.removeEventListener('keydown', keydown, true);
        stopPick();
        const picked = elementAt(e.clientX, e.clientY) || hover;
        const target = KSL.getPickTarget(picked, key);
        const selector = KSL.buildSelector(target);
        if (selector) {
          const validation = KSL.validateSelectorValue ? await KSL.validateSelectorValue(key, target) : { ok: true };
          if (!validation.ok) {
            console.warn('KSL picker: selector value did not pass semantic validation', { key: key, text: KSL.getElementText(target) });
            await KSL.saveSelector(key, '');
            panel.classList.remove('hidden');
            if (onSaved) await onSaved(key);
            const data = await KSL.getStore();
            const lang = data.lang === 'kk' ? 'kk' : 'ru';
            const dict = KSL.getDict(lang);
            const node = shadow.querySelector('[data-status="' + key + '"]');
            if (node) {
              node.textContent = dict[validation.reason] || dict.selectorInvalid;
              node.className = 'selector-status is-invalid';
            }
            return;
          }
          await KSL.saveSelector(key, selector);
        } else {
          console.warn('KSL picker: selector was not built', { key: key, picked: picked, target: target });
        }
        panel.classList.remove('hidden');
        if (onSaved) await onSaved(key);
      }

      function keydown(e) {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('mousemove', move);
        document.removeEventListener('click', click, true);
        document.removeEventListener('keydown', keydown, true);
        stopPick();
        panel.classList.remove('hidden');
      }

      document.addEventListener('mousemove', move);
      document.addEventListener('click', click, true);
      document.addEventListener('keydown', keydown, true);
    });
  });
};
