// ===== Connexion à Supabase : adresse du projet et clé publique =====
// La clé publique (« publishable ») est faite pour être dans le code : sans
// connexion, les règles par ligne de la base (supabase/schema.sql) ne laissent
// rien lire. La clé secrète ne doit jamais figurer ici.
window.MRT_SUPABASE = {
  url: 'https://gifrpodrwesuhtgkxbuc.supabase.co',
  cle: 'sb_publishable_85VoCMn5Qkd33Uq0qhSE5g_CTs-cUZy',
  // Clé du site (publique) du contrôle anti-robot Cloudflare Turnstile ; vide tant qu'il n'est pas activé dans Supabase.
  // La clé secrète du contrôle se saisit dans Supabase, jamais ici.
  captcha: ''
};
