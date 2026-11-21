# Outils et services

Version 0.1 · 20 novembre 2026 · [Retour au sommaire](README.md)

La liste de tous les outils et services de MyRunTools : à quoi chacun sert, où le trouver, et ce qu'il faut y régler. Aucun secret ici : les clés se saisissent dans les tableaux de bord, jamais dans le dépôt (public). Seule la clé publique de Supabase et la clé du site Turnstile figurent dans le code (`donnees/supabase.js`).

## 1. Outils administrés (un compte, des réglages)

| Outil | Adresse | Rôle | État |
| --- | --- | --- | --- |
| GitHub | `github.com/sbolleng/myruntools` | Dépôt du code et des spécifications (public) ; workflow de publication `.github/workflows/publication.yml` | Utilisé |
| GitHub Pages | `https://myruntools.fr` | Hébergement du site, publié à chaque mise à jour de `main` | Utilisé |
| OVH | `ovh.com/manager` | Nom de domaine `myruntools.fr` ; redirection de l'adresse de contact | Utilisé |
| Supabase | `supabase.com/dashboard` ; le projet répond sur `*.supabase.co` | Base de données (PostgreSQL, région Stockholm), connexion par e-mail et mot de passe, règles par ligne, Edge Functions et leurs secrets ; les évolutions SQL se collent dans l'éditeur ([réglages](reglages-supabase-connexion.md)) | Utilisé |
| Resend | `resend.com` | Envoi des e-mails : réponses au contact, puis e-mails de confirmation et de réinitialisation (SMTP de Supabase) | Utilisé |
| Gmail | `mail.google.com` | Réception et réponse aux messages de contact, l'envoi passant par Resend | Utilisé |
| Cloudflare Turnstile | `dash.cloudflare.com` → Turnstile ; le site charge `challenges.cloudflare.com` | Contrôle anti-robot (connexion, « Créer un compte », changement de mot de passe) ; seul usage de Cloudflare. Clé du site publiée, reste à l'activer dans Supabase avec la clé secrète | À activer |
| API Anthropic | `platform.claude.com` | Séances proposées par l'IA, par la fonction `proposer-seances`, et stratégie de course, par `proposer-strategie` ([Objectif](module-objectif-specification.md), § 3.10) ; secrets `ANTHROPIC_API_KEY`, `PILOTES`, `MODELE`, `PLAFOND` ([Préparation](module-preparation-specification.md)) | Utilisé (pilotes) |
| Claude Code | `claude.ai/code` | Construction du site à partir des spécifications ; bilan hebdomadaire prévu en routine Claude | Utilisé |

## 2. Services appelés par le site (aucun compte)

| Service | Adresse | Rôle | État |
| --- | --- | --- | --- |
| Open Food Facts | `world.openfoodfacts.org`, `search.openfoodfacts.org` | Recherche de produits dans Nutrition, par le relais Supabase `recherche-aliments` | Utilisé |
| OpenTopoMap | `opentopomap.org` (tuiles `*.tile.opentopomap.org`) | Fond de carte du tracé GPX | Utilisé |
| OpenStreetMap | `openstreetmap.org` | Lien vers le lieu d'une course ; données de la carte | Utilisé |
| Google Fonts | `fonts.googleapis.com`, `fonts.gstatic.com` | Polices Space Grotesk et Space Mono | Utilisé |
| jsDelivr | `cdn.jsdelivr.net` | Bibliothèque `supabase-js` (version 2.45.4) | Utilisé |
| cdnjs | `cdnjs.cloudflare.com` | Leaflet 1.9.4 (carte) | Utilisé |
| Open-Meteo | `open-meteo.com` | Météo du jour J (gratuit, sans clé) | Prévu |

Les crédits et licences sont dans les mentions légales ([spécification générale](specification-generale.md), § 11 bis, M8).

## 3. Prévus ou pris pour référence

| Nom | Adresse | Rôle |
| --- | --- | --- |
| Strava | `strava.com/developers` | Import automatique des séances, après validation de l'application par Strava |
| Ciqual (ANSES) | `ciqual.anses.fr` | Aliments génériques pour Nutrition |
| RunMotion | `run-motion.com` | Référence : échelle de ressenti, calculette de nutrition ; outil de calcul de stratégie à récupérer (todo, Objectif) |
| Le Sportif, Finishers | `finishers.com` (lien de recherche d'une course) | Catalogue des courses : partenariat envisagé, pas de récupération automatique de leurs pages |

## 4. Règles

- **Un seul rôle par outil** : une ligne par outil, mise à jour ici quand on en ajoute, en change ou en retire.
- **Secrets** : jamais dans le dépôt ni dans une discussion ; chacun dans le tableau de bord de son outil (Supabase pour les secrets des fonctions).
- **Cloudflare** : réservé à Turnstile ; le DNS reste chez OVH.
- **Nouveau service appelé par le site** : l'ajouter ici, dans les crédits des mentions légales et, s'il reçoit des données d'un utilisateur, dans la politique de confidentialité (RGPD).

## 5. Jeu d'essai

- Chaque adresse externe appelée ou chargée par le code (pages, `donnees/supabase.js`, `composants/`, `supabase/functions/`) figure dans ce document : résultat attendu, aucune adresse absente. Sont exclus les liens vers les articles cités comme sources (page Guide, avis des courses de `preparation.js`), qui ne sont pas des services.
- Aucune clé secrète dans le dépôt : résultat attendu, aucune clé de l'API d'Anthropic (`sk-ant-…`), aucune clé secrète de Supabase (`sb_secret_…`) et aucune clé de service de l'ancien format (jeton commençant par `eyJ`). La clé secrète de Turnstile ne se distingue pas de la clé du site : elle reste seulement à ne jamais coller dans le code.
- Banc d'essai : contrôle `outilsServices`.
