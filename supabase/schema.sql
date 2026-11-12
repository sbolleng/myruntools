-- ============================================================================
-- MyRunTools · création de la base (modèle de données 0.3, docs/modele-donnees.md)
--
-- À coller une seule fois dans l'éditeur SQL de Supabase (SQL Editor), puis
-- « Run ». Aucun secret ni aucune donnée personnelle dans ce fichier : seules
-- les listes de référence y sont remplies.
-- ============================================================================

-- ----- Listes fermées : le fonctionnement en dépend, la base refuse le reste
create type statut_course as enum ('a_surveiller', 'option', 'confirmee');
create type role_course   as enum ('preparatoire', 'plaisir', 'objectif_intermediaire', 'objectif'); -- objectif_intermediaire : plus employé (évolution 023)
create type etat_course   as enum ('a_venir', 'abandonnee', 'courue');
create type theme         as enum ('bleu-orange', 'vert-rose', 'violet-turquoise', 'blanc-orange', 'noir-orange', 'auto');
create type sexe          as enum ('femme', 'homme', 'non_precise');
create type phase_plan    as enum ('base', 'developpement', 'affutage', 'deload');
create type seance_type   as enum ('run', 'renfo');
create type seance_intensite as enum ('facile', 'moderee', 'intense');
create type seance_origine   as enum ('saisie', 'ia');
create type seance_etat      as enum ('proposee', 'acceptee');
create type activite      as enum ('sedentaire', 'peu', 'actif', 'tres');
create type repas         as enum ('petit_dej', 'midi', 'encas', 'soir');

-- ----- Listes de référence : des données, modifiées par l'administrateur seul
create table types_course (
  id      text primary key,
  libelle text not null unique,
  ordre   int  not null
);

create table formats (
  id            text primary key,
  type          text not null references types_course (id),
  libelle       text not null,
  ordre         int  not null,
  distance_fixe boolean not null default false, -- les seules qui ont un record
  prepa_semaines int check (prepa_semaines between 1 and 52), -- durée de préparation par défaut
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
  vo2max    numeric(4,1) check (vo2max > 0),    -- ml/kg/min
  activite  activite,                           -- niveau d'activité hors sport (Nutrition)
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
  course         text not null, -- ex. Forez Trails
  parcours       text,          -- ex. L'Olmetoise (facultatif)
  lieu           text,
  latitude       numeric(8,5),
  longitude      numeric(8,5),
  lien           text,
  inscription    text,
  lien_resultats text,
  description    text check (char_length(description) <= 1000),
  gpx            text,          -- chemin du tracé dans le stockage : traces/<utilisateur>/<course>.gpx (évolution 016)

  -- Classement (le type se déduit du format)
  format         text references formats (id),

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
  ouverture_heure        time,                       -- heure locale d'ouverture, facultative (évolution 017)
  ouverture_approx       boolean not null default false, -- vrai si seul le mois d'ouverture est connu (date rangée au 1er du mois)

  -- Préparation
  objectif   text, -- normé : temps visé (« 02:45:00 »), « Finisher » ou « Sub 3h » / « Sub 45 min »
  objectif_precisions text check (char_length(objectif_precisions) <= 100), -- texte libre qui accompagne l'objectif
  pourquoi   text, -- rôle dans la préparation
  strategie  text,
  logistique text,

  -- Préparation du Calendrier : durée en semaines, vide = celle du format
  prepa_semaines int check (prepa_semaines between 1 and 52),

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
  categorie          text check (categorie in ('CA', 'JU', 'ES', 'SE', 'M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10')), -- catégorie d'âge FFA (évolution 012)
  place_categorie    int check (place_categorie > 0),
  effectif_categorie int check (effectif_categorie > 0),
  place_sexe         int check (place_sexe > 0),
  effectif_sexe      int check (effectif_sexe > 0),

  -- Données montre
  montre_distance numeric(6,2) check (montre_distance > 0),
  montre_dplus    int check (montre_dplus >= 0),
  montre_dmoins   int check (montre_dmoins >= 0), -- évolution 013
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
  -- Seule une course confirmée peut être courue ; une course courue a une date et un format
  check (etat <> 'courue' or statut = 'confirmee'),
  check (etat <> 'courue' or (date is not null and format is not null)),
  check (passages is null or jsonb_typeof(passages) = 'array'),
  check (chronos_reference is null or jsonb_typeof(chronos_reference) = 'array')
);

