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
  // `no-cache` non vuol dire «non usare la cache»: vuol dire «chiedi sempre al
  // server se è cambiato». Senza, chi ha già visitato il sito continuerebbe a
  // vedere i numeri del sondaggio vecchi anche dopo un aggiornamento.
  const r = await fetch(`data/${nome}.json`, { cache: 'no-cache' });
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
    `<p class="lead">${esc(d.meta.sommario)}</p>`;
  s.append(intro);

  // Il numero grande apre il capitolo, attaccato al sommario: è il dato che dà
  // la misura di tutti gli altri. La riga «N rispondenti · questionario ancora
  // aperto» che stava qui sotto diceva le stesse due cose in grigio piccolo,
  // due schermate prima del numero che le dice in grande.
  const apre = d.sezioni.flatMap((sez) => sez.blocchi).find((b) => b.apertura);
  if (apre) {
    const box = el('div', 'apertura');
    box.append(bloccoGrande(apre, 'blocco--apertura'));
    if (apre.azioni) box.append(tastiAzioni(apre.azioni));
    s.append(box);
  }

  const scrolly = el('div', 'scrolly');

  // Le parti marcate `inPagina: false` si leggono solo nella pagina di tutti
  // i dati: qui resta il minimo che si scorre in una schermata.
  const inPagina = d.sezioni.filter((sez) => sez.inPagina !== false);
  // Con una parte sola «Parte 2» non vuol dire niente: il numero serve a
  // orientarsi fra più parti, e torna da solo se un domani ne rimettiamo.
  const numerate = inPagina.length > 1;
  // Il tasto in fondo porta a tutti i numeri del sondaggio, non solo a quelli
  // della parte che si è appena letta.
  const domande = d.sezioni
    .flatMap((sez) => sez.blocchi).filter((b) => !b.soloInPagina).length;

  // Un solo grafico per parte, quello che racconta la storia. Tutti gli altri
  // stanno nella pagina dei dati, che è anche quella da cui si stampa il PDF
  // dei risultati completi.
  inPagina.forEach((sez) => {
    scrolly.append(el('div', 'sottosezione',
      (numerate ? `<p class="sottosezione__numero">Parte ${esc(sez.numero)}</p>` : '') +
      `<h3 class="sottosezione__titolo">${esc(sez.titolo)}</h3>` +
      `<p class="sottosezione__testo">${esc(sez.testo)}</p>`));

    scrolly.append(bloccoGrande(sez.blocchi.find((b) => b.evidenza) || sez.blocchi[0]));

    // Una parte può avere i suoi inviti al posto del solito rimando ai numeri.
    // Con più parti in pagina ognuna manda al proprio pezzo; con una sola, il
    // tasto e' la porta a tutti i dati e si apre dall'inizio.
    const dove = numerate ? `dati.html#${esc(sez.id)}` : 'dati.html';
    scrolly.append(sez.azioni
      ? tastiAzioni(sez.azioni)
      : el('p', 'sottosezione__vaia',
          `<a class="btn btn--ghost" href="${dove}">` +
          `Vedi tutte le risposte al sondaggio</a>` +
          `<span>tutte le ${domande} domande del questionario, con i numeri ` +
          `in tabella</span>`));
  });
  s.append(scrolly);

  osservaGrafici([...s.querySelectorAll('.blocco')]);
}

/* I tasti sotto un blocco o sotto una parte. L'ultimo è quello pieno: è
   l'azione vera, gli altri sono rimandi. */
function tastiAzioni(azioni) {
  return el('p', 'sottosezione__vaia sottosezione__vaia--azioni',
    azioni.map((a, i) =>
      `<a class="btn${i === azioni.length - 1 ? '' : ' btn--ghost'}" href="${esc(a.dove)}"` +
      (a.esterno ? ' target="_blank" rel="noopener noreferrer"' : '') +
      `>${esc(a.testo)}</a>`).join(''));
}

