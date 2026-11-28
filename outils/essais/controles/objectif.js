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
};
