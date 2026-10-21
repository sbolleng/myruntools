# MyRunTools · consignes pour Claude

Application web modulaire pour coureurs, construite à partir de spécifications. Ce fichier est lu au début de chaque discussion : il fixe les règles du projet.

## Le projet

- Lire d'abord `docs/README.md` : sommaire des spécifications, feuille de route, journal des décisions.
- Deux profils pilotes au lancement (trail et route), deux comptes créés à la main. Les anciens sites (dépôt `plan-entrainement_Seb`) servent d'inspiration et de source de données ; on n'y développe plus rien de neuf.

## Règles

- Ne jamais inventer de données : demander.
- Français, tutoiement, réponses courtes et factuelles.
- Le pilote route est désigné « route » ou « Rome », jamais par son nom ni son adresse, nulle part.
- Le dépôt est public : aucune donnée personnelle, aucun nom complet de tiers, aucune référence de réservation. Jamais de secret (clé de service Supabase) ; seule la clé publique figure dans le code. Les scripts d'import de données personnelles ne sont jamais versionnés.
- Pas d'indexation : chaque page porte `<meta name="robots" content="noindex">` ; `robots.txt` interdit tout.

## Spécifications

- Une par module : `docs/module-<nom>-specification.md`, en tête « Version x.y · date · [Retour au sommaire](README.md) ».
- Synthétiques, didactiques, compréhensibles par quelqu'un qui n'a jamais vu les anciens sites : aucune référence à l'existant ni aux personnes, pas de design (document séparé).
- Chaque spécification finit par un jeu d'essai et des résultats attendus, rejoués avant chaque mise en ligne.
- Chaque décision : une ligne dans le journal de `docs/README.md`, la plus récente en haut.

## Cycle d'un module

Spécification → validation → modèle de données si besoin → construction → contrôles (jeu d'essai) → mise en ligne. Maquette seulement à la demande, ou proposée quand elle aide à trancher.

## Technique

- HTML, CSS et JavaScript natifs, sans framework ni compilation.
- Données : Supabase (offre gratuite), règles par ligne, connexion par lien magique.
- `composants/` : composants partagés, avec leur feuille de style : en-tête et menu (`en-tete`, thèmes compris), palmarès, planning.
- `donnees/demo.js` : profil de démonstration écrit en dur, en attendant la base de données.
- Thèmes de couleur : `bleu-orange`, `vert-rose`, `violet-turquoise` (essais) ; une page s'ouvre dans un autre thème avec `?t=…`.
- `docs/maquettes/` : maquettes (en-tête, calendrier) ; le calendrier s'ouvre avec `?t=trail` ou `?t=route` (profils d'exemple).
- Publication : `.github/workflows/publication.yml` publie GitHub Pages à chaque mise à jour de `main` et remplace `__VERSION__` par le numéro du commit dans les liens CSS/JS et la balise `site-version` : rien à incrémenter à la main.
- Circuit git : travailler sur la branche de la session, fusionner dans `main` (`--no-ff`), pousser les deux. Vérifier une fois, en fin de lot, que la publication a réussi, avant d'annoncer que c'est en ligne.
