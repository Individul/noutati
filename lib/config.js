// Configurarea site-ului — schimbă aici numele, descrierea și categoriile.
export const SITE = {
  name: 'Noutăți.md',
  tagline: 'Știri din Moldova și din străinătate, actualizate automat',
  description:
    'Agregator de știri: noutăți din Moldova și din străinătate, organizate automat pe regiuni și teme — politică, economie, sport, IT și societate.',
};

export const REGIUNI = [
  { slug: 'moldova', label: 'Moldova' },
  { slug: 'extern', label: 'Extern' },
];

export const CATEGORII = [
  {
    slug: 'politica',
    label: 'Politică',
    descriere: 'Guvern, parlament, alegeri, relații internaționale.',
  },
  {
    slug: 'economie',
    label: 'Economie',
    descriere: 'Bani, afaceri, prețuri, energie și piețe.',
  },
  {
    slug: 'sport',
    label: 'Sport',
    descriere: 'Fotbal, tenis, competiții și sportivi.',
  },
  {
    slug: 'it-si-stiinta',
    label: 'IT & Știință',
    descriere: 'Tehnologie, inteligență artificială, spațiu și cercetare.',
  },
  {
    slug: 'societate',
    label: 'Societate',
    descriere: 'Viață cotidiană, sănătate, educație, evenimente.',
  },
];

export const temaDupaSlug = (slug) => CATEGORII.find((c) => c.slug === slug);

// Știrea principală de pe prima pagină = subiectul cu cele mai multe surse
// din această fereastră de timp (ore). La egalitate, câștigă cea mai nouă.
export const LEAD_FEREASTRA_ORE = 48;