function bloccoGrande(b, extra) {
  const alto = b.grafico.tipo === 'temi' || b.grafico.tipo === 'confronto' ||
    (b.grafico.serie && b.grafico.serie.length > 9);
  const blocco = el('div', 'blocco' + (alto ? ' blocco--largo' : '') +
    (extra ? ' ' + extra : ''));
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

/* Alla stampa i cassetti si aprono da soli: su carta un articolo chiuso è un
   articolo perso, e chi stampa vuole il decreto intero. Dopo la stampa
   tornano come erano. */
addEventListener('beforeprint', () => {
  document.querySelectorAll('.articolo__box:not([open])').forEach((d) => {
    d.dataset.riapri = '1';
    d.open = true;
  });
});
addEventListener('afterprint', () => {
  document.querySelectorAll('.articolo__box[data-riapri]').forEach((d) => {
    delete d.dataset.riapri;
    d.open = false;
  });
});

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
   stanno su righe proprie dentro il comma che le introduce: nel JSON sono
   separate da un a capo. */
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
  const s = document.getElementById('vera-sicurezza');

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
    badge(d.placeholder, 'bozza in revisione') +
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
  } else if (d.placeholder) {
    lista.append(el('p', 'articoli__nota',
      'Questi testi sono una prima stesura, in revisione con le redazioni della rete ' +
      'Civitates e con chi partecipa ai focus group. Apri un articolo per leggerlo.'));
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
             ? `<details class="articolo__box">
                  <summary>Leggi il testo dell'articolo</summary>
                  ${commiArticolo(a.testo)}
                </details>`
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

  // In coda agli articoli, non prima: si chiede di sottoscrivere un decreto
  // dopo averlo fatto leggere, non prima. Ogni appello è un riquadro
  // cliccabile per intero — la domanda fa da contesto, la riga verde da azione.
  if (d.appelli && d.appelli.length) {
    const coda = el('div', 'appelli');
    d.appelli.forEach((a) => {
      const n = el(a.dove ? 'a' : 'div',
        'appello' + (a.dove ? '' : ' appello--scollegato'));
      if (a.dove) n.href = a.dove;
      n.innerHTML =
        `<p class="appello__domanda">${esc(a.domanda)}</p>` +
        `<p class="appello__azione">${esc(a.azione)}</p>` +
        (a.dove ? '' : `<p class="appello__manca">collegamento ancora da definire</p>`);
      coda.append(n);
    });
    s.append(coda);
  }
}

/* ============================================================
   SEZIONE — voci
   ============================================================ */

/* Il lettore di una testimonianza.
   I video nostri («file») usano il lettore del browser: nessun tracciatore,
   nessun banner cookie, e l'aspetto resta quello del sito.
   Quelli su YouTube o Vimeo non vengono caricati subito: prima si vede solo
   la copertina, e l'inquadratura esterna si inserisce dopo il clic. Su un
   sito che parla di sorveglianza non si mandano dati a Google prima ancora
   che qualcuno abbia deciso di guardare. */
