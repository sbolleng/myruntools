// ===== Page d'une course, en modale : consultation et édition dans la même feuille =====
//
// Décrite par docs/module-objectif-specification.md (§ 3.4 et 3.8) ; style : composants/modale-course.css.
// Le crayon et « Marquer comme courue » font basculer la feuille en édition (fiche-course.js), sans nouvelle couche.
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
    let saisie = null; // fiche en cours d'édition ({ annuler }), sinon null
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
      voile = panneau = corps = el = ctx = edition = saisie = null;
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
      if (e.key !== 'Escape' || document.querySelector('.cal-voile')) return;
      if (saisie) saisie.annuler(); else fermer();
    }

    // Édition : la fiche remplace la consultation dans la même feuille ; à la fin, retour à la consultation, relue
    // après un enregistrement (une course qui quitte la feuille de route ferme la feuille).
    async function editer(extra) {
      const c = ctx.courses.find(x => x.id === id);
      if (!c || saisie) return;
      const references = await window.mrtReferences();
      if (!ctx) return;
      const groupes = [...new Set(ctx.courses.filter(x => x.statut === 'option' && x.groupe_options).map(x => x.groupe_options))];
      el = document.createElement('div');
      corps.replaceChildren(el);
      panneau.scrollTop = 0;
      saisie = window.mrtFicheCourse(Object.assign({ course: c, references, groupes, dans: el,
        preparation: extra.mode === 'a_venir' ? { semaines: ctx.semaines } : null,
        fin: async r => {
          saisie = null;
          if (!ctx) return;
          afficher(id, '');
          if (r !== 'annule') await ctx.actualiser();
        } }, extra));
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
      // Après un ajout : seulement si la course est sur la feuille de route.
      if (o.siPresente && !window.mrtCoursesRoute(opts.courses()).some(x => x.id === i)) return;
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
      voile.addEventListener('click', e => { if (e.target !== voile) return; if (saisie) saisie.annuler(); else fermer(); });
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
      // Retenir : celui d'Objectif (mrtEdition) ; modifier et marquer basculent la feuille en édition.
      const saisieObjectif = window.mrtEdition(page, () => (ctx ? ctx.courses : opts.courses()), () => ctx && ctx.actualiser());
      edition = saisieObjectif && { retenir: saisieObjectif.retenir, modifier: () => editer({ mode: 'a_venir' }), marquer: () => editer({ mode: 'courue', marquer: true }) };
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
      // En édition, le retour fait comme « Annuler » : la feuille reste, son entrée d'historique est remise.
      if (voile && saisie) { if (poussee) historique('pushState', id, ''); saisie.annuler(); return; }
      if (voile && !(etat && etat.mrtCourse)) { poussee = false; retirer(); }
      else if (voile && etat.mrtCourse !== id) afficher(etat.mrtCourse, '');
      else if (!voile && etat && etat.mrtCourse) ouvrir(etat.mrtCourse, '', { deja: true });
    });

    const api = { ouvrir, fermer };
    window.mrtOuvrirCourse = (i, ancre, o) => ouvrir(i, ancre, o);
    return api;
  };
})();
