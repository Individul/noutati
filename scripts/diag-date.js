// Diagnostic: subiectul raportat — ce date au membrii lui
(async () => {
  const page = await (
    await fetch('https://noutati.pages.dev/stire/be123ec57451dbdf')
  ).text();
  const titlu = (page.match(/<h1 class="reader-title">([^<]+)/) || [])[1];
  console.log('SUBIECT:', titlu?.slice(0, 70));

  const links = [...page.matchAll(/<a class="sursa"[^>]*href="([^"]+)"/g)].map(
    (m) => m[1]
  );
  console.log('membri:', links.length);

  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
  for (const link of links) {
    try {
      const html = await (
        await fetch(link, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
      ).text();
      const pub = [...html.matchAll(/"(datePublished|dateModified)":\s*"([^"]+)"/g)].map(
        (m) => m[1] + '=' + m[2]
      );
      const metaPub = (
        html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/) || []
      )[1];
      console.log('---', new URL(link).hostname);
      console.log('    JSON-LD:', pub.slice(0, 2).join(' | ') || 'nimic');
      console.log('    meta published_time:', metaPub || '—');
    } catch (e) {
      console.log('---', link.slice(0, 50), 'EROARE:', e.message.slice(0, 40));
    }
  }
})();
