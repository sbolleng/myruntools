# Modèle de données

Version 0.2 · 20 octobre 2026 · [Retour au sommaire](README.md)

Ce document décrit les données que l'application range dans Supabase : les tables, leurs champs, leurs liens, et les règles qui protègent les données de chacun. Il couvre les modules déjà spécifiés (socle, Objectif, Palmarès) ; les autres modules (chaussures, nutrition, séances Strava…) ajouteront leurs tables quand ils seront spécifiés.

## 1. Principes

- **Une seule liste de courses par utilisateur.** Une course est prévue (page Objectif) puis courue (Palmarès) : c'est la même ligne qui change de statut, sans double saisie.
- **Chaque ligne appartient à un utilisateur.** Une règle par ligne garantit que chacun ne lit et n'écrit que ses propres données (§ 7).
- **On range ce qui est saisi, on calcule le reste à l'affichage** : records 🥇, allure ou vitesse manquante, km-effort, comptes à rebours, « D'ici là ».
- **Unités fixes** : distances en kilomètres, dénivelés en mètres, durées en secondes, dates sans fuseau (heure locale de la course).
- **Listes fermées** (types, statuts, thèmes) rangées une seule fois, communes à toute l'application.

## 2. Vue d'ensemble

| Table | Une ligne = | Liée à |
| --- | --- | --- |
| `profils` | Un utilisateur | Compte Supabase |
| `preferences` | Les réglages d'un utilisateur | `profils`, `courses` (course de l'en-tête) |
| `courses` | Une course, prévue ou courue | `profils`, `sous_categories` |
| `candidats` | Une course candidate d'un créneau « à choisir » | `courses` |
| `points_passage` | Un point de passage de la stratégie de course | `courses` |
| `reperes` | Un objectif chiffré de la jauge du suivi en course | `courses` |
| `types_course`, `sous_categories` | Une valeur de la liste de référence | — |

## 3. Profil et préférences

### `profils`

| Champ | Contenu | Obligatoire |
| --- | --- | --- |
| `id` | Identifiant du compte Supabase | Oui |
| `prenom` | Prénom affiché | Oui |
| `sexe` | Femme, homme, ou non précisé (sert au « 1re ») | Non |
| `naissance` | Date de naissance | Non |
| `poids`, `taille`, `pointure` | kg, cm, pointure | Non |

Poids et date de naissance sont des données de santé ou d'identité : elles ne sortent jamais de la base, ni dans le dépôt, ni dans un fichier.

### `preferences`

| Champ | Contenu | Défaut |
| --- | --- | --- |
| `utilisateur` | Profil concerné | — |
| `theme` | Bleu et orange, vert et rose, violet et turquoise | Selon la pratique |
| `modules` | Modules du menu, dans l'ordre choisi | Tous les modules construits |
| `course_entete` | Course affichée dans l'en-tête ; son champ `objectif` alimente l'indicateur « Objectif » | La prochaine course marquée « objectif » |
| `palmares_colonnes` | Colonnes affichées dans le Palmarès | Colonnes par défaut |
| `palmares_groupe` | Regroupement par type activé ou non | Non |

## 4. Courses

### `courses`

