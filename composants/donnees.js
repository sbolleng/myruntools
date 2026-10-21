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

  async function lireCourses() {
    const db = window.mrtSupabase;
    const [courses, sous, types, circuits] = await Promise.all([
      db.from('courses').select('*'),
      db.from('sous_categories').select('id, type, libelle'),
      db.from('types_course').select('id, libelle'),
      db.from('courses_circuits').select('*')
    ]);
    for (const r of [courses, sous, types, circuits]) if (r.error) throw r.error;
    const typeLib = Object.fromEntries(types.data.map(t => [t.id, t.libelle]));
    const sc = Object.fromEntries(sous.data.map(s => [s.id, s]));
    return courses.data.map(c => Object.assign({}, c, {
      type: c.sous_categorie && sc[c.sous_categorie] ? sc[c.sous_categorie].type : null,
      typeLibelle: c.sous_categorie && sc[c.sous_categorie] ? typeLib[sc[c.sous_categorie].type] : null,
      sousLibelle: c.sous_categorie && sc[c.sous_categorie] ? sc[c.sous_categorie].libelle : null,
      circuits: circuits.data.filter(x => x.course === c.id)
    }));
  }

  // Nom affiché : « Événement · Parcours », ou le seul nom s'ils se confondent.
  window.mrtNomCourse = c => (c.evenement && c.evenement !== c.nom ? c.evenement + ' · ' : '') + c.nom;

  // En-tête depuis les courses : cap choisi, sinon la course à venir la plus
  // lointaine de la page Objectif (modèle de données, § 7).
  function configEnTete(session, courses) {
    const auj = today();
    const aVenir = courses.filter(c => PLAN.has(c.statut) && c.etat === 'a_venir' && c.date && c.date >= auj)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const prefs = session.preferences || {};
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
      prochaine: prochaine ? { nom: prochaine.nom, date: prochaine.date } : null,
      modules
    };
  }

  window.mrtPage = async function (opts) {
    const session = await window.mrtSession();
    if (!session) return new Promise(() => {}); // renvoi vers la connexion en cours
    let courses = [];
    try { courses = await lireCourses(); } catch (err) { console.warn('Courses : lecture impossible', err); }
    window.renderEnTete(Object.assign(configEnTete(session, courses), { courant: opts.courant }));
    return { session, courses };
  };
})();
