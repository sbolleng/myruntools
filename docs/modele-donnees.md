# Modèle de données

Version 0.3 · 20 octobre 2026 · [Retour au sommaire](README.md)

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
| `courses` | Une course, à surveiller, prévue ou courue | `profils`, `sous_categories`, `equipements` (chaussures) |
| `equipements` | Un équipement : chaussures, montre, bâtons… | `profils`, `types_equipement` |
| `types_course`, `sous_categories`, `types_equipement` | Une valeur d'une liste de référence | — |

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
| `theme` | Bleu et orange, vert et rose, violet et turquoise | Selon la pratique |
| `modules` | Modules du menu, dans l'ordre choisi | Tous les modules construits |
| `course_cap` | La course du cap, affichée dans l'en-tête ; son champ `objectif` alimente l'indicateur « Objectif » | La dernière course de la page Objectif (la plus lointaine à venir) |
| `palmares_colonnes` | Colonnes affichées dans le Palmarès | Colonnes par défaut |
| `palmares_groupe` | Regroupement par type activé ou non | Oui |

Si la course du cap devient courue ou abandonnée, l'en-tête revient au cap par défaut.

## 4. Courses

### `courses`

| Groupe | Champs | Sert à |
| --- | --- | --- |
| Appartenance | `utilisateur` | Règles par ligne |
| Identité | `nom` (nom officiel), `evenement`, `lieu`, `latitude`, `longitude` | Affichage, météo |
| Liens | `lien` (site officiel), `inscription` (site d'inscription), `lien_resultats` (résultats en direct) | Liens de l'étape, suivi en course |
| Description | `description` : texte libre, 1 000 caractères au plus | Quelques infos sur la course |
| Classement | `sous_categorie` (le type s'en déduit), `label_utmb`, `index_utmb` | Palmarès, records, badges |
| Date | `date`, `heure` (heure locale), `date_approx` (vrai si seul le mois est connu) | Comptes à rebours, ordre, en-tête |
| Profil officiel | `distance`, `dplus`, `dmoins` | En-tête, Palmarès, km-effort |
| Place dans le plan | `statut`, `role`, `etat` (§ 4.1), `groupe_options` | Module d'affichage, en-tête |
| Dossard | `inscrit`, `dossard`, `prix`, `ouverture_inscriptions` | Cellule Dossard |
| Préparation | `objectif` (temps visé ou intention : « Finisher »), `pourquoi` (rôle dans la préparation), `strategie`, `logistique` | Cellules de l'étape, indicateur Objectif de l'en-tête |
| Suivi en course | `passages` : liste de points (distance depuis le départ, temps visé) ; `chronos_reference` : liste de chronos (libellé, temps) | Suivi en course (§ 4.2) |
| Résultat officiel | `temps`, `dnf`, `allure`, `vitesse`, `place`, `effectif`, `place_categorie`, `effectif_categorie`, `place_sexe`, `effectif_sexe` | Palmarès |
| Données montre | `montre_distance`, `montre_dplus`, `montre_temps`, `montre_allure`, `montre_vitesse`, `fc_moyenne` | Palmarès |
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
- Une course lointaine dont seul le mois est connu reste Confirmée, avec `date_approx`.

### 4.2 Suivi en course

- **`passages`** : le plan de course point par point (km 5 en 26:00, km 10 en 52:00…). Le jour J, le coureur saisit son temps réel à chaque point ; la page calcule l'avance ou le retard et projette l'arrivée.
- **`chronos_reference`** : les chronos dessinés sur la jauge de progression (« Cible 1h50 », « Record 1h53 ») ; la page situe la projection d'arrivée par rapport à eux.
- Ces listes vivent dans la course : elles sont supprimées avec elle.
- Les temps saisis pendant la course restent sur l'appareil (spécification Objectif, § 5.3) : ils ne sont pas rangés dans la base.

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
| `sous_categories` | Les sous-catégories de chaque type (spécification du Palmarès, § 3), avec leur ordre et l'indication « distance fixe » (records) | Administrateur du site |
| `types_equipement` | Chaussures, montre, bâtons, sac, frontale, vêtement… | Administrateur du site |

### Listes fermées (gravées dans la base)

Statut, rôle, état et thème : le fonctionnement en dépend (Courue envoie au Palmarès, À surveiller dans son module). La base refuse toute autre valeur ; leurs libellés affichés restent dans le code.

## 7. Ce qui est calculé, jamais rangé

| Donnée | Calcul |
| --- | --- |
| Type d'une course | Celui de sa sous-catégorie |
| Allure ou vitesse manquante | 3 600 ÷ l'autre |
| Record 🥇 | Meilleur temps par sous-catégorie à distance fixe, hors DNF |
| km-effort | Distance + D+/100 + D−/200 (D− = D+ si inconnu) |
| Cap par défaut | Course à venir de la page Objectif la plus lointaine |
| D'ici là | Blocs de la page Objectif à venir avant le cap : une course confirmée, une option isolée ou un groupe d'options comptent chacun pour un |
| Prochaine course | Première course confirmée à venir |

## 8. Accès et confidentialité

- Connexion par lien magique ; un compte = un profil.
- Règle par ligne sur toutes les tables d'utilisateur : lecture et écriture seulement si la ligne appartient à l'utilisateur connecté.
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
- Une sous-catégorie inconnue est refusée ; un utilisateur ne peut pas modifier les listes de référence.
