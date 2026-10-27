// ===== Session : connexion à Supabase par lien magique =====
//
// À charger après la bibliothèque Supabase (supabase-js) et donnees/supabase.js.
// mrtSession() rend une promesse : null sans connexion, sinon
// { email, profil, preferences } lus dans la base (règles par ligne : chacun ne
// reçoit que ses propres lignes). Le retour du lien magique est traité tout
// seul à l'ouverture de la page.
(function () {
  const cfg = window.MRT_SUPABASE;
  const client = window.supabase && cfg ? window.supabase.createClient(cfg.url, cfg.cle) : null;
  window.mrtSupabase = client;

  let promise = null;
  window.mrtSession = function () {
    if (promise) return promise;
    promise = (async () => {
      if (!client) return null;
      const { data } = await client.auth.getSession();
      const session = data && data.session;
      if (!session) return null;
      // Ses propres lignes seulement : un site partagé rend lisibles d'autres préférences.
      const id = session.user.id;
      const [profil, preferences] = await Promise.all([
        client.from('profils').select('*').eq('id', id).maybeSingle(),
        client.from('preferences').select('*').eq('utilisateur', id).maybeSingle()
      ]);
      return { id, email: session.user.email, profil: profil.data, preferences: preferences.data };
    })().catch(err => {
      console.warn('Session : lecture impossible', err);
      return null;
    });
    return promise;
  };

  // Lien magique envoyé seulement aux comptes existants (créés à la main).
  window.mrtEnvoyerLien = async function (email, retour) {
    if (!client) throw new Error('Connexion indisponible');
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: retour }
    });
    if (error) throw error;
  };

  window.mrtDeconnecter = async function () {
    if (client) await client.auth.signOut();
  };

  // Site privé : hors page de connexion, une page reste masquée (classe
  // mrt-attente posée dans son <head>) jusqu'à ce que tout soit prêt : session
  // vérifiée, en-tête et contenu dessinés (mrtPage appelle mrtAfficher). Elle
  // s'affiche ainsi d'un seul coup, sans saut. Sans session, direction la page
  // de connexion.
  window.mrtAfficher = () => {
    const h = document.documentElement;
    if (h.classList.contains('mrt-attente-contenu')) h.classList.add('mrt-fondu');
    h.classList.remove('mrt-attente', 'mrt-attente-contenu');
  };
  const surConnexion = /connexion\.html$/.test(location.pathname);
  window.mrtSession().then(s => {
    if (!s && !surConnexion) {
      location.replace('connexion.html' + location.search);
      return;
    }
    // Le thème des préférences s'applique.
    if (s && s.preferences && s.preferences.theme && window.appliquerTheme) window.appliquerTheme(s.preferences.theme);
  });
  // Filet : une page ne reste jamais masquée si un chargement échoue.
  setTimeout(() => { if (!surConnexion) window.mrtAfficher(); }, 6000);
})();
