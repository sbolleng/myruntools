// ===== Page Nutrition : besoin du jour, sport, jauges, ajout rapide, journal =====
//
// docs/module-nutrition-specification.md, § 4. À charger après besoin.js et profil-champs.js.
//   renderNutrition(el, { profil, id, cap })
//   profil : ligne de `profils` ; id : identifiant de l'utilisateur ; cap : la course cap (ou null)
// Données : `aliments` (favoris, récents) et `repas_lignes` (le journal), lues et écrites dans Supabase.
// Le sport du jour est gardé sur l'appareil (localStorage), un jour à la fois.
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
  // Tolérance autour du besoin en calories : la jauge est « dans la cible » de 100 à 110 % du besoin.
  const TOLERANCE_KCAL = 1.1;

  const REPAS = [['petit_dej', 'Petit-déj'], ['midi', 'Midi'], ['encas', 'Encas'], ['soir', 'Soir']];
  const repasDe = d => { const h = d.getHours(); return h < 10 ? 'petit_dej' : h < 15 ? 'midi' : h < 18 ? 'encas' : 'soir'; };

  function uuid() {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // Jours entre aujourd'hui et la course cap ; null sans date précise (mois seul : pas de phase déduite).
  function joursAvant(cap, aujourdhui) {
    if (!cap || !cap.date || cap.date_approx) return null;
    const a = new Date(aujourdhui + 'T12:00:00'), c = new Date(cap.date + 'T12:00:00');
    return Math.round((c - a) / 86400000);
  }

  // ----- Sport du jour (sur l'appareil) -----
  const cleSport = date => 'mrt-nutri-sport-' + date;
  function lireSport(date) {
    try {
      const v = JSON.parse(localStorage.getItem(cleSport(date)));
      return Array.isArray(v) ? v.filter(s => window.mrtBesoin.SPORTS[s.type] && s.heures > 0) : [];
    } catch (e) { return []; }
  }
  function ecrireSport(date, sports) { try { localStorage.setItem(cleSport(date), JSON.stringify(sports)); } catch (e) { /* stockage indisponible */ } }
  function duree(h) {
    const m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60;
    return hh ? hh + ' h' + (mm ? ' ' + pad(mm) : '') : mm + ' min';
  }

  // ----- Jauges -----
  // Sous le minimum : « sous » ; entre le minimum et le maximum : « cible » ; au-delà : « alerte ».
  function jauge(cle, libelle, mange, min, max, texte) {
    const echelle = max * 1.15, pct = x => Math.max(0, Math.min(100, x / echelle * 100));
    const etat = mange < min ? 'sous' : mange <= max ? 'cible' : 'alerte';
    return '<div class="nu-jauge" data-jauge="' + cle + '" data-etat="' + etat + '"><div class="nu-jauge-t"><span>' + libelle + '</span><span class="nu-jauge-v">' + texte + '</span></div>' +
      '<div class="nu-barre" role="progressbar" aria-label="' + libelle + '" aria-valuemin="0" aria-valuemax="' + Math.round(max) + '" aria-valuenow="' + Math.round(mange) + '">' +
      '<span class="nu-zone" style="left:' + pct(min).toFixed(1) + '%;width:' + (pct(max) - pct(min)).toFixed(1) + '%"></span>' +
      '<span class="nu-rempli" style="width:' + pct(mange).toFixed(1) + '%"></span></div></div>';
  }

  window.renderNutrition = async function (el, ctx) {
    const B = window.mrtBesoin, sb = window.mrtSupabase;
    const aujourdhui = iso(new Date());
    const redessiner = profil => renderNutrition(el, Object.assign({}, ctx, { profil }));
    if (B.manquants(ctx.profil, aujourdhui).length) {
      window.mrtProfilEncart(el, { profil: ctx.profil, id: ctx.id, surEnregistre: redessiner });
      return;
    }
    const S = { aliments: [], lignes: [], sports: lireSport(aujourdhui), source: null, choix: null, repas: repasDe(new Date()), msg: '', erreurLecture: false };
    try {
      const [a, l] = await Promise.all([
        sb.from('aliments').select('*').eq('utilisateur', ctx.id),
        sb.from('repas_lignes').select('*').eq('utilisateur', ctx.id).eq('date', aujourdhui)
      ]);
      if (a.error || l.error) throw (a.error || l.error);
      S.aliments = a.data || []; S.lignes = l.data || [];
    } catch (err) { console.warn('Nutrition : lecture impossible', err); S.erreurLecture = true; }
    S.source = S.aliments.some(x => x.dernier_usage) ? 'recents' : S.aliments.some(x => x.favori) ? 'favoris' : 'libre';

    const jours = joursAvant(ctx.cap, aujourdhui), phase = B.phaseDuJour(jours);
    const besoin = () => B.calculer(ctx.profil, { date: aujourdhui, sports: S.sports, phase });
    const trouver = id => S.aliments.find(a => a.id === id);
    const recents = () => S.aliments.filter(a => a.dernier_usage).sort((x, y) => (x.dernier_usage < y.dernier_usage ? 1 : -1)).slice(0, 8);
    const favoris = () => S.aliments.filter(a => a.favori).sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
    const total = c => S.lignes.reduce((t, l) => t + Number(l[c] || 0), 0);

    // ----- Rendu -----
    function htmlBesoin(r) {
      return '<section class="mrt-section nu-besoin"><p class="pf-titre">Besoin du jour</p>' +
        '<p class="nu-kcal"><span class="nu-kcal-val">' + n0(r.kcal) + '</span> kcal</p>' +
        '<p class="nu-phase">' + esc(r.phaseLibelle) + (jours !== null && jours >= 1 && jours <= 14 ? ' · J-' + jours : '') + '</p>' +
        '<p class="nu-sport">' + (S.sports.length ? 'Sport : ' + S.sports.map(s => duree(s.heures) + ' · ' + esc(B.SPORTS[s.type].libelle)).join(' ; ') : 'Sans sport saisi aujourd\'hui') +
        ' <button type="button" class="mrt-lien nu-modifier-sport" data-act="sport">modifier</button></p>' +
        '<ul class="nu-macros"><li><b>Protéines</b> ' + plage(r.proteines) + ' g</li><li><b>Glucides</b> ' + plage(r.glucides) + ' g</li><li><b>Lipides</b> ' + plage(r.lipides) + ' g</li></ul>' +
        '<p class="nu-mention">Repères de nutrition du sportif, pas un avis médical.</p>' +
        '<button type="button" class="mrt-lien nu-profil" data-act="profil">Modifier mon profil</button></section>';
    }
    function htmlJauges(r) {
      const kcalMax = r.kcal * TOLERANCE_KCAL;
      return '<section class="mrt-section nu-jauges"><p class="pf-titre">Jauges · mangé / besoin</p>' +
        jauge('kcal', 'Calories', total('kcal'), r.kcal, kcalMax, n0(total('kcal')) + ' / ' + n0(r.kcal) + ' kcal') +
        jauge('p', 'Protéines', total('proteines'), r.proteines[0], r.proteines[1], n0(total('proteines')) + ' / ' + plage(r.proteines) + ' g') +
        jauge('g', 'Glucides', total('glucides'), r.glucides[0], r.glucides[1], n0(total('glucides')) + ' / ' + plage(r.glucides) + ' g') +
        jauge('l', 'Lipides', total('lipides'), r.lipides[0], r.lipides[1], n0(total('lipides')) + ' / ' + plage(r.lipides) + ' g') + '</section>';
    }
    const detail = a => esc(a.nom) + ' · ' + esc(a.portion);
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
          '<span>' + detail(a) + '</span><span class="nu-aliment-k">' + n0(a.kcal) + ' kcal</span></button>').join('') + '</div>'
          : '<p class="nu-vide">' + (S.source === 'favoris' ? 'Aucun favori pour l\'instant.' : 'Aucun aliment récent pour l\'instant : crée-en un avec « + Aliment libre ».') + '</p>';
      }
      let choix = '';
      const a = S.choix && trouver(S.choix.id);
      if (a) {
        choix = '<div class="nu-choix"><p class="nu-choix-nom">' + detail(a) + '</p>' +
          '<div class="nu-quantite"><button type="button" class="mrt-rond" data-act="moins" aria-label="Moins"' + (S.choix.quantite <= 0.5 ? ' disabled' : '') + '>−</button>' +
          '<output class="nu-quantite-v" aria-label="Quantité en portions">' + virgule(S.choix.quantite) + '</output>' +
          '<button type="button" class="mrt-rond" data-act="plus" aria-label="Plus">+</button>' +
          '<button type="button" class="mrt-pastille nu-fav" data-act="favori" aria-pressed="' + !!a.favori + '">' + (a.favori ? '★' : '☆') + ' Favori</button></div>' +
          '<div class="nu-repas-choix">' + REPAS.map(r => '<button type="button" class="mrt-pastille" data-act="repas" data-repas="' + r[0] + '" aria-pressed="' + (S.repas === r[0]) + '">' + r[1] + '</button>').join('') + '</div>' +
          '<button type="button" class="mrt-btn is-principal nu-ajouter" data-act="ajouter">Ajouter</button></div>';
      }
      return '<section class="mrt-section nu-ajout"><p class="pf-titre">Ajout rapide</p>' +
        '<div class="nu-sources">' + sources.map(s => '<button type="button" class="mrt-pastille" data-act="source" data-source="' + s[0] + '" aria-pressed="' + (S.source === s[0]) + '">' + s[1] + '</button>').join('') + '</div>' +
        corps + choix + '<p class="nu-msg" role="alert">' + esc(S.msg) + '</p></section>';
    }
    function htmlJournal() {
      const groupes = REPAS.map(r => [r, S.lignes.filter(l => l.repas === r[0])]).filter(g => g[1].length);
      return '<section class="mrt-section nu-journal"><p class="pf-titre">Aujourd\'hui</p>' + (S.erreurLecture ? '<p class="nu-msg" role="alert">Lecture impossible pour l\'instant.</p>' : '') +
        (groupes.length ? groupes.map(g => '<div class="nu-repas"><p class="nu-repas-t"><span>' + g[0][1] + '</span><span>' + n0(g[1].reduce((t, l) => t + Number(l.kcal), 0)) + ' kcal</span></p><ul class="nu-lignes">' +
          g[1].map(l => '<li data-id="' + l.id + '"><span class="nu-ligne-nom">' + esc(l.nom) + (Number(l.quantite) !== 1 ? ' · ' + virgule(Number(l.quantite)) + ' portions' : '') + '</span>' +
            '<span class="nu-ligne-k">' + n0(l.kcal) + ' kcal</span><button type="button" class="mrt-rond is-fermer" data-act="supprimer" data-id="' + l.id + '" aria-label="Supprimer ' + esc(l.nom) + '">×</button></li>').join('') + '</ul></div>').join('')
          : '<p class="nu-vide">Rien de noté aujourd\'hui.</p>') + '</section>';
    }
    function dessiner() {
      const r = besoin();
      el.innerHTML = htmlBesoin(r) + htmlJauges(r) + htmlAjout() + htmlJournal();
    }

    // ----- Actions -----
    const echec = (err, quoi) => { console.warn('Nutrition : ' + quoi, err); S.msg = ERREUR; dessiner(); };
    async function ajouter() {
      const a = trouver(S.choix && S.choix.id);
      if (!a) return;
      const q = S.choix.quantite, ligne = {
        id: uuid(), date: aujourdhui, repas: S.repas, aliment: a.id, nom: a.nom, quantite: q,
        kcal: arrondi(q * a.kcal), proteines: arrondi(q * a.proteines), glucides: arrondi(q * a.glucides), lipides: arrondi(q * a.lipides)
      };
      const r1 = await sb.from('repas_lignes').insert(ligne);
      if (r1.error) return echec(r1.error, 'ajout impossible');
      const maintenant = new Date().toISOString();
      const r2 = await sb.from('aliments').update({ dernier_usage: maintenant }).eq('id', a.id);
      if (r2.error) console.warn('Nutrition : dernier usage non rangé', r2.error);
      else a.dernier_usage = maintenant;
      S.lignes.push(ligne); S.choix = null; S.msg = '';
      dessiner();
    }
    // Message sans redessiner : ce qui a été saisi dans le formulaire reste en place.
    const refus = m => { S.msg = m; const n = el.querySelector('.nu-ajout .nu-msg'); if (n) n.textContent = m; };
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
      S.choix = { id: aliment.id, quantite: 1 }; S.source = aliment.favori ? 'favoris' : 'recents'; S.msg = '';
      dessiner();
    }
    async function supprimer(id) {
      const { error } = await sb.from('repas_lignes').delete().eq('id', id);
      if (error) return echec(error, 'suppression impossible');
      S.lignes = S.lignes.filter(l => l.id !== id); S.msg = '';
      dessiner();
    }
    async function basculerFavori() {
      const a = trouver(S.choix && S.choix.id);
      if (!a) return;
      const { error } = await sb.from('aliments').update({ favori: !a.favori }).eq('id', a.id);
      if (error) return echec(error, 'favori non rangé');
      a.favori = !a.favori; S.msg = '';
      dessiner();
    }

    // ----- Fenêtre « Sport du jour » -----
    function fenetreSport() {
      const sports = Object.entries(B.SPORTS);
      const ligne = s => '<div class="nu-sport-l"><select class="mrt-champ" name="type" aria-label="Sport"><option value="">Choisis un sport…</option>' + sports.map(x => '<option value="' + x[0] + '"' + (s && s.type === x[0] ? ' selected' : '') + '>' + esc(x[1].libelle) + '</option>').join('') + '</select>' +
        '<span class="pf-unite"><input class="mrt-champ" name="heures" type="text" inputmode="decimal" aria-label="Durée en heures" value="' + (s ? virgule(s.heures) : '') + '">h</span>' +
        '<button type="button" class="mrt-rond is-fermer" data-act="retirer" aria-label="Retirer ce sport">×</button></div>';
      const voile = document.createElement('div');
      voile.className = 'pf-voile';
      voile.innerHTML = '<form class="pf-panneau" role="dialog" aria-modal="true" aria-labelledby="nu-sport-titre" novalidate>' +
        '<div class="pf-barre"><button type="button" class="mrt-btn" data-act="annuler">Annuler</button><button type="submit" class="mrt-btn is-principal">Enregistrer</button></div>' +
        '<p class="pf-titre" id="nu-sport-titre">Sport du jour</p><p class="pf-msg" role="alert"></p><div class="nu-sport-liste">' + (S.sports.length ? S.sports : [null]).map(ligne).join('') + '</div>' +
        '<button type="button" class="mrt-lien" data-act="ajouter-sport">+ Ajouter un sport</button></form>';
      document.body.appendChild(voile);
      const echap = e => { if (e.key === 'Escape') fermer(); };
      const fermer = () => { voile.remove(); document.removeEventListener('keydown', echap); };
      document.addEventListener('keydown', echap);
      voile.addEventListener('mousedown', e => { if (e.target === voile) fermer(); });
      const form = voile.querySelector('form'), liste = voile.querySelector('.nu-sport-liste'), msg = voile.querySelector('.pf-msg');
      form.addEventListener('click', e => {
        const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
        if (act === 'annuler') fermer();
        else if (act === 'ajouter-sport') liste.insertAdjacentHTML('beforeend', ligne(null));
        else if (act === 'retirer') { e.target.closest('.nu-sport-l').remove(); if (!liste.children.length) liste.insertAdjacentHTML('beforeend', ligne(null)); }
      });
      form.addEventListener('submit', e => {
        e.preventDefault();
        const nouveaux = [];
        for (const l of liste.querySelectorAll('.nu-sport-l')) {
          const type = l.querySelector('[name="type"]').value, brut = l.querySelector('[name="heures"]').value.trim();
          if (!type && !brut) continue;
          if (!type) return void (msg.textContent = 'Choisis le sport.');
          const h = nombre(brut);
          if (!(h >= 0.25 && h <= 24)) return void (msg.textContent = 'La durée doit être comprise entre 0,25 et 24 heures.');
          nouveaux.push({ type, heures: Math.round(h * 100) / 100 });
        }
        S.sports = nouveaux; ecrireSport(aujourdhui, nouveaux);
        fermer(); dessiner();
      });
    }

    // ----- Branchements (une fois par rendu de la page) -----
    el.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b || !el.contains(b)) return;
      const act = b.dataset.act;
      if (act === 'profil') window.mrtProfilFenetre({ profil: ctx.profil, id: ctx.id, surEnregistre: redessiner });
      else if (act === 'sport') fenetreSport();
      else if (act === 'source') { S.source = b.dataset.source; S.msg = ''; dessiner(); }
      else if (act === 'choisir') { S.choix = { id: b.dataset.id, quantite: 1 }; S.msg = ''; dessiner(); }
      else if (act === 'moins') { S.choix.quantite = Math.max(0.5, S.choix.quantite - 0.5); dessiner(); }
      else if (act === 'plus') { S.choix.quantite = Math.min(50, S.choix.quantite + 0.5); dessiner(); }
      else if (act === 'repas') { S.repas = b.dataset.repas; dessiner(); }
      else if (act === 'favori') basculerFavori();
      else if (act === 'ajouter') ajouter();
      else if (act === 'supprimer') supprimer(b.dataset.id);
    };
    el.onsubmit = e => { if (e.target.classList.contains('nu-libre')) { e.preventDefault(); creer(e.target); } };
    dessiner();
  };
})();
