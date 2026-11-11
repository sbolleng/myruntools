// ===== Courses : toutes les courses de l'utilisateur, en cartes ou en tableau, derrière un bouton Filtres =====
//
// Décrit par docs/module-courses-a-surveiller-specification.md ; style : composants/courses.css (et objectif.css, dont la
// carte est reprise). Cartes d'Objectif sans rôle, objectif ni compteur, rangées en colonnes (une sur téléphone).
//   renderCourses(el, courses, edition, etat)   la barre (filtres, affichage) et la liste ; etat : { cats, ouvertes, annee, panneau, mode, col, dir }, modifié sur place
(function () {
  const { MOIS_LONG } = window.mrtFormat;
  const { esc, nomHtml, couperNoms, dateCourte, ligne, distance, lieuFormat, dossardHtml, lienSur, FLECHE, PLUS, STATUTS_LIB } = window.mrtCartes;
  // Les statuts de la page (une course courue n'a plus que « Courue »), dans l'ordre du filtre.
  const CATS = [['confirmee', 'Confirmée'], ['option', 'Option'], ['a_surveiller', STATUTS_LIB.a_surveiller], ['courue', 'Courue']];

  // Toutes les courses sauf les abandonnées : ce qui reste à venir du plus proche au plus lointain (sans date à la fin), puis les courues, les plus récentes d'abord.
  const croissant = (a, b) => (!a.date ? (b.date ? 1 : 0) : !b.date ? -1 : a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const categorie = c => (c.etat === 'courue' ? 'courue' : c.statut);
  const toutes = courses => courses.filter(c => c.etat === 'a_venir').sort(croissant).concat(courses.filter(c => c.etat === 'courue').sort((a, b) => croissant(b, a)));
  // Filtres : au choix dans un même groupe (statut), ET entre groupes. « Ouvertes » : à venir, pas inscrit, ouverture atteinte (date et heure).
  const passe = (c, etat) => (!etat.cats.length || etat.cats.includes(categorie(c))) &&
    (!etat.ouvertes || (c.etat === 'a_venir' && window.mrtCartes.dossardEtat(c) === 'ouvert')) &&
    (!etat.annee || (c.date && c.date.slice(0, 4) === etat.annee));

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
        (c.etat === 'courue' ? '' : ligne('Inscription', dossardHtml(c, true))) + '</div>' +
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
  const GRILLE = '<svg class="cs-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5h4.5v4.5h-4.5z M9 2.5h4.5v4.5h-4.5z M2.5 9h4.5v4.5h-4.5z M9 9h4.5v4.5h-4.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const TABLE = '<svg class="cs-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11v9h-11z M2.5 7h11 M2.5 10h11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const FILTRE = '<svg class="cs-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.5h11M4.75 8h6.5M7 11.5h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const REDUIRE = '<svg class="cs-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TRI = window.mrtIcone.tri; // en-tête triable commun (mrt-tri), comme le Palmarès
  const COLONNES = [['evenement', 'Événement'], ['course', 'Course'], ['distance', 'Distance · D+'], ['date', 'Date'], ['ouverture', 'Ouverture des inscriptions']];
  // Valeur de tri de chaque colonne (une valeur vide passe toujours en dernier).
  const CLES = { evenement: c => c.course.toLowerCase(), course: c => (c.parcours || '').toLowerCase() || null, distance: c => (c.distance != null ? Number(c.distance) : null), date: c => c.date || null, ouverture: cleOuverture };
  const CLE_MODE = 'mrt-courses-affichage';
  const lireMode = () => { try { return localStorage.getItem(CLE_MODE) === 'tableau' ? 'tableau' : 'cartes'; } catch (e) { return 'cartes'; } };
  const ecrireMode = m => { try { localStorage.setItem(CLE_MODE, m); } catch (e) { /* stockage indisponible */ } };

  window.renderCourses = function (el, courses, edition, etat) {
    if (!etat.mode) etat.mode = lireMode();
    if (!etat.cats) etat.cats = [];
    const tous = toutes(courses);
    // Année : un filtre du panneau, s'il y a plus d'une année.
    const annees = [...new Set(tous.filter(c => c.date).map(c => c.date.slice(0, 4)))].sort().reverse();
    if (!annees.includes(etat.annee)) etat.annee = null;
    let liste = tous.filter(c => passe(c, etat));
    const actifs = (etat.cats.length ? 1 : 0) + (etat.ouvertes ? 1 : 0) + (etat.annee ? 1 : 0);
    const seulesCourues = etat.cats.length === 1 && etat.cats[0] === 'courue';
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
    const rond = (cle, texte, picto) => '<button type="button" class="mrt-rond cs-rond" data-mode="' + cle + '" aria-pressed="' + (etat.mode === cle) + '" aria-label="' + texte + '" title="' + texte + '">' + picto + '</button>';
    const nbCat = k => tous.filter(c => categorie(c) === k).length;
    const libFiltres = actifs ? 'Filtres · ' + actifs + ' actif' + (actifs > 1 ? 's' : '') : 'Filtres';
    const champ = (legende, html) => '<fieldset class="cs-champ"><legend class="cs-lib">' + legende + '</legend><div class="cs-choix">' + html + '</div></fieldset>';
    const panneau = '<div class="cs-panneau" id="cs-filtres"' + (etat.panneau ? '' : ' hidden') + '>' +
      '<button type="button" class="mrt-rond cs-fermer" data-cs="fermer" aria-label="Réduire les filtres" title="Réduire">' + REDUIRE + '</button>' +
      champ('Statut', CATS.map(([k, lib]) => pastille('cat', k, lib + ' <span class="cs-n">' + nbCat(k) + '</span>', etat.cats.includes(k))).join('')) +
      champ('Inscriptions', pastille('ouvertes', '1', 'Ouvertes <span class="cs-n">' + tous.filter(c => passe(c, { cats: [], ouvertes: true })).length + '</span>', !!etat.ouvertes)) +
      (annees.length > 1 ? champ('Année', pastille('annee', '', 'Toutes', !etat.annee) + annees.map(a => pastille('annee', a, a, a === etat.annee)).join('')) : '') + '</div>';
    const haut = '<div class="cs-barre">' +
      '<button type="button" class="mrt-rond cs-filtre' + (actifs ? ' is-on' : '') + '" data-cs="filtres" aria-expanded="' + !!etat.panneau + '" aria-controls="cs-filtres" aria-label="' + libFiltres + '" title="Filtres">' +
        FILTRE + (actifs ? '<span class="cs-badge">' + actifs + '</span>' : '') + '</button>' +
      '<span class="cs-ronds" role="group" aria-label="Affichage">' + rond('cartes', 'Cartes', GRILLE) + rond('tableau', 'Tableau', TABLE) + '</span>' +
      (actifs ? '<span class="cs-compte" aria-live="polite">' + liste.length + ' sur ' + tous.length + ' course' + (tous.length > 1 ? 's' : '') + '</span>' +
        '<button type="button" class="mrt-lien cs-raz" data-cs="raz">Réinitialiser les filtres</button>' : '') +
      (edition ? '<button type="button" class="ob-ajout mrt-btn is-principal" data-cs="ajouter" title="Ajouter une course">' + PLUS + '<span class="ob-ajout-long">Ajouter une course</span><span class="ob-ajout-court">Course</span></button>' : '') + '</div>' + panneau;

    const redessiner = () => window.renderCourses(el, courses, edition, etat);

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
        const actif = col ? col === k : k === 'date', sens = col ? etat.dir : seulesCourues ? 'desc' : 'asc';
        return '<th aria-sort="' + (actif ? (sens === 'desc' ? 'descending' : 'ascending') : 'none') + '"><button type="button" class="mrt-tri" data-col="' + k + '">' + lib + TRI + '</button></th>';
      }).join('') + '</tr></thead><tbody>' +
      liste.map(ligneTableau).join('') + '</tbody></table></div></div>';
    el.innerHTML = haut + (liste.length ? (etat.mode === 'tableau' ? tableau : '<div class="cs-liste">' + html + '</div>') : '<p class="ob-vide cs-vide">' + (actifs ? 'Aucune course ne correspond aux filtres.' : 'Aucune course.') + '</p>');
    couperNoms();

    const sur = (sel, f) => el.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => f(b)));
    // Ouvrir et fermer le panneau : le déroulé commun, comme le Palmarès (sans redessiner la page, pour que l'animation se voie).
    const panneauEl = el.querySelector('#cs-filtres'), boutonFiltres = el.querySelector('[data-cs="filtres"]');
    const regler = ouvrir => { etat.panneau = ouvrir; window.mrtDeroule(panneauEl, ouvrir); boutonFiltres.setAttribute('aria-expanded', String(ouvrir)); };
    sur('[data-cs="filtres"]', () => regler(!etat.panneau));
    sur('[data-cs="fermer"]', () => regler(false));
    sur('[data-cs="raz"]', () => { etat.cats = []; etat.ouvertes = false; etat.annee = null; redessiner(); });
    sur('[data-cat]', b => { const k = b.dataset.cat; etat.cats = etat.cats.includes(k) ? etat.cats.filter(x => x !== k) : etat.cats.concat(k); redessiner(); });
    sur('[data-ouvertes]', () => { etat.ouvertes = !etat.ouvertes; redessiner(); });
    el.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { etat.mode = b.dataset.mode; ecrireMode(etat.mode); redessiner(); }));
    el.querySelectorAll('[data-col]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.col;
      if (etat.col !== k) { etat.col = k; etat.dir = 'asc'; } else if (etat.dir === 'asc') etat.dir = 'desc'; else etat.col = null;
      redessiner();
    }));
    sur('[data-annee]', b => { etat.annee = b.dataset.annee || null; redessiner(); });
    // Toucher une carte (hors lien « Site officiel ») : la fiche de modification ; en lecture seule, la page de la course.
    const ouvrir = id => (edition ? edition.modifier(id) : window.mrtOuvrirCourse(id));
    el.querySelectorAll('.cs-carte, .cs-ligne').forEach(k => {
      k.addEventListener('click', e => { if (!e.target.closest('a')) ouvrir(k.dataset.id); });
      k.addEventListener('keydown', e => { if (e.target === k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrir(k.dataset.id); } });
    });
    const ajout = el.querySelector('[data-cs="ajouter"]');
    if (ajout) ajout.addEventListener('click', () => edition.ajouter(seulesCourues ? { mode: 'courue' } : etat.cats.length === 1 && etat.cats[0] === 'a_surveiller' ? { defauts: { statut: 'a_surveiller' } } : undefined));
  };
})();
