// Sursele site-ului. Toate au fost verificate la creare.
// region: 'moldova' sau 'extern'.
//
// Două tipuri de surse:
//  1. RSS (implicit):      { id, name, url, region }
//  2. HTML (site fără RSS): { id, name, region, tip: 'html', pagina,
//     selectorArticol, selectorTitlu } — selectorii CSS indică linkurile
//     cu titluri din pagina principală / de secțiune.

export const SOURCES = [
  // ——— Moldova ———
  { id: 'unimedia', name: 'Unimedia', url: 'https://unimedia.info/ro/rss/all/', region: 'moldova' },
  { id: 'zdg', name: 'Ziarul de Gardă', url: 'https://zdg.md/feed', region: 'moldova' },
  { id: 'realitatea', name: 'Realitatea.md', url: 'https://realitatea.md/feed', region: 'moldova' },
  { id: 'tribuna', name: 'Tribuna.md', url: 'https://www.tribuna.md/rss', region: 'moldova' },
  { id: 'kapital', name: 'Kapital.md', url: 'https://kapital.md/rss', region: 'moldova' },
  {
    id: 'jurnalmd',
    name: 'Jurnal.md',
    region: 'moldova',
    tip: 'html',
    pagina: 'https://jurnal.md/',
    selectorArticol: 'a.animsition-link[href*="/ro/news/"]',
  },
  {
    // feed-ul RSS oficial (observatorul.md/feed/) e neglijat — cel mai nou
    // articol are peste o lună, deși site-ul publică zilnic; de aceea
    // citim direct pagina principală
    id: 'observatorul',
    name: 'Observatorul',
    region: 'moldova',
    tip: 'html',
    pagina: 'https://observatorul.md/',
    selectorArticol: '.entry-title a',
  },

  // ——— Extern ———
  { id: 'digi24', name: 'Digi24', url: 'https://www.digi24.ro/rss', region: 'extern' },
  { id: 'protv', name: 'Știrile ProTV', url: 'https://www.stirileprotv.ro/rss/', region: 'extern' },
  { id: 'adevarul', name: 'Adevărul', url: 'https://www.adevarul.ro/rss/latest', region: 'extern' },
  { id: 'g4media', name: 'G4Media', url: 'https://www.g4media.ro/feed', region: 'extern' },
  { id: 'dcnews', name: 'DC News', url: 'https://www.dcnews.ro/rss', region: 'extern' },
  { id: 'mediafax', name: 'Mediafax', url: 'https://www.mediafax.ro/rss', region: 'extern' },
];
