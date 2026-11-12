-- Évolution 033 · 12 novembre 2026 · Mon profil
-- 1. Une seule VMA et une seule FC max : celles rangées avec le niveau (profil_entrainement), qui servent déjà à l'IA.
--    Celles de profils (jamais saisies par le site) y sont reprises quand elles manquent et restent dans les bornes, puis supprimées.
insert into profil_entrainement (utilisateur, vma, fc_max)
select id,
       case when vma between 8 and 30 then vma end,
       case when fc_max between 100 and 230 then fc_max end
from profils
where (vma between 8 and 30) or (fc_max between 100 and 230)
on conflict (utilisateur) do update set
  vma = coalesce(profil_entrainement.vma, excluded.vma),
  fc_max = coalesce(profil_entrainement.fc_max, excluded.fc_max);
alter table profils drop column vma, drop column fc_max;

-- 2. Mon profil entre au menu de tous (sixième onglet, après Palmarès), là où il n'y est pas déjà.
update preferences set modules = array_append(modules, 'Profil')
where modules is not null and not ('Profil' = any(modules));
