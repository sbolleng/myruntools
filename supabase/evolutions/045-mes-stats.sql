-- Évolution 045 · 21 novembre 2026 · Mes stats (docs/module-stats-specification.md, § 7)
-- Activités importées de l'export Strava (une ligne par activité, jamais la trace elle-même), séances d'origine « import »,
-- analyses de l'IA de la page Mes stats. À coller dans l'éditeur SQL de Supabase ; peut être recollée sans risque.

alter type seance_origine add value if not exists 'import';

create table if not exists activites (
  id          uuid primary key default gen_random_uuid(),
  utilisateur uuid not null default auth.uid() references profils (id) on delete cascade,
  strava_id   text not null check (char_length(strava_id) <= 40),       -- identifiant de l'activité dans l'export
  debut       timestamptz,
  date        date not null,
  pratique    text not null check (pratique in ('course', 'trail', 'tapis', 'marche', 'randonnee')),
  duree_s     integer check (duree_s between 1 and 400000),             -- temps de déplacement
  distance_m  integer check (distance_m between 0 and 2000000),
  denivele_m  integer check (denivele_m between 0 and 50000),
  fc_moyenne  smallint check (fc_moyenne between 30 and 250),
  fc_max      smallint check (fc_max between 30 and 250),
  cadence     smallint check (cadence between 60 and 260),              -- pas par minute (deux jambes)
  meilleurs   jsonb,                                                    -- { "1000": secondes, "5000": …, "21097": … }
  seance      uuid references seances (id) on delete set null,
  importe_le  timestamptz not null default now(),
  unique (utilisateur, strava_id)
);
create index if not exists activites_utilisateur_date on activites (utilisateur, date);

create table if not exists analyses_stats (
  id            uuid primary key default gen_random_uuid(),
  utilisateur   uuid not null default auth.uid() references profils (id) on delete cascade,
  cree          timestamptz not null default now(),
  motif         text not null default 'import' check (motif in ('import', 'actualiser', 'premiere')),
  periode       text check (periode in ('12mois', 'annee', 'tout')),
  texte         text not null check (char_length(texte) <= 1500),
  modele        text check (char_length(modele) <= 60),
  jetons_entree integer not null default 0,
  jetons_sortie integer not null default 0
);
create index if not exists analyses_stats_utilisateur_cree on analyses_stats (utilisateur, cree);

alter table activites      enable row level security;
alter table analyses_stats enable row level security;
drop policy if exists "ses activités" on activites;
create policy "ses activités" on activites for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
drop policy if exists "ses analyses" on analyses_stats;
create policy "ses analyses" on analyses_stats for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
