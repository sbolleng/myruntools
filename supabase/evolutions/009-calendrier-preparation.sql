-- Évolution 009 · 27 octobre 2026 · Calendrier : durées de préparation, phases, séances
-- (modèle de données 0.9 ; spécification du Calendrier, § 5 et 7)
--  - formats.prepa_semaines : durée de préparation par défaut d'un format, en semaines
--    (vide : pas de préparation affichée).
--  - courses.prepa_semaines : durée propre à une course (vide : celle de son format).
--  - plan_semaines : une ligne par semaine dont la phase a été modifiée à la main ;
--    les autres semaines se calculent à l'affichage.
--  - seances : séances saisies à la main (run ou renfo), avec leur case « faite ».
alter table formats add column if not exists prepa_semaines int
  check (prepa_semaines between 1 and 52);
alter table courses add column if not exists prepa_semaines int
  check (prepa_semaines between 1 and 52);

-- Valeurs proposées d'après des plans publiés (spécification du Calendrier, § 5.4) ;
-- Trail découverte, Course en heure, Marche, Fast hiking et Triathlon restent vides.
update formats set prepa_semaines = v.s
from (values ('route_5km', 8), ('route_10km', 8), ('route_20km', 10), ('route_semi', 10), ('route_marathon', 16),
  ('route_ultra', 16), ('route_100km', 16), ('trail_court', 12), ('trail_long', 16), ('trail_ultra', 16)) as v (id, s)
where formats.id = v.id;

create type phase_plan  as enum ('base', 'developpement', 'affutage', 'deload');
create type seance_type as enum ('run', 'renfo');

create table plan_semaines (
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  course      uuid not null,
  lundi       date not null check (extract(isodow from lundi) = 1),
  phase       phase_plan not null,
  primary key (course, lundi),
  foreign key (utilisateur, course) references courses (utilisateur, id) on delete cascade
);

create table seances (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  date        date not null,
  type        seance_type not null,
  libelle     text not null check (char_length(libelle) between 1 and 100),
  faite       boolean not null default false,
  course      uuid,
  foreign key (utilisateur, course) references courses (utilisateur, id) on delete set null (course)
);
create index seances_utilisateur_date on seances (utilisateur, date);

alter table plan_semaines enable row level security;
alter table seances       enable row level security;

create policy "son plan" on plan_semaines for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses séances" on seances for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));

-- Lecture seule d'un site partagé
create policy "lecture partagée" on plan_semaines for select to authenticated
  using (exists (select 1 from partages p where p.proprietaire = plan_semaines.utilisateur and p.invite = (select auth.uid())));
create policy "lecture partagée" on seances for select to authenticated
  using (exists (select 1 from partages p where p.proprietaire = seances.utilisateur and p.invite = (select auth.uid())));
