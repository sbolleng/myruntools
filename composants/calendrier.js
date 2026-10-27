// ===== Calendrier : vue Année, vue 4 semaines, plan d'une course =====
//
// docs/module-calendrier-specification.md. renderCalendrier(élément, ctx) dessine
// l'une des trois vues, choisie par l'adresse (#annee, #semaines=AAAA-MM-JJ,
// #plan=identifiant) : le bouton retour du navigateur ramène à la vue d'avant.
//   ctx.courses       courses de l'utilisateur (donnees.js)
//   ctx.seances       séances saisies à la main
//   ctx.semaines      semaines dont la phase a été modifiée à la main
//   ctx.lectureSeule  site partagé : rien ne se saisit ni ne se modifie
//   ctx.relire()      relit les données, rend { courses, seances, semaines }
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

  // ----- Plan d'une course : règles générales (spécification § 5.1) -----

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

  window.renderCalendrier = function (root, ctx) {
    const mobile = window.matchMedia('(max-width: 600px)');
    const ecriture = () => !ctx.lectureSeule;
    let derniere = '#annee'; // dernière vue qui n'est pas un plan : où ramène « Retour »

    function lireHash() {
      const [k, v] = location.hash.replace(/^#/, '').split('=');
      if (k === 'plan' && v) return { v: 'plan', id: v };
      if (k === 'semaines') return { v: 'semaines', lundi: lundiDe(/^\d{4}-\d\d-\d\d$/.test(v || '') ? v : iso(new Date())) };
      return { v: 'annee' };
    }

    async function actualiser() {
      Object.assign(ctx, await ctx.relire());
      dessiner();
    }

    // ----- Éléments communs -----
    const bandeau = vue => '<select class="cal-vue" aria-label="Vue"><option value="annee"' + (vue === 'annee' ? ' selected' : '') + '>Année</option>' +
      '<option value="semaines"' + (vue === 'semaines' ? ' selected' : '') + '>4 semaines</option></select>';
    const cle = (cls, txt) => '<span><i class="cal-k ' + cls + '"></i>' + txt + '</span>';
    const legendePhases = () => '<div class="cal-legende">' + PHASES.map(p => cle('ph-' + p[0], p[1])).join('') + cle('cal-k-sans', 'Sans objectif clair') +
      '<span>◆ Rendez-vous clé</span></div>';

    // Phase d'une semaine pour l'ensemble du calendrier : le plan de la course confirmée la plus proche qui la couvre.
    function phaseSemaine(lundi, plans) {
      const couvrent = plans.filter(p => lundi >= p.premier && lundi <= lundiDe(p.jourJ)).sort((a, b) => (a.jourJ < b.jourJ ? -1 : 1));
      if (!couvrent.length) return null;
      const w = couvrent[0].semaines.find(s => s.lundi === lundi);
      return { phase: w.phase, modifiee: w.modifiee, autres: couvrent.slice(1) };
    }

    const tousLesPlans = () => ctx.courses.filter(confirmee).map(c => planDe(c, modifsDe(ctx.semaines, c.id))).filter(Boolean);

    // ----- Une semaine : jours, séances, courses, rendez-vous clés -----
    function semaineHtml(lundi, opts) {
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
          : '<a class="cal-jr-course c-' + c.famille + (c.validee ? '-v' : '-n') + '" href="#plan=' + esc(c.id) + '">' + esc(c.nom) + '</a>').join('');
        const rdv = ctx.courses.filter(c => aPlan(c) && c.ouverture_inscriptions === jour).map(c =>
          '<a class="cal-rdv" href="#plan=' + esc(c.id) + '">◆ Ouverture des inscriptions · ' + esc(c.course) + '</a>').join('');
        const seances = ctx.seances.filter(s => s.date === jour).map(s =>
          '<div class="cal-se' + (s.faite ? ' faite' : '') + '"><input type="checkbox" data-fait="' + esc(s.id) + '"' + (s.faite ? ' checked' : '') + (ecriture() ? '' : ' disabled') +
          ' aria-label="Faite">' + (ecriture()
            ? '<button type="button" class="cal-se-txt" data-edit="' + esc(s.id) + '"><b>' + TYPES[s.type] + '</b> ' + esc(s.libelle) + '</button>'
            : '<span class="cal-se-txt"><b>' + TYPES[s.type] + '</b> ' + esc(s.libelle) + '</span>') + '</div>').join('');
        jours += '<div class="' + cls.join(' ') + '"><span class="cal-jr-nom">' + jourCourt(jour) + '</span>' + courseJour + rdv + seances +
          (ecriture() ? '<button type="button" class="cal-plus" data-ajout="' + jour + '" aria-label="Ajouter une séance le ' + longue(jour) + '">+</button>' : '') + '</div>';
      }
      const titre = (opts.numero ? 'Semaine ' + opts.numero + ' · ' : '') + 'Sem. du ' + dateCourte(lundi);
      const noms = autres.map(p => p.course.course).join(', ');
      return '<section class="cal-sem ' + (opts.phase ? 'ph-' + opts.phase : 'sans') + '" data-lundi="' + lundi + '"><div class="cal-sem-haut"><h3 class="cal-sem-titre">' + titre + '</h3>' +
        '<span class="cal-sem-phase">' + (opts.phase ? NOM_PHASE[opts.phase] + (opts.modifiee ? ' · modifiée' : '') : 'Sans objectif clair') + '</span>' +
        (autres.length ? '<span class="cal-aussi" title="Semaine aussi dans le plan de : ' + esc(noms) + '">aussi : ' + esc(noms) + '</span>' : '') +
        '</div><div class="cal-sem-jours">' + jours + '</div></section>';
    }

    // ----- Vue 4 semaines -----
    function vueSemaines(lundi) {
      const plans = tousLesPlans();
      let h = '<div class="cal-cadre"><div class="cal-haut">' + bandeau('semaines') +
        '<span class="cal-nav"><a class="mrt-rond" href="#semaines=' + addDays(lundi, -28) + '" aria-label="4 semaines plus tôt">‹</a><a class="mrt-rond" href="#semaines=' + addDays(lundi, 28) + '" aria-label="4 semaines plus tard">›</a></span>' +
        legendePhases() + '</div><div class="cal-sem-liste">';
      for (let i = 0; i < 4; i++) {
        const l = addDays(lundi, 7 * i), p = phaseSemaine(l, plans);
        h += semaineHtml(l, p ? { phase: p.phase, autres: p.autres, modifiee: p.modifiee } : {});
      }
      root.innerHTML = h + '</div></div>';
    }

    // ----- Vue Année -----
    function vueAnnee() {
      const aujourdhui = iso(new Date());
      const premier = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const mois = Array.from({ length: 12 }, (_, i) => new Date(premier.getFullYear(), premier.getMonth() + i, 1));
      const debut = iso(mois[0]);
      const fin = iso(new Date(mois[11].getFullYear(), mois[11].getMonth() + 1, 0));
      const liste = visibles(ctx.courses, debut, fin, aujourdhui);
      // Début de préparation avant la fenêtre : le trait se pose sur le premier jour affiché.
      const prepas = liste.filter(c => c.debutPrepa && c.debutPrepa <= fin).map(c => Object.assign({ jourTrait: c.debutPrepa < debut ? debut : c.debutPrepa }, c));

      function bloc(colonnes) {
        let h = '<div class="cal-bloc" style="--n:' + colonnes.length + '"><span></span>';
        colonnes.forEach(m => {
          const an = m.getMonth() === 0 || m.getTime() === mois[0].getTime();
          h += '<b class="cal-mois">' + MOIS[m.getMonth()] + (an ? ' <i>' + String(m.getFullYear()).slice(2) + '</i>' : '') + '</b>';
        });
        for (let dd = 1; dd <= 31; dd++) {
          h += '<span class="cal-n">' + dd + '</span>';
          colonnes.forEach(m => {
            const y = m.getFullYear(), mm = m.getMonth();
            if (dd > new Date(y, mm + 1, 0).getDate()) { h += '<span class="cal-j vide"></span>'; return; }
            const jour = iso(new Date(y, mm, dd)), d = new Date(y, mm, dd);
            const cls = ['cal-j'], tip = [longue(jour)];
            if (d.getDay() === 0 || d.getDay() === 6) cls.push('we');
            if (jour < aujourdhui) cls.push('passe');
            if (jour === aujourdhui) { cls.push('auj'); tip.push("aujourd'hui"); }
            const c = liste.find(x => x.date === jour);
            let contenu = '', cible = '';
            if (c) {
              cls.push(c.courue ? 'courue' : 'c-' + c.famille + (c.validee ? '-v' : '-n'));
              tip.push(c.nom + ' · ' + (c.courue ? 'courue' : (c.famille === 'trail' ? 'trail' : 'route') + (c.validee ? ', validée' : ', non validée')));
              contenu += '<span class="cal-nom">' + esc(c.nom) + '</span>';
              if (!c.courue) cible = ' data-course="' + esc(c.id) + '"';
            }
            const traits = prepas.filter(x => x.jourTrait === jour);
            if (traits.length) {
              contenu += '<span class="cal-traits">' + traits.map(x => '<i class="cal-trait c-' + x.famille + (x.validee ? '-v' : '-n') + '"></i>').join('') + '</span>';
              traits.forEach(x => tip.push('début de la prépa : ' + x.nom + ' (' + x.semaines + ' semaines' + (x.debutPrepa < debut ? ', commencée le ' + courte(x.debutPrepa) : '') + ')'));
            }
            h += '<span class="' + cls.join(' ') + '" data-jour="' + jour + '"' + cible + ' title="' + esc(tip.join(' · ')) + '">' + contenu + '</span>';
          });
        }
        return h + '</div>';
      }

      const taille = mobile.matches ? 3 : 6;
      let blocs = '';
      for (let i = 0; i < 12; i += taille) blocs += bloc(mois.slice(i, i + taille));
      root.innerHTML = '<div class="cal-cadre"><div class="cal-haut">' + bandeau('annee') +
        '<div class="cal-legende">' + cle('c-route-v', 'Route validée') + cle('c-route-n', 'Route non validée') + cle('c-trail-v', 'Trail validée') +
        cle('c-trail-n', 'Trail non validée') + cle('cal-k-trait', 'Début de prépa') + cle('courue', 'Courue') + cle('cal-k-auj', "Aujourd'hui") + '</div></div>' +
        '<div class="cal-blocs">' + blocs + '</div></div>';
    }

    // ----- Plan d'une course -----
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

    function vuePlan(id) {
      const c = ctx.courses.find(x => x.id === id && aPlan(x));
      const retour = '<a class="mrt-lien cal-retour" href="' + esc(derniere) + '">← Retour</a>';
      if (!c) { root.innerHTML = '<div class="cal-cadre">' + retour + '<p class="cal-vide">Course introuvable.</p></div>'; return; }
      const plan = planDe(c, modifsDe(ctx.semaines, c.id));
      const nom = c.course + (c.parcours && c.parcours !== c.course ? ' · ' + c.parcours : '');
      const preparer = ecriture() ? '<button type="button" class="mrt-btn" data-preparer="' + esc(c.id) + '">Préparer</button>' : '';
      if (!plan) {
        root.innerHTML = '<div class="cal-cadre">' + retour + '<h2 class="cal-plan-titre">' + esc(nom) + '</h2>' +
          '<p class="cal-vide">Pas de plan : aucune durée de préparation pour ce format. ' + (ecriture() ? 'Choisis-en une avec « Préparer ».' : '') + '</p>' + (preparer ? '<p>' + preparer + '</p>' : '') + '</div>';
        return;
      }
      const plans = tousLesPlans();
      let semaines = '';
      plan.semaines.forEach(w => {
        const autres = confirmee(c) ? plans.filter(p => p.course.id !== c.id && w.lundi >= p.premier && w.lundi <= lundiDe(p.jourJ)) : [];
        semaines += semaineHtml(w.lundi, { phase: w.phase, numero: w.n, modifiee: w.modifiee, autres });
      });
      root.innerHTML = '<div class="cal-cadre">' + retour +
        '<h2 class="cal-plan-titre">' + esc(nom) + ' · plan de ' + plan.n + ' semaines</h2>' +
        '<p class="cal-plan-dates">Début : ' + longue(plan.premier) + ' → jour J : ' + longue(c.date) + '</p>' +
        (preparer ? '<div class="cal-plan-barre">' + preparer + '</div>' : '') + frise(plan, false) + '<div class="cal-sem-liste">' + semaines + '</div></div>';
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

    function ouvrirSeance(opts) {
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
        v.fermer(); actualiser();
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
        v.fermer(); actualiser();
      });
    }

    // Rubrique « Préparer » (spécification § 5.3) : durée, frise à glisser, tableau semaine par semaine.
    function ouvrirPreparer(id) {
      const c = ctx.courses.find(x => x.id === id);
      if (!c) return;
      const draft = { duree: c.prepaSemaines || c.prepaFormat || 12, modifs: modifsDe(ctx.semaines, id) };
      const v = fenetre('<h3 class="cal-panneau-titre">Préparer · ' + esc(c.course) + '</h3><div class="cal-prep"></div>' +
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
        v.fermer(); actualiser();
      });
    }

    // ----- Affichage et événements -----
    function dessiner() {
      const vue = lireHash();
      if (vue.v !== 'plan') derniere = location.hash || '#annee';
      if (vue.v === 'annee') vueAnnee();
      else if (vue.v === 'semaines') vueSemaines(vue.lundi);
      else vuePlan(vue.id);
    }

    root.addEventListener('click', e => {
      const t = e.target;
      const course = t.closest('[data-course]'), jour = t.closest('[data-jour]');
      if (course) { location.hash = '#plan=' + course.dataset.course; return; }
      if (jour) { location.hash = '#semaines=' + lundiDe(jour.dataset.jour); return; }
      const ajout = t.closest('[data-ajout]'), edit = t.closest('[data-edit]'), prep = t.closest('[data-preparer]');
      const h = lireHash();
      if (ajout) ouvrirSeance({ date: ajout.dataset.ajout, course: h.v === 'plan' ? h.id : null });
      else if (edit) ouvrirSeance({ seance: ctx.seances.find(s => s.id === edit.dataset.edit) });
      else if (prep) ouvrirPreparer(prep.dataset.preparer);
    });
    root.addEventListener('change', async e => {
      if (e.target.classList.contains('cal-vue')) { location.hash = '#' + e.target.value; return; }
      const fait = e.target.dataset.fait;
      if (!fait) return;
      const { error } = await window.mrtSupabase.from('seances').update({ faite: e.target.checked }).eq('id', fait);
      if (error) { e.target.checked = !e.target.checked; console.warn(error); return; }
      actualiser();
    });
    window.addEventListener('hashchange', dessiner);
    if (mobile.addEventListener) mobile.addEventListener('change', () => { if (lireHash().v === 'annee') dessiner(); });
    dessiner();
  };
})();
