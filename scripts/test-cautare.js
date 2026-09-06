// Test local pentru funcția de căutare (/cauta)
const test = async (q) => {
  const r = await fetch('http://127.0.0.1:8790/cauta?q=' + encodeURIComponent(q));
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

  x = await test('vant'); // fără diacritice
  console.log('q=vant       ->', x.status, '| rezultate:', x.rezultate, '(găsește „vânt")');

  x = await test('cod galben');
  console.log('q=cod galben ->', x.status, '| rezultate:', x.rezultate);

  x = await test('xyzabc');
  console.log('q=xyzabc     ->', x.status, '| rezultate:', x.rezultate, '(asteptat 0)');

  r = await fetch('http://127.0.0.1:8790/cauta');
  const gol = await r.text();
  console.log('q=(gol)      ->', r.status, '| pagina de căutare:', gol.includes('Caută în știri') ? 'DA' : 'nu');
})();
