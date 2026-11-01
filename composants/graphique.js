// ===== Graphique : un nuage de points dans le temps, fait main (SVG et HTML) =====
//
// Code de dessin commun au graphique de difficulté (Objectif, § 5.2) et au graphique
// de progression (Palmarès, § 12) ; style : composants/graphique.css. Aucune couleur
// écrite ici : tout passe par les rôles du thème (design § 2).
//
//   mrtGraphique(el, cfg)   dessine dans el un cadre repliable ; rend { maj(cfg) } pour redessiner
//                            sans toucher au cadre (état ouvert, place dans la page)
//   mrtKmEffort(distance, dplus)    km-effort normé (spécification générale, § 12 bis) ; null sans distance
//
// cfg = {
//   cle        : clé de stockage de l'état replié (sur l'appareil)
//   titre      : titre du cadre ; droite : html au bout du titre (tendance) ; classe : classe du cadre (is-intertitre :
//                titre au style des intertitres du Palmarès)
//   axeY       : { libelle, min, max, pas, fmt(v), inverse } ; inverse : la plus petite valeur en haut
//   debut, fin : bornes du temps (ms) ; aujourdhui : trait pointillé (ms), facultatif
//   points     : [{ id, t (ms), t2 (ms, trait sur une période), y, forme, etiquette, aria, bulle: { valeur, nom, lien, details } }]
//                forme : 'plein' (Accent), 'discret', 'vide', 'losange', 'grand' (grand losange) ; avec t2 : trait pointillé de t à t2,
//                la marque au milieu (date au mois seul) ; marque : signe au-dessus du point (🥇)
//   ligne      : identifiants des points reliés, dans l'ordre ; etiquettesDessous : étiquettes centrées sous les points
//   tendance   : { y0, y1 } droite de debut à fin, facultative
//   vide       : texte à la place du tracé (pas assez de points)
//   bas        : html sous le graphique (bilan, tableau des chiffres)
// }
(function () {
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const CHEVRON = '<svg class="mg-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  window.mrtKmEffort = (distance, dplus) => (distance == null || distance === '' ? null : Number(distance) + (Number(dplus) || 0) / 100);

  const lire = cle => { try { return localStorage.getItem(cle); } catch (e) { return null; } };
  const ecrire = (cle, v) => { try { localStorage.setItem(cle, v); } catch (e) { /* stockage indisponible */ } };

  // Repères du temps : le 1er de chaque trimestre (janv., avr., juil., oct.) ; l'année sur janvier et sur le premier repère.
  function reperes(debut, fin) {
    const d = new Date(debut), out = [];
    let a = d.getFullYear(), m = Math.ceil(d.getMonth() / 3) * 3, majeur = false;
    if (m === d.getMonth() && d.getDate() > 1) m += 3;
    for (;;) {
      if (m >= 12) { m -= 12; a++; }
      const t = new Date(a, m, 1).getTime();
      if (t > fin) break;
      // Téléphone : seulement janvier et juillet (is-mineur masqué), l'année sur janvier.
      const mineur = m === 3 || m === 9;
      out.push({ t, mineur, txt: MOIS[m] + (m === 0 || !out.length || (!mineur && !majeur) ? ' ' + String(a).slice(2) : '') });
      if (!mineur) majeur = true;
      m += 3;
    }
    return out;
  }

  function dessiner(el, cfg) {
    const corps = el.querySelector('.mg-corps');
    el.querySelector('.mg-droite').innerHTML = cfg.droite || '';
    if (cfg.vide) {
      corps.innerHTML = '<p class="mg-vide">' + esc(cfg.vide) + '</p>' + (cfg.bas || '');
      return;
    }
    const ay = cfg.axeY, d0 = cfg.debut, d1 = Math.max(cfg.fin, cfg.debut + 864e5);
    // Marges intérieures : un point au bord reste entier.
    const xAt = t => 2 + 96 * (t - d0) / (d1 - d0);
    const yAt = v => { const r = (v - ay.min) / (ay.max - ay.min); return 4 + 92 * (ay.inverse ? r : 1 - r); };
    const graduations = [];
    for (let v = ay.min; v <= ay.max + 1e-9; v += ay.pas) graduations.push(v);
    const pts = cfg.points.map(p => Object.assign({ x: xAt(p.t), yy: yAt(p.y) }, p, p.t2 != null ? { x: (xAt(p.t) + xAt(p.t2)) / 2, x1: xAt(p.t), x2: xAt(p.t2) } : {}));
    const parId = {};
    pts.forEach(p => { parId[p.id] = p; });

    let svg = graduations.map(v => '<line class="mg-grille" x1="0" x2="100" y1="' + yAt(v) + '" y2="' + yAt(v) + '"/>').join('');
    if (cfg.aujourdhui != null && cfg.aujourdhui >= d0 && cfg.aujourdhui <= d1)
      svg += '<line class="mg-jour" x1="' + xAt(cfg.aujourdhui) + '" x2="' + xAt(cfg.aujourdhui) + '" y1="0" y2="100"/>';
    if (cfg.tendance) svg += '<line class="mg-tendance" x1="' + xAt(d0) + '" x2="' + xAt(d1) + '" y1="' + yAt(cfg.tendance.y0) + '" y2="' + yAt(cfg.tendance.y1) + '"/>';
    const chemin = (cfg.ligne || []).map(i => parId[i]).filter(Boolean);
    if (chemin.length > 1) svg += '<polyline class="mg-ligne" points="' + chemin.map(p => p.x + ',' + p.yy).join(' ') + '"/>';
    pts.filter(p => p.t2 != null).forEach(p => { svg += '<line class="mg-periode" x1="' + p.x1 + '" x2="' + p.x2 + '" y1="' + p.yy + '" y2="' + p.yy + '"/>'; });

    const pos = p => 'left:' + p.x + '%;top:' + p.yy + '%';
    corps.innerHTML =
      '<div class="mg-axe-y">' + esc(ay.libelle) + '</div>' +
      '<div class="mg-zone">' +
        '<div class="mg-plot">' +
          graduations.map(v => '<span class="mg-gy" style="top:' + yAt(v) + '%">' + esc(ay.fmt(v)) + '</span>').join('') +
          '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + svg + '</svg>' +
          pts.map((p, k) => '<button type="button" class="mg-pt is-' + p.forme + (p.t2 != null ? ' is-periode' : '') + '" data-k="' + k + '" style="' + pos(p) + '" aria-label="' + esc(p.aria) + '"></button>' +
            (p.marque ? '<span class="mg-marque" style="' + pos(p) + '" aria-hidden="true">' + esc(p.marque) + '</span>' : '') +
            (p.etiquette ? '<span class="mg-etiq' + (cfg.etiquettesDessous ? ' is-dessous' : p.x > 50 ? ' is-gauche' : '') + '" style="' + pos(p) + '">' + esc(p.etiquette) + '</span>' : '')).join('') +
          '<div class="mg-bulle" role="status" hidden></div>' +
        '</div>' +
        '<div class="mg-gx">' + reperes(d0, d1).map(r => '<span' + (r.mineur ? ' class="is-mineur"' : '') + ' style="left:' + xAt(r.t) + '%">' + esc(r.txt) + '</span>').join('') + '</div>' +
      '</div>' + (cfg.bas || '');

    // Bulle : survol (souris), toucher ou clavier ; une seule à la fois ; toucher ailleurs la ferme.
    const plot = corps.querySelector('.mg-plot'), bulle = plot.querySelector('.mg-bulle');
    let ouvert = null;
    const montrer = k => {
      const p = pts[k], b = p.bulle;
      bulle.innerHTML = '<strong>' + esc(b.valeur) + '</strong>' +
        '<div>' + (b.lien ? '<a class="mg-nom" href="' + esc(b.lien) + '">' + esc(b.nom) + '</a>' : esc(b.nom)) + '</div>' +
        (b.details ? '<div class="mg-sub">' + esc(b.details) + '</div>' : '');
      bulle.hidden = false;
      bulle.style.left = Math.min(Math.max(p.x, 20), 80) + '%';
      bulle.style.top = p.yy + '%';
      bulle.classList.toggle('is-dessous', p.yy < 45);
      plot.querySelectorAll('.mg-pt.is-on').forEach(x => x.classList.remove('is-on'));
      plot.querySelector('[data-k="' + k + '"]').classList.add('is-on');
      ouvert = k;
    };
    const cacher = () => {
      bulle.hidden = true; ouvert = null;
      plot.querySelectorAll('.mg-pt.is-on').forEach(x => x.classList.remove('is-on'));
    };
    const souris = () => window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    plot.querySelectorAll('.mg-pt').forEach(b => {
      const k = Number(b.dataset.k);
      b.addEventListener('click', () => montrer(k));
      b.addEventListener('focus', () => montrer(k));
      b.addEventListener('pointerenter', () => { if (souris()) montrer(k); });
    });
    plot.addEventListener('pointerleave', () => { if (souris() && !plot.contains(document.activeElement)) cacher(); });
    el.__fermerBulle = cacher;
    el.__montrer = id => { const k = pts.findIndex(p => p.id === id); if (k >= 0) montrer(k); };
    return ouvert;
  }

  window.mrtGraphique = function (el, cfg) {
    const ouvert = lire(cfg.cle) !== '0';
    el.classList.add('mg', 'card');
    if (cfg.classe) el.classList.add(cfg.classe);
    el.innerHTML = '<details class="mg-cadre mrt-deroule"' + (ouvert ? ' open' : '') + '>' +
      '<summary class="mg-titre">' + CHEVRON + '<span>' + esc(cfg.titre) + '</span><span class="mg-droite"></span></summary>' +
      '<div class="mg-corps"></div></details>';
    el.querySelector('details').addEventListener('toggle', e => ecrire(cfg.cle, e.target.open ? '1' : '0'));
    // Toucher ailleurs ferme la bulle.
    if (!el.__docBranche) {
      el.__docBranche = true;
      document.addEventListener('click', e => { if (el.__fermerBulle && !e.target.closest('.mg-pt, .mg-bulle, .mg-chiffres tr')) el.__fermerBulle(); });
    }
    dessiner(el, cfg);
    return { maj: c => dessiner(el, c) };
  };
})();
