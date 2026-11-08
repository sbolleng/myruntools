-- Évolution 024 · 8 novembre 2026 · Profil d'entraînement et séances enrichies (spécification Préparation, § 5.2 et 7)
-- 1. Séances : durée, distance, intensité facultatives ; origine (saisie à la main ou proposée par l'IA) ; état (proposée ou acceptée).
--    Les séances existantes restent saisies et acceptées.
create type seance_intensite as enum ('facile', 'moderee', 'intense');
create type seance_origine   as enum ('saisie', 'ia');
create type seance_etat      as enum ('proposee', 'acceptee');
alter table seances
  add column duree_min   integer check (duree_min between 1 and 1440),
  add column distance_km numeric(5,1) check (distance_km > 0 and distance_km < 1000),
  add column intensite   seance_intensite,
  add column origine     seance_origine not null default 'saisie',
  add column etat        seance_etat not null default 'acceptee';

-- 2. Profil d'entraînement : une ligne par utilisateur ; tout est facultatif dans la base, le site dit ce qui manque pour
--    proposer des séances. Jours : 1 (lundi) à 7 (dimanche). Temps de référence en secondes. Données de santé (FC max,
--    points fragiles) : règle par ligne, jamais lisibles par le site partagé.
create table profil_entrainement (
  utilisateur        uuid primary key default auth.uid() references profils (id) on delete cascade,
  annees             smallint check (annees between 0 and 80),
  volume             numeric(5,1) check (volume > 0 and volume <= 500),
  volume_unite       text check (volume_unite in ('km', 'h')),
  sortie_longue      numeric(5,1) check (sortie_longue > 0 and sortie_longue <= 300),
  sortie_longue_unite text check (sortie_longue_unite in ('km', 'h')),
  jours              smallint[] check (jours <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  jour_long          smallint check (jour_long between 1 and 7),
  seance_max_min     integer check (seance_max_min between 10 and 1440),
  semaine_max_h      numeric(4,1) check (semaine_max_h > 0 and semaine_max_h <= 60),
  vma                numeric(4,1) check (vma between 8 and 30),
  temps_10km_s       integer check (temps_10km_s between 1200 and 7200),
  temps_semi_s       integer check (temps_semi_s between 3000 and 14400),
  fc_max             smallint check (fc_max between 100 and 230),
  renfo              smallint check (renfo between 0 and 3),
  moyens             text[] check (moyens <@ array['tapis', 'velo', 'piscine']),
  fragiles           text check (char_length(fragiles) <= 300),
  maj                timestamptz not null default now()
);

alter table profil_entrainement enable row level security;
create policy "son profil d'entraînement" on profil_entrainement for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
