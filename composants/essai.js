// ===== Version d'essai : fiche d'une course v2 =====
//
// Décrite par docs/module-objectif-specification.md (§ 3.8). Une page ouverte avec ?essai=v2 active la v2 sur
// cet appareil (retenu : localStorage « mrt-essai ») ; ?essai=v1, ou le lien du bandeau, revient à la v1.
// window.mrtEssai vaut 'v2' quand l'essai est actif : les fichiers *-v2.js ne s'appliquent qu'alors.
(function () {
  const CLE = 'mrt-essai';
  let actif = null;
  try {
    const u = new URL(location.href), q = u.searchParams.get('essai');
    if (q === 'v2') localStorage.setItem(CLE, 'v2');
    if (q === 'v1') localStorage.removeItem(CLE);
    // L'adresse reste propre : le choix est retenu sur l'appareil.
    if (q) { u.searchParams.delete('essai'); history.replaceState(history.state, '', u.pathname.split('/').pop() + u.search + u.hash); }
    actif = localStorage.getItem(CLE);
  } catch (e) { /* stockage indisponible : pas d'essai */ }
  window.mrtEssai = actif === 'v2' ? 'v2' : null;
  if (!window.mrtEssai) return;

  // Bandeau discret, en bas de l'écran, sous les fenêtres.
  const poser = () => {
    const d = document.createElement('div');
    d.className = 'mrt-essai';
    d.innerHTML = '<span>Version d\'essai · fiche v2</span><a href="#">Revenir à la v1</a>';
    d.querySelector('a').addEventListener('click', e => {
      e.preventDefault();
      try { localStorage.removeItem(CLE); } catch (err) { /* stockage indisponible */ }
      location.reload();
    });
    document.body.appendChild(d);
  };
  if (document.body) poser(); else document.addEventListener('DOMContentLoaded', poser);
})();
