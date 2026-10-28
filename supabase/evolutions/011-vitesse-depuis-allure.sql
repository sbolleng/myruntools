-- Évolution 011 · 28 octobre 2026 · Vitesse tirée de l'allure moyenne
-- La vitesse n'est plus saisie (Palmarès, § 10) : elle vaut 3 600 ÷ allure moyenne (km/h).
-- 1. Une course qui n'a qu'une vitesse reçoit son allure moyenne (secondes par km).
update courses set allure = round(3600 / vitesse)
where allure is null and vitesse > 0;
update courses set montre_allure = round(3600 / montre_vitesse)
where montre_allure is null and montre_vitesse > 0;
-- 2. La vitesse est recalculée depuis l'allure moyenne, partout où elle est connue.
update courses set vitesse = round(3600.0 / allure, 2) where allure > 0;
update courses set montre_vitesse = round(3600.0 / montre_allure, 2) where montre_allure > 0;
