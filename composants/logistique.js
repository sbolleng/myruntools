// ===== Logistique d'une course (docs/module-logistique-specification.md) =====
// Bloc de la page d'une course : logements, trajets, matos à cocher (catalogue mémorisé, « Imposé », « Pris », mode jour J), total.
// Plus « Mon matériel » de Mon profil : chaussures, bâtons, sac, frontale, montre.
// Jamais montré en lecture seule (partage) : la page d'une course ne l'appelle qu'avec les droits d'édition.
(function () {
  const sb = () => window.mrtSupabase;
  const F = () => window.mrtFormat;
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const lienSur = u => (u && /^https?:\/\//i.test(u) ? u : null);
  const FLECHE = '<svg class="ob-fleche" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5l5-5M4.5 3.5h4v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const POUBELLE = '<svg class="fc-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CATEGORIES = ['Papiers', 'Sécurité', 'Vêtements', 'Porté', 'Nutrition', 'Électronique', 'Après-course', 'Autre'];
  const TYPES_TRAJET = [['avion', 'Avion'], ['train', 'Train'], ['voiture', 'Voiture'], ['bus', 'Bus'], ['autre', 'Autre']];
  const SENS = [['aller', 'Aller'], ['retour', 'Retour'], ['autre', 'Autre']];
  const SENS_NOUVEAU = [['aller', 'Aller'], ['retour', 'Retour'], ['aller_retour', 'Aller-retour'], ['autre', 'Autre']];
  const TYPES_EQUIP = [['chaussures', 'Chaussures'], ['batons', 'Bâtons'], ['sac', 'Sac'], ['frontale', 'Frontale'], ['montre', 'Montre']];
  const MSG = { panne: 'Enregistrement impossible. Réessaie dans un moment.' };
  const nombre = n => F().nombre(Math.round(Number(n) * 100) / 100);
  const euros = n => nombre(n) + ' €';
  const sans = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const num = v => { const s = String(v == null ? '' : v).trim().replace(',', '.'); return s === '' || isNaN(Number(s)) ? null : Number(s); };

  // Date et heure d'un champ « datetime-local » ou d'une colonne timestamp : « ven. 12 mars · 17 h ».
  const quand = v => {
    if (!v) return '';
    const [d, h] = String(v).split('T');
    return F().date(d, { semaine: true, annee: false }) + (h ? ' · ' + F().heure(h.slice(0, 5)) : '');
  };
  const pourChamp = v => (v ? String(v).slice(0, 16) : '');
  // Équipement d'un type, selon le nom de l'article : « Frontale » → frontale, « Bâtons Leki » → batons.
  const typeDe = nom => { const n = sans(nom); return (TYPES_EQUIP.find(t => n.includes(sans(t[1]).replace(/s$/, ''))) || [])[0] || null; };
  const nomEquip = e => [e.marque, e.modele].filter(Boolean).join(' ') + (e.surnom ? ' (' + e.surnom + ')' : '');

  // Adresse mise en forme d'après une réponse d'OpenStreetMap (Nominatim) : « 12 rue des Crêtes, 42000 Saint-Étienne ».
  const formater = x => {
    const a = x.address || {}, rue = [a.house_number, a.road].filter(Boolean).join(' ');
    const ville = [a.postcode, a.city || a.town || a.village || a.municipality || a.hamlet].filter(Boolean).join(' ');
    return [rue, ville].filter(Boolean).join(', ') || x.display_name || '';
  };
  // Recherche déclenchée par le bouton ou « Entrée » (pas à chaque frappe : la règle d'usage du service l'interdit). null : service indisponible.
  async function chercherAdresses(q) {
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=fr&q=' + encodeURIComponent(q));
      if (!r.ok) return null;
      const liste = (await r.json()).map(formater).filter(Boolean);
      return liste.filter((v, i) => liste.indexOf(v) === i);
    } catch (e) { return null; }
  }
  // Itinéraire : Google Maps et Waze, d'après l'adresse écrite.
  const itineraires = adresse => (adresse ? '<span class="lg-plans"><a class="mrt-lien pc-ext" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(adresse) + '" target="_blank" rel="noopener">Google Maps ' + FLECHE + '</a>' +
    '<a class="mrt-lien pc-ext" href="https://waze.com/ul?q=' + encodeURIComponent(adresse) + '&navigate=yes" target="_blank" rel="noopener">Waze ' + FLECHE + '</a></span>' : '');

  // ----- Lecture / écriture -----
  async function lire(table, filtre, ordre) {
    let q = sb().from(table).select('*');
    if (filtre) q = q.eq(filtre[0], filtre[1]);
    if (ordre) q = q.order(ordre);
    const r = await q;
    return r.error ? [] : (r.data || []);
  }
  const ecrire = async p => { const r = await p; return !r.error; };

  // ===================== Le bloc d'une course =====================
  const cache = {}; // course → données, pour redessiner sans attendre
  function html(c) {
    return '<details class="pc-cellule mrt-deroule lg-cellule" id="logistique" data-lg="' + esc(c.id) + '"><summary>' + window.mrtIcone.chevron + 'Logistique</summary>' +
      '<div class="pc-corps lg-corps"><p class="pc-vide">Chargement…</p></div></details>';
  }

  function brancher(el, c) {
    const cellule = el.querySelector('#logistique');
    if (!cellule) return;
    const corps = cellule.querySelector('.lg-corps');
    const S = cache[c.id] || (cache[c.id] = { logements: [], trajets: [], catalogue: [], matos: [], equipements: [], charge: false });
    S.mode = null;          // null | { sorte: 'logement' | 'trajet', id }
    S.edition = false;      // liste du matos en modification
    S.detail = false;       // détail du total ouvert
    S.message = '';
    const dessiner = () => {
      corps.innerHTML = corpsHtml(c, S);
      cellule.dataset.total = totalDe(c, S) ? euros(totalDe(c, S)) : '';
    };
    const recharger = async () => {
      const [logements, trajets, catalogue, matos, equipements] = await Promise.all([
        lire('logements', ['course', c.id], 'arrivee'), lire('trajets', ['course', c.id], 'depart'),
        lire('materiel_catalogue', null, 'ordre'), lire('course_materiel', ['course', c.id]), lire('equipements', null, 'marque')]);
      Object.assign(S, { logements, trajets, catalogue, matos, equipements, charge: true });
      dessiner();
    };
    const apres = async ok => { S.message = ok ? '' : MSG.panne; await recharger(); };

    corps.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-lg-act]');
      if (!b) return;
      const act = b.dataset.lgAct, id = b.dataset.id || null;
      if (act === 'detail') { S.detail = !S.detail; dessiner(); return; }
      if (act === 'ajouter-logement') { S.mode = { sorte: 'logement', id: null }; dessiner(); return; }
      if (act === 'ajouter-trajet') { S.mode = { sorte: 'trajet', id: null }; dessiner(); return; }
      if (act === 'modifier-logement') { S.mode = { sorte: 'logement', id }; dessiner(); return; }
      if (act === 'modifier-trajet') { S.mode = { sorte: 'trajet', id }; dessiner(); return; }
      if (act === 'annuler') { S.mode = null; dessiner(); return; }
      if (act === 'chercher') { await chercher(); return; }
      if (act === 'choisir-adresse') {
        corps.querySelector('[name="adresse"]').value = b.dataset.valeur;
        corps.querySelector('.lg-suggestions').hidden = true; corps.querySelector('.lg-aide').textContent = ''; return;
      }
      if (act === 'liste') { S.edition = !S.edition; dessiner(); return; }
      if (act === 'jour-j') { jourJ(c, S, dessiner); return; }
      if (act === 'supprimer') {
        const sorte = S.mode.sorte, table = sorte === 'logement' ? 'logements' : 'trajets';
        if (!await window.mrtConfirmer({ texte: sorte === 'logement' ? 'Supprimer ce logement ?' : 'Supprimer ce trajet ?', action: 'Supprimer', danger: true })) return;
        const ok = await ecrire(sb().from(table).delete().eq('id', S.mode.id));
        S.mode = null; await apres(ok); return;
      }
      if (act === 'retirer') {
        const ok = await ecrire(sb().from('course_materiel').delete().eq('course', c.id).eq('article', id));
        await apres(ok); return;
      }
      if (act === 'ajouter-article') {
        const champ = corps.querySelector('[name="article"]'), cat = corps.querySelector('[name="categorie"]');
        const nom = champ.value.trim();
        if (!nom) { champ.focus(); return; }
        const connu = S.catalogue.find(a => sans(a.nom) === sans(nom));
        let article = connu ? connu.id : uuid(), ok = true;
        if (!connu) ok = await ecrire(sb().from('materiel_catalogue').insert({ id: article, nom, categorie: cat.value, ordre: S.catalogue.length }));
        if (ok && !S.matos.some(m => m.article === article)) ok = await ecrire(sb().from('course_materiel').insert({ course: c.id, article, impose: false, pris: false }));
        await apres(ok); return;
      }
    });
    const chercher = async () => {
      const champ = corps.querySelector('[name="adresse"]'), menu = corps.querySelector('.lg-suggestions'), aide = corps.querySelector('.lg-aide'), q = champ.value.trim();
      if (q.length < 3) { aide.textContent = 'Saisis au moins trois lettres.'; return; }
      aide.textContent = 'Recherche…'; menu.hidden = true;
      const liste = await chercherAdresses(q);
      if (liste === null) { aide.textContent = 'Recherche impossible pour l\'instant : saisis l\'adresse à la main.'; return; }
      if (!liste.length) { aide.textContent = 'Aucune adresse trouvée : garde ta saisie ou précise-la.'; return; }
      aide.textContent = '';
      menu.innerHTML = liste.map(v => '<button type="button" class="mrt-menu-l" data-lg-act="choisir-adresse" data-valeur="' + esc(v) + '">' + esc(v) + '</button>').join('');
      menu.hidden = false;
    };
    corps.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.name === 'adresse') { ev.preventDefault(); chercher(); } });
    // Aller-retour : le bloc Retour apparaît, lieux déjà saisis à l'envers (modifiables tant qu'on n'y a pas touché).
    const retour = f => {
      const aller = f.elements.sens.value === 'aller_retour';
      f.querySelectorAll('.lg-retour').forEach(x => { x.hidden = !aller; });
      f.querySelector('[name="prix"]').closest('.lg-champ').querySelector('label').textContent = aller ? 'Prix de l\'aller-retour (€)' : 'Prix (€)';
    };
    corps.addEventListener('change', ev => { if (ev.target.name === 'sens' && ev.target.form) retour(ev.target.form); });
    corps.addEventListener('input', ev => {
      const f = ev.target.form, n = ev.target.name;
      if (!f || !f.classList.contains('lg-form-trajet')) return;
      if (n === 'r_lieu_depart' || n === 'r_lieu_arrivee') { ev.target.dataset.manuel = '1'; return; }
      const miroir = { lieu_arrivee: 'r_lieu_depart', lieu_depart: 'r_lieu_arrivee' }[n];
      if (miroir && f.elements.sens.value === 'aller_retour' && !f.elements[miroir].dataset.manuel) f.elements[miroir].value = ev.target.value;
    });
    corps.addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = ev.target, d = Object.fromEntries(new FormData(f));
      const vide = v => (String(v || '').trim() || null);
      let ok;
      if (S.mode.sorte === 'logement') {
        const ligne = { nom: String(d.nom || '').trim(), adresse: vide(d.adresse), url: vide(d.url), prix: num(d.prix), arrivee: vide(d.arrivee), depart: vide(d.depart) };
        if (!ligne.nom) { f.querySelector('[name="nom"]').focus(); return; }
        ok = await ecrire(S.mode.id ? sb().from('logements').update(ligne).eq('id', S.mode.id) : sb().from('logements').insert(Object.assign({ course: c.id }, ligne)));
      } else {
        const ligne = { sens: d.sens === 'aller_retour' ? 'aller' : d.sens, type: d.type, lieu_depart: vide(d.lieu_depart), depart: vide(d.depart), lieu_arrivee: vide(d.lieu_arrivee), arrivee: vide(d.arrivee), url: vide(d.url), prix: num(d.prix) };
        if (d.sens === 'aller_retour' && !S.mode.id) {
          // Un seul prix, rangé sur l'aller (« aller-retour ») ; le retour est une seconde ligne sans prix.
          const retour = { sens: 'retour', type: d.type, lieu_depart: vide(d.r_lieu_depart), depart: vide(d.r_depart), lieu_arrivee: vide(d.r_lieu_arrivee), arrivee: vide(d.r_arrivee), url: vide(d.url), prix: null };
          ok = await ecrire(sb().from('trajets').insert([Object.assign({ course: c.id, prix_aller_retour: ligne.prix != null }, ligne), Object.assign({ course: c.id }, retour)]));
        } else ok = await ecrire(S.mode.id ? sb().from('trajets').update(ligne).eq('id', S.mode.id) : sb().from('trajets').insert(Object.assign({ course: c.id }, ligne)));
      }
      S.mode = null; await apres(ok);
    });
    corps.addEventListener('change', async ev => {
      const t = ev.target, a = t.dataset.article;
      if (!a) return;
      const ligne = S.matos.find(m => m.article === a);
      if (!ligne) return;
      let patch;
      if (t.dataset.champ === 'pris') patch = { pris: t.checked };
      else if (t.dataset.champ === 'impose') patch = { impose: t.checked };
      else if (t.dataset.champ === 'equipement') patch = { equipement: t.value || null };
      else return;
      Object.assign(ligne, patch);
      if (t.dataset.champ === 'pris') dessiner();
      await apres(await ecrire(sb().from('course_materiel').update(patch).eq('course', c.id).eq('article', a)));
    });

    if (S.charge) dessiner();
    recharger();
  }

  // ----- Calculs -----
  const totalDe = (c, S) => (Number(c.prix) || 0) + S.logements.reduce((s, l) => s + (Number(l.prix) || 0), 0) + S.trajets.reduce((s, t) => s + (Number(t.prix) || 0), 0);

  // ----- Affichage -----
  const libelle = t => '<span class="ob-lib">' + t + '</span>';
  const lien = (url, txt) => (lienSur(url) ? '<a class="mrt-lien pc-ext" href="' + esc(url) + '" target="_blank" rel="noopener">' + txt + ' ' + FLECHE + '</a>' : '');
  const crayon = (act, id) => '<button type="button" class="mrt-rond" data-lg-act="' + act + '" data-id="' + esc(id) + '" aria-label="Modifier" title="Modifier">' + window.mrtIcone.crayon + '</button>';

  function corpsHtml(c, S) {
    if (!S.charge) return '<p class="pc-vide">Chargement…</p>';
    const total = totalDe(c, S);
    const parties = [['Dossard', Number(c.prix) || 0], ['Logement', S.logements.reduce((s, l) => s + (Number(l.prix) || 0), 0)], ['Transport', S.trajets.reduce((s, t) => s + (Number(t.prix) || 0), 0)]].filter(p => p[1] > 0);
    const totalHtml = total > 0
      ? '<div class="lg-total"><button type="button" class="mrt-lien" data-lg-act="detail" aria-expanded="' + S.detail + '">Total ' + euros(total) + '</button>' +
        (S.detail ? '<div class="lg-detail">' + parties.map(p => '<span>' + p[0] + ' ' + euros(p[1]) + '</span>').join('') + '</div>' : '') + '</div>' : '';
    const logements = '<div class="lg-rubrique"><p class="pc-sous-titre lg-titre">Logement <button type="button" class="mrt-btn" data-lg-act="ajouter-logement">Ajouter</button></p>' +
      S.logements.map(l => S.mode && S.mode.sorte === 'logement' && S.mode.id === l.id ? formLogement(l) : ligneLogement(l)).join('') +
      (S.mode && S.mode.sorte === 'logement' && !S.mode.id ? formLogement(null) : '') + '</div>';
    const trajets = '<div class="lg-rubrique"><p class="pc-sous-titre lg-titre">Transport <button type="button" class="mrt-btn" data-lg-act="ajouter-trajet">Ajouter</button></p>' +
      S.trajets.map(t => S.mode && S.mode.sorte === 'trajet' && S.mode.id === t.id ? formTrajet(t) : ligneTrajet(t)).join('') +
      (S.mode && S.mode.sorte === 'trajet' && !S.mode.id ? formTrajet(null) : '') + '</div>';
    const notes = c.logistique ? '<div class="lg-rubrique"><p class="pc-sous-titre">Notes</p><p>' + esc(c.logistique).replace(/\n/g, '<br>') + '</p></div>' : '';
    return totalHtml + logements + trajets + matosHtml(S) + notes + (S.message ? '<p class="lg-msg" role="status">' + esc(S.message) + '</p>' : '');
  }

  function ligneLogement(l) {
    const fleche = lienSur(l.url) ? '<a class="lg-lien-nom mrt-lien" href="' + esc(l.url) + '" target="_blank" rel="noopener" aria-label="Ouvrir le lien du logement" title="Ouvrir le lien du logement">' + FLECHE + '</a>' : '';
    return '<div class="lg-ligne"><div class="lg-haut"><span class="lg-nom">' + esc(l.nom) + fleche + '</span>' + (l.prix != null ? '<span class="lg-prix">' + euros(l.prix) + '</span>' : '') + crayon('modifier-logement', l.id) + '</div>' +
      (l.adresse ? '<div class="lg-bas"><span>' + esc(l.adresse) + '</span></div><div class="lg-bas">' + itineraires(l.adresse) + '</div>' : '') +
      (l.arrivee ? '<div class="lg-bas"><span>Arrivée : ' + esc(quand(l.arrivee)) + '</span></div>' : '') +
      (l.depart ? '<div class="lg-bas"><span>Départ : ' + esc(quand(l.depart)) + '</span></div>' : '') + '</div>';
  }
  function ligneTrajet(t) {
    const sens = (SENS.find(x => x[0] === t.sens) || [])[1], type = (TYPES_TRAJET.find(x => x[0] === t.type) || [])[1];
    const de = [t.lieu_depart, t.depart ? quand(t.depart) : ''].filter(Boolean).join(' ');
    const a = [t.lieu_arrivee, t.arrivee ? quand(t.arrivee) : ''].filter(Boolean).join(' ');
    return '<div class="lg-ligne"><div class="lg-haut"><span class="lg-nom">' + esc([type, sens].filter(Boolean).join(' · ')) + '</span>' + (t.prix != null ? '<span class="lg-prix">' + euros(t.prix) + (t.prix_aller_retour ? ' <small>aller-retour</small>' : '') + '</span>' : '') + crayon('modifier-trajet', t.id) + '</div>' +
      (de || a ? '<div class="lg-bas"><span>' + esc(de) + (de && a ? ' ' : '') + (de && a ? window.mrtIcone.droite : '') + (de && a ? ' ' : '') + esc(a) + '</span></div>' : '') +
      (lienSur(t.url) ? '<div class="lg-bas">' + lien(t.url, 'Réservation') + '</div>' : '') + '</div>';
  }

  // Champ de feuille : libellé au-dessus, champ commun mrt-champ.
  const champ = (nom, lib, valeur, type, extra) => '<div class="lg-champ"><label>' + lib + '</label><input class="mrt-champ" name="' + nom + '" type="' + (type || 'text') + '" value="' + esc(valeur) + '"' + (extra || '') + '></div>';
  const liste = (nom, lib, options, valeur) => '<div class="lg-champ"><label>' + lib + '</label><select class="mrt-champ" name="' + nom + '">' +
    options.map(o => '<option value="' + o[0] + '"' + (o[0] === valeur ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';
  const pied = existe => '<div class="lg-pied"><button type="button" class="mrt-btn" data-lg-act="annuler">Annuler</button><button type="submit" class="mrt-btn is-principal">Enregistrer</button></div>' +
    (existe ? '<div class="lg-bas-seul"><button type="button" class="mrt-btn is-danger" data-lg-act="supprimer">' + POUBELLE + 'Supprimer</button></div>' : '');
  // Adresse : champ libre, plus « Rechercher » (OpenStreetMap) qui propose des adresses mises en forme.
  const adresseChamp = v => '<div class="lg-champ lg-large lg-adresse"><label>Adresse</label><div class="lg-recherche"><input class="mrt-champ" name="adresse" type="text" value="' + esc(v) + '" maxlength="200" placeholder="Saisir, puis Rechercher">' +
    '<button type="button" class="mrt-btn" data-lg-act="chercher">Rechercher</button></div><div class="mrt-menu lg-suggestions" hidden></div><p class="lg-aide" aria-live="polite"></p></div>';
  function formLogement(l) {
    l = l || {};
    return '<form class="lg-form" autocomplete="off">' + champ('nom', 'Nom', l.nom, 'text', ' maxlength="100" required') + adresseChamp(l.adresse) +
      champ('prix', 'Prix (€)', l.prix, 'text', ' inputmode="decimal"') + champ('url', 'Lien', l.url, 'url', ' maxlength="500" placeholder="https://"') +
      champ('arrivee', 'Arrivée', pourChamp(l.arrivee), 'datetime-local') + champ('depart', 'Départ', pourChamp(l.depart), 'datetime-local') + pied(!!l.id) + '</form>';
  }
  function formTrajet(t) {
    t = t || {};
    const bloc = (pref, lib, v) => champ(pref + 'lieu_depart', 'Lieu de départ' + lib, v.lieu_depart, 'text', ' maxlength="100"') + champ(pref + 'depart', 'Départ' + lib, pourChamp(v.depart), 'datetime-local') +
      champ(pref + 'lieu_arrivee', 'Lieu d\'arrivée' + lib, v.lieu_arrivee, 'text', ' maxlength="100"') + champ(pref + 'arrivee', 'Arrivée' + lib, pourChamp(v.arrivee), 'datetime-local');
    return '<form class="lg-form lg-form-trajet" autocomplete="off">' + liste('type', 'Type', TYPES_TRAJET, t.type || 'train') + liste('sens', 'Sens', t.id ? SENS : SENS_NOUVEAU, t.sens || 'aller') +
      bloc('', '', t) + '<p class="pc-sous-titre lg-large lg-retour" hidden>Retour</p>' +
      '<div class="lg-retour lg-large lg-sous-grille" hidden>' + bloc('r_', '', {}) + '</div>' +
      champ('prix', 'Prix (€)', t.prix, 'text', ' inputmode="decimal"') + champ('url', 'Lien de réservation', t.url, 'url', ' maxlength="500" placeholder="https://"') + pied(!!t.id) + '</form>';
  }

  // ----- Matos -----
  // Les articles de la course, avec leur fiche du catalogue, rangés par catégorie (imposés d'abord, puis l'ordre du catalogue).
  function articlesDe(S) {
    return S.matos.map(m => Object.assign({}, m, { fiche: S.catalogue.find(a => a.id === m.article) })).filter(m => m.fiche)
      .sort((a, b) => CATEGORIES.indexOf(a.fiche.categorie) - CATEGORIES.indexOf(b.fiche.categorie) || (b.impose - a.impose) || (a.fiche.ordre - b.fiche.ordre));
  }
  function ligneArticle(m, S, grand) {
    const type = typeDe(m.fiche.nom), equips = type ? S.equipements.filter(e => e.type === type && e.actif !== false) : [];
    const choisi = S.equipements.find(e => e.id === m.equipement);
    return '<div class="lg-art' + (grand ? ' is-grand' : '') + '"><label class="lg-art-l"><span class="mrt-coche"><input type="checkbox" data-champ="pris" data-article="' + esc(m.article) + '"' + (m.pris ? ' checked' : '') + '></span>' +
      '<span class="lg-art-nom">' + esc(m.fiche.nom) + '</span></label>' + (m.impose ? '<span class="lg-impose">Imposé</span>' : '') +
      (choisi && !S.edition ? '<span class="lg-equip">' + esc(nomEquip(choisi)) + '</span>' : '') +
      (S.edition ? '<span class="lg-outils"><label class="lg-bascule"><span class="mrt-coche"><input type="checkbox" data-champ="impose" data-article="' + esc(m.article) + '"' + (m.impose ? ' checked' : '') + '></span>Imposé</label>' +
        (equips.length ? '<select class="mrt-champ" data-champ="equipement" data-article="' + esc(m.article) + '" aria-label="Équipement"><option value="">Équipement…</option>' +
          equips.map(e => '<option value="' + esc(e.id) + '"' + (e.id === m.equipement ? ' selected' : '') + '>' + esc(nomEquip(e)) + '</option>').join('') + '</select>' : '') +
        '<button type="button" class="mrt-lien is-danger" data-lg-act="retirer" data-id="' + esc(m.article) + '">Retirer</button></span>' : '') + '</div>';
  }
  function matosHtml(S) {
    const articles = articlesDe(S), pris = articles.filter(a => a.pris).length;
    let corps = '';
    CATEGORIES.forEach(cat => {
      const l = articles.filter(a => a.fiche.categorie === cat);
      if (l.length) corps += '<p class="pc-sous-titre lg-cat">' + cat + '</p>' + l.map(a => ligneArticle(a, S, false)).join('');
    });
    const dejaPris = new Set(S.matos.map(m => m.article));
    const ajout = S.edition ? '<div class="lg-ajout"><input class="mrt-champ" name="article" list="lg-catalogue" maxlength="80" placeholder="Ajouter un article" aria-label="Article">' +
      '<datalist id="lg-catalogue">' + S.catalogue.filter(a => !dejaPris.has(a.id)).map(a => '<option value="' + esc(a.nom) + '"></option>').join('') + '</datalist>' +
      '<select class="mrt-champ" name="categorie" aria-label="Catégorie">' + CATEGORIES.map(x => '<option>' + x + '</option>').join('') + '</select>' +
      '<button type="button" class="mrt-btn" data-lg-act="ajouter-article">Ajouter</button></div>' : '';
    return '<div class="lg-rubrique"><p class="pc-sous-titre lg-titre">Matos' + (articles.length ? ' <span class="lg-compte">' + pris + ' / ' + articles.length + ' pris</span>' : '') +
      '<span class="lg-actions">' + (articles.length ? '<button type="button" class="mrt-btn" data-lg-act="jour-j">Jour J</button>' : '') +
      '<button type="button" class="mrt-btn" data-lg-act="liste">' + (S.edition ? 'Terminer' : 'Modifier la liste') + '</button></span></p>' +
      (corps || '<p class="pc-vide">Aucun article.</p>') + ajout + '</div>';
  }

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
        CATEGORIES.map(cat => { const l = articles.filter(a => a.fiche.categorie === cat); return l.length ? '<p class="pc-sous-titre lg-cat">' + cat + '</p>' + l.map(a => ligneArticle(a, { equipements: S.equipements, edition: false }, true)).join('') : ''; }).join('') + '</div>';
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

  // ===================== Mon matériel (Mon profil) =====================
  let equipements = [];
  function equipHtml(e, mode) {
    if (mode === e.id) return formEquip(e);
    const type = (TYPES_EQUIP.find(t => t[0] === e.type) || [])[1] || e.type;
    const km = e.type === 'chaussures' ? [Number(e.km_depart) ? 'départ ' + nombre(e.km_depart) + ' km' : '', e.km_limite ? 'limite ' + nombre(e.km_limite) + ' km' : ''].filter(Boolean).join(' · ') : '';
    return '<div class="st-connexion"><span>' + esc(nomEquip(e) || type) + '<small>' + esc([type, km, e.actif === false ? 'retiré' : ''].filter(Boolean).join(' · ')) + '</small></span>' +
      '<button type="button" class="mrt-btn" data-mm-act="modifier" data-id="' + esc(e.id) + '">Modifier</button></div>';
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
        (mode === 'nouveau' ? formEquip(null) : '<div class="st-connexion"><span></span><button type="button" class="mrt-btn" data-mm-act="ajouter">Ajouter</button></div>') + '</div>';
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

  window.mrtLogistique = { html, brancher, materiel, totalDe, CATEGORIES };
})();
