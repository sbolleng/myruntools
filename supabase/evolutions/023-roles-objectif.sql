-- Évolution 023 · 8 novembre 2026 · Trois rôles de course : Objectif, Préparatoire, Plaisir
-- Spécification Préparation, § 3.1 : le rôle « objectif intermédiaire » disparaît ; ses courses deviennent des Objectifs.
-- La valeur reste dans le type role_course (PostgreSQL ne retire pas une valeur d'un type énuméré), mais le site ne la propose plus
-- et l'affiche comme un Objectif.
update courses set role = 'objectif' where role = 'objectif_intermediaire';
