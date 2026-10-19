// ===== Palmarès : les courses courues, triables et filtrables =====
//
// Composant partagé, en prototype. renderPalmares(élément, config) dessine le
// tableau décrit par docs/module-palmares-specification.md, partie consultation :
// tri en touchant l'en-tête d'une colonne, panneau de filtres repliable,
// colonnes facultatives (bouton « + ») et records 🥇 calculés. L'édition
// viendra avec la base de données.
//
// config.races : une course = { date: 'AAAA-MM-JJ', course, type, sub } avec,
//   quand on les connaît : dist (km), dplus (m), time (temps réalisé, 'h:mm:ss'
//   ou 'mm:ss'), pace (allure, 'm:ss'), rank (place au classement général), et
//   les données montre wDist, wDplus, wTime, wPace, hr.
//   type et sub viennent de la liste de référence ci-dessous.
(function () {
  // Liste de référence des types et sous-catégories, commune à l'application.
  const TYPES = {
    'Course sur route': ['5 km', '10 km', '20 km', 'Semi-marathon', 'Marathon', 'Ultra-marathon', '100 km', 'Course en heure'],
    'Trail': ['Trail découverte', 'Trail court', 'Trail long', 'Ultra-trail'],
    'Marche': ['Marche découverte', 'Marche longue', 'Marche ultra'],
    'Fast hiking': ['Ultra-randonnée', 'Randonnée rapide'],
    'Triathlon': ['Triathlon XS', 'Triathlon S', 'Triathlon M', 'Triathlon L', 'Ironman 70.3', 'Triathlon XL', 'Ironman']
  };
  // Sous-catégories à distance fixe : les seules qui ont un record.
  const RECORD_SUBS = new Set(['5 km', '10 km', '20 km', 'Semi-marathon', 'Marathon', '100 km'].concat(TYPES['Triathlon']));
  // Les choix des filtres suivent l'ordre de la liste, pas l'alphabet.
  const CHOICE_ORDER = Object.keys(TYPES).concat(...Object.values(TYPES));

  const COLUMNS = [
    { key: 'date', label: 'Date', kind: 'date' },
    { key: 'course', label: 'Course', kind: 'text' },
    { key: 'type', label: 'Type', kind: 'choice' },
    { key: 'sub', label: 'Sous-catégorie', kind: 'choice' },
    { key: 'dist', label: 'Distance', kind: 'number', fmt: 'km' },
    { key: 'dplus', label: 'D+', kind: 'number', fmt: 'm' },
    { key: 'time', label: 'Temps', kind: 'duration', fmt: 'time' },
    { key: 'pace', label: 'Allure', kind: 'duration', fmt: 'pace' },
    { key: 'rank', label: 'Classement', kind: 'number', fmt: 'rank', optional: true },
    { key: 'wDist', label: 'Distance montre', kind: 'number', fmt: 'km', optional: true },
    { key: 'wDplus', label: 'D+ montre', kind: 'number', fmt: 'm', optional: true },
    { key: 'wTime', label: 'Temps montre', kind: 'duration', fmt: 'time', optional: true },
    { key: 'wPace', label: 'Allure montre', kind: 'duration', fmt: 'pace', optional: true },
    { key: 'hr', label: 'FC moyenne', kind: 'number', fmt: 'bpm', optional: true }
  ];
  // Ordre de tri au premier appui sur un en-tête ; le second appui l'inverse.
  const FIRST_DIR = { date: 'desc', text: 'asc', choice: 'asc', number: 'asc', duration: 'asc' };
  const UNIT = { km: 'km', m: 'm', bpm: 'bpm' };
  const HINT = { time: 'ex. 2h', pace: 'ex. 5:30' };
  // Pas d'entonnoir parmi les emojis : on le dessine, comme les flèches, plus
  // lisibles en icônes qu'en caractères.
  const FUNNEL = '<svg class="pv2-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 2.5h13l-5.2 6v4.7l-2.6 1.3V8.5z" fill="currentColor"/></svg>';
  const CHEVRON = '<svg class="pv2-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // Deux flèches sur chaque en-tête : la colonne se trie ; celle du sens choisi s'allume.
  const SORT_ICON = '<svg class="pv2-sort-ico" viewBox="0 0 10 14" aria-hidden="true"><path class="pv2-up" d="M5 1l4 5H1z"/><path class="pv2-down" d="M5 13L1 8h8z"/></svg>';

  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const pad = n => String(n).padStart(2, '0');
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fold = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Alphabétique sans majuscules ni accents ; les nombres par valeur (5 km avant 10 km).
  const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  // Durées en secondes. Données : '1:59:39', '49:18', '5:30'. Au filtre, on
  // accepte aussi 2h, 1h30, 1h59'39, 49'18, ou des minutes seules (120).
  function parseDuration(str) {
    const s = String(str == null ? '' : str).trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return null;
    let m = s.match(/^(\d+)h(?:(\d{1,2})(?:['m:]?(\d{1,2})["s]?)?)?$/);
    if (m) return +m[1] * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0);
    m = s.match(/^(\d+)[:'](\d{1,2})(?:[:'](\d{1,2}))?"?$/);
    if (m) return m[3] !== undefined ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
    m = s.match(/^(\d+)(?:min|mn|')?$/);
    if (m) return +m[1] * 60;
    return null;
  }
  const parseNumber = str => {
    const s = String(str == null ? '' : str).trim().replace(',', '.');
    return s === '' || isNaN(s) ? null : Number(s);
  };

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return h ? h + 'h' + pad(m) + "'" + pad(s) : m + "'" + pad(s);
  }
  function fmtDate(iso) {
    const p = iso.split('-').map(Number);
    return (p[2] === 1 ? '1er' : p[2]) + ' ' + MONTHS[p[1] - 1] + ' ' + p[0];
  }
  function fmtCell(col, val) {
    if (val == null) return '<span class="muted">—</span>';
    switch (col.fmt || col.kind) {
      case 'date': return fmtDate(val);
      case 'km': return nf1.format(val) + ' km';
      case 'm': return nf0.format(val) + ' m';
      case 'bpm': return nf0.format(val) + ' bpm';
      case 'rank': return val === 1 ? '1er' : nf0.format(val) + 'e';
      case 'time': return fmtTime(val);
      case 'pace': return Math.floor(val / 60) + ':' + pad(val % 60) + ' /km';
      default: return esc(val);
    }
  }

  // Valeurs comparables : texte, nombre, secondes ; date 'AAAA-MM-JJ' (comparable
  // comme du texte). Une valeur absente vaut null.
  function prepare(race) {
    const v = {};
    COLUMNS.forEach(c => {
      const raw = race[c.key];
      if (raw == null || raw === '') { v[c.key] = null; return; }
      v[c.key] = c.kind === 'duration' ? parseDuration(raw) : c.kind === 'number' ? Number(raw) : String(raw);
      if (v[c.key] == null || (typeof v[c.key] === 'number' && isNaN(v[c.key]))) {
        console.warn('Palmarès : valeur illisible', c.key, raw, race);
        v[c.key] = null;
      }
    });
    if (!TYPES[v.type] || TYPES[v.type].indexOf(v.sub) === -1) {
      console.warn('Palmarès : type ou sous-catégorie hors de la liste de référence', race);
    }
    return { v, record: false };
  }

  // Record 🥇, recalculé à chaque affichage : on écarte les courses sans temps
  // et les sous-catégories sans record, on groupe par sous-catégorie, on garde
  // le temps le plus court ; en cas d'égalité, toutes l'ont.
  function markRecords(rows) {
    const best = {};
    rows.forEach(r => {
      const sub = r.v.sub, t = r.v.time;
      if (t == null || !RECORD_SUBS.has(sub)) return;
      if (!(sub in best) || t < best[sub]) best[sub] = t;
    });
    rows.forEach(r => { r.record = r.v.time != null && best[r.v.sub] === r.v.time; });
  }

  function isActive(col, f) {
    if (!f) return false;
    if (col.kind === 'date') return !!(f.year || f.from || f.to);
    if (col.kind === 'text') return !!(f.q && f.q.trim());
    if (col.kind === 'choice') return !!(f.set && f.set.size);
    return f.min != null || f.max != null;
  }
  function passes(col, f, val) {
    if (!isActive(col, f)) return true;
    if (val == null) return false; // sans valeur dans une colonne filtrée : écartée
    if (col.kind === 'date') return (!f.year || val.slice(0, 4) === f.year) && (!f.from || val >= f.from) && (!f.to || val <= f.to);
    if (col.kind === 'text') return fold(val).indexOf(fold(f.q.trim())) !== -1;
    if (col.kind === 'choice') return f.set.has(val);
    return (f.min == null || val >= f.min) && (f.max == null || val <= f.max);
  }

  window.renderPalmares = function (root, cfg) {
    const uid = root.id || 'pv2';
    const rows = (cfg.races || []).map(prepare);
    markRecords(rows);
    const total = rows.length;

    const state = {
      shown: new Set(COLUMNS.filter(c => !c.optional).map(c => c.key)),
      sort: { key: 'date', dir: 'desc' },
      filters: {}
    };
    const shownCols = () => COLUMNS.filter(c => state.shown.has(c.key));
    const colOf = key => COLUMNS.find(c => c.key === key);

    function compare(a, b) {
      const col = colOf(state.sort.key);
      const va = a.v[col.key], vb = b.v[col.key];
      const byDate = () => (a.v.date < b.v.date ? 1 : a.v.date > b.v.date ? -1 : 0);
      if (va == null && vb == null) return byDate();
      if (va == null) return 1; // valeurs vides en fin de liste, dans les deux ordres
      if (vb == null) return -1;
      let c;
      if (col.kind === 'text' || col.kind === 'choice') c = collator.compare(va, vb);
      else if (col.kind === 'date') c = va < vb ? -1 : va > vb ? 1 : 0;
      else c = va - vb;
      if (c === 0) return byDate(); // égalité : la plus récente d'abord
      return state.sort.dir === 'asc' ? c : -c;
    }

    function visibleRows() {
      const cols = shownCols();
      return rows.filter(r => cols.every(c => passes(c, state.filters[c.key], r.v[c.key]))).sort(compare);
    }

    function choicesFor(col) {
      const vals = Array.from(new Set(rows.map(r => r.v[col.key]).filter(v => v != null)));
      const rank = v => { const i = CHOICE_ORDER.indexOf(v); return i === -1 ? Infinity : i; };
      return vals.sort((a, b) => rank(a) - rank(b) || collator.compare(a, b));
    }

    // ----- Squelette -----
    root.innerHTML =
      '<div class="pv2-bar">' +
        '<button type="button" class="pv2-btn" data-act="filters" aria-expanded="false" aria-controls="' + uid + '-filters">' +
          FUNNEL + '<span class="pv2-btn-label">Filtres</span>' + CHEVRON + '</button>' +
        '<span class="pv2-count" aria-live="polite"></span>' +
        '<button type="button" class="pv2-clear" data-act="clear" hidden>Effacer les filtres</button>' +
      '</div>' +
      '<div class="pv2-panel" id="' + uid + '-filters" hidden></div>' +
      '<div class="pv2-panel pv2-cols" id="' + uid + '-cols" hidden>' +
        '<div class="pv2-field"><div class="pv2-legend">Colonnes facultatives</div><div class="pv2-row">' +
          COLUMNS.filter(c => c.optional).map(c =>
            '<label class="pv2-check"><input type="checkbox" data-col="' + c.key + '"> ' + esc(c.label) + '</label>').join('') +
        '</div></div>' +
      '</div>' +
      '<div class="card pv2-card"><div class="table-scroll"><table class="pv2-table"><thead></thead><tbody></tbody></table></div></div>';

    const $ = sel => root.querySelector(sel);
    const panel = $('#' + uid + '-filters'), colsPanel = $('#' + uid + '-cols');

    function renderPanel() {
      panel.innerHTML = shownCols().map(c => {
        const f = state.filters[c.key] || {};
        const id = uid + '-f-' + c.key;
        let body;
        if (c.kind === 'date') {
          const years = Array.from(new Set(rows.map(r => r.v.date && r.v.date.slice(0, 4)).filter(Boolean))).sort().reverse();
          body =
            '<div class="pv2-row"><select data-f="' + c.key + '" data-part="year" aria-label="Année"><option value="">Toutes les années</option>' +
              years.map(y => '<option' + (f.year === y ? ' selected' : '') + '>' + y + '</option>').join('') + '</select></div>' +
            '<div class="pv2-row"><span>du</span><input type="date" data-f="' + c.key + '" data-part="from" value="' + esc(f.from || '') + '" aria-label="Du">' +
            '<span>au</span><input type="date" data-f="' + c.key + '" data-part="to" value="' + esc(f.to || '') + '" aria-label="Au"></div>';
        } else if (c.kind === 'text') {
          body = '<input type="search" id="' + id + '" data-f="' + c.key + '" data-part="q" value="' + esc(f.q || '') + '" placeholder="contient…" autocomplete="off">';
        } else if (c.kind === 'choice') {
          const vals = choicesFor(c);
          body = vals.length ? vals.map(v =>
            '<label class="pv2-check"><input type="checkbox" data-f="' + c.key + '" data-part="set" value="' + esc(v) + '"' +
              (f.set && f.set.has(v) ? ' checked' : '') + '> ' + esc(v) + '</label>').join('') : '<span>Aucune valeur</span>';
        } else {
          const hint = c.kind === 'duration' ? HINT[c.fmt] : (UNIT[c.fmt] || '');
          body =
            '<span>min</span><input type="text" class="pv2-num" data-f="' + c.key + '" data-part="min" value="' + esc(f.minRaw || '') + '" placeholder="' + hint + '" inputmode="' + (c.kind === 'number' ? 'decimal' : 'text') + '" aria-label="' + esc(c.label) + ' minimum">' +
            '<span>max</span><input type="text" class="pv2-num" data-f="' + c.key + '" data-part="max" value="' + esc(f.maxRaw || '') + '" placeholder="' + hint + '" inputmode="' + (c.kind === 'number' ? 'decimal' : 'text') + '" aria-label="' + esc(c.label) + ' maximum">';
        }
        const content = c.kind === 'date' ? body : '<div class="pv2-row">' + body + '</div>';
        return '<fieldset class="pv2-field"><legend class="pv2-legend">' + esc(c.label) + '</legend>' + content + '</fieldset>';
      }).join('') +
        '<div class="pv2-panel-foot"><button type="button" class="pv2-clear" data-act="filters-close">Réduire les filtres' + CHEVRON + '</button></div>';
    }

    function renderTable() {
      const cols = shownCols();
      const list = visibleRows();
      const focused = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.sort;

      $('thead').innerHTML = '<tr>' + cols.map(c => {
        const on = state.sort.key === c.key;
        const aria = on ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
        // L'icône reste collée au dernier mot quand le titre passe à la ligne
        // (coupure possible après une espace ou un trait d'union).
        const cut = Math.max(c.label.lastIndexOf(' '), c.label.lastIndexOf('-')) + 1;
        const label = esc(c.label.slice(0, cut)) + '<span class="pv2-nw">' + esc(c.label.slice(cut)) + SORT_ICON + '</span>';
        return '<th aria-sort="' + aria + '"><button type="button" class="pv2-sort" data-sort="' + c.key + '">' + label + '</button></th>';
      }).join('') +
        '<th class="pv2-more-cell"><button type="button" class="pv2-more" data-act="cols" aria-expanded="' + !colsPanel.hidden + '" aria-controls="' + uid + '-cols" aria-label="Plus d\'infos : colonnes facultatives" title="Plus d\'infos">' + (colsPanel.hidden ? '+' : '−') + '</button></th></tr>';

      $('tbody').innerHTML = list.length ? list.map(r => '<tr>' + cols.map(c => {
        const rec = c.key === 'time' && r.record ? ' <span class="pv2-rec" role="img" aria-label="record" title="Record · ' + esc(r.v.sub) + '">🥇</span>' : '';
        const cls = c.kind === 'text' ? ' class="pv2-t"' : c.kind === 'choice' ? '' : ' class="pv2-n"';
        return '<td' + cls + '>' + fmtCell(c, r.v[c.key]) + rec + '</td>';
      }).join('') + '<td class="pv2-pad"></td></tr>').join('')
        : '<tr><td class="pv2-none" colspan="' + (cols.length + 1) + '">Aucune course ne correspond aux filtres.</td></tr>';

      const n = cols.filter(c => isActive(c, state.filters[c.key])).length;
      $('.pv2-count').textContent = list.length + (list.length > 1 ? ' courses' : ' course') + ' sur ' + total;
      $('.pv2-btn-label').textContent = n ? 'Filtres · ' + n : 'Filtres';
      $('.pv2-btn').classList.toggle('is-on', n > 0);
      $('[data-act="clear"]').hidden = n === 0;

      if (focused) { const b = root.querySelector('[data-sort="' + focused + '"]'); if (b) b.focus(); }
      fitTable();
    }

    // Tableau trop large pour l'écran : plutôt que d'écraser les colonnes, on le
    // laisse à sa largeur naturelle, une ligne par cellule, et il défile.
    function fitTable() {
      const scroll = $('.table-scroll'), table = $('table');
      table.classList.remove('pv2-wide');
      if (scroll.scrollWidth > scroll.clientWidth + 1) table.classList.add('pv2-wide');
    }
    // Revérifié dès que la largeur disponible change : onglet affiché (le tableau
    // est dessiné onglet caché), écran tourné, fenêtre redimensionnée.
    if (window.ResizeObserver) {
      let lastWidth = -1;
      new ResizeObserver(entries => {
        const w = Math.round(entries[0].contentRect.width);
        if (w !== lastWidth) { lastWidth = w; fitTable(); }
      }).observe($('.table-scroll'));
    } else {
      window.addEventListener('resize', fitTable);
    }

    function setPanel(open) {
      panel.hidden = !open;
      $('.pv2-btn').setAttribute('aria-expanded', String(open));
    }
    function setCols(open) {
      colsPanel.hidden = !open;
      const b = $('.pv2-more');
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? '−' : '+';
    }

    root.addEventListener('click', e => {
      const sortBtn = e.target.closest('[data-sort]');
      if (sortBtn) {
        const col = colOf(sortBtn.dataset.sort);
        state.sort = state.sort.key === col.key
          ? { key: col.key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
          : { key: col.key, dir: FIRST_DIR[col.kind] };
        renderTable();
        return;
      }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'filters') setPanel(panel.hidden);
      if (act.dataset.act === 'filters-close') { setPanel(false); $('.pv2-btn').focus(); }
      if (act.dataset.act === 'cols') setCols(colsPanel.hidden);
      if (act.dataset.act === 'clear') { state.filters = {}; renderPanel(); renderTable(); }
    });

    function onFilter(e) {
      const el = e.target;
      if (el.dataset.col) { // colonne facultative affichée ou masquée
        if (el.checked) state.shown.add(el.dataset.col);
        else { state.shown.delete(el.dataset.col); delete state.filters[el.dataset.col]; } // masquer retire le filtre
        renderPanel(); renderTable();
        return;
      }
      const key = el.dataset.f;
      if (!key) return;
      const col = colOf(key);
      const f = state.filters[key] || (state.filters[key] = {});
      const part = el.dataset.part;
      if (part === 'set') {
        f.set = f.set || new Set();
        if (el.checked) f.set.add(el.value); else f.set.delete(el.value);
      } else if (part === 'min' || part === 'max') {
        const val = col.kind === 'duration' ? parseDuration(el.value) : parseNumber(el.value);
        const bad = el.value.trim() !== '' && val == null;
        el.setAttribute('aria-invalid', String(bad));
        f[part] = bad ? null : val;
        f[part + 'Raw'] = el.value;
      } else {
        f[part] = el.value;
      }
      renderTable();
    }
    root.addEventListener('input', onFilter);
    root.addEventListener('change', e => { if (e.target.tagName === 'SELECT' || e.target.type === 'date') onFilter(e); });

    renderPanel();
    renderTable();
  };
})();
