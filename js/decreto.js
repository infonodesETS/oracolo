/* ============================================================
   ORACOLO DEL DISSENSO — il solo decreto, in consultazione
   Pagina a sé, da mandare alle organizzazioni partner: lo stesso
   data/decreto.json della pagina principale (il testo esiste in un posto
   solo), ma qui gli articoli sono tutti aperti e ognuno ha il suo pulsante
   per commentare. Chi e come si commenta sta in data/feedback.json.
   ============================================================ */

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Gli articoli citano le norme vere: nei JSON i collegamenti si scrivono come
   [testo](indirizzo). Si escapa prima e si sostituisce dopo, così dal file dei
   contenuti non può arrivare HTML, e passano solo gli indirizzi http/https. */
function conLink(t) {
  return esc(t).replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, testo, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${testo}</a>`);
}

/* I commi di un articolo, numerati come in un decreto vero. Le lettere a), b)
   stanno su righe proprie dentro il comma che le introduce. */
function commiArticolo(testo) {
  const commi = Array.isArray(testo) ? testo : [testo];
  return '<ol class="commi">' + commi.map((c) => {
    const righe = String(c).split('\n');
    return `<li><p>${conLink(righe[0])}</p>` +
      (righe.length > 1
        ? `<p class="commi__lettere">${righe.slice(1).map(conLink).join('<br>')}</p>`
        : '') + '</li>';
  }).join('') + '</ol>';
}

function avanzamento() {
  const barra = document.getElementById('barra');
  const aggiorna = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    barra.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  };
  addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();
}

/* ---------- il modulo dei commenti ----------
   Il link al modulo Google si può precompilare: così chi arriva dal pulsante
   dell'articolo 3 trova già scritto «Art. 3» e non deve cercarlo in un menù.
   Finché in data/feedback.json manca l'indirizzo, i pulsanti restano spenti:
   meglio un tasto che dice «non ancora attivo» di uno che non porta da nessuna
   parte. */
function linkModulo(modulo, etichetta) {
  if (!modulo || !modulo.url) return null;
  if (!modulo.campoArticolo || !etichetta) return modulo.url;
  const unione = modulo.url.includes('?') ? '&' : '?';
  return modulo.url + unione + 'usp=pp_url&' +
    encodeURIComponent(modulo.campoArticolo) + '=' + encodeURIComponent(etichetta);
}

function tastoCommenta(modulo, etichetta, testo) {
  const url = linkModulo(modulo, etichetta);
  if (!url) {
    return el('p', 'commenta commenta--spento',
      `<span class="btn btn--ghost" aria-disabled="true">${esc(testo)}</span>` +
      `<span class="commenta__manca">modulo non ancora attivo</span>`);
  }
  const p = el('p', 'commenta');
  const a = el('a', 'btn btn--ghost', esc(testo));
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  p.append(a);
  return p;
}

/* ---------- le parti della pagina ---------- */

function testata(d) {
  const h = el('header', 'ddl__testata colonna');
  h.innerHTML =
    `<p class="occhiello">${esc(d.meta.occhiello)}</p>` +
    `<p class="gazzetta__riga">${esc(d.meta.gazzetta)}</p>` +
    `<h1 class="ddl__titolo">${esc(d.meta.titolo)}</h1>` +
    `<p class="gazzetta__riga">${esc(d.meta.sottotitolo)}</p>` +
    (d.placeholder
      ? `<p class="badge-provvisorio">bozza in consultazione</p>`
      : '') +
    `<p class="lead">${esc(d.meta.sommario)}</p>` +
    `<p class="avvertenza">${esc(d.meta.avvertenza)}</p>`;
  return h;
}

function invito(f) {
  if (!f.invito) return null;
  const box = el('section', 'consultazione colonna');
  box.innerHTML =
    `<h2 class="consultazione__titolo">${esc(f.invito.titolo)}</h2>` +
    (f.invito.paragrafi || []).map((t) => `<p>${esc(t)}</p>`).join('') +
    ((f.invito.cosa_ci_serve || []).length
      ? `<p class="consultazione__eti">Che cosa ci è utile sapere</p><ul>` +
        f.invito.cosa_ci_serve.map((t) => `<li>${esc(t)}</li>`).join('') + `</ul>`
      : '') +
    // la chiusa dopo l'elenco: è la riga che dà il tono alla consultazione,
    // quindi sta staccata e in evidenza, non infilata tra i punti
    (f.invito.dopo || []).map((t) =>
      `<p class="consultazione__chiosa">${esc(t)}</p>`).join('') +
    // la data entro cui si commenta: è l'unica informazione del riquadro che
    // chi legge deve ricordarsi dopo aver chiuso la pagina
    (f.invito.scadenza
      ? `<p class="consultazione__scadenza">${esc(f.invito.scadenza)}</p>`
      : '');
  return box;
}

/* L'indice: otto articoli da leggere di fila sono tanti, e chi commenta deve
   poter saltare dritto a quello che gli interessa. */
function indice(d) {
  const box = el('nav', 'indice colonna');
  box.setAttribute('aria-label', 'Articoli del decreto');
  box.innerHTML = '<p class="indice__eti">Gli articoli</p>' +
    d.capi.map((capo) =>
      `<p class="indice__capo">${esc(capo.numero)} — ${esc(capo.titolo)}</p>` +
      '<ol class="indice__voci">' +
      capo.articoli.map((a) =>
        `<li><a href="#art-${a.n}"><b>Art. ${a.n}</b> ${esc(a.rubrica)}</a></li>`
      ).join('') + '</ol>'
    ).join('');
  return box;
}

function articoli(d, f) {
  const lista = el('div', 'articoli ddl__articoli colonna');
  d.capi.forEach((capo) => {
    const c = el('section', 'capo');
    c.append(el('header', 'capo__testata',
      `<p class="capo__numero">${esc(capo.numero)}</p>` +
      `<h2 class="capo__titolo">${esc(capo.titolo)}</h2>`));

    capo.articoli.forEach((a) => {
      const art = el('article', 'articolo articolo--intero');
      art.id = `art-${a.n}`;
      art.innerHTML =
        `<p class="articolo__num"><a href="#art-${a.n}">Art. ${a.n}</a></p>` +
        `<h3 class="articolo__rubrica">${esc(a.rubrica)}</h3>` +
        (a.testo
          ? commiArticolo(a.testo)
          : `<p class="in-attesa">testo in stesura</p>`) +
        (a.risponde
          ? `<p class="articolo__risponde"><b>Ribalta</b>${esc(a.risponde)}</p>`
          : '');
      art.append(tastoCommenta(f.modulo, `Art. ${a.n} — ${a.rubrica}`,
        `Commenta l'articolo ${a.n}`));
      c.append(art);
    });
    lista.append(c);
  });
  return lista;
}

