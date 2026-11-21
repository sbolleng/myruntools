// ===== Séances proposées par l'IA (Supabase Edge Function « proposer-seances ») =====
//
// docs/module-preparation-specification.md, § 6. Le site envoie le contexte d'un bloc de 4 semaines (trame, repères, courses
// sans leur nom, profil, séances passées) ; la fonction vérifie l'utilisateur connecté, la liste des pilotes et le plafond,
// demande les séances à Claude dans un format imposé, range l'appel dans la table « propositions » et rend la réponse.
// Les garde-fous (jours, durées, récupération, affûtage) sont vérifiés par le site, qui refait une fois la demande (essai 2).
//   POST { bloc: 'AAAA-MM-JJ', essai: 1 | 2, motif?: 'proposer' | 'refaire' | 'readaptation', contexte: {…}, corrections?: ['…'] }
//   Une réadaptation (relancée par l'utilisateur après l'analyse d'une séance) ne compte pas dans le plafond.
//   POST { mode: 'analyse', contexte: {…} } : l'analyse d'une séance faite (fiche complète, retour de l'utilisateur, 4 dernières semaines) ;
//     → 200 { analyse: 'texte de 1 000 caractères au plus', adapter: true | false } ; rien n'est rangé dans « propositions », rien ne compte dans le plafond.
//     → 200 { id, reponse: { recommandation, seances: [{ date, type, libelle, duree_min, distance_km, intensite }] } }
//     → 401 (pas connecté), 403 { code: 'reserve' } (pas pilote), 429 { code: 'plafond', prochaine }, 502 { code: 'ia' | 'refus' }
// Réglages (secrets de la fonction, dans le tableau de bord de Supabase ; jamais dans le dépôt) :
//   ANTHROPIC_API_KEY  la clé de l'API d'Anthropic
//   PILOTES            les identifiants des comptes autorisés, séparés par des virgules (Authentication → Users)
//   MODELE             facultatif, claude-sonnet-5-5 par défaut
//   PLAFOND            facultatif : propositions par mois et par compte ; absent ou 0, sans limite (essais des pilotes)
// Écrit en JavaScript (valide en TypeScript).
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
const PLAFOND = Number(Deno.env.get('PLAFOND')) || 0; // propositions par mois civil (essai 1), 0 : sans limite ; les reprises (essai 2) ne comptent pas, dans la limite d'autant
// Analyse d'une séance faite (voir CONSIGNES_ANALYSE) : un texte et l'avis « adapter le plan ou non » ; l'adaptation se fait ensuite, à la demande de l'utilisateur.
const MAX_ANALYSE = 1000;
const SCHEMA_ANALYSE = {
  type: 'object', additionalProperties: false, required: ['analyse', 'adapter'],
  properties: {
    analyse: { type: 'string', description: 'L\'analyse de la séance en français, 1 000 caractères au plus, sans titre ni liste à puces' },
    adapter: { type: 'boolean', description: 'Vrai seulement si le retour justifie d\'adapter les séances à venir' }
  }
};
const CONSIGNES_ANALYSE = `Tu es un entraîneur de course à pied et de trail. Tu analyses une séance que le coureur vient de faire, en français, en le tutoyant.
Le contexte (JSON) donne : la fiche de la séance (nom, description du déroulé, durée, distance et dénivelé prévus, intensité prévue), son réalisé quand il est saisi (durée, distance, dénivelé, fréquence cardiaque moyenne et maximale, allure moyenne), le retour du coureur (effort perçu de 1 à 10 selon l'échelle de Borg modifiée, charge, sensations, douleur et où, commentaire, jour d'origine si la séance a été déplacée), la phase du plan, la prochaine course (rôle, format, distance, jours restants), le profil du coureur et ses séances des 4 dernières semaines avec leur retour.
Consignes :
- Écris un seul texte de ${MAX_ANALYSE} caractères au plus (espaces compris), factuel, sans titre ni liste à puces : ce que la séance dit de sa forme, l'écart entre le prévu et le réalisé (durée, distance, allure, fréquence cardiaque) et entre l'intensité prévue et l'effort ressenti, les sensations, la douleur éventuelle et le commentaire, puis la suite à donner.
- Appuie-toi seulement sur les données du contexte ; n'invente aucun chiffre ni aucun fait.
- En cas de douleur forte ou de blessure en cours : conseille de lever le pied et de consulter un professionnel de santé, sans poser de diagnostic ni donner d'avis médical.
- adapter : vrai seulement si le retour justifie de modifier les séances à venir (douleur, fatigue marquée, effort très au-dessus ou très en dessous du prévu, contrainte exprimée) ; faux si le plan tient. Quand adapter est vrai, termine le texte par la proposition d'adapter le plan ; l'utilisateur décide.`;
// Texte tenu dans la limite : coupé à la dernière phrase entière si possible.
const borner = t => {
  t = String(t || '').trim();
  if (t.length <= MAX_ANALYSE) return t;
  const coupe = t.slice(0, MAX_ANALYSE), fin = Math.max(coupe.lastIndexOf('. '), coupe.lastIndexOf('.\n'), coupe.lastIndexOf('!'), coupe.lastIndexOf('?'));
  return fin > MAX_ANALYSE * 0.5 ? coupe.slice(0, fin + 1) : coupe.slice(0, MAX_ANALYSE - 1).trimEnd() + '…';
};
const repondre = (status, corps) => new Response(JSON.stringify(corps), { status, headers: ENTETES });

