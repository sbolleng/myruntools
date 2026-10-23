# MyRunTools · consignes pour Claude

Application web modulaire pour coureurs, construite à partir de spécifications. Ce fichier est lu au début de chaque discussion : il fixe les règles du projet.

## Le projet

- Lire d'abord `docs/README.md` : sommaire des spécifications, feuille de route, todo globale. Le journal des décisions est à part (`docs/journal.md`) : ne le lire qu'au besoin.
- Deux profils pilotes au lancement (trail et route), deux comptes créés à la main. Les anciens sites (dépôt `plan-entrainement_Seb`) servent d'inspiration et de source de données ; on n'y développe plus rien de neuf.

## Règles

- Ne jamais inventer de données : demander.
- Français, tutoiement, réponses courtes et factuelles.
- Le pilote route est désigné « le compte test Rome », jamais par son nom ni son adresse, nulle part.
- Le dépôt est public : aucune donnée personnelle, aucun nom complet de tiers, aucune référence de réservation. Jamais de secret (clé de service Supabase) ; seule la clé publique figure dans le code. Les scripts d'import de données personnelles ne sont jamais versionnés.
- Pas d'indexation : chaque page porte `<meta name="robots" content="noindex">` ; `robots.txt` interdit tout.

## Spécifications

- Une par module : `docs/module-<nom>-specification.md`, en tête « Version x.y · date · [Retour au sommaire](README.md) ».
- Synthétiques, didactiques, compréhensibles par quelqu'un qui n'a jamais vu les anciens sites : aucune référence à l'existant ni aux personnes, pas de design (document séparé).
- Chaque spécification finit par un jeu d'essai et des résultats attendus, rejoués avant chaque mise en ligne.
- Chaque décision : une ligne dans `docs/journal.md`, la plus récente en haut.

## Cycle d'un module

Spécification → validation → modèle de données si besoin → construction → contrôles (jeu d'essai, rejoué par le banc d'essai) → mise en ligne. Maquette seulement à la demande, ou proposée quand elle aide à trancher.

## Technique

- HTML, CSS et JavaScript natifs, sans framework ni compilation.
- Données : Supabase (offre gratuite), règles par ligne, connexion par lien magique.
- `composants/` : composants partagés, avec leur feuille de style : en-tête et menu (`en-tete`, thèmes compris), session et site partagé (`session`, `donnees`), palmarès, fiche d'une course (`fiche-course`), planning.
- `composants/donnees.js` : lecture des données de l'utilisateur connecté (courses, en-tête, menu) ; `donnees/supabase.js` : adresse du projet et clé publique.
- Base : `supabase/schema.sql` (création) et `supabase/evolutions/` (changements, numérotés, à coller dans l'éditeur SQL).
- Thèmes de couleur : `bleu-orange`, `vert-rose`, `violet-turquoise`, proposés à tous, choisis dans les Préférences seulement (plus de `?t=…` sur le site).
- `docs/maquettes/` : maquettes (en-tête, calendrier) ; le calendrier s'ouvre avec `?t=trail` ou `?t=route` (profils d'exemple).
- Banc d'essai : `outils/essais/` (`npm install` une fois, puis `node essais.js`, `--captures` pour des images). Chromium, base simulée par `donnees-fictives.json`, date figée au 20 octobre 2026. Chaque module construit y ajoute ses contrôles, tirés de son jeu d'essai. Données fictives seulement.
- Publication : `.github/workflows/publication.yml` publie GitHub Pages à chaque mise à jour de `main` et remplace `__VERSION__` par le numéro du commit dans les liens CSS/JS et la balise `site-version` : rien à incrémenter à la main.
- Circuit git : travailler sur la branche de la session, fusionner dans `main` (`--no-ff`), pousser les deux. Vérifier une fois, en fin de lot, que la publication a réussi, avant d'annoncer que c'est en ligne.

## État en cours

À tenir à jour à la fin de chaque lot (quelques lignes, pas d'historique : il est dans le journal).

- Dernier lot en ligne : page Préférences (thème, menu, cap), `?t=…` retiré du site.
- En cours : authentification terminée (domaine `myruntools.fr` sur GitHub Pages, Resend, SMTP, e-mail en français) ; modèle d'e-mail A retenu (`docs/maquettes/email-connexion-a.html`), à coller dans Supabase, puis test de connexion de bout en bout sur le nouveau domaine.
- Prochaine étape : voir « Prochaines étapes » dans `docs/README.md`.
