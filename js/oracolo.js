/* ============================================================
   ORACOLO DEL DISSENSO — logica della pagina principale
   Tutto statico: legge i JSON in /data e costruisce le sezioni.
   I grafici li disegna js/grafici.js, condiviso con la pagina dei dati.
   Nessuna libreria esterna.
   ============================================================ */

const IMG = (slug, n, min = false) =>
  `assets/carte/${String(n).padStart(2, '0')}-${slug}${min ? '-min' : ''}.webp`;

const stato = { carte: [], perNumero: new Map() };

async function carica(nome) {
  const r = await fetch(`data/${nome}.json`);
  if (!r.ok) throw new Error(`data/${nome}.json non trovato`);
  return r.json();
}

/* ---------- barra di avanzamento + nav ---------- */

function avanzamento() {
  const barra = document.getElementById('barra');
  const nav = document.getElementById('nav');
  const soglia = document.getElementById('soglia');

  const aggiorna = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    barra.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
    nav.classList.toggle('visibile', scrollY > soglia.offsetHeight * 0.6);
  };
  addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();
}

/* ---------- ventaglio della soglia ---------- */

function ventaglio() {
  const carte = document.querySelectorAll('.soglia__ventaglio img');
  addEventListener('scroll', () => {
    const p = Math.min(1, scrollY / innerHeight);
    carte.forEach((c) => {
      const i = Number(c.dataset.v) - 3;      // −2 … +2
      c.style.transform =
        `rotate(${i * 13 + i * 22 * p}deg) translateY(${Math.abs(i) * 0.5 + p * 6}rem) scale(${1 - p * .15})`;
      c.style.opacity = String(Math.max(0, .26 - p * .26));
    });
  }, { passive: true });
}

/* ============================================================
   SEZIONE — sondaggio
   ============================================================ */

function sezioneSondaggio(d) {
  const s = document.getElementById('dati');
  const intro = el('div', 'capitolo__intro');
  intro.innerHTML =
    `<p class="capitolo__numero">${esc(s.dataset.capitolo)}</p>` +
    `<p class="occhiello">${esc(d.meta.occhiello)}</p>` +
    badge(d.placeholder, 'dati parziali — questionario ancora aperto') +
    `<h2 class="titolo-grosso">${esc(d.meta.titolo)}</h2>` +
    `<p class="lead">${esc(d.meta.sommario)}</p>` +
    `<p style="font-family:var(--mono);font-size:.8rem;letter-spacing:.1em;color:var(--bianco-3)">` +
    `${d.meta.rispondenti} rispondenti · ${esc(d.meta.periodo)}</p>`;
  s.append(intro);

  const scrolly = el('div', 'scrolly');

  // Un solo grafico per parte, quello che racconta la storia. Tutti gli altri
  // stanno nella pagina dei dati, che è anche quella da cui si stampa il PDF
  // dei risultati completi.
  d.sezioni.forEach((sez) => {
    scrolly.append(el('div', 'sottosezione',
      `<p class="sottosezione__numero">Parte ${esc(sez.numero)}</p>` +
      `<h3 class="sottosezione__titolo">${esc(sez.titolo)}</h3>` +
      `<p class="sottosezione__testo">${esc(sez.testo)}</p>`));

    scrolly.append(bloccoGrande(sez.blocchi.find((b) => b.evidenza) || sez.blocchi[0]));

    const altri = sez.blocchi.length - 1;
    scrolly.append(el('p', 'sottosezione__vaia',
      `<a class="btn btn--ghost" href="dati.html#${esc(sez.id)}">` +
      `Vedi tutte le risposte</a>` +
      (altri > 0
        ? `<span>altre ${altri} domande su questa parte, con i numeri in tabella</span>`
        : '')));
  });
  s.append(scrolly);

  osservaGrafici([...scrolly.querySelectorAll('.blocco')]);
}

function bloccoGrande(b) {
  const alto = b.grafico.tipo === 'temi' ||
    (b.grafico.serie && b.grafico.serie.length > 9);
  const blocco = el('div', 'blocco' + (alto ? ' blocco--largo' : ''));
  const daScrivere = /^TESTO DA SCRIVERE/.test(b.testo);
  blocco.append(
    el('div', 'blocco__testo',
      `<h4>${esc(b.titolo)}</h4>` +
      `<p${daScrivere ? ' class="in-attesa"' : ''}>` +
      `${esc(daScrivere ? 'testo da scrivere' : b.testo)}</p>`),
    el('div', 'blocco__figura'));
  blocco.querySelector('.blocco__figura').append(costruisciGrafico(b));
  return blocco;
}


