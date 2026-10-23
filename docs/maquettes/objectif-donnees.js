// ===== Maquettes Objectif : données fictives et outils communs =====
// Courses inventées pour la maquette ; la vraie page lira la liste de l'utilisateur.
(function () {
  const COURSES = [
    { id: 1, course: 'Trail du Lac', parcours: 'Le Tour du Lac', lieu: 'Mont-Clair', format: 'Trail court', date: '2026-11-15', heure: '09:00',
      distance: 24, dplus: 650, dmoins: 650, statut: 'confirmee', role: 'preparatoire', objectif: '2:45', inscrit: true, dossard: '412', prix: 32,
      pourquoi: 'Reprise en compétition après la coupure, sur un format court.', logistique: 'Retrait du dossard sur place dès 7 h 30.', lien: '#' },
    { id: 2, course: 'Corrida de Noël', lieu: 'Ville-Haute', format: 'Route', date: '2026-12-13', heure: '18:30',
      distance: 10, dplus: 40, statut: 'confirmee', role: 'plaisir', inscrit: false, ouverture: '2026-11-01', lien: '#', inscription: '#' },
    { id: 3, course: 'Trail des Gorges', lieu: 'Mont-Clair', format: 'Trail long', date: '2027-03-07', heure: '07:30',
      distance: 45, dplus: 2100, dmoins: 2100, statut: 'confirmee', role: 'objectif_intermediaire', objectif: '6:30', inscrit: true, dossard: '1287', prix: 58,
      pourquoi: 'Répétition générale du matériel et de la nutrition sur un format long, six mois avant l\'objectif.',
      strategie: 'Partir prudemment jusqu\'au premier ravitaillement (km 12). Marcher dans les montées raides, relancer dans la dernière descente.',
      logistique: 'Retrait des dossards la veille de 15 h à 19 h. Navette depuis le parking du stade à 6 h 30.',
      description: 'Boucle par les crêtes et les gorges, trois ravitaillements.', lien: '#', inscription: '#', lien_resultats: '#' },
    { id: 4, course: 'Trail des Cimes', lieu: 'Haut-Val', format: 'Trail long', date: '2027-05-30', distance: 42, dplus: 2500,
      statut: 'option', role: 'preparatoire', groupe: 'Printemps 2027', inscrit: false, ouverture: '2027-01-10', lien: '#', inscription: '#' },
    { id: 5, course: 'Ultra du Plateau', parcours: 'Le 55', lieu: 'Plaine-Neuve', format: 'Trail long', date: '2027-06-26', distance: 55, dplus: 2800,
      statut: 'option', role: 'preparatoire', groupe: 'Printemps 2027', inscrit: false, ouverture: '2026-09-01', prix: 65, lien: '#', inscription: '#' },
    { id: 6, course: 'Trail de la Forêt', lieu: 'Bois-Joli', format: 'Trail court', date: '2027-07', approx: true, distance: 30, dplus: 1200,
      statut: 'option', role: 'preparatoire', inscrit: false },
    { id: 7, course: 'Trail des Crêtes', parcours: 'Le Grand Tour', lieu: 'Mont-Clair', format: 'Trail ultra', date: '2027-08-28', heure: '05:00',
      distance: 60, dplus: 3500, dmoins: 3500, statut: 'confirmee', role: 'objectif', objectif: 'Finisher', inscrit: true, dossard: '88', prix: 95,
      pourquoi: 'L\'objectif de la saison.', strategie: 'Rester sous 150 bpm jusqu\'au km 40.', lien: '#', inscription: '#' }
  ];
  const MAINTENANT = new Date(2026, 9, 20, 10, 0, 0); // date figée, comme le banc d'essai

  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const ROLES = { preparatoire: 'Préparatoire', plaisir: 'Plaisir', objectif_intermediaire: 'Objectif intermédiaire', objectif: 'Objectif principal' };
  const nf = new Intl.NumberFormat('fr-FR');
  const parse = c => { const p = c.date.split('-').map(Number); const h = (c.heure || '00:00').split(':').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1, h[0], h[1]); };
  const jour = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  // Étapes : un groupe d'options compte pour une seule étape, à la date de sa première candidate.
  function etapes() {
    const res = [];
    COURSES.forEach(c => {
      if (c.groupe) {
        const g = res.find(e => e.groupe === c.groupe);
        if (g) { g.candidates.push(c); return; }
        res.push({ groupe: c.groupe, candidates: [c] });
      } else res.push({ course: c });
    });
    return res;
  }

  window.MQ = {
    COURSES, MAINTENANT, ROLES, nf, etapes,
    nom: c => c.course + (c.parcours ? ' · ' + c.parcours : ''),
    dateCourte: c => c.approx ? MOIS_LONG[+c.date.slice(5, 7) - 1] + ' ' + c.date.slice(0, 4) : +c.date.slice(8) + ' ' + MOIS[+c.date.slice(5, 7) - 1] + ' ' + c.date.slice(0, 4),
    dateLongue: c => {
      if (c.approx) return MOIS_LONG[+c.date.slice(5, 7) - 1] + ' ' + c.date.slice(0, 4) + ' (date à préciser)';
      const d = parse(c);
      return JOURS[d.getDay()] + ' ' + (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS_LONG[d.getMonth()] + ' ' + d.getFullYear() + (c.heure ? ', ' + (+c.heure.slice(0, 2)) + ' h ' + c.heure.slice(3) : '');
    },
    jMoins: c => (c.approx ? null : Math.round((jour(parse(c)) - jour(MAINTENANT)) / 864e5)),
    // Compte à rebours en jours, heures, minutes, secondes ; « maintenant » avance depuis la date figée.
    depart: c => (c.approx ? null : parse(c)),
    maintenant: (() => { const t0 = Date.now(); return () => new Date(MAINTENANT.getTime() + Date.now() - t0); })(),
    decompose: ms => ({ j: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), m: Math.floor(ms % 36e5 / 6e4), s: Math.floor(ms % 6e4 / 1e3) }),
    // Dossard : inscrit, inscriptions ouvertes, ouverture à venir, ou rien de connu.
    dossard: c => {
      if (c.inscrit) return { etat: 'inscrit', texte: 'Inscrit', detail: c.dossard ? 'n° ' + c.dossard : '' };
      if (!c.ouverture) return { etat: 'inconnu', texte: 'Pas inscrit', detail: '' };
      const p = c.ouverture.split('-').map(Number), o = new Date(p[0], p[1] - 1, p[2]);
      const j = Math.round((jour(o) - jour(MAINTENANT)) / 864e5);
      if (j > 0) return { etat: 'bientot', ouv: (p[2] === 1 ? '1er' : p[2]) + ' ' + MOIS[p[1] - 1], detail: 'J-' + j };
      return { etat: 'ouvert', texte: 'Inscriptions ouvertes', detail: '' };
    },
    // Compteur en quatre cases ; un seul minuteur met à jour toute la page.
    compteurHtml: c => c.approx
      ? '<div class="cpt is-vide">Date à préciser</div>'
      : '<div class="cpt" data-depart="' + parse(c).getTime() + '">' + [['j', 'Jours'], ['h', 'Heures'], ['m', 'Min'], ['s', 'Sec']]
        .map(u => '<div class="cpt-case"><span class="cpt-n" data-u="' + u[0] + '">--</span><span class="cpt-l">' + u[1] + '</span></div>').join('') + '</div>',
    // Compte à rebours sur une ligne, pour les candidates d'un groupe.
    compteurLigneHtml: c => c.approx ? '' : '<span class="cpt-ligne" data-depart="' + parse(c).getTime() + '"></span>',
    lancerCompteurs: () => {
      const p = n => String(n).padStart(2, '0');
      const tic = () => {
        const now = MQ.maintenant().getTime();
        document.querySelectorAll('[data-depart]').forEach(el => {
          const ms = +el.dataset.depart - now;
          if (ms <= 0) { el.textContent = 'Course courue'; el.classList.add('is-vide'); return; }
          const t = MQ.decompose(ms);
          if (el.classList.contains('cpt-ligne')) { el.textContent = t.j + ' j ' + p(t.h) + ' h ' + p(t.m) + ' min ' + p(t.s) + ' s'; return; }
          el.querySelectorAll('.cpt-n').forEach(n => { const v = t[n.dataset.u]; n.textContent = n.dataset.u === 'j' ? v : p(v); });
        });
      };
      tic(); setInterval(tic, 1000);
    },
    // Dossard, quatre propositions de rendu (v) pour quatre états.
    // 1 étiquette (comme le rôle) · 2 pastille et texte · 3 indicateur (comme l'en-tête) · 4 bouton (comme le Palmarès).
    dossardHtml: (c, v) => {
      const d = MQ.dossard(c), num = c.dossard ? 'n° ' + c.dossard : '';
      const lien = d.etat === 'ouvert' && c.inscription;
      const el = (cls, html) => lien
        ? '<a class="' + cls + '" href="' + c.inscription + '" target="_blank" rel="noopener">' + html + '</a>'
        : '<span class="' + cls + '">' + html + '</span>';
      const fl = lien ? ' ↗' : '';
      const k = ' is-' + d.etat;
      if (v === 2) return el('ins ins-pt' + k, '<i></i>' + ({ inscrit: 'Inscrit' + (num ? ' · ' + num : ''), ouvert: 'Inscriptions ouvertes' + fl,
        bientot: 'Ouvre le ' + d.ouv + ' · <b>' + d.detail + '</b>', inconnu: 'Pas inscrit' })[d.etat]);
      if (v === 3) return '<div class="ob-stat ins-ind' + k + '"><span class="ob-stat-val">' + ({ inscrit: num || '✓', ouvert: lien ? el('', 'Ouvertes ↗') : 'Ouvertes',
        bientot: d.ouv + ' <small>' + d.detail + '</small>', inconnu: '—' })[d.etat] + '</span><span class="ob-stat-label">' +
        ({ inscrit: 'Dossard', ouvert: 'Inscriptions', bientot: 'Ouverture', inconnu: 'Dossard' })[d.etat] + '</span></div>';
      if (v === 4) return d.etat === 'ouvert' ? el('ins ins-btn', 'S\'inscrire' + fl)
        : el('ins ins-btn-' + d.etat, ({ inscrit: '✓ Inscrit' + (num ? ' · ' + num : ''), bientot: 'Ouvre le ' + d.ouv + ' · ' + d.detail, inconnu: 'Pas inscrit' })[d.etat]);
      return el('ins ins-tag' + k, ({ inscrit: '✓ Inscrit' + (num ? ' · ' + num : ''), ouvert: 'Inscriptions ouvertes' + fl,
        bientot: 'Ouvre le ' + d.ouv + ' · ' + d.detail, inconnu: 'Pas inscrit' })[d.etat]);
    },
    // En-tête du site, dessiné par le vrai composant.
    entete: () => renderEnTete({
      racine: '../../',
      theme: new URLSearchParams(location.search).get('t'),
      maintenant: '2026-10-20',
      objectif: { nom: 'Trail des Crêtes', distance: 60, dplus: 3500, date: '2027-08-28', dIciLa: 5, cible: 'Finisher' },
      prochaine: { nom: 'Trail du Lac', date: '2026-11-15' },
      modules: [{ nom: 'Cette semaine' }, { nom: 'Objectif', page: 'docs/maquettes/objectif.html' }, { nom: 'Nutrition' }, { nom: 'Palmarès', page: 'palmares.html' }, { nom: 'Profil' }, { nom: 'Guide' }],
      courant: 'docs/maquettes/objectif.html'
    })
  };
})();
