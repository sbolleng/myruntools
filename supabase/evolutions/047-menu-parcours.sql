-- Évolution 047 · 23 novembre 2026 · Menu rangé selon le parcours du coureur
-- Nouvel ordre : En un coup d'œil, Courses à surveiller (« Les courses »), Objectif (« Ma saison »), Préparation (« Mon plan »),
-- Calendrier, Nutrition (« Ma nutrition »), Palmarès (« Mon palmarès »), Stats (« Mes stats »), Profil (« Mon profil »).
-- Les clés rangées ne changent pas (seuls les libellés affichés changent). Chacun garde les modules qu'il avait au menu
-- (Mon plan, Ma nutrition et Mes stats restent facultatifs) ; « Cette semaine » (jamais construit, fondu dans En un coup d'œil) disparaît.
-- Les autres préférences ne changent pas ; une liste vide ou absente reste telle quelle (le site prend alors les modules par défaut).
update preferences p
set modules = array(
  select m
  from unnest(array['En un coup d''œil', 'Courses à surveiller', 'Objectif', 'Préparation', 'Calendrier', 'Nutrition', 'Palmarès', 'Stats', 'Profil']) with ordinality as o(m, n)
  where m = any(p.modules)
  order by n
)
where p.modules is not null and cardinality(p.modules) > 0;
