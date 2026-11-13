// ===== Mon plan : le plan de saison =====
//
// docs/module-preparation-specification.md, § 2 à 5. renderSaison(élément, ctx) dessine la page Mon plan : la saison visée,
// la frise des semaines à venir avec les courses, les alertes, le bloc de 4 semaines en cours, les courses du plan et leur avis,
// la préparatoire conseillée. Un seul plan : les phases se règlent sur l'Objectif de la saison (rond « Régler les phases »).
// Le calcul (saisons, repères, alertes, phases) est dans preparation.js (planSaison, phaseDe, reperesDuJour), partagé avec
// le Calendrier ; les séances (case « faite », « + », fenêtre) aussi.
//   ctx.courses, ctx.seances, ctx.semaines, ctx.lectureSeule, ctx.relire() : voir preparation.js.
(function () {
  const P = window.mrtPreparation;
  const { MOIS, NOM_PHASE, iso, parse, addDays, lundiDe, longue, esc, roleDe } = P;
  const ROLE = { objectif: 'Objectif', preparatoire: 'Préparatoire', plaisir: 'Plaisir' };
  const BLOC = 4; // semaines du bloc en cours
  const lien = c => 'course.html?id=' + encodeURIComponent(c.id);
  const nom = c => '<a class="ps-course" href="' + lien(c) + '">' + esc(c.course) + '</a>';
  const semainesEntre = (a, b) => Math.ceil((parse(b) - parse(a)) / (7 * 86400000));

  // Texte d'une alerte (spécification, § 3.4) : celui de preparation.js, le nom des courses en lien (gras : CSS).
  const texteAlerte = a => P.texteAlerte(a, nom);

  // ----- Mon profil (composants/profil.js) : la feuille commune ; ici, les questions indispensables à l'IA qui manquent. -----
  const virgule = v => (v == null ? '' : String(v).replace('.', ','));
  const manquants = pr => window.mrtProfil.manquants(pr);
  const ouvrirProfil = ctx => window.mrtProfil.feuille({ etat: { id: ctx.id, mesures: ctx.mesures || {}, entrainement: ctx.profil || null, courses: ctx.courses },
    surMaj: e => { ctx.profil = e.entrainement; ctx.mesures = e.mesures; ctx.redessiner(); } });

  // ----- Séances proposées par l'IA (spécification, § 6 ; calcul et appel : seances-ia.js) -----
  const IA = () => window.mrtSeancesIA;
  const ligneSeance = s => '<li>' + P.jourCourt(s.date) + ' · <b>' + (P.TYPES[s.type] || s.type) + '</b> ' + esc(s.libelle) + ' · ' + s.duree_min + ' min' +
    (Number(s.distance_km) > 0 ? ' · ' + virgule(s.distance_km) + ' km' : '') + ' · ' + (P.INTENSITES[s.intensite] || s.intensite) + '</li>';
  // (6) Proposer ; (9) proposition en attente : la recommandation (8), seule, et ses boutons ; ses séances sont dans la grille.
  function iaHtml(ctx, lundi, alertes) {
    // Les alertes (seulement s'il y en a) sont dans le bloc de la recommandation ; sans proposition, le bloc ne les porte que seules.
    const listeAl = alertes && alertes.length ? '<ul class="ps-alertes">' + alertes.map(a => '<li class="ps-alerte" data-alerte="' + a.type + '">' + texteAlerte(a) + '</li>').join('') + '</ul>' : '';
    const blocAl = listeAl ? '<section class="ps-proposition ps-seul"><h3 class="ps-libelle">Recommandation de MyRunTools</h3>' + listeAl + '</section>' : '';
    if (ctx.lectureSeule || !IA() || ctx.profil === undefined) return blocAl;
    const etat = ctx.ia || {}, manque = manquants(ctx.profil);
    if (manque.length) return blocAl + '<p class="ps-ia-aide">Pour que l\'IA propose les séances du bloc : <button type="button" class="mrt-lien" data-profil>Compléter mon profil</button></p>';
    const prop = IA().enAttente(ctx, lundi), reste = IA().restantes(ctx);
    const msg = etat.message ? '<p class="ps-ia-msg" role="alert">' + etat.message + '</p>' : '';
    if (!prop) return blocAl + '<div class="ps-ia"><button type="button" class="mrt-btn is-principal" data-ia="proposer"' + (etat.encours || !reste ? ' disabled' : '') + '>' +
      (etat.encours ? (etat.readaptation ? 'Réadaptation en cours…' : 'Proposition en cours…') : 'Proposer les séances') + '</button>' + (Number.isFinite(reste) ? '<span class="ps-ia-reste">' + reste + (reste > 1 ? ' restantes' : ' restante') + ' ce mois-ci</span>' : '') + '</div>' + msg;
    const seances = IA().seancesDe(prop.reponse), lundis = [0, 1, 2, 3].map(i => addDays(lundi, 7 * i)), choisies = etat.semaines || lundis;
    const choixSem = etat.choix ? '<div class="ps-coches ps-prop-sems">' + lundis.map(l => '<button type="button" class="mrt-pastille" data-coche="' + l + '" aria-pressed="' + choisies.includes(l) + '">Semaine ' + window.mrtFormat.semaine(l) + '</button>').join('') + '</div>' : '';
    const actions = etat.choix
      ? '<button type="button" class="mrt-btn is-principal" data-ia="selection">Accepter la sélection</button><button type="button" class="mrt-btn" data-ia="sans-choix">Annuler le choix</button>'
      : '<button type="button" class="mrt-btn is-principal" data-ia="tout">Tout accepter</button><button type="button" class="mrt-btn" data-ia="choisir">Choisir semaine par semaine</button>' +
        '<button type="button" class="mrt-btn" data-ia="refaire"' + (etat.encours || !reste ? ' disabled' : '') + '>' + (etat.encours ? 'Proposition en cours…' : 'Refaire') + '</button><button type="button" class="mrt-btn" data-ia="abandonner">Abandonner</button>';
    // Téléphone : la grille ne montre que des repères ; la liste des séances proposées s'ajoute sous la recommandation.
    return '<section class="ps-proposition"><h3 class="ps-libelle">Recommandation de MyRunTools</h3>' + listeAl + '<p class="ps-reco">' + esc(IA().recommandationDe(prop.reponse)) + '</p>' +
      '<ul class="ps-prop-liste">' + seances.map(ligneSeance).join('') + '</ul>' + choixSem + '<div class="ps-prop-actions">' + actions + '</div>' + msg + '</section>';
  }
  // Dans une case de la grille : les repères du jour (allégé, repos, récupération) et les séances proposées, en attente.
  function caseHtml(ctx, ps, j) {
    const reps = P.reperesDuJour(ps, j).map(r => (r.type === 'allege' ? 'Allégé' : r.type === 'repos' ? 'Repos' : 'Récupération'));
    const prop = IA() && !ctx.lectureSeule ? IA().enAttente(ctx, lundiDe(iso(new Date()))) : null;
    const props = prop ? IA().seancesDe(prop.reponse).filter(s => s.date === j) : [];
    return [...new Set(reps)].map(t => '<span class="cal-v-rep">' + t + '</span>').join('') +
      props.map(s => '<span class="cal-v-prop" title="' + esc((P.TYPES[s.type] || s.type) + ' · ' + s.libelle + ' · ' + s.duree_min + ' min' + (Number(s.distance_km) > 0 ? ' · ' + virgule(s.distance_km) + ' km' : '') + ' · ' + (P.INTENSITES[s.intensite] || s.intensite)) + '">' +
        esc(s.libelle) + ' · ' + s.duree_min + ' min</span>').join('');
  }

  // (15) Courses du plan : une ligne par course à venir (confirmée ou option) qui a une date : nom, date, rôle, avis (§ 3.5) ;
  // un Objectif a son rond « Régler les phases » (17) ; une Déconseillée que le rôle Plaisir tirerait d'affaire, « Passer en Plaisir ».
  function coursesHtml(ctx) {
    const cs = ctx.courses.filter(P.aPlan).sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!cs.length) return '';
    return '<section class="ps-courses" id="courses"><h2 class="ps-libelle">Courses du plan</h2><ul class="ps-courses-liste">' + cs.map(c => {
      const role = roleDe(c), av = P.avisCourse(ctx, c);
      const regler = role === 'objectif' && !ctx.lectureSeule ? '<button type="button" class="mrt-rond" data-preparer="' + esc(c.id) + '" aria-label="Régler les phases de ' + esc(c.course) + '" title="Régler les phases">' + P.REGLAGES + '</button>' : '';
      const plaisir = av && av.plaisirAide && !ctx.lectureSeule ? '<button type="button" class="mrt-btn" data-plaisir="' + esc(c.id) + '">Passer en Plaisir</button>' : '';
      return '<li class="ps-c' + (av && av.niveau ? ' is-' + av.niveau : '') + '"><div class="ps-c-haut"><span class="ps-c-nom">' + nom(c) + '</span><span class="ps-c-info">' + longue(c.date) + ' · ' + ROLE[role] +
        (c.statut === 'option' ? ' (option)' : '') + '</span>' + regler + '</div>' + P.avisHtml(av, nom) + plaisir + '</li>';
    }).join('') + '</ul></section>';
  }
  // (16) Préparatoire conseillée pour l'Objectif visé : sa fenêtre, les courses repérées qui y tombent (« Confirmer »), « + Ajouter une course ».
  function suggestionHtml(ctx, o) {
    const sg = ctx.lectureSeule ? null : P.suggestion(ctx, o);
    if (!sg) return '';
    return '<section class="ps-suggestion"><p class="ps-sg-texte"><b>Préparatoire conseillée</b> avant ' + nom(o) + ' : ' + sg.fenetre.texte + ', du ' + longue(sg.debut) + ' au ' + longue(sg.fin) + '.</p>' +
      (sg.reperees.length ? '<p class="ps-sg-sous">Dans tes courses repérées :</p><ul class="ps-sg-liste">' + sg.reperees.map(c => '<li><span>' + nom(c) + ' · ' + longue(c.date) + '</span>' +
        '<button type="button" class="mrt-btn" data-confirmer="' + esc(c.id) + '">Confirmer</button></li>').join('') + '</ul>' : '') +
      '<p class="ps-sg-pied">' + P.sourcesHtml(sg.fenetre.sources) + (ctx.edition ? '<button type="button" class="ob-ajout mrt-btn is-principal" data-ajouter title="Ajouter une course"><svg class="ob-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span class="ob-ajout-long">Ajouter une course</span><span class="ob-ajout-court">Course</span></button>' : '') + '</p></section>';
  }

  // (10) Historique des propositions : replié, une ligne par proposition (date, bloc, motif, statut), la plus récente en haut.
  function historiqueHtml(ctx) {
    const h = ctx.lectureSeule || !IA() ? [] : IA().historique(ctx);
    if (!h.length) return '';
    return '<details class="ps-historique mrt-deroule"><summary>' + window.mrtIcone.chevron + 'Historique des propositions (' + h.length + ')</summary><ul class="ps-hist-liste">' + h.map(x =>
      '<li><span>' + window.mrtFormat.date(String(x.cree).slice(0, 10), { annee: false }) + ' · bloc du ' + window.mrtFormat.date(x.bloc, { annee: false }) + '</span><span>' + (IA().MOTIFS[x.motif] || 'Proposer') + '</span><span class="ps-hist-statut s-' + x.statut + '">' + (IA().STATUTS[x.statut] || x.statut) + '</span></li>').join('') + '</ul></details>';
  }

  window.renderSaison = function (root, ctx) {
    // Téléphone : la frise est une liste verticale ; elle se redessine quand l'écran change de classe.
    const mq = window.matchMedia('(max-width: 600px)');
    mq.addEventListener('change', () => { if (ctx.friseMaj) ctx.friseMaj(ctx.friseMode || 'saison'); });
    ctx.actualiser = async () => { Object.assign(ctx, await ctx.relire()); dessiner(); };

    function dessiner() {
      const auj = iso(new Date()), lundi = lundiDe(auj), ps = P.planSaison(ctx);
      const prochaine = ps.saisons.find(x => x.jourJ >= auj);
      // (2) Mon profil et (12) son état : ce qui manque pour proposer des séances.
      const manque = manquants(ctx.profil);
      const profil = ctx.lectureSeule ? '' : '<div class="ps-profil-haut"><span class="ps-profil-etat' + (manque.length ? '' : ' is-complet') + '">' +
        (ctx.profil === undefined ? '' : manque.length ? 'Profil à compléter : ' + manque.join(', ') + '.' : 'Profil complet.') + '</span><button type="button" class="mrt-btn" data-profil>Mon profil</button></div>';
      if (!prochaine) {
        root.innerHTML = '<div class="ps-cadre">' + profil + '<p class="ps-vide">Aucun Objectif à venir : donne le rôle Objectif à une course confirmée (page Saison) pour construire ta saison.</p>' + coursesHtml(ctx) + '</div>';
        return;
      }
      // (1) Saison visée.
      const dans = semainesEntre(auj, prochaine.jourJ);
      // Le nom de la course visée en titre ; dessous, petit : la date (l'année seulement si ce n'est pas la présente) et le temps restant.
      const dateVisee = window.mrtFormat.date(prochaine.jourJ, { semaine: true, annee: parse(prochaine.jourJ).getFullYear() !== new Date().getFullYear() });
      let h = '<div class="ps-cadre">' + profil + '<h2 class="ps-titre">' + nom(prochaine.course) + '</h2><p class="ps-sous">' + dateVisee + ' · dans ' + dans + ' sem.</p>';

      // (3) Frise, à deux niveaux : « Saison » (jusqu'à l'Objectif, par défaut) ou « Tout » (jusqu'à la fin de la dernière récupération).
      const derniere = ps.saisons[ps.saisons.length - 1], recupDer = ps.reperes.find(r => r.course === derniere.course);
      const finTout = lundiDe(recupDer && recupDer.recupFin > derniere.jourJ ? recupDer.recupFin : derniere.jourJ);
      const jm = d => d.getDate() + ' ' + MOIS[d.getMonth()];
      // Nom d'une phase sur un segment de deux semaines, quand le nom entier ne tient pas.
      const COURT = { developpement: 'Dév.', affutage: 'Aff.', recuperation: 'Récup.', entretien: 'Entr.', deload: 'Del.' };
      // 9 → 22 nov, ou 28 nov → 6 déc.
      const plage = (l1, l2) => { const x = parse(l1), y = parse(addDays(l2, 6)); return (x.getMonth() === y.getMonth() ? x.getDate() : jm(x)) + ' → ' + jm(y); };
      const friseCorps = mode => {
        const fin = mode === 'tout' ? finTout : lundiDe(prochaine.jourJ);
        const semaines = [];
        for (let l = lundi; l <= fin; l = addDays(l, 7)) semaines.push(l);
        const n = semaines.length;
        const courses = ctx.courses.filter(c => c.date && c.etat === 'a_venir' && (c.statut === 'confirmee' || c.statut === 'option') && c.date >= lundi && c.date <= addDays(fin, 6));
        const phases = semaines.map(l => { const x = P.phaseDe(ps, l); return x ? x.phase : 'entretien'; });
        // Suites de semaines de même phase : un segment chacune [premier index, longueur].
        const runs = [];
        for (let i = 0; i < n;) { let j = i; while (j < n && phases[j] === phases[i]) j++; runs.push({ i, len: j - i, ph: phases[i] }); i = j; }
        const marque = c => { const role = roleDe(c); return '<a class="ps-marque r-' + role + (c.statut === 'option' ? ' is-option' : '') + '" href="' + lien(c) + '" title="' + esc(c.course + ' · ' + longue(c.date) + ' · ' + ROLE[role] + (c.statut === 'option' ? ' (option)' : '')) + '"><b>▲</b><span class="ps-marque-nom">' + esc(c.course) + ' · ' + jm(parse(c.date)) + '</span></a>'; };
        // Légende : seulement ce que la frise montre.
        const roles = [...new Set(courses.filter(c => c.statut !== 'option').map(roleDe))], option = courses.some(c => c.statut === 'option');
        const legende = '<p class="ps-legende">' + ['objectif', 'preparatoire', 'plaisir'].filter(r => roles.includes(r)).map(r => '<span><b class="ps-marque r-' + r + '">▲</b>' + ROLE[r] + '</span>').join('') +
          (option ? '<span><b class="ps-marque is-option">▲</b>option</span>' : '') +
          ['base', 'developpement', 'affutage', 'deload', 'recuperation', 'entretien'].filter(k => phases.includes(k)).map(k => '<span><i class="cal-k ph-' + k + '"></i>' + NOM_PHASE[k] + '</span>').join('') + '</p>';
        // Téléphone : une liste verticale, une ligne par phase (couleur, nom, dates, durée), les courses sous leur phase.
        if (mq.matches) {
          return '<ol class="ps-liste">' + runs.map(r => {
            const l1 = semaines[r.i], l2 = semaines[r.i + r.len - 1], cs = courses.filter(c => c.date >= l1 && c.date <= addDays(l2, 6));
            return '<li class="ps-run" data-lundi="' + l1 + '" data-fin="' + l2 + '"><i class="cal-k ph-' + r.ph + '"></i><b class="ps-run-nom">' + NOM_PHASE[r.ph] + '</b><span class="ps-run-dates">' + plage(l1, l2) + ' · ' + r.len + ' sem.</span>' +
              cs.map(marque).join('') + '</li>';
          }).join('') + '</ol>';
        }
        // Ordinateur : trois rangées sur la même grille, une colonne par semaine : les dates, les phases (un segment par suite de semaines), les courses (nom et date écrits).
        const pas = n <= 12 ? 1 : n <= 26 ? 2 : 4;
        const dates = semaines.map((l, i) => i % pas ? '' : '<span class="ps-date" style="grid-column:' + (i + 1) + ' / span ' + pas + '">' + jm(parse(l)) + '</span>').join('');
        const segs = runs.map(r => '<span class="ps-seg ph-' + r.ph + '" data-debut="' + semaines[r.i] + '" data-fin="' + semaines[r.i + r.len - 1] + '" style="grid-column:' + (r.i + 1) + ' / span ' + r.len + '" title="' +
          esc(NOM_PHASE[r.ph] + ' · ' + plage(semaines[r.i], semaines[r.i + r.len - 1]) + ' · ' + r.len + ' sem.') + '">' + (r.len >= 3 || (r.len === 2 && NOM_PHASE[r.ph].length <= 6) ? NOM_PHASE[r.ph] : r.len === 2 ? COURT[r.ph] : '') + '</span>').join('');
        // Une course dans les dernières semaines s'écrit vers la gauche (le nom finit sous son signe), pour ne pas sortir de la frise.
        const marques = courses.map((c, k) => {
          const i = semaines.indexOf(lundiDe(c.date)), fin = i >= n - 6, debut = fin ? Math.max(1, i + 1 - 7) : i + 1;
          return '<span class="ps-marque-c' + (fin ? ' is-fin' : '') + '" style="grid-column:' + debut + ' / ' + (fin ? i + 2 : 'span 1') + ';grid-row:' + (3 + k % 2) + '">' + marque(c) + '</span>';
        }).join('');
        return '<div class="ps-frise-defile"><div class="ps-frise" style="--n:' + n + '">' + dates + segs + marques + '</div></div>' + legende;
      };
      const mode = ctx.friseMode || 'saison';
      ctx.friseMaj = m => {
        ctx.friseMode = m;
        const z = root.querySelector('.ps-frise-zone');
        if (!z) return;
        z.querySelector('.ps-frise-corps').innerHTML = friseCorps(m);
        z.querySelectorAll('[data-frise]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.frise === m)));
      };
      h += '<div class="ps-frise-zone" data-plein-cible><div class="ps-frise-barre"><div class="ps-coches">' +
        [['saison', 'En cours'], ['tout', 'Tout']].map(x => '<button type="button" class="mrt-pastille" data-frise="' + x[0] + '" aria-pressed="' + (mode === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
        '<span class="ps-frise-ronds">' + (ctx.lectureSeule ? '' : '<button type="button" class="mrt-rond" data-preparer="' + esc(prochaine.course.id) + '" aria-label="Régler les phases" title="Régler les phases">' + P.REGLAGES + '</button>') + window.mrtPleinEcran.bouton() + '</span></div><div class="ps-frise-corps">' + friseCorps(mode) + '</div></div>';

      // Le bloc en cours : la recommandation (avec les alertes, s'il y en a) et la grille des 4 semaines à partir de celle-ci, dans la grille
      // du mois du Calendrier ; dans les cases, les repères et les séances proposées par l'IA, en attente.
      h += '<section class="ps-bloc">' + iaHtml(ctx, lundi, ps.alertes) +
        '<div class="ps-grille">' + window.mrtGrilleMois(ctx, lundi, addDays(lundi, 7 * BLOC - 1), { ps, plus: j => caseHtml(ctx, ps, j) }) + '</div>';
      root.innerHTML = h + historiqueHtml(ctx) + '</section>' + coursesHtml(ctx) + suggestionHtml(ctx, prochaine.course) + '</div>';
    }

    ctx.redessiner = dessiner;
    // Un commentaire sur une séance (fenêtre d'une séance) : la réadaptation se suit dans le bloc de la recommandation.
    ctx.surCommentaire = async () => {
      if (!IA()) return;
      ctx.ia = { encours: true, readaptation: true }; dessiner();
      const r = await IA().readapter(ctx);
      await IA().lirePropositions(ctx);
      ctx.ia = { message: r.reserve ? null : r.message || null }; dessiner();
    };
    ctx.ia = {};
    root.__ctx = ctx; // pour le banc d'essai (garde-fous sur les données de la page)
    root.addEventListener('click', e => { if (e.target.closest('[data-profil]')) ouvrirProfil(ctx); const f = e.target.closest('[data-frise]'); if (f && ctx.friseMaj) ctx.friseMaj(f.dataset.frise); });
    // Passer en Plaisir (une Déconseillée), confirmer une course repérée en Préparatoire, ajouter une course (la fiche du site).
    root.addEventListener('click', async e => {
      const pl = e.target.closest('[data-plaisir]'), cf = e.target.closest('[data-confirmer]'), aj = e.target.closest('[data-ajouter]');
      if (aj && ctx.edition) return ctx.edition.ajouter({ defauts: { statut: 'confirmee', role: 'preparatoire' } });
      const idc = pl ? pl.dataset.plaisir : cf ? cf.dataset.confirmer : null, c = idc && ctx.courses.find(x => x.id === idc);
      if (!c) return;
      const texte = pl ? 'Passer ' + c.course + ' en Plaisir ? Elle se courra sans affûtage, avec un repos la veille.' : 'Confirmer ' + c.course + ' comme Préparatoire ?';
      if (!(await window.mrtConfirmer({ texte, action: pl ? 'Passer en Plaisir' : 'Confirmer' }))) return;
      const { error } = await window.mrtSupabase.from('courses').update(pl ? { role: 'plaisir' } : { statut: 'confirmee', role: 'preparatoire' }).eq('id', c.id);
      if (error) { console.warn(error); await window.mrtConfirmer({ texte: 'Enregistrement impossible pour l\'instant.', action: 'Fermer', seul: true }); return; }
      await ctx.actualiser();
    });
    // Choix semaine par semaine : chaque semaine du bloc en pastille, choisie ou non.
    root.addEventListener('click', e => {
      const c = e.target.closest('[data-coche]');
      if (!c) return;
      const tous = [0, 1, 2, 3].map(i => addDays(lundiDe(iso(new Date())), 7 * i)), sel = ctx.ia.semaines || tous, l = c.dataset.coche;
      ctx.ia = Object.assign({}, ctx.ia, { semaines: sel.includes(l) ? sel.filter(x => x !== l) : sel.concat([l]) });
      dessiner();
    });
    // Boutons de la proposition : proposer, refaire (compte pour une), tout accepter, choisir, accepter la sélection, abandonner.
    root.addEventListener('click', async e => {
      const b = e.target.closest('[data-ia]');
      if (!b || b.disabled) return;
      const act = b.dataset.ia, lundi = lundiDe(iso(new Date())), prop = IA().enAttente(ctx, lundi);
      const recharger = async () => { await IA().lirePropositions(ctx); await ctx.actualiser(); };
      if (act === 'proposer' || act === 'refaire') {
        if (act === 'refaire' && !(await window.mrtConfirmer({ texte: Number.isFinite(IA().restantes(ctx)) ? 'Refaire la proposition ? Elle compte pour une (' + IA().restantes(ctx) + ' restantes ce mois-ci).' : 'Refaire la proposition ?', action: 'Refaire' }))) return;
        ctx.ia = { encours: true }; dessiner();
        if (act === 'refaire' && prop) await IA().abandonner(prop);
        const r = await IA().proposer(ctx, lundi, act);
        await IA().lirePropositions(ctx);
        ctx.ia = { message: r.message || null }; dessiner();
      } else if (act === 'choisir' || act === 'sans-choix') { ctx.ia = { choix: act === 'choisir' }; dessiner(); }
      else if (act === 'tout' || act === 'selection') {
        const tous = [0, 1, 2, 3].map(i => addDays(lundi, 7 * i));
        const lundis = act === 'tout' ? tous : (ctx.ia.semaines || tous);
        const n = IA().aRemplacer(ctx, lundis).length;
        if (n && !(await window.mrtConfirmer({ texte: n + (n > 1 ? ' séances' : ' séance') + ' déjà proposée' + (n > 1 ? 's' : '') + ' par MyRunTools sur ces semaines ' + (n > 1 ? 'seront remplacées' : 'sera remplacée') + ' (pas celles que tu as saisies, ni les faites).', action: 'Remplacer' }))) return;
        const err = await IA().accepter(ctx, prop, lundis);
        if (err) { console.warn(err); ctx.ia = { message: 'Enregistrement impossible pour l\'instant.' }; dessiner(); return; }
        ctx.ia = {}; await recharger();
      } else if (act === 'abandonner') {
        if (!(await window.mrtConfirmer({ texte: 'Abandonner cette proposition ? Aucune séance n\'est enregistrée.', action: 'Abandonner', annuler: 'Garder' }))) return;
        await IA().abandonner(prop); ctx.ia = {}; await recharger();
      }
    });
    P.brancher(root, ctx, null);
    dessiner();
    if (location.hash === '#courses' || location.hash === '#plans') { const z = root.querySelector('#courses'); if (z) z.scrollIntoView(); }
    // Le profil d'entraînement (une ligne, la sienne : règle par ligne), lu après le premier dessin ; jamais sur le site partagé.
    // Et les propositions de l'IA (plafond du mois, proposition en attente).
    if (!ctx.lectureSeule) Promise.all([window.mrtSupabase.from('profil_entrainement').select('*'), IA() ? IA().lirePropositions(ctx) : null]).then(([{ data, error }]) => {
      if (error) console.warn(error);
      ctx.profil = (data && data[0]) || null;
      dessiner();
    });
  };
})();
