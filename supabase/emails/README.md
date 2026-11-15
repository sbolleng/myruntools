# E-mails de connexion

Modèles des e-mails envoyés par Supabase (Authentication → Emails), au gabarit commun du [document de design](../../docs/design.md) (« E-mails ») ; textes : [spécification générale](../../docs/specification-generale.md), § 3. À coller dans le tableau de bord, corps en HTML (« Source »), l'objet à part.

| Fichier | Modèle Supabase | Objet |
| --- | --- | --- |
| `confirmer-inscription.html` | Confirm signup | Confirmez votre adresse MyRunTools |
| `reinitialiser-mot-de-passe.html` | Reset password | Réinitialisation de votre mot de passe MyRunTools |

`{{ .ConfirmationURL }}` est remplacé par Supabase par le lien de l'e-mail : à garder tel quel.
