// ===== Stratégie de course proposée par l'IA (Supabase Edge Function « proposer-strategie ») =====
//
// docs/module-objectif-specification.md, § 3.10. Le site envoie le contexte d'une course à venir, sans son nom ni son lieu :
// la course (format, distance, D+, heure, objectif, ravitaillements, tracé en tronçons), le profil du coureur, ses courses
// comparables du Palmarès, son entraînement des 12 dernières semaines et ses aliments favoris. La fonction vérifie
// l'utilisateur connecté et la liste des pilotes, demande la stratégie à Claude dans un format imposé et la rend ; rien n'est rangé.
//   POST { contexte: {…} }
//     → 200 { strategie: 'texte', boire_manger: 'texte' }
//     → 401 (pas connecté), 403 { code: 'reserve' } (pas pilote), 502 { code: 'ia' | 'refus' }
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
const MAX = { strategie: 1600, boire_manger: 900 };
const borner = (t, max) => {
  t = String(t || '').trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max), fin = Math.max(coupe.lastIndexOf('. '), coupe.lastIndexOf('.\n'), coupe.lastIndexOf('!'), coupe.lastIndexOf('?'));
  return fin > max * 0.5 ? coupe.slice(0, fin + 1) : coupe.slice(0, max - 1).trimEnd() + '…';
};
const repondre = (status, corps) => new Response(JSON.stringify(corps), { status, headers: ENTETES });

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['strategie', 'boire_manger'],
  properties: {
    strategie: { type: 'string', description: 'La stratégie à adopter, en français, 1 600 caractères au plus, paragraphes courts ou lignes commençant par « - », sans titre' },
    boire_manger: { type: 'string', description: 'Quoi boire et manger, en français, 900 caractères au plus, paragraphes courts ou lignes commençant par « - », sans titre' }
  }
};

const CONSIGNES = `Tu es un entraîneur de course à pied et de trail. Tu proposes à un coureur la stratégie de sa prochaine course, en français, en le tutoyant.
Le contexte (JSON) donne : la course (date, heure de départ, type, format, distance, D+, D−, objectif et ses précisions, rôle dans la saison, kilomètres des ravitaillements, et avec un tracé : altitude, D+, D− et pente de chaque kilomètre, montées et descentes de plus de 100 m) ; le profil du coureur (sexe, âge, poids, niveau, ancienneté, volume, repère d'allure ou VMA, FC max et de repos, terrain, points fragiles, blessure en cours) ; ses courses comparables (temps en secondes, allure en minutes décimales par km) ; son entraînement des 12 dernières semaines ; ses aliments favoris.
Règles :
- N'utilise que les chiffres du contexte ou ceux que tu en déduis par un calcul simple ; n'invente ni ravitaillement, ni montée, ni record, ni temps. Une donnée absente, tu t'en passes sans la supposer ; si elle manque vraiment (pas de tracé, pas de ravitaillement), dis-le en une phrase.
- Deux parties. « strategie », la plus développée : le départ, puis la course par tronçons (sur route : allure en min:s par km et temps de passage ; en trail : effort, allure-effort, temps de passage aux ravitaillements quand ils sont connus), la gestion des montées (quand marcher, d'après la pente et le niveau) et des descentes, le moment de relancer, la fin de course ; dis simplement si l'objectif te paraît réaliste au vu du Palmarès, du repère d'allure et de l'entraînement. « boire_manger » : glucides en g par heure et eau en ml par heure, puis quoi et quand, aux ravitaillements et entre eux.
- Repères pour boire et manger (positions de référence) : en dessous d'une heure de course, pas besoin de glucides ; de 1 h à 2 h 30, 30 à 60 g de glucides par heure ; au-delà de 2 h 30, jusqu'à 60 à 90 g par heure si l'estomac y est entraîné (position commune de l'Academy of Nutrition and Dietetics, des Dietitians of Canada et de l'ACSM, 2016) ; en ultra, 30 à 50 g de glucides et 5 à 10 g de protéines par heure, 450 à 750 ml d'eau par heure (environ 150 à 250 ml toutes les 20 minutes), davantage par forte chaleur, et du sodium au-delà de ce qu'apportent la plupart des boissons (position de l'ISSN sur l'ultra-marathon, 2019). Adapte au poids et à la durée prévue.
- Aliments : propose d'abord ceux des favoris qui conviennent en course (gels, barres, compotes, boissons, fruits secs…), avec leur portion et leurs glucides quand ils sont donnés ; sinon des familles d'aliments, jamais une marque. Avant le départ : un mot sur le dernier repas et la boisson.
- Phrases courtes et factuelles ; ni titre, ni gras, ni tableau ; une idée par ligne quand c'est une liste (lignes commençant par « - »). Ni avis médical : en cas de blessure en cours ou de point fragile, une prudence en une phrase. Ne cite ni appareil ni application.`;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ENTETES });
  if (req.method !== 'POST') return repondre(405, { message: 'POST seulement' });
  const auth = req.headers.get('Authorization') || '';
  const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(auth.replace(/^Bearer /, ''));
  if (!user) return repondre(401, { message: 'connexion requise' });
  const pilotes = String(Deno.env.get('PILOTES') || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!pilotes.includes(user.id)) return repondre(403, { code: 'reserve' });

  let corps;
  try { corps = await req.json(); } catch (e) { return repondre(400, { message: 'corps illisible' }); }
  if (!corps || !corps.contexte) return repondre(400, { message: 'contexte manquant' });

  const modele = Deno.env.get('MODELE') || 'claude-sonnet-5-5';
  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  let rep;
  try {
    rep = await client.beta.messages.create({
      model: modele, max_tokens: 8000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: CONSIGNES, messages: [{ role: 'user', content: 'Contexte :\n' + JSON.stringify(corps.contexte) }]
    });
  } catch (e) { console.error(e); return repondre(502, { code: 'ia', message: e && e.message }); }
  if (rep.stop_reason === 'refusal') return repondre(502, { code: 'refus' });
  try {
    const r = JSON.parse((rep.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
    return repondre(200, { strategie: borner(r.strategie, MAX.strategie), boire_manger: borner(r.boire_manger, MAX.boire_manger) });
  } catch (e) { return repondre(502, { code: 'ia', message: 'réponse illisible' }); }
});
