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

// Forbokstaven i navnet, med HTML-koder fjernet, til ikonchipen på hver rad.
const bokstav = (html) => {
  const txt = String(html).replace(/&[a-z]+;/gi, '').trim();
  return (txt[0] || '?').toUpperCase();
};

const rad = (n, m, pris) => `<div class="s-row"><i class="s-ic">${bokstav(n)}</i><div class="s-rt"><em>${n}</em><span>${m}</span></div>${pris ? `<b class="s-pr">${pris}</b>` : ''}</div>`;

// Innholdet som ruller. Topplinja, overskriften og bestill-knappen ligger
// utenfor, akkurat som i en ekte app der de er festet. Da ser telefonen
// levende ut uten at det viktigste i mockupen forsvinner ut av bildet.
const rull = (innhold) => `<div class="s-scroll"><div class="s-scrollin">${innhold}</div></div>`;

module.exports = {

  restaurant: {
    skjerm: `<div class="scr t-rest">
      <div class="s-top"><span class="s-brand"><i class="s-logo">B</i>Brasserie Vik</span><i class="s-menu"></i></div>
      <div class="s-head"><span class="s-kick">Pedersgata &middot; Stavanger</span><h5>Kveldene som blir lange.</h5></div>
      <div class="s-tabs"><b>Kveld</b><span>Lunsj</span><span>Vin</span></div>
      ${rull(`<div class="s-list">
        ${rad('Kamskjell', 'brunet sm&oslash;r, eple', '245,-')}
        ${rad('R&aring;kokt asparges', 'urteolje, hasselr&oslash;tter', '195,-')}
        ${rad('Kveite fra Karm&oslash;y', 'fennikel, sitron', '385,-')}
        ${rad('Lam fra J&aelig;ren', 'sellerirot, timian', '425,-')}
        ${rad('Br&oslash;d og smaksmeny', 'fire retter', '95,-')}
        ${rad('Sj&oslash;kreps', 'dill, r&oslash;mme', '365,-')}
        ${rad('Andebryst', 'kirseb&aelig;r, sellerirot', '395,-')}
        ${rad('Brunost-is', 'karamell, havsalt', '145,-')}
        ${rad('Ost fra Jæren', 'tre slag', '165,-')}
      </div>`)}
      <div class="s-bar"><span>Bestill bord</span></div>
    </div>`,
    chip: ['Bord for 2', 'fredag 19:30'],
    foto: {
      fil: 'restaurant.webp',
      poeng: 'Maten, rommet og kvelden f&aring;r plass. Vi besk&aelig;rer og optimaliserer, s&aring; siden fortsatt er rask.',
      alt: 'Stemningsbilde: bistro-lokale i varmt kveldslys',
      tekst: 'Stemningsbilde &mdash; illustrasjon, ikke en faktisk kunde.'
    }
  },

  handverker: {
    skjerm: `<div class="scr t-craft">
      <div class="s-top"><span class="s-brand"><i class="s-logo">N</i>Nordvik Bygg</span><i class="s-menu"></i></div>
      <div class="s-head"><span class="s-kick">Stavanger &middot; Sandnes &middot; Sola</span><h5>Bad, tilbygg og tak.</h5></div>
      ${rull(`<div class="s-ba"><span class="ba ba-a">F&oslash;r</span><span class="ba ba-b">Etter</span></div>
      <div class="s-cap">Bad &middot; Hundv&aring;g &middot; 3 uker</div>
      <div class="s-chips"><span class="on">Bad</span><span>Tilbygg</span><span>Tak</span><span>Kj&oslash;kken</span><span>Terrasse</span><span>Vinduer</span></div>
      <div class="s-form">
        <div class="s-fld">Hva slags jobb?</div>
        <div class="s-fld">Adresse</div>
        <div class="s-fld s-fld-img">Legg ved bilder</div>
        <div class="s-fld">N&aring;r passer det?</div>
        <div class="s-fld">Telefon</div>
      </div>
      <div class="s-chips" style="padding-top:14px"><span>Sentral godkjenning</span><span>Mesterbrev</span></div>`)}
      <div class="s-bar"><span>Be om tilbud</span></div>
    </div>`,
    chip: ['Ny foresp&oslash;rsel', 'bad &middot; Hundv&aring;g'],
    foto: {
      fil: 'handverker.webp',
      poeng: 'Prosjektene dine blir bevis. Vi setter dem opp s&aring; de leses raskt, med hva som ble gjort.',
      alt: 'Stemningsbilde: bolig under oppussing i dagslys',
      tekst: 'Stemningsbilde &mdash; illustrasjon, ikke et faktisk prosjekt.'
    }
  },

  klinikk: {
    skjerm: `<div class="scr t-clin">
      <div class="s-top"><span class="s-brand"><i class="s-logo">K</i>Klinikk Sola</span><i class="s-menu"></i></div>
      <div class="s-head"><span class="s-kick">Sola &middot; Stavanger</span><h5>Ledig time denne uka.</h5></div>
      ${rull(`<div class="s-list">
        ${rad('Ansiktsbehandling', '60 min', '990,-')}
        ${rad('Hudanalyse', '30 min', '450,-')}
        ${rad('Klipp og f&oslash;n', '45 min', '650,-')}
        ${rad('Farge og str&aring;ler', '90 min', '1450,-')}
        ${rad('Voksing', '30 min', '350,-')}
        ${rad('Bryn og vipper', '45 min', '490,-')}
        ${rad('Massasje', '60 min', '890,-')}
      </div>
      <div class="s-slots"><span>Tor 09:00</span><span class="on">Tor 13:30</span><span>Fre 10:15</span></div>
      <div class="s-slots" style="padding-top:8px"><span>Fre 14:00</span><span>Man 08:30</span><span>Man 16:00</span></div>`)}
      <div class="s-bar"><span>Book time</span></div>
    </div>`,
    chip: ['Time bekreftet', 'torsdag 13:30'],
    foto: {
      fil: 'klinikk.webp',
      poeng: 'Rolige, tydelige sider. Kunden skal f&oslash;le at dette er et sted som har orden p&aring; ting.',
      alt: 'Stemningsbilde: rolig behandlingsrom i dagslys',
      tekst: 'Stemningsbilde &mdash; illustrasjon, ikke en faktisk klinikk.'
    }
  },

  overnatting: {
    skjerm: `<div class="scr t-stay">
      <div class="s-top"><span class="s-brand"><i class="s-logo">F</i>Fjordbu</span><i class="s-menu"></i></div>
      <div class="s-head"><span class="s-kick">Ryfylke</span><h5>Book direkte. Ingen mellomledd.</h5></div>
      ${rull(`<div class="s-cal">
        <div class="s-cal-h"><b>Oktober</b><span>Ledig</span></div>
        <div class="s-days">${dager([1,2,3,7,8,9,10,11,14,15,16,17,18,19,20,23,24,25,26,29,30,31], [10,11,12])}</div>
      </div>
      <div class="s-sum"><div><b>3 netter</b><em>fra 1 890,- / natt</em></div><span>5 670,-</span></div>
      <div class="s-cal" style="padding-top:18px">
        <div class="s-cal-h"><b>November</b><span>Ledig</span></div>
        <div class="s-days">${dager([1,2,5,6,7,8,9,12,13,14,15,16,19,20,21,22,23,26,27,28,29,30], [])}</div>
      </div>`)}
      <div class="s-bar"><span>Se ledige datoer</span></div>
    </div>`,
    chip: ['Booket direkte', '0 kr i provisjon'],
    foto: {
      fil: 'overnatting.webp',
      poeng: 'Stedet vist som det er. Store bilder, i din rekkef&oslash;lge, uten portalens rammer rundt.',
      alt: 'Stemningsbilde: hytte ved sj&oslash;en i blåtimen',
      tekst: 'Stemningsbilde &mdash; illustrasjon, ikke et faktisk utleiested.'
    }
  }
};
