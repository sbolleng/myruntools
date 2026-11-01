// ===== Tracé GPX d'une course : import, carte, profil altimétrique, téléchargement =====
//
// Décrit par docs/module-objectif-specification.md (§ 3.4, n° 25 à 28 et 32) ; style : composants/trace.css.
// Le fichier est rangé dans le stockage Supabase (espace privé « traces », supabase/evolutions/016-traces-gpx.sql) :
// traces/<utilisateur>/<course>.gpx ; la course garde le chemin dans courses.gpx.
//   mrtTrace.verifier(fichier)        → Promise<{ pistes: [{ nom, km, texte }] } | { erreur }> : extension, taille (5 Mo),
//                                       contenu lisible ; un élément par tracé du fichier (texte : le fichier réduit à ce tracé)
//   mrtTrace.choisir(zone, pistes, km) → Promise<piste|null> : plusieurs tracés, l'utilisateur garde le sien
//   mrtTrace.ranger(course, texte)    → Promise<erreur|null> : envoie le fichier et note son chemin dans la course
//   mrtTrace.retirer(course)          → Promise<erreur|null> : efface le fichier et le chemin
//   mrtTrace.telecharger(course)      télécharge le fichier (nom : celui de la course)
//   mrtTrace.dessiner(el, course)     carte (Leaflet, fond OpenTopoMap) et profil dans el ; une seule fois par élément
//   mrtTrace.pente(trace, km)         → { alt, pente } : altitude lissée (m) et pente (%) sur 100 m centrés au kilomètre km
//   mrtTrace.miniature(course)        → Promise<svg|null> : le tracé seul, sur un fond dessiné (quadrillage), pour la carte d'une étape ; null sans tracé
//   mrtTrace.lire(texte, km)          → { nom, points: [[lat, lon, alt|null, km, saut]], segments, km } : le tracé (le plus proche de km
//                                       s'il y en a plusieurs) ou null
(function () {
  const ESPACE = 'traces';
  const MAX = 5 * 1024 * 1024;
  const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  const nombre = n => nf.format(n).replace(/[  ]/g, ' ');
  const FLECHE_BAS = '<svg class="tr-ico" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v6.5M3 5.5L6 8.5l3-3M2 10.5h8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const stockage = () => window.mrtSupabase.storage.from(ESPACE);

  // Un fichier peut contenir plusieurs tracés (<trk>, sinon <rte>), par exemple toutes les distances d'une épreuve ;
  // un tracé peut être coupé en segments (<trkseg>) : la distance ne compte pas le saut d'un segment au suivant.
  const rad = x => x * Math.PI / 180;
  function piste(nom, segs) {
    const points = [], segments = [];
    let km = 0;
    segs.forEach(pts => {
      const seg = [];
      pts.forEach(p => {
        const lat = parseFloat(p.getAttribute('lat')), lon = parseFloat(p.getAttribute('lon'));
        if (!isFinite(lat) || !isFinite(lon)) return;
        const e = p.getElementsByTagName('ele')[0], alt = e ? parseFloat(e.textContent) : NaN;
        const q = seg.length ? points[points.length - 1] : null;
        if (q) {
          const dLat = rad(lat - q[0]), dLon = rad(lon - q[1]);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(q[0])) * Math.cos(rad(lat)) * Math.sin(dLon / 2) ** 2;
          km += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        points.push([lat, lon, isFinite(alt) ? alt : null, km, !seg.length && points.length > 0]);
        seg.push([lat, lon]);
      });
      if (seg.length) segments.push(seg);
    });
    return points.length >= 2 ? { nom, points, segments, km } : null;
  }
  const enfants = (el, tag) => [...el.getElementsByTagName(tag)];
  function analyser(texte) {
    let doc;
    try { doc = new DOMParser().parseFromString(texte, 'application/xml'); } catch (e) { return null; }
    if (!doc || doc.getElementsByTagName('parsererror').length) return null;
    const nomDe = (el, i) => { const n = [...el.children].find(x => x.localName === 'name'); return (n && n.textContent.trim()) || 'Tracé ' + (i + 1); };
    const trk = enfants(doc, 'trk'), rte = enfants(doc, 'rte');
    let pistes = trk.map((t, i) => Object.assign(piste(nomDe(t, i), enfants(t, 'trkseg').map(sg => enfants(sg, 'trkpt'))) || {}, { el: t }));
    let tag = 'trk';
    if (!pistes.some(x => x.points)) { pistes = rte.map((r, i) => Object.assign(piste(nomDe(r, i), [enfants(r, 'rtept')]) || {}, { el: r })); tag = 'rte'; }
    pistes = pistes.filter(x => x.points);
    return pistes.length ? { doc, pistes, tag } : null;
  }
  // Tracé à montrer : le seul, ou celui dont la longueur est la plus proche de la distance de la course.
  const proche = (pistes, km) => (km > 0 ? pistes.slice().sort((a, b) => Math.abs(a.km - km) - Math.abs(b.km - km))[0] : pistes[0]);
  function lire(texte, km) {
    const a = analyser(texte);
    return a ? proche(a.pistes, km) : null;
  }
  // Fichier réduit à un seul tracé (les autres tracés retirés ; points d'intérêt gardés).
  function seul(a, i) {
    a.pistes.forEach((x, k) => { if (k !== i) x.el.remove(); });
    return new XMLSerializer().serializeToString(a.doc);
  }

  // Rend { pistes: [{ nom, km, texte }] } (texte : le fichier réduit à ce tracé) ou { erreur }.
  async function verifier(f) {
    if (!f) return { erreur: 'Aucun fichier.' };
    if (!/\.gpx$/i.test(f.name)) return { erreur: 'Fichier .gpx attendu.' };
    if (f.size > MAX) return { erreur: 'Fichier trop lourd : 5 Mo au plus.' };
    const texte = await f.text();
    const a = analyser(texte);
    if (!a) return { erreur: 'Tracé illisible : le fichier ne contient pas de points.' };
    if (a.pistes.length === 1) return { pistes: [{ nom: a.pistes[0].nom, km: a.pistes[0].km, texte }] };
    return { pistes: a.pistes.map((x, i) => ({ nom: x.nom, km: x.km, texte: seul(analyser(texte), i) })) };
  }

  // Plusieurs tracés : un bouton par tracé (nom et longueur), le plus proche de la distance de la course en premier.
  // Rend le tracé choisi, ou null (« Annuler »).
  function choisir(zone, pistes, km) {
    const ordre = km > 0 ? pistes.slice().sort((a, b) => Math.abs(a.km - km) - Math.abs(b.km - km)) : pistes;
    return new Promise(ok => {
      zone.innerHTML = '<p class="tr-choix-titre">Ce fichier contient ' + pistes.length + ' tracés : lequel garder ?</p><div class="tr-choix">' +
        ordre.map((x, i) => '<button type="button" class="mrt-btn" data-piste="' + i + '">' + esc(x.nom) + ' · ' + nombre(x.km) + ' km</button>').join('') +
        '<button type="button" class="mrt-lien" data-piste="annuler">Annuler</button></div>';
      zone.hidden = false;
      zone.querySelectorAll('[data-piste]').forEach(b => b.addEventListener('click', () => {
        const v = b.dataset.piste;
        zone.innerHTML = '';
        ok(v === 'annuler' ? null : ordre[Number(v)]);
      }));
    });
  }

  // Dossier du propriétaire : celui de la course, ou l'utilisateur connecté (course qui vient d'être créée).
  async function chemin(c) {
    let u = c.utilisateur;
    if (!u) { const s = await window.mrtSupabase.auth.getSession(); u = s.data.session && s.data.session.user.id; }
    return u + '/' + c.id + '.gpx';
  }

  const memoire = new Map(); // chemin → texte du fichier, déjà lu
  // texte : le fichier GPX, réduit à un seul tracé (verifier, choisir).
  async function ranger(c, texte) {
    const p = await chemin(c);
    const r = await stockage().upload(p, new Blob([texte], { type: 'application/gpx+xml' }), { upsert: true, contentType: 'application/gpx+xml' });
    if (r.error) { console.warn(r.error); return 'Envoi du GPX impossible pour l\'instant.'; }
    const m = await window.mrtSupabase.from('courses').update({ gpx: p }).eq('id', c.id);
    if (m.error) { console.warn(m.error); return 'GPX envoyé, mais pas noté dans la course.'; }
    memoire.set(p, texte);
    return null;
  }
  async function retirer(c) {
    if (!c.gpx) return null;
    const r = await stockage().remove([c.gpx]);
    if (r.error) console.warn(r.error);
    const m = await window.mrtSupabase.from('courses').update({ gpx: null }).eq('id', c.id);
    if (m.error) { console.warn(m.error); return 'Suppression du GPX impossible pour l\'instant.'; }
    memoire.delete(c.gpx);
    return null;
  }
  async function texteDe(c) {
    if (memoire.has(c.gpx)) return memoire.get(c.gpx);
    const r = await stockage().download(c.gpx);
    if (r.error || !r.data) { if (r.error) console.warn(r.error); return null; }
    const t = await r.data.text();
    memoire.set(c.gpx, t);
    return t;
  }
  const nomFichier = c => (window.mrtNomCourse ? window.mrtNomCourse(c) : c.course).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.gpx';
  async function telecharger(c) {
    const t = await texteDe(c);
    if (t == null) { window.alert('Téléchargement impossible pour l\'instant.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([t], { type: 'application/gpx+xml' }));
    a.download = nomFichier(c);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Leaflet : chargé une seule fois, à la première carte.
  let chargement = null;
  function leaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!chargement) {
      chargement = new Promise((ok, ko) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = LEAFLET + 'leaflet.min.css';
        document.head.appendChild(css);
        const s = document.createElement('script');
        s.src = LEAFLET + 'leaflet.min.js';
        s.onload = () => ok(window.L);
        s.onerror = () => { chargement = null; ko(new Error('Leaflet')); };
        document.head.appendChild(s);
      });
    }
    return chargement;
  }

  // Altitude lissée tous les 10 m (moyenne sur 50 m) : le GPS est bruité, une pente lue point par point serait absurde.
  const PAS = 0.01;
  function lisse(t) {
    if (t.__lisse) return t.__lisse;
    const pts = t.points.filter(p => p[2] != null), n = Math.max(2, Math.round(t.km / PAS) + 1), brut = [];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const k = Math.min(i * PAS, t.km);
      while (j < pts.length - 2 && pts[j + 1][3] < k) j++;
      const a = pts[j], b = pts[j + 1], d = b[3] - a[3];
      brut.push(d > 0 ? a[2] + (b[2] - a[2]) * Math.min(1, Math.max(0, (k - a[3]) / d)) : a[2]);
    }
    t.__lisse = brut.map((v, i) => { let s = 0, c = 0; for (let m = Math.max(0, i - 2); m <= Math.min(n - 1, i + 2); m++) { s += brut[m]; c++; } return s / c; });
    return t.__lisse;
  }
  // Altitude et pente (%) au kilomètre km : pente sur 100 m centrés (moins aux extrémités du tracé).
  function pente(t, km) {
    const alt = lisse(t), n = alt.length, i = Math.min(n - 1, Math.max(0, Math.round(km / PAS)));
    const a = Math.max(0, i - 5), b = Math.min(n - 1, i + 5);
    return { alt: alt[i], pente: b > a ? (alt[b] - alt[a]) / ((b - a) * PAS * 1000) * 100 : 0 };
  }
  // Position (lat, lon) au kilomètre km.
  function position(t, km) {
    const P = t.points;
    let lo = 0, hi = P.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][3] <= km) lo = m; else hi = m; }
    const d = P[hi][3] - P[lo][3], f = d > 0 ? Math.min(1, Math.max(0, (km - P[lo][3]) / d)) : 0;
    return [P[lo][0] + (P[hi][0] - P[lo][0]) * f, P[lo][1] + (P[hi][1] - P[lo][1]) * f];
  }
  // Lignes horizontales : un pas rond (10, 20, 50, 100, 200, 500, 1 000 m) qui donne trois à six lignes au plus.
  function lignes(min, max) {
    const pas = [10, 20, 50, 100, 200, 500, 1000, 2000].find(x => (max - min) / x <= 5) || 5000, r = [];
    for (let v = (Math.floor(min / pas) + 1) * pas; v < max; v += pas) r.push(v);
    return { pas, valeurs: r };
  }
  const fmtPente = p => { const r = Math.round(p); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + ' %'; };

  // Profil altimétrique : courbe et aire en Accent ; altitudes mini et maxi à gauche, distances en bas ;
  // lignes horizontales à pas rond (n° 48) et lecture de la pente au survol (n° 49).
  function profil(t, bouton) {
    const pts = t.points.filter(p => p[2] != null);
    if (pts.length < 2) return '';
    const L = 600, H = 120, pas = Math.max(1, Math.floor(pts.length / 600));
    const ech = pts.filter((p, i) => i % pas === 0 || i === pts.length - 1);
    const alts = ech.map(p => p[2]), min = Math.min(...alts), max = Math.max(...alts), ecart = Math.max(max - min, 1);
    const x = km => (km / t.km) * L, y = a => H - 6 - ((a - min) / ecart) * (H - 12);
    const ligne = ech.map((p, i) => (i && !p[4] ? 'L' : 'M') + x(p[3]).toFixed(1) + ' ' + y(p[2]).toFixed(1)).join(' ');
    const li = lignes(min, max), pct = v => (y(v) / H) * 100;
    const traits = li.valeurs.map(v => '<line class="tr-ligne" x1="0" x2="' + L + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" vector-effect="non-scaling-stroke"/>').join('');
    // Étiquette d'une ligne : seulement si elle ne recouvre pas l'altitude mini ou maxi.
    const etiq = li.valeurs.filter(v => pct(v) > 18 && pct(v) < 82).map(v => '<i style="top:' + pct(v).toFixed(1) + '%">' + v + '</i>').join('');
    return '<div class="tr-profil">' +
      '<div class="tr-alt"><span>' + Math.round(max) + ' m</span>' + etiq + '<span>' + Math.round(min) + ' m</span></div>' +
      '<div class="tr-trace" data-pas="' + li.pas + '"><svg viewBox="0 0 ' + L + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Profil altimétrique : de ' + Math.round(min) + ' à ' + Math.round(max) + ' m">' + traits +
        '<path class="tr-aire" d="' + ligne + ' L' + L + ' ' + H + ' L0 ' + H + ' Z"/><path class="tr-courbe" d="' + ligne + '" vector-effect="non-scaling-stroke"/></svg>' +
        '<div class="tr-reperes" hidden><span class="tr-trait"></span><span class="tr-bulle"></span></div></div>' +
      '<div class="tr-km"><span>0 km</span><i class="tr-pas">1 trait = ' + li.pas + ' m</i><span>' + nombre(t.km) + ' km</span></div>' +
      // Téléchargement (n° 27) : bouton à contour, à droite, sous la ligne des distances.
      (bouton || '') + '</div>';
  }

  // Survol (souris) ou glissement du doigt sur le profil : trait vertical, bulle « km · altitude · pente »,
  // repère sur la carte (n° 50, via marque(lat, lon) ou marque(null)).
  function survol(el, t, marque) {
    const zone = el.querySelector('.tr-trace');
    if (!zone) return;
    const rep = zone.querySelector('.tr-reperes'), trait = rep.querySelector('.tr-trait'), bulle = rep.querySelector('.tr-bulle');
    const cacher = () => { rep.hidden = true; marque(null); };
    const montrer = e => {
      const r = zone.getBoundingClientRect();
      if (!r.width) return;
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), km = f * t.km, m = pente(t, km);
      rep.hidden = false;
      trait.style.left = (f * 100) + '%';
      bulle.innerHTML = 'km ' + nombre(km) + ' · ' + Math.round(m.alt) + ' m · <b class="' + (m.pente < -0.5 ? 'tr-descente' : 'tr-montee') + '">' + fmtPente(m.pente) + '</b>';
      const w = bulle.offsetWidth;
      bulle.style.left = Math.min(Math.max(f * r.width - w / 2, 0), Math.max(0, r.width - w)) + 'px';
      marque(position(t, km));
    };
    zone.addEventListener('pointermove', montrer);
    zone.addEventListener('pointerdown', montrer);
    zone.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') cacher(); });
    // Au doigt, la lecture reste affichée jusqu'au prochain toucher ailleurs.
    document.addEventListener('pointerdown', e => { if (!zone.contains(e.target)) cacher(); });
  }

  async function dessiner(el, c) {
    if (!el || el.__trace) return;
    el.__trace = true;
    el.innerHTML = '<p class="tr-attente">Chargement du tracé…</p>';
    const texte = await texteDe(c);
    const t = texte != null && lire(texte, Number(c.distance));
    if (!t) { el.innerHTML = '<p class="tr-attente">Tracé indisponible pour l\'instant.</p>'; el.__trace = false; return; }
    const bouton = '<div class="tr-bas"><button type="button" class="mrt-btn tr-telecharger" title="Télécharger le GPX">' + FLECHE_BAS + 'GPX</button></div>';
    el.innerHTML = '<div class="tr-carte" role="img" aria-label="Carte du tracé"></div>' + (profil(t, bouton) || bouton);
    el.querySelector('.tr-telecharger').addEventListener('click', () => telecharger(c));
    let reperage = null;
    survol(el, t, p => { if (reperage) reperage(p); });
    let L;
    try { L = await leaflet(); } catch (e) { el.querySelector('.tr-carte').innerHTML = '<p class="tr-attente">Carte indisponible pour l\'instant.</p>'; return; }
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffb700';
    const carte = L.map(el.querySelector('.tr-carte'), { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17, attribution: 'Carte © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA), données © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(carte);
    const ll = t.points.map(p => [p[0], p[1]]);
    const trait = L.polyline(t.segments, { color: accent, weight: 4, opacity: 0.95 }).addTo(carte);
    const borne = (p, titre) => L.circleMarker(p, { radius: 6, color: '#0b1220', weight: 2, fillColor: accent, fillOpacity: 1 }).bindTooltip(titre).addTo(carte);
    borne(ll[0], 'Départ');
    borne(ll[ll.length - 1], 'Arrivée');
    carte.fitBounds(trait.getBounds(), { padding: [12, 12] });
    // La carte naît dans un texte qui se déplie : sa taille est relue une fois l'ouverture finie.
    setTimeout(() => { carte.invalidateSize(); carte.fitBounds(trait.getBounds(), { padding: [12, 12] }); }, 300);
    // Repère de la position survolée sur le profil (n° 50).
    let rond = null;
    reperage = p => {
      if (!p) { if (rond) { rond.remove(); rond = null; } return; }
      if (!rond) rond = L.circleMarker(p, { radius: 5, color: '#0b1220', weight: 2, fillColor: accent, fillOpacity: 1, interactive: false }).addTo(carte);
      else rond.setLatLng(p);
    };
    pleinEcran(L, el, carte, trait);
    el.__carte = carte;
  }

  // Bouton plein écran (n° 47), sous les boutons + et − : l'API du navigateur, sinon un plein écran « posé » en CSS (iPhone).
  const ICO_PLEIN = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICO_SORTIE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function pleinEcran(L, el, carte, trait) {
    const Controle = L.Control.extend({
      onAdd() {
        const d = L.DomUtil.create('div', 'leaflet-bar tr-plein-zone'), b = L.DomUtil.create('button', 'mrt-rond tr-plein', d);
        b.type = 'button';
        L.DomEvent.disableClickPropagation(d);
        b.addEventListener('click', () => bascule(!el.classList.contains('tr-pleine')));
        return d;
      }
    });
    const bouton = new Controle({ position: 'topleft' }).addTo(carte).getContainer().querySelector('button');
    const dit = on => { bouton.innerHTML = on ? ICO_SORTIE : ICO_PLEIN; bouton.title = bouton.ariaLabel = on ? 'Quitter le plein écran' : 'Plein écran'; bouton.setAttribute('aria-pressed', on ? 'true' : 'false'); };
    dit(false);
    function bascule(on) {
      if (on === el.classList.contains('tr-pleine')) return;
      el.classList.toggle('tr-pleine', on);
      document.documentElement.classList.toggle('tr-plein-ouvert', on);
      if (on) { carte.scrollWheelZoom.enable(); if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); }
      else { carte.scrollWheelZoom.disable(); if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {}); }
      dit(on);
      setTimeout(() => { carte.invalidateSize(); carte.fitBounds(trait.getBounds(), { padding: [12, 12] }); }, 120);
    }
    // Échap quitte le plein écran du navigateur : le plein écran « posé » suit.
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && el.classList.contains('tr-pleine')) bascule(false); });
    // En phase de capture : Échap ne ferme que le plein écran, pas la page de la course qui le contient.
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && el.classList.contains('tr-pleine')) { e.stopImmediatePropagation(); bascule(false); } }, true);
  }

  // Miniature (Objectif, § 3.1, n° 14) : le tracé en SVG, départ plein et arrivée à contour, sur un quadrillage discret ; ni fond de carte
  // téléchargé, ni Leaflet. Projection plane corrigée de la latitude ; au plus 240 points.
  const MW = 184, MH = 90, MP = 10;
  async function miniature(c) {
    if (!c || !c.gpx) return null;
    const texte = await texteDe(c);
    const t = texte == null ? null : lire(texte, Number(c.distance));
    if (!t) return null;
    const pas = Math.max(1, Math.ceil(t.points.length / 240));
    const pts = t.points.filter((p, i) => i % pas === 0 || i === t.points.length - 1 || p[4]);
    const lat0 = pts.reduce((s, p) => s + p[0], 0) / pts.length, k = Math.cos(rad(lat0));
    const xs = pts.map(p => p[1] * k), ys = pts.map(p => -p[0]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), dx = Math.max(...xs) - x0 || 1e-9, dy = Math.max(...ys) - y0 || 1e-9;
    const e = Math.min((MW - 2 * MP) / dx, (MH - 2 * MP) / dy);
    const ox = (MW - dx * e) / 2, oy = (MH - dy * e) / 2;
    const X = i => (ox + (xs[i] - x0) * e).toFixed(1), Y = i => (oy + (ys[i] - y0) * e).toFixed(1);
    let d = '';
    pts.forEach((p, i) => { d += (i === 0 || p[4] ? 'M' : 'L') + X(i) + ' ' + Y(i); });
    let grille = '';
    for (let x = MW / 8; x < MW; x += MW / 8) grille += 'M' + x.toFixed(1) + ' 0V' + MH;
    for (let y = MH / 4; y < MH; y += MH / 4) grille += 'M0 ' + y.toFixed(1) + 'H' + MW;
    const n = pts.length - 1;
    return '<svg class="tr-mini" viewBox="0 0 ' + MW + ' ' + MH + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<path class="tr-mini-grille" d="' + grille + '"/><path class="tr-mini-trace" d="' + d + '"/>' +
      '<circle class="tr-mini-depart" cx="' + X(0) + '" cy="' + Y(0) + '" r="3.4"/><circle class="tr-mini-arrivee" cx="' + X(n) + '" cy="' + Y(n) + '" r="3.4"/></svg>';
  }

  window.mrtTrace = { verifier, choisir, ranger, retirer, telecharger, dessiner, miniature, lire, pente, MAX };
})();
