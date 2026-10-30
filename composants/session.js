// ===== Session : connexion à Supabase par adresse e-mail et mot de passe =====
//
// À charger après la bibliothèque Supabase (supabase-js) et donnees/supabase.js.
// mrtSession() rend une promesse : null sans connexion, sinon
// { email, profil, preferences } lus dans la base (règles par ligne : chacun ne
// reçoit que ses propres lignes). Le retour du lien de réinitialisation est
// traité tout seul à l'ouverture de la page.
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

  // ----- Connexion par adresse e-mail et mot de passe (spécification générale, § 3) -----
  // Les comptes sont créés à la main : pas d'inscription. Le mot de passe est haché par Supabase, jamais gardé ici.
  const LONGUEUR = 14;
  // Règles du mot de passe : 14 caractères au moins, sans règle de composition, différent de l'adresse. Rend le message d'erreur, ou null.
  window.mrtRegleMotDePasse = (mdp, email) => {
    if ((mdp || '').length < LONGUEUR) return 'Au moins ' + LONGUEUR + ' caractères.';
    if (email && mdp.trim().toLowerCase() === String(email).trim().toLowerCase()) return 'Différent de l\'adresse e-mail.';
    return null;
  };
  // Erreur de Supabase : « limite » (trop de demandes), « identifiants », ou autre.
  const natureErreur = err => (err && (err.status === 429 || /rate|limit|too many/i.test(err.message || '')) ? 'limite'
    : err && (err.code === 'invalid_credentials' || /invalid login|invalid credentials/i.test(err.message || '')) ? 'identifiants' : 'autre');
  window.mrtNatureErreur = natureErreur;

  window.mrtConnecter = async function (email, motDePasse, captchaToken) {
    if (!client) throw new Error('Connexion indisponible');
    const { error } = await client.auth.signInWithPassword({ email, password: motDePasse, options: captchaToken ? { captchaToken } : {} });
    if (error) throw error;
  };

  // Lien de réinitialisation, envoyé si le compte existe ; la réponse ne dit jamais si l'adresse existe (erreur de limite exceptée).
  window.mrtMotDePasseOublie = async function (email, retour, captchaToken) {
    if (!client) throw new Error('Connexion indisponible');
    const { error } = await client.auth.resetPasswordForEmail(email, captchaToken ? { redirectTo: retour, captchaToken } : { redirectTo: retour });
    if (error && natureErreur(error) === 'limite') throw error;
  };

  // Nouveau mot de passe (lien reçu, ou page Préférences) ; les autres appareils sont déconnectés.
  window.mrtNouveauMotDePasse = async function (motDePasse) {
    if (!client) throw new Error('Connexion indisponible');
    const { error } = await client.auth.updateUser({ password: motDePasse });
    if (error) throw error;
    await client.auth.signOut({ scope: 'others' });
  };

  // Préférences : l'ancien mot de passe est vérifié d'abord (« identifiants » : actuel incorrect), puis remplacé.
  window.mrtChangerMotDePasse = async function (email, actuel, nouveau, captchaToken) {
    await window.mrtConnecter(email, actuel, captchaToken);
    await window.mrtNouveauMotDePasse(nouveau);
  };

  // Contrôle anti-robot (Cloudflare Turnstile), seulement si MRT_SUPABASE.captcha (clé du site, publique) est renseignée.
  // mrtCaptcha(élément) rend { jeton(), reinitialiser() } ; jeton() rend undefined sans clé, sinon le jeton du contrôle réussi.
  window.mrtCaptcha = function (conteneur) {
    const cle = cfg && cfg.captcha;
    if (!cle) return { jeton: async () => undefined, reinitialiser: () => {} };
    let id = null, jeton = null, attente = null;
    const pret = new Promise(ok => {
      const lancer = () => { id = window.turnstile.render(conteneur, { sitekey: cle, theme: 'dark', callback: t => { jeton = t; if (attente) attente(t); }, 'expired-callback': () => { jeton = null; } }); ok(); };
      if (window.turnstile) return lancer();
      const sc = document.createElement('script');
      sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      sc.async = true;
      sc.onload = lancer;
      document.head.appendChild(sc);
    });
    return {
      jeton: async () => { await pret; return jeton || new Promise(ok => { attente = ok; }); },
      reinitialiser: () => { jeton = null; if (id !== null && window.turnstile) window.turnstile.reset(id); }
    };
  };

  // Œil d'un champ mot de passe : affiche ou masque la saisie.
  window.mrtOeil = function (champ) {
    const enveloppe = document.createElement('div');
    enveloppe.className = 'mrt-mdp';
    champ.parentNode.insertBefore(enveloppe, champ);
    enveloppe.appendChild(champ);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mrt-oeil';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Afficher le mot de passe');
    b.title = 'Afficher le mot de passe';
    b.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
    b.addEventListener('click', () => {
      const voir = champ.type === 'password';
      champ.type = voir ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(voir));
      const t = voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
      b.setAttribute('aria-label', t);
      b.title = t;
    });
    enveloppe.appendChild(b);
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
  const surConnexion = /(connexion|nouveau-mot-de-passe)\.html$/.test(location.pathname);
  window.mrtSession().then(s => {
    if (!s && !surConnexion) {
      location.replace('connexion.html' + location.search);
      return;
    }
    // Le thème des préférences s'applique.
    // Pas sur un site partagé : c'est alors le thème du propriétaire qui compte (donnees.js).
    let vue = null;
    try { vue = localStorage.getItem('mrt-vue'); } catch (e) { /* stockage indisponible */ }
    if (s && vue && vue !== s.id) return;
    if (s && s.preferences && s.preferences.theme && window.appliquerTheme) window.appliquerTheme(s.preferences.theme);
  });
  // Filet : une page ne reste jamais masquée si un chargement échoue.
  setTimeout(() => { if (!surConnexion) window.mrtAfficher(); }, 6000);
})();
