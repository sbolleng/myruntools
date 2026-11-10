-- Évolution 031 · 10 novembre 2026 · Menu de tous rangé dans un même ordre
-- Pour tous les utilisateurs (ceux qui n'ont pas encore de ligne de préférences en reçoivent une) :
-- En un coup d'œil, Plan & objectifs (clé « Objectif »), Calendrier, Préparation, Nutrition, À surveiller
-- (clé « Courses à surveiller »), Palmarès. Les clés sont les noms de modules rangés ; les libellés s'affichent d'après le site.
-- Les autres préférences (thème, colonnes du Palmarès…) ne changent pas. Retirer 'Calendrier' de la liste pour le sortir du menu.
insert into preferences (utilisateur, modules)
select id, array['En un coup d''œil', 'Objectif', 'Calendrier', 'Préparation', 'Nutrition', 'Courses à surveiller', 'Palmarès']
from profils
on conflict (utilisateur) do update set modules = excluded.modules;
