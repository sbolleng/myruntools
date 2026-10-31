# Modèle de données

Version 0.16 · 31 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit les données que l'application range dans Supabase : les tables, leurs champs, leurs liens, et les règles qui protègent les données de chacun. Il couvre les modules déjà spécifiés (socle, Objectif, Palmarès) et l'équipement ; les autres modules (nutrition, séances Strava…) ajouteront leurs tables quand ils seront spécifiés.

## 1. Principes

- **Une seule liste de courses par utilisateur.** Une course passe d'un module à l'autre (Courses à surveiller, Objectif, Palmarès) en changeant de statut ou d'état : c'est la même ligne, sans double saisie.
- **Chaque ligne appartient à un utilisateur.** Une règle par ligne garantit que chacun ne lit et n'écrit que ses propres données (§ 8).
- **On range ce qui est saisi, on calcule le reste à l'affichage** : records 🥇, allure ou vitesse manquante, km-effort, comptes à rebours, « D'ici là ».
- **Unités fixes** : distances en kilomètres, dénivelés en mètres, durées en secondes, vitesses en km/h, dates sans fuseau (heure locale de la course).
- **Deux sortes de listes** (§ 6) : les listes de référence, qui sont des données (types de course, types d'équipement), et les listes fermées dont dépend le fonctionnement (statut, rôle, état, thème), gravées dans la base.

## 2. Vue d'ensemble

| Table | Une ligne = | Liée à |
| --- | --- | --- |
| `profils` | Un utilisateur | Compte Supabase |
| `preferences` | Les réglages d'un utilisateur | `profils`, `courses` (cap) |
| `courses` | Une course, à surveiller, prévue ou courue | `profils`, `formats`, `equipements` (chaussures) |
| `partages` | Un accord de partage en lecture seule, d'un utilisateur vers un autre | `profils` (deux fois) |
| `courses_circuits` | L'appartenance d'une course à un circuit (UTMB, Challenge Levy…) | `courses`, `circuits` |
| `plan_semaines` | Une semaine dont la phase de préparation a été modifiée à la main | `courses` |
| `seances` | Une séance du Calendrier (run ou renfo) | `profils`, `courses` (facultatif) |
| `equipements` | Un équipement : chaussures, montre, bâtons… | `profils`, `types_equipement` |
| `types_course`, `formats`, `types_equipement`, `circuits` | Une valeur d'une liste de référence | — |

## 3. Profil et préférences

### `profils`

| Champ | Contenu | Obligatoire |
| --- | --- | --- |
| `id` | Identifiant du compte Supabase | Oui |
| `prenom`, `nom` | Prénom et nom | Oui |
| `sexe` | Femme, homme, ou non précisé (sert au « 1re ») | Non |
| `naissance` | Date de naissance | Non |
| `poids`, `taille`, `pointure` | kg, cm, pointure | Non |
| `fc_repos`, `fc_max` | Fréquences cardiaques de repos et maximale, en bpm | Non |
| `vma` | Vitesse maximale aérobie, en km/h | Non |
| `vo2max` | VO2 max, en ml/kg/min | Non |

- **E-mail** : l'adresse de connexion, rangée par Supabase avec le compte ; le profil l'affiche, sans la recopier.
- Chaque valeur est la dernière connue : une nouvelle mesure remplace l'ancienne, sans historique.
- Ce sont des données d'identité et de santé : elles ne sortent jamais de la base, ni dans le dépôt, ni dans un fichier.

### `preferences`

| Champ | Contenu | Défaut |
| --- | --- | --- |
| `utilisateur` | Profil concerné | — |
| `theme` | Bleu et orange, vert et rose, violet et turquoise, blanc et orange, noir et orange, automatique (`auto` : blanc ou noir selon l'appareil ; évolution 014) | Selon la pratique |
| `modules` | Modules du menu, dans l'ordre choisi, En un coup d'œil compris (évolution 010) | Tous les modules, En un coup d'œil en tête |
| `course_cap` | La course du cap, affichée dans l'en-tête ; son champ `objectif` alimente l'indicateur « Objectif » | La dernière course de la page Objectif (la plus lointaine à venir) |
| `palmares_colonnes` | Colonnes affichées dans le Palmarès | Colonnes par défaut |
| `palmares_groupe` | Regroupement par type activé ou non | Oui |
| `page_demarrage` | Plus utilisé : la page de démarrage est le premier module construit du menu | — |
| `accueil_blocs` | Blocs affichés sur la page En un coup d'œil, dans l'ordre choisi | Prochaine course, Pense-bête, Bilan nutrition, D'ici là |

Si la course du cap devient courue ou abandonnée, l'en-tête revient au cap par défaut.

### `partages`

| Champ | Contenu |
| --- | --- |
| `proprietaire` | Celui qui partage son site |
| `invite` | Celui qui peut le voir |
| `cree_le` | Date du partage |

- Créé et supprimé par le propriétaire seul ; l'invité le voit, sans pouvoir le modifier.
- Partager se fait par l'e-mail d'un compte existant : une fonction de la base retrouve le compte sans dévoiler la liste des utilisateurs.
- Un partage donne à l'invité la **lecture** des courses, des circuits et des préférences du propriétaire, et, de son profil, du seul prénom, nom et sexe (par une fonction dédiée : les autres champs du profil restent illisibles).

## 4. Courses

### `courses`

| Groupe | Champs | Sert à |
| --- | --- | --- |
| Appartenance | `utilisateur` | Règles par ligne |
| Identité | `course` (obligatoire : « Forez Trails », « Biscatrail »), `parcours` (facultatif : « L'Olmetoise »), `lieu`, `latitude`, `longitude` | Affichage (« Course · Parcours »), météo |
| Liens | `lien` (site officiel), `inscription` (site d'inscription), `lien_resultats` (résultats en direct) | Liens de l'étape, suivi en course |
| Description | `description` : texte libre, 1 000 caractères au plus | Quelques infos sur la course |
| Tracé | `gpx` : chemin du fichier GPX dans le stockage Supabase (dossier `traces/<utilisateur>/`), 5 Mo au plus ; vide : pas de tracé (évolution 016, à construire) | Carte, profil altimétrique, téléchargement (Objectif, § 3.4) |
| Classement | `format` (le type s'en déduit) ; circuits dans `courses_circuits` (§ 4.3) | Palmarès, records, badges |
| Date | `date`, `heure` (heure locale), `date_approx` (vrai si seul le mois est connu) | Comptes à rebours, ordre, en-tête |
| Profil officiel | `distance`, `dplus`, `dmoins` | En-tête, Palmarès, km-effort |
| Place dans le plan | `statut`, `role`, `etat` (§ 4.1), `groupe_options` | Module d'affichage, en-tête |
| Dossard | `inscrit`, `dossard`, `prix`, `ouverture_inscriptions` | Cellule Dossard |
| Durée de prépa | `prepa_semaines` : durée de la préparation en semaines, de 1 à 52 ; vide : celle du format (§ 4.4) | Calendrier |
| Préparation | `objectif` (normé : temps `hh:mm:ss`, « Finisher », « Sub 3h », « Sub 45 min »), `objectif_precisions` (texte libre, 100 caractères au plus), `pourquoi` (rôle dans la préparation), `strategie`, `logistique` | Cellules de l'étape, indicateur Objectif de l'en-tête |
| Suivi en course | `passages` : liste de points (distance depuis le départ, temps visé) ; `chronos_reference` : liste de chronos (libellé, temps) | Suivi en course (§ 4.2) |
| Résultat officiel | `categorie` (catégorie d'âge FFA : CA, JU, ES, SE, M0 à M10 ; évolution 012), `temps`, `dnf`, `allure`, `vitesse`, `place`, `effectif`, `place_categorie`, `effectif_categorie`, `place_sexe`, `effectif_sexe` | Palmarès |
| Données montre | `montre_distance`, `montre_dplus`, `montre_dmoins` (évolution 013), `montre_temps`, `montre_allure`, `montre_vitesse`, `fc_moyenne` | Palmarès |
| Équipement | `chaussures` (équipement porté) | Usure des chaussures |

`dnf` : vrai pour une course commencée mais pas terminée ; le Palmarès affiche « DNF » à la place du temps.

### 4.1 Statut, rôle, état

Trois réglages indépendants décrivent la place d'une course dans le plan.

| Réglage | Valeurs | Effet |
| --- | --- | --- |
| **Statut** | À surveiller · Option · Confirmée | À surveiller : module Courses à surveiller. Option et Confirmée : page Objectif. |
| **Rôle** | Préparatoire · Plaisir · Objectif intermédiaire · Objectif | Rendu de l'étape ; une ou plusieurs courses peuvent avoir le rôle Objectif. |
| **État** | À venir · Abandonnée · Courue | Courue : Palmarès. Abandonnée : affichée nulle part, gardée pour mémoire. |

- **Options** : plusieurs courses au statut Option qui partagent le même `groupe_options` (« Automne 2027 ») sont des candidates pour un même créneau ; la page Objectif les montre ensemble. Une Option sans groupe est une option isolée. Choisir une candidate la passe en Confirmée.
- Une course ne passe à Courue que si elle est Confirmée.
- Une course lointaine dont seul le mois est connu reste Confirmée, avec `date_approx` (date rangée au 1er du mois).
- Une course sans date (souvent À surveiller) s'affiche « À définir ».

### 4.2 Suivi en course

- **`passages`** : le plan de course point par point (km 5 en 26:00, km 10 en 52:00…). Le jour J, le coureur saisit son temps réel à chaque point ; la page calcule l'avance ou le retard et projette l'arrivée.
- **`chronos_reference`** : les chronos dessinés sur la jauge de progression (« Cible 1h50 », « Record 1h53 ») ; la page situe la projection d'arrivée par rapport à eux.
- Ces listes vivent dans la course : elles sont supprimées avec elle.
- Les temps saisis pendant la course restent sur l'appareil (spécification Objectif, § 5.3) : ils ne sont pas rangés dans la base.

### 4.3 Circuits

Une course peut appartenir à zéro, un ou plusieurs circuits, chacun avec ses propres informations : d'où une table à part.

| Champ | Contenu |
| --- | --- |
| `course` | La course |
| `circuit` | Le circuit (liste de référence `circuits`) |
| `categorie` | Catégorie dans le circuit : pour l'UTMB, la catégorie d'index (20K, 50K, 100K…) ; vide si inconnue |
| `stones` | Running Stones rapportées (courses UTMB World Series), sinon vide |

Supprimer une course supprime ses lignes de circuit.

### 4.4 Préparation du Calendrier

Le plan d'une course est calculé à l'affichage ([spécification du Calendrier](module-calendrier-specification.md), § 5) ; seuls les écarts à ce calcul et les séances sont rangés.

| Donnée | Où | Contenu |
| --- | --- | --- |
| Durée par défaut | `formats.prepa_semaines` | Nombre de semaines de préparation d'un format ; vide : pas de préparation affichée (Trail découverte, Course en heure, Marche, Fast hiking, Triathlon pour l'instant) |
| Durée d'une course | `courses.prepa_semaines` | Remplace celle du format |
| Phase modifiée | `plan_semaines` : `course`, `lundi` (le lundi de la semaine), `phase` | Une ligne par semaine dont la phase a été changée à la main ; les autres semaines se calculent. Phases : base, développement, affûtage, deload. Supprimée avec la course. |
| Séance | `seances` : `date`, `type` (run ou renfo), `libelle` (1 à 100 caractères), `faite`, `course` (facultative) | Une séance saisie à la main. Si la course est supprimée, la séance reste, sans course. |

## 5. Équipement

### `equipements`

| Champ | Contenu |
| --- | --- |
| `utilisateur` | Propriétaire |
| `type` | Type d'équipement (liste de référence) |
| `marque`, `modele`, `surnom` | Pour s'y retrouver (« les rouges ») |
| `achat`, `prix` | Date et prix d'achat |
| `km_depart`, `km_limite` | Kilomètres déjà faits à l'entrée dans l'outil ; seuil d'usure (chaussures) |
| `actif` | En service ou retiré |
| `note` | Texte libre |

Le module Matériel détaillera l'usage ; plus tard, les séances calculeront l'usure des chaussures.

## 6. Listes

### Listes de référence (tables)

| Table | Contenu | Qui modifie |
| --- | --- | --- |
| `types_course` | Course sur route, Trail, Marche, Fast hiking, Triathlon, avec leur ordre | Administrateur du site |
| `formats` | Les formats de chaque type (spécification du Palmarès, § 3), avec leur ordre, l'indication « distance fixe » (records) et leur durée de préparation par défaut | Administrateur du site |
| `types_equipement` | Chaussures, montre, bâtons, sac, frontale, vêtement… | Administrateur du site |
| `circuits` | UTMB (index et World Series), Challenge Levy…, avec lien et note (« classé à partir de 5 courses ») | Administrateur du site |

### Listes fermées (gravées dans la base)

Statut, rôle, état, thème, phase d'un plan (base, développement, affûtage, deload) et type de séance (run, renfo) : le fonctionnement en dépend (Courue envoie au Palmarès, À surveiller dans son module). La base refuse toute autre valeur ; leurs libellés affichés restent dans le code.

## 7. Ce qui est calculé, jamais rangé

| Donnée | Calcul |
| --- | --- |
| Type d'une course | Celui de son format |
| Vitesse (et vitesse montre) | 3 600 ÷ allure moyenne, calculée et rangée à l'enregistrement (évolution 011) ; à l'affichage, une course ancienne qui n'a qu'une des deux voit l'autre calculée |
| Record 🥇 | Meilleur temps par format à distance fixe, hors DNF |
| km-effort | Distance + D+/100 + D−/200 (D− = D+ si inconnu) |
| Cap par défaut | Course à venir de la page Objectif la plus lointaine |
| D'ici là | Blocs de la page Objectif à venir avant le cap : une course confirmée, une option isolée ou un groupe d'options comptent chacun pour un |
| Prochaine course | Première course confirmée à venir |
| Début d'un plan | Lundi de la semaine du jour J, moins (durée − 1) semaines |
| Phase d'une semaine | Règles du Calendrier (§ 5.1) : affûtage les 2 dernières semaines, deload toutes les 4 semaines, le reste réparti entre base et développement ; sauf semaine modifiée dans `plan_semaines` |
| Semaine sans objectif clair | Semaine hors du plan de toute course confirmée |

## 8. Accès et confidentialité

- Connexion par adresse e-mail et mot de passe (gérés par Supabase Auth, rien dans nos tables) ; un compte = un profil.
- Règle par ligne sur toutes les tables d'utilisateur : lecture et écriture seulement si la ligne appartient à l'utilisateur connecté.
- Exception, en lecture seulement : courses, circuits, phases modifiées, séances et préférences d'un propriétaire qui a partagé son site avec l'utilisateur connecté (`partages`).
- Fichiers GPX (stockage `traces`, privé) : mêmes règles que les courses, par dossier d'utilisateur ; lecture aussi pour ceux avec qui le site est partagé.
- Listes de référence : lecture pour tout utilisateur connecté, écriture pour l'administrateur seulement.
- Seule la clé publique de Supabase figure dans le code ; les scripts d'import des données des anciens sites ne sont jamais versionnés.

## 9. Contrôles

Jeu d'essai : deux utilisateurs, A et B. A a cinq courses : une courue, une confirmée préparatoire, deux options du groupe « Automne », une confirmée de rôle Objectif ; une paire de chaussures. B a une course.

Résultats attendus :

- A connecté ne voit que ses cinq courses et ses chaussures ; B ne voit que sa course, même en interrogeant directement la base.
- A ne peut ni modifier ni supprimer la course de B.
- Sans cap choisi, l'en-tête de A affiche sa course la plus lointaine ; « D'ici là » vaut 2 (la course préparatoire et le groupe « Automne »).
- A choisit une option comme cap : l'en-tête l'affiche ; la passer à Abandonnée ramène le cap par défaut.
- Passer la course préparatoire à Courue : elle quitte la page Objectif et apparaît dans le Palmarès, sans nouvelle saisie.
- Une option ne peut pas passer à Courue sans être d'abord confirmée.
- Une course marquée DNF affiche « DNF » dans le Palmarès et n'entre pas dans les records.
- Une valeur de statut, de rôle ou d'état inconnue est refusée ; une description de plus de 1 000 caractères aussi.
- Un format inconnu est refusé ; une course sans nom de course aussi ; un utilisateur ne peut pas modifier les listes de référence.
- A rattache une course au circuit UTMB, catégorie 20K, 1 stone : B ne voit pas ce rattachement ; supprimer la course le supprime.
- Une course sans date (À surveiller) est acceptée ; elle s'affiche « À définir ».
- A partage avec B : B lit les courses, circuits et préférences de A, et son prénom, nom et sexe, mais ni son poids ni sa VMA ; B ne peut rien modifier chez A ; A retire le partage, B ne lit plus rien.
- Calendrier : A a une course de format Trail long (16 semaines par défaut). Sa durée propre à 20 semaines remplace celle du format ; vidée, le format reprend. Un format sans durée : pas de plan.
- A modifie la phase d'une semaine : une ligne dans `plan_semaines` ; B ne la voit pas. Un jour qui n'est pas un lundi est refusé, une phase inconnue aussi. Supprimer la course supprime ces lignes.
- A saisit une séance « Run · 8×400 m » et une séance « Renfo · Gainage » sans course : B ne les voit pas ; un type inconnu est refusé, un libellé vide ou de plus de 100 caractères aussi.
- Supprimer la course liée à une séance garde la séance, sans course.
- Une durée de préparation de 0 ou de plus de 52 semaines est refusée.
- A partage avec B : B lit les phases modifiées et les séances de A, sans rien modifier.
