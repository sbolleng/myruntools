// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
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
};
