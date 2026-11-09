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

  // Texte d'une alerte (spécification, § 3.4).
  function texteAlerte(a) {
    if (a.type === 'proches') return nom(a.course) + ' est à ' + a.semaines + ' semaines de ' + nom(a.autre) + ' (12 au moins conseillées entre deux Objectifs) : passe l\'un des deux en Préparatoire.';
    if (a.type === 'recup-affutage') return 'La récupération de ' + nom(a.course) + ' court jusqu\'au ' + longue(a.fin) + ' : elle déborde sur l\'affûtage de ' + nom(a.autre) + ' (dès le ' + longue(a.affutage) + ').';
    if (a.type === 'prepa-proche') return nom(a.course) + ' est à ' + a.jours + ' jours de ' + nom(a.autre) + ' : une Préparatoire se court au moins 3 semaines avant un Objectif de la distance du marathon ou plus, 2 semaines avant un plus court.';
    return nom(a.course) + ' est plus longue (en km-effort) que ' + nom(a.autre) + ', l\'Objectif de sa saison.';
  }

  // Repères d'une semaine : jours allégés, repos de la veille, récupération ; chacun limité à la semaine.
  function reperesSemaine(ps, lundi) {
    const dim = addDays(lundi, 6), dans = (a, b) => a <= dim && b >= lundi, out = [];
    ps.reperes.forEach(r => {
      const c = r.course;
      if (r.allegeDebut && dans(r.allegeDebut, r.allegeFin)) out.push('Allégé du ' + longue(r.allegeDebut) + ' au ' + longue(r.allegeFin) + ' : avant ' + nom(c) + ' (Préparatoire).');
      if (r.repos && dans(r.repos, r.repos)) out.push('Repos le ' + longue(r.repos) + ' : veille de ' + nom(c) + ' (Plaisir).');
      if (dans(r.recupDebut, r.recupFin)) out.push('Récupération de ' + nom(c) + ' jusqu\'au ' + longue(r.recupFin) + ' : séances faciles seulement.');
    });
    return out;
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
  const AIDE = {
    volume_tranche: 'Sur les 4 dernières semaines. « Aucune idée » : l\'IA reste prudente.',
    semaine: 'Course et renforcement peuvent tomber le même jour : le volume est adapté.',
    seance_max_min: 'La séance la plus longue que tu peux caser dans ta semaine.',
    terrain: 'La plus longue montée sur laquelle tu peux t\'entraîner.'
  };

  function ouvrirProfil(ctx) {
    const v = P.fenetre('<div class="ps-profil-corps"></div>', 'ps-profil'), corps = v.querySelector('.ps-profil-corps');
    const pr = () => ctx.profil || {};
    // Enregistre les champs donnés (le profil entier, fusionné) ; rend vrai si c'est fait.
    async function ranger(champs, msg) {
      const ligne = Object.assign({}, pr(), champs, { maj: new Date().toISOString() });
      delete ligne.utilisateur;
      const { error } = await window.mrtSupabase.from('profil_entrainement').upsert(ligne);
      if (error) { console.warn(error); if (msg) msg.textContent = 'Enregistrement impossible pour l\'instant.'; return false; }
      ctx.profil = Object.assign({}, pr(), champs);
      ctx.redessiner();
      return true;
    }
    const barre = (gauche, titre) => '<div class="cal-barre ps-profil-barre">' + gauche + '<p class="cal-panneau-titre" id="cal-titre">' + titre + '</p><span></span></div><p class="cal-msg" role="alert"></p>';
    const retour = '<button type="button" class="mrt-btn" data-q="liste">‹ Retour</button>';
    const aide = k => (AIDE[k] ? '<p class="ps-aide">' + AIDE[k] + '</p>' : '');

    function liste() {
      const ls = lignes(pr()), obligatoires = ls.filter(l => l[3]), faites = obligatoires.filter(l => l[2]).length;
      const ligneHtml = l => '<button type="button" class="ps-ligne-q" data-q="' + l[0] + '"><span>' + l[1] + '</span><span class="ps-rep' + (!l[2] && l[3] ? ' is-a-faire' : '') + '">' + (l[2] ? esc(l[2]) : l[3] ? 'À renseigner' : '—') + '</span><i aria-hidden="true">›</i></button>';
      corps.innerHTML = barre('<button type="button" class="mrt-btn" data-act="annuler">Fermer</button>', 'Mon profil d\'entraînement') +
        '<div class="ps-section-t"><span class="ps-libelle">Indispensable pour proposer tes séances</span><span class="ps-compte' + (faites === obligatoires.length ? ' is-complet' : '') + '">' + faites + ' sur ' + obligatoires.length + '</span></div>' +
        '<div class="ps-groupe-l">' + obligatoires.map(ligneHtml).join('') + '</div>' +
        '<div class="ps-section-t"><span class="ps-libelle">Pour affiner (facultatif)</span></div><div class="ps-groupe-l">' + ls.filter(l => !l[3]).map(ligneHtml).join('') + '</div>';
      corps.querySelector('[data-act="annuler"]').addEventListener('click', v.fermer);
    }
    // Une question à choix : un toucher enregistre et revient à la liste.
    function choix(cle, titre) {
      corps.innerHTML = barre(retour, titre) + '<div class="ps-groupe-l">' + ECHELLES[cle].map(([k, lib]) =>
        '<button type="button" class="ps-choix' + (String(pr()[cle]) === String(k) ? ' is-on' : '') + '" data-val="' + esc(k) + '">' + lib + '<i aria-hidden="true">✓</i></button>').join('') + '</div>' + aide(cle);
      corps.querySelectorAll('[data-val]').forEach(b => b.addEventListener('click', async () => {
        const val = cle === 'seance_max_min' ? Number(b.dataset.val) : b.dataset.val;
        if (await ranger({ [cle]: val }, corps.querySelector('.cal-msg'))) liste();
      }));
    }
    // Ma semaine : quatre questions sur un écran, chacune enregistrée à chaque toucher ; « Retour » à la fin.
    function semaine() {
      const p0 = pr(), jc = joursDe(p0, 'jours_course'), jr = joursDe(p0, 'jours_renfo');
      const pastille = (attr, val, on, lib) => '<button type="button" class="mrt-pastille" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + lib + '</button>';
      const bloc = (titre, html) => '<div class="ps-sem-q"><p class="ps-sem-t">' + titre + '</p><div class="ps-coches">' + html + '</div></div>';
      const nbMax = Math.max(jc.length, 1);
      corps.innerHTML = barre(retour, 'Ma semaine') + aide('semaine') +
        bloc('Jours possibles pour courir', JOURS_COURTS.map((j, i) => pastille('data-jc', i + 1, jc.includes(i + 1), j)).join('')) +
        bloc('Nombre de sorties par semaine', jc.length ? [1, 2, 3, 4, 5, 6, 7].filter(n => n <= nbMax).map(n => pastille('data-nb', n, p0.nb_sorties === n, n)).join('') : '<span class="ps-aide">Choisis d\'abord tes jours.</span>') +
        bloc('Jour à privilégier pour la sortie longue', jc.length ? jc.map(n => pastille('data-long', n, p0.jour_long === n, JOURS_COURTS[n - 1])).join('') + pastille('data-long', 0, !p0.jour_long, 'Peu importe') : '<span class="ps-aide">Choisis d\'abord tes jours.</span>') +
        bloc('Jours possibles pour le renforcement', JOURS_COURTS.map((j, i) => pastille('data-jr', i + 1, jr.includes(i + 1), j)).join('')) +
        bloc('Nombre de renforcements par semaine', [0, 1, 2, 3].map(n => pastille('data-nr', n, (p0.nb_renfo || 0) === n, n)).join(''));
      const msg = corps.querySelector('.cal-msg');
      const bascule = (liste, n) => (liste.includes(n) ? liste.filter(x => x !== n) : liste.concat([n]).sort((a, b) => a - b));
      corps.querySelectorAll('button[data-jc], button[data-jr], button[data-nb], button[data-long], button[data-nr]').forEach(b => b.addEventListener('click', async () => {
        const d = b.dataset, champs = {};
        if (d.jc) {
          champs.jours_course = bascule(jc, Number(d.jc));
          // Plus de sorties que de jours, ou sortie longue sur un jour retiré : ramenés.
          if (p0.nb_sorties > champs.jours_course.length) champs.nb_sorties = champs.jours_course.length || null;
          if (p0.jour_long && !champs.jours_course.includes(p0.jour_long)) champs.jour_long = null;
        }
        if (d.jr) champs.jours_renfo = bascule(jr, Number(d.jr));
        if (d.nb) champs.nb_sorties = Number(d.nb);
        if (d.long) champs.jour_long = Number(d.long) || null;
        if (d.nr) champs.nb_renfo = Number(d.nr);
        if (await ranger(champs, msg)) semaine();
      }));
    }
    // Repère d'allure : son type, puis sa valeur (« Je ne sais pas » : enregistré aussitôt).
    function allure(type) {
      const t = type || pr().allure_type;
      const saisie = t === 'vma' ? ['vma', 'VMA (km/h)', virgule(pr().vma), 'ex. 15,5', 'decimal'] : t === '10km' ? ['temps', 'Temps sur 10 km', enTemps(pr().temps_10km_s), 'ex. 45:30', 'text'] :
        t === 'semi' ? ['temps', 'Temps sur semi-marathon', enTemps(pr().temps_semi_s), 'ex. 1:42:00', 'text'] : null;
      corps.innerHTML = barre(retour, 'Repère d\'allure') + '<div class="ps-groupe-l">' + ECHELLES.allure_type.map(([k, lib]) =>
        '<button type="button" class="ps-choix' + (t === k ? ' is-on' : '') + '" data-type="' + k + '">' + lib + '<i aria-hidden="true">✓</i></button>').join('') + '</div>' +
        (saisie ? '<form class="ps-valeur" novalidate><label class="cal-champ"><span>' + saisie[1] + '</span><input class="mrt-champ" name="valeur" inputmode="' + saisie[4] + '" placeholder="' + saisie[3] + '" value="' + esc(saisie[2]) + '"></label>' +
          '<button type="submit" class="mrt-btn is-principal">Valider</button></form>' : '');
      const msg = corps.querySelector('.cal-msg');
      corps.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', async () => {
        if (b.dataset.type === 'inconnu') { if (await ranger({ allure_type: 'inconnu' }, msg)) liste(); } else allure(b.dataset.type);
      }));
      const f = corps.querySelector('.ps-valeur');
      if (f) {
        f.valeur.focus();
        f.addEventListener('submit', async e => {
          e.preventDefault();
          if (t === 'vma') {
            const x = P.nombre(f.valeur.value);
            if (x === null || Number.isNaN(x) || x < 8 || x > 30) return void (msg.textContent = 'La VMA doit être comprise entre 8 et 30 km/h.');
            if (await ranger({ allure_type: 'vma', vma: x }, msg)) liste();
          } else {
            const x = secondes(f.valeur.value), [a, b2] = t === '10km' ? [1200, 7200] : [3000, 14400];
            if (x === null || Number.isNaN(x) || x < a || x > b2) return void (msg.textContent = t === '10km' ? 'Le temps sur 10 km s\'écrit 45:30 (entre 20:00 et 2:00:00).' : 'Le temps sur semi s\'écrit 1:42:00 (entre 50:00 et 4:00:00).');
            if (await ranger(t === '10km' ? { allure_type: '10km', temps_10km_s: x } : { allure_type: 'semi', temps_semi_s: x }, msg)) liste();
          }
        });
      }
    }
    // FC max et points fragiles : deux champs facultatifs, « Valider ».
    function sante() {
      corps.innerHTML = barre(retour, 'FC max et points fragiles') + '<form class="ps-valeur" novalidate>' +
        '<label class="cal-champ"><span>FC max</span><input class="mrt-champ" name="fc" inputmode="numeric" placeholder="ex. 185" value="' + esc(pr().fc_max == null ? '' : pr().fc_max) + '"></label>' +
        '<label class="cal-champ"><span>Points fragiles</span><textarea class="mrt-champ" name="fragiles" maxlength="300" rows="3" placeholder="ex. tendon d\'Achille gauche">' + esc(pr().fragiles || '') + '</textarea></label>' +
        '<button type="submit" class="mrt-btn is-principal">Valider</button></form>';
      const f = corps.querySelector('form'), msg = corps.querySelector('.cal-msg');
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const fc = P.nombre(f.fc.value);
        if (fc !== null && (Number.isNaN(fc) || !Number.isInteger(fc) || fc < 100 || fc > 230)) return void (msg.textContent = 'La FC max doit être comprise entre 100 et 230.');
        if (await ranger({ fc_max: fc, fragiles: f.fragiles.value.trim() || null }, msg)) liste();
      });
    }
    corps.addEventListener('click', e => {
      const q = e.target.closest('[data-q]');
      if (!q) return;
      const k = q.dataset.q, titre = (lignes(pr()).find(l => l[0] === k) || [])[1];
      if (k === 'liste') liste(); else if (k === 'semaine') semaine(); else if (k === 'allure') allure(); else if (k === 'sante') sante(); else choix(k, titre);
    });
    liste();
  }

  // ----- Séances proposées par l'IA (spécification, § 6 ; calcul et appel : seances-ia.js) -----
  const IA = () => window.mrtSeancesIA;
  const ligneSeance = s => '<li>' + P.jourCourt(s.date) + ' · <b>' + (P.TYPES[s.type] || s.type) + '</b> ' + esc(s.libelle) + ' · ' + s.duree_min + ' min' +
    (Number(s.distance_km) > 0 ? ' · ' + virgule(s.distance_km) + ' km' : '') + ' · ' + (P.INTENSITES[s.intensite] || s.intensite) + '</li>';
  // (6) Proposer, (8) explications, (9) proposition en attente et ses boutons.
  function iaHtml(ctx, lundi) {
    if (ctx.lectureSeule || !IA() || ctx.profil === undefined) return '';
    const etat = ctx.ia || {}, manque = manquants(ctx.profil);
    if (manque.length) return '<p class="ps-ia-aide">Pour que l\'IA propose les séances du bloc : <button type="button" class="mrt-lien" data-profil>Compléter mon profil</button></p>';
    const prop = IA().enAttente(ctx, lundi), reste = IA().restantes(ctx);
    const msg = etat.message ? '<p class="ps-ia-msg" role="alert">' + etat.message + '</p>' : '';
    const mention = '<p class="ps-ia-mention">Séances proposées par une IA, à titre indicatif : ce n\'est pas un avis médical.</p>';
    if (!prop) return '<div class="ps-ia"><button type="button" class="mrt-btn is-principal" data-ia="proposer"' + (etat.encours || !reste ? ' disabled' : '') + '>' +
      (etat.encours ? 'Proposition en cours…' : 'Proposer les séances') + '</button><span class="ps-ia-reste">' + reste + (reste > 1 ? ' restantes' : ' restante') + ' ce mois-ci</span></div>' + mention + msg;
    const sems = prop.reponse.semaines.map(w => '<div class="ps-prop-sem" data-lundi="' + esc(w.lundi) + '">' +
      (etat.choix ? '<label class="ps-prop-titre"><input type="checkbox" data-coche="' + esc(w.lundi) + '" checked> ' : '<p class="ps-prop-titre">') + 'Semaine ' + window.mrtFormat.semaine(w.lundi) + (etat.choix ? '</label>' : '</p>') +
      '<p class="ps-prop-expl">« ' + esc(w.explication) + ' »</p><ul class="ps-prop-liste">' + (w.seances || []).map(ligneSeance).join('') + '</ul></div>').join('');
    const actions = etat.choix
      ? '<button type="button" class="mrt-btn is-principal" data-ia="selection">Accepter la sélection</button><button type="button" class="mrt-btn" data-ia="sans-choix">Annuler le choix</button>'
      : '<button type="button" class="mrt-btn is-principal" data-ia="tout">Tout accepter</button><button type="button" class="mrt-btn" data-ia="choisir">Choisir semaine par semaine</button>' +
        '<button type="button" class="mrt-btn" data-ia="refaire"' + (etat.encours || !reste ? ' disabled' : '') + '>' + (etat.encours ? 'Proposition en cours…' : 'Refaire') + '</button><button type="button" class="mrt-btn" data-ia="abandonner">Abandonner</button>';
    return '<section class="ps-proposition"><h3 class="ps-libelle">Proposition de l\'IA · en attente</h3>' + sems + '<div class="ps-prop-actions">' + actions + '</div>' + mention + msg + '</section>';
  }

  window.renderSaison = function (root, ctx) {
    ctx.actualiser = async () => { Object.assign(ctx, await ctx.relire()); dessiner(); };

    function dessiner() {
      const auj = iso(new Date()), lundi = lundiDe(auj), ps = P.planSaison(ctx);
      const prochaine = ps.saisons.find(x => x.jourJ >= auj);
      // (2) Mon profil et (12) son état : ce qui manque pour proposer des séances.
      const manque = manquants(ctx.profil);
      const profil = ctx.lectureSeule ? '' : '<div class="ps-profil-haut"><span class="ps-profil-etat' + (manque.length ? '' : ' is-complet') + '">' +
        (ctx.profil === undefined ? '' : manque.length ? 'Profil à compléter : ' + manque.join(', ') + '.' : 'Profil complet.') + '</span><button type="button" class="mrt-btn" data-profil>Mon profil</button></div>';
      if (!prochaine) {
        root.innerHTML = '<div class="ps-cadre">' + profil + '<p class="ps-vide">Aucun Objectif à venir : donne le rôle Objectif à une course confirmée (page Objectif & plan) pour construire ta saison.</p></div>';
        return;
      }
      // (1) Saison visée ; (11) état de la semaine.
      const ici = P.phaseDe(ps, lundi);
      const dans = semainesEntre(auj, prochaine.jourJ);
      let etat = '';
      if (ici && ici.saison) etat = 'Cette semaine : ' + NOM_PHASE[ici.phase] + ', semaine ' + (ici.saison.semaines.findIndex(w => w.lundi === lundi) + 1) + ' sur ' + ici.saison.semaines.length + '.';
      else if (ici && ici.phase === 'recuperation') { const r = ps.reperes.find(x => x.course === ici.apres); etat = 'Cette semaine : Récupération de ' + nom(ici.apres) + ', jusqu\'au ' + longue(r.recupFin) + '.'; }
      else if (ici) etat = 'Cette semaine : Entretien, jusqu\'au ' + longue(addDays(prochaine.premier, -1)) + ' ; la saison commence le ' + longue(prochaine.premier) + '.';
      let h = '<div class="ps-cadre">' + profil + '<h1 class="ps-titre">Saison : vers « ' + nom(prochaine.course) + ' » · ' + longue(prochaine.jourJ) + ' <small>(dans ' + dans + ' sem.)</small></h1>' +
        '<p class="ps-etat">' + etat + (prochaine.raccourcie ? ' Saison raccourcie : ' + prochaine.semaines.length + ' semaines sur ' + prochaine.plan.n + '.' : '') + '</p>';

      // (3) Frise : de la semaine en cours à la dernière semaine du plan (dernière saison, ou récupération du dernier Objectif).
      const derniere = ps.saisons[ps.saisons.length - 1], recupDer = ps.reperes.find(r => r.course === derniere.course);
      const fin = lundiDe(recupDer && recupDer.recupFin > derniere.jourJ ? recupDer.recupFin : derniere.jourJ);
      const semaines = [];
      for (let l = lundi; l <= fin; l = addDays(l, 7)) semaines.push(l);
      const courses = ctx.courses.filter(c => c.date && c.etat === 'a_venir' && (c.statut === 'confirmee' || c.statut === 'option') && c.date >= lundi && c.date <= addDays(fin, 6));
      let premierMois = false;
      h += '<div class="ps-frise-defile"><div class="ps-frise" style="--n:' + semaines.length + '">' + semaines.map((l, i) => {
        const x = P.phaseDe(ps, l), ph = x ? x.phase : 'entretien', d = parse(l);
        // Nom du mois sur la semaine où il commence ; l'année sur le premier nom affiché et en janvier.
        const prec = i ? parse(semaines[i - 1]) : null, change = prec && prec.getMonth() !== d.getMonth();
        const mois = change ? MOIS[d.getMonth()] + (d.getMonth() === 0 || !premierMois ? ' ' + String(d.getFullYear()).slice(2) : '') : '';
        if (change) premierMois = true;
        const marques = courses.filter(c => lundiDe(c.date) === l).map(c => {
          const role = roleDe(c);
          return '<a class="ps-marque r-' + role + (c.statut === 'option' ? ' is-option' : '') + '" href="' + lien(c) + '" title="' + esc(c.course + ' · ' + longue(c.date) + ' · ' + ROLE[role] + (c.statut === 'option' ? ' (option)' : '')) + '">▲</a>';
        }).join('');
        return '<div class="ps-sem" data-lundi="' + l + '"><span class="ps-mois">' + mois + '</span><span class="ps-ph ph-' + ph + '" title="' + esc('Semaine du ' + longue(l) + ' · ' + NOM_PHASE[ph]) + '"></span><span class="ps-marques">' + marques + '</span></div>';
      }).join('') + '</div></div>';
      h += '<p class="ps-legende"><span><b class="ps-marque r-objectif">▲</b>Objectif</span><span><b class="ps-marque r-preparatoire">▲</b>Préparatoire</span><span><b class="ps-marque r-plaisir">▲</b>Plaisir</span>' +
        '<span><b class="ps-marque is-option">▲</b>option</span>' +
        ['base', 'developpement', 'affutage', 'deload', 'recuperation', 'entretien'].map(k => '<span><i class="cal-k ph-' + k + '"></i>' + NOM_PHASE[k] + '</span>').join('') + '</p>';

      // (4) Alertes.
      h += '<section class="ps-alertes"><h2 class="ps-libelle">Alertes (' + ps.alertes.length + ')</h2>' +
        (ps.alertes.length ? '<ul>' + ps.alertes.map(a => '<li class="ps-alerte" data-alerte="' + a.type + '">' + texteAlerte(a) + '</li>').join('') + '</ul>' : '') + '</section>';

      // (5) Bloc en cours : 4 semaines à partir de celle-ci, chacune avec ses repères (7) et ses séances.
      h += '<section class="ps-bloc"><h2 class="ps-libelle">Bloc en cours · ' + BLOC + ' semaines à partir du ' + longue(lundi) + '</h2>' + iaHtml(ctx, lundi) + '<div class="cal-sem-liste">';
      for (let i = 0; i < BLOC; i++) {
        const l = addDays(lundi, 7 * i), x = P.phaseDe(ps, l), rep = reperesSemaine(ps, l);
        h += (rep.length ? '<ul class="ps-reperes">' + rep.map(t => '<li>' + t + '</li>').join('') + '</ul>' : '') +
          P.semaineHtml(ctx, l, { phase: x ? x.phase : null, numero: x && x.saison ? x.saison.semaines.findIndex(w => w.lundi === l) + 1 : null, modifiee: x && x.modifiee });
      }
      root.innerHTML = h + '</div></section></div>';
    }

    ctx.redessiner = dessiner;
    ctx.ia = {};
    root.__ctx = ctx; // pour le banc d'essai (garde-fous sur les données de la page)
    root.addEventListener('click', e => { if (e.target.closest('[data-profil]')) ouvrirProfil(ctx); });
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
        const lundis = act === 'tout' ? prop.reponse.semaines.map(w => w.lundi) : [...root.querySelectorAll('[data-coche]:checked')].map(x => x.dataset.coche);
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
