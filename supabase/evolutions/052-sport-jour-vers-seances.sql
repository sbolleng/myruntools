-- Évolution 052 · 27 novembre 2026 · Les « autres sports » de Nutrition deviennent des séances du Calendrier (faites)
-- À coller APRÈS la 051 (dans une requête séparée). Vélo, natation, marche et crossfit saisis dans sport_jour deviennent des séances faites,
-- puis quittent sport_jour. Durée = heures × 60. Intensité : vélo promenade facile, 19 à 22 km/h modérée, 22 à 26 km/h intense ;
-- natation récréative facile, natation modérée à élevée intense ; la marche n'a pas d'intensité.
-- Ne doit être collée qu'une fois : les lignes déplacées sont supprimées de sport_jour, une seconde collée ne trouve plus rien.

insert into seances (utilisateur, date, type, libelle, duree_min, intensite, faite, origine, etat)
select utilisateur, date,
  (case when type in ('v1', 'v2', 'v3') then 'velo' when type in ('n1', 'n2') then 'natation' when type in ('m', 'm55') then 'marche' else 'crossfit' end)::seance_type,
  case when type in ('v1', 'v2', 'v3') then 'Vélo' when type in ('n1', 'n2') then 'Natation' when type in ('m', 'm55') then 'Marche' else 'Crossfit' end,
  greatest(1, round(heures * 60))::integer,
  (case type when 'v1' then 'facile' when 'v2' then 'moderee' when 'v3' then 'intense' when 'n1' then 'facile' when 'n2' then 'intense' end)::seance_intensite,
  true, 'saisie', 'acceptee'
from sport_jour
where type in ('v1', 'v2', 'v3', 'n1', 'n2', 'm', 'm55', 'crossfit');

delete from sport_jour where type in ('v1', 'v2', 'v3', 'n1', 'n2', 'm', 'm55', 'crossfit');