function lettoreVideo(v, titolo) {
  if (v.tipo === 'file') {
    const el_ = el('video', 'video');
    el_.controls = true;
    el_.preload = 'none';
    el_.playsInline = true;
    if (v.poster) el_.poster = v.poster;
    el_.innerHTML =
      `<source src="${esc(v.src)}" type="video/mp4">` +
      `<p>Il tuo browser non riesce a mostrare questo video. ` +
      `<a href="${esc(v.src)}">Scaricalo</a> per vederlo.</p>`;
    return el_;
  }

  const url = v.tipo === 'vimeo'
    ? `https://player.vimeo.com/video/${encodeURIComponent(v.id)}?autoplay=1`
    : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1`;
  const facciata = el('button', 'video video--esterno');
  facciata.type = 'button';
  facciata.setAttribute('aria-label', `Guarda: ${titolo}`);
  if (v.poster) facciata.style.backgroundImage = `url("${v.poster}")`;
  facciata.innerHTML =
    `<span class="video__play" aria-hidden="true">▶</span>` +
    `<span class="video__avviso">Guardandolo, il video viene caricato da ` +
    `${v.tipo === 'vimeo' ? 'Vimeo' : 'YouTube'}</span>`;
  facciata.addEventListener('click', () => {
    const f = el('iframe', 'video');
    f.src = url;
    f.title = titolo;
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    f.loading = 'lazy';
    facciata.replaceWith(f);
  });
  return facciata;
}

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

  const scheda = (p, etichetta, classi, descrizione) => {
    const c = el('article', 'pillola' + classi + (p.video ? ' pillola--pronta' : ''));
    if (p.video) c.append(lettoreVideo(p.video, p.titolo));
    c.insertAdjacentHTML('beforeend',
      `<div class="pillola__testo">` +
      `<span class="pillola__durata">${esc(etichetta)} · ${esc(p.durata)}</span>` +
      `<h4>${esc(p.titolo)}</h4>` +
      `<p class="pillola__chi">${esc(descrizione)}</p>` +
      (p.video ? '' : `<span class="pillola__stato">in lavorazione</span>`) +
      `</div>`);
    return c;
  };

  /* Gli articoli gia' pubblicati altrove: non hanno un lettore video ma
     un'immagine e un link che porta al pezzo. Stanno per primi perche' sono
     l'unica cosa di questo capitolo che si puo' gia' leggere. */
  const schedaArticolo = (a) => {
    const c = el('a', 'pillola pillola--articolo pillola--pronta');
    c.href = a.link;
    c.target = '_blank';
    c.rel = 'noopener noreferrer';
    c.innerHTML =
      `<img class="pillola__cover" src="${esc(a.cover)}" alt="" loading="lazy">` +
      `<div class="pillola__testo">` +
      `<span class="pillola__durata">${esc(a.occhiello || 'articolo')}</span>` +
      `<h4>${esc(a.titolo)}</h4>` +
      `<p class="pillola__chi">${esc(a.descrizione)}</p>` +
      `<span class="pillola__vai">Leggi l'articolo</span>` +
      `</div>`;
    return c;
  };

  (d.articoli || []).forEach((a) => griglia.append(schedaArticolo(a)));

  griglia.append(scheda(d.documentario, 'documentario',
    ' pillola--grande', d.documentario.descrizione));
  d.pillole.forEach((p) => {
    griglia.append(scheda(p, 'pillola', '', `${p.persona} — ${p.ruolo}`));
  });
  s.append(griglia);
}

/* ============================================================
   SEZIONE — mazzo
   ============================================================ */

function sezioneMazzo(carte) {
  const s = document.getElementById('oracolo');
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

  // Niente filtri fra «volti del potere» e «forze che resistono»: le carte
  // hanno troppe sfumature perché una divisione in due regga davvero.
  const griglia = el('div', 'mazzo__griglia');
  carte.forEach((c) => {
    const b = el('button', 'carta');
    b.type = 'button';
    b.dataset.carta = String(c.n);
    b.innerHTML =
      `<img src="${IMG(c.slug, c.n, true)}" alt="Carta ${esc(c.nome)}" loading="lazy">` +
      `<span class="carta__nome">${esc(c.nome)}</span>` +
      `<span class="carta__arcano">${esc(c.arcano)}</span>`;
    griglia.append(b);
  });
  s.append(griglia);
}

/* ============================================================
   INDIRIZZO DELLE SEZIONI
   Le sezioni si costruiscono da sole dopo che la pagina è arrivata: quando il
   browser prova a saltare all'ancora, lì dentro non c'è ancora niente e si
   resta in cima. Il salto va quindi rifatto a mano, a costruzione finita.
   ============================================================ */

/* I nomi di prima restano validi: i link già mandati in giro con #decreto o
   #mazzo continuano a funzionare, e diventano quelli nuovi da soli. */
const SEZIONI_RIBATTEZZATE = { decreto: 'vera-sicurezza', mazzo: 'oracolo' };

function sezioneNellIndirizzo() {
  const nome = location.hash.slice(1);
  if (!nome || nome.includes('/')) return null;   // #carta/… non è una sezione
  return document.getElementById(SEZIONI_RIBATTEZZATE[nome] || nome);
}

/* Quando un salto è appena partito, per un momento comanda lui: durante il
   viaggio si attraversano le sezioni di mezzo, e senza questa tregua
   l'indirizzo le inseguirebbe tutte prima di fermarsi su quella giusta. */
let saltoInCorso = 0;

function salta(s, secco = false) {
  saltoInCorso = Date.now();
  s.scrollIntoView(secco ? { behavior: 'instant' } : undefined);
}

