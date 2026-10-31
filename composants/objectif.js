// ===== Objectif : feuille de route et page d'une course =====
//
// Décrits par docs/module-objectif-specification.md (§ 3, § 5.1) ; style :
// composants/objectif.css. Tout vient de la liste de courses de l'utilisateur
// (mrtPage, composants/donnees.js) : rien n'est écrit en dur.
//   mrtEtapes(courses)                  étapes de la feuille de route
//   renderFeuilleDeRoute(el, courses, edition)   la feuille de route
//   renderPageCourse(el, courses, id, edition)   la page d'une course ; rend la course, ou null
//   renderCarteCourse(el, course)       une carte seule (Accueil)
//   mrtEdition(page, courses, apres)    saisie (§ 3.7) : ajouter (feuille de la fiche, fiche-course.js), retenir ;
//                                       null sur un site partagé en lecture seule. courses : () => liste à jour
// Page d'une course : edition = { modifier(id), marquer(id), retenir(id) }, fourni par modale-course.js (modifier et
// marquer basculent la feuille en édition) ; les boutons n'existent que s'il est donné.
(function () {
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const ROLES = { preparatoire: 'Préparatoire', plaisir: 'Plaisir', objectif_intermediaire: 'Objectif intermédiaire', objectif: 'Objectif principal' };
  const UNITES = [['j', 'j'], ['h', 'h'], ['m', 'min'], ['s', 's']];
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad = n => String(n).padStart(2, '0');
  // Espace insécable ordinaire : l'espace fine d'Intl est presque invisible en Space Grotesk.
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
  const nombre = n => nf.format(Number(n)).replace(/ /g, ' ');
  const aujourdhui = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  // Liens saisis par l'utilisateur : seulement des adresses web.
  const lienSur = u => (u && /^https?:\/\//i.test(u) ? u : null);
  const pageCourse = c => 'course.html?id=' + encodeURIComponent(c.id);
  const classeRole = c => (c.role === 'objectif' ? 'is-obj' : c.role === 'objectif_intermediaire' ? 'is-cle' : '');

  // Départ : jour et heure locale de la course, lus dans le fuseau du navigateur (§ 5.1) ;
  // mois seul : le 1er du mois, à minuit.
  function depart(c) {
    const d = c.date.split('-').map(Number), h = (!c.date_approx && c.heure ? c.heure : '00:00').split(':').map(Number);
    return new Date(d[0], d[1] - 1, d[2], h[0], h[1]);
  }
  function dateCourte(c) {
    const d = c.date.split('-').map(Number);
    if (c.date_approx) return MOIS_LONG[d[1] - 1] + ' ' + d[0];
    return (d[2] === 1 ? '1er' : d[2]) + ' ' + MOIS[d[1] - 1] + ' ' + d[0];
  }
  function dateLongue(c, sansHeure) {
    const d = c.date.split('-').map(Number);
    if (c.date_approx) return MOIS_LONG[d[1] - 1] + ' ' + d[0];
    const jour = JOURS[new Date(d[0], d[1] - 1, d[2]).getDay()];
    let txt = jour + ' ' + (d[2] === 1 ? '1er' : d[2]) + ' ' + MOIS[d[1] - 1] + ' ' + d[0];
    if (c.heure && !sansHeure) {
      const h = c.heure.split(':').map(Number);
      txt += ', ' + h[0] + ' h' + (h[1] ? ' ' + pad(h[1]) : '');
    }
    return txt;
  }
  const nom = c => window.mrtNomCourse(c);
  // Course · Parcours, en deux morceaux : si les deux ne tiennent pas sur une ligne,
  // le parcours passe à la ligne, sans le point (couperNoms).
  const nomHtml = c => (c.parcours && c.parcours !== c.course
    ? '<span class="ob-c">' + esc(c.course) + '</span> <span class="ob-p"><span class="ob-sep">· </span>' + esc(c.parcours) + '</span>'
    : esc(c.course));
  function couperNoms() {
    document.querySelectorAll('.ob-p').forEach(p => {
      const n = p.parentNode.closest('.ob-nom, .pc-titre');
      n.classList.remove('is-coupe');
      if (p.offsetTop > p.previousElementSibling.offsetTop + 2) n.classList.add('is-coupe');
    });
  }
  let coupe = null;
  window.addEventListener('resize', () => { clearTimeout(coupe); coupe = setTimeout(couperNoms, 100); });
  const lieuFormat = c => [c.lieu, c.formatLibelle].filter(Boolean).join(' · ');
  const distance = c => [c.distance != null ? nombre(c.distance) + ' km' : '', c.dplus != null ? nombre(c.dplus) + ' m D+' : ''].filter(Boolean).join(' · ');

  // Étapes : les courses de la feuille de route (Option ou Confirmée à venir, datées, et confirmées passées pas encore
  // courues), dans l'ordre ; un groupe d'options fait une seule étape, à la date de son premier candidat.
  window.mrtEtapes = function (courses) {
    const etapes = [];
    window.mrtCoursesRoute(courses).forEach(c => {
      if (c.statut === 'option' && c.groupe_options) {
        const g = etapes.find(e => e.groupe === c.groupe_options);
        if (g) g.candidats.push(c);
        else etapes.push({ groupe: c.groupe_options, candidats: [c] });
      } else etapes.push({ course: c });
    });
    return etapes;
  };

  // Dossard (§ 3.5) : inscrit, inscription ouverte, ouvre bientôt, ou ouverture à venir (date inconnue).
  function dossard(c) {
    if (c.inscrit) return { etat: 'inscrit', texte: 'Inscrit' + (c.dossard ? ' · n° ' + c.dossard : '') };
    const o = c.ouverture_inscriptions;
    if (!o) return { etat: 'inconnu', texte: 'Ouverture à venir' };
    if (o > aujourdhui()) return { etat: 'bientot', texte: 'Ouvre le ' + o.split('-').reverse().join('/') };
    return { etat: 'ouvert', texte: 'Inscription ouverte', lien: lienSur(c.inscription) };
  }
  function dossardHtml(c) {
    const d = dossard(c), html = '<i></i>' + esc(d.texte) + (d.lien ? ' ' + FLECHE : '');
    return d.lien
      ? '<a class="ob-ins is-ouvert" href="' + esc(d.lien) + '" target="_blank" rel="noopener">' + html + '</a>'
      : '<span class="ob-ins is-' + d.etat + '">' + html + '</span>';
  }
  // Flèche dessinée, pour tous les liens externes : le caractère ↗ s'affiche en emoji sur iPhone.
  const FLECHE = '<svg class="ob-fleche" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const lienOfficiel = c => (lienSur(c.lien)
    ? '<a class="ob-ext" href="' + esc(c.lien) + '" target="_blank" rel="noopener" title="Site officiel" aria-label="Site officiel">' + FLECHE + '</a>' : '');

  // Compteur (§ 5.1) : quatre cases, mises à jour par un seul minuteur pour toute la page.
  // Mois seul : compteur pour une course confirmée (jusqu'au 1er du mois), aucun pour une option.
  const sansCompteur = c => c.date_approx && c.statut !== 'confirmee';
  const compteurHtml = c => (sansCompteur(c) ? '' : '<div class="ob-cpt" data-depart="' + depart(c).getTime() + '">' +
    UNITES.map(u => '<span class="ob-cpt-case"><b data-u="' + u[0] + '"></b>' + u[1] + '</span>').join('') + '</div>');
  let minuteur = null;
  function tic() {
    const maintenant = Date.now();
    document.querySelectorAll('.ob-cpt[data-depart]').forEach(el => {
      const ms = Number(el.dataset.depart) - maintenant;
      if (ms <= 0) {
        if (!el.classList.contains('is-fini')) { el.classList.add('is-fini'); el.textContent = 'Course courue'; }
        return;
      }
      const t = { j: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), m: Math.floor(ms % 36e5 / 6e4), s: Math.floor(ms % 6e4 / 1e3) };
      el.querySelectorAll('b').forEach(b => { const v = t[b.dataset.u]; b.textContent = b.dataset.u === 'j' ? v : pad(v); });
    });
  }
  function lancerCompteurs() {
    clearInterval(minuteur);
    tic();
    minuteur = setInterval(tic, 1000);
  }

  const ligne = (lib, html) => '<div class="ob-ligne"><span class="ob-lib">' + lib + '</span><span>' + html + '</span></div>';
  function lignes(c, avecObjectif) {
    const dist = distance(c);
    return '<div class="ob-lignes">' +
      (dist ? ligne('Distance', '<span class="ob-val">' + esc(dist) + '</span>') : '') +
      (avecObjectif && c.objectif ? ligne('Objectif', '<span class="ob-cible">' + esc(c.objectif) + '</span>') : '') +
      ligne('Dossard', dossardHtml(c)) + '</div>';
  }
  const titre = (c, balise) => '<' + balise + ' class="ob-nom"><a href="' + pageCourse(c) + '">' + nomHtml(c) + '</a></' + balise + '>';
  const info = c => (lieuFormat(c) ? '<p class="ob-info">' + esc(lieuFormat(c)) + '</p>' : '');

  function carteCourse(c) {
    return '<article class="ob-carte' + (sansCompteur(c) ? ' sans-cpt' : '') + '">' +
      '<span class="ob-role ' + classeRole(c) + '">' + ROLES[c.role] + '</span>' + compteurHtml(c) +
      titre(c, 'h3') + '<span class="ob-date">' + dateCourte(c) + '</span>' + info(c) + lignes(c, true) + '</article>';
  }
  function carteGroupe(e) {
    const n = e.candidats.length;
    // Rôle du groupe : celui de ses candidats.
    const roles = [...new Set(e.candidats.map(c => ROLES[c.role]))].join(' · ');
    return '<article class="ob-carte ob-groupe"><h3 class="ob-nom">' + esc(e.groupe) + '</h3>' +
      '<span class="ob-role">' + roles + ' • ' + n + (n > 1 ? ' candidats' : ' candidat') + '</span><div class="ob-cands">' +
      e.candidats.map(c => '<div class="ob-cand">' + titre(c, 'h4') + '<span class="ob-date">' + dateCourte(c) + '</span>' + info(c) + lignes(c, false) + '</div>').join('') +
      '</div></article>';
  }

  // Boutons ronds du Palmarès (design.md, § 6) : « + » et crayon.
  const PLUS = '<svg class="ob-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const CRAYON = '<svg class="ob-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M11.3 1.9l2.8 2.8-8.6 8.6-3.4.6.6-3.4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const rond = (act, texte, icone) => '<button type="button" class="ob-rond mrt-rond" data-ob="' + act + '" aria-label="' + texte + '" title="' + texte + '">' + icone + '</button>';
  const brancher = (el, actions) => el.querySelectorAll('[data-ob]').forEach(b => b.addEventListener('click', () => { if (actions[b.dataset.ob]) actions[b.dataset.ob](); }));

  // Une carte seule, comme sur la feuille de route (bloc Prochaine course de l'Accueil).
  window.renderCarteCourse = function (el, c) {
    el.innerHTML = carteCourse(c);
    lancerCompteurs();
    couperNoms();
  };

  window.renderFeuilleDeRoute = function (el, courses, edition) {
    const etapes = window.mrtEtapes(courses);
    const option = e => !!e && (!!e.groupe || e.course.statut === 'option');
    el.innerHTML = (edition ? '<div class="ob-haut">' + '<button type="button" class="ob-ajout mrt-btn is-principal" data-ob="ajouter" title="Ajouter une course">' + PLUS + '<span class="ob-ajout-long">Ajouter une course</span><span class="ob-ajout-court">Course</span></button></div>' : '') + (etapes.length
      ? '<div class="ob-route">' + etapes.map((e, i) => {
        const k = ['ob-et', option(e) ? 'is-opt' : '', option(etapes[i + 1]) ? 'suite-opt' : '', i === etapes.length - 1 ? 'is-fin' : '',
          e.course ? classeRole(e.course) : ''].filter(Boolean).join(' ');
        return '<div class="' + k + '"><div class="ob-rail"><span class="ob-pt"></span></div>' + (e.groupe ? carteGroupe(e) : carteCourse(e.course)) + '</div>';
      }).join('') + '</div>'
      : '<p class="ob-vide">Aucune course à venir.</p>');
    if (edition) brancher(el, { ajouter: edition.ajouter });
    couperNoms();
    lancerCompteurs();
  };

  // ----- Page d'une course (§ 3.4) -----
  // Texte repliable : sur téléphone, seul le titre se voit, un toucher l'ouvre ; sur ordinateur, toujours ouvert.
  const CHEVRON = '<svg class="ob-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const cellule = (titreCellule, html, ancre) => (html ? '<details class="pc-cellule mrt-deroule"' + (ancre ? ' id="' + ancre + '"' : '') + '><summary>' + CHEVRON + titreCellule + '</summary><div class="pc-corps">' + html + '</div></details>' : '');
  const texte = t => (t ? '<p>' + esc(t).replace(/\n/g, '<br>') + '</p>' : '');
  const euros = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2 })
    .format(Number(n)).replace(/ /g, ' ');

  // Téléphone : cellules repliées, sauf la première ; ordinateur : toutes ouvertes, sans pouvoir les replier.
  const telephone = window.matchMedia('(max-width: 600px)');
  let replier = null;
  function replierCellules(el) {
    const cellules = [...el.querySelectorAll('.pc-cellule')];
    const regler = () => cellules.forEach((d, i) => { d.open = !telephone.matches || i === 0; });
    regler();
    if (replier) telephone.removeEventListener('change', replier);
    replier = regler;
    telephone.addEventListener('change', regler);
  }

  // ctx : données de préparation (séances, phases : composants/preparation.js), ancre demandée (ctx.ancre) et
  // modale (ctx.modale = { fermer } : modale-course.js).
  window.renderPageCourse = function (el, courses, id, edition, ctx) {
    el.classList.add('pc');
    // Barre du haut de la modale (modale-course.js) : « Modifier » et la croix, à droite.
    const barre = avecModifier => '<div class="pc-barre">' + (avecModifier && edition ? rond('modifier', 'Modifier la course', CRAYON) : '') +
      '<button type="button" class="pc-fermer mrt-rond is-fermer" data-ob="fermer" aria-label="Fermer" title="Fermer">×</button></div>';
    const retour = barre(false);
    const etapes = window.mrtEtapes(courses);
    // Ordre de la feuille de route, candidats d'un groupe compris, un par un.
    const suite = etapes.flatMap(e => (e.course ? [e.course] : e.candidats));
    const i = suite.findIndex(c => c.id === id);
    if (i < 0) {
      el.innerHTML = retour + '<p class="ob-vide">Course introuvable.</p>';
      brancher(el, { fermer: ctx.modale.fermer });
      return null;
    }
    const c = suite[i], prec = suite[i - 1], suiv = suite[i + 1];
    const rang = etapes.findIndex(e => e.course === c || (e.candidats || []).includes(c)) + 1;
    const autres = c.statut === 'option' && c.groupe_options ? suite.filter(x => x !== c && x.statut === 'option' && x.groupe_options === c.groupe_options) : [];
    const retenable = c.statut === 'option' && !!c.groupe_options;
    const marquable = c.statut === 'confirmee' && c.date <= aujourdhui();
    const liens = [[c.lien, 'Site officiel'], [c.inscription, 'Inscription'], [c.lien_resultats, 'Résultats en direct']].filter(l => lienSur(l[0]));
    el.innerHTML = barre(true) +
      '<p class="pc-sur"><span class="ob-role ' + classeRole(c) + '">' + ROLES[c.role] + '</span> <span class="ob-lib">· Étape ' + rang + ' sur ' + etapes.length + '</span></p>' +
      '<div class="pc-haut"><h2 class="pc-titre">' + nomHtml(c) + lienOfficiel(c) + '</h2></div>' +
      '<p class="pc-info">' + esc([lieuFormat(c), dateLongue(c)].filter(Boolean).join(' · ')) + '</p>' +
      (autres.length ? '<p class="pc-groupe">' + esc(c.groupe_options) + ' · ' + (autres.length > 1 ? 'autres candidats' : 'autre candidat') + ' : ' +
        autres.map(x => '<a href="' + pageCourse(x) + '">' + esc(nom(x)) + '</a>').join(', ') + '</p>' : '') +
      (edition && (retenable || marquable) ? '<div class="pc-actions">' +
        (retenable ? '<button type="button" class="mrt-btn" data-ob="retenir">Retenir cette course</button>' : '') +
        (marquable ? '<button type="button" class="mrt-btn" data-ob="marquer">Marquer comme courue</button>' : '') + '</div>' : '') +
      // La fiche : les lignes de la carte de la feuille de route, complétées (D−, prix).
      '<div class="ob-lignes pc-fiche">' +
        (sansCompteur(c) ? '' : ligne('Départ dans', compteurHtml(c))) +
        (distance(c) ? ligne('Distance', '<span class="ob-val">' + esc(distance(c)) + '</span>') : '') +
        (c.dmoins != null ? ligne('D−', '<span class="ob-val">' + esc(nombre(c.dmoins)) + ' m</span>') : '') +
        (c.objectif ? ligne('Objectif', '<span class="ob-cible">' + esc(c.objectif) + '</span>') : '') +
        (c.objectif_precisions ? ligne('Précisions', esc(c.objectif_precisions)) : '') +
        ligne('Dossard', dossardHtml(c)) +
        (c.prix != null ? ligne('Prix', '<span class="ob-val">' + esc(euros(c.prix)) + '</span>') : '') +
      '</div>' +
      '<div class="pc-textes">' +
        (ctx && window.mrtPreparation.aPlan(c) ? cellule('Préparation', '<div class="cal-lignes">' + window.mrtPreparation.rubrique(ctx, c) + '</div>', 'preparation') : '') +
        cellule('Rôle dans la préparation', texte(c.pourquoi)) +
        cellule('Stratégie ou enchaînement', texte(c.strategie)) +
        cellule('Logistique', texte(c.logistique)) +
        cellule('Description', texte(c.description)) +
        cellule('Liens', liens.length ? '<ul class="pc-liens">' + liens.map(l => '<li><a href="' + esc(l[0]) + '" target="_blank" rel="noopener">' + l[1] + ' ' + FLECHE + '</a></li>').join('') + '</ul>' : '') +
      '</div>' +
      '<nav class="pc-nav" aria-label="Courses voisines">' +
        (prec ? '<a class="is-precedente" href="' + pageCourse(prec) + '"><span>← Course précédente</span><b>' + esc(nom(prec)) + '</b></a>' : '') +
        (suiv ? '<a class="is-suivante" href="' + pageCourse(suiv) + '"><span>Course suivante →</span><b>' + esc(nom(suiv)) + '</b></a>' : '') +
      '</nav>';
    brancher(el, Object.assign({ fermer: ctx.modale.fermer }, edition && { modifier: () => edition.modifier(c.id), retenir: () => edition.retenir(c.id), marquer: () => edition.marquer(c.id) }));
    replierCellules(el);
    if (ctx && !el.__prepBranche) { el.__prepBranche = true; window.mrtPreparation.brancher(el, ctx, c.id); }
    // Adresse en #preparation : la rubrique s'ouvre et se place en haut de l'écran, une seule fois.
    if (ctx.ancre === '#preparation' && !ctx.ancreFaite) {
      const d = el.querySelector('#preparation');
      if (d) { d.open = true; d.scrollIntoView(); }
      ctx.ancreFaite = true;
    }
    couperNoms();
    lancerCompteurs();
    return c;
  };

  // ----- Consultation d'une course courue (§ 3.8) : ouverte depuis le Palmarès -----
  const hmsFiche = s => (s == null ? '' : pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60));
  const allureTxt = s => (s == null ? '' : Math.floor(s / 60) + ':' + pad(s % 60) + ' /km');
  // « place / effectif » (la place seule si l'effectif est inconnu) ; rien sans place.
  // Rang ordinal comme dans le Palmarès : « 1er » (« 1re » pour une coureuse), « 2e », « 14e », suivi de l'effectif s'il est connu.
  // Catégorie d'âge FFA, en clair, suivie du sexe : « Master 2 Homme ».
  const CATEGORIES = { CA: 'Cadet', JU: 'Junior', ES: 'Espoir', SE: 'Senior' };
  const categorie = (code, feminin) => (code ? (CATEGORIES[code] || 'Master ' + code.slice(1)) + (feminin ? ' Femme' : ' Homme') : '');
  const place = (p, n, feminin) => (p == null ? '' : (p === 1 ? (feminin ? '1re' : '1er') : nombre(p) + 'e') + (n != null ? ' / ' + nombre(n) : ''));

  // ctx.ordre() : identifiants des courses du Palmarès, dans l'ordre du tableau (précédente et suivante).
  window.renderPageCourseCourue = function (el, courses, id, edition, ctx) {
    el.classList.add('pc');
    const barre = '<div class="pc-barre">' + (edition ? rond('modifier', 'Modifier la course', CRAYON) : '') +
      '<button type="button" class="pc-fermer mrt-rond is-fermer" data-ob="fermer" aria-label="Fermer" title="Fermer">×</button></div>';
    const c = courses.find(x => x.id === id && x.etat === 'courue');
    if (!c) {
      el.innerHTML = barre + '<p class="ob-vide">Course introuvable.</p>';
      brancher(el, { fermer: ctx.modale.fermer });
      return null;
    }
    // Précédente et suivante : l'ordre du tableau du Palmarès ; ailleurs (Calendrier, accueil, adresse), de la plus récente à la plus ancienne.
    const ordre = ctx.ordre ? ctx.ordre().map(i => courses.find(x => x.id === i)).filter(Boolean)
      : courses.filter(x => x.etat === 'courue' && x.date).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const k = ordre.findIndex(x => x.id === id), prec = ordre[k - 1], suiv = ordre[k + 1];
    const temps = c.dnf ? 'DNF' : hmsFiche(c.temps);
    const resultats = lienSur(c.lien_resultats);
    // Résultat : une ligne par valeur (libellé, valeur), le temps puis la place en grand ; une ligne vide n'est pas affichée.
    const effectif = n => (n != null ? ' <span class="pc-sur-n">/ ' + nombre(n) + '</span>' : '');
    const rang = (p, n) => (p == null ? '' : esc(place(p, null, ctx.feminin)) + effectif(n));
    const vitesse = c.dnf ? null : c.vitesse || (c.allure ? Math.round(36000 / c.allure) / 10 : null);
    const cat = categorie(c.categorie, ctx.feminin);
    const resultat = [
      ['Temps', temps ? '<b class="pc-grand ob-cible">' + esc(temps) + '</b>' : ''],
      ['Place', c.place != null ? '<b class="pc-grand ob-cible-1">' + rang(c.place, c.effectif) + '</b>' : ''],
      ['Catégorie', c.place_categorie != null ? '<span class="ob-val">' + rang(c.place_categorie, c.effectif_categorie) + '</span>' + (cat ? ' <span class="pc-cat">' + esc(cat) + '</span>' : '') : ''],
      ['Sexe', c.place_sexe != null ? '<span class="ob-val">' + rang(c.place_sexe, c.effectif_sexe) + '</span>' : ''],
      ['Vitesse', vitesse ? '<span class="ob-val">' + esc(nombre(vitesse)) + ' km/h</span>' : ''],
      ['Allure', !c.dnf && c.allure != null ? '<span class="ob-val">' + esc(allureTxt(c.allure)) + '</span>' : '']].filter(r => r[1]);
    // Montre : ses valeurs seules, en liste comme Résultat ; section absente sans aucune valeur.
    const km = v => (v != null ? nombre(v) + ' km' : '');
    const deniv = (p, m) => (p == null && m == null ? '' : (p != null ? nombre(p) : '—') + ' · ' + (m != null ? nombre(m) : '—') + ' m');
    const montre = [['Temps', hmsFiche(c.montre_temps)], ['Distance', km(c.montre_distance)], ['D+ · D−', deniv(c.montre_dplus, c.montre_dmoins)],
      ['Allure', allureTxt(c.montre_allure)], ['FC moy.', c.fc_moyenne != null ? c.fc_moyenne + ' bpm' : '']].filter(r => r[1]).map(r => [r[0], '<span class="ob-val">' + esc(r[1]) + '</span>']);
    const liste = l => l.map(r => '<div class="pc-res-ligne"><span class="ob-lib">' + r[0] + '</span><span>' + r[1] + '</span></div>').join('');
    const section = (titreSection, droite, html, classe) => '<section class="pc-section' + (classe ? ' ' + classe : '') + '"><h3 class="pc-intertitre"><span>' + titreSection + '</span>' + droite + '</h3>' + html + '</section>';
    // Sous le titre : la date (sans heure) et le lieu ; le format et le dossard ; la distance et le D+.
    const infos = [[dateLongue(c, true), c.lieu], [c.formatLibelle, c.dossard ? 'Dossard ' + c.dossard : ''], [km(c.distance), c.dplus != null ? nombre(c.dplus) + ' m D+' : '']].map(l => l.filter(Boolean).join(' · ')).filter(Boolean);
    el.innerHTML = barre +
      '<div class="pc-haut"><h2 class="pc-titre">' + nomHtml(c) + lienOfficiel(c) + '</h2></div>' +
      infos.map(t => '<p class="pc-info">' + esc(t) + '</p>').join('') +
      // Résultat, puis la Montre dessous, dans une section repliée (un toucher sur son titre l'ouvre).
      '<div class="pc-colonnes">' +
      (resultat.length ? section('Résultat', resultats ? '<a class="pc-lien-res mrt-lien" href="' + esc(resultats) + '" target="_blank" rel="noopener">Classement complet' + FLECHE + '</a>' : '',
        liste(resultat)) : '') +
      (montre.length ? '<details class="pc-section is-montre mrt-deroule"><summary class="pc-intertitre"><span>Montre</span>' + CHEVRON + '</summary><div class="pc-repli-corps">' + liste(montre) + '</div></details>' : '') +
      '</div>' +
      '<nav class="pc-nav" aria-label="Courses voisines">' +
        (prec ? '<a class="is-precedente" href="' + pageCourse(prec) + '"><span>← Course précédente</span><b>' + esc(nom(prec)) + '</b></a>' : '') +
        (suiv ? '<a class="is-suivante" href="' + pageCourse(suiv) + '"><span>Course suivante →</span><b>' + esc(nom(suiv)) + '</b></a>' : '') +
      '</nav>';
    brancher(el, Object.assign({ fermer: ctx.modale.fermer }, edition && { modifier: () => edition.modifier(c.id) }));
    couperNoms();
    return c;
  };

  // ----- Saisie et édition (§ 3.7) -----
  window.mrtEdition = function (page, courses, apres) {
    if (page.lectureSeule) return null;
    const ouvrir = async (course, extra) => {
      const liste = courses();
      const groupes = [...new Set(liste.filter(x => x.statut === 'option' && x.groupe_options).map(x => x.groupe_options))];
      // Course à venir : son plan de préparation, en tête du bloc Préparation.
      const preparation = extra.mode === 'a_venir' && window.mrtPreparation ? { semaines: (await page.relirePlan()).semaines } : null;
      window.mrtFicheCourse(Object.assign({ course, references: await window.mrtReferences(), groupes, apres, preparation }, extra));
    };
    const trouver = id => courses().find(x => x.id === id) || null;
    return {
      ajouter: () => ouvrir(null, { mode: 'a_venir' }),
      // Le candidat devient Confirmée et quitte le groupe ; les autres passent À surveiller, sans être supprimés.
      retenir: async id => {
        const c = trouver(id);
        if (!c || !window.confirm('Retenir cette course ? Les autres candidats de « ' + c.groupe_options + ' » passeront à surveiller.')) return;
        const db = window.mrtSupabase.from('courses');
        const autres = await db.update({ statut: 'a_surveiller', groupe_options: null }).eq('groupe_options', c.groupe_options).eq('statut', 'option').neq('id', c.id);
        const lui = autres.error ? autres : await window.mrtSupabase.from('courses').update({ statut: 'confirmee', groupe_options: null }).eq('id', c.id);
        if (lui.error) { console.warn(lui.error); window.alert('Enregistrement impossible pour l\'instant.'); return; }
        apres();
      }
    };
  };
})();
