import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { SOURCES } from './sources';
import { temaDupaSlug } from './config';

const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NoutatiMD/1.0; +aggregator de stiri)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
});

// ——— Clasificare tematică pe cuvinte-cheie (text normalizat, fără diacritice) ———

const TEME_KEYWORDS = [
  {
    slug: 'sport',
    kw: [
      'fotbal', 'meci', 'campionat', 'liga ', 'cupa ', 'gol ', 'golul', 'tenis', 'box', 'mma',
      'baschet', 'handbal', 'volei', 'atletism', 'formula 1', 'olimpiada', 'sportiv', 'antrenor',
      'stadion', 'superliga', 'champions league', 'europa league', 'federatia', 'calificari',
    ],
  },
  {
    slug: 'it-si-stiinta',
    kw: [
      'tehnologie', 'inteligenta artificiala', ' chatgpt', 'openai', 'aplicatie', 'smartphone',
      'iphone', 'android', 'software', 'hardware', 'internet', 'bitcoin', 'crypto', 'cibernetice',
      'hacker', 'nasa', 'spatiu', 'spatial', 'cosmic', 'racheta', 'satelit', 'robot', 'drone',
      'studiu ', 'studiul', 'cercetare', 'cercetatori', 'stiinta', 'știință', 'algoritmi',
    ],
  },
  {
    slug: 'economie',
    kw: [
      'economie', 'economic', 'leu ', 'leul', 'euro ', 'dolar', 'banca', 'bancar', 'buget',
      'impozit', 'taxa', 'taxe', 'inflatie', 'pret ', 'pretul', 'preturi', 'salariu', 'salarii',
      'pensie', 'pensii', 'investitie', 'investitii', 'afaceri', 'companie', 'companii',
      'export', 'import', 'pib', 'burso', 'energie', 'gaz ', 'petrol', 'electricitate', 'tarif',
      'credit', 'imprumut', 'piata ', 'comert',
    ],
  },
  {
    slug: 'politica',
    kw: [
      'guvern', 'premier', 'parlament', 'presedinte', 'ministru', 'minister', 'alegeri', 'vot',
      'votul', 'partid', 'referendum', 'deputat', 'opozitie', 'coalitie', 'nato', 'uniunea europeana',
      'diplomat', 'ambasada', 'summit', 'criza', 'razboi', 'ucraina', 'rusia', 'securitate',
      'decizie', 'ordonanta', 'legea',
    ],
  },
];

function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function clasaTema(title, summary) {
  const text = `${normalizeText(title)} ${normalizeText(summary || '')}`;
  for (const tema of TEME_KEYWORDS) {
    if (tema.kw.some((k) => text.includes(k))) return tema.slug;
  }
  return 'societate';
}

// ——— Normalizarea unui item RSS ———

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cutText(text, max = 220) {
  if (!text) return '';
  if (text.length <= max) return text;
  const decupat = text.slice(0, max);
  const spatiu = decupat.lastIndexOf(' ');
  return `${decupat.slice(0, Math.max(spatiu, Math.floor(max * 0.6)))}…`;
}

