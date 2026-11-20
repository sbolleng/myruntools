// ===== Mon plan : la vue d'ensemble =====
//
// docs/module-preparation-specification.md, § 5.1. renderSaison(élément, ctx) dessine la page Mon plan : la carte de l'Objectif
// visé et les réglages du plan (Mon profil, Changer d'Objectif, Personnaliser), la frise de tout le plan (une case par semaine),
// le bandeau de MyRunTools (alertes, recommandation, « Refaire »), Cette semaine. Sans Objectif à venir : le parcours
// « Construire mon plan » (plan-parcours.js, § 5.0). Les séances proposées par l'IA s'écrivent d'office (§ 6) : il n'y a
// rien à accepter ; chacune reste modifiable.
// Le calcul (saisons, repères, alertes, phases) est dans preparation.js, partagé avec le Calendrier ; les séances aussi.
//   ctx.courses, ctx.seances, ctx.semaines, ctx.lectureSeule, ctx.relire() : voir preparation.js.
(function () {
  const P = window.mrtPreparation;
  const { MOIS, NOM_PHASE, iso, parse, addDays, lundiDe, esc, roleDe } = P;
  const BLOC = 4; // semaines d'une proposition de l'IA
  const lien = c => 'course.html?id=' + encodeURIComponent(c.id);
  const nom = c => '<a class="ps-course" href="' + lien(c) + '">' + esc(c.course) + '</a>';
  const texteAlerte = a => P.texteAlerte(a, nom);
  const manquants = pr => window.mrtProfil.manquants(pr);
  const ouvrirProfil = ctx => window.mrtProfil.feuille({ etat: { id: ctx.id, mesures: ctx.mesures || {}, entrainement: ctx.profil || null, courses: ctx.courses },
    surMaj: e => { ctx.profil = e.entrainement; ctx.mesures = e.mesures; ctx.redessiner(); } });
  const IA = () => window.mrtSeancesIA;
  const lundisDu = lundi => [0, 1, 2, 3].map(i => addDays(lundi, 7 * i));
  // La recommandation en deux phrases au plus (§ 5.1, n° 9).
  const deuxPhrases = t => String(t || '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  // La proposition qui couvre une semaine : la plus récente en attente ou acceptée dont le bloc de 4 semaines la contient.
  const couvrante = (ctx, lundi) => (ctx.propositions || []).filter(x => (x.statut === 'brute' || x.statut === 'acceptee') && x.bloc <= lundi && lundi < addDays(x.bloc, 7 * BLOC))
    .sort((a, b) => (a.cree < b.cree ? 1 : -1))[0] || null;
  const PICTO = { profil: '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.2" r="2.7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.8 14c.6-2.9 2.6-4.4 5.2-4.4s4.6 1.5 5.2 4.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    objectif: '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 14V2.5M3.5 3h8l-1.8 2.7 1.8 2.8h-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    exporter: '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v7.5M4.8 6.8L8 10l3.2-3.2M3 13h10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calendrier: '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' };

  // (9) Le bandeau de MyRunTools, toujours ouvert : les alertes, « Ton profil a changé… », la recommandation et « Refaire ».
  function bandeauHtml(ctx, lundi, alertes, o) {
    const al = alertes.map(a => '<li class="ps-alerte" data-alerte="' + a.type + '">' + texteAlerte(a) + '</li>').join('');
    const lignes = [];
    // (16) La préparatoire conseillée, tant que sa fenêtre n'est pas passée et qu'aucune Préparatoire conseillée n'y est.
    const sg = !ctx.lectureSeule && o ? P.suggestion(ctx, o) : null;
    if (sg) lignes.push('<p class="ps-sg-ligne"><b>Préparatoire conseillée</b> : ' + sg.fenetre.texte + ', du ' + P.longue(sg.debut) + ' au ' + P.longue(sg.fin) + '. <button type="button" class="mrt-lien" data-prepa="fenetre">Ajouter</button></p>');
    if (!ctx.lectureSeule && IA() && ctx.profil !== undefined) {
      const etat = ctx.ia || {}, manque = manquants(ctx.profil), prop = couvrante(ctx, lundi), reste = IA().restantes(ctx);
      const refaire = '<button type="button" class="mrt-lien" data-ia="refaire"' + (etat.encours || !reste ? ' disabled' : '') + '>Refaire</button>';
      const derniere = IA().historique(ctx).find(x => x.statut === 'brute' || x.statut === 'acceptee');
      if (manque.length) lignes.push('<p class="ps-ia-aide">Pour que MyRunTools propose tes séances : <button type="button" class="mrt-lien" data-profil>Compléter mon profil</button></p>');
      else if (etat.encours) lignes.push('<p class="ps-reco">' + (etat.readaptation ? 'MyRunTools réadapte tes séances…' : 'MyRunTools prépare tes séances…') + '</p>');
      else {
        if (derniere && ctx.profil && ctx.profil.maj && String(ctx.profil.maj) > String(derniere.cree))
          lignes.push('<p class="ps-profil-change">Ton profil a changé depuis la dernière proposition.</p>');
        const pm = (ctx.prefs || {}).plan_maj;
        if (derniere && pm && String(pm) > String(derniere.cree)) lignes.push('<p class="ps-profil-change ps-saison-change">Ta saison a changé depuis la dernière proposition.</p>');
        const reco = prop ? deuxPhrases(IA().recommandationDe(prop.reponse)) : '';
        lignes.push('<p class="ps-reco">' + (reco ? '<b>MyRunTools</b> : ' + esc(reco) + ' ' : '') + refaire +
          (Number.isFinite(reste) ? '<span class="ps-ia-reste"> · ' + reste + (reste > 1 ? ' restantes' : ' restante') + ' ce mois-ci</span>' : '') + '</p>');
      }
      if (etat.message) lignes.push('<p class="ps-ia-msg" role="alert">' + etat.message + '</p>');
    }
    if (!al && !lignes.length) return '';
    return '<section class="ps-bandeau">' + (al ? '<ul class="ps-alertes">' + al + '</ul>' : '') + lignes.join('') + '</section>';
  }

  // (3) La frise : tout le plan, une case par semaine (lundi, course, phase), la semaine en cours cerclée d'Accent ;
  // une case mène au Calendrier, sur sa semaine ; ‹ › font défiler de 4 semaines quand tout ne tient pas.
  function friseHtml(ctx, ps, lundi) {
    const derniere = ps.saisons[ps.saisons.length - 1], recupDer = ps.reperes.find(r => r.course === derniere.course);
    const fin = lundiDe(recupDer && recupDer.recupFin > derniere.jourJ ? recupDer.recupFin : derniere.jourJ);
    const debut = ps.saisons[0].premier < lundi ? ps.saisons[0].premier : lundi;
    const jm = d => (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS[d.getMonth()];
    // Les semaines consécutives d'une même phase forment un seul bloc : un fond, le nom de la phase une fois ; chaque semaine garde sa date, sa course et son lien.
    const blocs = [];
    for (let l = debut; l <= fin; l = addDays(l, 7)) {
      const x = P.phaseDe(ps, l), ph = x ? x.phase : 'entretien';
      const cs = ctx.courses.filter(c => c.date && c.etat === 'a_venir' && (c.statut === 'confirmee' || c.statut === 'option') && lundiDe(c.date) === l);
      const cas = '<a class="ps-sem ph-' + ph + (l === lundi ? ' is-courante' : '') + '" href="calendrier.html#semaines=' + l + '" data-lundi="' + l + '" title="' + esc('Semaine du ' + jm(parse(l)) + ' · ' + NOM_PHASE[ph]) + '">' +
        '<span class="ps-sem-d">' + jm(parse(l)) + '</span>' +
        cs.map(c => '<span class="ps-sem-c r-' + roleDe(c) + (c.statut === 'option' ? ' is-option' : '') + '">▲ ' + esc(c.course) + '</span>').join('') +
        '</a>';
      const b = blocs[blocs.length - 1];
      if (b && b.ph === ph) b.cases.push(cas); else blocs.push({ ph, cases: [cas] });
    }
    const cases = blocs.map(b => '<div class="ps-bloc-ph ph-' + b.ph + '"><div class="ps-bloc-sems">' + b.cases.join('') + '</div><span class="ps-sem-p">' + NOM_PHASE[b.ph] + '</span></div>');
    return '<div class="ps-frise-z"><button type="button" class="mrt-rond ps-fl" data-fl="-1" aria-label="Semaines précédentes" hidden>' + window.mrtIcone.gauche + '</button>' +
      '<div class="ps-frise-defile"><div class="ps-semaines">' + cases.join('') + '</div></div>' +
      '<button type="button" class="mrt-rond ps-fl" data-fl="1" aria-label="Semaines suivantes" hidden>' + window.mrtIcone.droite + '</button></div>';
  }

  window.renderSaison = function (root, ctx) {
    // (28) La feuille d'une course de la saison : son rôle et son avis ; Passer en Plaisir ou en Préparatoire, Retirer du plan, Voir la course.
    function feuilleCourse(c) {
      const role = roleDe(c), ROLE = { objectif: 'Objectif', preparatoire: 'Préparatoire', plaisir: 'Plaisir' }, nomS = x => '<b>' + esc(x.course) + '</b>';
      const voile = document.createElement('div');
      voile.className = 'mc-voile';
      voile.innerHTML = '<div class="mc-panneau mc-etroit mc-court ps-feuille-c" role="dialog" aria-modal="true" aria-labelledby="ps-fc-titre" tabindex="-1"><div class="mc-corps">' +
        '<div class="pc-barre ps-profil-barre"><span></span><button type="button" class="mrt-rond is-fermer" data-fermer aria-label="Fermer" title="Fermer">' + window.mrtIcone.fermer + '</button></div>' +
        '<p class="fc-libelle" id="ps-fc-titre">' + ROLE[role] + '</p><h3 class="ps-fc-nom">' + esc(c.course) + '</h3><p class="ps-fc-d">' + esc([window.mrtFormat.date(c.date, { semaine: true }), window.mrtCartes.distance(c)].filter(Boolean).join(' · ')) + '</p>' +
        (role === 'objectif' ? '' : P.avisHtml(P.avisCourse(ctx, c), nomS)) +
        '<div class="ps-fc-actions">' + (role === 'preparatoire' ? '<button type="button" class="mrt-btn" data-role="plaisir">Passer en Plaisir</button>' : role === 'plaisir' ? '<button type="button" class="mrt-btn" data-role="preparatoire">Passer en Préparatoire</button>' : '') +
        '<button type="button" class="mrt-btn" data-role="retirer">Retirer du plan</button><a class="mrt-lien" href="' + lien(c) + '">Voir la course →</a></div><p class="ps-msg" role="alert"></p></div></div>';
      document.body.appendChild(voile);
      document.documentElement.classList.add('mc-ouvert');
      const fermer = () => { voile.remove(); document.documentElement.classList.remove('mc-ouvert'); document.removeEventListener('keydown', clavier); };
      const clavier = ev => { if (ev.key === 'Escape' && !document.querySelector('.mrt-dialogue')) fermer(); };
      document.addEventListener('keydown', clavier);
      voile.addEventListener('mousedown', ev => { if (ev.target === voile) fermer(); });
      voile.addEventListener('click', async ev => {
        if (ev.target.closest('[data-fermer]')) return fermer();
        if (ev.target.closest('a[href^="course.html"]')) return fermer(); // la page de la course s'ouvre (modale du site)
        const b = ev.target.closest('[data-role]');
        if (!b) return;
        const r = b.dataset.role;
        if (r === 'retirer' && !(await window.mrtConfirmer({ texte: 'Retirer ' + c.course + ' du plan ? La course reste dans Saison ; elle n\'agit plus sur le plan.', action: 'Retirer du plan' }))) return;
        const { error } = await window.mrtSupabase.from('courses').update({ role: r === 'retirer' ? null : r }).eq('id', c.id);
        if (error) { console.warn(error); voile.querySelector('.ps-msg').textContent = 'Enregistrement impossible pour l\'instant.'; return; }
        await ctx.saisonChangee();
        fermer();
        await ctx.actualiser();
      });
      voile.querySelector('.mc-panneau').focus({ preventScroll: true });
    }

    ctx.actualiser = async () => { Object.assign(ctx, await ctx.relire()); dessiner(); };

    function dessiner() {
      const auj = iso(new Date()), lundi = lundiDe(auj), ps = P.planSaison(ctx);
      const prochaine = ps.saisons.find(x => x.jourJ >= auj);
      // Le parcours « Construire mon plan » (§ 5.0) : la page elle-même, sans Objectif à venir ou après « Changer d'Objectif ».
      if (!ctx.lectureSeule && window.mrtParcours && (ctx.parcours || !prochaine)) {
        if (!ctx.parcours) ctx.parcours = window.mrtParcours.nouveau(ctx);
        return window.mrtParcours.dessiner(root, ctx);
      }
      if (!prochaine) { root.innerHTML = '<div class="ps-cadre"><p class="ps-vide">Aucun Objectif à venir.</p></div>'; return; }
      const o = prochaine.course, M = window.mrtCartes;
      // (1) La carte de l'Objectif : nom et parcours, date complète, distance et D+, J-138 ; un plan plus court que le minimum du format.
      const jours = Math.round((parse(prochaine.jourJ) - parse(auj)) / 86400000), n = prochaine.semaines.length, mini = P.minimumDe(o);
      const infos = [window.mrtFormat.date(o.date, { semaine: true }), M.distance(o)].filter(Boolean).join(' · ');
      // (29) « Exporter » : le plan, de la semaine en cours à l'Objectif, en page à imprimer (Calendrier, § 4.6) ; aussi sur le site partagé.
      const exporter = window.mrtExport ? '<button type="button" class="mrt-btn" data-exporter>' + PICTO.exporter + 'Exporter</button>' : '';
      const reglages = ctx.lectureSeule ? (exporter ? '<div class="ps-reglages">' + exporter + '</div>' : '') : '<div class="ps-reglages">' +
        '<button type="button" class="mrt-btn" data-profil>' + PICTO.profil + 'Mon profil</button>' +
        '<button type="button" class="mrt-btn" data-parcours>' + PICTO.objectif + 'Changer d\'Objectif</button>' +
        '<button type="button" class="mrt-btn" data-preparer="' + esc(o.id) + '">' + P.REGLAGES + 'Personnaliser</button>' + exporter + '</div>';
      // (26) Les courses de la saison : les Préparatoires et les Plaisirs avant l'Objectif, puis lui ; chacune ouvre sa feuille (28).
      const avant = ctx.courses.filter(c => c.statut === 'confirmee' && c.etat === 'a_venir' && c.date && c.date >= auj && c.date < o.date && (roleDe(c) === 'preparatoire' || roleDe(c) === 'plaisir'))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      const puce = (c, role) => '<button type="button" class="ps-sc" data-sc="' + esc(c.id) + '"' + (ctx.lectureSeule ? ' disabled' : '') + '><span class="ps-sc-n">' + esc(c.course) + '</span> <span class="ps-sc-d">' + P.dateCourte(c.date) + ' · ' + role + '</span></button>';
      const saison = '<div class="ps-saison"><span class="ob-lib">Courses de la saison</span><div class="ps-sc-liste">' +
        avant.map(c => puce(c, roleDe(c) === 'preparatoire' ? 'Préparatoire' : 'Plaisir')).join('') + puce(o, 'Objectif') +
        (ctx.lectureSeule ? '' : '<button type="button" class="mrt-btn ps-sc-plus" data-prepa>' + window.mrtIcone.plus + 'Préparatoire</button>') + '</div></div>';
      let h = '<section class="ob-carte sans-cpt ps-objectif"><span class="ob-role is-obj">Objectif</span><span class="ps-j">J-' + jours + '</span>' +
        '<h2 class="ps-titre"><a href="' + lien(o) + '">' + M.nomHtml(o) + '</a></h2><p class="ps-sous">' + esc(infos) + '</p>' +
        (mini && n < mini ? '<p class="ps-court">Plan court : ' + n + (n > 1 ? ' semaines' : ' semaine') + ' (' + mini + ' au minimum)</p>' : '') + saison + reglages + '</section>';
      h += friseHtml(ctx, ps, lundi) + bandeauHtml(ctx, lundi, ps.alertes, o);
      ctx.objectifVise = o;
      // (19) Cette semaine, (22) le picto du Calendrier à côté, (20) son total.
      const total = window.mrtTotalSemaine(ctx, lundi);
      h += '<section class="ps-semaine"><div class="ps-semaine-tete"><h3 class="ps-libelle">Cette semaine' +
        '<a class="mrt-rond is-petit ps-vers-cal" href="calendrier.html" aria-label="Voir les semaines dans le Calendrier" title="Voir les semaines dans le Calendrier">' + PICTO.calendrier + '</a></h3>' + (total ? '<span class="cal-total">' + total + '</span>' : '') + '</div>' +
        window.mrtCetteSemaine(ctx, lundi, { plus: j => [...new Set(P.reperesDuJour(ps, j).map(r => (r.type === 'allege' ? 'Allégé' : r.type === 'repos' ? 'Repos' : 'Récupération')))].map(t => '<span class="cal-v-rep">' + t + '</span>').join('') }) + '</section>';
      root.innerHTML = '<div class="ps-cadre ps-vue">' + h + '</div>';
      placerFrise();
      if (M.couperNoms) M.couperNoms();
      automatique(lundi);
    }

    // La frise s'ouvre sur la semaine en cours (une semaine avant elle à gauche) ; les flèches seulement si tout ne tient pas.
    function placerFrise() {
      const d = root.querySelector('.ps-frise-defile'), c = d && d.querySelector('.is-courante');
      if (!d) return;
      if (c) d.scrollLeft = Math.max(0, c.getBoundingClientRect().left - d.getBoundingClientRect().left + d.scrollLeft - c.offsetWidth);
      majFleches();
      d.addEventListener('scroll', majFleches, { passive: true });
    }
    function majFleches() {
      const d = root.querySelector('.ps-frise-defile');
      if (!d) return;
      const [g, dr] = root.querySelectorAll('.ps-fl');
      g.hidden = d.scrollLeft <= 1;
      dr.hidden = d.scrollLeft + d.clientWidth >= d.scrollWidth - 1;
    }
    window.addEventListener('resize', majFleches);

    // Les séances de l'IA s'écrivent d'office (§ 6) : à la construction du plan, au début de chaque bloc (aucune proposition
    // ne couvre la semaine en cours), et une proposition restée en attente s'applique. Une fois par visite.
    async function automatique(lundi) {
      if (ctx.lectureSeule || !IA() || ctx.profil === undefined || ctx.propositions === undefined || ctx.ia.encours || ctx.autoFait) return;
      if (manquants(ctx.profil).length) return;
      ctx.autoFait = true;
      const prop = couvrante(ctx, lundi);
      if (prop && prop.statut === 'brute') { await appliquer({ id: prop.id, reponse: prop.reponse }, prop.bloc); await recharger(); return; }
      if (!prop && IA().restantes(ctx)) await proposer('proposer');
    }
    async function appliquer(r, bloc) {
      const err = await IA().accepter(ctx, r, lundisDu(bloc));
      if (err) console.warn(err);
      return err;
    }
    const recharger = async () => { await IA().lirePropositions(ctx); await ctx.actualiser(); };
    // Proposer (ou refaire) les séances du bloc qui commence cette semaine, et les écrire aussitôt.
    async function proposer(act) {
      const lundi = lundiDe(iso(new Date()));
      ctx.ia = { encours: true }; dessiner();
      const r = await IA().proposer(ctx, lundi, act);
      let message = r.message || null;
      if (r.id && await appliquer(r, lundi)) message = 'Enregistrement impossible pour l\'instant.';
      ctx.ia = { message };
      await recharger();
    }
    ctx.proposer = async () => {
      if (ctx.lectureSeule || !IA() || ctx.profil === undefined || manquants(ctx.profil).length || !IA().restantes(ctx) || ctx.ia.encours || ctx.autoFait) return;
      ctx.autoFait = true;
      await proposer('proposer');
    };

    ctx.redessiner = dessiner;
    // Un commentaire sur une séance : la réadaptation (hors plafond) s'écrit d'office, elle aussi.
    ctx.surCommentaire = async () => {
      if (!IA()) return;
      ctx.ia = { encours: true, readaptation: true }; dessiner();
      const r = await IA().readapter(ctx);
      ctx.ia = { message: r.reserve ? null : r.message || null };
      await recharger();
    };
    ctx.ia = {};
    // La saison a changé (un rôle donné, une course ajoutée ou retirée) : la date est retenue dans les préférences (§ 5.1, n° 9).
    ctx.saisonChangee = async () => {
      const t = new Date().toISOString();
      ctx.prefs = Object.assign({}, ctx.prefs, { plan_maj: t });
      const { error } = await window.mrtSupabase.from('preferences').upsert({ utilisateur: ctx.id, plan_maj: t });
      if (error) console.warn(error);
    };
    root.__ctx = ctx; // pour le banc d'essai
    root.addEventListener('click', async e => {
      if (e.target.closest('[data-profil]')) return ouvrirProfil(ctx);
      if (e.target.closest('[data-exporter]') && ctx.objectifVise) {
        const o = ctx.objectifVise, l = P.lundiDe(iso(new Date()));
        return window.mrtExport.imprimer(ctx, { titre: 'Mon plan · ' + o.course, debut: l, fin: P.addDays(P.lundiDe(o.date), 6), phases: true });
      }
      if (e.target.closest('[data-parcours]') && window.mrtParcours) { ctx.parcours = window.mrtParcours.nouveau(ctx); dessiner(); return window.scrollTo(0, 0); }
      const pr = e.target.closest('[data-prepa]');
      if (pr && window.mrtParcours && ctx.objectifVise) { ctx.parcours = window.mrtParcours.nouveau(ctx, { prepa: true, objectif: ctx.objectifVise.id, fenetre: pr.dataset.prepa === 'fenetre' }); dessiner(); return window.scrollTo(0, 0); }
      const sc = e.target.closest('[data-sc]');
      if (sc) { const c = ctx.courses.find(x => x.id === sc.dataset.sc); if (c) feuilleCourse(c); return; }
      const fl = e.target.closest('[data-fl]');
      if (fl) { const d = root.querySelector('.ps-frise-defile'), c = d.querySelector('.ps-sem'); return d.scrollBy({ left: Number(fl.dataset.fl) * 4 * (c ? c.offsetWidth + 4 : 80), behavior: 'smooth' }); }
      const b = e.target.closest('[data-ia="refaire"]');
      if (!b || b.disabled) return;
      const reste = IA().restantes(ctx);
      if (!(await window.mrtConfirmer({ texte: 'Refaire la proposition ? Les séances proposées par MyRunTools non faites seront remplacées (pas celles que tu as saisies, ni les faites).' +
        (Number.isFinite(reste) ? ' Elle compte pour une (' + reste + (reste > 1 ? ' restantes' : ' restante') + ' ce mois-ci).' : ''), action: 'Refaire' }))) return;
      await proposer('refaire');
    });
    P.brancher(root, ctx, null);
    dessiner();
    // Le profil d'entraînement (sa ligne : règle par ligne) et les propositions de l'IA, lus après le premier dessin ; jamais sur le site partagé.
    if (!ctx.lectureSeule) Promise.all([window.mrtSupabase.from('profil_entrainement').select('*'), IA() ? IA().lirePropositions(ctx) : null]).then(([{ data, error }]) => {
      if (error) console.warn(error);
      ctx.profil = (data && data[0]) || null;
      if (!IA()) ctx.propositions = [];
      dessiner();
    });
  };
})();
