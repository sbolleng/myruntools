// ===== Courses à surveiller : toutes les courses de l'utilisateur, en cartes, du plus proche au plus lointain =====
//
// Décrit par docs/module-courses-a-surveiller-specification.md ; style : composants/courses.css (et objectif.css, dont la
// carte est reprise). Cartes d'Objectif sans rôle, objectif ni compteur, rangées en colonnes (une sur téléphone).
//   renderCourses(el, courses, edition, etat)   la barre (sélection, vue, année) et la liste ; etat : { vue, mode, annee, col, dir }, modifié sur place
//   mrtVuesCourses(courses)                     les courses de chaque vue : { surveiller, venir, courue, tout }
(function () {
  const { MOIS_LONG } = window.mrtFormat;
  const { esc, nomHtml, couperNoms, dateCourte, ligne, distance, lieuFormat, dossardHtml, lienSur, FLECHE, PLUS, STATUTS_LIB } = window.mrtCartes;
    const VUES = [['surveiller', 'À surveiller'], ['ouvertes', 'Inscriptions ouvertes'], ['courue', 'Déjà couru'], ['venir', 'À venir'], ['tout', 'Tout']];
  const VIDE = { surveiller: 'Aucune course à surveiller.', ouvertes: 'Aucune inscription ouverte pour l\'instant.', courue: 'Aucune course courue.', venir: 'Aucune course à venir.', tout: 'Aucune course.' };

  // Les courses de chaque vue (une course dans une seule vue ; les abandonnées nulle part). Dates et statuts : docs, § 4.
  const croissant = (a, b) => (!a.date ? (b.date ? 1 : 0) : !b.date ? -1 : a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  window.mrtVuesCourses = function (courses) {
    const surveiller = courses.filter(c => c.etat === 'a_venir' && c.statut === 'a_surveiller').sort(croissant);
    const venir = window.mrtCoursesRoute(courses);
    const courue = courses.filter(c => c.etat === 'courue').sort((a, b) => croissant(b, a));
    // Tout : ce qui reste à venir (à surveiller et à venir) du plus proche au plus lointain, puis les courues, les plus récentes d'abord.
    // Inscriptions ouvertes : à venir, pas encore inscrit, ouverture atteinte (date et heure), quel que soit le statut.
    const ouvertes = courses.filter(c => c.etat === 'a_venir' && window.mrtCartes.dossardEtat(c) === 'ouvert').sort(croissant);
    return { surveiller, ouvertes, venir, courue, tout: surveiller.concat(venir).sort(croissant).concat(courue) };
  };

  // Tri par ouverture des inscriptions : les plus proches d'abord, puis les dates inconnues ; les inscrits à la fin.
  const cleOuverture = c => (c.etat === 'courue' ? '99' : c.inscrit ? '9' : c.ouverture_inscriptions ? '0' + c.ouverture_inscriptions + (c.ouverture_heure || '') : '5');

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

  // Tableau : les colonnes de la veille (Événement, Course, Distance · D+, Date, Ouverture des dossards), une ligne par course.
  const heureTxt = h => window.mrtFormat.heure(h);
  function ligneTableau(c) {
    const site = lienSur(c.lien), dist = distance(c);
    return '<tr class="cs-ligne" data-id="' + esc(c.id) + '" tabindex="0" role="button" aria-label="Modifier ' + esc(window.mrtNomCourse(c)) + '">' +
      '<td><strong>' + (site ? '<a class="cs-lien-nom" href="' + esc(site) + '" target="_blank" rel="noopener" title="Site officiel">' + esc(c.course) + '</a>' : esc(c.course)) + '</strong>' +
        (c.lieu ? '<br><span class="cs-sous">' + esc(c.lieu) + '</span>' : '') + '</td>' +
      '<td>' + (c.parcours && c.parcours !== c.course ? esc(c.parcours) : '<span class="cs-sous">—</span>') + '</td>' +
      '<td>' + (dist ? esc(dist) : '<span class="cs-sous">—</span>') + '</td>' +
      '<td>' + dateCourte(c) + (c.heure && !c.date_approx ? '<br><span class="cs-sous">' + heureTxt(c.heure) + '</span>' : '') + '</td>' +
      '<td>' + (c.etat === 'courue' ? '<span class="cs-sous">—</span>' : dossardHtml(c, true)) + '</td></tr>';
  }
  // Pictos des deux affichages : une grille de cartes, un tableau ; et le double triangle des colonnes triables (comme le Palmarès).
  const GRILLE = '<svg class="ob-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5h4.5v4.5h-4.5z M9 2.5h4.5v4.5h-4.5z M2.5 9h4.5v4.5h-4.5z M9 9h4.5v4.5h-4.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const TABLE = '<svg class="ob-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11v9h-11z M2.5 7h11 M2.5 10h11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const TRI = window.mrtIcone.tri; // en-tête triable commun (mrt-tri), comme le Palmarès
  const COLONNES = [['evenement', 'Événement'], ['course', 'Course'], ['distance', 'Distance · D+'], ['date', 'Date'], ['ouverture', 'Ouverture des inscriptions']];
  // Valeur de tri de chaque colonne (une valeur vide passe toujours en dernier).
  const CLES = { evenement: c => c.course.toLowerCase(), course: c => (c.parcours || '').toLowerCase() || null, distance: c => (c.distance != null ? Number(c.distance) : null), date: c => c.date || null, ouverture: cleOuverture };
  const CLE_MODE = 'mrt-courses-affichage';
  const lireMode = () => { try { return localStorage.getItem(CLE_MODE) === 'tableau' ? 'tableau' : 'cartes'; } catch (e) { return 'cartes'; } };
  const ecrireMode = m => { try { localStorage.setItem(CLE_MODE, m); } catch (e) { /* stockage indisponible */ } };

  window.renderCourses = function (el, courses, edition, etat) {
    if (!etat.mode) etat.mode = lireMode();
    const vues = window.mrtVuesCourses(courses);
    if (!vues[etat.vue]) etat.vue = 'surveiller';
    // Année : seulement pour les vues qui montrent des courues, et s'il y en a plus d'une.
    const anneesDe = l => [...new Set(l.filter(c => c.date).map(c => c.date.slice(0, 4)))].sort().reverse();
    const annees = etat.vue === 'courue' || etat.vue === 'tout' ? anneesDe(vues[etat.vue]) : [];
    if (!annees.includes(etat.annee)) etat.annee = null;
    let liste = vues[etat.vue].filter(c => !etat.annee || (c.date && c.date.slice(0, 4) === etat.annee));
    const tab = etat.mode === 'tableau';
    // Cartes : toujours par date, regroupées par mois ; tableau : les colonnes se trient (premier toucher croissant, deuxième décroissant, troisième : ordre d'origine).
    const col = tab ? etat.col : null;
    if (tab && col) {
      const f = CLES[col], sens = etat.dir === 'desc' ? -1 : 1;
      liste = liste.slice().sort((x, y) => {
        const u = f(x), v = f(y);
        if (u == null && v == null) return croissant(x, y);
        if (u == null) return 1;
        if (v == null) return -1;
        return (u < v ? -1 : u > v ? 1 : 0) * sens || croissant(x, y);
      });
    }
    const parMois = !tab;

    const pastille = (attr, cle, texte, on) => '<button type="button" class="mrt-pastille cs-pastille' + (on ? ' is-on' : '') + '" data-' + attr + '="' + cle + '" aria-pressed="' + on + '">' + texte + '</button>';
    // Réglages discrets : un libellé, puis les choix en texte (le choix actif souligné).
    const choix = (attr, cle, texte, on) => '<button type="button" class="mrt-choix" data-' + attr + '="' + cle + '" aria-pressed="' + on + '">' + texte + '</button>';
    const reglage = (libelle, html) => '<div class="cs-reglage"><span class="cs-lib">' + libelle + '</span>' + html + '</div>';
    const rond = (cle, texte, picto) => '<button type="button" class="mrt-rond cs-rond" data-mode="' + cle + '" aria-pressed="' + (etat.mode === cle) + '" aria-label="' + texte + '" title="' + texte + '">' + picto + '</button>';
    const haut = '<div class="cs-barre"><div class="cs-vues" role="group" aria-label="Sélection">' +
      VUES.map(([k, lib]) => pastille('vue', k, lib + ' <span class="cs-n">' + vues[k].length + '</span>', k === etat.vue)).join('') + '</div>' +
      '<div class="cs-outils">' +
        reglage('Vue', '<span class="cs-ronds" role="group" aria-label="Affichage">' + rond('cartes', 'Cartes', GRILLE) + rond('tableau', 'Tableau', TABLE) + '</span>') +
        (annees.length > 1 ? reglage('Année', choix('annee', '', 'Toutes', !etat.annee) + annees.map(a => choix('annee', a, a, a === etat.annee)).join('')) : '') +
        (edition ? '<button type="button" class="ob-ajout mrt-btn is-principal" data-cs="ajouter" title="Ajouter une course">' + PLUS + '<span class="ob-ajout-long">Ajouter une course</span><span class="ob-ajout-court">Course</span></button>' : '') + '</div></div>';

    // Regroupées par mois (tri par date) : un titre, puis les cartes du mois côte à côte ; « Date à définir » en dernier.
    const groupes = [];
    liste.forEach(c => {
      const m = parMois ? (c.date ? c.date.slice(0, 7) : 'sans') : '';
      if (!groupes.length || groupes[groupes.length - 1].m !== m) groupes.push({ m, cartes: [] });
      groupes[groupes.length - 1].cartes.push(c);
    });
    const html = groupes.map(g => '<section class="cs-groupe">' + (g.m ? '<h2 class="cs-mois ob-lib">' +
      (g.m === 'sans' ? 'Date à définir' : MOIS_LONG[Number(g.m.slice(5)) - 1] + ' ' + g.m.slice(0, 4)) + '</h2>' : '') +
      '<div class="cs-grille">' + g.cartes.map(carte).join('') + '</div></section>').join('');
    // Tableau : les mêmes groupes (titres de mois en lignes), dans un cadre ; il défile sur le côté s'il est plus large que l'écran.
    const tableau = '<div class="cs-tableau"><div class="table-scroll"><table><thead><tr>' + COLONNES.map(([k, lib]) => {
        const actif = col ? col === k : k === 'date', sens = col ? etat.dir : etat.vue === 'courue' ? 'desc' : 'asc';
        return '<th aria-sort="' + (actif ? (sens === 'desc' ? 'descending' : 'ascending') : 'none') + '"><button type="button" class="mrt-tri" data-col="' + k + '">' + lib + TRI + '</button></th>';
      }).join('') + '</tr></thead><tbody>' +
      liste.map(ligneTableau).join('') + '</tbody></table></div></div>';
    el.innerHTML = haut + (liste.length ? (etat.mode === 'tableau' ? tableau : '<div class="cs-liste">' + html + '</div>') : '<p class="ob-vide cs-vide">' + VIDE[etat.vue] + '</p>');
    couperNoms();

    const redessiner = () => window.renderCourses(el, courses, edition, etat);
    el.querySelectorAll('[data-vue]').forEach(b => b.addEventListener('click', () => { etat.vue = b.dataset.vue; if (etat.onVue) etat.onVue(etat.vue); redessiner(); }));
    el.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { etat.mode = b.dataset.mode; ecrireMode(etat.mode); redessiner(); }));
    el.querySelectorAll('[data-col]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.col;
      if (etat.col !== k) { etat.col = k; etat.dir = 'asc'; } else if (etat.dir === 'asc') etat.dir = 'desc'; else etat.col = null;
      redessiner();
    }));
    el.querySelectorAll('[data-annee]').forEach(b => b.addEventListener('click', () => { etat.annee = b.dataset.annee || null; redessiner(); }));
    // Toucher une carte (hors lien « Site officiel ») : la fiche de modification ; en lecture seule, la page de la course.
    const ouvrir = id => (edition ? edition.modifier(id) : window.mrtOuvrirCourse(id));
    el.querySelectorAll('.cs-carte, .cs-ligne').forEach(k => {
      k.addEventListener('click', e => { if (!e.target.closest('a')) ouvrir(k.dataset.id); });
      k.addEventListener('keydown', e => { if (e.target === k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrir(k.dataset.id); } });
    });
    const ajout = el.querySelector('[data-cs="ajouter"]');
    if (ajout) ajout.addEventListener('click', () => edition.ajouter(etat.vue === 'courue' ? { mode: 'courue' } : etat.vue === 'surveiller' ? { defauts: { statut: 'a_surveiller' } } : undefined));
  };
})();
