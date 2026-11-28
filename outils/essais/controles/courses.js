// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  // Module Courses (module-courses-a-surveiller-specification.md, § 8) : filtres, cartes, tableau, année, ouverture des inscriptions.
  async courses(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const base = db.courses.find(c => c.id === id(9));
    const ajout = (n, o) => db.courses.push(Object.assign({}, base, { id: id(n), lien: null, lieu: null, format: 'route_10km', distance: null, dplus: null }, o));
    ajout(10, { course: 'Marathon de la Baie', date: '2027-04-11', distance: 42.195, format: 'route_marathon', ouverture_inscriptions: '2026-11-03', ouverture_heure: '12:00:00', lien: 'https://example.org/baie', lieu: 'La Baie' });
    ajout(11, { course: 'Ultra des Lacs', date: null, ouverture_inscriptions: '2027-01-01', ouverture_approx: true });
    const pb = [];
    const PAGE = 'courses-a-surveiller.html';
    const neuve = async (largeur, page = PAGE, d = db, stockage = {}) => {
      const copie = JSON.parse(JSON.stringify(d)); copie.ecritures = [];
      const o = await ouvrir(nav, page, largeur, copie, stockage, PARIS);
      await o.p.waitForSelector('.cs-barre');
      o.copie = copie;
      return o;
    };
    const t = async (p, sel) => ((await p.textContent(sel)) || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
    const cartes = p => p.evaluate(() => [...document.querySelectorAll('.cs-liste .cs-carte')].map(c => {
      const tx = x => (x ? x.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : null), a = c.querySelector('.cs-site[href]');
      return { nom: tx(c.querySelector('.ob-nom')), statut: tx(c.querySelector('.ob-role')), date: tx(c.querySelector('.ob-date')), info: tx(c.querySelector('.ob-info')),
        lignes: [...c.querySelectorAll('.ob-ligne')].map(l => tx(l.children[0]) + ' | ' + tx(l.children[1])), lien: a ? a.getAttribute('href') : null, cible: a ? a.target : null,
        grise: !!c.querySelector('.cs-site.is-off'), compteur: !!c.querySelector('.ob-cpt'), pt: c.className.replace('ob-carte cs-carte', '').trim() };
    }));
    // Filtres : le panneau s'ouvre au premier choix ; « vue » reproduit les anciennes vues (aucun filtre, ou un choix de statuts, ou Ouvertes).
    const vue = async (p, v) => {
      if (await p.locator('[data-cs="raz"]').count()) await p.click('[data-cs="raz"]');
      if (v === 'tout') return;
      if (await p.locator('#cs-filtres[hidden]').count()) await p.click('[data-cs="filtres"]');
      if (v === 'ouvertes') await p.click('[data-ouvertes]');
      else for (const k of { surveiller: ['a_surveiller'], venir: ['confirmee', 'option'], courue: ['courue'] }[v]) await p.click('[data-cat="' + k + '"]');
    };
    const affiche = async (p, m) => { await p.click('[data-cs="menu"]'); await p.click('#cs-menu [data-mode="' + m + '"]'); };
    const barre = p => p.evaluate(() => ({ vues: [...document.querySelectorAll('[data-cat], [data-ouvertes]')].map(b => b.textContent.replace(/\s+/g, ' ').trim() + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      compte: document.querySelectorAll('.cs-carte, .cs-ligne').length + ' courses', groupes: [...document.querySelectorAll('[data-groupe]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')), tris: [...document.querySelectorAll('[data-tri]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      annees: [...document.querySelectorAll('[data-annee]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')),
      reperes: [...document.querySelectorAll('.cs-mois')].map(x => x.textContent) }));

    // Ouverture : toutes les courses, sans filtre, panneau replié ; le bouton Filtres ouvre les statuts avec leurs compteurs.
    let { p, ctx, erreurs } = await neuve(1200);
    let b = await barre(p), k = await cartes(p);
    pb.push(egal([17, 0, 0, 0, 'false', 'Filtres'], [k.length, await p.locator('.cs-compte').count(), await p.locator('.cs-badge').count(), await p.locator('[data-vue], .cs-vues').count(), await p.getAttribute('[data-cs="filtres"]', 'aria-expanded'), await p.getAttribute('[data-cs="filtres"]', 'aria-label')],
      'ouverture : les 17 courses, aucun filtre, ni compteur ni pastilles de vue, panneau replié'));
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Semi de San Sebastián'], [k[0].nom, k.find(x => x.statut === 'Courue').nom], 'ouverture : à venir d\'abord, puis les courues'));
    pb.push(egal(true, await p.locator('#cs-filtres').isHidden(), 'ouverture : panneau de filtres caché'));
    await p.click('[data-cs="filtres"]');
    b = await barre(p);
    pb.push(egal(['Repérée 3', 'Courue 7', 'Ouvertes 1'], b.vues.filter(x => /^(Repérée|Courue|Ouvertes) /.test(x)), 'panneau : statuts et Ouvertes avec leurs compteurs'));
    pb.push(egal(4, b.vues.filter(x => /^(Confirmée|Option|Repérée|Courue) \d/.test(x)).length, 'panneau : quatre statuts'));
    await p.click('[data-cs="fermer"]');
    pb.push(egal(true, await p.evaluate(() => { const h = document.querySelector('#cs-filtres'); return h.hidden || !!h.__deroule; }), 'la flèche replie le panneau en déroulé'));
    await p.waitForFunction(() => document.querySelector('#cs-filtres').hidden);
    pb.push(egal([[32, 32], [15]], await p.evaluate(() => { const r = document.querySelector('[data-cs="filtres"]').getBoundingClientRect(), i = document.querySelector('[data-cs="filtres"] svg').getBoundingClientRect(); return [[Math.round(r.width), Math.round(r.height)], [Math.round(i.width)]]; }), 'rond Filtres : 32 px, picto 15 px (comme le Palmarès)'));
    // Affichage : une liste à choix unique (Cartes ou Tableau), le bouton Filtres à sa droite.
    pb.push(egal([true, 'Cartes', true], await p.evaluate(() => { const m = document.querySelector('[data-cs="menu"]').getBoundingClientRect(), f = document.querySelector('[data-cs="filtres"]').getBoundingClientRect();
      return [f.left >= m.right, document.querySelector('[data-cs="menu"]').textContent.trim(), Math.abs((m.top + m.height / 2) - (f.top + f.height / 2)) < 2]; }), 'affichage : liste « Cartes » à gauche, bouton Filtres à sa droite, alignés'));
    pb.push(egal([true, 'false'], [await p.locator('#cs-menu').isHidden(), await p.getAttribute('[data-cs="menu"]', 'aria-expanded')], 'liste d\'affichage fermée à l\'ouverture'));
    await p.click('[data-cs="menu"]');
    pb.push(egal([['Cartes *', 'Tableau'], 'true'], [await p.evaluate(() => [...document.querySelectorAll('#cs-menu [data-mode]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : ''))), await p.getAttribute('[data-cs="menu"]', 'aria-expanded')], 'liste d\'affichage : Cartes (choisi) et Tableau'));
    pb.push(egal([true, 'Vue'], await p.evaluate(() => [document.querySelector('#cs-menu').getBoundingClientRect().width >= 190, document.querySelector('#cs-menu .cs-lib').textContent]), 'liste d\'affichage : 12 rem au moins, en-tête « Vue », comme le Calendrier'));
    await p.keyboard.press('Escape');
    pb.push(egal(true, await p.locator('#cs-menu').isHidden(), 'Échap ferme la liste'));
    await p.click('[data-cs="menu"]'); await p.click('h1, body', { position: { x: 5, y: 600 } });
    pb.push(egal(true, await p.locator('#cs-menu').isHidden(), 'un toucher ailleurs ferme la liste'));
    pb.push(egal(0, await p.locator('.cs-barre > .cs-lib, .cs-barre > .cs-reglage').count(), 'pas de libellé « Vue » dans la barre (seulement en tête de la liste)'));
    await vue(p, 'surveiller');
    b = await barre(p); k = await cartes(p);
    pb.push(egal([0, ['avril 2027', 'septembre 2028', 'Date à définir'], 'Filtres · 1 actif', '3 sur 17 courses'], [await p.locator('[data-groupe], [data-tri]').count(), b.reperes, await p.getAttribute('[data-cs="filtres"]', 'aria-label'), await t(p, '.cs-compte')], 'Repérée : titres de mois, un filtre actif, compte « 3 sur 17 courses »'));
    pb.push(egal(['Marathon de la Baie', 'Trail des Sommets', 'Ultra des Lacs'], k.map(x => x.nom), 'Repérée : ordre chronologique, sans date à la fin'));
    pb.push(egal({ nom: 'Marathon de la Baie', statut: 'Repérée', date: '11 avr. 2027', info: 'La Baie · Marathon', lignes: ['Distance | 42,195 km', 'Inscription | Ouvre le 3 nov. 2026 à 12 h'], lien: 'https://example.org/baie', cible: '_blank', grise: false, compteur: false, pt: 'is-opt' },
      k[0], 'carte : statut à la place du rôle, ni compteur ni objectif, dossard avec l\'heure, lien « Site officiel »'));
    pb.push(egal(['Ouverture : janvier 2027', 'Ouverture à venir'], [k[2].lignes[0].split(' | ')[1] || k[2].lignes[0], k[1].lignes[1].split(' | ')[1]].map(x => x.replace(/^Inscription \| /, '')), 'dossard : mois seul, puis ouverture inconnue'));
    pb.push(egal([null, true, 'À définir'], [k[2].lien, k[2].grise, k[2].date], 'sans site officiel : lien grisé, sans adresse ; sans date : « À définir »'));
    pb.push(egal([3, 0, 0, 3], await p.evaluate(() => [document.querySelectorAll('.cs-carte .cs-site').length, document.querySelectorAll('.cs-detail').length, document.querySelectorAll('.cs-carte .ob-cpt, .cs-carte .ob-cible').length,
      [...document.querySelectorAll('.cs-carte')].filter(c => getComputedStyle(c).backgroundColor !== 'rgba(0, 0, 0, 0)').length]), 'lien « Site officiel » sur chaque carte ; plus de bouton Détails ; aucun compteur ; un fond sur chaque carte'));

    // Inscriptions ouvertes : à venir, pas inscrit, ouverture atteinte.
    await vue(p, 'ouvertes');
    k = await cartes(p);
    pb.push(egal([['Ultra du Plateau · Le 55'], 'Inscription | Inscription ouverte'], [k.map(x => x.nom), k[0].lignes.slice(-1)[0]], 'Inscriptions ouvertes : seulement les courses dont l\'ouverture est atteinte'));
    await vue(p, 'venir');
    pb.push(egal(['Trail du Lac · Le Tour du Lac', 'Corrida de Noël', 'Trail des Gorges', 'Trail des Cimes', 'Ultra du Plateau · Le 55', 'Trail de la Forêt', 'Trail des Crêtes'], (await cartes(p)).map(x => x.nom), 'À venir : la feuille de route'));

    // Courues : du plus récent au plus ancien, sans dossard, avec l'année.
    await vue(p, 'courue');
    k = await cartes(p); b = await barre(p);
    pb.push(egal(['Semi de San Sebastián', '10 km de Montauban'], k.slice(0, 2).map(x => x.nom), 'Courues : les plus récentes d\'abord'));
    pb.push(egal([7, 'Courue', 0, 'is-courue'], [k.length, k[0].statut, k.filter(x => x.lignes.some(l => l.startsWith('Inscription'))).length, k[0].pt.split(' ')[0]], 'Courues : statut, sans dossard, pastille atténuée'));
    pb.push(egal([['Toutes *', '2028', '2027', '2026', '2025'], '7 courses'], [b.annees, b.compte], 'Courue : année dans le panneau, 7 cartes'));
    await p.click('[data-annee="2025"]');
    pb.push(egal(4, (await cartes(p)).length, 'année 2025 : 4 courses'));

    // Tout : ce qui reste à faire, puis les courues.
    await vue(p, 'tout');
    await p.click('[data-annee=""]');
    k = await cartes(p);
    pb.push(egal([17, 'Trail du Lac · Le Tour du Lac', 'Semi de San Sebastián'], [k.length, k[0].nom, k.find(x => x.statut === 'Courue').nom], 'Tout : 17 courses, à venir d\'abord puis les courues'));
    pb.push(egal([], erreurs, 'erreurs JavaScript'));

    // Tableau : les colonnes de la veille, une ligne par course, sans regroupement ; choix gardé sur l'appareil.
    await vue(p, 'surveiller');
    const lignes = () => p.evaluate(() => ({ en: [...document.querySelectorAll('.cs-tableau thead th')].map(x => x.textContent),
      l: [...document.querySelectorAll('.cs-ligne')].map(r => [...r.children].map(x => x.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim())),
      lien: [...document.querySelectorAll('.cs-ligne .cs-lien-nom')].map(x => x.getAttribute('href')) }));
    pb.push(egal([0, 'Cartes *'], [await p.locator('.cs-tableau').count(), (await p.evaluate(() => [...document.querySelectorAll('[data-mode]')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')))).shift()], 'affichage par défaut : les cartes'));
    await affiche(p, 'tableau');
    let tb = await lignes();
    pb.push(egal(['Événement', 'Course', 'Distance · D+', 'Date', 'Ouverture des inscriptions'], tb.en, 'tableau : les colonnes par défaut'));
    pb.push(egal([0, 0], [await p.locator('.cs-ligne-mois').count(), await p.locator('[data-groupe]').count()], 'tableau : pas de regroupement par mois, pas de choix de regroupement'));
    pb.push(egal([['Marathon de la Baie La Baie', '—', '42,195 km', '11 avr. 2027', 'Ouvre le 3 nov. 2026 à 12 h'], ['Trail des Sommets Haut-Val', '—', '80 km · 5 000 m D+', '10 sept. 2028', 'Ouverture à venir'],
      ['Ultra des Lacs', '—', '—', 'À définir', 'Ouverture : janvier 2027']], tb.l, 'tableau : une ligne par course'));
    // Colonnes triables : toucher une colonne trie (croissant, décroissant, puis retour à l'ordre d'origine) ; plus de choix « Tri ».
    const ordre = () => p.evaluate(() => ({ noms: [...document.querySelectorAll('.cs-ligne td:first-child strong')].map(x => x.textContent), mois: document.querySelectorAll('.cs-ligne-mois').length,
      sens: [...document.querySelectorAll('.cs-tableau thead th')].map(t => t.getAttribute('aria-sort')[0]).join('') }));
    pb.push(egal(0, await p.locator('[data-tri]').count(), 'tableau : pas de choix Tri'));
    pb.push(egal(['nnnan', 0], [(await ordre()).sens, (await ordre()).mois], 'tableau : par défaut Date croissante, sans titres de mois'));
    await p.click('[data-col="distance"]');
    let o2 = await ordre();
    pb.push(egal([['Marathon de la Baie', 'Trail des Sommets', 'Ultra des Lacs'], 'nnann'], [o2.noms, o2.sens], 'colonne Distance : croissante, sans distance en dernier'));
    await p.click('[data-col="distance"]');
    o2 = await ordre();
    pb.push(egal(['Trail des Sommets', 'Marathon de la Baie', 'Ultra des Lacs'], o2.noms, 'colonne Distance : décroissante'));
    await p.click('[data-col="ouverture"]');
    pb.push(egal(['Marathon de la Baie', 'Ultra des Lacs', 'Trail des Sommets'], (await ordre()).noms, 'colonne Ouverture : les plus proches d\'abord, date inconnue en dernier'));
    await p.click('[data-col="evenement"]');
    pb.push(egal(['Marathon de la Baie', 'Trail des Sommets', 'Ultra des Lacs'], (await ordre()).noms, 'colonne Événement : alphabétique'));
    await p.click('[data-col="evenement"]'); await p.click('[data-col="evenement"]');
    o2 = await ordre();
    pb.push(egal(['nnnan', 0], [o2.sens, o2.mois], 'troisième toucher : retour à l\'ordre d\'origine'));
    // Colonnes au choix : rond « Colonnes » (tableau seulement), toutes les rubriques d'une page de course, choix gardé sur l'appareil.
    pb.push(egal([1, 1], [await p.locator('[data-cs="colonnes"]').count(), await p.locator('#cs-colonnes[hidden]').count()], 'tableau : rond « Colonnes », panneau replié'));
    await p.click('[data-cs="colonnes"]');
    pb.push(egal([true, true, true, true], [await p.locator('[data-colonne="statut"]').count() === 1, await p.locator('[data-colonne="lieu"]').count() === 1, await p.locator('[data-colonne="strategie"]').count() === 1, await p.locator('[data-colonne="fc_moyenne"]').count() === 1], 'colonnes proposées : statut, lieu, stratégie, FC moyenne…'));
    pb.push(egal(0, await p.locator('[data-colonne="evenement"]').count(), 'Événement : toujours là, sans case'));
    await p.click('[data-colonne="lieu"]'); await p.click('[data-colonne="statut"]');
    tb = await lignes();
    pb.push(egal(['Événement', 'Course', 'Statut', 'Distance · D+', 'Date', 'Lieu', 'Ouverture des inscriptions'], tb.en, 'colonnes ajoutées : à leur place dans l\'ordre de la page de course'));
    pb.push(egal(['Repérée', 'Haut-Val'], [tb.l[1][2], tb.l[1][5]], 'colonnes Statut et Lieu : valeurs'));
    await p.click('[data-col="lieu"]');
    pb.push(egal('Haut-Val', (await lignes()).l[0][5], 'colonne ajoutée : triable (Haut-Val avant La Baie)'));
    await p.reload(); await p.waitForSelector('.cs-barre'); await vue(p, 'surveiller');
    pb.push(egal(['Statut', 'Lieu'], (await lignes()).en.filter(x => ['Statut', 'Lieu'].includes(x)), 'colonnes choisies : gardées après rechargement'));
    await p.click('[data-cs="colonnes"]'); await p.waitForSelector('#cs-colonnes:not([hidden])');
    await p.click('[data-colonne="lieu"]'); await p.click('[data-colonne="statut"]');
    pb.push(egal(['Événement', 'Course', 'Distance · D+', 'Date', 'Ouverture des inscriptions'], (await lignes()).en, 'colonnes retirées : retour aux colonnes par défaut'));
    await vue(p, 'venir');
    pb.push(egal('15 nov. 2026 9 h', (await lignes()).l[0][3], 'tableau : l\'heure de départ sous la date'));
    await vue(p, 'courue');
    pb.push(egal([7, '—'], [(await lignes()).l.length, (await lignes()).l[0][4]], 'tableau, Courues : une ligne par course, pas de dossard'));
    await vue(p, 'surveiller');
    await p.locator('.cs-ligne').nth(2).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(['Ultra des Lacs', 0], [await t(p, '.pc-titre'), await p.locator('.fc-fiche').count()], 'tableau : toucher une ligne ouvre la page de la course'));
    await p.click('[data-ob="fermer"]'); await pause();
    await p.reload(); await p.waitForSelector('.cs-barre');
    pb.push(egal(17, await p.locator('.cs-ligne').count(), 'tableau : l\'affichage choisi est gardé après rechargement (les filtres, eux, repartent à zéro)'));
    await affiche(p, 'cartes');
    pb.push(egal([0, 17], [await p.locator('.cs-tableau').count(), await p.locator('.cs-carte').count()], 'retour aux cartes'));

    // Toucher une carte : la fiche de modification (course à venir, sans date, courue) ; le lien « Site officiel » ne l'ouvre pas.
    await vue(p, 'surveiller');
    await p.click('.cs-site[href]');
    pb.push(egal(0, await p.locator('.fc-fiche').count(), 'le lien « Site officiel » n\'ouvre pas la fiche'));
    const ouverts = () => p.evaluate(() => ({ ferme: document.querySelectorAll('.mc-panneau details.pc-cellule:not([open]):not(.is-vide), .mc-panneau details.is-montre:not([open]):not(.is-vide)').length,
      vides: [...document.querySelectorAll('.mc-panneau details.is-vide')].filter(d => !d.open && /Non renseigné/.test(d.textContent)).length, total: document.querySelectorAll('.mc-panneau details.pc-cellule, .mc-panneau details.is-montre').length }));
    await p.locator('.cs-carte').nth(0).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(['Marathon de la Baie', 0], [await t(p, '.pc-titre'), await p.locator('.fc-fiche').count()], 'toucher la carte : la page de la course, pas la fiche'));
    let ov = await ouverts();
    pb.push(egal([0, true, true], [ov.ferme, ov.total > 0, ov.vides > 0], 'page ouverte depuis Courses : blocs renseignés ouverts, blocs vides affichés fermés (« Non renseigné »)'));
    // Rond « Ajouter à l'agenda » à droite de la date : un fichier .ics.
    const [tel] = await Promise.all([p.waitForEvent('download'), p.click('[data-ob="agenda"]')]);
    const ics = require('fs').readFileSync(await tel.path(), 'utf8');
    pb.push(egal([true, true, true], [/SUMMARY:Marathon de la Baie/.test(ics), /DTSTART;VALUE=DATE:20270411/.test(ics), /DTEND;VALUE=DATE:20270412/.test(ics)], 'agenda : un événement d\'une journée à la date de la course'));
    await p.click('[data-ob="fermer"]'); await pause();
    await p.locator('.cs-carte').nth(2).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal('Ultra des Lacs', await t(p, '.pc-titre'), 'course sans date : sa page'));
    await p.click('[data-ob="fermer"]'); await pause();
    await vue(p, 'courue');
    await p.locator('.cs-carte').nth(0).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    ov = await ouverts();
    pb.push(egal(['Semi de San Sebastián', 0], [await t(p, '.pc-titre'), ov.ferme], 'course courue : sa page, Résultat, Montre et blocs renseignés ouverts'));
    await p.click('[data-ob="fermer"]'); await pause();
    // Le crayon de la page ouvre la fiche de modification.
    await vue(p, 'surveiller');
    await p.locator('.cs-carte').nth(0).click(); await p.waitForSelector('.mc-panneau .pc-titre');
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal(['Marathon de la Baie', 'Modifier la course'], [await p.locator('#fc-course').inputValue(), await t(p, '#fc-titre')], 'crayon : la fiche de modification'));
    await p.click('[data-fc="annuler"]'); await pause();
    await p.click('[data-ob="fermer"]'); await pause();
    pb.push(egal([], erreurs, 'erreurs JavaScript (fiche)'));
    await ctx.close();

    // Ajouter : le statut Repérée est préchoisi quand ce statut est seul filtré ; sinon Confirmée.
    let o = await neuve(1200);
    await vue(o.p, 'surveiller');
    await o.p.click('[data-cs="ajouter"]'); await o.p.waitForSelector('.fc-fiche');
    pb.push(egal('a_surveiller', await o.p.locator('#fc-statut').inputValue(), '+ Course (Repérée seule) : statut préchoisi'));
    await o.p.click('[data-fc="annuler"]'); await pause();
    await vue(o.p, 'venir');
    await o.p.click('[data-cs="ajouter"]'); await o.p.waitForSelector('.fc-fiche');
    pb.push(egal('confirmee', await o.p.locator('#fc-statut').inputValue(), '+ Course (autres filtres) : statut Confirmée'));
    await o.ctx.close();

    // Fiche : heure d'ouverture et mois seul.
    o = await neuve(1200); await vue(o.p, 'surveiller');
    await o.p.locator('.cs-carte').nth(0).click(); await o.p.waitForSelector('.mc-panneau .pc-titre'); await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await o.p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(x => x.click()));
    pb.push(egal(['2026-11-03', '12:00', false, false], [await o.p.locator('#fc-ouverture_inscriptions').inputValue(), await o.p.locator('#fc-ouverture_heure').inputValue(),
      await o.p.locator('#fc-ouverture_approx').isChecked(), await o.p.locator('#fc-ouverture_heure').isDisabled()], 'fiche : date et heure d\'ouverture relues'));
    await ouvrirBloc(o.p, 'dossard');
    await o.p.check('#fc-ouverture_approx');
    pb.push(egal(['month', '2026-11', '', true], [await o.p.locator('#fc-ouverture_inscriptions').getAttribute('type'), await o.p.locator('#fc-ouverture_inscriptions').inputValue(),
      await o.p.locator('#fc-ouverture_heure').inputValue(), await o.p.locator('#fc-ouverture_heure').isDisabled()], 'mois seul : la date devient un mois, l\'heure se vide'));
    await o.p.fill('#fc-ouverture_inscriptions', '2027-02');
    await o.p.click('.fc-plein'); await o.p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w = o.copie.ecritures[0].corps;
    pb.push(egal(['PATCH', '2027-02-01', true, null], [o.copie.ecritures[0].methode, w.ouverture_inscriptions, w.ouverture_approx, w.ouverture_heure], 'enregistrement : mois seul rangé au 1er, sans heure'));
    await o.ctx.close();
    o = await neuve(1200); await vue(o.p, 'surveiller');
    await o.p.locator('.cs-carte').nth(0).click(); await o.p.waitForSelector('.mc-panneau .pc-titre'); await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await o.p.evaluate(() => document.querySelectorAll('.fc-bloc-titre[aria-expanded="false"]').forEach(x => x.click()));
    await o.p.fill('#fc-ouverture_inscriptions', ''); 
    await o.p.fill('#fc-ouverture_heure', '9h');
    await o.p.click('.fc-plein'); await o.p.waitForSelector('.fc-fiche', { state: 'detached' });
    const w2 = o.copie.ecritures[0].corps;
    pb.push(egal([null, false, null], [w2.ouverture_inscriptions, w2.ouverture_approx, w2.ouverture_heure], 'sans date d\'ouverture : ni mois seul ni heure rangés'));
    await o.ctx.close();

    // Dossard le jour même : l'heure décide (20 octobre 2026, 10 h).
    const jour = JSON.parse(JSON.stringify(db));
    jour.courses.find(c => c.id === id(10)).ouverture_inscriptions = '2026-10-20'; jour.courses.find(c => c.id === id(10)).ouverture_heure = '14:00:00';
    jour.courses.find(c => c.id === id(11)).date = '2027-05-01'; jour.courses.find(c => c.id === id(11)).ouverture_inscriptions = '2026-10-20'; jour.courses.find(c => c.id === id(11)).ouverture_approx = false; jour.courses.find(c => c.id === id(11)).ouverture_heure = '08:00:00';
    o = await neuve(1200, PAGE, jour);
    k = await cartes(o.p);
    pb.push(egal(['Inscription | Ouvre le 20 oct. 2026 à 14 h', 'Inscription | Inscription ouverte'], [k.find(x => x.nom === 'Marathon de la Baie').lignes.slice(-1)[0], k.find(x => x.nom === 'Ultra des Lacs').lignes.slice(-1)[0]], 'ouverture le jour même : avant l\'heure « Ouvre le… », après « Inscription ouverte »'));
    await vue(o.p, 'ouvertes');
    pb.push(egal(['Ultra des Lacs', 'Ultra du Plateau · Le 55'], (await cartes(o.p)).map(x => x.nom), 'Inscriptions ouvertes : l\'heure d\'ouverture atteinte le jour même compte, pas avant ; par date de course'));
    await o.ctx.close();

    // Ordinateur : les cartes d'un même mois côte à côte, étroites ; toutes de la même hauteur (même téléphone).
    const memeMois = JSON.parse(JSON.stringify(db)); memeMois.courses.find(c => c.id === id(9)).date = '2027-04-20';
    o = await neuve(1200, PAGE, memeMois); await vue(o.p, 'surveiller');
    pb.push(egal([true, true], await o.p.evaluate(() => { const [a, b] = [...document.querySelectorAll('.cs-carte')].map(c => c.getBoundingClientRect());
      return [Math.abs(a.top - b.top) < 2 && b.left >= a.right, a.width < 420]; }), 'ordinateur : deux cartes du même mois côte à côte, moins de 420 px de large'));
    await vue(o.p, 'tout');
    pb.push(egal([1, 1], await o.p.evaluate(() => [new Set([...document.querySelectorAll('.cs-carte')].map(c => Math.round(c.getBoundingClientRect().height))).size, document.querySelectorAll('.cs-mois').length > 3 ? 1 : 0]), 'Tout : toutes les cartes de la même hauteur, regroupées par mois'));
    await o.ctx.close();

    // Téléphone : rien ne dépasse, les vues défilent, statut et date sur une ligne.
    o = await neuve(390, PAGE, db, {});
    pb.push(egal({ deborde: false, surLaPage: true }, await o.p.evaluate(() => ({ deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      surLaPage: !!document.querySelector('[data-cs="filtres"]') })), 'téléphone : rien ne dépasse, bouton Filtres présent'));
    pb.push(egal([true, true], await o.p.evaluate(() => { const c = document.querySelector('.cs-carte'), r = x => c.querySelector(x).getBoundingClientRect();
      return [Math.abs(r('.ob-role').top - r('.ob-date').top) < 2, r('.ob-nom').top >= r('.ob-role').bottom - 1]; }), 'téléphone : statut et date sur la même ligne, le nom dessous'));
    pb.push(egal(1, await o.p.evaluate(() => new Set([...document.querySelectorAll('.cs-carte')].map(c => c.getBoundingClientRect().left)).size), 'téléphone : une seule colonne'));
    pb.push(egal(1, await o.p.evaluate(() => new Set([...document.querySelectorAll('.cs-carte')].map(c => Math.round(c.getBoundingClientRect().height))).size), 'téléphone : toutes les cartes de la même hauteur'));
    await affiche(o.p, 'tableau');
    pb.push(egal(false, await o.p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), 'téléphone, tableau : rien ne dépasse de la page (le tableau défile dans son cadre)'));
    pb.push(egal([], o.erreurs, 'téléphone : erreurs JavaScript'));
    await o.ctx.close();

    // Adresse : ?vue=courue ouvre la vue demandée ; site partagé : lecture seule, pas de bouton d'ajout.
    o = await neuve(1200, PAGE + '?vue=courue');
    pb.push(egal([7, 'Filtres · 1 actif'], [(await cartes(o.p)).length, await o.p.getAttribute('[data-cs="filtres"]', 'aria-label')], '?vue=courue : préfiltre sur Courue (7 courses)'));
    await o.ctx.close();
    const autre = '00000000-0000-0000-0000-00000000000b';
    const partage = JSON.parse(JSON.stringify(db));
    partage.courses = partage.courses.map(c => Object.assign({}, c, { utilisateur: autre }));
    partage.rpc = { partages_avec_moi: [{ id: autre, prenom: 'Autre', nom: 'Essai' }] };
    partage.preferences.push({ utilisateur: autre, theme: 'vert-rose', course_cap: null, modules: null, palmares_groupe: false });
    o = await neuve(1200, PAGE, partage, { 'mrt-vue': autre });
    pb.push(egal([0, 18], [await o.p.locator('[data-cs="ajouter"]').count(), (await cartes(o.p)).length], 'site partagé : lecture seule, sans ajout'));
    await vue(o.p, 'surveiller');
    await o.p.locator('.cs-carte').nth(0).click(); await o.p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(['Marathon de la Baie', 0], [await t(o.p, '.pc-titre'), await o.p.locator('.fc-fiche').count()], 'site partagé : toucher une carte ouvre la page de la course, pas la fiche'));
    await o.ctx.close();
    return pb;
  },
};
