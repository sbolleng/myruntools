// ===== Analyse de la page Mes stats (Supabase Edge Function « analyser-stats ») =====
//
// docs/module-stats-specification.md, § 5. Le site envoie les chiffres de la page (valeurs mensuelles, meilleurs temps, temps
// estimés, allures, zones, Objectifs sans leur nom, niveau) ; la fonction vérifie l'utilisateur connecté, la liste des pilotes
// et le plafond du jour (« Actualiser », trois fois par jour), demande l'analyse à Claude, la range dans « analyses_stats » et la rend.
//   POST { motif: 'import' | 'actualiser' | 'premiere', periode: '12mois' | 'annee' | 'tout', contexte: {…} }
//     → 200 { texte: '1 500 caractères au plus', cree }
//     → 401 (pas connecté), 403 { code: 'reserve' } (pas pilote), 429 { code: 'plafond' }, 502 { code: 'ia' | 'refus' }
// Réglages (secrets de la fonction, dans le tableau de bord de Supabase ; jamais dans le dépôt) :
//   ANTHROPIC_API_KEY  la clé de l'API d'Anthropic
//   PILOTES            les identifiants des comptes autorisés, séparés par des virgules
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
const MAX = 1500, MAX_ACTUALISER = 3;
const repondre = (status, corps) => new Response(JSON.stringify(corps), { status, headers: ENTETES });
// Texte tenu dans la limite : coupé à la dernière phrase entière.
const borner = t => {
  t = String(t || '').trim();
  if (t.length <= MAX) return t;
  const coupe = t.slice(0, MAX), fin = Math.max(coupe.lastIndexOf('. '), coupe.lastIndexOf('.\n'), coupe.lastIndexOf('!'), coupe.lastIndexOf('?'), coupe.endsWith('.') ? MAX - 1 : -1);
  return fin > MAX * 0.5 ? coupe.slice(0, fin + 1) : coupe.slice(0, MAX - 1).trimEnd() + '…';
};
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['analyse'],
  properties: { analyse: { type: 'string', description: 'L\'analyse en français, 1 500 caractères au plus, paragraphes séparés par une ligne vide, sans titre ni liste à puces' } }
};
const CONSIGNES = `Tu es un entraîneur de course à pied et de trail. Tu commentes la progression d'un coureur à partir des chiffres de sa page de statistiques, en français, en le tutoyant.
Le contexte (JSON) donne, mois par mois : le volume (km), le D+ (m), l'allure-effort (secondes par km-effort ; 100 m de D+ comptent comme 1 km à plat ; plus bas = plus rapide), la cadence (pas par minute), l'efficience cardiaque (battements par km-effort ; plus bas = mieux), le D+ par km ; puis la tendance de l'allure-effort, les meilleurs temps, les temps estimés, les allures d'entraînement, les zones cardiaques, la progression sur la période, les Objectifs à venir (date, D+ par km) avec la cible de D+ par km, et le niveau du coureur.
Consignes :
- Un seul texte de ${MAX} caractères au plus (espaces compris) : un court paragraphe par graphique qui a quelque chose à dire (volume, D+, allure-effort, cadence, efficience cardiaque, écart de spécificité, temps), dans cet ordre, en sautant ceux qui n'apprennent rien ; puis deux ou trois pistes d'amélioration concrètes. Paragraphes séparés par une ligne vide, sans titre ni liste à puces.
- Appuie-toi seulement sur les chiffres du contexte ; n'invente aucun chiffre ni aucun fait. Un mois en cours est incomplet : dis-le s'il en tire une conclusion.
- Ne cite jamais d'appareil, de montre, d'application ni de site, ni d'où viennent les chiffres. Ne parle pas de renforcement musculaire.
- Mots à employer : « séance » (jamais « sortie », sauf « sortie longue »), « allure-effort », « km-effort », « Objectif ».
- Aucun avis médical.`;

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
  if (!corps.contexte) return repondre(400, { message: 'contexte manquant' });
  const motif = ['import', 'actualiser', 'premiere'].includes(corps.motif) ? corps.motif : 'actualiser';
  const periode = ['12mois', 'annee', 'tout'].includes(corps.periode) ? corps.periode : null;

  // « Actualiser » : trois fois par jour au plus (jour civil, temps universel).
  if (motif === 'actualiser') {
    const debut = new Date(); debut.setUTCHours(0, 0, 0, 0);
    const { count, error } = await sb.from('analyses_stats').select('id', { count: 'exact', head: true }).eq('motif', 'actualiser').gte('cree', debut.toISOString());
    if (error) return repondre(500, { message: error.message });
    if ((count || 0) >= MAX_ACTUALISER) return repondre(429, { code: 'plafond' });
  }

  const modele = Deno.env.get('MODELE') || 'claude-sonnet-5-5';
  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  let rep;
  try {
    rep = await client.beta.messages.create({
      model: modele, max_tokens: 4000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: CONSIGNES, messages: [{ role: 'user', content: 'Contexte :\n' + JSON.stringify(corps.contexte) }]
    });
  } catch (e) { console.error(e); return repondre(502, { code: 'ia', message: e && e.message }); }
  if (rep.stop_reason === 'refusal') return repondre(502, { code: 'refus' });
  let texte;
  try { texte = borner(JSON.parse((rep.content || []).filter(b => b.type === 'text').map(b => b.text).join('')).analyse); }
  catch (e) { return repondre(502, { code: 'ia', message: 'réponse illisible' }); }
  if (!texte) return repondre(502, { code: 'ia', message: 'réponse vide' });

  const { data: ligne, error: e2 } = await sb.from('analyses_stats').insert({
    motif, periode, texte, modele: String(rep.model || modele).slice(0, 60),
    jetons_entree: (rep.usage && rep.usage.input_tokens) || 0, jetons_sortie: (rep.usage && rep.usage.output_tokens) || 0
  }).select('cree').single();
  if (e2) return repondre(500, { message: e2.message });
  return repondre(200, { texte, cree: ligne.cree });
});
