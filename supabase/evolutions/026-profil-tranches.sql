-- Évolution 026 · 9 novembre 2026 · Profil d'entraînement en tranches et semaine type (spécification Préparation, § 5.2)
-- Les nombres approximatifs deviennent des tranches à choisir ; jours possibles, jour de la sortie longue et nombre de
-- renforcements deviennent une semaine type (une activité par jour, du lundi au dimanche). Les anciennes colonnes restent,
-- mais le site ne les emploie plus. Le profil déjà saisi est converti ci-dessous (ce qui ne se convertit pas reste à renseigner).
alter table profil_entrainement
  add column anciennete     text check (anciennete in ('debut', '1-3', '3-6', '6-10', '10+')),
  add column volume_tranche text check (volume_tranche in ('inconnu', '0-20', '20-40', '40-60', '60-80', '80+')),
  add column sortie_tranche text check (sortie_tranche in ('-1h', '1h-1h30', '1h30-2h', '2-3h', '3h+')),
  add column semaine_type   text[] check (cardinality(semaine_type) = 7 and semaine_type <@ array['repos', 'course', 'longue', 'renfo']),
  add column allure_type    text check (allure_type in ('vma', '10km', 'semi', 'inconnu')),
  add column terrain        text check (terrain in ('plat', 'cotes', 'vallonne', 'montagne')),
  add column renfo_niveau   text check (renfo_niveau in ('debutant', 'intermediaire', 'confirme', 'expert'));
-- Durée maximale d'une séance : 45, 60, 90 ou 120 minutes ; 1 440 : sans limite.

-- Conversion du profil déjà saisi.
update profil_entrainement set
  anciennete = case when annees is null then null when annees < 1 then 'debut' when annees < 3 then '1-3' when annees < 6 then '3-6' when annees < 10 then '6-10' else '10+' end,
  volume_tranche = case when volume is null or volume_unite <> 'km' then null when volume < 20 then '0-20' when volume < 40 then '20-40' when volume < 60 then '40-60' when volume < 80 then '60-80' else '80+' end,
  sortie_tranche = case when sortie_longue is null or sortie_longue_unite <> 'h' then null when sortie_longue < 1 then '-1h' when sortie_longue < 1.5 then '1h-1h30' when sortie_longue < 2 then '1h30-2h' when sortie_longue <= 3 then '2-3h' else '3h+' end,
  semaine_type = case when jours is null or cardinality(jours) = 0 then null else
    array(select case when d = jour_long then 'longue' when d = any(jours) then 'course' else 'repos' end from generate_series(1, 7) as d order by d) end,
  allure_type = case when vma is not null then 'vma' when temps_10km_s is not null then '10km' when temps_semi_s is not null then 'semi' else null end;
