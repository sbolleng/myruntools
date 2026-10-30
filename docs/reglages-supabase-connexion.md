# Réglages Supabase pour la connexion par mot de passe

Version 1.0 · 30 octobre 2026 · [Retour au sommaire](README.md)

À faire une fois par toi, dans le tableau de bord Supabase, **avant** la mise en ligne de la connexion par mot de passe ([spécification générale](specification-generale.md), § 3). Les libellés du tableau de bord changent parfois : cherche l'équivalent si un nom ne correspond pas. Aucune clé secrète ne doit jamais entrer dans le dépôt.

| # | Où (Authentication) | Réglage |
| --- | --- | --- |
| 1 | URL Configuration | **Site URL** : l'adresse du site (GitHub Pages). **Redirect URLs** : ajouter `<adresse du site>/nouveau-mot-de-passe.html`. Sans cette ligne, le lien de réinitialisation n'arrive pas sur la bonne page. |
| 2 | Sign In / Providers → Email | Fournisseur e-mail activé ; **longueur minimale du mot de passe : 14**. |
| 3 | Sign In / Providers | **Désactiver la création de comptes** (« Allow new users to sign up ») : les comptes sont créés à la main. |
| 4 | Emails (modèles) | Modèle **Reset password** en français, au vouvoiement (texte dans la spécification générale) ; activer l'e-mail d'alerte après changement de mot de passe s'il existe (« Password changed »). |
| 5 | Durée du lien | Lien de réinitialisation valable 1 h (3 600 s, la valeur par défaut). |
| 6 | Attack Protection | **CAPTCHA** : créer un widget Cloudflare Turnstile ; coller sa **clé secrète** dans Supabase ; me donner (ou coller dans `donnees/supabase.js`, champ `captcha`) sa **clé du site**, qui est publique. Active-le seulement une fois la clé du site en place dans le code, sinon plus personne ne peut se connecter. |
| 7 | Project Settings → SMTP | Si les e-mails n'arrivent pas, ou trop lentement : brancher un service d'envoi (SMTP personnalisé) au lieu de l'envoi par défaut, limité. |

**Premier mot de passe** : les comptes existants n'en ont pas. Sur la page de connexion, « Mot de passe oublié ? » avec ton adresse, puis le lien reçu.

**Limite connue** : Supabase ne permet pas de désactiver seulement le lien magique. Le site ne l'utilise plus, mais l'interface existe toujours côté Supabase, avec la même protection que « Mot de passe oublié » : la boîte mail. C'est le compromis du choix « mot de passe seul, sans second facteur ».

**Retour en arrière** : si tu es bloqué, Authentication → Users → ⋯ → envoyer un lien de récupération ; ou refaire une version précédente du site (les fusions sont dans `main`).
