// Verificare: lead-ul după implementarea vârstei reale
(async () => {
  const home = await (
    await fetch('https://noutati.pages.dev/?v=' + Date.now())
  ).text();
  const leadTitlu = (home.match(/<h1 class="lead-title">([^<]+)/) || [])[1];
  const leadBloc = home.split('lead-title')[1] || '';
  const leadTimp = (leadBloc.match(/<span data-timp[^>]*>([^<]+)/) || [])[1];
  const leadSurse = (leadBloc.match(/(\d+) surse/) || [])[1];
  console.log('LEAD:', (leadTitlu || '?').slice(0, 70));
  console.log('vârstă afișată:', leadTimp || '?', '| surse:', leadSurse ? leadSurse + ' surse' : '1 sursă');

  // primele rânduri din flux
  const bucati = home.split('<a class="art ');
  console.log('\nflux cronologic (primele 5):');
  bucati.slice(1, 6).forEach((b) => {
    const t = (b.match(/<h3 class="art-title">([^<]+)/) || [])[1] || '';
    const timp = (b.match(/<span data-timp[^>]*>([^<]+)/) || [])[1] || '?';
    console.log('  ·', timp, '|', t.slice(0, 60));
  });
})();
