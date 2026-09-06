// Verificare: etichetele afișate vs recalculul pe ceasul curent
(async () => {
  const home = await (
    await fetch('https://noutati.pages.dev/?v=' + Date.now())
  ).text();

  function eticheta(ts) {
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'chiar acum';
    if (diffMin < 60) return 'acum ' + diffMin + ' min';
    const h = Math.floor(diffMin / 60);
    if (h === 1) return 'acum o oră';
    if (h < 24) return 'acum ' + h + ' ore';
    const z = Math.floor(h / 24);
    if (z === 1) return 'ieri';
    if (z < 7) return 'acum ' + z + ' zile';
    return new Date(ts).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Chisinau',
    });
  }

  const Perechi = [];
  const bucati = home.split('data-ts="');
  for (const bucata of bucati.slice(1)) {
    const ts = Number(bucata.slice(0, 13));
    const label = (bucata.match(/<span data-timp[^>]*>([^<]+)<\/span>/) || [])[1];
    if (ts && label) Perechi.push({ ts, label: label.trim() });
  }

  console.log('perechi (data-ts + etichetă) găsite:', Perechi.length);
  Perechi.slice(0, 6).forEach((p, i) => {
    const asteptat = eticheta(p.ts);
    const corect = p.label === asteptat;
    console.log(
      (i + 1) + '. afișat: „' + p.label + '” | recalculat pe ceasul curent: „' +
      asteptat + '” ' + (corect ? '✓' : '⚠')
    );
  });
})();
