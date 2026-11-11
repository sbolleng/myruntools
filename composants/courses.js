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

  // Une carte : statut et date sur la première ligne, le nom dessous, puis « Site officiel » (comme sur la page d'une course).
  // Toucher la carte ouvre la page de la course, tous les blocs ouverts ; « Site officiel » est un lien à part, grisé quand
  // le site n'est pas renseigné.
  function carte(c) {
    const site = lienSur(c.lien);
    const dist = distance(c);
    return '<article class="ob-carte cs-carte ' + classe(c) + '" data-id="' + esc(c.id) + '" tabindex="0" role="button" aria-label="Ouvrir ' + esc(window.mrtNomCourse(c)) + '">' +
      '<span class="ob-role">' + esc(statut(c)) + '</span><span class="ob-date">' + dateCourte(c) + '</span>' +
      '<h3 class="ob-nom">' + nomHtml(c) + '</h3>' +
      '<p class="cs-bas">' + (site
        ? '<a class="cs-site" href="' + esc(site) + '" target="_blank" rel="noopener">Site officiel ' + FLECHE + '</a>'
        : '<span class="cs-site is-off" aria-disabled="true">Site officiel ' + FLECHE + '</span>') + '</p>' +
      (lieuFormat(c) ? '<p class="ob-info">' + esc(lieuFormat(c)) + '</p>' : '') +
      '<div class="ob-lignes">' + (dist ? ligne('Distance', '<span class="ob-val">' + esc(dist) + '</span>') : '') +
        (c.etat === 'courue' ? '' : ligne('Inscription', dossardHtml(c, true))) + '</div></article>';
  }

  // Tableau : toutes les colonnes d'une page de course, au choix (rond « Colonnes », comme le Palmarès) ; une ligne par course.
  // Par défaut : Événement (toujours là), Course, Distance · D+, Date, Ouverture des inscriptions.
  const heureTxt = h => window.mrtFormat.heure(h);
  const tiret = '<span class="cs-sous">—</span>';
  const nb = window.mrtFormat.nombre;
  const lienTxt = (u, t) => (lienSur(u) ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + t + ' ' + FLECHE + '</a>' : '');
  const texteLong = t => (t ? '<span class="cs-long" title="' + esc(t) + '">' + esc(t) + '</span>' : '');
  const km = v => (v != null ? nb(v) + ' km' : '');
  const dp = (p, m) => [p != null ? nb(p) + ' m D+' : '', m != null ? nb(m) + ' m D−' : ''].filter(Boolean).join(' · ');
  const dur = v => (v != null ? window.mrtFormat.duree(v) : '');
  const all = v => (v != null ? window.mrtFormat.allure(v) : '');
  const rang = (p, n) => (p != null ? p + (n != null ? ' / ' + n : '') : '');
  const vit = c => (c.dnf ? null : c.vitesse || (c.allure ? Math.round(36000 / c.allure) / 10 : null));
  // k, libellé, texte affiché (ou html), valeur de tri (texte, nombre ou null), html (le texte est alors déjà du html)
  const COLS = [
    { k: 'evenement', lib: 'Événement', fixe: true, cle: c => c.course.toLowerCase(),
      html: c => '<strong>' + esc(c.course) + '</strong>' + (c.lieu ? '<br><span class="cs-sous">' + esc(c.lieu) + '</span>' : '') },
    { k: 'course', lib: 'Course', def: true, cle: c => (c.parcours || '').toLowerCase() || null, txt: c => (c.parcours && c.parcours !== c.course ? c.parcours : '') },
    { k: 'statut', lib: 'Statut', cle: c => statut(c), txt: c => statut(c) },
    { k: 'role', lib: 'Rôle', cle: c => c.role || null, txt: c => ({ objectif: 'Objectif', objectif_intermediaire: 'Objectif', preparatoire: 'Préparatoire', plaisir: 'Plaisir' })[c.role] || '' },
    { k: 'type', lib: 'Type', cle: c => c.typeLibelle || null, txt: c => c.typeLibelle || '' },
    { k: 'format', lib: 'Format', cle: c => c.formatLibelle || null, txt: c => c.formatLibelle || '' },
    { k: 'distance', lib: 'Distance · D+', def: true, cle: c => (c.distance != null ? Number(c.distance) : null), txt: c => distance(c) || '' },
    { k: 'dmoins', lib: 'D−', cle: c => (c.dmoins != null ? Number(c.dmoins) : null), txt: c => (c.dmoins != null ? nb(c.dmoins) + ' m' : '') },
    { k: 'date', lib: 'Date', def: true, cle: c => c.date || null,
      html: c => dateCourte(c) + (c.heure && !c.date_approx ? '<br><span class="cs-sous">' + heureTxt(c.heure) + '</span>' : '') },
    { k: 'heure', lib: 'Heure de départ', cle: c => (c.heure && !c.date_approx ? String(c.heure).slice(0, 5) : null), txt: c => (c.heure && !c.date_approx ? heureTxt(c.heure) : '') },
    { k: 'lieu', lib: 'Lieu', cle: c => (c.lieu || '').toLowerCase() || null, txt: c => c.lieu || '' },
    { k: 'objectif', lib: 'Objectif', cle: c => c.objectif || null, txt: c => c.objectif || '' },
    { k: 'precisions', lib: 'Précisions sur l\'objectif', cle: c => c.objectif_precisions || null, html: c => texteLong(c.objectif_precisions) },
    { k: 'description', lib: 'Description', cle: c => c.description || null, html: c => texteLong(c.description) },
    { k: 'site', lib: 'Site officiel', cle: c => (lienSur(c.lien) ? '1' : null), html: c => lienTxt(c.lien, 'Site officiel') },
    { k: 'ouverture', lib: 'Ouverture des inscriptions', def: true, cle: cleOuverture, html: c => (c.etat === 'courue' ? '' : dossardHtml(c, true)) },
    { k: 'inscription', lib: 'Site d\'inscription', cle: c => (lienSur(c.inscription) ? '1' : null), html: c => lienTxt(c.inscription, 'S\'inscrire') },
    { k: 'dossard', lib: 'Numéro de dossard', cle: c => c.dossard || null, txt: c => c.dossard || '' },
    { k: 'prix', lib: 'Prix', cle: c => (c.prix != null ? Number(c.prix) : null), txt: c => (c.prix != null ? nb(c.prix) + ' €' : '') },
    { k: 'strategie', lib: 'Stratégie de course', cle: c => c.strategie || null, html: c => texteLong(c.strategie) },
    { k: 'pourquoi', lib: 'Rôle dans la préparation', cle: c => c.pourquoi || null, html: c => texteLong(c.pourquoi) },
    { k: 'logistique', lib: 'Logistique', cle: c => c.logistique || null, html: c => texteLong(c.logistique) },
    { k: 'gpx', lib: 'Tracé GPX', cle: c => (c.gpx ? '1' : null), txt: c => (c.gpx ? 'Importé' : '') },
    { k: 'temps', lib: 'Temps', cle: c => (c.dnf ? null : c.temps != null ? Number(c.temps) : null), txt: c => (c.dnf ? 'DNF' : dur(c.temps)) },
    { k: 'allure', lib: 'Allure moyenne', cle: c => (c.dnf || c.allure == null ? null : Number(c.allure)), txt: c => (c.dnf ? '' : all(c.allure)) },
    { k: 'vitesse', lib: 'Vitesse', cle: c => vit(c), txt: c => (vit(c) ? nb(vit(c)) + ' km/h' : '') },
    { k: 'place', lib: 'Classement', cle: c => (c.place != null ? Number(c.place) : null), txt: c => rang(c.place, c.effectif) },
    { k: 'categorie', lib: 'Catégorie', cle: c => c.categorie || null, txt: c => c.categorie || '' },
    { k: 'place_categorie', lib: 'Classement catégorie', cle: c => (c.place_categorie != null ? Number(c.place_categorie) : null), txt: c => rang(c.place_categorie, c.effectif_categorie) },
    { k: 'place_sexe', lib: 'Classement sexe', cle: c => (c.place_sexe != null ? Number(c.place_sexe) : null), txt: c => rang(c.place_sexe, c.effectif_sexe) },
    { k: 'resultats', lib: 'Résultats en direct', cle: c => (lienSur(c.lien_resultats) ? '1' : null), html: c => lienTxt(c.lien_resultats, 'Classement') },
    { k: 'montre_distance', lib: 'Distance montre', cle: c => (c.montre_distance != null ? Number(c.montre_distance) : null), txt: c => km(c.montre_distance) },
    { k: 'montre_dplus', lib: 'D+ montre', cle: c => (c.montre_dplus != null ? Number(c.montre_dplus) : null), txt: c => dp(c.montre_dplus, null) },
    { k: 'montre_dmoins', lib: 'D− montre', cle: c => (c.montre_dmoins != null ? Number(c.montre_dmoins) : null), txt: c => dp(null, c.montre_dmoins) },
    { k: 'montre_temps', lib: 'Temps montre', cle: c => (c.montre_temps != null ? Number(c.montre_temps) : null), txt: c => dur(c.montre_temps) },
    { k: 'montre_allure', lib: 'Allure moyenne montre', cle: c => (c.montre_allure != null ? Number(c.montre_allure) : null), txt: c => all(c.montre_allure) },
    { k: 'fc_moyenne', lib: 'FC moyenne', cle: c => (c.fc_moyenne != null ? Number(c.fc_moyenne) : null), txt: c => (c.fc_moyenne != null ? c.fc_moyenne + ' bpm' : '') }
  ];
  const parCle = k => COLS.find(c => c.k === k);
  const cellule = (col, c) => {
    const h = col.html ? col.html(c) : col.txt(c) ? esc(col.txt(c)) : '';
    return '<td>' + (h || tiret) + '</td>';
  };
  function ligneTableau(c, cols) {
    return '<tr class="cs-ligne" data-id="' + esc(c.id) + '" tabindex="0" role="button" aria-label="Ouvrir ' + esc(window.mrtNomCourse(c)) + '">' + cols.map(col => cellule(col, c)).join('') + '</tr>';
  }
  // Pictos : le filtre (trois traits), le chevron du panneau et celui du menu d'affichage ; le double triangle des colonnes triables (comme le Palmarès).
  const FILTRE = '<svg class="cs-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.5h11M4.75 8h6.5M7 11.5h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const CHEVRON = '<svg class="cs-menu-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const AFFICHAGES = [['cartes', 'Cartes'], ['tableau', 'Tableau']];
  const REDUIRE = '<svg class="cs-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TRI = window.mrtIcone.tri; // en-tête triable commun (mrt-tri), comme le Palmarès
  const COLONNES_ICO = '<svg class="cs-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11v9h-11z M6.2 3.5v9 M9.8 3.5v9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const CLE_COLS = 'mrt-courses-colonnes';
  const lireCols = () => { try { const l = JSON.parse(localStorage.getItem(CLE_COLS)); if (Array.isArray(l)) return l.filter(k => parCle(k) && !parCle(k).fixe); } catch (e) { /* stockage indisponible */ } return COLS.filter(c => c.def).map(c => c.k); };
  const ecrireCols = l => { try { localStorage.setItem(CLE_COLS, JSON.stringify(l)); } catch (e) { /* stockage indisponible */ } };
  const CLE_MODE = 'mrt-courses-affichage';
  const lireMode = () => { try { return localStorage.getItem(CLE_MODE) === 'tableau' ? 'tableau' : 'cartes'; } catch (e) { return 'cartes'; } };
  const ecrireMode = m => { try { localStorage.setItem(CLE_MODE, m); } catch (e) { /* stockage indisponible */ } };

  window.renderCourses = function (el, courses, edition, etat) {
    if (!etat.mode) etat.mode = lireMode();
    if (!etat.cats) etat.cats = [];
    if (!etat.cols) etat.cols = lireCols();
    // Colonnes affichées : Événement d'abord, puis celles choisies dans l'ordre de la liste.
    const cols = COLS.filter(c => c.fixe || etat.cols.includes(c.k));
    if (etat.col && !cols.some(c => c.k === etat.col)) etat.col = null;
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
      const f = parCle(col).cle, sens = etat.dir === 'desc' ? -1 : 1;
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
    const nbCat = k => tous.filter(c => categorie(c) === k).length;
    const libFiltres = actifs ? 'Filtres · ' + actifs + ' actif' + (actifs > 1 ? 's' : '') : 'Filtres';
    const champ = (legende, html) => '<fieldset class="cs-champ"><legend class="cs-lib">' + legende + '</legend><div class="cs-choix">' + html + '</div></fieldset>';
    const panneau = '<div class="cs-panneau" id="cs-filtres"' + (etat.panneau ? '' : ' hidden') + '>' +
      '<button type="button" class="mrt-rond cs-fermer" data-cs="fermer" aria-label="Réduire les filtres" title="Réduire">' + REDUIRE + '</button>' +
      champ('Statut', CATS.map(([k, lib]) => pastille('cat', k, lib + ' <span class="cs-n">' + nbCat(k) + '</span>', etat.cats.includes(k))).join('')) +
      champ('Inscriptions', pastille('ouvertes', '1', 'Ouvertes <span class="cs-n">' + tous.filter(c => passe(c, { cats: [], ouvertes: true })).length + '</span>', !!etat.ouvertes)) +
      (annees.length > 1 ? champ('Année', pastille('annee', '', 'Toutes', !etat.annee) + annees.map(a => pastille('annee', a, a, a === etat.annee)).join('')) : '') + '</div>';
    const panneauCols = tab ? '<div class="cs-panneau" id="cs-colonnes"' + (etat.panneauCols ? '' : ' hidden') + '>' +
      '<button type="button" class="mrt-rond cs-fermer" data-cs="fermer-cols" aria-label="Réduire les colonnes" title="Réduire">' + REDUIRE + '</button>' +
      champ('Colonnes', COLS.filter(c => !c.fixe).map(c => pastille('colonne', c.k, esc(c.lib), etat.cols.includes(c.k))).join('')) + '</div>' : '';
    // Affichage : une liste à choix unique (Cartes ou Tableau), comme le menu « Vue » du Calendrier ; le bouton Filtres est à sa droite.
    const nomAffichage = AFFICHAGES.find(x => x[0] === etat.mode)[1];
    const affichage = '<div class="cs-affichage"><button type="button" class="mrt-btn cs-menu-btn" data-cs="menu" aria-expanded="false" aria-controls="cs-menu" aria-label="Affichage : ' + nomAffichage + '">' + nomAffichage + CHEVRON + '</button>' +
      '<nav class="cs-menu" id="cs-menu" aria-label="Vue" hidden><span class="cs-lib">Vue</span>' + AFFICHAGES.map(([k, lib]) =>
        '<button type="button" data-mode="' + k + '" aria-pressed="' + (etat.mode === k) + '">' + lib + '</button>').join('') + '</nav></div>';
    const haut = '<div class="cs-barre">' + affichage +
      '<button type="button" class="mrt-rond cs-filtre' + (actifs ? ' is-on' : '') + '" data-cs="filtres" aria-expanded="' + !!etat.panneau + '" aria-controls="cs-filtres" aria-label="' + libFiltres + '" title="Filtres">' +
        FILTRE + (actifs ? '<span class="cs-badge">' + actifs + '</span>' : '') + '</button>' +
      (tab ? '<button type="button" class="mrt-rond cs-cols-btn" data-cs="colonnes" aria-expanded="' + !!etat.panneauCols + '" aria-controls="cs-colonnes" aria-label="Ajouter ou retirer des colonnes" title="Ajouter ou retirer des colonnes">' + COLONNES_ICO + '</button>' : '') +
      (actifs ? '<span class="cs-compte" aria-live="polite">' + liste.length + ' sur ' + tous.length + ' course' + (tous.length > 1 ? 's' : '') + '</span>' +
        '<button type="button" class="mrt-lien cs-raz" data-cs="raz">Réinitialiser les filtres</button>' : '') +
      (edition ? '<button type="button" class="ob-ajout mrt-btn is-principal" data-cs="ajouter" title="Ajouter une course">' + PLUS + '<span class="ob-ajout-long">Ajouter une course</span><span class="ob-ajout-court">Course</span></button>' : '') + '</div>' + panneau + panneauCols;

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
    const tableau = '<div class="cs-tableau"><div class="table-scroll"><table><thead><tr>' + cols.map(({ k, lib }) => {
        const actif = col ? col === k : k === 'date' && cols.some(x => x.k === 'date'), sens = col ? etat.dir : seulesCourues ? 'desc' : 'asc';
        return '<th aria-sort="' + (actif ? (sens === 'desc' ? 'descending' : 'ascending') : 'none') + '"><button type="button" class="mrt-tri" data-col="' + k + '">' + lib + TRI + '</button></th>';
      }).join('') + '</tr></thead><tbody>' +
      liste.map(c => ligneTableau(c, cols)).join('') + '</tbody></table></div></div>';
    el.innerHTML = haut + (liste.length ? (etat.mode === 'tableau' ? tableau : '<div class="cs-liste">' + html + '</div>') : '<p class="ob-vide cs-vide">' + (actifs ? 'Aucune course ne correspond aux filtres.' : 'Aucune course.') + '</p>');
    couperNoms();

    const sur = (sel, f) => el.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => f(b)));
    // Ouvrir et fermer le panneau : le déroulé commun, comme le Palmarès (sans redessiner la page, pour que l'animation se voie).
    const panneauEl = el.querySelector('#cs-filtres'), boutonFiltres = el.querySelector('[data-cs="filtres"]');
    const regler = ouvrir => { etat.panneau = ouvrir; window.mrtDeroule(panneauEl, ouvrir); boutonFiltres.setAttribute('aria-expanded', String(ouvrir)); };
    sur('[data-cs="filtres"]', () => regler(!etat.panneau));
    // Menu d'affichage : un toucher sur son bouton l'ouvre ou le ferme ; il se ferme au choix, en touchant ailleurs, par Échap.
    const menu = el.querySelector('#cs-menu'), boutonMenu = el.querySelector('[data-cs="menu"]');
    const ouvrirMenu = ouvert => { menu.hidden = !ouvert; boutonMenu.setAttribute('aria-expanded', String(ouvert)); };
    boutonMenu.addEventListener('click', e => { ouvrirMenu(menu.hidden); if (!menu.hidden && e.detail === 0) menu.querySelector('[aria-pressed="true"]').focus(); });
    if (!el.__menuFerme) {
      el.__menuFerme = true;
      document.addEventListener('click', e => { const m = el.querySelector('#cs-menu'); if (m && !e.target.closest('.cs-affichage') && !m.hidden) { m.hidden = true; el.querySelector('[data-cs="menu"]').setAttribute('aria-expanded', 'false'); } });
      document.addEventListener('keydown', e => { const m = el.querySelector('#cs-menu'); if (e.key === 'Escape' && m && !m.hidden) { m.hidden = true; const b = el.querySelector('[data-cs="menu"]'); b.setAttribute('aria-expanded', 'false'); b.focus(); } });
    }
    sur('[data-cs="fermer"]', () => regler(false));
    const colsEl = el.querySelector('#cs-colonnes'), boutonCols = el.querySelector('[data-cs="colonnes"]');
    const reglerCols = ouvrir => { etat.panneauCols = ouvrir; window.mrtDeroule(colsEl, ouvrir); boutonCols.setAttribute('aria-expanded', String(ouvrir)); };
    sur('[data-cs="colonnes"]', () => reglerCols(!etat.panneauCols));
    sur('[data-cs="fermer-cols"]', () => reglerCols(false));
    sur('[data-colonne]', b => { const k = b.dataset.colonne; etat.cols = etat.cols.includes(k) ? etat.cols.filter(x => x !== k) : etat.cols.concat(k); ecrireCols(etat.cols); redessiner(); });
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
    const ouvrir = id => window.mrtOuvrirCourse(id, '', { toutOuvert: true });
    el.querySelectorAll('.cs-carte, .cs-ligne').forEach(k => {
      k.addEventListener('click', e => { if (!e.target.closest('a')) ouvrir(k.dataset.id); });
      k.addEventListener('keydown', e => { if (e.target === k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ouvrir(k.dataset.id); } });
    });
    const ajout = el.querySelector('[data-cs="ajouter"]');
    if (ajout) ajout.addEventListener('click', () => edition.ajouter(seulesCourues ? { mode: 'courue' } : etat.cats.length === 1 && etat.cats[0] === 'a_surveiller' ? { defauts: { statut: 'a_surveiller' } } : undefined));
  };
})();