/* ============================================================
   SEZIONE — decreto
   ============================================================ */

/* Epigrafe e primi paragrafi del preambolo; il testo intero sta in una
   pagina sua, per non seppellire gli articoli sotto la ricostruzione
   storica. Quanti paragrafi mostrare lo dice meta.estratto. */
function preamboloEsteso(p, pagina) {
  const box = el('section', 'preambolo');
  box.innerHTML =
    `<p class="occhiello">${esc(p.meta.occhiello)}</p>` +
    `<h3 class="preambolo__titolo">${esc(p.meta.titolo)}</h3>` +
    (p.epigrafe
      ? `<figure class="epigrafe">
           <blockquote>${esc(p.epigrafe.testo)}</blockquote>
           <figcaption>${esc(p.epigrafe.autore)}</figcaption>
         </figure>`
      : '') +
    p.paragrafi.slice(0, p.meta.estratto || 2)
      .map((t, i) => `<p${i === 0 ? ' class="lead"' : ''}>${esc(t)}</p>`).join('') +
    `<p class="preambolo__oltre">
       <a class="btn" href="${esc(pagina)}">Continua a leggere</a>
       <span>${p.paragrafi.length - (p.meta.estratto || 2)} paragrafi ancora ·
       la ricostruzione completa, dal 2001 a oggi</span>
     </p>`;
  return box;
}

function sezioneDecreto(d) {
  const s = document.getElementById('decreto');

  const testata = el('div', 'gazzetta__testata');
  testata.innerHTML =
    `<p class="capitolo__numero">${esc(s.dataset.capitolo)}</p>` +
    `<p class="occhiello">${esc(d.meta.occhiello)}</p>` +
    `<p class="gazzetta__riga">${esc(d.meta.gazzetta)}</p>` +
    `<h2>${esc(d.meta.titolo)}</h2>` +
    `<p class="gazzetta__riga">${esc(d.meta.sottotitolo)}</p>`;
  s.append(testata);

  const somm = el('div', 'gazzetta__sommario');
  somm.innerHTML =
    badge(d.placeholder, 'articoli ancora da scrivere') +
    `<p class="lead">${esc(d.meta.sommario)}</p>` +
    `<p class="avvertenza">${esc(d.meta.avvertenza)}</p>`;
  s.append(somm);

  // il preambolo ha un testo lungo: qui l'apertura, il resto in una pagina sua
  if (d.preambolo && d.preambolo.da && stato.preambolo) {
    s.append(preamboloEsteso(stato.preambolo, d.preambolo.pagina));
  }

  // «visto e considerato» — e il preambolo, se non ha ancora un testo suo
  const premesse = el('div', 'premesse');
  [d.preambolo, d.considerato].forEach((p) => {
    if (!p || p.da) return;
    premesse.append(el('div', 'premessa',
      `<h3>${esc(p.titolo)}</h3>` +
      (p.testo
        ? `<p>${esc(p.testo)}</p>`
        : `<p class="in-stesura"><b>ancora da scrivere</b>${esc(p.promemoria)}</p>`) +
      (p.rimando ? `<p class="premessa__rimando">↑ ${esc(p.rimando)}</p>` : '')));
  });
  if (premesse.children.length) s.append(premesse);

  // capi e articoli
  const lista = el('div', 'articoli');
  if (d.capi.some((c) => c.articoli.some((a) => !a.testo))) {
    lista.append(el('p', 'articoli__nota',
      'Le rubriche degli articoli sono definitive. I testi verranno scritti con chi ' +
      'partecipa ai focus group e con le altre redazioni della rete Civitates.'));
  }
  d.capi.forEach((capo) => {
    const c = el('section', 'capo');
    c.append(el('header', 'capo__testata',
      `<p class="capo__numero">${esc(capo.numero)}</p>` +
      `<h3 class="capo__titolo">${esc(capo.titolo)}</h3>`));

    capo.articoli.forEach((a) => {
      const carta = stato.perNumero.get(a.carta);
      c.append(el('article', 'articolo',
        `<div>
           <p class="articolo__num">Art. ${a.n}</p>
           <h4 class="articolo__rubrica">${esc(a.rubrica)}</h4>
           ${a.testo
             ? `<p class="articolo__testo">${esc(a.testo)}</p>`
             : `<p class="in-attesa">testo in stesura</p>`}
           ${a.risponde
             ? `<p class="articolo__risponde"><b>Ribalta</b>${esc(a.risponde)}</p>`
             : ''}
         </div>` +
        (carta
          ? `<aside class="articolo__carta">
               <img src="${IMG(carta.slug, carta.n, true)}" alt="Carta ${esc(carta.nome)}" data-carta="${carta.n}" loading="lazy">
               <p>${esc(a.chiosa)}</p>
             </aside>`
          : '<span></span>')));
    });
    lista.append(c);
  });
  s.append(lista);
}

