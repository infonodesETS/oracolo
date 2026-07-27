/* ============================================================
   ORACOLO DEL DISSENSO — pagina "tutti i dati"
   Stessi grafici della pagina principale (js/grafici.js), ma tutti a
   dimensione piena e con la tabella dei numeri già aperta.
   ============================================================ */

function avanzamento() {
  const barra = document.getElementById('barra');
  const aggiorna = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    barra.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  };
  addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();
}

(async function avvia() {
  avanzamento();
  const contenuto = document.getElementById('contenuto');

  try {
    const r = await fetch('data/sondaggio.json');
    if (!r.ok) throw new Error('data/sondaggio.json non trovato');
    const d = await r.json();

    document.getElementById('sommario').textContent = d.meta.sommario;
    document.getElementById('meta').innerHTML =
      badge(d.placeholder, 'dati parziali — questionario ancora aperto') +
      `<span>${d.meta.rispondenti} rispondenti · ${esc(d.meta.periodo)}</span>`;

    d.sezioni.forEach((sez) => {
      const s = el('section', 'parte-dati');
      s.id = sez.id;
      s.append(el('header', 'parte-dati__testata',
        `<p class="sottosezione__numero">Parte ${esc(sez.numero)}</p>` +
        `<h2 class="sottosezione__titolo">${esc(sez.titolo)}</h2>` +
        `<p class="sottosezione__testo">${esc(sez.testo)}</p>`));

      sez.blocchi.forEach((b) => {
        const art = el('article', 'scheda-dato');
        art.id = b.id;
        const daScrivere = /^TESTO DA SCRIVERE/.test(b.testo);
        art.append(el('div', 'scheda-dato__testo',
          `<h3>${esc(b.titolo)}</h3>` +
          `<p${daScrivere ? ' class="in-attesa"' : ''}>` +
          `${esc(daScrivere ? 'testo da scrivere' : b.testo)}</p>` +
          `<p class="scheda-dato__ancora"><a href="#${esc(b.id)}">` +
          `collegamento diretto a questa domanda</a></p>`));
        art.append(costruisciGrafico(b, { tabellaSempre: true }));
        s.append(art);
      });
      contenuto.append(s);
    });

    osservaGrafici([...contenuto.querySelectorAll('.scheda-dato')]);

    // se si arriva con un'ancora, la pagina è appena stata costruita:
    // il salto va rifatto adesso
    if (location.hash) {
      const t = document.getElementById(location.hash.slice(1));
      if (t) t.scrollIntoView();
    }
  } catch (err) {
    console.error(err);
    contenuto.innerHTML =
      `<div class="colonna"><p class="occhiello">Errore</p>
       <p>Non riesco a leggere i dati: ${esc(err.message)}.
       La pagina va aperta da un server locale, non con doppio clic sul
       file.</p></div>`;
  }
})();