function normalizeItem(raw, source) {
  const title = stripHtml(raw.title || '');
  const link = (raw.link || '').trim();
  if (!title || !link || !/^https?:\/\//i.test(link)) return null;

  const summary = cutText(
    stripHtml(raw.contentSnippet || raw.content || raw.description || ''), 200
  );

  let ts = raw.isoDate ? Date.parse(raw.isoDate) : raw.pubDate ? Date.parse(raw.pubDate) : NaN;
  const acum = Date.now();
  if (!Number.isFinite(ts)) ts = acum;
  if (ts > acum + 5 * 60 * 1000) ts = acum; // protectie contra datelor din viitor din feed-uri

  const theme = clasaTema(title, summary);
  return {
    title,
    link,
    summary,
    source: { id: source.id, name: source.name },
    region: source.region,
    theme,
    ts,
  };
}

// ——— Gruparea știrilor pe subiecte (model „frontpage") ———
// Știrile care relateneză același subiect (titluri asemănătoare) formează
// un singur element: un sumar + lista surselor de dedesubt.

const STOPWORDS = new Set([
  'este', 'sunt', 'fost', 'care', 'pentru', 'dupa', 'despre', 'trebuie', 'putea',
  'acum', 'noua', 'nou', 'noue', 'fiind', 'intre', 'prima', 'primul', 'timpul',
  'anilor', 'celui', 'acestei', 'acestui', 'acest', 'aceasta', 'aceia', 'lor',
  'mare', 'marele', 'toate', 'toti', 'niciodata', 'devine',
]);

function cuvinteCheie(title) {
  return new Set(
    normalizeText(title)
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
}

// Câte cuvinte semnificative din titlul mai scurt apar în cel mai lung.
function similaritate(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size);
}

const PRAG_SUBIECT = 0.55;

function cheieTitlu(title) {
  return normalizeText(title).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function curataTitlu(title) {
  return title
    .replace(/^(\/?\s*(video|foto|live)\s*\/?\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function majoritate(lista, implicit) {
  const numarator = {};
  let top = implicit;
  let max = 0;
  for (const v of lista) {
    numarator[v] = (numarator[v] || 0) + 1;
    if (numarator[v] > max) {
      max = numarator[v];
      top = v;
    }
  }
  return top;
}

function construiesteSubiect(members) {
  const sortate = [...members].sort((a, b) => b.ts - a.ts);
  const celMaiVechi = sortate[sortate.length - 1];
  const id = crypto.createHash('md5').update(celMaiVechi.link).digest('hex').slice(0, 16);

  // Titlu: cel mai scurt titlu „curat" din grup (de regulă cel mai factologic).
  const title = sortate
    .map((m) => ({ m, t: curataTitlu(m.title) }))
    .reduce((best, x) => (x.t.length < best.t.length ? x : best)).t;

  // Sumar din listă: rezumatul RSS cel mai lung dintre surse.
  const summary = sortate.reduce(
    (best, m) => ((m.summary || '').length > (best.summary || '').length ? m : best),
    sortate[0]
  ).summary;

  const region = majoritate(members.map((m) => m.region), sortate[0].region);
  const theme = majoritate(members.map((m) => m.theme), sortate[0].theme);

  return {
    id,
    title,
    summary,
    region,
    theme,
    themeLabel: temaDupaSlug(theme)?.label ?? 'Știri',
    ts: sortate[0].ts,
    count: members.length,
    // sursa „principală" (cea mai proaspătă) pentru afișare simplă
    source: { id: sortate[0].source.id, name: sortate[0].source.name },
    // toate articolele din grup, pentru pagina de citire
    members: sortate.map((m) => ({
      title: m.title,
      link: m.link,
      source: m.source,
      ts: m.ts,
    })),
  };
}

function grupeazaSubiecte(items) {
  const ordonate = [...items].sort((a, b) => b.ts - a.ts);
  const grupuri = []; // { set, members[] }

  for (const item of ordonate) {
    const set = cuvinteCheie(item.title);
    let gasit = null;
    for (const g of grupuri) {
      if (similaritate(set, g.set) >= PRAG_SUBIECT) {
        gasit = g;
        break;
      }
    }
    if (gasit) gasit.members.push(item);
    else grupuri.push({ set, members: [item] });
  }

  return grupuri.map((g) => construiesteSubiect(g.members));
}

// ——— Colectarea cu cache în proces (pe lângă ISR) ———

const CACHE_TTL = 10 * 60 * 1000;
let cache = { at: 0, items: null, failures: [] };

async function fetchFeed(source) {
  const feed = await parser.parseURL(source.url);
  const items = (feed.items || [])
    .slice(0, 30)
    .map((raw) => normalizeItem(raw, source))
    .filter(Boolean);
  return { source, items };
}

// ——— Surse fără RSS: extragem titlurile din pagina principală ———
// Dacă pagina conține elemente <time datetime="...">, fiecare titlu primește
// data cea mai apropiată din document; altfel, articolele primesc un timp
// recent sintetic, răspândit, ca să nu apară toate „chiar acum".

async function scrapeHtml(source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(source.pagina, {
      headers: { 'User-Agent': UA_BROWSER, Accept: 'text/html' },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!resp.ok) return { source, items: [] };
    const $ = cheerio.load(await resp.text());

    // Titluri + date, în ordinea documentului.
    const evenimente = [];
    $(`${source.selectorArticol}, time[datetime]`).each((_, el) => {
      if ((el.tagName || '').toLowerCase() === 'time') {
        const ts = Date.parse($(el).attr('datetime') || '');
        if (Number.isFinite(ts)) evenimente.push({ kind: 'data', ts });
      } else {
        evenimente.push({ kind: 'titlu', el });
      }
    });

    // Pentru fiecare poziție: data cea mai apropiată (înainte sau după).
    const n = evenimente.length;
    const tsInainte = new Array(n).fill(null);
    const tsDupa = new Array(n).fill(null);
    const distInainte = new Array(n).fill(Infinity);
    const distDupa = new Array(n).fill(Infinity);
    let ultima = -1;
    for (let i = 0; i < n; i++) {
      if (evenimente[i].kind === 'data') ultima = i;
      else if (ultima >= 0) {
        distInainte[i] = i - ultima;
        tsInainte[i] = evenimente[ultima].ts;
      }
    }
    ultima = -1;
    for (let i = n - 1; i >= 0; i--) {
      if (evenimente[i].kind === 'data') ultima = i;
      else if (ultima >= 0) {
        distDupa[i] = ultima - i;
        tsDupa[i] = evenimente[ultima].ts;
      }
    }

    const items = [];
    const vazute = new Set();
    const acum = Date.now();
    let faraData = 0;
    const corectii = citesteCorectiiDate();
    for (let i = 0; i < n && items.length < 25; i++) {
      const e = evenimente[i];
      if (e.kind !== 'titlu') continue;
      const el = e.el;
      const href = $(el).attr('href');
      let titlu = '';
      if (source.selectorTitlu) {
        // dacă e configurat un selector de titlu, acceptăm doar elementele
        // care chiar îl conțin — restul (meniuri, program etc.) se sar
        titlu = $(el).find(source.selectorTitlu).first().text();
        if (!titlu.trim()) continue;
      } else {
        titlu = $(el).text();
      }
      titlu = stripHtml(titlu);
      if (!href || titlu.length < 25) continue;
      if (source.excludeTitlu && new RegExp(source.excludeTitlu, 'i').test(titlu)) continue;
      const link = new URL(href, source.pagina).href;
      if (vazute.has(link)) continue;
      vazute.add(link);
      const item = normalizeItem({ title: titlu, link }, source);
      if (!item) continue;
      // dată reală din pagină > corecție anterioară (din meta-articol) > timp sintetic
      const tsReal = distInainte[i] <= distDupa[i] ? tsInainte[i] : tsDupa[i];
      item.ts = Number.isFinite(tsReal)
        ? tsReal
        : Number.isFinite(corectii[link])
          ? corectii[link]
          : acum - faraData++ * 2 * 60_000;
      items.push(item);
    }
    return { source, items };
  } catch {
    return { source, items: [] };
  } finally {
    clearTimeout(timer);
  }
}

export async function getNews() {
  if (cache.items && Date.now() - cache.at < CACHE_TTL) return cache.items;

  const rezultate = await Promise.allSettled(
    SOURCES.map((s) => (s.tip === 'html' ? scrapeHtml(s) : fetchFeed(s)))
  );
  const items = [];
  const failures = [];
  for (const r of rezultate) {
    if (r.status === 'fulfilled') items.push(...r.value.items);
    else failures.push(r.reason?.message || 'eroare necunoscută');
  }

  const subiecte = grupeazaSubiecte(items).sort((a, b) => b.ts - a.ts);
  cache = { at: Date.now(), items: subiecte, failures };
  return subiecte;
}

export async function getNewsDupaRegiune() {
  const items = await getNews();
  return {
    toate: items,
    moldova: items.filter((i) => i.region === 'moldova'),
    extern: items.filter((i) => i.region === 'extern'),
    failures: cache.failures,
  };
}

export async function getStiriDupaTema(slug) {
  const items = await getNews();
  return items.filter((i) => i.theme === slug);
}

// ——— Corecții de dată pentru sursele HTML fără dată în listă ———
// Când se deschide pagina de citire, extragem data reală din meta-articol
// (JSON-LD) și o reținem persistent: link → timestamp.

const FISIER_DATE = process.env.VERCEL
  ? '/tmp/date-corectii.json'
  : path.join(process.cwd(), '.date-corectii.json');
let corectiiInMemorie = null;

function citesteCorectiiDate() {
  if (corectiiInMemorie) return corectiiInMemorie;
  try {
    corectiiInMemorie = JSON.parse(fs.readFileSync(FISIER_DATE, 'utf8'));
  } catch {
    corectiiInMemorie = {};
  }
  return corectiiInMemorie;
}

export function corecteazaData(link, ts) {
  if (!link || !Number.isFinite(ts)) return;
  const corectii = citesteCorectiiDate();
  if (corectii[link] === ts) return;
  corectii[link] = ts;
  const intrari = Object.entries(corectii);
  if (intrari.length > 800) {
    intrari
      .sort((a, b) => a[1] - b[1])
      .slice(0, intrari.length - 800)
      .forEach(([k]) => delete corectii[k]);
  }
  try {
    fs.writeFileSync(FISIER_DATE, JSON.stringify(corectii));
  } catch {
    // serverless: scrierea poate eșua — corecția rămâne în memorie
  }

  // actualizăm și subiectul din cache, ca pagina curentă să arate data reală
  const subiect = cache.items?.find((s) => s.members.some((m) => m.link === link));
  if (!subiect) return;
  const membru = subiect.members.find((m) => m.link === link);
  if (membru) membru.ts = ts;
  subiect.members.sort((a, b) => b.ts - a.ts);
  subiect.ts = Math.max(...subiect.members.map((m) => m.ts));
}
