// Depanare: lead vs panou — comparație exactă
(async () => {
  const home = await (
    await fetch('https://noutati.pages.dev/?v=' + Date.now())
  ).text();

  const lead = (home.match(/<h1 class="lead-title">([^<]+)/) || [])[1] || '?';
  console.log('LEAD h1 exact:', JSON.stringify(lead));

  const bucati = home.split('data-ts="');
  for (const b of bucati.slice(1)) {
    if (!b.includes('pop-titlu')) continue;
    const titlu = (b.match(/<span class="pop-titlu">([^<]+)/) || [])[1] || '?';
    console.log('PANOU rând:', JSON.stringify(titlu));
  }

  // e codul nou deploy-at? caută marcajul normalizeazăTitlu — nu e în HTML,
  // dar verificăm dacă filtrele au fost incluse prin efect: rânduri < 8
  const randuri = [...home.matchAll(/<span class="pop-rank">(\d+)</g)].map((m) => m[1]);
  console.log('rânduri în panou:', randuri.join(',') || '0');
})();
