import * as cheerio from 'cheerio';

// Extragerea textului principal al unui articol de la sursă, pentru
// pagina de citire internă. Reține un fragment generos (nu textul
// integral), cu atribuire și link către publicația originală.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FETCH_TIMEOUT = 10_000;

// Limita fragmentului afișat (caractere) — model „fragment + sursă".
const LIMITA_TEXT = 3500;

// Elemente care nu sunt text de articol.
const JUNK_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'form', 'nav', 'header', 'footer',
  'aside', 'figure', 'button', 'svg', 'ins', '[role="banner"]',
  '[class*="share"]', '[class*="social"]', '[class*="comment"]',
  '[class*="related"]', '[class*="recommend"]', '[class*="newsletter"]',
  '[class*="subscribe"]', '[class*="banner"]', '[class*="ad-"]', '[id*="ad-"]',
].join(',');

// Paragrafe de tip „citește și", promo, copyright, ore etc.
const JUNK_TEXT =
  /^(foto|video|foto:|video:|surs[ăa]|cite[șs]te [șs]i|vezi [șs]i|cite[șs]te mai departe|cite[șs]te mai mult|aboneaz|newsletter|acum:|update|ultim[ua] or[ăa]|p[cô]n[âa]n[ăa] la|publicat|actualizat|share|coment|©|\d{3}\s*$|contacte?:?|adres[ăa]:?)/i;
const JUNK_CONTINE =
  /(© |preluarea materialelor|toate drepturile|citiți mai departe|citiți și:|infinity\.?news|abonează-te la canalul)/i;

// Prag minim ca fragmentul să fie util (altfel -> rezumat + link sursă).
const PRAG_MINIM = 300;

const SELECTOR_CONTINUT = [
  'article',
  '[itemprop="articleBody"]',
  '.article-body', '.article-content', '.article-text', '.article__body',
  '.entry-content', '.post-content', '.story-body', '.story-content',
  '.news-content', '.content-detail', '.text-content',
  'main [class*="content"]',
  'main',
].join(', ');

function paragrafeDin($, root) {
  const rezultat = [];
  $(root)
    .find('p')
    .addBack('p')
    .each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length < 45) return;
      if (JUNK_TEXT.test(text)) return;
      if (JUNK_CONTINE.test(text)) return;
      if (/https?:\/\//.test(text)) return;
      rezultat.push(text);
    });
  return rezultat;
}

// Data publicării din articol: JSON-LD, apoi meta-taguri.
function cautaCampRecursiv(obj, chei, gasite) {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (chei.includes(k) && typeof v === 'string') gasite.push(v);
    else if (v && typeof v === 'object') cautaCampRecursiv(v, chei, gasite);
  }
}

function extrageData($) {
  const gasite = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      cautaCampRecursiv(JSON.parse($(el).text()), ['datePublished', 'dateModified'], gasite);
    } catch {
      // JSON-LD invalid — ignorăm
    }
  });
  const meta =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[itemprop="datePublished"]').attr('content') ||
    $('meta[name="pubdate"]').attr('content');
  if (meta) gasite.push(meta);
  for (const g of gasite) {
    const ts = Date.parse(g);
    if (Number.isFinite(ts)) return ts;
  }
  return null;
}

export async function extrageArticol(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  let html;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!resp.ok) return { ok: false, motiv: `sursa a răspuns ${resp.status}` };
    html = await resp.text();
  } catch (e) {
    return { ok: false, motiv: 'sursa nu a putut fi contactată' };
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);

  // Data publicării o extragem ÎNAINTE de curățare (JSON-LD stă în <script>,
  // iar scripturile se șterg mai jos împreună cu restul gunoiului).
  let data = extrageData($);
  if (data && data > Date.now() + 5 * 60 * 1000) data = Date.now();

  $(JUNK_SELECTORS).remove();

  let celMaiBun = null;
  let maxLungime = 0;
  const evalueaza = (paragrafe) => {
    const lungime = paragrafe.join(' ').length;
    if (lungime > maxLungime) {
      maxLungime = lungime;
      celMaiBun = paragrafe;
    }
  };
  $(SELECTOR_CONTINUT).each((_, el) => evalueaza(paragrafeDin($, el)));
  evalueaza(paragrafeDin($, 'body')); // mereu și varianta largă, ca rival
  if (!celMaiBun || maxLungime < PRAG_MINIM) {
    return { ok: false, motiv: 'nu am putut identifica textul articolului', data };
  }

  // Concatenăm până la limita fragmentului; ultimul paragraf poate fi trunchiat.
  const bucati = [];
  let total = 0;
  let trunchiat = false;
  for (const p of celMaiBun) {
    if (total + p.length > LIMITA_TEXT) {
      const ramas = LIMITA_TEXT - total;
      if (ramas > 200) bucati.push(`${p.slice(0, p.lastIndexOf(' ', ramas))}…`);
      trunchiat = true;
      break;
    }
    bucati.push(p);
    total += p.length;
  }

  return { ok: true, paragrafe: bucati, trunchiat, data };
}

// ——— Cache în proces (evită re-descărcarea la fiecare regenerare) ———

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();

export async function getArticol(url) {
  const dinCache = cache.get(url);
  if (dinCache && Date.now() - dinCache.at < CACHE_TTL) return dinCache.val;

  const val = await extrageArticol(url);
  if (val.ok) {
    if (cache.size > 300) cache.clear();
    cache.set(url, { at: Date.now(), val });
  }
  return val;
}
