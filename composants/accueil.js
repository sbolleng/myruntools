// ===== Accueil : la page en un coup d'œil =====
//
// Décrit par docs/specification-generale.md (§ 6) ; style : composants/accueil.css.
// renderAccueil(el, courses, prefs) dessine les blocs choisis dans les Préférences
// (preferences.accueil_blocs, dans l'ordre ; vide : les blocs par défaut, mrtBlocsAccueil).
// La carte de la prochaine course est celle de la feuille de route (renderCarteCourse, objectif.js).
(function () {
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Dates, durées, allures : les formats communs (en-tete.js).
  const { date: dateCourte, duree, allure } = window.mrtFormat;
  const pageCourse = c => 'course.html?id=' + encodeURIComponent(c.id);

  // Blocs affichés : mrtBlocsAffiches (donnees.js), aussi lu par l'en-tête.

  const bloc = (id, titre, lien, corps, bientot) => '<section class="ac-bloc' + (bientot ? ' is-bientot' : '') + '" data-bloc="' + id + '">' +
    '<h2 class="ac-titre"><span>' + esc(titre) + (bientot ? ' · bientôt' : '') + '</span>' + (lien ? '<a href="' + lien[0] + '">' + esc(lien[1]) + ' →</a>' : '') + '</h2>' + corps + '</section>';
  const vide = t => '<p class="ac-vide">' + esc(t) + '</p>';

  const BLOCS = {
    // La prochaine course confirmée de la feuille de route.
    prochaine: courses => {
      const c = window.mrtCoursesRoute(courses).find(x => x.statut === 'confirmee');
      return bloc('prochaine', 'Prochaine course', ['objectif.html', 'Feuille de route'],
        c ? '<div class="ac-carte" data-course="' + esc(c.id) + '"></div>' : vide('Aucune course confirmée à venir.'));
    },
    pensebete: () => bloc('pensebete', 'Pense-bête', null, vide('Rappels tirés de tes courses (inscriptions, objectifs à fixer) et notes perso.'), true),
    nutrition: () => bloc('nutrition', 'Bilan nutrition', null, vide('Le plan de ravitaillement de la prochaine course, avec le module Nutrition.'), true),
    // Les étapes de la feuille de route jusqu'au cap compris.
    dicila: (courses, prefs) => {
      const cap = window.mrtCap(courses, prefs), etapes = [];
      for (const e of window.mrtEtapes(courses)) {
        const avecCap = e.course ? e.course === cap : e.candidats.includes(cap);
        etapes.push(e.course
          ? '<a class="mrt-pastille ac-etape' + (avecCap ? ' is-cap' : '') + '" href="' + pageCourse(e.course) + '">' + esc(e.course.course) + '</a>'
          : '<span class="mrt-pastille ac-etape is-groupe' + (avecCap ? ' is-cap' : '') + '">' + esc(e.groupe) + '</span>');
        if (avecCap) break;
      }
      return bloc('dicila', 'D\'ici là', null, etapes.length ? '<div class="ac-etapes">' + etapes.join('<i aria-hidden="true">›</i>') + '</div>' : vide('Aucune course à venir.'));
    },
    // La dernière course courue ; son nom ouvre son résultat (la page de la course, en modale).
    derniere: courses => {
      const c = courses.filter(x => x.etat === 'courue' && x.date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      if (!c) return bloc('derniere', 'Dernière course', ['palmares.html', 'Palmarès'], vide('Aucune course courue pour l\'instant.'));
      const temps = c.dnf ? 'DNF' : c.temps != null ? duree(c.temps) + (c.allure ? ' · ' + allure(c.allure) : '') : '—';
      const ligne = (lib, html) => '<div class="ob-ligne"><span class="ob-lib">' + lib + '</span><span class="ob-val">' + html + '</span></div>';
      return bloc('derniere', 'Dernière course', ['palmares.html', 'Palmarès'],
        '<div class="ob-lignes ac-lignes">' + ligne('Course', '<a href="' + pageCourse(c) + '">' + esc(window.mrtNomCourse(c)) + '</a>') + ligne('Date', esc(dateCourte(c.date))) + ligne('Temps', esc(temps)) + '</div>');
    }
  };

  window.renderAccueil = function (el, courses, prefs) {
    el.innerHTML = '<div class="ac-grille">' + window.mrtBlocsAffiches(prefs).map(b => BLOCS[b.id](courses, prefs)).join('') + '</div>';
    const carte = el.querySelector('.ac-carte');
    if (carte) window.renderCarteCourse(carte, courses.find(c => c.id === carte.dataset.course));
  };
})();