create index courses_utilisateur_date on courses (utilisateur, date);

-- ----- Calendrier : phases modifiées à la main, séances (évolution 009)
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
  duree_min   integer check (duree_min between 1 and 1440),
  distance_km numeric(5,1) check (distance_km > 0 and distance_km < 1000),
  intensite   seance_intensite,
  origine     seance_origine not null default 'saisie',
  etat        seance_etat not null default 'acceptee',
  foreign key (utilisateur, course) references courses (utilisateur, id) on delete set null (course)
);
create index seances_utilisateur_date on seances (utilisateur, date);

-- ----- Préparation : propositions de séances par l'IA, une ligne par appel (évolution 025)
create table propositions (
  id            uuid primary key default gen_random_uuid(),
  utilisateur   uuid not null default auth.uid() references profils (id) on delete cascade,
  cree          timestamptz not null default now(),
  bloc          date not null,
  essai         smallint not null check (essai in (1, 2)),
  modele        text not null check (char_length(modele) <= 60),
  jetons_entree integer not null default 0,
  jetons_sortie integer not null default 0,
  statut        text not null default 'brute' check (statut in ('brute', 'invalide', 'echec', 'acceptee', 'abandonnee')),
  reponse       jsonb
);
create index propositions_utilisateur_cree on propositions (utilisateur, cree);

-- ----- Préparation : profil d'entraînement, une ligne par utilisateur (évolution 024)
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
  maj                timestamptz not null default now(),
  -- Évolution 026 : tranches et semaine type (les colonnes annees … moyens au-dessus ne sont plus employées par le site).
  anciennete     text check (anciennete in ('debut', '1-3', '3-6', '6-10', '10+')),
  volume_tranche text check (volume_tranche in ('inconnu', '0-20', '20-40', '40-60', '60-80', '80+')),
  sortie_tranche text check (sortie_tranche in ('-1h', '1h-1h30', '1h30-2h', '2-3h', '3h+')),
  semaine_type   text[] check (cardinality(semaine_type) = 7 and semaine_type <@ array['repos', 'course', 'longue', 'renfo']),
  allure_type    text check (allure_type in ('vma', '10km', 'semi', 'inconnu')),
  terrain        text check (terrain in ('plat', 'cotes', 'vallonne', 'montagne')),
  renfo_niveau   text check (renfo_niveau in ('debutant', 'intermediaire', 'confirme', 'expert')),
  -- Évolution 027 : jours possibles et nombre de séances (semaine_type n'est plus employée ; jour_long : la sortie longue, vide : peu importe).
  jours_course smallint[] check (jours_course <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  jours_renfo  smallint[] check (jours_renfo <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  nb_sorties   smallint check (nb_sorties between 0 and 7),
  nb_renfo     smallint check (nb_renfo between 0 and 7)
);

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

-- Sport du jour (évolution 022) : une ligne par sport et par jour
create table sport_jour (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  date        date not null,
  type        text not null check (char_length(type) between 1 and 20),
  heures      numeric(4,2) not null check (heures > 0 and heures <= 24)
);
create index sport_jour_utilisateur_date on sport_jour (utilisateur, date);

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
  page_demarrage    text check (page_demarrage ~ '^[a-z-]+\.html$'), -- vide : l'Accueil (index.html)
  accueil_blocs     text[], -- blocs de l'Accueil, dans l'ordre ; vide : les blocs par défaut
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
alter table formats          enable row level security;
alter table types_equipement enable row level security;
alter table circuits         enable row level security;
alter table courses_circuits enable row level security;
alter table plan_semaines    enable row level security;
alter table seances          enable row level security;
alter table profil_entrainement enable row level security;
alter table propositions enable row level security;
alter table aliments         enable row level security;
alter table repas_lignes     enable row level security;
alter table sport_jour       enable row level security;

create policy "son profil" on profils for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "ses préférences" on preferences for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses courses" on courses for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses circuits" on courses_circuits for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "son plan" on plan_semaines for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses séances" on seances for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "son profil d'entraînement" on profil_entrainement for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses propositions" on propositions for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses aliments" on aliments for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "ses repas" on repas_lignes for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "son sport" on sport_jour for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
create policy "son équipement" on equipements for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));

