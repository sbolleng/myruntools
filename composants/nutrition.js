// ===== Page Nutrition : besoin du jour, jauges, ajout d'un aliment, journal =====
//
// docs/module-nutrition-specification.md, § 4. À charger après besoin.js, profil-champs.js et preparation.js.
//   renderNutrition(el, { profil, id, courses, semaines })
//   profil : ligne de `profils` ; id : identifiant de l'utilisateur ; courses et semaines : pour la phase du plan
// Données : `aliments` (favoris, récents) et `repas_lignes` (le journal), dans Supabase ; recherche dans
// Open Food Facts (valeurs pour 100 g). Le sport du jour est gardé sur l'appareil, un jour à la fois.
(function () {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // 2 117 : espace insécable comme séparateur de milliers.
  const n0 = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const plage = r => n0(r[0]) + '–' + n0(r[1]);
  const virgule = x => String(x).replace('.', ',');
  const arrondi = x => Math.round(x * 10) / 10;
  const nombre = t => parseFloat(String(t).trim().replace(',', '.'));
  const ERREUR = 'Enregistrement impossible pour l\'instant.';
  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  // Tolérance autour du besoin en calories : la jauge est « dans la cible » de 100 à 110 % du besoin.
  const TOLERANCE_KCAL = 1.1;
  const OFF = 'https://world.openfoodfacts.org/cgi/search.pl';

  const REPAS = [['petit_dej', 'Petit-déj'], ['midi', 'Midi'], ['encas', 'Encas'], ['soir', 'Soir']];
  const repasDe = d => { const h = d.getHours(); return h < 10 ? 'petit_dej' : h < 15 ? 'midi' : h < 18 ? 'encas' : 'soir'; };
  // Un aliment donné pour 100 g se dose en grammes ; les autres en portions.
  const enGrammes = a => a.portion === '100 g';

  function uuid() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // ----- Phase du jour -----
  // Celle du plan (Base, Développement, Affûtage, Deload : même règle que le Calendrier) ; de J-3 à J-1 avant la
  // prochaine course confirmée, Carbo-loading puis Veille de course, qui changent la part des glucides.
  function phaseDuJour(ctx, aujourdhui) {
    const B = window.mrtBesoin, P = window.mrtPreparation;
    const prochaine = (ctx.courses || []).filter(c => c.statut === 'confirmee' && c.etat === 'a_venir' && c.date && !c.date_approx && c.date > aujourdhui)
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    const jours = prochaine ? Math.round((new Date(prochaine.date + 'T12:00:00') - new Date(aujourdhui + 'T12:00:00')) / 86400000) : null;
    const calc = B.phaseDuJour(jours);
    if (calc === 'carbo' || calc === 'veille') return { calc, libelle: B.PHASES[calc].libelle };
    const sem = P ? P.phaseSemaine(P.lundiDe(aujourdhui), P.tousLesPlans({ courses: ctx.courses || [], semaines: ctx.semaines || [] })) : null;
    return { calc: 'train', libelle: sem ? P.NOM_PHASE[sem.phase] : 'Entraînement' };
  }

  // ----- Sport du jour (sur l'appareil) -----
  const cleSport = date => 'mrt-nutri-sport-' + date;
  function lireSport(date) {
    try {
      const v = JSON.parse(localStorage.getItem(cleSport(date)));
      return Array.isArray(v) ? v.filter(s => window.mrtBesoin.SPORTS[s.type] && s.heures > 0 && s.heures <= 24) : [];
    } catch (e) { return []; }
  }
  function ecrireSport(date, sports) { try { localStorage.setItem(cleSport(date), JSON.stringify(sports)); } catch (e) { /* stockage indisponible */ } }

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

  // ----- Recherche Open Food Facts : valeurs pour 100 g ; un produit sans calories est écarté -----
  async function chercher(texte) {
    const q = new URLSearchParams({ search_terms: texte, search_simple: '1', action: 'process', json: '1', page_size: '20', sort_by: 'unique_scans_n', lc: 'fr', cc: 'fr',
      fields: 'code,product_name,product_name_fr,brands,nutriments,serving_quantity' });
    const r = await fetch(OFF + '?' + q.toString());
    if (!r.ok) throw new Error('Open Food Facts : ' + r.status);
    const d = await r.json();
    const vus = new Set();
    return (d.products || []).map(p => {
      const n = p.nutriments || {}, nom = (p.product_name_fr || p.product_name || '').trim();
      const kcal = n['energy-kcal_100g'] != null ? Number(n['energy-kcal_100g']) : n.energy_100g != null ? Number(n.energy_100g) / 4.184 : NaN;
      const marque = (p.brands || '').split(',')[0].trim();
      const v = k => (Number.isFinite(Number(n[k])) ? arrondi(Number(n[k])) : 0);
      return { code: p.code, nom, marque, kcal: arrondi(kcal), proteines: v('proteins_100g'), glucides: v('carbohydrates_100g'), lipides: v('fat_100g'),
        portionG: Number(p.serving_quantity) >= 5 && Number(p.serving_quantity) <= 1000 ? Math.round(Number(p.serving_quantity)) : 100 };
    }).filter(p => p.nom && Number.isFinite(p.kcal) && p.kcal >= 0 && p.kcal <= 1000 && !vus.has(p.nom + p.marque) && vus.add(p.nom + p.marque)).slice(0, 8);
  }

  window.renderNutrition = async function (el, ctx) {
    const B = window.mrtBesoin, sb = window.mrtSupabase;
    const maintenant = new Date(), aujourdhui = iso(maintenant);
    const redessiner = profil => renderNutrition(el, Object.assign({}, ctx, { profil }));
    if (B.manquants(ctx.profil, aujourdhui).length) {
      window.mrtProfilEncart(el, { profil: ctx.profil, id: ctx.id, surEnregistre: redessiner });
      return;
    }
    const S = { aliments: [], lignes: [], sports: lireSport(aujourdhui), source: null, choix: null, repas: repasDe(maintenant), msg: '',
      erreurLecture: false, recherche: { texte: '', etat: null, resultats: [] } };
    try {
      const [a, l] = await Promise.all([
        sb.from('aliments').select('*').eq('utilisateur', ctx.id),
        sb.from('repas_lignes').select('*').eq('utilisateur', ctx.id).eq('date', aujourdhui)
      ]);
      if (a.error || l.error) throw (a.error || l.error);
      S.aliments = a.data || []; S.lignes = l.data || [];
    } catch (err) { console.warn('Nutrition : lecture impossible', err); S.erreurLecture = true; }
    S.source = S.aliments.some(x => x.dernier_usage) ? 'recents' : S.aliments.some(x => x.favori) ? 'favoris' : 'libre';

    const phase = phaseDuJour(ctx, aujourdhui);
    const besoin = () => B.calculer(ctx.profil, { date: aujourdhui, sports: S.sports, phase: phase.calc });
    const trouver = id => S.aliments.find(a => a.id === id);
    const recents = () => S.aliments.filter(a => a.dernier_usage).sort((x, y) => (x.dernier_usage < y.dernier_usage ? 1 : -1)).slice(0, 8);
    const favoris = () => S.aliments.filter(a => a.favori).sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
    const total = c => S.lignes.reduce((t, l) => t + Number(l[c] || 0), 0);
    const choisi = () => S.choix && (S.choix.aliment || trouver(S.choix.id));

    // ----- Carte 1 : mon besoin du jour -----
    function htmlProfil() {
      const p = ctx.profil, act = (B.ACTIVITES[p.activite].libelle || '').split(' · ')[0];
      return [p.sexe === 'femme' ? 'Femme' : 'Homme', B.age(p.naissance, aujourdhui) + ' ans', virgule(Number(p.poids)) + ' kg', p.taille + ' cm', act].join(' · ');
    }
    const ligneSport = s => '<div class="nu-sport-l"><select class="mrt-champ" name="type" aria-label="Sport"><option value="">Sport…</option>' +
      Object.entries(B.SPORTS).map(x => '<option value="' + x[0] + '"' + (s && s.type === x[0] ? ' selected' : '') + '>' + esc(x[1].libelle) + '</option>').join('') + '</select>' +
      '<span class="nu-unite"><input class="mrt-champ" name="heures" type="text" inputmode="decimal" aria-label="Durée en heures" value="' + (s ? virgule(s.heures) : '') + '">h</span></div>';
    function htmlBesoin() {
      return '<section class="card nu-carte nu-besoin"><div class="nu-carte-t"><p class="nu-titre">Mon besoin du jour</p><button type="button" class="mrt-btn nu-editer" data-act="profil">Modifier</button></div>' +
        '<p class="nu-profil-l">' + esc(htmlProfil()) + '</p><p class="nu-phase">Phase · ' + esc(phase.libelle) + '</p>' +
        '<p class="nu-sous-t">Sport du jour</p><div class="nu-sports">' + S.sports.concat([null]).map(ligneSport).join('') + '</div>' +
        '<p class="nu-kcal"><span class="nu-kcal-val"></span> kcal aujourd\'hui</p></section>';
    }
    // ----- Carte 2 : les jauges du jour -----
    function htmlJauges(r) {
      const titre = JOURS[maintenant.getDay()] + ' ' + maintenant.getDate() + ' ' + MOIS[maintenant.getMonth()];
      return '<p class="nu-titre">' + titre + '</p><div class="nu-anneaux">' +
        jauge('kcal', 'Calories', total('kcal'), r.kcal, r.kcal * TOLERANCE_KCAL, 'kcal', n0(r.kcal)) +
        jauge('p', 'Protéines', total('proteines'), r.proteines[0], r.proteines[1], 'g', plage(r.proteines)) +
        jauge('g', 'Glucides', total('glucides'), r.glucides[0], r.glucides[1], 'g', plage(r.glucides)) +
        jauge('l', 'Lipides', total('lipides'), r.lipides[0], r.lipides[1], 'g', plage(r.lipides)) + '</div>';
    }
    // ----- Carte 3 : ajouter un aliment -----
    const detail = a => esc(a.nom) + (a.portion && !enGrammes(a) ? ' · ' + esc(a.portion) : '');
    const kcalDe = a => n0(a.kcal) + ' kcal' + (enGrammes(a) ? ' / 100 g' : '');
    function htmlRecherche() {
      const R0 = S.recherche;
      let corps = '';
      if (R0.etat === 'cours') corps = '<p class="nu-vide">Recherche…</p>';
      else if (R0.etat === 'erreur') corps = '<p class="nu-vide">Recherche indisponible pour l\'instant, réessaie dans une minute.</p>';
      else if (R0.etat === 'ok' && !R0.resultats.length) corps = '<p class="nu-vide">Aucun résultat.</p>';
      else if (R0.etat === 'ok') corps = '<div class="nu-liste">' + R0.resultats.map((p, i) => '<button type="button" class="nu-aliment" data-act="resultat" data-i="' + i + '">' +
        '<span>' + esc(p.nom) + (p.marque ? ' <span class="nu-marque">· ' + esc(p.marque) + '</span>' : '') + '</span><span class="nu-aliment-k">' + n0(p.kcal) + ' kcal / 100 g</span></button>').join('') + '</div>';
      return '<form class="nu-recherche" role="search"><input class="mrt-champ" type="search" name="q" placeholder="Rechercher un aliment…" aria-label="Rechercher un aliment" value="' + esc(R0.texte) + '" autocomplete="off" enterkeyhint="search">' +
        '<button type="submit" class="mrt-btn">Chercher</button></form><div class="nu-resultats">' + corps + '</div>';
    }
    function htmlChoix() {
      const a = choisi();
      if (!a) return '';
      const g = enGrammes(a);
      return '<div class="nu-choix"><p class="nu-choix-nom">' + detail(a) + '</p>' +
        '<div class="nu-quantite"><button type="button" class="mrt-rond" data-act="moins" aria-label="Moins">' + mrtIcone.moins + '</button>' +
        '<span class="nu-unite"><input class="mrt-champ nu-qte" name="quantite" type="text" inputmode="decimal" aria-label="Quantité" value="' + virgule(S.choix.quantite) + '">' + (g ? 'g' : 'portion' + (S.choix.quantite > 1 ? 's' : '')) + '</span>' +
        '<button type="button" class="mrt-rond" data-act="plus" aria-label="Plus">' + mrtIcone.plus + '</button>' +
        '<button type="button" class="mrt-pastille nu-fav" data-act="favori" aria-pressed="' + !!a.favori + '">' + (a.favori ? '★' : '☆') + ' Favori</button></div>' +
        '<div class="nu-repas-choix">' + REPAS.map(r => '<button type="button" class="mrt-pastille" data-act="repas" data-repas="' + r[0] + '" aria-pressed="' + (S.repas === r[0]) + '">' + r[1] + '</button>').join('') + '</div>' +
        '<button type="button" class="mrt-btn is-principal nu-ajouter" data-act="ajouter">Ajouter</button></div>';
    }
    function htmlAjout() {
      const sources = [['favoris', 'Favoris'], ['recents', 'Récents'], ['libre', '+ Aliment libre']];
      let corps = '';
      if (S.source === 'libre') {
        corps = '<form class="nu-libre" novalidate>' +
          '<label class="nu-champ"><span class="pf-libelle">Nom</span><input class="mrt-champ" name="nom" maxlength="100" autocomplete="off"></label>' +
          '<label class="nu-champ"><span class="pf-libelle">Portion</span><input class="mrt-champ" name="portion" maxlength="50" placeholder="1 pièce, 100 g…" autocomplete="off"></label>' +
          '<div class="nu-grille">' + [['kcal', 'Calories (kcal)'], ['proteines', 'Protéines (g)'], ['glucides', 'Glucides (g)'], ['lipides', 'Lipides (g)']].map(c =>
            '<label class="nu-champ"><span class="pf-libelle">' + c[1] + '</span><input class="mrt-champ" name="' + c[0] + '" type="text" inputmode="decimal" autocomplete="off"></label>').join('') + '</div>' +
          '<label class="mrt-pastille nu-favori-case"><input type="checkbox" name="favori">★ Favori</label>' +
          '<button type="submit" class="mrt-btn is-principal">Créer l\'aliment</button></form>';
      } else {
        const liste = S.source === 'favoris' ? favoris() : recents();
        corps = liste.length ? '<div class="nu-liste">' + liste.map(a => '<button type="button" class="nu-aliment" data-act="choisir" data-id="' + a.id + '"' + (S.choix && S.choix.id === a.id ? ' aria-pressed="true"' : '') + '>' +
          '<span>' + detail(a) + '</span><span class="nu-aliment-k">' + kcalDe(a) + '</span></button>').join('') + '</div>'
          : '<p class="nu-vide">' + (S.source === 'favoris' ? 'Aucun favori.' : 'Aucun aliment récent.') + '</p>';
      }
      return '<p class="nu-titre">Ajouter un aliment</p>' + htmlRecherche() +
        '<div class="nu-sources">' + sources.map(s => '<button type="button" class="mrt-pastille" data-act="source" data-source="' + s[0] + '" aria-pressed="' + (S.source === s[0]) + '">' + s[1] + '</button>').join('') + '</div>' +
        '<div class="nu-source">' + corps + '</div>' + htmlChoix() + '<p class="nu-msg" role="alert">' + esc(S.msg) + '</p>';
    }
    // ----- Carte 4 : journal du jour -----
    function htmlJournal() {
      const groupes = REPAS.map(r => [r, S.lignes.filter(l => l.repas === r[0])]).filter(g => g[1].length);
      const qte = l => { const a = trouver(l.aliment); return a && enGrammes(a) ? ' · ' + n0(Number(l.quantite) * 100) + ' g' : Number(l.quantite) !== 1 ? ' · ' + virgule(Number(l.quantite)) + ' portions' : ''; };
      return '<p class="nu-titre">Journal du jour</p>' + (S.erreurLecture ? '<p class="nu-msg" role="alert">Lecture impossible pour l\'instant.</p>' : '') +
        (groupes.length ? groupes.map(g => '<div class="nu-repas"><p class="nu-repas-t"><span>' + g[0][1] + '</span><span>' + n0(g[1].reduce((t, l) => t + Number(l.kcal), 0)) + ' kcal</span></p><ul class="nu-lignes">' +
          g[1].map(l => '<li data-id="' + l.id + '"><span class="nu-ligne-nom">' + esc(l.nom) + qte(l) + '</span>' +
            '<span class="nu-ligne-k">' + n0(l.kcal) + ' kcal</span><button type="button" class="mrt-rond is-fermer" data-act="supprimer" data-id="' + l.id + '" aria-label="Supprimer ' + esc(l.nom) + '">' + mrtIcone.fermer + '</button></li>').join('') + '</ul></div>').join('')
          : '<p class="nu-vide">Rien de noté.</p>');
    }

    // Les cartes se redessinent chacune à leur tour : une saisie en cours (sport, recherche) garde sa place.
    el.innerHTML = htmlBesoin() + '<section class="card nu-carte nu-jauges"></section><section class="card nu-carte nu-ajout"></section><section class="card nu-carte nu-journal"></section>';
    const carte = c => el.querySelector('.nu-' + c);
    function chiffres() {
      const r = besoin();
      el.querySelector('.nu-kcal-val').textContent = n0(r.kcal);
      carte('jauges').innerHTML = htmlJauges(r);
    }
    const dessinerAjout = () => { carte('ajout').innerHTML = htmlAjout(); };
    const dessinerJournal = () => { carte('journal').innerHTML = htmlJournal(); };
    function tout() { chiffres(); dessinerAjout(); dessinerJournal(); }

    // ----- Actions -----
    const echec = (err, quoi) => { console.warn('Nutrition : ' + quoi, err); S.msg = ERREUR; dessinerAjout(); };
    const refus = m => { S.msg = m; const n = carte('ajout').querySelector('.nu-msg'); if (n) n.textContent = m; };
    const lireQuantite = () => { const n = nombre((carte('ajout').querySelector('.nu-qte') || {}).value); return Number.isFinite(n) ? n : NaN; };
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
          const r0 = await sb.from('aliments').insert(al);
          if (r0.error) return echec(r0.error, 'aliment non créé');
          S.aliments.push(al);
        }
      }
      const q = g ? q0 / 100 : q0;
      const ligne = { id: uuid(), date: aujourdhui, repas: S.repas, aliment: al.id, nom: al.nom, quantite: Math.round(q * 100) / 100,
        kcal: arrondi(q * al.kcal), proteines: arrondi(q * al.proteines), glucides: arrondi(q * al.glucides), lipides: arrondi(q * al.lipides) };
      const r1 = await sb.from('repas_lignes').insert(ligne);
      if (r1.error) return echec(r1.error, 'ajout impossible');
      const quand = new Date().toISOString();
      const r2 = await sb.from('aliments').update({ dernier_usage: quand }).eq('id', al.id);
      if (r2.error) console.warn('Nutrition : dernier usage non rangé', r2.error);
      else al.dernier_usage = quand;
      S.lignes.push(ligne); S.choix = null; S.msg = '';
      tout();
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
      const { error } = await sb.from('aliments').insert(aliment);
      if (error) return refus(ERREUR);
      S.aliments.push(aliment);
      S.choix = { id: aliment.id, quantite: enGrammes(aliment) ? 100 : 1 }; S.source = aliment.favori ? 'favoris' : 'recents'; S.msg = '';
      dessinerAjout();
    }
    async function supprimer(id) {
      const { error } = await sb.from('repas_lignes').delete().eq('id', id);
      if (error) return echec(error, 'suppression impossible');
      S.lignes = S.lignes.filter(l => l.id !== id); S.msg = '';
      chiffres(); dessinerJournal();
    }
    async function basculerFavori() {
      const a = choisi();
      if (!a) return;
      const q = lireQuantite();
      if (Number.isFinite(q)) S.choix.quantite = q;
      if (S.choix.aliment) { a.favori = !a.favori; return dessinerAjout(); } // rangé avec l'aliment, à l'ajout
      const { error } = await sb.from('aliments').update({ favori: !a.favori }).eq('id', a.id);
      if (error) return echec(error, 'favori non rangé');
      a.favori = !a.favori; S.msg = '';
      dessinerAjout();
    }
    async function lancerRecherche(texte) {
      texte = texte.trim();
      if (texte.length < 2) return;
      S.recherche = { texte, etat: 'cours', resultats: [] }; S.choix = null; S.msg = '';
      dessinerAjout();
      try { S.recherche.resultats = await chercher(texte); S.recherche.etat = 'ok'; }
      catch (err) { console.warn('Nutrition : recherche impossible', err); S.recherche.etat = 'erreur'; }
      if (S.recherche.texte === texte) dessinerAjout();
    }
    // Sport du jour : une ligne remplie en fait apparaître une autre (cinq au plus).
    function lireSports() {
      const lignes = [...el.querySelectorAll('.nu-sport-l')];
      S.sports = lignes.map(l => ({ type: l.querySelector('[name="type"]').value, heures: nombre(l.querySelector('[name="heures"]').value) }))
        .filter(s => B.SPORTS[s.type] && s.heures > 0 && s.heures <= 24).map(s => ({ type: s.type, heures: Math.round(s.heures * 100) / 100 }));
      ecrireSport(aujourdhui, S.sports);
      const derniere = lignes[lignes.length - 1];
      if (derniere.querySelector('[name="type"]').value && lignes.length < 5) el.querySelector('.nu-sports').insertAdjacentHTML('beforeend', ligneSport(null));
      chiffres();
    }

    // ----- Branchements -----
    el.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b || !el.contains(b)) return;
      const act = b.dataset.act;
      if (act === 'profil') window.mrtProfilFenetre({ profil: ctx.profil, id: ctx.id, surEnregistre: redessiner });
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
      else if (act === 'supprimer') supprimer(b.dataset.id);
    };
    el.onsubmit = e => {
      e.preventDefault();
      if (e.target.classList.contains('nu-libre')) creer(e.target);
      else if (e.target.classList.contains('nu-recherche')) lancerRecherche(e.target.q.value);
    };
    el.onchange = e => { if (e.target.closest('.nu-sport-l')) lireSports(); };
    el.oninput = e => { if (e.target.closest('.nu-sport-l') && e.target.name === 'heures') lireSports(); };
    tout();
  };
})();