// Format imposé de la réponse : une recommandation pour le bloc, puis ses séances.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommandation', 'seances'],
  properties: {
    recommandation: { type: 'string', description: 'La recommandation pour le bloc, en français, deux phrases courtes au plus' },
    seances: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'type', 'libelle', 'duree_min', 'distance_km', 'intensite', 'description'],
        properties: {
          date: { type: 'string', description: 'AAAA-MM-JJ' },
          type: { type: 'string', enum: ['run', 'renfo'] },
          libelle: { type: 'string', description: 'Nom normalisé, puis éventuellement « : » et un détail court. Séance de course : Endurance, Décrassage, Sortie longue, Seuil, Fractionné ou Côtes. Renforcement : Renforcement. Ex. « Côtes : 8 x 1 min en côte », 100 caractères au plus' },
          description: { type: 'string', description: 'Déroulé de la séance, une étape par ligne, 800 caractères au plus ; toujours renseigné (au moins trois lignes pour une endurance simple)' },
          duree_min: { type: 'integer' },
          distance_km: { type: 'number', description: '0 pour une séance sans distance (renforcement)' },
          intensite: { type: 'string', enum: ['facile', 'moderee', 'intense'] }
        }
      }
    }
  }
};

const CONSIGNES = `Tu es un entraîneur de course à pied et de trail. Tu proposes les séances d'un bloc de 4 semaines pour un coureur, en français.
Le contexte (JSON) donne : la phase de chaque semaine (base, développement, affûtage, allègement, récupération, entretien), calculée par des règles que tu ne changes jamais ; les repères de certains jours ; les courses du bloc (rôle Objectif, Préparatoire ou Plaisir ; format, distance, D+) ; le profil du coureur ; ses séances des 4 dernières semaines.
Règles impératives :
- Une séance seulement les jours disponibles du profil ; aucune séance le jour d'une course ni un jour de repos.
- Les jours de récupération : seulement des séances d'intensité facile.
- Les jours allégés : une séance courte et facile au plus.
- Semaines d'affûtage : volume (somme des durées) réduit de 41 à 60 % par rapport à la moyenne des 3 semaines d'avant, intensité et nombre de séances maintenus.
- Semaines d'allègement : volume nettement réduit. Base : surtout de l'endurance facile. Développement : une à deux séances de qualité par semaine. Entretien : volume stable, une séance de qualité.
- Respecte le nombre de séances de renforcement par semaine du profil ; la sortie longue le jour prévu par le profil.
- Pars du volume récent du coureur et progresse prudemment.
- distance_km : 0 pour une séance de renforcement.
- description : le déroulé de la séance, une étape par ligne, 800 caractères au plus, sans numéro (le site les numérote), par exemple « Courir 20 min en endurance facile », « 3 x 12 min à allure semi, 5 min de récupération entre chaque », « 5 min de retour au calme ». Donne une allure ou une fréquence cardiaque seulement si le profil fournit un repère (VMA, temps sur 10 km, semi ou marathon, FC max) pour la calculer ; sinon décris l'effort (facile, soutenu, dur). Toujours renseignée, jamais vide : même une endurance simple a au moins trois lignes (par exemple « 5 min de footing très lent pour s'échauffer », « Courir 35 min en endurance facile, à une allure où tu peux parler », « 5 min de retour au calme et étirements légers ») ; un renforcement liste ses exercices avec séries et répétitions.
- Le libellé commence toujours par un de ces noms, écrit exactement ainsi : Endurance, Décrassage, Sortie longue, Seuil, Fractionné, Côtes (course à pied) ou Renforcement (renforcement) ; le détail éventuel suit après « : » (ex. « Fractionné : 6 x 800 m »). Aucun autre nom.
Retours du coureur (ils priment sur le plan prévu) : pour chaque séance passée, le contexte peut donner le ressenti (effort perçu de 1 à 10, échelle de Borg modifiée, et son libellé) et la charge (ressenti × durée en minutes, méthode de Foster), la douleur (aucune, légère, forte, et où), les sensations (indépendantes de l'effort), la fatigue du jour (1 à 5), un commentaire et le jour d'origine si elle a été déplacée ; les séances à venir peuvent porter un commentaire (une contrainte, une envie) ; le profil peut donner une blessure en cours. Adapte le bloc en conséquence, toujours dans les règles impératives ; en cas de douleur forte ou de blessure en cours, reste sur des séances faciles et dis-le dans la recommandation, sans avis médical.
Rends une recommandation pour l'ensemble du bloc (deux phrases courtes au plus, sans détailler chaque séance), puis toutes les séances du bloc, dans l'ordre des dates.`;

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
  // Analyse d'une séance faite : ni bloc ni plafond, rien n'est rangé.
  if (corps.mode === 'analyse') {
    if (!corps.contexte) return repondre(400, { message: 'contexte manquant' });
    const modeleA = Deno.env.get('MODELE') || 'claude-sonnet-5-5';
    const clientA = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    let repA;
    try {
      repA = await clientA.beta.messages.create({
        model: modeleA, max_tokens: 4000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA_ANALYSE } },
        system: CONSIGNES_ANALYSE, messages: [{ role: 'user', content: 'Contexte :\n' + JSON.stringify(corps.contexte) }]
      });
    } catch (e) { console.error(e); return repondre(502, { code: 'ia', message: e && e.message }); }
    if (repA.stop_reason === 'refusal') return repondre(502, { code: 'refus' });
    try {
      const r = JSON.parse((repA.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
      return repondre(200, { analyse: borner(r.analyse), adapter: r.adapter === true });
    } catch (e) { return repondre(502, { code: 'ia', message: 'réponse illisible' }); }
  }
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
  if (PLAFOND && motif !== 'readaptation' && ((essai === 1 && comptees >= PLAFOND) || (essai === 2 && reprises >= PLAFOND))) return repondre(429, { code: 'plafond', prochaine });

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
