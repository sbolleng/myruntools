// ===== Proposer une stratégie (Objectif, § 3.10) =====
// Sur la page d'une course à venir : une IA propose la stratégie de course, puis quoi boire et manger, d'après la course (tracé en
// tronçons, ravitaillements), Mon profil, le Palmarès, l'entraînement récent et les aliments favoris. « OK » range la proposition à
// la place du texte de la stratégie. Fonction Supabase « proposer-strategie » (pilotes seulement au début).
// Jamais envoyés : le nom de la course, son parcours, son lieu, ses coordonnées, ni le nom ou l'adresse du coureur.
(function () {
  const sb = () => window.mrtSupabase;
  const ROLES = { objectif: 'Objectif', objectif_intermediaire: 'Objectif', preparatoire: 'Préparatoire', plaisir: 'Plaisir' };
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const ilYa = jours => { const d = new Date(); d.setDate(d.getDate() - jours); return iso(d); };
  const num = v => (v == null || v === '' ? null : Number(v));
  const arrondi = (v, n) => Math.round(v * 10 ** n) / 10 ** n;
  const MSG = {
    reserve: 'Réservé aux comptes pilotes pour l\'instant.',
    panne: 'La proposition n\'a pas abouti. Réessaie dans un moment.',
    manque: 'Indique d\'abord la distance et le format de la course.'
  };

  // Tracé : tronçons de 1 km (D+, D−, pente moyenne) et montées ou descentes de plus de 100 m.
  function troncons(pts) {
    const alt = pts.filter(p => p[2] != null);
    if (alt.length < 2) return null;
    // Altitude lissée (moyenne glissante sur 50 m) : le GPS bouge de quelques mètres sans que le sol change.
    const lisse = alt.map((p, i) => {
      let s = 0, n = 0;
      for (let j = i; j >= 0 && p[3] - alt[j][3] <= 0.025; j--) { s += alt[j][2]; n++; }
      for (let j = i + 1; j < alt.length && alt[j][3] - p[3] <= 0.025; j++) { s += alt[j][2]; n++; }
      return [p[3], s / n];
    });
    const parKm = [];
    for (let i = 1; i < lisse.length; i++) {
      const [k0, a0] = lisse[i - 1], [, a1] = lisse[i], b = Math.floor(k0);
      if (!parKm[b]) parKm[b] = { km: b + 1, dplus: 0, dmoins: 0, a0, a1 };
      if (a1 > a0) parKm[b].dplus += a1 - a0; else parKm[b].dmoins += a0 - a1;
      parKm[b].a1 = a1;
    }
    const km = parKm.filter(Boolean).map(t => ({ km: t.km, dplus_m: Math.round(t.dplus), dmoins_m: Math.round(t.dmoins), pente_pct: arrondi((t.a1 - t.a0) / 10, 1) }));
    // Montées et descentes : extrêmes successifs, à 30 m près ; seules celles de plus de 100 m sont gardées.
    const ext = [lisse[0]];
    let sens = 0;
    for (const p of lisse) {
      const der = ext[ext.length - 1];
      if ((sens === 1 && p[1] >= der[1]) || (sens === -1 && p[1] <= der[1])) ext[ext.length - 1] = p;
      else if (Math.abs(p[1] - der[1]) >= 30) { sens = p[1] > der[1] ? 1 : -1; ext.push(p); }
    }
    const pentes = [];
    for (let i = 1; i < ext.length; i++) {
      const d = ext[i][1] - ext[i - 1][1], l = ext[i][0] - ext[i - 1][0];
      if (Math.abs(d) >= 100 && l > 0) pentes.push({ sens: d > 0 ? 'montée' : 'descente', du_km: arrondi(ext[i - 1][0], 1), au_km: arrondi(ext[i][0], 1), denivele_m: Math.round(Math.abs(d)), pente_moyenne_pct: arrondi(d / l / 10, 1) });
    }
    return { altitude_depart_m: Math.round(lisse[0][1]), altitude_max_m: Math.round(Math.max(...lisse.map(p => p[1]))), par_km: km, montees_descentes: pentes };
  }
  async function trace(c) {
    const T = window.mrtTrace;
    if (!c.gpx || !T || !T.texteDe) return null;
    try {
      const t = await T.texteDe(c), p = t && T.lire(t, Number(c.distance));
      return p ? troncons(p.points) : null;
    } catch (e) { console.warn(e); return null; }
  }

  // Palmarès : courses courues comparables (même format, ou même type et distance à ± 30 %), des 24 derniers mois, 5 au plus.
  function comparables(c, courses) {
    const d = num(c.distance);
    return (courses || []).filter(x => x.etat === 'courue' && !x.dnf && Number(x.temps) > 0 && x.date && x.date >= ilYa(730) &&
      (x.format === c.format || (x.type && x.type === c.type && d > 0 && Math.abs(num(x.distance) - d) <= 0.3 * d)))
      .sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5)
      .map(x => ({ date: x.date, format: x.formatLibelle || x.format, distance_km: num(x.distance), dplus_m: num(x.dplus), temps_s: Number(x.temps),
        allure_min_km: num(x.distance) > 0 ? arrondi(Number(x.temps) / 60 / num(x.distance), 2) : null, fc_moyenne: num(x.fc_moyenne) }));
  }
  // Entraînement des 12 dernières semaines (séances de course faites) : volume, D+, plus longue sortie, par mois.
  function entrainement(seances) {
    const P = window.mrtPreparation;
    const faites = (seances || []).filter(s => s.faite && s.type !== 'renfo' && s.date >= ilYa(84) && s.date <= iso(new Date())).map(s => (P ? P.reel(s) : s));
    if (!faites.length) return null;
    const mois = {};
    let longue = null;
    faites.forEach(s => {
      const m = s.date.slice(0, 7), km = num(s.distance_km) || 0;
      mois[m] = mois[m] || { mois: m, seances: 0, km: 0, dplus_m: 0, duree_min: 0 };
      mois[m].seances++; mois[m].km += km; mois[m].dplus_m += num(s.denivele_m) || 0; mois[m].duree_min += num(s.duree_min) || 0;
      if (!longue || km > longue.distance_km) longue = { date: s.date, distance_km: km, dplus_m: num(s.denivele_m), duree_min: num(s.duree_min) };
    });
    return { par_mois: Object.values(mois).sort((a, b) => (a.mois < b.mois ? -1 : 1)).map(m => Object.assign(m, { km: arrondi(m.km, 1) })), plus_longue_sortie: longue };
  }

  async function lire(table) {
    try { const { data, error } = await sb().from(table).select('*'); if (error) console.warn(error); return data || []; } catch (e) { return []; }
  }
  async function contexte(c, ctx) {
    const [pe, aliments, session, parcours] = await Promise.all([lire('profil_entrainement'), lire('aliments'), window.mrtSession ? window.mrtSession() : null, trace(c)]);
    const pr = pe[0] || {}, id = (session && session.profil) || {};
    const age = id.naissance ? Math.floor((Date.now() - Date.parse(id.naissance)) / 31557600000) : null;
    const lib = (cle, v) => (v == null ? null : (window.mrtProfil && window.mrtProfil.libelleDe(cle, v)) || v);
    const nettoie = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)));
    return {
      aujourd_hui: iso(new Date()),
      course: nettoie({
        date: c.date_approx ? c.date.slice(0, 7) : c.date, heure_depart: c.heure ? String(c.heure).slice(0, 5) : null,
        type: c.typeLibelle || c.type, format: c.formatLibelle || c.format, distance_km: num(c.distance), dplus_m: num(c.dplus), dmoins_m: num(c.dmoins),
        objectif: c.objectif || null, precisions_objectif: c.objectif_precisions || null, role: ROLES[c.role] || null,
        ravitaillements_km: c.ravitaillements_km || null, parcours: parcours
      }),
      profil: nettoie({
        sexe: id.sexe || null, age, poids_kg: num(id.poids), fc_repos: num(id.fc_repos),
        niveau: lib('niveau', pr.niveau), anciennete: lib('anciennete', pr.anciennete), volume_par_semaine: lib('volume_tranche', pr.volume_tranche),
        plus_longue_sortie_recente: lib('sortie_tranche', pr.sortie_tranche), vma_kmh: num(pr.vma), temps_10km_s: num(pr.temps_10km_s), temps_semi_s: num(pr.temps_semi_s),
        fc_max: num(pr.fc_max), terrain: lib('terrain', pr.terrain), points_fragiles: pr.fragiles || null, blessure_en_cours: pr.blessure || null
      }),
      palmares_comparable: comparables(c, ctx && ctx.courses),
      entrainement_12_semaines: entrainement(ctx && ctx.seances),
      aliments_favoris: aliments.filter(a => a.favori).map(a => nettoie({ nom: a.nom, portion: a.portion, kcal: num(a.kcal), glucides_g: num(a.glucides) }))
    };
  }

  // Rend { texte } (les deux parties assemblées) ou { message }.
  async function proposer(c, ctx) {
    let cx;
    try { cx = await contexte(c, ctx); } catch (e) { console.warn(e); return { message: MSG.panne }; }
    const { data, error } = await sb().functions.invoke('proposer-strategie', { body: { contexte: cx } });
    if (error) {
      let code = null;
      try { code = (await error.context.json()).code; } catch (e) { /* réponse sans corps lisible */ }
      if (code !== 'reserve') console.warn(error);
      return { message: code === 'reserve' ? MSG.reserve : MSG.panne };
    }
    const s = String((data && data.strategie) || '').trim(), b = String((data && data.boire_manger) || '').trim();
    if (!s) return { message: MSG.panne };
    return { texte: 'Stratégie\n' + s + (b ? '\n\nBoire et manger\n' + b : '') };
  }

  // Bouton (53), proposition (54) et « OK » (55), dans Parcours. apres() : la page se redessine (stratégie rangée).
  function brancher(el, c, ctx, apres) {
    const zone = el.querySelector('.st-zone');
    if (!zone) return;
    const bouton = zone.querySelector('[data-st="proposer"]'), msg = zone.querySelector('.st-msg'), cadre = zone.querySelector('.st-proposition');
    if (!bouton || bouton.disabled) return;
    let texte = null;
    bouton.addEventListener('click', async () => {
      bouton.disabled = true;
      msg.textContent = 'Proposition en cours…';
      const r = await proposer(c, ctx);
      bouton.disabled = false;
      msg.textContent = r.message || '';
      if (!r.texte) return;
      texte = r.texte;
      const esc = s => String(s).replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
      cadre.querySelector('.st-texte').innerHTML = texte.split('\n\n').map(p => {
        const l = p.split('\n'), titre = l[0] === 'Stratégie' || l[0] === 'Boire et manger';
        return (titre ? '<p class="pc-sous-titre">' + esc(l.shift()) + '</p>' : '') + '<p>' + l.map(esc).join('<br>') + '</p>';
      }).join('');
      cadre.hidden = false;
      bouton.hidden = true;
    });
    cadre.querySelector('[data-st="ok"]').addEventListener('click', async e => {
      const ok = e.currentTarget;
      ok.disabled = true;
      const { error } = await sb().from('courses').update({ strategie: texte }).eq('id', c.id);
      ok.disabled = false;
      if (error) { console.warn(error); msg.textContent = 'Enregistrement impossible pour l\'instant.'; return; }
      c.strategie = texte;
      msg.textContent = '';
      cadre.hidden = true;
      bouton.hidden = false;
      if (apres) await apres();
    });
  }

  // Le bouton se montre pour une course à venir, hors lecture seule ; grisé sans distance ou sans format.
  function html(c) {
    const manque = !(num(c.distance) > 0) || !c.format;
    return '<div class="st-zone"><p class="st-actions"><button type="button" class="mrt-btn" data-st="proposer"' + (manque ? ' disabled' : '') + '>Proposer une stratégie</button></p>' +
      '<p class="st-msg" aria-live="polite">' + (manque ? MSG.manque : '') + '</p>' +
      '<div class="st-proposition" hidden><div class="st-texte"></div><p class="st-ok"><button type="button" class="mrt-btn" data-st="ok">OK</button></p></div></div>';
  }

  window.mrtStrategie = { html, brancher, contexte, troncons, comparables, MSG };
})();
