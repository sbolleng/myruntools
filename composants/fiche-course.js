// ===== Fiche d'une course : formulaire d'ajout, de modification, de suppression =====
//
// Décrite par docs/module-palmares-specification.md (§ 10) ; style :
// docs/design.md (§ 6). mrtFicheCourse({ course, references, apres }) ouvre le
// panneau : course = ligne de la base à modifier, ou rien pour en ajouter une ;
// references = { types, sous } ; apres() est appelé après chaque
// enregistrement ou suppression. Les écritures passent par la base
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
  const fmtDuree = s => (s == null ? '' : s >= 3600 ? Math.floor(s / 3600) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60) : Math.floor(s / 60) + ':' + pad(s % 60));
  const parseNombre = str => { const s = String(str || '').trim().replace(',', '.'); return s === '' ? null : (isNaN(s) ? NaN : Number(s)); };
  const trailSelonDistance = km => (km < 21 ? 'trail_decouverte' : km < 42 ? 'trail_court' : km < 80 ? 'trail_long' : 'trail_ultra');

  // Champs : clé de la base, libellé, genre (date, texte, choix, nombre, entier, duree, case), bloc.
  const CHAMPS = [
    ['date', 'Date', 'date', 'course', true],
    ['evenement', 'Course', 'texte', 'course', true],
    ['nom', 'Parcours', 'texte', 'course'],
    ['type', 'Catégorie', 'choix', 'course', true],
    ['sous_categorie', 'Sous-catégorie', 'choix', 'course', true],
    ['distance', 'Distance (km)', 'nombre', 'course'],
    ['dplus', 'D+ (m)', 'entier', 'course'],
    ['role', 'Rôle', 'choix', 'course'],
    ['temps', 'Temps', 'duree', 'resultat'],
    ['dnf', 'Non terminée (DNF)', 'case', 'resultat'],
    ['allure', 'Allure (par km)', 'duree', 'resultat'],
    ['vitesse', 'Vitesse (km/h)', 'nombre', 'resultat'],
    ['place', 'Place au général', 'entier', 'classements'],
    ['effectif', 'Effectif du général', 'entier', 'classements'],
    ['place_categorie', 'Place en catégorie', 'entier', 'classements'],
    ['effectif_categorie', 'Effectif de la catégorie', 'entier', 'classements'],
    ['place_sexe', 'Place par sexe', 'entier', 'classements'],
    ['effectif_sexe', 'Effectif par sexe', 'entier', 'classements'],
    ['montre_distance', 'Distance (km)', 'nombre', 'montre'],
    ['montre_dplus', 'D+ (m)', 'entier', 'montre'],
    ['montre_temps', 'Temps', 'duree', 'montre'],
    ['montre_allure', 'Allure (par km)', 'duree', 'montre'],
    ['montre_vitesse', 'Vitesse (km/h)', 'nombre', 'montre'],
    ['fc_moyenne', 'FC moyenne (bpm)', 'entier', 'montre']
  ];
  const BLOCS = [['course', 'Course'], ['resultat', 'Résultat'], ['classements', 'Classements'], ['montre', 'Montre']];
  // Exemples affichés dans les champs vides.
  const AIDE = {
    evenement: 'ex. Forez Trails', nom: 'ex. L\'Olmetoise (facultatif)', distance: 'ex. 24,4', dplus: 'ex. 933',
    temps: 'ex. 49:18 ou 4918', allure: 'ex. 5:24 ou 524', vitesse: 'ex. 11,1',
    place: 'ex. 99', effectif: 'ex. 873', place_categorie: 'ex. 12', effectif_categorie: 'ex. 140', place_sexe: 'ex. 15', effectif_sexe: 'ex. 310',
    montre_distance: 'ex. 24,1', montre_dplus: 'ex. 932', montre_temps: 'ex. 3:00:23 ou 30023', montre_allure: 'ex. 7:18 ou 718', montre_vitesse: 'ex. 8,1', fc_moyenne: 'ex. 163'
  };

  window.mrtFicheCourse = function ({ course, references, apres }) {
    const existe = !!(course && course.id);
    const c = course || {};
    const sousDe = type => references.sous.filter(s => s.type === type);
    const typeDe = sc => { const s = references.sous.find(x => x.id === sc); return s ? s.type : ''; };

    const voile = document.createElement('div');
    voile.className = 'fc-voile';
    const champ = ([k, lib, genre, , oblig]) => {
      const id = 'fc-' + k;
      // « Course » porte l'événement, ou le seul nom ; « Parcours » le nom quand il diffère.
      const val = k === 'type' ? typeDe(c.sous_categorie)
        : k === 'evenement' ? (c.evenement || c.nom)
        : k === 'nom' ? (c.evenement ? c.nom : null)
        : c[k];
      let input;
      if (genre === 'case') {
        return '<label class="fc-case"><input type="checkbox" id="' + id + '" data-k="' + k + '"' + (val ? ' checked' : '') + '> ' + esc(lib) + '</label>';
      }
      if (genre === 'choix') {
        const opts = k === 'type' ? references.types.map(t => [t.id, t.libelle])
          : k === 'role' ? ROLES
          : sousDe(typeDe(c.sous_categorie)).map(s => [s.id, s.libelle]);
        const vide = k === 'role' ? '' : '<option value="">—</option>';
        const courant = k === 'role' ? (val || 'preparatoire') : (val || '');
        input = '<select id="' + id + '" data-k="' + k + '">' + vide + opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === courant ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
      } else {
        const v = genre === 'duree' ? fmtDuree(val) : val == null ? '' : String(val);
        const type = genre === 'date' ? 'date' : 'text';
        const mode = genre === 'nombre' ? ' inputmode="decimal"' : genre === 'entier' || genre === 'duree' ? ' inputmode="numeric"' : '';
        const max = genre === 'date' ? ' max="' + today() + '"' : '';
        input = '<input type="' + type + '" id="' + id + '" data-k="' + k + '" value="' + esc(v) + '"' + mode + max + (AIDE[k] ? ' placeholder="' + AIDE[k] + '"' : '') + ' autocomplete="off">';
      }
      return '<div class="fc-champ' + (k === 'date' ? ' fc-seul' : '') + '"><label for="' + id + '">' + esc(lib) + (oblig ? ' <span class="fc-oblig" aria-hidden="true">*</span>' : '') + '</label>' + input + '<p class="fc-erreur" id="' + id + '-err" aria-live="polite"></p></div>';
    };
    const ouvert = b => existe || b === 'course' || b === 'resultat';
    voile.innerHTML =
      '<div class="fc-panneau" role="dialog" aria-modal="true" aria-labelledby="fc-titre">' +
        '<div class="fc-haut"><h2 id="fc-titre">' + (existe ? 'Modifier la course' : 'Ajouter une course') + '</h2>' +
          '<button type="button" class="fc-fermer" data-fc="annuler" aria-label="Fermer">×</button></div>' +
        '<form novalidate>' +
          BLOCS.map(([b, titre]) =>
            '<section class="fc-bloc">' +
              '<button type="button" class="fc-bloc-titre" data-bloc="' + b + '" aria-expanded="' + ouvert(b) + '">' + CHEVRON + titre + '</button>' +
              '<div class="fc-grille"' + (ouvert(b) ? '' : ' hidden') + '>' + CHAMPS.filter(f => f[3] === b).map(champ).join('') + '</div>' +
            '</section>').join('') +
          '<p class="fc-msg" aria-live="polite"></p>' +
          '<div class="fc-actions">' +
            (existe ? '<button type="button" class="fc-supprimer" data-fc="supprimer">Supprimer</button>' : '') +
            '<button type="button" class="fc-btn" data-fc="annuler">Annuler</button>' +
            '<button type="submit" class="fc-btn fc-plein">Enregistrer</button>' +
          '</div>' +
          '<div class="fc-confirmer" hidden>' +
            '<p>Supprimer cette course ? Cette action est définitive.</p>' +
            '<div class="fc-actions"><button type="button" class="fc-btn" data-fc="garder">Annuler</button>' +
            '<button type="button" class="fc-btn fc-danger" data-fc="confirmer">Supprimer</button></div>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(voile);
    document.documentElement.classList.add('fc-ouvert');
    const $ = s => voile.querySelector(s);
    const val = k => voile.querySelector('[data-k="' + k + '"]');
    const avant = document.activeElement;
    val('date').focus();

    function fermer() {
      voile.remove();
      document.documentElement.classList.remove('fc-ouvert');
      document.removeEventListener('keydown', clavier);
      if (avant && avant.focus) avant.focus();
    }
    function clavier(e) { if (e.key === 'Escape') fermer(); }
    document.addEventListener('keydown', clavier);

    // Type → sous-catégories du type ; trail : celle de la distance, modifiable.
    function remplirSous(choix) {
      const t = val('type').value;
      val('sous_categorie').innerHTML = '<option value="">—</option>' + sousDe(t).map(s => '<option value="' + esc(s.id) + '">' + esc(s.libelle) + '</option>').join('');
      if (choix) val('sous_categorie').value = choix;
    }
    function proposerTrail() {
      const km = parseNombre(val('distance').value);
      if (val('type').value === 'trail' && km > 0) val('sous_categorie').value = trailSelonDistance(km);
    }
    val('type').addEventListener('change', () => { remplirSous(''); proposerTrail(); });
    val('distance').addEventListener('change', proposerTrail);

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
      for (const [k, lib, genre, , oblig] of CHAMPS) {
        if (k === 'type') { ok = erreur(k, val(k).value ? '' : 'Choisis une catégorie.') && ok; continue; }
        const el = val(k);
        let v, msg = '';
        if (genre === 'case') v = el.checked;
        else if (genre === 'choix') v = el.value || null;
        else if (genre === 'texte') v = el.value.trim() || null;
        else if (genre === 'date') {
          v = el.value || null;
          if (v && v > today()) msg = 'La date d\'une course courue ne peut pas être dans le futur.';
        } else if (genre === 'duree') {
          v = parseDuree(el.value);
          if (Number.isNaN(v)) msg = 'Durée illisible (' + AIDE[k] + ').';
          else if (v === 0) msg = 'La durée doit être positive.';
        } else {
          v = parseNombre(el.value);
          if (Number.isNaN(v)) msg = 'Nombre illisible.';
          else if (v != null && (v < 0 || (v === 0 && k !== 'dplus' && k !== 'montre_dplus'))) msg = 'Le nombre doit être positif.';
          else if (v != null && genre === 'entier' && !Number.isInteger(v)) msg = 'Nombre entier attendu.';
        }
        if (!msg && oblig && (v == null || v === '')) msg = 'Champ obligatoire.';
        ok = erreur(k, msg) && ok;
        out[k] = v;
      }
      if (!ok) return null;
      // Une course sans parcours distinct : son nom seul, sans événement.
      if (!out.nom) { out.nom = out.evenement; out.evenement = null; }
      return out;
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
        if (apres) apres();
      }
    });

    $('form').addEventListener('submit', async e => {
      e.preventDefault();
      const champs = lire();
      if (!champs) { $('.fc-msg').textContent = 'Corrige les champs signalés.'; return; }
      const btn = $('.fc-plein');
      btn.disabled = true;
      $('.fc-msg').textContent = 'Enregistrement…';
      const db = window.mrtSupabase.from('courses');
      const { error } = existe
        ? await db.update(champs).eq('id', c.id)
        : await db.insert(Object.assign({ statut: 'confirmee', etat: 'courue' }, champs));
      if (error) { $('.fc-msg').textContent = 'Enregistrement impossible pour l\'instant.'; btn.disabled = false; console.warn(error); return; }
      fermer();
      if (apres) apres();
    });
  };

  // Pour les contrôles : lecture des durées.
  window.mrtFicheCourse.parseDuree = parseDuree;
})();
