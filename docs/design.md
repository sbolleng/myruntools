# Design

Version 0.53 · 12 novembre 2026 · [Retour au sommaire](README.md)

Ce document décrit l'apparence commune à toute l'application : couleurs, typographies, tailles et disposition de l'en-tête et du menu. Le contenu et les règles sont dans la [spécification générale](specification-generale.md).

## 1. Principes

- Une seule mise en page pour tous ; seules les couleurs changent d'un thème à l'autre.
- Fond sombre, ou blanc pour la lecture claire (thème Blanc et orange) ; chiffres en police à chasse fixe, libellés en petites capitales.
- Toute couleur passe par un rôle (§ 2) : aucune couleur écrite en dur dans un module.
- Les effets de survol ne s'appliquent qu'aux appareils avec une souris : sur écran tactile, un toucher les laisserait « collés » (un bouton resterait en couleur d'accent).

**Règles communes**, les mêmes sur toutes les pages, pour un site sobre et homogène :

| Règle | En pratique |
| --- | --- |
| Peu de couleur | Un seul accent. L'Accent marque le titre de l'écran (le cap dans l'en-tête, le nom de la course sur sa page), les Objectifs, les repères de données (compte à rebours des courses, objectif, point du dossard, objectif intermédiaire, temps et place au général d'une course courue) et ce qui est actif (onglet ou engrenage de la page ouverte, tri, filtre actif, pastille choisie, bouton principal, champ en cours de saisie). |
| Le reste en blanc et gris | Valeurs et noms en Texte ; libellés et informations secondaires en Texte discret ; liens dans le texte soulignés, en Texte. |
| Capitales pour les libellés seulement | Libellés de données (à gauche ou au-dessus d'une valeur, d'un champ, en-tête de colonne), toujours en Space Mono 0,7 rem, en-tête compris ; seuls le nom du jour (Semaine) et les numéros de l'Année du Calendrier sont plus fins (§ 10). Onglets, boutons, titres de section en casse normale. |
| Tout dans un cadre | Chaque bloc de la page a son cadre (fond Surface, bordure fine, coins de 8 px) : tableau du Palmarès, carte d'une étape, fiche d'une course, liste des textes d'une course, Préférences (un cadre pour toute la page), panneaux. Dans un cadre, les sections sont séparées par un filet (Bordure). Jamais de cadre dans un cadre. |
| Trois sortes de boutons | Principal : Accent plein, un par écran au plus (Enregistrer, Partager, Recevoir le lien, Ajouter une course) ; au survol, l'Accent s'éclaircit (mêlé de Texte). À contour : bordure fine, texte en Texte (Annuler, Retenir cette course, Paramétrer le plan, Aujourd'hui) ; en Alerte, avec une poubelle, pour Supprimer (la course, la séance), plein Alerte au survol. Rond : une icône dessinée, jamais un caractère tapé (filtres, crayon, regroupement, flèches, fermer, « + ») ; petit rond (1,5 rem) pour le « + » d'une séance ; « × » pour fermer une feuille, la même croix partout ; un panneau qui se replie (filtres, colonnes) a un rond « Réduire », chevron vers le haut. Et le lien d'action : souligné, Texte discret (Se déconnecter, Rétablir l'ordre, Réinitialiser les filtres, Revenir aux règles générales). Tous en casse normale, Accent au survol. |
| Pastilles | Un choix parmi d'autres (filtres, tri et colonnes du Palmarès, vue du Calendrier) : arrondies, contour Bordure, texte en Texte, 0,8 rem ; choisie : fond Accent, texte Fond. |
| Un seul champ | Fiche, fenêtres, filtres, Préférences (changement du mot de passe compris), connexion et nouveau mot de passe : fond Champ (§ 2), bordure fine (Bordure), coins de 6 px, 0,85 rem, exemple en Texte discret dans le champ vide, bordure en Accent pendant la saisie, en Alerte sur une erreur ; listes avec un chevron dessiné. Seul le tableau des phases de « Paramétrer le plan » le prend en plus petit. |
| Fenêtres comme la fiche | Une fenêtre de saisie (séance, Paramétrer le plan) se présente comme la fiche d'une course (§ 6) : le voile de la feuille, « Annuler » à gauche et le bouton principal à droite en haut, le titre en libellé, une action à part (Supprimer, Recalculer) seule en bas. Une feuille de consultation ou de réglages (profil de coureur, et toute nouvelle) reprend la feuille d'une course elle-même (`mc-voile`, `mc-panneau`) : largeur de la page, plein écran sur téléphone, croix ronde (`mrt-rond is-fermer`) en haut à droite, retour en rond « ‹ » à gauche s'il y en a un, titre en libellé de la feuille (`fc-libelle`), sections communes (`mrt-section`), tailles de l'échelle. Une feuille à plusieurs écrans (`mc-ecrans`) garde sur ordinateur **la même taille d'un écran à l'autre** (40 rem de haut au plus, défilement interne) et son contenu glisse, 0,2 s : un écran qui s'ouvre entre par la droite, le retour ramène l'écran précédent par la gauche ; pas de glissement sur téléphone ni si l'appareil demande moins de mouvement. Une **feuille de saisie rapide** (Nutrition : ajouter un aliment, une activité, une séance) est une feuille à écrans étroite (`mc-ecrans mc-etroit`) : 30 rem de large et 40 rem de haut sur ordinateur, plein écran sur téléphone ; croix à droite, « ‹ » à gauche sur un deuxième écran ; tout se passe dans la même feuille (une séance y devient un écran, jamais une fenêtre par-dessus) ; le bouton qui valide est **collé en bas de la feuille** (`mc-pied`), sur toute la largeur, à portée du pouce. Une **petite feuille** (`mc-etroit mc-court`) sert à une seule question ou à une courte suite de questions (une question de Mon profil, le profil express) : 30 rem de large, **hauteur selon le contenu** sur ordinateur (pas de vide sous le bouton) ; sur téléphone, elle monte du bas à la hauteur de son contenu. Règle pour toute nouvelle fenêtre : petite feuille si elle tient en un écran court, feuille de saisie rapide (40 rem de haut) si elle a plusieurs écrans de hauteurs différentes, feuille d'une course (largeur de la page) pour une consultation ou des réglages longs. **Jamais de bouton texte « Fermer » ni de largeur, de police ou de taille propre à un module** : à vérifier avant chaque mise en ligne. |
| Un seul titre de cadre ou repliable | 0,85 rem, 600, Texte, casse normale, chevron commun (`mrt-chev`) en Texte discret à gauche : textes d'une course, blocs du formulaire, groupes du Palmarès (le nombre de courses en Texte discret), « Toutes les semaines », graphiques (Évolution de l'effort, Progression), blocs d'En un coup d'œil. Seuls les sous-titres dans un cadre restent en libellé (À propos de la course, Résultat, Montre). |
| Confirmations | Une question se pose dans l'encadré du site (`mrtConfirmer`), jamais dans la fenêtre du navigateur : la question, « Annuler » à gauche (choisi d'office ; « Continuer » ou « Garder » quand « Annuler » prêterait à confusion, par exemple pour abandonner une saisie), l'action à droite (en Alerte pour Supprimer, Abandonner, Recalculer) ; Échap ou un toucher à côté : « Annuler ». Un avertissement : un seul bouton, « Fermer ». |
| Zones de toucher | 2 rem au moins (32 px) pour tout ce qui se touche seul : liens d'action, crayon, pastilles, réglages discrets, petit rond, par une marge invisible ; le dessin ne change pas. |
| Formats | Une seule écriture, partout (`mrtFormat`, `en-tete.js`) : « 15 nov. 2026 », « dim. 7 mars 2027 », le 1er du mois toujours « 1er » ; heure « 7 h 30 », « 12 h » ; semaine « du 26 oct. au 1er nov. » ; temps « 01:56:05 » ; allure « 5:30 /km » ; dénivelé « 200 m D+ · 200 m D− » ; compte à rebours « 18 h 59 min 58 s ». Espace insécable posée à l'affichage devant « ? ! : ; » et dans les guillemets. |
| Déroulé | Ouvrir ou fermer une zone (panneaux Filtres et Colonnes du Palmarès, section Montre, textes repliables d'une course) : elle se déplie en hauteur avec un fondu, 0,25 s à l'ouverture, 0,2 s à la fermeture, ease-out, de la même famille que le passage de l'en-tête ; le contenu dessous glisse au lieu de sauter ; le chevron tourne en même temps ; aucun mouvement si l'appareil demande moins d'animations. Code commun : `mrtDeroule` et `details.mrt-deroule` (`en-tete.js`). |

Les boutons, liens d'action, pastilles, champs et sections sont des éléments communs de la feuille de style partagée (`mrt-btn`, avec `is-principal` et `is-danger` ; `mrt-rond`, avec `is-fermer` ; `mrt-lien`, `mrt-pastille`, `mrt-champ`, `mrt-section`) : un module les reprend, il ne les redessine pas.

## 2. Thèmes

| Rôle | Bleu et orange | Vert et rose | Violet et turquoise | Blanc et orange | Noir et orange |
| --- | --- | --- | --- | --- | --- |
| Fond | `#060b14` | `#0E1D19` | `#14101F` | `#ffffff` | `#000000` |
| Surface | `#122a4a` | `#18332E` | `#221A35` | `#f3f5f8` | `#121212` |
| Surface 2 | `#163a66` | `#21453D` | `#2D2347` | `#e7ecf2` | `#1c1c1c` |
| Bordure | `#1f4c80` | `#2F5A4E` | `#40335F` | `#d2dae4` | `#333333` |
| Accent | `#ffb700` | `#D07B87` | `#2EC4B6` | `#c2410c` | `#ffb700` |
| Texte | `#eef3fa` | `#EDF2E9` | `#F1EEF7` | `#132030` | `#f2f2f2` |
| Texte discret | `#8fa8c9` | `#A2B4A4` | `#A49BB8` | `#5a6a7e` | `#9b9b9b` |
| Alerte | `#ef6b6b` | `#f2766b` | `#E0607E` | `#c62828` | `#f0605d` |
| Champ (fond des champs) | Fond à 60 %, Surface à 40 % | idem | idem | idem | idem |
| Contour des champs | Texte discret à 50 % sur Bordure | idem | idem | Texte discret à 75 % | idem |
| Case (jours du Calendrier et de la préparation) | Bordure à 55 % sur Surface | idem | idem | Bordure à 45 % | idem |

Identifiants : `bleu-orange`, `vert-rose`, `violet-turquoise`, `blanc-orange`, `noir-orange`, et `auto` (« Automatique ») : Blanc et orange quand l'appareil est en mode clair, Noir et orange en mode sombre, et il suit ce réglage s'il change pendant la visite. Dans les maquettes seulement, `?t=bleu-orange`, `?t=vert-rose` ou `?t=violet-turquoise` choisit le thème.

**Lecture claire et sombre** : Blanc et orange et Noir et orange sont faits pour lire, sur fond blanc ou noir. Sur fond blanc, l'orange du site (`#ffb700`) serait illisible (contraste 1,8) : l'Accent y est un orange foncé, `#c2410c` (5,2 sur blanc, texte blanc sur le bouton principal compris). Les contrôles du navigateur (dates, listes, barres de défilement) prennent la version claire ou sombre du thème. Le thème choisi est retenu sur l'appareil et posé dès le chargement de chaque page : jamais d'éclair d'un autre fond.

Contrastes vérifiés au calcul dans chaque thème (banc d'essai) : Alerte et Texte discret à 4,5 au moins sur la Surface et sur une Case ; Alerte de Vert et rose tirée vers le corail pour rester distincte du rose de l'Accent.

Le Champ n'a pas de valeur propre : il mêle le Fond et la Surface du thème, pour qu'un champ soit plus sombre que le cadre qui l'entoure et plus clair que la page, dans tous les thèmes.

Pas de second accent : l'Accent 2, presque identique à l'Accent, a été retiré le 30 octobre 2026. Une nuance, quand il en faut une, mêle l'Accent à une autre couleur du thème (bouton principal au survol, filet de l'en-tête).

## 3. Typographies

| Usage | Police |
| --- | --- |
| Textes, titres, onglets, boutons, valeurs | Space Grotesk |
| Libellés, comptes à rebours, indicateurs de l'en-tête | Space Mono |

Taille de base du texte : 19 px sur ordinateur, 17 px sur téléphone.

**Échelle** : sept tailles, en variables de la feuille commune, aucune autre dans les pages (contrôle « uniformite » du banc d'essai) : `--t-micro` 0,65 rem (axes, numéros de l'Année, noms des jours de la Semaine, frise), `--t-libelle` 0,7 rem, `--t-petit` 0,75 rem, `--t-second` 0,8 rem, `--t-texte` 0,85 rem, `--t-nom` 1 rem, `--t-titre` 1,4 à 2 rem. Hors échelle : l'en-tête (§ 4), les grands chiffres d'un résultat (1,5 rem) et le nom de l'application sur la page de connexion (2 rem). Marges intérieures : `--pad-cadre` 1 × 1,1 rem (0,8 rem sur téléphone) pour un cadre de page, `--pad-carte` 0,85 × 1 rem pour une carte ou un encadré.

**Tailles dans les pages** (sous l'en-tête et le menu) : fixées une fois pour toutes, à reprendre telles quelles dans chaque nouvelle page ou module.

| Élément | Taille | Style |
| --- | --- | --- |
| Titre de la page (nom de la course sur sa page) | 1,4 à 2 rem | Space Grotesk 700, Accent |
| Titre d'une section (Préférences) | 1 rem | Space Grotesk 600, Texte |
| Titre repliable (textes, blocs du formulaire, groupes) | 0,85 rem | Space Grotesk 600, Texte, chevron à gauche |
| Texte courant, tableaux, champs, listes | 0,85 rem | Space Grotesk, normal ; jamais en gras, sauf un nom mis en avant (600) |
| Texte secondaire (aide, explication) | 0,8 rem | Texte discret |
| Boutons | 0,8 rem | Space Grotesk 600, casse normale |
| Messages (« Enregistré », erreurs) | 0,75 rem | Texte discret, ou Alerte |
| Libellé (donnée, champ, colonne, sous-titre dans un bloc, en-tête compris) | 0,7 rem | Space Mono, capitales, espacement 0,1 em, Texte discret ; le mode d'une fiche et le titre d'une fenêtre à 0,75 rem |

**Titre de page** : chaque page a un seul `<h1>`, du nom de son onglet, invisible à l'œil mais lu par les lecteurs d'écran (classe commune `mrt-sr`, taille de l'échelle) ; En un coup d'œil a le sien dans le grand en-tête, Préparation le nom de l'Objectif visé en `<h2>` visible. Aucun titre visible en plus : l'onglet actif suffit.

Le contenu des pages (`main`) est à 0,85 rem par défaut, dans la feuille de style commune : un texte sans taille précisée n'est jamais à la taille de base.

## 4. En-tête

Sur la page de démarrage seulement (spécification générale, § 5 bis) ; les autres pages commencent par la barre fine et le menu.

### Tailles

| Élément | Police | Taille | Graisse | Couleur |
| --- | --- | --- | --- | --- |
| Nom de l'application | Space Mono, capitales, espacement 0,15 em | 0,7 rem | Normale | Texte discret |
| Titre, ligne « Cap sur » | Space Grotesk, interligne 1, espacement −0,02 em | 1,9 à 3,1 rem selon la largeur d'écran | 700 | Texte |
| Titre, nom de la course | Idem | Idem | 700 | Accent |
| Valeur d'indicateur (15 rem de large au plus, va à la ligne au-delà) | Space Mono | 1,1 rem ; 0,95 rem sur téléphone | 700 | Texte |
| Dénivelé dans Distance (« / 3 500 m D+ ») | Space Mono | 0,8 rem | Normale | Texte discret |
| Libellé d'indicateur | Space Mono, capitales, espacement 0,1 em | 0,7 rem | Normale | Texte discret |
| Nombre de jours | Space Mono, interligne 1 | 3,1 rem ; 1,6 rem sur téléphone | 700 | Accent |
| « jours » | Space Mono, capitales, espacement 0,1 em | 0,7 rem | Normale | Texte discret |
| Heures, minutes, secondes (« 18 h 59 min 58 s ») | Space Mono, chiffres à largeur fixe | 0,7 rem | Normale | Texte discret |
| Prochaine course (absente quand la page de démarrage la montre déjà : En un coup d'œil avec son bloc Prochaine course, Objectif) | Space Grotesk | 0,75 rem | Normale | Texte discret |

### Disposition

- **Marges** : 1,5 rem en haut, 2 rem sur les côtés, 1,25 rem en bas ; indicateurs à 1,2 rem sous le titre, filet à 1,6 rem ; 1,25 rem en haut et sur les côtés, 1,1 rem en bas sur téléphone. Contenu centré, 960 px de large au plus.
- **Nom de l'application et engrenage** : en haut à droite, leur haut aligné sur le haut de « Cap sur », à toutes les largeurs d'écran. L'engrenage est dessiné en trait fin (1,05 rem), comme les autres icônes : Texte discret, Texte au survol, Accent sur la page des Préférences ; sa zone de toucher déborde sans changer la mise en page.
- **Ordinateur** : deux colonnes, 2 rem entre elles. À gauche le titre, puis les indicateurs, espacés de 2 rem, 1,5 rem sous le titre, qui passent à la ligne faute de place ; à droite, en haut le nom de l'application, en bas le compte à rebours et la prochaine course, alignés à droite, leur bas au niveau du bas des indicateurs.
- **Téléphone** (600 px et moins) : une seule colonne, serrée, pour que la page commence dans le premier écran (environ 300 px d'en-tête). Le titre à 1,65 rem, sur toute la largeur, le nom de l'application et l'engrenage en haut à droite face à « Cap sur » ; juste sous le nom de la course, le compte à rebours sur une ligne (nombre de jours à 1,6 rem, « jours », les heures), dont il fait partie ; les indicateurs sur deux colonnes, 1 rem plus bas ; enfin la prochaine course, à part, sous un filet (Bordure), 0,75 rem, alignée à gauche.
- **« Cap sur »** ne se coupe jamais : il tient sur une ligne, le nom de la course dessous.
- **Filet** : barre de 5 px, 1,6 rem sous le contenu (1,1 rem sur téléphone), d'un bord à l'autre de l'écran ; dégradé en bandes qui alterne Accent, Accent atténué (mêlé de Surface 2) et Surface 2, comme un profil de course.
- Le filet ferme l'en-tête : il touche le menu, sans vide ni ligne fine entre les deux.

## 5. Page de connexion

Sobre, sans en-tête ni menu, centrée dans la page, 22 rem de large au plus.

| Élément | Police | Taille | Couleur |
| --- | --- | --- | --- |
| « MyRunTools » | Space Grotesk, graisse 700, espacement −0,02 em | 2 rem | Texte |
| Accroche | Space Grotesk | 0,85 rem | Texte discret |
| Libellés « Adresse e-mail », « Mot de passe » | Space Mono, capitales, espacement 0,1 em | 0,7 rem | Texte discret |
| Champs e-mail et mot de passe (œil en Texte discret à droite du mot de passe, Accent quand le mot de passe est visible) | Le champ commun (§ 1) : Space Grotesk | 0,85 rem | Texte ; fond Champ, bordure fine (Bordure), Accent au focus |
| Bouton « Se connecter » | Bouton principal (§ 1) : Space Grotesk 600, casse normale | 0,8 rem | Accent plein, coins arrondis, toute la largeur |
| Lien « Mot de passe oublié ? » | Space Grotesk, lien (§ 1) | 0,78 rem | Texte discret, sous le champ mot de passe, aligné à gauche |
| Ligne d'aide et messages | Space Grotesk | 0,75 rem | Texte discret ; Alerte pour une erreur |

## 6. Formulaires et bandeau

Ils reprennent le style du site : rien de nouveau, des éléments déjà présents.

- **Feuille d'une course** (consultation et fiche de saisie) : surface (Surface), bordure fine (Bordure), coins arrondis de 8 px, comme les cartes, à la largeur des pages sur ordinateur ; sur téléphone, elle occupe tout l'écran, monte du bas et défile, sans jamais déborder sur les côtés.
- **Champs sur écran tactile** : texte à 16 px au moins (tous les formulaires du site), sinon Safari sur iPhone zoome sur le champ touché et la page déborde. Sur iPhone et iPad, le site ajoute en plus `maximum-scale=1` à la balise viewport : plus de zoom automatique, le zoom à deux doigts reste possible.
- **Barre du haut de la fiche** : « Annuler » (à contour) à gauche, « Enregistrer » (principal) à droite, toujours visibles quand la fiche défile ; dessous, le mode (« Modifier la course », « Ajouter une course », « Marquer comme courue ») en libellé : Space Mono, capitales, 0,75 rem, Texte discret. En consultation : crayon et « × », boutons ronds, à droite.
- **Case « DNF »** : entre le champ Temps et l'Allure moyenne, sur la même ligne, en texte discret, pour montrer qu'elle se rapporte au temps.
- **Nombres** : virgule décimale (« 24,4 »).
- **Blocs** : titre repliable (§ 1 et § 3) : chevron à gauche, Space Grotesk 600, 0,85 rem, Texte, casse normale ; Accent au survol.
- **Champs** : le champ commun (§ 1), libellé au-dessus en petites capitales, exemple en Texte discret dans le champ vide ; deux colonnes sur ordinateur, une sur téléphone ; la date seule sur sa ligne.
- **Boutons** (§ 1) : « Enregistrer » bouton principal (Accent plein), le seul de la fiche ; « Annuler » à contour ; « Supprimer la course » bouton à contour en Alerte, avec une poubelle, seul en bas de la fiche (plein Alerte au survol).
- **Fenêtres** (séance, Paramétrer le plan) : présentées comme la fiche (§ 1), au-dessus de la page ; « Paramétrer le plan » s'ouvre depuis Mon plan seulement (rond « Régler les phases »).
- **Retour du navigateur ou du téléphone** : comme « Annuler », pour toute fiche, ouverte dans la feuille d'une course ou seule (« Ajouter une course », crayon du Palmarès).
- **Message d'erreur** : 0,75 rem, couleur Alerte, sous le champ concerné.
- **Bandeau de lecture seule** : sous le menu, sur toute la largeur, fond Surface 2, texte 0,75 rem ; « Revenir à mon espace » en lien souligné.

## 7. Barre et lignes du Palmarès

- **Barre** : boutons ronds espacés de 0,5 rem, le compteur à 0,85 rem. « Filtres », bouton rond (§ 1) à trois traits de plus en plus courts, en Accent quand un filtre est actif ou le panneau ouvert, le nombre de filtres actifs en petite pastille Accent en haut à droite ; puis le bouton rond « Grouper par type » (icône de couches), en Accent quand le regroupement est actif ; puis le bouton rond « Colonnes » (icône de colonnes), en Accent quand sa liste est ouverte ; tout à droite, « + Ajouter une course » (« + Course » sur téléphone), bouton principal.
- **Tableau** : dans son cadre (§ 1). Groupes : titre repliable (§ 1), filet en Bordure dessous.
- **Téléphone tenu en hauteur** : sous la barre, « ↻ Tourne ton téléphone pour voir toutes les colonnes. », 0,8 rem, Texte discret. **Tenu en largeur** : une ligne par course (pas de retour à la ligne dans les cellules), cadre resserré.
- **Compteur** « X courses sur Y » à droite des boutons, 0,8 rem, Texte discret, **seulement quand un filtre est actif** ; sur téléphone, il passe sous les boutons.
- **Replier un panneau** (filtres, colonnes) : rond « Réduire » en haut à droite du panneau, un chevron vers le haut : le panneau se replie, il ne se ferme pas comme une feuille.
- **Pastilles** (panneau des filtres, tri, colonnes) : les pastilles communes (§ 1). Champs des filtres : le champ commun. Libellés de rubrique comme les légendes (Space Mono, capitales, Texte discret).
- **Intertitres du regroupement par type** : le titre repliable commun (0,85 rem, 600, Texte, chevron discret), le nombre de courses en Texte discret ; zone de toucher de 2 rem.
- **Largeur** : toutes les pages ont la même largeur de contenu sur ordinateur (960 px, marges de 2 rem), page d'une course (modale) comprise ; seule la connexion garde sa colonne étroite.
- **Crayon** : trait fin, Texte discret comme les flèches de tri, visible seulement au survol de la ligne (Accent sous le pointeur) ; la ligne survolée s'éclaire légèrement (Surface 2). Sur écran tactile, sans survol : le crayon reste visible au bout de la ligne ; toucher la ligne ouvre la consultation.

## 8. Menu

- Seuls les modules construits ont un onglet ; un module « bientôt » reste dans les Préférences.
- Onglets en Space Grotesk, casse normale, 0,8 rem (0,7 rem sur téléphone), graisse 500 ; marges de 0,85 rem en haut et en bas, 1,1 rem sur les côtés (0,6 rem sur téléphone, pour que « Saison » tienne avec les autres : les quatre modules construits tiennent dans un écran de 375 px).
- Onglet En un coup d'œil : « En un coup d' » suivi d'un picto d'œil (contour et pupille, couleur de l'onglet, 1,15 em de large) ; le nom complet en infobulle et pour les lecteurs d'écran.
- Onglet ordinaire en Texte discret, Texte au survol ; onglet de la page ouverte en Accent, souligné de 2 px en Accent.
- **Barre fine**, au-dessus du menu, sur les pages sans en-tête : « Cap sur » en Texte discret et le nom du cap en Accent, 600, comme le grand titre dont il prend le relais (0,8 rem, coupé par « … » s'il est trop long ; il mène à En un coup d'œil) à gauche ; l'engrenage à droite (§ 4 : dessiné, en Accent sur les Préférences). Marges de 0,55 rem en haut et en bas, filet (Bordure) dessous.
- Barre sur le Fond, ligne fine (Bordure) dessous ; elle reste collée en haut de l'écran au défilement ; défilement horizontal sans barre visible sur téléphone.

## 9. En un coup d'œil

- Blocs dans un cadre (Surface, Bordure, coins de 8 px, marges 1 rem × 1,15 rem), deux colonnes sur ordinateur (écart 1 rem), une sur téléphone.
- Titre de bloc : le titre de cadre commun (0,85 rem, 600, Texte) ; à droite, un lien « … → » en 0,75 rem, Texte discret.
- Un bloc « bientôt » n'est jamais affiché sur la page (annoncé sur une ligne dans les Préférences) ; Dernière course : les libellés des cartes (Space Mono, capitales).
- **Pour aller plus loin** : un bloc sur toute la largeur, toujours en dernier ; titre de cadre commun, une ligne par module absent du menu (nom en 0,85 rem Texte, phrase d'aide en 0,8 rem Texte discret, sous le nom), bouton à contour « Ajouter au menu » à droite (sous le texte sur téléphone). Il disparaît quand plus rien ne manque.
- Prochaine course : la carte de la saison, sans son propre cadre (compte à rebours en jours). D'ici là : la pastille commune par étape, le cap en Accent (texte et contour, sans fond).
- **Passage** grand en-tête ↔ barre fine : 0,45 s, ease-out ; la barre part de la hauteur de l'en-tête (5 rem de marge haute et basse), le nom du cap grossi 1,8 fois et en Accent, et se réduit ; l'en-tête part de la hauteur de la barre et se déplie. Aucun passage si l'utilisateur a demandé à réduire les animations.
- **Sans page blanche** : pendant la visite, l'en-tête et le menu de la page précédente sont gardés ; la page suivante les dessine aussitôt (le passage commence tout de suite), seul le contenu attend la base, puis arrive en fondu (0,2 s).

## 10. Calendrier

Les couleurs des courses ne changent pas d'un thème à l'autre : la même famille doit se reconnaître partout.

| Rôle | Valeur | Emploi |
| --- | --- | --- |
| Route | `#4db8ff` | Course sur route (tout ce qui n'est pas trail) |
| Trail | `#ff7a45` | Course de trail |
| Encre | `#0b1220` | Texte écrit sur la couleur pleine d'une course, lisible sur fond blanc comme sur fond sombre |

**Phases** : Base `#5fb49c`, Développement `#e6b84d`, Affûtage `#b48ef0`, Deload `#8fa8c9`, dans les thèmes sombres ; sur fond blanc (Blanc et orange), plus foncées pour rester lisibles : Base `#2f7d69`, Développement `#946200`, Affûtage `#7a4fc4`, Deload `#52698a`. Hors saison ([Préparation](module-preparation-specification.md), § 4) : **Récupération** `#d98bb0` (`#a14d78` sur fond blanc), traitée comme les autres phases (fond, liseré, légende) ; **Entretien** sans couleur : pas de fond au Calendrier, la couleur des jours (Case) dans la frise.

**Commun aux trois vues** (spécification § 2)

- **Cadre** : toute la page dans un cadre (Surface), comme les autres pages ; page sans en-tête (barre fine « Cap sur … »).
- **Barre du haut**, sur une ligne : à gauche, le menu « Vue » : un bouton à contour (§ 1) qui porte la vue ouverte et un chevron (0,75 rem, retourné quand la liste est ouverte) ; la liste comme l'infobulle des graphiques (Surface 2, Bordure, coins de 8 px, ombre légère, 12 rem de large au moins), le libellé « PÉRIODICITÉ » (Space Mono 0,7 rem, capitales, Texte discret) en tête, les choix en 0,85 rem, Texte (fond des jours au survol), le choix en cours en Accent, 600, avec un trait de 3 px à gauche. À droite, « Plan » (bouton à contour ; enfoncé : contour et texte Accent, fond Accent à 16 %, qui le distingue du survol) et « Aujourd'hui » (à contour), 0,6 rem entre deux. Téléphone : la même ligne, boutons resserrés (0,45 × 0,75 rem).
- **Période** (Année, Mois) : entre deux filets (Bordure), le titre au centre (1,05 rem, 600, Texte ; 0,95 rem sur téléphone), de chaque côté un rond (‹, ›) et la période voisine (0,8 rem, Texte discret, Accent au survol ; masquée sur téléphone). 
- **Légende** : 0,8 rem, Texte, pastilles de 1,1 × 0,75 rem ; groupes précédés d'un libellé (Space Mono 0,7 rem, capitales, Texte discret) : « ROUTE », « TRAIL » (confirmée, option), « PHASES » (Plan enfoncé). Sous la période ; Mois et Semaine : seulement la légende des phases, Plan enfoncé.
- **Jours** : un même fond pour tous les jours (Bordure à 70 % sur Surface), passé et mois voisins compris : seul le numéro d'un jour passé passe en Texte discret, et le contenu d'un jour voisin (Mois) à 50 %. Aujourd'hui : son numéro dans un rond Accent, texte Fond (les trois vues).
- **Course** : pastille pleine de la couleur de sa famille, nom en Encre, 600 (confirmée) ; couleur à 35 % sur Bordure, cadre de 1 px de la couleur pleine, nom en Texte (option) ; Texte discret, nom en Fond (courue). **Rendez-vous clé** : « ◆ » et texte en Texte discret. **Séance** : case à cocher en Accent, type en Space Mono capitales, Texte discret, libellé en Texte (barré, Texte discret, quand elle est faite). **« + »** : rond de 1,5 rem, contour de 1 px et « + » (1 rem, 600) en Accent ; plein au survol (fond Accent, « + » en Fond).
- **Phases** (Plan enfoncé), Mois et Semaine : fond de la couleur de la phase à 38 % sur Surface, le même pour tous les jours de la semaine (passés et voisins compris), filet de la couleur pleine : 3 px en haut de la case (Mois), 4 px à gauche de la ligne (Semaine).

**Vue Année** (spécification § 3)

- **Grille** : à gauche des cases de chaque mois, sa colonne de jours de 2,6 rem (téléphone : 1,5 rem) : initiale (atténuée) et numéro en Space Mono 0,65 rem, Texte discret, alignés à droite (téléphone : le numéro seul) ; lignes de 1,5 rem (téléphone : 1,25 rem), cases jointives ; onglet du mois au-dessus de ses cases : Space Mono 0,7 rem, capitales, Texte, sur Bordure, coins hauts de 6 px ; le mois en cours en Accent, texte Fond ; jours en Bordure à 70 %, passés compris ; samedi et dimanche en Bordure (plus foncés sur fond blanc, plus clairs sur fond sombre : un cran plus marqués) ; filet de 1 px en Texte discret (70 %) sous chaque dimanche ; aujourd'hui : case cerclée de 2 px de Texte, numéro dans un rond Accent, texte Fond.
- **Course** : la case remplie comme une pastille (ci-dessus), le nom en 0,75 rem (téléphone 0,62).
- **Fond de phase** (Plan enfoncé) : la couleur de la phase à 38 % sur Surface, 52 % pour samedi et dimanche ; une case de course garde sa couleur.
- **Séances** (Année) : type en toutes lettres dans la case, 0,65 rem, Texte (Texte discret et barré quand faites). Mois : type en Space Mono capitales sur sa ligne, libellé dessous, chacun coupé s'il ne tient pas.
- **Liseré de phase** (Plan enfoncé) : 3 px à gauche de la case, couleur pleine de la phase (sur une case de course aussi) ; plus de barres de prépa.

**Vue Mois** (spécification § 4.1)

- Jours de la semaine en Space Mono 0,7 rem, capitales, Texte discret, une seule fois ; cases de 6 rem de haut au moins, jointives, séparées d'un filet de 1 px (le fond du cadre), la grille aux coins de 6 px ; numéro en 0,75 rem, 600 ; courses, rendez-vous et séances en 0,68 rem, une ligne chacun, coupés s'ils ne tiennent pas ; « + » de 1,5 rem dans le coin bas droit.
- Téléphone : cases de 3,4 rem ; le numéro (0,7 rem) et des repères : barre de 4 px de la couleur de la course, point de 5 px par séance (Texte ; faite : Texte discret), « ◆ » du rendez-vous.

**Vue Semaine** (spécification § 4.3)

- Titre de la semaine en Space Mono 0,7 rem capitales, Texte discret (la semaine en cours en Texte) ; lien d'action « ↑ Afficher les semaines passées » en tête.
- Lignes de 3,2 rem de haut au moins, 3 px entre deux ; colonne du jour de 3,2 rem (téléphone 2,6) : numéro en 1 rem, 600, nom du jour en Space Mono 0,6 rem, capitales, Texte discret, centrés l'un sur l'autre ; aujourd'hui : ligne cerclée de 2 px de Texte. Courses et rendez-vous en 0,8 rem, séances en 0,85 rem (case de 1 rem) ; « + » de 1,5 rem au bout de la ligne.

**Rubrique Préparation (page d'une course)**

- **Semaine** : trait vertical de 4 px à gauche dans la couleur de sa phase (pointillé en Bordure pour « Sans objectif clair »), nom de la phase en 0,85 rem, 600, dans cette couleur ; titre en Space Mono 0,7 rem capitales, Texte discret ; une ligne par jour, à toute largeur ; aujourd'hui cerclé de 1 px de Texte.
- **Séance** : case à cocher en Accent, type en Space Mono 0,65 rem capitales Texte discret, sur sa ligne, jamais coupé au milieu d'un mot (« … » s'il ne tient pas), libellé en 0,72 rem ; barrée et en Texte discret quand elle est faite. Bouton « + » rond au bout de la ligne. Course du jour : pastille aux quatre couleurs ; rendez-vous clé : « ◆ » et texte en 0,68 rem.
- **Frise** des phases : cases de la couleur de la phase, côte à côte, largeur proportionnelle à leur nombre de semaines ; poignées de 8 px en Texte, curseur de redimensionnement.
- **Rubrique** (depuis le 12 nov. 2026) : premier texte de la liste des textes d'une course (même cadre, même titre repliable) ; la place de la course dans la saison en 0,8 rem, Texte discret ; pour un Objectif, la frise de sa saison ; l'avis (ci-dessous) ; le lien d'action « Voir dans Mon plan → ». Plus de semaines ni de « Toutes les semaines ».
- **Avis sur une course** (`pr-avis`, Mon plan, page d'une course, fiche) : picto commun (`mrtIcone.valide`, `attention`, `interdit`) et niveau en 0,8 rem, 600 : Conseillée en Accent, Possible en Texte discret, Déconseillée en Alerte ; la raison en 0,8 rem, Texte ; « Sources : … » en 0,75 rem, Texte discret, liens `mrt-lien`.
- **Rond « Régler les phases »** : rond commun (`mrt-rond`), icône de curseurs, sur la frise de Mon plan (à gauche du plein écran) et sur chaque Objectif de « Courses du plan », seul lieu de réglage ; il ouvre « Paramétrer le plan ». La page d'une course n'a que le lien d'action « Voir dans Mon plan → ».
- **Fenêtres** (séance, Paramétrer le plan) : comme la fiche (§ 1 et 6) : voile de la feuille d'une course (Fond à 75 %), panneau Surface avec cadre, 30 rem (44 rem pour Paramétrer le plan) ; barre du haut fixe, « Annuler » à gauche, « Enregistrer » à droite ; titre en libellé (Space Mono 0,75 rem, capitales, Texte discret) ; libellés de champ à 0,7 rem, champs communs (à 16 px sur écran tactile) ; « Supprimer la séance » (à contour Alerte, poubelle) ou « Revenir aux règles générales » (lien) seul en bas.


**Page Mon plan** (spécification Préparation, § 5)

- Dans un cadre (Surface), comme les autres pages. Titre de saison en 1 rem, 600, Texte, le nom de l'Objectif souligné d'un filet (lien vers sa page) ; « (dans 20 sem.) » en 0,8 rem, Texte discret ; état de la semaine dessous, 0,8 rem, Texte discret.
- **Frise** : une colonne par semaine (0,9 rem au moins, 2 px d'écart), barre de 1,4 rem à la couleur de sa phase ; nom du mois (Space Mono 0,65 rem, Texte discret) sur la semaine où il commence, l'année sur le premier et en janvier ; dessous, un ▲ par course : Accent (Objectif), Texte (Préparatoire), Texte discret (Plaisir), contour seul (option) ; défile de gauche à droite quand elle ne tient pas. Légende dessous, 0,7 rem : les quatre signes, puis les six phases.
- **Mon profil** (bouton ; la feuille et la page : [Mon profil](module-profil-specification.md), mêmes lignes et même liste ; repère du Palmarès en cadre pointillé Accent sous le repère d'allure, « Reprendre » à contour) : bouton à contour en haut à droite, l'état du profil à sa gauche (0,8 rem, Texte discret ; Texte quand il est complet). La fenêtre est la feuille d'une course (§ 1, Fenêtres comme la fiche) : croix ronde à droite, rond « ‹ » à gauche sur une question, titre en libellé de la feuille ; titres de section communs, le compte « 4 sur 5 » à droite (Accent, Texte discret une fois complet) ; lignes groupées sur la couleur des jours, coins de 8 px, filet du fond entre deux, 2,9 rem de haut au moins : question en 0,85 rem Texte, réponse à droite en Texte discret (« À renseigner » en Accent), chevron ; choix d'une question : même liste, le choix en cours en Accent, 600, coché ; ma semaine : jours en pastilles (libellé de champ au-dessus), nombres de sorties et de renforcements en champs communs côte à côte ; message d'erreur en 0,75 rem, Alerte, sous le titre ; aucune phrase d'aide.
- **Fenêtre d'une séance** : durée, distance et intensité côte à côte, sous le libellé.
- **Séances proposées par l'IA** : sous le titre du bloc, « Proposer les séances » (bouton principal), « 4 restantes ce mois-ci » (0,8 rem, Texte discret), un message d'erreur en Alerte ; aucune mention. La proposition en attente dans un cadre fin en Accent : titre en libellé, la recommandation de l'IA en 0,85 rem, Texte (un seul bloc), les semaines en pastilles quand on choisit, puis les boutons (un seul principal : « Tout accepter » ou « Accepter la sélection »). Sur téléphone, la liste des séances proposées sous la recommandation (une ligne par séance, le type en Space Mono 0,65 rem capitales).
- **Courses du plan** : titre en libellé ; une ligne par course, un filet (Bordure) entre deux : nom en 1 rem, 600 (lien souligné d'un filet), date et rôle en 0,8 rem, Texte discret, le rond « Régler les phases » d'un Objectif à droite ; l'avis dessous ; « Passer en Plaisir » à contour. **Préparatoire conseillée** : cadre en pointillé Accent, coins de 8 px (comme une séance proposée), texte en 0,85 rem, le début en gras ; courses repérées en liste, « Confirmer » à contour ; « + Ajouter une course » : le bouton principal de la page Saison (« + Course » sur téléphone).
- **Alertes** et **Bloc en cours** : titres en libellé (Space Mono 0,7 rem, capitales, Texte discret) ; une alerte : 0,8 rem, Texte, sur la couleur des jours, filet de 3 px en Accent à gauche ; le bloc dans la grille du Mois du Calendrier (mêmes cases, fonds de phase, « + ») ; dans une case, le repère du jour (Allégé, Repos, Récupération) en 0,65 rem, Texte discret, et chaque séance proposée en 0,7 rem, Texte, contour Accent en pointillé : son libellé et sa durée (le détail au survol).

## 11. Panneau des boutons

Les boutons du site, à reprendre tels quels (feuille de style partagée, `composants/en-tete.css`) : un module n'en dessine pas d'autre. Tous en Space Grotesk, casse normale ; Accent au survol (souris seulement) ; contour Accent de 2 px au focus clavier ; estompés quand ils sont inactifs.

| Bouton | Classe | Apparence | Exemples sur le site |
| --- | --- | --- | --- |
| Principal | `mrt-btn is-principal` | Accent plein, texte Fond, 0,8 rem, 600, coins arrondis (20 px) ; au survol, l'Accent mêlé de Texte. Un par écran au plus | Enregistrer, Valider, Se connecter, Partager, + Ajouter une course |
| À contour | `mrt-btn` | Bordure fine (Bordure), texte en Texte, même taille que le principal ; icône facultative à gauche | Annuler, Retenir cette course, Marquer comme courue, Paramétrer le plan, Aujourd'hui, Changer le mot de passe |
| Actif | `mrt-btn is-actif` | À contour, texte et bordure en Accent | Bouton à contour dont l'état est en cours |
| Danger | `mrt-btn is-danger` | À contour en Alerte, avec une poubelle ; plein Alerte au survol | Supprimer la course, Supprimer la séance, Supprimer (confirmation) |
| Rond | `mrt-rond` | Cercle de 2 rem, bordure fine, icône dessinée (`mrtIcone`) en Texte discret ; en Accent quand il est actif ou enfoncé | Filtres, Grouper par type, Colonnes, crayon, ‹ et ›, ↑ et ↓, Cartes et Tableau, plein écran de la carte |
| Petit rond | `mrt-rond is-petit` | Cercle de 1,5 rem, « + » dessiné, zone de toucher de 2 rem | Ajouter une séance (Calendrier, préparation) |
| Plein écran | `mrt-rond mrt-plein` (`mrtPleinEcran.bouton()`) | Rond avec quatre coins (agrandir) ou leurs flèches vers l'intérieur (réduire), dans une zone qui porte `data-plein-cible` ; ordinateur seulement (absent sur téléphone et écran tactile) ; le plein écran du navigateur, fond du site, Échap pour sortir | Frise de Préparation, Calendrier |
| Fermer | `mrt-rond is-fermer` | Rond avec « × » de 1,2 rem, la même croix partout | Fermer une feuille |
| Réduire | `mrt-rond` | Rond avec un chevron vers le haut | Replier un panneau (filtres, colonnes du Palmarès) |
| Lien d'action | `mrt-lien` | Souligné, Texte discret, 0,8 rem, sans cadre ; `is-danger` en Alerte | Se déconnecter, Mot de passe oublié ?, Retour à la connexion, Réinitialiser l'ordre, Réinitialiser les filtres, Revenir aux règles générales, Retirer |
| Pastille | `mrt-pastille` | Arrondie, contour Bordure, texte en Texte, 0,8 rem ; choisie : fond Accent, texte Fond | Vues du Calendrier, filtres de Courses et du Palmarès, filtres, tri et colonnes du Palmarès, étapes « D'ici là » |
| Réglage discret | `mrt-choix` | Choix en texte, 0,8 rem, Texte discret ; le choisi en Texte, souligné d'Accent | Durée de l'Année (3, 6, 12 mois) |
| En-tête triable | `mrt-tri` | Libellé de colonne et deux triangles ; la colonne triée en Accent | Palmarès, tableau de Courses |
| Confirmation | `mrtConfirmer` | Encadré (Surface, contour Alerte pour une action dangereuse) sur le voile : question, « Annuler », action | Supprimer la course ou la séance, Abandonner les modifications, Retenir cette course, Revenir aux règles générales |

## 12. Glossaire

Une notion, un mot : ces noms valent pour tout texte affiché (libellés, boutons, infobulles, champs), les spécifications et le banc d'essai (groupe « vocabulaire »). Les noms internes (fichiers, clés rangées en base, classes) ne changent pas.

| Notion | Mot retenu | À ne plus écrire |
| --- | --- | --- |
| Page des courses à venir (menu, titre, lien d'En un coup d'œil) | **Saison** (fichier `objectif.html`, clé « Objectif ») | Objectif & plan, Plan & objectifs, Feuille de route |
| Course choisie pour l'en-tête | **Objectif principal** (Préférences) ; l'en-tête garde la formule « Cap sur … » | « Cap » seul, comme étiquette |
| Rôle d'une course | **Objectif**, Préparatoire, Plaisir | |
| Module qui construit le plan | Page **Mon plan** (menu, titre, lien d'En un coup d'œil ; clé « Préparation ») ; rubrique **Préparation** d'une course ; les phases se règlent **dans Mon plan seulement** (rond **Régler les phases**, sur un Objectif) ; « plan » dans « Paramétrer le plan », « Place dans le plan », « Courses du plan » ; la frise de la page bascule entre **En cours** et **Tout** | plan de saison, prépa, Saison (pour la frise), Plans des courses, page Préparation |
| Jugement d'une course dans le plan | **avis** : **Conseillée**, **Possible**, **Déconseillée** ; **Préparatoire conseillée** (type de course et fenêtre) | recommandée, à éviter |
| Phases affichées au Calendrier | bouton **Phases** | Plan (bouton), Phases de prépa |
| Choix du Calendrier (Semaine, Mois, Année…) | menu **Vue** | Périodicité |
| Module de toutes les courses | **Courses** (menu et titre) ; toutes les courses au départ, resserrées par le bouton **Filtres** | Courses à surveiller, vues À surveiller / À venir |
| Statut d'une course pas encore décidée | **Repérée** (valeur stockée `a_surveiller`) | À surveiller, candidate |
| Courses déjà courues | vue et pastille **Courues** ; module **Palmarès** | Déjà couru |
| Page d'accueil du site | **En un coup d'œil** | Accueil |
| Une course d'un groupe d'options | **option** | candidat, candidate |
| Séance de course | **Séance** ; type **Course à pied** ; « sortie » seulement dans « sortie longue » | Sortie, Entraînement (séance) |
| Séance de renforcement | **Renforcement** | Musculation, Renfo |
| Inscription à une course | **Inscription** (bloc, ligne des cartes, ouverture) ; **Dossard** pour le numéro seul | Dossard comme libellé d'un bloc |
| Ce qui décrit le coureur (mesures, niveau, semaine, santé) | **Mon profil** (page, onglet, feuille commune ; sections **Moi**, **Mon niveau**, **Ma semaine**, **Santé**) | Mes mesures, Mon profil de coureur, profil d'entraînement |
| Compte d'un autre utilisateur | **espace** (« Voir son espace », « Revenir à mon espace ») | site de, mon site, son site |
| Enregistrer une saisie en base | **Enregistrer** ; **Valider** seulement pour un brouillon pas encore rangé (aujourd'hui aucun écran : le formulaire d'une course neuve n'ouvre plus la fenêtre du plan) | Sauvegarder, Valider pour une saisie rangée |
| Supprimer | **Supprimer** une donnée (course, séance, aliment) ; **Retirer** une personne ou un élément d'une liste | Effacer |
| Remettre à zéro | **Réinitialiser** (filtres, ordre) ; **Revenir aux règles générales** (plan) | Effacer les filtres, Rétablir, Recalculer |
| Ajouter | **Ajouter** (course, séance, aliment) | Créer |
| Modifier une course (crayon) | **Modifier la course** | « Modifier » seul |
| Quitter une saisie | **Annuler** ; la confirmation propose **Continuer** (ou **Garder**) et **Abandonner**, jamais deux « Annuler » | |

Colonne « Événement » et colonne « Course » du tableau des Courses : l'événement est l'organisation (Trail du Lac), la course l'épreuve (Le Tour du Lac).
