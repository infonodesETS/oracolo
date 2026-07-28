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

/* Tema chiaro: serve a leggere alla luce e a stampare senza sprecare
   inchiostro. La scelta resta salvata nel browser. */
function interruttoreTema() {
  const btn = document.getElementById('tema');
  if (!btn) return;

  const applica = (chiaro) => {
    document.body.classList.toggle('chiaro', chiaro);
    btn.setAttribute('aria-pressed', String(chiaro));
    btn.textContent = chiaro ? 'Sfondo scuro' : 'Sfondo chiaro';
    try { localStorage.setItem('oracolo-tema', chiaro ? 'chiaro' : 'scuro'); } catch (e) { /* privato */ }
  };

  let salvato = null;
  try { salvato = localStorage.getItem('oracolo-tema'); } catch (e) { /* privato */ }
  applica(salvato === 'chiaro');
  btn.addEventListener('click', () => applica(!document.body.classList.contains('chiaro')));
}

/* In stampa deve esserci tutto: le citazioni chiuse a fisarmonica non si
   vedrebbero, e sono il materiale migliore del sondaggio. */
function preparaStampa() {
  const apri = () => document.querySelectorAll('.tema__citazioni').forEach((p) => {
    p.dataset.eraChiuso = p.hidden ? '1' : '';
    p.hidden = false;
  });
  const richiudi = () => document.querySelectorAll('.tema__citazioni').forEach((p) => {
    if (p.dataset.eraChiuso) p.hidden = true;
  });
  addEventListener('beforeprint', apri);
  addEventListener('afterprint', richiudi);

  const btn = document.getElementById('stampa');
  if (btn) btn.addEventListener('click', () => window.print());
}

(async function avvia() {
  avanzamento();
  interruttoreTema();
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

    // Qui i grafici si disegnano tutti subito, non allo scorrimento: questa è
    // la pagina da cui si stampa, e un grafico non ancora "attivato" finirebbe
    // nel PDF con le barre vuote.
    contenuto.querySelectorAll('.scheda-dato').forEach(animaGrafico);
    preparaStampa();

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
