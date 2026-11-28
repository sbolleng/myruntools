// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  // Repasse de navigation et de design (30 oct. 2026) : croix de « Course introuvable », course courue ouverte de partout,
  // menu sans modules « bientôt », retour = Annuler pour la fiche seule, pastilles et « Aujourd'hui » du Calendrier,
  // engrenage dessiné ; plus d'Accent 2 ; champs, fenêtres, boutons, croix et libellés communs (design.md, § 1).
  async repasse(nav, db0) {
    const pb = [];
    const { db, id } = jeuObjectif(db0);
    const copie = () => JSON.parse(JSON.stringify(db));
    const SEMI = '00000000-0000-0000-0001-000000000007';
    const style = (p, sel, prop = 'color') => p.evaluate(([s, pr]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[pr] : null; }, [sel, prop]);
    const role = (p, nom) => p.evaluate(n => { const d = document.createElement('i'); d.style.color = 'var(' + n + ')'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, nom);
    const ouverte = p => p.evaluate(() => !!document.querySelector('.mc-voile'));
    const page = p => p.url().split('/').pop();

    // N1 : course introuvable, la croix ferme la feuille (plein écran sur téléphone).
    let { p, ctx } = await ouvrir(nav, 'course.html?id=' + id(99), 390, copie(), {}, PARIS);
    await p.click('.pc-fermer'); await pause();
    // (En file://, le navigateur refuse de changer l'adresse : on regarde la page laissée dessous.)
    const route = q => q.evaluate(() => !!document.querySelector('.ob-carte'));
    pb.push(egal([false, true], [await ouverte(p), await route(p)], 'course introuvable : la croix ferme la feuille, la feuille de route dessous'));
    await ctx.close();

    // N2 : une course courue s'ouvre avec son résultat, d'où qu'elle vienne.
    const resultat = q => q.evaluate(() => ({ sur: (document.querySelector('.pc-section .pc-intertitre span') || {}).textContent || null,
      temps: [...document.querySelectorAll('.pc-res-ligne .ob-lib')].some(l => l.textContent === 'Temps'), voisines: document.querySelectorAll('.pc-nav a').length }));
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + SEMI, 1200, copie(), {}, PARIS));
    pb.push(egal({ sur: 'Résultat', temps: true, voisines: 1 }, await resultat(p), 'adresse d\'une course courue : son résultat ; la plus récente, une seule voisine (par date)'));
    await p.click('.pc-fermer'); await pause();
    pb.push(egal([false, true], [await ouverte(p), await route(p)], 'course courue ouverte par son adresse : fermer laisse la feuille de route'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#annee', 1200, copie(), {}, PARIS));
    await p.locator('[data-course="' + SEMI + '"]').scrollIntoViewIfNeeded();
    await p.click('[data-course="' + SEMI + '"]'); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal([SEMI, 'Résultat'], [await p.evaluate(() => history.state && history.state.mrtCourse), (await resultat(p)).sur], 'Calendrier, vue Année : une course courue ouvre son résultat'));
    await ctx.close();
    const accueil = copie(); accueil.preferences[0].accueil_blocs = ['derniere'];
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, accueil, {}, PARIS));
    await p.click('[data-bloc="derniere"] .ob-ligne a'); await p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal(['Semi de San Sebastián', 'Résultat'], [(await p.textContent('.pc-titre')).trim(), (await resultat(p)).sur], 'En un coup d\'œil, Dernière course : son nom ouvre son résultat'));
    await ctx.close();

    // N3 : sur téléphone, le menu défile et l'onglet de la page ouverte est ramené dans l'écran (23 nov. 2026).
    for (const w of [375, 390]) for (const pg of ['index.html', 'palmares.html']) {
      ({ p, ctx } = await ouvrir(nav, pg, w, copie(), {}, PARIS));
      pb.push(egal({ onglets: ['En un coup d\'œil', 'Les courses', 'Ma saison', 'Calendrier', 'Mon palmarès', 'Mon profil'], visibles: true }, await p.evaluate(async () => {
        await new Promise(r => setTimeout(r, 300));
        const bar = document.querySelector('.mrt-nav-inner'), t = [...document.querySelectorAll('.mrt-tab')], on = t.filter(x => x.classList.contains('is-on'));
        return { onglets: t.map(x => x.getAttribute('aria-label') || x.textContent),
          visibles: on.length === 1 && on.every(x => x.offsetLeft - bar.scrollLeft >= 0 && x.offsetLeft - bar.scrollLeft + x.offsetWidth <= bar.clientWidth) };
      }), 'menu à ' + w + ' px, ' + pg + ' : les modules construits, l\'onglet ouvert est dans l\'écran'));
      await ctx.close();
    }

    // N4 : fiche à elle seule (« Ajouter une course », crayon du Palmarès) : le retour du navigateur fait « Annuler ».
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, copie(), {}, PARIS));
    const questions = [];
    let reponse = 'dismiss';
    await surDialogue(p, q => { questions.push(q); return reponse === 'accept'; });
    const fiche = q => q.evaluate(() => !!document.querySelector('.fc-fiche'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.goBack(); await pause();
    pb.push(egal([false, 'objectif.html', []], [await fiche(p), page(p), questions.slice()], 'Ajouter une course, retour sans saisie : la fiche se ferme, la page reste'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.fill('#fc-course', 'Essai');
    await p.goBack(); await pause();
    pb.push(egal([true, ['Abandonner les modifications ?']], [await fiche(p), questions.slice()], 'retour après une saisie : « Abandonner les modifications ? » ; refusé, la fiche reste'));
    reponse = 'accept';
    await p.goBack(); await pause();
    pb.push(egal([false, 'objectif.html'], [await fiche(p), page(p)], 'abandon accepté : la fiche se ferme, la page reste'));
    await p.click('[data-ob="ajouter"]'); await p.waitForSelector('.fc-fiche');
    await p.click('.fc-barre [data-fc="annuler"]'); await pause();
    pb.push(egal([false, null], [await fiche(p), await p.evaluate(() => history.state)], '« Annuler » : la fiche se ferme et retire son entrée d\'historique'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, copie(), {}, PARIS));
    await p.evaluate(() => document.querySelector('.pv2-edit').click()); await p.waitForSelector('.fc-fiche');
    await p.goBack(); await pause();
    pb.push(egal([false, 'palmares.html'], [await fiche(p), page(p)], 'crayon du Palmarès, retour : la fiche se ferme, le Palmarès reste'));
    await ctx.close();

    // N5 : Calendrier, menu « Vue » (la vue Semaine par défaut), bouton « Plan », « Aujourd'hui » (Calendrier 0.17).
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html', 1200, copie(), {}, PARIS));
    const vues = () => p.evaluate(() => { const b = document.querySelector('[data-menu]'), m = document.querySelector('.cal-menu');
      return [b.textContent.trim(), m.hidden, b.getAttribute('aria-expanded'), [...m.querySelectorAll('a')].map(a => a.textContent + (a.classList.contains('is-on') ? ' *' : ''))]; });
    pb.push(egal(['Semaine', true, 'false', ['Semaine *', 'Mois', '3 mois', '6 mois', 'Année']], await vues(), 'Calendrier : menu « Vue » fermé, sur Semaine (vue par défaut)'));
    await p.click('[data-menu]');
    pb.push(egal(['Semaine', false, 'true', ['Semaine *', 'Mois', '3 mois', '6 mois', 'Année']], await vues(), 'un toucher sur son bouton : le menu s\'ouvre'));
    await p.keyboard.press('Escape');
    pb.push(egal([true, true], [(await vues())[1], await p.evaluate(() => document.activeElement === document.querySelector('[data-menu]'))], 'Échap : le menu se ferme, le bouton garde la main'));
    await p.keyboard.press('Enter');
    pb.push(egal([false, true], [(await vues())[1], await p.evaluate(() => document.activeElement === document.querySelector('.cal-menu a.is-on'))], 'ouvert au clavier : la main sur le choix en cours'));
    await p.locator('.cal-s-titre').nth(2).click();
    pb.push(egal(true, (await vues())[1], 'toucher ailleurs : le menu se ferme'));
    await p.click('[data-menu]'); await p.click('.cal-menu [data-periode="12"]'); await pause();
    pb.push(egal([['Année', true, 'false', ['Semaine', 'Mois', '3 mois', '6 mois', 'Année *']], 1, '#annee'], [await vues(), await p.locator('.cal-y').count(), await p.evaluate(() => location.hash)],
      'choisir « Année » : la vue Année, le menu refermé'));
    await p.click('[data-plan]'); await pause();
    pb.push(egal(['true', '1', true], [await p.getAttribute('[data-plan]', 'aria-pressed'), await p.evaluate(() => localStorage.getItem('mrt-calendrier-phases')), await p.locator('.cal-y-j[class*="ph-"]').count() > 0],
      'bouton « Plan » : enfoncé, les fonds de phase, retenu sur l\'appareil'));
    await p.click('[data-plan]'); await pause();
    await p.click('[data-menu]'); await p.click('.cal-menu [data-vue="mois"]'); await pause();
    await p.click('[aria-label="Mois suivant"]'); await pause(); await p.click('[aria-label="Mois suivant"]'); await pause();
    const loin = await p.textContent('.cal-titre');
    await p.click('.cal-auj'); await pause();
    pb.push(egal(['Décembre 2026', 'Octobre 2026', 'Mois', 'false'], [loin, await p.textContent('.cal-titre'), (await vues())[0], await p.getAttribute('[data-plan]', 'aria-pressed')],
      '« Aujourd\'hui » ramène au mois en cours'));
    await ctx.close();

    // N6 : engrenage dessiné, en Accent sur les Préférences seulement.
    for (const [pg, attendu] of [['objectif.html', '--muted'], ['preferences.html', '--accent']]) {
      ({ p, ctx } = await ouvrir(nav, pg, 1200, copie(), {}, PARIS));
      pb.push(egal([true, '', await role(p, attendu)], [await p.evaluate(() => !!document.querySelector('.mrt-gear svg')), (await p.textContent('.mrt-gear')).trim(), await style(p, '.mrt-gear')],
        pg + ' : engrenage dessiné, ' + (attendu === '--accent' ? 'en Accent' : 'discret')));
      await ctx.close();
    }

    // D1 : plus d'Accent 2 ; les repères en Accent (option B) ; le bouton principal s'éclaircit au survol.
    ({ p, ctx } = await ouvrir(nav, 'objectif.html', 1200, copie(), {}, PARIS));
    pb.push(egal(['', '', ''], await p.evaluate(() => ['bleu-orange', 'vert-rose', 'violet-turquoise'].map(t => { window.appliquerTheme(t); return getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim(); })), 'plus d\'Accent 2 dans les trois thèmes'));
    await p.evaluate(() => window.appliquerTheme('bleu-orange'));
    const accent = await role(p, '--accent');
    pb.push(egal({ role: accent, pastille: accent, inscrit: accent, bientot: accent }, await p.evaluate(() => {
      const st = (s, pr) => getComputedStyle(document.querySelector(s))[pr];
      return { role: st('.ob-role.is-obj', 'color'), pastille: st('.ob-et.is-obj .ob-pt', 'backgroundColor'), inscrit: st('.ob-ins.is-inscrit i', 'backgroundColor'), bientot: st('.ob-ins.is-bientot i', 'borderTopColor') };
    }), 'Objectif (rôle, pastille) et points du dossard en Accent'));
    await p.hover('.ob-ajout');
    const survol = await style(p, '.ob-ajout', 'backgroundColor');
    pb.push(egal([false, false], [survol === 'rgb(255, 212, 0)', survol === await role(p, '--accent')], 'bouton principal au survol : Accent éclairci (' + survol + ')'));
    await ctx.close();

    // D2 à D6 : champs communs (fond Champ, entre Fond et Surface ; coins de 6 px ; Accent au focus) ; fenêtres comme la fiche ; un seul bouton
    // principal ; libellés à 0,7 rem en Space Mono ; astérisque en Accent ; une seule croix ; « Toutes les semaines » au chevron.
    const champs = q => q.evaluate(() => {
      const t = document.createElement('i'); t.style.backgroundColor = 'var(--champ)'; document.body.append(t);
      const fond = getComputedStyle(t).backgroundColor, page = getComputedStyle(document.body).backgroundColor; t.remove();
      return [...document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea')]
        .filter(e => e.getClientRects().length).map(e => { const st = getComputedStyle(e);
          return (e.classList.contains('mrt-champ') ? '' : 'sans mrt-champ : ') + (st.backgroundColor === fond && fond !== page && fond !== 'rgba(0, 0, 0, 0)' ? 'fond Champ' : st.backgroundColor) + ' ' + st.borderTopLeftRadius; })
        .filter((x, i, l) => l.indexOf(x) === i);
    });
    const COMMUN = ['fond Champ 6px'];
    const fenetre = q => q.evaluate(() => { const v = document.querySelector('.cal-panneau'), t = v.querySelector('.cal-panneau-titre'), d = document.createElement('div');
      d.className = 'mc-voile'; d.style.display = 'none'; document.body.append(d); const voile = getComputedStyle(d).backgroundColor; d.remove();
      return { barre: [...v.querySelectorAll('.cal-barre .mrt-btn')].map(x => x.textContent.trim() + (x.classList.contains('is-principal') ? ' *' : '')),
        titre: getComputedStyle(t).textTransform + ' ' + getComputedStyle(t).fontFamily.split(',')[0].replace(/"/g, ''), voile: getComputedStyle(document.querySelector('.cal-voile')).backgroundColor === voile,
        libelles: [...new Set([...v.querySelectorAll('.cal-champ span')].map(s => getComputedStyle(s).fontSize))] }; });
    ({ p, ctx } = await ouvrir(nav, 'course.html?id=' + id(1), 1200, copie(), {}, PARIS));
    pb.push(egal({ textes: ['12.8px'], sources: '12px', picto: 15, lien: true, croix: '18px' }, await p.evaluate(() => ({
      textes: [...new Set([...document.querySelectorAll('#preparation .cal-plan-dates, #preparation .pr-avis-n, #preparation .pr-avis-r')].map(e => getComputedStyle(e).fontSize))],
      sources: getComputedStyle(document.querySelector('#preparation .pr-sources')).fontSize, picto: Math.round(parseFloat(getComputedStyle(document.querySelector('#preparation .pr-avis-n .mrt-ico')).width)),
      lien: document.querySelector('#preparation .cal-regler').classList.contains('mrt-lien'),
      croix: getComputedStyle(document.querySelector('.pc-fermer .mrt-ico')).width })), 'rubrique Préparation : textes en 0,8 rem, sources en 0,75 rem, picto commun, lien d\'action ; croix de la feuille'));
    await p.click('[data-ob="modifier"]'); await p.waitForSelector('.fc-fiche');
    pb.push(egal(COMMUN, await champs(p), 'fiche d\'une course : champs communs'));
    pb.push(egal({ principaux: 1, parametrer: false, oblig: await role(p, '--accent') }, await p.evaluate(() => ({ principaux: document.querySelectorAll('.fc-fiche .mrt-btn.is-principal').length,
      parametrer: !!document.querySelector('[data-fc="preparer"]'), oblig: getComputedStyle(document.querySelector('.fc-oblig')).color })), 'fiche : un seul bouton principal, aucun bouton de réglage du plan, astérisque en Accent'));
    await p.focus('#fc-lieu');
    pb.push(egal(await role(p, '--accent'), await style(p, '#fc-lieu', 'borderTopColor'), 'champ en cours de saisie : bordure en Accent'));
    await p.selectOption('#fc-statut', 'option');
    const nouveau = () => p.evaluate(() => document.querySelector('#fc-groupe_nouveau').getClientRects().length > 0);
    const avantChoix = await nouveau();
    await p.selectOption('#fc-groupe_options', '__nouveau__');
    pb.push(egal([false, true], [avantChoix, await nouveau()], 'Option : le champ « Nouveau groupe » n\'apparaît qu\'une fois choisi'));
    await p.selectOption('#fc-statut', 'confirmee');
    await ctx.close();
    {
      const q = await ouvrir(nav, 'preparation.html', 1200, copie(), {}, PARIS);
      await q.p.waitForSelector('[data-reglages]'); await reglage(q.p, '[data-preparer]'); await q.p.waitForSelector('.cal-preparer');
      pb.push(egal(COMMUN, await champs(q.p), 'fenêtre « Régler les phases » : champs communs'));
      pb.push(egal({ barre: ['Annuler', 'Enregistrer *'], titre: 'uppercase Space Mono', voile: true, libelles: ['11.2px'] }, await fenetre(q.p), 'fenêtre « Régler les phases » : comme la fiche'));
      await q.ctx.close();
    }
    const seances = copie();
    seances.seances = [{ id: 'se-1', utilisateur: seances.profils[0].id, date: '2026-10-21', type: 'run', libelle: 'Footing 45 min', faite: false, course: null }];
    ({ p, ctx } = await ouvrir(nav, 'calendrier.html#semaines', 1200, seances, {}, PARIS));
    await p.click('[data-edit="se-1"]'); await p.waitForSelector('.cal-seance');
    pb.push(egal(COMMUN, await champs(p), 'fenêtre d\'une séance : champs communs'));
    pb.push(egal({ barre: ['Annuler', 'Enregistrer *'], titre: 'uppercase Space Mono', voile: true, libelles: ['11.2px'] }, await fenetre(p), 'fenêtre d\'une séance : comme la fiche'));
    pb.push(egal(['Supprimer la séance', true, true], await p.evaluate(() => { const b = document.querySelector('.cal-bas .mrt-btn.is-danger'); return b ? [b.textContent.trim(), !!b.querySelector('svg'), b.getBoundingClientRect().top > document.querySelector('.cal-champ:last-of-type').getBoundingClientRect().bottom] : null; }),
      'séance : « Supprimer la séance » à contour Alerte, seul en bas'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'palmares.html', 1200, copie(), {}, PARIS));
    await p.click('.pv2-btn');
    pb.push(egal(COMMUN, await champs(p), 'filtres du Palmarès : champs communs'));
    pb.push(egal(['Réduire les filtres', true], await p.evaluate(() => { const b = document.querySelector('.pv2-panel:not(.pv2-cols) .pv2-close'); return [b.getAttribute('aria-label'), b.classList.contains('mrt-rond')]; }), 'panneau des filtres : rond commun « Réduire »'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'preferences.html', 1200, copie(), {}, PARIS));
    pb.push(egal(COMMUN, await champs(p), 'Préférences : champs communs'));
    await ctx.close();
    ({ p, ctx } = await ouvrir(nav, 'index.html', 1200, copie(), {}, PARIS));
    pb.push(egal(['Space Mono', 'Space Mono'], await p.evaluate(() => ['.mrt-stat-label', '.mrt-days-label'].map(s => getComputedStyle(document.querySelector(s)).fontFamily.split(',')[0].replace(/"/g, ''))), 'en-tête : libellés en Space Mono'));
    await ctx.close();
    const anonyme = await nav.newContext({ viewport: { width: 1200, height: 900 } });
    await anonyme.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: LIB, contentType: 'application/javascript' }));
    await anonyme.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    p = await anonyme.newPage();
    await p.goto(RACINE + 'connexion.html'); await p.waitForSelector('#email');
    pb.push(egal(COMMUN, await champs(p), 'connexion : le champ commun'));
    await anonyme.close();
    return pb;
  },

  // Repasse d'uniformité (design, § 1 et 3) : tailles de l'échelle, libellés en graisse normale, « 1er », confirmations du site,
  // zones de toucher, contrastes de l'Alerte et du Texte discret, espaces insécables.
  async uniformite(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const ECHELLE = ['10.4px', '11.2px', '12px', '12.8px', '13.6px', '16px'];
    // Hors échelle permis : l'en-tête, le titre d'une page (1,4 à 2 rem) et les grands chiffres d'un résultat.
    const tailles = p => p.evaluate(() => {
      const vu = new Set();
      document.querySelectorAll('main *, .mc-panneau *, .mrt-barre *, .mrt-nav *').forEach(e => {
        if (!e.getClientRects().length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        if (e.closest('.mrt-header, .pc-titre, .pc-grand, .st-grand, .nu-kcal-val, .gd-titre, .connexion h1, .ml h1, .leaflet-container')) return;
        vu.add(getComputedStyle(e).fontSize);
      });
      return [...vu].sort();
    });
    for (const [page, quoi] of [['index.html', 'Accueil'], ['objectif.html', 'Objectif'], ['course.html?id=' + id(3), 'page d\'une course'], ['palmares.html', 'Palmarès'],
      ['calendrier.html', 'Calendrier'], ['calendrier.html#mois', 'Calendrier, Mois'], ['calendrier.html#annee', 'Calendrier, Année'], ['courses-a-surveiller.html?vue=tout', 'Courses'], ['preferences.html', 'Préférences'], ['nutrition.html', 'Ma nutrition'], ['guide.html', 'Guide'], ['stats.html', 'Mes stats']]) {
      for (const w of [1200, 390]) {
        const o = await ouvrir(nav, page, w, db, {}, PARIS);
        if (page.startsWith('course.html')) await o.p.waitForSelector('.mc-panneau .pc-titre');
        const hors = (await tailles(o.p)).filter(t => !ECHELLE.includes(t));
        pb.push(egal([], hors, quoi + ' (' + w + ' px) : tailles de texte hors de l\'échelle'));
        pb.push(egal([], o.erreurs, quoi + ' (' + w + ' px) : erreurs JavaScript'));
        await o.ctx.close();
      }
    }
    // Libellés et en-têtes de colonnes : Space Mono, graisse normale.
    let o = await ouvrir(nav, 'palmares.html', 1200, db, {}, PARIS);
    pb.push(egal(['400'], await o.p.evaluate(() => [...new Set([...document.querySelectorAll('th, .ob-lib')].map(e => getComputedStyle(e).fontWeight))]), 'en-têtes de colonnes en graisse normale'));
    // Lien d'action et crayon : zone de toucher de 2 rem au moins (marge invisible).
    await o.ctx.close();
    o = await ouvrir(nav, 'preferences.html', 390, db, {}, PARIS, { mobile: true });
    await o.p.click('#bloc-menu .pref-reorg');
    pb.push(egal(true, await o.p.evaluate(() => { const l = document.querySelector('.pref-defaut'); l.scrollIntoView({ block: 'center' }); const r = l.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top - 5) === l && document.elementFromPoint(r.left + r.width / 2, r.bottom + 5) === l; }), 'lien d\'action : zone de toucher débordant de son texte'));
    await o.ctx.close();
    // « 1er » dans Mon plan (Trail de la Forêt, 1er juillet) ; « + » d'une séance : le petit rond commun, dessiné ; aucune fenêtre du navigateur.
    o = await ouvrir(nav, 'preparation.html', 1200, db, {}, PARIS);
    await o.p.waitForSelector('.ps-frise-defile');
    const natif = []; o.p.on('dialog', d => { natif.push(d.message()); d.dismiss(); });
    pb.push(egal([true, true], await o.p.evaluate(() => { const t = [...document.querySelectorAll('.ps-sem-d')].map(e => e.textContent);
      return [t.length > 0 && t.every(x => /^\d\d\/\d\d$/.test(x)), [...document.querySelectorAll('.cal-plus')].every(b => b.classList.contains('mrt-rond') && b.classList.contains('is-petit') && !!b.querySelector('svg'))]; }),
      'Mon plan, frise : la date de chaque semaine en JJ/MM ; « + » en petit rond commun dessiné'));
    await o.ctx.close();
    o = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS);
    await o.p.waitForSelector('.mc-panneau .pc-titre');
    o.p.on('dialog', d => { natif.push(d.message()); d.dismiss(); });
    pb.push(egal([true, true], await o.p.evaluate(() => [!!document.querySelector('.pc-fermer svg.mrt-ico'), document.querySelector('.pc-fermer').textContent.trim() === '']), 'croix dessinée, sans caractère tapé'));
    await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await o.p.fill('#fc-lieu', 'Ailleurs');
    await o.p.click('.fc-barre [data-fc="annuler"]');
    pb.push(egal(['Abandonner les modifications ?', []], [await repondre(o.p, false), natif], 'Annuler après une saisie : confirmation du site, aucune fenêtre du navigateur'));
    await o.ctx.close();
    // Espace insécable devant « ? » et « : » (posée à l'affichage), jamais dans un champ.
    o = await ouvrir(nav, 'course.html?id=' + id(1), 390, db, {}, PARIS);
    await o.p.waitForSelector('.mc-panneau .pc-titre');
    pb.push(egal([true, true], await o.p.evaluate(() => [document.querySelector('.pr-avis-r').textContent.includes('conseillé\u00a0: '), !/\u00a0/.test(document.querySelector('.pr-avis-r').textContent.replace(/conseillé\u00a0: /g, ''))]),
      'préparation : « conseillé : » insécable devant les deux-points, rien d\'autre de changé'));
    await o.ctx.close();
    // Contrastes (WCAG, petit texte 4,5) : Alerte et Texte discret sur le fond des cadres, Texte discret sur une case du Calendrier, dans chaque thème.
    o = await ouvrir(nav, 'calendrier.html', 1200, db, {}, PARIS);
    const contrastes = await o.p.evaluate(() => {
      const lum = c => { const k = /^color\(/.test(c) ? 1 : 255; const m = c.replace(/^color\(srgb/, '').match(/[\d.]+/g).map(Number).slice(0, 3).map(x => { x /= k; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const i = document.createElement('i'); document.body.appendChild(i);
      const c = v => { i.style.color = v; return getComputedStyle(i).color; };
      const out = {};
      for (const t of ['bleu-orange', 'vert-rose', 'violet-turquoise', 'blanc-orange', 'noir-orange']) {
        window.appliquerTheme(t);
        const v = n => c('var(--' + n + ')');
        out[t] = [cr(v('red'), v('surface')) >= 4.5, cr(v('muted'), v('surface')) >= 4.5, cr(v('muted'), v('case')) >= 4.5, cr(v('bord-champ'), v('surface')) >= 2.3];
      }
      return out;
    });
    const tous = [true, true, true, true];
    pb.push(egal({ 'bleu-orange': tous, 'vert-rose': tous, 'violet-turquoise': tous, 'blanc-orange': tous, 'noir-orange': tous }, contrastes,
      'contrastes : Alerte, Texte discret (cadre et case du Calendrier), contour des champs, dans les cinq thèmes'));
    await o.ctx.close();
    return pb;
  },
  // Outils et services (docs/outils-et-services.md, § 5) : chaque adresse externe appelée par le code est listée dans le document,
  // et aucune clé secrète n'est versionnée. Contrôle sans navigateur ; les liens d'articles cités comme sources (Guide, avis des courses) sont exclus.
  async outilsServices() {
    const pb = [], { execSync } = require('child_process');
    const racine = path.resolve(DOSSIER, '../..');
    const doc = fs.readFileSync(path.join(racine, 'docs/outils-et-services.md'), 'utf8');
    // Domaine « racine » d'une adresse : ses deux derniers éléments (tuile.opentopomap.org → opentopomap.org).
    const domaine = h => h.replace(/^\*\./, '').split('.').slice(-2).join('.');
    const documentes = new Set([...doc.matchAll(/`([^`\s]+)`/g)].map(m => m[1].replace(/^https?:\/\//, '').split(/[\/ ]/)[0]).filter(h => /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(h)).map(domaine));
    const fichiers = execSync('git ls-files', { cwd: racine, encoding: 'utf8' }).split('\n').filter(Boolean);
    const code = f => (/^(composants\/[^/]+\.js|donnees\/supabase\.js|supabase\/functions\/.+\.ts|[^/]+\.html)$/.test(f)) && f !== 'guide.html' && f !== 'composants/preparation.js';
    const absents = new Set();
    for (const f of fichiers.filter(code)) {
      for (const m of fs.readFileSync(path.join(racine, f), 'utf8').matchAll(/https?:\/\/(\{s\}\.)?([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/gi)) {
        const d = domaine(m[2].toLowerCase());
        if (d === 'example.org' || d === 'w3.org' || d === 'myruntools.fr') continue;
        if (!documentes.has(d)) absents.add(d + ' (' + f + ')');
      }
    }
    pb.push(egal([], [...absents].sort(), 'adresses externes du code : toutes listées dans outils-et-services.md'));
    pb.push(egal(true, ['supabase.co', 'cloudflare.com', 'openfoodfacts.org', 'opentopomap.org', 'github.com', 'ovh.com', 'resend.com', 'platform.claude.com'].every(d => documentes.has(domaine(d))),
      'le document nomme GitHub, OVH, Supabase, Resend, Cloudflare, Anthropic, Open Food Facts et OpenTopoMap'));
    // Aucune clé secrète dans les fichiers versionnés.
    const SECRETS = [/sk-ant-[A-Za-z0-9_-]{20,}/, /sb_secret_[A-Za-z0-9_-]{10,}/, /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\./];
    const fuites = [];
    for (const f of fichiers) {
      if (/\.(png|jpe?g|gif|ico|woff2?|pdf)$/i.test(f) || f.startsWith('outils/essais/package-lock')) continue;
      let t; try { t = fs.readFileSync(path.join(racine, f), 'utf8'); } catch (e) { continue; }
      if (SECRETS.some(r => r.test(t))) fuites.push(f);
    }
    pb.push(egal([], fuites, 'aucune clé secrète (Anthropic, Supabase) dans les fichiers versionnés'));
    return pb;
  },
  // Repasse de vocabulaire (design, § 12 « Glossaire ») : une notion = un mot. Les anciens mots n'apparaissent plus dans aucun texte
  // affiché (libellés, boutons, infobulles, champs) ; le nom de l'onglet ouvert est celui du titre de la page.
  async vocabulaire(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const INTERDITS = [/(Objectif (&|&amp;) plan|Plan (&|&amp;) objectifs)/, /Feuille de route/, /Périodicité/, /Déjà couru/, /Musculation/, /Effacer/, /Rétablir/, /Recalculer/, /Créer/,
      /[Cc]andidat/, /\bprépa\b/i, /[Pp]lan de saison/, /Saison :/, /\b(mon|ton|son|ta|sa) site\b/i, /\bsite (de|partagé)\b/, /Sauvegarder/, /Éditer/, /Sorties par/, /Renforcements par/,
      /^Dossard$/i, /^Cap$/, /Mes mesures/, /Mon profil de coureur/, /^Modifier$/, /Fermer la fiche/, /Plans des courses/, /dans Préparation/,
      // Courses (glossaire) : le statut s'appelle « Repérée », les vues « À surveiller » et « À venir » n'existent plus.
      /À surveiller/, /Courses à surveiller/, /^À venir( \d+)?$/,
      // Menu de parcours (23 nov. 2026) : Les courses, Ma saison, Ma nutrition, Mon palmarès.
      /Mes courses/, /\b(dans|de|vers|à|sur) (la )?Saison\b/,
      // Repasse de cohérence (21 nov. 2026) : la période vers un Objectif s'appelle « préparation » (Saison reste le nom de la page) ;
      // Allègement, Décrassage, Ressenti, Pourquoi cette course, Régler les phases, Séance (Nutrition), Espaces partagés, Préférences.
      /\bsaisons? de \d/, /Courses de la saison/, /\bhors saison\b/, /inter-saison/, /Préparer une saison/, /Deload/, /Paramétrer le plan/, /Rôle dans la préparation/,
      /Course de préparation/, /Course en option/, /Retour sur la séance/, /Préférences utilisateur/, /\bSites? partagés?\b/, /\bJ-\d{2,}/, /plus longue sortie/i,
      /Ajouter une activité/, /Supprimer cette activité/, /^Activité$/, // « activité » : seulement pour l'import (Mes stats) et « Activité hors sport » /^Renfo$/, /^Réc\.$/, /^à noter$/, /course principale/, /^Ajouter$/,
      // Flèches : dessinées (mrtIcone), jamais tapées.
      /[→←↑▲↻]/];
    const textes = p => p.evaluate(() => {
      const out = new Set();
      document.querySelectorAll('h1,h2,h3,h4,summary,button,a,label,legend,option,th,[aria-label],[title],[placeholder]').forEach(e => {
        if (e.closest('.leaflet-container')) return;
        [e.childElementCount ? '' : e.textContent, e.getAttribute('aria-label'), e.getAttribute('title'), e.getAttribute('placeholder')].forEach(t => { t = (t || '').replace(/\s+/g, ' ').trim(); if (t) out.add(t); });
        if (e.childElementCount && /^(H[1-4]|SUMMARY|BUTTON|A|LABEL|LEGEND|TH)$/.test(e.tagName)) out.add(e.textContent.replace(/\s+/g, ' ').trim());
      });
      // Et tout texte visible de la page (paragraphes, cartes, encarts), hors carte du tracé.
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const el = n.parentElement, t = n.textContent.replace(/\s+/g, ' ').trim();
        if (t && el && !el.closest('script, style, .leaflet-container') && el.getClientRects().length) out.add('§' + t); } // § : texte courant (pas un libellé ni un bouton)
      return [...out];
    });
    const interdits = async (p, quoi) => {
      // Dossard, Cap, Modifier : interdits seulement comme libellé de bloc ou bouton, permis dans le texte courant (« Dossard » devant son numéro).
      const SEULS_LIBELLES = [/^Dossard$/i, /^Cap$/, /^Modifier$/].map(String);
      const trouves = (await textes(p)).filter(t => INTERDITS.some(r => (t[0] === '§' ? !SEULS_LIBELLES.includes(String(r)) && r.test(t.slice(1)) : r.test(t))));
      pb.push(egal([], trouves, quoi + ' : aucun ancien mot dans les textes affichés'));
    };
    const PAGES = [['index.html', 'En un coup d\'œil'], ['objectif.html', 'Ma saison'], ['calendrier.html', 'Calendrier'], ['calendrier.html#mois', 'Calendrier, Mois'],
      ['courses-a-surveiller.html?vue=tout', 'Les courses'], ['palmares.html', 'Mon palmarès'], ['preferences.html', 'Préférences'], ['preparation.html', 'Mon plan'], ['profil.html', 'Mon profil'],
      ['nutrition.html', 'Ma nutrition'], ['guide.html', 'Guide'], ['stats.html', 'Mes stats'], ['course.html?id=' + id(3), 'page d\'une course']];
    for (const [page, quoi] of PAGES) {
      for (const w of [1200, 390]) {
        const o = await ouvrir(nav, page, w, db, {}, PARIS);
        if (page.startsWith('course.html')) await o.p.waitForSelector('.mc-panneau .pc-titre');
        await interdits(o.p, quoi + ' (' + w + ' px)');
        if (w === 1200) {
          // L'onglet de la page ouverte porte le nom du titre de la page.
          const [onglet, titre] = await o.p.evaluate(() => [(document.querySelector('.mrt-tab.is-on') || {}).textContent, document.title.split(' · ')[0]]);
          // Page hors du menu (Mon plan et Nutrition ne sont pas cochés dans les données fictives) : son onglet, actif, au bout de la barre.
          if (/^(preparation|nutrition)\.html/.test(page)) pb.push(egal([quoi, true], await o.p.evaluate(() => { const t = [...document.querySelectorAll('.mrt-tab')]; const on = document.querySelector('.mrt-tab.is-on');
            return [on && on.textContent.trim(), t[t.length - 1] === on]; }), quoi + ' : hors du menu, son onglet actif s\'ajoute au bout'));
          if (onglet && !page.startsWith('course.html') && !page.startsWith('index')) pb.push(egal(titre, onglet.trim(), quoi + ' : onglet et titre de page identiques'));
          // Un seul titre de page (h1) : celui de l'onglet, invisible sauf pour les lecteurs d'écran (design, § 3).
          const h1 = await o.p.evaluate(() => [...document.querySelectorAll('h1')].map(h => h.textContent.trim()));
          pb.push(egal(1, h1.length, quoi + ' : un seul titre de page (h1)'));
          if (onglet && !page.startsWith('course.html') && !page.startsWith('index')) pb.push(egal(titre, h1[0], quoi + ' : titre de page et onglet identiques'));
        }
        await o.ctx.close();
      }
    }
    // Libellés des boutons communs, identiques partout : relevés sur chaque page et dans les feuilles (séance, phases, fiche).
    const boutons = p => p.evaluate(() => [...document.querySelectorAll('.mrt-btn, .mrt-rond, .mrt-lien')].filter(b => b.getClientRects().length)
      .map(b => ({ cls: b.className, t: b.textContent.replace(/\s+/g, ' ').trim(), a: b.getAttribute('aria-label') || '' })));
    const releves = [];
    for (const [page, action] of [['calendrier.html', p => p.click('[data-edit="se-v"]')], ['calendrier.html', p => p.click('[data-ajout]')],
      ['preparation.html', p => reglage(p, '[data-preparer]')], ['objectif.html', p => p.click('[data-ob="ajouter"]')], ['palmares.html', null], ['preferences.html', null], ['index.html', null]]) {
      const d = JSON.parse(JSON.stringify(db)); d.seances = [{ id: 'se-v', utilisateur: d.profils[0].id, date: '2026-10-20', type: 'run', libelle: 'Endurance', faite: false, course: null }];
      const q = await ouvrir(nav, page, 1200, d, {}, PARIS);
      if (action) { await action(q.p); await q.p.waitForTimeout(300); await interdits(q.p, page + ', feuille ouverte'); }
      releves.push(...(await boutons(q.p)).map(b => Object.assign(b, { page })));
      await q.ctx.close();
    }
    const FIXES = { Annuler: /^annul/i, Enregistrer: /^(enregistr|sauvegard|valider$)/i, Fermer: /^fermer$/i, Exporter: /^export/i };
    const ecarts = releves.filter(b => Object.entries(FIXES).some(([mot, r]) => (r.test(b.t) && b.t !== mot) || (r.test(b.a) && b.a !== mot && b.a !== mot + ' :')));
    pb.push(egal([], ecarts.map(b => b.page + ' « ' + (b.t || b.a) + ' »'), 'boutons communs : « Annuler », « Enregistrer », « Fermer », « Exporter » écrits pareil partout'));
    pb.push(egal([], releves.filter(b => /is-danger/.test(b.cls) && !/^Supprimer\b/.test(b.t)).map(b => b.page + ' « ' + b.t + ' »'), 'bouton danger : toujours « Supprimer … »'));
    pb.push(egal([], releves.filter(b => /is-fermer/.test(b.cls) && b.a !== 'Fermer').map(b => b.page + ' « ' + b.a + ' »'), 'croix : toujours « Fermer »'));
    pb.push(egal([], releves.filter(b => /is-principal/.test(b.cls) && /\s[…:]$|\.$/.test(b.t)).map(b => b.page + ' « ' + b.t + ' »'), 'bouton principal : sans « … », « : » ni point final'));
    // La fiche d'une course (modification) et sa confirmation d'abandon.
    const o = await ouvrir(nav, 'course.html?id=' + id(3), 1200, db, {}, PARIS);
    await o.p.waitForSelector('.mc-panneau .pc-titre');
    await o.p.click('[data-ob="modifier"]'); await o.p.waitForSelector('.fc-fiche');
    await interdits(o.p, 'fiche d\'une course');
    await o.p.fill('#fc-lieu', 'Ailleurs');
    await o.p.click('.fc-barre [data-fc="annuler"]');
    await o.p.waitForSelector('.mrt-dialogue');
    pb.push(egal(['Continuer', 'Abandonner'], await o.p.locator('.mrt-dialogue-boutons button').allTextContents(), 'abandon d\'une saisie : « Continuer » / « Abandonner », jamais deux « Annuler »'));
    await o.ctx.close();
    return pb;
  },
  // Panneau des boutons (design, § 11) : sept boutons, un sens chacun. Sur chaque page et ses feuilles : aucun bouton hors des classes
  // communes (ou des éléments qui ne sont pas des boutons : cartes, cases, tuiles, titres repliables) ; un seul principal visible ;
  // « Supprimer … » en danger, seul en bas de sa fenêtre ; une pastille ne mène nulle part ; le petit rond n'ajoute qu'une séance.
  async boutons(nav, db0) {
    const { db, id } = jeuObjectif(db0);
    const pb = [];
    const COMMUNS = /\bmrt-(btn|rond|lien|pastille|choix|tri|gear|barre-cap|tab|menu-l)\b/;
    const AUTRES = /\b(mg-titre|mg-pt|fc-bloc-titre|cal-carte-txt|cal-se-txt|cal-m2-txt|cal-m2-course|cal-v-course|cal-v-rdv|cal-voisin|ob-carte|ps-sem|ps-choix|ps-ligne-q|is-precedente|is-suivante|ob-ins|pc-lieu|nu-ligne|nu-aliment|cal-info|cal-a-j|cal-y-j)\b/;
    const releve = p => p.evaluate(([c, a]) => {
      const COM = new RegExp(c), AUT = new RegExp(a);
      const vis = e => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.opacity !== '0'; };
      const dessus = e => { const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight) return true; const t = document.elementFromPoint(x, y); return !t || e.contains(t) || t.contains(e); };
      const nom = e => (e.textContent.replace(/\s+/g, ' ').trim() || e.getAttribute('aria-label') || '').slice(0, 40);
      const tous = [...document.querySelectorAll('button, a[class], [role=button]')].filter(e => vis(e) && !e.closest('.mrt-nav, .leaflet-container, [role=menu], .mrt-dialogue, header'));
      const horsClasse = tous.filter(e => !COM.test(e.className) && !AUT.test(e.className) && !(e.tagName === 'A' && !e.className.trim())).map(e => e.tagName.toLowerCase() + '.' + e.className.trim().split(/\s+/).join('.') + ' « ' + nom(e) + ' »');
      const principaux = tous.filter(e => /\bis-principal\b/.test(e.className) && dessus(e)).map(nom);
      const dangers = tous.filter(e => /\bis-danger\b/.test(e.className) && /\bmrt-btn\b/.test(e.className)).map(e => {
        const zone = e.closest('.mc-panneau, .cal-fenetre, .mrt-fenetre, form') || document.body, bas = e.getBoundingClientRect().top;
        const apres = [...zone.querySelectorAll('button, a')].filter(x => x !== e && vis(x) && x.getBoundingClientRect().top > bas + 2 && !x.closest('.fc-bloc')).length;
        return [nom(e), /^Supprimer\b/.test(nom(e)), apres === 0];
      });
      const pastillesLiens = tous.filter(e => e.tagName === 'A' && /\bmrt-pastille\b/.test(e.className)).map(nom);
      const petits = tous.filter(e => /\bis-petit\b/.test(e.className) && !e.hasAttribute('data-ajout')).map(e => nom(e));
      return { horsClasse: [...new Set(horsClasse)], principaux, dangers, pastillesLiens, petits };
    }, [COMMUNS.source, AUTRES.source]);
    const avec = d => { d = JSON.parse(JSON.stringify(d)); const moi = d.profils[0].id;
      d.seances = [{ id: 'se-b', utilisateur: moi, date: '2026-10-20', type: 'run', libelle: 'Endurance', faite: false, course: null }];
      d.preferences[0].modules = ['En un coup d\'œil', 'Objectif', 'Préparation', 'Calendrier', 'Nutrition', 'Courses à surveiller', 'Palmarès', 'Profil']; return d; };
    // Mes stats avec des séances faites : tableaux, tuiles et graphiques ; une analyse enregistrée.
    const statsPleine = d => { const moi = d.profils[0].id; d.profils[0].fc_repos = 52; d.profil_entrainement = [{ utilisateur: moi, vma: 15, fc_max: 186 }];
      d.seances.push({ id: 'se-f1', utilisateur: moi, date: '2026-09-12', type: 'run', libelle: 'Sortie longue', faite: true, distance_reelle_km: 20, duree_reelle_min: 130, denivele_reel_m: 600, fc_moyenne: 145 },
        { id: 'se-f2', utilisateur: moi, date: '2026-10-15', type: 'run', libelle: 'Endurance', faite: true, distance_reelle_km: 12, duree_reelle_min: 60, denivele_reel_m: 60, fc_moyenne: 152 });
      d.activites = [{ id: 'ac-1', utilisateur: moi, seance: 'se-f2', pratique: 'course', cadence: 170, meilleurs: { 1000: 300, 5000: 1500, 10000: 3000 }, date: '2026-10-15' }];
      d.analyses_stats = [{ id: 'an-1', utilisateur: moi, cree: '2026-10-19T08:00:00Z', motif: 'import', texte: 'Analyse enregistrée.' }];
      d.preferences[0].modules = d.preferences[0].modules.concat(['Stats']); return d; };
    const ECRANS = [['index.html'], ['objectif.html'], ['objectif.html', p => p.click('[data-ob="ajouter"]'), 'fiche, ajout'], ['course.html?id=' + id(3)],
      ['course.html?id=' + id(3), p => p.click('[data-ob="modifier"]'), 'fiche, modification'], ['calendrier.html'], ['calendrier.html#mois'], ['calendrier.html#annee'],
      ['calendrier.html', p => p.click('[data-edit="se-b"]'), 'séance'], ['courses-a-surveiller.html'], ['palmares.html'], ['preferences.html'], ['preparation.html'],
      ['preparation.html', p => reglage(p, '[data-preparer]'), 'phases'], ['profil.html'], ['nutrition.html'], ['guide.html'],
      ['stats.html', null, 'vide'], ['stats.html', null, 'avec séances', statsPleine], ['stats.html', p => p.click('.st-haut [data-importer]'), 'import', statsPleine]];
    for (const [page, action, quoi, prep] of ECRANS) for (const w of [1200, 390]) {
      const o = await ouvrir(nav, page, w, prep ? prep(avec(db)) : avec(db), {}, Object.assign({}, PARIS, { mobile: w < 500 }));
      if (/^course\.html/.test(page)) await o.p.waitForSelector('.mc-panneau .pc-titre');
      if (action) { await action(o.p); await o.p.waitForTimeout(400); }
      const r = await releve(o.p), nom = page + (quoi ? ' · ' + quoi : '') + ' (' + w + ' px)';
      pb.push(egal([], r.horsClasse, nom + ' : aucun bouton hors du panneau'));
      pb.push(egal(true, r.principaux.length <= 1, nom + ' : un seul bouton principal visible (' + r.principaux.join(', ') + ')'));
      pb.push(egal([], r.dangers.filter(d => !d[1] || !d[2]).map(d => d[0]), nom + ' : « Supprimer … », seul en bas'));
      pb.push(egal([], r.pastillesLiens, nom + ' : une pastille ne mène nulle part'));
      pb.push(egal([], r.petits, nom + ' : le petit rond n\'ajoute qu\'une séance'));
      pb.push(egal([], o.erreurs, nom + ' : erreurs JavaScript'));
      await o.ctx.close();
    }
    return pb;
  },
  async affichage(nav, db) {
    const pb = [];
    for (const [nom, w] of Object.entries(LARGEURS))
      for (const page of ['index.html', 'palmares.html', 'preferences.html', 'objectif.html', 'calendrier.html', 'course.html?id=00000000-0000-0000-0001-000000000020', 'courses-a-surveiller.html', 'nutrition.html', 'profil.html', 'guide.html', 'stats.html'])
        pb.push(...await sansSaut(nav, db, page, w, page.replace(/\.html.*/, '') + ' ' + nom));
    return pb;
  },
};
