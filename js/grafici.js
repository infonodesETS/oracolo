/* ============================================================
   ORACOLO DEL DISSENSO — codice condiviso
   Lo usano la pagina principale e la pagina "tutti i dati": i grafici si
   disegnano con lo stesso codice, così le due non possono divergere.
   In fondo c'è anche la voce di menù che si accende scorrendo, che serve
   a tutte e due.
   ============================================================ */

const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const badge = (attivo, testo) =>
  attivo ? `<p class="badge-provvisorio">${esc(testo)}</p>` : '';

/* quante voci mostra un grafico piccolo prima di rimandare al dettaglio */
const VOCI_MINI = 6;

/* ---------- tabella dei numeri ---------- */

function tabellaDati(serie, unita) {
  const t = el('table', 'tabella-dati');
  t.innerHTML =
    `<thead><tr><th>Risposta</th><th>${esc(unita)}</th></tr></thead><tbody>` +
    serie.map((s) => `<tr><td>${esc(s.etichetta)}</td><td>${s.valore}</td></tr>`).join('') +
    '</tbody>';
  return t;
}

/* La stessa tabella, per i confronti: due colonne invece di una, e accanto
   alla quota il numero di persone. Serve sulla pagina dei dati, che è quella
   da cui si stampa il documento completo dei risultati: una percentuale senza
   il numero dietro non si può citare. */
function tabellaConfronto(g) {
  const suf = g.suffisso || '';
  const t = el('table', 'tabella-dati');
  t.innerHTML =
    '<thead><tr><th>Risposta</th>' +
    g.serieNomi.map((nome) => `<th>${esc(nome)}</th>`).join('') +
    '</tr></thead><tbody>' +
    g.serie.map((s) => `<tr><td>${esc(s.etichetta)}</td>` +
      s.valori.map((v, i) =>
        `<td>${v}${esc(suf)}${s.conteggi ? ` (${s.conteggi[i]})` : ''}</td>`
      ).join('') + '</tr>').join('') +
    '</tbody>';
  return t;
}

function piedeGrafico(g, contenitore, tabellaSempre) {
  const piede = el('div', 'grafico__piede');
  piede.append(el('span', null, esc(g.unita || '')));
  if (g.serie && !dueSerie(g) && !tabellaSempre) {
    const btn = el('button', null, 'vedi i dati in tabella');
    let tab = null;
    btn.addEventListener('click', () => {
      if (tab) { tab.remove(); tab = null; btn.textContent = 'vedi i dati in tabella'; return; }
      tab = tabellaDati(g.serie, g.unita);
      contenitore.append(tab);
      btn.textContent = 'nascondi la tabella';
    });
    piede.append(btn);
  }
  return piede;
}

/* ---------- due serie affiancate ----------
   Le usano le due domande aperte («temi») e i confronti fra giornalisti e
   attivisti («confronto»): stesse barre appaiate, stessa legenda. Cambia
   solo quello che ci sta attaccato — le citazioni sotto ogni riga compaiono
   dove ci sono, e il suffisso serve alle quote, che sono percentuali. */

const dueSerie = (g) => g.tipo === 'temi' || g.tipo === 'confronto';

