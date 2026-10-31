-- Évolution 014 · 30 octobre 2026 · thèmes Blanc et orange, Noir et orange, et Automatique
-- À coller une fois dans l'éditeur SQL, avant de choisir l'un de ces thèmes dans les Préférences.
-- 'blanc-orange' : fond blanc (lecture claire) ; 'noir-orange' : fond noir (lecture sombre) ;
-- 'auto' : l'un ou l'autre selon le réglage clair ou sombre de l'appareil.
alter type theme add value if not exists 'blanc-orange';
alter type theme add value if not exists 'noir-orange';
alter type theme add value if not exists 'auto';
