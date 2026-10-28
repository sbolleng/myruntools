// ===== Fiche d'une course : formulaire d'ajout, de modification, de suppression =====
//
// Décrite par docs/module-palmares-specification.md (§ 10) et, pour les courses à venir,
// docs/module-objectif-specification.md (§ 3.7) ; style : docs/design.md (§ 6).
// mrtFicheCourse({ course, references, apres, mode, groupes, marquer }) ouvre le
// panneau : course = ligne de la base à modifier, ou rien pour en ajouter une ;
// references = { types, sous } (types de course et formats) ; apres() est appelé après chaque
// enregistrement ou suppression ; mode = 'courue' (Palmarès) ou 'a_venir' (Objectif). Les écritures passent par la base
// (window.mrtSupabase) : les règles par ligne n'autorisent que ses propres courses.
(function () {
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
  // nombre, entier, duree, case), bloc, obligatoire. Deux formulaires : une course courue (Palmarès) et une
  // course à venir (Objectif).
  const CHAMPS_COURUE = [
    // Champs communs dans l'ordre du formulaire d'Objectif.
    ['course', 'Course', 'texte', 'course', true],
    ['parcours', 'Parcours', 'texte', 'course'],
    ['date', 'Date', 'date', 'course', true],
    ['dossard', 'Numéro de dossard', 'texte', 'course'],
    ['heure', 'Heure de départ', 'heure', 'course'],
    ['lieu', 'Lieu', 'texte', 'course'],
    ['type', 'Type', 'choix', 'course', true],
    ['format', 'Format', 'choix', 'course', true],
    ['description', 'Description', 'long', 'course'],
    ['distance', 'Distance (km)', 'nombre', 'course'],
    ['dplus', 'D+ (m)', 'entier', 'course'],
    ['dmoins', 'D− (m)', 'entier', 'course'],
    ['temps', 'Temps', 'duree', 'resultat'],
    ['dnf', 'Non terminée (DNF)', 'case', 'resultat'],
    ['allure', 'Allure moyenne (par km)', 'allure', 'resultat'],
    // Trois colonnes : catégorie, place, effectif ; une case vide là où il n'y a pas de catégorie.
    ['vide_general', '', 'vide', 'classements'],
    ['place', 'Place au général', 'entier', 'classements'],
    ['effectif', 'Effectif du général', 'entier', 'classements'],
    ['categorie', 'Catégorie', 'choix', 'classements'],
    ['place_categorie', 'Place en catégorie', 'entier', 'classements'],
    ['effectif_categorie', 'Effectif de la catégorie', 'entier', 'classements'],
    ['vide_sexe', '', 'vide', 'classements'],
    ['place_sexe', 'Place par sexe', 'entier', 'classements'],
    ['effectif_sexe', 'Effectif par sexe', 'entier', 'classements'],
    ['montre_distance', 'Distance (km)', 'nombre', 'montre'],
    ['montre_dplus', 'D+ (m)', 'entier', 'montre'],
    ['montre_temps', 'Temps', 'duree', 'montre'],
    ['montre_allure', 'Allure moyenne (par km)', 'allure', 'montre'],
    ['fc_moyenne', 'FC moyenne (bpm)', 'entier', 'montre']
  ];
  const CHAMPS_VENIR = [
    ['course', 'Course', 'texte', 'course', true],
    ['parcours', 'Parcours', 'texte', 'course'],
    ['date', 'Date', 'date', 'course', true],
    ['date_approx', 'Jour inconnu', 'case', 'course'],
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
    ['ouverture_inscriptions', 'Ouverture des inscriptions', 'dateLibre', 'dossard'],
    ['inscrit', 'Inscrit', 'case', 'dossard'],
    ['dossard', 'Numéro de dossard', 'texte', 'dossard'],
    ['prix', 'Prix (€)', 'nombre', 'dossard'],
    ['inscription', 'Site d\'inscription', 'url', 'dossard'],
    ['logistique', 'Logistique', 'long', 'logistique'],
    ['lien', 'Site officiel', 'url', 'liens'],
    ['lien_resultats', 'Résultats en direct', 'url', 'liens']
  ];
  const BLOCS_COURUE = [['course', 'Course'], ['resultat', 'Résultat'], ['classements', 'Classements'], ['montre', 'Montre']];
  // Vitesse : plus saisie, tirée de l'allure moyenne (3 600 ÷ allure, en km/h) à l'enregistrement.
  const VITESSES = [['allure', 'vitesse'], ['montre_allure', 'montre_vitesse']];
  const BLOCS_VENIR = [['course', 'Course'], ['plan', 'Place dans le plan'], ['preparation', 'Préparation'], ['dossard', 'Dossard'], ['logistique', 'Logistique'], ['liens', 'Liens']];
  // Catégories d'âge de la Fédération française d'athlétisme (saison du 1er septembre au 31 août).
  const CATEGORIES = [['CA', 'Cadet (CA)'], ['JU', 'Junior (JU)'], ['ES', 'Espoir (ES)'], ['SE', 'Senior (SE)']]
    .concat(Array.from({ length: 11 }, (_, i) => ['M' + i, 'Master ' + i + ' (M' + i + ', ' + (35 + 5 * i) + (i < 10 ? '-' + (39 + 5 * i) : ' et plus') + ' ans)']));
  const STATUTS = [['confirmee', 'Confirmée'], ['option', 'Option'], ['a_surveiller', 'À surveiller']];
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
    montre_distance: 'ex. 24,1', montre_dplus: 'ex. 932', montre_temps: 'ex. 3:00:23 ou 30023', montre_allure: 'ex. 7:18 ou 718', fc_moyenne: 'ex. 163'
  };
  // Textes limités, avec un compteur sous le champ.
  const LONGUEURS = { description: 1000, objectif_precisions: 100 };
  const milliers = n => String(n).replace(/\B(?=(\d{3})+$)/g, ' ');

  // mrtFicheCourse({ course, references, apres, mode, groupes, marquer })
  //   mode     'courue' (défaut, Palmarès) ou 'a_venir' (Objectif) ; une course existante à venir s'ouvre en 'a_venir'
  //   groupes  noms des groupes d'options existants (mode à venir)
  //   marquer  vrai : la course existante passe à l'état Courue à l'enregistrement
  window.mrtFicheCourse = function ({ course, references, apres, mode, groupes, marquer }) {
    const existe = !!(course && course.id);
    const c = Object.assign({}, course || {});
    mode = mode || 'courue';
    const venir = mode === 'a_venir';
    const CHAMPS = venir ? CHAMPS_VENIR : CHAMPS_COURUE;
    // Une course qui n'a qu'une vitesse : son allure moyenne en est tirée, pour ne rien perdre en l'enregistrant.
    if (!venir) VITESSES.forEach(([a, v]) => { if (c[a] == null && Number(c[v]) > 0) c[a] = Math.round(3600 / Number(c[v])); });
    const BLOCS = venir ? BLOCS_VENIR : BLOCS_COURUE;
    const sousDe = type => references.sous.filter(s => s.type === type);
    const typeDe = sc => { const s = references.sous.find(x => x.id === sc); return s ? s.type : ''; };

    const voile = document.createElement('div');
    voile.className = 'fc-voile';
    const champ = ([k, lib, genre, , oblig]) => {
      const id = 'fc-' + k;
      const valeur = k === 'type' ? typeDe(c.format) : c[k];
      let input;
      if (genre === 'vide') return '<div class="fc-vide" aria-hidden="true"></div>';
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
      // « Jour inconnu » reste à droite de la date, même sur téléphone.
      const jourInconnu = k === 'date' && venir ? '<div class="fc-champ fc-bas">' + champ(CHAMPS.find(f => f[0] === 'date_approx')) + '</div>' : '';
      const classes = 'fc-champ' + (k === 'distance' ? ' fc-seul' : '') + (['long', 'url', 'objectif', 'groupe'].includes(genre) ? ' fc-large' : '') + (k === 'logistique' ? ' fc-sanslib' : '');
      const attrs = genre === 'groupe' ? ' data-champ="groupe_options"' + (c.statut === 'option' ? '' : ' hidden') : '';
      const html = '<div class="' + classes + '"' + attrs + '><label for="' + id + '">' + esc(lib) + (oblig ? ' <span class="fc-oblig" aria-hidden="true">*</span>' : '') + '</label>' + input + dnf + '<p class="fc-erreur" id="' + id + '-err" aria-live="polite"></p></div>';
      return jourInconnu ? '<div class="fc-ligne-date">' + html + jourInconnu + '</div>' : html;
    };
    const ouvert = b => existe || (venir ? b === 'course' || b === 'plan' : b === 'course' || b === 'resultat');
    const titreForm = marquer ? 'Marquer comme courue' : existe ? 'Modifier la course' : 'Ajouter une course';
    voile.innerHTML =
      '<div class="fc-panneau" role="dialog" aria-modal="true" aria-labelledby="fc-titre">' +
        '<div class="fc-haut"><h2 id="fc-titre">' + titreForm + '</h2>' +
          '<button type="button" class="fc-fermer mrt-rond" data-fc="annuler" aria-label="Fermer">×</button></div>' +
        '<form novalidate>' +
          BLOCS.map(([b, titre]) =>
            '<section class="fc-bloc">' +
              '<button type="button" class="fc-bloc-titre" data-bloc="' + b + '" aria-expanded="' + ouvert(b) + '">' + CHEVRON + titre + '</button>' +
              '<div class="fc-grille' + (b === 'classements' ? ' fc-grille-3' : '') + '"' + (ouvert(b) ? '' : ' hidden') + '>' + CHAMPS.filter(f => f[3] === b && f[0] !== 'dnf' && f[0] !== 'date_approx').map(champ).join('') + '</div>' +
            '</section>').join('') +
          '<p class="fc-msg" aria-live="polite"></p>' +
          '<div class="fc-actions">' +
            (existe && !marquer ? '<button type="button" class="fc-supprimer mrt-lien is-danger" data-fc="supprimer">Supprimer</button>' : '') +
            '<button type="button" class="fc-btn mrt-btn" data-fc="annuler">Annuler</button>' +
            '<button type="submit" class="fc-btn mrt-btn is-principal fc-plein">Enregistrer</button>' +
          '</div>' +
          '<div class="fc-confirmer" hidden>' +
            '<p>Supprimer cette course ? Cette action est définitive.</p>' +
            '<div class="fc-actions"><button type="button" class="fc-btn mrt-btn" data-fc="garder">Annuler</button>' +
            '<button type="button" class="fc-btn mrt-btn fc-danger" data-fc="confirmer">Supprimer</button></div>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(voile);
    document.documentElement.classList.add('fc-ouvert');
    const $ = s => voile.querySelector(s);
    const val = k => voile.querySelector('[data-k="' + k + '"]');
    const avant = document.activeElement;
    val('course').focus();

    function fermer() {
      voile.remove();
      document.documentElement.classList.remove('fc-ouvert');
      document.removeEventListener('keydown', clavier);
      if (avant && avant.focus) avant.focus();
    }
    function clavier(e) { if (e.key === 'Escape') fermer(); }
    document.addEventListener('keydown', clavier);

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
      // « Jour inconnu » : la date devient un mois.
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
        if (genre === 'vide') continue;
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
          else if (v != null && (v < 0 || (v === 0 && !['dplus', 'dmoins', 'prix', 'montre_dplus'].includes(k)))) msg = 'Le nombre doit être positif.';
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

    voile.addEventListener('click', async e => {
      if (e.target === voile) return fermer();
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
      if (a === 'annuler') fermer();
      if (a === 'supprimer') { $('.fc-confirmer').hidden = false; $('.fc-actions').hidden = true; $('[data-fc="garder"]').focus(); }
      if (a === 'garder') { $('.fc-confirmer').hidden = true; $('.fc-actions').hidden = false; }
      if (a === 'confirmer') {
        act.disabled = true;
        const { error } = await window.mrtSupabase.from('courses').delete().eq('id', c.id);
        if (error) { $('.fc-msg').textContent = 'Suppression impossible pour l\'instant.'; act.disabled = false; return; }
        fermer();
        if (apres) apres({ supprimee: c.id });
      }
    });

    $('form').addEventListener('submit', async e => {
      e.preventDefault();
      const champs = lire();
      if (!champs) { $('.fc-msg').textContent = 'Corrige les champs signalés.'; return; }
      if (marquer) champs.etat = 'courue';
      const btn = $('.fc-plein');
      btn.disabled = true;
      $('.fc-msg').textContent = 'Enregistrement…';
      const db = window.mrtSupabase.from('courses');
      const { error } = existe
        ? await db.update(champs).eq('id', c.id)
        : await db.insert(Object.assign(venir ? { etat: 'a_venir' } : { statut: 'confirmee', etat: 'courue' }, champs));
      if (error) { $('.fc-msg').textContent = 'Enregistrement impossible pour l\'instant.'; btn.disabled = false; console.warn(error); return; }
      fermer();
      if (apres) apres();
    });
  };

  // Pour les contrôles : lecture des durées, de l'heure et de l'objectif.
  window.mrtFicheCourse.parseDuree = parseDuree;
  window.mrtFicheCourse.parseHeure = parseHeure;
  window.mrtFicheCourse.parseObjectif = parseObjectif;
})();
