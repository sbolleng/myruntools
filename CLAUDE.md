# MyRunTools · consignes pour Claude

Application web modulaire pour coureurs, construite à partir de spécifications. Ce fichier est lu au début de chaque discussion : il fixe les règles du projet.

## Le projet

- Lire d'abord `docs/README.md` : sommaire des spécifications, feuille de route, todo globale. Le journal des décisions est à part (`docs/journal.md`) : ne le lire qu'au besoin.
- Deux profils pilotes au lancement (trail et route), deux comptes créés à la main. Les anciens sites (dépôt `plan-entrainement_Seb`) servent d'inspiration et de source de données ; on n'y développe plus rien de neuf.

## Règles

- Ne jamais inventer de données : demander.
- Français, tutoiement, réponses courtes et factuelles.
- Maquettes et images : chacune coûte cher en consommation. Proposer d'abord un plan de page (en texte, voir plus bas), bien plus économique. Avant de produire une maquette ou une image, ou de lancer un travail long ou groupé (plusieurs fichiers, plusieurs essais), dire ce que ce sera et demander confirmation ; ne faire sans demander que les petites tâches.
- Le pilote route est désigné « le compte test Rome », jamais par son nom ni son adresse, nulle part.
- Le dépôt est public : aucune donnée personnelle, aucun nom complet de tiers, aucune référence de réservation. Jamais de secret (clé de service Supabase) ; seule la clé publique figure dans le code. Les scripts d'import de données personnelles ne sont jamais versionnés.
- Pas d'indexation : chaque page porte `<meta name="robots" content="noindex">` ; `robots.txt` interdit tout.

## Spécifications

- Une par module : `docs/module-<nom>-specification.md`, en tête « Version x.y · date · [Retour au sommaire](README.md) ».
- Synthétiques, didactiques, compréhensibles par quelqu'un qui n'a jamais vu les anciens sites : aucune référence à l'existant ni aux personnes, pas de design (document séparé).
- Chaque spécification finit par un jeu d'essai et des résultats attendus, rejoués avant chaque mise en ligne.
- Chaque décision : une ligne dans `docs/journal.md`, la plus récente en haut.

## Plan de page

Pour discuter d'une page ou d'un élément (une carte, un formulaire), on travaille d'abord en texte, avant toute maquette en image : c'est bien moins coûteux, et souvent suffisant.

- **Schéma** : un bloc de code qui dessine l'élément en caractères, chaque partie repérée par un numéro entre parenthèses, à sa vraie place ; un second schéma pour le téléphone si l'ordre change.
- **Tableau des éléments** : N°, nom, exemple, place, style actuel (police, taille, couleur).
- **Numéros stables** : un élément garde son numéro d'une version à l'autre ; un nouvel élément prend le numéro suivant. On s'en sert pour demander une modification (« le 5 dans la couleur du 3 »).
- **Options** : quand il faut choisir, un tableau des propositions (proposition, rendu, ce qu'on y gagne), avec une recommandation.
- Le plan retenu va dans la spécification du module (exemple : `docs/module-objectif-specification.md`, § 3.1).

## Cycle d'un module

Spécification → validation → modèle de données si besoin → construction → contrôles (jeu d'essai, rejoué par le banc d'essai) → mise en ligne. Maquette seulement à la demande, ou proposée quand elle aide à trancher.

## Technique

- HTML, CSS et JavaScript natifs, sans framework ni compilation.
- Données : Supabase (offre gratuite), règles par ligne, connexion par lien magique.
- `composants/` : composants partagés, avec leur feuille de style : en-tête et menu (`en-tete`, thèmes et éléments communs compris : boutons `mrt-btn`, `mrt-rond`, lien `mrt-lien`, section `mrt-section`), session et site partagé (`session`, `donnees`), palmarès, fiche d'une course (`fiche-course`), feuille de route et page d'une course (`objectif`), planning.
- `composants/donnees.js` : lecture des données de l'utilisateur connecté (courses, en-tête, menu) ; `donnees/supabase.js` : adresse du projet et clé publique.
- Base : `supabase/schema.sql` (création) et `supabase/evolutions/` (changements, numérotés, à coller dans l'éditeur SQL).
- Thèmes de couleur : `bleu-orange`, `vert-rose`, `violet-turquoise`, proposés à tous, choisis dans les Préférences seulement (plus de `?t=…` sur le site).
- `docs/maquettes/` : maquettes (en-tête, calendrier) ; le calendrier s'ouvre avec `?t=trail` ou `?t=route` (profils d'exemple).
- Banc d'essai : `outils/essais/` (dépendances installées au démarrage de chaque discussion par le hook de `.claude/settings.json` ; `node essais.js`, `--captures` pour des images ; `node captures.js` photographie les pages pour une maquette, avant/après possible). Chromium, base simulée par `donnees-fictives.json`, date figée au 20 octobre 2026. Chaque module construit y ajoute ses contrôles, tirés de son jeu d'essai. Données fictives seulement.
- Publication : `.github/workflows/publication.yml` publie GitHub Pages à chaque mise à jour de `main` et remplace `__VERSION__` par le numéro du commit dans les liens CSS/JS et la balise `site-version` : rien à incrémenter à la main.
- Circuit git : travailler sur la branche de la session, fusionner dans `main` (`--no-ff`), pousser les deux. Vérifier une fois, en fin de lot, que la publication a réussi, avant d'annoncer que c'est en ligne.

## État en cours

À tenir à jour à la fin de chaque lot (quelques lignes, pas d'historique : il est dans le journal).

- Dernier lot en ligne : Objectif normé et champ Précisions (évolution 007 passée dans Supabase) ; avant : Palmarès, bouton Filtres rond et panneau en pastilles ; temps en hh:mm:ss, boutons « Ajouter une course » et « Colonnes + », largeur commune des pages ; repasse de style sur tout le site (règles communes du design § 1 ; en-tête sur l'Accueil et la feuille de route, ailleurs une barre fine « Cap sur … » et l'engrenage ; page d'une course sans en-tête, fiche encadrée et textes repliables ; Palmarès en paysage sur téléphone).
- Prochaine étape : voir « Prochaines étapes » dans `docs/README.md`.
- Mode d'emploi des discussions (règles, outils, modèle conseillé) : en tête de `docs/README.md`.
