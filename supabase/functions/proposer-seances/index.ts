// ===== Séances proposées par l'IA (Supabase Edge Function « proposer-seances ») =====
//
// docs/module-preparation-specification.md, § 6. Le site envoie le contexte d'un bloc de 4 semaines (trame, repères, courses
// sans leur nom, profil, séances passées) ; la fonction vérifie l'utilisateur connecté, la liste des pilotes et le plafond,
// demande les séances à Claude dans un format imposé, range l'appel dans la table « propositions » et rend la réponse.
// Les garde-fous (jours, durées, récupération, affûtage) sont vérifiés par le site, qui refait une fois la demande (essai 2).
//   POST { bloc: 'AAAA-MM-JJ', essai: 1 | 2, motif?: 'proposer' | 'refaire' | 'readaptation', contexte: {…}, corrections?: ['…'] }
//   Une réadaptation (relancée par un commentaire sur une séance) ne compte pas dans le plafond.
//     → 200 { id, reponse: { recommandation, seances: [{ date, type, libelle, duree_min, distance_km, intensite }] } }
//     → 401 (pas connecté), 403 { code: 'reserve' } (pas pilote), 429 { code: 'plafond', prochaine }, 502 { code: 'ia' | 'refus' }
// Réglages (secrets de la fonction, dans le tableau de bord de Supabase ; jamais dans le dépôt) :
//   ANTHROPIC_API_KEY  la clé de l'API d'Anthropic
//   PILOTES            les identifiants des comptes autorisés, séparés par des virgules (Authentication → Users)
//   MODELE             facultatif, claude-sonnet-5-5 par défaut
// Écrit en JavaScript (valide en TypeScript).
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
const PLAFOND = 4; // propositions par mois civil (essai 1) ; les reprises (essai 2) ne comptent pas, dans la limite d'autant
const repondre = (status, corps) => new Response(JSON.stringify(corps), { status, headers: ENTETES });

// Format imposé de la réponse : une recommandation pour le bloc, puis ses séances.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommandation', 'seances'],
  properties: {
    recommandation: { type: 'string', description: 'La recommandation pour le bloc, en français, trois phrases au plus' },
    seances: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'type', 'libelle', 'duree_min', 'distance_km', 'intensite'],
        properties: {
          date: { type: 'string', description: 'AAAA-MM-JJ' },
          type: { type: 'string', enum: ['run', 'renfo'] },
          libelle: { type: 'string', description: 'Libellé court en français, 100 caractères au plus' },
          duree_min: { type: 'integer' },
          distance_km: { type: 'number', description: '0 pour une séance sans distance (renforcement)' },
          intensite: { type: 'string', enum: ['facile', 'moderee', 'intense'] }
        }
      }
    }
  }
};

