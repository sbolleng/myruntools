// ===== Données de l'utilisateur connecté, lues dans Supabase =====
//
// À charger après composants/session.js. mrtPage({ courant }) attend la
// session (sans session, session.js renvoie vers la connexion), lit les
// courses, dessine l'en-tête et le menu, puis rend { session, courses } pour
// la suite de la page, qui dessine son contenu avant que la page (masquée
// jusque-là) ne s'affiche d'un seul coup. Les règles par ligne de la base ne renvoient que les
// lignes de l'utilisateur connecté.
(function () {
  // Catalogue des modules, dans l'ordre par défaut ; page absente = pas encore construit.
  const MODULES = [
    { nom: 'Cette semaine' },
    { nom: 'Objectif', page: 'objectif.html' },
    { nom: 'Calendrier', page: 'calendrier.html' },
    { nom: 'Nutrition' },
    { nom: 'Palmarès', page: 'palmares.html' },
    { nom: 'Profil' },
    { nom: 'Guide' }
  ];
  const PLAN = new Set(['option', 'confirmee']); // statuts de la page Objectif
  window.mrtModules = MODULES;
  // L'Accueil : toujours dans le menu, en premier (il ne se masque pas).
  const ACCUEIL = { nom: 'Accueil', page: 'index.html' };
  // Blocs de l'Accueil, dans l'ordre par défaut ; bientot : pas encore construit (grisé) ;
  // masque : décoché par défaut.
  window.mrtBlocsAccueil = [
    { id: 'prochaine', nom: 'Prochaine course' },
    { id: 'pensebete', nom: 'Pense-bête', bientot: true },
    { id: 'nutrition', nom: 'Bilan nutrition', bientot: true },
    { id: 'dicila', nom: 'D\'ici là' },
    { id: 'derniere', nom: 'Dernière course', masque: true }
  ];
  // Page de démarrage : celle qui s'ouvre en arrivant sur le site, la seule avec le grand en-tête.
  window.mrtDemarrage = prefs => (prefs && prefs.page_demarrage) || 'index.html';

  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  // Listes de référence (types, sous-catégories), lues une fois.
  let refs = null;
  async function lireReferences() {
    if (refs) return refs;
    const db = window.mrtSupabase;
    const [sous, types] = await Promise.all([
      db.from('formats').select('*').order('ordre'),
      db.from('types_course').select('id, libelle, ordre').order('ordre')
    ]);
    for (const r of [sous, types]) if (r.error) throw r.error;
    refs = { types: types.data, sous: sous.data };
    return refs;
  }

  // Courses d'un utilisateur (soi-même, ou un site partagé en lecture seule).
  async function lireCourses(qui) {
    const db = window.mrtSupabase;
    const [courses, circuits, r] = await Promise.all([
      db.from('courses').select('*').eq('utilisateur', qui),
      db.from('courses_circuits').select('*').eq('utilisateur', qui),
      lireReferences()
    ]);
    for (const x of [courses, circuits]) if (x.error) throw x.error;
    const typeLib = Object.fromEntries(r.types.map(t => [t.id, t.libelle]));
    const sc = Object.fromEntries(r.sous.map(x => [x.id, x]));
    return courses.data.map(c => Object.assign({}, c, {
      type: c.format && sc[c.format] ? sc[c.format].type : null,
      typeLibelle: c.format && sc[c.format] ? typeLib[sc[c.format].type] : null,
      formatLibelle: c.format && sc[c.format] ? sc[c.format].libelle : null,
      // Durée de préparation en semaines : celle de la course, sinon celle de son format (vide : pas de préparation).
      prepaFormat: c.format && sc[c.format] && sc[c.format].prepa_semaines != null ? sc[c.format].prepa_semaines : null,
      prepaSemaines: c.prepa_semaines != null ? c.prepa_semaines : (c.format && sc[c.format] && sc[c.format].prepa_semaines != null ? sc[c.format].prepa_semaines : null),
      circuits: circuits.data.filter(x => x.course === c.id)
    }));
  }
  window.mrtReferences = lireReferences;

  // Calendrier : séances et semaines dont la phase a été modifiée à la main (évolution 009).
  window.mrtLirePlan = async function (qui) {
    const db = window.mrtSupabase;
    const [seances, semaines] = await Promise.all([
      db.from('seances').select('*').eq('utilisateur', qui).order('date'),
      db.from('plan_semaines').select('*').eq('utilisateur', qui)
    ]);
    for (const x of [seances, semaines]) if (x.error) throw x.error;
    return { seances: seances.data, semaines: semaines.data };
  };

  // Nom affiché : « Course · Parcours », ou la course seule.
  window.mrtNomCourse = c => c.course + (c.parcours && c.parcours !== c.course ? ' · ' + c.parcours : '');

  // En-tête depuis les courses : cap choisi, sinon la course à venir la plus
  // lointaine de la page Objectif (modèle de données, § 7).
  // Courses à venir de la page Objectif, de la plus proche à la plus lointaine :
  // celles qui peuvent servir de cap.
  const parDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  window.mrtCoursesCap = courses => courses.filter(c => PLAN.has(c.statut) && c.etat === 'a_venir' && c.date && c.date >= today()).sort(parDate);
  // Courses de la feuille de route : les mêmes, plus les courses confirmées dont la date est passée et qui
  // ne sont pas encore marquées courues (elles restent là jusqu'à ce qu'on saisisse leur résultat).
  window.mrtCoursesRoute = courses => courses.filter(c => c.etat === 'a_venir' && c.date && (c.date >= today() ? PLAN.has(c.statut) : c.statut === 'confirmee')).sort(parDate);

  // Le cap : la course choisie dans les Préférences, sinon la plus lointaine à venir.
  window.mrtCap = (courses, prefs) => {
    const aVenir = window.mrtCoursesCap(courses);
    return aVenir.find(c => c.id === (prefs || {}).course_cap) || aVenir[aVenir.length - 1] || null;
  };

  function configEnTete(prefs, courses) {
    const aVenir = window.mrtCoursesCap(courses);
    prefs = prefs || {};
    const cap = window.mrtCap(courses, prefs);
    let objectif = {};
    if (cap) {
      const avant = aVenir.filter(c => c.id !== cap.id && c.date < cap.date);
      // Un bloc par course confirmée ou option isolée, un par groupe d'options.
      const blocs = new Set(avant.map(c => (c.statut === 'option' && c.groupe_options ? 'g:' + c.groupe_options : c.id)));
      objectif = {
        nom: cap.parcours || cap.course,
        distance: cap.distance != null ? Number(cap.distance) : null,
        dplus: cap.dplus != null ? cap.dplus : null,
        date: cap.date_approx ? cap.date.slice(0, 7) : cap.date,
        heure: cap.date_approx ? null : cap.heure, // le compte à rebours vise l'heure de départ quand elle est connue
        dIciLa: blocs.size,
        cible: cap.objectif
      };
    }
    const prochaine = aVenir.find(c => c.statut === 'confirmee' && c !== cap) || null;
    const ordre = prefs.modules && prefs.modules.length ? prefs.modules : null;
    const modules = ordre ? ordre.map(n => MODULES.find(m => m.nom === n)).filter(Boolean) : MODULES;
    return {
      theme: prefs.theme,
      objectif,
      prochaine: prochaine ? { nom: prochaine.course, date: prochaine.date } : null, // le nom de la course, pas du parcours
      modules: [ACCUEIL].concat(modules)
    };
  }

  // Site partagé en lecture seule : le choix est retenu sur l'appareil.
  const VUE = 'mrt-vue';
  const lireVue = () => { try { return localStorage.getItem(VUE); } catch (e) { return null; } };
  window.mrtVoirSite = id => { try { localStorage.setItem(VUE, id); } catch (e) { /* stockage indisponible */ } location.href = 'index.html'; };
  window.mrtRevenir = () => { try { localStorage.removeItem(VUE); } catch (e) { /* stockage indisponible */ } location.reload(); };

  function bandeau(prenom) {
    const div = document.createElement('div');
    div.className = 'mrt-bandeau';
    div.innerHTML = '<span>Lecture seule · site de <b></b></span><a href="#">Revenir à mon site</a>';
    div.querySelector('b').textContent = prenom || '—';
    div.querySelector('a').addEventListener('click', e => { e.preventDefault(); window.mrtRevenir(); });
    const nav = document.querySelector('.mrt-nav');
    nav.parentNode.insertBefore(div, nav.nextSibling);
  }

  // Attend la session, lit les courses (les siennes, ou celles d'un site
  // partagé), dessine l'en-tête et le menu. Rend de quoi construire la page.
  // En-tête et menu de la dernière page, gardés pour la visite (sessionStorage) : la page suivante les dessine
  // aussitôt, sans attendre la base ; ils ne sont redessinés que s'ils ont changé.
  const CACHE = 'mrt-entete';
  const lireCache = () => { try { return JSON.parse(sessionStorage.getItem(CACHE)); } catch (e) { return null; } };
  const ecrireCache = c => { try { sessionStorage.setItem(CACHE, JSON.stringify(c)); } catch (e) { /* stockage indisponible */ } };

  window.mrtPage = async function (opts) {
    const cache = lireCache();
    let dessine = null; // configuration dessinée, pour ne pas redessiner à l'identique
    const tracer = (cfg, demarrage) => {
      const complet = Object.assign({}, cfg, { courant: opts.courant, sansEnTete: !!opts.sansEnTete || opts.courant !== demarrage });
      const cle = JSON.stringify(complet);
      if (cle === dessine) return;
      dessine = cle;
      window.renderEnTete(complet);
    };
    if (cache && !(opts.courant === 'index.html' && cache.demarrage !== 'index.html')) tracer(cache.cfg, cache.demarrage);
    const session = await window.mrtSession();
    if (!session) return new Promise(() => {}); // renvoi vers la connexion en cours
    const db = window.mrtSupabase;
    let qui = session.id, prefs = session.preferences, proprietaire = null;
    const vue = lireVue();
    if (vue && vue !== session.id) {
      const { data } = await db.rpc('partages_avec_moi');
      proprietaire = (data || []).find(p => p.id === vue) || null;
      if (proprietaire) {
        qui = vue;
        const r = await db.from('preferences').select('*').eq('utilisateur', vue).maybeSingle();
        prefs = r.data;
      } else {
        try { localStorage.removeItem(VUE); } catch (e) { /* accord retiré */ }
      }
    }
    // Arrivée sur le site (pas un clic depuis une de ses pages) : l'Accueil cède la place à la page de démarrage.
    const demarrage = window.mrtDemarrage(prefs);
    // Dans le site : une de ses pages a déjà été affichée dans cet onglet (en-tete.js retient « mrt-haut ») ;
    // venir de la page de connexion compte comme une arrivée.
    const depuisLeSite = (() => {
      let deja = false;
      try { deja = !!sessionStorage.getItem('mrt-haut'); } catch (e) { /* stockage indisponible */ }
      return deja && !/connexion\.html(\?|$)/.test(document.referrer);
    })();
    if (opts.courant === 'index.html' && demarrage !== 'index.html' && !depuisLeSite) {
      location.replace(demarrage + location.search);
      return new Promise(() => {});
    }
    let courses = [];
    try { courses = await lireCourses(qui); } catch (err) { console.warn('Courses : lecture impossible', err); }
    // Calendrier : séances et phases modifiées, lues avant que la page ne s'affiche (opts.plan).
    const lirePlan = async () => { try { return await window.mrtLirePlan(qui); } catch (err) { console.warn('Calendrier : séances illisibles', err); return { seances: [], semaines: [] }; } };
    const plan = opts.plan ? await lirePlan() : null;
    let prefsCourantes = prefs;
    // Grand en-tête sur la page de démarrage seulement ; ailleurs, la barre fine.
    const dessiner = p => {
      prefsCourantes = p;
      const cfg = configEnTete(p, courses), demarrage = window.mrtDemarrage(p);
      ecrireCache({ cfg, demarrage });
      tracer(cfg, demarrage);
      document.documentElement.dataset.mrtDonnees = '1'; // en-tête tiré des données (et non de la copie gardée)
    };
    dessiner(prefs);
    if (proprietaire) bandeau(proprietaire.prenom);
    // La page s'affiche une fois que la suite de la page (then) a dessiné son contenu.
    setTimeout(window.mrtAfficher, 0);
    return {
      session, courses, qui, plan, relirePlan: lirePlan, lectureSeule: !!proprietaire, proprietaire, preferences: () => prefsCourantes || {},
      // Relit les courses et redessine l'en-tête (cap, compte à rebours) avec elles.
      relire: async () => { courses = await lireCourses(qui); dessiner(prefsCourantes); return courses; },
      redessiner: dessiner // en-tête et menu, avec d'autres préférences
    };
  };
})();
