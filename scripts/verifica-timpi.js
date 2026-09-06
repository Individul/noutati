// Verificare: cum se calculează timpii de pe prima pagină
const baza = 'https://noutati.pages.dev';

(async () => {
  // 1. când a rulat ultimul build (din GitHub API)
  const runs = await (
    await fetch('https://api.github.com/repos/Individul/noutati/actions/runs?per_page=1')
  ).json();
  const run = runs.workflow_runs?.[0];
  if (run) {
    console.log('ultimul build (Actions):', run.created_at, '| status:', run.status);
  }

  // 2. timpii afișați acum pe prima pagină
  const r = await fetch(baza + '/');
  const html = await r.text();
  const actualizat = (html.match(/Actualizat automat · ([^<]+)</i) || [])[1];
  console.log('\nbanda „actualizat automat":', actualizat?.trim());
  console.log('ora Chișinău ACUM:', new Date().toLocaleString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Chisinau' }));

  const timpi = [...html.matchAll(/<span>(chiar acum|acum [^<]+|ieri|acum o oră)<\/span>/g)].map(
    (m) => m[1]
  );
  console.log('\ntimpii afișați (primele 10):');
  timpi.slice(0, 10).forEach((t, i) => console.log('  ' + (i + 1) + '.', t));

  // 3. dovada că sunt înghețați: refetch peste 3 minute și comparăm
  console.log('\nrefetch peste 3 minute pentru comparație…');
  await new Promise((r2) => setTimeout(r2, 180000));
  const html2 = await (await fetch(baza + '/')).text();
  const timpi2 = [...html2.matchAll(/<span>(chiar acum|acum [^<]+|ieri|acum o oră)<\/span>/g)].map(
    (m) => m[1]
  );
  console.log('timpii după 3 min (primele 10):');
  timpi2.slice(0, 10).forEach((t, i) => console.log('  ' + (i + 1) + '.', t));
  console.log(
    'identici cu măsurătoarea anterioară:',
    JSON.stringify(timpi.slice(0, 10)) === JSON.stringify(timpi2.slice(0, 10)) ? 'DA — înghețați între builduri' : 'NU — s-au actualizat'
  );
})();
