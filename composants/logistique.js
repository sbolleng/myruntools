// ===== Logistique d'une course (docs/module-logistique-specification.md) =====
// Page de la course : lecture seule (logements et transports confirmés, options en une ligne, carte, total), matos à cocher et « Jour J ».
// Fiche « Modifier la course », bloc Logistique : saisie de tout (cartes Option / Confirmé / Non retenu), enregistrée avec la fiche.
// En un coup d'œil : « Ta course approche », 5 jours avant la course. Mon profil : « Mon matériel ».
// Jamais montré en lecture seule (partage).
(function () {
  const sb = () => window.mrtSupabase;
  const F = () => window.mrtFormat;
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const lienSur = u => (u && /^https?:\/\//i.test(u) ? u : null);
  const FLECHE = '<svg class="ob-fleche" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const POUBELLE = '<svg class="fc-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const GROUPES = [['en_course', 'En course'], ['avant_apres', 'Avant-après course'], ['autres', 'Autres']];
  const GROUPES_COURTS = { en_course: 'En course', avant_apres: 'Avant-après', autres: 'Autres' };
  const STATUTS = [['option', 'Option'], ['confirme', 'Confirmé'], ['non_retenu', 'Non retenu']];
  const TYPES_TRAJET = [['train', 'Train'], ['avion', 'Avion'], ['voiture', 'Voiture'], ['bus', 'Bus'], ['autre', 'Autre']];
  const TYPES_EQUIP = [['chaussures', 'Chaussures'], ['batons', 'Bâtons'], ['sac', 'Sac'], ['frontale', 'Frontale'], ['montre', 'Montre']];
  const nombre = n => F().nombre(Math.round(Number(n) * 100) / 100);
  const euros = n => nombre(n) + ' €';
  const sans = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const num = v => { const s = String(v == null ? '' : v).trim().replace(',', '.'); return s === '' || isNaN(Number(s)) ? null : Number(s); };
  const vide = v => (String(v == null ? '' : v).trim() || null);
  const prixDe = x => Number(x.prix) || 0;
  const confirme = x => (x.statut || 'confirme') === 'confirme';
  const option = x => x.statut === 'option';

  // Date et heure : « ven. 4 déc. · 15 h » ; une colonne timestamp ou « AAAA-MM-JJTHH:MM ».
  const quand = v => {
    if (!v) return '';
    const [d, h] = String(v).split('T');
    return F().date(d, { semaine: true, annee: false }) + (h && h.slice(0, 5) !== '00:00' ? ' · ' + F().heure(h.slice(0, 5)) : '');
  };
  const heure = v => { const h = v ? String(v).split('T')[1] : ''; return h && h.slice(0, 5) !== '00:00' ? F().heure(h.slice(0, 5)) : ''; };
  const jourDe = v => (v ? String(v).slice(0, 10) : '');
  const heureDe = v => { const h = v ? String(v).split('T')[1] : ''; return h ? h.slice(0, 5) : ''; };
  const assembler = (d, h) => (d ? d + 'T' + (h || '00:00') : null);
  const typeDe = nom => { const n = sans(nom); return (TYPES_EQUIP.find(t => n.includes(sans(t[1]).replace(/s$/, ''))) || [])[0] || null; };
  // Flèche dessinée (design § 12 : jamais un caractère tapé), posée après l'échappement du texte.
  const fleches = h => h.replace(/→/g, window.mrtIcone.droite);
  const nomEquip = e => [e.marque, e.modele].filter(Boolean).join(' ') + (e.surnom ? ' (' + e.surnom + ')' : '');

  // Distance à vol d'oiseau (km) et son écriture : « à 1,2 km du départ ».
  function km(a, b) {
    if (!a || !b || a.latitude == null || b.latitude == null) return null;
    const r = Math.PI / 180, dLat = (b.latitude - a.latitude) * r, dLon = (b.longitude - a.longitude) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  const distance = d => (d == null ? '' : 'à ' + F().nombre(d < 10 ? Math.round(d * 10) / 10 : Math.round(d)).replace('.', ',') + ' km');

  // ----- Adresses : Photon (OpenStreetMap), autocomplétion pendant la frappe, les plus proches du départ d'abord -----
  const formater = p => {
    const rue = [p.housenumber, p.street].filter(Boolean).join(' ');
    const tete = rue || p.name || '';
    const ville = [p.postcode, p.city || p.town || p.village || p.county].filter(Boolean).join(' ');
    return [tete && tete !== ville ? tete : '', ville].filter(Boolean).join(', ') + (p.country && p.countrycode && p.countrycode !== 'FR' ? ', ' + p.country : '');
  };
  // null : service indisponible.
  async function suggerer(q, centre, signal) {
    const pres = centre && centre.latitude != null ? '&lat=' + centre.latitude + '&lon=' + centre.longitude : '';
    try {
      const r = await fetch('https://photon.komoot.io/api/?limit=5&lang=fr&q=' + encodeURIComponent(q) + pres, { signal });
      if (!r.ok) return null;
      const vus = new Set();
      return ((await r.json()).features || []).map(f => ({ texte: formater(f.properties || {}), latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] }))
        .filter(x => x.texte && !vus.has(x.texte) && vus.add(x.texte));
    } catch (e) { return e.name === 'AbortError' ? undefined : null; }
  }

  // ----- Lecture / écriture -----
  async function lire(table, filtre, ordre) {
    let q = sb().from(table).select('*');
    if (filtre) q = q.eq(filtre[0], filtre[1]);
    if (ordre) q = q.order(ordre);
    const r = await q;
    return r.error ? [] : (r.data || []);
  }
  const ecrire = async p => { const r = await p; if (r.error) console.warn(r.error); return !r.error; };
  async function charger(id) {
    const [logements, trajets, catalogue, matos, equipements] = await Promise.all([
      id ? lire('logements', ['course', id], 'arrivee') : [], id ? lire('trajets', ['course', id], 'depart') : [],
      lire('materiel_catalogue', null, 'ordre'), id ? lire('course_materiel', ['course', id]) : [], lire('equipements', null, 'marque')]);
    return { logements, trajets, catalogue, matos, equipements };
  }

  // ----- Calculs -----
  // Total : seuls les éléments confirmés comptent ; les options sont rappelées à part.
  const somme = (l, f) => l.filter(f).reduce((s, x) => s + prixDe(x), 0);
  const totalDe = (c, S) => (Number(c.prix) || 0) + somme(S.logements, confirme) + somme(S.trajets, confirme);
  const optionsDe = S => somme(S.logements, option) + somme(S.trajets, option);

  // ----- Carte des logements (Leaflet, plan OpenStreetMap), centrée sur le départ de la course -----
  const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
  let chargement = null;
  function leaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!chargement) chargement = new Promise((ok, ko) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.min.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = LEAFLET + 'leaflet.min.js'; s.onload = () => ok(window.L); s.onerror = () => { chargement = null; ko(new Error('Leaflet')); };
      document.head.appendChild(s);
    });
    return chargement;
  }
  // zone : un élément vide ; points() rend les logements à montrer. Rend { maj() } pour redessiner les repères.
  function plan(zone, c, points) {
    let carte = null, couche = null, L = null;
    const dessiner = () => {
      if (!carte) return;
      couche.clearLayers();
      const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); // Leaflet dessine en SVG : couleurs du thème lues ici
      const vus = [];
      if (c.latitude != null) {
        L.circleMarker([c.latitude, c.longitude], { radius: 9, color: v('--accent'), fillColor: v('--accent'), fillOpacity: 1, weight: 2 }).bindTooltip('Départ de la course').addTo(couche);
        vus.push([c.latitude, c.longitude]);
      }
      points().filter(l => l.latitude != null).forEach(l => {
        L.circleMarker([l.latitude, l.longitude], { radius: 7, color: v('--text'), fillColor: confirme(l) ? v('--text') : v('--surface'), fillOpacity: 1, weight: 2 })
          .bindTooltip(esc(l.nom || 'Logement') + (l.prix != null ? ' · ' + euros(l.prix) : '')).addTo(couche);
        vus.push([l.latitude, l.longitude]);
      });
      if (vus.length > 1) carte.fitBounds(vus, { padding: [30, 30], maxZoom: 15 });
      else if (vus.length) carte.setView(vus[0], 14);
      zone.hidden = !vus.length;
    };
    const ouvrir = async () => {
      if (carte || !zone.offsetWidth) { if (carte) carte.invalidateSize(); return; }
      try { L = await leaflet(); } catch (e) { zone.hidden = true; return; }
      if (carte) return;
      carte = L.map(zone, { scrollWheelZoom: false, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(carte);
      couche = L.layerGroup().addTo(carte);
      dessiner();
    };
    const visibles = () => c.latitude != null || points().some(l => l.latitude != null);
    zone.hidden = !visibles();
    if (window.ResizeObserver) new ResizeObserver(() => ouvrir()).observe(zone); else ouvrir();
    return { maj() { zone.hidden = !visibles(); if (carte) { carte.invalidateSize(); dessiner(); } else ouvrir(); } };
  }

  // ----- Adresse cliquable : menu Google Maps, Waze, application de l'appareil -----
  const appareil = q => {
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return ['Plans', 'https://maps.apple.com/?q=' + q, true];
    if (/Android/i.test(ua)) return ['Application de cartes', 'geo:0,0?q=' + q, false];
    return ['OpenStreetMap', 'https://www.openstreetmap.org/search?query=' + q, true];
  };
  const adresseCliquable = adresse => {
    const q = encodeURIComponent(adresse);
    const choix = [['Google Maps', 'https://www.google.com/maps/search/?api=1&query=' + q, true], ['Waze', 'https://waze.com/ul?q=' + q + '&navigate=yes', true], appareil(q)];
    return '<span class="lg-adr"><button type="button" class="mrt-lien" data-lg-act="plans" aria-haspopup="true" aria-expanded="false" title="Ouvrir dans une application de cartes">' + esc(adresse) + '</button>' +
      '<span class="mrt-menu" hidden>' + choix.map(x => '<a class="mrt-menu-l" href="' + esc(x[1]) + '"' + (x[2] ? ' target="_blank" rel="noopener"' : '') + '>' + x[0] + '</a>').join('') + '</span></span>';
  };
  if (!window.__lgMenus) {
    window.__lgMenus = true;
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-lg-act="plans"]');
      document.querySelectorAll('.lg-adr .mrt-menu').forEach(m => { if (!b || m !== b.nextElementSibling) m.hidden = true; });
      if (b) { const m = b.nextElementSibling; m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); }
    });
  }

  // ----- Lignes de lecture -----
  const typeLib = t => (TYPES_TRAJET.find(x => x[0] === t.type) || [])[1] || 'Trajet';
  const allerRetour = t => !!t.prix_aller_retour;
  const titreTrajet = t => typeLib(t) + (allerRetour(t) ? ' · aller-retour' : t.sens === 'retour' ? ' · retour' : '');
  const etape = (de, h1, a, h2) => [de, h1].filter(Boolean).join(' ') + (de || a ? ' → ' : '') + [a, h2].filter(Boolean).join(' ');
  function lignesTrajet(t) {
    const voiture = t.type === 'voiture';
    const aller = etape(t.lieu_depart, voiture ? '' : heure(t.depart), t.lieu_arrivee, voiture ? '' : heure(t.arrivee));
    const jA = t.depart && !voiture ? ', ' + F().date(jourDe(t.depart), { semaine: true, annee: false }) : '';
    const l = [];
    if (aller.trim()) l.push((allerRetour(t) ? 'Aller : ' : '') + aller + jA);
    if (allerRetour(t)) {
      const ret = etape(t.retour_lieu_depart, voiture ? '' : heure(t.retour_depart), t.retour_lieu_arrivee, voiture ? '' : heure(t.retour_arrivee));
      const jR = t.retour_depart && !voiture ? ', ' + F().date(jourDe(t.retour_depart), { semaine: true, annee: false }) : '';
      if (ret.trim()) l.push('Retour : ' + ret + jR);
    }
    return l;
  }
  function ligneLogement(l, c) {
    const fleche = lienSur(l.url) ? '<a class="lg-lien-nom mrt-lien" href="' + esc(l.url) + '" target="_blank" rel="noopener" aria-label="Ouvrir le lien du logement" title="Ouvrir le lien du logement">' + FLECHE + '</a>' : '';
    const d = distance(km(c, l));
    return '<div class="lg-ligne"><div class="lg-haut"><span class="lg-nom">' + esc(l.nom) + fleche + '</span>' + (l.prix != null ? '<span class="lg-prix">' + euros(l.prix) + '</span>' : '') + '</div>' +
      (l.adresse ? '<div class="lg-bas">' + adresseCliquable(l.adresse) + (d ? '<span>' + d + ' du départ</span>' : '') + '</div>' : '') +
      (l.arrivee ? '<div class="lg-bas"><span>Arrivée : ' + esc(quand(l.arrivee)) + '</span></div>' : '') +
      (l.depart ? '<div class="lg-bas"><span>Départ : ' + esc(quand(l.depart)) + '</span></div>' : '') + '</div>';
  }
  function ligneTrajet(t) {
    return '<div class="lg-ligne"><div class="lg-haut"><span class="lg-nom">' + esc(titreTrajet(t)) + (lienSur(t.url) ? '<a class="lg-lien-nom mrt-lien" href="' + esc(t.url) + '" target="_blank" rel="noopener" aria-label="Ouvrir la réservation" title="Ouvrir la réservation">' + FLECHE + '</a>' : '') + '</span>' +
      (t.prix != null ? '<span class="lg-prix">' + euros(t.prix) + '</span>' : '') + '</div>' +
      lignesTrajet(t).map(x => '<div class="lg-bas"><span>' + fleches(esc(x)) + '</span></div>').join('') + '</div>';
  }
  // « 1 logement en option (Gîte du Lac, 95 €) »
  const enOption = (l, mot, motPl, nomDe) => (l.length ? '<p class="lg-options">' + l.length + ' ' + (l.length > 1 ? motPl : mot) + ' en option (' + l.map(x => esc(nomDe(x)) + (x.prix != null ? ', ' + euros(x.prix) : '')).join(' ; ') + ')</p>' : '');

  // ----- Matos -----
  const groupeDe = a => (a && GROUPES_COURTS[a.groupe] ? a.groupe : 'autres');
  function articlesDe(S) {
    return S.matos.map(m => Object.assign({}, m, { fiche: S.catalogue.find(a => a.id === m.article) })).filter(m => m.fiche)
      .sort((a, b) => GROUPES.findIndex(g => g[0] === groupeDe(a.fiche)) - GROUPES.findIndex(g => g[0] === groupeDe(b.fiche)) || (b.impose - a.impose) || (a.fiche.ordre - b.fiche.ordre));
  }
  function ligneCoche(m, S, grand) {
    const choisi = S.equipements.find(e => e.id === m.equipement);
    return '<div class="lg-art' + (grand ? ' is-grand' : '') + '"><label class="lg-art-l"><span class="mrt-coche"><input type="checkbox" data-champ="pris" data-article="' + esc(m.article) + '"' + (m.pris ? ' checked' : '') + '></span>' +
      '<span class="lg-art-nom">' + esc(m.fiche.nom) + '</span></label>' + (m.impose ? '<span class="lg-impose">Imposé</span>' : '') +
      (choisi ? '<span class="lg-equip">' + esc(nomEquip(choisi)) + '</span>' : '') + '</div>';
  }
  const parGroupe = (articles, f) => GROUPES.map(([g, lib]) => { const l = articles.filter(a => groupeDe(a.fiche) === g); return l.length ? '<p class="pc-sous-titre lg-cat">' + lib + '</p>' + l.map(f).join('') : ''; }).join('');

  // Mode jour J : la liste du matos seule, plein écran, grandes cases ; cocher s'enregistre aussitôt.
  function jourJ(c, S, redessiner) {
    const voile = document.createElement('div');
    voile.className = 'lg-jourj';
    voile.setAttribute('role', 'dialog');
    voile.setAttribute('aria-label', 'Matos du jour J');
    const dessiner = () => {
      const articles = articlesDe(S), pris = articles.filter(a => a.pris).length;
      voile.innerHTML = '<div class="lg-jourj-haut"><span class="lg-jourj-titre">Jour J · <span class="lg-compte">' + pris + ' / ' + articles.length + ' pris</span></span>' +
        '<button type="button" class="mrt-rond is-fermer" data-jj="fermer" aria-label="Fermer" title="Fermer">' + window.mrtIcone.fermer + '</button></div><div class="lg-jourj-liste">' +
        parGroupe(articles, a => ligneCoche(a, S, true)) + '</div>';
    };
    const fermer = () => { document.removeEventListener('keydown', clavier, true); voile.remove(); redessiner(); };
    const clavier = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); fermer(); } };
    voile.addEventListener('click', e => { if (e.target.closest('[data-jj="fermer"]')) fermer(); });
    voile.addEventListener('change', async e => {
      const t = e.target, a = t.dataset.article, ligne = S.matos.find(m => m.article === a);
      if (!ligne || t.dataset.champ !== 'pris') return;
      ligne.pris = t.checked;
      dessiner();
      await ecrire(sb().from('course_materiel').update({ pris: t.checked }).eq('course', c.id).eq('article', a));
    });
    document.addEventListener('keydown', clavier, true);
    dessiner();
    document.body.appendChild(voile);
    voile.querySelector('[data-jj="fermer"]').focus();
  }

  // ===================== Page de la course (lecture) =====================
  const cache = {};
  function html(c) {
    return '<details class="pc-cellule mrt-deroule lg-cellule" id="logistique" data-lg="' + esc(c.id) + '"><summary>' + window.mrtIcone.chevron + 'Logistique</summary>' +
      '<div class="pc-corps lg-corps"><p class="pc-vide">Chargement…</p></div></details>';
  }
  function corpsHtml(c, S) {
    const total = totalDe(c, S), opt = optionsDe(S);
    const parties = [['Dossard', Number(c.prix) || 0], ['Logement', somme(S.logements, confirme)], ['Transport', somme(S.trajets, confirme)]].filter(p => p[1] > 0);
    const totalHtml = total > 0
      ? '<div class="lg-total"><button type="button" class="mrt-lien" data-lg-act="detail" aria-expanded="' + S.detail + '">Total ' + euros(total) + '</button>' +
        (S.detail ? '<div class="lg-detail">' + parties.map(p => '<span>' + p[0] + ' ' + euros(p[1]) + '</span>').join('') + (opt ? '<span class="lg-opt">En option : ' + euros(opt) + '</span>' : '') + '</div>' : '') + '</div>' : '';
    const logC = S.logements.filter(confirme), logO = S.logements.filter(option), traC = S.trajets.filter(confirme), traO = S.trajets.filter(option);
    const vide = !logC.length && !logO.length && !traC.length && !traO.length && !S.matos.length && !c.logistique;
    const carte = (c.latitude != null || S.logements.some(l => l.latitude != null && !(l.statut === 'non_retenu'))) ? '<div class="lg-plan"></div>' : '';
    const logements = logC.length || logO.length ? '<div class="lg-rubrique"><p class="pc-sous-titre">Logement</p>' + carte + logC.map(l => ligneLogement(l, c)).join('') + enOption(logO, 'logement', 'logements', x => x.nom) + '</div>' : '';
    const trajets = traC.length || traO.length ? '<div class="lg-rubrique"><p class="pc-sous-titre">Transport</p>' + traC.map(ligneTrajet).join('') + enOption(traO, 'transport', 'transports', titreTrajet) + '</div>' : '';
    const articles = articlesDe(S), pris = articles.filter(a => a.pris).length;
    const matos = articles.length ? '<div class="lg-rubrique"><p class="pc-sous-titre lg-titre">Matos <span class="lg-compte">' + pris + ' / ' + articles.length + ' pris</span>' +
      '<span class="lg-actions"><button type="button" class="mrt-btn" data-lg-act="jour-j">Jour J</button></span></p>' + parGroupe(articles, a => ligneCoche(a, S, false)) + '</div>' : '';
    const notes = c.logistique ? '<div class="lg-rubrique"><p class="pc-sous-titre">Notes</p><p>' + esc(c.logistique).replace(/\n/g, '<br>') + '</p></div>' : '';
    return totalHtml + logements + trajets + matos + notes + (vide ? '<p class="pc-vide">Rien de prévu : « Modifier la course » pour ajouter logement, transport et matos.</p>' : '');
  }
  function brancher(el, c) {
    const cellule = el.querySelector('#logistique');
    if (!cellule) return;
    const corps = cellule.querySelector('.lg-corps');
    const S = cache[c.id] || (cache[c.id] = { logements: [], trajets: [], catalogue: [], matos: [], equipements: [], charge: false });
    S.detail = false;
    let carte = null;
    const dessiner = () => {
      if (!S.charge) return;
      corps.innerHTML = corpsHtml(c, S);
      const t = totalDe(c, S);
      cellule.dataset.total = t ? euros(t) : '';
      const z = corps.querySelector('.lg-plan');
      carte = z ? plan(z, c, () => S.logements.filter(l => l.statut !== 'non_retenu')) : null;
    };
    cellule.addEventListener('toggle', () => { if (carte) carte.maj(); });
    corps.addEventListener('click', ev => {
      const b = ev.target.closest('[data-lg-act]');
      if (!b) return;
      if (b.dataset.lgAct === 'detail') { S.detail = !S.detail; dessiner(); }
      if (b.dataset.lgAct === 'jour-j') jourJ(c, S, dessiner);
    });
    corps.addEventListener('change', async ev => {
      const t = ev.target, a = t.dataset.article, ligne = S.matos.find(m => m.article === a);
      if (!ligne || t.dataset.champ !== 'pris') return;
      ligne.pris = t.checked;
      dessiner();
      if (!await ecrire(sb().from('course_materiel').update({ pris: t.checked }).eq('course', c.id).eq('article', a))) { ligne.pris = !t.checked; dessiner(); }
    });
    dessiner();
    charger(c.id).then(d => { Object.assign(S, d, { charge: true }); dessiner(); });
  }

  // ===================== Autocomplétion (adresse, matos) =====================
  // wrap : l'élément .lg-auto qui contient le champ ; source(q, signal) rend [{ texte, aside, valeur }] (ou null : service absent) ;
  // choisir(item) ; la liste s'affiche sous le champ pendant la frappe ; flèches, Entrée, Échap.
  function autocompletion(wrap, source, choisir, attente) {
    const champ = wrap.querySelector('input');
    let liste = null, items = [], actif = -1, minuteur = null, ctrl = null, pour = null; // pour : le texte des propositions affichées
    const fermer = () => { if (liste) liste.remove(); liste = null; items = []; actif = -1; pour = null; champ.setAttribute('aria-expanded', 'false'); };
    const montrer = () => {
      if (!items.length) { fermer(); return; }
      if (!liste) { liste = document.createElement('div'); liste.className = 'lg-auto-liste'; liste.setAttribute('role', 'listbox'); wrap.appendChild(liste); }
      liste.innerHTML = items.map((x, i) => '<div class="lg-auto-l' + (i === actif ? ' is-on' : '') + '" role="option" data-i="' + i + '"><span>' + (x.html || esc(x.texte)) + '</span>' + (x.aside ? '<small>' + esc(x.aside) + '</small>' : '') + '</div>').join('');
      champ.setAttribute('aria-expanded', 'true');
    };
    const chercher = async () => {
      const q = champ.value.trim();
      if (ctrl) ctrl.abort();
      ctrl = window.AbortController ? new AbortController() : null;
      const r = await source(q, ctrl && ctrl.signal);
      if (r === undefined || champ.value.trim() !== q) return; // réponse dépassée
      items = r || []; pour = q; actif = items.length ? 0 : -1; montrer();
    };
    champ.setAttribute('autocomplete', 'off');
    champ.setAttribute('aria-autocomplete', 'list');
    champ.addEventListener('input', () => { clearTimeout(minuteur); minuteur = setTimeout(chercher, attente || 0); });
    champ.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Propositions d'une frappe précédente : relancer la recherche sur le texte actuel avant de choisir.
        const choix = () => { if (liste && items[actif]) { const x = items[actif]; fermer(); choisir(x); } };
        if (pour !== champ.value.trim()) { clearTimeout(minuteur); chercher().then(choix); } else choix();
        return;
      }
      if (!liste) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); actif = (actif + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; montrer(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermer(); }
    });
    champ.addEventListener('blur', () => setTimeout(fermer, 150));
    wrap.addEventListener('mousedown', e => { const l = e.target.closest('.lg-auto-l'); if (l) { e.preventDefault(); const x = items[+l.dataset.i]; fermer(); choisir(x); } });
  }

  // ===================== Fiche « Modifier la course », bloc Logistique =====================
  const pastilles = (act, choix, v, extra) => '<span class="lg-pastilles">' + choix.map(([k, lib]) => '<button type="button" class="mrt-pastille' + (k === v ? ' is-on' : '') + '" aria-pressed="' + (k === v) + '" data-ed="' + act + '" data-v="' + k + '"' + (extra || '') + '>' + lib + '</button>').join('') + '</span>';
  const champE = (f, lib, v, type, extra, large) => '<div class="lg-champ' + (large ? ' lg-large' : '') + '"><label>' + lib + '</label><input class="mrt-champ" data-f="' + f + '" type="' + (type || 'text') + '" value="' + esc(v == null ? '' : v) + '"' + (extra || '') + '></div>';
  const quandE = (f, lib, v) => '<div class="lg-champ"><label>' + lib + '</label><span class="lg-duo"><input class="mrt-champ" type="date" data-f="' + f + ':d" value="' + esc(jourDe(v)) + '" aria-label="' + lib + ', jour"><input class="mrt-champ" type="time" data-f="' + f + ':h" value="' + esc(heureDe(v) === '00:00' ? '' : heureDe(v)) + '" aria-label="' + lib + ', heure"></span></div>';
  const etiquette = s => '<span class="lg-etat is-' + (s || 'confirme') + '">' + (STATUTS.find(x => x[0] === (s || 'confirme')) || [])[1] + '</span>';

  function edition(zone, c) {
    const E = { logements: [], trajets: [], catalogue: [], matos: [], equipements: [], suppr: { logement: new Set(), trajet: new Set() }, retires: new Set(), ouverts: new Set(), nonRetenus: { logement: false, trajet: false }, charge: false };
    zone.innerHTML = '<div class="lg-ed"><p class="pc-vide">Chargement…</p></div>';
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }); // jamais « Enregistrer » la fiche par Entrée ici
    let carte = null;
    const liste = r => (r === 'logement' ? E.logements : E.trajets);
    const ouvert = x => E.ouverts.has(x._k);
    const sommes = r => {
      const l = liste(r).filter(x => !x._vide), c1 = somme(l, confirme), o = somme(l, option);
      return [c1 ? 'Confirmé : ' + euros(c1) : '', o ? 'en option : ' + euros(o) : ''].filter(Boolean).join(' · ');
    };

    // --- Cartes de logement ---
    function carteLogement(l) {
      const cls = 'lg-carte' + (option(l) ? ' is-option' : '') + (l.statut === 'non_retenu' ? ' is-non' : '');
      if (!ouvert(l)) {
        const d = distance(km(c, l));
        return '<div class="' + cls + '" data-k="' + l._k + '"><div class="lg-resume" role="button" tabindex="0" data-ed="deplier" aria-expanded="false">' +
          '<span class="lg-carte-h"><span class="lg-carte-nom">' + esc(l.nom || 'Logement') + '</span>' + etiquette(l.statut) + (l.prix != null ? '<span class="lg-prix">' + euros(l.prix) + '</span>' : '') + '</span>' +
          (l.adresse ? '<span class="lg-carte-l">' + esc(l.adresse) + (d ? ' · ' + d + ' du départ' : '') + '</span>' : '') +
          (l.arrivee || l.depart ? '<span class="lg-carte-l">' + fleches(esc([quand(l.arrivee), quand(l.depart)].filter(Boolean).join(' → '))) + '</span>' : '') + '</div></div>';
      }
      return '<div class="' + cls + ' is-ouverte" data-k="' + l._k + '"><div class="lg-carte-h">' + pastilles('statut', STATUTS, l.statut || 'confirme') +
        '<button type="button" class="mrt-lien is-danger" data-ed="supprimer">Supprimer</button></div>' +
        '<div class="lg-grille">' + champE('nom', 'Nom', l.nom, 'text', ' maxlength="100"') + champE('url', 'Lien', l.url, 'url', ' maxlength="500" placeholder="https://"') +
        '<div class="lg-champ lg-large"><label>Adresse</label><div class="lg-auto"><input class="mrt-champ" data-f="adresse" type="text" value="' + esc(l.adresse || '') + '" maxlength="200" placeholder="Commence à taper l\'adresse"></div></div>' +
        quandE('arrivee', 'Arrivée', l.arrivee) + quandE('depart', 'Départ', l.depart) +
        champE('prix', 'Prix (€)', l.prix != null ? String(l.prix).replace('.', ',') : '', 'text', ' inputmode="decimal"') + '</div>' +
        (l._nouveau ? '' : '<button type="button" class="mrt-lien lg-replier" data-ed="replier">Replier</button>') + '</div>';
    }
    // --- Cartes de transport ---
    function carteTrajet(t) {
      const cls = 'lg-carte' + (option(t) ? ' is-option' : '') + (t.statut === 'non_retenu' ? ' is-non' : '');
      if (!ouvert(t)) {
        return '<div class="' + cls + '" data-k="' + t._k + '"><div class="lg-resume" role="button" tabindex="0" data-ed="deplier" aria-expanded="false">' +
          '<span class="lg-carte-h"><span class="lg-carte-nom">' + esc(titreTrajet(t)) + '</span>' + etiquette(t.statut) + (t.prix != null ? '<span class="lg-prix">' + euros(t.prix) + '</span>' : '') + '</span>' +
          lignesTrajet(t).map(x => '<span class="lg-carte-l">' + fleches(esc(x)) + '</span>').join('') + '</div></div>';
      }
      const voiture = t.type === 'voiture', ar = allerRetour(t);
      const sens = (pre, lib) => '<div class="lg-sens"><span class="lg-sens-t">' + lib + '</span><div class="lg-sens-l">' +
        '<div class="lg-champ"><label>De</label><input class="mrt-champ" data-f="' + pre + 'lieu_depart" value="' + esc(t[pre + 'lieu_depart'] || '') + '" maxlength="100"></div>' +
        (voiture ? '' : quandE(pre + 'depart', 'Départ', t[pre + 'depart'])) +
        '<div class="lg-champ"><label>À</label><input class="mrt-champ" data-f="' + pre + 'lieu_arrivee" value="' + esc(t[pre + 'lieu_arrivee'] || '') + '" maxlength="100"></div>' +
        (voiture ? '' : quandE(pre + 'arrivee', 'Arrivée', t[pre + 'arrivee'])) + '</div></div>';
      return '<div class="' + cls + ' is-ouverte" data-k="' + t._k + '"><div class="lg-carte-h">' + pastilles('statut', STATUTS, t.statut || 'confirme') +
        '<button type="button" class="mrt-lien is-danger" data-ed="supprimer">Supprimer</button></div>' +
        '<div class="lg-ligne-p">' + pastilles('type', TYPES_TRAJET, t.type || 'train') + '</div>' +
        '<div class="lg-ligne-p">' + pastilles('ar', [['simple', 'Aller simple'], ['ar', 'Aller-retour']], ar ? 'ar' : 'simple') + '</div>' +
        sens('', ar ? 'Aller' : 'Trajet') + (ar ? sens('retour_', 'Retour') : '') +
        '<div class="lg-grille">' + champE('prix', ar ? 'Prix de l\'aller-retour (€)' : 'Prix (€)', t.prix != null ? String(t.prix).replace('.', ',') : '', 'text', ' inputmode="decimal"') +
        champE('url', 'Lien de réservation', t.url, 'url', ' maxlength="500" placeholder="https://"') + '</div>' +
        (t._nouveau ? '' : '<button type="button" class="mrt-lien lg-replier" data-ed="replier">Replier</button>') + '</div>';
    }
    function rubrique(r) {
      const box = zone.querySelector('.lg-cartes[data-r="' + r + '"]');
      const f = r === 'logement' ? carteLogement : carteTrajet;
      const l = liste(r), actifs = l.filter(x => x.statut !== 'non_retenu' || ouvert(x)), nr = l.filter(x => x.statut === 'non_retenu' && !ouvert(x));
      box.innerHTML = actifs.map(f).join('') +
        (nr.length ? '<button type="button" class="mrt-lien lg-replie" data-ed="non-retenus" aria-expanded="' + E.nonRetenus[r] + '">Non retenus (' + nr.length + ')</button>' + (E.nonRetenus[r] ? nr.map(f).join('') : '') : '') +
        '<button type="button" class="mrt-btn lg-ajouter" data-ed="ajouter">' + (r === 'logement' ? 'Ajouter un logement' : 'Ajouter un transport') + '</button>';
      zone.querySelector('.lg-somme[data-r="' + r + '"]').textContent = sommes(r);
      if (r === 'logement') {
        box.querySelectorAll('.lg-carte.is-ouverte').forEach(el => {
          const x = E.logements.find(y => y._k === el.dataset.k);
          autocompletion(el.querySelector('.lg-auto'), async (q, signal) => {
            if (q.length < 3) return [];
            const s = await suggerer(q, c, signal);
            if (!s) return s;
            return s.map(a => ({ texte: a.texte, aside: distance(km(c, a)) ? distance(km(c, a)) + ' du départ' : '', valeur: a }));
          }, it => { Object.assign(x, { adresse: it.texte, latitude: it.valeur.latitude, longitude: it.valeur.longitude }); el.querySelector('[data-f="adresse"]').value = it.texte; if (carte) carte.maj(); }, 300);
        });
        if (carte) carte.maj();
      }
    }

    // --- Matos ---
    function matos() {
      const box = zone.querySelector('.lg-matos');
      const articles = articlesDe(E);
      const ligne = m => {
        const type = typeDe(m.fiche.nom), equips = type ? E.equipements.filter(e => e.type === type && e.actif !== false) : [];
        return '<div class="lg-art" data-article="' + esc(m.article) + '"><span class="lg-art-nom">' + esc(m.fiche.nom) + '</span><span class="lg-outils">' +
          pastilles('groupe', Object.entries(GROUPES_COURTS), groupeDe(m.fiche)) +
          '<label class="lg-bascule"><span class="mrt-coche"><input type="checkbox" data-ed-coche="impose"' + (m.impose ? ' checked' : '') + '></span>Imposé</label>' +
          (equips.length ? '<select class="mrt-champ" data-ed-equip aria-label="Équipement"><option value="">Équipement…</option>' + equips.map(e => '<option value="' + esc(e.id) + '"' + (e.id === m.equipement ? ' selected' : '') + '>' + esc(nomEquip(e)) + '</option>').join('') + '</select>' : '') +
          '<button type="button" class="mrt-lien is-danger" data-ed="retirer">Retirer</button></span></div>';
      };
      box.innerHTML = '<div class="lg-auto lg-auto-matos"><input class="mrt-champ" type="text" maxlength="80" placeholder="Ajouter un article : frontale, veste…" aria-label="Ajouter un article"></div>' +
        (articles.length ? parGroupe(articles, ligne) : '<p class="pc-vide">Aucun article pour cette course.</p>');
      const dans = new Set(E.matos.map(m => m.article));
      autocompletion(box.querySelector('.lg-auto'), async q => {
        if (!q) return [];
        const s = sans(q);
        const connus = E.catalogue.filter(a => !dans.has(a.id) && sans(a.nom).includes(s)).slice(0, 6)
          .map(a => ({ texte: a.nom, html: esc(a.nom), aside: 'déjà dans ton matos', valeur: a }));
        const exact = E.catalogue.some(a => sans(a.nom) === s);
        return exact ? connus : connus.concat([{ texte: q, html: 'Ajouter « ' + esc(q) + ' » comme nouvel article', aside: 'Entrée', valeur: null }]);
      }, it => {
        let a = it.valeur;
        if (!a) { a = { id: uuid(), nom: it.texte.slice(0, 80), groupe: 'autres', ordre: E.catalogue.length, _nouveau: true }; E.catalogue.push(a); }
        E.retires.delete(a.id);
        E.matos.push({ article: a.id, impose: false, pris: false, equipement: null, _nouveau: !E.matosAvant.has(a.id) });
        matos();
        const champ = zone.querySelector('.lg-auto-matos input'); if (champ) champ.focus();
      });
    }

    function tout() {
      zone.innerHTML = '<div class="lg-ed">' +
        '<div class="lg-rubrique"><p class="lg-rub-t"><span class="pc-sous-titre">Logement</span><span class="lg-somme" data-r="logement"></span></p><div class="lg-plan"></div><div class="lg-cartes" data-r="logement"></div></div>' +
        '<div class="lg-rubrique"><p class="lg-rub-t"><span class="pc-sous-titre">Transport</span><span class="lg-somme" data-r="trajet"></span></p><div class="lg-cartes" data-r="trajet"></div></div>' +
        '<div class="lg-rubrique"><p class="lg-rub-t"><span class="pc-sous-titre">Matos</span></p><div class="lg-matos"></div></div></div>';
      carte = plan(zone.querySelector('.lg-plan'), c, () => E.logements.filter(l => l.statut !== 'non_retenu'));
      rubrique('logement'); rubrique('trajet'); matos();
    }

    const element = el => { const k = el.closest('[data-k]'); if (!k) return null; return E.logements.find(x => x._k === k.dataset.k) || E.trajets.find(x => x._k === k.dataset.k); };
    const rubriqueDe = el => el.closest('.lg-cartes').dataset.r;
    zone.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-ed]');
      if (!b || !zone.contains(b)) return;
      const act = b.dataset.ed;
      if (act === 'groupe') {
        const a = E.catalogue.find(x => x.id === b.closest('[data-article]').dataset.article);
        if (a) { a.groupe = b.dataset.v; a._groupe = true; matos(); }
        return;
      }
      if (act === 'retirer') {
        const id = b.closest('[data-article]').dataset.article;
        E.matos = E.matos.filter(m => m.article !== id);
        if (E.matosAvant.has(id)) E.retires.add(id);
        matos(); return;
      }
      const r = b.closest('.lg-cartes') ? rubriqueDe(b) : null;
      if (act === 'ajouter') {
        const x = r === 'logement' ? { _k: uuid(), _nouveau: true, statut: 'option' } : { _k: uuid(), _nouveau: true, statut: 'option', type: 'train', sens: 'aller', prix_aller_retour: false };
        liste(r).push(x); E.ouverts.add(x._k); rubrique(r);
        const champ = zone.querySelector('[data-k="' + x._k + '"] input[data-f]'); if (champ) champ.focus();
        return;
      }
      if (act === 'non-retenus') { E.nonRetenus[r] = !E.nonRetenus[r]; rubrique(r); return; }
      const x = element(b);
      if (!x) return;
      if (act === 'deplier') { E.ouverts.add(x._k); rubrique(r); return; }
      if (act === 'replier') { E.ouverts.delete(x._k); rubrique(r); return; }
      if (act === 'statut') { x.statut = b.dataset.v; rubrique(r); return; }
      if (act === 'type') { x.type = b.dataset.v; rubrique(r); return; }
      if (act === 'ar') {
        x.prix_aller_retour = b.dataset.v === 'ar';
        // Retour présaisi à l'envers, tant qu'il est vide.
        if (x.prix_aller_retour) { if (!x.retour_lieu_depart) x.retour_lieu_depart = x.lieu_arrivee || ''; if (!x.retour_lieu_arrivee) x.retour_lieu_arrivee = x.lieu_depart || ''; }
        rubrique(r); return;
      }
      if (act === 'supprimer') {
        if (!x._nouveau && !await window.mrtConfirmer({ texte: r === 'logement' ? 'Supprimer ce logement ?' : 'Supprimer ce transport ?', action: 'Supprimer', danger: true })) return;
        if (!x._nouveau) E.suppr[r].add(x.id);
        const l = liste(r); l.splice(l.indexOf(x), 1); rubrique(r);
      }
    });
    zone.addEventListener('keydown', ev => {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.lg-resume')) { ev.preventDefault(); ev.target.click(); }
    });
    zone.addEventListener('input', ev => {
      const f = ev.target.dataset.f, x = f && element(ev.target);
      if (!x) return;
      if (f.includes(':')) {
        const base = f.split(':')[0], k = ev.target.closest('[data-k]');
        x[base] = assembler(k.querySelector('[data-f="' + base + ':d"]').value, k.querySelector('[data-f="' + base + ':h"]').value);
      } else if (f === 'prix') x.prix = num(ev.target.value);
      else x[f] = ev.target.value;
      if (f === 'adresse') { x.latitude = null; x.longitude = null; } // saisie à la main : coordonnées cherchées à l'enregistrement
      if (f === 'nom' || f === 'prix') zone.querySelector('.lg-somme[data-r="' + rubriqueDe(ev.target) + '"]').textContent = sommes(rubriqueDe(ev.target));
    });
    zone.addEventListener('change', ev => {
      const art = ev.target.closest('[data-article]'), m = art && E.matos.find(y => y.article === art.dataset.article);
      if (!m) return;
      if (ev.target.dataset.edCoche === 'impose') m.impose = ev.target.checked;
      if (ev.target.hasAttribute('data-ed-equip')) m.equipement = ev.target.value || null;
    });

    charger(c.id).then(d => {
      const k = x => Object.assign({}, x, { _k: x.id });
      E.logements = d.logements.map(k); E.trajets = d.trajets.map(k);
      E.catalogue = d.catalogue.map(a => Object.assign({}, a)); E.matos = d.matos.map(m => Object.assign({}, m)); E.equipements = d.equipements;
      E.matosAvant = new Set(d.matos.map(m => m.article));
      E.charge = true;
      tout();
    });

    // Contrôle avant d'enregistrer la course : un logement a un nom.
    const videLogement = l => !vide(l.nom) && !vide(l.adresse) && l.prix == null && !vide(l.url) && !l.arrivee && !l.depart;
    const videTrajet = t => !vide(t.lieu_depart) && !vide(t.lieu_arrivee) && t.prix == null && !vide(t.url) && !t.depart && !t.arrivee;
    function valider() {
      if (!E.charge) return null;
      const manque = E.logements.find(l => !(l._nouveau && videLogement(l)) && !vide(l.nom));
      if (!manque) return null;
      E.ouverts.add(manque._k); rubrique('logement');
      const champ = zone.querySelector('[data-k="' + manque._k + '"] [data-f="nom"]'); if (champ) { champ.setAttribute('aria-invalid', 'true'); champ.focus(); }
      return 'Indique le nom de chaque logement.';
    }
    // Enregistrement, après celui de la course (id : la course, neuve ou non). Rend vrai si tout est enregistré.
    async function enregistrer(id) {
      if (!E.charge) return true;
      let ok = true;
      const t = async p => { ok = (await ecrire(p)) && ok; };
      for (const x of E.suppr.logement) await t(sb().from('logements').delete().eq('id', x));
      for (const x of E.suppr.trajet) await t(sb().from('trajets').delete().eq('id', x));
      for (const l of E.logements) {
        if (l._nouveau && videLogement(l)) continue;
        if (vide(l.adresse) && l.latitude == null) {
          const s = await suggerer(l.adresse, c);
          if (s && s[0]) { l.latitude = s[0].latitude; l.longitude = s[0].longitude; }
        }
        const p = { nom: String(l.nom).trim(), adresse: vide(l.adresse), url: vide(l.url), prix: l.prix == null ? null : Number(l.prix), arrivee: l.arrivee || null, depart: l.depart || null,
          statut: l.statut || 'confirme', latitude: vide(l.adresse) ? l.latitude : null, longitude: vide(l.adresse) ? l.longitude : null };
        await t(l._nouveau ? sb().from('logements').insert(Object.assign({ course: id }, p)) : sb().from('logements').update(p).eq('id', l.id));
      }
      for (const x of E.trajets) {
        if (x._nouveau && videTrajet(x)) continue;
        const ar = allerRetour(x), voiture = x.type === 'voiture';
        const p = { type: x.type || 'train', sens: x.sens === 'retour' && !ar ? 'retour' : 'aller', prix_aller_retour: ar, statut: x.statut || 'confirme',
          lieu_depart: vide(x.lieu_depart), lieu_arrivee: vide(x.lieu_arrivee), depart: voiture ? null : x.depart || null, arrivee: voiture ? null : x.arrivee || null,
          retour_lieu_depart: ar ? vide(x.retour_lieu_depart) : null, retour_lieu_arrivee: ar ? vide(x.retour_lieu_arrivee) : null,
          retour_depart: ar && !voiture ? x.retour_depart || null : null, retour_arrivee: ar && !voiture ? x.retour_arrivee || null : null,
          url: vide(x.url), prix: x.prix == null ? null : Number(x.prix) };
        await t(x._nouveau ? sb().from('trajets').insert(Object.assign({ course: id }, p)) : sb().from('trajets').update(p).eq('id', x.id));
      }
      const nouveaux = E.catalogue.filter(a => a._nouveau && E.matos.some(m => m.article === a.id));
      if (nouveaux.length) await t(sb().from('materiel_catalogue').insert(nouveaux.map(a => ({ id: a.id, nom: a.nom, groupe: a.groupe, categorie: 'Autre', ordre: a.ordre }))));
      for (const a of E.catalogue.filter(y => y._groupe && !y._nouveau)) await t(sb().from('materiel_catalogue').update({ groupe: a.groupe }).eq('id', a.id));
      for (const a of E.retires) await t(sb().from('course_materiel').delete().eq('course', id).eq('article', a));
      const neufs = E.matos.filter(m => m._nouveau);
      if (neufs.length) await t(sb().from('course_materiel').insert(neufs.map(m => ({ course: id, article: m.article, impose: !!m.impose, pris: false, equipement: m.equipement || null }))));
      for (const m of E.matos.filter(y => !y._nouveau)) await t(sb().from('course_materiel').update({ impose: !!m.impose, equipement: m.equipement || null }).eq('course', id).eq('article', m.article));
      delete cache[id];
      return ok;
    }
    return { valider, enregistrer };
  }

  // ===================== En un coup d'œil : « Ta course approche » (J-5) =====================
  function approche(zone, c) {
    charger(c.id).then(S => {
      const l = S.logements.find(confirme), t = S.trajets.find(confirme), articles = articlesDe(S), pris = articles.filter(a => a.pris).length;
      const lignes = [];
      if (l) lignes.push('Logement : ' + esc(l.nom) + (l.arrivee ? ' · arrivée ' + esc(quand(l.arrivee)) : ''));
      if (t) lignes.push(esc(typeLib(t)) + ' : ' + esc([t.depart && t.type !== 'voiture' ? quand(t.depart) : '', t.lieu_depart].filter(Boolean).join(', ') || titreTrajet(t)));
      if (!lignes.length && !articles.length) { zone.hidden = true; return; }
      zone.innerHTML = lignes.map(x => '<p class="lg-approche-l">' + x + '</p>').join('') +
        (articles.length ? '<div class="lg-jauge" role="img" aria-label="' + pris + ' sur ' + articles.length + ' pris"><i style="width:' + Math.round(100 * pris / articles.length) + '%"></i></div>' +
          '<p class="lg-approche-b"><span>Matos : ' + pris + ' / ' + articles.length + ' pris</span><button type="button" class="mrt-btn" data-lg-act="jour-j">Jour J</button></p>' : '');
      const b = zone.querySelector('[data-lg-act="jour-j"]');
      if (b) b.addEventListener('click', () => jourJ(c, S, () => approche(zone, c)));
    });
  }

  // Champs de « Mon matériel » : libellé au-dessus, champ commun mrt-champ.
  const champ = (nom, lib, valeur, type, extra) => '<div class="lg-champ"><label>' + lib + '</label><input class="mrt-champ" name="' + nom + '" type="' + (type || 'text') + '" value="' + esc(valeur) + '"' + (extra || '') + '></div>';
  const liste = (nom, lib, options, valeur) => '<div class="lg-champ"><label>' + lib + '</label><select class="mrt-champ" name="' + nom + '">' +
    options.map(o => '<option value="' + o[0] + '"' + (o[0] === valeur ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';

  // ===================== Mon matériel (Mon profil) =====================
  let equipements = [];
  function equipHtml(e, mode) {
    if (mode === e.id) return formEquip(e);
    const type = (TYPES_EQUIP.find(t => t[0] === e.type) || [])[1] || e.type;
    const km = e.type === 'chaussures' ? [Number(e.km_depart) ? 'départ ' + nombre(e.km_depart) + ' km' : '', e.km_limite ? 'limite ' + nombre(e.km_limite) + ' km' : ''].filter(Boolean).join(' · ') : '';
    return '<div class="st-connexion"><span>' + esc(nomEquip(e) || type) + '<small>' + esc([type, km, e.actif === false ? 'retiré' : ''].filter(Boolean).join(' · ')) + '</small></span>' +
      '<button type="button" class="mrt-rond" data-mm-act="modifier" data-id="' + esc(e.id) + '" aria-label="Modifier l\'équipement" title="Modifier l\'équipement">' + window.mrtIcone.crayon + '</button></div>';
  }
  function formEquip(e) {
    e = e || {};
    const km = e.type === 'chaussures' || !e.id;
    return '<form class="lg-form lg-form-eq" autocomplete="off">' + liste('type', 'Type', TYPES_EQUIP, e.type || 'chaussures') + champ('marque', 'Marque', e.marque, 'text', ' maxlength="60"') +
      champ('modele', 'Modèle', e.modele, 'text', ' maxlength="60"') + champ('surnom', 'Surnom', e.surnom, 'text', ' maxlength="40" placeholder="les rouges"') +
      '<div class="lg-champ lg-km"' + (km ? '' : ' hidden') + '><label>Kilomètres au départ</label><input class="mrt-champ" name="km_depart" type="text" inputmode="decimal" value="' + esc(e.km_depart != null ? String(e.km_depart).replace('.', ',') : '') + '"></div>' +
      '<div class="lg-champ lg-km"' + (km ? '' : ' hidden') + '><label>Limite (km)</label><input class="mrt-champ" name="km_limite" type="text" inputmode="decimal" value="' + esc(e.km_limite != null ? String(e.km_limite).replace('.', ',') : '') + '"></div>' +
      '<label class="lg-bascule lg-actif"><span class="mrt-coche"><input type="checkbox" name="actif"' + (e.actif === false ? '' : ' checked') + '></span>En service</label>' +
      '<div class="lg-pied"><button type="button" class="mrt-btn" data-mm-act="annuler">Annuler</button><button type="submit" class="mrt-btn is-principal">Enregistrer</button></div>' +
      (e.id ? '<div class="lg-bas-seul"><button type="button" class="mrt-btn is-danger" data-mm-act="supprimer" data-id="' + esc(e.id) + '">' + POUBELLE + 'Supprimer</button></div>' : '') + '</form>';
  }

  // Section de la page Mon profil : « zone » est l'élément <section> ; redessinée sans attendre depuis le cache.
  function materiel(zone) {
    if (!zone) return;
    let mode = null; // null | 'nouveau' | id
    const dessiner = () => {
      zone.innerHTML = '<h2 class="mrt-section-titre ps-section-t">Mon matériel</h2><div class="ps-groupe-l">' +
        (equipements.length ? equipements.map(e => equipHtml(e, mode)).join('') : '<p class="pc-vide lg-vide-eq">Aucun équipement.</p>') +
        (mode === 'nouveau' ? formEquip(null) : '<div class="st-connexion"><button type="button" class="mrt-btn" data-mm-act="ajouter">+ Ajouter un équipement</button></div>') + '</div>';
    };
    const recharger = async () => { equipements = await lire('equipements', null, 'marque'); dessiner(); };
    zone.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-mm-act]');
      if (!b) return;
      const act = b.dataset.mmAct;
      if (act === 'ajouter') { mode = 'nouveau'; dessiner(); } else if (act === 'modifier') { mode = b.dataset.id; dessiner(); } else if (act === 'annuler') { mode = null; dessiner(); } else if (act === 'supprimer') {
        if (!await window.mrtConfirmer({ texte: 'Supprimer cet équipement ?', action: 'Supprimer', danger: true })) return;
        await ecrire(sb().from('equipements').delete().eq('id', b.dataset.id));
        mode = null; await recharger();
      }
    });
    zone.addEventListener('change', ev => {
      if (ev.target.name !== 'type') return;
      zone.querySelectorAll('.lg-km').forEach(x => { x.hidden = ev.target.value !== 'chaussures'; });
    });
    zone.addEventListener('submit', async ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target)), vide = v => (String(v || '').trim() || null);
      const ligne = { type: d.type, marque: vide(d.marque), modele: vide(d.modele), surnom: vide(d.surnom), actif: d.actif === 'on',
        km_depart: d.type === 'chaussures' ? (num(d.km_depart) || 0) : 0, km_limite: d.type === 'chaussures' ? num(d.km_limite) : null };
      if (!ligne.marque && !ligne.modele && !ligne.surnom) { ev.target.querySelector('[name="marque"]').focus(); return; }
      await ecrire(mode === 'nouveau' ? sb().from('equipements').insert(Object.assign({ id: uuid() }, ligne)) : sb().from('equipements').update(ligne).eq('id', mode));
      mode = null; await recharger();
    });
    dessiner();
    recharger();
  }

  window.mrtLogistique = { html, brancher, edition, approche, materiel, totalDe, GROUPES };
})();
