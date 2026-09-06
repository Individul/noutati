// Verificare: ora din banda „Actualizat automat" trebuie să fie Chișinău
(async () => {
  const home = await (await fetch('https://noutati.pages.dev/')).text();
  const updated = (home.match(/Actualizat automat · ([^<]+)</i) || [])[1];
  console.log('banda actualizare:', (updated || '?').trim());
  console.log(
    'ora acum în Chișinău (sistem):',
    new Date().toLocaleString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Chisinau',
    })
  );
})();