function chiusura(f) {
  const box = el('section', 'consultazione consultazione--coda colonna');
  box.id = 'commenta';
  const c = f.chiusura || {};
  box.innerHTML =
    `<h2 class="consultazione__titolo">${esc(c.titolo || 'Mandaci un commento')}</h2>` +
    (c.testo ? `<p>${esc(c.testo)}</p>` : '');
  box.append(tastoCommenta(f.modulo, 'Tutto il decreto',
    'Commenta tutto il decreto'));
  if (f.email) {
    box.append(el('p', 'consultazione__email',
      `Oppure scrivi a <a href="mailto:${esc(f.email)}?subject=${
        encodeURIComponent('Commenti al DDL Vera Sicurezza')
      }">${esc(f.email)}</a>, anche allegando un documento.`));
  }
  const stampa = el('button', 'btn btn--ghost stampa', 'Stampa o salva in PDF');
  stampa.type = 'button';
  stampa.addEventListener('click', () => print());
  const riga = el('p', 'consultazione__stampa');
  riga.append(stampa);
  box.append(riga);
  return box;
}

/* ---------- avvio ---------- */

(async function avvia() {
  avanzamento();
  const c = document.getElementById('contenuto');
  c.className = 'ddl';

  try {
    const [d, f] = await Promise.all([
      fetch('data/decreto.json', { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error('data/decreto.json non trovato'); return r.json(); }),
      fetch('data/feedback.json', { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]);

    c.append(testata(d));
    const inv = invito(f);
    if (inv) c.append(inv);
    c.append(indice(d));
    c.append(articoli(d, f));
    c.append(chiusura(f));
  } catch (err) {
    console.error(err);
    c.innerHTML =
      `<div class="colonna"><p class="occhiello">Errore</p>
       <p>Non riesco a leggere il testo del decreto: ${esc(err.message)}.
       La pagina va aperta da un server, non con doppio clic sul file.</p></div>`;
  }
})();
