// ===== Nutrition : la page (besoin du jour, ajout d'un aliment, journal) et le bloc d'En un coup d'œil =====
//
// docs/module-nutrition-specification.md, § 4 et 4.7. À charger après besoin.js et preparation.js (profil-champs.js
// en plus pour la page).
//   renderNutrition(el, { profil, id, courses, semaines, seances })   la page
//   renderNutritionAccueil(el, { profil, id, courses, semaines, lectureSeule })   le bloc d'En un coup d'œil
// Données, dans Supabase : `aliments` (favoris, récents), `repas_lignes` (le journal, jour par jour), `sport_jour` (le
// sport de chaque jour). Recherche : les aliments de l'utilisateur (pendant la frappe), puis Open Food Facts (valeurs pour
// 100 g) par le relais Supabase « recherche-aliments ».
(function () {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const decaler = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // 2 117 : espace insécable comme séparateur de milliers.
  const n0 = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const plage = r => n0(r[0]) + '–' + n0(r[1]);
  const virgule = x => String(x).replace('.', ',');
  const arrondi = x => Math.round(x * 10) / 10;
  const nombre = t => parseFloat(String(t == null ? '' : t).trim().replace(',', '.'));
  const ERREUR = 'Enregistrement impossible pour l\'instant.';
  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const titreJour = s => { const d = parse(s); return JOURS[d.getDay()] + ' ' + (d.getDate() === 1 ? '1er' : d.getDate()) + ' ' + MOIS[d.getMonth()]; };
  // Tolérance autour du besoin en calories : la jauge est « dans la cible » de 100 à 110 % du besoin.
  const TOLERANCE_KCAL = 1.1;
  const OFF = 'https://world.openfoodfacts.org/cgi/search.pl';

  const REPAS = [['petit_dej', 'Petit-déj'], ['midi', 'Midi'], ['encas', 'Encas'], ['soir', 'Soir']];
  const NOM_REPAS = Object.fromEntries(REPAS);
  const repasDe = d => { const h = d.getHours(); return h < 10 ? 'petit_dej' : h < 15 ? 'midi' : h < 18 ? 'encas' : 'soir'; };
  // Un aliment donné pour 100 g se dose en grammes ; les autres en portions.
  const enGrammes = a => a.portion === '100 g';

  function uuid() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // ----- Phase d'un jour -----
  // Celle du plan (Base, Développement, Affûtage, Deload : même règle que le Calendrier) ; de J-3 à J-1 avant la
  // prochaine course confirmée, Carbo-loading puis Veille de course, qui changent la part des glucides.
  function phaseDuJour(ctx, jour) {
    const B = window.mrtBesoin, P = window.mrtPreparation;
    const prochaine = (ctx.courses || []).filter(c => c.statut === 'confirmee' && c.etat === 'a_venir' && c.date && !c.date_approx && c.date > jour)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    const jours = prochaine ? Math.round((parse(prochaine.date) - parse(jour)) / 86400000) : null;
    const calc = B.phaseDuJour(jours);
    if (calc === 'carbo' || calc === 'veille') return { calc, libelle: B.PHASES[calc].libelle };
    // Phase de la semaine dans le plan de saison (spécification Préparation, § 4), Récupération et Entretien compris.
    const sem = P ? P.phaseDe(P.planSaison({ courses: ctx.courses || [], semaines: ctx.semaines || [] }), P.lundiDe(jour)) : null;
    return { calc: 'train', libelle: sem ? P.NOM_PHASE[sem.phase] : 'Entraînement' };
  }

  // ----- Lectures et écritures -----
  const sb = () => window.mrtSupabase;
  async function lireJour(id, jour) {
    const [l, s] = await Promise.all([
      sb().from('repas_lignes').select('*').eq('utilisateur', id).eq('date', jour),
      sb().from('sport_jour').select('*').eq('utilisateur', id).eq('date', jour)
    ]);
    if (l.error) throw l.error;
    // Sport illisible (table absente tant que l'évolution 022 n'est pas passée) : le journal s'affiche quand même.
    if (s.error) console.warn('Nutrition : sport du jour illisible', s.error);
    return { lignes: l.data || [], sports: (s.error ? [] : s.data || []).filter(x => window.mrtBesoin.SPORTS[x.type]).map(x => ({ type: x.type, heures: Number(x.heures) })) };
  }
  async function lireAliments(id) {
    const { data, error } = await sb().from('aliments').select('*').eq('utilisateur', id);
    if (error) throw error;
    return data || [];
  }
  // VMA pour la vitesse d'une course sans distance : celle du profil, sinon celle du profil d'entraînement (Préparation).
  async function lireVma(id, profil) {
    if (Number(profil && profil.vma) > 0) return Number(profil.vma);
    try { const { data } = await sb().from('profil_entrainement').select('vma').eq('utilisateur', id).maybeSingle(); return data && Number(data.vma) > 0 ? Number(data.vma) : null; }
    catch (e) { return null; }
  }
  // L'activité qui compte dans le besoin d'un jour : les séances du Calendrier (course à pied, renforcement), puis les
  // autres sports, saisis dans Nutrition.
  function activiteDuJour(autres, seances, jour, aujourdhui, vma) {
    const B = window.mrtBesoin;
    return B.seancesQuiComptent(seances, jour, aujourdhui).map(x => B.activiteSeance(x, vma)).filter(Boolean).concat(autres);
  }
  // Une ligne du journal (valeurs figées), puis le dernier usage de l'aliment (il remonte dans Récents).
  async function ajouterLigne(aliment, jour, repas, quantite) {
    const ligne = { id: uuid(), date: jour, repas, aliment: aliment.id, nom: aliment.nom, quantite: Math.round(quantite * 100) / 100,
      kcal: arrondi(quantite * aliment.kcal), proteines: arrondi(quantite * aliment.proteines), glucides: arrondi(quantite * aliment.glucides), lipides: arrondi(quantite * aliment.lipides) };
    const r1 = await sb().from('repas_lignes').insert(ligne);
    if (r1.error) throw r1.error;
    const quand = new Date().toISOString();
    const r2 = await sb().from('aliments').update({ dernier_usage: quand }).eq('id', aliment.id);
    if (r2.error) console.warn('Nutrition : dernier usage non rangé', r2.error);
    else aliment.dernier_usage = quand;
    return ligne;
  }
  const recentsDe = aliments => aliments.filter(a => a.dernier_usage).sort((x, y) => (x.dernier_usage < y.dernier_usage ? 1 : -1));
  const favorisDe = aliments => aliments.filter(a => a.favori).sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
  const total = (lignes, c) => lignes.reduce((t, l) => t + Number(l[c] || 0), 0);

  // ----- Recherche -----
  // Dans les aliments de l'utilisateur : chaque mot utile de la recherche commence un mot du nom, sans accent ni pluriel
  // (« oeufs au plat » trouve « Œuf au plat »).
  const VIDES = new Set(['a', 'au', 'aux', 'de', 'des', 'du', 'd', 'en', 'et', 'la', 'le', 'les', 'l', 'un', 'une', 'avec']);
  const mots = t => String(t).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(m => m && !VIDES.has(m)).map(m => (m.length > 3 ? m.replace(/[sx]$/, '') : m));
  function chercherChezMoi(aliments, texte) {
    const q = mots(texte);
    if (!q.length) return [];
    return aliments.filter(a => { const n = mots(a.nom); return q.every(m => n.some(x => x.startsWith(m))); })
      .sort((x, y) => (y.dernier_usage || '').localeCompare(x.dernier_usage || '')).slice(0, 6);
  }
  // Produits d'Open Food Facts, valeurs pour 100 g, par le relais Supabase « recherche-aliments »
  // (supabase/functions/recherche-aliments) ; s'il ne répond pas, l'ancien moteur d'Open Food Facts, directement, avec un
  // nouvel essai. Les recherches déjà faites sont gardées pendant la visite (sessionStorage).
  // Clé liée à la version du site : une nouvelle mise en ligne (relais ou filtre changés) efface les recherches gardées.
  const versionSite = () => { const m = document.querySelector('meta[name="site-version"]'); return m ? m.content : ''; };
  const CLE_RECHERCHES = 'mrt-nutri-recherches-' + versionSite();
  const memoire = () => { try { return JSON.parse(sessionStorage.getItem(CLE_RECHERCHES)) || {}; } catch (e) { return {}; } };
  // Les recherches gardées par une version précédente du site sont retirées.
  try { Object.keys(sessionStorage).filter(k => k.startsWith('mrt-nutri-recherches') && k !== CLE_RECHERCHES).forEach(k => sessionStorage.removeItem(k)); } catch (e) { /* stockage indisponible */ }
  function retenir(q, produits) {
    try {
      const m = memoire(); delete m[q]; m[q] = produits;
      const cles = Object.keys(m); while (cles.length > 30) delete m[cles.shift()];
      sessionStorage.setItem(CLE_RECHERCHES, JSON.stringify(m));
    } catch (e) { /* stockage indisponible */ }
  }
  // Chaque mot tapé, même commencé, commence un mot du nom ou de la marque (« yaourt na » : « Yaourt nature », pas la marque « NA »).
  const repond = (r, q) => { const n = mots(r.nom + ' ' + r.marque); return mots(q).every(m => n.some(x => x.startsWith(m))); };
  function normaliser(liste, q) {
    const vus = new Set(), sortie = [];
    for (const p of liste || []) {
      const n = p.nutriments || {}, nom = String(p.product_name_fr || p.product_name || '').trim();
      const kcal = n['energy-kcal_100g'] != null ? Number(n['energy-kcal_100g']) : n.energy_100g != null ? Number(n.energy_100g) / 4.184 : NaN;
      const marque = String((Array.isArray(p.brands) ? p.brands : String(p.brands || '').split(','))[0] || '').trim();
      const v = k => (Number.isFinite(Number(n[k])) ? arrondi(Number(n[k])) : 0), sq = Number(p.serving_quantity);
      const cle = (nom + '|' + marque).toLowerCase();
      if (!nom || !Number.isFinite(kcal) || kcal < 0 || kcal > 1000 || vus.has(cle)) continue;
      const r = { nom, marque };
      if (q && !repond(r, q)) continue;
      vus.add(cle);
      sortie.push({ nom, marque, kcal: arrondi(kcal), proteines: v('proteins_100g'), glucides: v('carbohydrates_100g'), lipides: v('fat_100g'), portionG: sq >= 5 && sq <= 1000 ? Math.round(sq) : 100 });
      if (sortie.length === 8) break;
    }
    return sortie;
  }
  async function ancienMoteur(texte) {
    const q = new URLSearchParams({ search_terms: texte, search_simple: '1', action: 'process', json: '1', page_size: '20', sort_by: 'unique_scans_n', lc: 'fr', cc: 'fr',
      fields: 'code,product_name,product_name_fr,brands,nutriments,serving_quantity' });
    for (let essai = 0; essai < 2; essai++) {
      if (essai) await new Promise(r => setTimeout(r, 800));
      try {
        const r = await fetch(OFF + '?' + q.toString());
        if (r.ok) return normaliser((await r.json()).products, texte);
      } catch (err) { /* refusé ou saturé : nouvel essai */ }
    }
    throw new Error('Open Food Facts saturé');
  }
  // Pendant la frappe, seul le relais est interrogé (l'ancien moteur limite les recherches) ; s'il ne répond pas, la
  // frappe ne cherche plus que dans mes aliments, et les produits attendent la validation (Entrée ou « Chercher »).
  let relaisOk = true;
  async function chercherProduits(texte, enFrappe) {
    const cle = texte.toLowerCase();
    const garde = memoire()[cle];
    if (garde) return garde;
    let produits = null;
    try {
      const { data, error } = await sb().functions.invoke('recherche-aliments', { body: { q: texte } });
      if (!error && data && Array.isArray(data.produits)) { produits = data.produits; relaisOk = true; }
      else if (error) { console.warn('Nutrition : relais de recherche indisponible', error); relaisOk = false; }
    } catch (err) { console.warn('Nutrition : relais de recherche indisponible', err); relaisOk = false; }
    if (!produits && enFrappe) throw new Error('relais indisponible pendant la frappe');
    if (!produits) produits = await ancienMoteur(texte);
    if (produits.length) retenir(cle, produits); // une recherche vide n'est pas gardée : elle sera refaite
    return produits;
  }

  // ----- Séances du Calendrier : la durée, quand le libellé la donne clairement (« 45 min », « 1 h 30 », « 1h ») -----
  // 1 → « 1 h », 1,5 → « 1 h 30 », 0,5 → « 30 min ».
  function duree(h) { const m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60; return hh ? hh + ' h' + (mm ? ' ' + pad(mm) : '') : mm + ' min'; }


  // Pictos des cases Activité et Repas : dessinés en trait fin, comme les icônes du site.
  const picto = d => '<svg class="nu-tuile-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const PICTO_HALTERE = picto('M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12');
  const PICTO_ASSIETTE = picto('M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15M2.5 4v6.5M1.5 4v3.5h2V4M2.5 10.5v9.5M21.5 4c-1.4 1.4-1.6 4.5-1.6 6.5h1.6v9.5');

  // ----- Jauges en anneau -----
  // Sous le minimum : « Reste … » ; entre le minimum et le maximum : « Dans la cible » ; au-delà : « Dépassé de … ».
  const R = 42, C = 2 * Math.PI * R;
  const arc = (a, b) => 'stroke-dasharray="' + (Math.max(0, b - a) * C).toFixed(2) + ' ' + C.toFixed(2) + '" transform="rotate(' + (a * 360).toFixed(2) + ' 50 50)"';
  function jauge(cle, nom, mange, min, max, unite, besoin) {
    const echelle = max * 1.15, f = x => Math.max(0, Math.min(1, x / echelle));
    const etat = mange < min ? 'sous' : mange <= max ? 'cible' : 'alerte';
    const u = unite === 'kcal' ? ' kcal' : ' g';
    const reste = etat === 'sous' ? 'Reste ' + n0(min - mange) + u : etat === 'cible' ? 'Dans la cible' : 'Dépassé de ' + n0(mange - max) + u;
    return '<div class="nu-jauge" data-jauge="' + cle + '" data-etat="' + etat + '"><p class="nu-jauge-nom">' + nom + '</p>' +
      '<div class="nu-anneau" role="img" aria-label="' + nom + ' : ' + n0(mange) + u + '"><svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="nu-anneau-fond" cx="50" cy="50" r="' + R + '"/>' +
      '<circle class="nu-anneau-zone" cx="50" cy="50" r="' + R + '" ' + arc(f(min), f(max)) + '/>' +
      (mange > 0 ? '<circle class="nu-anneau-rempli" cx="50" cy="50" r="' + R + '" ' + arc(0, f(mange)) + '/>' : '') + '</svg>' +
      '<span class="nu-anneau-v">' + n0(mange) + (unite === 'kcal' ? '' : ' g') + '</span></div>' +
      '<p class="nu-jauge-reste">' + reste + '</p><p class="nu-jauge-besoin">Besoin ' + besoin + u + '</p></div>';
  }

  // ===================== La page =====================
  window.renderNutrition = async function (el, ctx) {
    const B = window.mrtBesoin;
    const aujourdhui = iso(new Date());
    const redessiner = profil => renderNutrition(el, Object.assign({}, ctx, { profil }));
    if (B.manquants(ctx.profil, aujourdhui).length) {
      window.mrtProfilEncart(el, { profil: ctx.profil, id: ctx.id, surEnregistre: redessiner });
      return;
    }
    const S = { jour: aujourdhui, aliments: [], lignes: [], sports: [], lignesSport: [null], source: null, choix: null, repas: repasDe(new Date()), msg: '', msgSport: '',
      erreurLecture: false, recherche: { texte: '', etat: null, mes: [], resultats: [] } };
    try {
      const [aliments, j, vma] = await Promise.all([lireAliments(ctx.id), lireJour(ctx.id, S.jour), lireVma(ctx.id, ctx.profil)]);
      S.aliments = aliments; S.lignes = j.lignes; S.sports = j.sports; S.vma = vma;
    } catch (err) { console.warn('Nutrition : lecture impossible', err); S.erreurLecture = true; }
    S.lignesSport = S.sports.concat([null]);
    S.source = S.aliments.some(x => x.dernier_usage) ? 'recents' : S.aliments.some(x => x.favori) ? 'favoris' : 'libre';

    S.seances = (ctx.seances || []).slice();
    const besoin = () => B.calculer(ctx.profil, { date: S.jour, sports: activiteDuJour(S.sports, S.seances, S.jour, aujourdhui, S.vma), phase: phaseDuJour(ctx, S.jour).calc });
    const trouver = id => S.aliments.find(a => a.id === id);
    const choisi = () => S.choix && (S.choix.aliment || trouver(S.choix.id));
    // Séances du jour (sans les propositions de l'IA en attente) ; un jour passé, une séance non faite ne compte pas.
    const seancesDuJour = () => S.seances.filter(x => x.date === S.jour && x.etat !== 'proposee');
    const compte = x => S.jour >= aujourdhui || x.faite;
    const P = window.mrtPreparation;
    const texteSeance = x => [x.libelle, P.TYPES[x.type], x.duree_min ? duree(x.duree_min / 60) : '', x.distance_km ? virgule(Number(x.distance_km)) + ' km' : ''].filter(Boolean).filter((v, i, t) => t.indexOf(v) === i).join(' · ');
    // La fenêtre de séance du Calendrier, ouverte depuis Nutrition ; après un enregistrement, les séances sont relues.
    const calendrier = { get seances() { return S.seances; }, actualiser: async () => {
      try { S.seances = (await window.mrtLirePlan(ctx.id)).seances; } catch (err) { console.warn('Nutrition : séances illisibles', err); }
      chiffres(); dessinerJournal(); dessinerActivite();
    } };

    // ----- Carte du besoin : le jour, le besoin, la phase, le profil du calcul, les jauges, puis Activité et Repas -----
    function htmlProfil() {
      const p = ctx.profil, act = (B.ACTIVITES[p.activite].libelle || '').split(' · ')[0].toLowerCase();
      return [p.sexe === 'femme' ? 'F' : 'H', virgule(Number(p.poids)) + ' kg', p.taille + ' cm', act].join(' · ') + ' ›';
    }

    const ligneSport = s => '<div class="nu-sport-l"><select class="mrt-champ" name="type" aria-label="Sport"><option value="">Sport…</option>' +
      Object.entries(B.SPORTS).filter(x => !x[1].seance || (s && s.type === x[0])).map(x => '<option value="' + x[0] + '"' + (s && s.type === x[0] ? ' selected' : '') + '>' + esc(x[1].libelle) + '</option>').join('') + '</select>' +
      '<span class="nu-unite"><input class="mrt-champ" name="heures" type="text" inputmode="decimal" aria-label="Durée en heures" value="' + (s && s.heures ? virgule(s.heures) : '') + '">h</span></div>';
    function htmlBesoin() {
      const estAuj = S.jour === aujourdhui;
      // « » » à droite de « › », un autre jour que le jour même ; une cale de même taille à gauche garde le jour centré.
      const AUJ = '<svg class="mrt-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5L8 8l-4.5 4.5M8.5 3.5L13 8l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      return '<div class="nu-jour"><span class="nu-jour-cale" aria-hidden="true"></span><button type="button" class="mrt-rond" data-act="veille" aria-label="Jour précédent">' + mrtIcone.gauche + '</button>' +
        '<h2 class="nu-jour-t">' + titreJour(S.jour) + '</h2>' +
        '<button type="button" class="mrt-rond" data-act="lendemain" aria-label="Jour suivant"' + (estAuj ? ' disabled' : '') + '>' + mrtIcone.droite + '</button>' +
        (estAuj ? '<span class="nu-jour-cale" aria-hidden="true"></span>' : '<button type="button" class="mrt-rond" data-act="aujourdhui" aria-label="Aujourd\'hui" title="Aujourd\'hui">' + AUJ + '</button>') + '</div>' +
        '<p class="nu-kcal"><span class="nu-kcal-val"></span> kcal</p><p class="nu-phase"></p>' +
        '<p class="nu-calcule"><button type="button" class="mrt-lien nu-profil-l" data-act="profil">Calculé pour ' + esc(htmlProfil()) + '</button></p>' +
        '<div class="nu-anneaux"></div>' +
        '<div class="nu-tuiles"><button type="button" class="nu-tuile" data-act="activite">' + PICTO_HALTERE + '<span class="nu-tuile-l">Activité</span><span class="nu-tuile-v">' + mrtIcone.plus + 'Ajouter</span></button>' +
        '<button type="button" class="nu-tuile" data-act="ajout-repas">' + PICTO_ASSIETTE + '<span class="nu-tuile-l">Repas</span><span class="nu-tuile-v">' + mrtIcone.plus + 'Ajouter</span></button></div>' +
        '<p class="nu-msg nu-msg-sport" role="alert">' + esc(S.msgSport) + '</p>';
    }
    // Feuille Activité : les séances du jour (celles du Calendrier, sa fenêtre pour les ajouter ou les modifier), puis les autres sports.
    function htmlActivite() {
      const ss = seancesDuJour();
      return '<p class="nu-sous-t">Séances</p>' + (ss.length ? '<ul class="nu-lignes nu-seances-f">' + ss.map(x => '<li><button type="button" class="nu-ligne" data-act="seance" data-id="' + x.id + '"><span class="nu-ligne-nom">' + esc(texteSeance(x)) + '</span></button></li>').join('') + '</ul>' : '') +
        '<button type="button" class="mrt-btn nu-ajout-seance" data-act="ajout-seance">' + mrtIcone.plus + 'Ajouter une séance</button>' +
        '<p class="nu-sous-t">Autres sports</p><div class="nu-sports">' + S.lignesSport.map(ligneSport).join('') + '</div><p class="nu-msg" role="alert">' + esc(S.msgSport) + '</p>';
    }
    function htmlJauges(r) {
      return jauge('kcal', 'Calories', total(S.lignes, 'kcal'), r.kcal, r.kcal * TOLERANCE_KCAL, 'kcal', n0(r.kcal)) +
        jauge('p', 'Protéines', total(S.lignes, 'proteines'), r.proteines[0], r.proteines[1], 'g', plage(r.proteines)) +
        jauge('g', 'Glucides', total(S.lignes, 'glucides'), r.glucides[0], r.glucides[1], 'g', plage(r.glucides)) +
        jauge('l', 'Lipides', total(S.lignes, 'lipides'), r.lipides[0], r.lipides[1], 'g', plage(r.lipides));
    }
    // ----- Carte 2 : ajouter un aliment -----
    const detail = a => esc(a.nom) + (a.portion && !enGrammes(a) ? ' · ' + esc(a.portion) : '');
    const kcalDe = a => n0(a.kcal) + ' kcal' + (enGrammes(a) ? ' / 100 g' : '');
    const boutonAliment = a => '<button type="button" class="nu-aliment" data-act="choisir" data-id="' + a.id + '"' + (S.choix && S.choix.id === a.id ? ' aria-pressed="true"' : '') + '>' +
      '<span>' + detail(a) + '</span><span class="nu-aliment-k">' + kcalDe(a) + '</span></button>';
    function htmlMes() {
      const m = S.recherche.mes;
      return m.length ? '<p class="nu-sous-t">Mes aliments</p><div class="nu-liste">' + m.map(boutonAliment).join('') + '</div>' : '';
    }
    function htmlProduits() {
      const R0 = S.recherche;
      if (R0.etat === 'cours') return '<p class="nu-vide">Recherche…</p>';
      if (R0.etat === 'erreur') return '<p class="nu-vide">Open Food Facts est saturé, réessaie dans un instant.</p>';
      if (R0.etat === 'ok' && !R0.resultats.length) return R0.mes.length ? '' : '<p class="nu-vide">Aucun résultat.</p>';
      if (R0.etat !== 'ok') return '';
      return (R0.mes.length ? '<p class="nu-sous-t">Produits</p>' : '') + '<div class="nu-liste nu-off">' + R0.resultats.map((p, i) => '<button type="button" class="nu-aliment" data-act="resultat" data-i="' + i + '">' +
        '<span>' + esc(p.nom) + (p.marque ? ' <span class="nu-marque">· ' + esc(p.marque) + '</span>' : '') + '</span><span class="nu-aliment-k">' + n0(p.kcal) + ' kcal / 100 g</span></button>').join('') + '</div>';
    }
    function htmlRecherche() {
      return '<form class="nu-recherche" role="search"><input class="mrt-champ" type="search" name="q" placeholder="Rechercher un aliment…" aria-label="Rechercher un aliment" value="' + esc(S.recherche.texte) + '" autocomplete="off" enterkeyhint="search">' +
        '<button type="submit" class="mrt-btn">Chercher</button></form><div class="nu-resultats"><div class="nu-mes">' + htmlMes() + '</div><div class="nu-produits">' + htmlProduits() + '</div></div>';
    }
    // Aperçu de la quantité saisie : calories et macros, comme elles seront figées à l'ajout.
    function apercu(a, q0) {
      if (!(q0 > 0)) return null;
      const k = enGrammes(a) ? q0 / 100 : q0, v = c => Math.round((Number(a[c]) || 0) * k);
      return { kcal: v('kcal'), p: v('proteines'), g: v('glucides'), l: v('lipides') };
    }
    const texteApercu = x => x ? n0(x.kcal) + ' kcal · P ' + x.p + ' g · G ' + x.g + ' g · L ' + x.l + ' g' : '';
    const texteAjouter = x => 'Ajouter' + (x ? ' · ' + n0(x.kcal) + ' kcal' : '');
    function majApercu() {
      const a = choisi(), z = zoneAjout();
      if (!a || !z || !z.querySelector('.nu-apercu')) return;
      const x = apercu(a, lireQuantite());
      z.querySelector('.nu-apercu').textContent = texteApercu(x);
      z.querySelector('.nu-ajouter').textContent = texteAjouter(x);
    }
    function htmlChoix() {
      const a = choisi();
      if (!a) return '';
      const g = enGrammes(a), x = apercu(a, S.choix.quantite);
      return '<div class="nu-choix"><div class="nu-choix-tete"><div><p class="nu-choix-nom">' + detail(a) + '</p><p class="nu-choix-k">' + kcalDe(a) + '</p></div>' +
        '<button type="button" class="mrt-rond nu-fav" data-act="favori" aria-pressed="' + !!a.favori + '" aria-label="Favori" title="Favori">' + (a.favori ? '★' : '☆') + '</button></div>' +
        '<p class="nu-choix-l">Quantité</p>' +
        '<div class="nu-quantite"><button type="button" class="mrt-rond" data-act="moins" aria-label="Moins">' + mrtIcone.moins + '</button>' +
        '<span class="nu-unite"><input class="mrt-champ nu-qte" name="quantite" type="text" inputmode="decimal" aria-label="Quantité" value="' + virgule(S.choix.quantite) + '">' + (g ? 'g' : 'portion' + (S.choix.quantite > 1 ? 's' : '')) + '</span>' +
        '<button type="button" class="mrt-rond" data-act="plus" aria-label="Plus">' + mrtIcone.plus + '</button></div>' +
        '<p class="nu-apercu" aria-live="polite">' + texteApercu(x) + '</p>' +
        '<p class="nu-choix-l">Repas</p>' +
        '<div class="nu-repas-choix">' + REPAS.map(r => '<button type="button" class="mrt-pastille" data-act="repas" data-repas="' + r[0] + '" aria-pressed="' + (S.repas === r[0]) + '">' + r[1] + '</button>').join('') + '</div>' +
        '<button type="button" class="mrt-btn is-principal nu-ajouter" data-act="ajouter">' + texteAjouter(x) + '</button></div>';
    }
    function htmlAjout() {
      // Étape 2 : l'aliment choisi (quantité, favori, repas, Ajouter) ; « ‹ » ramène à l'étape 1.
      if (choisi()) return htmlChoix() + '<p class="nu-msg" role="alert">' + esc(S.msg) + '</p>';
      const sources = [['recents', 'Récents'], ['favoris', 'Favoris'], ['libre', '+ Aliment libre']];
      let corps = '';
      if (S.source === 'libre') {
        corps = '<form class="nu-libre" novalidate>' +
          '<label class="nu-champ"><span class="pf-libelle">Nom</span><input class="mrt-champ" name="nom" maxlength="100" autocomplete="off"></label>' +
          '<label class="nu-champ"><span class="pf-libelle">Portion</span><input class="mrt-champ" name="portion" maxlength="50" placeholder="1 pièce, 100 g…" autocomplete="off"></label>' +
          '<div class="nu-grille">' + [['kcal', 'Calories (kcal)'], ['proteines', 'Protéines (g)'], ['glucides', 'Glucides (g)'], ['lipides', 'Lipides (g)']].map(c =>
            '<label class="nu-champ"><span class="pf-libelle">' + c[1] + '</span><input class="mrt-champ" name="' + c[0] + '" type="text" inputmode="decimal" autocomplete="off"></label>').join('') + '</div>' +
          '<label class="mrt-pastille nu-favori-case"><input type="checkbox" name="favori">★ Favori</label>' +
          '<button type="submit" class="mrt-btn is-principal">Ajouter l\'aliment</button></form>';
      } else {
        const liste = S.source === 'favoris' ? favorisDe(S.aliments) : recentsDe(S.aliments).slice(0, 8);
        corps = liste.length ? '<div class="nu-liste">' + liste.map(boutonAliment).join('') + '</div>'
          : '<p class="nu-vide">' + (S.source === 'favoris' ? 'Aucun favori.' : 'Aucun aliment récent.') + '</p>';
      }
      return htmlRecherche() +
        '<div class="nu-sources">' + sources.map(s => '<button type="button" class="mrt-pastille" data-act="source" data-source="' + s[0] + '" aria-pressed="' + (S.source === s[0]) + '">' + s[1] + '</button>').join('') + '</div>' +
        '<div class="nu-source">' + corps + '</div><p class="nu-msg" role="alert">' + esc(S.msg) + '</p>';
    }
    // ----- Carte 3 : journal du jour -----
    // Journal : les quatre repas, puis l'activité ; chaque ligne se touche pour la modifier ou la supprimer ; un « + » par section.
    const qteLigne = l => { const a = trouver(l.aliment); return a && enGrammes(a) ? n0(Number(l.quantite) * 100) + ' g' : Number(l.quantite) !== 1 ? virgule(Number(l.quantite)) + ' portions' : ''; };
    const ligneSportTexte = x => B.SPORTS[x.type].libelle + ' · ' + duree(x.heures);
    function htmlJournal() {
      const tete = (nom, droite, plus) => '<p class="nu-repas-t"><span>' + nom + '</span><span class="nu-repas-d">' + droite + plus + '</span></p>';
      const plus = (act, repas, nom) => '<button type="button" class="mrt-rond is-petit" data-act="' + act + '"' + (repas ? ' data-repas="' + repas + '"' : '') + ' aria-label="Ajouter : ' + nom + '">' + mrtIcone.plus + '</button>';
      const ligne = (attrs, nom, droite) => '<li><button type="button" class="nu-ligne" ' + attrs + '><span class="nu-ligne-nom">' + nom + '</span>' + (droite ? '<span class="nu-ligne-k">' + droite + '</span>' : '') + '</button></li>';
      const repas = REPAS.map(r => {
        const ls = S.lignes.filter(l => l.repas === r[0]);
        return '<div class="nu-repas">' + tete(r[1], ls.length ? '<span>' + n0(ls.reduce((t, l) => t + Number(l.kcal), 0)) + ' kcal</span>' : '', plus('ajout-repas', r[0], r[1])) +
          (ls.length ? '<ul class="nu-lignes">' + ls.map(l => { const q = qteLigne(l); return ligne('data-act="ligne" data-id="' + l.id + '"', esc(l.nom) + (q ? ' · ' + q : ''), n0(l.kcal) + ' kcal'); }).join('') + '</ul>' : '') + '</div>';
      }).join('');
      const ss = seancesDuJour();
      const lignesSeances = ss.map(x => '<li class="nu-seance-l' + (compte(x) ? '' : ' is-non-comptee') + '"><label class="nu-faite"><input type="checkbox" data-faite="' + x.id + '"' + (x.faite ? ' checked' : '') + ' aria-label="Faite : ' + esc(x.libelle) + '"></label>' +
        '<button type="button" class="nu-ligne" data-act="seance" data-id="' + x.id + '"><span class="nu-ligne-nom">' + esc(texteSeance(x)) + '</span>' + (compte(x) ? '' : '<span class="nu-ligne-k">non faite</span>') + '</button></li>').join('');
      const lignesAutres = S.sports.map((x, i) => ligne('data-act="ligne-sport" data-i="' + i + '"', esc(ligneSportTexte(x)), '')).join('');
      const activite = '<div class="nu-repas nu-activites">' + tete('Activité', '', plus('activite', null, 'Activité')) +
        (lignesSeances || lignesAutres ? '<ul class="nu-lignes">' + lignesSeances + lignesAutres + '</ul>' : '') + '</div>';
      return '<h2 class="nu-titre">Journal du jour</h2>' + (S.erreurLecture ? '<p class="nu-msg" role="alert">Lecture impossible pour l\'instant.</p>' : '') + repas + activite;
    }

    // Les cartes se redessinent chacune à leur tour : une saisie en cours (sport, recherche) garde sa place.
    el.innerHTML = '<section class="card nu-carte nu-besoin"></section><section class="card nu-carte nu-journal"></section>';
    const carte = c => el.querySelector('.nu-' + c);
    // Feuilles « Repas » (ajouter un aliment) et « Activité » : la feuille d'une course (modale-course.css), plein écran sur
    // téléphone, la croix en haut à droite ; la page reste dessous, à jour.
    let feuille = null;
    const zoneAjout = () => (feuille && feuille.type === 'repas' ? feuille.corps : null);
    const zoneActivite = () => (feuille && feuille.type === 'activite' ? feuille.corps : null);
    function chiffres() {
      const r = besoin();
      carte('besoin').querySelector('.nu-kcal-val').textContent = n0(r.kcal);
      carte('besoin').querySelector('.nu-phase').textContent = 'Phase · ' + phaseDuJour(ctx, S.jour).libelle;
      carte('besoin').querySelector('.nu-anneaux').innerHTML = htmlJauges(r);
    }
    const dessinerBesoin = () => { carte('besoin').innerHTML = htmlBesoin(); chiffres(); };
    const dessinerAjout = () => {
      const z = zoneAjout();
      if (!z) return;
      z.innerHTML = htmlAjout();
      feuille.voile.querySelector('.nu-retour').hidden = !choisi();
    };
    const dessinerActivite = () => { const z = zoneActivite(); if (z) z.innerHTML = htmlActivite(); };
    const dessinerJournal = () => { carte('journal').innerHTML = htmlJournal(); };
    function tout() { dessinerBesoin(); dessinerAjout(); dessinerActivite(); dessinerJournal(); }
    function ouvrirFeuille(type) {
      fermerFeuille();
      const voile = document.createElement('div');
      voile.className = 'mc-voile';
      voile.innerHTML = '<div class="mc-panneau nu-feuille" role="dialog" aria-modal="true" aria-labelledby="nu-feuille-titre" tabindex="-1"><div class="mc-corps">' +
        '<div class="pc-barre"><button type="button" class="mrt-rond nu-retour" data-act="retour" aria-label="Retour à la recherche" title="Retour" hidden>' + mrtIcone.gauche + '</button>' +
        '<button type="button" class="mrt-rond is-fermer" data-act="fermer" aria-label="Fermer" title="Fermer">' + mrtIcone.fermer + '</button></div>' +
        '<p class="fc-libelle" id="nu-feuille-titre">' + (type === 'repas' ? 'Ajouter un aliment' : 'Ajouter une activité') + '</p>' +
        '<div class="' + (type === 'repas' ? 'nu-ajout' : 'nu-activite') + '"></div></div></div>';
      document.body.appendChild(voile);
      document.documentElement.classList.add('mc-ouvert');
      feuille = { type, voile, corps: voile.querySelector(type === 'repas' ? '.nu-ajout' : '.nu-activite') };
      brancher(voile);
      voile.addEventListener('mousedown', e => { if (e.target === voile) fermerFeuille(); });
      voile.addEventListener('input', e => { if (e.target.classList.contains('nu-qte')) majApercu(); });
      if (type === 'repas') dessinerAjout(); else dessinerActivite();
      voile.querySelector('.mc-panneau').focus();
    }
    function fermerFeuille() {
      if (!feuille) return;
      if (feuille.type === 'activite' && aRanger) enregistrerSport();
      feuille.voile.remove();
      document.documentElement.classList.remove('mc-ouvert');
      feuille = null;
      S.msg = '';
      chiffres();
    }
    // Échap ferme la feuille (une seule écoute, même quand la page se redessine).
    if (window.__nuEchap) document.removeEventListener('keydown', window.__nuEchap);
    window.__nuEchap = e => { if (e.key === 'Escape' && feuille && !document.querySelector('.pf-voile, .cal-voile, .mrt-dialogue')) fermerFeuille(); };
    document.addEventListener('keydown', window.__nuEchap);

    // ----- Actions -----
    const echec = (err, quoi) => { console.warn('Nutrition : ' + quoi, err); S.msg = ERREUR; dessinerAjout(); };
    const refus = m => { S.msg = m; const z = zoneAjout(), n = z && z.querySelector('.nu-msg'); if (n) n.textContent = m; };
    const lireQuantite = () => { const z = zoneAjout(), n = nombre(((z && z.querySelector('.nu-qte')) || {}).value); return Number.isFinite(n) ? n : NaN; };
    async function changerDeJour(jour) {
      if (jour > aujourdhui) return;
      await enregistrerSport(); // ce qui est en cours de saisie est rangé avec son jour
      fermerFeuille();
      S.jour = jour; S.choix = null; S.msg = ''; S.msgSport = '';
      try { const j = await lireJour(ctx.id, jour); S.lignes = j.lignes; S.sports = j.sports; S.erreurLecture = false; range = JSON.stringify({ jour, sports: S.sports }); }
      catch (err) { console.warn('Nutrition : lecture impossible', err); S.lignes = []; S.sports = []; S.erreurLecture = true; }
      S.lignesSport = S.sports.concat([null]);
      tout();
    }
    function pas(sens) {
      const a = choisi(), g = enGrammes(a), q = lireQuantite(), p = g ? 10 : 0.5;
      const base = Number.isFinite(q) ? q : S.choix.quantite;
      S.choix.quantite = Math.max(p, Math.round((base + sens * p) / p) * p);
      if (!g) S.choix.quantite = Math.round(S.choix.quantite * 10) / 10;
      dessinerAjout();
    }
    async function ajouter() {
      const a = choisi();
      if (!a) return;
      const g = enGrammes(a), q0 = lireQuantite();
      if (!(q0 > 0 && q0 <= (g ? 5000 : 50))) return refus(g ? 'La quantité doit être comprise entre 1 et 5 000 g.' : 'La quantité doit être comprise entre 0,1 et 50 portions.');
      let al = a;
      // Un produit trouvé par la recherche devient un aliment de l'utilisateur (une seule fois) : il revient dans Récents.
      if (S.choix.aliment) {
        al = S.aliments.find(x => x.nom === a.nom && x.portion === '100 g') || null;
        if (!al) {
          al = { id: uuid(), nom: a.nom, portion: '100 g', kcal: a.kcal, proteines: a.proteines, glucides: a.glucides, lipides: a.lipides, favori: !!a.favori, dernier_usage: null };
          const r0 = await sb().from('aliments').insert(al);
          if (r0.error) return echec(r0.error, 'aliment non créé');
          S.aliments.push(al);
        }
      }
      try { S.lignes.push(await ajouterLigne(al, S.jour, S.repas, g ? q0 / 100 : q0)); }
      catch (err) { return echec(err, 'ajout impossible'); }
      S.choix = null; S.msg = '';
      chiffres(); dessinerAjout(); dessinerJournal();
    }
    async function creer(form) {
      const v = n => form[n].value;
      const nom = v('nom').trim(), portion = v('portion').trim();
      const val = {}, plafond = { kcal: 5000, proteines: 999, glucides: 999, lipides: 999 };
      const LIB = { kcal: 'calories', proteines: 'protéines', glucides: 'glucides', lipides: 'lipides' };
      if (!nom) return refus('Écris le nom de l\'aliment.');
      if (!portion) return refus('Indique la portion (1 pièce, 100 g…).');
      for (const c of ['kcal', 'proteines', 'glucides', 'lipides']) {
        const brut = v(c).trim();
        if (c === 'kcal' && brut === '') return refus('Indique les calories pour une portion.');
        const n = brut === '' ? 0 : nombre(brut);
        if (!(n >= 0 && n <= plafond[c])) return refus('Valeur impossible : ' + LIB[c] + ' (de 0 à ' + plafond[c] + ').');
        val[c] = arrondi(n);
      }
      const aliment = Object.assign({ id: uuid(), nom, portion, favori: form.favori.checked, dernier_usage: null }, val);
      const { error } = await sb().from('aliments').insert(aliment);
      if (error) return refus(ERREUR);
      S.aliments.push(aliment);
      S.choix = { id: aliment.id, quantite: enGrammes(aliment) ? 100 : 1 }; S.source = aliment.favori ? 'favoris' : 'recents'; S.msg = '';
      dessinerAjout();
    }
    async function basculerFavori() {
      const a = choisi();
      if (!a) return;
      const q = lireQuantite();
      if (Number.isFinite(q)) S.choix.quantite = q;
      if (S.choix.aliment) { a.favori = !a.favori; return dessinerAjout(); } // rangé avec l'aliment, à l'ajout
      const { error } = await sb().from('aliments').update({ favori: !a.favori }).eq('id', a.id);
      if (error) return echec(error, 'favori non rangé');
      a.favori = !a.favori; S.msg = '';
      dessinerAjout();
    }
    const zones = () => {
      const c = zoneAjout();
      if (!c || choisi()) return; // étape 2 : la recherche attend le retour
      if (!c.querySelector('.nu-mes')) return dessinerAjout();
      c.querySelector('.nu-mes').innerHTML = htmlMes();
      c.querySelector('.nu-produits').innerHTML = htmlProduits();
    };
    // Pendant la frappe : mes aliments seulement, sans réseau ; les produits d'une recherche précédente s'effacent.
    let pause = null;
    function taper(texte) {
      const t = texte.trim();
      if (t === S.recherche.texte) return;
      S.recherche = { texte: t, etat: null, mes: t.length >= 2 ? chercherChezMoi(S.aliments, t) : [], resultats: [] };
      zones();
      clearTimeout(pause);
      if (relaisOk && t.length >= 3) pause = setTimeout(() => lancerRecherche(t, true), 500);
    }
    // enFrappe : lancée pendant la frappe ; le champ et l'aliment choisi restent en place.
    async function lancerRecherche(texte, enFrappe) {
      texte = texte.trim();
      clearTimeout(pause);
      if (texte.length < 2) return;
      S.recherche = { texte, etat: 'cours', mes: chercherChezMoi(S.aliments, texte), resultats: [] };
      if (enFrappe) zones();
      else { S.choix = null; S.msg = ''; dessinerAjout(); }
      let resultats = [], etat = 'ok';
      try { resultats = await chercherProduits(texte, enFrappe); }
      catch (err) { if (enFrappe) etat = null; else { console.warn('Nutrition : recherche impossible', err); etat = 'erreur'; } }
      if (S.recherche.texte !== texte) return;
      S.recherche.resultats = resultats; S.recherche.etat = etat;
      zones();
    }

    // ----- Fenêtre « Modifier » d'une ligne du journal (aliment ou activité) -----
    // La fenêtre de saisie du site : « Annuler » à gauche, « Enregistrer » à droite, le titre en libellé, « Supprimer »
    // seul en bas (question du site avant de supprimer).
    const POUBELLE = '<svg class="cal-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    // La fenêtre d'une séance du Calendrier (preparation.js) : même taille, mêmes marges, mêmes boutons.
    function fenetreModifier(titre, corps, enregistrer, supprimer, question) {
      const v = P.fenetre('<form novalidate>' + P.barre('<button type="submit" class="mrt-btn is-principal">Enregistrer</button>') + P.titreFenetre(esc(titre)) + corps +
        '<div class="cal-bas"><button type="button" class="mrt-btn is-danger" data-act="supprimer">' + POUBELLE + 'Supprimer</button></div></form>', 'nu-modifier');
      const form = v.querySelector('form'), msg = v.querySelector('.cal-msg');
      v.querySelector('[data-act="annuler"]').addEventListener('click', v.fermer);
      v.querySelector('[data-act="supprimer"]').addEventListener('click', async () => {
        if (!(await window.mrtConfirmer({ texte: question, action: 'Supprimer', danger: true }))) return;
        const err = await supprimer();
        if (err) msg.textContent = err; else v.fermer();
      });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const err = await enregistrer(form);
        if (err) msg.textContent = err; else v.fermer();
      });
      return form;
    }
    const listeRepas = choisi => '<label class="cal-champ"><span>Repas</span><select class="mrt-champ" name="repas">' + REPAS.map(r => '<option value="' + r[0] + '"' + (r[0] === choisi ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select></label>';
    function modifierLigne(id) {
      const l = S.lignes.find(x => x.id === id);
      if (!l) return;
      const a = trouver(l.aliment), g = !!a && enGrammes(a), pasQ = g ? 10 : 0.5;
      const valeur = g ? Math.round(Number(l.quantite) * 100) : Number(l.quantite);
      const corps = '<div class="cal-champ"><span>Quantité</span><div class="nu-quantite"><button type="button" class="mrt-rond" data-q="-1" aria-label="Moins">' + mrtIcone.moins + '</button>' +
        '<span class="nu-unite"><input class="mrt-champ nu-qte" name="quantite" type="text" inputmode="decimal" aria-label="Quantité" value="' + virgule(valeur) + '">' + (g ? 'g' : 'portions') + '</span>' +
        '<button type="button" class="mrt-rond" data-q="1" aria-label="Plus">' + mrtIcone.plus + '</button></div></div>' + listeRepas(l.repas);
      const form = fenetreModifier(l.nom, corps, async f => {
        const q0 = nombre(f.quantite.value);
        if (!(q0 > 0 && q0 <= (g ? 5000 : 50))) return g ? 'La quantité doit être comprise entre 1 et 5 000 g.' : 'La quantité doit être comprise entre 0,1 et 50 portions.';
        const q = g ? q0 / 100 : q0, k = q / Number(l.quantite);
        // Les valeurs restent celles figées à la saisie, à la nouvelle quantité.
        const champs = { repas: f.repas.value, quantite: Math.round(q * 100) / 100, kcal: arrondi(l.kcal * k), proteines: arrondi(l.proteines * k), glucides: arrondi(l.glucides * k), lipides: arrondi(l.lipides * k) };
        const { error } = await sb().from('repas_lignes').update(champs).eq('id', l.id);
        if (error) { console.warn('Nutrition : ligne non modifiée', error); return ERREUR; }
        Object.assign(l, champs);
        chiffres(); dessinerJournal();
      }, async () => {
        const { error } = await sb().from('repas_lignes').delete().eq('id', l.id);
        if (error) { console.warn('Nutrition : suppression impossible', error); return ERREUR; }
        S.lignes = S.lignes.filter(x => x.id !== l.id);
        chiffres(); dessinerJournal();
      }, 'Supprimer cette ligne ?');
      form.addEventListener('click', e => {
        const q = e.target.closest('[data-q]');
        if (q) { const v = nombre(form.quantite.value), base = Number.isFinite(v) ? v : valeur; form.quantite.value = virgule(Math.max(pasQ, Math.round((base + Number(q.dataset.q) * pasQ) / pasQ) * pasQ)); }
      });
    }
    function modifierSport(i) {
      const x = S.sports[i];
      if (!x) return;
      const ranger = () => { aRanger = { jour: S.jour, sports: S.sports.slice() }; S.lignesSport = S.sports.concat([null]); chiffres(); dessinerJournal(); return enregistrerSport(); };
      const corps = '<label class="cal-champ"><span>Sport</span><select class="mrt-champ" name="type">' +
        Object.entries(B.SPORTS).filter(y => !y[1].seance || y[0] === x.type).map(y => '<option value="' + y[0] + '"' + (y[0] === x.type ? ' selected' : '') + '>' + esc(y[1].libelle) + '</option>').join('') + '</select></label>' +
        '<label class="cal-champ"><span>Durée (h)</span><input class="mrt-champ" name="heures" type="text" inputmode="decimal" value="' + virgule(x.heures) + '"></label>';
      fenetreModifier(B.SPORTS[x.type].libelle, corps, async f => {
        const type = f.querySelector('[name="type"]').value, h = nombre(f.querySelector('[name="heures"]').value);
        if (!B.SPORTS[type]) return 'Choisis le sport.';
        if (!(h > 0 && h <= 24)) return 'La durée doit être comprise entre 0 et 24 heures.';
        S.sports[i] = { type, heures: Math.round(h * 100) / 100 };
        await ranger();
      }, async () => {
        S.sports.splice(i, 1);
        await ranger();
      }, 'Supprimer cette activité ?');
    }

    // ----- Sport du jour : rangé dans la base, jour par jour -----
    // Une ligne remplie en fait apparaître une autre (cinq au plus). Le besoin suit la saisie ; l'enregistrement
    // part peu après la dernière frappe (ou au changement de jour).
    // rangé : ce qui est dans la base pour le jour affiché ; rien n'est réécrit quand rien n'a changé (fermer la feuille, changer de jour).
    let minuteur = null, file = Promise.resolve(), aRanger = null, range = JSON.stringify({ jour: S.jour, sports: S.sports });
    function lireSports() {
      const z = zoneActivite();
      if (!z) return;
      const lignes = [...z.querySelectorAll('.nu-sport-l')];
      S.lignesSport = lignes.map(l => ({ type: l.querySelector('[name="type"]').value, heures: nombre(l.querySelector('[name="heures"]').value) || '' }));
      S.sports = S.lignesSport.filter(s => B.SPORTS[s.type] && s.heures > 0 && s.heures <= 24).map(s => ({ type: s.type, heures: Math.round(s.heures * 100) / 100 }));
      const derniere = lignes[lignes.length - 1];
      if (derniere.querySelector('[name="type"]').value && lignes.length < 5) {
        z.querySelector('.nu-sports').insertAdjacentHTML('beforeend', ligneSport(null));
        S.lignesSport.push(null);
      }
      chiffres(); dessinerJournal();
      aRanger = { jour: S.jour, sports: S.sports.slice() };
      clearTimeout(minuteur);
      minuteur = setTimeout(enregistrerSport, 700);
    }
    function enregistrerSport() {
      clearTimeout(minuteur);
      const r = aRanger;
      aRanger = null;
      if (!r || JSON.stringify(r) === range) return file;
      range = JSON.stringify(r);
      file = file.then(async () => {
        const d = await sb().from('sport_jour').delete().eq('utilisateur', ctx.id).eq('date', r.jour);
        const i = d.error || !r.sports.length ? d : await sb().from('sport_jour').insert(r.sports.map(s => ({ date: r.jour, type: s.type, heures: s.heures })));
        S.msgSport = d.error || i.error ? ERREUR : '';
        if (d.error || i.error) console.warn('Nutrition : sport non rangé', d.error || i.error);
        if (r.jour === S.jour) [zoneActivite(), carte('besoin').querySelector('.nu-msg-sport')].forEach(z => { const m = z && (z.classList.contains('nu-msg') ? z : z.querySelector('.nu-msg')); if (m) m.textContent = S.msgSport; });
      });
      return file;
    }
    // ----- Branchements -----
    const clic = e => {
      const b = e.target.closest('[data-act]');
      if (!b || !e.currentTarget.contains(b) || b.disabled) return;
      const act = b.dataset.act;
      if (act === 'profil') window.mrtProfilFenetre({ profil: ctx.profil, id: ctx.id, surEnregistre: redessiner });
      else if (act === 'fermer') fermerFeuille();
      else if (act === 'retour') { S.choix = null; S.msg = ''; dessinerAjout(); }
      else if (act === 'activite') ouvrirFeuille('activite');
      else if (act === 'ajout-repas') { S.repas = b.dataset.repas || repasDe(new Date()); ouvrirFeuille('repas'); }
      else if (act === 'veille') changerDeJour(decaler(S.jour, -1));
      else if (act === 'lendemain') changerDeJour(decaler(S.jour, 1));
      else if (act === 'aujourdhui') changerDeJour(aujourdhui);
      else if (act === 'ajout-seance') P.ouvrirSeance(calendrier, { date: S.jour, type: 'run' });
      else if (act === 'seance') { const x = S.seances.find(y => y.id === b.dataset.id); if (x) P.ouvrirSeance(calendrier, { seance: x }); }
      else if (act === 'source') { S.source = b.dataset.source; S.msg = ''; dessinerAjout(); }
      else if (act === 'choisir') { const a = trouver(b.dataset.id); S.choix = { id: a.id, quantite: enGrammes(a) ? 100 : 1 }; S.msg = ''; dessinerAjout(); }
      else if (act === 'resultat') {
        const p = S.recherche.resultats[Number(b.dataset.i)];
        S.choix = { aliment: { nom: p.nom + (p.marque ? ' · ' + p.marque : ''), portion: '100 g', kcal: p.kcal, proteines: p.proteines, glucides: p.glucides, lipides: p.lipides, favori: false }, quantite: p.portionG };
        S.msg = ''; dessinerAjout();
      }
      else if (act === 'moins') pas(-1);
      else if (act === 'plus') pas(1);
      else if (act === 'repas') { const q = lireQuantite(); if (Number.isFinite(q)) S.choix.quantite = q; S.repas = b.dataset.repas; dessinerAjout(); }
      else if (act === 'favori') basculerFavori();
      else if (act === 'ajouter') ajouter();
      else if (act === 'ligne') modifierLigne(b.dataset.id);
      else if (act === 'ligne-sport') modifierSport(Number(b.dataset.i));
    };
    const soumettre = e => {
      e.preventDefault();
      if (e.target.classList.contains('nu-libre')) creer(e.target);
      else if (e.target.classList.contains('nu-recherche')) lancerRecherche(e.target.q.value);
    };
    // Case « faite » d'une séance : rangée dans le Calendrier.
    async function cocher(id, faite) {
      const { error } = await sb().from('seances').update({ faite }).eq('id', id);
      if (error) { console.warn('Nutrition : séance non rangée', error); dessinerJournal(); return; }
      const x = S.seances.find(y => y.id === id); if (x) x.faite = faite;
      chiffres(); dessinerJournal();
    }
    const changer = e => {
      if (e.target.closest('.nu-sport-l')) lireSports();
      else if (e.target.dataset && e.target.dataset.faite) cocher(e.target.dataset.faite, e.target.checked);
    };
    const saisir = e => {
      if (e.target.closest('.nu-sport-l') && e.target.name === 'heures') lireSports();
      else if (e.target.closest('.nu-recherche') && e.target.name === 'q') taper(e.target.value);
    };
    function brancher(cible) { cible.onclick = clic; cible.onsubmit = soumettre; cible.onchange = changer; cible.oninput = saisir; }
    brancher(el);
    window.addEventListener('pagehide', () => { if (aRanger) enregistrerSport(); });
    tout();
    // Saisie rapide d'En un coup d'œil : la feuille demandée s'ouvre d'emblée (une seule fois).
    if (ctx.ouvrir) { const type = ctx.ouvrir; ctx.ouvrir = null; ouvrirFeuille(type); }
  };

  // ===================== Le bloc d'En un coup d'œil =====================
  // Le bilan du jour (calories mangées / besoin, avec une barre), puis protéines, glucides et lipides en petits anneaux
  // avec « Reste … », sur une ligne, téléphone compris.
  window.renderNutritionAccueil = async function (el, ctx) {
    const B = window.mrtBesoin;
    const vide = t => '<p class="ac-vide">' + esc(t) + '</p>';
    if (ctx.lectureSeule) { el.innerHTML = vide('Les données de nutrition ne sont pas partagées.'); return; }
    const jour = iso(new Date());
    if (B.manquants(ctx.profil, jour).length) { el.innerHTML = vide('Complète ton profil sur la page Nutrition.'); return; }
    el.innerHTML = vide('Chargement…');
    let j, seances = [], vma = null;
    try {
      const r0 = await Promise.all([lireJour(ctx.id, jour), sb().from('seances').select('*').eq('utilisateur', ctx.id).eq('date', jour), lireVma(ctx.id, ctx.profil)]);
      j = r0[0]; seances = r0[1].error ? [] : r0[1].data || []; vma = r0[2];
    } catch (err) { console.warn('Nutrition : lecture impossible', err); el.innerHTML = vide('Lecture impossible pour l\'instant.'); return; }
    const r = B.calculer(ctx.profil, { date: jour, sports: activiteDuJour(j.sports, seances, jour, jour, vma), phase: phaseDuJour(ctx, jour).calc });
    // Sous le minimum : « sous » ; dans la cible : « cible » ; au-delà du maximum : « alerte » (barre rouge).
    const etat = (v, min, max) => (v < min ? 'sous' : v <= max ? 'cible' : 'alerte');
    const barre = (v, max, e) => '<span class="nu-ac-barre"><span style="width:' + Math.min(100, v / (max * 1.15) * 100).toFixed(1) + '%"' + (e === 'alerte' ? ' class="is-alerte"' : '') + '></span></span>';
    const kcal = total(j.lignes, 'kcal'), eK = etat(kcal, r.kcal, r.kcal * TOLERANCE_KCAL);
    // Les anneaux de la page Nutrition, en plus petit : nom, anneau, « Reste … » (le besoin est sur la page).
    const anneau = (cle, nom, plageR) => jauge(cle, nom, total(j.lignes, cle === 'p' ? 'proteines' : cle === 'g' ? 'glucides' : 'lipides'), plageR[0], plageR[1], 'g', plage(plageR));
    el.innerHTML = '<p class="nu-ac-bilan" data-etat="' + eK + '"><span class="nu-ac-kcal">' + n0(kcal) + '</span> / ' + n0(r.kcal) + ' kcal</p>' + barre(kcal, r.kcal * TOLERANCE_KCAL, eK) +
      '<div class="nu-ac-anneaux">' + anneau('p', 'Protéines', r.proteines) + anneau('g', 'Glucides', r.glucides) + anneau('l', 'Lipides', r.lipides) + '</div>';
  };

  window.mrtNutrition = { phaseDuJour, chercherChezMoi, repasDe, activiteDuJour };
})();
