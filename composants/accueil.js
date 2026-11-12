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
      return bloc('prochaine', 'Prochaine course', ['objectif.html', 'Saison'],
        c ? '<div class="ac-carte" data-course="' + esc(c.id) + '"></div>' : vide('Aucune course confirmée à venir.'));
    },
    pensebete: () => bloc('pensebete', 'Pense-bête', null, vide('Rappels tirés de tes courses (inscriptions, objectifs à fixer) et notes perso.'), true),
    // Le bilan du jour et l'ajout en une touche (nutrition.js, renderNutritionAccueil).
    // « Détail → » : le lien de titre commun (comme « Feuille de route → »), vers la page Nutrition.
    nutrition: () => '<section class="ac-bloc" data-bloc="nutrition"><h2 class="ac-titre"><span>Nutrition</span><a href="nutrition.html">Détail →</a></h2><div class="nu-accueil"></div></section>',
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
      return bloc('dicila', 'D\'ici là', window.mrtModulesAffiches(prefs).some(m => m.nom === 'Préparation') ? ['preparation.html', 'Préparation'] : null, etapes.length ? '<div class="ac-etapes">' + etapes.join('<i aria-hidden="true">›</i>') + '</div>' : vide('Aucune course à venir.'));
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

  // ----- Aujourd'hui : en tête de page, les séances et la course du jour, puis trois saisies rapides -----
  const pad = n => String(n).padStart(2, '0');
  const jourIso = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function aujourdhui(courses, nutrition, prefs) {
    if (!nutrition || nutrition.lectureSeule) return '';
    const jour = jourIso(), P = window.mrtPreparation;
    const seances = (nutrition.seances || []).filter(x => x.date === jour && x.etat !== 'proposee');
    const courseDuJour = courses.filter(c => c.etat === 'a_venir' && c.date === jour && !c.date_approx && c.statut !== 'a_surveiller');
    const lignes = courseDuJour.map(c => '<li class="ac-jour-ligne"><span class="ac-jour-type">Course</span><a href="' + pageCourse(c) + '">' + esc(window.mrtNomCourse(c)) + '</a></li>').concat(seances.map(x =>
      '<li class="ac-jour-ligne"><label><input type="checkbox" data-faite="' + esc(x.id) + '"' + (x.faite ? ' checked' : '') + '> <span class="ac-jour-type">' + esc((P && P.TYPES && P.TYPES[x.type]) || x.type) + '</span> ' +
      esc(x.libelle || '') + (x.duree_min ? ' · ' + esc(x.duree_min >= 60 ? Math.floor(x.duree_min / 60) + ' h' + (x.duree_min % 60 ? pad(x.duree_min % 60) : '') : x.duree_min + ' min') : '') + '</label></li>'));
    const avecNutrition = window.mrtModulesAffiches(prefs).some(m => m.nom === 'Nutrition');
    const plus = window.mrtIcone.plus;
    // Comme les boutons « Activité » et « Repas » de la page Nutrition : bouton principal (Accent), « + », libellé et picto.
    const N = window.mrtNutrition || {};
    const saisies = (avecNutrition ? '<button type="button" class="mrt-btn is-principal" data-rapide="repas">' + plus + 'Ajouter un repas' + (N.PICTO_ASSIETTE || '') + '</button>' +
      '<button type="button" class="mrt-btn is-principal" data-rapide="activite">' + plus + 'Ajouter une activité' + (N.PICTO_HALTERE || '') + '</button>' : '');
    return '<section class="ac-bloc ac-aujourdhui" data-bloc="aujourdhui"><h2 class="ac-titre"><span>Aujourd\'hui</span><a href="calendrier.html">Calendrier →</a></h2>' +
      (lignes.length ? '<ul class="ac-jour">' + lignes.join('') + '</ul>' : vide('Rien de prévu aujourd\'hui.')) +
      (saisies ? '<div class="ac-rapide">' + saisies + '</div>' : '') + '</section>';
  }

  // nutrition : { profil, id, semaines, lectureSeule } pour le bloc Nutrition (page index.html).
  // Pour aller plus loin : un module à cocher (Préparation, Nutrition) qui n'est pas au menu, avec son bouton « Ajouter au menu » ;
  // le bloc disparaît quand tous sont au menu, et sur le site d'un autre.
  const decouvrir = (prefs, lectureSeule) => {
    if (lectureSeule) return '';
    const affiches = window.mrtModulesAffiches(prefs).map(m => m.nom);
    const absents = window.mrtModules.filter(m => m.page && m.defaut === false && !affiches.includes(m.nom));
    if (!absents.length) return '';
    return '<section class="ac-bloc ac-decouvrir" data-bloc="decouvrir"><h2 class="ac-titre"><span>Pour aller plus loin</span></h2><ul>' + absents.map(m =>
      '<li><span class="ac-module"><b>' + esc(m.libelle || m.nom) + '</b><span>' + esc(m.aide || '') + '</span></span>' +
      '<button type="button" class="mrt-btn" data-module="' + esc(m.nom) + '">Ajouter au menu</button></li>').join('') + '</ul></section>';
  };

  // nutrition : { ..., lectureSeule, ajouterModule(nom) } ; ajouterModule enregistre le choix et redessine la page.
  window.renderAccueil = function (el, courses, prefs, nutrition) {
    el.innerHTML = '<div class="ac-grille">' + aujourdhui(courses, nutrition, prefs) + window.mrtBlocsAffiches(prefs).map(b => BLOCS[b.id](courses, prefs)).join('') + decouvrir(prefs, nutrition && nutrition.lectureSeule) + '</div>';
    el.querySelectorAll('[data-module]').forEach(b => b.addEventListener('click', () => { b.disabled = true; if (nutrition && nutrition.ajouterModule) nutrition.ajouterModule(b.dataset.module); }));
    el.querySelectorAll('[data-rapide]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.rapide;
      location.href = 'nutrition.html?ajout=' + k;
    }));
    el.querySelectorAll('[data-faite]').forEach(c => c.addEventListener('change', async () => {
      const { error } = await window.mrtSupabase.from('seances').update({ faite: c.checked }).eq('id', c.dataset.faite);
      if (error) { console.warn(error); c.checked = !c.checked; return; }
      const x = (nutrition.seances || []).find(y => y.id === c.dataset.faite); if (x) x.faite = c.checked;
    }));
    const carte = el.querySelector('.ac-carte');
    if (carte) window.renderCarteCourse(carte, courses.find(c => c.id === carte.dataset.course));
    const nu = el.querySelector('.nu-accueil');
    if (nu && nutrition && window.renderNutritionAccueil) window.renderNutritionAccueil(nu, Object.assign({ courses }, nutrition));
  };
})();
