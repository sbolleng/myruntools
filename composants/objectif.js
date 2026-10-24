// ===== Objectif : feuille de route et page d'une course =====
//
// Décrits par docs/module-objectif-specification.md (§ 3, § 5.1) ; style :
// composants/objectif.css. Tout vient de la liste de courses de l'utilisateur
// (mrtPage, composants/donnees.js) : rien n'est écrit en dur.
//   mrtEtapes(courses)                  étapes de la feuille de route
//   renderFeuilleDeRoute(el, courses, edition)   la feuille de route
//   renderPageCourse(el, courses, id, edition)   la page d'une course ; rend la course, ou null
//   mrtEdition(page, courses, apres)    saisie et édition (§ 3.7) : ajouter, modifier, marquer, retenir ;
//                                       null sur un site partagé en lecture seule. courses : () => liste à jour
// edition = { ajouter, modifier(id), marquer(id), retenir(id) } : les boutons n'existent que s'il est donné.
(function () {
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
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
  function dateLongue(c) {
    const d = c.date.split('-').map(Number);
    if (c.date_approx) return MOIS_LONG[d[1] - 1] + ' ' + d[0];
    const jour = JOURS[new Date(d[0], d[1] - 1, d[2]).getDay()];
    let txt = jour + ' ' + (d[2] === 1 ? '1er' : d[2]) + ' ' + MOIS_LONG[d[1] - 1] + ' ' + d[0];
    if (c.heure) {
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

  // Étapes : les courses de l'en-tête (Option ou Confirmée, à venir, datées), dans
  // l'ordre ; un groupe d'options fait une seule étape, à la date de son premier candidat.
  window.mrtEtapes = function (courses) {
    const etapes = [];
    window.mrtCoursesCap(courses).forEach(c => {
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
    const d = dossard(c), html = '<i></i>' + esc(d.texte) + (d.lien ? ' ↗' : '');
    return d.lien
      ? '<a class="ob-ins is-ouvert" href="' + esc(d.lien) + '" target="_blank" rel="noopener">' + html + '</a>'
      : '<span class="ob-ins is-' + d.etat + '">' + html + '</span>';
  }
  const lienOfficiel = c => (lienSur(c.lien)
    ? '<a class="ob-ext" href="' + esc(c.lien) + '" target="_blank" rel="noopener" title="Site officiel" aria-label="Site officiel">↗</a>' : '');

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
  const titre = (c, balise) => '<' + balise + ' class="ob-nom"><a href="' + pageCourse(c) + '">' + nomHtml(c) + '</a>' + lienOfficiel(c) + '</' + balise + '>';
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
  const rond = (act, texte, icone) => '<button type="button" class="ob-rond" data-ob="' + act + '" aria-label="' + texte + '" title="' + texte + '">' + icone + '</button>';
  const brancher = (el, actions) => el.querySelectorAll('[data-ob]').forEach(b => b.addEventListener('click', () => actions[b.dataset.ob]()));

  window.renderFeuilleDeRoute = function (el, courses, edition) {
    const etapes = window.mrtEtapes(courses);
    const option = e => !!e && (!!e.groupe || e.course.statut === 'option');
    el.innerHTML = '<div class="ob-haut"><h2 class="ob-titre-bloc">Feuille de route</h2>' +
      (edition ? rond('ajouter', 'Ajouter une course', PLUS) : '') + '</div>' + (etapes.length
      ? '<div class="ob-route">' + etapes.map((e, i) => {
        const k = ['ob-et', option(e) ? 'is-opt' : '', option(etapes[i + 1]) ? 'suite-opt' : '', i === etapes.length - 1 ? 'is-fin' : '',
          e.course ? classeRole(e.course) : ''].filter(Boolean).join(' ');
        return '<div class="' + k + '"><div class="ob-rail"><span class="ob-pt"></span></div>' + (e.groupe ? carteGroupe(e) : carteCourse(e.course)) + '</div>';
      }).join('') + '</div>' +
        '<div class="ob-legende"><span><i></i>Confirmée</span><span><i class="cle"></i>Objectif intermédiaire</span>' +
        '<span><i class="obj"></i>Objectif principal</span><span><i class="opt"></i>Option</span></div>'
      : '<p class="ob-vide">Aucune course à venir.</p>');
    if (edition) brancher(el, { ajouter: edition.ajouter });
    couperNoms();
    lancerCompteurs();
  };

  // ----- Page d'une course (§ 3.4) -----
  const stat = (val, label) => '<div class="pc-stat"><span class="pc-stat-val">' + val + '</span><span class="pc-stat-label">' + label + '</span></div>';
  const cellule = (titreCellule, html) => (html ? '<section class="card pc-cellule"><h3 class="ob-titre-bloc">' + titreCellule + '</h3>' + html + '</section>' : '');
  const texte = t => (t ? '<p>' + esc(t).replace(/\n/g, '<br>') + '</p>' : '');
  const euros = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2 })
    .format(Number(n)).replace(/ /g, ' ');

  window.renderPageCourse = function (el, courses, id, edition) {
    const retour = '<a class="pc-retour" href="objectif.html">← Feuille de route</a>';
    const etapes = window.mrtEtapes(courses);
    // Ordre de la feuille de route, candidats d'un groupe compris, un par un.
    const suite = etapes.flatMap(e => (e.course ? [e.course] : e.candidats));
    const i = suite.findIndex(c => c.id === id);
    if (i < 0) {
      el.innerHTML = retour + '<p class="ob-vide">Course introuvable.</p>';
      return null;
    }
    const c = suite[i], prec = suite[i - 1], suiv = suite[i + 1];
    const rang = etapes.findIndex(e => e.course === c || (e.candidats || []).includes(c)) + 1;
    const autres = c.statut === 'option' && c.groupe_options ? suite.filter(x => x !== c && x.statut === 'option' && x.groupe_options === c.groupe_options) : [];
    const retenable = c.statut === 'option' && !!c.groupe_options;
    const marquable = c.statut === 'confirmee' && c.date <= aujourdhui();
    const liens = [[c.lien, 'Site officiel'], [c.inscription, 'Inscription'], [c.lien_resultats, 'Résultats en direct']].filter(l => lienSur(l[0]));
    el.innerHTML = retour +
      '<p class="pc-sur"><span class="ob-role ' + classeRole(c) + '">' + ROLES[c.role] + '</span> <span class="ob-lib">· Étape ' + rang + ' sur ' + etapes.length + '</span></p>' +
      '<div class="pc-haut"><h2 class="pc-titre">' + nomHtml(c) + lienOfficiel(c) + '</h2>' +
        (edition ? rond('modifier', 'Modifier la course', CRAYON) : '') + '</div>' +
      '<p class="pc-info">' + esc([lieuFormat(c), dateLongue(c)].filter(Boolean).join(' · ')) + '</p>' +
      (autres.length ? '<p class="pc-groupe">' + esc(c.groupe_options) + ' · ' + (autres.length > 1 ? 'autres candidats' : 'autre candidat') + ' : ' +
        autres.map(x => '<a href="' + pageCourse(x) + '">' + esc(nom(x)) + '</a>').join(', ') + '</p>' : '') +
      (edition && (retenable || marquable) ? '<div class="pc-actions">' +
        (retenable ? '<button type="button" class="fc-btn" data-ob="retenir">Retenir cette course</button>' : '') +
        (marquable ? '<button type="button" class="fc-btn" data-ob="marquer">Marquer comme courue</button>' : '') + '</div>' : '') +
      '<div class="pc-stats">' +
        (c.distance != null ? stat(esc(nombre(c.distance)) + ' km' + (c.dplus != null ? '<small> / ' + esc(nombre(c.dplus)) + ' m D+</small>' : ''), 'Distance') : '') +
        (c.dmoins != null ? stat(esc(nombre(c.dmoins)) + ' m', 'D−') : '') +
        (c.objectif ? stat(esc(c.objectif), 'Objectif') : '') +
        dossardHtml(c) +
      '</div>' +
      (sansCompteur(c) ? '' : '<div class="pc-grille"><section class="card pc-rebours"><h3 class="ob-titre-bloc">Départ dans</h3>' + compteurHtml(c) + '</section></div>') +
      '<div class="pc-grille">' +
        cellule('Dossard', '<p>' + dossardHtml(c) + '</p>' + (c.prix != null ? '<p>Prix : ' + esc(euros(c.prix)) + '</p>' : '')) +
        cellule('Rôle dans la préparation', texte(c.pourquoi)) +
        cellule('Stratégie ou enchaînement', texte(c.strategie)) +
        cellule('Logistique', texte(c.logistique)) +
        cellule('Description', texte(c.description)) +
        cellule('Liens', liens.length ? '<ul class="pc-liens">' + liens.map(l => '<li><a href="' + esc(l[0]) + '" target="_blank" rel="noopener">' + l[1] + ' ↗</a></li>').join('') + '</ul>' : '') +
      '</div>' +
      '<nav class="pc-nav" aria-label="Courses voisines">' +
        (prec ? '<a class="is-precedente" href="' + pageCourse(prec) + '"><span>← Course précédente</span><b>' + esc(nom(prec)) + '</b></a>' : '') +
        (suiv ? '<a class="is-suivante" href="' + pageCourse(suiv) + '"><span>Course suivante →</span><b>' + esc(nom(suiv)) + '</b></a>' : '') +
      '</nav>';
    if (edition) brancher(el, { modifier: () => edition.modifier(c.id), retenir: () => edition.retenir(c.id), marquer: () => edition.marquer(c.id) });
    couperNoms();
    lancerCompteurs();
    return c;
  };

  // ----- Saisie et édition (§ 3.7) -----
  window.mrtEdition = function (page, courses, apres) {
    if (page.lectureSeule) return null;
    const ouvrir = async (course, extra) => {
      const liste = courses();
      const groupes = [...new Set(liste.filter(x => x.statut === 'option' && x.groupe_options).map(x => x.groupe_options))];
      window.mrtFicheCourse(Object.assign({ course, references: await window.mrtReferences(), groupes, apres }, extra));
    };
    const trouver = id => courses().find(x => x.id === id) || null;
    return {
      ajouter: () => ouvrir(null, { mode: 'a_venir' }),
      modifier: id => ouvrir(trouver(id), { mode: 'a_venir' }),
      marquer: id => ouvrir(trouver(id), { mode: 'courue', marquer: true }),
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
