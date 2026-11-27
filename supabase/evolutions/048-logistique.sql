-- Évolution 048 · 27 novembre 2026 · Logistique d'une course (docs/module-logistique-specification.md, § 5)
-- Logements et trajets d'une course, catalogue du matos de l'utilisateur, matos retenu pour une course (imposé, pris).
-- Les équipements durables (chaussures, bâtons, sac, frontale, montre) restent dans « equipements ».
-- À coller dans l'éditeur SQL de Supabase ; peut être recollée sans risque.

create table if not exists logements (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  course      uuid not null,
  nom         text not null check (char_length(nom) <= 100),
  adresse     text check (char_length(adresse) <= 200),
  url         text check (char_length(url) <= 500),
  prix        numeric(8,2) check (prix >= 0),
  arrivee     timestamp,
  depart      timestamp,
  cree_le     timestamptz not null default now(),
  foreign key (utilisateur, course) references courses (utilisateur, id) on delete cascade
);
create index if not exists logements_course on logements (course);

create table if not exists trajets (
  id            uuid primary key default gen_random_uuid(),
  utilisateur   uuid not null default auth.uid() references profils (id) on delete cascade,
  course        uuid not null,
  sens          text not null default 'aller' check (sens in ('aller', 'retour', 'autre')),
  type          text not null default 'train' check (type in ('avion', 'train', 'voiture', 'bus', 'autre')),
  lieu_depart   text check (char_length(lieu_depart) <= 100),
  depart        timestamp,
  lieu_arrivee  text check (char_length(lieu_arrivee) <= 100),
  arrivee       timestamp,
  url           text check (char_length(url) <= 500),
  prix          numeric(8,2) check (prix >= 0),
  cree_le       timestamptz not null default now(),
  foreign key (utilisateur, course) references courses (utilisateur, id) on delete cascade
);
create index if not exists trajets_course on trajets (course);

create table if not exists materiel_catalogue (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  nom         text not null check (char_length(nom) <= 80),
  categorie   text not null default 'Autre'
              check (categorie in ('Papiers', 'Sécurité', 'Vêtements', 'Porté', 'Nutrition', 'Électronique', 'Après-course', 'Autre')),
  ordre       integer not null default 0,
  unique (utilisateur, id),
  unique (utilisateur, nom)
);

create table if not exists course_materiel (
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  course      uuid not null,
  article     uuid not null,
  impose      boolean not null default false,  -- exigé par le règlement
  pris        boolean not null default false,  -- case cochée
  equipement  uuid,                            -- l'équipement de Mon matériel choisi pour cette course (facultatif)
  primary key (course, article),
  foreign key (utilisateur, course)  references courses (utilisateur, id) on delete cascade,
  foreign key (utilisateur, article) references materiel_catalogue (utilisateur, id) on delete cascade,
  foreign key (utilisateur, equipement) references equipements (utilisateur, id) on delete set null (equipement)
);

alter table logements          enable row level security;
alter table trajets            enable row level security;
alter table materiel_catalogue enable row level security;
alter table course_materiel    enable row level security;
drop policy if exists "ses logements" on logements;
create policy "ses logements" on logements for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
drop policy if exists "ses trajets" on trajets;
create policy "ses trajets" on trajets for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
drop policy if exists "son catalogue" on materiel_catalogue;
create policy "son catalogue" on materiel_catalogue for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
drop policy if exists "son matos" on course_materiel;
create policy "son matos" on course_materiel for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
