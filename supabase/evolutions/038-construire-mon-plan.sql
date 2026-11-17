-- Évolution 038 · 17 novembre 2026 · Construire mon plan (Préparation 2.0, § 5.0)
-- Mon profil : le niveau (remplace « Je cours depuis », la colonne anciennete reste mais n'est plus employée),
-- les antécédents de blessures (Santé, donnée de santé : visible de l'utilisateur seul, règle par ligne inchangée),
-- le repère d'allure sur marathon (1:50:00 à 8:00:00).
alter table profil_entrainement
  add column if not exists niveau        text check (niveau in ('debutant', 'intermediaire', 'confirme', 'expert')),
  add column if not exists antecedents   text check (antecedents in ('rares', 'legeres', 'frequentes', 'non_dit')),
  add column if not exists temps_marathon_s integer check (temps_marathon_s between 6600 and 28800);
alter table profil_entrainement drop constraint if exists profil_entrainement_allure_type_check;
alter table profil_entrainement add constraint profil_entrainement_allure_type_check
  check (allure_type in ('vma', '10km', 'semi', 'marathon', 'inconnu'));
