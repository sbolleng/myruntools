-- Évolution 015 · 12 novembre 2026 · Nouveau compte
-- À chaque compte créé (inscription sur le site ou ajout à la main dans le tableau de bord),
-- la base crée son profil et ses préférences. Le prénom et le nom viennent des métadonnées
-- du compte (« prenom », « nom ») ; absents, ils restent vides, à compléter dans Mon profil.
-- Les préférences restent vides : thème, menu et page de démarrage prennent leurs valeurs par défaut.
-- Passée après la 033 : le numéro 015 lui était réservé depuis le 31 octobre.

create or replace function public.creer_profil_nouveau_compte() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profils (id, prenom, nom)
  values (
    new.id,
    left(coalesce(trim(new.raw_user_meta_data ->> 'prenom'), ''), 60),
    left(coalesce(trim(new.raw_user_meta_data ->> 'nom'), ''), 60)
  )
  on conflict (id) do nothing;
  insert into public.preferences (utilisateur) values (new.id)
  on conflict (utilisateur) do nothing;
  return new;
end $$;

-- Réservée au déclencheur : personne ne l'appelle depuis le site.
revoke execute on function public.creer_profil_nouveau_compte() from public, anon, authenticated;

drop trigger if exists nouveau_compte on auth.users;
create trigger nouveau_compte after insert on auth.users
  for each row execute function public.creer_profil_nouveau_compte();

-- Rattrapage : un compte déjà créé sans profil ou sans préférences les reçoit maintenant.
insert into public.profils (id, prenom, nom)
select u.id,
       left(coalesce(trim(u.raw_user_meta_data ->> 'prenom'), ''), 60),
       left(coalesce(trim(u.raw_user_meta_data ->> 'nom'), ''), 60)
from auth.users u
where not exists (select 1 from public.profils p where p.id = u.id);

insert into public.preferences (utilisateur)
select p.id from public.profils p
where not exists (select 1 from public.preferences f where f.utilisateur = p.id);
