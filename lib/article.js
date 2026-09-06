import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

// Extragerea textului principal al unui articol de la sursă, pentru
// pagina de citire internă. Reține un fragment generos (nu textul
// integral), cu atribuire și link către publicația originală.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FETCH_TIMEOUT = 10_000;

// Limita fragmentului afișat (caractere) — model „fragment + sursă".
const LIMITA_TEXT = 3500;

// Cache persistent: odată extras, textul rămâne stabil între builduri
// (serverele CI pot fi blocate ocazional de protecția unor site-uri).
const TEXT_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_TEXT_CACHE = 800;
const FISIER_TEXT = process.env.VERCEL
  ? '/tmp/text-cache.json'
  : path.join(process.cwd(), '.text-cache.json');
let memorieText = null;

function citesteCacheText() {
  if (memorieText) return memorieText;
  try {
    memorieText = JSON.parse(fs.readFileSync(FISIER_TEXT, 'utf8'));
  } catch {
    memorieText = {};
  }
  return memorieText;
}

function salveazaInCacheText(url, val) {
  const cache = citesteCacheText();
  cache[url] = { at: Date.now(), val };
  const intrari = Object.entries(cache);
  if (intrari.length > MAX_TEXT_CACHE) {
    intrari
      .sort((a, b) => a[1].at - b[1].at)
      .slice(0, intrari.length - MAX_TEXT_CACHE)
      .forEach(([k]) => delete cache[k]);
  }
  try {
    fs.writeFileSync(FISIER_TEXT, JSON.stringify(cache));
  } catch {
    // serverless: scrierea poate eșua — rămâne cache-ul în memorie
  }
}

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

// Descărcare cu o singură reîncercare (protecțiile de tip Cloudflare
// cedează adesea la a doua cerere, cu pauză scurtă între ele).
async function descarca(url) {
  for (let incercare = 0; incercare < 2; incercare++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      if (resp.ok) return await resp.text();
    } catch {
      // reîncercăm
    } finally {
      clearTimeout(timer);
    }
    if (incercare === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

export async function extrageArticol(url) {
  const html = await descarca(url);
  if (!html) return { ok: false, motiv: 'pagina nu a putut fi descărcată' };

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

// ——— Cache în proces + persistent între builduri (GitHub Actions cache) ———
// Odată extras cu succes, textul rămâne disponibil 7 zile: paginile
// rămân stabile chiar dacă un site blochează extragerea într-un build.

const CACHE_TTL = 30 * 60 * 1000;
const cacheInProces = new Map();

export async function getArticol(url) {
  // 1. cache persistent (rezultatul unei extrageri reușite trăiește 7 zile)
  const persistent = citesteCacheText();
  const vechi = persistent[url];
  if (vechi && Date.now() - vechi.at < TEXT_TTL) {
    const val = {
      ok: true,
      paragrafe: vechi.val.paragrafe,
      trunchiat: vechi.val.trunchiat || false,
      data: vechi.val.data || null,
    };
    cacheInProces.set(url, { at: Date.now(), val });
    return val;
  }

  // 2. cache în proces (extraction din această rulare)
  const dinProces = cacheInProces.get(url);
  if (dinProces && Date.now() - dinProces.at < CACHE_TTL) return dinProces.val;

  // 3. extragem
  const val = await extrageArticol(url);
  if (val.ok) {
    const deStocat = {
      paragrafe: val.paragrafe,
      trunchiat: val.trunchiat,
      data: val.data,
    };
    cacheInProces.set(url, { at: Date.now(), val });
    salveazaInCacheText(url, deStocat);
  }
  return val;
}
