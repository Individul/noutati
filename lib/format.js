// Toate datele se afișează în fusul orar al Moldovei, indiferent de
// fusul serverului (GitHub Actions și Cloudflare rulează în UTC).
const FUS_ORAR = 'Europe/Chisinau';

export function timeAgo(ts) {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'chiar acum';
  if (diffMin < 60) return `acum ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h === 1) return 'acum o oră';
  if (h < 24) return `acum ${h} ore`;
  const zile = Math.floor(h / 24);
  if (zile === 1) return 'ieri';
  if (zile < 7) return `acum ${zile} zile`;
  return new Date(ts).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    timeZone: FUS_ORAR,
  });
}

export function dataLunga(ts) {
  return new Date(ts).toLocaleString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUS_ORAR,
  });
}
