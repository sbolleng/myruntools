// Contrôles du banc d'essai (voir ../essais.js) : un groupe par fonction, tiré du jeu d'essai de la spécification.
const { chromium, fs, path, RACINE, PROJET, AUJOURDHUI, LIB, CAPTURES, TUILE, GPX, boucle, GPX_DEUX, GPX_SEGMENTS, SEULS, LARGEURS, reglagesSite, SANS_CAPTCHA, simulerBase, ouvrir, reglage, sansSaut, PARIS, dateTrois, jeuObjectif, ouvrirBloc, repondre, surDialogue, toucher, navigateur, pause, sansInsecable, egal, DOSSIER } = require('../commun');

module.exports = {
  // Palmarès : ouverture, tri, records, compteur (module-palmares-specification.md).
  async palmares(nav, db) {
    const { p, ctx, erreurs } = await ouvrir(nav, 'palmares.html', 1200, db);
    const lignes = () => p.evaluate(() => [...document.querySelectorAll('#palmares tbody tr')].map(tr => tr.textContent));
    const l = await lignes();
    const pb = [
      egal(7, l.length, 'nombre de courses'),
      egal(true, /San Sebasti/.test(l[0]), 'San Sebastián en premier'),
      egal(true, /Montauban/.test(l[6]) && /00:51:46/.test(l[6]), 'Montauban 2025 en dernier : temps en hh:mm:ss'),
      egal(2, l.filter(x => x.includes('🥇')).length, 'records 🥇'),
      egal({ ajout: 'Ajouter une course', colonnes: { rond: true, texte: '', titre: 'Ajouter ou retirer des colonnes', apresGroupe: true }, enTete: 0 },
        await p.evaluate(() => { const c = document.querySelector('.pv2-cols-btn'), g = document.querySelector('.pv2-toggle');
          return { ajout: document.querySelector('.pv2-add').innerText.trim(), colonnes: { rond: c.classList.contains('mrt-rond'), texte: c.innerText.trim(), titre: c.title, apresGroupe: g.nextElementSibling === c },
            enTete: document.querySelectorAll('thead button:not(.pv2-sort)').length }; }), 'boutons : Ajouter une course ; Colonnes en rond après le regroupement, plus rien dans l\'en-tête du tableau'),
      egal(true, await p.evaluate(() => [...document.querySelectorAll('#palmares tbody td.pv2-n')].map(td => td.textContent).filter(x => /^\d+:\d\d:\d\d$|^\d+:\d\d \/km$|^—$|^\d/.test(x)).every(x => !/['h]/.test(x))), 'temps sans h ni apostrophe'),
      egal({ cache: true, texte: '' }, await p.evaluate(() => { const c = document.querySelector('.pv2-count'); return { cache: c.hidden && getComputedStyle(c).display === 'none', texte: c.textContent }; }), 'sans filtre : pas de compteur'),
      egal([], erreurs, 'erreurs JavaScript')
    ];
    // Filtres : bouton rond à trois traits ; panneau en pastilles (tri, choix, années) ; pastille du nombre de filtres actifs.
    pb.push(egal({ rond: true, texte: '', ouvert: 'false' }, await p.evaluate(() => { const b = document.querySelector('.pv2-btn');
      return { rond: b.classList.contains('mrt-rond'), texte: b.innerText.trim(), ouvert: b.getAttribute('aria-expanded') }; }), 'filtres : bouton rond, sans texte'));
    await p.click('.pv2-btn');
    pb.push(egal(['true', 'Date↓'], [await p.getAttribute('.pv2-btn', 'aria-expanded'), await p.evaluate(() => { const b = document.querySelector('.pv2-tri[aria-pressed="true"]'); return b.textContent + (b.querySelector('.pv2-sens .mrt-ico path').getAttribute('d').includes('12.5V') ? '↑' : '↓'); })], 'panneau ouvert ; tri en cours : Date, plus récente d\'abord'));
    await p.click('.pv2-panel label.pv2-check:has(input[value="Trail"])');
    pb.push(egal(['3 courses sur 7', '1', 'Filtres · 1 actif'], [await p.textContent('.pv2-count'), await p.textContent('.pv2-badge'), await p.getAttribute('.pv2-btn', 'aria-label')], 'pastille Trail : 3 courses, pastille « 1 » sur le bouton'));
    await p.click('[data-act="clear"]');
    await p.click('.pv2-panel label.pv2-check:has(input[data-part="year"][value="2025"])');
    const en2025 = await p.textContent('.pv2-count');
    await p.click('.pv2-panel label.pv2-check:has(input[data-part="year"][value=""])');
    pb.push(egal([true, true], [/sur 7$/.test(en2025) && !/^7 /.test(en2025), await p.evaluate(() => document.querySelector('.pv2-count').hidden)], 'année : pastille 2025 filtre, « Toutes » rétablit (compteur retiré)'));
    // Replier un panneau : rond « Réduire » (chevron vers le haut) en haut à droite, sans « × ».
    pb.push(egal({ croix: '', chevron: true, titre: 'Réduire', enHaut: true, aDroite: true }, await p.evaluate(() => { const pan = document.querySelector('.pv2-panel:not(.pv2-cols)'), x = pan.querySelector('.pv2-close'), r = pan.getBoundingClientRect(), b = x.getBoundingClientRect();
      return { croix: x.textContent.trim(), chevron: !!x.querySelector('svg path[d="M4 10l4-4 4 4"]'), titre: x.title, enHaut: b.top - r.top < 24, aDroite: r.right - b.right < 24 }; }), 'panneau des filtres : rond « Réduire » (chevron) en haut à droite'));
    await p.click('.pv2-panel:not(.pv2-cols) .pv2-close');
    // Déroulé commun (design § 1) : la fermeture est animée, puis le panneau est masqué.
    const anime = await p.evaluate(() => document.querySelector('.pv2-panel:not(.pv2-cols)').getAnimations().length > 0);
    await p.waitForFunction(() => document.querySelector('.pv2-panel:not(.pv2-cols)').hidden);
    pb.push(egal(['false', true, true], [await p.getAttribute('.pv2-btn', 'aria-expanded'), await p.evaluate(() => document.querySelector('.pv2-panel:not(.pv2-cols)').hidden), anime], '« Réduire » replie le panneau des filtres, en déroulé'));
    await p.click('.pv2-cols-btn');
    pb.push(egal(['true', false], [await p.getAttribute('.pv2-cols-btn', 'aria-expanded'), await p.evaluate(() => document.querySelector('.pv2-cols').hidden)], 'bouton Colonnes : ouvre le panneau des colonnes'));
    await p.click('.pv2-cols .pv2-close');
    await p.waitForFunction(() => document.querySelector('.pv2-cols').hidden);
    pb.push(egal([true, 'false'], [await p.evaluate(() => document.querySelector('.pv2-cols').hidden), await p.getAttribute('.pv2-cols-btn', 'aria-expanded')], '« Réduire » replie le panneau des colonnes'));
    await p.click('.pv2-btn');
    await p.click('.pv2-tri[data-sort="time"]');
    pb.push(egal('Temps↑', await p.evaluate(() => { const b = document.querySelector('.pv2-tri[aria-pressed="true"]'); return b.textContent + (b.querySelector('.pv2-sens .mrt-ico path').getAttribute('d').includes('12.5V') ? '↑' : '↓'); }), 'pastille de tri : Temps, plus court d\'abord'));
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'palmares-filtres.png'), fullPage: true });
    await p.click('.pv2-tri[data-sort="date"]'); await p.click('.pv2-btn');
    if (CAPTURES) await p.screenshot({ path: path.join(DOSSIER, 'captures', 'palmares.png'), fullPage: true });
    await ctx.close();
    // Téléphone tenu en hauteur : invitation à le tourner ; en largeur : une ligne par course ; ordinateur : pas d'invitation.
    const paysage = async (w, h) => {
      const o = await ouvrir(nav, 'palmares.html', w, db, {}, { hauteur: h });
      const r = await o.p.evaluate(() => ({ invitation: getComputedStyle(document.querySelector('.pv2-paysage')).display !== 'none',
        uneLigne: [...document.querySelectorAll('.pv2-table tbody td')].every(td => getComputedStyle(td).whiteSpace === 'nowrap') }));
      if (CAPTURES && h < 500) await o.p.screenshot({ path: path.join(DOSSIER, 'captures', 'palmares-paysage.png') });
      await o.ctx.close();
      return r;
    };
    pb.push(egal(true, (await paysage(390, 844)).invitation, 'téléphone en hauteur : « Tourne ton téléphone… »'));
    pb.push(egal({ invitation: false, uneLigne: true }, await paysage(844, 390), 'téléphone en largeur : une ligne par course'));
    pb.push(egal(false, (await paysage(1200, 900)).invitation, 'ordinateur : pas d\'invitation'));
    // Largeur homogène : le contenu de chaque page (main) a la même largeur sur ordinateur.
    const largeurs = [];
    for (const pg of ['index.html', 'objectif.html', 'palmares.html', 'preferences.html', 'course.html?id=' + db.courses[0].id]) {
      const o = await ouvrir(nav, pg, 1200, db);
      largeurs.push(await o.p.evaluate(() => Math.round(document.querySelector('main').getBoundingClientRect().width)));
      await o.ctx.close();
    }
    pb.push(egal(true, largeurs.every(w => w === largeurs[0]), 'ordinateur : même largeur de contenu sur toutes les pages (' + largeurs.join(', ') + ')'));
    return pb;
  },
};
