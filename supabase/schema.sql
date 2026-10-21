-- ============================================================================
-- MyRunTools · création de la base (modèle de données 0.3, docs/modele-donnees.md)
--
-- À coller une seule fois dans l'éditeur SQL de Supabase (SQL Editor), puis
-- « Run ». Aucun secret ni aucune donnée personnelle dans ce fichier : seules
-- les listes de référence y sont remplies.
-- ============================================================================

-- ----- Listes fermées : le fonctionnement en dépend, la base refuse le reste
create type statut_course as enum ('a_surveiller', 'option', 'confirmee');
create type role_course   as enum ('preparatoire', 'plaisir', 'objectif_intermediaire', 'objectif');
create type etat_course   as enum ('a_venir', 'abandonnee', 'courue');
create type theme         as enum ('bleu-orange', 'vert-rose', 'violet-turquoise');
create type sexe          as enum ('femme', 'homme', 'non_precise');

-- ----- Listes de référence : des données, modifiées par l'administrateur seul
create table types_course (
  id      text primary key,
  libelle text not null unique,
  ordre   int  not null
);

create table sous_categories (
  id            text primary key,
  type          text not null references types_course (id),
  libelle       text not null,
  ordre         int  not null,
  distance_fixe boolean not null default false, -- les seules qui ont un record
  unique (type, libelle)
);

create table types_equipement (
  id      text primary key,
  libelle text not null unique,
  ordre   int  not null
);

-- ----- Profil : un par compte Supabase (l'e-mail reste dans le compte)
create table profils (
  id        uuid primary key references auth.users (id) on delete cascade,
  prenom    text not null,
  nom       text not null,
  sexe      sexe,
  naissance date,
  poids     numeric(5,1) check (poids > 0),     -- kg
  taille    int          check (taille > 0),    -- cm
  pointure  numeric(3,1) check (pointure > 0),
  fc_repos  int          check (fc_repos > 0),  -- bpm
  fc_max    int          check (fc_max > 0),    -- bpm
  vma       numeric(4,1) check (vma > 0),       -- km/h
  vo2max    numeric(4,1) check (vo2max > 0),    -- ml/kg/min
  cree_le   timestamptz not null default now()
);

-- ----- Équipement : chaussures, montre, bâtons…
create table equipements (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  type        text not null references types_equipement (id),
  marque      text,
  modele      text,
  surnom      text,
  achat       date,
  prix        numeric(7,2) check (prix >= 0),
  km_depart   numeric(7,1) not null default 0 check (km_depart >= 0),
  km_limite   numeric(7,1) check (km_limite > 0),
  actif       boolean not null default true,
  note        text,
  unique (utilisateur, id) -- pour qu'une course ne pointe que vers l'équipement de son propriétaire
);

-- ----- Courses : à surveiller, prévues ou courues, une seule liste
create table courses (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,

  -- Identité et liens
  nom            text not null,
  evenement      text,
  lieu           text,
  latitude       numeric(8,5),
  longitude      numeric(8,5),
  lien           text,
  inscription    text,
  lien_resultats text,
  description    text check (char_length(description) <= 1000),

  -- Classement (le type se déduit de la sous-catégorie)
  sous_categorie text references sous_categories (id),

  -- Date, heure locale de la course, sans fuseau
  date        date,
  heure       time,
  date_approx boolean not null default false, -- vrai si seul le mois est connu

  -- Profil officiel
  distance numeric(6,3) check (distance > 0), -- km
  dplus    int check (dplus >= 0),            -- m
  dmoins   int check (dmoins >= 0),           -- m

  -- Place dans le plan
  statut         statut_course not null default 'confirmee',
  role           role_course   not null default 'preparatoire',
  etat           etat_course   not null default 'a_venir',
  groupe_options text,

  -- Dossard
  inscrit                boolean not null default false,
  dossard                text,
  prix                   numeric(7,2) check (prix >= 0),
  ouverture_inscriptions date,

  -- Préparation
  objectif   text, -- temps visé ou intention (« Finisher »)
  pourquoi   text, -- rôle dans la préparation
  strategie  text,
  logistique text,

  -- Suivi en course : listes rangées dans la course
  passages          jsonb, -- [{ "distance": 5, "temps": 1560 }, …] (km, secondes)
  chronos_reference jsonb, -- [{ "libelle": "Cible", "temps": 6600 }, …] (secondes)

  -- Résultat officiel (durées en secondes, vitesses en km/h)
  temps              int check (temps > 0),
  dnf                boolean not null default false,
  allure             int check (allure > 0),
  vitesse            numeric(5,2) check (vitesse > 0),
  place              int check (place > 0),
  effectif           int check (effectif > 0),
  place_categorie    int check (place_categorie > 0),
  effectif_categorie int check (effectif_categorie > 0),
  place_sexe         int check (place_sexe > 0),
  effectif_sexe      int check (effectif_sexe > 0),

  -- Données montre
  montre_distance numeric(6,2) check (montre_distance > 0),
  montre_dplus    int check (montre_dplus >= 0),
  montre_temps    int check (montre_temps > 0),
  montre_allure   int check (montre_allure > 0),
  montre_vitesse  numeric(5,2) check (montre_vitesse > 0),
  fc_moyenne      int check (fc_moyenne > 0),

  -- Équipement porté
  chaussures uuid,

  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now(),

  unique (utilisateur, id),
  foreign key (utilisateur, chaussures) references equipements (utilisateur, id) on delete set null (chaussures),
  -- Seule une course confirmée peut être courue ; une course courue a une date et une sous-catégorie
  check (etat <> 'courue' or statut = 'confirmee'),
  check (etat <> 'courue' or (date is not null and sous_categorie is not null)),
  check (passages is null or jsonb_typeof(passages) = 'array'),
  check (chronos_reference is null or jsonb_typeof(chronos_reference) = 'array')
);

create index courses_utilisateur_date on courses (utilisateur, date);

-- ----- Circuits : une course peut appartenir à plusieurs circuits
create table circuits (
  id      text primary key,
  libelle text not null unique,
  lien    text,
  note    text,
  ordre   int  not null
);

create table courses_circuits (
  utilisateur uuid not null default auth.uid(),
  course      uuid not null,
  circuit     text not null references circuits (id),
  categorie   text,                       -- UTMB : catégorie d'index (20K, 50K…)
  stones      int check (stones >= 0),    -- Running Stones rapportées
  primary key (course, circuit),
  foreign key (utilisateur, course) references courses (utilisateur, id) on delete cascade
);

-- Date de dernière modification tenue à jour par la base
create function marquer_modification() returns trigger language plpgsql set search_path = '' as $$
begin
  new.modifie_le := now();
  return new;
end $$;
create trigger courses_modifie_le before update on courses
  for each row execute function marquer_modification();

-- ----- Préférences : une ligne par utilisateur
create table preferences (
  utilisateur       uuid primary key default auth.uid() references profils (id) on delete cascade,
  theme             theme,
  modules           text[],
  course_cap        uuid, -- vide : cap par défaut (la course la plus lointaine)
  palmares_colonnes text[],
  palmares_groupe   boolean not null default true,
  foreign key (utilisateur, course_cap) references courses (utilisateur, id) on delete set null (course_cap)
);

-- ============================================================================
-- Règles par ligne : chacun ne lit et n'écrit que ses propres données
-- ============================================================================
alter table profils          enable row level security;
alter table preferences      enable row level security;
alter table courses          enable row level security;
alter table equipements      enable row level security;
alter table types_course     enable row level security;
alter table sous_categories  enable row level security;
alter table types_equipement enable row level security;
alter table circuits         enable row level security;
alter table courses_circuits enable row level security;

create policy "son profil" on profils for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "ses préférences" on preferences for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses courses" on courses for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses circuits" on courses_circuits for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "son équipement" on equipements for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));

