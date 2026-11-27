-- Évolution 054 · 28 novembre 2026 · Logistique : cartes Option / Confirmé / Non retenu, coordonnées des logements,
-- retour d'un aller-retour sur la même ligne, groupes du matos (docs/module-logistique-specification.md, § 5).
-- À coller dans l'éditeur SQL de Supabase ; peut être recollée sans risque.

-- État d'un logement ou d'un transport : les lignes existantes restent confirmées.
alter table logements add column if not exists statut text not null default 'confirme' check (statut in ('option', 'confirme', 'non_retenu'));
alter table trajets   add column if not exists statut text not null default 'confirme' check (statut in ('option', 'confirme', 'non_retenu'));

-- Coordonnées d'un logement (carte, distance au départ), tirées de l'adresse.
alter table logements add column if not exists latitude  double precision check (latitude between -90 and 90);
alter table logements add column if not exists longitude double precision check (longitude between -180 and 180);

-- Aller-retour sur une seule ligne : prix_aller_retour vrai, le retour dans ces colonnes.
alter table trajets add column if not exists retour_lieu_depart  text check (char_length(retour_lieu_depart) <= 100);
alter table trajets add column if not exists retour_depart       timestamp;
alter table trajets add column if not exists retour_lieu_arrivee text check (char_length(retour_lieu_arrivee) <= 100);
alter table trajets add column if not exists retour_arrivee      timestamp;

-- Groupe d'un article du matos : En course, Avant-après course, Autres (par défaut).
alter table materiel_catalogue add column if not exists groupe text not null default 'autres' check (groupe in ('en_course', 'avant_apres', 'autres'));
