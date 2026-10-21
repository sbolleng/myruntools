-- Évolution 001 · 21 octobre 2026 · thèmes nommés par leurs couleurs
-- À coller une fois dans l'éditeur SQL d'une base créée avant ce changement.
-- Les lignes existantes suivent le renommage d'elles-mêmes.
alter type theme rename value 'trail' to 'bleu-orange';
alter type theme rename value 'route' to 'vert-rose';
alter type theme rename value 'test'  to 'violet-turquoise';
