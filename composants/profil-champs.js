// ===== Profil minimal : le formulaire de Nutrition =====
//
// Les champs du profil dont la calculatrice du besoin a besoin (sexe, naissance, poids, taille, activité hors
// sport) : docs/module-nutrition-specification.md, § 2 et 4.5. Un seul formulaire, deux usages :
//   mrtProfilEncart(el, { profil, id, surEnregistre })    encart du premier usage : les seuls champs qui manquent
// Ensuite, les mesures se modifient dans Mon profil (composants/profil.js), la page ou sa feuille.
// Les valeurs sont rangées dans `profils` (règles par ligne : chacun écrit sa ligne seulement).
// À charger après composants/besoin.js ; surEnregistre(profil) reçoit le profil mis à jour.
(function () {
  const LIBELLES = { sexe: 'Sexe', naissance: 'Date de naissance', poids: 'Poids', taille: 'Taille', activite: 'Activité hors sport' };
    const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nombre = t => parseFloat(String(t).trim().replace(',', '.'));

  function champ(nom, profil) {
    const v = profil[nom];
    let corps;
    if (nom === 'sexe') {
      corps = '<span class="pf-pastilles">' + [['femme', 'Femme'], ['homme', 'Homme']].map(s =>
        '<label class="mrt-pastille"><input type="radio" name="sexe" value="' + s[0] + '"' + (v === s[0] ? ' checked' : '') + '>' + s[1] + '</label>').join('') + '</span>';
    } else if (nom === 'naissance') {
      corps = '<input class="mrt-champ" type="date" name="naissance" value="' + esc(v) + '">';
    } else if (nom === 'poids' || nom === 'taille') {
      corps = '<span class="pf-unite"><input class="mrt-champ" type="text" inputmode="decimal" name="' + nom + '" value="' + esc(v != null ? String(v).replace('.', ',') : '') + '">' + (nom === 'poids' ? 'kg' : 'cm') + '</span>';
    } else {
      const niveaux = window.mrtBesoin.ACTIVITES;
      corps = '<select class="mrt-champ" name="activite"><option value="">Choisis…</option>' +
        Object.keys(niveaux).map(k => '<option value="' + k + '"' + (v === k ? ' selected' : '') + '>' + esc(niveaux[k].libelle) + '</option>').join('') + '</select>';
    }
    return '<div class="pf-champ"><span class="pf-libelle">' + LIBELLES[nom] + '</span>' + corps + '</div>';
  }

  // Lit et contrôle les champs affichés : { valeurs } ou { erreur }.
  function lire(form, champs, aujourdhui) {
    const v = {};
    for (const nom of champs) {
      if (nom === 'sexe') {
        const c = form.querySelector('input[name="sexe"]:checked');
        if (!c) return { erreur: 'Choisis ton sexe (femme ou homme) : il sert à la formule du calcul.' };
        v.sexe = c.value;
      } else if (nom === 'naissance') {
        const d = form.naissance.value, a = window.mrtBesoin.age(d, aujourdhui);
        if (!d) return { erreur: 'Indique ta date de naissance.' };
        if (!a || a < 10 || a > 110) return { erreur: 'Cette date de naissance n\'est pas possible.' };
        v.naissance = d;
      } else if (nom === 'poids') {
        const n = nombre(form.poids.value);
        if (!(n >= 20 && n <= 300)) return { erreur: 'Le poids doit être compris entre 20 et 300 kg.' };
        v.poids = Math.round(n * 10) / 10;
      } else if (nom === 'taille') {
        const n = nombre(form.taille.value);
        if (!(n >= 100 && n <= 250)) return { erreur: 'La taille doit être comprise entre 100 et 250 cm.' };
        v.taille = Math.round(n);
      } else if (nom === 'activite') {
        if (!window.mrtBesoin.ACTIVITES[form.activite.value]) return { erreur: 'Choisis ton niveau d\'activité hors sport.' };
        v.activite = form.activite.value;
      }
    }
    return { valeurs: v };
  }

  async function enregistrer(id, valeurs) {
    // select : aucune ligne touchée (profil absent de la base) compte comme un échec.
    const { data, error } = await window.mrtSupabase.from('profils').update(valeurs).eq('id', id).select('id');
    return error || (!data || !data.length ? new Error('Profil introuvable') : null);
  }

  const aujourdhui = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };

  // Branche la validation d'un formulaire : rend de quoi l'appeler après coup.
  function brancher(form, champs, opts, apres) {
    const msg = form.querySelector('.pf-msg');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const r = lire(form, champs, aujourdhui());
      if (r.erreur) { msg.textContent = r.erreur; return; }
      msg.textContent = '';
      const erreur = await enregistrer(opts.id, r.valeurs);
      if (erreur) { console.warn('Profil : enregistrement impossible', erreur); msg.textContent = 'Enregistrement impossible pour l\'instant.'; return; }
      const profil = Object.assign({}, opts.profil, r.valeurs);
      apres(profil);
    });
  }

  window.mrtProfilEncart = function (el, opts) {
    const champs = window.mrtBesoin.manquants(opts.profil, aujourdhui());
    el.innerHTML = '<form class="pf-encart mrt-section" novalidate><p class="pf-titre">Pour calculer ton besoin</p>' +
      '<p class="pf-msg" role="alert"></p>' +
      champs.map(n => champ(n, opts.profil)).join('') +
      '<button type="submit" class="mrt-btn is-principal">Enregistrer</button></form>';
    brancher(el.querySelector('form'), champs, opts, opts.surEnregistre);
  };

})();
