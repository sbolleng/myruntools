# Vocabulaire pour les prompts

Version 0.1 · 28 novembre 2026 · [Retour au sommaire](README.md) · Lexique de référence pour parler des éléments du site ; le glossaire des libellés reste le [design § 12](design.md).

Pour décrire un élément : **page › zone › élément (n° du plan de page) › ce qu'on change**, avec « téléphone » ou « ordinateur » (bascule à 600 px). Exemple : « Mon plan › carte de l'Objectif › (26) : nom en Texte discret ».

## 1. Grandes parties

| Mot | Sens |
| --- | --- |
| Partie publique | Pages sans connexion, sans en-tête ni menu : connexion, création d'un compte, nouveau mot de passe, mentions légales, confidentialité |
| Module | Une fonction du site, avec sa page et son onglet ; « bientôt » : pas d'onglet, annoncé dans les Préférences |
| Page de démarrage | Premier module du menu (par défaut En un coup d'œil) ; seule page avec le grand en-tête |
| Page hors du menu | Module non coché, ouvert par un lien : son onglet s'ajoute le temps de la visite |
| Espace | Le compte d'un utilisateur ; partage en lecture seule : « Voir son espace » |
| Thème | Change les couleurs seulement : Bleu et orange, Vert et rose, Violet et turquoise, Blanc et orange, Noir et orange, Automatique |

## 2. Pages

| Nom affiché | Fichier |
| --- | --- |
| En un coup d'œil | `index.html` |
| Ma saison | `objectif.html` |
| Les courses | `courses-a-surveiller.html` |
| Calendrier (vues Semaine, Mois, Année) | `calendrier.html` |
| Mon plan | `preparation.html` |
| Ma nutrition | `nutrition.html` |
| Mon palmarès | `palmares.html` |
| Mes stats | `stats.html` |
| Mon profil | `profil.html` |
| Guide | `guide.html` |
| Préférences (engrenage, sans onglet) | `preferences.html` |
| Page d'une course (par-dessus la page d'origine) | `course.html` |

## 3. Parties d'une page, de haut en bas

| Zone | Mot |
| --- | --- |
| Haut, page de démarrage | **Grand en-tête** : nom de l'application, engrenage, « Cap sur » + nom de la course (titre), indicateurs, compte à rebours, prochaine course, filet |
| Haut, autres pages | **Barre fine** : « Cap sur » + nom du cap, engrenage |
| Sous le haut | **Menu** : onglets, l'onglet actif en Accent |
| Corps | **Contenu**, fait de **cadres** (un bloc = un cadre ; jamais de cadre dans un cadre) |
| Dans un cadre | **Section** (séparée par un filet), **titre de cadre** ou **titre repliable** (chevron à gauche), **libellé** (petites capitales), **valeur** |
| Dans la page | **Bandeau** : messages de MyRunTools (alertes), par exemple sous la frise de Mon plan |

## 4. Ce qui s'ouvre par-dessus la page

Un seul mot générique : **feuille**.

| Mot | Sens |
| --- | --- |
| **Feuille** | Tout ce qui s'ouvre par-dessus la page, sur un **voile** : feuille d'une course (largeur de la page), feuille de saisie rapide (à écrans), petite feuille (une question) |
| **Page d'une course** | Nom affiché de la feuille d'une course ; « modale » reste un terme technique (`modale-course.js`), jamais à l'écran |
| **Fiche** | Le formulaire d'une course (« Modifier la course »), en consultation ou en édition |
| **Fenêtre** | Seulement « Régler les phases » ; dans un texte neuf, dire feuille |
| **Confirmation** | Question posée dans l'encadré du site (`mrtConfirmer`) ; un **avertissement** n'a qu'un bouton, « Fermer » |

## 5. Ce qu'on touche

- **Sept boutons** ([design § 11](design.md)) : Principal (un par écran), Secondaire, Menu (chevron), Danger (« Supprimer … », seul en bas), Rond (icône), Petit rond +, Lien (› page du site, ↗ site extérieur).
- **Pas des boutons** : pastille (choisir), réglage discret, en-tête triable, tuile de choix, carte, case, case à cocher, champ.

## 6. Mots du métier

| Mot | Sens |
| --- | --- |
| Événement / course | L'organisation / l'épreuve |
| Parcours, format | Le tracé ; le type de course (« Trail long ») |
| Statut | Repérée, Option, Confirmée, Courue |
| Rôle | Objectif, Préparatoire, Plaisir (donné dans Mon plan seulement) |
| Objectif principal | La course de l'en-tête (« Cap sur … ») ; à ne pas confondre avec le rôle Objectif |
| Étape | Une course de Ma saison (« Étape 3 sur 6 ») |
| Option, groupe d'options | Courses entre lesquelles il faut choisir |
| Préparation | La période qui mène à un Objectif ; rubrique de la page d'une course |
| Phase | Base, Développement, Allègement, Affûtage, Récupération ; bouton **Phases** au Calendrier |
| Séance | Entraînement ; Décrassage, Renforcement ; « activité » seulement pour ce qu'on importe |
| Avis | Conseillée, Possible, Déconseillée |
| Inscription, dossard | Le bloc ; le numéro seul |
| Ressenti | Le retour après une séance faite |

## 7. Verbes

Enregistrer (pas Sauvegarder) · Ajouter (pas Créer) · Supprimer une donnée, Retirer d'une liste · Réinitialiser · Annuler, puis Continuer ou Abandonner · Modifier la course.

## 8. Couleurs et tailles : par leur nom

Couleurs : Fond, Surface, Surface 2, Bordure, Accent, Texte, Texte discret, Alerte, Champ, Case (jamais en hexadécimal). Tailles : micro, libellé, texte courant, texte secondaire, titre repliable, titre de page, message ([design § 3](design.md)).
