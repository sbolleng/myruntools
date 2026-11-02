// ===== Calendrier : vue Année et vue Semaine =====
//
// docs/module-calendrier-specification.md. renderCalendrier(élément, ctx) dessine l'une des deux vues,
// choisie par l'adresse (#annee, #semaines=AAAA-MM-JJ ; sans adresse : la semaine en cours, vue par défaut)
// et par deux pastilles : le bouton retour du navigateur ramène à la vue d'avant. Une course touchée mène
// à sa page, à la rubrique Préparation (une course courue : son résultat). Plan, séances et fenêtres : preparation.js.
//   ctx.courses, ctx.seances, ctx.semaines, ctx.lectureSeule, ctx.relire() : voir preparation.js.
//
// Essai en cours (spécification § 2) : des boutons violets mènent, sur l'appareil, d'une présentation à l'autre :
// Année en frise, en ancienne grille ou en nouvelle grille ; Semaine nouvelle ou 4 semaines ; jours en lignes ou en
// colonnes (ordinateur). À retirer, avec les variantes écartées, une fois le choix fait.
(function () {
  const P = window.mrtPreparation;
  const { MOIS, JOURS, PHASES, NOM_PHASE, CONSIGNES, iso, parse, addDays, lundiDe, dateCourte, longue, courte, esc, aPlan, visibles, tousLesPlans,
    phaseSemaine, plansDeLaSemaine, planDe, modifsDe, semaineHtml, lienCourse, CHEVRON } = P;

  // ----- Réglages retenus sur l'appareil (à défaut de stockage, le temps de la visite) -----
  const visite = {};
  const lire = (cle, ok, defaut) => {
    let v = visite[cle];
    if (v === undefined) try { v = localStorage.getItem(cle); } catch (e) { /* stockage indisponible */ }
    return ok(v) ? v : defaut;
  };
  const ranger = (cle, v) => { visite[cle] = v; try { localStorage.setItem(cle, v); } catch (e) { /* stockage indisponible */ } };
  // Essai : la variante de chaque vue ; un bouton violet par autre variante, qui y mène.
  const ESSAI = { annee: ['frise', 'grille', 'nouvelle-grille'], semaine: ['nouvelle', 'ancienne'], jours: ['lignes', 'colonnes'] };
  const ESSAI_TXT = {
    annee: { frise: 'voir la frise', grille: 'voir l\'ancienne grille', 'nouvelle-grille': 'voir la nouvelle grille' },
    semaine: { nouvelle: 'voir la nouvelle vue Semaine', ancienne: 'voir l\'ancienne vue 4 semaines' },
    jours: { lignes: 'jours en lignes', colonnes: 'jours en colonnes' }
  };
  const essai = k => lire('mrt-essai-' + k, v => ESSAI[k].includes(v), ESSAI[k][0]);
  const essais = (...k) => '<span class="cal-essais">' + k.map(x => ESSAI[x].filter(v => v !== essai(x)).map(v =>
    '<button type="button" class="cal-essai" data-essai="' + x + '" data-valeur="' + v + '">Essai · ' + ESSAI_TXT[x][v] + '</button>').join('')).join('') + '</span>';
  // Vue Année : période de 3, 6 ou 12 mois (6 par défaut), commune à la frise et à la nouvelle grille.
  const PERIODES = ['3', '6', '12'];
  const periode = () => Number(lire('mrt-calendrier-mois', v => PERIODES.includes(v), '6'));

  // ----- Dates -----
  const ecart = (a, b) => Math.round((parse(b) - parse(a)) / 864e5); // jours de a à b (heure d'été comprise)
  const jourDuMois = d => (d === 1 ? '1er' : String(d));
  const dateMois = s => jourDuMois(parse(s).getDate()) + ' ' + MOIS[parse(s).getMonth()];     // « 15 nov. », « 1er juil. »
  const jourEtDate = s => JOURS[parse(s).getDay()] + ' ' + jourDuMois(parse(s).getDate());     // « dim. 1er »
  const plage = l => { const a = parse(l), b = parse(addDays(l, 6));                           // « 11-17 janv. », « 28 déc.-3 janv. »
    return a.getMonth() === b.getMonth() ? a.getDate() + '-' + b.getDate() + ' ' + MOIS[b.getMonth()] : dateCourte(l) + '-' + dateCourte(addDays(l, 6)); };
  const pct = v => v.toFixed(3) + '%';
  const decaler = (m, n) => { const [y, mm] = m.split('-').map(Number); return iso(new Date(y, mm - 1 + n, 1)).slice(0, 7); }; // mois « AAAA-MM » ± n
  const moisDe = (m, n) => { const [y, mm] = m.split('-').map(Number); return Array.from({ length: n }, (_, i) => new Date(y, mm - 1 + i, 1)); };
  const couleur = c => (c.courue ? 'courue' : 'c-' + c.famille + (c.validee ? '-v' : '-n'));

  window.renderCalendrier = function (root, ctx) {
    const mobile = window.matchMedia('(max-width: 600px)');

    // Vue de l'adresse : #annee (le mois en cours), #annee=AAAA-MM (premier mois affiché), #semaines=AAAA-MM-JJ ;
    // sans adresse, la semaine en cours (vue par défaut).
    function lireHash() {
      const [k, v] = location.hash.replace(/^#/, '').split('=');
      if (k === 'annee') return { v: 'annee', mois: /^\d{4}-\d\d$/.test(v || '') ? v : iso(new Date()).slice(0, 7) };
      return { v: 'semaines', lundi: lundiDe(/^\d{4}-\d\d-\d\d$/.test(v || '') ? v : iso(new Date())) };
    }

    // Relit les données, puis redessine la vue.
    ctx.actualiser = async () => {
      Object.assign(ctx, await ctx.relire());
      dessiner();
    };

    // ----- Éléments communs -----
    // Choix de la vue : deux pastilles, d'un seul toucher (celle de la vue ouverte est pleine).
    const bandeau = vue => '<nav class="cal-vues" aria-label="Vue">' + [['annee', 'Année'], ['semaines', essai('semaine') === 'ancienne' ? '4 semaines' : 'Semaine']].map(([v, nom]) =>
      '<a class="mrt-pastille' + (v === vue ? ' is-on" aria-current="true' : '') + '" href="#' + v + '" data-vue="' + v + '">' + nom + '</a>').join('') + '</nav>';
    const cle = (cls, txt) => '<span><i class="cal-k ' + cls + '"></i>' + txt + '</span>';
    const legendePhases = () => '<div class="cal-legende">' + PHASES.map(p => cle('ph-' + p[0], p[1])).join('') + cle('cal-k-sans', 'Sans objectif clair') +
      '<span>◆ Rendez-vous clé</span></div>';
    // (13) Période et (14) flèches de la vue Année (frise, nouvelle grille) : reculer ou avancer d'une période ; « Ce mois-ci ».
    const reglages = (depart, n) => '<span class="cal-droite"><span class="cal-reglage"><span class="cal-reglage-lib">Période</span>' +
      PERIODES.map(p => '<button type="button" class="cal-choix" data-periode="' + p + '" aria-pressed="' + (Number(p) === n) + '">' + p + ' mois</button>').join('') + '</span>' +
      '<span class="cal-nav"><a class="mrt-rond" href="#annee=' + decaler(depart, -n) + '" aria-label="Période précédente">‹</a>' +
      '<a class="mrt-btn cal-auj" href="#annee">Ce mois-ci</a>' +
      '<a class="mrt-rond" href="#annee=' + decaler(depart, n) + '" aria-label="Période suivante">›</a></span></span>';
    const nav = (lundi, pas, avant, apres, ici) => '<span class="cal-nav"><a class="mrt-rond" href="#semaines=' + addDays(lundi, -pas) + '" aria-label="' + avant + '">‹</a>' +
      '<a class="mrt-btn cal-auj" href="#semaines=' + lundiDe(iso(new Date())) + '">' + ici + '</a>' +
      '<a class="mrt-rond" href="#semaines=' + addDays(lundi, pas) + '" aria-label="' + apres + '">›</a></span>';

    // ----- Vue Semaine : la semaine en détail, puis les trois suivantes en résumé (spécification § 4) -----
    function titreSemaine(lundi) {
      const a = parse(lundi), b = parse(addDays(lundi, 6));
      const an = b.getFullYear() !== new Date().getFullYear() ? ' ' + b.getFullYear() : '';
      return 'Semaine du ' + jourDuMois(a.getDate()) + (a.getMonth() === b.getMonth() ? '' : ' ' + MOIS[a.getMonth()]) + ' au ' + jourDuMois(b.getDate()) + ' ' + MOIS[b.getMonth()] + an;
    }

    function vueSemaine(lundi) {
      const auj = iso(new Date()), plans = tousLesPlans(ctx), fin = addDays(lundi, 6);
      const [suivi, ...autres] = plansDeLaSemaine(lundi, plans);
      const lignes = mobile.matches || essai('jours') === 'lignes';
      // (4) titre, (13) bilan des séances, (11) repère : la course du plan suivi, le numéro de la semaine, le compte à rebours.
      const seances = ctx.seances.filter(s => s.date >= lundi && s.date <= fin);
      const reste = suivi ? ecart(auj, suivi.plan.jourJ) : -1;
      const compte = reste > 0 ? 'J-' + reste : reste === 0 ? 'Jour J' : '';
      const repere = suivi
        ? '<a class="cs-course" href="' + lienCourse(suivi.plan.course.id) + '">' + esc(suivi.plan.course.course) + '</a> · semaine ' + suivi.n + ' sur ' + suivi.plan.n +
          (compte ? ' · <span class="cs-compte">' + compte + '</span>' : '')
        : 'Sans objectif clair';
      // (5) phase, (14) consigne, (12) les autres plans de la semaine : en tête de la semaine, le long du trait de la phase.
      const haut = suivi ? '<span class="cal-sem-phase">' + NOM_PHASE[suivi.phase] + (suivi.modifiee ? ' · modifiée' : '') + '</span>' +
        '<span class="cs-consigne">' + esc(CONSIGNES[suivi.phase]) + '</span>' +
        (autres.length ? '<span class="cal-aussi">aussi : ' + autres.map(o => esc(o.plan.course.course) + ' · semaine ' + o.n + ' sur ' + o.plan.n + ' · ' + NOM_PHASE[o.phase]).join(' ; ') + '</span>' : '') : '';
      // (16) À suivre : une ligne repliable par semaine ; repliée, elle garde la phase, les séances prévues, les rendez-vous et les courses.
      let suite = '';
      for (let i = 1; i <= 3; i++) {
        const l = addDays(lundi, 7 * i), f = addDays(l, 6), s = plansDeLaSemaine(l, plans)[0];
        const nb = ctx.seances.filter(x => x.date >= l && x.date <= f).length;
        const rdv = ctx.courses.filter(c => aPlan(c) && c.ouverture_inscriptions && c.ouverture_inscriptions >= l && c.ouverture_inscriptions <= f)
          .map(c => '<span class="cs-s-rdv">◆ ' + jourEtDate(c.ouverture_inscriptions) + ' : inscriptions · ' + esc(c.course) + '</span>').join('');
        const courses = visibles(ctx.courses, l, f, auj).map(c => '<span class="cs-s-course ' + couleur(c) + '">' + esc(c.nom) + ' · ' + jourEtDate(c.date) + '</span>').join('');
        suite += '<details class="cs-suite mrt-deroule" data-lundi="' + l + '"><summary>' + CHEVRON + '<span class="cs-s-date">Sem. du ' + dateCourte(l) + '</span>' +
          (s ? '<span class="cs-s-phase ph-' + s.phase + '">' + NOM_PHASE[s.phase] + '</span><span class="cs-s-info">semaine ' + s.n + '</span>' : '<span class="cs-s-info">Sans objectif clair</span>') +
          (nb ? '<span class="cs-s-info">' + nb + (nb > 1 ? ' séances' : ' séance') + '</span>' : '') + rdv + courses + '</summary>' +
          '<div class="cs-suite-corps">' + semaineHtml(ctx, l, { phase: s && s.phase, haut: '', marqueAuj: true }) + '</div></details>';
      }
      root.innerHTML = '<div class="cal-cadre cal-semaine' + (lignes ? ' cal-lignes' : ' cs-colonnes') + '"><div class="cal-haut">' + bandeau('semaines') +
        essais('semaine', 'jours') + nav(lundi, 7, 'Semaine précédente', 'Semaine suivante', 'Cette semaine') + '</div>' +
        '<div class="cs-tete"><p class="cs-titre">' + titreSemaine(lundi) + '</p>' +
          (seances.length ? '<p class="cs-bilan"><span>Faites</span> ' + seances.filter(s => s.faite).length + ' / ' + seances.length + '</p>' : '') +
          '<p class="cs-repere">' + repere + '</p></div>' +
        semaineHtml(ctx, lundi, { phase: suivi && suivi.phase, haut, marqueAuj: true, classe: 'cs-focus' }) +
        '<p class="cal-prep-lib cs-suite-lib">À suivre</p>' + suite + '</div>';
    }

    // ----- Ancienne vue 4 semaines (essai) -----
    function vueQuatre(lundi) {
      const plans = tousLesPlans(ctx);
      let h = '<div class="cal-cadre"><div class="cal-haut">' + bandeau('semaines') + essais('semaine') +
        nav(lundi, 28, '4 semaines plus tôt', '4 semaines plus tard', 'Aujourd\'hui') + legendePhases() + '</div><div class="cal-sem-liste">';
      for (let i = 0; i < 4; i++) {
        const l = addDays(lundi, 7 * i), p = phaseSemaine(l, plans);
        h += semaineHtml(ctx, l, p ? { phase: p.phase, autres: p.autres, modifiee: p.modifiee } : {});
      }
      root.innerHTML = h + '</div></div>';
    }

    // ----- Vue Année en frise : une ligne par course, la prépa en barre colorée par phase (spécification § 3) -----
    function vueFrise(depart, nb) {
      const auj = iso(new Date()), [ya, ma] = depart.split('-').map(Number);
      const debut = iso(new Date(ya, ma - 1, 1)), fin = iso(new Date(ya, ma - 1 + nb, 0));
      const N = ecart(debut, fin) + 1;                                       // jours affichés
      const x = s => Math.max(0, Math.min(N, ecart(debut, s))) / N * 100;    // début d'un jour, en % de la piste
      const milieu = s => (ecart(debut, s) + 0.5) / N * 100;                  // milieu d'un jour
      const mois = moisDe(depart, nb).map(iso);
      // Courses à partir du début de la période : celles de la période (losanges, écarts), et celles d'après dont la prépa
      // commence dans la période (ligne et barre coupée au bord droit, sans losange).
      const ensuite = visibles(ctx.courses, debut, '9999-12-31', auj).sort((a, b) => (a.date < b.date ? -1 : 1));
      const liste = ensuite.filter(c => c.date <= fin);
      const plans = tousLesPlans(ctx);
      // (3) Filet au début de chaque mois ; (11) semaine en cours et trait d'aujourd'hui : dans chaque piste.
      const filets = mois.slice(1).map(m => '<i class="fr-filet" style="left:' + pct(x(m)) + '"></i>').join('');
      const lundiAuj = lundiDe(auj);
      const fond = filets + (auj < debut || auj > fin ? '' : '<i class="fr-sem" style="left:' + pct(x(lundiAuj)) + ';width:' + pct(x(addDays(lundiAuj, 7)) - x(lundiAuj)) + '"></i>' +
        '<i class="fr-auj" style="left:' + pct(milieu(auj)) + '"></i>');
      // Case d'une semaine, rognée aux bords de la période ; jusqua : lendemain de son dernier jour (le jour J pour la dernière d'un plan).
      const caseSem = (lundi, jusqua, cls, titre) => {
        const w = ecart(lundi < debut ? debut : lundi, jusqua > fin ? addDays(fin, 1) : jusqua);
        return w > 0 ? '<i class="' + cls + '" style="flex-grow:' + w + '" title="' + esc(titre) + '"></i>' : '';
      };
      // (6) Course : un losange à son jour, de la couleur de sa famille (plein : confirmée ; contour : option ; gris : courue).
      const losange = (c, lien) => '<b class="fr-course ' + couleur(c) + '" style="left:' + pct(milieu(c.date)) + '"' + (lien ? ' data-course="' + esc(c.id) + '"' : '') +
        ' title="' + esc(c.nom + ' · ' + longue(c.date) + ' · ' + (c.courue ? 'courue' : c.validee ? 'confirmée' : 'en option')) + '"></b>';
      // (7) Barre de prépa d'une course, (10) nom et date : une ligne par course à venir.
      function ligne(c) {
        const course = ctx.courses.find(k => k.id === c.id);
        const plan = course ? planDe(course, modifsDe(ctx.semaines, c.id)) : null;
        let piste = fond;
        if (plan) {
          const lendemain = addDays(plan.jourJ, 1), avant = plan.premier < debut, depart = avant ? debut : plan.premier;
          let premiere = true;
          const cases = plan.semaines.map(w => {
            const h = caseSem(w.lundi, w.lundi === lundiDe(plan.jourJ) ? lendemain : addDays(w.lundi, 7), 'ph-' + w.phase,
              c.nom + ' · semaine ' + w.n + ' sur ' + plan.n + ' · ' + NOM_PHASE[w.phase] + (w.modifiee ? ' (modifiée)' : '') + ' · ' + plage(w.lundi) +
              (avant && premiere ? ' · prépa de ' + plan.n + ' semaines, commencée le ' + courte(plan.premier) : ''));
            if (h) premiere = false;
            return h;
          }).join('');
          piste += '<span class="fr-barre' + (c.validee ? '' : ' is-option') + (avant ? ' is-avant' : '') + (c.date > fin ? ' is-apres' : '') + '" style="left:' + pct(x(depart)) + ';width:' + pct(x(lendemain) - x(depart)) + '">' + cases + '</span>';
        }
        return '<div class="fr-ligne' + (c.validee ? '' : ' is-option') + '" data-course="' + esc(c.id) + '"><span class="fr-lab"><b>' + esc(c.nom) + '</b><small>' + dateMois(c.date) +
          (c.validee ? '' : ' · option') + '</small></span><div class="fr-piste">' + piste + (c.date <= fin ? losange(c, false) : '') + '</div></div>';
      }
      // (9) Ligne Saison : la phase suivie chaque semaine (le plan de la course confirmée la plus proche), toutes les courses.
      const semaines = [];
      for (let l = lundiDe(debut); l <= fin; l = addDays(l, 7)) semaines.push(l);
      const saison = fond + '<span class="fr-barre fr-barre-saison">' + semaines.map(w => {
        const s = plansDeLaSemaine(w, plans)[0];
        return caseSem(w, addDays(w, 7), s ? 'ph-' + s.phase : 'sans', 'Sem. du ' + dateCourte(w) + ' · ' +
          (s ? s.plan.course.course + ' · semaine ' + s.n + ' sur ' + s.plan.n + ' · ' + NOM_PHASE[s.phase] : 'Sans objectif clair'));
      }).join('') + '</span>' + liste.map(c => losange(c, true)).join('');
      // (12) Écart entre deux courses qui se suivent, au milieu : « 5 j » sous deux semaines, sinon en semaines.
      const dates = [...new Set(liste.map(c => c.date))];
      const ecarts = dates.slice(1).map((d, i) => {
        const n = ecart(dates[i], d);
        return '<span class="fr-ecart" data-jours="' + n + '" style="left:' + pct((milieu(dates[i]) + milieu(d)) / 2) + '">' + (n < 14 ? n + ' j' : Math.round(n / 7) + ' sem.') + '</span>';
      }).join('');
      const entete = mois.map((m, i) => {
        const d = parse(m), an = i === 0 || d.getMonth() === 0;
        return '<span class="fr-mois" style="left:' + pct(x(m)) + '"><span class="fr-m-long">' + MOIS[d.getMonth()] + (an ? ' <i>' + String(d.getFullYear()).slice(2) + '</i>' : '') +
          '</span><span class="fr-m-court">' + MOIS[d.getMonth()].charAt(0).toUpperCase() + '</span></span>';
      }).join('');
      const versSemaine = ' fr-vers-semaine" data-debut="' + debut + '" data-jours="' + N + '"';
      const legende = '<div class="cal-legende fr-legende"><span><i class="fr-k c-route-v"></i><i class="fr-k c-trail-v"></i>Confirmée (route, trail)</span>' +
        '<span><i class="fr-k option"></i>Option</span><span><i class="fr-k courue"></i>Courue</span>' +
        PHASES.map(p => cle('ph-' + p[0], p[1])).join('') + cle('cal-k-sans', 'Sans objectif clair') + '</div>';
      root.innerHTML = '<div class="cal-cadre"><div class="cal-haut">' + bandeau('annee') + essais('annee') + reglages(depart, nb) + '</div><div class="fr' + (nb === 12 ? ' fr-court' : '') + '">' +
        '<div class="fr-ligne fr-entete"><span class="fr-lab"></span><div class="fr-piste' + versSemaine + '>' + filets + entete + '</div></div>' +
        '<div class="fr-ligne fr-saison"><span class="fr-lab">Saison</span><div class="fr-piste' + versSemaine + '>' + saison + '</div></div>' +
        '<div class="fr-ligne fr-ecarts"><span class="fr-lab"></span><div class="fr-piste">' + ecarts + '</div></div>' +
        ensuite.filter(c => !c.courue && (c.date <= fin || (c.debutPrepa && c.debutPrepa <= fin))).map(ligne).join('') + '</div>' + legende + '</div>';
      masquerEcarts();
    }

    // Deux écarts qui se touchent : on garde le plus court (deux courses rapprochées).
    function masquerEcarts() {
      let prec = null;
      root.querySelectorAll('.fr-ecart').forEach(e => {
        e.hidden = false;
        if (prec && e.getBoundingClientRect().left < prec.getBoundingClientRect().right + 4) {
          if (+e.dataset.jours < +prec.dataset.jours) { prec.hidden = true; prec = e; } else e.hidden = true;
        } else prec = e;
      });
    }

    // ----- Grilles (essai) : une case par jour, une colonne par mois, le trait de prépa vertical à gauche des cases -----
    // lisible : nouvelle grille (spécification § 3.4), avec le nom de la course au départ de son trait (15).
    function grilleHtml(mois, lisible) {
      const aujourdhui = iso(new Date());
      const dernier = mois[mois.length - 1];
      const debut = iso(mois[0]);
      const fin = iso(new Date(dernier.getFullYear(), dernier.getMonth() + 1, 0));
      const ensuite = visibles(ctx.courses, debut, '9999-12-31', aujourdhui), liste = ensuite.filter(c => c.date <= fin);
      // Trait de prépa : vertical, du premier jour de la prépa jusqu'à la course ; commencée avant la fenêtre, il part du premier jour affiché.
      // Deux prépas qui se chevauchent prennent deux couloirs, côte à côte.
      const prepas = ensuite.filter(c => c.debutPrepa && c.debutPrepa <= fin).map(c => Object.assign({ depart: c.debutPrepa < debut ? debut : c.debutPrepa }, c))
        .sort((a, b) => (a.depart < b.depart ? -1 : a.depart > b.depart ? 1 : a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      const finCouloir = [];
      prepas.forEach(x => {
        let k = finCouloir.findIndex(f => f < x.depart);
        if (k < 0) { k = finCouloir.length; finCouloir.push(''); }
        finCouloir[k] = x.date;
        x.couloir = k;
      });
      // (15) Nom de la course au départ de son trait ; deux prépas qui partent le même jour (souvent le premier jour affiché) :
      // le second nom passe au jour suivant libre (sans course ni autre nom), dans la même semaine.
      const etiquettes = new Map();
      if (lisible) prepas.forEach(x => {
        for (let j = x.depart, k = 0; k < 7 && j < x.date && j <= fin; j = addDays(j, 1), k++)
          if (!etiquettes.has(j) && !liste.some(c => c.date === j)) { etiquettes.set(j, x); break; }
      });

      function bloc(colonnes) {
        let h = '<div class="cal-bloc" style="--n:' + colonnes.length + ';--couloirs:' + finCouloir.length + '"><span></span>';
        colonnes.forEach(m => {
          const an = m.getMonth() === 0 || m.getTime() === mois[0].getTime();
          h += '<b class="cal-mois">' + MOIS[m.getMonth()] + (an ? ' <i>' + String(m.getFullYear()).slice(2) + '</i>' : '') + '</b>';
        });
        for (let dd = 1; dd <= 31; dd++) {
          h += '<span class="cal-n">' + dd + '</span>';
          colonnes.forEach(m => {
            const y = m.getFullYear(), mm = m.getMonth();
            if (dd > new Date(y, mm + 1, 0).getDate()) { h += '<span class="cal-j vide"></span>'; return; }
            const jour = iso(new Date(y, mm, dd));
            const cls = ['cal-j'], tip = [longue(jour)];
            if (jour < aujourdhui) cls.push('passe');
            if (jour === aujourdhui) { cls.push('auj'); tip.push("aujourd'hui"); }
            const c = liste.find(x => x.date === jour);
            let contenu = '', cible = '';
            if (c) {
              cls.push(couleur(c));
              tip.push(c.nom + ' · ' + (c.courue ? 'courue' : (c.famille === 'trail' ? 'trail' : 'route') + (c.validee ? ', confirmée' : ', en option')));
              contenu += '<span class="cal-nom">' + esc(c.nom) + '</span>';
              cible = ' data-course="' + esc(c.id) + '"';
            } else if (etiquettes.has(jour)) {
              const part = etiquettes.get(jour);
              contenu += '<span class="cal-nom cal-depart"><b class="c-' + part.famille + (part.validee ? '-v' : '-n') + '">▸</b> ' + esc(part.nom) + '</span>';
            }
            const enPrepa = prepas.filter(x => jour >= x.depart && jour < x.date); // jusqu'à la veille : le trait aboutit sur la case de la course
            if (enPrepa.length) {
              contenu += '<span class="cal-traits">' + enPrepa.map(x => '<i class="cal-trait c-' + x.famille + (x.validee ? '-v' : '-n') +
                (jour === x.depart ? ' debut' : '') + (jour === addDays(x.date, -1) ? ' fin' : '') + '" style="--k:' + x.couloir + '"></i>').join('') + '</span>';
              enPrepa.forEach(x => tip.push(jour === x.depart
                ? 'début de la prépa : ' + x.nom + ' (' + x.semaines + ' semaines' + (x.debutPrepa < debut ? ', commencée le ' + courte(x.debutPrepa) : '') + ')'
                : 'prépa : ' + x.nom));
            }
            h += '<span class="' + cls.join(' ') + '" data-jour="' + jour + '"' + cible + ' title="' + esc(tip.join(' · ')) + '">' + contenu + '</span>';
          });
        }
        return h + '</div>';
      }

      // Six mois par bloc sur ordinateur (trois en 3 mois), trois sur téléphone.
      const taille = mobile.matches ? 3 : Math.min(6, mois.length);
      let blocs = '';
      for (let i = 0; i < mois.length; i += taille) blocs += bloc(mois.slice(i, i + taille));
      return '<div class="cal-blocs">' + blocs + '</div>';
    }

    // Ancienne grille : douze mois à partir du mois en cours, telle qu'avant la refonte.
    function vueGrille() {
      root.innerHTML = '<div class="cal-cadre"><div class="cal-haut">' + bandeau('annee') + essais('annee') +
        '<div class="cal-legende">' + cle('c-route-v', 'Route confirmée') + cle('c-route-n', 'Route en option') + cle('c-trail-v', 'Trail confirmée') +
        cle('c-trail-n', 'Trail en option') + cle('cal-k-trait', 'Préparation') + cle('courue', 'Courue') + cle('cal-k-auj', "Aujourd'hui") + '</div></div>' +
        grilleHtml(moisDe(iso(new Date()).slice(0, 7), 12), false) + '</div>';
    }

    // Nouvelle grille : période au choix, lignes plus hautes, légende lisible sur sa ligne, regroupée par famille.
    function vueGrilleLisible(depart, nb) {
      const famille = (nom, f) => '<span class="cal-leg-groupe"><b>' + nom + '</b>' + cle('c-' + f + '-v', 'confirmée') + cle('c-' + f + '-n', 'option') + '</span>';
      root.innerHTML = '<div class="cal-cadre cal-grille2' + (nb === 12 ? ' is-12' : '') + '"><div class="cal-haut">' + bandeau('annee') + essais('annee') + reglages(depart, nb) + '</div>' +
        '<div class="cal-legende cal-legende2">' + famille('Route', 'route') + famille('Trail', 'trail') + cle('courue', 'courue') + cle('cal-k-trait', 'préparation') +
        cle('cal-k-auj', 'aujourd\'hui') + '</div>' + grilleHtml(moisDe(depart, nb), true) + '</div>';
    }

    // ----- Affichage et événements -----
    function dessiner() {
      const vue = lireHash();
      if (vue.v === 'semaines') (essai('semaine') === 'ancienne' ? vueQuatre : vueSemaine)(vue.lundi);
      else if (essai('annee') === 'grille') vueGrille();
      else (essai('annee') === 'nouvelle-grille' ? vueGrilleLisible : vueFrise)(vue.mois, periode());
    }

    root.addEventListener('click', e => {
      const bouton = e.target.closest('[data-essai]'), choix = e.target.closest('[data-periode]');
      if (bouton) { ranger('mrt-essai-' + bouton.dataset.essai, bouton.dataset.valeur); dessiner(); return; }
      if (choix) { ranger('mrt-calendrier-mois', choix.dataset.periode); dessiner(); return; }
      const course = e.target.closest('[data-course]'), jour = e.target.closest('[data-jour]'), piste = e.target.closest('.fr-vers-semaine');
      // La page de la course s'ouvre en modale, à la rubrique Préparation ; une course courue, à son résultat.
      if (course) {
        const ancre = course.classList.contains('courue') ? '' : '#preparation';
        if (window.mrtOuvrirCourse) window.mrtOuvrirCourse(course.dataset.course, ancre); else location.href = lienCourse(course.dataset.course).replace(/#.*/, ancre);
        return;
      }
      if (jour) location.hash = '#semaines=' + lundiDe(jour.dataset.jour);
      // Frise : toucher les mois ou la ligne Saison ouvre la semaine touchée.
      else if (piste) {
        const r = piste.getBoundingClientRect(), n = Number(piste.dataset.jours);
        const k = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left) / r.width * n)));
        location.hash = '#semaines=' + lundiDe(addDays(piste.dataset.debut, k));
      }
    });
    P.brancher(root, ctx, null);
    window.addEventListener('hashchange', dessiner);
    if (mobile.addEventListener) mobile.addEventListener('change', dessiner);
    let attente = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(attente); attente = requestAnimationFrame(masquerEcarts); });
    dessiner();
  };
})();
