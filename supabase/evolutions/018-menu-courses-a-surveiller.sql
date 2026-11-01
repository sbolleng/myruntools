-- Évolution 018 · 1er novembre 2026 · Courses à surveiller dans le menu de tous
-- Les profils qui ont déjà rangé l'ordre de leurs modules (preferences.modules) reçoivent le nouveau module juste après Calendrier
-- (à la fin si Calendrier n'y est pas) ; ceux qui n'ont rien rangé le voient d'office (catalogue du site).
update preferences
set modules = case
  when 'Calendrier' = any(modules) then
    (select array_agg(m order by o) from (
      select m, o from unnest(modules) with ordinality as t(m, o)
      union all
      select 'Courses à surveiller', (array_position(modules, 'Calendrier')) + 0.5
    ) x)
  else array_append(modules, 'Courses à surveiller')
end
where modules is not null and cardinality(modules) > 0 and not ('Courses à surveiller' = any(modules));
