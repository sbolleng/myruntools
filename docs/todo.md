# À faire

Version 1.0 · 20 novembre 2026 · [Retour au sommaire](README.md)

Todo globale du projet : tout ce qui reste à faire y est noté ; une ligne terminée disparaît (la trace reste dans le [journal](journal.md)). Les prochaines étapes, en bref, sont dans le [sommaire](README.md#prochaines-étapes) : les tenir alignées.

## Prochaines étapes

Dans l'ordre :

1. [ ] **Préparation** : [spécification 1.31](module-preparation-specification.md) ; **lot 4, un seul plan** (12 nov. 2026) : page « Mon plan », courses du plan avec leur avis et leurs sources, « Passer en Plaisir », préparatoire conseillée, place d'une course dans la saison ; sources de la préparatoire conseillée vérifiées (12 nov. 2026) ; lot 5 **Mon profil** fait (spécification Profil 0.1) ; lot 6a construit (retour sur une séance, déplacer avec un conseil ; évolution 034 passée) ; lot 6b construit (réadaptation après un commentaire, historique ; évolution 035 passée, fonction recollée) ; lot 6 **adaptation** (déplacer une séance, la commenter, ressenti ; mention RGPD des données de santé) ; import des séances par fichier exporté si Strava refuse ; **abonnement** à prévoir pour l'ouverture à tous. **Construire mon plan pas à pas** (idée du 15 nov. 2026, d'après Kiprun) : un parcours en quatre étapes pour qui n'a pas encore de plan : l'Objectif (choisi parmi ses courses, ou nouvelle course : nom, date, distance, D+), le chrono visé (ou « plus tard »), le coureur (Mon profil, les seules questions qui manquent), la semaine ; puis une synthèse « Plan de 16 semaines · J-112 », « C'est parti » ; à faire après la refonte de Mon plan, en lien avec les Premiers pas d'En un coup d'œil. **Visite guidée de Mon plan** (idée du 15 nov. 2026, d'après Kiprun) : à la première ouverture, des bulles posées sur l'écran, une par élément, avec « Précédent », « Suivant », puis « C'est parti ! » ; à revoir après la refonte de la page. Lots 1 à 3 en ligne (plan de préparation, profil, séances proposées par l'IA, réservées aux pilotes). Évolution 028, fonction `proposer-seances` (une seule recommandation) et secret `PILOTES` en place, proposition et acceptation essayées en réel (11 nov. 2026). « Ma semaine » a « Annuler » et « Enregistrer » en haut (11 nov. 2026, à essayer en réel). **À vérifier** : avec 7 sorties par semaine et les 7 jours cochés, l'IA n'en propose que 4 ; piste : la consigne envoyée dit « au plus N » (la changer en « vise N, au plus N » ?), décision en attente de ton essai. **Idée notée (10 nov. 2026, à revoir plus tard)** : texte de la recommandation dans une voix de coach sportif qui accompagne son équipe, avec le détail de la préparation à venir (le ton reste formel pour l'instant ; changer les consignes de `proposer-seances` et recoller la fonction). Lots suivants : vidéo tutoriel ; ouverture de l'IA à tous (voir n° 6, Ouverture à tous, suites).
   - **Mon plan, refonte (en cours)** : étapes 1 (parcours « Construire mon plan »), 2 (vue d'ensemble) et 3 (ajouter une course préparatoire) **construites** ([Préparation 3.1](module-preparation-specification.md), § 5.0 et 5.1). Évolution 040 passée le 20 nov. Évolution 041 passée et fonction `proposer-seances` recollée le 20 nov. **Prochaine étape, dans une autre discussion : ajouter le renforcement** (section Renforcement de Ma semaine dans le parcours, séances de renforcement dans le plan ; voir aussi le n° 13 « Renforcement musculaire »). À vérifier : les durées minimum par format sur les pages entières (seuls des extraits lus).
   - **Rappel : me trouver les règles** de la préparatoire avant un ultra (bornes de distance avant un trail de 60 à 129 km et de 130 km ou plus) ; en attendant, Plaisir. Piste trouvée le 19 nov. (extrait de recherche, à vérifier) : Run-Motion cite une course d'environ 50 km 6 à 8 semaines avant un 100 km, ou une sortie de 40 à 60 km avant un premier 100 km.
   - Plus tard : l'option « Me maintenir en forme » (affichée inactive en attendant).
2. [ ] **Objectif** :
   - **À essayer en réel** : « Remplacer » le GPX du Rock'Angel (fichier à plusieurs tracés : choix du bon tracé), puis « ↓ GPX ».
   - Plus tard, chacun décidé à son tour (ajouter ou non, toujours à la même place) : badges UTMB, météo du jour J, suivi en course.
   - **Page d'une course** : pouvoir choisir cette course comme cap de l'en-tête (pas depuis la saison ; aujourd'hui seulement dans les Préférences, `course_cap`).
   - **Section stratégie de course** : ravitaillement en course, repères de référence (glucides et eau par heure).
   - **Outil de calcul de stratégie de course** (idée du 13 nov. 2026) : reprendre l'outil de calcul de stratégie de RunMotion, à récupérer ; à préciser : ce qu'il calcule (temps de passage, allures par tronçon, ravitaillements ?), comment l'obtenir (fichier, tableur, lien) et où le placer (page de la course, section stratégie ci-dessus, ou module Calculatrice, n° 14). Pas de recopie du code ni des données d'un tiers sans son accord.
   - **Calculer un plan de course (stratégie)** (ajouté le 15 nov. 2026) : à partir du tracé GPX, de l'objectif (temps ou allure) et du profil du coureur, calculer le plan de la course : temps de passage et allure par tronçon, ravitaillements, besoins en glucides et en eau ; à spécifier avant toute construction (plan de page d'abord), en lien avec l'outil de RunMotion ci-dessus et la section stratégie.
   - **Nombre de ravitaillements** : pouvoir l'indiquer sur la course (fiche d'édition et page), distinct de la stratégie de ravitaillement ci-dessus ; format de saisie et place à décider (ajouté le 1er nov. 2026).
   - **Règlement de la course** : pouvoir l'importer (fichier) et le consulter depuis la page de la course.
   - **Retrait des dossards** : infos de retrait (lieu, jours et horaires, pièces à présenter), sur la page de la course ; à situer par rapport à la Logistique (ajouté le 1er nov. 2026).
3. [ ] **Courses à surveiller** (spécification 0.7, en ligne) :
   - **Dupliquer une course pour l'année suivante** (à rediscuter) : une ligne par édition ; bouton sur la fiche d'une course courue qui crée une copie À surveiller, un an plus tard (mois seul), sans résultat, dossard ni ouverture ; question ouverte : recopier le tracé GPX ?
   - Index UTMB (plus tard).
4. [ ] **Calendrier** : [spécification 0.25](module-calendrier-specification.md) ; trois vues (Année, Mois, Semaine) au menu « Vue », bouton « Plan », modèle de données et séances en ligne ; la préparation d'une course est une rubrique de sa page (Objectif, § 3.4). Reste :
   - **Idée notée (13 nov. 2026, à décider plus tard)** : la frise de Mon plan comme vue du Calendrier (« Frise » dans le menu « Vue », plein écran, En cours / Tout ; toucher une phase ouvre la Semaine) ; Mon plan garderait sa frise.
   - **Mois V2** (à l'essai depuis le 20 nov. 2026, [§ 4.5](module-calendrier-specification.md)) : comparer avec Mois, puis n'en garder qu'une (retirer l'autre du menu).
   - **Légende** : retravailler son intégration, surtout les différents événements (ajouté le 11 nov. 2026).
   - **Fonds de phase** (Mois, Semaine ; un seul fond par phase depuis le 0.17) : lisibilité à vérifier à l'usage, notamment sur fond blanc.
   - **Prépa des courses préparatoires et plaisir** : réglée par le module Préparation (plan de préparation), qui remplace la règle « course confirmée la plus proche ».
   - **À essayer en conditions réelles** (Supabase) : ajout d'une séance, case « faite », « Paramétrer le plan » (durée, phases, depuis la page Préparation), la rubrique d'une course, nouvelle ou existante.
   - **Semaine de récupération après la course** (décidée, § 5.1) : case facultative par course dans « Paramétrer le plan » ; évolution de la base, frise, jeu d'essai.
   - **Durées de prépa par format** : valeurs du § 5.4 validées ; à fournir pour Trail découverte, Course en heure, Marche, Fast hiking, Triathlon.
   - **Plus tard** : import des séances depuis une application, avec durée, distance, D+ et ressenti facultatifs ; génération des séances d'un plan par IA (les phases restent calculées par les règles générales, jamais par IA).
5. [ ] **Refonte login et mot de passe** : en ligne le 30 oct. 2026 ; essais réels réussis (« Mot de passe oublié ? », « Changer le mot de passe »). Reste : premier mot de passe du compte test Rome.
6. [ ] **Ouverture à tous, suites** (inscription ouverte le 20 nov. 2026, parcours complet vérifié ; trace dans le [journal](journal.md)) :
   - **Plafond de l'IA à remettre** : `plafondIA: 4` dans `donnees/supabase.js` et secret `PLAFOND` = 4 de `proposer-seances` (levé le 13 nov. pour les essais des pilotes).
   - **Tester avec un compte non pilote** le message « Réservé aux comptes pilotes pour l'instant. » (Mon plan), maintenant possible avec un compte créé par l'inscription.
   - **Droits RGPD dans les Préférences** : « Exporter mes données » et « Supprimer mon compte » (fonction côté serveur pour la suppression) ; d'ici là, par e-mail au contact.
   - **Polices hébergées sur le site** (plus de Google Fonts) ; mettre à jour la politique de confidentialité (P7).
   - **Surveiller** les premiers comptes (Authentication → Users) et les limites d'envoi d'e-mails (Resend, Rate Limits).
   - **Plus tard** : alerte par e-mail à l'administrateur quand l'IA est en panne ; abonnement ; validation de l'application par Strava avant l'import.
7. [ ] **Changer son adresse e-mail** : dans les Préférences (bloc Compte), avec confirmation envoyée à la nouvelle adresse.
8. [ ] **Refonte des Préférences utilisateur** : s'inspirer d'Oleno et de Babelio ; plan de page d'abord.
9. [ ] **Catalogue des courses** : d'abord un catalogue partagé (une course saisie par un coureur sert aux suivants, recherche, doublons à gérer) ; ensuite, demander un partenariat d'accès aux données à Le Sportif (la plus large couverture), puis à Finishers. Pas de récupération automatique de leurs pages (conditions d'utilisation, droit des bases de données). En attendant : **Remplir depuis la page de la course** ([Objectif 0.81](module-objectif-specification.md), § 3.9), spécifié le 20 nov. 2026, **à construire** (encart de la fiche, fonction `lire-page-course` à coller, contrôles au banc).
10. [x] **Mon profil** ([spécification](module-profil-specification.md), en ligne ; évolution 033 passée) : section Connexions avec l'import de l'export Strava (21 nov. 2026, avec Mes stats).
11. [ ] **Matériel** (module) : chaussures et leur usure, inventaire, matériel obligatoire, listes de sac ; périmètre à définir.
12. [ ] **Logistique** (module) : transport, hébergement, retrait des dossards, horaires ; périmètre à définir.
13. [ ] **Renforcement musculaire** (module) : module dédié, ou intégré à Profil ou à Cette semaine ?
14. [ ] **Calculatrice** (module) : allure, vitesse, temps de passage, VMA, km-effort, pente ; liste des calculs à valider ; peut sortir tôt, car elle ne dépend d'aucune donnée.
15. [ ] **Nutrition** : **à faire : vue Semaine** (ajoutée le 16 nov. 2026 ; comme la version semaine de la calculette de référence : le besoin et les apports sur sept jours, dépense du sport de la semaine répartie sur les jours ; plan de page à proposer) ; design des fenêtres d'ajout revu (feuilles de saisie rapide, 11 nov. 2026) ; [spécification 1.4](module-nutrition-specification.md) validée (5 nov. 2026) ; modèle de données 0.19 et évolution 019 écrits, évolution 019 passée dans Supabase (5 nov. 2026) ; `besoin.js`, profil minimal, sport du jour, jauges, ajout rapide et journal construits et testés (page `nutrition.html`, à cocher dans les Préférences ; évolution 020 pour l'ajouter aux menus rangés) ; mise en page en quatre cartes et recherche Open Food Facts (6 nov. 2026) ; sélecteur de jour, sport en base, bloc d'En un coup d'œil (0.7) ; évolutions 021, 022, 029 et 030 passées dans Supabase (10 nov. 2026) ; relais de recherche déployé (version du 9 nov., vérifié) ; ergonomie 1.4 (fenêtre Modifier du Calendrier, ajout en deux étapes) ; **à reprendre : choix de l'unité dans la feuille d'ajout** (grammes ou portion « pièce · 80 g », poids de la portion gardé par aliment, évolution SQL ; options A, B, C proposées le 10 nov. 2026, en attente de décision) ; reste : **Ciqual** (aliments génériques, dont les plats simples comme l'œuf au plat ; site de l'ANSES en maintenance le 6 nov., à réessayer), Strava ; repères glucides et eau par heure partagés avec la stratégie de course d'Objectif.
16. [ ] **Partenariat nutrition** : contacter la nutritionniste pour un partenariat (en lien avec le module Nutrition).
17. [ ] **En un coup d'œil** :
   - **Découverte du site** : bloc « Découvrir MyRunTools » construit le 13 nov. 2026 ([spécification générale](specification-generale.md), § 5 bis) ; évolution 037 passée le 20 nov. 2026. Plus tard, si besoin : une présentation plus ludique (visite guidée).
   - Pense-bête : rappels tirés des courses et notes perso (table des notes, évolution à prévoir).
   - Repasse sur les blocs et leur ordre, une fois la page utilisée quelque temps.
18. [ ] **Prévoir un profil piste ?**
19. [ ] **Bouton « Laisser un avis »** : envoie un message à l'adresse contact@ du site, à mettre en place (lien avec les mentions légales) ; place du bouton et forme (lien e-mail ou formulaire) à décider (ajouté le 1er nov. 2026).
20. [ ] **Guide** ([spécification 0.1](module-guide-specification.md), en ligne) : **rappel : me trouver les liens** des deux sources de nutrition, la formule de Black et al. (métabolisme de base) et l'équation de course de l'ACSM ; elles sont citées sans lien d'ici là (ajouté le 13 nov. 2026).
21. [ ] **Mes stats** ([spécification 0.2](module-stats-specification.md), construit le 21 nov. 2026) : **à faire dans Supabase** : coller l'évolution `044-mes-stats.sql`, créer la fonction `analyser-stats` (secrets `ANTHROPIC_API_KEY` et `PILOTES` déjà là) ; **essai réel** : importer l'archive Strava d'un pilote (intitulés des colonnes, en anglais ou en français, et unité de la cadence à vérifier ; archive jamais versée au dépôt) ; puis relire l'analyse de l'IA.

## Questions ouvertes

Aucune question générale ouverte pour l'instant (les questions propres à un module sont dans sa spécification).

## Idées de modules

Idées notées pour plus tard, sans jalon.

### Calendrier annuel des courses (idée du 5 oct. 2026, devenue le [module Calendrier](module-calendrier-specification.md))

Une vue de l'année d'un seul tenant, pour voir le planning en un coup d'œil, pas un simple récapitulatif.

- Les 12 mois visibles ensemble, un petit carré par jour.
- Chaque course est un carré de couleur vive à sa date (par exemple rouge ; l'objectif plus marqué).
- Un liseré part de chaque course et remonte dans le temps sur la durée de sa préparation : deux liserés qui se superposent signalent deux préparations qui se chevauchent.
- Les jours sans course ni liseré font apparaître les plages libres pour la récupération et la préparation.
- Construit à partir de la même liste de courses que la page Objectif, sans double saisie.
- **Prototype en ligne** depuis le 13 oct. 2026 sur l'ancien site du profil route, onglet Planning (composant `composants/planning.js`), avec des durées provisoires et deux vues : 12 mois glissants, ou jusqu'à l'objectif.

Durée de prépa, période et module à part sont tranchés dans la spécification du module ; le liseré de récupération est remplacé par la phase Deload.
