// ===== Fiche d'une course : une seule fiche de champs, dans la feuille de la course =====
//
// Décrite par docs/module-objectif-specification.md (§ 3.7 et 3.8) et docs/module-palmares-specification.md (§ 10) ;
// style : fiche-course.css et modale-course.css (la feuille).
// Mêmes blocs, dans le même ordre, pour une course à venir et une course courue ; l'état choisit seulement les blocs
// montrés et ceux qui sont ouverts. Barre du haut : « Annuler », titre, « Enregistrer » ; pas de croix.
// mrtFicheCourse({ course, references, apres, mode, groupes, marquer, preparation, dans, fin })
//   dans  élément où dessiner la fiche (la feuille d'une course, modale-course.js) ; sans lui, la fiche ouvre
//         sa propre feuille (Palmarès, « + Ajouter une course ») et la ferme à la fin ; le retour du navigateur y fait « Annuler »
//   fin(r, id)  appelé à la fin : r = 'annule', 'enregistre' ou 'supprime'
// Rend { annuler() } : « Annuler », avec « Abandonner les modifications ? » s'il y a eu une saisie.
(function () {
  // Bouton « Supprimer la course » : à contour rouge, avec une poubelle.
  const POUBELLE = '<svg class="fc-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEVRON = window.mrtIcone.chevron; // chevron commun des titres repliables (mrt-chev)
  // Trois rôles (spécification Préparation, § 3) ; l'ancien « objectif intermédiaire » s'affiche et s'enregistre en Objectif.
  const ROLES = [['objectif', 'Objectif'], ['preparatoire', 'Préparatoire'], ['plaisir', 'Plaisir']];
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  // Durées en secondes. Accepte 49:18, 1:56:05, 1h56'05, 1h56, 56'05, et les
  // chiffres seuls lus par la droite (4918 = 49:18, 15605 = 1:56:05).
  function parseDuree(str) {
    const s = String(str || '').trim().toLowerCase().replace(/\s+/g, '').replace(/"$/, '');
    if (!s) return null;
    let m = s.match(/^(\d{3,6})$/);
    if (m) {
      const d = m[1].padStart(6, '0');
      const h = +d.slice(0, 2), mi = +d.slice(2, 4), se = +d.slice(4, 6);
      return mi > 59 || se > 59 ? NaN : h * 3600 + mi * 60 + se;
    }
    m = s.match(/^(\d+)h(?:(\d{1,2})(?:['m:](\d{1,2}))?)?$/);
    if (m) return +(m[2] || 0) > 59 || +(m[3] || 0) > 59 ? NaN : +m[1] * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0);
    m = s.match(/^(\d+)[:'](\d{1,2})(?:[:'](\d{1,2}))?$/);
    if (m) {
      if (m[3] !== undefined) return +m[2] > 59 || +m[3] > 59 ? NaN : +m[1] * 3600 + +m[2] * 60 + +m[3];
      return +m[2] > 59 ? NaN : +m[1] * 60 + +m[2];
    }
    return NaN;
  }
  // Temps : toujours hh:mm:ss. Allure (par km) : m:ss.
  const fmtDuree = s => (s == null ? '' : pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60));
  const fmtAllure = s => (s == null ? '' : Math.floor(s / 60) + ':' + pad(s % 60));
  const parseNombre = str => { const s = String(str || '').trim().replace(',', '.'); return s === '' ? null : (isNaN(s) ? NaN : Number(s)); };
  const trailSelonDistance = km => (km < 21 ? 'trail_decouverte' : km < 42 ? 'trail_court' : km < 80 ? 'trail_long' : 'trail_ultra');

  // Heure de départ : 07:30, 7h30, 7h, 730, 0730 ; rend « HH:MM », null si vide, NaN si illisible.
  function parseHeure(str) {
    const s = String(str || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!s) return null;
    const m = s.match(/^(\d{1,2})(?:[h:](\d{2})?)?$/) || s.match(/^(\d{1,2})(\d{2})$/);
    if (!m || +m[1] > 23 || +(m[2] || 0) > 59) return NaN;
    return pad(+m[1]) + ':' + pad(+(m[2] || 0));
  }

  // Objectif : une durée (rangée en hh:mm:ss), « Finisher », ou « Sub » suivi d'une durée en heures et minutes.
  // Rend le texte rangé, null si vide, NaN si illisible.
  function parseObjectif(str) {
    const s = String(str || '').trim().replace(/\s+/g, ' ');
    if (!s) return null;
    if (/^finisher$/i.test(s)) return 'Finisher';
    const sub = s.match(/^sub\s*(.+)$/i);
    if (sub) {
      const r = sub[1].toLowerCase().replace(/\s+/g, '');
      let m = r.match(/^(\d+)h(\d{1,2})?$/);
      if (m) return m[2] !== undefined && +m[2] > 59 ? NaN : 'Sub ' + +m[1] + 'h' + (m[2] === undefined ? '' : pad(+m[2]));
      m = r.match(/^(\d+)(?:min|mn|')?$/);
      return m && +m[1] > 0 ? 'Sub ' + +m[1] + ' min' : NaN;
    }
    const d = parseDuree(s);
    return d == null || Number.isNaN(d) || d === 0 ? NaN : pad(Math.floor(d / 3600)) + ':' + pad(Math.floor(d % 3600 / 60)) + ':' + pad(d % 60);
  }

  // Champs : clé de la base, libellé, genre (date, dateLibre, heure, texte, long, url, objectif, choix, groupe,
  // nombre, entier, duree, case), bloc, obligatoire. Une seule liste, dans l'ordre de la fiche (§ 3.8).
  const TOUS = [
    ['course', 'Course', 'texte', 'course', true],
    ['parcours', 'Parcours', 'texte', 'course'],
    ['date', 'Date', 'date', 'course', true],
    ['date_approx', 'Seul le mois est connu', 'case', 'course'],
    ['heure', 'Heure de départ', 'heure', 'course'],
    ['lieu', 'Lieu', 'texte', 'course'],
    ['type', 'Type', 'choix', 'course', true],
    ['format', 'Format', 'choix', 'course', true],
    ['distance', 'Distance (km)', 'nombre', 'course', true],
    ['dplus', 'D+ (m)', 'entier', 'course'],
    ['dmoins', 'D− (m)', 'entier', 'course'],
    ['objectif', 'Objectif', 'objectif', 'course'],
    ['objectif_precisions', 'Précisions sur l\'objectif', 'long', 'course'],
    ['description', 'Description', 'long', 'course'],
    ['lien', 'Site officiel', 'url', 'course'],
    ['statut', 'Statut', 'choix', 'plan'],
    ['role', 'Rôle', 'choix', 'plan'],
    ['groupe_options', 'Groupe d\'options', 'groupe', 'plan'],
    ['ouverture_inscriptions', 'Ouverture des inscriptions', 'dateLibre', 'dossard'],
    ['ouverture_heure', 'Heure d\'ouverture', 'heure', 'dossard'],
    ['ouverture_approx', 'Seul le mois est connu', 'case', 'dossard'],
    ['inscrit', 'Inscrit', 'case', 'dossard'],
    ['inscription', 'Site d\'inscription', 'url', 'dossard'],
    ['dossard', 'Numéro de dossard', 'texte', 'dossard'],
    ['prix', 'Prix (€)', 'nombre', 'dossard'],
    ['gpx', 'Tracé GPX', 'fichier', 'parcours'],
    ['strategie', 'Stratégie de course', 'long', 'parcours'],
    ['pourquoi', 'Rôle dans la préparation', 'long', 'preparation'],
    ['logistique', 'Logistique', 'long', 'logistique'],
    // Résultat, puis classements : un seul bloc. Général et sexe : deux champs sur toute la largeur ; catégorie : trois.
    ['temps', 'Temps', 'duree', 'resultat', true],
    ['dnf', 'DNF', 'case', 'resultat'],
    ['allure', 'Allure moyenne (par km)', 'allure', 'resultat'],
    ['place', 'Place au général', 'entier', 'resultat'],
    ['effectif', 'Effectif du général', 'entier', 'resultat'],
    ['categorie', 'Catégorie', 'choix', 'resultat'],
    ['place_categorie', 'Place en catégorie', 'entier', 'resultat'],
    ['effectif_categorie', 'Effectif de la catégorie', 'entier', 'resultat'],
    ['place_sexe', 'Place par sexe', 'entier', 'resultat'],
    ['effectif_sexe', 'Effectif par sexe', 'entier', 'resultat'],
    ['lien_resultats', 'Résultats en direct', 'url', 'resultat'],
    ['montre_temps', 'Temps', 'duree', 'montre'],
    ['montre_distance', 'Distance (km)', 'nombre', 'montre'],
    ['montre_dplus', 'D+ (m)', 'entier', 'montre'],
    ['montre_dmoins', 'D− (m)', 'entier', 'montre'],
    ['montre_allure', 'Allure moyenne (par km)', 'allure', 'montre'],
    ['fc_moyenne', 'FC moyenne (bpm)', 'entier', 'montre']
  ];
  // Mêmes blocs partout ; un champ n'est retiré que s'il n'a plus de sens pour l'état de la course : une course courue n'a
  // ni statut, ni groupe d'options, ni inscription à venir, ni date approximative (ni plan : il n'est pas rangé, il se
  // recalculerait) ; une course à venir, ni résultat ni montre. Le tracé GPX et la stratégie (Parcours) sont partout.
  const VENIR_SEUL = new Set(['date_approx', 'statut', 'groupe_options', 'ouverture_inscriptions', 'ouverture_approx', 'ouverture_heure', 'inscrit', 'inscription']);
  const BLOCS_TOUS = [['course', 'Course'], ['plan', 'Place dans le plan'], ['dossard', 'Inscription'], ['parcours', 'Parcours'],
    ['preparation', 'Préparation'], ['logistique', 'Logistique'], ['resultat', 'Résultat'], ['montre', 'Montre']];
  // Le lien des résultats en direct sert avant la course : il est le seul champ de Résultat d'une course à venir.
  const COURUE_SEUL = new Set(TOUS.filter(f => (f[3] === 'resultat' && f[0] !== 'lien_resultats') || f[3] === 'montre').map(f => f[0]));
  // Vitesse : plus saisie, tirée de l'allure moyenne (3 600 ÷ allure, en km/h) à l'enregistrement.
  const VITESSES = [['allure', 'vitesse'], ['montre_allure', 'montre_vitesse']];
  // Catégories d'âge de la Fédération française d'athlétisme (saison du 1er septembre au 31 août).
  const CATEGORIES = [['CA', 'Cadet (CA)'], ['JU', 'Junior (JU)'], ['ES', 'Espoir (ES)'], ['SE', 'Senior (SE)']]
    .concat(Array.from({ length: 11 }, (_, i) => ['M' + i, 'Master ' + i + ' (M' + i + ', ' + (35 + 5 * i) + (i < 10 ? '-' + (39 + 5 * i) : ' et plus') + ' ans)']));
  const STATUTS = [['confirmee', 'Confirmée'], ['option', 'Option'], ['a_surveiller', 'À surveiller']];
  const APPROX = 'Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.';
  const DEFAUT = { role: 'preparatoire', statut: 'confirmee' };
  const NOUVEAU = '__nouveau__';
  // Objectif : une liste à choix unique, puis une durée quand le choix en demande une. Rangé comme avant : « Finisher », « Sub 3h », « 02:45:00 ».
  const OBJECTIFS = [['', '— Aucun'], ['finisher', 'Finisher (terminer)'], ['sub', 'Moins de… (Sub)'], ['temps', 'Temps précis']];
  const AIDE_OBJECTIF = { sub: 'ex. 3h, 1h30 ou 45 min', temps: 'ex. 02:45:00' };
  const decouperObjectif = o => { const t = String(o || '').trim(), m = t.match(/^Sub\s+(.+)$/i);
    return !t ? { type: '', val: '' } : /^finisher$/i.test(t) ? { type: 'finisher', val: '' } : m ? { type: 'sub', val: m[1] } : { type: 'temps', val: t }; };
  // Exemples affichés dans les champs vides.
  const AIDE = {
    course: 'ex. Forez Trails', parcours: 'ex. L\'Olmetoise (facultatif)', distance: 'ex. 24,4', dplus: 'ex. 933', dmoins: 'ex. 930',
    heure: 'ex. 07:30', ouverture_heure: 'ex. 12:00', lieu: 'ex. Mont-Clair',
    description: 'Texte libre pour donner des détails sur la course : ex. boucle par les crêtes, 3 ravitaillements, barrière horaire au km 30, descente technique', objectif: 'ex. 02:45:00, Finisher ou Sub 3h', objectif_precisions: 'ex. Partir prudemment, sous 4 h dans tous les cas', dossard: 'ex. 412', prix: 'ex. 85',
    inscription: 'ex. https://…', lien: 'ex. https://…', lien_resultats: 'ex. https://…', groupe_nouveau: 'ex. Printemps 2027',
    temps: 'ex. 49:18 ou 4918', allure: 'ex. 5:24 ou 524',
    place: 'ex. 99', effectif: 'ex. 873', place_categorie: 'ex. 12', effectif_categorie: 'ex. 140', place_sexe: 'ex. 15', effectif_sexe: 'ex. 310',
    montre_distance: 'ex. 24,1', montre_dplus: 'ex. 932', montre_dmoins: 'ex. 935', montre_temps: 'ex. 3:00:23 ou 30023', montre_allure: 'ex. 7:18 ou 718', fc_moyenne: 'ex. 163'
  };
  // Textes limités, avec un compteur sous le champ.
  const LONGUEURS = { description: 1000, objectif_precisions: 100 };
  const milliers = n => String(n).replace(/\B(?=(\d{3})+$)/g, ' ');

  // mrtFicheCourse({ course, references, apres, mode, groupes, marquer, preparation })
  //   mode     'courue' (défaut, Palmarès) ou 'a_venir' (Objectif) ; une course existante à venir s'ouvre en 'a_venir'
  //   groupes  noms des groupes d'options existants (mode à venir)
  //   marquer  vrai : la course existante passe à l'état Courue à l'enregistrement
  //   defauts  valeurs préremplies d'une nouvelle course (ex. { statut: 'a_surveiller' })
  //   preparation  { semaines } (mode à venir) : phases modifiées à la main ; le plan de la course s'affiche en tête du bloc
  //                Préparation (lecture) ; il se règle dans la page Préparation (« Paramétrer le plan », composants/preparation.js)
  window.mrtFicheCourse = function ({ course, references, apres, mode, groupes, marquer, preparation, dans, fin, defauts }) {
    const existe = !!(course && course.id);
    const c = Object.assign({}, defauts, course || {}); // defauts : valeurs d'une nouvelle course (ex. statut À surveiller)
    mode = mode || 'courue';
    const venir = mode === 'a_venir';
    const CHAMPS = TOUS.filter(f => !(venir ? COURUE_SEUL : VENIR_SEUL).has(f[0]));
    // Une course qui n'a qu'une vitesse : son allure moyenne en est tirée, pour ne rien perdre en l'enregistrant.
    if (!venir) VITESSES.forEach(([a, v]) => { if (c[a] == null && Number(c[v]) > 0) c[a] = Math.round(3600 / Number(c[v])); });
    const BLOCS = BLOCS_TOUS.filter(([b]) => CHAMPS.some(f => f[3] === b));
    const sousDe = type => references.sous.filter(s => s.type === type);
    const typeDe = sc => { const s = references.sous.find(x => x.id === sc); return s ? s.type : ''; };

    const champ = ([k, lib, genre, , oblig]) => {
      const id = 'fc-' + k;
      const valeur = k === 'type' ? typeDe(c.format) : c[k];
      let input;
      if (genre === 'case') {
        const caseHtml = '<label class="fc-case"><input type="checkbox" id="' + id + '" data-k="' + k + '"' + (valeur ? ' checked' : '') + '> ' + esc(lib) + '</label>';
        return k === 'dnf' || k === 'date_approx' ? caseHtml : '<div class="fc-champ fc-bas">' + caseHtml + '</div>';
      }
      if (genre === 'fichier') {
        // Tracé GPX (Objectif, § 3.4, n° 28) : rangé à l'enregistrement de la course.
        return '<div class="fc-champ fc-large"><span class="fc-lib-seul">' + esc(lib) + '</span><div class="fc-gpx">' +
          '<span class="fc-gpx-etat">' + (valeur ? 'Tracé importé' : 'Aucun tracé') + '</span>' +
          '<button type="button" class="mrt-btn" data-fc="gpx-choisir">' + (valeur ? 'Remplacer' : 'Importer un GPX') + '</button>' +
          (valeur ? '<button type="button" class="mrt-lien is-danger" data-fc="gpx-supprimer">Supprimer</button>' : '') +
          '<input type="file" class="fc-gpx-fichier" accept=".gpx" hidden></div><div class="tr-choix-zone" hidden></div><p class="fc-erreur" id="fc-gpx-err" aria-live="polite"></p></div>';
      }
      if (genre === 'choix') {
        const opts = k === 'type' ? references.types.map(t => [t.id, t.libelle])
          : k === 'role' ? ROLES
          : k === 'statut' ? STATUTS
          : k === 'categorie' ? CATEGORIES
          : sousDe(typeDe(c.format)).map(s => [s.id, s.libelle]);
        const vide = DEFAUT[k] ? '' : '<option value="">—</option>';
        const courant = (k === 'role' && valeur === 'objectif_intermediaire' ? 'objectif' : valeur) || DEFAUT[k] || '';
        input = '<select class="mrt-champ" id="' + id + '" data-k="' + k + '">' + vide + opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === courant ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
      } else if (genre === 'objectif') {
        const o = decouperObjectif(valeur), avec = o.type === 'sub' || o.type === 'temps';
        input = '<div class="fc-objectif"><select class="mrt-champ" id="fc-objectif_type" data-k="objectif_type" aria-label="Type d\'objectif">' +
          OBJECTIFS.map(([v, l]) => '<option value="' + v + '"' + (v === o.type ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>' +
          '<input class="mrt-champ" type="text" id="' + id + '" data-k="' + k + '" value="' + esc(o.val) + '" autocomplete="off" aria-label="Durée de l\'objectif"' +
          (avec ? ' placeholder="' + AIDE_OBJECTIF[o.type] + '"' : ' hidden') + '></div>';
      } else if (genre === 'groupe') {
        const noms = (groupes || []).slice();
        if (valeur && !noms.includes(valeur)) noms.push(valeur);
        input = '<select class="mrt-champ" id="' + id + '" data-k="' + k + '"><option value="">—</option>' +
          noms.map(n => '<option value="' + esc(n) + '"' + (n === valeur ? ' selected' : '') + '>' + esc(n) + '</option>').join('') +
          '<option value="' + NOUVEAU + '">Nouveau groupe…</option></select>' +
          '<input type="text" id="fc-groupe_nouveau" data-k="groupe_nouveau" class="mrt-champ fc-nouveau" hidden placeholder="' + AIDE.groupe_nouveau + '" autocomplete="off" aria-label="Nom du nouveau groupe">';
      } else if (genre === 'long') {
        const max = LONGUEURS[k] ? ' maxlength="' + LONGUEURS[k] + '"' : '';
        const lignes = LONGUEURS[k] && LONGUEURS[k] <= 100 ? 2 : 3;
        input = '<textarea class="mrt-champ" id="' + id + '" data-k="' + k + '" rows="' + lignes + '"' + max + (AIDE[k] ? ' placeholder="' + AIDE[k] + '"' : '') + '>' + esc(valeur == null ? '' : valeur) + '</textarea>' +
          (LONGUEURS[k] ? '<p class="fc-compte" data-compte="' + k + '"></p>' : '');
      } else {
        const v = genre === 'duree' ? fmtDuree(valeur) : genre === 'allure' ? fmtAllure(valeur)
          : genre === 'heure' ? (valeur ? String(valeur).slice(0, 5) : '')
          : genre === 'date' && venir && c.date_approx && valeur ? String(valeur).slice(0, 7)
          : genre === 'dateLibre' && c.ouverture_approx && valeur ? String(valeur).slice(0, 7)
          : valeur == null ? '' : genre === 'nombre' ? String(valeur).replace('.', ',') : String(valeur);
        const type = genre === 'date' ? (venir && c.date_approx ? 'month' : 'date') : genre === 'dateLibre' ? (c.ouverture_approx ? 'month' : 'date') : 'text';
        const saisie = genre === 'nombre' ? ' inputmode="decimal"' : genre === 'entier' || genre === 'duree' || genre === 'allure' || genre === 'heure' ? ' inputmode="numeric"' : genre === 'url' ? ' inputmode="url"' : '';
        const borne = genre !== 'date' ? '' : venir ? ' min="' + (c.date_approx ? today().slice(0, 7) : today()) + '"' : ' max="' + today() + '"';
        input = '<input class="mrt-champ" type="' + type + '" id="' + id + '" data-k="' + k + '" value="' + esc(v) + '"' + saisie + borne + (AIDE[k] ? ' placeholder="' + AIDE[k] + '"' : '') + ' autocomplete="off">';
      }
      // « Date approximative » reste à droite de la date, même sur téléphone.
      // Course courue : la case n'a pas de sens, sa place reste vide, pour que les champs suivants ne remontent pas.
      const jourInconnu = k !== 'date' ? '' : venir ? '<div class="fc-champ fc-bas">' + champ(CHAMPS.find(f => f[0] === 'date_approx')) + '</div>'
        : '<div class="fc-champ fc-vide" aria-hidden="true"></div>';
      // Ouverture des inscriptions : la date, l'heure et « Seul le mois est connu » sur une seule ligne.
      // Résultat : le temps, la case DNF et l'allure moyenne sur une seule ligne.
      const ligneRes = k === 'temps' ? '<div class="fc-champ fc-bas">' + champ(CHAMPS.find(f => f[0] === 'dnf')) + '</div>' + champ(CHAMPS.find(f => f[0] === 'allure')) : '';
      const ouverture = k === 'ouverture_inscriptions' ? champ(CHAMPS.find(f => f[0] === 'ouverture_heure')) + champ(CHAMPS.find(f => f[0] === 'ouverture_approx')) : '';
      const classes = 'fc-champ' + (k === 'distance' ? ' fc-seul' : '') + (['place', 'effectif', 'place_sexe', 'effectif_sexe'].includes(k) ? ' fc-moitie' : ['categorie', 'place_categorie', 'effectif_categorie'].includes(k) ? ' fc-tiers' : '') + (['long', 'url', 'objectif', 'groupe'].includes(genre) ? ' fc-large' : '') + (k === 'logistique' ? ' fc-sanslib' : '');
      const attrs = genre === 'groupe' ? ' data-champ="groupe_options"' + (c.statut === 'option' ? '' : ' hidden') : '';
      const html = '<div class="' + classes + '"' + attrs + '><label for="' + (k === 'objectif' ? 'fc-objectif_type' : id) + '">' + esc(lib) + (oblig ? ' <span class="fc-oblig" aria-hidden="true">*</span>' : '') + '</label>' + input + '<p class="fc-erreur" id="' + id + '-err" aria-live="polite"></p></div>';
      return jourInconnu ? '<div class="fc-ligne-date">' + html + jourInconnu + '</div>' : ouverture ? '<div class="fc-ligne-ouv">' + html + ouverture + '</div>' : ligneRes ? '<div class="fc-ligne-res">' + html + ligneRes + '</div>' : html;
    };
    // Blocs ouverts : les mêmes pour une course nouvelle ou existante, les titres des autres restent visibles d'un coup d'œil :
    // à venir, Course et Place dans le plan ; courue, Course et Résultat. Un champ en erreur ouvre son bloc.
    const ouvert = b => b === 'course' || b === (venir ? 'plan' : 'resultat');
    const titreForm = marquer ? 'Marquer comme courue' : existe ? 'Modifier la course' : 'Ajouter une course';
    // Feuille à elle seule (Palmarès, « + Ajouter une course ») : la même que celle d'une course (modale-course.css).
    const seule = !dans;
    let voile = null, hote = dans;
    if (seule) {
      voile = document.createElement('div');
      voile.className = 'mc-voile';
      voile.innerHTML = '<div class="mc-panneau" role="dialog" aria-modal="true" aria-labelledby="fc-titre" tabindex="-1"><div class="mc-corps"></div></div>';
      hote = voile.querySelector('.mc-corps');
    }
    const racine = document.createElement('div');
    racine.className = 'fc-fiche';
    racine.innerHTML =
      '<form novalidate>' +
        '<div class="pc-barre fc-barre"><button type="button" class="mrt-btn" data-fc="annuler">Annuler</button>' +
          '<button type="submit" class="mrt-btn is-principal fc-plein">Enregistrer</button></div>' +
        // Le mode, en libellé (capitales discrètes), comme le rôle et l'étape en consultation.
        '<p class="fc-libelle" id="fc-titre">' + titreForm + '</p>' +
        '<p class="fc-msg" aria-live="polite"></p>' +
        BLOCS.map(([b, titre]) =>
          '<section class="fc-bloc">' +
            '<button type="button" class="fc-bloc-titre" data-bloc="' + b + '" aria-expanded="' + ouvert(b) + '">' + CHEVRON + titre + '</button>' +
            '<div class="fc-grille' + (b === 'resultat' ? ' fc-grille-3' : '') + '"' + (ouvert(b) ? '' : ' hidden') + '>' +
              (b === 'preparation' && preparation ? '<div class="fc-prep fc-large"></div>' : '') + CHAMPS.filter(f => f[3] === b && !['date_approx', 'ouverture_heure', 'ouverture_approx', 'dnf', 'allure'].includes(f[0])).map(champ).join('') + '</div>' +
          '</section>').join('') +
        (existe && !marquer ? '<div class="fc-actions"><button type="button" class="fc-supprimer mrt-btn is-danger fc-danger" data-fc="supprimer">' + POUBELLE + 'Supprimer la course</button></div>' : '') +
      '</form>';
    hote.replaceChildren(racine);
    if (seule) {
      document.body.appendChild(voile);
      document.documentElement.classList.add('mc-ouvert');
    }
    const $ = s => racine.querySelector(s);
    const val = k => racine.querySelector('[data-k="' + k + '"]');
    const avant = document.activeElement;
    val('course').focus({ preventScroll: true });

    // Fin : la feuille à elle seule se ferme ; la feuille d'une course reprend la main (fin).
    let finie = false;
    function terminer(r, id) {
      if (finie) return;
      finie = true;
      if (seule) {
        voile.remove();
        document.documentElement.classList.remove('mc-ouvert');
        document.removeEventListener('keydown', clavier);
        window.removeEventListener('popstate', surRetour);
        retirerEntree();
        if (avant && avant.focus) avant.focus();
      }
      if (fin) fin(r, id);
    }
    // « Annuler » : rien n'est rangé ; une saisie en cours demande d'abord confirmation.
    let depart = '';
    const etat = () => JSON.stringify([...racine.querySelectorAll('[data-k]')].map(e => (e.type === 'checkbox' ? e.checked : e.value))) +
      (gpx.fichier ? 'gpx:' + gpx.fichier.name : gpx.supprimer ? 'gpx:-' : '');
    // Confirmation du site (en-tete.js, mrtConfirmer), comme toutes les questions.
    const ABANDON = { texte: 'Abandonner les modifications ?', action: 'Abandonner', annuler: 'Continuer', danger: true };
    async function annuler() {
      if (etat() !== depart && !(await window.mrtConfirmer(ABANDON))) return;
      terminer('annule');
    }
    function clavier(e) { if (e.key === 'Escape' && !document.querySelector('.cal-voile')) annuler(); }
    // Retour du navigateur ou du téléphone, feuille à elle seule : comme « Annuler », sans quitter la page. La feuille
    // ajoute une entrée d'historique à son ouverture et la retire à la fin, quelle qu'en soit la façon.
    let entree = false, sortie = Promise.resolve();
    function pousser() { try { history.pushState({ mrtFiche: true }, ''); entree = true; } catch (e) { /* historique refusé */ } }
    function retirerEntree() {
      if (!entree) return;
      entree = false;
      // Le retour s'achève avant toute nouvelle entrée (la course ouverte après un ajout).
      sortie = new Promise(ok => { const fait = () => { window.removeEventListener('popstate', fait); ok(); }; window.addEventListener('popstate', fait); setTimeout(fait, 600); });
      history.back();
    }
    async function surRetour() {
      if (!entree) return;
      entree = false;
      // Saisie en cours : la feuille reste le temps de la question, son entrée d'historique est remise ; abandon accepté : « Annuler ».
      if (etat() !== depart) {
        pousser();
        if (!(await window.mrtConfirmer(ABANDON))) return;
      }
      terminer('annule');
    }
    if (seule) {
      document.addEventListener('keydown', clavier);
      voile.addEventListener('click', e => { if (e.target === voile) annuler(); });
      pousser();
      window.addEventListener('popstate', surRetour);
    }

    // ----- Tracé GPX (à venir comme courue) : choisi ici, rangé avec la course -----
    const gpx = { fichier: null, texte: null, supprimer: false };
    const gpxZone = $('.fc-gpx');
    if (gpxZone) {
      const entree = $('.fc-gpx-fichier'), err = $('#fc-gpx-err');
      entree.addEventListener('change', async () => {
        const f = entree.files[0];
        entree.value = '';
        if (!f) return;
        const v = await window.mrtTrace.verifier(f);
        err.textContent = v.erreur || '';
        if (v.erreur) return;
        // Plusieurs tracés dans le fichier : on garde celui de la course.
        const zone = $('.tr-choix-zone');
        const choisi = v.pistes.length > 1 ? await window.mrtTrace.choisir(zone, v.pistes, parseNombre(val('distance').value)) : v.pistes[0];
        zone.hidden = true;
        if (!choisi) return;
        gpx.fichier = f; gpx.texte = choisi.texte; gpx.supprimer = false;
        // Distance, D+ et D− suivent le tracé (Objectif, § 3.4, n° 51) ; on peut encore les corriger avant « Enregistrer ».
        const t = window.mrtTrace.lire(choisi.texte), ch = t && window.mrtTrace.chiffres(t);
        if (ch) {
          [['distance', ch.distance], ['dplus', ch.dplus], ['dmoins', ch.dmoins]].forEach(([k, v]) => {
            if (v == null || !val(k)) return;
            val(k).value = String(v).replace('.', ',');
            val(k).dispatchEvent(new Event('change', { bubbles: true }));
          });
        }
        $('.fc-gpx-etat').textContent = 'Nouveau tracé : ' + f.name + ' (rangé à l\'enregistrement)' + (ch ? ' · distance, D+ et D− mis à jour d\'après le tracé' : '');
        $('[data-fc="gpx-choisir"]').textContent = 'Remplacer';
      });
    }

    // ----- Plan de préparation (mode à venir) -----
    // Tiré de la date, du format et du statut saisis ; le plan se règle ensuite dans Préparation (design § 12).
    const P = window.mrtPreparation;
    const avecPlan = () => !!preparation && !!P && ['confirmee', 'option'].includes(val('statut').value);
    function virtuelle() {
      const fmt = val('format').value, s = references.sous.find(x => x.id === fmt);
      const prepaFormat = s && s.prepa_semaines != null ? s.prepa_semaines : null;
      // Date approximative : le plan vise le début du mois.
      const d = val('date').value, date = val('date_approx').checked ? (/^\d{4}-\d{2}$/.test(d) ? d + '-01' : '') : d;
      return { id: c.id, course: val('course').value.trim() || 'nouvelle course', date, format: fmt, statut: val('statut').value, etat: 'a_venir',
        prepaFormat, prepaSemaines: c.prepa_semaines != null ? c.prepa_semaines : prepaFormat };
    }
    // Phases réglées à la main : rangées par semaine du calendrier, avec la date de course sur laquelle elles ont été réglées (base).
    // La date change : elles suivent la course (même numéro de semaine du plan). Date approximative décochée : le plan se
    // recalcule selon les règles, sur la date précise (phases réglées à la main oubliées).
    let base = existe && preparation && P ? { modifs: P.modifsDe(preparation.semaines, c.id), date: c.date, approx: !!c.date_approx } : { modifs: new Map(), date: '', approx: false };
    const remise = () => base.approx && !val('date_approx').checked;
    function modifs() {
      const a = virtuelle().date;
      if (remise()) return new Map();
      if (!base.date || !a || base.date === a) return new Map(base.modifs);
      const j = Math.round((Date.parse(P.lundiDe(a)) - Date.parse(P.lundiDe(base.date))) / 864e5);
      return new Map([...base.modifs].map(([l, ph]) => [P.addDays(l, j), ph]));
    }
    function majPrep() {
      const z = $('.fc-prep');
      if (!z) return;
      if (!avecPlan()) { z.innerHTML = ''; return; }
      const v = virtuelle(), note = t => '<p class="fc-prep-note">' + t + '</p>';
      const attente = !v.date || !v.format ? 'Choisis d\'abord la date et le format.' : '';
      const plan = attente ? null : P.planDe(v, modifs());
      z.innerHTML = (attente ? note(attente)
        : plan ? '<p class="cal-plan-dates">Plan de ' + plan.n + ' semaines · début : ' + P.longue(plan.premier) + ' → jour J : ' + P.longue(v.date) + '</p>' +
          (val('date_approx').checked ? note(APPROX) : '') + P.frise(plan, false)
        : note('Pas encore de plan : ce format n\'a pas de durée de préparation par défaut.')) +
        (attente ? '' : note('Le plan se règle dans Préparation, une fois la course enregistrée.'));
    }
    if (preparation) {
      racine.addEventListener('change', e => { if (['date', 'date_approx', 'type', 'format', 'distance', 'statut'].includes(e.target.dataset.k)) majPrep(); });
      majPrep();
    }

    // Objectif : la durée n'apparaît que pour « Moins de… » et « Temps précis ».
    val('objectif_type').addEventListener('change', () => {
      const t = val('objectif_type').value, d = val('objectif'), avec = t === 'sub' || t === 'temps';
      d.hidden = !avec;
      d.value = '';
      if (avec) { d.placeholder = AIDE_OBJECTIF[t]; d.focus(); } else erreur('objectif', '');
    });
    // Étoiles : une course à surveiller n'a pas besoin de date ni de distance ; une course DNF, pas de temps.
    function majOblig() {
      const facultatif = k => (venir ? (k === 'date' || k === 'distance') && val('statut').value === 'a_surveiller' : k === 'temps' && val('dnf').checked);
      ['date', 'distance', 'temps'].forEach(k => { const e = racine.querySelector('label[for="fc-' + k + '"] .fc-oblig'); if (e) e.hidden = facultatif(k); });
    }
    if (venir) val('statut').addEventListener('change', majOblig); else val('dnf').addEventListener('change', majOblig);
    majOblig();

    // Type → formats du type ; trail : celui de la distance, modifiable.
    function remplirSous(choix) {
      const t = val('type').value;
      val('format').innerHTML = '<option value="">—</option>' + sousDe(t).map(s => '<option value="' + esc(s.id) + '">' + esc(s.libelle) + '</option>').join('');
      if (choix) val('format').value = choix;
    }
    function proposerTrail() {
      const km = parseNombre(val('distance').value);
      if (val('type').value === 'trail' && km > 0) val('format').value = trailSelonDistance(km);
    }
    val('type').addEventListener('change', () => { remplirSous(''); proposerTrail(); });
    val('distance').addEventListener('change', proposerTrail);

    // L'heure de départ n'a de sens qu'avec une date exacte : sans date ou en mois seul, le champ se vide et se grise.
    const heureDepart = () => {
      const approx = val('date_approx'), sans = !val('date').value || (approx && approx.checked);
      val('heure').disabled = sans;
      if (sans) { val('heure').value = ''; erreur('heure', ''); }
    };
    val('date').addEventListener('input', heureDepart);
    val('date').addEventListener('change', heureDepart);
    if (venir) val('date_approx').addEventListener('change', heureDepart);
    heureDepart();
    if (venir) {
      // « Date approximative » : la date devient un mois.
      val('date_approx').addEventListener('change', () => {
        const d = val('date'), mois = val('date_approx').checked, v = d.value;
        d.type = mois ? 'month' : 'date';
        d.min = mois ? today().slice(0, 7) : today();
        d.value = mois ? v.slice(0, 7) : (/^\d{4}-\d{2}$/.test(v) ? v + '-01' : v);
      });
      // Le groupe d'options n'existe que pour une Option ; « Nouveau groupe… » ouvre un champ de nom.
      const montrerGroupe = () => { $('[data-champ="groupe_options"]').hidden = val('statut').value !== 'option'; };
      val('statut').addEventListener('change', montrerGroupe);
      val('groupe_options').addEventListener('change', () => { val('groupe_nouveau').hidden = val('groupe_options').value !== NOUVEAU; });
      // « Mois seulement » (ouverture des inscriptions) : la date devient un mois, l'heure se vide et se grise.
      const ouv = () => {
        const d = val('ouverture_inscriptions'), mois = val('ouverture_approx').checked, v = d.value;
        d.type = mois ? 'month' : 'date';
        d.value = mois ? v.slice(0, 7) : (/^\d{4}-\d{2}$/.test(v) ? v + '-01' : v);
        val('ouverture_heure').disabled = mois;
        if (mois) val('ouverture_heure').value = '';
      };
      val('ouverture_approx').addEventListener('change', ouv);
      val('ouverture_heure').disabled = val('ouverture_approx').checked;
      // Le numéro de dossard ne se saisit qu'une fois inscrit.
      const inscrit = () => { val('dossard').disabled = !val('inscrit').checked; };
      val('inscrit').addEventListener('change', inscrit);
      inscrit();
    }
    // DNF (course non terminée) : ni temps ni allure moyenne ; les deux champs se vident et se grisent.
    if (!venir) {
      const dnf = () => ['temps', 'allure'].forEach(k => {
        val(k).disabled = val('dnf').checked;
        if (val('dnf').checked) { val(k).value = ''; erreur(k, ''); }
      });
      val('dnf').addEventListener('change', dnf);
      dnf();
    }
    // Compteurs des textes limités (description, précisions).
    Object.keys(LONGUEURS).forEach(k => {
      const el = val(k);
      if (!el) return;
      const compte = () => { $('[data-compte="' + k + '"]').textContent = milliers(el.value.length) + ' / ' + milliers(LONGUEURS[k]); };
      el.addEventListener('input', compte);
      compte();
    });

    function erreur(k, texte) {
      const p = $('#fc-' + k + '-err');
      if (!p) return true; // case à cocher : jamais en erreur
      p.textContent = texte || '';
      val(k).setAttribute('aria-invalid', String(!!texte));
      if (texte) {
        const bloc = val(k).closest('.fc-grille');
        if (bloc.hidden) { bloc.hidden = false; bloc.previousElementSibling.setAttribute('aria-expanded', 'true'); }
      }
      return !texte;
    }

    // Lit et contrôle le formulaire ; rend les champs à enregistrer, ou null.
    function lire() {
      const out = {};
      let ok = true;
      const statut = venir ? val('statut').value : null;
      const approx = venir && val('date_approx').checked;
      const approxO = venir && val('ouverture_approx').checked;
      for (const [k, lib, genre, , oblig0] of CHAMPS) {
        if (k === 'type') { ok = erreur(k, val(k).value ? '' : 'Choisis un type.') && ok; continue; }
        if (k === 'date_approx') { out[k] = approx; continue; }
        if (k === 'ouverture_approx') { out[k] = approxO; continue; }
        if (k === 'gpx') continue; // rangé à part, après la course
        const el = val(k);
        const oblig = oblig0 && !(venir ? (k === 'date' || k === 'distance') && statut === 'a_surveiller' : k === 'temps' && val('dnf').checked);
        let v, msg = '';
        if (genre === 'case') v = el.checked;
        else if (genre === 'choix') v = el.value || null;
        else if (genre === 'groupe') {
          v = statut === 'option' ? el.value || null : null;
          if (v === NOUVEAU) {
            v = val('groupe_nouveau').value.trim() || null;
            if (!v) msg = 'Écris le nom du groupe.';
          }
        }
        else if (genre === 'texte') v = el.value.trim() || null;
        else if (genre === 'long') {
          v = el.value.trim() || null;
          if (LONGUEURS[k] && v && v.length > LONGUEURS[k]) msg = 'Limité à ' + milliers(LONGUEURS[k]) + ' caractères.';
        } else if (genre === 'url') {
          v = el.value.trim() || null;
          if (v && !/^https?:\/\//i.test(v)) msg = 'Lien attendu : il commence par http:// ou https://.';
        } else if (genre === 'heure') {
          v = parseHeure(el.value);
          if (Number.isNaN(v)) { msg = 'Heure illisible (' + AIDE[k] + ').'; v = null; }
          else if ((k === 'heure' && approx) || (k === 'ouverture_heure' && approxO)) v = null;
        } else if (genre === 'objectif') {
          const t = val('objectif_type').value, txt = el.value.trim();
          v = null;
          if (t === 'finisher') v = 'Finisher';
          else if (t && !txt) msg = 'Indique la durée.';
          else if (t) {
            v = parseObjectif(t === 'sub' ? 'Sub ' + txt : txt);
            if (Number.isNaN(v) || (t === 'temps' && !/^\d{2}:/.test(v))) { msg = 'Durée illisible (' + AIDE_OBJECTIF[t] + ').'; v = null; }
          }
        } else if (genre === 'dateLibre') {
          v = el.value || null;
          // Mois seul : le mois saisi est rangé au 1er du mois.
          if (v && approxO) { if (/^\d{4}-\d{2}$/.test(v)) v += '-01'; else msg = 'Mois illisible (ex. 2027-01).'; }
        }
        else if (genre === 'date') {
          v = el.value || null;
          if (venir && v && approx) {
            if (!/^\d{4}-\d{2}$/.test(v)) msg = 'Mois illisible (ex. 2027-07).';
            else if (v < today().slice(0, 7) && v + '-01' !== c.date) msg = 'Le mois d\'une course à venir ne peut pas être passé.';
            if (!msg) v += '-01';
          } else if (venir && v && v < today() && v !== c.date) msg = 'La date d\'une course à venir ne peut pas être dans le passé.';
          else if (!venir && v && v > today()) msg = 'La date d\'une course courue ne peut pas être dans le futur.';
        } else if (genre === 'duree' || genre === 'allure') {
          v = parseDuree(el.value);
          if (Number.isNaN(v)) msg = 'Durée illisible (' + AIDE[k] + ').';
          else if (v === 0) msg = 'La durée doit être positive.';
        } else {
          v = parseNombre(el.value);
          if (Number.isNaN(v)) msg = 'Nombre illisible.';
          else if (v != null && (v < 0 || (v === 0 && !['dplus', 'dmoins', 'prix', 'montre_dplus', 'montre_dmoins'].includes(k)))) msg = 'Le nombre doit être positif.';
          else if (v != null && genre === 'entier' && !Number.isInteger(v)) msg = 'Nombre entier attendu.';
        }
        if (!msg && oblig && (v == null || v === '')) msg = 'Champ obligatoire.';
        ok = erreur(k, msg) && ok;
        out[k] = v;
      }
      if (venir && !out.ouverture_inscriptions) { out.ouverture_approx = false; out.ouverture_heure = null; } // sans date d'ouverture, ni mois seul ni heure
      if (venir && !out.inscrit) out.dossard = null; // un numéro de dossard suppose d'être inscrit
      if (!venir) {
        if (out.dnf) { out.temps = null; out.allure = null; }
        VITESSES.forEach(([a, v]) => { out[v] = out[a] ? Math.round(360000 / out[a]) / 100 : null; });
      }
      return ok ? out : null;
    }

    racine.addEventListener('click', async e => {
      const bloc = e.target.closest('[data-bloc]');
      if (bloc) {
        const grille = bloc.nextElementSibling;
        grille.hidden = !grille.hidden;
        bloc.setAttribute('aria-expanded', String(!grille.hidden));
        return;
      }
      const act = e.target.closest('[data-fc]');
      if (!act) return;
      const a = act.dataset.fc;
      if (a === 'annuler') annuler();
      if (a === 'gpx-choisir') $('.fc-gpx-fichier').click();
      if (a === 'gpx-supprimer') {
        gpx.fichier = null; gpx.supprimer = true;
        $('.fc-gpx-etat').textContent = 'Tracé supprimé à l\'enregistrement';
        $('[data-fc="gpx-choisir"]').textContent = 'Importer un GPX';
        act.hidden = true;
        $('#fc-gpx-err').textContent = '';
      }
      if (a === 'supprimer') {
        if (!(await window.mrtConfirmer({ texte: 'Supprimer cette course ? Cette action est définitive.', action: 'Supprimer', danger: true }))) return;
        act.disabled = true;
        const { error } = await window.mrtSupabase.from('courses').delete().eq('id', c.id);
        if (error) { $('.fc-msg').textContent = 'Suppression impossible pour l\'instant.'; act.disabled = false; return; }
        terminer('supprime', c.id);
        if (apres) apres({ supprimee: c.id });
      }
    });

    $('form').addEventListener('submit', async e => {
      e.preventDefault();
      const champs = lire();
      if (!champs) {
        $('.fc-msg').textContent = 'Corrige les champs signalés.';
        const faux = $('[aria-invalid="true"]');
        if (faux) faux.scrollIntoView({ block: 'center' });
        return;
      }
      if (marquer) champs.etat = 'courue';
      const btn = $('.fc-plein');
      btn.disabled = true;
      $('.fc-msg').textContent = 'Enregistrement…';
      // Plan réglé dans la fenêtre : durée avec la course (vide si c'est celle du format), phases modifiées à part.
      // Sans réglage : phases décalées avec la date, ou remises aux règles quand la date approximative devient précise.
      let lignes = null, id = c.id;
      // Nouvelle course : son identifiant est choisi ici, pour l'ouvrir aussitôt enregistrée.
      if (!existe) champs.id = id = crypto.randomUUID();
      if (preparation && P) {
        const v = virtuelle(), m = modifs();
        if (existe && (remise() || (base.modifs.size && v.date && v.date !== base.date))) {
          lignes = [...m].map(([lundi, phase]) => ({ course: id, lundi, phase }));
        }
      }
      const db = window.mrtSupabase.from('courses');
      const { error } = existe
        ? await db.update(champs).eq('id', c.id)
        : await db.insert(Object.assign(venir ? { etat: 'a_venir' } : { statut: 'confirmee', etat: 'courue' }, champs));
      if (error) { $('.fc-msg').textContent = 'Enregistrement impossible pour l\'instant.'; btn.disabled = false; console.warn(error); return; }
      if (lignes && id) {
        const sb = window.mrtSupabase;
        let r = existe ? await sb.from('plan_semaines').delete().eq('course', id) : {};
        if (!r.error && lignes.length) r = await sb.from('plan_semaines').insert(lignes);
        if (r.error) { console.warn(r.error); await window.mrtConfirmer({ texte: 'Course enregistrée, mais pas les phases du plan : réessaie depuis Préparation.', action: 'Fermer', seul: true }); }
      }
      if ((gpx.fichier || (gpx.supprimer && c.gpx)) && window.mrtTrace) {
        const cc = Object.assign({}, c, { id });
        const err = gpx.fichier ? await window.mrtTrace.ranger(cc, gpx.texte, { chiffres: false }) : await window.mrtTrace.retirer(cc);
        if (err) await window.mrtConfirmer({ texte: 'Course enregistrée, mais pas le tracé : ' + err, action: 'Fermer', seul: true });
      }
      terminer('enregistre', id);
      if (apres) await apres();
      // Nouvelle course à venir, ajoutée depuis sa propre feuille : sa consultation, si elle est sur la feuille de route.
      if (seule && !existe && venir && window.mrtOuvrirCourse) { await sortie; window.mrtOuvrirCourse(id, '', { siPresente: true }); }
    });
    depart = etat();
    return { annuler };
  };

  // Pour les contrôles : lecture des durées, de l'heure et de l'objectif.
  window.mrtFicheCourse.parseDuree = parseDuree;
  window.mrtFicheCourse.parseHeure = parseHeure;
  window.mrtFicheCourse.parseObjectif = parseObjectif;
})();
