import Link from 'next/link';

export const metadata = {
  title: 'Pagina nu a fost găsită',
};

export default function NotFound() {
  return (
    <main className="container">
      <div className="page-head">
        <span className="kicker">eroare 404</span>
        <h1>Subiectul nu se mai află pe site</h1>
        <p>
          Știrile se rotesc: subiectele vechi dispar pe măsură ce sursele
          publică articole noi. Revenește la prima pagină pentru cele mai
          recente noutăți din Moldova și din străinătate.
        </p>
        <p style={{ marginTop: 16 }}>
          <a className="sec-more" href="/">
            ← prima pagină
          </a>
        </p>
      </div>
    </main>
  );
}
