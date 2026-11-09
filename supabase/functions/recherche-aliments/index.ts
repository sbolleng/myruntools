// ===== Relais de recherche d'aliments (Supabase Edge Function « recherche-aliments ») =====
//
// docs/module-nutrition-specification.md, § 4.6. Le téléphone ne peut pas interroger directement le moteur de recherche
// d'Open Food Facts (search.openfoodfacts.org n'autorise pas les appels venant d'un autre site) ; l'ancien moteur
// (cgi/search.pl) est souvent saturé. Ce relais interroge le nouveau moteur, puis l'ancien en cas d'échec, et rend
// au plus huit produits, valeurs pour 100 g. Le moteur ne complète pas un mot commencé (« yaourt na » cherche « na »,
// qui ramène des marques « NA ») : on ne garde que les produits dont le nom ou la marque contient tous les mots tapés,
// même commencés ; s'il en reste moins de trois, on recommence sans le dernier mot.
//   POST { q: 'riz basmati' }  →  { produits: [{ nom, marque, kcal, proteines, glucides, lipides, portionG }], source }
// Réservé aux utilisateurs connectés (vérification du jeton par Supabase, réglage par défaut). Aucune donnée rangée.
// Écrit en JavaScript (valide en TypeScript) : le banc d'essai le rejoue aussi dans Node.

const ENTETES = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
// Open Food Facts demande un nom d'application et un contact dans chaque appel.
const AGENT = 'MyRunTools/1.0 (contact@myruntools.fr)';
const CHAMPS = 'code,product_name,product_name_fr,brands,nutriments,serving_quantity';

const arrondi = x => Math.round(x * 10) / 10;

// Un produit d'Open Food Facts → un résultat ; null s'il n'a pas de nom ou pas de calories plausibles.
export function produit(p) {
  const n = p.nutriments || {};
  const nom = String(p.product_name_fr || p.product_name || '').trim();
  const kcal = n['energy-kcal_100g'] != null ? Number(n['energy-kcal_100g']) : n.energy_100g != null ? Number(n.energy_100g) / 4.184 : NaN;
  const marques = Array.isArray(p.brands) ? p.brands : String(p.brands || '').split(',');
  const marque = String(marques[0] || '').trim();
  const v = k => (Number.isFinite(Number(n[k])) ? arrondi(Number(n[k])) : 0);
  const sq = Number(p.serving_quantity);
  if (!nom || !Number.isFinite(kcal) || kcal < 0 || kcal > 1000) return null;
  return { nom, marque, kcal: arrondi(kcal), proteines: v('proteins_100g'), glucides: v('carbohydrates_100g'), lipides: v('fat_100g'),
    portionG: sq >= 5 && sq <= 1000 ? Math.round(sq) : 100 };
}

// Mots utiles, sans accent ni pluriel (« Œufs » → « oeuf ») ; les petits mots (au, de, la…) ne comptent pas.
const VIDES = new Set(['a', 'au', 'aux', 'de', 'des', 'du', 'd', 'en', 'et', 'la', 'le', 'les', 'l', 'un', 'une', 'avec']);
export const mots = t => String(t).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .split(/[^a-z0-9]+/).filter(m => m && !VIDES.has(m)).map(m => (m.length > 3 ? m.replace(/[sx]$/, '') : m));
// Chaque mot tapé commence un mot du nom ou de la marque.
export const correspond = (r, q) => { const n = mots(r.nom + ' ' + r.marque); return mots(q).every(m => n.some(x => x.startsWith(m))); };

// Huit produits au plus, sans doublon (même nom, même marque), qui répondent à la recherche q.
export function produits(liste, q) {
  const vus = new Set(), sortie = [];
  for (const p of liste || []) {
    const r = produit(p);
    if (!r || (q && !correspond(r, q))) continue;
    const cle = (r.nom + '|' + r.marque).toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle); sortie.push(r);
    if (sortie.length === 8) break;
  }
  return sortie;
}

async function nouveauMoteur(envoye, q, f) {
  const u = new URL('https://search.openfoodfacts.org/search');
  u.search = new URLSearchParams({ q: envoye, langs: 'fr', page_size: '60', fields: CHAMPS }).toString();
  const r = await f(u.toString(), { headers: { 'User-Agent': AGENT } });
  if (!r.ok) throw new Error('search.openfoodfacts.org : ' + r.status);
  return produits((await r.json()).hits, q);
}
// Ce qui est tapé ; s'il reste moins de trois produits, sans le dernier mot (sans doute commencé).
async function chercherNouveau(q, f) {
  const premiers = await nouveauMoteur(q, q, f);
  const m = q.trim().split(/\s+/);
  if (premiers.length >= 3 || m.length < 2) return premiers;
  const seconds = await nouveauMoteur(m.slice(0, -1).join(' '), q, f);
  return seconds.length > premiers.length ? seconds : premiers;
}

async function ancienMoteur(q, f) {
  const u = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  u.search = new URLSearchParams({ search_terms: q, search_simple: '1', action: 'process', json: '1', page_size: '24', sort_by: 'unique_scans_n', lc: 'fr', cc: 'fr', fields: CHAMPS }).toString();
  const r = await f(u.toString(), { headers: { 'User-Agent': AGENT } });
  if (!r.ok) throw new Error('world.openfoodfacts.org : ' + r.status);
  return produits((await r.json()).products, q);
}

// La requête d'un téléphone → la réponse. f : la fonction fetch (remplaçable pour les essais).
export async function repondre(req, f = fetch) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ENTETES });
  const json = (statut, corps) => new Response(JSON.stringify(corps), { status: statut, headers: ENTETES });
  if (req.method !== 'POST') return json(405, { erreur: 'POST attendu' });
  let q = '';
  try { q = String((await req.json()).q || '').trim(); } catch (e) { /* corps illisible */ }
  if (q.length < 2 || q.length > 100) return json(400, { erreur: 'Recherche de 2 à 100 caractères' });
  try { return json(200, { produits: await chercherNouveau(q, f), source: 'search' }); } catch (e) { console.warn(String(e)); }
  try { return json(200, { produits: await ancienMoteur(q, f), source: 'cgi' }); } catch (e) { console.warn(String(e)); }
  return json(503, { erreur: 'Open Food Facts indisponible' });
}

// Dans Supabase (Deno) : le service. Ailleurs (banc d'essai, Node) : seulement les fonctions exportées.
if (typeof Deno !== 'undefined') Deno.serve(req => repondre(req));
