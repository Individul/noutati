// Pagina de arhivă pentru un subiect: se servește din baza D1 timp de 1 an,
// chiar și după ce subiectul iese din știrile curente.
// Dacă subiectul nu e în arhivă, cererea cade pe fișierele statice
// (pagina curentă sau 404).

import { timeAgo, dataLunga } from '../../lib/format.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const id = String(params.id || '');

  let rand = null;
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM subiecte WHERE id = ?'
    )
      .bind(id)
      .all();
    rand = results?.[0] || null;
  } catch {
    rand = null;
  }

  if (!rand) return env.ASSETS.fetch(request);

  let surse = [];
  try {
    surse = JSON.parse(rand.surse || '[]');
  } catch {
    surse = [];
  }

  const corp = rand.sumar || rand.text || rand.rezumat || '';
  const paragrafe = corp.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const ts = Number(rand.ts) || Date.now();
  const esc = (s) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(rand.titlu)} | Noutăți.md</title>
<link rel="stylesheet" href="/arhiva.css">
</head>
<body>
<header class="masthead">
  <div class="container">
    <a class="brand" href="/">Noutăți.md<span class="brand-dot">.</span></a>
    <p class="tagline">Știri din Moldova și din străinătate · arhivă</p>
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
  <article class="reader">
    <a class="reader-back" href="/">← prima pagină</a>
    <span class="kicker">${esc(rand.tema)}</span>
    <h1 class="reader-title">${esc(rand.titlu)}</h1>
    <div class="reader-meta">
      <span>${esc(rand.regiune === 'moldova' ? 'Moldova' : 'Extern')} · ${timeAgo(ts)} · ${dataLunga(ts)}</span>
      <span class="ai-tag">din arhivă</span>
    </div>
    <div class="reader-body">
      ${paragrafe.map((p) => `<p>${esc(p)}</p>`).join('\n      ') || '<p>Vezi sursele de mai jos.</p>'}
    </div>
    <section class="surse">
      <div class="sec-head"><h2>Sursele subiectului</h2></div>
      ${surse
        .map(
          (s) => `<a class="sursa" href="${esc(s.link)}" target="_blank" rel="noopener noreferrer">
        <span class="sursa-title">${esc(s.title)}</span>
        <span class="sursa-meta">${esc(s.source?.name || '')} · ${timeAgo(Number(s.ts) || ts)}</span>
      </a>`
        )
        .join('\n      ')}
    </section>
    <p class="reader-legal">
      Articolul din arhivă aparține surselor originale, menționate mai sus;
      aici este reprodus parțial, fără publicitate, pentru o lectură liniștită.
    </p>
  </article>
</main>
<footer class="footer">
  <div class="container">
    <p class="footer-brand">Noutăți.md<span class="brand-dot">.</span></p>
    <p class="footer-text">
      Agregator automat de știri: articolele aparțin surselor originale.
      Subiectele din arhivă se păstrează un an.
    </p>
  </div>
</footer>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=utf-8',
      'cache-control': 'public, max-age=600',
    },
  });
}