function costruisciDueSerie(g) {
  const max = Math.max(...g.serie.flatMap((s) => s.valori));
  const suf = g.suffisso || '';
  const box = el('div', 'temi');

  box.append(el('div', 'temi__legenda',
    g.serieNomi.map((nome, i) =>
      `<span class="temi__voce"><i class="temi__segno temi__segno--${i}"></i>${esc(nome)}</span>`
    ).join('')));

  const lista = el('div', 'temi__lista');
  g.serie.forEach((s) => {
    const riga = el('div', 'tema');
    const apribile = !!s.citazioni;
    // senza niente da leggere sotto, la riga non finge di essere un tasto
    const testa = el(apribile ? 'button' : 'div',
      'tema__testa' + (apribile ? '' : ' tema__testa--fisso'));
    if (apribile) {
      testa.type = 'button';
      testa.setAttribute('aria-expanded', 'false');
    }
    testa.innerHTML =
      `<span class="tema__nome">${esc(s.etichetta)}</span>` +
      s.valori.map((v, i) =>
        `<span class="tema__riga">
           <span class="tema__pista"><span class="tema__fill tema__fill--${i}" data-w="${(v / max) * 100}"></span></span>
           <span class="tema__val">${v}${esc(suf)}</span>
         </span>`).join('') +
      (apribile ? `<span class="tema__apri">leggi le risposte</span>` : '');
    riga.append(testa);

    if (apribile) {
      const pannello = el('div', 'tema__citazioni');
      pannello.hidden = true;
      pannello.innerHTML = g.serieNomi.map((nome, i) => {
        const q = s.citazioni[i === 0 ? 'W' : 'X'];
        if (!q || !q.length) return '';
        return `<div class="citazioni"><h5>${esc(nome)}</h5>` +
          q.map((c) => `<blockquote>${esc(c)}</blockquote>`).join('') + '</div>';
      }).join('');

      testa.addEventListener('click', () => {
        const aperto = testa.getAttribute('aria-expanded') === 'true';
        testa.setAttribute('aria-expanded', String(!aperto));
        pannello.hidden = aperto;
      });
      riga.append(pannello);
    }
    lista.append(riga);
  });
  box.append(lista);

  if (g.senzaTema) {
    box.append(el('p', 'temi__resto',
      `Restano fuori ${g.senzaTema.W} risposte alla prima domanda e ` +
      `${g.senzaTema.X} alla seconda: chi non ha risposto, chi ha scritto ` +
      `«come sopra», chi ha detto cose che non rientrano in nessuno di ` +
      `questi temi.`));
  }
  return box;
}

/* ---------- un grafico ----------
   opzioni:
     mini            → versione compatta per la griglia dei piccoli
     tabellaSempre   → la tabella dei numeri è già aperta (pagina dei dati)
     titolo          → mostra il titolo dentro il grafico                     */

function costruisciGrafico(blocco, opz = {}) {
  const g = blocco.grafico;
  const wrap = el('figure', 'grafico' + (opz.mini ? ' grafico--mini' : ''));
  wrap.style.margin = '0';

  if (opz.titolo) {
    wrap.append(el('figcaption', 'grafico__titolo', esc(blocco.titolo)));
  } else {
    // a schermo il titolo è già l'<h4> del blocco: qui serve solo a chi usa
    // uno screen reader
    wrap.append(el('figcaption', 'sr-only', esc(blocco.titolo)));
  }

  if (g.tipo === 'quota') {
    const suf = g.suffisso ?? '%';
    wrap.append(el('div', 'quota',
      `<p class="quota__num" data-conta="${g.valore}" data-suffisso="${esc(suf)}">` +
      `0<span class="quota__suf">${esc(suf)}</span></p>` +
      `<p class="quota__et">${esc(g.etichetta)}</p>`));
  } else if (dueSerie(g)) {
    wrap.append(costruisciDueSerie(g));
  } else {
    const tutte = g.serie;
    const mostrate = opz.mini ? tutte.slice(0, VOCI_MINI) : tutte;
    const max = Math.max(...tutte.map((s) => s.valore));

    if (g.tipo === 'barre-orizzontali' || opz.mini) {
      const lista = el('div', 'barre-h');
      mostrate.forEach((s) => {
        const b = el('div', 'barra-h');
        if (s.tono) b.dataset.tono = s.tono;
        b.innerHTML =
          `<span class="barra-h__et">${esc(s.etichetta)}</span>` +
          `<span class="barra-h__pista"><span class="barra-h__fill" data-w="${(s.valore / max) * 100}"></span></span>` +
          `<span class="barra-h__val">${s.valore}</span>`;
        lista.append(b);
      });
      wrap.append(lista);
    } else {
      const colonne = el('div', 'barre-v');
      const etichette = el('div', 'barre-v__et');
      mostrate.forEach((s) => {
        const b = el('div', 'barra-v');
        if (s.tono) b.dataset.tono = s.tono;
        b.innerHTML =
          `<span class="barra-v__val">${s.valore}</span>` +
          `<span class="barra-v__fill" data-h="${(s.valore / max) * 100}"></span>`;
        colonne.append(b);
        etichette.append(el('span', null, esc(s.etichetta)));
      });
      wrap.append(colonne, etichette);
    }

    if (opz.mini && tutte.length > VOCI_MINI) {
      wrap.append(el('p', 'grafico__resto',
        `+ altre ${tutte.length - VOCI_MINI} risposte`));
    }
  }

  if (!opz.mini) wrap.append(piedeGrafico(g, wrap, opz.tabellaSempre));
  if (opz.tabellaSempre && g.serie) {
    if (!dueSerie(g)) wrap.append(tabellaDati(g.serie, g.unita));
    else if (g.tipo === 'confronto') wrap.append(tabellaConfronto(g));
  }
  return wrap;
}

