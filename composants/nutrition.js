// ===== Page Nutrition : besoin du jour, profil =====
//
// docs/module-nutrition-specification.md, § 4. Première tranche : le besoin du jour et le profil minimal ;
// les jauges, l'ajout rapide et le journal viennent ensuite. À charger après besoin.js et profil-champs.js.
//   renderNutrition(el, { profil, id, cap })
//   profil : ligne de `profils` ; id : identifiant de l'utilisateur ; cap : la course cap (ou null)
(function () {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 2 117 : espace insécable comme séparateur de milliers.
  const n0 = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const plage = r => n0(r[0]) + '–' + n0(r[1]);

  // Jours entre aujourd'hui et la course cap ; null sans date précise (mois seul : pas de phase déduite).
  function joursAvant(cap, aujourdhui) {
    if (!cap || !cap.date || cap.date_approx) return null;
    const a = new Date(aujourdhui + 'T12:00:00'), c = new Date(cap.date + 'T12:00:00');
    return Math.round((c - a) / 86400000);
  }

  window.renderNutrition = function (el, ctx) {
    const B = window.mrtBesoin, aujourdhui = iso(new Date());
    const redessiner = profil => renderNutrition(el, Object.assign({}, ctx, { profil }));
    if (B.manquants(ctx.profil, aujourdhui).length) {
      window.mrtProfilEncart(el, { profil: ctx.profil, id: ctx.id, surEnregistre: redessiner });
      return;
    }
    const jours = joursAvant(ctx.cap, aujourdhui);
    const phase = B.phaseDuJour(jours);
    const r = B.calculer(ctx.profil, { date: aujourdhui, sports: [], phase });
    el.innerHTML = '<section class="mrt-section nu-besoin"><p class="pf-titre">Besoin du jour</p>' +
      '<p class="nu-kcal"><span class="nu-kcal-val">' + n0(r.kcal) + '</span> kcal</p>' +
      '<p class="nu-phase">' + esc(r.phaseLibelle) + (jours !== null && jours >= 1 && jours <= 14 ? ' · J-' + jours : '') + '</p>' +
      '<p class="nu-sport">Sans sport saisi aujourd\'hui</p>' +
      '<ul class="nu-macros"><li><b>Protéines</b> ' + plage(r.proteines) + ' g</li><li><b>Glucides</b> ' + plage(r.glucides) + ' g</li><li><b>Lipides</b> ' + plage(r.lipides) + ' g</li></ul>' +
      '<p class="nu-mention">Repères de nutrition du sportif, pas un avis médical.</p>' +
      '<button type="button" class="mrt-lien nu-profil">Modifier mon profil</button></section>';
    el.querySelector('.nu-profil').addEventListener('click', () =>
      window.mrtProfilFenetre({ profil: ctx.profil, id: ctx.id, surEnregistre: redessiner }));
  };
})();
