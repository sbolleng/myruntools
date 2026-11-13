// ===== Mon profil : tout ce qui décrit le coureur =====
//
// docs/module-profil-specification.md. Une liste en quatre sections (Moi, Mon niveau, Ma semaine, Santé) ; chaque ligne
// ouvre sa question, un écran par question, enregistrée à chaque choix. Deux usages, une seule liste :
//   mrtProfil.page(el, etat)          la page Mon plan (profil.html) : la liste dans la page, une question en feuille
//   mrtProfil.feuille({ etat, surMaj }) la feuille « Mon profil » (Mon plan, Nutrition) : la liste et ses questions
//   mrtProfil.feuille({ etat, suite: mrtProfil.EXPRESS, surMaj }) le profil express (Premiers pas d'En un coup d'œil) :
//                                       les questions de la suite qui manquent, l'une après l'autre, puis la feuille se ferme
//   mrtProfil.expressFait(mesures, entrainement)  vrai quand le profil express est rempli
//   mrtProfil.manquants(entrainement)   questions indispensables à l'IA qui manquent (Mon plan)
// etat : { id, mesures (ligne de `profils`), entrainement (ligne de `profil_entrainement`, lue si absente), courses }.
// Les mesures sont rangées dans `profils`, le reste dans `profil_entrainement` (règles par ligne : chacun sa ligne).
// À charger après composants/besoin.js (niveaux d'activité) et en-tete.js (mrtFormat, mrtIcone).
(function () {
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nombre = v => { const t = String(v == null ? '' : v).trim().replace(',', '.'); return t === '' ? null : /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN; };
  const virgule = v => (v == null ? '' : String(v).replace('.', ','));
  const pad2 = n => String(n).padStart(2, '0');
  const enTemps = s => (s == null ? '' : (s >= 3600 ? Math.floor(s / 3600) + ':' + pad2(Math.floor(s % 3600 / 60)) : Math.floor(s / 60)) + ':' + pad2(s % 60));
  // Temps : « 45:30 » ou « 1:42:00 » → secondes ; vide → null ; illisible → NaN.
  function secondes(v) {
    const t = String(v || '').trim();
    if (!t) return null;
    const m = t.match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
    return m ? (Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])) : NaN;
  }
  const iso = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());

  const ECHELLES = {
    sexe: [['femme', 'Femme'], ['homme', 'Homme']],
    anciennete: [['debut', 'Je débute'], ['1-3', '1 à 3 ans'], ['3-6', '3 à 6 ans'], ['6-10', '6 à 10 ans'], ['10+', 'Plus de 10 ans']],
    volume_tranche: [['inconnu', 'Aucune idée'], ['0-20', '0 à 20 km'], ['20-40', '20 à 40 km'], ['40-60', '40 à 60 km'], ['60-80', '60 à 80 km'], ['80+', 'Plus de 80 km']],
    sortie_tranche: [['-1h', 'Moins de 1 h'], ['1h-1h30', '1 h à 1 h 30'], ['1h30-2h', '1 h 30 à 2 h'], ['2-3h', '2 à 3 h'], ['3h+', 'Plus de 3 h']],
    seance_max_min: [[45, '45 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [1440, 'Sans limite']],
    terrain: [['plat', 'Pas de dénivelé'], ['cotes', 'Petites côtes (moins de 50 m de D+)'], ['vallonne', 'Vallonné (50 à 500 m de D+)'], ['montagne', 'Montagne (plus de 500 m de D+)']],
    renfo_niveau: [['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['confirme', 'Confirmé'], ['expert', 'Expert']],
    allure_type: [['vma', 'VMA'], ['10km', 'Temps sur 10 km'], ['semi', 'Temps sur semi-marathon'], ['inconnu', 'Je ne sais pas']]
  };
  const activites = () => Object.entries((window.mrtBesoin && window.mrtBesoin.ACTIVITES) || {}).map(([k, a]) => [k, a.libelle]);
  const echelle = cle => (cle === 'activite' ? activites() : ECHELLES[cle] || []);
  const libelleDe = (cle, v) => (echelle(cle).find(x => String(x[0]) === String(v)) || [])[1] || null;
  const JOURS_COURTS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
  const JOURS_LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const joursDe = (pr, k) => (Array.isArray(pr && pr[k]) ? pr[k].map(Number) : []);
  const seances = n => n + (n > 1 ? ' séances' : ' séance');
  const listeJours = l => l.map(n => JOURS_COURTS[n - 1].toLowerCase()).join(', ');

  // Repère d'allure : complet s'il est « je ne sais pas », ou si la valeur de son type est là.
  const allureFaite = pr => !!pr && (pr.allure_type === 'inconnu' || (pr.allure_type === 'vma' && pr.vma != null) || (pr.allure_type === '10km' && pr.temps_10km_s != null) || (pr.allure_type === 'semi' && pr.temps_semi_s != null));
  const resumeAllure = pr => (!allureFaite(pr) ? null : pr.allure_type === 'inconnu' ? 'Je ne sais pas' : pr.allure_type === 'vma' ? 'VMA ' + virgule(pr.vma) + ' km/h' :
    pr.allure_type === '10km' ? '10 km en ' + enTemps(pr.temps_10km_s) : 'Semi en ' + enTemps(pr.temps_semi_s));
  // Ma semaine : course complète avec au moins un jour et un nombre de séances ; renforcement, facultatif.
  const resumeCourse = pr => (!joursDe(pr, 'jours_course').length || !pr.nb_sorties ? null :
    listeJours(joursDe(pr, 'jours_course')) + ' · ' + seances(pr.nb_sorties) + (pr.jour_long ? ', longue le ' + JOURS_LONGS[pr.jour_long - 1] : ''));
  const resumeRenfo = pr => (!pr.nb_renfo ? (pr.nb_renfo === 0 ? 'Aucune' : null) : (joursDe(pr, 'jours_renfo').length ? listeJours(joursDe(pr, 'jours_renfo')) + ' · ' : '') + seances(pr.nb_renfo));

  // Les lignes : [clé, question, résumé(mesures, entraînement), obligatoire, écran].
  // Écrans : choix (une liste), nombre, date, texte, semaine, allure.
  const NOMBRES = {
    poids: { table: 'mesures', unite: 'kg', min: 20, max: 300, pas: 0.1, ex: 'ex. 72', erreur: 'Le poids doit être compris entre 20 et 300 kg.' },
    taille: { table: 'mesures', unite: 'cm', min: 100, max: 250, pas: 1, ex: 'ex. 178', erreur: 'La taille doit être comprise entre 100 et 250 cm.' },
    pointure: { table: 'mesures', unite: '', min: 30, max: 55, pas: 0.5, ex: 'ex. 42,5', erreur: 'La pointure doit être comprise entre 30 et 55 (demi-pointures acceptées).' },
    fc_max: { table: 'entrainement', unite: 'bpm', min: 100, max: 230, pas: 1, ex: 'ex. 185', erreur: 'La FC max doit être comprise entre 100 et 230.' },
    fc_repos: { table: 'mesures', unite: 'bpm', min: 30, max: 120, pas: 1, ex: 'ex. 52', erreur: 'La FC de repos doit être comprise entre 30 et 120.' }
  };
  const unite = (cle, v) => (v == null ? null : virgule(v) + (NOMBRES[cle].unite ? ' ' + NOMBRES[cle].unite : ''));
  const SECTIONS = [
    ['moi', 'Moi', [
      ['sexe', 'Sexe', m => libelleDe('sexe', m.sexe), true, 'choix'],
      ['naissance', 'Date de naissance', m => (m.naissance ? window.mrtFormat.date(m.naissance) : null), true, 'date'],
      ['poids', 'Poids', m => unite('poids', m.poids), true, 'nombre'],
      ['taille', 'Taille', m => unite('taille', m.taille), true, 'nombre'],
      ['activite', 'Activité hors sport', m => (libelleDe('activite', m.activite) || '').split(' · ')[0] || null, true, 'choix'],
      ['pointure', 'Pointure', m => unite('pointure', m.pointure), false, 'nombre']]],
    ['niveau', 'Mon niveau', [
      ['anciennete', 'Je cours depuis', (m, e) => libelleDe('anciennete', e.anciennete), true, 'choix'],
      ['volume_tranche', 'Distance par semaine', (m, e) => libelleDe('volume_tranche', e.volume_tranche), true, 'choix'],
      ['sortie_tranche', 'Plus longue sortie récente', (m, e) => libelleDe('sortie_tranche', e.sortie_tranche), true, 'choix'],
      ['allure', 'Repère d\'allure', (m, e) => resumeAllure(e), true, 'allure'],
      ['seance_max_min', 'Durée maximale d\'une séance', (m, e) => libelleDe('seance_max_min', e.seance_max_min), false, 'choix'],
      ['terrain', 'Terrains d\'entraînement', (m, e) => (libelleDe('terrain', e.terrain) || '').replace(/ \(.*\)$/, '') || null, false, 'choix'],
      ['renfo_niveau', 'Niveau en renforcement', (m, e) => libelleDe('renfo_niveau', e.renfo_niveau), false, 'choix']]],
    ['semaine', 'Ma semaine', [
      ['semaine', 'Course', (m, e) => resumeCourse(e), true, 'semaine'],
      ['renfo', 'Renforcement', (m, e) => resumeRenfo(e), false, 'semaine']]],
    ['sante', 'Santé', [
      ['fc_max', 'FC max', (m, e) => unite('fc_max', e.fc_max), false, 'nombre'],
      ['fc_repos', 'FC de repos', m => unite('fc_repos', m.fc_repos), false, 'nombre'],
      ['fragiles', 'Points fragiles', (m, e) => e.fragiles || null, false, 'texte'],
      ['blessure', 'Blessure en cours', (m, e) => (e.blessure ? e.blessure + (e.blessure_debut ? ', depuis le ' + window.mrtFormat.date(e.blessure_debut, { annee: false }) : '') : null), false, 'blessure']]]
  ];
  const LIGNES = SECTIONS.flatMap(s => s[2]);
  const ligneDe = cle => LIGNES.find(l => l[0] === cle);
  const TABLE = { sexe: 'mesures', naissance: 'mesures', activite: 'mesures', poids: 'mesures', taille: 'mesures', pointure: 'mesures', fc_repos: 'mesures' };
  // Questions indispensables pour que l'IA propose des séances (Mon plan) : leur nom, dans l'ordre.
  const IA = [['anciennete', 'je cours depuis'], ['volume_tranche', 'distance par semaine'], ['sortie_tranche', 'plus longue sortie récente'], ['semaine', 'ma semaine'], ['allure', 'repère d\'allure']];
  // Profil express (premiers pas d'un nouveau compte) : ce qui sert tout de suite à Nutrition et à Mon plan.
  const EXPRESS = ['sexe', 'naissance', 'poids', 'taille', 'allure'];
  const faiteDe = (k, m, e) => !!ligneDe(k)[2](m || {}, e || {});
  const expressFait = (m, e) => EXPRESS.every(k => faiteDe(k, m, e));
  const manquants = e => IA.filter(([k]) => !ligneDe(k)[2]({}, e || {})).map(x => x[1]);
  // Toutes les questions obligatoires qui manquent (état de la page).
  const tousManquants = (m, e) => LIGNES.filter(l => l[3] && !l[2](m || {}, e || {})).map(l => (l[0] === 'semaine' ? 'ma semaine' : l[1].toLowerCase()));

  // Repère tiré du Palmarès : la dernière course courue sur 10 km ou semi-marathon (route), de moins de 12 mois, avec un temps.
  function duPalmares(etat) {
    const auj = new Date(), il12 = iso(new Date(auj.getFullYear() - 1, auj.getMonth(), auj.getDate()));
    const c = (etat.courses || []).filter(x => x.etat === 'courue' && !x.dnf && Number(x.temps) > 0 && ['route_10km', 'route_semi'].includes(x.format) && x.date && x.date >= il12 && x.date <= iso(auj))
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (!c) return null;
    const type = c.format === 'route_10km' ? '10km' : 'semi', e = etat.entrainement || {};
    if (e.allure_type === type && Number(type === '10km' ? e.temps_10km_s : e.temps_semi_s) === Number(c.temps)) return null;
    return { type, s: Number(c.temps), course: c };
  }
  const suggestionHtml = sg => '<div class="mp-palmares"><span>Dans ton Palmarès : <b>' + (sg.type === '10km' ? '10 km' : 'Semi') + ' en ' + enTemps(sg.s) + '</b> · ' + esc(sg.course.course) + ', ' +
    window.mrtFormat.date(sg.course.date, { semaine: true }) + '</span><button type="button" class="mrt-btn" data-reprendre>Reprendre</button></div>';

  // La liste : un titre de section commun par section, le compte des obligatoires à droite ; chaque ligne ouvre sa question.
  function listeHtml(etat) {
    const m = etat.mesures || {}, e = etat.entrainement || {}, sg = duPalmares(etat);
    return SECTIONS.map(([id, titre, ls]) => {
      const ob = ls.filter(l => l[3]), faites = ob.filter(l => l[2](m, e)).length;
      const compte = ob.length ? '<span class="ps-compte' + (faites === ob.length ? ' is-complet' : '') + '">' + faites + ' sur ' + ob.length + '</span>' : '';
      return '<section class="mrt-section" id="' + id + '"><h2 class="mrt-section-titre ps-section-t">' + titre + ' ' + compte + '</h2><div class="ps-groupe-l">' + ls.map(l => {
        const r = l[2](m, e);
        return '<button type="button" class="ps-ligne-q" data-q="' + l[0] + '"><span>' + l[1] + '</span><span class="ps-rep' + (!r && l[3] ? ' is-a-faire' : '') + '">' + (r ? esc(r) : l[3] ? 'À renseigner' : '—') + '</span><i aria-hidden="true">›</i></button>' +
          (l[0] === 'allure' && sg ? suggestionHtml(sg) : '');
      }).join('') + '</div></section>';
    }).join('');
  }

  // Enregistre des champs dans leur table ; rend vrai si c'est fait.
  async function ranger(etat, table, champs) {
    const sb = window.mrtSupabase;
    if (table === 'mesures') {
      const { error } = await sb.from('profils').update(champs).eq('id', etat.id);
      if (error) { console.warn(error); return false; }
      etat.mesures = Object.assign({}, etat.mesures, champs);
    } else {
      const ligne = Object.assign({}, etat.entrainement, champs, { maj: new Date().toISOString() });
      delete ligne.utilisateur;
      const { error } = await sb.from('profil_entrainement').upsert(ligne);
      if (error) { console.warn(error); return false; }
      etat.entrainement = Object.assign({}, etat.entrainement, champs);
    }
    return true;
  }
  async function lireEntrainement(etat) {
    if (etat.entrainement !== undefined) return;
    const { data, error } = await window.mrtSupabase.from('profil_entrainement').select('*');
    if (error) console.warn(error);
    etat.entrainement = (data && data[0]) || null;
  }

  // La feuille (celle d'une course, modale-course.css) : la liste et ses questions (opts.question absent), ou une seule question
  // (la page : opts.question ; la croix ou un enregistrement la ferme). opts.surMaj(etat) après chaque enregistrement.
  function feuille(opts) {
    const etat = opts.etat, suite = opts.suite || null;
    // Suite : on commence par la première question qui manque ; chacune, enregistrée, passe à la suivante qui manque.
    const seule = opts.question || (suite ? (suite.find(k => !faiteDe(k, etat.mesures, etat.entrainement)) || suite[0]) : null);
    let courante = seule;
    const voile = document.createElement('div');
    voile.className = 'mc-voile';
    // Petite feuille, comme les saisies rapides de Nutrition : 30 rem de large. Une seule question (page Mon profil) : hauteur
    // selon le contenu (sur téléphone, elle monte du bas) ; liste ou suite de questions : hauteur fixe, le contenu glisse.
    voile.innerHTML = '<div class="mc-panneau mc-etroit ' + (opts.question ? 'mc-court' : 'mc-ecrans') + ' ps-profil" role="dialog" aria-modal="true" aria-labelledby="ps-titre" tabindex="-1"><div class="mc-corps"></div></div>';
    const corps = voile.querySelector('.mc-corps');
    document.body.appendChild(voile);
    document.documentElement.classList.add('mc-ouvert');
    const fermer = () => { voile.remove(); document.documentElement.classList.remove('mc-ouvert'); document.removeEventListener('keydown', clavier); };
    const clavier = e => { if (e.key === 'Escape' && !document.querySelector('.mrt-dialogue, .cal-voile')) fermer(); };
    document.addEventListener('keydown', clavier);
    voile.addEventListener('mousedown', e => { if (e.target === voile) fermer(); });
    const msg = () => corps.querySelector('.ps-msg');
    const m = () => etat.mesures || {}, e = () => etat.entrainement || {};
    // Après un enregistrement : la liste (feuille), ou la feuille fermée (page).
    const apres = () => {
      if (opts.surMaj) opts.surMaj(etat);
      if (suite) { const i = suite.indexOf(courante), k = suite.slice(i + 1).concat(suite.slice(0, i)).find(x => !faiteDe(x, m(), e())); return k ? question(k) : fermer(); }
      if (seule) fermer(); else liste();
    };
    const garder = async (table, champs) => { if (await ranger(etat, table, champs)) apres(); else msg().textContent = 'Enregistrement impossible pour l\'instant.'; };
    // Barre du haut : « ‹ » (retour à la liste, feuille seulement) à gauche dans une question, la croix à droite ; dessous, le titre en libellé.
    // Avec « valider » (Ma semaine), comme les autres fenêtres de saisie du site : « Annuler » à gauche, « Enregistrer » à droite.
    const barre = (titre, retour, valider) => '<div class="pc-barre ps-profil-barre">' +
      (valider ? '<button type="button" class="mrt-btn" data-q="' + (seule ? 'fermer' : 'liste') + '">Annuler</button><button type="button" class="mrt-btn is-principal" data-enregistrer>Enregistrer</button>' :
        (retour && !seule ? '<button type="button" class="mrt-rond" data-q="liste" aria-label="Retour à la liste" title="Retour">' + window.mrtIcone.gauche + '</button>' : '<span></span>') +
        '<button type="button" class="mrt-rond is-fermer" data-fermer aria-label="Fermer" title="Fermer">' + window.mrtIcone.fermer + '</button>') + '</div>' +
      '<p class="fc-libelle" id="ps-titre">' + titre + (suite && suite.includes(courante) ? '<span class="ps-etape"> · ' + (suite.indexOf(courante) + 1) + ' sur ' + suite.length + '</span>' : '') + '</p><p class="ps-msg" role="alert"></p>';

    // Glissement du contenu (ordinateur seulement, voir modale-course.css) : vers une question par la droite, retour à la liste par la gauche.
    let ecran = seule ? 'question' : 'liste';
    const glisse = sens => { corps.classList.remove('mc-glisse-avant', 'mc-glisse-retour'); void corps.offsetWidth; corps.classList.add('mc-glisse-' + sens); };
    const versQuestion = () => { if (ecran === 'liste') glisse('avant'); ecran = 'question'; };
    function liste() {
      if (ecran === 'question') glisse('retour');
      ecran = 'liste';
      corps.innerHTML = barre('Mon profil', false) + listeHtml(etat);
    }
    // Une question à choix : un toucher enregistre.
    function choix(cle, titre) {
      versQuestion();
      corps.innerHTML = barre(titre, true) + '<div class="ps-groupe-l">' + echelle(cle).map(([k, lib]) =>
        '<button type="button" class="ps-choix' + (String((TABLE[cle] === 'mesures' ? m() : e())[cle]) === String(k) ? ' is-on' : '') + '" data-val="' + esc(k) + '">' + esc(lib) + '<i aria-hidden="true">✓</i></button>').join('') + '</div>';
      corps.querySelectorAll('[data-val]').forEach(b => b.addEventListener('click', () =>
        garder(TABLE[cle] || 'entrainement', { [cle]: cle === 'seance_max_min' ? Number(b.dataset.val) : b.dataset.val })));
    }
    // Un champ et « Enregistrer » : un nombre, une date, un texte.
    function champ(cle, titre, type) {
      versQuestion();
      const n = NOMBRES[cle], src = (TABLE[cle] === 'mesures' ? m() : e())[cle];
      const entree = type === 'date' ? '<input class="mrt-champ" type="date" name="valeur" value="' + esc(src || '') + '">'
        : type === 'texte' ? '<textarea class="mrt-champ" name="valeur" maxlength="300" rows="3" placeholder="ex. tendon d\'Achille gauche">' + esc(src || '') + '</textarea>'
        : '<input class="mrt-champ" name="valeur" inputmode="decimal" placeholder="' + n.ex + '" value="' + esc(virgule(src)) + '">';
      corps.innerHTML = barre(titre, true) + '<form class="ps-valeur" novalidate><label class="cal-champ"><span>' + titre + (n && n.unite ? ' (' + n.unite + ')' : '') + '</span>' + entree + '</label>' +
        '<button type="submit" class="mrt-btn is-principal">Enregistrer</button></form>';
      const f = corps.querySelector('form');
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const v = f.valeur.value;
        if (type === 'date') {
          const a = window.mrtBesoin ? window.mrtBesoin.age(v, iso(new Date())) : 30;
          if (!v || !a || a < 10 || a > 110) return void (msg().textContent = 'Cette date de naissance n\'est pas possible.');
          return garder('mesures', { naissance: v });
        }
        if (type === 'texte') return garder('entrainement', { [cle]: v.trim() || null });
        const x = nombre(v);
        if (x !== null && (Number.isNaN(x) || x < n.min || x > n.max || Math.abs(Math.round(x / n.pas) * n.pas - x) > 1e-9)) return void (msg().textContent = n.erreur);
        if (x === null && ligneDe(cle)[3]) return void (msg().textContent = n.erreur);
        garder(n.table, { [cle]: x });
      });
    }
    // Ma semaine : jours pour courir et pour le renforcement (cumulables), jour de la sortie longue, en pastilles ; nombres de
    // séances, un chiffre de 0 à 7. Gardés dans la feuille ; « Enregistrer » (en haut) les range, « Annuler » les abandonne.
    function semaine(brouillon) {
      versQuestion();
      const p0 = e(), b = brouillon || { jc: joursDe(p0, 'jours_course'), jr: joursDe(p0, 'jours_renfo'), jl: p0.jour_long || null, ns: p0.nb_sorties, nr: p0.nb_renfo };
      const pastille = (attr, val, on, lib) => '<button type="button" class="mrt-pastille" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + lib + '</button>';
      const q = (lib, html) => '<div class="ps-sem-q"><p class="cal-champ"><span>' + lib + '</span></p><div class="ps-coches">' + html + '</div></div>';
      const chiffre = (nom, lib, v) => '<label class="ps-sem-q ps-chiffre"><span>' + lib + '</span><input class="mrt-champ" name="' + nom + '" inputmode="numeric" maxlength="1" placeholder="0 à 7" value="' + (v == null ? '' : v) + '"></label>';
      const section = (titre, html) => '<section class="mrt-section"><h2 class="mrt-section-titre">' + titre + '</h2><div class="ps-groupe-l">' + html + '</div></section>';
      corps.innerHTML = barre('Ma semaine', true, true) +
        section('Course',
          q('Jours possibles', JOURS_COURTS.map((j, i) => pastille('data-jc', i + 1, b.jc.includes(i + 1), j)).join('')) +
          chiffre('nb_sorties', 'Séances par semaine', b.ns) +
          q('Sortie longue', (b.jc.length ? b.jc.map(n => pastille('data-long', n, b.jl === n, JOURS_COURTS[n - 1])).join('') : '') + pastille('data-long', 0, !b.jl, 'Peu importe'))) +
        section('Renforcement',
          q('Jours possibles', JOURS_COURTS.map((j, i) => pastille('data-jr', i + 1, b.jr.includes(i + 1), j)).join('')) +
          chiffre('nb_renfo', 'Séances par semaine', b.nr));
      const bascule = (l, n) => (l.includes(n) ? l.filter(x => x !== n) : l.concat([n]).sort((a, c) => a - c));
      const lire = () => corps.querySelectorAll('.ps-chiffre input').forEach(x => { const t = x.value.trim(); b[x.name === 'nb_sorties' ? 'ns' : 'nr'] = t === '' ? null : t; });
      corps.querySelectorAll('button[data-jc], button[data-jr], button[data-long]').forEach(btn => btn.addEventListener('click', () => {
        lire();
        const d = btn.dataset;
        if (d.jc) { b.jc = bascule(b.jc, Number(d.jc)); if (b.jl && !b.jc.includes(b.jl)) b.jl = null; }
        if (d.jr) b.jr = bascule(b.jr, Number(d.jr));
        if (d.long) b.jl = Number(d.long) || null;
        semaine(b);
      }));
      corps.querySelector('[data-enregistrer]').addEventListener('click', () => {
        lire();
        if ([b.ns, b.nr].some(t => t !== null && !/^[0-7]$/.test(t))) { msg().textContent = 'Un chiffre de 0 à 7.'; return; }
        msg().textContent = '';
        garder('entrainement', { jours_course: b.jc, jours_renfo: b.jr, jour_long: b.jl, nb_sorties: b.ns === null ? null : Number(b.ns), nb_renfo: b.nr === null ? null : Number(b.nr) });
      });
    }
    // Repère d'allure : son type, puis sa valeur (« Je ne sais pas » : enregistré aussitôt).
    function allure(type) {
      versQuestion();
      const t = type || e().allure_type;
      const saisie = t === 'vma' ? ['VMA (km/h)', virgule(e().vma), 'ex. 15,5', 'decimal'] : t === '10km' ? ['Temps sur 10 km', enTemps(e().temps_10km_s), 'ex. 45:30', 'text'] :
        t === 'semi' ? ['Temps sur semi-marathon', enTemps(e().temps_semi_s), 'ex. 1:42:00', 'text'] : null;
      corps.innerHTML = barre('Repère d\'allure', true) + '<div class="ps-groupe-l">' + ECHELLES.allure_type.map(([k, lib]) =>
        '<button type="button" class="ps-choix' + (t === k ? ' is-on' : '') + '" data-type="' + k + '">' + lib + '<i aria-hidden="true">✓</i></button>').join('') + '</div>' +
        (saisie ? '<form class="ps-valeur" novalidate><label class="cal-champ"><span>' + saisie[0] + '</span><input class="mrt-champ" name="valeur" inputmode="' + saisie[3] + '" placeholder="' + saisie[2] + '" value="' + esc(saisie[1]) + '"></label>' +
          '<button type="submit" class="mrt-btn is-principal">Enregistrer</button></form>' : '');
      corps.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.type === 'inconnu') garder('entrainement', { allure_type: 'inconnu' }); else allure(b.dataset.type);
      }));
      const f = corps.querySelector('.ps-valeur');
      if (f) {
        f.valeur.focus();
        f.addEventListener('submit', ev => {
          ev.preventDefault();
          if (t === 'vma') {
            const x = nombre(f.valeur.value);
            if (x === null || Number.isNaN(x) || x < 8 || x > 30) return void (msg().textContent = 'La VMA doit être comprise entre 8 et 30 km/h.');
            garder('entrainement', { allure_type: 'vma', vma: x });
          } else {
            const x = secondes(f.valeur.value), [a, b2] = t === '10km' ? [1200, 7200] : [3000, 14400];
            if (x === null || Number.isNaN(x) || x < a || x > b2) return void (msg().textContent = t === '10km' ? 'Le temps sur 10 km s\'écrit 45:30 (entre 20:00 et 2:00:00).' : 'Le temps sur semi s\'écrit 1:42:00 (entre 50:00 et 4:00:00).');
            garder('entrainement', t === '10km' ? { allure_type: '10km', temps_10km_s: x } : { allure_type: 'semi', temps_semi_s: x });
          }
        });
      }
    }
    // Blessure en cours : où et quoi, depuis quand ; « Plus de blessure » l'efface (données de santé : visibles de l'utilisateur seul).
    function blessure() {
      versQuestion();
      corps.innerHTML = barre('Blessure en cours', true) + '<form class="ps-valeur" novalidate>' +
        '<label class="cal-champ"><span>Blessure</span><textarea class="mrt-champ" name="blessure" maxlength="300" rows="2" placeholder="ex. entorse de la cheville droite">' + esc(e().blessure || '') + '</textarea></label>' +
        '<label class="cal-champ"><span>Depuis le</span><input class="mrt-champ" type="date" name="debut" value="' + esc(e().blessure_debut || '') + '"></label>' +
        '<button type="submit" class="mrt-btn is-principal">Enregistrer</button>' + (e().blessure ? ' <button type="button" class="mrt-btn" data-guerie>Plus de blessure</button>' : '') + '</form>';
      const f = corps.querySelector('form');
      f.addEventListener('submit', ev => {
        ev.preventDefault();
        const t = f.blessure.value.trim(), d = f.debut.value || null;
        if (!t) return void (msg().textContent = 'Décris la blessure, ou touche « Plus de blessure ».');
        if (d && d > iso(new Date())) return void (msg().textContent = 'La date de début ne peut pas être dans le futur.');
        garder('entrainement', { blessure: t, blessure_debut: d });
      });
      const g = corps.querySelector('[data-guerie]');
      if (g) g.addEventListener('click', () => garder('entrainement', { blessure: null, blessure_debut: null }));
    }
    function question(k) {
      const l = ligneDe(k);
      if (!l) return;
      courante = k;
      if (l[4] === 'blessure') return blessure();
      if (l[4] === 'semaine') semaine(); else if (l[4] === 'allure') allure(); else if (l[4] === 'choix') choix(k, l[1]); else champ(k, l[1], l[4]);
    }
    corps.addEventListener('click', ev => {
      if (ev.target.closest('[data-fermer]')) return fermer();
      if (ev.target.closest('[data-reprendre]')) { const sg = duPalmares(etat); if (sg) garder('entrainement', sg.type === '10km' ? { allure_type: '10km', temps_10km_s: sg.s } : { allure_type: 'semi', temps_semi_s: sg.s }); return; }
      const q = ev.target.closest('[data-q]');
      if (!q) return;
      const k = q.dataset.q;
      if (k === 'fermer') fermer(); else if (k === 'liste') liste(); else question(k);
    });
    lireEntrainement(etat).then(() => {
      if (seule) question(seule); else liste();
      voile.querySelector('.mc-panneau').focus({ preventScroll: true });
    });
  }

  // La page : l'état du profil, puis la liste ; une ligne ouvre sa question dans la feuille ; « Reprendre » range le repère du Palmarès.
  async function page(el, etat) {
    if (etat.lectureSeule) { el.innerHTML = '<div class="mp-cadre"><p class="mp-vide">Le profil n\'est pas partagé.</p></div>'; return; }
    await lireEntrainement(etat);
    const dessiner = () => {
      const manque = tousManquants(etat.mesures, etat.entrainement);
      el.innerHTML = '<div class="mp-cadre"><p class="ps-profil-etat mp-etat' + (manque.length ? '' : ' is-complet') + '">' + (manque.length ? 'Profil à compléter : ' + manque.join(', ') + '.' : 'Profil complet.') + '</p>' +
        '<p class="ps-msg mp-msg" role="alert"></p>' + listeHtml(etat) + '</div>';
    };
    el.addEventListener('click', async ev => {
      if (ev.target.closest('[data-reprendre]')) {
        const sg = duPalmares(etat);
        if (sg && await ranger(etat, 'entrainement', sg.type === '10km' ? { allure_type: '10km', temps_10km_s: sg.s } : { allure_type: 'semi', temps_semi_s: sg.s })) dessiner();
        else if (sg) el.querySelector('.mp-msg').textContent = 'Enregistrement impossible pour l\'instant.';
        return;
      }
      const q = ev.target.closest('[data-q]');
      if (q) feuille({ etat, question: q.dataset.q, surMaj: dessiner });
    });
    dessiner();
    if (location.hash) { const z = el.querySelector(location.hash); if (z) z.scrollIntoView(); }
  }

  window.mrtProfil = { page, feuille, EXPRESS, expressFait, manquants, tousManquants, duPalmares, ECHELLES, libelleDe };
})();