function vaiAllaSezione() {
  const s = sezioneNellIndirizzo();
  if (!s) return;
  if (SEZIONI_RIBATTEZZATE[location.hash.slice(1)]) {
    history.replaceState(null, '', `#${s.id}`);
  }
  salta(s, true);
}

/* Il menù muove la pagina da sé invece di lasciar fare al browser: così
   l'indirizzo lo decidiamo noi e il salto funziona anche quando si clicca la
   voce della sezione in cui si sta già leggendo. */
function collegaMenu() {
  document.querySelectorAll('.nav a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const s = document.getElementById(a.getAttribute('href').slice(1));
      if (!s) return;
      e.preventDefault();
      if (location.hash !== `#${s.id}`) history.pushState(null, '', `#${s.id}`);
      salta(s);
    });
  });
}

/* L'indirizzo segue la lettura: in qualunque momento si copia la barra del
   browser, si ottiene il link al punto in cui si sta. Si usa replaceState e
   non un'ancora vera, così la cronologia non si riempie di passaggi e il
   tasto «indietro» continua a fare quello che ci si aspetta. */
let sezioneCorrente = null;   // dove si sta leggendo adesso

function seguiLaSezione(sez) {
  sezioneCorrente = sez;
  const dlg = document.getElementById('scheda');
  if (dlg.open || slugNellIndirizzo()) return;   // comanda la carta aperta
  if (Date.now() - saltoInCorso < 1200) return;  // comanda il salto appena partito
  const nuovo = sez ? `#${sez.id}` : location.pathname + location.search;
  if (location.hash !== (sez ? `#${sez.id}` : '')) history.replaceState(null, '', nuovo);
}

/* ============================================================
   SCHEDA CARTA
   Ogni carta ha un indirizzo suo — #carta/steve-bannon — così si può mandare
   a qualcuno senza dovergli dire «scorri fino al mazzo e cercala». Cambia
   mentre si sfoglia, senza ricaricare niente, e il tasto «indietro» del
   browser chiude la scheda invece di far uscire dal sito.
   ============================================================ */

const indirizzoCarta = (slug) => `#carta/${slug}`;

