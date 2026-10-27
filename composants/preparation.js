// ===== Préparation d'une course : plan, phases, séances =====
//
// Composant partagé par le Calendrier (vue 4 semaines) et la page d'une course
// (rubrique Préparation) : docs/module-calendrier-specification.md, § 4 et 5.
//   ctx.courses       courses de l'utilisateur (donnees.js)
//   ctx.seances       séances saisies à la main
//   ctx.semaines      semaines dont la phase a été modifiée à la main
//   ctx.lectureSeule  site partagé : rien ne se saisit ni ne se modifie
//   ctx.relire()      relit les données, rend { courses, seances, semaines }
//   ctx.actualiser()  relit puis redessine la page (fourni par la page)
(function () {
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const PHASES = [['base', 'Base'], ['developpement', 'Développement'], ['affutage', 'Affûtage'], ['deload', 'Deload']];
  const NOM_PHASE = Object.fromEntries(PHASES);
  const TYPES = { run: 'Run', renfo: 'Renfo' };

  // Dates en heure locale, au format 'AAAA-MM-JJ' : comparables comme du texte.
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const lundiDe = s => addDays(s, -((parse(s).getDay() + 6) % 7));
  const jourCourt = s => JOURS[parse(s).getDay()] + ' ' + parse(s).getDate();
  const dateCourte = s => parse(s).getDate() + ' ' + MOIS[parse(s).getMonth()];
  const longue = s => JOURS[parse(s).getDay()] + ' ' + parse(s).getDate() + ' ' + MOIS[parse(s).getMonth()] + ' ' + parse(s).getFullYear();
  const courte = s => parse(s).getDate() + ' ' + MOIS[parse(s).getMonth()] + ' ' + parse(s).getFullYear();
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const famille = c => (c.type === 'trail' ? 'trail' : 'route');
  // Curseurs : le bouton qui règle le plan.
  const REGLAGES = '<svg class="cal-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5h12M2 11.5h12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="4.5" r="2" fill="currentColor"/><circle cx="6" cy="11.5" r="2" fill="currentColor"/></svg>';
  // Page d'une course, à la rubrique Préparation.
  const lienCourse = id => 'course.html?id=' + encodeURIComponent(id) + '&depuis=calendrier#preparation';

  // ----- Plan d'une course : règles générales (spécification du Calendrier, § 5.1) -----

  // Phase de chaque semaine d'un plan de n semaines : affûtage sur les deux dernières, deload toutes les quatre,
  // le reste réparti par moitié entre base (arrondie à l'inférieur) et développement.
  function phasesRegle(n) {
    const ph = [];
    for (let i = 1; i <= n; i++) ph.push(i > n - 2 ? 'affutage' : i % 4 === 0 ? 'deload' : null);
    const reste = ph.filter(p => !p).length;
    let k = 0;
    return ph.map(p => p || (k++ < Math.floor(reste / 2) ? 'base' : 'developpement'));
  }

  // Plan d'une course : durée en semaines complètes lundi-dimanche, la dernière étant celle du jour J.
  // modifs : Map lundi → phase choisie à la main.
  function planDe(c, modifs, duree) {
    const n = duree || c.prepaSemaines;
    if (!n || !c.date) return null;
    const premier = addDays(lundiDe(c.date), -7 * (n - 1));
    return { course: c, n, premier, jourJ: c.date, semaines: phasesRegle(n).map((regle, i) => {
      const lundi = addDays(premier, 7 * i), choisie = modifs && modifs.get(lundi);
      return { n: i + 1, lundi, regle, phase: choisie || regle, modifiee: !!choisie && choisie !== regle };
    }) };
  }

  const modifsDe = (semaines, id) => new Map((semaines || []).filter(x => x.course === id).map(x => [x.lundi, x.phase]));
  // Les plans de l'ensemble du calendrier sont ceux des courses confirmées ; une option a son plan, mais seule.
  const confirmee = c => c.statut === 'confirmee' && c.etat === 'a_venir' && !!c.date;
  const aPlan = c => (c.statut === 'confirmee' || c.statut === 'option') && c.etat === 'a_venir' && !!c.date;
  const tousLesPlans = ctx => ctx.courses.filter(confirmee).map(c => planDe(c, modifsDe(ctx.semaines, c.id))).filter(Boolean);

  // Courses affichées dans la fenêtre : confirmées et options à venir (une option passée disparaît),
  // courues (grisées). Ni à surveiller, ni abandonnées.
  function visibles(courses, debut, fin, auj) {
    return courses.filter(c => c.date && c.date >= debut && c.date <= fin && (c.etat === 'courue' ||
      (c.etat === 'a_venir' && (c.statut === 'confirmee' || (c.statut === 'option' && c.date >= auj)))))
      .map(c => {
        const semaines = c.prepaSemaines || null; // celle de la course, sinon celle de son format
        return {
          id: c.id, date: c.date, nom: c.course,
          famille: famille(c),
          validee: c.statut === 'confirmee',
          courue: c.etat === 'courue',
          semaines,
          debutPrepa: semaines && c.etat !== 'courue' ? addDays(lundiDe(c.date), -7 * (semaines - 1)) : null
        };
      });
  }

  // Phase d'une semaine pour l'ensemble du calendrier : le plan de la course confirmée la plus proche qui la couvre.
  function phaseSemaine(lundi, plans) {
    const couvrent = plans.filter(p => lundi >= p.premier && lundi <= lundiDe(p.jourJ)).sort((a, b) => (a.jourJ < b.jourJ ? -1 : 1));
    if (!couvrent.length) return null;
    const w = couvrent[0].semaines.find(s => s.lundi === lundi);
    return { phase: w.phase, modifiee: w.modifiee, autres: couvrent.slice(1) };
  }

  const ecriture = ctx => !ctx.lectureSeule;

  // ----- Une semaine : jours, séances, courses, rendez-vous clés -----
  // opts : { phase, numero, modifiee, autres, liens } ; liens === false : le jour de course n'est pas un lien (déjà sur sa page).
  function semaineHtml(ctx, lundi, opts) {
    const auj = iso(new Date());
    const courses = visibles(ctx.courses, lundi, addDays(lundi, 6), auj);
    const autres = opts.autres || [];
    let jours = '';
    for (let i = 0; i < 7; i++) {
      const jour = addDays(lundi, i), d = parse(jour);
      const cls = ['cal-jr'];
      if (d.getDay() === 0 || d.getDay() === 6) cls.push('we');
      if (jour < auj) cls.push('passe');
      if (jour === auj) cls.push('auj');
      const courseJour = courses.filter(c => c.date === jour).map(c => c.courue
        ? '<span class="cal-jr-course courue">' + esc(c.nom) + '</span>'
        : opts.liens === false ? '<span class="cal-jr-course c-' + c.famille + (c.validee ? '-v' : '-n') + '">' + esc(c.nom) + '</span>'
          : '<a class="cal-jr-course c-' + c.famille + (c.validee ? '-v' : '-n') + '" href="' + lienCourse(c.id) + '">' + esc(c.nom) + '</a>').join('');
      const rdv = ctx.courses.filter(c => aPlan(c) && c.ouverture_inscriptions === jour).map(c =>
        opts.liens === false ? '<span class="cal-rdv">◆ Ouverture des inscriptions · ' + esc(c.course) + '</span>'
          : '<a class="cal-rdv" href="' + lienCourse(c.id) + '">◆ Ouverture des inscriptions · ' + esc(c.course) + '</a>').join('');
      const seances = ctx.seances.filter(s => s.date === jour).map(s =>
        '<div class="cal-se' + (s.faite ? ' faite' : '') + '"><input type="checkbox" data-fait="' + esc(s.id) + '"' + (s.faite ? ' checked' : '') + (ecriture(ctx) ? '' : ' disabled') +
        ' aria-label="Faite">' + (ecriture(ctx)
          ? '<button type="button" class="cal-se-txt" data-edit="' + esc(s.id) + '"><b>' + TYPES[s.type] + '</b> ' + esc(s.libelle) + '</button>'
          : '<span class="cal-se-txt"><b>' + TYPES[s.type] + '</b> ' + esc(s.libelle) + '</span>') + '</div>').join('');
      jours += '<div class="' + cls.join(' ') + '"><span class="cal-jr-nom">' + jourCourt(jour) + '</span>' + courseJour + rdv + seances +
        (ecriture(ctx) ? '<button type="button" class="cal-plus" data-ajout="' + jour + '" aria-label="Ajouter une séance le ' + longue(jour) + '">+</button>' : '') + '</div>';
    }
    const titre = (opts.numero ? 'Semaine ' + opts.numero + ' · ' : '') + 'Sem. du ' + dateCourte(lundi);
    const noms = autres.map(p => p.course.course).join(', ');
    return '<section class="cal-sem ' + (opts.phase ? 'ph-' + opts.phase : 'sans') + '" data-lundi="' + lundi + '"><div class="cal-sem-haut"><h3 class="cal-sem-titre">' + titre + '</h3>' +
      '<span class="cal-sem-phase">' + (opts.phase ? NOM_PHASE[opts.phase] + (opts.modifiee ? ' · modifiée' : '') : 'Sans objectif clair') + '</span>' +
      (autres.length ? '<span class="cal-aussi" title="Semaine aussi dans le plan de : ' + esc(noms) + '">aussi : ' + esc(noms) + '</span>' : '') +
      '</div><div class="cal-sem-jours">' + jours + '</div></section>';
  }

  // Phases consécutives regroupées, une case par groupe, large de ses semaines ; une poignée entre deux cases en édition.
  function frise(plan, interactive) {
    const groupes = [];
    plan.semaines.forEach((s, i) => {
      const g = groupes[groupes.length - 1];
      if (g && g.phase === s.phase) g.fin = i; else groupes.push({ phase: s.phase, debut: i, fin: i });
    });
    return '<div class="cal-frise' + (interactive ? ' is-edit' : '') + '">' + groupes.map((g, k) =>
      (interactive && k > 0 ? '<i class="cal-poignee" data-bord="' + g.debut + '" title="Glisser pour déplacer la limite"></i>' : '') +
      '<span class="cal-seg ph-' + g.phase + '" style="flex:' + (g.fin - g.debut + 1) + '" title="' + NOM_PHASE[g.phase] + ' : ' + (g.fin - g.debut + 1) + ' sem.">' +
      '<b>' + NOM_PHASE[g.phase] + '</b><small>' + (g.fin - g.debut + 1) + ' sem.</small></span>').join('') + '</div>';
  }

  // ----- Rubrique « Préparation » de la page d'une course (spécification § 5.2) -----
  function rubrique(ctx, c) {
    const preparer = ecriture(ctx) ? '<button type="button" class="mrt-btn is-principal cal-parametrer" data-preparer="' + esc(c.id) + '">' + REGLAGES + 'Paramétrer le plan</button>' : '';
    const plan = planDe(c, modifsDe(ctx.semaines, c.id));
    if (!plan) {
      return '<p class="cal-vide">Pas encore de plan : ce format n\'a pas de durée de préparation par défaut.' + (ecriture(ctx) ? ' Paramètre le plan pour en choisir une.' : '') + '</p>' + (preparer ? '<p>' + preparer + '</p>' : '');
    }
    const lundiAuj = lundiDe(iso(new Date()));
    let w = plan.semaines.find(s => s.lundi === lundiAuj), etiquette = 'Semaine en cours';
    if (!w && lundiAuj < plan.premier) { w = plan.semaines[0]; etiquette = 'Première semaine'; }
    else if (!w) { w = plan.semaines[plan.n - 1]; etiquette = 'Dernière semaine'; }
    const plans = tousLesPlans(ctx);
    const bloc = x => semaineHtml(ctx, x.lundi, { phase: x.phase, numero: x.n, modifiee: x.modifiee, liens: false,
      autres: confirmee(c) ? plans.filter(p => p.course.id !== c.id && x.lundi >= p.premier && x.lundi <= lundiDe(p.jourJ)) : [] });
    return '<div class="cal-prep-haut"><p class="cal-plan-dates">Plan de ' + plan.n + ' semaines · début : ' + longue(plan.premier) + ' → jour J : ' + longue(c.date) + '</p>' + preparer + '</div>' +
      frise(plan, false) +
      '<p class="cal-prep-lib">' + etiquette + '</p>' + bloc(w) +
      '<details class="cal-toutes"><summary>Toutes les semaines (' + plan.n + ')</summary><div class="cal-sem-liste">' + plan.semaines.map(bloc).join('') + '</div></details>';
  }

  // ----- Fenêtres : séance, « Préparer » -----
  function fenetre(contenu, classe) {
    const voile = document.createElement('div');
    voile.className = 'cal-voile';
    voile.innerHTML = '<div class="cal-panneau ' + (classe || '') + '" role="dialog" aria-modal="true">' + contenu + '</div>';
    document.body.appendChild(voile);
    const echap = e => { if (e.key === 'Escape') voile.fermer(); };
    voile.fermer = () => { voile.remove(); document.removeEventListener('keydown', echap); };
    document.addEventListener('keydown', echap);
    voile.addEventListener('mousedown', e => { if (e.target === voile) voile.fermer(); });
    return voile;
  }

  function ouvrirSeance(ctx, opts) {
    const s = opts.seance;
    const v = fenetre('<form novalidate><h3 class="cal-panneau-titre">' + (s ? 'Modifier la séance' : 'Ajouter une séance') + '</h3>' +
      '<label class="cal-champ"><span>Date</span><input type="date" name="date" value="' + esc(s ? s.date : opts.date) + '"></label>' +
      '<label class="cal-champ"><span>Type</span><select name="type"><option value="run">Run</option><option value="renfo">Renfo</option></select></label>' +
      '<label class="cal-champ"><span>Libellé</span><input name="libelle" maxlength="100" placeholder="Footing 45 min" value="' + esc(s ? s.libelle : '') + '"></label>' +
      '<p class="cal-msg" role="alert"></p><div class="cal-actions">' +
      (s ? '<button type="button" class="mrt-lien is-danger" data-act="supprimer">Supprimer</button>' : '') + '<span></span>' +
      '<button type="button" class="mrt-btn" data-act="annuler">Annuler</button><button type="submit" class="mrt-btn is-principal">Enregistrer</button></div></form>', 'cal-seance');
    const f = v.querySelector('form'), msg = v.querySelector('.cal-msg');
    if (s) f.type.value = s.type;
    f.libelle.focus();
    const sb = window.mrtSupabase;
    const echec = err => { msg.textContent = 'Enregistrement impossible pour l\'instant.'; console.warn(err); };
    v.querySelector('[data-act="annuler"]').addEventListener('click', v.fermer);
    if (s) v.querySelector('[data-act="supprimer"]').addEventListener('click', async () => {
      if (!confirm('Supprimer cette séance ?')) return;
      const { error } = await sb.from('seances').delete().eq('id', s.id);
      if (error) return echec(error);
      v.fermer(); ctx.actualiser();
    });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const libelle = f.libelle.value.trim(), date = f.date.value;
      if (!date) return void (msg.textContent = 'Choisis une date.');
      if (!libelle) return void (msg.textContent = 'Écris le libellé de la séance.');
      const champs = { date, type: f.type.value, libelle };
      const { error } = s ? await sb.from('seances').update(champs).eq('id', s.id)
        : await sb.from('seances').insert(Object.assign({ course: opts.course || null }, champs));
      if (error) return echec(error);
      v.fermer(); ctx.actualiser();
    });
  }

  // Fenêtre « Préparer » (spécification § 5.3) : durée, frise à glisser, tableau semaine par semaine.
  function ouvrirPreparer(ctx, id) {
    const c = ctx.courses.find(x => x.id === id);
    if (!c) return;
    const draft = { duree: c.prepaSemaines || c.prepaFormat || 12, modifs: modifsDe(ctx.semaines, id) };
    const v = fenetre('<h3 class="cal-panneau-titre">Paramétrer le plan · ' + esc(c.course) + '</h3><div class="cal-prep"></div>' +
      '<p class="cal-msg" role="alert"></p><div class="cal-actions"><button type="button" class="mrt-lien" data-act="recalculer">Recalculer selon les règles</button><span></span>' +
      '<button type="button" class="mrt-btn" data-act="annuler">Annuler</button><button type="button" class="mrt-btn is-principal" data-act="enregistrer">Enregistrer</button></div>', 'cal-preparer');
    const corps = v.querySelector('.cal-prep'), msg = v.querySelector('.cal-msg');
    const courant = () => planDe(c, draft.modifs, draft.duree);

    function dessinerPrep() {
      const plan = courant();
      corps.innerHTML = '<label class="cal-champ cal-duree"><span>Durée en semaines</span><input type="number" min="1" max="52" name="duree" value="' + draft.duree + '"></label>' +
        '<p class="cal-plan-dates">Début : ' + longue(plan.premier) + ' → jour J : ' + longue(c.date) + (c.prepaFormat ? ' · durée du format : ' + c.prepaFormat + ' sem.' : '') + '</p>' +
        frise(plan, true) +
        '<div class="cal-tab">' + plan.semaines.map(w => '<div class="cal-tab-l"><span>Semaine ' + w.n + '</span><span>' + dateCourte(w.lundi) + '</span>' +
          '<select data-sem="' + w.lundi + '" aria-label="Phase de la semaine ' + w.n + '">' + PHASES.map(p => '<option value="' + p[0] + '"' + (p[0] === w.phase ? ' selected' : '') + '>' + p[1] + '</option>').join('') + '</select></div>').join('') + '</div>';
    }
    dessinerPrep();

    corps.addEventListener('change', e => {
      if (e.target.name === 'duree') {
        const n = Math.round(Number(e.target.value));
        if (n >= 1 && n <= 52) { draft.duree = n; dessinerPrep(); } else e.target.value = draft.duree;
      } else if (e.target.dataset.sem) {
        draft.modifs.set(e.target.dataset.sem, e.target.value);
        dessinerPrep();
      }
    });
    // Frise : glisser la poignée entre deux phases reporte les semaines de l'une sur l'autre.
    corps.addEventListener('pointerdown', e => {
      const poignee = e.target.closest('.cal-poignee');
      if (!poignee) return;
      e.preventDefault();
      const plan = courant(), depart = Number(poignee.dataset.bord), base = new Map(draft.modifs);
      const gauche = plan.semaines[depart - 1].phase, droite = plan.semaines[depart].phase;
      const bouge = ev => {
        const r = corps.querySelector('.cal-frise').getBoundingClientRect();
        const j = Math.max(0, Math.min(plan.n, Math.round((ev.clientX - r.left) / r.width * plan.n)));
        draft.modifs = new Map(base);
        plan.semaines.forEach((s, i) => {
          if (j > depart && i >= depart && i < j) draft.modifs.set(s.lundi, gauche);
          if (j < depart && i >= j && i < depart) draft.modifs.set(s.lundi, droite);
        });
        dessinerPrep();
      };
      const fin = () => { document.removeEventListener('pointermove', bouge); document.removeEventListener('pointerup', fin); };
      document.addEventListener('pointermove', bouge);
      document.addEventListener('pointerup', fin);
    });

    v.querySelector('[data-act="annuler"]').addEventListener('click', v.fermer);
    v.querySelector('[data-act="recalculer"]').addEventListener('click', () => {
      if (!confirm('Revenir aux règles générales pour toutes les semaines ?')) return;
      draft.modifs = new Map();
      dessinerPrep();
    });
    v.querySelector('[data-act="enregistrer"]').addEventListener('click', async ev => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      const lignes = courant().semaines.filter(s => s.phase !== s.regle).map(s => ({ course: id, lundi: s.lundi, phase: s.phase }));
      const sb = window.mrtSupabase;
      let r = await sb.from('courses').update({ prepa_semaines: draft.duree === c.prepaFormat ? null : draft.duree }).eq('id', id);
      if (!r.error) r = await sb.from('plan_semaines').delete().eq('course', id);
      if (!r.error && lignes.length) r = await sb.from('plan_semaines').insert(lignes);
      if (r.error) { msg.textContent = 'Enregistrement impossible pour l\'instant.'; btn.disabled = false; console.warn(r.error); return; }
      v.fermer(); ctx.actualiser();
    });
  }

  // Événements d'une zone qui contient des semaines : « + », séance à modifier, « Préparer », case « faite ».
  // courseId : course liée aux séances ajoutées (page d'une course), sinon aucune.
  function brancher(root, ctx, courseId) {
    root.addEventListener('click', e => {
      const ajout = e.target.closest('[data-ajout]'), edit = e.target.closest('[data-edit]'), prep = e.target.closest('[data-preparer]');
      if (ajout) ouvrirSeance(ctx, { date: ajout.dataset.ajout, course: courseId || null });
      else if (edit) ouvrirSeance(ctx, { seance: ctx.seances.find(s => s.id === edit.dataset.edit) });
      else if (prep) ouvrirPreparer(ctx, prep.dataset.preparer);
    });
    root.addEventListener('change', async e => {
      const fait = e.target.dataset && e.target.dataset.fait;
      if (!fait) return;
      const { error } = await window.mrtSupabase.from('seances').update({ faite: e.target.checked }).eq('id', fait);
      if (error) { e.target.checked = !e.target.checked; console.warn(error); return; }
      ctx.actualiser();
    });
  }

  window.mrtPreparation = { MOIS, JOURS, PHASES, NOM_PHASE, iso, parse, addDays, lundiDe, jourCourt, dateCourte, longue, courte, esc, famille, lienCourse,
    phasesRegle, planDe, modifsDe, confirmee, aPlan, tousLesPlans, visibles, phaseSemaine, semaineHtml, frise, rubrique, brancher };
})();
