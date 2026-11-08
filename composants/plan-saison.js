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


  // ----- Profil d'entraînement (spécification, § 5.2) -----
  const JOURS7 = [[1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi'], [7, 'Dimanche']];
  const MOYENS = [['tapis', 'Tapis'], ['velo', 'Vélo'], ['piscine', 'Piscine']];
  // Champs obligatoires pour proposer des séances ; rend la liste de ce qui manque.
  function manquants(pr) {
    const m = [];
    if (!pr || pr.annees == null) m.push('années de pratique');
    if (!pr || pr.volume == null) m.push('volume des 4 dernières semaines');
    if (!pr || pr.sortie_longue == null) m.push('plus longue sortie récente');
    if (!pr || !(pr.jours || []).length) m.push('jours possibles');
    if (!pr || (pr.vma == null && pr.temps_10km_s == null && pr.temps_semi_s == null)) m.push('VMA ou temps de référence');
    return m;
  }
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

  function ouvrirProfil(ctx) {
    const pr = ctx.profil || {}, champ = (lib, html, cls) => '<label class="cal-champ' + (cls ? ' ' + cls : '') + '"><span>' + lib + '</span>' + html + '</label>';
    const entree = (n, v, mode) => '<input class="mrt-champ" name="' + n + '" inputmode="' + (mode || 'decimal') + '" value="' + esc(v) + '">';
    const unite = (n, v) => '<select class="mrt-champ" name="' + n + '"><option value="km"' + (v !== 'h' ? ' selected' : '') + '>km</option><option value="h"' + (v === 'h' ? ' selected' : '') + '>heures</option></select>';
    const coches = (n, liste, choisis) => '<div class="ps-coches">' + liste.map(([k, lib]) => '<label class="mrt-pastille"><input type="checkbox" name="' + n + '" value="' + k + '"' + ((choisis || []).map(String).includes(String(k)) ? ' checked' : '') + '>' + lib + '</label>').join('') + '</div>';
    const groupe = (titre, html) => '<fieldset class="ps-groupe"><legend class="ps-libelle">' + titre + '</legend>' + html + '</fieldset>';
    const v = P.fenetre('<form novalidate>' + P.barre('<button type="submit" class="mrt-btn is-principal">Enregistrer</button>') + P.titreFenetre('Mon profil d\'entraînement') +
      '<p class="ps-aide">Les champs marqués * sont nécessaires pour proposer des séances. Ton profil n\'est jamais visible sur le site partagé.</p>' +
      groupe('Niveau', champ('Années de pratique *', entree('annees', pr.annees == null ? '' : pr.annees, 'numeric')) +
        '<div class="ps-ligne">' + champ('Volume moyen des 4 dernières semaines *', entree('volume', virgule(pr.volume))) + champ('Par semaine, en', unite('volume_unite', pr.volume_unite)) + '</div>' +
        '<div class="ps-ligne">' + champ('Plus longue sortie récente *', entree('sortie_longue', virgule(pr.sortie_longue))) + champ('En', unite('sortie_longue_unite', pr.sortie_longue_unite)) + '</div>') +
      groupe('Disponibilités', '<p class="cal-champ"><span>Jours possibles *</span></p>' + coches('jours', JOURS7.map(([k, n]) => [k, n.slice(0, 3) + '.']), pr.jours) +
        '<div class="ps-ligne">' + champ('Jour de la sortie longue', '<select class="mrt-champ" name="jour_long"><option value="">—</option>' + JOURS7.map(([k, n]) => '<option value="' + k + '"' + (pr.jour_long === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>') +
        champ('Séance la plus longue (min)', entree('seance_max_min', pr.seance_max_min == null ? '' : pr.seance_max_min, 'numeric')) + champ('Par semaine, au plus (h)', entree('semaine_max_h', virgule(pr.semaine_max_h))) + '</div>') +
      groupe('Allures', '<p class="ps-aide">Au moins l\'un des trois * : ta VMA, ou un temps récent sur 10 km ou sur semi-marathon.</p><div class="ps-ligne">' +
        champ('VMA (km/h)', entree('vma', virgule(pr.vma))) + champ('Temps sur 10 km', entree('temps_10km', enTemps(pr.temps_10km_s), 'text').replace('>', ' placeholder="ex. 45:30">')) +
        champ('Temps sur semi', entree('temps_semi', enTemps(pr.temps_semi_s), 'text').replace('>', ' placeholder="ex. 1:42:00">')) + champ('FC max (facultative)', entree('fc_max', pr.fc_max == null ? '' : pr.fc_max, 'numeric')) + '</div>') +
      groupe('Renforcement et moyens', '<div class="ps-ligne">' + champ('Séances de renforcement par semaine', '<select class="mrt-champ" name="renfo"><option value="">—</option>' + [0, 1, 2, 3].map(k => '<option value="' + k + '"' + (pr.renfo === k ? ' selected' : '') + '>' + k + '</option>').join('') + '</select>') + '</div>' +
        '<p class="cal-champ"><span>Moyens</span></p>' + coches('moyens', MOYENS, pr.moyens)) +
      groupe('Points fragiles', champ('Facultatif', '<textarea class="mrt-champ" name="fragiles" maxlength="300" rows="2" placeholder="ex. tendon d\'Achille gauche">' + esc(pr.fragiles || '') + '</textarea>')) +
      '</form>', 'ps-profil');
    const f = v.querySelector('form'), msg = v.querySelector('.cal-msg');
    v.querySelector('[data-act="annuler"]').addEventListener('click', v.fermer);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const n = k => P.nombre(f[k].value), err = t => { msg.textContent = t; };
      const r = {
        annees: n('annees'), volume: n('volume'), volume_unite: f.volume_unite.value, sortie_longue: n('sortie_longue'), sortie_longue_unite: f.sortie_longue_unite.value,
        jours: [...f.querySelectorAll('[name="jours"]:checked')].map(x => Number(x.value)), jour_long: f.jour_long.value ? Number(f.jour_long.value) : null,
        seance_max_min: n('seance_max_min'), semaine_max_h: n('semaine_max_h'), vma: n('vma'), temps_10km_s: secondes(f.temps_10km.value), temps_semi_s: secondes(f.temps_semi.value),
        fc_max: n('fc_max'), renfo: f.renfo.value === '' ? null : Number(f.renfo.value), moyens: [...f.querySelectorAll('[name="moyens"]:checked')].map(x => x.value), fragiles: f.fragiles.value.trim() || null
      };
      const hors = (x, a, b, entier) => x !== null && (Number.isNaN(x) || x < a || x > b || (entier && !Number.isInteger(x)));
      if (hors(r.annees, 0, 80, true)) return err('Années de pratique : un nombre entier de 0 à 80.');
      if (hors(r.volume, 0.1, 500)) return err('Le volume doit être compris entre 0,1 et 500.');
      if (hors(r.sortie_longue, 0.1, 300)) return err('La plus longue sortie doit être comprise entre 0,1 et 300.');
      if (hors(r.seance_max_min, 10, 1440, true)) return err('La séance la plus longue : un nombre de minutes entre 10 et 1 440.');
      if (hors(r.semaine_max_h, 0.1, 60)) return err('Le maximum par semaine doit être compris entre 0,1 et 60 heures.');
      if (hors(r.vma, 8, 30)) return err('La VMA doit être comprise entre 8 et 30 km/h.');
      if (hors(r.temps_10km_s, 1200, 7200, true)) return err('Le temps sur 10 km s\'écrit 45:30 (entre 20:00 et 2:00:00).');
      if (hors(r.temps_semi_s, 3000, 14400, true)) return err('Le temps sur semi s\'écrit 1:42:00 (entre 50:00 et 4:00:00).');
      if (hors(r.fc_max, 100, 230, true)) return err('La FC max doit être comprise entre 100 et 230.');
      const btn = f.querySelector('[type="submit"]'); btn.disabled = true;
      const { error } = await window.mrtSupabase.from('profil_entrainement').upsert(Object.assign({}, r, { maj: new Date().toISOString() }));
      if (error) { btn.disabled = false; console.warn(error); return err('Enregistrement impossible pour l\'instant.'); }
      ctx.profil = Object.assign({}, ctx.profil, r);
      v.fermer(); ctx.redessiner();
    });
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
      h += '<section class="ps-bloc"><h2 class="ps-libelle">Bloc en cours · ' + BLOC + ' semaines à partir du ' + longue(lundi) + '</h2><div class="cal-sem-liste">';
      for (let i = 0; i < BLOC; i++) {
        const l = addDays(lundi, 7 * i), x = P.phaseDe(ps, l), rep = reperesSemaine(ps, l);
        h += (rep.length ? '<ul class="ps-reperes">' + rep.map(t => '<li>' + t + '</li>').join('') + '</ul>' : '') +
          P.semaineHtml(ctx, l, { phase: x ? x.phase : null, numero: x && x.saison ? x.saison.semaines.findIndex(w => w.lundi === l) + 1 : null, modifiee: x && x.modifiee });
      }
      root.innerHTML = h + '</div></section></div>';
    }

    ctx.redessiner = dessiner;
    root.addEventListener('click', e => { if (e.target.closest('[data-profil]')) ouvrirProfil(ctx); });
    P.brancher(root, ctx, null);
    dessiner();
    // Le profil d'entraînement (une ligne, la sienne : règle par ligne), lu après le premier dessin ; jamais sur le site partagé.
    if (!ctx.lectureSeule) window.mrtSupabase.from('profil_entrainement').select('*').then(({ data, error }) => {
      if (error) console.warn(error);
      ctx.profil = (data && data[0]) || null;
      dessiner();
    });
  };
})();
