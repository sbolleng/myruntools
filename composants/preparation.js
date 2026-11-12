// ===== Préparation d'une course : plan, phases, séances =====
//
// Composant partagé par le Calendrier (vue 4 semaines) et la page d'une course
// (rubrique Préparation) : docs/module-calendrier-specification.md, § 4 et 5.
//   ctx.courses       courses de l'utilisateur (donnees.js)
//   ctx.seances       séances saisies à la main
//   ctx.semaines      semaines dont la phase a été modifiée à la main
//   ctx.lectureSeule  site partagé : rien ne se saisit ni ne se modifie
//   ctx.relire()      relit les données, rend { courses, seances, semaines }
//   ctx.actualiser()  relit puis redessine la page (fourni par la page)
(function () {
  // Noms des mois et des jours, dates : les formats communs (en-tete.js, mrtFormat) ; le 1er du mois s'écrit « 1er ».
  const F = window.mrtFormat, { MOIS, JOURS } = F;
  // Phases d'un plan (au choix dans « Paramétrer le plan ») ; hors saison, deux phases de plus (spécification Préparation, § 4).
  const PHASES = [['base', 'Base'], ['developpement', 'Développement'], ['affutage', 'Affûtage'], ['deload', 'Deload']];
  const NOM_PHASE = Object.assign(Object.fromEntries(PHASES), { recuperation: 'Récupération', entretien: 'Entretien' });

  // Types de séance, en toutes lettres : pour en ajouter un (vélo, tapis…), une ligne ici et une évolution SQL (valeur de `seance_type`) ; la fenêtre de saisie et les vues les reprennent seules.
  const TYPES = { run: 'Course à pied', renfo: 'Renforcement' };
  // Intensité d'une séance (facultative) : une séance facile est la seule permise pendant une récupération (spécification Préparation, § 3.3).
  const INTENSITES = { facile: 'Facile', moderee: 'Modérée', intense: 'Intense' };
  // Nombre saisi (virgule acceptée) ; vide : null ; illisible : NaN.
  const nombre = v => { const t = String(v == null ? '' : v).trim().replace(',', '.'); return t === '' ? null : /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN; };

  // Dates en heure locale, au format 'AAAA-MM-JJ' : comparables comme du texte.
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const lundiDe = s => addDays(s, -((parse(s).getDay() + 6) % 7));
  const jourCourt = s => JOURS[parse(s).getDay()] + ' ' + F.jour(parse(s).getDate());
  const dateCourte = s => F.date(s, { annee: false });
  const longue = s => F.date(s, { semaine: true });
  const courte = s => F.date(s);
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const famille = c => (c.type === 'trail' ? 'trail' : 'route');
  // Curseurs : le bouton qui règle le plan.
  const REGLAGES = '<svg class="cal-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h12M2 11.5h12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="4.5" r="2" fill="currentColor"/><circle cx="6" cy="11.5" r="2" fill="currentColor"/></svg>';
  // Page d'une course (modale), à la rubrique Préparation.
  const lienCourse = id => 'course.html?id=' + encodeURIComponent(id) + '#preparation';
  // Chevron des titres repliables (le même que sur la page d'une course) ; poubelle de « Supprimer ».
  const CHEVRON = window.mrtIcone.chevron; // chevron commun des titres repliables (mrt-chev)
  const POUBELLE = '<svg class="cal-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ----- Plan d'une course : règles générales (spécification du Calendrier, § 5.1) -----

  // Phase de chaque semaine d'un plan de n semaines : affûtage sur les deux dernières, deload toutes les quatre,
  // le reste réparti par moitié entre base (arrondie à l'inférieur) et développement.
  function phasesRegle(n) {
    const ph = [];
    for (let i = 1; i <= n; i++) ph.push(i > n - 2 ? 'affutage' : i % 4 === 0 ? 'deload' : null);
    const reste = ph.filter(p => !p).length;
    let k = 0;
    return ph.map(p => p || (k++ < Math.floor(reste / 2) ? 'base' : 'developpement'));
  }

  // Plan d'une course : durée en semaines complètes lundi-dimanche, la dernière étant celle du jour J.
  // modifs : Map lundi → phase choisie à la main.
  function planDe(c, modifs, duree) {
    const n = duree || c.prepaSemaines;
    if (!n || !c.date) return null;
    const premier = addDays(lundiDe(c.date), -7 * (n - 1));
    return { course: c, n, premier, jourJ: c.date, semaines: phasesRegle(n).map((regle, i) => {
      const lundi = addDays(premier, 7 * i), choisie = modifs && modifs.get(lundi);
      return { n: i + 1, lundi, regle, phase: choisie || regle, modifiee: !!choisie && choisie !== regle };
    }) };
  }

  const modifsDe = (semaines, id) => new Map((semaines || []).filter(x => x.course === id).map(x => [x.lundi, x.phase]));
  // Les plans de l'ensemble du calendrier sont ceux des courses confirmées ; une option a son plan, mais seule.
  const confirmee = c => c.statut === 'confirmee' && c.etat === 'a_venir' && !!c.date;
  const aPlan = c => (c.statut === 'confirmee' || c.statut === 'option') && c.etat === 'a_venir' && !!c.date;
  const tousLesPlans = ctx => ctx.courses.filter(confirmee).map(c => planDe(c, modifsDe(ctx.semaines, c.id))).filter(Boolean);

  // Courses affichées dans la fenêtre : confirmées et options à venir (une option passée disparaît),
  // courues (grisées). Ni repérées, ni abandonnées.
  function visibles(courses, debut, fin, auj) {
    return courses.filter(c => c.date && c.date >= debut && c.date <= fin && (c.etat === 'courue' ||
      (c.etat === 'a_venir' && (c.statut === 'confirmee' || (c.statut === 'option' && c.date >= auj)))))
      .map(c => {
        const semaines = c.prepaSemaines || null; // celle de la course, sinon celle de son format
        return {
          id: c.id, date: c.date, nom: c.course,
          famille: famille(c),
          validee: c.statut === 'confirmee',
          courue: c.etat === 'courue',
          semaines,
          debutPrepa: semaines && c.etat !== 'courue' ? addDays(lundiDe(c.date), -7 * (semaines - 1)) : null
        };
      });
  }

  // Phase d'une semaine pour l'ensemble du calendrier : le plan de la course confirmée la plus proche qui la couvre.
  function phaseSemaine(lundi, plans) {
    const couvrent = plans.filter(p => lundi >= p.premier && lundi <= lundiDe(p.jourJ)).sort((a, b) => (a.jourJ < b.jourJ ? -1 : 1));
    if (!couvrent.length) return null;
    const w = couvrent[0].semaines.find(s => s.lundi === lundi);
    return { phase: w.phase, modifiee: w.modifiee, autres: couvrent.slice(1) };
  }

  // Plans (des courses confirmées) qui couvrent une semaine, du jour J le plus proche au plus lointain :
  // le premier est celui que l'on suit ; pour chacun, le numéro de la semaine dans le plan et sa phase.
  function plansDeLaSemaine(lundi, plans) {
    return plans.filter(p => lundi >= p.premier && lundi <= lundiDe(p.jourJ)).sort((a, b) => (a.jourJ < b.jourJ ? -1 : 1)).map(p => {
      const w = p.semaines.find(s => s.lundi === lundi);
      return { plan: p, n: w.n, phase: w.phase, modifiee: w.modifiee };
    });
  }


  // ----- Plan de saison : une saison par Objectif, les autres courses insérées selon leur rôle (spécification Préparation, § 2 à 4) -----

  // Rôle dans le plan : l'ancien « objectif intermédiaire » compte comme un Objectif.
  const roleDe = c => (c.role === 'objectif_intermediaire' ? 'objectif' : c.role);
  // Kilomètres-effort : la distance, plus le dénivelé positif compté 1 km pour 100 m ; jours de récupération : un par mile.
  const kmEffort = c => (Number(c.distance) || 0) + (Number(c.dplus) || 0) / 100;
  const joursRecup = c => Math.round(kmEffort(c) / 1.609);
  const ECART_OBJECTIFS = 12; // semaines au moins entre deux Objectifs
  const ecartJours = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

  // La saison de chaque Objectif confirmé et à venir (le plan de sa course, raccourci s'il commence avant l'Objectif précédent),
  // les repères des courses (jours allégés, repos de la veille, récupération), et les alertes.
  function planSaison(ctx) {
    const confirmees = ctx.courses.filter(c => c.statut === 'confirmee' && c.date && (c.etat === 'a_venir' || c.etat === 'courue'));
    const objectifs = confirmees.filter(c => c.etat === 'a_venir' && roleDe(c) === 'objectif').sort((a, b) => (a.date < b.date ? -1 : 1));
    const saisons = [], alertes = [];
    let avant = null;
    objectifs.forEach(c => {
      if (avant && ecartJours(avant.date, c.date) < ECART_OBJECTIFS * 7)
        alertes.push({ type: 'proches', course: c, autre: avant, semaines: Math.floor(ecartJours(avant.date, c.date) / 7) });
      const plan = planDe(c, modifsDe(ctx.semaines, c.id));
      if (plan) {
        // Commencée avant l'Objectif précédent : elle part de la semaine qui le suit ; la base se réduit la première.
        const depart = avant ? addDays(lundiDe(avant.date), 7) : null;
        const semaines = depart && plan.premier < depart ? plan.semaines.filter(w => w.lundi >= depart) : plan.semaines;
        if (semaines.length) saisons.push({ course: c, plan, semaines, premier: semaines[0].lundi, jourJ: c.date, raccourcie: semaines.length < plan.semaines.length,
          affutage: (semaines.find(w => w.phase === 'affutage') || {}).lundi || null });
      }
      avant = c;
    });
    const saisonDe = jour => saisons.find(x => jour >= x.premier && jour <= x.jourJ) || null;
    // Repères : récupération après toute course (même courue) ; jours allégés avant une Préparatoire ; repos la veille d'une Plaisir.
    const reperes = confirmees.filter(c => roleDe(c) !== 'objectif' || c.etat === 'a_venir' || c.etat === 'courue').map(c => {
      const role = roleDe(c), r = { course: c, role, recupDebut: addDays(c.date, 1), recupFin: addDays(c.date, joursRecup(c)), jours: joursRecup(c) };
      if (c.etat === 'a_venir' && role === 'preparatoire') { r.allegeDebut = addDays(c.date, -3); r.allegeFin = addDays(c.date, -1); }
      if (c.etat === 'a_venir' && role === 'plaisir') r.repos = addDays(c.date, -1);
      return r;
    });
    // Alertes des autres courses à venir, par rapport à l'Objectif de leur saison (ou au suivant).
    reperes.filter(r => r.role !== 'objectif' && r.course.etat === 'a_venir').forEach(r => {
      const c = r.course, sx = saisons.find(x => x.jourJ >= c.date);
      if (!sx) return;
      if (sx.affutage && r.recupFin >= sx.affutage && c.date < sx.jourJ) alertes.push({ type: 'recup-affutage', course: c, autre: sx.course, fin: r.recupFin, affutage: sx.affutage });
      const mini = Number(sx.course.distance) >= 42 ? 21 : 14;
      if (r.role === 'preparatoire' && ecartJours(c.date, sx.jourJ) < mini) alertes.push({ type: 'prepa-proche', course: c, autre: sx.course, jours: ecartJours(c.date, sx.jourJ), conseillees: mini / 7 });
      if (c.date >= sx.premier && kmEffort(c) > kmEffort(sx.course)) alertes.push({ type: 'plus-longue', course: c, autre: sx.course });
    });
    return { saisons, reperes, alertes, saisonDe };
  }

  // Phase d'une semaine dans le plan de saison : celle de sa saison ; hors saison, Récupération (la récupération d'un Objectif
  // couvre un de ses jours) puis Entretien jusqu'à la saison suivante ; après le dernier Objectif, rien.
  function phaseDe(ps, lundi) {
    const dimanche = addDays(lundi, 6);
    const sx = ps.saisons.find(x => lundi >= x.premier && lundi <= lundiDe(x.jourJ));
    if (sx) { const w = sx.semaines.find(x => x.lundi === lundi); return { phase: w.phase, n: w.n, modifiee: w.modifiee, saison: sx }; }
    const recup = ps.reperes.find(r => r.role === 'objectif' && r.recupDebut <= dimanche && r.recupFin >= lundi && lundi > r.course.date);
    if (recup) return { phase: 'recuperation', saison: null, apres: recup.course };
    const suivante = ps.saisons.find(x => x.premier > lundi);
    return suivante ? { phase: 'entretien', saison: null, vers: suivante } : null;
  }

  // Repères d'un jour : allégé (avant une Préparatoire), repos (veille d'une Plaisir), récupération (après une course).
  const reperesDuJour = (ps, jour) => ps.reperes.flatMap(r => [
    r.allegeDebut && jour >= r.allegeDebut && jour <= r.allegeFin ? { type: 'allege', course: r.course } : null,
    r.repos === jour ? { type: 'repos', course: r.course } : null,
    jour >= r.recupDebut && jour <= r.recupFin ? { type: 'recup', course: r.course, fin: r.recupFin } : null
  ]).filter(Boolean);

  const ecriture = ctx => !ctx.lectureSeule;

  // ----- Une semaine : jours, séances, courses, rendez-vous clés -----
  // opts : { phase, numero, modifiee, autres, liens } ; liens === false : le jour de course n'est pas un lien (déjà sur sa page).
  function semaineHtml(ctx, lundi, opts) {
    const auj = iso(new Date());
    const courses = visibles(ctx.courses, lundi, addDays(lundi, 6), auj);
    const autres = opts.autres || [];
    let jours = '';
    for (let i = 0; i < 7; i++) {
      const jour = addDays(lundi, i), d = parse(jour);
      const cls = ['cal-jr'];
      if (d.getDay() === 0 || d.getDay() === 6) cls.push('we');
      if (jour < auj) cls.push('passe');
      if (jour === auj) cls.push('auj');
      // Jour de course : un lien vers sa page (une course courue : son résultat), sauf sur la page de la course elle-même.
      const courseJour = courses.filter(c => c.date === jour).map(c => {
        const cls = 'cal-jr-course ' + (c.courue ? 'courue' : 'c-' + c.famille + (c.validee ? '-v' : '-n'));
        return opts.liens === false ? '<span class="' + cls + '">' + esc(c.nom) + '</span>'
          : '<a class="' + cls + '" href="' + (c.courue ? lienCourse(c.id).replace(/#.*/, '') : lienCourse(c.id)) + '">' + esc(c.nom) + '</a>';
      }).join('');
      const rdv = ctx.courses.filter(c => aPlan(c) && c.ouverture_inscriptions === jour).map(c =>
        opts.liens === false ? '<span class="cal-rdv">◆ Ouverture des inscriptions · ' + esc(c.course) + '</span>'
          : '<a class="cal-rdv" href="' + lienCourse(c.id) + '">◆ Ouverture des inscriptions · ' + esc(c.course) + '</a>').join('');
      const seances = ctx.seances.filter(s => s.date === jour).map(s =>
        '<div class="cal-se' + (s.faite ? ' faite' : '') + '"><input type="checkbox" data-fait="' + esc(s.id) + '"' + (s.faite ? ' checked' : '') + (ecriture(ctx) ? '' : ' disabled') +
        ' aria-label="Faite">' + (ecriture(ctx)
          ? '<button type="button" class="cal-se-txt" data-edit="' + esc(s.id) + '"><b>' + TYPES[s.type] + '</b> ' + esc(s.libelle) + '</button>'
          : '<span class="cal-se-txt"><b>' + TYPES[s.type] + '</b> ' + esc(s.libelle) + '</span>') + '</div>').join('');
      jours += '<div class="' + cls.join(' ') + '"><span class="cal-jr-nom">' + jourCourt(jour) + '</span>' + courseJour + rdv + seances +
        (ecriture(ctx) ? '<button type="button" class="mrt-rond is-petit cal-plus" data-ajout="' + jour + '" aria-label="Ajouter une séance le ' + longue(jour) + '">' + window.mrtIcone.plus + '</button>' : '') + '</div>';
    }
    // « Semaine 1 · du 16 au 22 nov. » ; sans numéro : « Semaine du 16 au 22 nov. », comme au Calendrier.
    const titre = (opts.numero ? 'Semaine ' + opts.numero + ' · ' : 'Semaine ') + F.semaine(lundi);
    const noms = autres.map(p => p.course.course).join(', ');
    return '<section class="cal-sem ' + (opts.phase ? 'ph-' + opts.phase : 'sans') + '" data-lundi="' + lundi + '"><div class="cal-sem-haut"><h3 class="cal-sem-titre">' + titre + '</h3>' +
      '<span class="cal-sem-phase">' + (opts.phase ? NOM_PHASE[opts.phase] + (opts.modifiee ? ' · modifiée' : '') : 'Sans objectif clair') + '</span>' +
      (autres.length ? '<span class="cal-aussi" title="Semaine aussi dans le plan de : ' + esc(noms) + '">aussi : ' + esc(noms) + '</span>' : '') +
      '</div><div class="cal-sem-jours">' + jours + '</div></section>';
  }

  // Phases consécutives regroupées, une case par groupe, large de ses semaines ; une poignée entre deux cases en édition.
  function frise(plan, interactive) {
    const groupes = [];
    plan.semaines.forEach((s, i) => {
      const g = groupes[groupes.length - 1];
      if (g && g.phase === s.phase) g.fin = i; else groupes.push({ phase: s.phase, debut: i, fin: i });
    });
    return '<div class="cal-frise-defile"><div class="cal-frise' + (interactive ? ' is-edit' : '') + '" style="--n:' + plan.semaines.length + '">' + groupes.map((g, k) =>
      (interactive && k > 0 ? '<i class="cal-poignee" data-bord="' + g.debut + '" title="Glisser pour déplacer la limite"></i>' : '') +
      '<span class="cal-seg ph-' + g.phase + '" style="flex:' + (g.fin - g.debut + 1) + '" title="' + NOM_PHASE[g.phase] + ' : ' + (g.fin - g.debut + 1) + ' sem.">' +
      '<b>' + NOM_PHASE[g.phase] + '</b><small>' + (g.fin - g.debut + 1) + ' sem.</small></span>').join('') + '</div></div>';
  }

  // ----- Avis sur une course et préparatoire conseillée (spécification Préparation, § 3.5) -----
  // Sources (usages d'entraîneurs, pas des études) : une course de la moitié de l'Objectif environ, quelques semaines avant.
  const SRC = {
    norris: ['Laura Norris', 'https://lauranorrisrunning.com/tune-up-races/'],
    mh: ['Marathon Handbook', 'https://marathonhandbook.com/tune-up-race/'],
    recup: ['Trainingplan.dev', 'https://www.trainingplan.dev/blog/posts/post-race-recovery'],
    bosquet: ['Bosquet, 2007', 'https://pubmed.ncbi.nlm.nih.gov/17762369/'],
    parry: ['Coach Parry', 'https://blog.coachparry.com/how-many-marathons-should-you-run-in-a-year-the-truth/']
  };
  // Préparatoire conseillée avant un Objectif : sa distance et sa fenêtre (semaines avant le jour J) ; null : aucune source.
  // Vérifié sur les pages entières (12 nov. 2026) : la moitié de l'Objectif environ, ou un peu plus (Marathon Handbook) ;
  // semi : 10 ou 15 km, 3 à 6 semaines avant ; marathon : semi, 4 à 6 semaines (Marathon Handbook ; 4 à 8 chez Laura Norris) ;
  // ultra : par exemple un 50 km avant un 100 km, 4 à 8 semaines avant (Laura Norris).
  function fenetreConseillee(o) {
    const d = Number(o.distance) || 0;
    if (famille(o) === 'trail') {
      if (d >= 130) return { texte: 'un trail d\'environ 80 km, sur un terrain proche', min: 4, max: 8, sources: [SRC.mh, SRC.norris] };
      if (d >= 60) return { texte: 'un trail d\'environ 50 km, sur un terrain proche', min: 4, max: 8, sources: [SRC.norris, SRC.mh] };
      if (d >= 42) return { texte: 'un trail de 21 à 30 km, sur un terrain proche', min: 4, max: 6, sources: [SRC.mh, SRC.norris] };
      return null;
    }
    if (d >= 42) return { texte: 'un semi-marathon', min: 4, max: 6, sources: [SRC.mh, SRC.norris] };
    if (d >= 21) return { texte: 'un 10 km ou un 15 km', min: 3, max: 6, sources: [SRC.norris, SRC.mh] };
    return null;
  }
  const SOURCES_ALERTE = { 'recup-affutage': [SRC.recup, SRC.bosquet], 'prepa-proche': [SRC.mh, SRC.norris], 'plus-longue': [], proches: [SRC.parry] };
  // Texte d'une alerte (§ 3.4) : une ligne, le fait et, entre parenthèses, ce qui est conseillé ; nom(c) écrit le nom d'une course.
  function texteAlerte(a, nom) {
    if (a.type === 'proches') return nom(a.autre) + ' et ' + nom(a.course) + ' : ' + a.semaines + ' semaines d\'écart (12 conseillées)';
    if (a.type === 'recup-affutage') return nom(a.course) + ' : récupération jusqu\'au ' + longue(a.fin) + ', sur l\'affûtage de ' + nom(a.autre);
    if (a.type === 'prepa-proche') return nom(a.course) + ' : à ' + a.jours + ' jours de ' + nom(a.autre) + ' (' + a.conseillees + ' semaines conseillées)';
    return nom(a.course) + ' est plus longue que ' + nom(a.autre);
  }
  // Une option est jugée comme si elle était confirmée : c'est ce qui aide à décider.
  const avecCourse = (ctx, c) => Object.assign({}, ctx, { courses: ctx.courses.filter(x => x.id !== c.id).concat([Object.assign({}, c, { statut: 'confirmee' })]) });
  const aJuger = c => !!c.date && c.etat === 'a_venir' && (c.statut === 'confirmee' || c.statut === 'option');
  // Avis sur une course à venir qui n'est pas un Objectif : conseillee, possible ou deconseillee (null : hors saison),
  // par rapport à l'Objectif de sa saison (ou au suivant) ; plaisirAide : passer en Plaisir ferait tomber ses alertes.
  function avisCourse(ctx, c) {
    if (!aJuger(c) || roleDe(c) === 'objectif') return null;
    const alertesDe = cc => planSaison(avecCourse(ctx, cc)).alertes.filter(a => a.course.id === c.id && a.type !== 'proches');
    const ps = planSaison(avecCourse(ctx, c)), sx = ps.saisons.find(x => x.jourJ >= c.date);
    if (!sx) return { niveau: null };
    const role = roleDe(c), alertes = alertesDe(c), ecart = ecartJours(c.date, sx.jourJ), f = fenetreConseillee(sx.course);
    const r = { niveau: 'possible', role, objectif: sx.course, semaines: Math.floor(ecart / 7), fenetre: f, alerte: alertes[0] || null, jours: joursRecup(c) };
    if (alertes.length) {
      r.niveau = 'deconseillee';
      r.plaisirAide = role === 'preparatoire' && !alertesDe(Object.assign({}, c, { role: 'plaisir' })).length;
    } else if (role === 'preparatoire' && f && r.semaines >= f.min && r.semaines <= f.max) r.niveau = 'conseillee'; // en semaines entières, comme elles s'affichent
    return r;
  }
  const NIVEAUX = { conseillee: 'Conseillée', possible: 'Possible', deconseillee: 'Déconseillée' };
  const PICTO_AVIS = { conseillee: 'valide', possible: 'attention', deconseillee: 'interdit' };
  // Raison d'un avis (HTML) et ses sources ; nom(c) écrit le nom d'une course.
  function raisonAvis(av, nom) {
    if (av.niveau === 'deconseillee') return { html: texteAlerte(av.alerte, nom), sources: SOURCES_ALERTE[av.alerte.type] || [] };
    if (av.role === 'plaisir') return { html: 'Sans affûtage ; récupération finie avant l\'affûtage de ' + nom(av.objectif), sources: [SRC.recup] };
    const avant = av.semaines + ' semaines avant ' + nom(av.objectif);
    if (!av.fenetre) return { html: avant + ' (aucune fenêtre conseillée pour cet Objectif)', sources: [] };
    return { html: avant + (av.niveau === 'conseillee' ? ' : dans la fenêtre conseillée (' : ' (conseillé : ') + av.fenetre.min + ' à ' + av.fenetre.max + ' semaines)', sources: av.fenetre.sources };
  }
  const sourcesHtml = s => (s.length ? '<span class="pr-sources">Sources : ' + s.map(([n, u]) => '<a class="mrt-lien" href="' + u + '" target="_blank" rel="noopener">' + esc(n) + '</a>').join(', ') + '</span>' : '');
  // L'avis en une ligne : picto et niveau, raison, sources.
  function avisHtml(av, nom) {
    if (!av || !av.niveau) return '';
    const r = raisonAvis(av, nom);
    return '<p class="pr-avis is-' + av.niveau + '"><span class="pr-avis-n">' + window.mrtIcone[PICTO_AVIS[av.niveau]] + NIVEAUX[av.niveau] + '</span>' +
      '<span class="pr-avis-r">' + r.html + '</span>' + sourcesHtml(r.sources) + '</p>';
  }
  // Préparatoire conseillée pour un Objectif : sa fenêtre (à partir d'aujourd'hui) et les courses repérées qui y tombent ;
  // null quand l'Objectif n'a pas de fenêtre, qu'elle est passée, ou qu'une Préparatoire conseillée y est déjà.
  function suggestion(ctx, o) {
    const f = fenetreConseillee(o), auj = iso(new Date());
    if (!f) return null;
    const debut = addDays(o.date, -7 * f.max), fin = addDays(o.date, -7 * f.min);
    if (fin < auj) return null;
    if (ctx.courses.some(c => aJuger(c) && roleDe(c) === 'preparatoire' && (avisCourse(ctx, c) || {}).niveau === 'conseillee' && (avisCourse(ctx, c).objectif || {}).id === o.id)) return null;
    const d = debut < auj ? auj : debut;
    return { fenetre: f, debut: d, fin, reperees: ctx.courses.filter(c => c.statut === 'a_surveiller' && c.etat === 'a_venir' && c.date && c.date >= d && c.date <= fin).sort((a, b) => (a.date < b.date ? -1 : 1)) };
  }

  // ----- Rubrique « Préparation » de la page d'une course : sa place dans la saison (spécification Préparation, § 5.4) -----
  // Le plan se règle dans Mon plan ; ici, une ligne (rôle, place, jours allégés ou repos, récupération), l'avis, le lien.
  const nomSimple = c => '<b>' + esc(c.course) + '</b>';
  function placeHtml(ctx, c) {
    const role = roleDe(c), conf = avecCourse(ctx, c), ps = planSaison(conf);
    const ROLES = { objectif: 'Objectif', preparatoire: 'Préparatoire', plaisir: 'Plaisir' };
    const tete = (ROLES[role] || 'Sans rôle') + (c.statut === 'option' ? ' (option)' : '');
    if (role === 'objectif') {
      const sx = ps.saisons.find(x => x.course.id === c.id);
      if (!sx) return '<p class="cal-plan-dates">' + tete + ' · pas encore de plan : ce format n\'a pas de durée de préparation par défaut.</p>';
      return '<p class="cal-plan-dates">' + tete + ' · saison de ' + sx.semaines.length + ' semaines' + (sx.raccourcie ? ' (raccourcie)' : '') + ', du ' + longue(sx.premier) + ' au ' + longue(sx.jourJ) + '</p>' +
        frise({ semaines: sx.semaines }, false);
    }
    const w = phaseDe(ps, lundiDe(c.date));
    const place = !w ? 'hors saison' : w.saison ? 'semaine ' + w.n + ' sur ' + w.saison.semaines.length + ' de la saison de ' + nomSimple(w.saison.course)
      : w.phase === 'recuperation' ? 'en Récupération après ' + nomSimple(w.apres) : 'en Entretien, avant la saison de ' + nomSimple(w.vers.course);
    const j = joursRecup(c);
    const recup = j ? ', ' + j + (j > 1 ? ' jours' : ' jour') + ' de récupération' : '';
    const reperes = role === 'preparatoire' ? '3 jours allégés avant' + recup : role === 'plaisir' ? 'repos la veille' + recup : '';
    return '<p class="cal-plan-dates">' + [tete, place, reperes].filter(Boolean).join(' · ') + '</p>' + avisHtml(avisCourse(ctx, c), nomSimple);
  }
  function rubrique(ctx, c) {
    const voir = ecriture(ctx) ? '<a class="mrt-lien cal-regler" href="preparation.html#courses">Voir dans Mon plan →</a>' : '';
    return '<div class="cal-prep-haut">' + placeHtml(ctx, c) + voir + '</div>' +
      (c.date_approx ? '<p class="cal-vide">Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.</p>' : '');
  }

  // ----- Fenêtres : séance, « Paramétrer le plan » -----
  // Comme la fiche d'une course (design, § 6) : « Annuler » à gauche et le bouton principal à droite, en haut ; le titre
  // en libellé ; les champs communs (mrt-champ) ; une action à part (« Supprimer », « Recalculer ») seule, en bas.
  const barre = principal => '<div class="cal-barre"><button type="button" class="mrt-btn" data-act="annuler">Annuler</button>' + principal + '</div>';
  const titreFenetre = t => '<p class="cal-panneau-titre" id="cal-titre">' + t + '</p><p class="cal-msg" role="alert"></p>';
  function fenetre(contenu, classe) {
    const voile = document.createElement('div');
    voile.className = 'cal-voile';
    voile.innerHTML = '<div class="cal-panneau ' + (classe || '') + '" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="cal-titre">' + contenu + '</div>';
    document.body.appendChild(voile);
    const echap = e => { if (e.key === 'Escape') voile.fermer(); };
    voile.fermer = () => { voile.remove(); document.removeEventListener('keydown', echap); };
    document.addEventListener('keydown', echap);
    voile.addEventListener('mousedown', e => { if (e.target === voile) voile.fermer(); });
    return voile;
  }

  // Fenêtre d'une séance ; avec opts.dans (un élément), un écran d'une feuille (Nutrition) : ni barre ni titre (ceux de la
  // feuille), « Enregistrer » collé en bas (mc-pied) ; opts.apres() est appelé après un enregistrement ou une suppression.
  // ----- Retour sur une séance (spécification Préparation, § 5.5) : faite, ressenti, douleur, fatigue, commentaire -----
  // Ressenti : effort perçu de 1 (très facile) à 10 (maximal), une fois la séance faite ; douleur : aucune, légère, forte (et où) ;
  // fatigue du jour : 1 à 5 ; commentaire : 300 caractères au plus, avant comme après la séance.
  const DOULEURS = { aucune: 'Aucune', legere: 'Légère', forte: 'Forte' };
  const pastilles = (nom, valeurs, choisie) => '<div class="ps-coches cal-pastilles" data-groupe="' + nom + '">' + valeurs.map(([v, lib]) =>
    '<button type="button" class="mrt-pastille" data-val="' + v + '" aria-pressed="' + (String(choisie) === String(v)) + '">' + lib + '</button>').join('') + '</div>';
  function retourHtml(s) {
    const x = s || {}, faite = !!x.faite, dou = x.douleur || '';
    return '<section class="mrt-section cal-retour"><h2 class="mrt-section-titre">Retour sur la séance</h2>' +
      '<label class="cal-faite"><input type="checkbox" name="faite"' + (faite ? ' checked' : '') + '> Faite</label>' +
      '<div class="cal-si-faite"' + (faite ? '' : ' hidden') + '>' +
        '<div class="cal-champ"><span>Ressenti (effort perçu, de 1 à 10)</span>' + pastilles('ressenti', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => [n, n]), x.ressenti) + '</div>' +
        '<div class="cal-champ"><span>Douleur</span>' + pastilles('douleur', Object.entries(DOULEURS), dou) + '</div>' +
        '<label class="cal-champ cal-douleur-ou"' + (dou === 'legere' || dou === 'forte' ? '' : ' hidden') + '><span>Où</span><input class="mrt-champ" name="douleur_ou" maxlength="100" placeholder="ex. genou droit" value="' + esc(x.douleur_ou || '') + '"></label>' +
        '<div class="cal-champ"><span>Fatigue du jour (de 1 à 5)</span>' + pastilles('fatigue', [1, 2, 3, 4, 5].map(n => [n, n]), x.fatigue) + '</div>' +
      '</div>' +
      '<label class="cal-champ"><span>Commentaire</span><textarea class="mrt-champ" name="commentaire" maxlength="300" rows="2" placeholder="ex. genou sensible, pas disponible jeudi">' + esc(x.commentaire || '') + '</textarea><small class="cal-compteur">' + (x.commentaire || '').length + '/300</small></label></section>';
  }
  // Branche les pastilles (une seule choisie par groupe, un second toucher la retire), la case « faite » et le compteur.
  function brancherRetour(f) {
    const choix = {};
    f.querySelectorAll('[data-groupe]').forEach(g => { const on = g.querySelector('[aria-pressed="true"]'); choix[g.dataset.groupe] = on ? on.dataset.val : null; });
    f.addEventListener('click', e => {
      const b = e.target.closest('[data-groupe] [data-val]');
      if (!b) return;
      const g = b.closest('[data-groupe]').dataset.groupe, deja = choix[g] === b.dataset.val;
      choix[g] = deja ? null : b.dataset.val;
      b.closest('[data-groupe]').querySelectorAll('[data-val]').forEach(x => x.setAttribute('aria-pressed', String(!deja && x === b)));
      if (g === 'douleur') f.querySelector('.cal-douleur-ou').hidden = !['legere', 'forte'].includes(choix.douleur);
    });
    f.faite.addEventListener('change', () => { f.querySelector('.cal-si-faite').hidden = !f.faite.checked; });
    f.commentaire.addEventListener('input', () => { f.querySelector('.cal-compteur').textContent = f.commentaire.value.length + '/300'; });
    return () => {
      const faite = f.faite.checked, n = k => (choix[k] == null ? null : Number(choix[k]));
      return { faite, ressenti: faite ? n('ressenti') : null, douleur: faite ? choix.douleur : null,
        douleur_ou: faite && ['legere', 'forte'].includes(choix.douleur) ? (f.douleur_ou.value.trim() || null) : null,
        fatigue: faite ? n('fatigue') : null, commentaire: f.commentaire.value.trim() || null };
    };
  }

  // ----- Déplacer une séance : libre, avec un conseil quand une règle n'est pas respectée (spécification Préparation, § 5.5) -----
  // Les règles sont celles des garde-fous de l'IA (§ 6) : jour de course, veille d'une Plaisir, récupération (séance facile
  // seulement), jour non prévu dans Mon profil, plus de séances dans la semaine que prévu. Rend la liste des conseils.
  async function conseils(ctx, se) {
    const j = se.date, out = [], ps = planSaison(Object.assign({ courses: [], semaines: [] }, ctx));
    let pr = ctx.profil;
    if (pr === undefined) {
      try { const { data } = await window.mrtSupabase.from('profil_entrainement').select('*'); pr = (data && data[0]) || null; } catch (e) { pr = null; }
    }
    pr = pr || {};
    if ((ctx.courses || []).some(c => c.date === j && c.etat === 'a_venir' && c.statut === 'confirmee')) out.push('c\'est un jour de course');
    const reps = reperesDuJour(ps, j);
    if (reps.some(r => r.type === 'repos')) out.push('c\'est la veille d\'une course Plaisir : repos conseillé');
    if (reps.some(r => r.type === 'recup') && se.intensite !== 'facile') out.push('c\'est un jour de récupération : séance facile seulement');
    const jour = (parse(j).getDay() + 6) % 7 + 1, liste = k => (Array.isArray(pr[k]) ? pr[k].map(Number) : []);
    if (se.type === 'run' && liste('jours_course').length && !liste('jours_course').includes(jour)) out.push('ce jour n\'est pas prévu pour courir (Mon profil)');
    if (se.type === 'renfo' && liste('jours_renfo').length && !liste('jours_renfo').includes(jour)) out.push('ce jour n\'est pas prévu pour le renforcement (Mon profil)');
    const max = se.type === 'run' ? pr.nb_sorties : pr.nb_renfo;
    const n = (ctx.seances || []).filter(x => x.id !== se.id && x.type === se.type && lundiDe(x.date) === lundiDe(j)).length + 1;
    if (max != null && n > max) out.push(n + (se.type === 'run' ? ' séances de course' : ' renforcements') + ' cette semaine pour ' + max + ' prévu' + (max > 1 ? 's' : ''));
    return out;
  }
  // Après un déplacement (fenêtre ou glisser) : les conseils, s'il y en a ; « Revenir au jour d'avant » remet la séance où elle était.
  async function conseiller(ctx, se, avant) {
    const cs = await conseils(ctx, se);
    if (!cs.length) return;
    const garder = await window.mrtConfirmer({ texte: 'Conseil : ' + cs.join(' ; ') + '.', action: 'Garder ce jour', annuler: 'Revenir au jour d\'avant' });
    if (garder) return;
    const { error } = await window.mrtSupabase.from('seances').update({ date: avant.date, date_prevue: avant.date_prevue || null }).eq('id', se.id);
    if (error) console.warn(error);
  }
  // Le jour d'origine reste celui d'avant le premier déplacement ; revenu à ce jour, la séance n'est plus « déplacée ».
  const datePrevue = (s, jour) => { const o = s.date_prevue || s.date; return o === jour ? null : o; };
  // Réadaptation après un commentaire : sur Mon plan, la page la suit (ctx.surCommentaire) ; ailleurs, un message à la fin.
  async function relancer(ctx) {
    if (ctx.lectureSeule || !window.mrtSeancesIA) return;
    if (ctx.surCommentaire) return ctx.surCommentaire();
    const r = await window.mrtSeancesIA.readapter(ctx);
    if (r.reserve) return;
    await window.mrtConfirmer({ texte: r.message || 'Commentaire pris en compte : une nouvelle proposition de MyRunTools attend dans Mon plan.', action: 'Fermer', seul: true });
  }
  async function deplacer(ctx, id, jour) {
    const s = ctx.seances.find(x => x.id === id);
    if (!s || s.date === jour || ctx.lectureSeule) return;
    const { error } = await window.mrtSupabase.from('seances').update({ date: jour, date_prevue: datePrevue(s, jour) }).eq('id', id);
    if (error) { console.warn(error); return; }
    await conseiller(ctx, Object.assign({}, s, { date: jour }), s);
    ctx.actualiser();
  }

  function ouvrirSeance(ctx, opts) {
    const s = opts.seance, dans = opts.dans;
    const champs = '<label class="cal-champ"><span>Date</span><input class="mrt-champ" type="date" name="date" value="' + esc(s ? s.date : opts.date) + '"></label>' +
      '<label class="cal-champ"><span>Type</span><select class="mrt-champ" name="type">' + Object.keys(TYPES).map(k => '<option value="' + k + '">' + TYPES[k] + '</option>').join('') + '</select></label>' +
      '<label class="cal-champ"><span>Libellé</span><input class="mrt-champ" name="libelle" maxlength="100" placeholder="ex. Footing 45 min" value="' + esc(s ? s.libelle : '') + '"></label>' +
      // Facultatifs : durée, distance, intensité (spécification Préparation, § 7).
      '<div class="cal-champs3"><label class="cal-champ"><span>Durée (min)</span><input class="mrt-champ" name="duree" inputmode="numeric" value="' + esc(s && s.duree_min != null ? s.duree_min : '') + '"></label>' +
      '<label class="cal-champ"><span>Distance (km)</span><input class="mrt-champ" name="distance" inputmode="decimal" value="' + esc(s && s.distance_km != null ? String(s.distance_km).replace('.', ',') : '') + '"></label>' +
      '<label class="cal-champ"><span>Intensité</span><select class="mrt-champ" name="intensite"><option value="">—</option>' + Object.keys(INTENSITES).map(k => '<option value="' + k + '"' + (s && s.intensite === k ? ' selected' : '') + '>' + INTENSITES[k] + '</option>').join('') + '</select></label></div>' +
      retourHtml(s) +
      (s ? '<div class="cal-bas"><button type="button" class="mrt-btn is-danger" data-act="supprimer">' + POUBELLE + 'Supprimer la séance</button></div>' : '');
    let v;
    if (dans) {
      dans.innerHTML = '<form class="cal-seance cal-ecran" novalidate><p class="cal-msg" role="alert"></p>' + champs +
        '<div class="mc-pied"><button type="submit" class="mrt-btn is-principal">Enregistrer</button></div></form>';
      v = { querySelector: q => dans.querySelector(q), fermer: () => opts.apres && opts.apres() };
    } else {
      v = fenetre('<form novalidate>' + barre('<button type="submit" class="mrt-btn is-principal">Enregistrer</button>') +
        titreFenetre(s ? 'Modifier la séance' : 'Ajouter une séance') + champs + '</form>', 'cal-seance');
    }
    const f = v.querySelector('form'), msg = v.querySelector('.cal-msg'), retour = brancherRetour(f);
    if (s) f.type.value = s.type;
    else if (opts.type && TYPES[opts.type]) f.type.value = opts.type; // type proposé par la page qui ouvre la fenêtre (Nutrition)
    // Pas de focus sur un champ : sur téléphone, il ouvrirait le clavier et ferait remonter la fenêtre. La fenêtre prend la main (clavier d'ordinateur).
    if (!dans) v.querySelector('.cal-panneau').focus({ preventScroll: true });
    const sb = window.mrtSupabase;
    const echec = err => { msg.textContent = 'Enregistrement impossible pour l\'instant.'; console.warn(err); };
    if (!dans) v.querySelector('[data-act="annuler"]').addEventListener('click', v.fermer);
    if (s) v.querySelector('[data-act="supprimer"]').addEventListener('click', async e => {
      e.stopPropagation();
      if (!(await window.mrtConfirmer({ texte: 'Supprimer cette séance ?', action: 'Supprimer', danger: true }))) return;
      const { error } = await sb.from('seances').delete().eq('id', s.id);
      if (error) return echec(error);
      v.fermer(); ctx.actualiser();
    });
    f.addEventListener('submit', async e => {
      e.preventDefault(); e.stopPropagation();
      const libelle = f.libelle.value.trim(), date = f.date.value;
      if (!date) return void (msg.textContent = 'Choisis une date.');
      if (!libelle) return void (msg.textContent = 'Écris le libellé de la séance.');
      const duree = nombre(f.duree.value), distance = nombre(f.distance.value);
      if (duree !== null && !(Number.isInteger(duree) && duree >= 1 && duree <= 1440)) return void (msg.textContent = 'La durée doit être un nombre de minutes entre 1 et 1 440.');
      if (distance !== null && !(distance >= 0.1 && distance < 1000)) return void (msg.textContent = 'La distance doit être comprise entre 0,1 et 999 km.');
      const champs = Object.assign({ date, type: f.type.value, libelle, duree_min: duree, distance_km: distance === null ? null : Math.round(distance * 10) / 10, intensite: f.intensite.value || null }, retour(),
        s ? { date_prevue: date === s.date ? (s.date_prevue || null) : datePrevue(s, date) } : {});
      const { error } = s ? await sb.from('seances').update(champs).eq('id', s.id)
        : await sb.from('seances').insert(Object.assign({ course: opts.course || null }, champs));
      if (error) return echec(error);
      v.fermer();
      if (s && date !== s.date) await conseiller(ctx, Object.assign({}, s, champs), s);
      await ctx.actualiser();
      // Un commentaire nouveau ou changé relance aussitôt la réadaptation par l'IA (lot 6b).
      if (champs.commentaire && champs.commentaire !== ((s && s.commentaire) || null)) relancer(ctx);
    });
  }

  // Fenêtre « Préparer » (spécification § 5.3) : durée, frise à glisser, tableau semaine par semaine.
  // Ouverte depuis la page Préparation seulement (design § 12 : un seul lieu de réglage du plan).
  function ouvrirPreparer(ctx, id) {
    const c = ctx.courses.find(x => x.id === id);
    if (!c) return;
    const draft = { duree: c.prepaSemaines || c.prepaFormat || 12, modifs: modifsDe(ctx.semaines, id) };
    const v = fenetre(barre('<button type="button" class="mrt-btn is-principal" data-act="enregistrer">Enregistrer</button>') +
      titreFenetre('Paramétrer le plan · ' + esc(c.course)) + '<div class="cal-prep"></div>' +
      '<div class="cal-bas"><button type="button" class="mrt-lien" data-act="recalculer">Revenir aux règles générales</button></div>', 'cal-preparer');
    const corps = v.querySelector('.cal-prep'), msg = v.querySelector('.cal-msg');
    const courant = () => planDe(c, draft.modifs, draft.duree);

    function dessinerPrep() {
      const plan = courant();
      corps.innerHTML = '<label class="cal-champ cal-duree"><span>Durée en semaines</span><input class="mrt-champ" type="number" min="1" max="52" name="duree" value="' + draft.duree + '"></label>' +
        '<p class="cal-plan-dates">Début : ' + longue(plan.premier) + ' → jour J : ' + longue(c.date) + (c.prepaFormat ? ' · durée du format : ' + c.prepaFormat + ' sem.' : '') + '</p>' +
        frise(plan, true) +
        '<div class="cal-tab">' + plan.semaines.map(w => '<div class="cal-tab-l"><span class="cal-tab-sem">Semaine ' + w.n + '<small>' + F.semaine(w.lundi) + '</small></span>' +
          '<select class="mrt-champ is-compact" data-sem="' + w.lundi + '" aria-label="Phase de la semaine ' + w.n + '">' + PHASES.map(p => '<option value="' + p[0] + '"' + (p[0] === w.phase ? ' selected' : '') + '>' + p[1] + '</option>').join('') + '</select></div>').join('') + '</div>';
    }
    dessinerPrep();

    corps.addEventListener('change', e => {
      if (e.target.name === 'duree') {
        const n = Math.round(Number(e.target.value));
        if (n >= 1 && n <= 52) { draft.duree = n; dessinerPrep(); } else e.target.value = draft.duree;
      } else if (e.target.dataset.sem) {
        draft.modifs.set(e.target.dataset.sem, e.target.value);
        dessinerPrep();
      }
    });
    // Frise : glisser la poignée entre deux phases reporte les semaines de l'une sur l'autre.
    corps.addEventListener('pointerdown', e => {
      const poignee = e.target.closest('.cal-poignee');
      if (!poignee) return;
      e.preventDefault();
      const plan = courant(), depart = Number(poignee.dataset.bord), base = new Map(draft.modifs);
      const gauche = plan.semaines[depart - 1].phase, droite = plan.semaines[depart].phase;
      const bouge = ev => {
        const r = corps.querySelector('.cal-frise').getBoundingClientRect();
        const j = Math.max(0, Math.min(plan.n, Math.round((ev.clientX - r.left) / r.width * plan.n)));
        draft.modifs = new Map(base);
        plan.semaines.forEach((s, i) => {
          if (j > depart && i >= depart && i < j) draft.modifs.set(s.lundi, gauche);
          if (j < depart && i >= j && i < depart) draft.modifs.set(s.lundi, droite);
        });
        dessinerPrep();
      };
      const fin = () => { document.removeEventListener('pointermove', bouge); document.removeEventListener('pointerup', fin); };
      document.addEventListener('pointermove', bouge);
      document.addEventListener('pointerup', fin);
    });

    v.querySelector('[data-act="annuler"]').addEventListener('click', v.fermer);
    v.querySelector('[data-act="recalculer"]').addEventListener('click', async () => {
      if (!(await window.mrtConfirmer({ texte: 'Revenir aux règles générales pour toutes les semaines ?', action: 'Revenir aux règles', danger: true }))) return;
      draft.modifs = new Map();
      dessinerPrep();
    });
    v.querySelector('[data-act="enregistrer"]').addEventListener('click', async ev => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      const lignes = courant().semaines.filter(s => s.phase !== s.regle).map(s => ({ course: id, lundi: s.lundi, phase: s.phase }));
      const sb = window.mrtSupabase;
      let r = await sb.from('courses').update({ prepa_semaines: draft.duree === c.prepaFormat ? null : draft.duree }).eq('id', id);
      if (!r.error) r = await sb.from('plan_semaines').delete().eq('course', id);
      if (!r.error && lignes.length) r = await sb.from('plan_semaines').insert(lignes);
      if (r.error) { msg.textContent = 'Enregistrement impossible pour l\'instant.'; btn.disabled = false; console.warn(r.error); return; }
      v.fermer(); ctx.actualiser();
    });
  }

  // Événements d'une zone qui contient des semaines : « + », séance à modifier, « Préparer », case « faite ».
  // courseId : course liée aux séances ajoutées (page d'une course), sinon aucune.
  function brancher(root, ctx, courseId) {
    // Glisser une séance d'une case à l'autre (ordinateur ; sur téléphone, la date de la fenêtre).
    if (!ctx.lectureSeule) {
      let glisse = null;
      const cible = e => e.target.closest && e.target.closest('[data-jour], [data-jour-ligne]');
      const nettoyer = () => root.querySelectorAll('.is-cible').forEach(x => x.classList.remove('is-cible'));
      root.addEventListener('dragstart', e => { const d = e.target.closest && e.target.closest('[data-drag]'); if (!d) return; glisse = d.dataset.drag; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', glisse); });
      root.addEventListener('dragover', e => { const c = cible(e); if (!c || !glisse) return; e.preventDefault(); if (!c.classList.contains('is-cible')) { nettoyer(); c.classList.add('is-cible'); } });
      root.addEventListener('dragend', () => { glisse = null; nettoyer(); });
      root.addEventListener('drop', e => { const c = cible(e); if (!c || !glisse) return; e.preventDefault(); const id = glisse; glisse = null; nettoyer(); deplacer(ctx, id, c.dataset.jour || c.dataset.jourLigne); });
    }
    root.addEventListener('click', e => {
      const ajout = e.target.closest('[data-ajout]'), edit = e.target.closest('[data-edit]'), prep = e.target.closest('[data-preparer]');
      if (ajout) ouvrirSeance(ctx, { date: ajout.dataset.ajout, course: courseId || null });
      else if (edit) ouvrirSeance(ctx, { seance: ctx.seances.find(s => s.id === edit.dataset.edit) });
      else if (prep) ouvrirPreparer(ctx, prep.dataset.preparer);
    });
    root.addEventListener('change', async e => {
      const fait = e.target.dataset && e.target.dataset.fait;
      if (!fait) return;
      const { error } = await window.mrtSupabase.from('seances').update({ faite: e.target.checked }).eq('id', fait);
      if (error) { e.target.checked = !e.target.checked; console.warn(error); return; }
      ctx.actualiser();
    });
  }

  window.mrtPreparation = { MOIS, JOURS, PHASES, NOM_PHASE, TYPES, INTENSITES, nombre, fenetre, barre, titreFenetre, iso, parse, addDays, lundiDe, jourCourt, dateCourte, longue, courte, esc, famille, lienCourse,
    ouvrirSeance, deplacer, conseils, DOULEURS, phasesRegle, planDe, modifsDe, confirmee, aPlan, tousLesPlans, visibles, phaseSemaine, roleDe, kmEffort, joursRecup, planSaison, phaseDe, reperesDuJour, plansDeLaSemaine, semaineHtml, frise, rubrique, brancher, ouvrirPreparer, REGLAGES,
    fenetreConseillee, texteAlerte, avisCourse, avisHtml, raisonAvis, sourcesHtml, suggestion, placeHtml, NIVEAUX };
})();
