-- Évolution 016 · 1er novembre 2026 · tracé GPX d'une course (Objectif, § 3.4, n° 25 à 28 et 32)
-- À coller une fois dans l'éditeur SQL, avant d'importer un premier GPX.
-- Le fichier est rangé dans le stockage Supabase, espace privé « traces », dossier de son propriétaire :
-- traces/<utilisateur>/<course>.gpx ; la course garde le chemin (courses.gpx).

alter table courses add column if not exists gpx text;

-- Espace de stockage privé, 5 Mo par fichier.
insert into storage.buckets (id, name, public, file_size_limit)
values ('traces', 'traces', false, 5242880)
on conflict (id) do nothing;

-- Chacun lit, écrit et efface les fichiers de son dossier.
drop policy if exists "traces : les miennes" on storage.objects;
create policy "traces : les miennes" on storage.objects for all to authenticated
  using (bucket_id = 'traces' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'traces' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Lecture seule pour ceux avec qui le site est partagé.
drop policy if exists "traces : partagées avec moi" on storage.objects;
create policy "traces : partagées avec moi" on storage.objects for select to authenticated
  using (bucket_id = 'traces' and exists (select 1 from public.partages p
    where p.proprietaire::text = (storage.foldername(name))[1] and p.invite = (select auth.uid())));
