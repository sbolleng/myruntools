# Réglages Supabase pour la connexion par mot de passe

Version 1.1 · 12 novembre 2026 · [Retour au sommaire](README.md)

À faire une fois par toi, dans le tableau de bord Supabase, **avant** la mise en ligne de la connexion par mot de passe ([spécification générale](specification-generale.md), § 3). Les libellés du tableau de bord changent parfois : cherche l'équivalent si un nom ne correspond pas. Aucune clé secrète ne doit jamais entrer dans le dépôt.

| # | Où (Authentication) | Réglage |
| --- | --- | --- |
| 1 | URL Configuration | **Site URL** : `https://myruntools.fr` (domaine du site, publié par GitHub Pages). **Redirect URLs** : ajouter `https://myruntools.fr/nouveau-mot-de-passe.html` et `https://myruntools.fr/connexion.html?confirme=1`. Sans ces lignes, le lien de réinitialisation ou de confirmation n'arrive pas sur la bonne page. |
| 2 | Sign In / Providers → Email | Fournisseur e-mail activé ; **longueur minimale du mot de passe : 14**. |
| 3 | Sign In / Providers | Création de comptes (« Allow new users to sign up ») **désactivée** tant que l'inscription n'est pas ouverte ; **« Confirm email » activé**. Pour l'ouvrir : activer ce réglage **en même temps** que `inscription: true` dans `donnees/supabase.js` (je le publie), une fois les n° 6 et 7 faits et la politique de confidentialité en ligne. D'ici là, un compte se crée à la main : Users → Add user → Create new user, « Auto Confirm User » coché, et dans « User Metadata » `{"prenom": "…", "nom": "…"}` (évolution 015 : la base crée le profil et les préférences). |
| 4 | Emails (modèles) | Modèle **Confirm signup** en français, au vouvoiement (texte dans la spécification générale, § 3) ; modèle **Reset password** en français, au vouvoiement (texte dans la spécification générale) ; activer l'e-mail d'alerte après changement de mot de passe s'il existe (« Password changed » ; absent du tableau de bord au 30 oct. 2026). |
| 5 | Durée du lien | Lien de réinitialisation valable 1 h (3 600 s, la valeur par défaut). |
| 6 | Attack Protection | **CAPTCHA** : créer un widget Cloudflare Turnstile pour le domaine `myruntools.fr` ; coller sa **clé secrète** dans Supabase ; me donner (ou coller dans `donnees/supabase.js`, champ `captcha`) sa **clé du site**, qui est publique. Active-le seulement une fois la clé du site en place dans le code, sinon plus personne ne peut se connecter. |
| 7 | Project Settings → SMTP | **Obligatoire avant d'ouvrir l'inscription** : brancher un service d'envoi (SMTP personnalisé, par exemple Resend, déjà utilisé pour le contact) ; l'envoi par défaut de Supabase n'écrit qu'aux membres de l'équipe du projet, et seulement quelques e-mails par heure. |

**Premier mot de passe** : les comptes existants n'en ont pas. Sur la page de connexion, « Mot de passe oublié ? » avec ton adresse, puis le lien reçu.

**Limite connue** : Supabase ne permet pas de désactiver seulement le lien magique. Le site ne l'utilise plus, mais l'interface existe toujours côté Supabase, avec la même protection que « Mot de passe oublié » : la boîte mail. C'est le compromis du choix « mot de passe seul, sans second facteur ».

**Retour en arrière** : si tu es bloqué, Authentication → Users → ⋯ → envoyer un lien de récupération ; ou refaire une version précédente du site (les fusions sont dans `main`).
