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

  // Profil altimétrique : courbe et aire en Accent ; altitudes mini et maxi à gauche, distances en bas.
  function profil(t, bouton) {
    const pts = t.points.filter(p => p[2] != null);
    if (pts.length < 2) return '';
    const L = 600, H = 120, pas = Math.max(1, Math.floor(pts.length / 600));
    const ech = pts.filter((p, i) => i % pas === 0 || i === pts.length - 1);
    const alts = ech.map(p => p[2]), min = Math.min(...alts), max = Math.max(...alts), ecart = Math.max(max - min, 1);
    const x = km => (km / t.km) * L, y = a => H - 6 - ((a - min) / ecart) * (H - 12);
    const ligne = ech.map((p, i) => (i && !p[4] ? 'L' : 'M') + x(p[3]).toFixed(1) + ' ' + y(p[2]).toFixed(1)).join(' ');
    return '<div class="tr-profil">' +
      '<div class="tr-alt"><span>' + Math.round(max) + ' m</span><span>' + Math.round(min) + ' m</span></div>' +
      '<svg viewBox="0 0 ' + L + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Profil altimétrique : de ' + Math.round(min) + ' à ' + Math.round(max) + ' m">' +
        '<path class="tr-aire" d="' + ligne + ' L' + L + ' ' + H + ' L0 ' + H + ' Z"/><path class="tr-courbe" d="' + ligne + '" vector-effect="non-scaling-stroke"/></svg>' +
      '<div class="tr-km"><span>0 km</span><span>' + nombre(t.km) + ' km</span></div>' +
      // Téléchargement (n° 27) : bouton à contour, à droite, sous la ligne des distances.
      (bouton || '') + '</div>';
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
    el.__carte = carte;
  }

  window.mrtTrace = { verifier, choisir, ranger, retirer, telecharger, dessiner, lire, MAX };
})();
