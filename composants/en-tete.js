// ===== Socle : thème, en-tête, menu et rechargement automatique =====
//
// renderEnTete(config) place l'en-tête et le menu en haut de la page, décrits
// par docs/specification-generale.md (§ 4 et 5) et docs/design.md.
//
// config :
//   theme      'bleu-orange' | 'vert-rose' | 'violet-turquoise'
//   objectif   { nom, distance (km), dplus (m, si connu), date
//                ('AAAA-MM-JJ', ou 'AAAA-MM' si le jour est inconnu), heure
//                (heure de départ 'HH:MM', si connue), dIciLa
//                (nombre de courses avant l'objectif), cible (texte libre) }
//   prochaine  { nom, date: 'AAAA-MM-JJ' } ou rien
//   modules    [{ nom, page }] dans l'ordre du menu ; page absente = pas encore construit
//   courant    page ouverte, pour mettre son onglet en avant
//   maintenant date du jour imposée (contrôles) ; sinon l'heure réelle
//   racine     préfixe des liens, pour une page rangée dans un sous-dossier
//   partage    site partagé en lecture seule : pas d'engrenage
//   sansEnTete une barre fine à la place de l'en-tête : « Cap sur … » et l'engrenage (pages autres qu'Accueil et Objectif)
(function () {
  // iPhone et iPad : pas de zoom automatique sur un champ touché (Safari garde ensuite la page agrandie,
  // formulaire coupé). Safari ignore maximum-scale pour le zoom à deux doigts, qui reste possible.
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp && !/maximum-scale/.test(vp.content)) vp.content += ', maximum-scale=1';
  }
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  // Thèmes : seules les couleurs changent ; le premier sert par défaut. « auto » : blanc-orange ou noir-orange,
  // selon le réglage clair ou sombre de l'appareil, et il suit ce réglage s'il change pendant la visite.
  const THEMES = ['bleu-orange', 'vert-rose', 'violet-turquoise', 'blanc-orange', 'noir-orange'];
  const sombre = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let choisi = null;
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, '0');
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

  // ===== Formats communs (design, § 3) : une date, une heure, une durée s'écrivent pareil sur tout le site =====
  //   mrtFormat.date('2027-03-07')                « 7 mars 2027 » ; { semaine: true } « dim. 7 mars 2027 » ; { annee: false } « 7 mars » ;
  //                                               { long: true } mois en toutes lettres ; 'AAAA-MM' (mois seul) : « mars 2027 »
  //   mrtFormat.jour(1)                           « 1er » (le premier du mois, partout)
  //   mrtFormat.heure('07:30:00')                 « 7 h 30 » ; « 9 h »
  //   mrtFormat.semaine('2026-10-26', { annee })  « du 26 oct. au 1er nov. » ; annee : l'année de fin, si ce n'est pas l'année en cours
  //   mrtFormat.duree(6965), allure(330)          « 01:56:05 », « 5:30 /km »
  //   mrtFormat.nombre(2100)                      « 2 100 » (espace insécable ordinaire : l'espace fine d'Intl se voit à peine en Space Grotesk)
  const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS_COURT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const jourDuMois = n => (Number(n) === 1 ? '1er' : String(Number(n)));
  window.mrtFormat = {
    MOIS: MOIS_COURT, MOIS_LONG: MONTHS, JOURS: JOURS_COURT,
    jour: jourDuMois,
    date(iso, o) {
      o = o || {};
      const p = String(iso).split('-').map(Number);
      if (!p[2]) return MONTHS[p[1] - 1] + ' ' + p[0];
      return (o.semaine ? JOURS_COURT[new Date(p[0], p[1] - 1, p[2]).getDay()] + ' ' : '') + jourDuMois(p[2]) + ' ' + (o.long ? MONTHS : MOIS_COURT)[p[1] - 1] +
        (o.annee === false ? '' : ' ' + p[0]);
    },
    heure(h) { const p = String(h).split(':').map(Number); return p[0] + ' h' + (p[1] ? ' ' + pad(p[1]) : ''); },
    semaine(lundi, o) {
      const p = String(lundi).split('-').map(Number), a = new Date(p[0], p[1] - 1, p[2]), b = new Date(p[0], p[1] - 1, p[2] + 6);
      return 'du ' + jourDuMois(a.getDate()) + (a.getMonth() === b.getMonth() ? '' : ' ' + MOIS_COURT[a.getMonth()]) + ' au ' + jourDuMois(b.getDate()) + ' ' + MOIS_COURT[b.getMonth()] +
        (o && o.annee && b.getFullYear() !== new Date().getFullYear() ? ' ' + b.getFullYear() : '');
    },
    duree: s => pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60),
    allure: s => Math.floor(s / 60) + ':' + pad(s % 60) + ' /km',
    nombre: n => nf.format(Number(n)).replace(/ /g, ' ')
  };

  // ===== Icônes communes (design, § 11) : dessinées en trait fin, de la couleur du texte ; plus aucun caractère tapé (×, +, ‹ ›, ↑ ↓) =====
  const icone = d => '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  window.mrtIcone = {
    fermer: icone('M4 4l8 8M12 4l-8 8'),
    plus: icone('M8 3.5v9M3.5 8h9'),
    moins: icone('M3.5 8h9'),
    gauche: icone('M10 3.5L5.5 8l4.5 4.5'),
    droite: icone('M6 3.5L10.5 8 6 12.5'),
    agrandir: icone('M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3'),
    reduire: icone('M6 3v3H3M10 3v3h3M6 13v-3H3M10 13v-3h3'),
    haut: icone('M8 12.5V3.5M4.5 7L8 3.5 11.5 7'),
    bas: icone('M8 3.5v9M4.5 9L8 12.5 11.5 9'),
    // Avis sur une course (Mon plan) : conseillée, possible, déconseillée.
    valide: icone('M3.5 8.5l3 3 6-7'),
    attention: icone('M8 2.5L14 13H2zM8 6.5v3M8 11.2v.1'),
    interdit: icone('M8 2.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11zM4.2 4.2l7.6 7.6'),
    // En-tête de colonne triable (mrt-tri) : deux triangles ; celui du sens choisi s'allume.
    tri: '<svg class="mrt-tri-ico" viewBox="0 0 10 14" aria-hidden="true"><path class="mrt-tri-haut" d="M5 1l4 5H1z"/><path class="mrt-tri-bas" d="M5 13L1 8h8z"/></svg>',
    // Chevron des titres repliables : tourné vers la droite quand c'est replié (mrt-chev, en-tete.css).
    chevron: '<svg class="mrt-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  // Plein écran (ordinateur) : un rond à mettre dans une zone qui porte data-plein-cible ; la zone prend tout l'écran, Échap ou le même rond en sort.
  // Le rond est redessiné avec sa zone : il se met dans l'état du moment. Absent sans plein écran (téléphone, navigateur sans la fonction : css).
  const pleinOn = () => !!document.fullscreenElement;
  window.mrtPleinEcran = {
    bouton: () => !document.fullscreenEnabled ? '' : '<button type="button" class="mrt-rond mrt-plein" data-plein aria-label="' + (pleinOn() ? 'Quitter le plein écran' : 'Plein écran') + '" title="' + (pleinOn() ? 'Quitter le plein écran' : 'Plein écran') + '">' + (pleinOn() ? window.mrtIcone.reduire : window.mrtIcone.agrandir) + '</button>'
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-plein]'), cible = b && b.closest('[data-plein-cible]');
    if (!cible) return;
    if (document.fullscreenElement) document.exitFullscreen(); else if (cible.requestFullscreen) cible.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => document.querySelectorAll('[data-plein]').forEach(b => {
    const t = pleinOn() ? 'Quitter le plein écran' : 'Plein écran';
    b.innerHTML = pleinOn() ? window.mrtIcone.reduire : window.mrtIcone.agrandir; b.setAttribute('aria-label', t); b.title = t;
  }));

  // 'AAAA-MM-JJ' ou 'AAAA-MM' : minuit, heure locale ; jour inconnu = le 1er du mois.
  // heure 'HH:MM' : l'heure de départ, heure locale.
  function parseDate(str, heure) {
    const p = String(str).split('-').map(Number), h = heure ? String(heure).split(':').map(Number) : [0, 0];
    return new Date(p[0], p[1] - 1, p[2] || 1, h[0], h[1] || 0);
  }
  const fmtDate = str => window.mrtFormat.date(str, { long: true });
  // Jours calendaires entre deux dates, sans tenir compte de l'heure.
  function daysBetween(from, to) {
    const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / DAY);
  }
  const dash = '—';
  let minuteur = null;

  // Thème venu des préférences ; inconnu ou absent : le premier. Retenu sur l'appareil : la page suivante le pose
  // dès son chargement (script en tête de chaque page), sans montrer d'abord un autre fond.
  window.appliquerTheme = function (name) {
    choisi = name === 'auto' ? 'auto' : THEMES.indexOf(name) !== -1 ? name : THEMES[0];
    const t = choisi === 'auto' ? (sombre && sombre.matches ? 'noir-orange' : 'blanc-orange') : choisi;
    THEMES.forEach(x => document.documentElement.classList.toggle('t-' + x, x === t));
    try { localStorage.setItem('mrt-theme', choisi); } catch (e) { /* stockage indisponible */ }
  };
  if (sombre && sombre.addEventListener) sombre.addEventListener('change', () => { if (choisi === 'auto') window.appliquerTheme('auto'); });

  window.renderEnTete = function (cfg) {
    const o = cfg.objectif || {};
    const now = () => (cfg.maintenant ? parseDate(cfg.maintenant) : new Date());
    // Redessiné (Préférences) : l'ancien en-tête et son compte à rebours disparaissent.
    document.querySelectorAll('.mrt-header, .mrt-barre, .mrt-nav').forEach(e => e.remove());
    clearInterval(minuteur);
    window.appliquerTheme(cfg.theme);
    const lien = href => (cfg.racine || '') + href;

    const stats = [
      // Le dénivelé, quand il est connu, suit la distance en texte discret.
      ['Distance', esc(o.distance != null ? nf.format(o.distance) + ' km' : dash) +
        (o.dplus != null ? '<span class="mrt-stat-dplus"> / ' + esc(nf.format(o.dplus)) + ' m D+</span>' : '')],
      ['Date', esc(o.date ? fmtDate(o.date) : dash)],
      ['Objectif', esc(o.cible || dash)],
      ["D'ici là", esc(o.dIciLa != null ? o.dIciLa + (o.dIciLa > 1 ? ' courses' : ' course') : dash)]
    ];

    // Nom de l'application (vers l'Accueil) et engrenage (vers les Préférences), dessiné : il prend l'Accent sur les Préférences.
    // Site partagé en lecture seule : pas d'engrenage, les Préférences sont celles du visiteur, pas du site regardé.
    const ROUE = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="2.356 2.356"/>' +
      '<circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
    const engrenage = cfg.partage ? '' : '<a class="mrt-gear' + (cfg.courant === 'preferences.html' ? ' is-on' : '') + '" href="' + lien('preferences.html') + '" aria-label="Préférences utilisateur" title="Préférences utilisateur"' +
      (cfg.courant === 'preferences.html' ? ' aria-current="page"' : '') + '>' + ROUE + '</a>';
    const marque = '<div class="mrt-brand"><a href="' + lien(cfg.accueil || 'index.html') + '">MyRunTools</a>' + engrenage + '</div>';
    const header = document.createElement('header');
    header.className = 'mrt-header';
    // Sans cap (compte neuf, aucune course à venir) : « Bienvenue, prénom » et une phrase, sans indicateurs ni compte à rebours.
    const bienvenue = !o.nom && cfg.bienvenue != null;
    const salut = 'Bienvenue' + (cfg.bienvenue ? ',' : '');
    if (bienvenue) header.innerHTML =
      '<div class="mrt-grid is-bienvenue">' +
        '<div class="mrt-gauche">' +
          '<h1><span class="mrt-cap">' + salut + '</span>' + (cfg.bienvenue ? '<em>' + esc(cfg.bienvenue) + '</em>' : '') + '</h1>' +
          '<p class="mrt-bienvenue">Ajoute une course pour fixer ton cap.</p>' +
        '</div>' +
        '<div class="mrt-droite">' + marque + '</div>' +
      '</div>' +
      '<div class="mrt-bar"></div>';
    else header.innerHTML =
      '<div class="mrt-grid">' +
        '<div class="mrt-gauche">' +
          '<h1><span class="mrt-cap">Cap sur</span><em>' + esc(o.nom || dash) + '</em></h1>' +
          '<div class="mrt-stats">' + stats.map(s =>
            '<div class="mrt-stat"><span class="mrt-stat-val">' + s[1] + '</span><span class="mrt-stat-label">' + esc(s[0]) + '</span></div>').join('') + '</div>' +
        '</div>' +
        '<div class="mrt-droite">' +
          marque +
          '<div class="mrt-bas"><div class="mrt-count">' +
            '<span class="mrt-days">—</span><span class="mrt-days-label">jours</span>' +
            '<div class="mrt-hms"></div></div><div class="mrt-next"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="mrt-bar"></div>';

    const nav = document.createElement('nav');
    nav.className = 'mrt-nav';
    // Nom d'un onglet ; « œil » en picto pour En un coup d'œil (le nom complet reste lu par les lecteurs d'écran).
    const OEIL = '<svg class="mrt-picto" viewBox="0 0 24 16" aria-hidden="true"><path d="M1.5 8C4 3.5 7.8 1.5 12 1.5S20 3.5 22.5 8C20 12.5 16.2 14.5 12 14.5S4 12.5 1.5 8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="8" r="3" fill="currentColor"/></svg>';
    const nomOnglet = m => (m.picto === 'oeil' ? esc(m.nom.replace(/œil$/, '')) + OEIL : esc(m.libelle || m.nom));
    nav.innerHTML = '<div class="mrt-nav-inner">' + (cfg.modules || []).map(m => {
      const titre = m.picto ? ' aria-label="' + esc(m.nom) + '" title="' + esc(m.nom) + '"' : '';
      if (!m.page) return '<span class="mrt-tab is-soon" title="Bientôt">' + nomOnglet(m) + '</span>';
      const on = m.page === cfg.courant;
      return '<a class="mrt-tab' + (on ? ' is-on' : '') + '" href="' + lien(m.page) + '"' + titre + (on ? ' aria-current="page"' : '') + '>' + nomOnglet(m) + '</a>';
    }).join('') + '</div>';

    // Grand en-tête sur la page de démarrage seulement ; ailleurs une barre fine : le rappel du cap et l'engrenage.
    let haut = header;
    if (cfg.sansEnTete) {
      const barre = document.createElement('header');
      barre.className = 'mrt-barre';
      // Rappel du cap, discret (pas en Accent : il ne doit pas concurrencer le titre de la page).
      barre.innerHTML = '<div class="mrt-barre-in"><a class="mrt-barre-cap" href="' + lien(cfg.accueil || 'index.html') + '">' +
        (bienvenue ? salut + (cfg.bienvenue ? ' <b>' + esc(cfg.bienvenue) + '</b>' : '') : 'Cap sur <b>' + esc(o.nom || dash) + '</b>') + '</a>' + engrenage + '</div>';
      document.body.prepend(barre, nav);
      haut = barre;
    } else document.body.prepend(header, nav);
    // Passage entre la page à grand en-tête et les autres : le grand en-tête se réduit en barre fine,
    // ou la barre s'agrandit en en-tête (design.md, § 3). Retenu le temps de la visite.
    const genre = cfg.sansEnTete ? 'barre' : 'entete';
    let avant = null;
    try { avant = sessionStorage.getItem('mrt-haut'); sessionStorage.setItem('mrt-haut', genre); } catch (e) { /* stockage indisponible */ }
    const calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (avant && avant !== genre && !calme) {
      haut.classList.add(genre === 'barre' ? 'is-retrecit' : 'is-deploie');
      haut.addEventListener('animationend', () => haut.classList.remove('is-retrecit', 'is-deploie'), { once: true });
    }
    // Hauteur du menu collant, pour les barres qui se collent juste dessous (Calendrier).
    const hauteurMenu = () => document.documentElement.style.setProperty('--mrt-nav-h', nav.offsetHeight + 'px');
    hauteurMenu();
    window.addEventListener('resize', hauteurMenu);
    // Sur téléphone, l'onglet de la page ouverte est ramené dans la barre visible.
    const onTab = nav.querySelector('.is-on'), bar = nav.firstChild;
    if (onTab && onTab.offsetLeft + onTab.offsetWidth > bar.clientWidth) {
      bar.scrollLeft = onTab.offsetLeft - (bar.clientWidth - onTab.offsetWidth) / 2;
    }

    const $ = sel => header.querySelector(sel);
    const target = o.date ? parseDate(o.date, o.heure) : null;
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
        $('.mrt-hms').textContent = pad(h) + ' h ' + pad(m) + ' min ' + pad(s) + ' s'; // comme les cartes : « h », « min », « s »
      }
      const left = next && next.date ? daysBetween(t, parseDate(next.date)) : -1;
      $('.mrt-next').innerHTML = left >= 0 ? 'prochaine course · <b>' + esc(next.nom) + '</b> · J-' + left : '';
    }
    if (cfg.sansEnTete || bienvenue) return;
    tick();
    if (!cfg.maintenant) minuteur = setInterval(tick, 1000);
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

  // ----- Déroulé commun (design § 1) : ouvrir ou fermer une zone en hauteur, avec un fondu -----
  // 0,25 s à l'ouverture, 0,2 s à la fermeture, ease-out ; rien ne bouge si l'appareil demande moins d'animations.
  //   mrtDeroule(el, ouvrir)   el : la zone (attribut hidden), ou le contenu d'un <details class="mrt-deroule">
  //   les <details class="mrt-deroule"> s'ouvrent et se ferment ainsi d'eux-mêmes (le contenu : l'élément qui suit le <summary>)
  const moinsDeMouvement = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.mrtDeroule = function (el, ouvrir, fin) {
    if (el.__deroule) { el.__deroule.onfinish = null; el.__deroule.cancel(); el.__deroule = null; }
    const termine = () => { if (!ouvrir) el.hidden = true; if (fin) fin(); };
    if (ouvrir) el.hidden = false;
    if (moinsDeMouvement() || !el.animate) return termine();
    const st = getComputedStyle(el);
    const plein = { height: el.getBoundingClientRect().height - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom) - parseFloat(st.borderTopWidth) - parseFloat(st.borderBottomWidth) + 'px',
      paddingTop: st.paddingTop, paddingBottom: st.paddingBottom, marginTop: st.marginTop, marginBottom: st.marginBottom, opacity: 1 };
    const vide = { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', opacity: 0 };
    if (st.boxSizing === 'border-box') plein.height = el.getBoundingClientRect().height + 'px';
    el.style.overflow = 'hidden';
    const a = el.animate(ouvrir ? [vide, plein] : [plein, vide], { duration: ouvrir ? 250 : 200, easing: 'ease-out' });
    el.__deroule = a;
    a.onfinish = () => { el.style.overflow = ''; el.__deroule = null; termine(); };
  };
  // ----- Confirmation (design, § 11) : la question dans un encadré du site, jamais la fenêtre du navigateur -----
  //   mrtConfirmer({ texte, action, annuler, danger, seul }) → promesse : vrai si l'action est choisie.
  //   « Annuler » à gauche (choisi d'office ; `annuler` le renomme quand « Annuler » prêterait à confusion : « Continuer » pour abandonner une saisie), l'action à droite (en Alerte si danger) ; seul : un bouton (un avertissement).
  //   Échap ou un toucher à côté : « Annuler », sans rien fermer de ce qui est dessous (fiche, page d'une course).
  window.mrtConfirmer = function (o) {
    return new Promise(fin => {
      const voile = document.createElement('div');
      voile.className = 'mrt-dialogue';
      voile.innerHTML = '<div class="mrt-dialogue-cadre' + (o.danger ? ' is-danger' : '') + '" role="alertdialog" aria-modal="true" aria-labelledby="mrt-dialogue-q">' +
        '<p id="mrt-dialogue-q"></p><div class="mrt-dialogue-boutons">' + (o.seul ? '' : '<button type="button" class="mrt-btn" data-r="non"></button>') +
        '<button type="button" class="mrt-btn ' + (o.danger ? 'is-danger' : 'is-principal') + '" data-r="oui"></button></div></div>';
      voile.querySelector('p').textContent = o.texte;
      voile.querySelector('[data-r="oui"]').textContent = o.action || 'Confirmer';
      const non = voile.querySelector('[data-r="non"]'); if (non) non.textContent = o.annuler || 'Annuler';
      const avant = document.activeElement;
      function clavier(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); fermer(false); } }
      function fermer(r) {
        window.removeEventListener('keydown', clavier, true);
        voile.remove();
        if (avant && avant.isConnected && avant.focus) avant.focus({ preventScroll: true });
        fin(!!r);
      }
      window.addEventListener('keydown', clavier, true);
      voile.addEventListener('click', e => {
        e.stopPropagation();
        const b = e.target.closest('[data-r]');
        if (b) fermer(b.dataset.r === 'oui'); else if (e.target === voile) fermer(false);
      });
      document.body.appendChild(voile);
      voile.querySelector('[data-r]').focus();
    });
  };

  // ----- Typographie française (design, § 3) : espace insécable devant « ? ! : ; » et à l'intérieur des guillemets « », posée à
  // l'affichage dans tout le texte de la page : un « ? » ne passe jamais seul à la ligne. Jamais dans un champ de saisie
  // (la saisie et la valeur enregistrée restent telles quelles), ni dans une liste de choix.
  const HORS_TYPO = /^(TEXTAREA|INPUT|SELECT|OPTION|SCRIPT|STYLE|CODE|PRE)$/;
  function typo(racine) {
    const marcher = n => {
      if (n.nodeType === 3) {
        const p = n.parentNode;
        if (!p || HORS_TYPO.test(p.nodeName) || p.isContentEditable) return;
        const t = n.nodeValue, u = t.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
        if (u !== t) n.nodeValue = u;
      } else if (n.nodeType === 1 && !HORS_TYPO.test(n.nodeName)) n.childNodes.forEach(marcher);
    };
    marcher(racine);
  }
  function poserTypo() {
    typo(document.body);
    new MutationObserver(ms => ms.forEach(m => (m.type === 'characterData' ? typo(m.target) : m.addedNodes.forEach(typo))))
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poserTypo); else poserTypo();

  // ----- Pied de page (spécification générale § 11 bis, M12) : en bas de toutes les pages, page de connexion comprise -----
  // Lien rangé d'après l'adresse de ce script (composants/en-tete.js) : juste aussi pour une page d'un sous-dossier.
  // Pas sur les maquettes (docs/), ni sur la page des mentions elle-même.
  const piedLien = document.currentScript ? new URL('../mentions-legales.html', document.currentScript.src).href : 'mentions-legales.html';
  function poserPied() {
    if (/\/docs\//.test(location.pathname) || document.querySelector('.mrt-pied')) return;
    const f = document.createElement('footer');
    f.className = 'mrt-pied';
    f.innerHTML = /mentions-legales\.html$/.test(location.pathname) ? '<span>Mentions légales</span>' : '<a href="' + piedLien + '">Mentions légales</a>';
    document.body.appendChild(f);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poserPied); else poserPied();

  document.addEventListener('click', e => {
    const resume = e.target.closest('details.mrt-deroule > summary');
    if (!resume || getComputedStyle(resume).pointerEvents === 'none') return;
    const d = resume.parentNode, corps = resume.nextElementSibling;
    if (!corps || moinsDeMouvement()) return; // ouverture native, sans animation
    e.preventDefault();
    if (d.open && !corps.hidden) window.mrtDeroule(corps, false, () => { d.open = false; corps.hidden = false; });
    else { d.open = true; window.mrtDeroule(corps, true); }
  });
})();
