// ===== Courses à surveiller : toutes les courses de l'utilisateur, en cartes, du plus proche au plus lointain =====
//
// Décrit par docs/module-courses-a-surveiller-specification.md ; style : composants/courses.css (et objectif.css, dont la
// carte est reprise). Cartes d'Objectif sans rôle, objectif ni compteur, rangées en colonnes (une sur téléphone).
//   renderCourses(el, courses, edition, etat)   la barre (vues, tri, année) et la liste ; etat : { vue, tri, annee }, modifié sur place
//   mrtVuesCourses(courses)                     les courses de chaque vue : { surveiller, venir, courue, tout }
(function () {
  const { esc, nomHtml, couperNoms, dateCourte, ligne, distance, lieuFormat, dossardHtml, lienSur, FLECHE, PLUS, STATUTS_LIB } = window.mrtCartes;
    const VUES = [['surveiller', 'À surveiller'], ['courue', 'Déjà couru'], ['venir', 'À venir'], ['tout', 'Tout']];
  const VIDE = { surveiller: 'Aucune course à surveiller.', courue: 'Aucune course courue.', venir: 'Aucune course à venir.', tout: 'Aucune course.' };

  // Les courses de chaque vue (une course dans une seule vue ; les abandonnées nulle part). Dates et statuts : docs, § 4.
  const croissant = (a, b) => (!a.date ? (b.date ? 1 : 0) : !b.date ? -1 : a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  window.mrtVuesCourses = function (courses) {
    const surveiller = courses.filter(c => c.etat === 'a_venir' && c.statut === 'a_surveiller').sort(croissant);
    const venir = window.mrtCoursesRoute(courses);
    const courue = courses.filter(c => c.etat === 'courue').sort((a, b) => croissant(b, a));
    // Tout : ce qui reste à venir (à surveiller et à venir) du plus proche au plus lointain, puis les courues, les plus récentes d'abord.
    return { surveiller, venir, courue, tout: surveiller.concat(venir).sort(croissant).concat(courue) };
  };

  // Tri par ouverture des inscriptions : les plus proches d'abord, puis les dates inconnues ; les inscrits à la fin.
  const cleOuverture = c => (c.inscrit ? '9' : c.ouverture_inscriptions ? '0' + c.ouverture_inscriptions + (c.ouverture_heure || '') : '5');
  const parOuverture = (a, b) => (cleOuverture(a) < cleOuverture(b) ? -1 : cleOuverture(a) > cleOuverture(b) ? 1 : croissant(a, b));

  const statut = c => (c.etat === 'courue' ? 'Courue' : c.statut === 'option' ? 'Option' + (c.groupe_options ? ' · ' + c.groupe_options : '') : STATUTS_LIB[c.statut]);
  const classe = c => (c.etat === 'courue' ? 'is-courue' : c.statut === 'confirmee' ? '' : 'is-opt');

  // Une carte : statut et date sur la première ligne, le nom dessous. Toucher la carte ouvre la fiche de modification ;
  // « Site officiel » est un lien à part, grisé quand le site n'est pas renseigné.
  function carte(c) {
    const site = lienSur(c.lien);
    const dist = distance(c);
    return '<article class="ob-carte cs-carte ' + classe(c) + '" data-id="' + esc(c.id) + '" tabindex="0" role="button" aria-label="Modifier ' + esc(window.mrtNomCourse(c)) + '">' +
      '<span class="ob-role">' + esc(statut(c)) + '</span><span class="ob-date">' + dateCourte(c) + '</span>' +
      '<h3 class="ob-nom">' + nomHtml(c) + '</h3>' +
      (lieuFormat(c) ? '<p class="ob-info">' + esc(lieuFormat(c)) + '</p>' : '') +
      '<div class="ob-lignes">' + (dist ? ligne('Distance', '<span class="ob-val">' + esc(dist) + '</span>') : '') +
        (c.etat === 'courue' ? '' : ligne('Dossard', dossardHtml(c, true))) + '</div>' +
      '<p class="cs-bas">' + (site
        ? '<a class="cs-site" href="' + esc(site) + '" target="_blank" rel="noopener">Site officiel ' + FLECHE + '</a>'
        : '<span class="cs-site is-off" aria-disabled="true">Site officiel ' + FLECHE + '</span>') + '</p></article>';
  }

  window.renderCourses = function (el, courses, edition, etat) {
    const vues = window.mrtVuesCourses(courses);
    if (!vues[etat.vue]) etat.vue = 'surveiller';
    const nonCourue = etat.vue !== 'courue';
    // Année : seulement pour les vues qui montrent des courues, et s'il y en a plus d'une.
    const anneesDe = l => [...new Set(l.filter(c => c.date).map(c => c.date.slice(0, 4)))].sort().reverse();
    const annees = etat.vue === 'courue' || etat.vue === 'tout' ? anneesDe(vues[etat.vue]) : [];
    if (!annees.includes(etat.annee)) etat.annee = null;
    let liste = vues[etat.vue].filter(c => !etat.annee || (c.date && c.date.slice(0, 4) === etat.annee));
    const parOuv = etat.tri === 'ouverture' && nonCourue;
    if (parOuv) { const f = liste.filter(c => c.etat !== 'courue'); liste = f.sort(parOuverture).concat(liste.filter(c => c.etat === 'courue')); }

    const pastille = (attr, cle, texte, on) => '<button type="button" class="mrt-pastille cs-pastille' + (on ? ' is-on' : '') + '" data-' + attr + '="' + cle + '" aria-pressed="' + on + '">' + texte + '</button>';
    const haut = '<div class="cs-barre"><div class="cs-vues" role="group" aria-label="Vue">' +
      VUES.map(([k, lib]) => pastille('vue', k, lib + ' <span class="cs-n">' + vues[k].length + '</span>', k === etat.vue)).join('') + '</div>' +
      '<div class="cs-outils"><span class="cs-compte">' + liste.length + (liste.length > 1 ? ' courses' : ' course') + '</span>' +
        (nonCourue ? '<div class="cs-tris" role="group" aria-label="Trier">' + pastille('tri', 'date', 'Par date', !parOuv) + pastille('tri', 'ouverture', 'Par ouverture', parOuv) + '</div>' : '') +
        (edition ? '<button type="button" class="ob-ajout mrt-btn is-principal" data-cs="ajouter" title="Ajouter une course">' + PLUS + '<span class="ob-ajout-long">Ajouter une course</span><span class="ob-ajout-court">Course</span></button>' : '') + '</div>' +
      (annees.length > 1 ? '<div class="cs-annees" role="group" aria-label="Année">' + pastille('annee', '', 'Toutes', !etat.annee) +
        annees.map(a => pastille('annee', a, a, a === etat.annee)).join('') + '</div>' : '') + '</div>';

    const html = liste.map(carte).join('');
    el.innerHTML = haut + (liste.length ? '<div class="cs-liste">' + html + '</div>' : '<p class="ob-vide cs-vide">' + VIDE[etat.vue] + '</p>');
    couperNoms();

    const redessiner = () => window.renderCourses(el, courses, edition, etat);
    el.querySelectorAll('[data-vue]').forEach(b => b.addEventListener('click', () => { etat.vue = b.dataset.vue; if (etat.onVue) etat.onVue(etat.vue); redessiner(); }));
    el.querySelectorAll('[data-tri]').forEach(b => b.addEventListener('click', () => { etat.tri = b.dataset.tri; redessiner(); }));
    el.querySelectorAll('[data-annee]').forEach(b => b.addEventListener('click', () => { etat.annee = b.dataset.annee || null; redessiner(); }));
    // Toucher une carte (hors lien « Site officiel ») : la fiche de modification ; en lecture seule, la page de la course.
    const ouvrir = id => (edition ? edition.modifier(id) : window.mrtOuvrirCourse(id));
    el.querySelectorAll('.cs-carte').forEach(k => {
      k.addEventListener('click', e => { if (!e.target.closest('a')) ouvrir(k.dataset.id); });
      k.addEventListener('keydown', e => { if (e.target === k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrir(k.dataset.id); } });
    });
    const ajout = el.querySelector('[data-cs="ajouter"]');
    if (ajout) ajout.addEventListener('click', () => edition.ajouter(etat.vue === 'courue' ? { mode: 'courue' } : etat.vue === 'surveiller' ? { defauts: { statut: 'a_surveiller' } } : undefined));
  };
})();
