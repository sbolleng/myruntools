// ===== Connexion à Supabase : adresse du projet et clé publique =====
// La clé publique (« publishable ») est faite pour être dans le code : sans
// connexion, les règles par ligne de la base (supabase/schema.sql) ne laissent
// rien lire. La clé secrète ne doit jamais figurer ici.
window.MRT_SUPABASE = {
  url: 'https://gifrpodrwesuhtgkxbuc.supabase.co',
  cle: 'sb_publishable_85VoCMn5Qkd33Uq0qhSE5g_CTs-cUZy',
  // Clé du site (publique) du contrôle anti-robot Cloudflare Turnstile ; vide tant qu'il n'est pas activé dans Supabase.
  // La clé secrète du contrôle se saisit dans Supabase, jamais ici.
  captcha: '',
  // Inscription (page « Créer un compte ») : false tant qu'elle n'est pas ouverte (RGPD, anti-robot, envoi d'e-mails) ;
  // à passer à true en même temps que « Allow new users to sign up » dans Supabase.
  inscription: false,
  // Page de la politique de confidentialité : vide tant qu'elle n'existe pas ; renseignée, l'inscription demande de l'accepter.
  confidentialite: '',
  // Propositions de séances par l'IA, par mois et par compte (Mon plan) : 0, sans limite pendant les essais des pilotes ;
  // à remettre à 4 en même temps que le secret PLAFOND de la fonction proposer-seances (todo du sommaire).
  plafondIA: 0
};
