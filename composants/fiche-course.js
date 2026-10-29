// ===== Fiche d'une course : une seule fiche de champs, dans la feuille de la course =====
//
// Décrite par docs/module-objectif-specification.md (§ 3.7 et 3.8) et docs/module-palmares-specification.md (§ 10) ;
// style : fiche-course.css et modale-course.css (la feuille).
// Mêmes blocs, dans le même ordre, pour une course à venir et une course courue ; l'état choisit seulement les blocs
// montrés et ceux qui sont ouverts. Barre du haut : « Annuler », titre, « Enregistrer » ; pas de croix.
// mrtFicheCourse({ course, references, apres, mode, groupes, marquer, preparation, dans, fin })
//   dans  élément où dessiner la fiche (la feuille d'une course, modale-course.js) ; sans lui, la fiche ouvre
//         sa propre feuille (Palmarès, « + Ajouter une course ») et la ferme à la fin
//   fin(r, id)  appelé à la fin : r = 'annule', 'enregistre' ou 'supprime'
// Rend { annuler() } : « Annuler », avec « Abandonner les modifications ? » s'il y a eu une saisie.
(function () {
  // Bouton « Supprimer la course » : à contour rouge, avec une poubelle.
  const POUBELLE = '<svg class="fc-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEVRON = '<svg class="fc-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ROLES = [['preparatoire', 'Préparatoire'], ['plaisir', 'Plaisir'], ['objectif_intermediaire', 'Objectif intermédiaire'], ['objectif', 'Objectif']];
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
    ['date_approx', 'Date approximative (mois seulement)', 'case', 'course'],
    ['heure', 'Heure de départ', 'heure', 'course'],
    ['lieu', 'Lieu', 'texte', 'course'],
    ['type', 'Type', 'choix', 'course', true],
    ['format', 'Format', 'choix', 'course', true],
    ['distance', 'Distance (km)', 'nombre', 'course'],
    ['dplus', 'D+ (m)', 'entier', 'course'],
    ['dmoins', 'D− (m)', 'entier', 'course'],
    ['description', 'Description', 'long', 'course'],
    ['statut', 'Statut', 'choix', 'plan'],
    ['role', 'Rôle', 'choix', 'plan'],
    ['groupe_options', 'Groupe d\'options', 'groupe', 'plan'],
    ['objectif', 'Objectif', 'objectif', 'preparation'],
    ['objectif_precisions', 'Précisions', 'long', 'preparation'],
    ['pourquoi', 'Rôle dans la préparation', 'long', 'preparation'],
    ['strategie', 'Stratégie ou enchaînement', 'long', 'preparation'],
    ['logistique', 'Logistique', 'long', 'logistique'],
    ['ouverture_inscriptions', 'Ouverture des inscriptions', 'dateLibre', 'dossard'],
    ['inscrit', 'Inscrit', 'case', 'dossard'],
    ['inscription', 'Site d\'inscription', 'url', 'dossard'],
    ['dossard', 'Numéro de dossard', 'texte', 'dossard'],
    ['prix', 'Prix (€)', 'nombre', 'dossard'],
    // Résultat, puis classements : un seul bloc. Général et sexe : deux champs sur toute la largeur ; catégorie : trois.
    ['temps', 'Temps', 'duree', 'resultat'],
    ['dnf', 'Non terminée (DNF)', 'case', 'resultat'],
    ['allure', 'Allure moyenne (par km)', 'allure', 'resultat'],
    ['place', 'Place au général', 'entier', 'resultat'],
    ['effectif', 'Effectif du général', 'entier', 'resultat'],
    ['categorie', 'Catégorie', 'choix', 'resultat'],
    ['place_categorie', 'Place en catégorie', 'entier', 'resultat'],
    ['effectif_categorie', 'Effectif catégorie', 'entier', 'resultat'],
    ['place_sexe', 'Place par sexe', 'entier', 'resultat'],
    ['effectif_sexe', 'Effectif par sexe', 'entier', 'resultat'],
    ['montre_temps', 'Temps', 'duree', 'montre'],
    ['montre_distance', 'Distance (km)', 'nombre', 'montre'],
    ['montre_dplus', 'D+ (m)', 'entier', 'montre'],
    ['montre_dmoins', 'D− (m)', 'entier', 'montre'],
    ['montre_allure', 'Allure moyenne (par km)', 'allure', 'montre'],
    ['fc_moyenne', 'FC moyenne (bpm)', 'entier', 'montre'],
    ['lien', 'Site officiel', 'url', 'liens'],
    ['lien_resultats', 'Résultats en direct', 'url', 'liens']
  ];
  // Champs propres à un état : une course courue n'a ni plan ni inscription à venir ; une course à venir, ni résultat ni montre.
  const VENIR_SEUL = new Set(['date_approx', 'statut', 'groupe_options', 'ouverture_inscriptions', 'inscrit', 'inscription']);
  const BLOCS_TOUS = [['course', 'Course'], ['plan', 'Place dans le plan'], ['preparation', 'Préparation'], ['logistique', 'Logistique'],
    ['dossard', 'Dossard'], ['resultat', 'Résultat'], ['montre', 'Montre'], ['liens', 'Liens']];
  const COURUE_SEUL = new Set(TOUS.filter(f => f[3] === 'resultat' || f[3] === 'montre').map(f => f[0]));
  // Vitesse : plus saisie, tirée de l'allure moyenne (3 600 ÷ allure, en km/h) à l'enregistrement.
  const VITESSES = [['allure', 'vitesse'], ['montre_allure', 'montre_vitesse']];
  // Catégories d'âge de la Fédération française d'athlétisme (saison du 1er septembre au 31 août).
  const CATEGORIES = [['CA', 'Cadet (CA)'], ['JU', 'Junior (JU)'], ['ES', 'Espoir (ES)'], ['SE', 'Senior (SE)']]
    .concat(Array.from({ length: 11 }, (_, i) => ['M' + i, 'Master ' + i + ' (M' + i + ', ' + (35 + 5 * i) + (i < 10 ? '-' + (39 + 5 * i) : ' et plus') + ' ans)']));
  const STATUTS = [['confirmee', 'Confirmée'], ['option', 'Option'], ['a_surveiller', 'À surveiller']];
  const APPROX = 'Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.';
  const DEFAUT = { role: 'preparatoire', statut: 'confirmee' };
  const NOUVEAU = '__nouveau__';
  const FORMAT_OBJECTIF = 'Format attendu : 02:45:00, Finisher ou Sub 3h';
  // Exemples affichés dans les champs vides.
  const AIDE = {
    course: 'ex. Forez Trails', parcours: 'ex. L\'Olmetoise (facultatif)', distance: 'ex. 24,4', dplus: 'ex. 933', dmoins: 'ex. 930',
    heure: 'ex. 07:30', lieu: 'ex. Mont-Clair',
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
  //   preparation  { semaines } (mode à venir) : phases modifiées à la main ; le plan de la course s'affiche en tête du bloc
  //                Préparation et se règle dans la fenêtre « Paramétrer le plan » (composants/preparation.js), enregistré avec la course
  window.mrtFicheCourse = function ({ course, references, apres, mode, groupes, marquer, preparation, dans, fin }) {
    const existe = !!(course && course.id);
    const c = Object.assign({}, course || {});
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
      if (genre === 'choix') {
        const opts = k === 'type' ? references.types.map(t => [t.id, t.libelle])
          : k === 'role' ? ROLES
          : k === 'statut' ? STATUTS
          : k === 'categorie' ? CATEGORIES
          : sousDe(typeDe(c.format)).map(s => [s.id, s.libelle]);
        const vide = DEFAUT[k] ? '' : '<option value="">—</option>';
        const courant = valeur || DEFAUT[k] || '';
        input = '<select id="' + id + '" data-k="' + k + '">' + vide + opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === courant ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
      } else if (genre === 'groupe') {
        const noms = (groupes || []).slice();
        if (valeur && !noms.includes(valeur)) noms.push(valeur);
        input = '<select id="' + id + '" data-k="' + k + '"><option value="">—</option>' +
          noms.map(n => '<option value="' + esc(n) + '"' + (n === valeur ? ' selected' : '') + '>' + esc(n) + '</option>').join('') +
          '<option value="' + NOUVEAU + '">Nouveau groupe…</option></select>' +
          '<input type="text" id="fc-groupe_nouveau" data-k="groupe_nouveau" class="fc-nouveau" hidden placeholder="' + AIDE.groupe_nouveau + '" autocomplete="off" aria-label="Nom du nouveau groupe">';
      } else if (genre === 'long') {
        const max = LONGUEURS[k] ? ' maxlength="' + LONGUEURS[k] + '"' : '';
        const lignes = LONGUEURS[k] && LONGUEURS[k] <= 100 ? 2 : 3;
        input = '<textarea id="' + id + '" data-k="' + k + '" rows="' + lignes + '"' + max + (AIDE[k] ? ' placeholder="' + AIDE[k] + '"' : '') + '>' + esc(valeur == null ? '' : valeur) + '</textarea>' +
          (LONGUEURS[k] ? '<p class="fc-compte" data-compte="' + k + '"></p>' : '');
      } else {
        const v = genre === 'duree' ? fmtDuree(valeur) : genre === 'allure' ? fmtAllure(valeur)
          : genre === 'heure' ? (valeur ? String(valeur).slice(0, 5) : '')
          : genre === 'date' && venir && c.date_approx && valeur ? String(valeur).slice(0, 7)
          : valeur == null ? '' : genre === 'nombre' ? String(valeur).replace('.', ',') : String(valeur);
        const type = genre === 'date' ? (venir && c.date_approx ? 'month' : 'date') : genre === 'dateLibre' ? 'date' : 'text';
        const saisie = genre === 'nombre' ? ' inputmode="decimal"' : genre === 'entier' || genre === 'duree' || genre === 'allure' || genre === 'heure' ? ' inputmode="numeric"' : genre === 'url' ? ' inputmode="url"' : '';
        const borne = genre !== 'date' ? '' : venir ? ' min="' + (c.date_approx ? today().slice(0, 7) : today()) + '"' : ' max="' + today() + '"';
        input = '<input type="' + type + '" id="' + id + '" data-k="' + k + '" value="' + esc(v) + '"' + saisie + borne + (AIDE[k] ? ' placeholder="' + AIDE[k] + '"' : '') + ' autocomplete="off">';
      }
      // La case DNF se range juste sous le temps : les deux vont ensemble.
      const dnf = k === 'temps' ? champ(CHAMPS.find(f => f[0] === 'dnf')) : '';
      // « Date approximative » reste à droite de la date, même sur téléphone.
      const jourInconnu = k === 'date' && venir ? '<div class="fc-champ fc-bas">' + champ(CHAMPS.find(f => f[0] === 'date_approx')) + '</div>' : '';
      const classes = 'fc-champ' + (k === 'distance' ? ' fc-seul' : '') + (['place', 'effectif', 'place_sexe', 'effectif_sexe'].includes(k) ? ' fc-moitie' : ['categorie', 'place_categorie', 'effectif_categorie'].includes(k) ? ' fc-tiers' : '') + (['long', 'url', 'objectif', 'groupe'].includes(genre) ? ' fc-large' : '') + (k === 'logistique' ? ' fc-sanslib' : '');
      const attrs = genre === 'groupe' ? ' data-champ="groupe_options"' + (c.statut === 'option' ? '' : ' hidden') : '';
      const html = '<div class="' + classes + '"' + attrs + '><label for="' + id + '">' + esc(lib) + (oblig ? ' <span class="fc-oblig" aria-hidden="true">*</span>' : '') + '</label>' + input + dnf + '<p class="fc-erreur" id="' + id + '-err" aria-live="polite"></p></div>';
      return jourInconnu ? '<div class="fc-ligne-date">' + html + jourInconnu + '</div>' : html;
    };
    // Blocs ouverts : à venir, tous pour une course existante, Course et Place dans le plan pour une nouvelle ;
    // courue, Course et Résultat, plus Dossard, Montre et Liens quand ils ont une valeur.
    const rempli = b => CHAMPS.some(f => f[3] === b && c[f[0]] != null && c[f[0]] !== '' && c[f[0]] !== false);
    const ouvert = b => (venir ? existe || b === 'course' || b === 'plan'
      : b === 'course' || b === 'resultat' || (existe && ['dossard', 'montre', 'liens'].includes(b) && rempli(b)));
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
              (b === 'preparation' && preparation ? '<div class="fc-prep fc-large"></div>' : '') + CHAMPS.filter(f => f[3] === b && f[0] !== 'dnf' && f[0] !== 'date_approx').map(champ).join('') + '</div>' +
          '</section>').join('') +
        (existe && !marquer ? '<div class="fc-actions"><button type="button" class="fc-supprimer mrt-btn fc-danger" data-fc="supprimer">' + POUBELLE + 'Supprimer la course</button></div>' +
          '<div class="fc-confirmer" hidden>' +
            '<p>Supprimer cette course ? Cette action est définitive.</p>' +
            '<div class="fc-actions"><button type="button" class="fc-btn mrt-btn" data-fc="garder">Annuler</button>' +
            '<button type="button" class="fc-btn mrt-btn fc-danger" data-fc="confirmer">Supprimer</button></div>' +
          '</div>' : '') +
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
        if (avant && avant.focus) avant.focus();
      }
      if (fin) fin(r, id);
    }
    // « Annuler » : rien n'est rangé ; une saisie en cours demande d'abord confirmation.
    let depart = '';
    const etat = () => JSON.stringify([...racine.querySelectorAll('[data-k]')].map(e => (e.type === 'checkbox' ? e.checked : e.value))) + (reglage ? JSON.stringify(reglage) : '');
    function annuler() {
      if (etat() !== depart && !window.confirm('Abandonner les modifications ?')) return;
      terminer('annule');
    }
    function clavier(e) { if (e.key === 'Escape' && !document.querySelector('.cal-voile')) annuler(); }
    if (seule) {
      document.addEventListener('keydown', clavier);
      voile.addEventListener('click', e => { if (e.target === voile) annuler(); });
    }

    // ----- Plan de préparation (mode à venir) -----
    // Tiré de la date, du format et du statut saisis ; les réglages de « Paramétrer le plan » (reglage) attendent « Enregistrer ».
    const P = window.mrtPreparation;
    let reglage = null;
    const avecPlan = () => !!preparation && !!P && ['confirmee', 'option'].includes(val('statut').value);
    function virtuelle() {
      const fmt = val('format').value, s = references.sous.find(x => x.id === fmt);
      const prepaFormat = s && s.prepa_semaines != null ? s.prepa_semaines : null;
      // Date approximative : le plan vise le début du mois.
      const d = val('date').value, date = val('date_approx').checked ? (/^\d{4}-\d{2}$/.test(d) ? d + '-01' : '') : d;
      return { id: c.id, course: val('course').value.trim() || 'nouvelle course', date, format: fmt, statut: val('statut').value, etat: 'a_venir',
        prepaFormat, prepaSemaines: reglage ? reglage.duree : c.prepa_semaines != null ? c.prepa_semaines : prepaFormat };
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
        '<div class="fc-prep-bas"><button type="button" class="mrt-btn is-principal cal-parametrer" data-fc="preparer"' + (attente ? ' disabled' : '') + '>' + P.REGLAGES + 'Paramétrer le plan</button></div>';
    }
    if (preparation) {
      racine.addEventListener('change', e => { if (['date', 'date_approx', 'type', 'format', 'distance', 'statut'].includes(e.target.dataset.k)) majPrep(); });
      majPrep();
    }

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
      // Le numéro de dossard ne se saisit qu'une fois inscrit.
      const inscrit = () => { val('dossard').disabled = !val('inscrit').checked; };
      val('inscrit').addEventListener('change', inscrit);
      inscrit();
    }
    // Course non terminée (DNF) : ni temps ni allure moyenne ; les deux champs se vident et se grisent.
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
      for (const [k, lib, genre, , oblig0] of CHAMPS) {
        if (k === 'type') { ok = erreur(k, val(k).value ? '' : 'Choisis un type.') && ok; continue; }
        if (k === 'date_approx') { out[k] = approx; continue; }
        const el = val(k);
        const oblig = venir && k === 'date' ? statut !== 'a_surveiller' : oblig0;
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
          else if (approx) v = null;
        } else if (genre === 'objectif') {
          v = parseObjectif(el.value);
          if (Number.isNaN(v)) { msg = FORMAT_OBJECTIF; v = null; }
        } else if (genre === 'dateLibre') v = el.value || null;
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
      if (a === 'preparer') {
        const v = virtuelle();
        P.ouvrirPreparer(null, null, { course: v, duree: v.prepaSemaines, modifs: modifs(), valider: (duree, m) => { reglage = { duree }; base = { modifs: m, date: v.date, approx: val('date_approx').checked }; majPrep(); } });
      }
      if (a === 'supprimer') { $('.fc-confirmer').hidden = false; $('.fc-actions').hidden = true; $('[data-fc="garder"]').focus(); $('.fc-confirmer').scrollIntoView({ block: 'nearest' }); }
      if (a === 'garder') { $('.fc-confirmer').hidden = true; $('.fc-actions').hidden = false; }
      if (a === 'confirmer') {
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
        const plan = reglage && avecPlan() ? P.planDe(v, m, reglage.duree) : null;
        if (plan) {
          champs.prepa_semaines = reglage.duree === v.prepaFormat ? null : reglage.duree;
          lignes = plan.semaines.filter(w => w.phase !== w.regle).map(w => ({ course: id, lundi: w.lundi, phase: w.phase }));
        } else if (existe && (remise() || (base.modifs.size && v.date && v.date !== base.date))) {
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
        if (r.error) { console.warn(r.error); window.alert('Course enregistrée, mais pas les phases du plan : réessaie depuis « Paramétrer le plan ».'); }
      }
      terminer('enregistre', id);
      if (apres) await apres();
      // Nouvelle course à venir, ajoutée depuis sa propre feuille : sa consultation, si elle est sur la feuille de route.
      if (seule && !existe && venir && window.mrtOuvrirCourse) window.mrtOuvrirCourse(id, '', { siPresente: true });
    });
    depart = etat();
    return { annuler };
  };

  // Pour les contrôles : lecture des durées, de l'heure et de l'objectif.
  window.mrtFicheCourse.parseDuree = parseDuree;
  window.mrtFicheCourse.parseHeure = parseHeure;
  window.mrtFicheCourse.parseObjectif = parseObjectif;
})();
