// ===== Calendrier : vue Année et vue 4 semaines =====
//
// docs/module-calendrier-specification.md. renderCalendrier(élément, ctx) dessine
// l'une des deux vues, choisie par l'adresse (#annee, #semaines=AAAA-MM-JJ) : le
// bouton retour du navigateur ramène à la vue d'avant. Une course touchée mène à
// sa page, à la rubrique Préparation. Plan, séances et fenêtres : preparation.js.
//   ctx.courses, ctx.seances, ctx.semaines, ctx.lectureSeule, ctx.relire() : voir preparation.js.
(function () {
  const P = window.mrtPreparation;
  const { MOIS, PHASES, iso, addDays, lundiDe, longue, courte, esc, visibles, tousLesPlans, phaseSemaine, semaineHtml, lienCourse } = P;

  window.renderCalendrier = function (root, ctx) {
    const mobile = window.matchMedia('(max-width: 600px)');

    function lireHash() {
      const [k, v] = location.hash.replace(/^#/, '').split('=');
      if (k === 'semaines') return { v: 'semaines', lundi: lundiDe(/^\d{4}-\d\d-\d\d$/.test(v || '') ? v : iso(new Date())) };
      return { v: 'annee' };
    }

    // Relit les données, puis redessine la vue.
    ctx.actualiser = async () => {
      Object.assign(ctx, await ctx.relire());
      dessiner();
    };

    // ----- Éléments communs -----
    const bandeau = vue => '<select class="cal-vue" aria-label="Vue"><option value="annee"' + (vue === 'annee' ? ' selected' : '') + '>Année</option>' +
      '<option value="semaines"' + (vue === 'semaines' ? ' selected' : '') + '>4 semaines</option></select>';
    const cle = (cls, txt) => '<span><i class="cal-k ' + cls + '"></i>' + txt + '</span>';
    const legendePhases = () => '<div class="cal-legende">' + PHASES.map(p => cle('ph-' + p[0], p[1])).join('') + cle('cal-k-sans', 'Sans objectif clair') +
      '<span>◆ Rendez-vous clé</span></div>';

    // ----- Vue 4 semaines -----
    function vueSemaines(lundi) {
      const plans = tousLesPlans(ctx);
      let h = '<div class="cal-cadre"><div class="cal-haut">' + bandeau('semaines') +
        '<span class="cal-nav"><a class="mrt-rond" href="#semaines=' + addDays(lundi, -28) + '" aria-label="4 semaines plus tôt">‹</a><a class="mrt-rond" href="#semaines=' + addDays(lundi, 28) + '" aria-label="4 semaines plus tard">›</a></span>' +
        legendePhases() + '</div><div class="cal-sem-liste">';
      for (let i = 0; i < 4; i++) {
        const l = addDays(lundi, 7 * i), p = phaseSemaine(l, plans);
        h += semaineHtml(ctx, l, p ? { phase: p.phase, autres: p.autres, modifiee: p.modifiee } : {});
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

    // ----- Affichage et événements -----
    function dessiner() {
      const vue = lireHash();
      if (vue.v === 'semaines') vueSemaines(vue.lundi); else vueAnnee();
    }

    root.addEventListener('click', e => {
      const course = e.target.closest('[data-course]'), jour = e.target.closest('[data-jour]');
      if (course) { location.href = lienCourse(course.dataset.course); return; }
      if (jour) location.hash = '#semaines=' + lundiDe(jour.dataset.jour);
    });
    root.addEventListener('change', e => {
      if (e.target.classList.contains('cal-vue')) location.hash = '#' + e.target.value;
    });
    P.brancher(root, ctx, null);
    window.addEventListener('hashchange', dessiner);
    if (mobile.addEventListener) mobile.addEventListener('change', () => { if (lireHash().v === 'annee') dessiner(); });
    dessiner();
  };
})();
