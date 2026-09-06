import { getNewsDupaRegiune } from '@/lib/news';
import ArticleRow from '@/components/ArticleRow';

export const metadata = {
  title: 'Știri din străinătate (Extern)',
  description:
    'Ultimele noutăți din lume — internațional, politică externă, economie globală — colectate automat din surse de presă.',
};

export default async function PaginaExtern() {
  const { extern } = await getNewsDupaRegiune();

  return (
    <main className="container">
      <div className="page-head">
        <span className="kicker">secțiune</span>
        <h1>Extern</h1>
        <p>
          Ce se întâmplă în lume: știri internaționale colectate automat din
          presa de limbă română.
        </p>
      </div>

      <div>
        {extern.slice(0, 50).map((item) => (
          <ArticleRow key={item.id} item={item} />
        ))}
        {extern.length === 0 && (
          <p className="gol">Momentan nu sunt știri. Revino în câteva minute.</p>
        )}
      </div>
    </main>
  );
}
