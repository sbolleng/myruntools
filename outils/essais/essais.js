// ===== Banc d'essai =====
//
// Rejoue les jeux d'essai des spécifications dans Chromium, sans réseau :
// la base Supabase est simulée avec donnees-fictives.json (aucune donnée
// personnelle), l'utilisateur fictif est connecté d'office et la date du jour
// est figée au 20 octobre 2026, comme dans les jeux d'essai.
//
// Usage, depuis ce dossier : npm install (une fois), puis
//   node essais.js              tous les contrôles
//   node essais.js repasse      seulement ceux qu'on nomme (noms des groupes, séparés par des espaces)
//   node essais.js --captures   et des captures dans captures/ (non versionnées)
// Contrôles : un fichier par module dans controles/ (outils communs : commun.js).
// Ajouter un module : écrire controles/<module>.js et l'ajouter à FICHIERS.
const { chromium, fs, path, CAPTURES, SEULS, SANS_CAPTCHA, navigateur } = require('./commun');
const FICHIERS = ["general", "palmares", "objectif", "objectif-strategie", "objectif-saisie", "fiche", "calendrier", "preparation", "preparation-profil", "preparation-ia", "design", "graphiques", "courses", "nutrition", "stats", "logistique"];
const CONTROLES = Object.assign({}, ...FICHIERS.map(f => require('./controles/' + f)));
(async () => {
  if (CAPTURES) fs.mkdirSync(path.join(__dirname, 'captures'), { recursive: true });
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'donnees-fictives.json'), 'utf8'));
  const nav = await chromium.launch(navigateur());
  // Anti-robot (Turnstile) : jamais dans le banc (pas de réseau) ; la clé du site est vidée au chargement de chaque page.
  const contexte0 = nav.newContext.bind(nav);
  nav.newContext = async (...a) => { const c = await contexte0(...a); await c.addInitScript(SANS_CAPTCHA); return c; };
  // Sortie courte (économie de jetons) : seuls les groupes en échec sont détaillés, les autres comptés ; DETAIL=1 pour une ligne par groupe.
  let echecs = 0; const ok = [];
  for (const [nom, f] of Object.entries(CONTROLES)) {
    if (SEULS.length && !SEULS.includes(nom)) continue;
    const pb = (await f(nav, db)).filter(Boolean);
    echecs += pb.length;
    if (pb.length) console.log('ÉCHEC ' + nom + pb.map(x => '\n      - ' + x).join(''));
    else if (process.env.DETAIL) console.log('OK    ' + nom);
    else ok.push(nom);
  }
  if (ok.length) console.log('OK    ' + ok.length + ' groupe' + (ok.length > 1 ? 's' : '') + (ok.length <= 3 ? ' (' + ok.join(', ') + ')' : ''));
  await nav.close();
  process.exit(echecs ? 1 : 0);
})();
