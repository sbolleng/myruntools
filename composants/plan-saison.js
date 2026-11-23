// ===== Mon plan : la vue d'ensemble =====
//
// docs/module-preparation-specification.md, § 5.1. renderSaison(élément, ctx) dessine la page Mon plan : la carte de l'Objectif
// visé et les réglages du plan (Mon profil, Changer d'Objectif, Personnaliser), la frise de tout le plan (une case par semaine),
// le bandeau de MyRunTools (alertes, recommandation), Cette semaine. Sans Objectif à venir : le parcours
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
  const ouvrirProfil = ctx => { ctx.profilOuvert = true; window.mrtProfil.feuille({ etat: { id: ctx.id, mesures: ctx.mesures || {}, entrainement: ctx.profil || null, courses: ctx.courses },
    surMaj: e => { ctx.profil = e.entrainement; ctx.mesures = e.mesures; ctx.redessiner(); }, surFermer: () => { ctx.profilOuvert = false; if (ctx.majPlan) ctx.majPlan(); } }); };
  const IA = () => window.mrtSeancesIA;
  const lundisDu = lundi => [0, 1, 2, 3].map(i => addDays(lundi, 7 * i));
  // La recommandation en deux phrases au plus (§ 5.1, n° 9).
  const deuxPhrases = t => String(t || '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  // La proposition qui couvre une semaine : la plus récente en attente ou acceptée dont le bloc de 4 semaines la contient.
  const couvrante = (ctx, lundi) => (ctx.propositions || []).filter(x => (x.statut === 'brute' || x.statut === 'acceptee') && x.bloc <= lundi && lundi < addDays(x.bloc, 7 * BLOC))
    .sort((a, b) => (a.cree < b.cree ? 1 : -1))[0] || null;
  const PICTO = { exporter: '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v7.5M4.8 7L8 10.2 11.2 7M3 13h10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    profil: '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.2" r="2.7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.8 14c.6-2.9 2.6-4.4 5.2-4.4s4.6 1.5 5.2 4.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    objectif: '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 14V2.5M3.5 3h8l-1.8 2.7 1.8 2.8h-8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' };

  // (9) Le bandeau de MyRunTools, toujours ouvert : les alertes, la préparatoire conseillée, la recommandation de l'IA.
  function bandeauHtml(ctx, lundi, alertes, o) {
    const al = alertes.map(a => '<li class="ps-alerte" data-alerte="' + a.type + '">' + texteAlerte(a) + '</li>').join('');
    const lignes = [];
    // (16) La préparatoire conseillée, tant que sa fenêtre n'est pas passée et qu'aucune Préparatoire conseillée n'y est.
    const sg = !ctx.lectureSeule && o ? P.suggestion(ctx, o) : null;
    if (sg) lignes.push('<p class="ps-sg-ligne"><b>Préparatoire conseillée</b> : ' + sg.fenetre.texte + ', du ' + P.longue(sg.debut) + ' au ' + P.longue(sg.fin) + '. <button type="button" class="mrt-lien" data-prepa="fenetre">Ajouter une course</button></p>');
    if (!ctx.lectureSeule && IA() && ctx.profil !== undefined) {
      const etat = ctx.ia || {}, manque = manquants(ctx.profil), prop = couvrante(ctx, lundi);
      const suite = etat.blocs > 1 ? ' (bloc ' + etat.bloc + ' sur ' + etat.blocs + ')' : '';
      if (manque.length) lignes.push('<p class="ps-ia-aide">Pour que MyRunTools propose tes séances : <button type="button" class="mrt-lien" data-profil>Compléter mon profil</button></p>');
      else if (etat.encours) lignes.push('<p class="ps-reco">' + (etat.revue ? 'MyRunTools révise tes prochaines semaines…' : etat.maj ? 'MyRunTools met à jour ton plan…' + suite : etat.readaptation ? 'MyRunTools réadapte tes séances…' : 'MyRunTools prépare tes séances…' + suite) + '</p>');
      else {
        const reco = prop ? deuxPhrases(IA().recommandationDe(prop.reponse)) : '';
        if (reco) lignes.push('<p class="ps-reco"><b>MyRunTools</b> : ' + esc(reco) + '</p>');
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
    const jjmm = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); // la date de la case : JJ/MM, pour gagner de la place
    // Les semaines consécutives d'une même phase forment un seul bloc : un fond, le nom de la phase une fois ; chaque semaine garde sa date, sa course et son lien.
    const blocs = [];
    for (let l = debut; l <= fin; l = addDays(l, 7)) {
      const x = P.phaseDe(ps, l), ph = x ? x.phase : 'entretien';
      const cs = ctx.courses.filter(c => c.date && c.etat === 'a_venir' && (c.statut === 'confirmee' || c.statut === 'option') && lundiDe(c.date) === l);
      const cas = '<a class="ps-sem ph-' + ph + (l === lundi ? ' is-courante' : '') + '" href="calendrier.html#semaines=' + l + '" data-lundi="' + l + '" title="' + esc('Semaine du ' + jm(parse(l)) + ' · ' + NOM_PHASE[ph]) + '">' +
        '<span class="ps-sem-d">' + jjmm(parse(l)) + '</span>' +
        (cs.length ? '<span class="ps-sem-cs">' + cs.map(c => '<span class="ps-sem-c r-' + roleDe(c) + (c.statut === 'option' ? ' is-option' : '') + '" title="' + esc(c.course) + '">' + window.mrtIcone.repere + esc(c.course) + '</span>').join('') + '</span>' : '') +
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
        '<a class="mrt-btn" href="' + lien(c) + '">Voir la course</a><button type="button" class="mrt-btn is-danger" data-role="retirer">Retirer du plan</button></div><p class="ps-msg" role="alert"></p></div></div>';
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
        if (r === 'retirer' && !(await window.mrtConfirmer({ texte: 'Retirer ' + c.course + ' du plan ? La course reste dans Ma saison ; elle n\'agit plus sur le plan.', action: 'Retirer du plan' }))) return;
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
      // (29) « Exporter » (dans le menu des réglages) : le plan, de la semaine en cours à l'Objectif, en page à imprimer (Calendrier, § 4.6) ; aussi sur le site partagé.
      // « Mon profil » : absent quand le bandeau invite déjà à « Compléter mon profil » (un seul accès à la fois).
      const profilInvite = !ctx.lectureSeule && IA() && ctx.profil !== undefined && manquants(ctx.profil).length > 0;
      // (10) Les réglages du plan, rarement touchés : un seul bouton Menu (design, § 11), en bas de la page ; sur le site partagé, Exporter seul.
      const item = (attr, picto, texte) => '<button type="button" class="mrt-menu-l" role="menuitem" ' + attr + '>' + picto + texte + '</button>';
      const items = (ctx.lectureSeule ? '' : (profilInvite ? '' : item('data-profil', PICTO.profil, 'Mon profil')) + item('data-parcours', PICTO.objectif, 'Changer d\'Objectif') +
        item('data-preparer="' + esc(o.id) + '"', P.REGLAGES, 'Personnaliser')) + (window.mrtExport ? item('data-exporter', PICTO.exporter, 'Exporter') : '');
      const reglages = items ? '<div class="ps-reglages"><button type="button" class="mrt-btn ps-reglages-btn" data-reglages aria-expanded="false" aria-controls="ps-reglages-menu">Réglages du plan' + window.mrtIcone.chevronBas + '</button>' +
        '<div class="mrt-menu" id="ps-reglages-menu" role="menu" hidden>' + items + '</div></div>' : '';
      // (26) Les courses de la saison : les Préparatoires et les Plaisirs avant l'Objectif, puis lui ; chacune ouvre sa feuille (28).
      const avant = ctx.courses.filter(c => c.statut === 'confirmee' && c.etat === 'a_venir' && c.date && c.date >= auj && c.date < o.date && (roleDe(c) === 'preparatoire' || roleDe(c) === 'plaisir'))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      // Un lien commun par course (design, § 11) : le nom et le chevron dessiné ; la date et le rôle dans l'infobulle (la feuille de la course les donne).
      const puce = (c, role) => '<button type="button" class="mrt-lien ps-sc" data-sc="' + esc(c.id) + '" title="' + esc(c.course + ' · ' + P.dateCourte(c.date) + ' · ' + role) + '"' + (ctx.lectureSeule ? ' disabled' : '') + '><span class="ps-sc-n">' + esc(c.course) + '</span>' + window.mrtIcone.droite + '</button>';
      // (30) Le rond « i » : comment MyRunTools construit le plan (le Guide demande une connexion : pas sur le site partagé).
      const info = ctx.lectureSeule ? '' : '<a class="mrt-rond ps-guide" href="guide.html#saison" aria-label="Comment MyRunTools construit ton plan" title="Comment MyRunTools construit ton plan">' + window.mrtIcone.info + '</a>';
      // (5) Seules les courses avant l'Objectif, après « Avant : » (l'Objectif est le titre) ; (6) « + Préparatoire » au bout de la ligne.
      const saison = '<div class="ps-saison"><div class="ps-sc-liste">' + (avant.length ? '<span class="ps-sc-avant">Avant :</span>' : '') +
        avant.map(c => puce(c, roleDe(c) === 'preparatoire' ? 'Préparatoire' : 'Plaisir')).join('') +
        (ctx.lectureSeule ? '' : '<button type="button" class="mrt-lien ps-sc-plus" data-prepa>' + window.mrtIcone.plus + 'Préparatoire</button>') + '</div>' +
        // (25) Réglages du plan, puis (30) le rond « i » : sur la même ligne, tout à droite.
        '<span class="ps-saison-droite">' + reglages + info + '</span></div>';
      let h = '<section class="ob-carte sans-cpt ps-objectif">' +
        '<h2 class="ps-titre"><a href="' + lien(o) + '">' + M.nomHtml(o) + '</a></h2><span class="ps-droite"><span class="ps-j">' + jours + ' j</span></span><p class="ps-sous">' + esc(infos) + '</p>' +
        (mini && n < mini ? '<p class="ps-court">Plan court : ' + n + (n > 1 ? ' semaines' : ' semaine') + ' (' + mini + ' au minimum)</p>' : '') + saison + '</section>';
      h += friseHtml(ctx, ps, lundi) + bandeauHtml(ctx, lundi, ps.alertes, o);
      ctx.objectifVise = o;
      // (19) Cette semaine, (22) le lien « Calendrier › » à côté, (20) son total.
      const total = window.mrtTotalSemaine(ctx, lundi);
      h += '<section class="ps-semaine"><div class="ps-semaine-tete"><h3 class="ps-libelle">Cette semaine' +
        '<a class="mrt-lien ps-vers-cal" href="calendrier.html" title="Voir les semaines dans le Calendrier">Calendrier' + window.mrtIcone.droite + '</a></h3>' + (total ? '<span class="cal-total">' + total + '</span>' : '') + '</div>' +
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
    // Ce qui déclenche une mise à jour : la saison (rôle donné, course ajoutée ou retirée) ou le profil a changé depuis la dernière proposition.
    const cleAuto = () => [(ctx.prefs || {}).plan_maj || '', (ctx.profil || {}).maj || ''].join('|');
    function aMettreAJour() {
      const d = IA().historique(ctx).find(x => x.statut === 'brute' || x.statut === 'acceptee'), pm = (ctx.prefs || {}).plan_maj;
      return !!d && !!((ctx.profil && ctx.profil.maj && String(ctx.profil.maj) > String(d.cree)) || (pm && String(pm) > String(d.cree)));
    }
    // Une seule tentative par état (saison, profil) : un échec ne se rejoue pas en boucle.
    async function automatique(lundi) {
      if (ctx.lectureSeule || !IA() || ctx.profil === undefined || ctx.propositions === undefined || ctx.ia.encours || ctx.profilOuvert) return;
      if (manquants(ctx.profil).length) return;
      const cle = cleAuto();
      if (ctx.autoCle === cle) return;
      ctx.autoCle = cle;
      const prop = couvrante(ctx, lundi);
      if (prop && prop.statut === 'brute') { await appliquer({ id: prop.id, reponse: prop.reponse }, prop.bloc); await recharger(); return; }
      // Mise à jour (§ 6) : la saison ou le profil a changé, tout le plan est refait de la semaine en cours à l'Objectif (hors plafond).
      if (aMettreAJour()) return proposerPlan(lundi, { tout: true });
      // Revue (§ 6) : la proposition qui couvre cette semaine date de 4 semaines ou plus : les 4 prochaines semaines sont refaites avec ce qui a été fait.
      if (prop && Date.now() - new Date(prop.cree).getTime() >= 28 * 864e5) {
        ctx.ia = { encours: true, readaptation: true, revue: true }; dessiner();
        const r = await IA().readapter(ctx);
        ctx.ia = { message: r.reserve ? null : r.message || null };
        return recharger();
      }
      if (IA().restantes(ctx)) await proposerPlan(lundi);
    }
    // Les blocs du plan : de la semaine en cours à la semaine de l'Objectif visé, 6 blocs de 4 semaines au plus (la revue ajoute la suite).
    function blocsDuPlan(lundi) {
      const x = P.planSaison(ctx).saisons.find(z => z.jourJ >= iso(new Date())), fin = x ? lundiDe(x.jourJ) : lundi, l = [];
      for (let b = lundi; b <= fin && l.length < 6; b = addDays(b, 7 * BLOC)) l.push(b);
      return { lundis: l.length ? l : [lundi], fin };
    }
    // Propose, bloc après bloc, ceux qu'aucune proposition acceptée ne couvre encore (§ 6) ; chacun s'écrit aussitôt et sert d'historique au suivant.
    // Un bloc dont la proposition est restée en attente (page quittée en route) est écrit sans nouvel appel.
    // Seule la première proposition compte pour le plafond : les suivantes sont de motif « readaptation » (hors plafond).
    async function proposerPlan(lundi, opts) {
      const tout = !!(opts && opts.tout);
      const { lundis, fin } = blocsDuPlan(lundi), ecrire = l => lundisDu(l).filter(x => x <= fin);
      const couvert = l => (ctx.propositions || []).some(x => x.statut === 'acceptee' && x.bloc <= l && l < addDays(x.bloc, 7 * BLOC));
      const enAttenteDe = l => (ctx.propositions || []).filter(x => x.statut === 'brute' && x.bloc === l).sort((a, b) => (a.cree < b.cree ? 1 : -1))[0];
      const aFaire = tout ? lundis : lundis.filter(l => !couvert(l));
      for (let i = 0; i < aFaire.length; i++) {
        ctx.ia = { encours: true, bloc: i + 1, blocs: aFaire.length, maj: tout }; dessiner();
        const att = tout ? null : enAttenteDe(aFaire[i]);
        const r = att ? { id: att.id, reponse: att.reponse } : await IA().proposer(ctx, aFaire[i], !tout && i === 0 ? 'proposer' : 'readaptation');
        if (r.message) { ctx.ia = { message: r.message }; break; }
        if (r.id) {
          const err = await IA().accepter(ctx, r, ecrire(aFaire[i]));
          if (err) { console.warn(err); ctx.ia = { message: 'Enregistrement impossible pour l\'instant.' }; break; }
        }
        await IA().lirePropositions(ctx); await ctx.actualiser();
      }
      if (ctx.ia.encours) ctx.ia = {};
      await recharger();
    }
    async function appliquer(r, bloc) {
      const err = await IA().accepter(ctx, r, lundisDu(bloc));
      if (err) console.warn(err);
      return err;
    }
    const recharger = async () => { await IA().lirePropositions(ctx); await ctx.actualiser(); };
    ctx.proposer = async () => {
      if (ctx.lectureSeule || !IA() || ctx.profil === undefined || manquants(ctx.profil).length || !IA().restantes(ctx) || ctx.ia.encours || ctx.autoFait) return;
      ctx.autoFait = true; ctx.autoCle = cleAuto();
      await proposerPlan(lundiDe(iso(new Date())));
    };

    ctx.redessiner = dessiner;
    ctx.majPlan = () => automatique(lundiDe(iso(new Date())));
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
      // (10) Menu « Réglages du plan » : il s'ouvre et se ferme d'un toucher ; un choix le referme.
      const bouton = e.target.closest('[data-reglages]'), menu = root.querySelector('#ps-reglages-menu');
      if (bouton && menu) { const ouvert = menu.hidden; menu.hidden = !ouvert; bouton.setAttribute('aria-expanded', String(ouvert)); return; }
      if (menu && !menu.hidden && e.target.closest('.mrt-menu-l')) { menu.hidden = true; root.querySelector('[data-reglages]').setAttribute('aria-expanded', 'false'); }
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