const CONSIGNES = `Tu es un entraîneur de course à pied et de trail. Tu proposes les séances d'un bloc de 4 semaines pour un coureur, en français.
Le contexte (JSON) donne : la phase de chaque semaine (base, développement, affûtage, deload, récupération, entretien), calculée par des règles que tu ne changes jamais ; les repères de certains jours ; les courses du bloc (rôle Objectif, Préparatoire ou Plaisir ; format, distance, D+) ; le profil du coureur ; ses séances des 4 dernières semaines.
Règles impératives :
- Une séance seulement les jours disponibles du profil ; aucune séance le jour d'une course ni un jour de repos.
- Chaque séance dure au plus la durée maximale d'une séance du profil ; le total d'une semaine reste sous le maximum par semaine du profil.
- Les jours de récupération : seulement des séances d'intensité facile.
- Les jours allégés : une séance courte et facile au plus.
- Semaines d'affûtage : volume (somme des durées) réduit de 41 à 60 % par rapport à la moyenne des 3 semaines d'avant, intensité et nombre de séances maintenus.
- Semaines de deload : volume nettement réduit. Base : surtout de l'endurance facile. Développement : une à deux séances de qualité par semaine. Entretien : volume stable, une séance de qualité.
- Respecte le nombre de séances de renforcement par semaine du profil ; la sortie longue le jour prévu par le profil.
- Pars du volume récent du coureur et progresse prudemment.
- distance_km : 0 pour une séance de renforcement.
Retours du coureur (ils priment sur le plan prévu) : pour chaque séance passée, le contexte peut donner le ressenti (effort perçu de 1 à 10, échelle de Borg modifiée, et son libellé) et la charge (ressenti × durée en minutes, méthode de Foster), la douleur (aucune, légère, forte, et où), la fatigue du jour (1 à 5), un commentaire et le jour d'origine si elle a été déplacée ; les séances à venir peuvent porter un commentaire (une contrainte, une envie) ; le profil peut donner une blessure en cours. Adapte le bloc en conséquence, toujours dans les règles impératives ; en cas de douleur forte ou de blessure en cours, reste sur des séances faciles et dis-le dans la recommandation, sans avis médical.
Rends une recommandation pour l'ensemble du bloc (trois phrases au plus, sans détailler chaque séance), puis toutes les séances du bloc, dans l'ordre des dates.`;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ENTETES });
  if (req.method !== 'POST') return repondre(405, { message: 'POST seulement' });
  // Utilisateur connecté : son jeton sert aussi à écrire dans « propositions » (règle par ligne).
  const auth = req.headers.get('Authorization') || '';
  const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer /, ''));
  if (!user) return repondre(401, { message: 'connexion requise' });
  const pilotes = String(Deno.env.get('PILOTES') || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!pilotes.includes(user.id)) return repondre(403, { code: 'reserve' });

  let corps;
  try { corps = await req.json(); } catch (e) { return repondre(400, { message: 'corps illisible' }); }
  const essai = corps.essai === 2 ? 2 : 1;
  const motif = ['refaire', 'readaptation'].includes(corps.motif) ? corps.motif : 'proposer';
  if (!/^\d{4}-\d\d-\d\d$/.test(String(corps.bloc || '')) || !corps.contexte) return repondre(400, { message: 'bloc ou contexte manquant' });

  // Plafond du mois civil.
  const now = new Date(), debut = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const prochaine = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const { data: mois, error: e1 } = await sb.from('propositions').select('essai, statut, motif').gte('cree', debut);
  if (e1) return repondre(500, { message: e1.message });
  const horsReadaptation = mois.filter(x => x.motif !== 'readaptation');
  const comptees = horsReadaptation.filter(x => x.essai === 1 && x.statut !== 'echec').length, reprises = horsReadaptation.filter(x => x.essai === 2).length;
  if (motif !== 'readaptation' && ((essai === 1 && comptees >= PLAFOND) || (essai === 2 && reprises >= PLAFOND))) return repondre(429, { code: 'plafond', prochaine });

  // Appel à Claude : format imposé ; repli côté serveur si le modèle décline (fallbacks « default »).
  const modele = Deno.env.get('MODELE') || 'claude-sonnet-5-5';
  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  const demande = 'Contexte du bloc :\n' + JSON.stringify(corps.contexte) +
    (Array.isArray(corps.corrections) && corps.corrections.length ? '\n\nTa proposition précédente ne respectait pas ces règles, corrige-la :\n- ' + corps.corrections.join('\n- ') : '');
  let rep;
  try {
    rep = await client.beta.messages.create({
      model: modele,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: CONSIGNES,
      messages: [{ role: 'user', content: demande }]
    });
  } catch (e) {
    console.error(e);
    return repondre(502, { code: 'ia', message: e && e.message });
  }
  if (rep.stop_reason === 'refusal') return repondre(502, { code: 'refus' });
  const texte = (rep.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  let reponse;
  try { reponse = JSON.parse(texte); } catch (e) { return repondre(502, { code: 'ia', message: 'réponse illisible' }); }

  const { data: ligne, error: e2 } = await sb.from('propositions').insert({
    bloc: corps.bloc, essai, motif, modele: String(rep.model || modele).slice(0, 60),
    jetons_entree: (rep.usage && rep.usage.input_tokens) || 0, jetons_sortie: (rep.usage && rep.usage.output_tokens) || 0, reponse
  }).select('id').single();
  if (e2) return repondre(500, { message: e2.message });
  return repondre(200, { id: ligne.id, reponse });
});
