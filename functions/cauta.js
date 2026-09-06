// Căutare în știri: titlu, sumar, text extras și rezumat — din arhiva D1.
// Fără diacritice („vant" găsește „vânt"), mai multe cuvinte = toate trebuie
// să existe (ȘI), rezultatele ordonate după prospătime.

import { timeAgo, dataLunga } from '../lib/format.js';

const normalizeaza = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// fragment de text cu prima apariție a căutării, cuvintele evidențiate
function fragment(text, cuvinte) {
  if (!text) return '';
  let snip = text.replace(/\s+/g, ' ').trim();
  const norm = normalizeaza(snip);
  let poz = -1;
  for (const w of cuvinte) {
    const p = norm.indexOf(w);
    if (p >= 0 && (poz < 0 || p < poz)) poz = p;
  }
  if (poz > 80) snip = '…' + snip.slice(Math.max(0, poz - 80));
  if (snip.length > 280) snip = snip.slice(0, 280) + '…';

  // evidențiere caz-insensibilă, pe textul original
  for (const w of cuvinte) {
    const re = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    snip = snip.replace(re, '<mark>$1</mark>');
  }
  return snip;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const qBrut = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const q = normalizeaza(qBrut);
  const cuvinte = [...new Set(q.split(/\s+/).filter((w) => w.length >= 2))].slice(0, 8);

  let rezultate = [];
  if (cuvinte.length) {
    const where = cuvinte.map(() => 'cautare LIKE ?').join(' AND ');
    try {
      const { results } = await env.DB.prepare(
        `SELECT id, titlu, sumar, rezumat, text, tema, regiune, ts FROM subiecte
         WHERE ${where} ORDER BY ts DESC LIMIT 50`
      )
        .bind(...cuvinte.map((w) => `%${w}%`))
        .all();
      rezultate = results || [];
    } catch {
      rezultate = [];
    }
  }

  const formular = `
  <form class="cauta" action="/cauta" method="get">
    <input type="search" name="q" value="${esc(qBrut)}" placeholder="caută în știri…" maxlength="80" aria-label="Caută în știri">
    <button type="submit">caută</button>
  </form>`;

  let continut;
  if (!cuvinte.length) {
    continut = `
    <div class="page-head">
      <span class="kicker">căutare</span>
      <h1>Caută în știri</h1>
      <p>Scrie un cuvânt sau o expresie — căutarea acoperă titlurile, sumarele
      și textul știrilor, ignorând diacriticele.</p>
    </div>
    ${formular}`;
  } else {
    const randuri = rezultate
      .map((r) => {
        const sursaText = r.sumar || r.text || r.rezumat || '';
        const fragmentText = fragment(sursaText, cuvinte);
        const titlu = fragment(r.titlu, cuvinte) || esc(r.titlu);
        return `<a class="art" href="/stire/${esc(r.id)}" data-ts="${Number(r.ts) || Date.now()}">
        <h3 class="art-title">${titlu}</h3>
        ${fragmentText ? `<p class="art-sum">${fragmentText}</p>` : ''}
        <div class="art-meta">
          <span class="art-left">
            <span class="theme">${esc(r.tema || '')}</span>
            <span data-timp>${timeAgo(Number(r.ts) || Date.now())}</span>
          </span>
          <span class="art-src">${esc(r.regiune === 'moldova' ? 'Moldova' : 'Extern')}</span>
        </div>
      </a>`;
      })
      .join('\n');

    continut = `
    <div class="page-head">
      <span class="kicker">căutare</span>
      <h1>Rezultate pentru „${esc(qBrut)}”</h1>
      <p>${rezultate.length} ${rezultate.length === 1 ? 'rezultat' : 'rezultate'} · ordonate după prospătime</p>
    </div>
    ${formular}
    <div class="rows">
      ${randuri || '<p class="gol">Niciun rezultat. Încearcă alt cuvânt sau o formă mai scurtă.</p>'}
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${qBrut ? `Căutare: ${esc(qBrut)}` : 'Caută în știri'} | Noutăți.md</title>
<link rel="stylesheet" href="/arhiva.css">
<script src="/timp-live.js" defer></script>
</head>
<body>
<header class="masthead">
  <div class="container">
    <a class="brand" href="/">Noutăți.md<span class="brand-dot">.</span></a>
    <p class="tagline">Știri din Moldova și din străinătate</p>
  </div>
  <nav class="nav">
    <div class="container nav-in">
      <a href="/">Acasă</a>
      <a href="/moldova">Moldova</a>
      <a href="/extern">Extern</a>
      <a href="/categorie/politica">Politică</a>
      <a href="/categorie/economie">Economie</a>
      <a href="/categorie/sport">Sport</a>
      <a href="/categorie/it-si-stiinta">IT &amp; Știință</a>
      <a href="/categorie/societate">Societate</a>
    </div>
  </nav>
</header>
<main class="container">
${continut}
</main>
<footer class="footer">
  <div class="container">
    <p class="footer-brand">Noutăți.md<span class="brand-dot">.</span></p>
    <p class="footer-text">
      Agregator automat de știri: articolele aparțin surselor originale.
      Căutarea acoperă titlurile, sumarele și textul știrilor din arhivă.
    </p>
  </div>
</footer>
</body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'public, max-age=120' },
  });
}