/* ============================================================
   SEZIONE — voci
   ============================================================ */

function sezioneVoci(d) {
  const s = document.getElementById('voci');
  const intro = el('div', 'capitolo__intro');
  intro.innerHTML =
    `<p class="capitolo__numero">${esc(s.dataset.capitolo)}</p>` +
    `<p class="occhiello">${esc(d.meta.occhiello)}</p>` +
    badge(d.placeholder, 'video in lavorazione — segnaposto') +
    `<h2 class="titolo-grosso">${esc(d.meta.titolo)}</h2>` +
    `<p class="lead">${esc(d.meta.sommario)}</p>`;
  s.append(intro);

  const griglia = el('div', 'voci__griglia');
  const doc = el('article', 'pillola pillola--grande');
  doc.innerHTML =
    `<span class="pillola__durata">documentario · ${esc(d.documentario.durata)}</span>` +
    `<h4>${esc(d.documentario.titolo)}</h4>` +
    `<p class="pillola__chi">${esc(d.documentario.descrizione)}</p>` +
    (d.documentario.video ? '' : `<span class="pillola__stato">in lavorazione</span>`);
  griglia.append(doc);

  d.pillole.forEach((p) => {
    const c = el('article', 'pillola');
    c.innerHTML =
      `<span class="pillola__durata">pillola · ${esc(p.durata)}</span>` +
      `<h4>${esc(p.titolo)}</h4>` +
      `<p class="pillola__chi">${esc(p.persona)} — ${esc(p.ruolo)}</p>` +
      (p.video ? '' : `<span class="pillola__stato">in lavorazione</span>`);
    griglia.append(c);
  });
  s.append(griglia);
}

/* ============================================================
   SEZIONE — mazzo
   ============================================================ */

function sezioneMazzo(carte) {
  const s = document.getElementById('mazzo');
  const intro = el('div', 'capitolo__intro');
  intro.innerHTML =
    `<p class="capitolo__numero">${esc(s.dataset.capitolo)}</p>` +
    `<p class="occhiello">Oracolo del dissenso</p>` +
    `<h2 class="titolo-grosso">Ventidue<br>arcani del presente</h2>` +
    `<p class="lead">Al posto delle figure tradizionali, i molti volti del Potere che
     ama censurare, sorvegliare e reprimere — e, all'opposto, le forze che a questo
     Potere resistono. Ogni carta è un archetipo del nostro presente, con la sua luce
     e la sua ombra.</p>`;
  s.append(intro);

  const filtri = el('div', 'mazzo__filtri');
  [['tutte', 'Tutte e 22'], ['potere', 'I volti del Potere'], ['resistenza', 'Le forze che resistono']]
    .forEach(([v, testo], i) => {
      const b = el('button', 'filtro', testo);
      b.type = 'button';
      b.dataset.filtro = v;
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      filtri.append(b);
    });
  s.append(filtri);

  const griglia = el('div', 'mazzo__griglia');
  carte.forEach((c) => {
    const b = el('button', 'carta');
    b.type = 'button';
    b.dataset.carta = String(c.n);
    b.dataset.campo = c.campo;
    b.innerHTML =
      `<img src="${IMG(c.slug, c.n, true)}" alt="Carta ${esc(c.nome)}" loading="lazy">` +
      `<span class="carta__nome">${esc(c.nome)}</span>` +
      `<span class="carta__arcano">${esc(c.arcano)}</span>`;
    griglia.append(b);
  });
  s.append(griglia);

  filtri.addEventListener('click', (e) => {
    const b = e.target.closest('.filtro');
    if (!b) return;
    [...filtri.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.filtro;
    griglia.querySelectorAll('.carta').forEach((c) => {
      c.classList.toggle('nascosta', f !== 'tutte' && c.dataset.campo !== f);
    });
  });
}

/* ============================================================
   SCHEDA CARTA
   ============================================================ */

function apriScheda(n) {
  const c = stato.perNumero.get(Number(n));
  if (!c) return;
  const corpo = document.getElementById('scheda-corpo');
  corpo.innerHTML =
    `<img src="${IMG(c.slug, c.n)}" alt="Carta ${esc(c.nome)}">` +
    `<div class="scheda__testi">
       <p class="scheda__arcano">${esc(c.arcano)}</p>
       <h3>${esc(c.nome)}</h3>
       <p>${esc(c.testo)}</p>
       <div class="scheda__significati">
         <p><b>Dritta</b>${esc(c.dritta)}</p>
         <p><b>Rovescia</b>${esc(c.rovescia)}</p>
       </div>
     </div>`;
  document.getElementById('scheda').showModal();
}

function collegaScheda() {
  const dlg = document.getElementById('scheda');
  document.getElementById('scheda-chiudi').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-carta]');
    if (t) apriScheda(t.dataset.carta);
  });
}

