-- Évolution 032 · 10 novembre 2026 · Calendrier après Préparation dans le menu de tous
-- Remplace l'ordre posé par l'évolution 031 : En un coup d'œil, Plan & objectifs (clé « Objectif »), Préparation, Calendrier,
-- Nutrition, Courses (clé « Courses à surveiller »), Palmarès. Les autres préférences ne changent pas ; ceux qui n'ont pas
-- encore de ligne de préférences en reçoivent une.
insert into preferences (utilisateur, modules)
select id, array['En un coup d''œil', 'Objectif', 'Préparation', 'Calendrier', 'Nutrition', 'Courses à surveiller', 'Palmarès']
from profils
on conflict (utilisateur) do update set modules = excluded.modules;
