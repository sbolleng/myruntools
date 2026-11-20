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
    calendrier: '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>' };

  // (9) Le bandeau de MyRunTools, toujours ouvert : les alertes, « Ton profil a changé… », la recommandation et « Refaire ».
  function bandeauHtml(ctx, lundi, alertes) {
    const al = alertes.map(a => '<li class="ps-alerte" data-alerte="' + a.type + '">' + texteAlerte(a) + '</li>').join('');
    const lignes = [];
    if (!ctx.lectureSeule && IA() && ctx.profil !== undefined) {
      const etat = ctx.ia || {}, manque = manquants(ctx.profil), prop = couvrante(ctx, lundi), reste = IA().restantes(ctx);
      const refaire = '<button type="button" class="mrt-lien" data-ia="refaire"' + (etat.encours || !reste ? ' disabled' : '') + '>Refaire</button>';
      const derniere = IA().historique(ctx).find(x => x.statut === 'brute' || x.statut === 'acceptee');
      if (manque.length) lignes.push('<p class="ps-ia-aide">Pour que MyRunTools propose tes séances : <button type="button" class="mrt-lien" data-profil>Compléter mon profil</button></p>');
      else if (etat.encours) lignes.push('<p class="ps-reco">' + (etat.readaptation ? 'MyRunTools réadapte tes séances…' : 'MyRunTools prépare tes séances…') + '</p>');
      else {
        if (derniere && ctx.profil && ctx.profil.maj && String(ctx.profil.maj) > String(derniere.cree))
          lignes.push('<p class="ps-profil-change">Ton profil a changé depuis la dernière proposition.</p>');
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
    const cases = [];
    for (let l = debut; l <= fin; l = addDays(l, 7)) {
      const x = P.phaseDe(ps, l), ph = x ? x.phase : 'entretien';
      const cs = ctx.courses.filter(c => c.date && c.etat === 'a_venir' && (c.statut === 'confirmee' || c.statut === 'option') && lundiDe(c.date) === l);
      cases.push('<a class="ps-sem ph-' + ph + (l === lundi ? ' is-courante' : '') + '" href="calendrier.html#semaines=' + l + '" data-lundi="' + l + '" title="' + esc('Semaine du ' + jm(parse(l)) + ' · ' + NOM_PHASE[ph]) + '">' +
        '<span class="ps-sem-d">' + jm(parse(l)) + '</span>' +
        cs.map(c => '<span class="ps-sem-c r-' + roleDe(c) + (c.statut === 'option' ? ' is-option' : '') + '">▲ ' + esc(c.course) + '</span>').join('') +
        '<span class="ps-sem-p">' + NOM_PHASE[ph] + '</span></a>');
    }
    return '<div class="ps-frise-z"><button type="button" class="mrt-rond ps-fl" data-fl="-1" aria-label="Semaines précédentes" hidden>' + window.mrtIcone.gauche + '</button>' +
      '<div class="ps-frise-defile"><div class="ps-semaines">' + cases.join('') + '</div></div>' +
      '<button type="button" class="mrt-rond ps-fl" data-fl="1" aria-label="Semaines suivantes" hidden>' + window.mrtIcone.droite + '</button></div>';
  }

  window.renderSaison = function (root, ctx) {
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
      const reglages = ctx.lectureSeule ? '' : '<div class="ps-reglages">' +
        '<button type="button" class="mrt-btn" data-profil>' + PICTO.profil + 'Mon profil</button>' +
        '<button type="button" class="mrt-btn" data-parcours>' + PICTO.objectif + 'Changer d\'Objectif</button>' +
        '<button type="button" class="mrt-btn" data-preparer="' + esc(o.id) + '">' + P.REGLAGES + 'Personnaliser</button></div>';
      let h = '<section class="ob-carte sans-cpt ps-objectif"><span class="ob-role is-obj">Objectif</span><span class="ps-j">J-' + jours + '</span>' +
        '<h2 class="ps-titre"><a href="' + lien(o) + '">' + M.nomHtml(o) + '</a></h2><p class="ps-sous">' + esc(infos) + '</p>' +
        (mini && n < mini ? '<p class="ps-court">Plan court : ' + n + (n > 1 ? ' semaines' : ' semaine') + ' (' + mini + ' au minimum)</p>' : '') + reglages + '</section>';
      h += friseHtml(ctx, ps, lundi) + bandeauHtml(ctx, lundi, ps.alertes);
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
      if (c) d.scrollLeft = Math.max(0, c.offsetLeft - c.offsetWidth - d.offsetLeft);
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
    root.__ctx = ctx; // pour le banc d'essai
    root.addEventListener('click', async e => {
      if (e.target.closest('[data-profil]')) return ouvrirProfil(ctx);
      if (e.target.closest('[data-parcours]') && window.mrtParcours) { ctx.parcours = window.mrtParcours.nouveau(ctx); dessiner(); return window.scrollTo(0, 0); }
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
