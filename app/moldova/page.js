import { getNewsDupaRegiune } from '@/lib/news';
import ArticleRow from '@/components/ArticleRow';

export const metadata = {
  title: 'Știri din Moldova',
  description:
    'Ultimele noutăți din Republica Moldova — politică, economie, societate — colectate automat din surse locale.',
};

export default async function PaginaMoldova() {
  const { moldova } = await getNewsDupaRegiune();

  return (
    <main className="container">
      <div className="page-head">
        <span className="kicker">secțiune</span>
        <h1>Moldova</h1>
        <p>
          Ultimele știri din Republica Moldova, colectate automat din surse
          locale de presă.
        </p>
      </div>

      <div>
        {moldova.slice(0, 50).map((item) => (
          <ArticleRow key={item.id} item={item} />
        ))}
        {moldova.length === 0 && (
          <p className="gol">Momentan nu sunt știri. Revino în câteva minute.</p>
        )}
      </div>
    </main>
  );
}