-- Listes de référence : lecture pour tout utilisateur connecté, aucune écriture
-- (l'administrateur les modifie depuis le tableau de bord de Supabase)
create policy "lecture" on types_course     for select to authenticated using (true);
create policy "lecture" on formats          for select to authenticated using (true);
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

insert into formats (id, type, libelle, ordre, distance_fixe, prepa_semaines) values
  ('route_5km', 'route', '5 km', 1, true, 8),
  ('route_10km', 'route', '10 km', 2, true, 8),
  ('route_20km', 'route', '20 km', 3, true, 10),
  ('route_semi', 'route', 'Semi-marathon', 4, true, 10),
  ('route_marathon', 'route', 'Marathon', 5, true, 16),
  ('route_ultra', 'route', 'Ultra-marathon', 6, false, 16),
  ('route_100km', 'route', '100 km', 7, true, 16),
  ('route_heure', 'route', 'Course en heure', 8, false, null),
  ('trail_decouverte', 'trail', 'Trail découverte', 1, false, null),
  ('trail_court', 'trail', 'Trail court', 2, false, 12),
  ('trail_long', 'trail', 'Trail long', 3, false, 16),
  ('trail_ultra', 'trail', 'Ultra-trail', 4, false, 16),
  ('marche_decouverte', 'marche', 'Marche découverte', 1, false, null),
  ('marche_longue', 'marche', 'Marche longue', 2, false, null),
  ('marche_ultra', 'marche', 'Marche ultra', 3, false, null),
  ('fh_ultra_rando', 'fast_hiking', 'Ultra-randonnée', 1, false, null),
  ('fh_rando_rapide', 'fast_hiking', 'Randonnée rapide', 2, false, null),
  ('tri_xs', 'triathlon', 'Triathlon XS', 1, true, null),
  ('tri_s', 'triathlon', 'Triathlon S', 2, true, null),
  ('tri_m', 'triathlon', 'Triathlon M', 3, true, null),
  ('tri_l', 'triathlon', 'Triathlon L', 4, true, null),
  ('tri_703', 'triathlon', 'Ironman 70.3', 5, true, null),
  ('tri_xl', 'triathlon', 'Triathlon XL', 6, true, null),
  ('tri_ironman', 'triathlon', 'Ironman', 7, true, null);

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
create policy "lecture partagée" on plan_semaines for select to authenticated
  using (exists (select 1 from partages p where p.proprietaire = plan_semaines.utilisateur and p.invite = (select auth.uid())));
create policy "lecture partagée" on seances for select to authenticated
  using (exists (select 1 from partages p where p.proprietaire = seances.utilisateur and p.invite = (select auth.uid())));

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

-- ===== Stockage : tracés GPX (évolution 016) =====
insert into storage.buckets (id, name, public, file_size_limit)
values ('traces', 'traces', false, 5242880)
on conflict (id) do nothing;
create policy "traces : les miennes" on storage.objects for all to authenticated
  using (bucket_id = 'traces' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'traces' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "traces : partagées avec moi" on storage.objects for select to authenticated
  using (bucket_id = 'traces' and exists (select 1 from public.partages p
    where p.proprietaire::text = (storage.foldername(name))[1] and p.invite = (select auth.uid())));
