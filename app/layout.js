import './globals.css';
import { SITE, CATEGORII } from '@/lib/config';

export const metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        <header className="masthead">
          <div className="container">
            <a className="brand" href="/">
              {SITE.name}
              <span className="brand-dot">.</span>
            </a>
            <p className="tagline">{SITE.tagline}</p>
            <form className="cauta" action="/cauta" method="get">
              <input
                type="search"
                name="q"
                placeholder="caută în știri…"
                maxLength={80}
                aria-label="Caută în știri"
              />
              <button type="submit">caută</button>
            </form>
          </div>
          <nav className="nav">
            <div className="container nav-in">
              <a href="/">Acasă</a>
              <a href="/moldova">Moldova</a>
              <a href="/extern">Extern</a>
              {CATEGORII.map((c) => (
                <a key={c.slug} href={`/categorie/${c.slug}`}>
                  {c.label}
                </a>
              ))}
            </div>
          </nav>
        </header>

        {children}

        <footer className="footer">
          <div className="container">
            <p className="footer-brand">
              {SITE.name}
              <span className="brand-dot">.</span>
            </p>
            <p className="footer-text">
              Agregator automat de știri: articolele aparțin surselor originale,
              aici apar doar titlul, un scurt rezumat și linkul către publicație.
              Datele se colectează din fluxuri RSS publice și se actualizează
              automat la fiecare 15 minute.
            </p>
            <div className="footer-sources">
              Unimedia · Point.md · Ziarul de Gardă · Realitatea.md ·
              Tribuna.md · Kapital.md · Jurnal.md · Observatorul · TVR Moldova
              <br />
              Știrile externe sunt preluate din secțiunile „extern" ale
              surselor moldovenești.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
