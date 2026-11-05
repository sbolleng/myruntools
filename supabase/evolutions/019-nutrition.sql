-- Évolution 019 · 5 novembre 2026 · Module Nutrition : niveau d'activité, aliments, lignes de repas
-- À coller dans l'éditeur SQL de Supabase. Aucune donnée existante n'est modifiée.
-- Pas de lecture partagée : ces données de santé ne sont jamais visibles par le site partagé.

create type activite as enum ('sedentaire', 'peu', 'actif', 'tres');
create type repas    as enum ('petit_dej', 'midi', 'encas', 'soir');

alter table profils add column activite activite;  -- niveau d'activité hors sport

-- ----- Nutrition : aliments de l'utilisateur et lignes de repas
create table aliments (
  id            uuid primary key default gen_random_uuid(),
  utilisateur   uuid not null default auth.uid() references profils (id) on delete cascade,
  nom           text not null check (char_length(nom) between 1 and 100),
  portion       text not null check (char_length(portion) between 1 and 50),  -- « 1 pièce », « 100 g »
  kcal          numeric(6,1) not null check (kcal >= 0),                      -- pour une portion
  proteines     numeric(5,1) not null default 0 check (proteines >= 0),       -- g, pour une portion
  glucides      numeric(5,1) not null default 0 check (glucides >= 0),
  lipides       numeric(5,1) not null default 0 check (lipides >= 0),
  favori        boolean not null default false,
  dernier_usage timestamptz
);
create index aliments_utilisateur on aliments (utilisateur);

create table repas_lignes (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  date        date not null,
  repas       repas not null,
  aliment     uuid references aliments (id) on delete set null,
  nom         text not null check (char_length(nom) between 1 and 100),       -- figé à la saisie
  quantite    numeric(6,2) not null check (quantite > 0),                     -- en portions
  kcal        numeric(7,1) not null check (kcal >= 0),                        -- totaux de la ligne, figés
  proteines   numeric(6,1) not null default 0 check (proteines >= 0),
  glucides    numeric(6,1) not null default 0 check (glucides >= 0),
  lipides     numeric(6,1) not null default 0 check (lipides >= 0)
);
create index repas_lignes_utilisateur_date on repas_lignes (utilisateur, date);

alter table aliments     enable row level security;
alter table repas_lignes enable row level security;

create policy "ses aliments" on aliments for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses repas" on repas_lignes for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
