// Test local pentru logica de label „din arhivă":
//  - subiect cu pagină statică -> fără label
//  - subiect doar în D1 (rotit) -> cu label
const fs = require('fs');
const testIds = JSON.parse(fs.readFileSync('.test-ids.json', 'utf8'));

(async () => {
  // 1. subiect proaspăt -> pagină statică, fără label
  let r = await fetch('http://localhost:8790/stire/' + testIds.proaspat);
  let html = await r.text();
  const labelProaspat = html.includes('din arhivă');
  console.log(
    'proaspăt:', r.status,
    '| label „din arhivă":', labelProaspat ? 'DA (greșit)' : 'NU (corect)'
  );

  // 2. subiect inexistent -> 404
  r = await fetch('http://localhost:8790/stire/nuexista999');
  console.log('inexistent:', r.status, r.status === 404 ? '(404 prietenos)' : '');

  // 3. subiect rotit (doar în D1) -> cu label
  if (testIds.rotit) {
    r = await fetch('http://localhost:8790/stire/' + testIds.rotit);
    html = await r.text();
    const labelRotit = html.includes('din arhivă');
    console.log(
      'rotit (doar D1):', r.status,
      '| label „din arhivă":', labelRotit ? 'DA (corect)' : 'NU (greșit)'
    );
  } else {
    console.log('rotit: niciun candidat local — se verifică pe producție');
  }
})();
