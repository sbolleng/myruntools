-- Évolution 025 · 9 novembre 2026 · Propositions de séances par l'IA (spécification Préparation, § 6 et 7)
-- Une ligne par appel à l'IA, écrite par la fonction « proposer-seances » avec le jeton de l'utilisateur (règle par ligne) :
-- le bloc de 4 semaines (son lundi), l'essai (1 : une proposition, comptée dans le plafond ; 2 : la reprise automatique
-- après un garde-fou), le modèle et les jetons consommés, la réponse, et son statut :
--   brute (en attente de validation), invalide (refaite par l'essai 2), echec (deux essais refusés : non comptée),
--   acceptee, abandonnee.
create table propositions (
  id            uuid primary key default gen_random_uuid(),
  utilisateur   uuid not null default auth.uid() references profils (id) on delete cascade,
  cree          timestamptz not null default now(),
  bloc          date not null,
  essai         smallint not null check (essai in (1, 2)),
  modele        text not null check (char_length(modele) <= 60),
  jetons_entree integer not null default 0,
  jetons_sortie integer not null default 0,
  statut        text not null default 'brute' check (statut in ('brute', 'invalide', 'echec', 'acceptee', 'abandonnee')),
  reponse       jsonb
);
create index propositions_utilisateur_cree on propositions (utilisateur, cree);

alter table propositions enable row level security;
create policy "ses propositions" on propositions for all to authenticated
  using (utilisateur = (select auth.uid())) with check (utilisateur = (select auth.uid()));
