// Visuelt lag for bransjesidene.
//
// To slags bilder, og de gjør ulik jobb:
//
//   skjerm  — en telefon tegnet i ren CSS/HTML som viser den sidetypen vi
//             faktisk bygger for bransjen. Ingen bildefil, ingen bruksrett å
//             avklare, ingen vekt. Den viser produktet i stedet for å pynte.
//   foto    — ett stemningsbilde per bransje. Illustrasjon, ikke kunde, og
//             merket som det i bildeteksten.
//
// Bedriftsnavnene i telefonene er de samme oppdiktede navnene som står på
// bransjekortene på forsiden, så det henger sammen.

const dager = (ledige, valgt) => {
  let ut = '';
  for (let d = 1; d <= 31; d++) {
    const k = valgt.includes(d) ? ' v' : (ledige.includes(d) ? '' : ' x');
    ut += `<i class="${k.trim()}">${d}</i>`;
  }
  return ut;
};

const rad = (n, m) => `<div class="s-row"><em>${n}</em><span>${m}</span></div>`;

module.exports = {

  restaurant: {
    skjerm: `<div class="scr t-rest">
      <div class="s-top"><span>Brasserie Vik</span><i></i></div>
      <div class="s-head"><span class="s-kick">Pedersgata &middot; Stavanger</span><h5>Kveldene som blir lange.</h5></div>
      <div class="s-tabs"><b>Kveld</b><span>Lunsj</span><span>Vin</span></div>
      <div class="s-list">
        ${rad('Kamskjell', 'brunet sm&oslash;r, eple')}
        ${rad('R&aring;kokt asparges', 'urteolje, hasselr&oslash;tter')}
        ${rad('Kveite fra Karm&oslash;y', 'fennikel, sitron')}
        ${rad('Lam fra J&aelig;ren', 'sellerirot, timian')}
        ${rad('Br&oslash;d og smaksmeny', 'fire retter')}
      </div>
      <div class="s-bar"><span>Bestill bord</span></div>
    </div>`,
    chip: ['Bord for 2', 'fredag 19:30'],
    foto: {
      fil: 'restaurant.webp',
      alt: 'Stemningsbilde: bistro-lokale i varmt kveldslys',
      tekst: 'Stemningsbilde &mdash; illustrasjon, ikke en faktisk kunde.'
    }
  },

  handverker: {
    skjerm: `<div class="scr t-craft">
      <div class="s-top"><span>Nordvik Bygg</span><i></i></div>
      <div class="s-head"><span class="s-kick">Stavanger &middot; Sandnes &middot; Sola</span><h5>Bad, tilbygg og tak.</h5></div>
      <div class="s-ba"><span class="ba ba-a">F&oslash;r</span><span class="ba ba-b">Etter</span></div>
      <div class="s-chips"><span>Bad</span><span>Tilbygg</span><span>Tak</span><span>Kj&oslash;kken</span></div>
      <div class="s-form">
        <div class="s-fld">Hva slags jobb?</div>
        <div class="s-fld">Adresse</div>
        <div class="s-fld s-fld-img">Legg ved bilder</div>
      </div>
      <div class="s-bar"><span>Be om tilbud</span></div>
    </div>`,
    chip: ['Ny foresp&oslash;rsel', 'bad &middot; Hundv&aring;g'],
    foto: {
      fil: 'handverker.webp',
      alt: 'Stemningsbilde: bolig under oppussing i dagslys',
      tekst: 'Stemningsbilde &mdash; illustrasjon, ikke et faktisk prosjekt.'
    }
  },

  klinikk: {
    skjerm: `<div class="scr t-clin">
      <div class="s-top"><span>Klinikk Sola</span><i></i></div>
      <div class="s-head"><span class="s-kick">Sola &middot; Stavanger</span><h5>Ledig time denne uka.</h5></div>
      <div class="s-list">
        ${rad('Ansiktsbehandling', '60 min')}
        ${rad('Hudanalyse', '30 min')}
        ${rad('Klipp og f&oslash;n', '45 min')}
        ${rad('Farge og str&aring;ler', '90 min')}
      </div>
      <div class="s-slots"><span>Tor 09:00</span><span class="on">Tor 13:30</span><span>Fre 10:15</span></div>
      <div class="s-bar"><span>Book time</span></div>
    </div>`,
    chip: ['Time bekreftet', 'torsdag 13:30'],
    foto: {
      fil: 'klinikk.webp',
      alt: 'Stemningsbilde: rolig behandlingsrom i dagslys',
      tekst: 'Stemningsbilde &mdash; illustrasjon, ikke en faktisk klinikk.'
    }
  },

  overnatting: {
    skjerm: `<div class="scr t-stay">
      <div class="s-top"><span>Fjordbu</span><i></i></div>
      <div class="s-head"><span class="s-kick">Ryfylke</span><h5>Book direkte. Ingen mellomledd.</h5></div>
      <div class="s-cal">
        <div class="s-cal-h"><b>Oktober</b><span>Ledig</span></div>
        <div class="s-days">${dager([1,2,3,7,8,9,10,11,14,15,16,17,18,19,20,23,24,25,26,29,30,31], [10,11,12])}</div>
      </div>
      <div class="s-sum"><b>3 netter</b><span>Direkte hos oss</span></div>
      <div class="s-bar"><span>Se ledige datoer</span></div>
    </div>`,
    chip: ['Booket direkte', '0 kr i provisjon'],
    foto: {
      fil: 'overnatting.webp',
      alt: 'Stemningsbilde: hytte ved sj&oslash;en i blåtimen',
      tekst: 'Stemningsbilde &mdash; illustrasjon, ikke et faktisk utleiested.'
    }
  }
};
