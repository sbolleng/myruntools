-- Évolution 020 · 5 novembre 2026 · Nutrition dans le menu de tous
-- Les profils qui ont déjà rangé l'ordre de leurs modules (preferences.modules) reçoivent Nutrition juste après Courses à surveiller
-- (à la fin si Courses à surveiller n'y est pas) ; ceux qui l'ont déjà ne changent pas.
-- Les profils qui n'ont rien rangé gardent le menu par défaut (cinq onglets) : ils cochent Nutrition dans les Préférences.
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
