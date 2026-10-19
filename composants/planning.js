// ===== Planning annuel : la saison d'un coup d'œil =====
//
// Composant partagé, en prototype. renderPlanning(élément, config) dessine un
// calendrier d'une ligne par mois et d'une case par jour. Chaque course est un
// carré ; sa préparation remonte dans le temps sous les cases, sa récupération
// la suit en pointillé. Deux préparations qui se recouvrent sont hachurées, et
// les jours restés sombres sont les plages libres.
//
// config.races : une course = { date: 'AAAA-MM-JJ', name, effort } avec, au
//   besoin : key (objectif intermédiaire ou final), provisional (libellé d'une
//   date provisoire, ex. 'mi-mars'), noPrep (course sans préparation dédiée).
//   Date pas encore publiée : { from, to, when: 'fin mai' } au lieu de date.
//   effort = km-effort (distance + D+/100 + D−/200).
// config.candidates : courses envisagées, pas encore retenues : { month: 'AAAA-MM',
//   name, note } ou, date connue, { date: 'AAAA-MM-JJ', name, note } (carré vide).
//   note remplace « candidat » dans la liste du mois.
// config.views : [{ id, label, months }] ou [{ id, label, until: 'AAAA-MM' }].
// config.prepDays, config.recDays : durées en jours selon l'effort.
// config.footnote : texte sous le calendrier.
(function () {
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MONTH_LABELS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
  const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const HEAD_DAYS = [1, 5, 10, 15, 20, 25, 30];

  // Dates en heure locale, sous forme 'AAAA-MM-JJ' : comparables comme du texte.
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const longDate = s => { const d = parse(s); return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
  const shortDate = s => {
    const d = parse(s);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  };
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const startOf = r => r.date || r.from;
  const endOf = r => r.date || r.to;

  // Préparations et récupérations, réparties sur le moins de couloirs possible.
  function buildSpans(races, prepDays, recDays) {
    const spans = [];
    races.forEach(r => {
      if (!r.noPrep) spans.push({ type: 'prep', race: r, a: addDays(startOf(r), -prepDays(r.effort)), b: addDays(startOf(r), -1) });
      spans.push({ type: 'rec', race: r, a: addDays(endOf(r), 1), b: addDays(endOf(r), recDays(r.effort)) });
    });
    spans.sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : 0));
    const laneEnd = [];
    spans.forEach(s => {
      let lane = laneEnd.findIndex(e => e < s.a);
      if (lane === -1) { lane = laneEnd.length; laneEnd.push(''); }
      laneEnd[lane] = s.b;
      s.lane = lane;
    });
    return { spans, lanes: Math.max(1, laneEnd.length) };
  }

  // Deux préparations qui se recouvrent : la seconde commence avant la première course.
  function findOverlaps(spans) {
    const preps = spans.filter(s => s.type === 'prep');
    const out = [];
    preps.forEach((s, i) => preps.slice(i + 1).forEach(t => {
      const a = s.a > t.a ? s.a : t.a, b = s.b < t.b ? s.b : t.b;
      if (a > b) return;
      const sFirst = startOf(s.race) <= startOf(t.race);
      out.push({ a, b, earlier: sFirst ? s.race : t.race, later: sFirst ? t.race : s.race });
    }));
    return out;
  }

  window.renderPlanning = function (root, cfg) {
    const prepDays = cfg.prepDays || (e => (e < 15 ? 28 : e < 35 ? 42 : 56));
    const recDays = cfg.recDays || (e => (e < 15 ? 3 : e < 35 ? 7 : 14));
    const races = cfg.races.slice().sort((x, y) => (startOf(x) < startOf(y) ? -1 : 1));
    const built = buildSpans(races, prepDays, recDays);
    const spans = built.spans, lanes = built.lanes;
    const overlaps = findOverlaps(spans);
    const views = cfg.views || [{ id: '12m', label: '12 mois', months: 12 }];
    let view = views[0].id;

    const candidates = (cfg.candidates || []).map(c => Object.assign({ month: c.date ? c.date.slice(0, 7) : c.month }, c));
    const raceOn = day => races.find(r => (r.date ? r.date === day : day >= r.from && day <= r.to));
    const candOn = day => candidates.find(c => c.date === day);
    const spanOn = (day, type) => spans.find(s => s.type === type && day >= s.a && day <= s.b);
    const inOverlap = day => overlaps.some(o => day >= o.a && day <= o.b);

    function monthsOf(v) {
      const now = new Date();
      const y0 = now.getFullYear(), m0 = now.getMonth();
      let n = v.months || 12;
      if (v.until) { const u = parse(v.until); n = (u.getFullYear() - y0) * 12 + u.getMonth() - m0 + 1; }
      return Array.from({ length: Math.max(1, n) }, (_, i) => new Date(y0, m0 + i, 1));
    }

    function render() {
      const today = iso(new Date());
      const months = monthsOf(views.find(x => x.id === view));
      const last = months[months.length - 1];
      const winStart = iso(months[0]);
      const winEnd = iso(new Date(last.getFullYear(), last.getMonth() + 1, 0));

      let head = '';
      for (let dd = 1; dd <= 31; dd++) head += '<span>' + (HEAD_DAYS.includes(dd) ? dd : '') + '</span>';
      let rows = '<div class="pl-row pl-head"><div></div><div class="pl-days">' + head + '</div><div></div></div>';

      months.forEach(first => {
        const y = first.getFullYear(), m = first.getMonth();
        const nDays = new Date(y, m + 1, 0).getDate();
        let cells = '', laneHtml = '';

        for (let dd = 1; dd <= 31; dd++) {
          if (dd > nDays) { cells += '<span class="pl-d none"></span>'; continue; }
          const date = new Date(y, m, dd), day = iso(date);
          const race = raceOn(day), cand = candOn(day), prep = spanOn(day, 'prep'), rec = spanOn(day, 'rec');
          const cls = ['pl-d'];
          let tip = longDate(day);
          if (date.getDay() === 0 || date.getDay() === 6) cls.push('we');
          if (race) {
            cls.push(race.from ? 'approx' : race.key ? 'key' : 'race');
            tip += ' · ' + race.name + (race.from ? ' (' + race.when + ', date à confirmer)' : race.provisional ? ' (' + race.provisional + ', date provisoire)' : '');
          } else if (cand) {
            cls.push('cand');
            tip += ' · ' + cand.name + ' (' + (cand.note || 'candidat') + ')';
          } else if (prep) {
            cls.push('prep');
            tip += ' · préparation : ' + prep.race.name;
          } else if (rec) {
            cls.push('rec');
            tip += ' · récupération : ' + rec.race.name;
          }
          if (day < today) cls.push('past');
          if (day === today) { cls.push('today'); tip += " · aujourd'hui"; }
          cells += '<span class="' + cls.join(' ') + '" title="' + esc(tip) + '"></span>';
        }

        for (let lane = 0; lane < lanes; lane++) {
          for (let dd = 1; dd <= 31; dd++) {
            const day = dd <= nDays ? iso(new Date(y, m, dd)) : null;
            const s = day && spans.find(x => x.lane === lane && day >= x.a && day <= x.b);
            if (!s) { laneHtml += '<span></span>'; continue; }
            const cls = ['pl-b', s.type === 'prep' ? (inOverlap(day) ? 'over' : 'prep') : 'rec'];
            if (day === s.a || dd === 1) cls.push('l');
            if (day === s.b || dd === nDays) cls.push('r'); else cls.push('fill');
            if (day < today) cls.push('past');
            laneHtml += '<span class="' + cls.join(' ') + '"></span>';
          }
        }

        const key = y + '-' + pad(m + 1);
        const chips = races.filter(r => startOf(r).slice(0, 7) === key).map(r => {
          const when = r.from ? r.when : r.provisional ? r.provisional : String(parse(r.date).getDate());
          const note = r.from ? ' · date à confirmer' : r.provisional ? ' · date provisoire' : '';
          return '<div class="pl-chip' + (r.key ? ' key' : '') + '"><i>' + esc(when) + '</i>' + esc(r.name) + note + '</div>';
        }).concat(candidates.filter(c => c.month === key).map(c =>
          '<div class="pl-chip cand"><i>' + (c.date ? parse(c.date).getDate() : '?') + '</i>' + esc(c.name) + ' · ' + esc(c.note || 'candidat') + '</div>'
        )).join('');

        rows += '<div class="pl-row"><div class="pl-m"><b>' + MONTH_LABELS[m] + '</b> ' + String(y).slice(2) + '</div>' +
          '<div class="pl-grid"><div class="pl-days">' + cells + '</div><div class="pl-lanes">' + laneHtml + '</div></div>' +
          '<div class="pl-chips">' + chips + '</div></div>';
      });

      // Plages libres : ni course, ni préparation, ni récupération, à partir d'aujourd'hui.
      const busy = d => !!raceOn(d) || spans.some(s => d >= s.a && d <= s.b);
      const free = [];
      let cur = null;
      for (let d = today > winStart ? today : winStart; d <= winEnd; d = addDays(d, 1)) {
        if (!busy(d)) { if (cur) cur.b = d; else cur = { a: d, b: d }; }
        else if (cur) { free.push(cur); cur = null; }
      }
      if (cur) free.push(cur);

      const overTxt = overlaps.filter(o => o.b >= today && o.a <= winEnd).map(o =>
        '<li><b>' + (diffDays(o.a, o.b) + 1) + ' jours</b> · prépa ' + esc(o.later.name) + ' commencée avant ' + esc(o.earlier.name) +
        ' (' + shortDate(o.a) + ' → ' + shortDate(o.b) + ')</li>'
      ).join('') || '<li>Aucun sur la période.</li>';
      const freeTxt = free.filter(f => diffDays(f.a, f.b) + 1 >= 10).map(f =>
        '<li><b>' + (diffDays(f.a, f.b) + 1) + ' jours</b> · du ' + shortDate(f.a) + ' au ' + shortDate(f.b) + '</li>'
      ).join('') || '<li>Aucune plage de 10 jours ou plus.</li>';

      const legend = '<div class="pl-legend">' +
        '<span><i class="pl-k k-race"></i>Course</span>' +
        '<span><i class="pl-k k-key"></i>Objectif</span>' +
        '<span><i class="pl-k k-approx"></i>Date à confirmer</span>' +
        (candidates.some(c => c.date) ? '<span><i class="pl-k k-cand"></i>Candidat</span>' : '') +
        '<span><i class="pl-k k-prep"></i>Préparation</span>' +
        '<span><i class="pl-k k-rec"></i>Récupération</span>' +
        '<span><i class="pl-k k-over"></i>Chevauchement</span>' +
        '<span><i class="pl-k k-free"></i>Jour libre</span>' +
        '<span><i class="pl-k k-today"></i>Aujourd\'hui</span>' +
        '</div>';

      root.innerHTML =
        (views.length > 1
          ? '<div class="pl-top"><div class="pl-seg">' + views.map(x =>
              '<button type="button" data-view="' + esc(x.id) + '"' + (x.id === view ? ' class="on"' : '') + '>' + esc(x.label) + '</button>'
            ).join('') + '</div></div>'
          : '') +
        legend +
        '<div class="pl-cal">' + rows + '</div>' +
        '<div class="pl-notes">' +
          '<div class="pl-note warn"><h4>Chevauchements de préparation</h4><ul>' + overTxt + '</ul></div>' +
          '<div class="pl-note"><h4>Plages libres de 10 jours ou plus' + (candidates.length ? ', hors candidats' : '') + '</h4><ul>' + freeTxt + '</ul></div>' +
        '</div>' +
        (cfg.footnote ? '<p class="pl-foot">' + esc(cfg.footnote) + '</p>' : '');

      root.querySelectorAll('.pl-seg button').forEach(b => b.addEventListener('click', () => {
        view = b.dataset.view;
        render();
      }));
    }

    render();
  };
})();
