// ===== Socle : thème, en-tête, menu et rechargement automatique =====
//
// renderEnTete(config) place l'en-tête et le menu en haut de la page, décrits
// par docs/specification-generale.md (§ 4 et 5) et docs/design.md.
//
// config :
//   theme      'bleu-orange' | 'vert-rose' | 'violet-turquoise' ; ?t=… dans
//              l'adresse l'emporte
//   objectif   { nom, distance (km), dplus (m, trail seulement), date
//                ('AAAA-MM-JJ', ou 'AAAA-MM' si le jour est inconnu), dIciLa
//                (nombre de courses avant l'objectif), cible (texte libre) }
//   prochaine  { nom, date: 'AAAA-MM-JJ' } ou rien
//   modules    [{ nom, page }] dans l'ordre du menu ; page absente = pas encore construit
//   courant    page ouverte, pour mettre son onglet en avant
//   maintenant date du jour imposée (contrôles) ; sinon l'heure réelle
//   racine     préfixe des liens, pour une page rangée dans un sous-dossier
(function () {
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  // Thèmes : seules les couleurs changent ; le premier sert par défaut.
  const THEMES = ['bleu-orange', 'vert-rose', 'violet-turquoise'];
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, '0');
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

  // 'AAAA-MM-JJ' ou 'AAAA-MM' : minuit, heure locale ; jour inconnu = le 1er du mois.
  function parseDate(str) {
    const p = String(str).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2] || 1);
  }
  function fmtDate(str) {
    const p = String(str).split('-').map(Number);
    return (p[2] ? (p[2] === 1 ? '1er' : p[2]) + ' ' : '') + MONTHS[p[1] - 1] + ' ' + p[0];
  }
  // Jours calendaires entre deux dates, sans tenir compte de l'heure.
  function daysBetween(from, to) {
    const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / DAY);
  }
  const dash = '—';

  function themeOf(cfg) {
    let t = null;
    try { t = new URLSearchParams(location.search).get('t'); } catch (e) { /* adresse illisible */ }
    return THEMES.indexOf(t) !== -1 ? t : (THEMES.indexOf(cfg.theme) !== -1 ? cfg.theme : THEMES[0]);
  }

  // Thème venu des préférences, appliqué après coup ; un thème imposé par
  // l'adresse (?t=…) garde la priorité.
  window.appliquerTheme = function (name) {
    let t = null;
    try { t = new URLSearchParams(location.search).get('t'); } catch (e) { /* adresse illisible */ }
    if (THEMES.indexOf(t) !== -1 || THEMES.indexOf(name) === -1) return;
    THEMES.forEach(x => document.documentElement.classList.toggle('t-' + x, x === name));
  };

  window.renderEnTete = function (cfg) {
    const o = cfg.objectif || {};
    const now = () => (cfg.maintenant ? parseDate(cfg.maintenant) : new Date());
    const theme = themeOf(cfg);
    THEMES.forEach(t => document.documentElement.classList.toggle('t-' + t, t === theme));
    // Un thème imposé par l'adresse (?t=…) suit les liens du menu et de l'engrenage.
    const forced = location.search.indexOf('t=' + theme) !== -1;
    const withTheme = href => (cfg.racine || '') + (forced ? href + '?t=' + theme : href);

    const stats = [
      ['Distance', o.distance != null ? nf.format(o.distance) + ' km' : dash],
      o.dplus != null ? ['D+', nf.format(o.dplus) + ' m'] : null, // trail seulement
      ['Date', o.date ? fmtDate(o.date) : dash],
      ['Objectif', o.cible || dash],
      ["D'ici là", o.dIciLa != null ? o.dIciLa + (o.dIciLa > 1 ? ' courses' : ' course') : dash]
    ].filter(Boolean);

    const header = document.createElement('header');
    header.className = 'mrt-header';
    header.innerHTML =
      '<div class="mrt-grid">' +
        '<h1><span class="mrt-cap">Cap sur</span><em>' + esc(o.nom || dash) + '</em></h1>' +
        '<div class="mrt-stats">' + stats.map(s =>
          '<div class="mrt-stat"><span class="mrt-stat-val">' + esc(s[1]) + '</span><span class="mrt-stat-label">' + esc(s[0]) + '</span></div>').join('') + '</div>' +
        '<div class="mrt-count">' +
          '<div class="mrt-brand"><a href="' + withTheme('index.html') + '">MyRunTools</a>' +
          '<a class="mrt-gear" href="' + withTheme('preferences.html') + '" aria-label="Préférences utilisateur" title="Préférences utilisateur">⚙️</a></div>' +
          '<span class="mrt-days">—</span><span class="mrt-days-label">jours</span>' +
          '<div class="mrt-hms"></div></div>' +
        '<div class="mrt-next"></div>' +
      '</div>' +
      '<div class="mrt-bar"></div>';

    const nav = document.createElement('nav');
    nav.className = 'mrt-nav';
    nav.innerHTML = '<div class="mrt-nav-inner">' + (cfg.modules || []).map(m => {
      if (!m.page) return '<span class="mrt-tab is-soon" title="Bientôt">' + esc(m.nom) + '</span>';
      const on = m.page === cfg.courant;
      return '<a class="mrt-tab' + (on ? ' is-on' : '') + '" href="' + withTheme(m.page) + '"' + (on ? ' aria-current="page"' : '') + '>' + esc(m.nom) + '</a>';
    }).join('') + '</div>';

    document.body.prepend(header, nav);
    // Sur téléphone, l'onglet de la page ouverte est ramené dans la barre visible.
    const onTab = nav.querySelector('.is-on'), bar = nav.firstChild;
    if (onTab && onTab.offsetLeft + onTab.offsetWidth > bar.clientWidth) {
      bar.scrollLeft = onTab.offsetLeft - (bar.clientWidth - onTab.offsetWidth) / 2;
    }

    const $ = sel => header.querySelector(sel);
    const target = o.date ? parseDate(o.date) : null;
    const next = cfg.prochaine;
    function tick() {
      const t = now();
      if (!target) { $('.mrt-days').textContent = dash; $('.mrt-days-label').textContent = ''; }
      else if (target - t <= 0) {
        $('.mrt-days').textContent = 'Course courue';
        $('.mrt-days').style.fontSize = '1.4rem';
        $('.mrt-days-label').textContent = '';
        $('.mrt-hms').textContent = '';
      } else {
        const ms = target - t;
        const d = Math.floor(ms / DAY), h = Math.floor(ms % DAY / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
        $('.mrt-days').textContent = d;
        $('.mrt-days-label').textContent = d > 1 ? 'jours' : 'jour';
        $('.mrt-hms').textContent = pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
      }
      const left = next && next.date ? daysBetween(t, parseDate(next.date)) : -1;
      $('.mrt-next').innerHTML = left >= 0 ? 'prochaine course · <b>' + esc(next.nom) + '</b> · J-' + left : '';
    }
    tick();
    if (!cfg.maintenant) setInterval(tick, 1000);
  };

  // ===== Rechargement automatique =====
  // Un onglet resté ouvert (iPhone) garde l'ancienne page : on compare la
  // version affichée à celle en ligne, et on recharge une fois par version.
  function checkNewVersion() {
    const meta = document.querySelector('meta[name="site-version"]');
    if (!meta || !window.fetch || location.protocol === 'file:' || meta.content === '__VERSION__') return;
    const current = meta.content;
    fetch(location.pathname + '?check=' + Date.now(), { cache: 'no-store' })
      .then(r => (r.ok ? r.text() : ''))
      .then(html => {
        const m = html.match(/<meta name="site-version" content="([^"]+)"/);
        if (!m || m[1] === current) return;
        try {
          if (sessionStorage.getItem('mrtReloadedFor') === m[1]) return;
          sessionStorage.setItem('mrtReloadedFor', m[1]);
        } catch (e) { /* stockage indisponible : on recharge quand même une fois */ }
        // Nouvelle adresse, pour ne pas reprendre la page gardée en cache.
        const q = new URLSearchParams(location.search);
        q.set('v', m[1]);
        location.replace(location.pathname + '?' + q + location.hash);
      })
      .catch(() => {});
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkNewVersion(); });
  window.addEventListener('pageshow', e => { if (e.persisted) checkNewVersion(); });
  window.addEventListener('load', checkNewVersion);
})();