-- Listes de référence : lecture pour tout utilisateur connecté, aucune écriture
-- (l'administrateur les modifie depuis le tableau de bord de Supabase)
create policy "lecture" on types_course     for select to authenticated using (true);
create policy "lecture" on sous_categories  for select to authenticated using (true);
create policy "lecture" on types_equipement for select to authenticated using (true);
create policy "lecture" on circuits         for select to authenticated using (true);

-- ============================================================================
-- Listes de référence (spécification du Palmarès, § 3)
-- ============================================================================
insert into types_course (id, libelle, ordre) values
  ('route', 'Course sur route', 1),
  ('trail', 'Trail', 2),
  ('marche', 'Marche', 3),
  ('fast_hiking', 'Fast hiking', 4),
  ('triathlon', 'Triathlon', 5);

insert into sous_categories (id, type, libelle, ordre, distance_fixe) values
  ('route_5km', 'route', '5 km', 1, true),
  ('route_10km', 'route', '10 km', 2, true),
  ('route_20km', 'route', '20 km', 3, true),
  ('route_semi', 'route', 'Semi-marathon', 4, true),
  ('route_marathon', 'route', 'Marathon', 5, true),
  ('route_ultra', 'route', 'Ultra-marathon', 6, false),
  ('route_100km', 'route', '100 km', 7, true),
  ('route_heure', 'route', 'Course en heure', 8, false),
  ('trail_decouverte', 'trail', 'Trail découverte', 1, false),
  ('trail_court', 'trail', 'Trail court', 2, false),
  ('trail_long', 'trail', 'Trail long', 3, false),
  ('trail_ultra', 'trail', 'Ultra-trail', 4, false),
  ('marche_decouverte', 'marche', 'Marche découverte', 1, false),
  ('marche_longue', 'marche', 'Marche longue', 2, false),
  ('marche_ultra', 'marche', 'Marche ultra', 3, false),
  ('fh_ultra_rando', 'fast_hiking', 'Ultra-randonnée', 1, false),
  ('fh_rando_rapide', 'fast_hiking', 'Randonnée rapide', 2, false),
  ('tri_xs', 'triathlon', 'Triathlon XS', 1, true),
  ('tri_s', 'triathlon', 'Triathlon S', 2, true),
  ('tri_m', 'triathlon', 'Triathlon M', 3, true),
  ('tri_l', 'triathlon', 'Triathlon L', 4, true),
  ('tri_703', 'triathlon', 'Ironman 70.3', 5, true),
  ('tri_xl', 'triathlon', 'Triathlon XL', 6, true),
  ('tri_ironman', 'triathlon', 'Ironman', 7, true);

insert into types_equipement (id, libelle, ordre) values
  ('chaussures', 'Chaussures', 1),
  ('montre', 'Montre', 2),
  ('batons', 'Bâtons', 3),
  ('sac', 'Sac', 4),
  ('frontale', 'Frontale', 5),
  ('vetement', 'Vêtement', 6),
  ('autre', 'Autre', 7);

insert into circuits (id, libelle, lien, note, ordre) values
  ('utmb', 'UTMB', 'https://utmb.world', 'Catégorie d''index (20K, 50K, 100K…) ; Running Stones sur les courses UTMB World Series', 1),
  ('levy', 'Challenge Levy', 'https://chrono-start.com/challenge-levy/', 'Autour de Toulouse, 12 à 15 courses par an ; classé à partir de 5 courses', 2);

-- ============================================================================
-- Partage en lecture seule (évolution 005)
-- ============================================================================
create table partages (
  proprietaire uuid not null default auth.uid() references profils (id) on delete cascade,
  invite       uuid not null references profils (id) on delete cascade,
  cree_le      timestamptz not null default now(),
  primary key (proprietaire, invite),
  check (proprietaire <> invite)
);
alter table partages enable row level security;
-- Le propriétaire crée et retire ; l'invité voit seulement qu'on partage avec lui.
create policy "mes partages" on partages for all to authenticated
  using (proprietaire = (select auth.uid())) with check (proprietaire = (select auth.uid()));
create policy "partagés avec moi" on partages for select to authenticated
  using (invite = (select auth.uid()));

-- Lecture seule des données partagées (aucune écriture : les règles d'écriture restent celles du propriétaire)
create policy "lecture partagée" on courses for select to authenticated
  using (exists (select 1 from partages p where p.proprietaire = courses.utilisateur and p.invite = (select auth.uid())));
create policy "lecture partagée" on courses_circuits for select to authenticated
  using (exists (select 1 from partages p where p.proprietaire = courses_circuits.utilisateur and p.invite = (select auth.uid())));
create policy "lecture partagée" on preferences for select to authenticated
  using (exists (select 1 from partages p where p.proprietaire = preferences.utilisateur and p.invite = (select auth.uid())));

-- Partager par l'e-mail d'un compte existant, sans dévoiler la liste des comptes
create function partager(adresse text) returns void
language plpgsql security definer set search_path = '' as $$
declare cible uuid;
begin
  if (select auth.uid()) is null then raise exception 'Connexion requise'; end if;
  select u.id into cible from auth.users u join public.profils p on p.id = u.id
    where lower(u.email) = lower(trim(adresse));
  if cible is null then raise exception 'Aucun compte avec cette adresse'; end if;
  if cible = (select auth.uid()) then raise exception 'C''est ton propre compte'; end if;
  insert into public.partages (proprietaire, invite) values ((select auth.uid()), cible)
    on conflict do nothing;
end $$;

-- Les personnes avec qui je partage, et celles qui partagent avec moi :
-- prénom, nom et sexe seulement
create function mes_partages() returns table (id uuid, prenom text, nom text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.prenom, p.nom from public.partages s join public.profils p on p.id = s.invite
  where s.proprietaire = (select auth.uid()) order by p.prenom
$$;
create function partages_avec_moi() returns table (id uuid, prenom text, nom text, sexe public.sexe)
language sql stable security definer set search_path = '' as $$
  select p.id, p.prenom, p.nom, p.sexe from public.partages s join public.profils p on p.id = s.proprietaire
  where s.invite = (select auth.uid()) order by p.prenom
$$;

revoke execute on function partager(text), mes_partages(), partages_avec_moi() from public, anon;
grant execute on function partager(text), mes_partages(), partages_avec_moi() to authenticated;
