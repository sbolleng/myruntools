// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  // Objectif : feuille de route et page d'une course (module-objectif-specification.md, § 10).
  async objectif(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    db.preferences[0].modules = ['Objectif', 'En un coup d\'œil', 'Calendrier', 'Palmarès']; // Objectif en tête : la feuille de route porte le grand en-tête
    const pb = [];
    // Changement de page : profil, préférences, courses et listes de référence demandés ensemble (une seule vague),
    // les listes de référence une seule fois par visite.
    {
      const lent = JSON.parse(JSON.stringify(db));
      lent.latence = 300; lent.depart = [];
      const o = await ouvrir(nav, 'objectif.html', 1200, lent, {}, PARIS);
      await o.p.waitForSelector('.ob-carte');
      const t = n => (lent.depart.find(x => x[0] === n) || [])[1];
      const ecart = Math.max(...['profils', 'preferences', 'courses', 'courses_circuits', 'formats', 'types_course'].map(t)) - Math.min(...['profils', 'preferences', 'courses'].map(t));
      pb.push(egal(true, ecart < 250, 'changement de page : profil, préférences, courses et formats demandés ensemble (écart ' + ecart + ' ms, une réponse = 300 ms)'));
      lent.depart = [];
      await o.p.goto(o.p.url().replace('objectif.html', 'palmares.html'));
      await o.p.waitForSelector('.mrt-nav');
      await o.p.waitForTimeout(1000);
      pb.push(egal([0, 0], [lent.depart.filter(x => x[0] === 'formats').length, lent.depart.filter(x => x[0] === 'types_course').length], 'page suivante : formats et types gardés pour la visite, pas relus'));
      await o.ctx.close();
    }
    // Une carte : ses éléments, tels qu'affichés (espaces insécables ramenés à des espaces).
    const cartes = p => p.evaluate(() => [...document.querySelectorAll('.ob-et')].map(et => {
      const t = x => (x ? x.textContent.replace(/[  ]/g, ' ').trim() : null);
      const c = et.querySelector('.ob-carte');
      return {
        classes: et.className, nom: t(c.querySelector(':scope > .ob-nom a') || c.querySelector(':scope > .ob-nom')), role: t(c.querySelector(':scope > .ob-role')),
        compteur: c.querySelector(':scope > .ob-cpt') ? [...c.querySelectorAll(':scope > .ob-cpt .ob-cpt-case')].map(t).join(' ') || t(c.querySelector(':scope > .ob-cpt')) : null,
        date: t(c.querySelector(':scope > .ob-date')), info: t(c.querySelector(':scope > .ob-info')),
        lignes: [...c.querySelectorAll(':scope > .ob-lignes .ob-ligne')].map(l => t(l.children[0]) + ' | ' + t(l.children[1])),
        cands: [...c.querySelectorAll('.ob-cand')].map(x => ({ nom: t(x.querySelector('.ob-nom a')), date: t(x.querySelector('.ob-date')),
          lignes: [...x.querySelectorAll('.ob-ligne')].map(l => t(l.children[0]) + ' | ' + t(l.children[1])), compteur: !!x.querySelector('.ob-cpt'), role: !!x.querySelector('.ob-role') }))
      };
    }));
    // Heure figée au 20 octobre 2026 à 10 h pile, le temps de lire les compteurs.
    const figer = async (p, ms = 0) => { await p.clock.setFixedTime(new Date(PARIS.maintenant.getTime() + ms)); await p.clock.runFor(1000); };
    let { p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 1200, db, {}, PARIS);
    await figer(p);
    let k = await cartes(p);
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Printemps 2027', 'Trail de la Forêt', 'Trail des Crêtes'], k.map(x => x.nom), 'étapes, dans l\'ordre'));
    pb.push(egal(false, await p.evaluate(() => /Collines|Sommets|San Sebasti/.test(document.querySelector('#feuille-de-route').textContent)), 'ni abandonnée, ni à surveiller, ni courue'));
    pb.push(egal(['Trail des Crêtes', "5 courses | D'ici là", ''], await p.evaluate(() => [document.querySelector('h1 em').textContent,
      [...document.querySelectorAll('.mrt-stat')].map(s => s.querySelector('.mrt-stat-val').textContent + ' | ' + s.querySelector('.mrt-stat-label').textContent)[3], document.querySelector('.mrt-next').textContent]), 'en-tête (feuille de route en page de démarrage : pas de ligne « prochaine course »)'));
    const [lac, corrida, gorges, groupe, foret, cretes] = k;
    pb.push(egal({ role: 'Confirmée · Préparatoire', compteur: '26j', date: '15 nov. 2026', info: 'Mont-Clair · Trail court',
      lignes: ['Distance | 24 km · 650 m D+', 'Objectif | 02:45:00', 'Inscription | Inscrit · n° 412'] },
      { role: lac.role, compteur: lac.compteur, date: lac.date, info: lac.info, lignes: lac.lignes }, 'Trail du Lac'));
    pb.push(egal({ role: 'Confirmée · Plaisir', compteur: '54j', lignes: ['Distance | 10 km · 40 m D+', 'Objectif | Sub 45 min', 'Inscription | Ouvre le 1er nov. 2026'] },
      { role: corrida.role, compteur: corrida.compteur, lignes: corrida.lignes }, 'Corrida de Noël'));
    pb.push(egal({ role: 'Confirmée · Objectif', cle: false, compteur: '137j', objectif: 'Objectif | 06:30:00' },
      { role: gorges.role, cle: /is-obj/.test(gorges.classes), compteur: gorges.compteur, objectif: gorges.lignes[1] }, 'Trail des Gorges'));
    pb.push(egal({ opt: true, role: 'Préparatoire • 2 options', cands: [
      { nom: 'Trail des Cimes', date: '30 mai 2027', lignes: ['Distance | 42 km · 2 500 m D+', 'Inscription | Ouvre le 10 janv. 2027'], compteur: false, role: false },
      { nom: 'Ultra du Plateau · Le 55', date: '26 juin 2027', lignes: ['Distance | 55 km · 2 800 m D+', 'Inscription | Inscription ouverte'], compteur: false, role: false }] },
      { opt: /is-opt/.test(groupe.classes), role: groupe.role, cands: groupe.cands }, 'Printemps 2027'));
    pb.push(egal(true, await p.evaluate(() => { const a = document.querySelectorAll('.ob-cand .ob-ins')[1]; return a.tagName === 'A' && a.classList.contains('is-ouvert') && a.target === '_blank' && a.getAttribute('href') === 'https://example.org/plateau/inscription'; }), 'inscription ouverte : lien, en Alerte'));
    pb.push(egal({ opt: true, role: 'Option · Préparatoire', date: 'juillet 2027', compteur: null, lignes: ['Distance | 30 km · 1 200 m D+', 'Inscription | Ouverture à venir'] },
      { opt: /is-opt/.test(foret.classes), role: foret.role, date: foret.date, compteur: foret.compteur, lignes: foret.lignes }, 'Trail de la Forêt'));
    pb.push(egal({ obj: true, role: 'Confirmée · Objectif', compteur: '311j', objectif: 'Objectif | Finisher', dossard: 'Inscription | Inscrit · n° 88' },
      { obj: /is-obj/.test(cretes.classes), role: cretes.role, compteur: cretes.compteur, objectif: cretes.lignes[1], dossard: cretes.lignes[2] }, 'Trail des Crêtes'));
    pb.push(egal(['311', '19 h 00 min 00 s'], await p.evaluate(() => [document.querySelector('.mrt-days').textContent, document.querySelector('.mrt-hms').textContent]), 'en-tête : compte à rebours jusqu\'à l\'heure de départ'));
    // Couleurs (thème bleu et orange) : nom en Texte, date en Texte discret, chiffres du compteur et objectif en Accent (un seul accent) ; libellés à 0,7 rem.
    pb.push(egal({ nom: 'rgb(238, 243, 250)', date: 'rgb(143, 168, 201)', compteur: 'rgb(255, 183, 0)', objectif: 'rgb(255, 183, 0)', libelle: '11.2px', indicateur: 'rgb(238, 243, 250)' },
      await p.evaluate(() => { const c = document.querySelector('.ob-carte'), st = s => getComputedStyle(c.querySelector(s));
        return { nom: st('.ob-nom').color, date: st('.ob-date').color, compteur: st('.ob-cpt-case b').color, objectif: st('.ob-cible').color, libelle: st('.ob-lib').fontSize,
          indicateur: getComputedStyle(document.querySelector('.mrt-stat-val')).color }; }), 'couleurs et libellés'));
    await figer(p, 1000);
    pb.push(egal(['25j', '18 h 59 min 59 s'], [(await cartes(p))[0].compteur, await p.textContent('.mrt-hms')], 'une seconde plus tard : la carte garde ses jours, l\'en-tête compte les secondes'));
    // Liens : inscription au-dessus du lien de la carte ; pas de site officiel sur la carte ; la carte ouvre la page de la course.
    pb.push(egal([true], await p.evaluate(() => ['.ob-ins.is-ouvert'].map(sel => {
      const a = document.querySelector(sel);
      a.scrollIntoView({ block: 'center' });
      const b = a.getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2).closest('a') === a;
    })), 'inscription cliquable à part'));
    pb.push(egal(0, await p.locator('.ob-carte .ob-ext').count(), 'pas de site officiel sur la feuille de route'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif.png'), fullPage: true });
    await toucher(p, '.ob-et:first-child .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(id(1), await p.evaluate(() => history.state && history.state.mrtCourse), 'toucher la carte ouvre la course en modale'));
    await p.goBack(); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(['objectif.html', true], [p.url().split('/').pop(), await p.evaluate(() => !!document.querySelector('.ob-carte'))], 'retour du navigateur : la modale se ferme, feuille de route dessous'));
    await toucher(p, '.ob-cand .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(id(4), await p.evaluate(() => history.state && history.state.mrtCourse), 'toucher un candidat ouvre sa course en modale'));
    pb.push(egal([], erreurs, 'feuille de route, erreurs JavaScript'));
    await ctx.close();

    // Page d'une course
    const pageCourse = async (n, opts = PARIS, base = db, stockage = {}) => {
      const o = await ouvrir(nav, 'course.html?id=' + n, 1200, base, stockage, opts);
      await figer(o.p);
      if (CAPTURES && n === id(3)) await o.p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-course.png'), fullPage: true });
      const r = await o.p.evaluate(() => {
        const t = x => (x ? x.textContent.replace(/[  ]/g, ' ').trim() : null), q = s => document.querySelector(s);
        return {
          barre: [...document.querySelectorAll('.pc-barre [data-ob]')].map(b => b.dataset.ob), sur: t(q('.pc-sur')), titre: q('.pc-titre') ? t(q('.pc-titre').firstChild) : null, info: t(q('.pc-info')), groupe: t(q('.pc-groupe')),
          fiche: [...document.querySelectorAll('.pc-fiche .ob-ligne')].filter(l => !l.querySelector('.ob-cpt')).map(l => t(l.children[0]) + ' | ' + t(l.children[1])),
          compteur: [...document.querySelectorAll('.pc-fiche .ob-cpt-case')].map(t).join(' '), dossards: document.querySelectorAll('.mc-panneau .ob-ins').length,
          cellules: [...document.querySelectorAll('.pc-cellule > summary')].map(t), modale: !!q('.mc-panneau .pc'),
          liens: [...document.querySelectorAll('.pc-liens-haut a, .pc-officiel')].map(t), officiel: !!q('.pc-fiche-bas > .pc-cellule + .pc-officiel'), nav: [...document.querySelectorAll('.pc-nav a')].map(a => a.className + ' | ' + t(a.querySelector('b'))),
          vide: t(q('.ob-vide')), titreDoc: document.title,
          fleches: [document.querySelectorAll('.pc-liens-haut a .ob-fleche, .pc-officiel .ob-fleche').length, /↗/.test((q('.pc') || document.body).textContent)],
          lieu: q('.pc-fiche .pc-lieu') ? [t(q('.pc-lieu')), q('.pc-lieu').getAttribute('href'), q('.pc-lieu').target] : null, titreLien: document.querySelectorAll('.pc-titre a').length,
          descFiche: !!q('.pc-fiche .pc-fiche-bas > .pc-cellule'), prepa: q('#preparation') ? [t(q('#preparation .pc-role .pc-sous-titre')) + ' | ' + t(q('#preparation .pc-role > p:not(.pc-sous-titre)')), !!q('#preparation .cal-regler')] : null,
          insLien: document.querySelectorAll('.pc-fiche a.ob-ins').length
        };
      });
      await o.ctx.close();
      return [r, o.erreurs];
    };
    let [r, err] = await pageCourse(id(3));
    pb.push(egal({ modale: true, barre: ['modifier', 'fermer'], sur: 'Confirmée · Objectif · Étape 3 sur 6', titre: 'Trail des Gorges', info: 'Trail long',
      compteur: '137j 22h 30min 00s', fiche: ['Lieu | Mont-Clair', 'Date / heure | dim. 7 mars 2027 · 7 h 30', 'Distance | 45 km · 2 100 m D+ · 2 100 m D−', 'Objectif | 06:30:00Sous 6 h 45 dans tous les cas.', 'Inscription | Inscrit · n° 1287'], dossards: 1 },
      { modale: r.modale, barre: r.barre, sur: r.sur, titre: r.titre, info: r.info, compteur: r.compteur, fiche: r.fiche, dossards: r.dossards }, 'page Trail des Gorges, haut et fiche'));
    pb.push(egal(['À propos de la course', 'Inscription', 'Parcours', 'Préparation', 'Logistique'], r.cellules, 'page Trail des Gorges, textes : À propos de la course, Inscription, Parcours, Préparation, Logistique en dernier'));
    pb.push(egal(true, r.descFiche, 'page Trail des Gorges, « À propos de la course » dans le cadre de la fiche'));
    pb.push(egal(['Pourquoi cette course | Répétition générale du matériel et de la nutrition.', true], r.prepa, 'page Trail des Gorges, Préparation : le rôle, puis le lien « Régler le plan dans Préparation » et le plan'));
    pb.push(egal([['Site officiel'], true], [r.liens, r.officiel], 'page Trail des Gorges : site officiel en bas à droite de la fiche, sur la ligne d\'« À propos de la course », pas de « S\'inscrire » (inscrit)'));
    pb.push(egal([1, false, 0], [...r.fleches, r.titreLien], 'liens : flèche dessinée, plus de caractère ↗ (emoji sur iPhone), plus de flèche dans le titre'));
    pb.push(egal(['Mont-Clair', 'https://www.openstreetmap.org/search?query=Mont-Clair', '_blank'], r.lieu, 'lieu : lien vers OpenStreetMap, nouvel onglet'));
    pb.push(egal(['is-precedente | Corrida de Noël', 'is-suivante | Trail des Cimes'], r.nav, 'page Trail des Gorges, navigation'));
    pb.push(egal('Trail des Gorges · MyRunTools', r.titreDoc, 'page Trail des Gorges, titre de l\'onglet'));
    pb.push(egal([], err, 'page d\'une course, erreurs JavaScript'));
    [r] = await pageCourse(id(2));
    pb.push(egal({ cellules: ['Inscription', 'Parcours', 'Préparation', 'Logistique'], fiche: ['Lieu | Ville-Haute', 'Date / heure | dim. 13 déc. 2026 · 18 h 30', 'Distance | 10 km · 40 m D+', 'Objectif | Sub 45 min', 'Inscription | Ouvre le 1er nov. 2026'], liens: ['Site officiel'] },
      { cellules: r.cellules, fiche: r.fiche, liens: r.liens }, 'page Corrida de Noël : ni D−, ni prix ; Inscription toujours là ; Parcours pour importer un GPX'));
    [r] = await pageCourse(id(5));
    pb.push(egal({ liens: ['S\'inscrire', 'Site officiel'], insLien: 0, fiche: ['Lieu | Plaine-Neuve', 'Date / heure | sam. 26 juin 2027', 'Distance | 55 km · 2 800 m D+', 'Inscription | Inscription ouverte'] }, { liens: r.liens, insLien: r.insLien, fiche: r.fiche },
      'page Ultra du Plateau : « S\'inscrire » en tête, la ligne Dossard sans lien'));
    // Jour J : la ligne Résultats en direct ; la veille, rien.
    const jourJ = JSON.parse(JSON.stringify(db));
    Object.assign(jourJ.courses.find(c => c.id === id(1)), { date: '2026-10-20', heure: '18:00:00', lien_resultats: 'https://example.org/lac/resultats' });
    [r] = await pageCourse(id(1), PARIS, jourJ);
    pb.push(egal('Résultats | En direct', r.fiche[2], 'jour J : « Résultats · En direct » dans la fiche'));
    jourJ.courses.find(c => c.id === id(1)).date = '2026-10-21';
    [r] = await pageCourse(id(1), PARIS, jourJ);
    pb.push(egal(false, r.fiche.some(l => /^Résultats/.test(l)), 'veille du jour J : pas de ligne Résultats'));
    [r] = await pageCourse(id(4));
    pb.push(egal({ sur: 'Option · Préparatoire · Étape 4 sur 6', groupe: 'Printemps 2027 · autre option : Ultra du Plateau · Le 55' }, { sur: r.sur, groupe: r.groupe }, 'page Trail des Cimes'));
    [r] = await pageCourse(id(1));
    pb.push(egal(['is-suivante | Corrida de Noël'], r.nav, 'page Trail du Lac, pas de course précédente'));
    [r] = await pageCourse(id(7));
    pb.push(egal(['is-precedente | Trail de la Forêt'], r.nav, 'page Trail des Crêtes, pas de course suivante'));
    // Ordinateur : la modale (marges de 2 rem et cadre de 1 px : 896 px de texte, comme les pages), la fiche encadrée, tous les textes ouverts, sans pouvoir les replier.
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS));
    pb.push(egal({ largeur: 896, cadre: '1px', textes: 5, ouverts: ['Parcours'], repliable: 'auto', cadres: 2 },
      await p.evaluate(() => {
        return { largeur: Math.round(document.querySelector('.pc').getBoundingClientRect().width),
          cadre: getComputedStyle(document.querySelector('.pc-fiche')).borderTopWidth, textes: document.querySelectorAll('.pc-cellule').length,
          ouverts: [...document.querySelectorAll('.pc-cellule[open] > summary')].map(x => x.textContent.trim()), repliable: getComputedStyle(document.querySelector('.pc-cellule > summary')).pointerEvents,
          cadres: document.querySelectorAll('.pc > .pc-fiche, .pc > .pc-textes').length
        }; }), 'ordinateur : une colonne, deux cadres (fiche et Description, puis Inscription, Parcours, Préparation, Logistique), tout replié sauf Parcours, renseigné'));
    await p.locator('#preparation > summary').click();
    await p.waitForTimeout(400);
    pb.push(egal(true, await p.evaluate(() => document.querySelector('#preparation').open), 'ordinateur : toucher Préparation l\'ouvre'));
    await ctx.close();
    // Téléphone : rien ne dépasse, compteur sur une ligne, fiche dans le premier écran, textes repliés sauf le premier.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 390, db, {}, PARIS));
    await figer(p);
    const tc = await p.evaluate(() => {
      const cases = [...document.querySelectorAll('.pc-fiche .ob-cpt-case')].map(c => c.getBoundingClientRect());
      return { debordement: document.documentElement.scrollWidth > innerWidth, compteurUneLigne: cases.every(c => Math.abs(c.top - cases[0].top) < 3),
        ouvertes: [...document.querySelectorAll('.pc-cellule')].map(d => d.open), haut: Math.round(document.querySelector('.pc-fiche').getBoundingClientRect().top) };
    });
    pb.push(egal({ debordement: false, compteurUneLigne: true, ouvertes: [false, false, true, false, false] },
      { debordement: tc.debordement, compteurUneLigne: tc.compteurUneLigne, ouvertes: tc.ouvertes }, 'téléphone : page d\'une course'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-course-telephone.png'), fullPage: false });
    pb.push(egal(true, tc.haut < 330, 'téléphone : la fiche commence dans le premier écran (' + tc.haut + ' px)'));
    await p.locator('.pc-cellule > summary').nth(2).click();
    await p.waitForTimeout(400);
    pb.push(egal([false, false], await p.evaluate(() => [...document.querySelectorAll('.pc-cellule')].slice(1, 3).map(d => d.open)), 'téléphone : toucher le titre ferme la cellule ouverte'));
    await p.locator('.pc-cellule > summary').nth(2).click();
    await p.waitForTimeout(400);
    pb.push(egal([false, true], await p.evaluate(() => [...document.querySelectorAll('.pc-cellule')].slice(1, 3).map(d => d.open)), 'téléphone : toucher le titre ouvre la cellule'));
    pb.push(egal([], erreurs, 'téléphone, page d\'une course, erreurs JavaScript'));
    await ctx.close();
    // ----- Tracé GPX (§ 3.4, n° 25 à 28 et 32) -----
    {
      const moi = db.profils[0].id, chemin = n => 'traces/' + moi + '/' + n + '.gpx';
      const avecTrace = JSON.parse(JSON.stringify(db));
      avecTrace.courses.find(c => c.id === id(3)).gpx = moi + '/' + id(3) + '.gpx';
      avecTrace.courses.find(c => c.id === id(3)).ravitaillements_km = [2, 4.5, 8];
      avecTrace.fichiers = { [chemin(id(3))]: GPX };
      let o = await ouvrir(nav, 'course.html?id=' + id(3), 1200, avecTrace, {}, PARIS);
      pb.push(egal(true, await o.p.evaluate(() => document.querySelector('#parcours').open), 'Parcours renseigné (tracé GPX) : ouvert d\'emblée'));
      await o.p.evaluate(() => { const d = document.querySelector('#parcours'); if (!d.open) d.querySelector('summary').click(); });
      await o.p.waitForSelector('.tr-carte .leaflet-overlay-pane path', { timeout: 8000 });
      // Ravitaillements sur le profil (§ 3.10, n° 56) : un trait par km du tracé (5,37 km) ; le km 8, au-delà, n'est pas dessiné.
      pb.push(egal([['2', '4,5'], ['37.25%', '83.82%']], await o.p.evaluate(() => { const r = [...document.querySelectorAll('.tr-trace .tr-ravito')]; return [r.map(x => x.textContent), r.map(x => x.style.left)]; }),
        'profil : les ravitaillements en traits pointillés, km en haut'));
      pb.push(egal({ alt: ['620 m', '500 m'], km: ['0 km', '5,4 km'], bornes: 3, ordre: ['tr-zone', 'pc-ravitos', 'pc-strategie', 'st-zone'], strategie: 'Stratégie de course', bouton: 'GPX', boutonClasse: true }, await o.p.evaluate(() => ({
        alt: [...document.querySelectorAll('.tr-alt span')].map(x => x.textContent), km: [...document.querySelectorAll('.tr-km span')].map(x => x.textContent.replace(/[  ]/g, ' ')),
        bornes: document.querySelectorAll('.tr-carte .leaflet-overlay-pane path').length,
        ordre: [...document.querySelector('#parcours .pc-corps').children].map(x => x.className || x.tagName), strategie: document.querySelector('.pc-strategie .pc-sous-titre').textContent,
        bouton: document.querySelector('.tr-profil .tr-bas .tr-telecharger').textContent.trim(), boutonClasse: document.querySelector('.tr-telecharger').classList.contains('mrt-btn') })), 'GPX : carte (tracé, départ, arrivée), profil, bouton à contour « ↓ GPX » sous les distances, puis la stratégie et « Proposer une stratégie »'));
      // Lignes d'altitude (n° 48), pente au survol (n° 49), repère sur la carte (n° 50), plein écran (n° 47).
      pb.push(egal({ lignes: 2, etiquettes: ['550', '600'], pas: '1 trait = 50 m' }, await o.p.evaluate(() => ({
        lignes: document.querySelectorAll('.tr-profil .tr-ligne').length, etiquettes: [...document.querySelectorAll('.tr-alt i')].map(x => x.textContent),
        pas: document.querySelector('.tr-pas').textContent })), 'profil : lignes horizontales tous les 50 m (écart de 120 m), étiquettes, légende du pas'));
      pb.push(egal([7, 536], await o.p.evaluate(g => { const m = window.mrtTrace.pente(window.mrtTrace.lire(g), 0.5); return [Math.round(m.pente), Math.round(m.alt)]; }, GPX), 'pente : +7 % à 500 m du départ (80 m de montée sur 1,1 km), altitude 536 m'));
      await o.p.locator('.tr-trace').scrollIntoViewIfNeeded();
      const zr = await o.p.locator('.tr-trace').boundingBox();
      await o.p.mouse.move(zr.x + zr.width * (0.5 / 5.4), zr.y + zr.height / 2);
      pb.push(egal({ bulle: 'km 0,5 · 536 m · +7 %', repere: 4 }, await o.p.evaluate(() => ({ bulle: document.querySelector('.tr-bulle').textContent.replace(/[  ]/g, ' '),
        repere: document.querySelectorAll('.tr-carte .leaflet-overlay-pane path').length })), 'profil : le survol montre le km, l\'altitude et la pente, et pose un repère sur la carte'));
      await o.p.mouse.move(5, 5);
      pb.push(egal({ cache: true, repere: 3 }, await o.p.evaluate(() => ({ cache: document.querySelector('.tr-reperes').hidden, repere: document.querySelectorAll('.tr-carte .leaflet-overlay-pane path').length })), 'profil : la lecture et le repère disparaissent quand la souris sort'));
      const hautNormal = (await o.p.locator('.tr-carte').boundingBox()).height;
      await o.p.click('.tr-plein');
      await o.p.waitForTimeout(400);
      const pleine = await o.p.evaluate(() => ({ classe: document.querySelector('.tr-zone').classList.contains('tr-pleine'), titre: document.querySelector('.tr-plein').title }));
      const hautPlein = (await o.p.locator('.tr-carte').boundingBox()).height;
      pb.push(egal({ classe: true, titre: 'Quitter le plein écran', plusHaute: true }, { ...pleine, plusHaute: hautPlein > hautNormal }, 'carte : le bouton plein écran agrandit la carte'));
      await o.p.keyboard.press('Escape');
      await o.p.waitForTimeout(400);
      pb.push(egal({ classe: false, titre: 'Plein écran' }, await o.p.evaluate(() => ({ classe: document.querySelector('.tr-zone').classList.contains('tr-pleine'), titre: document.querySelector('.tr-plein').title })), 'carte : Échap quitte le plein écran'));
      const [dl] = await Promise.all([o.p.waitForEvent('download'), o.p.click('.tr-telecharger')]);
      pb.push(egal('Trail des Gorges.gpx', dl.suggestedFilename(), 'GPX : le bouton « ↓ GPX » télécharge le fichier, au nom de la course'));
      pb.push(egal([], o.erreurs, 'GPX, erreurs JavaScript'));
      await o.ctx.close();
      // Mini carte de l'étape (§ 3.1, n° 14) : seulement avec un tracé, sous la date et le compteur, sur ordinateur
      const mini = () => ({ cartes: document.querySelectorAll('.ob-carte .ob-mini').length, svg: document.querySelectorAll('.ob-mini svg .tr-mini-trace').length,
        pointsDepartArrivee: document.querySelectorAll('.ob-mini .tr-mini-depart, .ob-mini .tr-mini-arrivee').length,
        visible: !!document.querySelector('.ob-mini') && getComputedStyle(document.querySelector('.ob-mini')).display !== 'none' });
      o = await ouvrir(nav, 'objectif.html', 1200, avecTrace, {}, PARIS);
      await o.p.waitForSelector('.ob-carte .ob-mini svg', { timeout: 8000 });
      const pos = await o.p.evaluate(() => { const m = document.querySelector('.ob-mini').getBoundingClientRect(), c = m.top, d = document.querySelector('.ob-mini').closest('.ob-carte');
        const date = d.querySelector('.ob-date').getBoundingClientRect(), cr = d.getBoundingClientRect();
        return { sousDate: m.top > date.bottom, dansCarte: m.bottom <= cr.bottom && m.right <= cr.right, droite: m.right > cr.right - 40, sansDebord: document.documentElement.scrollWidth <= innerWidth }; });
      pb.push(egal({ cartes: 1, svg: 1, pointsDepartArrivee: 2, visible: true }, await o.p.evaluate(mini), 'mini carte : une seule étape a un tracé, tracé, départ et arrivée dessinés'),
        egal({ sousDate: true, dansCarte: true, droite: true, sansDebord: true }, pos, 'mini carte : à droite, sous la date, dans la carte d\'étape'),
        egal([], o.erreurs, 'mini carte, erreurs JavaScript'));
      await o.ctx.close();
      o = await ouvrir(nav, 'objectif.html', 390, avecTrace, {}, PARIS);
      await o.p.waitForSelector('.ob-carte');
      await o.p.waitForTimeout(600);
      pb.push(egal(false, (await o.p.evaluate(mini)).visible, 'mini carte : absente sur téléphone'));
      await o.ctx.close();
      // Import depuis la page : Corrida de Noël, sans tracé.
      const imp = JSON.parse(JSON.stringify(db));
      imp.persister = true; imp.ecritures = [];
      o = await ouvrir(nav, 'course.html?id=' + id(2), 1200, imp, {}, PARIS);
      await o.p.evaluate(() => { const d = document.querySelector('#parcours'); if (!d.open) d.querySelector('summary').click(); });
      await o.p.setInputFiles('.tr-fichier', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('rien') });
      await o.p.waitForFunction(() => document.querySelector('.tr-erreur').textContent);
      pb.push(egal('Fichier .gpx attendu.', (await o.p.textContent('.tr-erreur')).trim(), 'import : un fichier qui n\'est pas un GPX est refusé'));
      await o.p.setInputFiles('.tr-fichier', { name: 'corrida.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX) });
      await o.p.waitForSelector('.tr-carte .leaflet-overlay-pane path', { timeout: 8000 });
      pb.push(egal([true, moi + '/' + id(2) + '.gpx', true], [!!imp.fichiers[chemin(id(2))], imp.courses.find(c => c.id === id(2)).gpx, await o.p.evaluate(() => document.querySelector('#parcours').open)],
        'import depuis la page : fichier rangé dans le dossier de l\'utilisateur, chemin noté dans la course, Parcours rouvert avec la carte'));
      // Distance, D+ et D− remis à jour d'après le tracé (§ 3.4, n° 51) : boucle de 5,4 km, 500 → 620 → 500 m.
      const apres = imp.courses.find(c => c.id === id(2));
      pb.push(egal([5.4, 120, 120], [apres.distance, apres.dplus, apres.dmoins], 'import depuis la page : distance, D+ et D− mis à jour d\'après le tracé'));
      const GPX_BRUIT = '<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>' + [100, 102, 100, 101, 110, 108, 111, 105].map((a, i) => '<trkpt lat="' + (45 + i * 0.001) + '" lon="4"><ele>' + a + '</ele></trkpt>').join('') + '</trkseg></trk></gpx>';
      pb.push(egal([11, 6], await o.p.evaluate(g => { const c = window.mrtTrace.chiffres(window.mrtTrace.lire(g)); return [c.dplus, c.dmoins]; }, GPX_BRUIT), 'D+ et D− : les variations de 3 m ou moins (bruit du GPS) ne comptent pas'));
      // Fichier à deux tracés : le choix, le plus proche des 10 km de la course en premier ; seul le tracé gardé est rangé.
      const deux = JSON.parse(JSON.stringify(db));
      deux.persister = true; deux.ecritures = [];
      const o2 = await ouvrir(nav, 'course.html?id=' + id(2), 1200, deux, {}, PARIS);
      await o2.p.evaluate(() => { const d = document.querySelector('#parcours'); if (!d.open) d.querySelector('summary').click(); });
      await o2.p.setInputFiles('.tr-fichier', { name: 'epreuve.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX_DEUX) });
      await o2.p.waitForSelector('.tr-choix [data-piste]');
      pb.push(egal(['Le grand · 10,7 km', 'Le petit · 5,4 km', 'Annuler'], (await o2.p.$$eval('.tr-choix [data-piste]', bs => bs.map(b => b.textContent.replace(/[  ]/g, ' ')))),
        'deux tracés : un bouton par tracé, le plus proche de la distance de la course en premier'));
      await o2.p.click('.tr-choix [data-piste="0"]');
      await o2.p.waitForSelector('.tr-carte .leaflet-overlay-pane path', { timeout: 8000 });
      const range = deux.fichiers[chemin(id(2))] || '';
      pb.push(egal([1, true, false], [(range.match(/<trk>/g) || []).length, /Le grand/.test(range), /Le petit/.test(range)], 'deux tracés : seul le tracé choisi est rangé'));
      // Tracé en deux segments éloignés : le saut ne compte pas dans la distance.
      pb.push(egal('5,3', await o2.p.evaluate(g => window.mrtTrace.lire(g).km.toFixed(1).replace('.', ','), GPX_SEGMENTS), 'segments : le saut d\'un segment au suivant ne compte pas'));
      pb.push(egal([], o2.erreurs, 'deux tracés, erreurs JavaScript'));
      await o2.ctx.close();
      pb.push(egal([], o.erreurs, 'import GPX, erreurs JavaScript'));
      await o.ctx.close();
      // Import depuis le formulaire : rangé à l'enregistrement ; puis suppression.
      const form = JSON.parse(JSON.stringify(db));
      form.persister = true; form.ecritures = [];
      o = await ouvrir(nav, 'course.html?id=' + id(1), 1200, form, {}, PARIS);
      await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
      pb.push(egal([['Importer un tracé'], 0], [await o.p.locator('.fc-gpx button').allTextContents(), await o.p.locator('.fc-gpx-etat').count()], 'formulaire : « Tracé GPX », sans tracé : « Importer un tracé » seul, sans ligne d\'état'));
      await o.p.setInputFiles('.fc-gpx-fichier', { name: 'lac.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(GPX) });
      await o.p.waitForFunction(() => document.querySelector('[data-k="distance"]').value === '5,4');
      pb.push(egal(0, Object.keys(form.fichiers || {}).length, 'formulaire : rien n\'est rangé avant « Enregistrer »'));
      pb.push(egal(['5,4', '120', '120'], await o.p.evaluate(() => ['distance', 'dplus', 'dmoins'].map(k => document.querySelector('[data-k="' + k + '"]').value)), 'formulaire : distance, D+ et D− remplis d\'après le tracé'));
      await o.p.fill('[data-k="dplus"]', '125');

      await o.p.click('.fc-plein');
      await o.p.waitForSelector('.mc-panneau .pc-titre');
      pb.push(egal([true, moi + '/' + id(1) + '.gpx'], [!!form.fichiers[chemin(id(1))], form.courses.find(c => c.id === id(1)).gpx], 'formulaire : « Enregistrer » range le GPX avec la course'));
      pb.push(egal([5.4, 125, 120], (({ distance, dplus, dmoins }) => [distance, dplus, dmoins])(form.courses.find(c => c.id === id(1))), 'formulaire : « Enregistrer » garde les chiffres du tracé, y compris une correction à la main (D+ 125)'));
      await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
      await ouvrirBloc(o.p, 'parcours');
      await o.p.click('[data-fc="gpx-supprimer"]');
      await o.p.click('.fc-plein');
      await o.p.waitForSelector('.mc-panneau .pc-titre');
      pb.push(egal([false, null], [!!form.fichiers[chemin(id(1))], form.courses.find(c => c.id === id(1)).gpx], 'formulaire : « Supprimer », puis « Enregistrer », efface le tracé'));
      pb.push(egal([], o.erreurs, 'formulaire GPX, erreurs JavaScript'));
      await o.ctx.close();
    }
    for (const n of ['inconnue', id(99)]) {
      [r] = await pageCourse(n);
      pb.push(egal(['Course introuvable.', ['fermer']], [r.vide, r.barre], 'course introuvable (' + n + '), la croix seule'));
    }

    // Trail des Cimes sorti du groupe : « • 1 candidat », 6 courses d'ici là.
    const seul = JSON.parse(JSON.stringify(db));
    seul.courses.find(c => c.id === id(4)).groupe_options = null;
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, seul, {}, PARIS));
    k = await cartes(p);
    pb.push(egal(['Préparatoire • 1 option', "6 courses"], [k.find(x => x.nom === 'Printemps 2027').role, await p.evaluate(() => document.querySelectorAll('.mrt-stat-val')[3].textContent)], 'groupe d\'un seul candidat'));
    await ctx.close();

    // Course et parcours trop longs pour une ligne : le parcours passe à la ligne, sans le point.
    const long = JSON.parse(JSON.stringify(db));
    long.courses.find(c => c.id === id(1)).parcours = 'Le Grand Tour du Lac de Mont-Clair';
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 390, long, {}, PARIS));
    pb.push(egal([true, 'none', false], await p.evaluate(() => { const n = document.querySelector('.ob-carte .ob-nom');
      return [n.classList.contains('is-coupe'), getComputedStyle(n.querySelector('.ob-sep')).display, document.querySelectorAll('.ob-carte .ob-nom.is-coupe').length > 1]; }), 'parcours trop long : à la ligne, sans le point'));
    await ctx.close();

    // Course confirmée dont seul le mois est connu : compteur jusqu'au 1er du mois, à minuit.
    const moisSeul = JSON.parse(JSON.stringify(db));
    moisSeul.courses.find(c => c.id === id(6)).statut = 'confirmee';
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, moisSeul, {}, PARIS));
    await figer(p);
    pb.push(egal('253j', (await cartes(p)).find(x => x.nom === 'Trail de la Forêt').compteur, 'confirmée au mois seul : compteur jusqu\'au 1er du mois'));
    await ctx.close();

    // Au départ du Trail du Lac
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, db, {}, { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-15T09:00:00+01:00') }));
    pb.push(egal('Course courue', (await cartes(p))[0].compteur, 'au départ : Course courue'));
    await ctx.close();

    // Téléphone : rôle à gauche, aligné sur le compteur ; date juste dessous, à droite, même si le rôle passe sur deux lignes ;
    // un interligne avant le nom ; rien ne dépasse ; ni titre ni légende.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 390, db, {}, PARIS));
    const tel = await p.evaluate(() => [...document.querySelectorAll('.ob-carte:not(.ob-groupe)')].filter(c => c.querySelector(':scope > .ob-cpt')).map(c => {
      const b = s => c.querySelector(':scope > ' + s).getBoundingClientRect(), carte = c.getBoundingClientRect();
      return { aligne: Math.abs(b('.ob-role').top - b('.ob-cpt').top) <= 2, dateDessous: b('.ob-date').top >= b('.ob-cpt').bottom && b('.ob-date').top - b('.ob-cpt').bottom <= 6,
        aDroite: Math.round(b('.ob-cpt').right) === Math.round(b('.ob-date').right),
        interligne: Math.round(b('.ob-nom').top - Math.max(b('.ob-date').bottom, b('.ob-role').bottom)) >= 15,
        dedans: b('.ob-role').right <= b('.ob-cpt').left && b('.ob-cpt').right <= carte.right };
    }).concat([{ debordement: document.documentElement.scrollWidth > innerWidth, roleDeuxLignes: [...document.querySelectorAll('.ob-carte > .ob-role')].some(r => r.getBoundingClientRect().height > 20),
      titreOuLegende: !!document.querySelector('#feuille-de-route h2, .ob-legende') }]));
    const t0 = { aligne: true, dateDessous: true, aDroite: true, interligne: true, dedans: true };
    pb.push(egal([t0, t0, t0, t0, { debordement: false, roleDeuxLignes: false, titreOuLegende: false }], tel, 'téléphone (compteur réduit aux jours : le rôle tient sur une ligne)'));
    // Sans compteur (Trail de la Forêt) : la date remonte, son haut aligné sur celui du rôle.
    const sansCpt = () => p.evaluate(() => { const c = [...document.querySelectorAll('.ob-carte')].find(x => /Forêt/.test(x.textContent)), b = s => c.querySelector(':scope > ' + s).getBoundingClientRect();
      return Math.abs(b('.ob-date').top - b('.ob-role').top) <= 1 && b('.ob-date').bottom <= b('.ob-nom').top; });
    pb.push(egal(true, await sansCpt(), 'téléphone, sans compteur : date en haut, face au rôle'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-telephone.png'), fullPage: true });
    pb.push(egal([], erreurs, 'téléphone, erreurs JavaScript'));
    await ctx.close();

    // Thème changé : seules les couleurs changent.
    const boites = async base => {
      const o = await ouvrir(nav, 'objectif.html', 1200, base, {}, PARIS);
      const r = await o.p.evaluate(() => [...document.querySelectorAll('.ob-carte > *')].map(e => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round).join(','); }));
      const couleur = await o.p.evaluate(() => getComputedStyle(document.querySelector('.ob-nom')).color);
      await o.ctx.close();
      return [r, couleur];
    };
    const vert = JSON.parse(JSON.stringify(db)); vert.preferences[0].theme = 'vert-rose';
    const [b1, c1] = await boites(db), [b2, c2] = await boites(vert);
    pb.push(egal([true, true], [JSON.stringify(b1) === JSON.stringify(b2), c1 !== c2], 'thème : mêmes places, autres couleurs'));

    // Site partagé en lecture seule : la feuille de route et les pages du propriétaire, à l'identique.
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = JSON.parse(JSON.stringify(db));
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, partage, { 'mrt-vue': autre }, PARIS));
    k = await cartes(p);
    pb.push(egal([true, 6], [await p.evaluate(() => !!document.querySelector('.mrt-bandeau')), k.length], 'lecture seule, feuille de route'));
    await ctx.close();
    [r] = await pageCourse(id(3), PARIS, partage, { 'mrt-vue': autre });
    pb.push(egal(['Trail des Gorges', 'Confirmée · Objectif · Étape 3 sur 6'], [r.titre, r.sur], 'lecture seule, page d\'une course'));
    return pb;
  },

  // Objectif : la page d'une course en modale (module-objectif-specification.md, § 3.4 et § 10).
  async modale(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const ouverte = p => p.evaluate(() => !!document.querySelector('.mc-voile'));
    // Ordinateur : ouverture depuis la feuille de route, la page reste dessous, la croix et Échap ferment, le défilement revient.
    let { p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 1200, db, {}, PARIS);
    await toucher(p, '.ob-et:nth-child(3) .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal({ titre: 'Trail des Gorges', barre: ['modifier', 'fermer'], retour: 0, cartes: 6, fond: true, defilement: 'hidden' }, await p.evaluate(() => ({
      titre: document.querySelector('.pc-titre').firstChild.textContent.trim(), barre: [...document.querySelectorAll('.pc-barre [data-ob]')].map(b => b.dataset.ob), retour: document.querySelectorAll('.pc-retour').length,
      cartes: document.querySelectorAll('.ob-et').length, fond: getComputedStyle(document.querySelector('.mc-voile')).backgroundColor !== 'rgba(0, 0, 0, 0)',
      defilement: getComputedStyle(document.documentElement).overflow })), 'ordinateur : modale ouverte, feuille de route dessous'));
    // Course suivante, puis précédente : la modale change de course sans se fermer ni ajouter d'entrée d'historique.
    const longueur = await p.evaluate(() => history.length);
    await p.click('.pc-nav .is-suivante');
    pb.push(egal(['Trail des Cimes', id(4), longueur], await p.evaluate(() => [document.querySelector('.pc-titre').firstChild.textContent.trim(), history.state.mrtCourse, history.length]),
      'course suivante : dans la modale, historique inchangé'));
    await p.click('.pc-nav .is-precedente');
    pb.push(egal('Trail des Gorges', await p.evaluate(() => document.querySelector('.pc-titre').firstChild.textContent.trim()), 'course précédente : dans la modale'));
    await p.keyboard.press('Escape');
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal([false, 'objectif.html'], [await ouverte(p), p.url().split('/').pop()], 'Échap ferme la modale'));
    // La croix, le retour et la zone autour ferment aussi ; fermer par l'interface revient en arrière dans l'historique.
    await toucher(p, '.ob-et:first-child .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    await p.click('.pc-fermer'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    await toucher(p, '.ob-et:first-child .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    await p.keyboard.press('Escape'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    await toucher(p, '.ob-et:first-child .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    await p.mouse.click(10, 10); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal([false, true], [await ouverte(p), await p.evaluate(() => getComputedStyle(document.documentElement).overflow !== 'hidden')], 'croix, Échap et clic autour : ferment la modale'));
    // Clic modifié (nouvel onglet) : le lien garde son comportement habituel.
    pb.push(egal('course.html?id=' + id(1), await p.evaluate(() => document.querySelector('.ob-et:first-child .ob-nom a').getAttribute('href')), 'le lien d\'une course garde son adresse'));
    pb.push(egal([], erreurs, 'modale, ordinateur, erreurs JavaScript'));
    await ctx.close();

    // Adresse d'une course ouverte directement : feuille de route dessous ; fermer y reste.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS));
    pb.push(egal([6, 'Trail des Gorges'], await p.evaluate(() => [document.querySelectorAll('.ob-et').length, document.title.split(' · ')[0]]), 'adresse d\'une course : feuille de route dessous, modale dessus'));
    await p.click('.pc-fermer'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal([false, 6], [await ouverte(p), await p.locator('.ob-et').count()], 'adresse d\'une course : fermer laisse la feuille de route'));
    pb.push(egal([], erreurs, 'adresse d\'une course, erreurs JavaScript'));
    await ctx.close();

    // Téléphone : plein écran, qui monte du bas ; la croix ferme.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'objectif.html', 390, db, {}, PARIS));
    await toucher(p, '.ob-et:nth-child(3) .ob-info');
    await p.waitForSelector('.mc-panneau .pc-titre');
    await p.waitForFunction(() => !document.getAnimations().length);
    const f = await p.evaluate(() => { const b = document.querySelector('.mc-panneau').getBoundingClientRect();
      return { haut: Math.round(b.top), gauche: Math.round(b.left), droite: Math.round(innerWidth - b.right), bas: Math.round(innerHeight - b.bottom), debordement: document.documentElement.scrollWidth > innerWidth }; });
    pb.push(egal({ haut: 0, gauche: 0, droite: 0, bas: 0, debordement: false }, f, 'téléphone : plein écran'));
    await p.click('.pc-fermer'); await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(false, await ouverte(p), 'téléphone : la croix ferme'));
    pb.push(egal([], erreurs, 'modale, téléphone, erreurs JavaScript'));
    await ctx.close();

    // Calendrier et Accueil : même modale, retour qui nomme la page d'origine.
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#annee', 1200, db, {}, PARIS));
    await p.click('.cal-a-j[data-course="' + id(3) + '"]');
    await p.waitForSelector('.mc-panneau #preparation');
    pb.push(egal(true, await p.evaluate(() => !!document.querySelector('.cal-a-blocs') && !!document.querySelector('.mc-panneau')), 'Calendrier : modale au-dessus du calendrier'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, db, {}, PARIS));
    await p.click('a.ac-etape');
    await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(true, await p.evaluate(() => !!document.querySelector('.ac-bloc') && !!document.querySelector('.mc-panneau')), 'Accueil : modale au-dessus de la page'));
    await ctx.close();
    return pb;
  },

  // Objectif : saisie et édition d'une course à venir (module-objectif-specification.md, § 3.7 et § 10).
  // Objectif, § 3.10 : Proposer une stratégie ; la fonction est remplacée par une réponse fixe, sans coût.
  async strategie(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const moi = db.profils[0].id;
    db.courses.find(c => c.id === id(3)).ravitaillements_km = [12, 25, 38];
    db.courses.find(c => c.id === id(2)).format = null;
    db.aliments = [{ id: 'al-1', utilisateur: moi, nom: 'Gel coco', portion: '1 pièce', kcal: 90, proteines: 0, glucides: 22, lipides: 0, favori: true },
      { id: 'al-2', utilisateur: moi, nom: 'Pain', portion: '100 g', kcal: 250, proteines: 8, glucides: 50, lipides: 1, favori: false }];
    db.profil_entrainement = [{ utilisateur: moi, niveau: 'intermediaire', fc_max: 182, fragiles: 'genou' }];
    const REPONSE = { strategie: 'Partir à l\'économie jusqu\'au km 12.\n- Marcher dès 15 % de pente.', boire_manger: '- 60 g de glucides par heure.' };
    const copie = rep => { const d = JSON.parse(JSON.stringify(db)); d.persister = true; d.ecritures = []; d.appels = [];
      d.relais = corps => { d.appels.push(corps); return rep || { status: 200, body: REPONSE }; }; return d; };
    const etat = p => p.evaluate(() => {
      const t = x => (x ? x.textContent.replace(/\s+/g, ' ').trim() : null), q = s => document.querySelector(s);
      const b = q('[data-st="proposer"]');
      return { ravitos: t(q('.pc-ravitos')), strategie: t(q('.pc-strategie')), bouton: b ? [t(b), b.disabled, b.hidden] : null, msg: t(q('.st-msg')),
        proposition: q('.st-proposition') ? !q('.st-proposition').hidden : null, titres: [...document.querySelectorAll('.st-texte .pc-sous-titre')].map(t),
        parcours: !!(q('#parcours') && q('#parcours').open) };
    });

    // 1. Trail des Gorges : ravitaillements, bouton sous la stratégie ; la proposition, puis « OK ».
    let d = copie();
    let { p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, d, {}, PARIS);
    await p.waitForSelector('.pc-titre');
    let e = await etat(p);
    pb.push(egal({ ravitos: 'Ravitaillements km 12 · 25 · 38', strategie: 'Stratégie de coursePartir prudemment jusqu\'au premier ravitaillement.', bouton: ['Proposer une stratégie', false, false], msg: '', proposition: false, parcours: true },
      { ravitos: e.ravitos, strategie: e.strategie, bouton: e.bouton, msg: e.msg, proposition: e.proposition, parcours: e.parcours }, 'Trail des Gorges : ravitaillements, stratégie, puis le bouton, Parcours ouvert'));
    const ordre = await p.evaluate(() => [...document.querySelector('#parcours .pc-corps').children].map(x => x.className).filter(c => !/^tr-/.test(c)));
    pb.push(egal(['pc-ravitos', 'pc-strategie', 'st-zone'], ordre, 'Parcours : sous le tracé, ravitaillements, stratégie, bouton, dans cet ordre'));
    await p.click('[data-st="proposer"]');
    await p.waitForSelector('.st-proposition:not([hidden])');
    e = await etat(p);
    pb.push(egal({ titres: ['Stratégie', 'Boire et manger'], bouton: true, msg: '' }, { titres: e.titres, bouton: e.bouton[2], msg: e.msg }, 'proposition : deux parties titrées, « OK » ; le bouton masqué'));
    const cx = d.appels[0] && d.appels[0].contexte, brut = JSON.stringify(cx || {});
    pb.push(egal([1, false, false, false], [d.appels.length, /Trail des Gorges/.test(brut), /Mont-Clair/.test(brut), /Essai|@/.test(JSON.stringify(cx.profil || {}))], 'contexte : un appel, ni nom de course, ni lieu, ni nom du coureur'));
    pb.push(egal({ format: 'Trail long', distance_km: 45, dplus_m: 2100, objectif: '06:30:00', ravitaillements_km: [12, 25, 38], heure_depart: '07:30' },
      (({ format, distance_km, dplus_m, objectif, ravitaillements_km, heure_depart }) => ({ format, distance_km, dplus_m, objectif, ravitaillements_km, heure_depart }))(cx.course), 'contexte : la course'));
    pb.push(egal([[{ nom: 'Gel coco', portion: '1 pièce', kcal: 90, glucides_g: 22 }], 182, 'genou'], [cx.aliments_favoris, cx.profil.fc_max, cx.profil.points_fragiles], 'contexte : favoris seulement, profil'));
    await p.click('[data-st="ok"]');
    await p.waitForFunction(() => /Partir à l'économie/.test((document.querySelector('.pc-strategie') || {}).textContent || ''));
    const texte = 'Stratégie\n' + REPONSE.strategie + '\n\nBoire et manger\n' + REPONSE.boire_manger;
    e = await etat(p);
    pb.push(egal([texte, false, false, true], [d.courses.find(c => c.id === id(3)).strategie, e.proposition, e.bouton[2], e.parcours], '« OK » : la stratégie remplacée et rangée ; la proposition fermée, le bouton revenu, Parcours ouvert'));
    pb.push(egal([], erreurs, 'proposer une stratégie, erreurs JavaScript'));
    await ctx.close();

    // 2. Compte non pilote, panne : message, stratégie inchangée.
    for (const [rep, msg] of [[{ status: 403, body: { code: 'reserve' } }, 'Réservé aux comptes pilotes pour l\'instant.'], [{ status: 502, body: { code: 'ia' } }, 'La proposition n\'a pas abouti. Réessaie dans un moment.']]) {
      d = copie(rep);
      ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, d, {}, PARIS));
      await p.waitForSelector('[data-st="proposer"]');
      await p.click('[data-st="proposer"]');
      await p.waitForFunction(m => (document.querySelector('.st-msg') || {}).textContent === m, msg);
      e = await etat(p);
      pb.push(egal([msg, false, 'Partir prudemment jusqu\'au premier ravitaillement.'], [e.msg, e.proposition, d.courses.find(c => c.id === id(3)).strategie], 'réponse ' + rep.status + ' : message, stratégie inchangée'));
      await ctx.close();
    }

    // 3. Course courue : pas de bouton ; course sans format : bouton grisé et message.
    const courue = db.courses.find(c => c.etat === 'courue').id;
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + courue, 1200, copie(), {}, PARIS));
    await p.waitForSelector('.pc-titre');
    pb.push(egal(0, await p.locator('[data-st="proposer"]').count(), 'course courue : pas de bouton'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(2), 1200, copie(), {}, PARIS));
    await p.waitForSelector('.pc-titre');
    e = await etat(p);
    pb.push(egal([['Proposer une stratégie', true, false], 'Indique d\'abord la distance et le format de la course.', null], [e.bouton, e.msg, e.ravitos], 'Corrida de Noël sans format : bouton grisé, message ; pas de ravitaillements'));
    await ctx.close();

    // 4. Fiche d'édition : « Ravitaillements (km) » dans Parcours.
    d = copie();
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, d, {}, PARIS));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    await ouvrirBloc(p, 'parcours');
    const lib = await p.evaluate(() => { const c = document.getElementById('fc-ravitaillements_km'); return [c.closest('.fc-champ').querySelector('label').textContent.trim(), c.value, c.getAttribute('placeholder')]; });
    pb.push(egal(['Ravitaillements (km)', '12, 25, 38', 'ex. 12, 25, 38'], lib, 'fiche : « Ravitaillements (km) », valeur et exemple'));
    for (const [saisie, msg] of [['12, 50', 'Des km dans l\'ordre, entre le départ et l\'arrivée.'], ['25, 12', 'Des km dans l\'ordre, entre le départ et l\'arrivée.'], ['douze', 'Indique les km séparés par des virgules.']]) {
      await p.fill('#fc-ravitaillements_km', saisie);
      await p.click('.fc-plein'); await pause();
      pb.push(egal(msg, await p.textContent('#fc-ravitaillements_km-err'), 'fiche : « ' + saisie + ' » refusé'));
    }
    await p.fill('#fc-ravitaillements_km', '10; 20,5, 30');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal([10, 20.5, 30], d.courses.find(c => c.id === id(3)).ravitaillements_km, 'fiche : « 10; 20,5, 30 » rangé'));
    await p.waitForSelector('.pc-ravitos');
    pb.push(egal('Ravitaillements km 10 · 20,5 · 30', (await p.textContent('.pc-ravitos')).replace(/\s+/g, ' ').trim(), 'page : les nouveaux ravitaillements'));
    pb.push(egal([], erreurs, 'fiche, ravitaillements, erreurs JavaScript'));
    await ctx.close();

    // 5. Tracé en tronçons : une montée de 200 m sur 2 km, puis la descente.
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, copie(), {}, PARIS));
    await p.waitForSelector('.pc-titre');
    const tr = await p.evaluate(() => {
      const pts = [];
      for (let i = 0; i <= 400; i++) { const km = i / 100; pts.push([45, 4, km <= 2 ? 500 + km * 100 : 900 - km * 100, km, false]); }
      const r = window.mrtStrategie.troncons(pts);
      return [r.par_km.length, r.par_km[0].pente_pct, r.montees_descentes.map(x => x.sens + ' ' + x.du_km + '-' + x.au_km + ' ' + x.denivele_m)];
    });
    pb.push(egal([4, 9.9, ['montée 0-2 198', 'descente 2-4 198']], tr, 'tronçons : 4 km, pente de 10 % (altitude lissée sur 50 m), une montée et une descente de 200 m'));
    await ctx.close();

    // 6. Téléphone : la proposition sur toute la largeur, rien ne dépasse.
    ({ p, ctx, erreurs } = await ouvrir(nav, 'course.html?id=' + id(3), 390, copie(), {}, PARIS));
    await p.waitForSelector('[data-st="proposer"]');
    await p.click('[data-st="proposer"]');
    await p.waitForSelector('.st-proposition:not([hidden])');
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'strategie-telephone.png'), fullPage: true });
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), 'téléphone : rien ne dépasse'));
    pb.push(egal([], erreurs, 'téléphone, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },

  // Objectif, § 3.9 : Remplir depuis la page de la course ; la fonction « lire-page-course » est remplacée par une réponse fixe.
  async remplir(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const commun = { course: 'Trail des Hauts', lieu: 'Mont-Clair', type: 'trail', description: '', lien: 'https://example.org/hauts', ouverture_inscriptions: '2026-12-01', ouverture_heure: '', inscription: 'https://example.org/hauts/inscription', dmoins: '' };
    const DEUX = { parcours: [Object.assign({}, commun, { parcours: 'Le 25', date: '2027-06-13', heure: '09:00', format: '', distance: '25', dplus: '900', prix: '35' }),
      Object.assign({}, commun, { parcours: 'Le 50', date: '2027-06-12', heure: '06:00', format: '', distance: '50', dplus: '2400', prix: '60' })] };
    const copie = rep => { const d = JSON.parse(JSON.stringify(db)); d.persister = true; d.ecritures = []; d.appels = [];
      d.relais = corps => { d.appels.push(corps); return rep || { status: 200, body: DEUX }; }; return d; };
    const v = (p, k) => p.inputValue('#fc-' + k);
    const msg = p => p.evaluate(() => (document.querySelector('.fc-rp-msg') || {}).textContent || '');
    const remplis = p => p.evaluate(() => [...document.querySelectorAll('.fc-rempli [data-k]')].map(e => e.dataset.k));
    const vue = p => p.evaluate(() => ['.fc-rp-ferme', '.fc-rp-ouvert', '.fc-rp-choix'].filter(s => !document.querySelector(s).hidden).map(s => s.slice(7)));
    const ajouter = async (largeur, d) => {
      const o = await ouvrir(nav, 'objectif.html', largeur, d, {}, PARIS);
      await o.p.click('[data-ob="ajouter"]'); await o.p.waitForSelector('.fc-fiche');
      return o;
    };
    const coller = async (p, texte) => {
      await p.click('[data-fc="rp-ouvrir"]');
      await p.fill('.fc-rp-texte', texte);
      await p.click('[data-fc="rp-remplir"]');
    };

    // 1. L'encart en tête de la fiche ; « Remplir » grisé tant que la zone est vide ; deux parcours : le choix.
    let d = copie();
    let { p, ctx, erreurs } = await ajouter(1200, d);
    pb.push(egal(['Tu as la page de la course (Finishers, site officiel…) ?', 'Remplir depuis la page de la course', ['ferme'], true],
      [await p.textContent('.fc-rp-phrase'), await p.textContent('[data-fc="rp-ouvrir"]'), await vue(p),
        await p.evaluate(() => { const r = document.querySelector('.fc-remplir'); return r.compareDocumentPosition(document.querySelector('.fc-bloc')) === Node.DOCUMENT_POSITION_FOLLOWING; })],
      'ajout : l\'encart avant le bloc Course, fermé'));
    await p.click('[data-fc="rp-ouvrir"]');
    pb.push(egal([['ouvert'], true, 'Colle ici le texte de la page'], [await vue(p), await p.isDisabled('[data-fc="rp-remplir"]'), await p.getAttribute('.fc-rp-texte', 'placeholder')], 'ouvert : consigne, zone de collage, « Remplir » grisé'));
    await p.fill('.fc-rp-texte', 'Trail des Hauts, édition 2027 : Le 25 et Le 50…');
    await p.click('[data-fc="rp-remplir"]');
    await p.waitForSelector('.fc-rp-choix:not([hidden])');
    pb.push(egal(['Plusieurs parcours trouvés : lequel ?', ['Le 25 · 25 km · 900 m D+', 'Le 50 · 50 km · 2 400 m D+']],
      [await p.textContent('.fc-rp-question'), await p.evaluate(() => [...document.querySelectorAll('[data-rp]')].map(b => b.textContent))], 'deux parcours : la question et un bouton par parcours'));
    const appel = d.appels[0] || {};
    pb.push(egal([1, 'Trail des Hauts, édition 2027 : Le 25 et Le 50…', '2026-10-20', true, true],
      [d.appels.length, appel.texte, appel.aujourdhui, (appel.types || []).some(t => t.id === 'trail'), (appel.formats || []).some(f => f.id === 'trail_long' && f.type === 'trail')], 'appel : le texte, la date du jour, les types et les formats'));
    await p.click('[data-rp="1"]');
    const champs = ['course', 'parcours', 'date', 'heure', 'lieu', 'type', 'format', 'distance', 'dplus', 'lien', 'ouverture_inscriptions', 'inscription', 'prix', 'statut', 'objectif_type', 'inscrit'];
    const lu = async () => { const o = {}; for (const k of champs) o[k] = k === 'inscrit' ? await p.isChecked('#fc-inscrit') : await v(p, k); return o; };
    pb.push(egal({ course: 'Trail des Hauts', parcours: 'Le 50', date: '2027-06-12', heure: '06:00', lieu: 'Mont-Clair', type: 'trail', format: 'trail_long', distance: '50', dplus: '2400',
      lien: 'https://example.org/hauts', ouverture_inscriptions: '2026-12-01', inscription: 'https://example.org/hauts/inscription', prix: '60', statut: 'confirmee', objectif_type: '', inscrit: false }, await lu(),
      '« Le 50 » : la fiche remplie ; statut, objectif et « Inscrit » inchangés'));
    pb.push(egal([['course', 'parcours', 'date', 'heure', 'lieu', 'type', 'distance', 'dplus', 'lien', 'ouverture_inscriptions', 'inscription', 'prix'], ['ferme'], '12 champs remplis : vérifie-les avant d\'enregistrer.'],
      [await remplis(p), await vue(p), await msg(p)],
      'liseré sur les champs remplis, encart replié, message'));
    pb.push(egal([false, false], await p.evaluate(() => ['course', 'dossard'].map(b => document.querySelector('.fc-bloc-titre[data-bloc="' + b + '"]').nextElementSibling.hidden)), 'blocs Course et Inscription ouverts'));
    pb.push(egal(true, await p.evaluate(() => getComputedStyle(document.getElementById('fc-distance')).borderTopColor === getComputedStyle(document.querySelector('.fc-oblig')).color), 'liseré en Accent'));
    await p.fill('#fc-distance', '51');
    pb.push(egal(false, (await remplis(p)).includes('distance'), 'distance changée à la main : plus de liseré'));
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const ins = (d.ecritures.find(e => e.methode === 'POST' && e.table === 'courses') || {}).corps || {};
    pb.push(egal({ course: 'Trail des Hauts', parcours: 'Le 50', date: '2027-06-12', heure: '06:00', lieu: 'Mont-Clair', format: 'trail_long', distance: 51, dplus: 2400, prix: 60, ouverture_inscriptions: '2026-12-01', statut: 'confirmee' },
      (({ course, parcours, date, heure, lieu, format, distance, dplus, prix, ouverture_inscriptions, statut }) => ({ course, parcours, date, heure, lieu, format, distance, dplus, prix, ouverture_inscriptions, statut }))(ins), '« Enregistrer » : la course rangée avec les valeurs affichées'));
    pb.push(egal([], erreurs, 'remplir, erreurs JavaScript'));
    await ctx.close();

    // 2. Un seul parcours ; un nom déjà saisi reste ; format hors liste et lien sans https:// laissés de côté, date passée aussi.
    const UN = { parcours: [Object.assign({}, commun, { parcours: '', date: '2026-06-13', heure: '9h', format: 'trail_inconnu', distance: '25,5', dplus: '900 ', prix: '', lien: 'example.org/hauts', inscription: 'ftp://x' })] };
    d = copie({ status: 200, body: UN });
    ({ p, ctx, erreurs } = await ajouter(1200, d));
    await p.fill('#fc-course', 'Trail des Hautes Terres');
    await coller(p, 'texte');
    await p.waitForFunction(() => /rempli/.test((document.querySelector('.fc-rp-msg') || {}).textContent || ''));
    pb.push(egal({ course: 'Trail des Hautes Terres', lieu: 'Mont-Clair', type: 'trail', format: 'trail_court', distance: '25,5', dplus: '900', date: '', heure: '', lien: '', inscription: '', msg: '5 champs remplis : vérifie-les avant d\'enregistrer.' },
      { course: await v(p, 'course'), lieu: await v(p, 'lieu'), type: await v(p, 'type'), format: await v(p, 'format'), distance: await v(p, 'distance'), dplus: await v(p, 'dplus'), date: await v(p, 'date'), heure: await v(p, 'heure'), lien: await v(p, 'lien'), inscription: await v(p, 'inscription'), msg: await msg(p) },
      'un parcours : rempli aussitôt (lieu, type, distance, D+, ouverture ; le format suit la distance) ; le nom saisi reste ; date passée, format hors liste et liens illisibles laissés de côté, sans message'));
    // Recommencer : seuls les champs encore vides sont remplis ; rien à ajouter.
    d.relais = () => ({ status: 200, body: { parcours: [Object.assign({}, commun, { parcours: '', date: '', heure: '', format: '', distance: '30', dplus: '', prix: '', lien: '', inscription: '', ouverture_inscriptions: '' , lieu: 'Ailleurs', course: 'Autre' })] } });
    await coller(p, 'autre texte');
    await p.waitForFunction(() => /Aucune/.test((document.querySelector('.fc-rp-msg') || {}).textContent || ''));
    pb.push(egal(['Aucune information à ajouter n\'a été trouvée dans ce texte.', '25,5', 'Mont-Clair'], [await msg(p), await v(p, 'distance'), await v(p, 'lieu')], 'tout déjà rempli : message, rien de changé'));
    await ctx.close();

    // 3. Mois seul, réponse vide, compte non pilote, panne ; « Fermer ».
    d = copie({ status: 200, body: { parcours: [Object.assign({}, commun, { parcours: '', date: '2027-07', heure: '08:00', format: '', distance: '', dplus: '', prix: '', ouverture_inscriptions: '2027-01' })] } });
    ({ p, ctx, erreurs } = await ajouter(1200, d));
    await coller(p, 'texte');
    await p.waitForFunction(() => /rempli/.test((document.querySelector('.fc-rp-msg') || {}).textContent || ''));
    pb.push(egal([true, '2027-07', '', true, '2027-01'], [await p.isChecked('#fc-date_approx'), await v(p, 'date'), await v(p, 'heure'), await p.isChecked('#fc-ouverture_approx'), await v(p, 'ouverture_inscriptions')],
      'mois seul : « Seul le mois est connu » coché, sans heure (date et ouverture)'));
    await ctx.close();
    for (const [rep, texte] of [[{ status: 200, body: { parcours: [] } }, 'Aucune information à ajouter n\'a été trouvée dans ce texte.'], [{ status: 403, body: { code: 'reserve' } }, 'Réservé aux comptes pilotes pour l\'instant.'],
      [{ status: 502, body: { code: 'ia' } }, 'La lecture n\'a pas abouti. Réessaie dans un moment, ou remplis la fiche à la main.']]) {
      d = copie(rep);
      ({ p, ctx, erreurs } = await ajouter(1200, d));
      await coller(p, 'texte');
      await p.waitForFunction(t => (document.querySelector('.fc-rp-msg') || {}).textContent === t, texte);
      pb.push(egal([texte, ''], [await msg(p), await v(p, 'course')], 'réponse ' + rep.status + (rep.body.code ? ' ' + rep.body.code : ' vide') + ' : message, fiche inchangée'));
      await ctx.close();
    }
    d = copie();
    ({ p, ctx } = await ajouter(1200, d));
    await p.click('[data-fc="rp-ouvrir"]'); await p.fill('.fc-rp-texte', 'texte');
    await p.click('.fc-rp-ouvert [data-fc="rp-fermer"]');
    pb.push(egal([['ferme'], '', '', 0], [await vue(p), await p.inputValue('.fc-rp-texte'), await v(p, 'course'), d.appels.length], '« Fermer » : l\'encart replié, la zone vidée, la fiche inchangée'));
    await ctx.close();

    // 4. Pas d'encart pour une course existante (crayon) ; téléphone : rien ne dépasse.
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(3), 1200, copie(), {}, PARIS));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal(0, await p.locator('.fc-remplir').count(), 'course existante : pas d\'encart'));
    await ctx.close();
    ({ p, ctx, erreurs } = await ajouter(390, copie()));
    await coller(p, 'texte');
    await p.waitForSelector('.fc-rp-choix:not([hidden])');
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'remplir-telephone.png') });
    pb.push(egal(false, await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || [...document.querySelectorAll('.fc-remplir, .fc-remplir *')].some(e => e.getBoundingClientRect().right > window.innerWidth + 0.5)), 'téléphone : rien ne dépasse'));
    pb.push(egal([], erreurs, 'téléphone, erreurs JavaScript'));
    await ctx.close();
    return pb;
  },

  async saisie(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    db.preferences[0].modules = ['Objectif', 'En un coup d\'œil', 'Calendrier', 'Palmarès']; // Objectif en tête : la feuille de route porte le grand en-tête
    const pb = [];
    const PAGE = 'objectif.html', COURSE = n => 'course.html?id=' + id(n);
    const lire = async (p, sel) => p.locator(sel).inputValue();
    const poser = (p, k, v) => p.evaluate(([k, v]) => { document.getElementById('fc-' + k).value = v; }, [k, v]); // champ d'un bloc replié
    const deplier = p => p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(b => b.click()));
    const erreursChamps = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.fc-erreur')].filter(e => e.textContent).map(e => [e.id.replace(/^fc-|-err$/g, ''), e.textContent])));
    const neuve = async (largeur, page, base = db, stockage = {}) => {
      const copie = JSON.parse(JSON.stringify(base)); copie.ecritures = [];
      const o = await ouvrir(nav, page, largeur, copie, stockage, PARIS);
      o.copie = copie;
      return o;
    };

    // Lecture de l'objectif et de l'heure
    let { p, ctx } = await neuve(1200, PAGE);
    const lectures = await p.evaluate(() => {
      const f = window.mrtFicheCourse;
      return ['2:45:00', '2h45', '24500', 'finisher', 'FINISHER', 'sub 3h', 'Sub 1h30', 'sub1h5', 'SUB 45 min', 'sub 45', 'sub', 'rapide', '0', '1h70'].map(x => f.parseObjectif(x))
        .concat(['07:30', '7h30', '730', '0730', '7h', '7', '25:00', '7:75', 'tôt'].map(x => f.parseHeure(x)));
    });
    pb.push(egal(['02:45:00', '02:45:00', '02:45:00', 'Finisher', 'Finisher', 'Sub 3h', 'Sub 1h30', 'Sub 1h05', 'Sub 45 min', 'Sub 45 min', null, null, null, null,
      '07:30', '07:30', '07:30', '07:30', '07:00', '07:00', null, null, null],
      lectures.map(x => (x !== x ? null : x)), 'lecture de l\'objectif et de l\'heure'));
    await ctx.close();

    // Ajouter : formulaire vide
    let o = await neuve(1200, PAGE);
    ({ p, ctx } = o);
    pb.push(egal(1, await p.locator('[data-ob="ajouter"]').count(), 'bouton « + Ajouter une course » sur la feuille de route'));
    pb.push(egal('Ajouter une course', await p.evaluate(() => document.querySelector('[data-ob="ajouter"]').innerText.trim()), 'même libellé que le Palmarès'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    const blocs = await p.evaluate(() => [...document.querySelectorAll('.fc-bloc')].map(b => b.querySelector('.fc-bloc-titre').textContent.trim() + (b.querySelector('.fc-grille').hidden ? ' (replié)' : '')));
    pb.push(egal(['Course', 'Place dans le plan', 'Inscription (replié)', 'Parcours (replié)', 'Préparation (replié)', 'Logistique (replié)', 'Résultat (replié)'], blocs, 'sept blocs, cinq repliés (ordre de lecture de la page : Dossard, Parcours, Préparation, Logistique, puis Résultat, qui ne porte que « Résultats en direct » avant la course)'));
    pb.push(egal([['Résultats en direct'], ['course', 'lien']], [await p.evaluate(() => [...document.querySelector('[data-bloc="resultat"]').nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.trim())),
      await p.evaluate(() => ['description', 'lien'].map(k => document.getElementById('fc-' + k)).map(e => e.closest('.fc-grille').previousElementSibling.dataset.bloc).slice(0, 1).concat('lien'))], 'à venir : « Résultats en direct » dans Résultat ; plus de bloc Liens'));
    pb.push(egal(true, await p.evaluate(() => document.getElementById('fc-lien').getBoundingClientRect().top >= document.getElementById('fc-description').getBoundingClientRect().bottom && document.getElementById('fc-lien').closest('.fc-grille').previousElementSibling.dataset.bloc === 'course'), '« Site officiel » dans Course, sous la description'));
    pb.push(egal(['Choisis d\'abord la date et le format.', 0], await p.evaluate(() => [document.querySelector('.fc-prep-note').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'nouvelle course : date et format d\'abord, aucun bouton de réglage du plan'));
    pb.push(egal(['Ajouter une course', 'confirmee', '', true], [await p.textContent('#fc-titre'), await lire(p, '#fc-statut'), await lire(p, '#fc-role'), await p.locator('[data-champ="groupe_options"]').isHidden()], 'ajout : titre, statut proposé, sans rôle (il se donne dans Mon plan), groupe caché'));
    pb.push(egal('ex. 07:30', await p.getAttribute('#fc-heure', 'placeholder'), 'exemple dans l\'heure'));
    // Enregistrer sans rien : champs obligatoires
    await p.click('.fc-plein');
    pb.push(egal({ course: 'Champ obligatoire.', date: 'Champ obligatoire.', type: 'Choisis un type.', format: 'Champ obligatoire.', distance: 'Champ obligatoire.' }, await erreursChamps(p), 'obligatoires : date, course, type, format, distance'));
    // Étoiles en Accent, légende ; une course à surveiller n'a besoin ni de date ni de distance (étoiles retirées)
    const etoiles = () => p.evaluate(() => ({ couleur: getComputedStyle(document.querySelector('.fc-oblig')).color !== getComputedStyle(document.querySelector('.fc-champ label')).color,
      legende: document.querySelectorAll('.fc-legende').length, enExposant: parseFloat(getComputedStyle(document.querySelector('.fc-oblig')).verticalAlign) > 0,
      visibles: ['course', 'date', 'type', 'format', 'distance'].map(k => !document.querySelector('label[for="fc-' + k + '"] .fc-oblig').hidden) }));
    pb.push(egal({ couleur: true, legende: 0, enExposant: true, visibles: [true, true, true, true, true] }, await etoiles(), 'étoile en Accent et en exposant, sans légende, sur les cinq champs obligatoires'));
    await p.selectOption('#fc-statut', 'a_surveiller');
    pb.push(egal([true, false, true, true, false], (await etoiles()).visibles, 'À surveiller : plus d\'étoile sur la date ni la distance'));
    await p.selectOption('#fc-statut', 'confirmee'); await p.click('.fc-plein');
    pb.push(egal(0, o.copie.ecritures.length, 'rien d\'écrit tant qu\'une erreur demeure'));
    // Ordre : course, parcours, date (avec « Date approximative »), heure
    pb.push(egal(['course', 'parcours', 'date', 'date_approx', 'heure', 'lieu'], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')[0].querySelectorAll('[data-k]')].slice(0, 6).map(e => e.dataset.k)), 'ordre : course, parcours, date, jour inconnu, heure'));
    // Contrôles de saisie
    await p.fill('#fc-date', '2026-01-01');
    await p.fill('#fc-course', 'Trail des Lacs');
    await p.selectOption('#fc-type', 'trail');
    await p.fill('#fc-distance', '28,5');
    await p.fill('#fc-heure', '25h');
    await deplier(p); await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', 'rapide');
    await poser(p, 'lien', 'www.exemple.org');
    await poser(p, 'prix', '-3');
    await p.click('.fc-plein');
    const e1 = await erreursChamps(p);
    pb.push(egal({ date: 'La date d\'une course à venir ne peut pas être dans le passé.', heure: 'Heure illisible (ex. 07:30).', objectif: 'Durée illisible (ex. 3h, 1h30 ou 45 min).',
      lien: 'Lien attendu : il commence par http:// ou https://.', prix: 'Le nombre doit être positif.' }, { date: e1.date, heure: e1.heure, objectif: e1.objectif, lien: e1.lien, prix: e1.prix }, 'contrôles : date passée, heure, objectif, lien, prix'));
    pb.push(egal([true, true, true], await p.evaluate(() => ['objectif', 'lien', 'prix'].map(k => !document.getElementById('fc-' + k).closest('.fc-grille').hidden)), 'un champ en erreur déplie son bloc'));
    pb.push(egal('trail_court', await lire(p, '#fc-format'), 'trail : format proposé d\'après la distance'));
    // Description : 1 000 caractères
    await p.fill('#fc-description', 'x'.repeat(1000));
    pb.push(egal('1000 / 1 000', (await p.textContent('[data-compte="description"]')).replace(/[  ]/g, ' ').replace(/^1 000/, '1000'), 'compteur de description'));
    // Précisions : 100 caractères au plus, compteur
    await deplier(p);
    await p.fill('#fc-objectif_precisions', 'y'.repeat(120));
    pb.push(egal([100, '100 / 100', 'Précisions sur l\'objectif'], [(await lire(p, '#fc-objectif_precisions')).length, await p.textContent('[data-compte="objectif_precisions"]'),
      await p.evaluate(() => document.getElementById('fc-objectif').closest('.fc-champ').nextElementSibling.querySelector('label').textContent)], 'précisions : sous Objectif, limitées à 100 caractères'));
    // Saisie valide
    await p.fill('#fc-objectif_precisions', 'Partir prudemment.');
    await p.fill('#fc-description', 'Boucle autour du lac.');
    await p.fill('#fc-date', '2027-06-12');
    await p.fill('#fc-heure', '730');
    await p.fill('#fc-parcours', 'La Grande Boucle');
    await p.fill('#fc-lieu', 'Mont-Clair');
    await p.fill('#fc-dplus', '1200');
    await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', '6h');
    await p.fill('#fc-lien', 'https://example.org/lacs');
    await p.fill('#fc-prix', '45,5');
    await p.check('#fc-inscrit');
    await p.fill('#fc-dossard', '77');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w = o.copie.ecritures[0];
    pb.push(egal(['POST', 'courses'], [w.methode, w.table], 'enregistrement : une insertion'));
    pb.push(egal({ etat: 'a_venir', course: 'Trail des Lacs', parcours: 'La Grande Boucle', date: '2027-06-12', date_approx: false, heure: '07:30', lieu: 'Mont-Clair', format: 'trail_court',
      distance: 28.5, dplus: 1200, dmoins: null, objectif: 'Sub 6h', objectif_precisions: 'Partir prudemment.', description: 'Boucle autour du lac.', lien: 'https://example.org/lacs', statut: 'confirmee', role: null, groupe_options: null,
      ouverture_inscriptions: null, ouverture_heure: null, ouverture_approx: false, inscrit: true, inscription: null, dossard: '77', prix: 45.5, ravitaillements_km: null, strategie: null, pourquoi: null, logistique: null, lien_resultats: null, id: w.corps.id }, w.corps, 'enregistrement : champs écrits'));
    await ctx.close();

    // Nouvelle course : plan réglé avant d'enregistrer ; date approximative : pas de plan
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'Trail des Lacs'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', 'trail_court');
    pb.push(egal(['Hors plan · semaine 5 sur 16 de la préparation de Trail des Crêtes', 0], await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'nouvelle course : place dans la saison tirée de la date, du format et du rôle saisis, sans bouton de réglage'));
    await p.check('#fc-date_approx');
    pb.push(egal(['Hors plan · semaine 4 sur 16 de la préparation de Trail des Crêtes', 'Date approximative : préparation prévue pour le début du mois ; elle sera recalculée une fois la date précise saisie.', 0],
      await p.evaluate(() => [document.querySelector('.fc-prep .cal-plan-dates').textContent, document.querySelector('.fc-prep-note').textContent, document.querySelectorAll('[data-fc="preparer"]').length]), 'date approximative : plan prévu pour le début du mois, mentionné'));
    await p.uncheck('#fc-date_approx'); await p.fill('#fc-date', '2027-06-12'); await p.dispatchEvent('#fc-date', 'change');
    pb.push(egal(0, o.copie.ecritures.length, 'nouvelle course : rien d\'écrit avant « Enregistrer »'));
    await p.fill('#fc-distance', '30');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    {
      const cw = o.copie.ecritures[0];
      pb.push(egal([1, ['POST', 'courses'], true, null], [o.copie.ecritures.length, [cw.methode, cw.table], /^[0-9a-f-]{36}$/.test(cw.corps.id), cw.corps.prepa_semaines],
        'nouvelle course : une seule écriture, la course ; durée du format (les phases se règlent ensuite dans Mon plan)'));
    }
    await ctx.close();

    // Date approximative décochée : le plan se recalcule sur la date précise, phases remises aux règles
    o = await neuve(1200, COURSE(6)); ({ p, ctx } = o);
    pb.push(egal(true, (await p.textContent('#preparation')).replace(/\u00a0/g, ' ').includes('Date approximative : préparation prévue pour le début du mois'), 'page d\'une course à date approximative : mention dans la rubrique Préparation'));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Préparatoire (option) · semaine 8 sur 16 de la préparation de Trail des Crêtes · 3 jours allégés avant, 26 jours de récupération', await p.textContent('.fc-prep .cal-plan-dates'), 'formulaire, date approximative : plan au 1er du mois'));
    await p.uncheck('#fc-date_approx'); await p.fill('#fc-date', '2027-07-04'); await p.dispatchEvent('#fc-date', 'change');
    pb.push(egal(['Préparatoire (option) · semaine 8 sur 16 de la préparation de Trail des Crêtes · 3 jours allégés avant, 26 jours de récupération', 0], [await p.textContent('.fc-prep .cal-plan-dates'), await p.locator('.fc-prep-note', { hasText: 'Date approximative' }).count()], 'case décochée : plan recalculé sur la date précise, sans mention'));
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal([['PATCH', 'courses'], ['DELETE', 'plan_semaines', '?course=eq.' + id(6)]], o.copie.ecritures.slice(0, 2).map((e, i) => i ? [e.methode, e.table, e.filtres] : [e.methode, e.table]), 'enregistrement : date précise, phases du plan remises aux règles'));
    await ctx.close();

    // Date précise changée : les phases réglées à la main suivent la course (même numéro de semaine du plan)
    {
      const avecModif = JSON.parse(JSON.stringify(db));
      avecModif.plan_semaines = [{ id: 'ps1', utilisateur: db.profils[0].id, course: id(3), lundi: '2026-12-14', phase: 'deload' }]; // semaine 5 sur 16
      o = await neuve(1200, COURSE(3), avecModif); ({ p, ctx } = o);
      await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
      await p.fill('#fc-date', '2027-03-14'); await p.dispatchEvent('#fc-date', 'change');
      pb.push(egal('Objectif · préparation de 16 semaines, du lun. 23 nov. 2026 au dim. 14 mars 2027', await p.textContent('.fc-prep .cal-plan-dates'), 'date décalée d\'une semaine : saison décalée'));
      await p.click('.fc-plein');
      await p.waitForSelector('.fc-fiche', { state: 'detached' });
      pb.push(egal([['PATCH', 'courses'], ['DELETE', 'plan_semaines'], ['POST', 'plan_semaines', [{ course: id(3), lundi: '2026-12-21', phase: 'deload' }]]],
        o.copie.ecritures.map(e => e.methode === 'POST' ? [e.methode, e.table, e.corps] : [e.methode, e.table]), 'enregistrement : la semaine 5 réglée à la main suit la course'));
      await ctx.close();
    }

    // Option : groupe d'options, existant ou nouveau ; jour inconnu
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.selectOption('#fc-statut', 'option');
    await deplier(p);
    pb.push(egal(['—', 'Printemps 2027', 'Nouveau groupe…'], await p.locator('#fc-groupe_options option').allTextContents(), 'groupes proposés'));
    pb.push(egal(true, await p.locator('[data-champ="groupe_options"]').isVisible(), 'groupe visible pour une Option'));
    await p.selectOption('#fc-groupe_options', '__nouveau__');
    pb.push(egal(true, await p.locator('#fc-groupe_nouveau').isVisible(), 'nouveau groupe : champ de nom'));
    await p.click('.fc-plein');
    pb.push(egal('Écris le nom du groupe.', (await erreursChamps(p)).groupe_options, 'nouveau groupe sans nom'));
    await p.fill('#fc-groupe_nouveau', 'Automne 2027');
    await p.fill('#fc-course', 'Trail des Vignes');
    await p.selectOption('#fc-type', 'route');
    await p.selectOption('#fc-format', { index: 1 });
    await p.check('#fc-date_approx');
    pb.push(egal('month', await p.getAttribute('#fc-date', 'type'), 'jour inconnu : la date devient un mois'));
    await p.fill('#fc-date', '2027-10');
    pb.push(egal(true, await p.isDisabled('#fc-heure'), 'mois seul : l\'heure de départ est grisée'));
    await p.fill('#fc-distance', '42');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w2 = o.copie.ecritures[0].corps;
    pb.push(egal(['2027-10-01', true, null, 'option', 'Automne 2027'], [w2.date, w2.date_approx, w2.heure, w2.statut, w2.groupe_options], 'mois seul, option, nouveau groupe'));
    await ctx.close();

    // À surveiller : date facultative
    o = await neuve(1200, PAGE); ({ p, ctx } = o);
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.selectOption('#fc-statut', 'a_surveiller');
    await p.fill('#fc-course', 'Trail des Sommets bis');
    await p.selectOption('#fc-type', 'trail');
    await p.selectOption('#fc-format', { index: 1 });
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal([null, 'a_surveiller'], [o.copie.ecritures[0].corps.date, o.copie.ecritures[0].corps.statut], 'à surveiller sans date'));
    await ctx.close();

    // Modifier : formulaire rempli, tous les blocs ouverts
    o = await neuve(1200, COURSE(3)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal('Modifier la course', await p.textContent('#fc-titre'), 'modifier : titre'));
    pb.push(egal(['Inscription', 'Parcours', 'Préparation', 'Logistique', 'Résultat'], await p.evaluate(() => [...document.querySelectorAll('.fc-grille')].filter(g => g.hidden).map(g => g.previousElementSibling.textContent)), 'modifier : comme pour une nouvelle course, Course et Place dans le plan ouverts, les autres repliés'));
    // Bloc Préparation : résumé du plan et frise, sans réglage (le plan se règle dans la page Préparation)
    pb.push(egal(['Objectif · préparation de 16 semaines, du lun. 16 nov. 2026 au dim. 7 mars 2027', 1, 0], await p.evaluate(() => {
      const z = document.querySelector('.fc-prep');
      return [z.querySelector('.cal-plan-dates').textContent, z.querySelectorAll('.cal-frise').length, z.querySelectorAll('button').length];
    }), 'modifier : place dans la saison (Objectif : sa saison et sa frise) en tête du bloc Préparation, en lecture'));
    await ouvrirBloc(p, 'preparation');
    const rempli = await p.evaluate(() => Object.fromEntries(['date', 'heure', 'course', 'lieu', 'format', 'dplus', 'dmoins', 'role', 'objectif', 'dossard', 'prix', 'logistique', 'lien', 'inscription', 'lien_resultats'].map(k => [k, document.getElementById('fc-' + k).value])));
    pb.push(egal({ date: '2027-03-07', heure: '07:30', course: 'Trail des Gorges', lieu: 'Mont-Clair', format: 'trail_long', dplus: '2100', dmoins: '2100', role: 'objectif', objectif: '06:30:00',
      dossard: '1287', prix: '58', logistique: 'Navette depuis le stade à 6 h 30.', lien: 'https://example.org/gorges', inscription: 'https://example.org/gorges/inscription', lien_resultats: 'https://example.org/gorges/resultats' }, rempli, 'modifier : valeurs de la course'));
    pb.push(egal(true, await p.locator('#fc-inscrit').isChecked(), 'modifier : inscrit coché'));
    await p.selectOption('#fc-objectif_type', 'sub'); await p.fill('#fc-objectif', '6h30');
    await p.fill('#fc-date', '2027-03-08');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    const m = o.copie.ecritures[0];
    pb.push(egal(['PATCH', '?id=eq.' + id(3), 'Sub 6h30', '2027-03-08'], [m.methode, m.filtres, m.corps.objectif, m.corps.date], 'modifier : mise à jour de la course'));
    pb.push(egal(true, !m.corps.etat, 'modifier : l\'état n\'est pas touché'));
    pb.push(egal([false, 1], [m.corps.prepa_semaines !== undefined, o.copie.ecritures.length], 'modifier : une seule écriture, durée et phases du plan non touchées'));
    // Pas de bouton « Retenir » ni « Marquer » sur une confirmée à venir
    pb.push(egal(0, await p.locator('[data-ob="retenir"], [data-ob="marquer"]').count(), 'confirmée à venir : ni Retenir ni Marquer'));
    await ctx.close();

    // Supprimer
    o = await neuve(1200, COURSE(2)); ({ p, ctx } = o);
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    await p.click('[data-fc="supprimer"]');
    pb.push(egal([true, 'Supprimer'], await p.evaluate(() => [document.querySelector('.mrt-dialogue-cadre').classList.contains('is-danger'), document.querySelector('.mrt-dialogue [data-r="oui"]').textContent]),
      'suppression : confirmation du site, encadré d\'Alerte, action « Supprimer »'));
    pb.push(egal('Supprimer cette course ? Cette action est définitive.', await repondre(p, false), 'suppression : confirmation'));
    pb.push(egal(0, o.copie.ecritures.length, 'suppression annulée : rien d\'écrit'));
    await p.click('[data-fc="supprimer"]');
    await repondre(p, true);
    await p.waitForSelector('.mc-voile', { state: 'detached' });
    pb.push(egal(['DELETE', '?id=eq.' + id(2)], [o.copie.ecritures[0].methode, o.copie.ecritures[0].filtres], 'suppression : ligne effacée, retour à la feuille de route'));
    await ctx.close();

    // Retenir une course d'un groupe d'options
    o = await neuve(1200, COURSE(4)); ({ p, ctx } = o);
    await surDialogue(p, () => true);
    await p.click('[data-ob="retenir"]');
    await p.waitForTimeout(300);
    const ecr = o.copie.ecritures.map(x => x.methode + ' ' + x.filtres + ' ' + JSON.stringify(x.corps));
    pb.push(egal(['PATCH ?groupe_options=eq.Printemps+2027&statut=eq.option&id=neq.' + id(4) + ' {"statut":"a_surveiller","groupe_options":null}',
      'PATCH ?id=eq.' + id(4) + ' {"statut":"confirmee","groupe_options":null}'], ecr, 'retenir : les autres à surveiller, le candidat confirmé'));
    await ctx.close();

    // Marquer comme courue : à partir du jour de la course
    const jour = JSON.parse(JSON.stringify(db));
    jour.courses.find(c => c.id === id(1)).date = '2026-10-20';
    o = await neuve(1200, COURSE(1), jour); ({ p, ctx } = o);
    pb.push(egal(1, await p.locator('[data-ob="marquer"]').count(), 'jour de la course : Marquer comme courue'));
    await p.click('[data-ob="marquer"]');
    pb.push(egal(['Marquer comme courue', ['Course', 'Résultat', 'Montre', 'Place dans le plan', 'Inscription', 'Parcours', 'Préparation', 'Logistique'], 0], [await p.textContent('#fc-titre'),
      await p.locator('.fc-bloc-titre').allTextContents().then(t => t.map(x => x.trim())), await p.locator('[data-fc="supprimer"]').count()], 'marquer : fiche d\'une course courue, sans Supprimer'));
    pb.push(egal(['2026-10-20', 'Trail du Lac'], [await lire(p, '#fc-date'), await lire(p, '#fc-course')], 'marquer : pré-rempli'));
    await p.fill('#fc-temps', '2:40:00');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-fiche', { state: 'detached' });
    pb.push(egal(['PATCH', 'courue', 9600], [o.copie.ecritures[0].methode, o.copie.ecritures[0].corps.etat, o.copie.ecritures[0].corps.temps], 'marquer : la course passe à l\'état Courue'));
    await ctx.close();

    // Course confirmée passée, pas encore courue : elle reste sur la feuille de route
    const passee = JSON.parse(JSON.stringify(db));
    passee.courses.find(c => c.id === id(1)).date = '2026-10-10';
    passee.courses.find(c => c.id === id(4)).date = '2026-10-11'; // option passée : absente du groupe
    o = await neuve(1200, PAGE, passee); ({ p, ctx } = o);
    const noms = await p.evaluate(() => [...document.querySelectorAll('.ob-et > .ob-carte > .ob-nom, .ob-et > .ob-carte > h3')].map(e => e.textContent.replace(/[  ]/g, ' ').replace(/\s*↗/, '').trim()));
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Printemps 2027', 'Trail de la Forêt', 'Trail des Crêtes'], noms, 'passée : en tête de la feuille de route'));
    pb.push(egal('Course courue', await p.locator('.ob-et').first().locator('.ob-cpt').textContent(), 'passée : compteur Course courue'));
    pb.push(egal('4 courses', (await p.locator('.mrt-stat-val').last().textContent()).trim(), 'passée : l\'en-tête ne la compte pas'));
    await ctx.close();
    o = await neuve(1200, COURSE(1), passee); ({ p, ctx } = o);
    pb.push(egal(1, await p.locator('[data-ob="marquer"]').count(), 'passée : Marquer comme courue sur sa page'));
    await ctx.close();

    // Panne d'enregistrement
    const panne = JSON.parse(JSON.stringify(db)); panne.panne = true;
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, panne, {}, PARIS));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'X'); await p.fill('#fc-date', '2027-06-12'); await p.selectOption('#fc-type', 'trail'); await p.selectOption('#fc-format', { index: 1 }); await p.fill('#fc-distance', '30');
    await p.click('.fc-plein');
    await p.waitForSelector('.fc-msg:has-text("Enregistrement impossible")');
    pb.push(egal(1, await p.locator('.fc-fiche').count(), 'panne : le formulaire reste ouvert'));
    await ctx.close();

    // Palmarès : la fiche unique (§ 3.8), blocs d'une course courue ; classements dans Résultat ; ni Vitesse, ni Statut ; DNF vide le temps et l'allure
    const pal = JSON.parse(JSON.stringify(db)); pal.ecritures = [];
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, pal));
    await p.click('[data-act="add"]');
    const labels = sel => p.evaluate(s => [...document.querySelector(s).nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.replace(/\s*\*$/, '').trim()), sel);
    pb.push(egal(['Course', 'Résultat', 'Montre', 'Place dans le plan', 'Inscription', 'Parcours', 'Préparation', 'Logistique'], (await p.locator('.fc-bloc-titre').allTextContents()).map(x => x.trim()), 'Palmarès : blocs de la fiche unique'),
      egal(['Course', 'Parcours', 'Date', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Objectif', 'Précisions sur l\'objectif', 'Description', 'Site officiel'], await labels('[data-bloc="course"]'), 'Palmarès : bloc Course, dans l\'ordre'),
      egal([['Place au général', 2], ['Effectif du général', 2], ['Catégorie', 3], ['Place en catégorie', 3], ['Effectif de la catégorie', 3], ['Place par sexe', 2], ['Effectif par sexe', 2]],
        await p.evaluate(() => { const g = document.querySelector('[data-bloc="resultat"]').nextElementSibling; g.hidden = false; const l = g.getBoundingClientRect().width;
          return [...g.children].slice(1, 8).map(e => [e.querySelector(':scope > label').textContent.trim(), Math.round(l / e.getBoundingClientRect().width)]); }),
        'Palmarès : classements dans Résultat, général et sexe sur toute la largeur (deux champs), catégorie à gauche de la place en catégorie (trois champs)'),
      egal(['Temps', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Allure moyenne (par km)', 'FC moyenne (bpm)'], await labels('[data-bloc="montre"]'), 'Palmarès : Montre, temps et distance, D+ et D−, allure et FC'),
      egal(['M0', 'M10', 15], await p.evaluate(() => { const o = [...document.querySelectorAll('#fc-categorie option')].map(x => x.value).filter(Boolean); return [o[4], o[14], o.length]; }), 'Palmarès : catégories FFA (CA, JU, ES, SE, M0 à M10)'),
      egal(['Temps', 'DNF', 'Allure moyenne (par km)', 'Place au général', 'Effectif du général', 'Catégorie', 'Place en catégorie', 'Effectif de la catégorie', 'Place par sexe', 'Effectif par sexe', 'Résultats en direct'],
        await labels('[data-bloc="resultat"]'), 'Palmarès : bloc Résultat (résultat puis classements), sans vitesse'),
      egal(0, await p.locator('#fc-vitesse, #fc-montre_vitesse, #fc-statut, #fc-date_approx, #fc-inscrit').count(), 'Palmarès : ni Vitesse, ni Statut, ni date approximative, ni Inscrit'),
      egal('fc-course', await p.evaluate(() => document.activeElement.id), 'Palmarès : curseur dans Course'));
    const pos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { dossardDansDossard: document.getElementById('fc-dossard').closest('.fc-grille').previousElementSibling.dataset.bloc === 'dossard',
        distanceSeule: r('fc-dplus').top > r('fc-distance').bottom, dplusDmoins: Math.abs(r('fc-dplus').top - r('fc-dmoins').top) < 2,
        description: r('fc-description').top > r('fc-dmoins').bottom }; });
    pb.push(egal({ dossardDansDossard: true, distanceSeule: true, dplusDmoins: true, description: true }, pos, 'Palmarès : dossard dans le bloc Dossard, distance seule, D+ et D− côte à côte, description dessous'));
    await p.fill('#fc-temps', '49:18'); await p.fill('#fc-allure', '4:56');
    pb.push(egal(true, await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return Math.abs(r('fc-temps').top - r('fc-allure').top) < 2 && r('fc-dnf').left > r('fc-temps').right && r('fc-allure').left > r('fc-dnf').right; }), 'Résultat : Temps, DNF et Allure moyenne sur la même ligne, dans cet ordre'));
    await p.check('#fc-dnf');
    pb.push(egal(['', '', true, true], [await p.inputValue('#fc-temps'), await p.inputValue('#fc-allure'), await p.isDisabled('#fc-temps'), await p.isDisabled('#fc-allure')], 'DNF coché : temps et allure vidés et grisés'));
    pb.push(egal(false, await p.evaluate(() => !document.querySelector('label[for="fc-temps"] .fc-oblig').hidden), 'DNF coché : l\'étoile du temps disparaît'));
    await p.uncheck('#fc-dnf');
    pb.push(egal(true, await p.evaluate(() => { const g = document.querySelector('[data-bloc="resultat"]').nextElementSibling; return Math.abs(document.getElementById('fc-lien_resultats').getBoundingClientRect().width - g.getBoundingClientRect().width) < 2; }), '« Résultats en direct » : toute la largeur du bloc Résultat'));
    await p.fill('#fc-course', 'Course d\'essai DNF'); await p.fill('#fc-date', '2026-10-11'); await p.selectOption('#fc-type', 'route'); await p.selectOption('#fc-format', 'route_10km'); await p.fill('#fc-distance', '10');
    await p.fill('#fc-temps', '50:00'); await p.fill('#fc-allure', '5:00'); await p.click('.fc-plein');
    await p.waitForFunction(() => !document.querySelector('.fc-fiche'));
    const ins = pal.ecritures.find(e => e.methode === 'POST' && e.table === 'courses');
    pb.push(egal({ allure: 300, vitesse: 12, etat: 'courue', objectif: null }, ins && { allure: ins.corps.allure, vitesse: ins.corps.vitesse, etat: ins.corps.etat, objectif: ins.corps.objectif }, 'enregistrement : vitesse tirée de l\'allure moyenne (5:00 → 12 km/h), état Courue, objectif vide'));
    await ctx.close();

    // Objectif : la distance seule sur sa ligne, D+ et D− dessous côte à côte, puis la description avec son exemple
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, db, {}, PARIS));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    const ordre = await p.evaluate(() => {
      const r = id => document.getElementById(id).getBoundingClientRect();
      return { labels: [...document.querySelector('[data-bloc="course"]').nextElementSibling.querySelectorAll('.fc-champ > label')].map(l => l.textContent.replace(/\s*\*$/, '').trim()),
        distanceSeule: r('fc-dplus').top > r('fc-distance').bottom, dplusDmoins: Math.abs(r('fc-dplus').top - r('fc-dmoins').top) < 2 && r('fc-dmoins').left > r('fc-dplus').right,
        descriptionDessous: r('fc-description').top > r('fc-dmoins').bottom, exemple: document.getElementById('fc-description').placeholder };
    });
    pb.push(egal(['Course', 'Parcours', 'Date', 'Seul le mois est connu', 'Heure de départ', 'Lieu', 'Type', 'Format', 'Distance (km)', 'D+ (m)', 'D− (m)', 'Objectif', 'Précisions sur l\'objectif', 'Description', 'Site officiel'], ordre.labels, 'Objectif : ordre du bloc Course'),
      egal([true, true, true, true], [ordre.distanceSeule, ordre.dplusDmoins, ordre.descriptionDessous, /^Texte libre/.test(ordre.exemple)], 'Objectif : distance seule, D+ et D− côte à côte, description dessous avec un exemple de texte libre'));
    await p.click('[data-bloc="dossard"]');
    const dos = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { ligne1: Math.abs(r('fc-ouverture_inscriptions').top - r('fc-ouverture_heure').top) < 6 && r('fc-ouverture_heure').left > r('fc-ouverture_inscriptions').right
          && r('fc-ouverture_approx').left > r('fc-ouverture_heure').right && Math.abs(r('fc-ouverture_approx').top - r('fc-ouverture_inscriptions').top) < r('fc-ouverture_inscriptions').height
          && r('fc-inscrit').top > r('fc-ouverture_inscriptions').bottom,
        ligne2: Math.abs(r('fc-dossard').top - r('fc-prix').top) < 2 && r('fc-dossard').top > r('fc-ouverture_inscriptions').bottom,
        site: r('fc-inscription').top > r('fc-ouverture_inscriptions').bottom && r('fc-dossard').top > r('fc-inscription').bottom, grise: document.getElementById('fc-dossard').disabled }; });
    pb.push(egal({ ligne1: true, ligne2: true, site: true, grise: true }, dos, 'Objectif : Dossard (ouverture, heure et « Seul le mois est connu » sur une ligne, puis Inscrit, site d\'inscription, numéro et prix) ; numéro grisé tant que non inscrit'));
    await ouvrirBloc(p, 'dossard');
    await p.check('#fc-inscrit');
    pb.push(egal(false, await p.isDisabled('#fc-dossard'), 'Inscrit coché : le numéro de dossard se saisit'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-formulaire.png') });
    await ctx.close();

    // Téléphone
    ({ p, ctx } = await ouvrir(nav, PAGE, 390, db, {}, { ...PARIS, mobile: true }));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(b => b.click()));
    // Écran tactile : champs à 16 px au moins, sinon l'iPhone zoome sur le champ touché et le formulaire est coupé.
    pb.push(egal([], await p.evaluate(() => [...document.querySelectorAll('.fc-fiche input:not([type="checkbox"]), .fc-fiche select, .fc-fiche textarea')]
      .filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id)), 'téléphone : aucun champ sous 16 px (pas de zoom de l\'iPhone)'));
    const ligne = await p.evaluate(() => { const d = document.getElementById('fc-date').getBoundingClientRect(), c = document.getElementById('fc-date_approx').getBoundingClientRect();
      return { memeLigne: Math.abs((d.top + d.bottom) / 2 - (c.top + c.bottom) / 2) < d.height, aDroite: c.left >= d.right }; });
    pb.push(egal({ memeLigne: true, aDroite: true }, ligne, 'téléphone : « Seul le mois est connu » à droite de la date'));
    // Téléphone : ouverture des inscriptions sur sa ligne, puis l'heure et la case ensemble dessous ; la liste de l'objectif au-dessus de sa durée
    await p.evaluate(() => { const g = document.getElementById('fc-ouverture_inscriptions').closest('.fc-grille'); if (g.hidden) document.querySelector('[data-bloc="dossard"]').click(); });
    const ouv = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect();
      return { dateSeule: r('fc-ouverture_heure').top > r('fc-ouverture_inscriptions').bottom, heureEtCase: r('fc-ouverture_approx').left > r('fc-ouverture_heure').right && Math.abs(r('fc-ouverture_approx').top - r('fc-ouverture_heure').top) < r('fc-ouverture_heure').height,
        rien: document.documentElement.scrollWidth <= innerWidth }; });
    pb.push(egal({ dateSeule: true, heureEtCase: true, rien: true }, ouv, 'téléphone : ouverture des inscriptions seule, puis l\'heure et « Seul le mois est connu » ensemble ; rien ne dépasse'));
    pb.push(egal(false, await p.evaluate(() => document.querySelector('.mc-panneau').scrollWidth > document.querySelector('.mc-panneau').clientWidth), 'téléphone : le formulaire ne déborde pas'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-formulaire-telephone.png') });
    await ctx.close();

    // Ordinateur : capture
    if (CAPTURES) {
      ({ p, ctx } = await ouvrir(nav, PAGE, 1200, db, {}, PARIS));
      await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
      await p.screenshot({ path: path.join(DOSSIER, 'captures', 'objectif-formulaire.png') });
      await ctx.close();
    }

    // Site partagé en lecture seule : ni « + », ni « Modifier »
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = JSON.parse(JSON.stringify(db));
    partage.courses = partage.courses.filter(c => c.utilisateur !== autre).map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    ({ p, ctx } = await ouvrir(nav, PAGE, 1200, partage, { 'mrt-vue': autre }, PARIS));
    pb.push(egal(0, await p.locator('[data-ob]').count(), 'lecture seule : pas de « + »'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, COURSE(4), 1200, partage, { 'mrt-vue': autre }, PARIS));
    pb.push(egal(0, await p.locator('[data-ob]:not([data-ob="fermer"]):not([data-ob="agenda"])').count(), 'lecture seule : ni Modifier ni Retenir'));
    await ctx.close();
    return pb;
  },
};