/* lo slug scritto nell'indirizzo, se c'è: #carta/steve-bannon → steve-bannon */
function slugNellIndirizzo() {
  const m = /^#carta\/([^/?#]+)$/.exec(location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

const linkAssoluto = (slug) => new URL(indirizzoCarta(slug), location.href).href;

/* Vero quando l'indirizzo della carta ce l'abbiamo messo noi aprendo la
   scheda: solo in quel caso, chiudendola, ha senso tornare indietro nella
   cronologia. Chi arriva da un link condiviso non ha un «prima» dove tornare. */
let indirizzoNostro = false;

/* La carta con cui si è atterrati arrivando da un link condiviso. Serve a
   portare il mazzo sotto la scheda: si scorre alla chiusura e non all'arrivo,
   perché finché la scheda è aperta la pagina dietro resta bloccata. */
let cartaDaLink = null;

function riempiScheda(c) {
  document.getElementById('scheda-corpo').innerHTML =
    `<img src="${IMG(c.slug, c.n)}" alt="Carta ${esc(c.nome)}">` +
    `<div class="scheda__testi">
       <p class="scheda__arcano">${esc(c.arcano)}</p>
       <h3>${esc(c.nome)}</h3>
       <p>${esc(c.testo)}</p>
       <div class="scheda__significati">
         <p><b>Dritta</b>${esc(c.dritta)}</p>
         <p><b>Rovescia</b>${esc(c.rovescia)}</p>
       </div>
       <p class="scheda__condividi">
         <button type="button" class="btn-ghost" data-copia="${esc(linkAssoluto(c.slug))}">
           Copia il link a questa carta</button>
         <span class="scheda__link" hidden></span>
       </p>` +
    // Sotto tutto il resto: prima la carta parla per immagini e archetipi,
    // poi si dice di cosa sta parlando davvero.
    (c.spiegazione && c.spiegazione.length
      ? `<div class="scheda__spiegazione">
           <h4>Nel mondo reale</h4>
           ${c.spiegazione.map((t) => `<p>${esc(t)}</p>`).join('')}
         </div>`
      : '') +
    `</div>`;
}

function apriScheda(n, daIndirizzo = false) {
  const c = stato.perNumero.get(Number(n));
  if (!c) return;
  riempiScheda(c);
  if (!daIndirizzo && location.hash !== indirizzoCarta(c.slug)) {
    history.pushState({ carta: c.slug }, '', indirizzoCarta(c.slug));
    indirizzoNostro = true;
  }
  const dlg = document.getElementById('scheda');
  if (!dlg.open) dlg.showModal();
}

/* Allinea la scheda a quello che dice l'indirizzo. La chiama il tasto
   «indietro»/«avanti» del browser: è l'indirizzo a comandare, non il clic. */
function allineaAllIndirizzo() {
  const dlg = document.getElementById('scheda');
  const slug = slugNellIndirizzo();
  const c = slug && stato.carte.find((x) => x.slug === slug);
  // ci siamo mossi con la cronologia, non aprendo una scheda: qualunque
  // indirizzo ci sia adesso non l'abbiamo appena spinto noi
  indirizzoNostro = false;
  if (c) { apriScheda(c.n, true); return; }
  if (dlg.open) dlg.close();

  // Torna anche alla sezione, se l'indirizzo ne indica un'altra. Se indica
  // quella che si sta già leggendo non si salta: è il caso di chi chiude una
  // carta, e sbatterlo all'inizio della sezione gli farebbe perdere il segno.
  const s = sezioneNellIndirizzo();
  if (s && s !== sezioneCorrente) salta(s);
}

function collegaScheda() {
  const dlg = document.getElementById('scheda');
  document.getElementById('scheda-chiudi').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-carta]');
    if (t) apriScheda(t.dataset.carta);
  });

  // vale per il tasto ×, per il clic fuori e per Esc: tutti passano di qui
  dlg.addEventListener('close', () => {
    if (cartaDaLink !== null) {
      const posto = document.querySelector(`.carta[data-carta="${cartaDaLink}"]`);
      cartaDaLink = null;
      // un attimo dopo, non subito: chiudendo la finestra il browser rimette
      // la pagina dov'era prima di aprirla, e cancellerebbe il nostro salto
      if (posto) setTimeout(() => posto.scrollIntoView({ block: 'center', behavior: 'instant' }), 0);
    }
    if (indirizzoNostro) {
      indirizzoNostro = false;
      history.back();
    } else if (slugNellIndirizzo()) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  });

  addEventListener('popstate', allineaAllIndirizzo);

  // «copia il link»: se il browser non lo permette (succede fuori da https),
  // il link viene scritto in chiaro, che è comunque copiabile a mano
  dlg.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copia]');
    if (!b) return;
    const scritta = b.textContent.trim();
    try {
      await navigator.clipboard.writeText(b.dataset.copia);
      b.textContent = 'Link copiato';
      setTimeout(() => { b.textContent = scritta; }, 2000);
    } catch {
      const spia = dlg.querySelector('.scheda__link');
      spia.textContent = b.dataset.copia;
      spia.hidden = false;
    }
  });
}

/* La lettura interattiva — domanda, estrazione di tre carte e tavolo — è stata
   tolta il 27/08/2026: l'Oracolo si fa in presenza, con qualcuno che gira le
   carte davvero. Il codice resta nella storia del repository, se un domani si
   volesse rimetterlo. */

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
    // dopo che le sezioni sono state riempite: prima le altezze non sono
    // ancora quelle definitive
    collegaMenu();
    vaiAllaSezione();
    evidenziaMenu(seguiLaSezione);

    // chi arriva da un link a una carta trova la scheda già aperta, e
    // chiudendola si ritrova davanti il mazzo invece che in cima alla pagina
    const slug = slugNellIndirizzo();
    const carta = slug && carte.find((c) => c.slug === slug);
    if (carta) {
      cartaDaLink = carta.n;
      apriScheda(carta.n, true);
    }
  } catch (err) {
    console.error(err);
    document.getElementById('dati').innerHTML =
      `<div class="colonna"><p class="occhiello">Errore</p>
       <p>Non riesco a leggere i dati: ${esc(err.message)}.
       La pagina va aperta da un server locale, non con doppio clic sul file.</p></div>`;
  }
})();
