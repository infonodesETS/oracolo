/* ============================================================
   ORACOLO DEL DISSENSO — il preambolo per intero
   Legge lo stesso data/preambolo.json della pagina principale, così il testo
   esiste in un posto solo.
   ============================================================ */

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  const c = document.getElementById('contenuto');

  try {
    const r = await fetch('data/preambolo.json');
    if (!r.ok) throw new Error('data/preambolo.json non trovato');
    const p = await r.json();

    const testata = el('header', 'preambolo-testata');
    testata.innerHTML =
      `<div class="colonna">
         <p class="occhiello">${esc(p.meta.occhiello)}</p>
         <h1 class="titolo-grosso">${esc(p.meta.titolo)}</h1>
         <p class="lead">${esc(p.meta.sottotitolo)}</p>
       </div>`;
    c.append(testata);

    const corpo = el('article', 'preambolo-corpo colonna');
    if (p.epigrafe) {
      corpo.append(el('figure', 'epigrafe epigrafe--grande',
        `<blockquote>${esc(p.epigrafe.testo)}</blockquote>` +
        `<figcaption>${esc(p.epigrafe.autore)}</figcaption>`));
    }
    p.paragrafi.forEach((t, i) => {
      corpo.append(el('p', i === 0 ? 'lead' : null, esc(t)));
    });
    c.append(corpo);

    if (p.placeholder) {
      c.append(el('div', 'colonna',
        `<p class="avvertenza">Bozza di lavoro, ancora in revisione.</p>`));
    }
  } catch (err) {
    console.error(err);
    c.innerHTML =
      `<div class="colonna"><p class="occhiello">Errore</p>
       <p>Non riesco a leggere il testo: ${esc(err.message)}.
       La pagina va aperta da un server locale, non con doppio clic sul
       file.</p></div>`;
  }
})();
