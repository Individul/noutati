# Noutăți.md — agregator de știri

Site de știri construit cu **Next.js** care colectează automat noutăți din
fluxuri RSS publice și de pe site-uri fără RSS, publicându-le organizat pe
două secțiuni principale — **Moldova** și **Extern** — plus cinci teme:
**Politică, Economie, Sport, IT & Știință, Societate**.

Designul este editorial-minimal, tipografic (stilul „front page de ziar",
inspirat de [frontpage.ink](https://frontpage.ink/)): coloană îngustă
centrată, titluri cu font serif, fără imagini, rânduri separate de linii
fine.

## Cum funcționează

1. **Build-ul** (GitHub Actions, la fiecare 20 de minute) colectează în
   paralel toate sursele din `lib/sources.js` (RSS + scraping HTML).
2. Articolele sunt normalizate, clasificate tematic pe cuvinte-cheie și
   **grupate pe subiecte**: știrile similare de la mai multe surse devin o
   singură intrare, marcată „N surse".
3. Pentru fiecare subiect se generează un **sumar GLM** (cache 12 h — se
   plătește doar subiectele noi) și se extrage data reală de publicare.
4. Site-ul complet static (`out/`) se publică pe **Cloudflare Pages** —
   instant pentru vizitatori, fără server, fără costuri.

## Pagini de citire (model „frontpage")

Click pe orice știre deschide pagina internă `/stire/...`:

1. **Sumarul GLM** al subiectului, scris pe baza articolelor tuturor
   surselor din grup (marcat „sumar automat").
2. Dacă AI nu e configurat: textul principal extras de la sursă
   (`lib/article.js`, cu cheerio) — fragment de ~3500 de caractere, nu
   textul integral.
3. Secțiunea **„Sursele subiectului"**: toate articolele grupului, cu
   titlu, sursă, oră și link direct către publicație.
4. La final, știri „din aceeași zonă".

> **Notă legală:** republicarea integrală a articolelor încalcă drepturile
> de autor (legislația privind conținutul presei, ex. Legea 74/2010 din
> România, limitează reutilizarea de către agregatoare). Modelul cu sumar /
> fragment + atribuire + link către surse este cel folosit de agregatoarele
> consacrate și cel implementat aici. Parametri: `PRAG_SUBIECT` în
> `lib/news.js`, `LIMITA_TEXT` în `lib/article.js`.

## Sumarul AI

Activ prin variabile de mediu (locale în `.env.local`, pe Actions în
GitHub Secrets). Fără cheie, site-ul merge pe varianta de rezervă
(text extras + surse).

| Variabilă | Ce conține | Implicit |
| --- | --- | --- |
| `AI_API_KEY` | cheia API | — |
| `AI_BASE_URL` | orice API compatibil OpenAI | `https://api.z.ai/api/coding/paas/v4` |
| `AI_MODEL` | modelul folosit | `glm-5.3` |

Provideri testați: **GLM / Z.AI** (planul individual Coding Plan —
endpoint `/api/coding/paas/v4`; platforma normală folosește
`/api/paas/v4`), OpenAI, Google Gemini (gratuit:
`https://generativelanguage.googleapis.com/v1beta/openai` +
`gemini-2.0-flash`), Groq (gratuit: `https://api.groq.com/openai/v1` +
`llama-3.3-70b-versatile`).

## Căutare

Căsuța din header caută în **titluri, sumare, textul extras al articolelor și
rezumate** — din arhiva D1. Căutarea ignoră diacriticele („vant" găsește
„vânt"), acceptă mai multe cuvinte (toate trebuie să apară) și ordonează
rezultatele după prospătime, cu fragmente evidențiate. Textul căutabil se
construiește la fiecare build în coloana `cautare`.

## Rulare locală

```bash
npm install
# completează AI_API_KEY în .env.local (opțional)
npm run build      # generează out/ — colectează știrile + sumarele
npm run start      # servește build-ul pe http://localhost:3000
```

## Publicare pe Cloudflare Pages (gratuit)

Arhitectura: **GitHub Actions face build-ul și publică prin wrangler**.
Cron-ul de la pasul 4 ține site-ul proaspăt fără niciun push.

1. **Push** al dosarului acestui proiect într-un repo GitHub.
2. **Token Cloudflare**: dash.cloudflare.com → My Profile → API Tokens →
   Create Token → șablonul **Edit Cloudflare Workers** este suficient
   (include Pages) — sau un token custom cu „Cloudflare Pages: Edit".
   Notează și **Account ID** (pagina principală a dashboardului, dreapta).
3. **Arhiva pe 1 an** (Cloudflare D1 — nivel gratuit, 5 GB ≈ 1,5 mil.
   subiecte). O dată, din dosarul proiectului:
   ```bash
   npx wrangler login
   npx wrangler d1 create noutati-arhiva
   npx wrangler d1 execute noutati-arhiva --remote --file=schema.sql
   ```
   Copiază `database_id` afișat de wrangler în `wrangler.toml` (câmpul
   `database_id`).
4. **Secrets în GitHub** (repo → Settings → Secrets and variables →
   Actions), toate ca *repository secrets*:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `AI_API_KEY` (+ opțional `AI_BASE_URL`, `AI_MODEL`)
5. **Activează programarea**: tabul Actions al repo-ului → workflow-ul
   „Build și publicare" → Enable. Domeniul publicat apare în Actions log
   (`noutati.pages.dev`) și în Cloudflare dashboard → Workers & Pages.
6. **Domeniu propriu** (ex. `noutati.md`): Cloudflare dashboard → Pages →
   proiectul tău → Custom domains — se adaugă cu un click, certificatul e
   automat.

## Linkuri și arhiva de subiecte

- **1 an**: fiecare subiect intră la build în baza D1; pagina lui
  (`/stire/...`) se servește de funcția Cloudflare din arhivă, chiar și
  după ce subiectul dispare din știrile curente (badge „din arhivă").
  Retenția se ajustează în `scripts/genereaza-insereaza.mjs`
  (`ZILE_RETENTIE`).
- **7+ zile**: în plus, paginile HTML din build-urile recente se
  păstrează prin `scripts/pagini-vechi.js` — linkurile foarte recente nu
  se schimbă niciodată între builduri.
- După un an, subiectul arată pagina 404 prietenoasă.

Frecvența buildurilor se schimbă în `.github/workflows/build-deploy.yml`
(`cron`). Pe repo public, Actions e nelimitat; pe repo privat ai 2000
min/lună — pentru builduri mai dese de 6/zi, fă repo-ul public.

## Linkuri și arhiva de subiecte

- **1 an**: fiecare subiect intră la build în baza D1; pagina lui
  (`/stire/...`) se servește de funcția Cloudflare din arhivă, chiar și
  după ce subiectul dispare din știrile curente (badge „din arhivă").
  Retenția se ajustează în `scripts/genereaza-insereaza.mjs`
  (`ZILE_RETENTIE`).
- **7+ zile**: în plus, paginile HTML din build-urile recente se
  păstrează prin `scripts/pagini-vechi.js` — linkurile foarte recente nu
  se schimbă niciodată între builduri.
- După un an, subiectul arată pagina 404 prietenoasă.

## Personalizare

| Ce vrei să schimbi | Unde |
| --- | --- |
| Numele site-ului / descrierea | `lib/config.js` → `SITE` |
| Sursele de știri (adaugi/scoți) | `lib/sources.js` |
| Site-uri **fără RSS** | `lib/sources.js` cu `tip: 'html'` + selectori CSS (exemple: Jurnal.md, Observatorul); funcționează doar pentru site-uri randate pe server |
| Categoriile tematice + cuvintele-cheie | `lib/config.js` → `CATEGORII`, `lib/news.js` → `TEME_KEYWORDS` |
| Frecvența actualizării | `.github/workflows/build-deploy.yml` → `cron` |
| Culorile / designul | `app/globals.css` (variabilele din `:root`) |

## Notă legală

Site-ul este un agregator: articolele aparțin surselor originale, aici apar
doar sumarul/fragmentul cu atribuire clară și linkuri către publicații.
Dacă o sursă îți solicită eliminarea, scoate-o din `lib/sources.js`.
