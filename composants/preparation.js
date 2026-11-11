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
  // courues (grisées). Ni à surveiller, ni abandonnées.
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

  // ----- Rubrique « Préparation » de la page d'une course (spécification § 5.2) -----
  function rubrique(ctx, c) {
    const preparer = ecriture(ctx) ? '<a class="mrt-lien cal-regler" href="preparation.html#plans">Régler le plan dans Préparation →</a>' : '';
    const plan = planDe(c, modifsDe(ctx.semaines, c.id));
    if (!plan) {
      return '<p class="cal-vide">Pas encore de plan : ce format n\'a pas de durée de préparation par défaut.' + (ecriture(ctx) ? ' Règle le plan pour en choisir une.' : '') + '</p>' + (preparer ? '<p>' + preparer + '</p>' : '');
    }
    const lundiAuj = lundiDe(iso(new Date()));
    let w = plan.semaines.find(s => s.lundi === lundiAuj), etiquette = 'Semaine en cours';
    if (!w && lundiAuj < plan.premier) { w = plan.semaines[0]; etiquette = 'Première semaine'; }
    else if (!w) { w = plan.semaines[plan.n - 1]; etiquette = 'Dernière semaine'; }
    const plans = tousLesPlans(ctx);
    const bloc = x => semaineHtml(ctx, x.lundi, { phase: x.phase, numero: x.n, modifiee: x.modifiee, liens: false,
      autres: confirmee(c) ? plans.filter(p => p.course.id !== c.id && x.lundi >= p.premier && x.lundi <= lundiDe(p.jourJ)) : [] });
    return '<div class="cal-prep-haut"><p class="cal-plan-dates">Plan de ' + plan.n + ' semaines · début : ' + longue(plan.premier) + ' → jour J : ' + longue(c.date) + '</p>' + preparer + '</div>' +
      (c.date_approx ? '<p class="cal-vide">Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.</p>' : '') +
      frise(plan, false) +
      '<p class="cal-prep-lib">' + etiquette + '</p>' + bloc(w) +
      '<details class="cal-toutes"><summary>' + CHEVRON + 'Toutes les semaines (' + plan.n + ')</summary><div class="cal-sem-liste">' + plan.semaines.map(bloc).join('') + '</div></details>';
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

  function ouvrirSeance(ctx, opts) {
    const s = opts.seance;
    const v = fenetre('<form novalidate>' + barre('<button type="submit" class="mrt-btn is-principal">Enregistrer</button>') +
      titreFenetre(s ? 'Modifier la séance' : 'Ajouter une séance') +
      '<label class="cal-champ"><span>Date</span><input class="mrt-champ" type="date" name="date" value="' + esc(s ? s.date : opts.date) + '"></label>' +
      '<label class="cal-champ"><span>Type</span><select class="mrt-champ" name="type">' + Object.keys(TYPES).map(k => '<option value="' + k + '">' + TYPES[k] + '</option>').join('') + '</select></label>' +
      '<label class="cal-champ"><span>Libellé</span><input class="mrt-champ" name="libelle" maxlength="100" placeholder="ex. Footing 45 min" value="' + esc(s ? s.libelle : '') + '"></label>' +
      // Facultatifs : durée, distance, intensité (spécification Préparation, § 7).
      '<div class="cal-champs3"><label class="cal-champ"><span>Durée (min)</span><input class="mrt-champ" name="duree" inputmode="numeric" value="' + esc(s && s.duree_min != null ? s.duree_min : '') + '"></label>' +
      '<label class="cal-champ"><span>Distance (km)</span><input class="mrt-champ" name="distance" inputmode="decimal" value="' + esc(s && s.distance_km != null ? String(s.distance_km).replace('.', ',') : '') + '"></label>' +
      '<label class="cal-champ"><span>Intensité</span><select class="mrt-champ" name="intensite"><option value="">—</option>' + Object.keys(INTENSITES).map(k => '<option value="' + k + '"' + (s && s.intensite === k ? ' selected' : '') + '>' + INTENSITES[k] + '</option>').join('') + '</select></label></div>' +
      (s ? '<div class="cal-bas"><button type="button" class="mrt-btn is-danger" data-act="supprimer">' + POUBELLE + 'Supprimer la séance</button></div>' : '') + '</form>', 'cal-seance');
    const f = v.querySelector('form'), msg = v.querySelector('.cal-msg');
    if (s) f.type.value = s.type;
    else if (opts.type && TYPES[opts.type]) f.type.value = opts.type; // type proposé par la page qui ouvre la fenêtre (Nutrition)
    // Pas de focus sur un champ : sur téléphone, il ouvrirait le clavier et ferait remonter la fenêtre. La fenêtre prend la main (clavier d'ordinateur).
    v.querySelector('.cal-panneau').focus({ preventScroll: true });
    const sb = window.mrtSupabase;
    const echec = err => { msg.textContent = 'Enregistrement impossible pour l\'instant.'; console.warn(err); };
    v.querySelector('[data-act="annuler"]').addEventListener('click', v.fermer);
    if (s) v.querySelector('[data-act="supprimer"]').addEventListener('click', async () => {
      if (!(await window.mrtConfirmer({ texte: 'Supprimer cette séance ?', action: 'Supprimer', danger: true }))) return;
      const { error } = await sb.from('seances').delete().eq('id', s.id);
      if (error) return echec(error);
      v.fermer(); ctx.actualiser();
    });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const libelle = f.libelle.value.trim(), date = f.date.value;
      if (!date) return void (msg.textContent = 'Choisis une date.');
      if (!libelle) return void (msg.textContent = 'Écris le libellé de la séance.');
      const duree = nombre(f.duree.value), distance = nombre(f.distance.value);
      if (duree !== null && !(Number.isInteger(duree) && duree >= 1 && duree <= 1440)) return void (msg.textContent = 'La durée doit être un nombre de minutes entre 1 et 1 440.');
      if (distance !== null && !(distance >= 0.1 && distance < 1000)) return void (msg.textContent = 'La distance doit être comprise entre 0,1 et 999 km.');
      const champs = { date, type: f.type.value, libelle, duree_min: duree, distance_km: distance === null ? null : Math.round(distance * 10) / 10, intensite: f.intensite.value || null };
      const { error } = s ? await sb.from('seances').update(champs).eq('id', s.id)
        : await sb.from('seances').insert(Object.assign({ course: opts.course || null }, champs));
      if (error) return echec(error);
      v.fermer(); ctx.actualiser();
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
    ouvrirSeance, phasesRegle, planDe, modifsDe, confirmee, aPlan, tousLesPlans, visibles, phaseSemaine, roleDe, kmEffort, joursRecup, planSaison, phaseDe, reperesDuJour, plansDeLaSemaine, semaineHtml, frise, rubrique, brancher, ouvrirPreparer, REGLAGES };
})();
