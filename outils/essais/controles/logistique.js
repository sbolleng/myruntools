// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  // Logistique d'une course (module-logistique-specification.md, § 6) : logement, transport, total, matos, jour J, Mon matériel, partage.
  async logistique(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const moi = db.profils[0].id, GORGES = id(3);
    // Catalogue de départ (en base fictive) et deux équipements.
    const art = (n, nom, categorie) => ({ id: 'art-' + n, utilisateur: moi, nom, categorie, ordre: n });
    db.materiel_catalogue = [art(1, 'Frontale', 'Sécurité'), art(2, 'Sifflet', 'Sécurité'), art(3, 'Veste pluie', 'Vêtements'), art(4, 'Chaussures', 'Porté'), art(5, 'Save bank', 'Électronique')];
    db.equipements = [{ id: 'eq-ch', utilisateur: moi, type: 'chaussures', marque: 'Salomon', modele: 'Speedcross', surnom: 'les rouges', km_depart: 120, km_limite: 800, actif: true },
      { id: 'eq-fr', utilisateur: moi, type: 'frontale', marque: 'Petzl', modele: 'Actik', surnom: null, km_depart: 0, km_limite: null, actif: true }];
    db.logements = []; db.trajets = []; db.course_materiel = [];
    const attr = p => p.evaluate(() => document.querySelector('#logistique').getAttribute('data-total'));
    const texte = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent.replace(/\s+/g, ' ').trim()), sel);
    const attendre = async p => { await pause(); };

    // Départ de la course connu (carte, distances) ; Photon (adresses) et tuiles OpenStreetMap simulés.
    Object.assign(db.courses.find(c => c.id === GORGES), { latitude: 45.0, longitude: 4.0 });
    const PHOTON = { 'rue des Crê': [{ properties: { housenumber: '12', street: 'Rue des Crêtes', postcode: '42000', city: 'Mont-Clair', countrycode: 'FR' }, geometry: { coordinates: [4.01, 45.005] } },
      { properties: { name: 'Rue des Crêtes', postcode: '69000', city: 'Ville-Haute', countrycode: 'FR' }, geometry: { coordinates: [4.8, 45.7] } }] };
    const demandes = [];
    const simuler = async ctx => {
      await ctx.route(/photon\.komoot\.io/, rt => {
        const u = new URL(rt.request().url()), q = u.searchParams.get('q');
        demandes.push([q, u.searchParams.get('lat'), u.searchParams.get('lon')]);
        const f = PHOTON[q] || [{ properties: { name: q, city: 'Mont-Clair', countrycode: 'FR' }, geometry: { coordinates: [3.99, 44.99] } }];
        rt.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ features: f }) });
      });
      await ctx.route(/tile\.openstreetmap\.org/, r => r.fulfill({ body: TUILE, contentType: 'image/png' }));
    };
    const fiche = async p => {
      await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
      await ouvrirBloc(p, 'logistique'); await p.waitForSelector('.fc-logistique .lg-cartes');
    };
    const Z = '.fc-logistique ';
    const carte = (p, n) => p.locator(Z + '.lg-carte.is-ouverte').nth(n);

    // 1. Page de la course, rien de prévu : aucune saisie possible ici.
    let o = await ouvrir(nav, 'course.html?id=' + GORGES, 1200, db, {}, PARIS);
    await simuler(o.ctx);
    await o.p.click('#logistique > summary'); await pause();
    pb.push(egal([true, 0], [/Total 58 €.*Notes ?Navette depuis le stade/i.test((await texte(o.p, '#logistique .lg-corps'))[0]), await o.p.locator('#logistique [data-ed], #logistique [data-lg-act="editer"], #logistique .mrt-rond').count()],
      'page de la course : lecture seule, ni crayon ni « Ajouter »'));

    // 2. Fiche « Modifier la course », bloc Logistique : un seul bouton principal.
    await fiche(o.p);
    pb.push(egal(1, await o.p.locator('.fc-fiche .mrt-btn.is-principal').count(), 'fiche : un seul bouton principal (Enregistrer de la fiche)'));
    pb.push(egal(['Ajouter un logement', 'Ajouter un transport'], await o.p.$$eval(Z + '.lg-ajouter', l => l.map(x => x.textContent)), 'fiche : « Ajouter » sous chaque rubrique'));

    // 3. Logement confirmé, adresse par autocomplétion (les plus proches du départ d'abord, avec la distance).
    await o.p.click(Z + '.lg-cartes[data-r="logement"] [data-ed="ajouter"]');
    pb.push(egal(['option', 'État', 'Supprimer ce logement'], [await o.p.inputValue(Z + '.lg-carte.is-ouverte [data-ed-sel="statut"]'), (await o.p.textContent(Z + '.lg-carte.is-ouverte .lg-reglage span')).trim(), (await o.p.textContent(Z + '.lg-carte.is-ouverte .lg-carte-pied [data-ed="supprimer"]')).trim()], 'nouveau logement : État en liste (Option par défaut), « Supprimer ce logement » en bas'));
    await carte(o.p, 0).locator('[data-f="nom"]').fill('Gîte des Crêtes');
    await carte(o.p, 0).locator('[data-f="adresse"]').pressSequentially('rue des Crê');
    await o.p.waitForSelector(Z + '.lg-auto-liste');
    pb.push(egal([['rue des Crê', '45', '4'], ['12 Rue des Crêtes, 42000 Mont-Clair|à 1 km du départ', 'Rue des Crêtes, 69000 Ville-Haute|à 100 km du départ']],
      [demandes[demandes.length - 1], await o.p.$$eval(Z + '.lg-auto-l', l => l.map(x => x.querySelector('span').textContent + '|' + x.querySelector('small').textContent))], 'adresse : propositions pendant la frappe, près du départ, avec la distance'));
    await carte(o.p, 0).locator('[data-f="adresse"]').press('Enter');
    pb.push(egal(['12 Rue des Crêtes, 42000 Mont-Clair', 0], [await carte(o.p, 0).locator('[data-f="adresse"]').inputValue(), await o.p.locator(Z + '.lg-auto-liste').count()], 'adresse : Entrée choisit la première proposition'));
    await carte(o.p, 0).locator('[data-f="arrivee:d"]').fill('2027-03-05'); await carte(o.p, 0).locator('[data-f="arrivee:h"]').fill('17:00');
    await carte(o.p, 0).locator('[data-f="depart:d"]').fill('2027-03-07'); await carte(o.p, 0).locator('[data-f="depart:h"]').fill('10:00');
    await carte(o.p, 0).locator('[data-f="prix"]').fill('180'); await carte(o.p, 0).locator('[data-f="url"]').fill('https://example.org/gite');
    await carte(o.p, 0).locator('[data-ed-sel="statut"]').selectOption('confirme');
    // 4. Logement en option, adresse saisie à la main : coordonnées cherchées à l'enregistrement.
    await o.p.click(Z + '.lg-cartes[data-r="logement"] [data-ed="ajouter"]');
    await carte(o.p, 1).locator('[data-f="nom"]').fill('Gîte du Lac');
    await carte(o.p, 1).locator('[data-f="adresse"]').fill('quai du Lac');
    await carte(o.p, 1).locator('[data-f="prix"]').fill('95');
    pb.push(egal('Confirmé : 180 € · en option : 95 €', (await o.p.textContent(Z + '.lg-somme[data-r="logement"]')).trim(), 'rubrique Logement : confirmé et option à part'));

    // 5. Transport : avion aller-retour, retour présaisi à l'envers, un seul prix ; voiture : sans heures.
    await o.p.click(Z + '.lg-cartes[data-r="trajet"] [data-ed="ajouter"]');
    const tr = () => o.p.locator(Z + '.lg-cartes[data-r="trajet"] .lg-carte.is-ouverte').nth(0);
    await tr().locator('[data-ed-sel="type"]').selectOption('avion');
    pb.push(egal(['Mode', 'Aller-retour', 'État'], await tr().locator('.lg-reglages .lg-reglage').evaluateAll(l => l.map(x => x.textContent.replace(/(Train|Avion|Voiture|Bus|Autre|Option|Confirmé|Non retenu)/g, '').trim())), 'transport : Mode, Aller-retour et État sur une ligne'));
    await tr().locator('[data-f="lieu_depart"]').fill('Aéroport de Lyon'); await tr().locator('[data-f="lieu_arrivee"]').fill('Aéroport de Nice');
    await tr().locator('[data-f="depart:d"]').fill('2027-03-06'); await tr().locator('[data-f="depart:h"]').fill('08:12');
    await tr().locator('[data-ed-coche="ar"]').check();
    pb.push(egal(['Aéroport de Nice', 'Aéroport de Lyon', 'Prix de l\'aller-retour (€)'], [await tr().locator('[data-f="retour_lieu_depart"]').inputValue(), await tr().locator('[data-f="retour_lieu_arrivee"]').inputValue(),
      (await tr().locator('.lg-grille .lg-champ label').first().textContent()).trim()], 'aller-retour (avion) : retour présaisi à l\'envers, un seul prix'));
    await tr().locator('[data-f="retour_depart:d"]').fill('2027-03-08'); await tr().locator('[data-f="retour_depart:h"]').fill('18:00');
    await tr().locator('[data-f="prix"]').fill('100'); await tr().locator('[data-ed-sel="statut"]').selectOption('confirme');
    await o.p.click(Z + '.lg-cartes[data-r="trajet"] [data-ed="ajouter"]');
    const tr2 = () => o.p.locator(Z + '.lg-cartes[data-r="trajet"] .lg-carte.is-ouverte').nth(1);
    await tr2().locator('[data-ed-sel="type"]').selectOption('voiture');
    pb.push(egal([0, 2], [await tr2().locator('input[type="date"], input[type="time"]').count(), await tr2().locator('[data-f="lieu_depart"], [data-f="lieu_arrivee"]').count()], 'voiture : De, À et prix, sans heures'));

    // 6. Matos : autocomplétion sur le catalogue, nouvel article, groupe, imposé, équipement.
    const mat = Z + '.lg-auto-matos input';
    await o.p.locator(mat).pressSequentially('fron'); for (let i = 0; i < 20 && !(await o.p.evaluate(() => /« fron »/.test((document.querySelector('.fc-logistique .lg-auto-matos .lg-auto-liste') || {}).textContent || ''))); i++) await pause();
    pb.push(egal(['Frontale|déjà dans ton matos', 'Ajouter « fron » comme nouvel article|Entrée'], await o.p.$$eval(Z + '.lg-auto-matos .lg-auto-l', l => l.map(x => x.querySelector('span').textContent + '|' + x.querySelector('small').textContent)), 'matos : autocomplétion sur le catalogue'));
    await o.p.locator(mat).press('Enter');
    await o.p.locator(mat).pressSequentially('Gants'); await o.p.waitForSelector(Z + '.lg-auto-matos .lg-auto-liste'); await o.p.locator(mat).press('Enter');
    pb.push(egal([['Autres'], ['Frontale', 'Gants']], [await o.p.$$eval(Z + '.lg-matos .lg-cat', l => l.map(x => x.textContent)), await o.p.$$eval(Z + '.lg-matos .lg-art-nom', l => l.map(x => x.textContent))], 'matos : articles ajoutés, groupe Autres par défaut'));
    await o.p.click(Z + '.lg-art[data-article="art-1"] [data-ed="groupe"][data-v="en_course"]');
    await o.p.check(Z + '.lg-art[data-article="art-1"] [data-ed-coche="impose"]');
    await o.p.selectOption(Z + '.lg-art[data-article="art-1"] select', 'eq-fr');
    pb.push(egal(['En course', 'Autres'], await o.p.$$eval(Z + '.lg-matos .lg-cat', l => l.map(x => x.textContent)), 'matos : groupe choisi par pastille'));

    pb.push(egal([], await o.p.evaluate(() => { const z = document.querySelector('.fc-logistique').getBoundingClientRect().right;
      return [...document.querySelectorAll('.fc-logistique *:not(.lg-plan *)')].filter(e => e.getBoundingClientRect().right > z + 1).map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().right - z)).slice(0, 6); }), 'fiche : rien ne dépasse du bloc Logistique'));
    if (CAPTURES) { // fenêtre assez haute pour toute la fiche, puis retour à la taille d'essai
      await o.p.setViewportSize({ width: 1200, height: 6000 }); await o.p.waitForTimeout(400);
      await o.p.locator('.fc-logistique').screenshot({ path: path.join(DOSSIER, 'captures', 'logistique-fiche.png') });
      await o.p.setViewportSize({ width: 1200, height: 900 });
    }
    // 7. Enregistrer la fiche : tout est rangé.
    await o.p.click('.fc-fiche .fc-plein'); await o.p.waitForSelector('.fc-fiche', { state: 'detached' }); await pause();
    const L = db.logements.map(l => [l.nom, l.statut, l.prix, l.latitude, l.arrivee]);
    pb.push(egal([['Gîte des Crêtes', 'confirme', 180, 45.005, '2027-03-05T17:00'], ['Gîte du Lac', 'option', 95, 44.99, null]], L, 'logements enregistrés (coordonnées : choisies ou cherchées)'));
    pb.push(egal([['avion', true, 'confirme', 'Aéroport de Nice', '2027-03-08T18:00', 100]], db.trajets.map(t => [t.type, t.prix_aller_retour, t.statut, t.retour_lieu_depart, t.retour_depart, t.prix]), 'transport : une ligne aller-retour ; la voiture vide est ignorée'));
    pb.push(egal([['en_course', 'autres'], [['art-1', true, 'eq-fr'], [(db.materiel_catalogue.find(a => a.nom === 'Gants') || {}).id, false, null]]],
      [[db.materiel_catalogue[0].groupe, (db.materiel_catalogue.find(a => a.nom === 'Gants') || {}).groupe], db.course_materiel.map(m => [m.article, m.impose, m.equipement])], 'matos enregistré (groupe au catalogue, imposé et équipement par course)'));

    // 8. Page de la course : confirmés seulement, options en une ligne, total, carte.
    await o.p.click('#logistique > summary'); await o.p.waitForSelector('#logistique .lg-ligne');
    pb.push(egal('338 €', await attr(o.p), 'total : dossard + confirmés (58 + 180 + 100)'));
    pb.push(egal([['Logement', 'Transport', 'Matos 0 / 2 prisJour J', 'Notes'], true], [await texte(o.p, '#logistique .lg-rub-titre'), await o.p.evaluate(() => { const r = document.querySelector('#logistique .lg-rubrique'); return r.lastElementChild.classList.contains('lg-plan') && getComputedStyle(r.nextElementSibling).borderTopStyle === 'solid'; })], 'page : vrais titres de rubrique, filet entre elles, carte sous le logement'));
    await o.p.click('[data-lg-act="detail"]');
    pb.push(egal(['Dossard 58 €', 'Logement 180 €', 'Transport 100 €', 'En option : 95 €'], await texte(o.p, '.lg-detail span'), 'détail du total : une ligne par poste, options à part'));
    pb.push(egal(['Gîte des Crêtes180 €', 'Avion · aller-retour100 €'], await texte(o.p, '#logistique .lg-ligne .lg-haut'), 'lignes confirmées'));
    pb.push(egal(['1 logement en option (Gîte du Lac, 95 €)'], await texte(o.p, '#logistique .lg-options'), 'logement en option : une ligne'));
    const ligneN = (n, sel) => o.p.evaluate(([i, q]) => [...document.querySelectorAll('#logistique .lg-ligne')[i].querySelectorAll(q)].map(e => e.textContent.replace(/\s+/g, ' ').trim()), [n, sel]);
    pb.push(egal(['12 Rue des Crêtes, 42000 Mont-Clair', 'à 1 km du départ', 'Arrivée : ven. 5 mars · 17 h', 'Départ : dim. 7 mars · 10 h'],
      await ligneN(0, '.lg-adr > .mrt-lien, .lg-bas > span:not(.lg-adr)'), 'logement : adresse cliquable, distance, arrivée et départ'));
    pb.push(egal([['Aller : Aéroport de Lyon 8 h 12 Aéroport de Nice, sam. 6 mars', 'Retour : Aéroport de Nice 18 h Aéroport de Lyon, lun. 8 mars'], 2], [await ligneN(1, '.lg-bas'), await o.p.locator('#logistique .lg-bas .mrt-ico').count()], 'aller-retour : aller et retour, flèches dessinées'));
    await o.p.waitForSelector('#logistique .lg-plan .leaflet-interactive');
    pb.push(egal(3, await o.p.locator('#logistique .lg-plan .leaflet-interactive').count(), 'carte : départ et deux logements (confirmé, option)'));
    await o.p.click('.lg-adr > .mrt-lien');
    pb.push(egal(['Google Maps', 'Waze', 'OpenStreetMap'], await o.p.$$eval('.lg-adr .mrt-menu:not([hidden]) .mrt-menu-l', l => l.map(a => a.textContent)), 'adresse : menu d\'itinéraires'));
    await o.p.click('.lg-nom');
    pb.push(egal(true, await o.p.evaluate(() => document.querySelector('.lg-adr .mrt-menu').hidden), 'adresse : un toucher ailleurs referme le menu'));

    // 9. Matos à cocher, jour J, et le cochage gardé.
    pb.push(egal(['En course', 'Autres'], await texte(o.p, '#logistique .lg-cat'), 'matos : par groupe'));
    pb.push(egal(['FrontaleImposéPetzl Actik', 'Gants'], await texte(o.p, '#logistique .lg-art'), 'matos : imposé et équipement affichés'));
    await o.p.click('[data-lg-act="jour-j"]');
    pb.push(egal(true, await o.p.evaluate(() => document.querySelector('.lg-jourj .lg-art').getBoundingClientRect().height >= 44), 'jour J : lignes assez hautes pour le doigt'));
    await o.p.check('.lg-jourj [data-article="art-1"]'); await pause();
    pb.push(egal('1 / 2 pris', (await texte(o.p, '.lg-jourj .lg-compte'))[0], 'jour J : compteur'));
    await o.p.click('.lg-jourj [data-jj="fermer"]');
    pb.push(egal(['1 / 2 pris', true], [(await texte(o.p, '#logistique .lg-compte'))[0], db.course_materiel.find(m => m.article === 'art-1').pris], 'cocher est enregistré, le compteur du bloc suit'));
    pb.push(egal([], o.erreurs, 'Logistique : erreurs JavaScript'));
    if (CAPTURES) {
      await o.p.setViewportSize({ width: 1200, height: 4000 }); await o.p.waitForTimeout(600);
      await o.p.locator('#logistique').screenshot({ path: path.join(DOSSIER, 'captures', 'logistique-course.png') });
      await o.p.setViewportSize({ width: 1200, height: 900 });
    }
    await o.ctx.close();

    // 10. Non retenu : plus sur la page, regroupé dans la fiche ; supprimer avec confirmation ; nom obligatoire.
    o = await ouvrir(nav, 'course.html?id=' + GORGES, 1200, db, {}, PARIS);
    await simuler(o.ctx);
    await fiche(o.p);
    pb.push(egal([2, 0], [await o.p.locator(Z + '.lg-cartes[data-r="logement"] .lg-resume').count(), await o.p.locator(Z + '.lg-carte.is-ouverte').count()], 'fiche : cartes enregistrées repliées à l\'ouverture'));
    await o.p.click(Z + '.lg-cartes[data-r="logement"] .lg-carte:nth-child(2) .lg-resume');
    await o.p.selectOption(Z + '.lg-carte.is-ouverte [data-ed-sel="statut"]', 'non_retenu');
    await o.p.click(Z + '.lg-carte.is-ouverte [data-ed="replier"]');
    pb.push(egal(['Non retenus (1)'], await texte(o.p, Z + '.lg-replie'), 'fiche : non retenus regroupés'));
    await o.p.click(Z + '.lg-cartes[data-r="logement"] [data-ed="ajouter"]');
    await carte(o.p, 0).locator('[data-f="adresse"]').fill('rue sans nom');
    await o.p.click('.fc-fiche .fc-plein');
    pb.push(egal(['Indique le nom de chaque logement.', 1], [(await o.p.textContent('.fc-msg')).trim(), await o.p.locator('.fc-fiche').count()], 'logement sans nom : la fiche reste ouverte, le message dit pourquoi'));
    await carte(o.p, 0).locator('[data-ed="supprimer"]').click();
    await o.p.click(Z + '.lg-cartes[data-r="trajet"] .lg-resume');
    await o.p.click(Z + '.lg-cartes[data-r="trajet"] [data-ed="supprimer"]');
    pb.push(egal('Supprimer ce transport ?', await repondre(o.p, true), 'supprimer un transport enregistré : confirmation'));
    await o.p.click('.fc-fiche .fc-plein'); await o.p.waitForSelector('.fc-fiche', { state: 'detached' }); await pause();
    pb.push(egal([[['Gîte des Crêtes', 'confirme'], ['Gîte du Lac', 'non_retenu']], 0], [db.logements.map(l => [l.nom, l.statut]), db.trajets.length], 'non retenu enregistré ; transport supprimé ; nouvelle carte retirée non enregistrée'));
    await o.p.click('#logistique > summary'); await pause();
    pb.push(egal([0, '238 €'], [await o.p.locator('#logistique .lg-options').count(), await attr(o.p)], 'page : un non retenu n\'apparaît pas'));
    pb.push(egal([], o.erreurs, 'Logistique, fiche : erreurs JavaScript'));
    await o.ctx.close();

    // 11. En un coup d'œil : « Ta course approche », 5 jours avant la course (Trail du Lac, 15 nov.).
    const LAC = id(1);
    db.logements.push({ id: 'lg-lac', utilisateur: moi, course: LAC, nom: 'Chalet du Lac', statut: 'confirme', arrivee: '2026-11-14T18:00:00', prix: 60 });
    db.course_materiel.push({ utilisateur: moi, course: LAC, article: 'art-2', impose: false, pris: false, equipement: null });
    const j5 = { fuseau: 'Europe/Paris', maintenant: new Date('2026-11-10T10:00:00+01:00') };
    o = await ouvrir(nav, 'index.html', 1200, db, {}, j5);
    await o.p.waitForSelector('.lg-approche .lg-approche-b');
    pb.push(egal(['Ta course approche', ['Logement : Chalet du Lac · arrivée sam. 14 nov. · 18 h'], 'Matos : 0 / 1 pris'], [(await o.p.textContent('[data-bloc="prochaine"] .ac-titre span')).trim(), await texte(o.p, '.lg-approche-l'), (await o.p.textContent('.lg-approche-b span')).trim()],
      'En un coup d\'œil à J-5 : « Ta course approche », logement et matos'));
    await o.p.click('.lg-approche [data-lg-act="jour-j"]');
    pb.push(egal(1, await o.p.locator('.lg-jourj').count(), 'En un coup d\'œil : « Jour J » ouvre la liste'));
    await o.ctx.close();
    o = await ouvrir(nav, 'index.html', 1200, db, {}, PARIS);
    pb.push(egal(['Prochaine course', 0], [(await o.p.textContent('[data-bloc="prochaine"] .ac-titre span')).trim(), await o.p.locator('.lg-approche').count()], 'En un coup d\'œil, 26 jours avant : rien de la logistique'));
    await o.ctx.close();

    // Téléphone : la fiche, bloc Logistique ouvert, sans débordement.
    o = await ouvrir(nav, 'course.html?id=' + GORGES, 390, db, {}, PARIS);
    await simuler(o.ctx);
    await fiche(o.p); await o.p.click(Z + '.lg-cartes[data-r="trajet"] [data-ed="ajouter"]'); await o.p.click(Z + '.lg-cartes[data-r="logement"] .lg-resume >> nth=0');
    pb.push(egal([false, []], await o.p.evaluate(() => [document.documentElement.scrollWidth > innerWidth, [...document.querySelectorAll('.fc-logistique *:not(.lg-plan *)')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.className || e.tagName).slice(0, 5)]), 'téléphone : fiche sans débordement'));
    await o.ctx.close();

    // Mon matériel (Mon profil) : kilomètres seulement pour les chaussures ; ajout.
    o = await ouvrir(nav, 'profil.html', 1200, db, {}, PARIS);
    await o.p.waitForSelector('#materiel .st-connexion'); await pause();
    pb.push(egal(['Salomon Speedcross (les rouges)Chaussures · départ 120 km · limite 800 km', 'Petzl ActikFrontale'], (await texte(o.p, '#materiel .st-connexion span')).filter(Boolean).slice(0, 2), 'Mon matériel : kilomètres sur les chaussures seulement'));
    pb.push(egal([true, '+ Ajouter un équipement'], await o.p.evaluate(() => [[...document.querySelectorAll('#materiel [data-mm-act="modifier"]')].every(b => b.classList.contains('mrt-rond') && b.getAttribute('aria-label') === "Modifier l'équipement"), document.querySelector('#materiel [data-mm-act="ajouter"]').textContent]), 'Mon matériel : crayon pour modifier, ajout nommé'));
    await o.p.click('[data-mm-act="ajouter"]');
    await o.p.selectOption('#materiel [name="type"]', 'batons');
    pb.push(egal(true, await o.p.evaluate(() => [...document.querySelectorAll('#materiel .lg-km')].every(x => x.hidden)), 'Mon matériel : pas de kilomètres pour des bâtons'));
    await o.p.fill('#materiel [name="marque"]', 'Leki'); await o.p.fill('#materiel [name="modele"]', 'Micro Vario');
    await o.p.click('#materiel [type="submit"]'); await pause();
    pb.push(egal(['batons', 'Leki', 0], (({ type, marque, km_depart }) => [type, marque, km_depart])(db.equipements[2] || {}), 'Mon matériel : un équipement ajouté'));
    pb.push(egal([], o.erreurs, 'Mon matériel : erreurs JavaScript'));
    await o.ctx.close();

    // Partage en lecture seule : jamais de Logistique.
    const autre = '00000000-0000-0000-0000-00000000000b', COURSE_AUTRE = id(98);
    const d2 = JSON.parse(JSON.stringify(db));
    d2.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    d2.preferences.push({ utilisateur: autre, theme: 'bleu-orange', course_cap: null, modules: null, palmares_groupe: false });
    d2.courses.push(Object.assign({}, d2.courses.find(c => c.id === GORGES), { id: COURSE_AUTRE, utilisateur: autre, course: 'Course partagée' }));
    o = await ouvrir(nav, 'course.html?id=' + COURSE_AUTRE, 1200, d2, { 'mrt-vue': autre }, PARIS);
    pb.push(egal([1, 0], [await o.p.locator('.pc-titre').count(), await o.p.locator('#logistique').count()], 'site partagé : la course s\'affiche sans Logistique'));
    await o.ctx.close();
    return pb;
  },
};
