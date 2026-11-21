// ===== Remplir depuis la page de la course (Supabase Edge Function « lire-page-course ») =====
//
// docs/module-objectif-specification.md, § 3.9. Le coureur colle le texte d'une page de course (Finishers, site officiel…) ;
// le site l'envoie avec la date du jour et les listes de types et de formats. La fonction vérifie l'utilisateur connecté
// et la liste des pilotes, demande à Claude les informations présentes dans le texte, une entrée par parcours, et les rend.
// MyRunTools n'ouvre jamais la page lui-même ; le texte n'est pas gardé.
//   POST { texte: '…', aujourdhui: 'AAAA-MM-JJ', types: [{ id, libelle }], formats: [{ id, libelle, type }] }
//     → 200 { parcours: [{ course, parcours, date, heure, lieu, type, format, distance, dplus, dmoins, description,
//                          lien, ouverture_inscriptions, ouverture_heure, inscription, prix }] } (chaîne vide : absent)
//     → 400 (corps illisible), 401 (pas connecté), 403 { code: 'reserve' } (pas pilote), 502 { code: 'ia' | 'refus' }
// Réglages (secrets de la fonction, dans le tableau de bord de Supabase ; jamais dans le dépôt) :
//   ANTHROPIC_API_KEY  la clé de l'API d'Anthropic
//   PILOTES            les identifiants des comptes autorisés, séparés par des virgules (Authentication → Users)
//   MODELE_LECTURE     facultatif, claude-haiku-5-5 par défaut (un modèle rapide suffit)
// Écrit en JavaScript (valide en TypeScript).
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
const repondre = (status, corps) => new Response(JSON.stringify(corps), { status, headers: ENTETES });
const MAX_TEXTE = 30000;

const CHAMPS = {
  course: 'Nom de l\'épreuve (ex. « Trail des Hauts »), sans l\'année ni le numéro d\'édition',
  parcours: 'Nom du parcours (ex. « Le 25 », « Marathon »), vide s\'il n\'y en a qu\'un sans nom propre',
  date: 'Date du départ de ce parcours, AAAA-MM-JJ ; AAAA-MM si seul le mois est donné ; vide si l\'année n\'est pas dans le texte',
  heure: 'Heure de départ de ce parcours, HH:MM',
  lieu: 'Ville ou lieu de départ, court (ex. « Mont-Clair »)',
  type: 'Identifiant du type, pris dans la liste « types » du contexte, sinon vide',
  format: 'Identifiant du format, pris dans la liste « formats » du contexte (de ce type), sinon vide',
  distance: 'Distance en km, nombre seul (ex. « 25 » ou « 42,2 »)',
  dplus: 'Dénivelé positif en mètres, nombre entier seul',
  dmoins: 'Dénivelé négatif en mètres, nombre entier seul',
  description: 'Résumé factuel du parcours en français, 600 caractères au plus (terrain, ravitaillements, barrières horaires…), seulement d\'après le texte',
  lien: 'Adresse du site officiel de l\'épreuve, commençant par https:// ou http://, seulement si elle figure en toutes lettres dans le texte',
  ouverture_inscriptions: 'Date d\'ouverture des inscriptions, AAAA-MM-JJ, ou AAAA-MM si seul le mois est donné',
  ouverture_heure: 'Heure d\'ouverture des inscriptions, HH:MM',
  inscription: 'Adresse du site d\'inscription, commençant par https:// ou http://, seulement si elle figure en toutes lettres dans le texte',
  prix: 'Prix de l\'inscription à ce parcours en euros, nombre seul (ex. « 35 » ou « 42,5 »)'
};
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['parcours'],
  properties: {
    parcours: {
      type: 'array', description: 'Une entrée par parcours de l\'épreuve (une seule s\'il n\'y en a qu\'un) ; tableau vide si le texte ne décrit pas une course',
      items: {
        type: 'object', additionalProperties: false, required: Object.keys(CHAMPS),
        properties: Object.fromEntries(Object.entries(CHAMPS).map(([k, d]) => [k, { type: 'string', description: d + ' ; chaîne vide si l\'information n\'est pas dans le texte' }]))
      }
    }
  }
};

const CONSIGNES = `Tu lis le texte d'une page web qui présente une course à pied ou un trail (calendrier de courses, site de l'organisateur), copié par un coureur, et tu en tires les informations pour remplir une fiche.
Règles :
- N'utilise que ce qui est écrit dans le texte. N'invente rien, ne devine rien : une information absente donne une chaîne vide. Pas d'année déduite, pas d'adresse web reconstituée.
- Une entrée par parcours de l'épreuve (le 10 km, le 25 km, le marathon…) ; les informations communes (nom, lieu, site, ouverture des inscriptions) sont répétées dans chaque entrée.
- Ignore les autres courses que la page cite (suggestions, courses voisines, publicités) et les éditions passées.
- Type et format : seulement un identifiant des listes données, celui qui correspond le mieux à la distance et au terrain ; sinon vide.
- Nombres : chiffres seuls, virgule ou point pour les décimales, sans unité.`;

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
  const texte = String((corps && corps.texte) || '').slice(0, MAX_TEXTE).trim();
  if (!texte) return repondre(400, { message: 'texte manquant' });
  const contexte = { aujourdhui: corps.aujourdhui || '', types: corps.types || [], formats: corps.formats || [] };

  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  let rep;
  try {
    rep = await client.beta.messages.create({
      model: Deno.env.get('MODELE_LECTURE') || 'claude-haiku-5-5', max_tokens: 6000,
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      system: CONSIGNES,
      messages: [{ role: 'user', content: 'Contexte :\n' + JSON.stringify(contexte) + '\n\nTexte de la page :\n<page>\n' + texte + '\n</page>' }]
    });
  } catch (e) { console.error(e); return repondre(502, { code: 'ia', message: e && e.message }); }
  if (rep.stop_reason === 'refusal') return repondre(502, { code: 'refus' });
  try {
    const r = JSON.parse((rep.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
    const parcours = (Array.isArray(r.parcours) ? r.parcours : []).slice(0, 12)
      .map(p => Object.fromEntries(Object.keys(CHAMPS).map(k => [k, String((p && p[k]) || '').trim()])));
    return repondre(200, { parcours });
  } catch (e) { return repondre(502, { code: 'ia', message: 'réponse illisible' }); }
});
