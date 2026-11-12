-- Évolution 035 · 12 novembre 2026 · Motif d'une proposition de l'IA (Mon plan, lot 6b)
-- Proposer (le bouton), Refaire, ou Réadaptation (relancée par un commentaire sur une séance) ; les réadaptations ne comptent
-- pas dans le plafond du mois. Les propositions déjà rangées sont des « proposer ».
alter table propositions
  add column motif text not null default 'proposer' check (motif in ('proposer', 'refaire', 'readaptation'));
