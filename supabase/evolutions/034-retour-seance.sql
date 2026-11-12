-- Évolution 034 · 12 novembre 2026 · Retour sur une séance (Mon plan, lot 6a)
-- Une séance faite reçoit son ressenti (effort perçu de 1 à 10), la douleur (aucune, légère, forte, et où), la fatigue du jour
-- (1 à 5) et un commentaire ; une séance déplacée garde son jour d'origine (date_prevue). Mon profil : la blessure en cours.
-- Données de santé : visibles du seul utilisateur (règles par ligne de seances et profil_entrainement, inchangées).
alter table seances
  add column ressenti    smallint check (ressenti between 1 and 10),
  add column douleur     text check (douleur in ('aucune', 'legere', 'forte')),
  add column douleur_ou  text check (char_length(douleur_ou) <= 100),
  add column fatigue     smallint check (fatigue between 1 and 5),
  add column commentaire text check (char_length(commentaire) <= 300),
  add column date_prevue date;
alter table profil_entrainement
  add column blessure       text check (char_length(blessure) <= 300),
  add column blessure_debut date;
