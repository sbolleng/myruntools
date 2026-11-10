-- Évolution 030 · 10 novembre 2026 · Course à pied et renforcement : une seule source, les séances du Calendrier
-- Le sport du jour déjà saisi dans Nutrition en course (jogging, cross, jogging / marche) ou en musculation devient une
-- séance du Calendrier (faite), puis quitte sport_jour. Les autres sports (vélo, natation, marche, crossfit) restent dans
-- sport_jour. Distance : vitesse du sport × durée, quand la vitesse est connue (jogging à 8, 9,5, 13 km/h).
insert into seances (utilisateur, date, type, libelle, duree_min, distance_km, faite, origine, etat)
select utilisateur, date,
  (case when type = 'muscu' then 'renfo' else 'run' end)::seance_type,
  case when type = 'muscu' then 'Renforcement' else 'Course à pied' end,
  greatest(1, round(heures * 60))::integer,
  case type when 'j8' then round(8 * heures, 1) when 'j95' then round(9.5 * heures, 1) when 'j13' then round(13 * heures, 1) end,
  true, 'saisie', 'acceptee'
from sport_jour
where type in ('j8', 'j95', 'j13', 'cross', 'jm', 'muscu');

delete from sport_jour where type in ('j8', 'j95', 'j13', 'cross', 'jm', 'muscu');
