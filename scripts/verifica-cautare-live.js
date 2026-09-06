// Verificarea căutării pe producție
const test = async (q) => {
  const r = await fetch('https://noutati.pages.dev/cauta?q=' + encodeURIComponent(q));
  const html = await r.text();
  return {
    status: r.status,
    rezultate: (html.match(/<a class="art"/g) || []).length,
    mark: html.includes('<mark>'),
  };
};

(async () => {
  let x = await test('tofan');
  console.log('q=tofan      ->', x.status, '| rezultate:', x.rezultate, '| evidențiere:', x.mark ? 'DA' : 'nu');

  x = await test('vant');
  console.log('q=vant       ->', x.status, '| rezultate:', x.rezultate, '(fără diacritice găsește „vânt")');

  x = await test('cod galben');
  console.log('q=cod galben ->', x.status, '| rezultate:', x.rezultate);

  x = await test('xyzabc');
  console.log('q=xyzabc     ->', x.status, '| rezultate:', x.rezultate, '(asteptat 0)');

  const home = await (await fetch('https://noutati.pages.dev/')).text();
  console.log('formular în header:', home.includes('caută în știri') ? 'DA' : 'NU');
})();