/* ---------- disegno delle barre ---------- */

function animaGrafico(fig) {
  fig.querySelectorAll('.barra-h__fill, .tema__fill').forEach((f) => { f.style.width = f.dataset.w + '%'; });
  fig.querySelectorAll('.barra-v__fill').forEach((f) => { f.style.height = f.dataset.h + '%'; });
  const num = fig.querySelector('[data-conta]');
  if (num && !num.dataset.fatto) {
    num.dataset.fatto = '1';
    const meta = Number(num.dataset.conta);
    const suf = esc(num.dataset.suffisso || '%');
    let v = 0;
    const t = setInterval(() => {
      v = Math.min(meta, v + Math.ceil(meta / 28));
      num.innerHTML = `${v}<span class="quota__suf">${suf}</span>`;
      if (v >= meta) clearInterval(t);
    }, 28);
  }
}

/* ---------- la voce di menù della sezione in cui si sta leggendo ----------
   Si accende quella corrispondente alla sezione che occupa il terzo alto
   dello schermo: è il punto dove l'occhio sta leggendo davvero, non il bordo
   superiore della finestra. */

/* `quandoCambia` viene chiamata a ogni passaggio da una sezione all'altra, con
   la sezione in cui si è entrati (o null, se si è tornati sopra la prima).
   La usa la pagina principale per tenere l'indirizzo allineato alla lettura. */
function evidenziaMenu(quandoCambia) {
  const voci = [...document.querySelectorAll('.nav__voci a[href*="#"]')]
    .map((a) => ({ a, sez: document.getElementById(a.getAttribute('href').split('#')[1]) }))
    .filter((v) => v.sez)
    .sort((x, y) => x.sez.getBoundingClientRect().top - y.sez.getBoundingClientRect().top);
  if (!voci.length) return;

  let precedente;
  const aggiorna = () => {
    const linea = scrollY + innerHeight * 0.35;
    let attiva = null;
    voci.forEach((v) => {
      if (v.sez.getBoundingClientRect().top + scrollY <= linea) attiva = v;
    });
    voci.forEach((v) => v.a.classList.toggle('attivo', v === attiva));
    if (quandoCambia && attiva !== precedente) {
      precedente = attiva;
      quandoCambia(attiva && attiva.sez);
    }
  };

  addEventListener('scroll', aggiorna, { passive: true });
  addEventListener('resize', aggiorna);
  aggiorna();
}

/* quando i grafici entrano nello schermo si disegnano; se per qualche motivo
   l'osservatore non parte, la rete di sicurezza li disegna comunque */
function osservaGrafici(elementi) {
  const io = new IntersectionObserver((voci) => {
    voci.forEach((v) => {
      v.target.classList.toggle('attivo', v.isIntersecting);
      if (v.isIntersecting) animaGrafico(v.target);
    });
  }, { rootMargin: '-15% 0px -15% 0px' });
  elementi.forEach((e) => io.observe(e));
  setTimeout(() => elementi.forEach(animaGrafico), 3000);
}
