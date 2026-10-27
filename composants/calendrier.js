// ===== Calendrier : vue Année =====
//
// docs/module-calendrier-specification.md, § 3. renderCalendrier(élément, courses)
// dessine douze mois à partir du mois en cours : une colonne par mois, une ligne
// par jour. Six colonnes sur ordinateur (deux blocs), trois sur téléphone
// (quatre blocs). Une course est une case de couleur (route ou trail, validée ou
// non) ; un trait sur le premier jour de sa préparation montre où elle commence.
(function () {
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

  // Durée de préparation par défaut, en semaines, selon le format (spécification § 5.4).
  // Un format absent de la liste n'a pas de préparation affichée.
  const SEMAINES = { route_5km: 8, route_10km: 8, route_20km: 10, route_semi: 10, route_marathon: 16, route_ultra: 16, route_100km: 16,
    trail_court: 12, trail_long: 16, trail_ultra: 16 };

  // Dates en heure locale, au format 'AAAA-MM-JJ' : comparables comme du texte.
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const longue = s => { const d = parse(s); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear(); };
  const courte = s => { const d = parse(s); return d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear(); };
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Lundi de la semaine du jour donné, moins n semaines.
  function lundiAvant(s, n) {
    const d = parse(s);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * n);
    return iso(d);
  }

  // Courses affichées dans la fenêtre : confirmées et options à venir (une option passée disparaît),
  // courues (grisées). Ni à surveiller, ni abandonnées.
  function visibles(courses, debut, fin, auj) {
    return courses.filter(c => c.date && c.date >= debut && c.date <= fin && (c.etat === 'courue' ||
      (c.etat === 'a_venir' && (c.statut === 'confirmee' || (c.statut === 'option' && c.date >= auj)))))
      .map(c => {
        const semaines = SEMAINES[c.format] || null;
        return {
          date: c.date, nom: c.course,
          famille: c.type === 'trail' ? 'trail' : 'route',
          validee: c.statut === 'confirmee',
          courue: c.etat === 'courue',
          semaines,
          debutPrepa: semaines && c.etat !== 'courue' ? lundiAvant(c.date, semaines - 1) : null
        };
      });
  }

  window.renderCalendrier = function (root, courses) {
    const aujourdhui = iso(new Date());
    const premier = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const mois = Array.from({ length: 12 }, (_, i) => new Date(premier.getFullYear(), premier.getMonth() + i, 1));
    const debut = iso(mois[0]);
    const fin = iso(new Date(mois[11].getFullYear(), mois[11].getMonth() + 1, 0));
    const liste = visibles(courses, debut, fin, aujourdhui);
    // Début de préparation avant la fenêtre : le trait se pose sur le premier jour affiché.
    const prepas = liste.filter(c => c.debutPrepa && c.debutPrepa <= fin).map(c => Object.assign({ jourTrait: c.debutPrepa < debut ? debut : c.debutPrepa }, c));
    const mobile = window.matchMedia('(max-width: 600px)');

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
          let contenu = '';
          if (c) {
            cls.push(c.courue ? 'courue' : 'c-' + c.famille + (c.validee ? '-v' : '-n'));
            tip.push(c.nom + ' · ' + (c.courue ? 'courue' : (c.famille === 'trail' ? 'trail' : 'route') + (c.validee ? ', validée' : ', non validée')));
            contenu += '<span class="cal-nom">' + esc(c.nom) + '</span>';
          }
          const traits = prepas.filter(x => x.jourTrait === jour);
          if (traits.length) {
            contenu += '<span class="cal-traits">' + traits.map(x => '<i class="cal-trait c-' + x.famille + (x.validee ? '-v' : '-n') + '"></i>').join('') + '</span>';
            traits.forEach(x => tip.push('début de la prépa : ' + x.nom + ' (' + x.semaines + ' semaines' + (x.debutPrepa < debut ? ', commencée le ' + courte(x.debutPrepa) : '') + ')'));
          }
          h += '<span class="' + cls.join(' ') + '" title="' + esc(tip.join(' · ')) + '">' + contenu + '</span>';
        });
      }
      return h + '</div>';
    }

    function dessiner() {
      const taille = mobile.matches ? 3 : 6;
      let blocs = '';
      for (let i = 0; i < 12; i += taille) blocs += bloc(mois.slice(i, i + taille));
      const cle = (cls, txt) => '<span><i class="cal-k ' + cls + '"></i>' + txt + '</span>';
      root.innerHTML = '<div class="cal-cadre">' +
        '<div class="cal-haut"><select class="cal-vue" aria-label="Vue"><option value="annee">Année</option><option value="semaines" disabled>4 semaines (à venir)</option></select>' +
        '<div class="cal-legende">' + cle('c-route-v', 'Route validée') + cle('c-route-n', 'Route non validée') + cle('c-trail-v', 'Trail validée') +
        cle('c-trail-n', 'Trail non validée') + cle('cal-k-trait', 'Début de prépa') + cle('courue', 'Courue') + cle('cal-k-auj', "Aujourd'hui") + '</div></div>' +
        '<div class="cal-blocs">' + blocs + '</div></div>';
    }

    dessiner();
    if (mobile.addEventListener) mobile.addEventListener('change', dessiner);
  };
})();
