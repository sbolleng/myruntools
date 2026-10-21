-- Évolution 005 · 21 octobre 2026 · partage en lecture seule (modèle de données 0.5)
-- Un utilisateur partage son site avec un autre : celui-ci lit ses courses,
-- circuits et préférences, et de son profil le seul prénom, nom et sexe.
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
