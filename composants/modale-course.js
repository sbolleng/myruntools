// ===== Page d'une course, en modale =====
//
// Décrite par docs/module-objectif-specification.md (§ 3.4) ; style : composants/modale-course.css.
// La page d'une course s'ouvre au-dessus de la page d'origine (feuille de route, Calendrier, En un coup d'œil) :
// fermer ramène exactement là où on était. Tout lien `course.html?id=…` de la page ouvre la modale ; la même
// adresse, ouverte directement, affiche la feuille de route avec la modale par-dessus.
//   mrtModaleCourse(page, { courses, surMaj })   branche la page ; rend { ouvrir(id, ancre, opts), fermer }
//     courses()      liste de courses à jour de la page
//     surMaj(liste)  la page se redessine avec la liste relue après un enregistrement
//   window.mrtOuvrirCourse(id, ancre)   ouvre une course (pour le code qui n'a pas de lien : cases du Calendrier)
(function () {
  window.mrtModaleCourse = function (page, opts) {
    const fichier = () => location.pathname.split('/').pop();
    let voile = null, panneau = null, corps = null, el = null;
    let ctx = null, edition = null, id = null;
    let poussee = false, origineUrl = '', titreAvant = '', focusAvant = null;

    const url = (i, ancre) => 'course.html?id=' + encodeURIComponent(i) + (ancre || '');
    // L'adresse suit la course ouverte ; un navigateur qui refuse (file://) garde l'adresse de la page.
    const historique = (methode, i, ancre) => {
      const etat = { mrtCourse: i };
      try { history[methode](etat, '', url(i, ancre)); return true; } catch (e) { /* adresse refusée */ }
      try { history[methode](etat, ''); return true; } catch (e) { return false; }
    };

    function retirer() {
      if (!voile) return;
      voile.remove();
      voile = panneau = corps = el = ctx = edition = null;
      document.documentElement.classList.remove('mc-ouvert');
      document.removeEventListener('keydown', clavier);
      document.title = titreAvant;
      if (focusAvant && focusAvant.focus) focusAvant.focus();
    }

    // Fermer : retour d'une entrée d'historique si la modale en a ajouté une, sinon l'adresse de la page d'origine.
    function fermer() {
      if (!voile) return;
      retirer();
      if (poussee) { poussee = false; history.back(); return; }
      try { history.replaceState(null, '', origineUrl); } catch (e) { /* adresse inchangée */ }
    }

    function clavier(e) {
      // Un formulaire ou une fenêtre ouverts par-dessus gardent la touche Échap pour eux.
      if (e.key === 'Escape' && !document.querySelector('.fc-voile, .cal-voile')) fermer();
    }

    // Dessine la course, ou la ferme si elle n'est plus sur la feuille de route (supprimée, courue).
    function dessiner(debut) {
      const c = window.renderPageCourse(el, ctx.courses, id, edition, ctx);
      if (c) document.title = window.mrtNomCourse(c) + ' · MyRunTools';
      else if (!debut) fermer();
      return c;
    }

    function afficher(i, ancre) {
      id = i;
      ctx.ancre = ancre || '';
      ctx.ancreFaite = false;
      el = document.createElement('div');
      corps.replaceChildren(el);
      panneau.scrollTop = 0;
      dessiner(true);
    }

    async function ouvrir(i, ancre, o) {
      o = o || {};
      if (voile) {
        // Déjà ouverte (précédente, suivante, autre candidate) : l'entrée d'historique est remplacée, pas ajoutée.
        if (ctx && i !== id) { if (poussee) historique('replaceState', i, ancre); afficher(i, ancre); }
        return;
      }
      titreAvant = document.title;
      focusAvant = document.activeElement;
      // Course ouverte directement par son adresse : fermer ramène à la feuille de route.
      origineUrl = fichier() === 'course.html' ? 'objectif.html' : fichier() + location.search + location.hash;
      voile = document.createElement('div');
      voile.className = 'mc-voile';
      voile.innerHTML = '<div class="mc-panneau" role="dialog" aria-modal="true" aria-label="Course" tabindex="-1"><div class="mc-corps"><p class="ob-vide mc-attente">Chargement…</p></div></div>';
      panneau = voile.firstChild;
      corps = panneau.firstChild;
      document.body.appendChild(voile);
      document.documentElement.classList.add('mc-ouvert');
      document.addEventListener('keydown', clavier);
      voile.addEventListener('click', e => { if (e.target === voile) fermer(); });
      panneau.focus({ preventScroll: true });
      if (!o.direct && !o.deja) poussee = historique('pushState', i, ancre);
      else poussee = !!o.deja;
      const plan = await page.relirePlan();
      if (!voile) return; // fermée pendant la lecture
      ctx = { courses: opts.courses(), seances: plan.seances, semaines: plan.semaines, lectureSeule: page.lectureSeule, modale: { fermer } };
      ctx.relire = async () => {
        const [courses, p] = await Promise.all([page.relire(), page.relirePlan()]);
        return { courses, seances: p.seances, semaines: p.semaines };
      };
      // Après un enregistrement : relire, redessiner la page d'origine puis la course.
      ctx.actualiser = async () => {
        if (!ctx) return;
        const frais = await ctx.relire();
        if (!ctx) return;
        Object.assign(ctx, frais);
        opts.surMaj(ctx.courses);
        dessiner(false);
      };
      edition = window.mrtEdition(page, () => (ctx ? ctx.courses : opts.courses()), () => ctx && ctx.actualiser());
      afficher(i, ancre);
    }

    // Liens vers une course : la modale, sauf clic modifié (nouvel onglet) ou autre bouton que le principal.
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href^="course.html?id="]');
      if (!a) return;
      const u = new URL(a.getAttribute('href'), location.href);
      e.preventDefault();
      ouvrir(u.searchParams.get('id'), u.hash);
    });

    // Retour du navigateur ou du téléphone : ferme la modale ; en avant, la rouvre.
    window.addEventListener('popstate', e => {
      const etat = e.state;
      if (voile && !(etat && etat.mrtCourse)) { poussee = false; retirer(); }
      else if (voile && etat.mrtCourse !== id) afficher(etat.mrtCourse, '');
      else if (!voile && etat && etat.mrtCourse) ouvrir(etat.mrtCourse, '', { deja: true });
    });

    const api = { ouvrir, fermer };
    window.mrtOuvrirCourse = (i, ancre) => ouvrir(i, ancre);
    return api;
  };
})();
