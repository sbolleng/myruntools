// ===== Préparation : le plan de saison =====
//
// docs/module-preparation-specification.md, § 2 à 5. renderSaison(élément, ctx) dessine la page Préparation : la saison visée,
// l'état de la semaine, la frise de toutes les semaines à venir avec les courses, les alertes et le bloc de 4 semaines en cours.
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

  // Texte d'une alerte (spécification, § 3.4).
  function texteAlerte(a) {
    if (a.type === 'proches') return nom(a.course) + ' est à ' + a.semaines + ' semaines de ' + nom(a.autre) + ' (12 au moins conseillées entre deux Objectifs) : passe l\'un des deux en Préparatoire.';
    if (a.type === 'recup-affutage') return 'La récupération de ' + nom(a.course) + ' court jusqu\'au ' + longue(a.fin) + ' : elle déborde sur l\'affûtage de ' + nom(a.autre) + ' (dès le ' + longue(a.affutage) + ').';
    if (a.type === 'prepa-proche') return nom(a.course) + ' est à ' + a.jours + ' jours de ' + nom(a.autre) + ' : une Préparatoire se court au moins 3 semaines avant un Objectif de la distance du marathon ou plus, 2 semaines avant un plus court.';
    return nom(a.course) + ' est plus longue (en km-effort) que ' + nom(a.autre) + ', l\'Objectif de sa saison.';
  }

  // Repères d'une semaine : jours allégés, repos de la veille, récupération ; chacun limité à la semaine.
  function reperesSemaine(ps, lundi) {
    const dim = addDays(lundi, 6), dans = (a, b) => a <= dim && b >= lundi, out = [];
    ps.reperes.forEach(r => {
      const c = r.course;
      if (r.allegeDebut && dans(r.allegeDebut, r.allegeFin)) out.push('Allégé du ' + longue(r.allegeDebut) + ' au ' + longue(r.allegeFin) + ' : avant ' + nom(c) + ' (Préparatoire).');
      if (r.repos && dans(r.repos, r.repos)) out.push('Repos le ' + longue(r.repos) + ' : veille de ' + nom(c) + ' (Plaisir).');
      if (dans(r.recupDebut, r.recupFin)) out.push('Récupération de ' + nom(c) + ' jusqu\'au ' + longue(r.recupFin) + ' : séances faciles seulement.');
    });
    return out;
  }

  window.renderSaison = function (root, ctx) {
    ctx.actualiser = async () => { Object.assign(ctx, await ctx.relire()); dessiner(); };

    function dessiner() {
      const auj = iso(new Date()), lundi = lundiDe(auj), ps = P.planSaison(ctx);
      const prochaine = ps.saisons.find(x => x.jourJ >= auj);
      if (!prochaine) {
        root.innerHTML = '<div class="ps-cadre"><p class="ps-vide">Aucun Objectif à venir : donne le rôle Objectif à une course confirmée (page Objectif & plan) pour construire ta saison.</p></div>';
        return;
      }
      // (1) Saison visée ; (11) état de la semaine.
      const ici = P.phaseDe(ps, lundi);
      const dans = semainesEntre(auj, prochaine.jourJ);
      let etat = '';
      if (ici && ici.saison) etat = 'Cette semaine : ' + NOM_PHASE[ici.phase] + ', semaine ' + (ici.saison.semaines.findIndex(w => w.lundi === lundi) + 1) + ' sur ' + ici.saison.semaines.length + '.';
      else if (ici && ici.phase === 'recuperation') { const r = ps.reperes.find(x => x.course === ici.apres); etat = 'Cette semaine : Récupération de ' + nom(ici.apres) + ', jusqu\'au ' + longue(r.recupFin) + '.'; }
      else if (ici) etat = 'Cette semaine : Entretien, jusqu\'au ' + longue(addDays(prochaine.premier, -1)) + ' ; la saison commence le ' + longue(prochaine.premier) + '.';
      let h = '<div class="ps-cadre"><h1 class="ps-titre">Saison : vers « ' + nom(prochaine.course) + ' » · ' + longue(prochaine.jourJ) + ' <small>(dans ' + dans + ' sem.)</small></h1>' +
        '<p class="ps-etat">' + etat + (prochaine.raccourcie ? ' Saison raccourcie : ' + prochaine.semaines.length + ' semaines sur ' + prochaine.plan.n + '.' : '') + '</p>';

      // (3) Frise : de la semaine en cours à la dernière semaine du plan (dernière saison, ou récupération du dernier Objectif).
      const derniere = ps.saisons[ps.saisons.length - 1], recupDer = ps.reperes.find(r => r.course === derniere.course);
      const fin = lundiDe(recupDer && recupDer.recupFin > derniere.jourJ ? recupDer.recupFin : derniere.jourJ);
      const semaines = [];
      for (let l = lundi; l <= fin; l = addDays(l, 7)) semaines.push(l);
      const courses = ctx.courses.filter(c => c.date && c.etat === 'a_venir' && (c.statut === 'confirmee' || c.statut === 'option') && c.date >= lundi && c.date <= addDays(fin, 6));
      let premierMois = false;
      h += '<div class="ps-frise-defile"><div class="ps-frise" style="--n:' + semaines.length + '">' + semaines.map((l, i) => {
        const x = P.phaseDe(ps, l), ph = x ? x.phase : 'entretien', d = parse(l);
        // Nom du mois sur la semaine où il commence ; l'année sur le premier nom affiché et en janvier.
        const prec = i ? parse(semaines[i - 1]) : null, change = prec && prec.getMonth() !== d.getMonth();
        const mois = change ? MOIS[d.getMonth()] + (d.getMonth() === 0 || !premierMois ? ' ' + String(d.getFullYear()).slice(2) : '') : '';
        if (change) premierMois = true;
        const marques = courses.filter(c => lundiDe(c.date) === l).map(c => {
          const role = roleDe(c);
          return '<a class="ps-marque r-' + role + (c.statut === 'option' ? ' is-option' : '') + '" href="' + lien(c) + '" title="' + esc(c.course + ' · ' + longue(c.date) + ' · ' + ROLE[role] + (c.statut === 'option' ? ' (option)' : '')) + '">▲</a>';
        }).join('');
        return '<div class="ps-sem" data-lundi="' + l + '"><span class="ps-mois">' + mois + '</span><span class="ps-ph ph-' + ph + '" title="' + esc('Semaine du ' + longue(l) + ' · ' + NOM_PHASE[ph]) + '"></span><span class="ps-marques">' + marques + '</span></div>';
      }).join('') + '</div></div>';
      h += '<p class="ps-legende"><span><b class="ps-marque r-objectif">▲</b>Objectif</span><span><b class="ps-marque r-preparatoire">▲</b>Préparatoire</span><span><b class="ps-marque r-plaisir">▲</b>Plaisir</span>' +
        '<span><b class="ps-marque is-option">▲</b>option</span>' +
        ['base', 'developpement', 'affutage', 'deload', 'recuperation', 'entretien'].map(k => '<span><i class="cal-k ph-' + k + '"></i>' + NOM_PHASE[k] + '</span>').join('') + '</p>';

      // (4) Alertes.
      h += '<section class="ps-alertes"><h2 class="ps-libelle">Alertes (' + ps.alertes.length + ')</h2>' +
        (ps.alertes.length ? '<ul>' + ps.alertes.map(a => '<li class="ps-alerte" data-alerte="' + a.type + '">' + texteAlerte(a) + '</li>').join('') + '</ul>' : '') + '</section>';

      // (5) Bloc en cours : 4 semaines à partir de celle-ci, chacune avec ses repères (7) et ses séances.
      h += '<section class="ps-bloc"><h2 class="ps-libelle">Bloc en cours · ' + BLOC + ' semaines à partir du ' + longue(lundi) + '</h2><div class="cal-sem-liste">';
      for (let i = 0; i < BLOC; i++) {
        const l = addDays(lundi, 7 * i), x = P.phaseDe(ps, l), rep = reperesSemaine(ps, l);
        h += (rep.length ? '<ul class="ps-reperes">' + rep.map(t => '<li>' + t + '</li>').join('') + '</ul>' : '') +
          P.semaineHtml(ctx, l, { phase: x ? x.phase : null, numero: x && x.saison ? x.saison.semaines.findIndex(w => w.lundi === l) + 1 : null, modifiee: x && x.modifiee });
      }
      root.innerHTML = h + '</div></section></div>';
    }

    P.brancher(root, ctx, null);
    dessiner();
  };
})();
