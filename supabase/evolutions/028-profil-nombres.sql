-- Évolution 028 · 9 novembre 2026 · Profil d'entraînement : sorties par semaine de 0 à 7 (spécification Préparation, § 5.2)
-- Le nombre de sorties et le nombre de renforcements se saisissent comme un chiffre de 0 à 7.
alter table profil_entrainement drop constraint if exists profil_entrainement_nb_sorties_check;
alter table profil_entrainement add constraint profil_entrainement_nb_sorties_check check (nb_sorties between 0 and 7);