/* ============================================================
   LA LETTURA
   ============================================================ */

const POSIZIONI = [
  ['La situazione', 'in cui ti trovi'],
  ["L'ostacolo", 'il peggiore'],
  ['La via d\'uscita', 'la migliore'],
];

function collegaLettura() {
  const form = document.getElementById('form-lettura');
  const tavolo = document.getElementById('tavolo');
  const contenitore = document.getElementById('tavolo-carte');
  const eco = document.getElementById('eco-domanda');
  const input = document.getElementById('domanda-utente');

  // mescolata onesta (Fisher-Yates): un oracolo truccato sarebbe imbarazzante
  const mescola = (a) => {
    const m = [...a];
    for (let i = m.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [m[i], m[j]] = [m[j], m[i]];
    }
    return m;
  };

  const estrai = () => {
    const mescolato = mescola(stato.carte).slice(0, 3);
    const d = input.value.trim();
    eco.textContent = d ? `«${d}»` : 'Nessuna domanda: l\'Oracolo risponde comunque.';
    contenitore.innerHTML = '';
    mescolato.forEach((c, i) => {
      const p = el('article', 'posizione');
      p.innerHTML =
        `<span class="posizione__ruolo">${POSIZIONI[i][0]} — ${POSIZIONI[i][1]}</span>` +
        `<img src="${IMG(c.slug, c.n)}" alt="Carta ${esc(c.nome)}" data-carta="${c.n}" style="cursor:pointer">` +
        `<h4>${esc(c.nome)}</h4>` +
        `<p class="posizione__arcano">${esc(c.arcano)}</p>` +
        `<p>${esc(c.testo)}</p>`;
      contenitore.append(p);
    });
    tavolo.hidden = false;
    tavolo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); estrai(); });
  document.getElementById('btn-rifai').addEventListener('click', estrai);
}

/* ============================================================
   avvio
   ============================================================ */

(async function avvia() {
  avanzamento();
  ventaglio();
  collegaScheda();

  try {
    const [carte, sondaggio, decreto, voci, preambolo] = await Promise.all([
      carica('carte'), carica('sondaggio'), carica('decreto'), carica('voci'),
      carica('preambolo'),
    ]);
    stato.carte = carte;
    stato.preambolo = preambolo;
    carte.forEach((c) => stato.perNumero.set(c.n, c));

    sezioneSondaggio(sondaggio);
    sezioneDecreto(decreto);
    sezioneVoci(voci);
    sezioneMazzo(carte);
    collegaLettura();
  } catch (err) {
    console.error(err);
    document.getElementById('dati').innerHTML =
      `<div class="colonna"><p class="occhiello">Errore</p>
       <p>Non riesco a leggere i dati: ${esc(err.message)}.
       La pagina va aperta da un server locale, non con doppio clic sul file.</p></div>`;
  }
})();
