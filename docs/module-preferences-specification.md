# Préférences utilisateur · spécification fonctionnelle

Version 0.1 · 21 octobre 2026 · [Retour au sommaire](README.md)

## 1. Objet

La page Préférences rassemble les réglages du site de l'utilisateur connecté : thème, modules du menu, cap de l'en-tête, partage, compte. Elle s'ouvre par l'engrenage ⚙️ de l'en-tête et ne figure pas dans le menu.

- **Ce qu'elle ne contient pas** : les données du coureur (Profil) et son équipement (Matériel), pour qu'une donnée ne se saisisse qu'à un seul endroit.
- **Hors périmètre** : la présentation visuelle (document de design) ; le changement de mot de passe (connexion par lien magique seulement, voir la todo).

## 2. Organisation

Un bloc par réglage, dans cet ordre : **Thème**, **Menu**, **Cap**, **Partage**, **Compte**.

- **Enregistrement immédiat** : chaque changement est enregistré dès qu'il est fait, sans bouton « Enregistrer ». Un court message « Enregistré » apparaît sous le bloc ; en cas d'échec, « Enregistrement impossible pour l'instant », et le réglage revient à sa valeur précédente.
- **Effet immédiat** : l'en-tête et le menu de la page se mettent à jour sans recharger.
- Réglages mémorisés dans la base : ils suivent l'utilisateur d'un appareil à l'autre.

## 3. Thème

- Trois choix, un seul actif : **Bleu et orange**, **Vert et rose**, **Violet et turquoise** (mention « essais »).
- Chaque choix montre un petit aperçu de ses couleurs (fond et accent).
- Choisir un thème recolore aussitôt la page.
- Une page ouverte avec `?t=…` garde ce thème-là pour la visite ; le réglage enregistré ne change pas.

## 4. Menu

- La liste reprend tous les modules du menu (catalogue, spécification générale § 7), dans l'ordre actuel du menu de l'utilisateur, puis ceux qu'il n'affiche pas.
- Chaque module a une case « affiché » et deux flèches pour le monter ou le descendre d'un rang.
- Les modules pas encore construits sont grisés, comme dans le menu : on peut quand même les cocher et les ranger, ils apparaîtront grisés dans le menu.
- **Au moins un module** reste affiché : la dernière case cochée ne peut pas être décochée.
- Par défaut (rien d'enregistré) : tous les modules, dans l'ordre du catalogue.
- **Rétablir l'ordre par défaut** : un lien remet tous les modules, dans l'ordre du catalogue.

## 5. Cap

- Le cap est la course affichée dans le titre de l'en-tête (« Cap sur … »).
- Une liste déroulante propose :
  - en tête, **« Par défaut : la plus lointaine »**, suivie du nom de cette course entre parenthèses ;
  - puis les courses à venir de la page Objectif (statut Option ou Confirmée, date à partir d'aujourd'hui), de la plus proche à la plus lointaine, sous la forme « Nom · date ».
- Choisir une course l'enregistre comme cap ; choisir « Par défaut » efface le choix.
- Si la course choisie devient courue ou abandonnée, ou si sa date est passée, l'en-tête revient au cap par défaut, et la liste affiche « Par défaut ».
- Aucune course à venir : la liste est remplacée par « Aucune course à venir. »
- Le choix pourra aussi se faire depuis la page Objectif, quand elle existera : c'est le même réglage.

## 6. Partage et Compte

- **Partage** : décrit dans la spécification générale (§ 9).
- **Compte** : prénom et nom, adresse de connexion, lien « Se déconnecter ».

## 7. Site partagé en lecture seule

Quand l'utilisateur regarde le site d'un autre (bandeau « Lecture seule ») :

- les blocs Thème, Menu et Cap ne sont pas modifiables ; à leur place : « Reviens à ton site pour modifier tes réglages. » ;
- les blocs Partage et Compte restent les siens et fonctionnent normalement.

## 8. Contrôles

Jeu d'essai, à la date du 20 octobre 2026 : thème Bleu et orange, aucun choix de menu ni de cap enregistré, et ces courses :

| Course | Date | Statut | État |
| --- | --- | --- | --- |
| Trail du Lac | 15 nov. 2026 | Confirmée | À venir |
| Course A | 10 janv. 2027 | Option | À venir |
| Trail des Crêtes | 1er août 2029 | Confirmée | À venir |
| Course B | 10 mars 2027 | À surveiller | À venir |
| Course C | 4 oct. 2026 | Confirmée | Courue |

Résultats attendus :

- L'engrenage de l'en-tête ouvre la page ; elle ne figure pas dans le menu.
- Sans connexion, la page renvoie vers la connexion sans rien afficher.
- Thème : Bleu et orange est coché. Choisir Vert et rose : la page change de couleurs aussitôt, « Enregistré » apparaît ; recharger : Vert et rose est toujours coché, et l'accueil s'ouvre en vert et rose.
- Page ouverte avec `?t=violet-turquoise` : la page est en violet et turquoise, le réglage enregistré reste coché.
- Menu : tous les modules sont cochés, dans l'ordre du catalogue ; les modules non construits sont grisés.
- Monter Palmarès d'un rang : le menu de la page change aussitôt ; recharger : l'ordre est conservé.
- Décocher Guide : il disparaît du menu ; « Rétablir l'ordre par défaut » le fait revenir à sa place.
- Décocher tous les modules sauf un : la dernière case ne peut pas être décochée.
- Cap : la liste propose « Par défaut : la plus lointaine (Trail des Crêtes) », puis Trail du Lac, Course A, Trail des Crêtes, dans cet ordre ; ni Course B (à surveiller) ni Course C (courue).
- Choisir Trail du Lac : l'en-tête affiche « Cap sur Trail du Lac » ; recharger : Trail du Lac est toujours choisi.
- Marquer Trail du Lac comme abandonnée : l'en-tête revient à Trail des Crêtes, la liste affiche « Par défaut ».
- Choisir « Par défaut » : l'en-tête affiche Trail des Crêtes.
- Échec d'enregistrement (base injoignable) : « Enregistrement impossible pour l'instant », le réglage revient à sa valeur précédente.
- Site partagé en lecture seule : Thème, Menu et Cap affichent « Reviens à ton site pour modifier tes réglages. » ; Partage et Compte restent utilisables.
- Téléphone : la page tient dans la largeur de l'écran, sans défilement horizontal.
