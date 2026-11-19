// ===== Mon plan : le parcours « Construire mon plan » =====
//
// docs/module-preparation-specification.md, § 5.0. Un écran par question, dans la page Mon plan elle-même (colonne de 40 rem) :
// ton plan, ta course (et le chevauchement de deux Objectifs), niveau, blessures, volume, repère d'allure, ma semaine, début,
// récapitulatif. Les questions du coureur s'enregistrent dans Mon profil (profil.js) dès la réponse ; le rôle et la durée
// ne s'écrivent qu'à « Construire mon plan ».
//   mrtParcours.nouveau(ctx)          état d'un parcours (ctx.parcours), à créer quand la page l'ouvre
//   mrtParcours.dessiner(root, ctx)   dessine l'écran en cours ; ctx.parcours.fin() et ctx.parcours.fermer() : voir plan-saison.js
// ctx : celui de renderSaison (courses, profil, id, mesures, edition, actualiser, lectureSeule).
(function () {
  const P = window.mrtPreparation, PR = () => window.mrtProfil;
  const { iso, parse, addDays, lundiDe, esc, roleDe, longue } = P;
  const auj = () => iso(new Date());
  // Le lundi d'un jour, ou le suivant : un plan commence toujours un lundi.
  const lundiSuivant = j => (lundiDe(j) === j ? j : addDays(lundiDe(j), 7));
  const semaines = (debut, jourJ) => Math.round((parse(lundiDe(jourJ)) - parse(debut)) / (7 * 86400000)) + 1;
  const ecartJours = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const nombreFr = n => String(n).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ROLE = { objectif: 'Objectif', preparatoire: 'Préparatoire', plaisir: 'Plaisir' };

  // ----- Les courses -----
  const aVenir = c => c.etat === 'a_venir' && !!c.date && c.date >= auj();
  const sousTitre = c => (c.date_approx ? 'date à préciser' : longue(c.date)) + (Number(c.distance) ? ' · ' + nombreFr(Number(c.distance)) + ' km' : '') +
    (Number(c.dplus) ? ' · ' + nombreFr(Number(c.dplus)) + ' m D+' : '');
  // Début de la saison d'une course pour n semaines ; sa fin : la fin de sa récupération.
  const debutDe = (c, n) => (n ? addDays(lundiDe(c.date), -7 * (n - 1)) : lundiDe(c.date));
  const finDe = c => addDays(c.date, P.joursRecup(c));
  const autresObjectifs = (ctx, x) => ctx.courses.filter(c => c.id !== x.id && c.statut === 'confirmee' && aVenir(c) && roleDe(c) === 'objectif');
  // Les Objectifs dont la saison chevauche celle de la course choisie (durée conseillée de son format) : § 2.
  function conflits(ctx, x) {
    const d = debutDe(x, x.prepaFormat || x.prepaSemaines), f = finDe(x);
    return autresObjectifs(ctx, x).filter(o => debutDe(o, o.prepaSemaines) <= f && d <= finDe(o)).sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  // Fourchette de distance d'une préparatoire pertinente avant un Objectif (§ 3.5) ; null : pas de règle (ultras : en attente).
  function fourchette(o) {
    const d = Number(o.distance) || 0;
    if (P.famille(o) === 'trail') return d >= 42 && d < 60 ? [21, 30] : null;
    return d >= 42 ? [21, 30] : d >= 21 ? [10, 15] : null;
  }
  // Rôle d'une course qui perd le rôle Objectif face à w : Préparatoire si les règles fixes le permettent, sinon Plaisir (§ 2, § 3.5).
  function rolePerdant(ctx, l, w) {
    if (l.date > w.date) return 'plaisir';
    const f = P.fenetreConseillee(w), r = fourchette(w), dist = Number(l.distance) || 0;
    if (!f || !r || P.famille(l) !== P.famille(w) || dist < r[0] || dist > r[1]) return 'plaisir';
    const sem = Math.floor(ecartJours(l.date, w.date) / 7);
    if (sem < f.min || sem > f.max) return 'plaisir';
    // Sans alerte en Préparatoire, w seul Objectif de la saison : l'avis le dit.
    const essai = Object.assign({}, ctx, { courses: ctx.courses.filter(c => c.id !== l.id && c.id !== w.id).map(c => (roleDe(c) === 'objectif' && c.date <= w.date && c.date >= l.date ? Object.assign({}, c, { role: 'plaisir' }) : c))
      .concat([Object.assign({}, w, { role: 'objectif', statut: 'confirmee' }), Object.assign({}, l, { role: 'preparatoire', statut: 'confirmee' })]) });
    const av = P.avisCourse(essai, Object.assign({}, l, { role: 'preparatoire', statut: 'confirmee' }));
    return av && av.niveau === 'conseillee' ? 'preparatoire' : 'plaisir';
  }
  // Une course en carte, comme sur la page Courses (sans lien ni inscription) : rôle et date complète, nom complet, lieu et format, distance.
  function carte(c, role, enCours) {
    const M = window.mrtCartes, dist = M.distance(c), info = M.lieuFormat(c);
    return '<article class="ob-carte sans-cpt pp-carte' + (enCours ? ' is-obj' : '') + '"><span class="ob-role' + (enCours ? ' is-obj' : '') + '">' + role + '</span><span class="ob-date">' + window.mrtFormat.date(c.date, { semaine: true }) + '</span>' +
      '<h3 class="ob-nom">' + M.nomHtml(c) + '</h3>' + (info ? '<p class="ob-info">' + esc(info) + '</p>' : '') +
      (dist ? '<div class="ob-lignes">' + M.ligne('Distance', '<span class="ob-val">' + esc(dist) + '</span>') + '</div>' : '') + '</article>';
  }
  const devient = (c, role) => esc(c.course) + ' devient ' + ROLE[role];

  // ----- Le parcours : la suite des écrans -----
  const PROFIL = ['niveau', 'blessures', 'volume', 'allure', 'semaine'];
  const TITRES = { plan: 'Ton plan', course: 'Ta course', conflit: 'Deux Objectifs se chevauchent', niveau: 'Ton niveau', blessures: 'Tes blessures', volume: 'Mon volume actuel',
    allure: 'Repère d\'allure', semaine: 'Ma semaine', debut: 'Début', recap: 'Récapitulatif' };
  const e = st => st.etat.entrainement || {};
  const semaineFaite = pr => !!PR().resumeCourse(pr) && PR().joursDe(pr, 'jours_course').length >= (pr.nb_sorties || 0);
  const FAIT = { niveau: pr => !!pr.niveau, blessures: pr => !!pr.antecedents, volume: pr => !!pr.volume_tranche && !!pr.sortie_tranche, allure: pr => PR().allureFaite(pr), semaine: semaineFaite };

  function nouveau(ctx) {
    return { pile: ['plan'], filtre: 'confirmees', etat: { id: ctx.id, mesures: ctx.mesures || {}, entrainement: ctx.profil || null, courses: ctx.courses }, sauter: null };
  }
  const course = (ctx, st) => ctx.courses.find(c => c.id === st.courseId) || null;
  function suite(ctx, st) {
    const x = course(ctx, st);
    return ['plan', 'course'].concat(x && conflits(ctx, x).length ? ['conflit'] : [], PROFIL.filter(k => !(st.sauter || []).includes(k)), ['debut', 'recap']);
  }
  const courant = st => st.pile[st.pile.length - 1];
  function aller(st, k) { st.msg = ''; st.detail = false; st.pile.push(k); }
  function suivant(ctx, st) {
    if (st.depuisRecap && courant(st) !== 'recap') { st.depuisRecap = false; return aller(st, 'recap'); }
    const s = suite(ctx, st), i = s.indexOf(courant(st));
    aller(st, s[Math.min(i + 1, s.length - 1)]);
  }

  // Les courses de la saison après « Construire mon plan » : celles qui changent de rôle avec la course choisie (§ 2).
  function changements(ctx, st, x) {
    const cs = conflits(ctx, x);
    return st.garder ? [] : cs.map(o => ({ course: o, role: rolePerdant(ctx, o, x) }));
  }

  // Écran « Début » : les départs possibles (§ 5.0, écran 8).
  function departs(ctx, st, x) {
    const ch = changements(ctx, st, x), restent = autresObjectifs(ctx, x).filter(o => !ch.some(k => k.course.id === o.id) && o.date < x.date).sort((a, b) => (a.date < b.date ? 1 : -1));
    const avant = restent[0] || null, lundi = lundiSuivant(auj());
    const mini = avant ? lundiSuivant(addDays(finDe(avant), 1)) : lundi;
    const des = mini > lundi ? mini : lundi, n = x.prepaFormat, conseil = n ? debutDe(x, n) : null;
    const opts = [];
    // « Plan de 16 semaines », dessous la date de départ, rien de plus ; la durée conseillée porte « Recommandée ».
    const plan = (mode, k, debut, reco) => ({ mode, n: k, debut, reco, titre: 'Plan de ' + k + (k > 1 ? ' semaines' : ' semaine'), sous: 'à partir du ' + longue(debut) });
    if (conseil && conseil >= des) {
      opts.push(plan('conseillee', n, conseil, true));
      if (des < conseil) opts.push(plan('lundi', semaines(des, x.date), des));
    } else opts.push(plan('lundi', semaines(des, x.date), des));
    opts.push({ mode: 'perso', titre: 'Personnaliser', sous: 'Régler les phases semaine par semaine' });
    return opts;
  }

  // ----- Les écrans -----
  const choix = (attr, val, on, html, desactive) => '<button type="button" class="ps-choix' + (on ? ' is-on' : '') + '" ' + attr + '="' + esc(val) + '"' + (desactive ? ' disabled' : '') + '>' + html + '<i aria-hidden="true">✓</i></button>';
  const texte = (t, sous) => (sous ? '<span class="ps-choix-t"><span>' + t + '</span><small>' + sous + '</small></span>' : t);
  const pastille = (attr, val, on, lib) => '<button type="button" class="mrt-pastille" ' + attr + '="' + esc(val) + '" aria-pressed="' + on + '">' + lib + '</button>';
  const continuer = '<div class="pp-pied"><button type="button" class="mrt-btn is-principal" data-pp="continuer">Continuer</button></div>';

  function ecran(ctx, st) {
    const k = courant(st), pr = e(st), x = course(ctx, st), PRf = PR();
    if (k === 'plan') return '<div class="ps-groupe-l">' + choix('data-plan', 'course', false, 'Une course ou un trail') +
      '<button type="button" class="ps-choix pp-bientot" disabled><span>Me maintenir en forme</span><small>Bientôt</small></button></div>';
    if (k === 'course') {
      const cs = ctx.courses.filter(c => aVenir(c) && (st.filtre === 'toutes' ? ['confirmee', 'option', 'a_surveiller'].includes(c.statut) : c.statut === 'confirmee')).sort((a, b) => (a.date < b.date ? -1 : 1));
      return '<div class="pp-tete"><div class="ps-coches">' + pastille('data-filtre', 'confirmees', st.filtre !== 'toutes', 'Confirmées') + pastille('data-filtre', 'toutes', st.filtre === 'toutes', 'Toutes') + '</div>' +
        (ctx.edition ? '<button type="button" class="ob-ajout mrt-btn is-principal" data-pp="ajouter" title="Ajouter une course"><svg class="ob-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span class="ob-ajout-long">Ajouter une course</span><span class="ob-ajout-court">Course</span></button>' : '') + '</div>' +
        (cs.length ? '<div class="ps-groupe-l">' + cs.map(c => choix('data-course', c.id, c.id === st.courseId,
          texte('<b>' + esc(c.course) + '</b>' + (roleDe(c) === 'objectif' && c.statut === 'confirmee' ? ' <span class="pp-role">Objectif</span>' : ''), sousTitre(c)))).join('') + '</div>'
          : '<p class="pp-vide">' + (st.filtre === 'toutes' ? 'Aucune course à venir.' : 'Aucune course confirmée à venir.') + '</p>');
    }
    if (k === 'conflit') {
      // L'alerte, puis deux colonnes : l'Objectif en cours (ou ceux), la course choisie ; sous chacune, son bouton et ce que devient l'autre.
      const cs = conflits(ctx, x), w = cs.find(o => o.date > x.date) || null, rx = w ? rolePerdant(ctx, x, w) : 'plaisir', plus = cs.length > 1;
      const colonne = (cartes, act, lib, suite) => '<div class="pp-c-col">' + cartes + '<button type="button" class="mrt-btn is-actif" data-conflit="' + act + '">' + lib + '</button><p class="pp-note">' + suite + '</p></div>';
      return '<p class="pp-alerte" role="alert">' + window.mrtIcone.attention + 'Attention : deux Objectifs se chevauchent</p><div class="pp-conflit">' +
        colonne(cs.map(o => carte(o, 'Objectif en cours', true)).join(''), 'garder', plus ? 'Garder les Objectifs en cours' : 'Garder l\'Objectif en cours', devient(x, rx)) +
        colonne(carte(x, 'Nouvel Objectif', false), 'prendre', plus ? 'Remplacer les Objectifs en cours' : 'Remplacer l\'Objectif en cours', cs.map(o => devient(o, rolePerdant(ctx, o, x))).join(' · ')) + '</div>';
    }
    if (k === 'niveau') return '<div class="ps-groupe-l">' + PRf.ECHELLES.niveau.map(([v, lib]) => choix('data-val', v, pr.niveau === v, PRf.choixTexte('niveau', v, lib))).join('') + '</div>';
    if (k === 'blessures') {
      const det = st.detail, bz = st.bless || { fragiles: pr.fragiles || '', blessure: pr.blessure || '', debut: pr.blessure_debut || '' };
      return '<div class="ps-groupe-l">' + PRf.ECHELLES.antecedents.map(([v, lib]) => choix('data-antecedent', v, pr.antecedents === v, PRf.choixTexte('antecedents', v, lib))).join('') + '</div>' +
        (det ? '<form class="ps-valeur pp-form" novalidate><label class="cal-champ"><span>Où ?</span><textarea class="mrt-champ" name="fragiles" maxlength="300" rows="2" placeholder="ex. tendon d\'Achille gauche">' + esc(bz.fragiles) + '</textarea></label>' +
          '<label class="cal-champ"><span>Blessure en cours</span><textarea class="mrt-champ" name="blessure" maxlength="300" rows="2" placeholder="ex. entorse de la cheville droite">' + esc(bz.blessure) + '</textarea></label>' +
          '<label class="cal-champ"><span>Depuis le</span><input class="mrt-champ" type="date" name="debut" value="' + esc(bz.debut) + '"></label></form>' + continuer : '');
    }
    if (k === 'volume') {
      const grp = (cle, lib) => '<div class="ps-sem-q"><p class="cal-champ"><span>' + lib + '</span></p><div class="ps-coches">' + PRf.ECHELLES[cle].map(([v, l]) => pastille('data-vol', cle + '|' + v, pr[cle] === v, l)).join('') + '</div></div>';
      return '<div class="ps-groupe-l">' + grp('volume_tranche', 'Distance moyenne par semaine') + grp('sortie_tranche', 'Plus longue sortie récente') + '</div>';
    }
    if (k === 'allure') {
      const t = st.allure || pr.allure_type || null, champ = PRf.CHAMP_TEMPS[t];
      const val = st.allureVal != null ? st.allureVal : t === 'vma' ? PRf.virgule(pr.vma) : champ ? PRf.enTemps(pr[champ]) : '';
      const LIB = [['vma', 'VMA'], ['10km', '10 km'], ['semi', 'Semi'], ['marathon', 'Marathon'], ['inconnu', 'Je ne sais pas']];
      return '<div class="ps-coches pp-types">' + LIB.map(([v, l]) => pastille('data-allure', v, t === v, l)).join('') + '</div>' +
        (t && t !== 'inconnu' ? '<form class="ps-valeur pp-form" novalidate><label class="cal-champ"><span>' + (t === 'vma' ? 'VMA (km/h)' : 'Temps') + '</span><input class="mrt-champ" name="valeur" inputmode="' + (t === 'vma' ? 'decimal' : 'text') +
          '" placeholder="' + (t === 'vma' ? 'ex. 15,5' : t === '10km' ? 'ex. 45:30' : t === 'semi' ? 'ex. 1:42:00' : 'ex. 3:45:00') + '" value="' + esc(val) + '"></label>' +
          (st.palmares && st.palmares.type === t ? '<p class="pp-note">Palmarès · ' + window.mrtFormat.date(st.palmares.course.date, { annee: true }) + '</p>' : '') + '</form>' +
          '<p class="pp-note">Ton niveau d\'aujourd\'hui, pas un ancien record.</p>' + continuer : '');
    }
    if (k === 'semaine') {
      const b = st.sem || (st.sem = { jc: PRf.joursDe(pr, 'jours_course'), ns: pr.nb_sorties == null ? '' : String(pr.nb_sorties), jl: pr.jour_long || null });
      const q = (lib, html) => '<div class="ps-sem-q"><p class="cal-champ"><span>' + lib + '</span></p><div class="ps-coches">' + html + '</div></div>';
      return '<section class="mrt-section"><h2 class="mrt-section-titre">Course</h2><div class="ps-groupe-l">' +
        q('Jours possibles', PRf.JOURS_COURTS.map((j, i) => pastille('data-jc', i + 1, b.jc.includes(i + 1), j)).join('')) +
        '<label class="ps-sem-q ps-chiffre"><span>Séances maximum par semaine</span><input class="mrt-champ" name="nb_sorties" inputmode="numeric" maxlength="1" placeholder="1 à 7" value="' + esc(b.ns) + '"></label>' +
        q('Sortie longue', b.jc.map(n => pastille('data-long', n, b.jl === n, PRf.JOURS_COURTS[n - 1])).join('') + pastille('data-long', 0, !b.jl, 'Peu importe')) + '</div></section>' + continuer;
    }
    if (k === 'debut') return '<div class="ps-groupe-l">' + departs(ctx, st, x).map((o, i) => choix('data-debut', i, st.debut && st.debut.mode === o.mode,
      texte(o.titre + (o.reco ? ' <span class="pp-role">Recommandée</span>' : ''), o.sous))).join('') + '</div>';
    // Récapitulatif : une ligne par réponse, chacune ramène à son écran.
    const d = st.debut || {};
    const lignes = [['niveau', 'Niveau', PRf.libelleDe('niveau', pr.niveau)], ['blessures', 'Blessures', PRf.libelleDe('antecedents', pr.antecedents)],
      ['volume', 'Volume', pr.volume_tranche && pr.sortie_tranche ? PRf.libelleDe('volume_tranche', pr.volume_tranche) + ' · ' + PRf.libelleDe('sortie_tranche', pr.sortie_tranche) : null],
      ['allure', 'Repère d\'allure', PRf.resumeAllure(pr)], ['semaine', 'Ma semaine', PRf.resumeCourse(pr)],
      ['debut', 'Début', d.mode === 'perso' ? 'Personnalisé' : d.debut ? longue(d.debut) + ' · ' + d.n + (d.n > 1 ? ' semaines' : ' semaine') : null]];
    const cs = changements(ctx, st, x);
    return '<h2 class="ps-titre">' + esc(x.course) + '</h2><p class="ps-sous">' + longue(x.date) + (d.n ? ' · ' + d.n + (d.n > 1 ? ' semaines' : ' semaine') : '') + (Number(x.distance) ? ' · ' + nombreFr(Number(x.distance)) + ' km' : '') + '</p>' +
      (cs.length ? '<p class="pp-note">' + cs.map(c => devient(c.course, c.role)).join(' · ') + '</p>' : '') +
      '<div class="ps-groupe-l pp-recap">' + lignes.map(([q, lib, r]) => '<button type="button" class="ps-ligne-q" data-recap="' + q + '"><span>' + lib + '</span><span class="ps-rep' + (r ? '' : ' is-a-faire') + '">' + esc(r || 'À renseigner') + '</span><i aria-hidden="true">›</i></button>').join('') + '</div>' +
      '<div class="pp-pied"><button type="button" class="mrt-btn is-principal" data-pp="construire"' + (st.encours ? ' disabled' : '') + '>' + (st.encours ? 'Construction en cours…' : 'Construire mon plan') + '</button></div>';
  }

  function dessiner(root, ctx) {
    const st = ctx.parcours;
    // Les questions déjà répondues sont sautées : décidé une fois, au premier dessin où le profil est connu.
    if (!st.sauter) {
      if (ctx.profil === undefined) { root.innerHTML = '<div class="pp"></div>'; return; }
      st.etat.entrainement = ctx.profil;
      st.sauter = PROFIL.filter(k => FAIT[k](ctx.profil || {}));
    }
    st.etat.courses = ctx.courses;
    // Une course dont la date vient d'être précisée : elle est choisie, le parcours continue.
    if (st.attenteDate) {
      const c = ctx.courses.find(x => x.id === st.attenteDate);
      if (c && !c.date_approx) { st.attenteDate = null; st.courseId = c.id; suivant(ctx, st); }
    }
    // Une course ajoutée depuis l'écran « Ta course » : elle est choisie, le parcours continue.
    if (st.avantAjout) {
      const nv = ctx.courses.find(c => !st.avantAjout.includes(c.id) && aVenir(c));
      st.avantAjout = null;
      if (nv) { st.courseId = nv.id; suivant(ctx, st); }
    }
    const k = courant(st), s = suite(ctx, st), i = Math.max(0, s.indexOf(k)), pct = Math.round(100 * i / (s.length - 1));
    // Repère d'allure : un résultat du Palmarès de moins de 12 mois, prérempli (la première fois, s'il n'y a pas encore de repère).
    if (k === 'allure' && st.palmares === undefined) {
      st.palmares = PR().duPalmares(st.etat) || null;
      if (st.palmares && !PR().allureFaite(e(st))) { st.allure = st.palmares.type; st.allureVal = PR().enTemps(st.palmares.s); }
    }
    const fermable = ctx.courses.some(c => c.statut === 'confirmee' && aVenir(c) && roleDe(c) === 'objectif');
    root.innerHTML = '<div class="pp" data-ecran="' + k + '"><div class="pp-barre">' +
      (st.pile.length > 1 ? '<button type="button" class="mrt-rond" data-pp="retour" aria-label="Écran précédent" title="Retour">' + window.mrtIcone.gauche + '</button>' : '<span class="pp-place"></span>') +
      '<span class="pp-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></span>' +
      (fermable ? '<button type="button" class="mrt-rond is-fermer" data-pp="fermer" aria-label="Fermer" title="Fermer">' + window.mrtIcone.fermer + '</button>' : '<span class="pp-place"></span>') + '</div>' +
      (k === 'conflit' ? '' : '<p class="fc-libelle">' + TITRES[k] + '</p>') + '<p class="ps-msg" role="alert">' + esc(st.msg || '') + '</p>' + ecran(ctx, st) + '</div>';
    const champ = root.querySelector('.pp-form [name]');
    if (champ && k === 'allure') champ.focus({ preventScroll: true });
  }

  // ----- Les réponses -----
  async function ranger(ctx, st, champs) {
    if (!(await PR().ranger(st.etat, 'entrainement', champs))) { st.msg = 'Enregistrement impossible pour l\'instant.'; return false; }
    ctx.profil = st.etat.entrainement;
    st.msg = '';
    return true;
  }

  function brancher(root, ctx) {
    if (root.__parcours) return;
    root.__parcours = true;
    const redessiner = () => ctx.redessiner();
    // Les champs d'une semaine : relus avant chaque redessin (le chiffre tapé reste).
    const lireSemaine = st => { const n = root.querySelector('.pp [name="nb_sorties"]'); if (n && st.sem) st.sem.ns = n.value.trim(); };
    root.addEventListener('input', ev => { const st = ctx.parcours; if (st && ev.target.name === 'valeur') st.allureVal = ev.target.value; });
    root.addEventListener('click', async ev => {
      const st = ctx.parcours;
      if (!st || !ev.target.closest('.pp')) return;
      const t = ev.target, b = sel => t.closest(sel), x = course(ctx, st), PRf = PR();
      const act = b('[data-pp]') && b('[data-pp]').dataset.pp;
      if (act === 'retour') { lireSemaine(st); st.pile.pop(); st.msg = ''; st.detail = false; st.depuisRecap = false; return redessiner(); }
      if (act === 'fermer') { ctx.parcours = null; return redessiner(); }
      if (b('[data-plan]')) { aller(st, 'course'); return redessiner(); }
      if (b('[data-filtre]')) { st.filtre = b('[data-filtre]').dataset.filtre; return redessiner(); }
      if (act === 'ajouter' && ctx.edition) { st.avantAjout = ctx.courses.map(c => c.id); return ctx.edition.ajouter({ defauts: { statut: 'confirmee' } }); }
      if (b('[data-course]') && ctx.edition && (ctx.courses.find(c => c.id === b('[data-course]').dataset.course) || {}).date_approx) {
        // Seul le mois est connu : la fiche de la course s'ouvre pour préciser la date ; enregistrée, la course est choisie.
        st.attenteDate = b('[data-course]').dataset.course; return ctx.edition.modifier(st.attenteDate);
      }
      if (b('[data-course]')) { const id = b('[data-course]').dataset.course; if (id !== st.courseId) { st.debut = null; st.garder = false; } st.courseId = id; suivant(ctx, st); return redessiner(); }
      if (b('[data-conflit]')) {
        if (b('[data-conflit]').dataset.conflit === 'prendre') { st.garder = false; suivant(ctx, st); return redessiner(); }
        // Garder l'autre Objectif : la course choisie prend son rôle aussitôt, retour au plan.
        const cs = conflits(ctx, x), w = cs.find(o => o.date > x.date) || null, r = w ? rolePerdant(ctx, x, w) : 'plaisir';
        const { error } = await window.mrtSupabase.from('courses').update({ role: r }).eq('id', x.id);
        if (error) { console.warn(error); st.msg = 'Enregistrement impossible pour l\'instant.'; return redessiner(); }
        ctx.parcours = null;
        return ctx.actualiser();
      }
      if (b('[data-val]') && courant(st) === 'niveau') { if (await ranger(ctx, st, { niveau: b('[data-val]').dataset.val })) suivant(ctx, st); return redessiner(); }
      if (b('[data-antecedent]')) {
        const v = b('[data-antecedent]').dataset.antecedent;
        if (!(await ranger(ctx, st, { antecedents: v }))) return redessiner();
        if (v === 'legeres' || v === 'frequentes') { st.detail = true; return redessiner(); }
        suivant(ctx, st); return redessiner();
      }
      if (act === 'continuer' && courant(st) === 'blessures') {
        const f = root.querySelector('.pp-form'), bl = f.blessure.value.trim(), d = f.debut.value || null;
        st.bless = { fragiles: f.fragiles.value, blessure: f.blessure.value, debut: f.debut.value }; // gardé si le message redessine l'écran
        if (d && !bl) { st.msg = 'Décris la blessure, ou laisse la date vide.'; return redessiner(); }
        if (d && d > auj()) { st.msg = 'La date de début ne peut pas être dans le futur.'; return redessiner(); }
        if (await ranger(ctx, st, { fragiles: f.fragiles.value.trim() || null, blessure: bl || null, blessure_debut: bl ? d : null })) { st.bless = null; suivant(ctx, st); }
        return redessiner();
      }
      if (b('[data-vol]')) {
        const [cle, v] = b('[data-vol]').dataset.vol.split('|');
        if (await ranger(ctx, st, { [cle]: v }) && FAIT.volume(e(st))) suivant(ctx, st); // les deux choisies : la suite
        return redessiner();
      }
      if (act === 'continuer' && courant(st) === 'volume') { if (FAIT.volume(e(st))) suivant(ctx, st); else st.msg = 'Choisis la distance et la plus longue sortie.'; return redessiner(); }
      if (b('[data-allure]')) {
        const v = b('[data-allure]').dataset.allure;
        if (v === 'inconnu') { if (await ranger(ctx, st, { allure_type: 'inconnu' })) suivant(ctx, st); return redessiner(); }
        st.allure = v; st.allureVal = st.palmares && st.palmares.type === v ? PRf.enTemps(st.palmares.s) : null; st.msg = '';
        return redessiner();
      }
      if (act === 'continuer' && courant(st) === 'allure') {
        const tp = st.allure || e(st).allure_type, v = root.querySelector('.pp-form [name="valeur"]').value;
        if (tp === 'vma') {
          const n = PRf.nombre(v);
          if (n === null || Number.isNaN(n) || n < 8 || n > 30) { st.msg = 'La VMA doit être comprise entre 8 et 30 km/h.'; return redessiner(); }
          if (await ranger(ctx, st, { allure_type: 'vma', vma: n })) suivant(ctx, st);
        } else {
          const s = PRf.secondes(v), [mi, ma, err] = PRf.BORNES_TEMPS[tp];
          if (s === null || Number.isNaN(s) || s < mi || s > ma) { st.msg = err; return redessiner(); }
          if (await ranger(ctx, st, { allure_type: tp, [PRf.CHAMP_TEMPS[tp]]: s })) suivant(ctx, st);
        }
        st.allureVal = null;
        return redessiner();
      }
      if (b('[data-jc], [data-long]') && st.sem) {
        lireSemaine(st);
        const d = b('[data-jc], [data-long]').dataset;
        if (d.jc) { const n = Number(d.jc); st.sem.jc = st.sem.jc.includes(n) ? st.sem.jc.filter(y => y !== n) : st.sem.jc.concat([n]).sort((p, q) => p - q); if (st.sem.jl && !st.sem.jc.includes(st.sem.jl)) st.sem.jl = null; }
        if (d.long != null) st.sem.jl = Number(d.long) || null;
        return redessiner();
      }
      if (act === 'continuer' && courant(st) === 'semaine') {
        lireSemaine(st);
        const sm = st.sem;
        if (!/^[1-7]$/.test(sm.ns)) { st.msg = 'Un chiffre de 1 à 7.'; return redessiner(); }
        if (sm.jc.length < Number(sm.ns)) { st.msg = 'Choisis au moins ' + sm.ns + ' jours.'; return redessiner(); }
        if (await ranger(ctx, st, { jours_course: sm.jc, nb_sorties: Number(sm.ns), jour_long: sm.jl })) { st.sem = null; suivant(ctx, st); }
        return redessiner();
      }
      if (b('[data-debut]')) { st.debut = departs(ctx, st, x)[Number(b('[data-debut]').dataset.debut)]; suivant(ctx, st); return redessiner(); }
      if (b('[data-recap]')) { const q = b('[data-recap]').dataset.recap; st.depuisRecap = true; aller(st, q); return redessiner(); }
      if (act === 'construire') return construire(ctx, st, x);
    });
  }

  // « Construire mon plan » : le rôle Objectif (Confirmée), le rôle des courses qui chevauchent, la durée ; puis la page et l'IA.
  async function construire(ctx, st, x) {
    const pr = e(st);
    const manque = ['niveau', 'blessures', 'volume', 'allure', 'semaine'].find(k => !FAIT[k](pr));
    if (manque) { st.msg = 'Il manque une réponse : ' + TITRES[manque].toLowerCase() + '.'; return ctx.redessiner(); }
    if (!st.debut) { st.msg = 'Choisis le début du plan.'; return ctx.redessiner(); }
    st.encours = true; ctx.redessiner();
    const sb = window.mrtSupabase, d = st.debut;
    const maj = [sb.from('courses').update({ role: 'objectif', statut: 'confirmee', groupe_options: x.statut === 'option' ? null : x.groupe_options || null,
      prepa_semaines: d.mode === 'lundi' && d.n !== x.prepaFormat ? d.n : null }).eq('id', x.id)]
      .concat(changements(ctx, st, x).map(c => sb.from('courses').update({ role: c.role }).eq('id', c.course.id)));
    const res = await Promise.all(maj), err = res.find(r => r.error);
    if (err) { console.warn(err.error); st.encours = false; st.msg = 'Enregistrement impossible pour l\'instant.'; return ctx.redessiner(); }
    ctx.parcours = null;
    await ctx.actualiser();
    // « Personnaliser » : la fenêtre « Régler les phases » de l'Objectif ; sinon l'IA propose le premier bloc.
    if (d.mode === 'perso') return P.ouvrirPreparer(ctx, x.id);
    if (ctx.proposer) ctx.proposer();
  }

  window.mrtParcours = { nouveau, dessiner: (root, ctx) => { brancher(root, ctx); dessiner(root, ctx); }, conflits, rolePerdant, departs };
})();
