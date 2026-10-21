// ===== Données de l'utilisateur connecté, lues dans Supabase =====
//
// À charger après composants/session.js. mrtPage({ courant }) attend la
// session (sans session, session.js renvoie vers la connexion), lit les
// courses, dessine l'en-tête et le menu, puis rend { session, courses } pour
// la suite de la page. Les règles par ligne de la base ne renvoient que les
// lignes de l'utilisateur connecté.
(function () {
  // Catalogue des modules, dans l'ordre par défaut ; page absente = pas encore construit.
  const MODULES = [
    { nom: 'Cette semaine' },
    { nom: 'Objectif' },
    { nom: 'Nutrition' },
    { nom: 'Palmarès', page: 'palmares.html' },
    { nom: 'Profil' },
    { nom: 'Guide' }
  ];
  const PLAN = new Set(['option', 'confirmee']); // statuts de la page Objectif

  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  // Listes de référence (types, sous-catégories), lues une fois.
  let refs = null;
  async function lireReferences() {
    if (refs) return refs;
    const db = window.mrtSupabase;
    const [sous, types] = await Promise.all([
      db.from('sous_categories').select('id, type, libelle, ordre').order('ordre'),
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
      type: c.sous_categorie && sc[c.sous_categorie] ? sc[c.sous_categorie].type : null,
      typeLibelle: c.sous_categorie && sc[c.sous_categorie] ? typeLib[sc[c.sous_categorie].type] : null,
      sousLibelle: c.sous_categorie && sc[c.sous_categorie] ? sc[c.sous_categorie].libelle : null,
      circuits: circuits.data.filter(x => x.course === c.id)
    }));
  }
  window.mrtReferences = lireReferences;

  // Nom affiché : « Événement · Parcours », ou le seul nom s'ils se confondent.
  window.mrtNomCourse = c => (c.evenement && c.evenement !== c.nom ? c.evenement + ' · ' : '') + c.nom;

  // En-tête depuis les courses : cap choisi, sinon la course à venir la plus
  // lointaine de la page Objectif (modèle de données, § 7).
  function configEnTete(prefs, courses) {
    const auj = today();
    const aVenir = courses.filter(c => PLAN.has(c.statut) && c.etat === 'a_venir' && c.date && c.date >= auj)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    prefs = prefs || {};
    const cap = aVenir.find(c => c.id === prefs.course_cap) || aVenir[aVenir.length - 1] || null;
    let objectif = {};
    if (cap) {
      const avant = aVenir.filter(c => c.id !== cap.id && c.date < cap.date);
      // Un bloc par course confirmée ou option isolée, un par groupe d'options.
      const blocs = new Set(avant.map(c => (c.statut === 'option' && c.groupe_options ? 'g:' + c.groupe_options : c.id)));
      objectif = {
        nom: cap.nom,
        distance: cap.distance != null ? Number(cap.distance) : null,
        dplus: cap.type === 'trail' && cap.dplus != null ? cap.dplus : null,
        date: cap.date_approx ? cap.date.slice(0, 7) : cap.date,
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
      prochaine: prochaine ? { nom: window.mrtNomCourse(prochaine), date: prochaine.date } : null,
      modules
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
  window.mrtPage = async function (opts) {
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
    let courses = [];
    try { courses = await lireCourses(qui); } catch (err) { console.warn('Courses : lecture impossible', err); }
    window.renderEnTete(Object.assign(configEnTete(prefs, courses), { courant: opts.courant }));
    if (prefs && prefs.theme && window.appliquerTheme) window.appliquerTheme(prefs.theme);
    if (proprietaire) bandeau(proprietaire.prenom);
    return {
      session, courses, lectureSeule: !!proprietaire, proprietaire,
      relire: () => lireCourses(qui)
    };
  };
})();
