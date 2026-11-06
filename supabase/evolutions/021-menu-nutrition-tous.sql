-- Évolution 021 · 6 novembre 2026 · Nutrition dans le menu de tous les profils
-- 1. Menus déjà rangés : Nutrition juste après Courses à surveiller (à la fin si Courses à surveiller n'y est pas) ;
--    ceux qui l'ont déjà ne changent pas (même règle que l'évolution 020).
-- 2. Menus jamais rangés : le menu par défaut, Nutrition comprise. Ces profils gardent cet ordre : ils ne suivront plus
--    d'eux-mêmes les changements du menu par défaut.
update preferences
set modules = case
  when 'Courses à surveiller' = any(modules) then
    (select array_agg(m order by o) from (
      select m, o from unnest(modules) with ordinality as t(m, o)
      union all
      select 'Nutrition', (array_position(modules, 'Courses à surveiller')) + 0.5
    ) x)
  else array_append(modules, 'Nutrition')
end
where modules is not null and cardinality(modules) > 0 and not ('Nutrition' = any(modules));

update preferences
set modules = array['En un coup d''œil', 'Cette semaine', 'Objectif', 'Calendrier', 'Courses à surveiller', 'Nutrition', 'Palmarès', 'Profil', 'Guide']
where modules is null or cardinality(modules) = 0;
