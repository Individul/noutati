# Îmbunătățiri în așteptare

## 1. Latența la prima deschidere a unui subiect — REZOLVAT (2026-09-06)

Rezolvat definitiv prin migrarea la **build static**: paginile se
construiesc înainte de click (build GitHub Actions la fiecare 20 min +
publicare Cloudflare Pages). Zero generare la cerere, zero așteptare.

Adițional implementat:
- **Arhiva de pagini** (`scripts/pagini-vechi.js`): linkurile partajate
  trăiesc minim 7 zile după ce subiectul rotește din știri (se ajustează
  cu `ZILE` în script). Fără arhivă, linkurile ar muri la următorul build.
- **Cache partajat între builduri** (GitHub Actions cache): sumarele GLM
  se plătește doar pentru subiectele noi.

### Ce mai rămâne (opțional, la nevoie)
- Cloudflare Pages are limita de 20.000 fișiere/proiect — cu arhiva de
  7 zile (~5-15k pagini) e loc, dar dacă mărești fereastra mult, ține cont
  de ea (sau redu `.txt`-urile din arhivă).
- GitHub Actions poate întârzia declanșarea cu câteva minute — suficient
  pentru acest caz.
