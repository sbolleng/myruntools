// ===== Calendrier : vues Année, Mois et Semaine =====
//
// docs/module-calendrier-specification.md, § 2 à 4. renderCalendrier(élément, ctx) dessine l'une des trois vues, choisie
// dans le menu « Périodicité » et lue dans l'adresse : #semaines=AAAA-MM-JJ (par défaut : la semaine en cours), #mois=AAAA-MM
// et #annee=AAAA-MM (sans date : le mois en cours) ; le bouton retour du navigateur ramène à la vue d'avant.
// Le bouton « Plan », commun aux trois vues et retenu sur l'appareil (éteint par défaut), ajoute la préparation : barres
// aux couleurs des phases (Année), fond des jours à la couleur de la phase de la semaine (Mois, Semaine).
// Une course touchée ouvre sa page (rubrique Préparation ; une course courue : son résultat).
// Séances (case « faite », « + », fenêtre) : preparation.js.
//   ctx.courses, ctx.seances, ctx.semaines, ctx.lectureSeule, ctx.relire() : voir preparation.js.
(function () {
  const P = window.mrtPreparation;
  const { MOIS, JOURS, PHASES, NOM_PHASE, TYPES, iso, parse, addDays, lundiDe, longue, esc, aPlan, visibles, planSaison, phaseDe, lienCourse } = P;
  const { MOIS_LONG } = window.mrtFormat;
  // Choix du menu « Périodicité » : [vue, nom, durée de l'Année en mois].
  const VUES = [['semaines', 'Semaine'], ['mois', 'Mois'], ['annee', '3 mois', '3'], ['annee', '6 mois', '6'], ['annee', 'Année', '12']];
  const INITIALE = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // initiale du jour, de dimanche à samedi (Année)
  const CHEVRON = '<svg class="cal-menu-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ----- Réglages retenus sur l'appareil (à défaut de stockage, le temps de la visite) -----
  const visite = {};
  const lire = (cle, ok, defaut) => {
    let v = visite[cle];
    if (v === undefined) try { v = localStorage.getItem(cle); } catch (e) { /* stockage indisponible */ }
    return ok(v) ? v : defaut;
  };
  const ranger = (cle, v) => { visite[cle] = v; try { localStorage.setItem(cle, v); } catch (e) { /* stockage indisponible */ } };
  const phasesVisibles = () => lire('mrt-calendrier-phases', v => v === '1' || v === '0', '0') === '1';
  const PERIODES = ['3', '6', '12'];
  const periode = () => Number(lire('mrt-calendrier-mois', v => PERIODES.includes(v), '6'));

  // ----- Dates -----
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const moisCourant = () => iso(new Date()).slice(0, 7);
  const decaler = (m, n) => { const [y, mm] = m.split('-').map(Number); return iso(new Date(y, mm - 1 + n, 1)).slice(0, 7); }; // « AAAA-MM » ± n mois
  const an = m => Number(m.slice(0, 4)), rang = m => Number(m.slice(5, 7)) - 1;
  const couleur = c => (c.courue ? 'courue' : 'c-' + c.famille + (c.validee ? '-v' : '-n'));

  // Contenus d'une case (Mois, Semaine, et la grille de la page Préparation) : course, rendez-vous clé, séance (case « faite »,
  // libellé qui ouvre sa fenêtre), « + ».
  function contenus(ctx) {
    const rdvDuJour = jour => ctx.courses.filter(c => aPlan(c) && c.ouverture_inscriptions === jour);
    // Course, rendez-vous clé (ouverture des inscriptions), séance (case « faite », libellé qui ouvre sa fenêtre), « + ».
    const courseHtml = c => '<a class="cal-v-course ' + couleur(c) + '" href="' + (c.courue ? lienCourse(c.id).replace(/#.*/, '') : lienCourse(c.id)) + '">' + esc(c.nom) + '</a>';
    const rdvHtml = (c, court) => '<a class="cal-v-rdv" href="' + lienCourse(c.id) + '">◆ ' + (court ? 'Inscriptions' : 'Ouverture des inscriptions') + ' · ' + esc(c.course) + '</a>';
    const seanceHtml = s => '<span class="cal-v-se' + (s.faite ? ' faite' : '') + '"><input type="checkbox" data-fait="' + esc(s.id) + '"' + (s.faite ? ' checked' : '') + (!ctx.lectureSeule ? '' : ' disabled') +
      ' aria-label="Faite">' + (!ctx.lectureSeule ? '<button type="button" class="cal-v-se-txt" data-edit="' + esc(s.id) + '">' : '<span class="cal-v-se-txt">') +
      '<b>' + TYPES[s.type] + '</b> <span>' + esc(s.libelle) + '</span>' + (!ctx.lectureSeule ? '</button>' : '</span>') + '</span>';
    const plusHtml = jour => (!ctx.lectureSeule ? '<button type="button" class="mrt-rond is-petit cal-v-plus" data-ajout="' + jour + '" aria-label="Ajouter une séance le ' + longue(jour) + '">' + window.mrtIcone.plus + '</button>' : '');
    return { rdvDuJour, rdvHtml, courseHtml, seanceHtml, plusHtml };
  }

  // Grille du mois (spécification du Calendrier, § 4.1), du lundi debut au dimanche fin : une case par jour, ses courses, rendez-vous,
  // séances et « + » ; opts.ps : le plan de saison (fond de phase) ; opts.mois : rang du mois (jours voisins atténués) ;
  // opts.plus(jour) : ce qui s'ajoute dans la case (page Préparation : repères et séances proposées).
  function grilleMois(ctx, debut, fin, opts) {
    const o = opts || {}, auj = iso(new Date()), cc = contenus(ctx), courses = visibles(ctx.courses, debut, fin, auj);
    const phaseDuJour = j => { const x = o.ps && phaseDe(o.ps, lundiDe(j)); return x && x.phase !== 'entretien' ? x.phase : null; };
    let h = '<div class="cal-m-jours">' + ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(j => '<span class="cal-libelle">' + j + '</span>').join('') + '</div><div class="cal-m-grille">';
    for (let j = debut; j <= fin; j = addDays(j, 1)) {
      const d = parse(j), cls = ['cal-m-case'], ph = phaseDuJour(j);
      if (j < auj) cls.push('passe');
      if (o.mois != null && d.getMonth() !== o.mois) cls.push('hors');
      if (ph) cls.push('ph-' + ph);
      const cs = courses.filter(c => c.date === j), rdv = cc.rdvDuJour(j), se = ctx.seances.filter(s => s.date === j);
      h += '<div class="' + cls.join(' ') + '" data-jour="' + j + '"><span class="cal-m-num' + (j === auj ? ' auj' : '') + '">' + d.getDate() + '</span>' +
        '<span class="cal-m-txt">' + cs.map(cc.courseHtml).join('') + rdv.map(c => cc.rdvHtml(c, true)).join('') + se.map(cc.seanceHtml).join('') + (o.plus ? o.plus(j) : '') + '</span>' +
        // Téléphone : des repères à la place du texte (barre de la course, point par séance, losange du rendez-vous).
        '<span class="cal-m-points" aria-hidden="true">' + cs.map(c => '<i class="barre ' + couleur(c) + '"></i>').join('') +
        se.map(s => '<i class="pt' + (s.faite ? ' faite' : '') + '"></i>').join('') + rdv.map(() => '<i class="rdv">◆</i>').join('') + '</span>' + cc.plusHtml(j) + '</div>';
    }
    return h + '</div>';
  }
  window.mrtGrilleMois = grilleMois;

  window.renderCalendrier = function (root, ctx) {
    const mobile = window.matchMedia('(max-width: 600px)');
    const ecrit = () => !ctx.lectureSeule;

    // Vue de l'adresse ; sans adresse, la semaine en cours (vue par défaut).
    function lireHash() {
      const [k, v] = location.hash.replace(/^#/, '').split('=');
      if (k === 'annee' || k === 'mois') return { v: k, mois: /^\d{4}-\d\d$/.test(v || '') ? v : moisCourant() };
      return { v: 'semaines', lundi: lundiDe(/^\d{4}-\d\d-\d\d$/.test(v || '') ? v : iso(new Date())) };
    }

    // Relit les données, puis redessine la vue (à la même place).
    ctx.actualiser = async () => {
      Object.assign(ctx, await ctx.relire());
      dessiner();
    };

    // ----- Éléments communs -----
    // Barre du haut : le menu « Périodicité » (son bouton porte la vue ouverte) à gauche ; le bouton « Plan » et « Aujourd'hui » à droite.
    // Année : la durée choisie (3, 6 ou 12 mois) est un choix du menu ; depart garde le premier mois affiché.
    const haut = (vue, depart) => {
      const est = x => x[0] === vue && (vue !== 'annee' || Number(x[2]) === periode());
      const nom = VUES.find(est)[1], plan = phasesVisibles();
      return '<div class="cal-haut"><div class="cal-periodicite">' +
        '<button type="button" class="mrt-btn cal-menu-btn" data-menu aria-expanded="false" aria-controls="cal-menu" aria-label="Périodicité : ' + nom + '">' + nom + CHEVRON + '</button>' +
        '<nav class="cal-menu" id="cal-menu" aria-label="Périodicité" hidden><span class="cal-libelle">Périodicité</span>' + VUES.map(x =>
          '<a href="#' + x[0] + (x[2] && depart ? '=' + depart : '') + '" data-vue="' + x[0] + '"' + (x[2] ? ' data-periode="' + x[2] + '"' : '') +
          (est(x) ? ' class="is-on" aria-current="true"' : '') + '>' + x[1] + '</a>').join('') + '</nav></div>' +
        '<div class="cal-options"><button type="button" class="mrt-btn cal-plan' + (plan ? ' is-actif' : '') + '" data-plan aria-pressed="' + plan + '" title="Phases de prépa">Plan</button>' +
        '<button type="button" class="mrt-btn cal-auj" data-auj>Aujourd\'hui</button></div></div>';
    };
    // Période (Année, Mois) : titre au centre, la période voisine et sa flèche de chaque côté.
    const bande = (titre, sous, avant, apres) => '<div class="cal-periode">' +
      '<a class="cal-voisin" href="' + avant[1] + '" aria-label="' + avant[2] + '"><span class="mrt-rond">' + window.mrtIcone.gauche + '</span><span class="cal-voisin-txt">' + avant[0] + '</span></a>' +
      '<div class="cal-titre-bloc"><h2 class="cal-titre">' + titre + '</h2>' + (sous || '') + '</div>' +
      '<a class="cal-voisin is-suiv" href="' + apres[1] + '" aria-label="' + apres[2] + '"><span class="cal-voisin-txt">' + apres[0] + '</span><span class="mrt-rond">' + window.mrtIcone.droite + '</span></a></div>';
    const legendePhases = () => '<span class="cal-groupe"><b class="cal-libelle">Phases</b>' + PHASES.concat([['recuperation', NOM_PHASE.recuperation]]).map(([k, nom]) => '<span><i class="cal-k ph-' + k + '"></i>' + nom + '</span>').join('') + '</span>';
    // Phase d'un jour : celle de sa semaine dans le plan de saison (spécification Préparation, § 4) ; l'Entretien n'a pas de fond.
    const phaseDuJour = (ps, jour) => { const x = ps && phaseDe(ps, lundiDe(jour)); return x && x.phase !== 'entretien' ? x.phase : null; };
    const { rdvDuJour, rdvHtml, courseHtml, seanceHtml, plusHtml } = contenus(ctx);

    // ----- Année : la grille, jours en lignes et mois en colonnes, sur 3, 6 ou 12 mois (spécification § 3) ;
    // chaque mois a ses jours (initiale et numéro), samedi et dimanche plus foncés, un filet sous chaque dimanche. -----
    function vueAnnee(depart, nb) {
      const auj = iso(new Date()), phases = phasesVisibles();
      const mois = Array.from({ length: nb }, (_, i) => new Date(an(depart), rang(depart) + i, 1));
      const debut = iso(mois[0]), fin = iso(new Date(an(depart), rang(depart) + nb, 0));
      const ensuite = visibles(ctx.courses, debut, '9999-12-31', auj), liste = ensuite.filter(c => c.date <= fin);
      const plans = phases ? planSaison(ctx) : null; // fond de chaque jour : la phase de sa semaine dans le plan de saison
      const taille = mobile.matches ? 3 : Math.min(6, nb);
      let h = '';
      for (let i = 0; i < nb; i += taille) {
        const cols = mois.slice(i, i + taille);
        // En tête de chaque mois, son onglet (le mois en cours en Accent), au-dessus de ses cases ; la colonne des jours à sa gauche.
        h += '<div class="cal-a-bloc" style="--n:' + cols.length + '">' + cols.map(m => '<span></span><b class="cal-a-mois' + (iso(m).slice(0, 7) === auj.slice(0, 7) ? ' is-courant' : '') + '">' + MOIS[m.getMonth()] +
          (m.getMonth() === 0 || m.getTime() === mois[0].getTime() ? ' <i>' + String(m.getFullYear()).slice(2) + '</i>' : '') + '</b>').join('');
        for (let d = 1; d <= 31; d++) {
          cols.forEach(m => {
            if (d > new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()) { h += '<span class="cal-a-n"></span><span class="cal-a-j vide"></span>'; return; }
            const date = new Date(m.getFullYear(), m.getMonth(), d), sj = date.getDay(), j = iso(date), c = liste.find(x => x.date === j), cls = ['cal-a-j'], tip = [longue(j)];
            h += '<span class="cal-a-n' + (j === auj ? ' auj' : '') + '"><i>' + INITIALE[sj] + '</i><b>' + d + '</b></span>';
            if (sj === 0 || sj === 6) cls.push('we');
            if (sj === 0) cls.push('dim');
            if (j === auj) { cls.push('auj'); tip.push('aujourd\'hui'); }
            if (c) { cls.push(couleur(c)); tip.push(c.nom + ' · ' + (c.courue ? 'courue' : c.validee ? 'confirmée' : 'en option')); }
            const ph = phaseDuJour(plans, j);
            if (ph) { cls.push('ph-' + ph); tip.push(NOM_PHASE[ph]); }
            // Séances du jour : leur type en toutes lettres (« Course à pied · Renforcement »), atténué et barré quand elles sont faites ; une course l'emporte sur la case.
            const se = ctx.seances.filter(x => x.date === j);
            se.forEach(x => tip.push(TYPES[x.type] + ' ' + x.libelle + (x.faite ? ' (faite)' : '')));
            h += '<span class="' + cls.join(' ') + '" data-jour="' + j + '"' + (c ? ' data-course="' + esc(c.id) + '"' : '') + ' title="' + esc(tip.join(' · ')) + '">' +
              (c ? '<span class="cal-a-nom">' + esc(c.nom) + '</span>' : se.length ? '<span class="cal-a-nom cal-a-se' + (se.every(x => x.faite) ? ' faite' : '') + '">' + se.map(x => TYPES[x.type]).filter((t, i, a) => a.indexOf(t) === i).join(' · ') + '</span>' : '') + '</span>';
          });
        }
        h += '</div>';
      }
      const titre = (m, n, court) => {
        const f = decaler(m, n - 1);
        if (court) return MOIS[rang(m)] + '–' + MOIS[rang(f)] + ' ' + String(an(f)).slice(2); // « avr.–sept. 27 » : l'année distingue les deux voisines
        return an(m) === an(f) ? cap(MOIS_LONG[rang(m)]) + ' – ' + MOIS_LONG[rang(f)] + ' ' + an(m) : cap(MOIS_LONG[rang(m)]) + ' ' + an(m) + ' – ' + MOIS_LONG[rang(f)] + ' ' + an(f);
      };
      const famille = (nom, f) => '<span class="cal-groupe"><b class="cal-libelle">' + nom + '</b><span><i class="cal-k c-' + f + '-v"></i>Confirmée</span><span><i class="cal-k c-' + f + '-n"></i>Option</span></span>';
      return haut('annee', depart) + bande(titre(depart, nb), '', [titre(decaler(depart, -nb), nb, true), '#annee=' + decaler(depart, -nb), 'Période précédente'],
        [titre(decaler(depart, nb), nb, true), '#annee=' + decaler(depart, nb), 'Période suivante']) +
        '<div class="cal-legende">' + famille('Route', 'route') + famille('Trail', 'trail') + '<span><i class="cal-k courue"></i>Courue</span><span><i class="cal-k cal-k-auj"></i>Aujourd\'hui</span>' +
        (phases ? legendePhases() : '') + '</div><div class="cal-a-blocs">' + h + '</div>';
    }

    // ----- Mois : la grille du mois, mois par mois (spécification § 4.1 et 4.2) -----
    function vueMois(m) {
      const auj = iso(new Date()), phases = phasesVisibles();
      const debut = lundiDe(m + '-01'), fin = addDays(lundiDe(iso(new Date(an(m), rang(m) + 1, 0))), 6);
      const courses = visibles(ctx.courses, debut, fin, auj), plans = phases ? planSaison(ctx) : null;
      const h = grilleMois(ctx, debut, fin, { ps: plans, mois: rang(m) });
      const court = x => MOIS[rang(x)] + (an(x) !== an(m) ? ' ' + String(an(x)).slice(2) : '');
      return haut('mois') + bande(cap(MOIS_LONG[rang(m)]) + ' ' + an(m), '', [court(decaler(m, -1)), '#mois=' + decaler(m, -1), 'Mois précédent'],
        [court(decaler(m, 1)), '#mois=' + decaler(m, 1), 'Mois suivant']) + (phases ? '<div class="cal-legende">' + legendePhases() + '</div>' : '') + h;
    }

    // ----- Semaine : un jour par ligne ; les semaines suivantes au fil du défilement, les passées par un lien (spécification § 4.3 et 4.4) -----
    const liste = { cle: null, debut: null, nb: 3 }; // semaines affichées : la première, leur nombre
    // « Semaine du 26 oct. au 1er nov. », l'année de fin quand ce n'est pas l'année en cours (formats communs, comme la préparation).
    const titreSemaine = l => 'Semaine ' + window.mrtFormat.semaine(l, { annee: true });
    function semaineHtml(l, plans) {
      const auj = iso(new Date()), ph = phaseDuJour(plans, l), courses = visibles(ctx.courses, l, addDays(l, 6), auj);
      let h = '<section class="cal-s-semaine' + (l === lundiDe(auj) ? ' is-courante' : '') + '" data-semaine="' + l + '"><h3 class="cal-s-titre cal-libelle">' + titreSemaine(l) + '</h3><div class="cal-s-jours">';
      for (let i = 0; i < 7; i++) {
        const j = addDays(l, i), d = parse(j), cls = ['cal-s-ligne'];
        if (j < auj) cls.push('passe');
        if (ph) cls.push('ph-' + ph);
        if (j === auj) cls.push('auj');
        h += '<div class="' + cls.join(' ') + '" data-jour-ligne="' + j + '"><span class="cal-s-date"><b>' + d.getDate() + '</b><small>' + JOURS[d.getDay()] + '</small></span><span class="cal-s-contenu">' +
          courses.filter(c => c.date === j).map(courseHtml).join('') + rdvDuJour(j).map(c => rdvHtml(c, false)).join('') + ctx.seances.filter(s => s.date === j).map(seanceHtml).join('') +
          '</span>' + plusHtml(j) + '</div>';
      }
      return h + '</div></section>';
    }
    function vueSemaine() {
      const phases = phasesVisibles(), plans = phases ? planSaison(ctx) : null;
      let h = haut('semaines') + '<div class="cal-sep"></div>' + (phases ? '<div class="cal-legende">' + legendePhases() + '</div>' : '') +
        '<button type="button" class="mrt-lien cal-passees" data-passees>↑ Afficher les semaines passées</button>';
      for (let i = 0; i < liste.nb; i++) h += semaineHtml(addDays(liste.debut, 7 * i), plans);
      return h + '<div class="cal-fin" aria-hidden="true"></div>';
    }

    // ----- Affichage et événements -----
    let vueDessinee = null;
    function dessiner() {
      const vue = lireHash();
      let h;
      if (vue.v === 'annee') h = vueAnnee(vue.mois, periode());
      else if (vue.v === 'mois') h = vueMois(vue.mois);
      else {
        if (liste.cle !== vue.lundi) { liste.cle = vue.lundi; liste.debut = vue.lundi; liste.nb = 3; }
        h = vueSemaine();
      }
      root.innerHTML = '<div class="cal-cadre cal-vue-' + vue.v + '">' + h + '</div>';
      // Semaine : quand le bas de la liste approche de l'écran, deux semaines de plus.
      if (observateur) { observateur.disconnect(); const f = root.querySelector('.cal-fin'); if (f) observateur.observe(f); }
      const change = vueDessinee !== null && vueDessinee !== vue.v;
      vueDessinee = vue.v;
      return change;
    }
    const observateur = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
      if (lireHash().v === 'semaines' && es.some(x => x.isIntersecting) && liste.nb < 104) { liste.nb += 2; dessiner(); }
    }, { rootMargin: '300px' }) : null;

    // Menu « Périodicité » : un toucher sur son bouton l'ouvre ou le ferme ; il se ferme aussi au choix, en touchant ailleurs, par Échap.
    const menu = () => root.querySelector('.cal-menu');
    function ouvrirMenu(ouvert) {
      const m = menu(), b = root.querySelector('[data-menu]');
      if (!m || m.hidden === !ouvert) return;
      m.hidden = !ouvert; b.setAttribute('aria-expanded', String(ouvert));
    }
    document.addEventListener('click', e => { if (!e.target.closest('.cal-periodicite')) ouvrirMenu(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu() && !menu().hidden) { ouvrirMenu(false); root.querySelector('[data-menu]').focus(); }
    });

    root.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-menu]')) {
        ouvrirMenu(menu().hidden);
        if (!menu().hidden && e.detail === 0) menu().querySelector('a.is-on').focus(); // ouvert au clavier : le choix en cours
        return;
      }
      const lien = t.closest('.cal-menu a');
      if (lien) {
        // Le lien change l'adresse, la vue suit ; un choix de durée (Année) est retenu sur l'appareil, et redessine même à adresse égale.
        ouvrirMenu(false);
        if (lien.dataset.periode) {
          e.preventDefault(); ranger('mrt-calendrier-mois', lien.dataset.periode);
          const cible = lien.getAttribute('href');
          if (location.hash !== cible) location.hash = cible; else dessiner();
        }
        return;
      }
      if (t.closest('[data-plan]')) { ranger('mrt-calendrier-phases', phasesVisibles() ? '0' : '1'); dessiner(); return; }
      if (t.closest('[data-passees]')) {
        // Quatre semaines passées de plus, au-dessus, sans que la semaine regardée ne bouge à l'écran.
        const ref = root.querySelector('.cal-s-semaine'), haut0 = ref.getBoundingClientRect().top, l = ref.dataset.semaine;
        liste.debut = addDays(liste.debut, -28); liste.nb += 4; dessiner();
        const apres = root.querySelector('[data-semaine="' + l + '"]');
        if (apres) window.scrollBy(0, apres.getBoundingClientRect().top - haut0);
        return;
      }
      if (t.closest('[data-auj]')) {
        const cible = '#' + lireHash().v;
        liste.cle = null;
        if (location.hash !== cible) location.hash = cible; else dessiner();
        window.scrollTo(0, 0);
        return;
      }
      // Liens (course : sa page en modale ; flèches : l'adresse), case « faite », séance et « + » (preparation.js) : rien de plus ici.
      if (t.closest('a, input, label, button')) return;
      // Année : une course touchée ouvre sa page (une course courue : son résultat) ; un jour touché (Année, Mois), la vue Semaine de ce jour.
      const course = t.closest('[data-course]');
      if (course) {
        const ancre = course.classList.contains('courue') ? '' : '#preparation';
        if (window.mrtOuvrirCourse) window.mrtOuvrirCourse(course.dataset.course, ancre); else location.href = lienCourse(course.dataset.course).replace(/#.*/, ancre);
        return;
      }
      const jour = t.closest('[data-jour]');
      if (jour) location.hash = '#semaines=' + lundiDe(jour.dataset.jour);
    });
    P.brancher(root, ctx, null);
    window.addEventListener('hashchange', () => { if (dessiner()) window.scrollTo(0, 0); });
    if (mobile.addEventListener) mobile.addEventListener('change', () => { if (lireHash().v === 'annee') dessiner(); });
    dessiner();
  };
})();
