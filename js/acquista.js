/* ============================================================
   PAGINA «ACQUISTA UN MAZZO» — il pulsante di pagamento
   ============================================================

   Il codice di PayPal andrebbe messo nella pagina e caricato all'apertura. Qui
   invece si carica solo quando qualcuno preme «Paga con PayPal»: e' lo stesso
   criterio usato per i video esterni nel resto del sito. Un sito che parla di
   sorveglianza non puo' far partire uno script di terze parti addosso a chi
   passa di li' per leggere e basta.

   L'identificativo del pulsante e la chiave pubblica del client sono dati
   pubblici per definizione: servono al browser di chi paga, non aprono nulla.
   Il denaro e i dati dell'ordine restano dentro PayPal, questa pagina non li
   vede e non li conserva.
   ============================================================ */

const SDK = 'https://www.paypal.com/sdk/js' +
  '?client-id=BAA_QPx1xPE1AmXsrhSQilBqUSx0QDGBAs_Kh7qs6qFRTYAZb4ZuwXfxsJvZGCcV6hNax_ytFGsipvo08s' +
  '&components=hosted-buttons&disable-funding=venmo&currency=EUR';

const PULSANTE = 'UXS4L95MUAH6A';

const tasto = document.getElementById('attiva-paypal');
const contenitore = document.getElementById('paypal-container-' + PULSANTE);
const nota = document.getElementById('paypal-nota');

if (tasto && contenitore) {
  tasto.addEventListener('click', () => {
    tasto.disabled = true;
    tasto.textContent = 'Un attimo…';

    const s = document.createElement('script');
    s.src = SDK;

    s.addEventListener('load', () => {
      try {
        contenitore.hidden = false;
        window.paypal.HostedButtons({ hostedButtonId: PULSANTE })
          .render('#paypal-container-' + PULSANTE);
        tasto.remove();
        nota.textContent = 'Il pagamento avviene su PayPal. Se preferisci, ' +
          'scrivici a comunicazione@infonodes.org e lo gestiamo insieme.';
      } catch (e) {
        rinuncia();
      }
    });

    // Rete lenta, script bloccato da un'estensione, PayPal che non risponde:
    // chi voleva comprare non deve restare davanti a un tasto morto.
    s.addEventListener('error', rinuncia);
    document.head.append(s);
  });
}

function rinuncia() {
  tasto.disabled = false;
  tasto.textContent = 'Riprova: PayPal non risponde';
  nota.innerHTML = 'Se il tasto continua a non funzionare scrivici a ' +
    '<a href="mailto:comunicazione@infonodes.org?subject=Acquisto%20di%20un%20mazzo' +
    '%20dell%27Oracolo%20del%20Dissenso">comunicazione@infonodes.org</a>: ' +
    'il mazzo te lo mandiamo lo stesso.';
}
