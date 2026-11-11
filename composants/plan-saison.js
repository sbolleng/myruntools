// ===== Préparation : le plan de saison =====
//
// docs/module-preparation-specification.md, § 2 à 5. renderSaison(élément, ctx) dessine la page Préparation : la saison visée,
// l'état de la semaine, la frise de toutes les semaines à venir avec les courses, les alertes et le bloc de 4 semaines en cours.
// Le calcul (saisons, repères, alertes, phases) est dans preparation.js (planSaison, phaseDe, reperesDuJour), partagé avec
// le Calendrier ; les séances (case « faite », « + », fenêtre) aussi.
//   ctx.courses, ctx.seances, ctx.semaines, ctx.lectureSeule, ctx.relire() : voir preparation.js.
(function () {
  const P = window.mrtPreparation;
  const { MOIS, NOM_PHASE, iso, parse, addDays, lundiDe, longue, esc, roleDe } = P;
  const ROLE = { objectif: 'Objectif', preparatoire: 'Préparatoire', plaisir: 'Plaisir' };
  const BLOC = 4; // semaines du bloc en cours
  const lien = c => 'course.html?id=' + encodeURIComponent(c.id);
  const nom = c => '<a class="ps-course" href="' + lien(c) + '">' + esc(c.course) + '</a>';
  const semainesEntre = (a, b) => Math.ceil((parse(b) - parse(a)) / (7 * 86400000));

  // Texte d'une alerte (spécification, § 3.4) : une ligne, le nom des courses en gras (CSS), le fait et, entre parenthèses, ce qui est conseillé.
  function texteAlerte(a) {
    if (a.type === 'proches') return nom(a.autre) + ' et ' + nom(a.course) + ' : ' + a.semaines + ' semaines d\'écart (12 conseillées)';
    if (a.type === 'recup-affutage') return nom(a.course) + ' : récupération jusqu\'au ' + longue(a.fin) + ', sur l\'affûtage de ' + nom(a.autre);
    if (a.type === 'prepa-proche') return nom(a.course) + ' : à ' + a.jours + ' jours de ' + nom(a.autre) + ' (' + a.conseillees + ' semaines conseillées)';
    return nom(a.course) + ' est plus longue que ' + nom(a.autre);
  }

  // ----- Profil d'entraînement (spécification, § 5.2) : une liste de lignes ; chaque ligne ouvre une question ;
  // un choix s'enregistre aussitôt et ramène à la liste. -----
  const JOURS7 = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const JOURS_COURTS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
  const ECHELLES = {
    anciennete: [['debut', 'Je débute'], ['1-3', '1 à 3 ans'], ['3-6', '3 à 6 ans'], ['6-10', '6 à 10 ans'], ['10+', 'Plus de 10 ans']],
    volume_tranche: [['inconnu', 'Aucune idée'], ['0-20', '0 à 20 km'], ['20-40', '20 à 40 km'], ['40-60', '40 à 60 km'], ['60-80', '60 à 80 km'], ['80+', 'Plus de 80 km']],
    sortie_tranche: [['-1h', 'Moins de 1 h'], ['1h-1h30', '1 h à 1 h 30'], ['1h30-2h', '1 h 30 à 2 h'], ['2-3h', '2 à 3 h'], ['3h+', 'Plus de 3 h']],
    seance_max_min: [[45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [1440, 'Sans limite']],
    terrain: [['plat', 'Pas de dénivelé'], ['cotes', 'Petites côtes (moins de 50 m de D+)'], ['vallonne', 'Vallonné (50 à 500 m de D+)'], ['montagne', 'Montagne (plus de 500 m de D+)']],
    renfo_niveau: [['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['confirme', 'Confirmé'], ['expert', 'Expert']],
    allure_type: [['vma', 'VMA'], ['10km', 'Temps sur 10 km'], ['semi', 'Temps sur semi-marathon'], ['inconnu', 'Je ne sais pas']]
  };
  const libelleDe = (cle, v) => ((ECHELLES[cle] || []).find(x => String(x[0]) === String(v)) || [])[1] || null;
  // Ma semaine : jours possibles pour courir et pour le renforcement (un même jour peut avoir les deux), nombre de sorties et de
  // renforcements, jour à privilégier pour la sortie longue (vide : peu importe). Jours : 1 (lundi) à 7 (dimanche).
  const joursDe = (pr, k) => (Array.isArray(pr && pr[k]) ? pr[k].map(Number) : []);
  // Temps : « 45:30 » ou « 1:42:00 » → secondes ; vide → null ; illisible → NaN. Et l'inverse.
  function secondes(v) {
    const t = String(v || '').trim();
    if (!t) return null;
    const m = t.match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
    return m ? (Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])) : NaN;
  }
  const pad2 = n => String(n).padStart(2, '0');
  const enTemps = s => (s == null ? '' : (s >= 3600 ? Math.floor(s / 3600) + ':' + pad2(Math.floor(s % 3600 / 60)) : Math.floor(s / 60)) + ':' + pad2(s % 60));
  const virgule = v => (v == null ? '' : String(v).replace('.', ','));
  // Repère d'allure : complet s'il est « je ne sais pas », ou si la valeur de son type est là.
  const allureFaite = pr => !!pr && (pr.allure_type === 'inconnu' || (pr.allure_type === 'vma' && pr.vma != null) || (pr.allure_type === '10km' && pr.temps_10km_s != null) || (pr.allure_type === 'semi' && pr.temps_semi_s != null));
  const resumeAllure = pr => (!allureFaite(pr) ? null : pr.allure_type === 'inconnu' ? 'Je ne sais pas' : pr.allure_type === 'vma' ? 'VMA ' + virgule(pr.vma) + ' km/h' :
    pr.allure_type === '10km' ? '10 km en ' + enTemps(pr.temps_10km_s) : 'Semi en ' + enTemps(pr.temps_semi_s));
  // Résumé de la semaine : complète quand il y a au moins un jour de course et un nombre de sorties.
  const resumeSemaine = pr => {
    if (!joursDe(pr, 'jours_course').length || !pr.nb_sorties) return null;
    const r = pr.nb_renfo || 0;
    return pr.nb_sorties + (pr.nb_sorties > 1 ? ' sorties' : ' sortie') + (r ? ', ' + r + (r > 1 ? ' renforcements' : ' renforcement') : '');
  };
  // Lignes de la liste : [clé, question, résumé, obligatoire].
  const lignes = pr => [
    ['anciennete', 'Je cours depuis', libelleDe('anciennete', pr.anciennete), true],
    ['volume_tranche', 'Distance par semaine', libelleDe('volume_tranche', pr.volume_tranche), true],
    ['sortie_tranche', 'Plus longue sortie récente', libelleDe('sortie_tranche', pr.sortie_tranche), true],
    ['semaine', 'Ma semaine', resumeSemaine(pr), true],
    ['allure', 'Repère d\'allure', resumeAllure(pr), true],
    ['seance_max_min', 'Durée maximale d\'une séance', libelleDe('seance_max_min', pr.seance_max_min), false],
    ['terrain', 'Terrains d\'entraînement', (libelleDe('terrain', pr.terrain) || '').replace(/ \(.*\)$/, '') || null, false],
    ['renfo_niveau', 'Niveau en renforcement', libelleDe('renfo_niveau', pr.renfo_niveau), false],
    ['sante', 'FC max et points fragiles', [pr.fc_max ? 'FC max ' + pr.fc_max : '', pr.fragiles ? 'points fragiles' : ''].filter(Boolean).join(', ') || null, false]
  ];
  // Questions obligatoires qui manquent (le reste du site s'en sert pour proposer, ou non, des séances).
  const manquants = pr => lignes(pr || {}).filter(l => l[3] && !l[2]).map(l => l[1].toLowerCase());
  function ouvrirProfil(ctx) {
    // La feuille d'une course (modale-course.css) : à la largeur des pages, plein écran sur téléphone ; la croix en haut à droite.
    const voile = document.createElement('div');
    voile.className = 'mc-voile';
    voile.innerHTML = '<div class="mc-panneau mc-ecrans ps-profil" role="dialog" aria-modal="true" aria-labelledby="ps-titre" tabindex="-1"><div class="mc-corps"></div></div>';
    const corps = voile.querySelector('.mc-corps');
    document.body.appendChild(voile);
    document.documentElement.classList.add('mc-ouvert');
    const fermer = () => { voile.remove(); document.documentElement.classList.remove('mc-ouvert'); document.removeEventListener('keydown', clavier); };
    const clavier = e => { if (e.key === 'Escape' && !document.querySelector('.mrt-dialogue, .cal-voile')) fermer(); };
    document.addEventListener('keydown', clavier);
    voile.addEventListener('mousedown', e => { if (e.target === voile) fermer(); });
    const pr = () => ctx.profil || {};
    const msg = () => corps.querySelector('.ps-msg');
    // Enregistre les champs donnés (le profil entier, fusionné) ; rend vrai si c'est fait.
    async function ranger(champs) {
      const ligne = Object.assign({}, pr(), champs, { maj: new Date().toISOString() });
      delete ligne.utilisateur;
      const { error } = await window.mrtSupabase.from('profil_entrainement').upsert(ligne);
      if (error) { console.warn(error); msg().textContent = 'Enregistrement impossible pour l\'instant.'; return false; }
      ctx.profil = Object.assign({}, pr(), champs);
      ctx.redessiner();
      return true;
    }
    // Barre du haut : « ‹ » (retour à la liste) à gauche dans une question, la croix à droite ; dessous, le titre en libellé.
    const barre = (titre, retour) => '<div class="pc-barre ps-profil-barre">' +
      (retour ? '<button type="button" class="mrt-rond" data-q="liste" aria-label="Retour à la liste" title="Retour">' + window.mrtIcone.gauche + '</button>' : '<span></span>') +
      '<button type="button" class="mrt-rond is-fermer" data-fermer aria-label="Fermer" title="Fermer">' + window.mrtIcone.fermer + '</button></div>' +
      '<p class="fc-libelle" id="ps-titre">' + titre + '</p><p class="ps-msg" role="alert"></p>';

    // Glissement du contenu (ordinateur seulement, voir modale-course.css) : vers une question par la droite, retour à la liste par la gauche.
    let ecran = 'liste';
    const glisse = sens => {
      corps.classList.remove('mc-glisse-avant', 'mc-glisse-retour');
      void corps.offsetWidth;
      corps.classList.add('mc-glisse-' + sens);
    };
    const versQuestion = () => { if (ecran === 'liste') glisse('avant'); ecran = 'question'; };
    function liste() {
      if (ecran === 'question') glisse('retour');
      ecran = 'liste';
      const ls = lignes(pr()), obligatoires = ls.filter(l => l[3]), faites = obligatoires.filter(l => l[2]).length;
      const ligneHtml = l => '<button type="button" class="ps-ligne-q" data-q="' + l[0] + '"><span>' + l[1] + '</span><span class="ps-rep' + (!l[2] && l[3] ? ' is-a-faire' : '') + '">' + (l[2] ? esc(l[2]) : l[3] ? 'À renseigner' : '—') + '</span><i aria-hidden="true">›</i></button>';
      corps.innerHTML = barre('Mon profil d\'entraînement', false) +
        '<section class="mrt-section"><h2 class="mrt-section-titre ps-section-t">Indispensable pour proposer tes séances <span class="ps-compte' + (faites === obligatoires.length ? ' is-complet' : '') + '">' + faites + ' sur ' + obligatoires.length + '</span></h2>' +
        '<div class="ps-groupe-l">' + obligatoires.map(ligneHtml).join('') + '</div></section>' +
        '<section class="mrt-section"><h2 class="mrt-section-titre ps-section-t">Pour affiner (facultatif)</h2><div class="ps-groupe-l">' + ls.filter(l => !l[3]).map(ligneHtml).join('') + '</div></section>';
    }
    // Une question à choix : un toucher enregistre et revient à la liste.
    function choix(cle, titre) {
      versQuestion();
      corps.innerHTML = barre(titre, true) + '<div class="ps-groupe-l">' + ECHELLES[cle].map(([k, lib]) =>
        '<button type="button" class="ps-choix' + (String(pr()[cle]) === String(k) ? ' is-on' : '') + '" data-val="' + esc(k) + '">' + lib + '<i aria-hidden="true">✓</i></button>').join('') + '</div>';
      corps.querySelectorAll('[data-val]').forEach(b => b.addEventListener('click', async () => {
        const val = cle === 'seance_max_min' ? Number(b.dataset.val) : b.dataset.val;
        if (await ranger({ [cle]: val })) liste();
      }));
    }
    // Ma semaine : jours pour courir et pour le renforcement (cumulables), jour de la sortie longue, en pastilles ; nombres de
    // sorties et de renforcements, un chiffre de 0 à 7 ; chaque changement s'enregistre.
    function semaine() {
      versQuestion();
      const p0 = pr(), jc = joursDe(p0, 'jours_course'), jr = joursDe(p0, 'jours_renfo');
      const pastille = (attr, val, on, lib) => '<button type="button" class="mrt-pastille" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + lib + '</button>';
      const q = (lib, html) => '<div class="ps-sem-q"><p class="cal-champ"><span>' + lib + '</span></p><div class="ps-coches">' + html + '</div></div>';
      const chiffre = (nom, lib, v) => '<label class="ps-sem-q ps-chiffre"><span>' + lib + '</span><input class="mrt-champ" name="' + nom + '" inputmode="numeric" maxlength="1" placeholder="0 à 7" value="' + (v == null ? '' : v) + '"></label>';
      const section = (titre, html) => '<section class="mrt-section"><h2 class="mrt-section-titre">' + titre + '</h2><div class="ps-groupe-l">' + html + '</div></section>';
      corps.innerHTML = barre('Ma semaine', true) +
        section('Course',
          q('Jours possibles', JOURS_COURTS.map((j, i) => pastille('data-jc', i + 1, jc.includes(i + 1), j)).join('')) +
          chiffre('nb_sorties', 'Sorties par semaine', p0.nb_sorties) +
          q('Sortie longue', (jc.length ? jc.map(n => pastille('data-long', n, p0.jour_long === n, JOURS_COURTS[n - 1])).join('') : '') + pastille('data-long', 0, !p0.jour_long, 'Peu importe'))) +
        section('Renforcement',
          q('Jours possibles', JOURS_COURTS.map((j, i) => pastille('data-jr', i + 1, jr.includes(i + 1), j)).join('')) +
          chiffre('nb_renfo', 'Séances par semaine', p0.nb_renfo));
      const bascule = (l, n) => (l.includes(n) ? l.filter(x => x !== n) : l.concat([n]).sort((a, b) => a - b));
      corps.querySelectorAll('button[data-jc], button[data-jr], button[data-long]').forEach(b => b.addEventListener('click', async () => {
        const d = b.dataset, champs = {};
        if (d.jc) { champs.jours_course = bascule(jc, Number(d.jc)); if (p0.jour_long && !champs.jours_course.includes(p0.jour_long)) champs.jour_long = null; }
        if (d.jr) champs.jours_renfo = bascule(jr, Number(d.jr));
        if (d.long) champs.jour_long = Number(d.long) || null;
        if (await ranger(champs)) semaine();
      }));
      corps.querySelectorAll('.ps-chiffre input').forEach(x => x.addEventListener('change', async () => {
        const t = x.value.trim();
        if (t !== '' && !/^[0-7]$/.test(t)) { msg().textContent = 'Un chiffre de 0 à 7.'; x.focus(); return; }
        msg().textContent = '';
        await ranger({ [x.name]: t === '' ? null : Number(t) });
      }));
    }
    // Repère d'allure : son type, puis sa valeur (« Je ne sais pas » : enregistré aussitôt).
    function allure(type) {
      versQuestion();
      const t = type || pr().allure_type;
      const saisie = t === 'vma' ? ['VMA (km/h)', virgule(pr().vma), 'ex. 15,5', 'decimal'] : t === '10km' ? ['Temps sur 10 km', enTemps(pr().temps_10km_s), 'ex. 45:30', 'text'] :
        t === 'semi' ? ['Temps sur semi-marathon', enTemps(pr().temps_semi_s), 'ex. 1:42:00', 'text'] : null;
      corps.innerHTML = barre('Repère d\'allure', true) + '<div class="ps-groupe-l">' + ECHELLES.allure_type.map(([k, lib]) =>
        '<button type="button" class="ps-choix' + (t === k ? ' is-on' : '') + '" data-type="' + k + '">' + lib + '<i aria-hidden="true">✓</i></button>').join('') + '</div>' +
        (saisie ? '<form class="ps-valeur" novalidate><label class="cal-champ"><span>' + saisie[0] + '</span><input class="mrt-champ" name="valeur" inputmode="' + saisie[3] + '" placeholder="' + saisie[2] + '" value="' + esc(saisie[1]) + '"></label>' +
          '<button type="submit" class="mrt-btn is-principal">Valider</button></form>' : '');
      corps.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', async () => {
        if (b.dataset.type === 'inconnu') { if (await ranger({ allure_type: 'inconnu' })) liste(); } else allure(b.dataset.type);
      }));
      const f = corps.querySelector('.ps-valeur');
      if (f) {
        f.valeur.focus();
        f.addEventListener('submit', async e => {
          e.preventDefault();
          if (t === 'vma') {
            const x = P.nombre(f.valeur.value);
            if (x === null || Number.isNaN(x) || x < 8 || x > 30) return void (msg().textContent = 'La VMA doit être comprise entre 8 et 30 km/h.');
            if (await ranger({ allure_type: 'vma', vma: x })) liste();
          } else {
            const x = secondes(f.valeur.value), [a, b2] = t === '10km' ? [1200, 7200] : [3000, 14400];
            if (x === null || Number.isNaN(x) || x < a || x > b2) return void (msg().textContent = t === '10km' ? 'Le temps sur 10 km s\'écrit 45:30 (entre 20:00 et 2:00:00).' : 'Le temps sur semi s\'écrit 1:42:00 (entre 50:00 et 4:00:00).');
            if (await ranger(t === '10km' ? { allure_type: '10km', temps_10km_s: x } : { allure_type: 'semi', temps_semi_s: x })) liste();
          }
        });
      }
    }
    // FC max et points fragiles : deux champs facultatifs, « Valider ».
    function sante() {
      versQuestion();
      corps.innerHTML = barre('FC max et points fragiles', true) + '<form class="ps-valeur" novalidate>' +
        '<label class="cal-champ"><span>FC max</span><input class="mrt-champ" name="fc" inputmode="numeric" placeholder="ex. 185" value="' + esc(pr().fc_max == null ? '' : pr().fc_max) + '"></label>' +
        '<label class="cal-champ"><span>Points fragiles</span><textarea class="mrt-champ" name="fragiles" maxlength="300" rows="3" placeholder="ex. tendon d\'Achille gauche">' + esc(pr().fragiles || '') + '</textarea></label>' +
        '<button type="submit" class="mrt-btn is-principal">Valider</button></form>';
      const f = corps.querySelector('form');
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const fc = P.nombre(f.fc.value);
        if (fc !== null && (Number.isNaN(fc) || !Number.isInteger(fc) || fc < 100 || fc > 230)) return void (msg().textContent = 'La FC max doit être comprise entre 100 et 230.');
        if (await ranger({ fc_max: fc, fragiles: f.fragiles.value.trim() || null })) liste();
      });
    }
    corps.addEventListener('click', e => {
      if (e.target.closest('[data-fermer]')) return fermer();
      const q = e.target.closest('[data-q]');
      if (!q) return;
      const k = q.dataset.q, titre = (lignes(pr()).find(l => l[0] === k) || [])[1];
      if (k === 'liste') liste(); else if (k === 'semaine') semaine(); else if (k === 'allure') allure(); else if (k === 'sante') sante(); else choix(k, titre);
    });
    liste();
    voile.querySelector('.mc-panneau').focus({ preventScroll: true });
  }

  // ----- Séances proposées par l'IA (spécification, § 6 ; calcul et appel : seances-ia.js) -----
  const IA = () => window.mrtSeancesIA;
  const ligneSeance = s => '<li>' + P.jourCourt(s.date) + ' · <b>' + (P.TYPES[s.type] || s.type) + '</b> ' + esc(s.libelle) + ' · ' + s.duree_min + ' min' +
    (Number(s.distance_km) > 0 ? ' · ' + virgule(s.distance_km) + ' km' : '') + ' · ' + (P.INTENSITES[s.intensite] || s.intensite) + '</li>';
  // (6) Proposer ; (9) proposition en attente : la recommandation (8), seule, et ses boutons ; ses séances sont dans la grille.
  function iaHtml(ctx, lundi, alertes) {
    // Les alertes (seulement s'il y en a) sont dans le bloc de la recommandation ; sans proposition, le bloc ne les porte que seules.
    const listeAl = alertes && alertes.length ? '<ul class="ps-alertes">' + alertes.map(a => '<li class="ps-alerte" data-alerte="' + a.type + '">' + texteAlerte(a) + '</li>').join('') + '</ul>' : '';
    const blocAl = listeAl ? '<section class="ps-proposition ps-seul"><h3 class="ps-libelle">Recommandation de MyRunTools</h3>' + listeAl + '</section>' : '';
    if (ctx.lectureSeule || !IA() || ctx.profil === undefined) return blocAl;
    const etat = ctx.ia || {}, manque = manquants(ctx.profil);
    if (manque.length) return blocAl + '<p class="ps-ia-aide">Pour que l\'IA propose les séances du bloc : <button type="button" class="mrt-lien" data-profil>Compléter mon profil</button></p>';
    const prop = IA().enAttente(ctx, lundi), reste = IA().restantes(ctx);
    const msg = etat.message ? '<p class="ps-ia-msg" role="alert">' + etat.message + '</p>' : '';
    if (!prop) return blocAl + '<div class="ps-ia"><button type="button" class="mrt-btn is-principal" data-ia="proposer"' + (etat.encours || !reste ? ' disabled' : '') + '>' +
      (etat.encours ? 'Proposition en cours…' : 'Proposer les séances') + '</button><span class="ps-ia-reste">' + reste + (reste > 1 ? ' restantes' : ' restante') + ' ce mois-ci</span></div>' + msg;
    const seances = IA().seancesDe(prop.reponse), lundis = [0, 1, 2, 3].map(i => addDays(lundi, 7 * i)), choisies = etat.semaines || lundis;
    const choixSem = etat.choix ? '<div class="ps-coches ps-prop-sems">' + lundis.map(l => '<button type="button" class="mrt-pastille" data-coche="' + l + '" aria-pressed="' + choisies.includes(l) + '">Semaine ' + window.mrtFormat.semaine(l) + '</button>').join('') + '</div>' : '';
    const actions = etat.choix
      ? '<button type="button" class="mrt-btn is-principal" data-ia="selection">Accepter la sélection</button><button type="button" class="mrt-btn" data-ia="sans-choix">Annuler le choix</button>'
      : '<button type="button" class="mrt-btn is-principal" data-ia="tout">Tout accepter</button><button type="button" class="mrt-btn" data-ia="choisir">Choisir semaine par semaine</button>' +
        '<button type="button" class="mrt-btn" data-ia="refaire"' + (etat.encours || !reste ? ' disabled' : '') + '>' + (etat.encours ? 'Proposition en cours…' : 'Refaire') + '</button><button type="button" class="mrt-btn" data-ia="abandonner">Abandonner</button>';
    // Téléphone : la grille ne montre que des repères ; la liste des séances proposées s'ajoute sous la recommandation.
    return '<section class="ps-proposition"><h3 class="ps-libelle">Recommandation de MyRunTools</h3>' + listeAl + '<p class="ps-reco">' + esc(IA().recommandationDe(prop.reponse)) + '</p>' +
      '<ul class="ps-prop-liste">' + seances.map(ligneSeance).join('') + '</ul>' + choixSem + '<div class="ps-prop-actions">' + actions + '</div>' + msg + '</section>';
  }
  // Dans une case de la grille : les repères du jour (allégé, repos, récupération) et les séances proposées, en attente.
  function caseHtml(ctx, ps, j) {
    const reps = P.reperesDuJour(ps, j).map(r => (r.type === 'allege' ? 'Allégé' : r.type === 'repos' ? 'Repos' : 'Récupération'));
    const prop = IA() && !ctx.lectureSeule ? IA().enAttente(ctx, lundiDe(iso(new Date()))) : null;
    const props = prop ? IA().seancesDe(prop.reponse).filter(s => s.date === j) : [];
    return [...new Set(reps)].map(t => '<span class="cal-v-rep">' + t + '</span>').join('') +
      props.map(s => '<span class="cal-v-prop" title="' + esc((P.TYPES[s.type] || s.type) + ' · ' + s.libelle + ' · ' + s.duree_min + ' min' + (Number(s.distance_km) > 0 ? ' · ' + virgule(s.distance_km) + ' km' : '') + ' · ' + (P.INTENSITES[s.intensite] || s.intensite)) + '">' +
        esc(s.libelle) + ' · ' + s.duree_min + ' min</span>').join('');
  }

  window.renderSaison = function (root, ctx) {
    // Téléphone : la frise est une liste verticale ; elle se redessine quand l'écran change de classe.
    const mq = window.matchMedia('(max-width: 600px)');
    mq.addEventListener('change', () => { if (ctx.friseMaj) ctx.friseMaj(ctx.friseMode || 'saison'); });
    ctx.actualiser = async () => { Object.assign(ctx, await ctx.relire()); dessiner(); };

    function dessiner() {
      const auj = iso(new Date()), lundi = lundiDe(auj), ps = P.planSaison(ctx);
      const prochaine = ps.saisons.find(x => x.jourJ >= auj);
      // (2) Mon profil et (12) son état : ce qui manque pour proposer des séances.
      const manque = manquants(ctx.profil);
      const profil = ctx.lectureSeule ? '' : '<div class="ps-profil-haut"><span class="ps-profil-etat' + (manque.length ? '' : ' is-complet') + '">' +
        (ctx.profil === undefined ? '' : manque.length ? 'Profil à compléter : ' + manque.join(', ') + '.' : 'Profil complet.') + '</span><button type="button" class="mrt-btn" data-profil>Mon profil</button></div>';
      if (!prochaine) {
        root.innerHTML = '<div class="ps-cadre">' + profil + '<p class="ps-vide">Aucun Objectif à venir : donne le rôle Objectif à une course confirmée (page Plan & objectifs) pour construire ta saison.</p></div>';
        return;
      }
      // (1) Saison visée.
      const dans = semainesEntre(auj, prochaine.jourJ);
      // Le nom de la course visée en titre ; dessous, petit : la date (l'année seulement si ce n'est pas la présente) et le temps restant.
      const dateVisee = window.mrtFormat.date(prochaine.jourJ, { semaine: true, annee: parse(prochaine.jourJ).getFullYear() !== new Date().getFullYear() });
      let h = '<div class="ps-cadre">' + profil + '<h1 class="ps-titre">' + nom(prochaine.course) + '</h1><p class="ps-sous">' + dateVisee + ' · dans ' + dans + ' sem.</p>';

      // (3) Frise, à deux niveaux : « Saison » (jusqu'à l'Objectif, par défaut) ou « Tout » (jusqu'à la fin de la dernière récupération).
      const derniere = ps.saisons[ps.saisons.length - 1], recupDer = ps.reperes.find(r => r.course === derniere.course);
      const finTout = lundiDe(recupDer && recupDer.recupFin > derniere.jourJ ? recupDer.recupFin : derniere.jourJ);
      const jm = d => d.getDate() + ' ' + MOIS[d.getMonth()];
      // Nom d'une phase sur un segment de deux semaines, quand le nom entier ne tient pas.
      const COURT = { developpement: 'Dév.', affutage: 'Aff.', recuperation: 'Récup.', entretien: 'Entr.', deload: 'Del.' };
      // 9 → 22 nov, ou 28 nov → 6 déc.
      const plage = (l1, l2) => { const x = parse(l1), y = parse(addDays(l2, 6)); return (x.getMonth() === y.getMonth() ? x.getDate() : jm(x)) + ' → ' + jm(y); };
      const friseCorps = mode => {
        const fin = mode === 'tout' ? finTout : lundiDe(prochaine.jourJ);
        const semaines = [];
        for (let l = lundi; l <= fin; l = addDays(l, 7)) semaines.push(l);
        const n = semaines.length;
        const courses = ctx.courses.filter(c => c.date && c.etat === 'a_venir' && (c.statut === 'confirmee' || c.statut === 'option') && c.date >= lundi && c.date <= addDays(fin, 6));
        const phases = semaines.map(l => { const x = P.phaseDe(ps, l); return x ? x.phase : 'entretien'; });
        // Suites de semaines de même phase : un segment chacune [premier index, longueur].
        const runs = [];
        for (let i = 0; i < n;) { let j = i; while (j < n && phases[j] === phases[i]) j++; runs.push({ i, len: j - i, ph: phases[i] }); i = j; }
        const marque = c => { const role = roleDe(c); return '<a class="ps-marque r-' + role + (c.statut === 'option' ? ' is-option' : '') + '" href="' + lien(c) + '" title="' + esc(c.course + ' · ' + longue(c.date) + ' · ' + ROLE[role] + (c.statut === 'option' ? ' (option)' : '')) + '"><b>▲</b><span class="ps-marque-nom">' + esc(c.course) + ' · ' + jm(parse(c.date)) + '</span></a>'; };
        // Légende : seulement ce que la frise montre.
        const roles = [...new Set(courses.filter(c => c.statut !== 'option').map(roleDe))], option = courses.some(c => c.statut === 'option');
        const legende = '<p class="ps-legende">' + ['objectif', 'preparatoire', 'plaisir'].filter(r => roles.includes(r)).map(r => '<span><b class="ps-marque r-' + r + '">▲</b>' + ROLE[r] + '</span>').join('') +
          (option ? '<span><b class="ps-marque is-option">▲</b>option</span>' : '') +
          ['base', 'developpement', 'affutage', 'deload', 'recuperation', 'entretien'].filter(k => phases.includes(k)).map(k => '<span><i class="cal-k ph-' + k + '"></i>' + NOM_PHASE[k] + '</span>').join('') + '</p>';
        // Téléphone : une liste verticale, une ligne par phase (couleur, nom, dates, durée), les courses sous leur phase.
        if (mq.matches) {
          return '<ol class="ps-liste">' + runs.map(r => {
            const l1 = semaines[r.i], l2 = semaines[r.i + r.len - 1], cs = courses.filter(c => c.date >= l1 && c.date <= addDays(l2, 6));
            return '<li class="ps-run" data-lundi="' + l1 + '" data-fin="' + l2 + '"><i class="cal-k ph-' + r.ph + '"></i><b class="ps-run-nom">' + NOM_PHASE[r.ph] + '</b><span class="ps-run-dates">' + plage(l1, l2) + ' · ' + r.len + ' sem.</span>' +
              cs.map(marque).join('') + '</li>';
          }).join('') + '</ol>';
        }
        // Ordinateur : trois rangées sur la même grille, une colonne par semaine : les dates, les phases (un segment par suite de semaines), les courses (nom et date écrits).
        const pas = n <= 12 ? 1 : n <= 26 ? 2 : 4;
        const dates = semaines.map((l, i) => i % pas ? '' : '<span class="ps-date" style="grid-column:' + (i + 1) + ' / span ' + pas + '">' + jm(parse(l)) + '</span>').join('');
        const segs = runs.map(r => '<span class="ps-seg ph-' + r.ph + '" data-debut="' + semaines[r.i] + '" data-fin="' + semaines[r.i + r.len - 1] + '" style="grid-column:' + (r.i + 1) + ' / span ' + r.len + '" title="' +
          esc(NOM_PHASE[r.ph] + ' · ' + plage(semaines[r.i], semaines[r.i + r.len - 1]) + ' · ' + r.len + ' sem.') + '">' + (r.len >= 3 || (r.len === 2 && NOM_PHASE[r.ph].length <= 6) ? NOM_PHASE[r.ph] : r.len === 2 ? COURT[r.ph] : '') + '</span>').join('');
        // Une course dans les dernières semaines s'écrit vers la gauche (le nom finit sous son signe), pour ne pas sortir de la frise.
        const marques = courses.map((c, k) => {
          const i = semaines.indexOf(lundiDe(c.date)), fin = i >= n - 6, debut = fin ? Math.max(1, i + 1 - 7) : i + 1;
          return '<span class="ps-marque-c' + (fin ? ' is-fin' : '') + '" style="grid-column:' + debut + ' / ' + (fin ? i + 2 : 'span 1') + ';grid-row:' + (3 + k % 2) + '">' + marque(c) + '</span>';
        }).join('');
        return '<div class="ps-frise-defile"><div class="ps-frise" style="--n:' + n + '">' + dates + segs + marques + '</div></div>' + legende;
      };
      const mode = ctx.friseMode || 'saison';
      ctx.friseMaj = m => {
        ctx.friseMode = m;
        const z = root.querySelector('.ps-frise-zone');
        if (!z) return;
        z.querySelector('.ps-frise-corps').innerHTML = friseCorps(m);
        z.querySelectorAll('[data-frise]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.frise === m)));
      };
      h += '<div class="ps-frise-zone" data-plein-cible><div class="ps-frise-barre"><div class="ps-coches">' +
        [['saison', 'Saison'], ['tout', 'Tout']].map(x => '<button type="button" class="mrt-pastille" data-frise="' + x[0] + '" aria-pressed="' + (mode === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
        window.mrtPleinEcran.bouton() + '</div><div class="ps-frise-corps">' + friseCorps(mode) + '</div></div>';

      // Le bloc en cours : la recommandation (avec les alertes, s'il y en a) et la grille des 4 semaines à partir de celle-ci, dans la grille
      // du mois du Calendrier ; dans les cases, les repères et les séances proposées par l'IA, en attente.
      h += '<section class="ps-bloc">' + iaHtml(ctx, lundi, ps.alertes) +
        '<div class="ps-grille">' + window.mrtGrilleMois(ctx, lundi, addDays(lundi, 7 * BLOC - 1), { ps, plus: j => caseHtml(ctx, ps, j) }) + '</div>';
      root.innerHTML = h + '</section></div>';
    }

    ctx.redessiner = dessiner;
    ctx.ia = {};
    root.__ctx = ctx; // pour le banc d'essai (garde-fous sur les données de la page)
    root.addEventListener('click', e => { if (e.target.closest('[data-profil]')) ouvrirProfil(ctx); const f = e.target.closest('[data-frise]'); if (f && ctx.friseMaj) ctx.friseMaj(f.dataset.frise); });
    // Choix semaine par semaine : chaque semaine du bloc en pastille, choisie ou non.
    root.addEventListener('click', e => {
      const c = e.target.closest('[data-coche]');
      if (!c) return;
      const tous = [0, 1, 2, 3].map(i => addDays(lundiDe(iso(new Date())), 7 * i)), sel = ctx.ia.semaines || tous, l = c.dataset.coche;
      ctx.ia = Object.assign({}, ctx.ia, { semaines: sel.includes(l) ? sel.filter(x => x !== l) : sel.concat([l]) });
      dessiner();
    });
    // Boutons de la proposition : proposer, refaire (compte pour une), tout accepter, choisir, accepter la sélection, abandonner.
    root.addEventListener('click', async e => {
      const b = e.target.closest('[data-ia]');
      if (!b || b.disabled) return;
      const act = b.dataset.ia, lundi = lundiDe(iso(new Date())), prop = IA().enAttente(ctx, lundi);
      const recharger = async () => { await IA().lirePropositions(ctx); await ctx.actualiser(); };
      if (act === 'proposer' || act === 'refaire') {
        if (act === 'refaire' && !(await window.mrtConfirmer({ texte: 'Refaire la proposition ? Elle compte pour une (' + IA().restantes(ctx) + ' restantes ce mois-ci).', action: 'Refaire' }))) return;
        ctx.ia = { encours: true }; dessiner();
        if (act === 'refaire' && prop) await IA().abandonner(prop);
        const r = await IA().proposer(ctx, lundi);
        await IA().lirePropositions(ctx);
        ctx.ia = { message: r.message || null }; dessiner();
      } else if (act === 'choisir' || act === 'sans-choix') { ctx.ia = { choix: act === 'choisir' }; dessiner(); }
      else if (act === 'tout' || act === 'selection') {
        const tous = [0, 1, 2, 3].map(i => addDays(lundi, 7 * i));
        const lundis = act === 'tout' ? tous : (ctx.ia.semaines || tous);
        const n = IA().aRemplacer(ctx, lundis).length;
        if (n && !(await window.mrtConfirmer({ texte: n + (n > 1 ? ' séances' : ' séance') + ' déjà proposée' + (n > 1 ? 's' : '') + ' par MyRunTools sur ces semaines ' + (n > 1 ? 'seront remplacées' : 'sera remplacée') + ' (pas celles que tu as saisies, ni les faites).', action: 'Remplacer' }))) return;
        const err = await IA().accepter(ctx, prop, lundis);
        if (err) { console.warn(err); ctx.ia = { message: 'Enregistrement impossible pour l\'instant.' }; dessiner(); return; }
        ctx.ia = {}; await recharger();
      } else if (act === 'abandonner') {
        if (!(await window.mrtConfirmer({ texte: 'Abandonner cette proposition ? Aucune séance n\'est enregistrée.', action: 'Abandonner' }))) return;
        await IA().abandonner(prop); ctx.ia = {}; await recharger();
      }
    });
    P.brancher(root, ctx, null);
    dessiner();
    // Le profil d'entraînement (une ligne, la sienne : règle par ligne), lu après le premier dessin ; jamais sur le site partagé.
    // Et les propositions de l'IA (plafond du mois, proposition en attente).
    if (!ctx.lectureSeule) Promise.all([window.mrtSupabase.from('profil_entrainement').select('*'), IA() ? IA().lirePropositions(ctx) : null]).then(([{ data, error }]) => {
      if (error) console.warn(error);
      ctx.profil = (data && data[0]) || null;
      dessiner();
    });
  };
})();
