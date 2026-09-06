// Timpii „vii": recalcularea etichetelor relative pe ceasul vizitatorului.
// Elementele cu [data-ts] conțin timestamp-ul real; eticheta din [data-timp]
// se reformatează la încărcare și apoi la fiecare minut.
(function () {
  var FUS = 'Europe/Chisinau';

  function eticheta(ts) {
    var diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'chiar acum';
    if (diffMin < 60) return 'acum ' + diffMin + ' min';
    var h = Math.floor(diffMin / 60);
    if (h === 1) return 'acum o oră';
    if (h < 24) return 'acum ' + h + ' ore';
    var z = Math.floor(h / 24);
    if (z === 1) return 'ieri';
    if (z < 7) return 'acum ' + z + ' zile';
    return new Date(ts).toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'short',
      timeZone: FUS,
    });
  }

  function actualizeaza() {
    var elemente = document.querySelectorAll('[data-ts]');
    for (var i = 0; i < elemente.length; i++) {
      var el = elemente[i];
      var ts = Number(el.getAttribute('data-ts'));
      if (!ts) continue;
      var tinta = el.querySelector('[data-timp]') || el;
      tinta.textContent = eticheta(ts);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', actualizeaza);
  } else {
    actualizeaza();
  }
  setInterval(actualizeaza, 60000);
})();
