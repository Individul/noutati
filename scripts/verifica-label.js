// Verificarea pe producție a logicii de label „din arhivă"
const { execSync } = require('child_process');

(async () => {
  const baza = 'https://noutati.pages.dev';

  // 1. subiect PROASPĂT (din prima pagină) -> fără label
  const home = await (await fetch(baza + '/')).text();
  const proaspat = (home.match(/\/stire\/[a-f0-9]{16}/) || [])[0];
  let r = await fetch(baza + proaspat);
  let html = await r.text();
  console.log(
    'subiect PROASPĂT:', r.status,
    '| label „din arhivă":', html.includes('din arhivă') ? 'DA (greșit)' : 'NU (corect)',
    '| sumar AI:', html.toUpperCase().includes('SUMAR AUTOMAT') ? 'DA' : '—'
  );

  // 2. subiect ROTIT: în D1 din vechi builduri, fără pagină statică -> cu label
  const out = execSync(
    'npx wrangler d1 execute noutati-arhiva --remote -y --json --command "SELECT id FROM subiecte ORDER BY creat ASC LIMIT 60"'
  ).toString();
  const ids = JSON.parse(out.slice(out.indexOf('[')))[0].results.map((x) => x.id);
  let gasitRotit = null;
  let verificate = 0;
  for (const id of ids) {
    if (verificate >= 25) break;
    const rr = await fetch(baza + '/stire/' + id);
    verificate++;
    if (rr.status === 404) continue;
    const h = await rr.text();
    if (h.includes('din arhivă')) {
      gasitRotit = id;
      break;
    }
  }
  console.log(
    gasitRotit
      ? 'subiect ROTIT găsit: /stire/' + gasitRotit + ' -> cu label (corect)'
      : 'nu am găsit subiect rotit în primele ' + verificate + ' din arhivă'
  );
})();
