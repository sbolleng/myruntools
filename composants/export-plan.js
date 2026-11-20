// ===== Export du plan : une page à imprimer ou à enregistrer en PDF =====
//
// docs/module-calendrier-specification.md, § 4.6. Depuis le Calendrier (la période affichée) et Mon plan (de la semaine en cours
// à l'Objectif) : A4 à l'horizontale, titre en haut (pas de légende des liserés), une ligne par semaine (la grille de Mois V2, calendrier.js),
// six semaines par page, en-tête répété ; fond blanc (thème blanc-orange), quel que soit le thème choisi. Le PDF se fait
// avec « Imprimer → Enregistrer en PDF » du navigateur.
//   mrtExport.bouton()                     le rond « Exporter » (data-exporter), à poser dans une barre
//   mrtExport.imprimer(ctx, { titre, debut, fin, phases })   construit les pages et ouvre l'impression
(function () {
  const PAR_PAGE = 6;
  const ICONE = '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v7.5M4.8 6.8L8 10l3.2-3.2M3 13h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function imprimer(ctx, o) {
    const P = window.mrtPreparation, lundis = [];
    for (let l = o.debut; l <= o.fin; l = P.addDays(l, 7)) lundis.push(l);
    const F = window.mrtFormat, jour = F.date(P.iso(new Date()));
    let h = '';
    for (let i = 0; i < lundis.length; i += PAR_PAGE) {
      const de = lundis[i], a = P.addDays(lundis[Math.min(i + PAR_PAGE, lundis.length) - 1], 6);
      h += '<section class="xp-page"><header class="xp-tete"><h1 class="xp-titre">' + esc(o.titre) + '</h1></header>' +
        window.mrtGrilleSemaines(ctx, de, a, { impression: true, phases: o.phases }) +
        '<footer class="xp-pied"><span>MyRunTools</span><span>Exporté le ' + jour + (lundis.length > PAR_PAGE ? ' · page ' + (i / PAR_PAGE + 1) + ' sur ' + Math.ceil(lundis.length / PAR_PAGE) : '') + '</span></footer></section>';
    }
    let zone = document.querySelector('.xp-zone');
    if (!zone) { zone = document.createElement('div'); zone.className = 'xp-zone t-blanc-orange'; document.body.appendChild(zone); }
    zone.innerHTML = h || '<section class="xp-page"><h1 class="xp-titre">' + esc(o.titre) + '</h1><p>Aucune semaine à exporter.</p></section>';
    document.documentElement.classList.add('xp-imprime');
    const fin = () => { document.documentElement.classList.remove('xp-imprime'); window.removeEventListener('afterprint', fin); };
    window.addEventListener('afterprint', fin);
    window.print();
  }

  window.mrtExport = {
    bouton: () => '<button type="button" class="mrt-rond xp-bouton" data-exporter aria-label="Exporter (imprimer ou PDF)" title="Exporter (imprimer ou PDF)">' + ICONE + '</button>',
    imprimer
  };
})();