| Groupe | Champs | Sert à |
| --- | --- | --- |
| Appartenance | `utilisateur` | Règles par ligne |
| Identité | `nom` (nom officiel), `evenement`, `lieu`, `latitude`, `longitude`, `lien`, `lien_resultats` | Affichage, météo, suivi en course |
| Classement | `sous_categorie` (le type s'en déduit), `label_utmb`, `index_utmb` | Palmarès, records, badges |
| Date | `date`, `heure` (heure locale), `date_approx` (vrai si seul le mois est connu) | Comptes à rebours, ordre, en-tête |
| Profil officiel | `distance`, `dplus`, `dmoins` | En-tête, Palmarès, km-effort |
| Statut | `statut` (§ 4.1) | Rendu de la page Objectif, passage au Palmarès |
| Dossard | `inscrit`, `dossard`, `prix`, `ouverture_inscriptions` | Cellule Dossard |
| Préparation | `objectif` (temps visé ou intention : « Finisher »), `role`, `strategie`, `logistique` | Cellules de l'étape, indicateur Objectif de l'en-tête |
| Résultat officiel | `temps`, `allure`, `vitesse`, `place`, `effectif`, `place_categorie`, `effectif_categorie`, `place_sexe`, `effectif_sexe` | Palmarès |
| Données montre | `montre_distance`, `montre_dplus`, `montre_temps`, `montre_allure`, `montre_vitesse`, `fc_moyenne` | Palmarès |

Durées (`temps`, `allure`, `montre_temps`, `montre_allure`, `objectif` quand c'est un temps) en secondes ; vitesses en km/h.

### 4.1 Statuts

| Statut | Page | Rôle |
| --- | --- | --- |
| Confirmée | Objectif | Course retenue |
| Objectif intermédiaire | Objectif | Course clé de la saison |
| À choisir | Objectif | Créneau ; ses candidats sont dans `candidats` |
| Horizon | Objectif | Échéance lointaine |
| Objectif | Objectif | Course finale |
| Courue | Palmarès | Course faite, avec son résultat |
| Courue, non terminée | Palmarès | Course abandonnée en route : « DNF » dans la colonne Temps |
| Abandonnée | Aucune | Course retirée du plan, gardée pour mémoire |
| À surveiller | Courses à surveiller | Envie de course, pas encore dans le plan (module à venir) ; passe à « Confirmée » le jour où elle y entre |

Cocher une course comme faite la fait passer au statut « Courue » : elle quitte la page Objectif et rejoint le Palmarès (spécification du Palmarès, § 10).

### `candidats`, `points_passage`, `reperes`

| Table | Champs |
| --- | --- |
| `candidats` | `course` (le créneau), `nom`, `distance`, `dplus`, `dmoins`, `date`, `lien`, `note` |
| `points_passage` | `course`, `ordre`, `distance` (km depuis le départ), `temps_vise` (secondes) |
| `reperes` | `course`, `libelle` (« Cible », « Record »…), `temps` (secondes) |

Les temps saisis pendant le suivi en course restent sur l'appareil (spécification Objectif, § 5.3) : ils ne sont pas rangés dans la base.

## 5. Listes de référence

| Table | Contenu | Qui modifie |
| --- | --- | --- |
| `types_course` | Course sur route, Trail, Marche, Fast hiking, Triathlon, avec leur ordre | Administrateur du site |
| `sous_categories` | Les sous-catégories de chaque type (spécification du Palmarès, § 3), avec leur ordre et l'indication « distance fixe » (records) | Administrateur du site |

Thèmes, statuts et modules sont des listes courtes, gardées dans le code.

## 6. Ce qui est calculé, jamais rangé

| Donnée | Calcul |
| --- | --- |
| Type d'une course | Celui de sa sous-catégorie |
| Allure ou vitesse manquante | 3 600 ÷ l'autre |
| Record 🥇 | Meilleur temps par sous-catégorie à distance fixe |
| km-effort | Distance + D+/100 + D−/200 (D− = D+ si inconnu) |
| D'ici là | Courses prévues entre aujourd'hui et la course de l'en-tête |
| Prochaine course | Première course prévue à venir |

## 7. Accès et confidentialité

- Connexion par lien magique ; un compte = un profil.
- Règle par ligne sur toutes les tables d'utilisateur : lecture et écriture seulement si la ligne appartient à l'utilisateur connecté (directement, ou par la course à laquelle elle est rattachée).
- Listes de référence : lecture pour tout utilisateur connecté, écriture pour l'administrateur seulement.
- Seule la clé publique de Supabase figure dans le code ; les scripts d'import des données des anciens sites ne sont jamais versionnés.

## 8. Contrôles

Jeu d'essai : deux utilisateurs, A et B ; A a trois courses (une courue, une confirmée, une objectif), B en a une.

Résultats attendus :

- A connecté ne voit que ses trois courses ; B ne voit que la sienne, même en interrogeant directement la base.
- A ne peut ni modifier ni supprimer la course de B.
- Passer la course confirmée de A à « Courue » : elle disparaît de la page Objectif et apparaît dans le Palmarès, sans nouvelle saisie.
- La course de l'en-tête de A est sa course « objectif » ; « D'ici là » vaut 1 (la course confirmée).
- Supprimer une course supprime ses candidats, points de passage et repères.
- Une sous-catégorie inconnue est refusée à l'enregistrement.
- Un utilisateur ne peut pas modifier la liste des sous-catégories.
