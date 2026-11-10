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
- Données : Supabase (offre gratuite), règles par ligne, connexion par adresse e-mail et mot de passe (réglages Supabase : `docs/reglages-supabase-connexion.md`).
- `composants/` : composants partagés, avec leur feuille de style : En un coup d'œil (`accueil`, page `index.html`), en-tête et menu (`en-tete`, thèmes et éléments communs compris : boutons `mrt-btn` (`is-principal`, `is-danger`), `mrt-rond` (`is-fermer`), lien `mrt-lien`, pastille `mrt-pastille`, champ `mrt-champ` (`mrt-mdp` et son œil pour un mot de passe), section `mrt-section`, déroulé `mrtDeroule` et `details.mrt-deroule`), session et site partagé (`session`, `donnees`), palmarès, fiche d'une course (`fiche-course`), feuille de route et page d'une course en modale (`objectif`, `modale-course`), calendrier (vues Semaine, par défaut, Mois et Année au menu « Périodicité » ; bouton « Plan »), tracé GPX d'une course (`trace` : import, carte Leaflet, profil, téléchargement), besoin du jour de Nutrition (`besoin`, `profil-champs`, `nutrition`), préparation d'une course (`preparation` : plan, phases, séances, plan de saison `planSaison`, partagé par le Calendrier, la page d'une course et Nutrition), plan de saison (`plan-saison`, page `preparation.html` ; séances proposées par l'IA `seances-ia`), cartes de toutes les courses en vues (`courses` : À surveiller, Déjà couru, À venir, Tout), graphiques dans le temps (`graphique` : difficulté d'Objectif, progression du Palmarès).
- `composants/donnees.js` : lecture des données de l'utilisateur connecté (courses, en-tête, menu) ; `donnees/supabase.js` : adresse du projet et clé publique.
- Base : `supabase/schema.sql` (création) et `supabase/evolutions/` (changements, numérotés, à coller dans l'éditeur SQL) ; `supabase/functions/` : fonctions Supabase (Edge Functions), à coller dans le tableau de bord (relais de recherche d'aliments `recherche-aliments` ; séances proposées par l'IA `proposer-seances`, secrets `ANTHROPIC_API_KEY` et `PILOTES`).
- Thèmes de couleur : `bleu-orange`, `vert-rose`, `violet-turquoise` (sombres), `blanc-orange` (fond blanc) et `noir-orange` (fond noir) pour la lecture, et `auto` (blanc ou noir selon l'appareil) ; proposés à tous, choisis dans les Préférences seulement (plus de `?t=…` sur le site), retenus sur l'appareil (`mrt-theme`) et posés dès le chargement ; un seul accent (plus d'Accent 2).
- `docs/maquettes/` : maquettes (en-tête, calendrier) ; le calendrier s'ouvre avec `?t=trail` ou `?t=route` (profils d'exemple).
- Banc d'essai : `outils/essais/` (dépendances installées au démarrage de chaque discussion par le hook de `.claude/settings.json` ; `node essais.js`, `node essais.js repasse` pour quelques groupes seulement, `--captures` pour des images ; `node captures.js` photographie les pages pour une maquette, avant/après possible, `THEME=vert-rose` pour un autre thème). Chromium, base simulée par `donnees-fictives.json`, date figée au 20 octobre 2026. Chaque module construit y ajoute ses contrôles, tirés de son jeu d'essai. Données fictives seulement.
- Publication : `.github/workflows/publication.yml` publie GitHub Pages à chaque mise à jour de `main` et remplace `__VERSION__` par le numéro du commit dans les liens CSS/JS et la balise `site-version` : rien à incrémenter à la main.
- Circuit git : travailler sur la branche de la session, fusionner dans `main` (`--no-ff`), pousser les deux. Vérifier une fois, en fin de lot, que la publication a réussi, avant d'annoncer que c'est en ligne.

## État en cours

À tenir à jour à la fin de chaque lot (quelques lignes, pas d'historique : il est dans le journal).

- Dernier lot : Préparation 1.0 et retouches (page allégée : plus d'état de la semaine ni de titre de bloc ; alertes en une ligne dans « Recommandation de MyRunTools » ; frise à deux niveaux Saison/Tout ; rond « plein écran » `mrtPleinEcran`, ordinateur seulement, frise et Calendrier ; une nouvelle acceptation remplace les séances de l'IA non faites ; feuille du profil de taille fixe avec glissement, « Ma semaine » en deux cadres ; Nutrition : pictos à gauche des cases, plus de message d'ajout ; « Détail → » en lien de titre) ; avant : Nutrition 1.4 (ergonomie : ronds communs, « H · » au profil, cases à fond Accent léger et pictos, fenêtre Modifier du Calendrier avec repas en liste, Récents en premier, ajout en deux étapes) ; avant : Objectif 0.74 et 0.75 (fiche : bloc Liens supprimé, Site officiel dans Course, Résultats en direct dans Résultat, temps, case « DNF » et allure sur une ligne) ; avant : Objectif 0.72 (fiche : objectif en liste à choix unique, « Précisions sur l'objectif », étoile des obligatoires en Accent avec légende, distance et temps obligatoires, « Seul le mois est connu », ouverture des inscriptions sur une ligne) ; avant : Nutrition 1.3 (activité tirée du Calendrier : séances de course et de renforcement, fenêtre de séance du Calendrier ouverte depuis Nutrition, case « faite », échelle de l'ACSM ; évolutions 021, 022, 029 et 030 passées) ; avant : Nutrition 1.2 (activité détachée des repas, case Activité « + Ajouter », feuilles sans date) ; avant : Nutrition 1.1 (journal : activité en fin, lignes à toucher pour Modifier ou Supprimer, un « + » par section) ; avant : Nutrition 1.0 (haut épuré : jour et besoin centrés, « Calculé pour … » vers le profil ; cases Activité et Repas qui ouvrent des feuilles ; « + » par repas ; anneaux dans le bloc d'En un coup d'œil) ; avant : Nutrition, bloc d'En un coup d'œil (deuxième position ; « Détail » en bouton commun) ; avant : Préparation 0.7 (profil dans la feuille d'une course, règle des fenêtres au design ; nombres 0 à 7, évolution 028 ; bloc dans la grille du Mois ; une seule recommandation de l'IA, fonction `proposer-seances` à recoller) ; avant : Préparation 0.6 (« Ma semaine » : jours possibles pour courir et pour le renforcement, cumulables, nombres de séances, jour de la sortie longue ; évolution 027 à passer) ; avant : Préparation 0.5 (profil repensé : une question par écran, tranches ; évolution 026) ; avant : Objectif 0.71 (fiche d'une course courue : place de « Date approximative » gardée vide, champs à la même place qu'à venir) ; avant : Nutrition 0.9 (recherche : mots commencés, produits dès la frappe par le relais, recherches gardées sous la version du site ; relais `recherche-aliments` déployé et vérifié) ; avant : Préparation 0.4, lot 3 (séances proposées par l'IA, réservées aux pilotes ; évolution 025, fonction `proposer-seances` et ses secrets à mettre en place) ; avant : Préparation 0.3, lot 2 (profil d'entraînement, séances enrichies ; évolution 024 à passer) ; avant : Préparation 0.2, lot 1 (plan de saison, rôles fusionnés, récupération, alertes, page `preparation.html` à cocher dans les Préférences ; le Calendrier et Nutrition suivent le plan de saison ; évolution 023 à passer) ; avant : Nutrition 0.8 (recherche par un relais Supabase `recherche-aliments`, à créer dans le tableau de bord, l'ancien moteur d'Open Food Facts étant saturé ; mes aliments pendant la frappe ; ensuite Ciqual, dès que le site de l'ANSES sort de maintenance) ; avant : une page de course partout (Objectif 0.68 à 0.71 : champs à la même place à venir comme courue, précisions de l'objectif affichées, mêmes blocs et champs d'où qu'on ouvre la fiche, GPX dans le Parcours d'une course courue, consultation courue avec objectif et textes repliés) ; avant : Nutrition 0.7 (carte du besoin fusionnée avec sélecteur de jour, sport en base, recherche dans mes aliments puis Open Food Facts, bloc Nutrition d'En un coup d'œil ; évolutions 021 et 022 à passer ; ensuite Ciqual, dès que le site de l'ANSES sort de maintenance) ; avant : Calendrier 0.19 et 0.20 (types de séance en toutes lettres, menu « Périodicité » avec 3 mois, 6 mois, Année ; bouton « Plan » ; Année en colonnes, jours de chaque mois, fins de semaine marquées, fond de phase et liseré sans barres ; Mois d'un seul fond et « + » en Accent) ; avant : repasse d'uniformité (design 0.39 : échelle de sept tailles en variables, éléments communs `mrtFormat`, `mrtIcone`, `mrtConfirmer`, `mrt-choix`, `mrt-tri`, `mrt-chev`, petit rond ; banc : groupe « uniformite ») ; avant : Nutrition 0.5. Historique : `docs/journal.md`.
- Prochaine étape : voir « Prochaines étapes » dans `docs/README.md`.
- Mode d'emploi des discussions (règles, outils, modèle conseillé) : en tête de `docs/README.md`.
