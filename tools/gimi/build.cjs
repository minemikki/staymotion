// Bygger gimi.html — konseptsiden for GIMI restaurant og bar.
//   node tools/gimi/build.cjs
//
// Andre retning, bygget etter research på amerikanske topprestauranter:
// mørk ild-palett, minuskel-ordmerke, én display-font, stram struktur,
// og sitteplassene presentert som to separate produkter.
// Innhold i content.cjs, stil i style.cjs.

const fs = require('fs');
const { t, meny, glasset, fraIlden, fakta } = require('./content.cjs');
const STIL = require('./style.cjs');
const ROT = __dirname + '/../..';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Tospråklig: hvert element bærer begge språk, JS bytter tekstinnholdet.
// Alt innhold ligger dermed i HTML-en fra første render.
const A = (k, html) => `data-no="${esc(t.no[k])}" data-en="${esc(t.en[k])}"${html ? ' data-html' : ''}`;
const T = (k) => esc(t.no[k]);
const AB = (no, en) => `data-no="${esc(no)}" data-en="${esc(en)}"`;

// ---------- "Gi meg noe": forslagskurven ----------
const pool = { lett: [], grill: [], glass: [], dele: [] };
for (const g of meny) for (const r of g.retter) for (const tag of r.tags)
  if (pool[tag]) pool[tag].push({ n: r.n, b: r.b, a: r.a, pris: r.pris });
for (const r of fraIlden) for (const tag of r.tags)
  if (pool[tag]) pool[tag].push({ n: r.n, b: r.b, a: null, pris: null });
for (const d of glasset) pool.glass.push({ n: d.n, b: d.b, a: null, pris: null });

const startRett = fraIlden[0];
const startIndeks = pool.grill.findIndex((r) => r.n.no === startRett.n.no);

// ---------- strukturerte data ----------
const dagNavn = { 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
const apningstider = Object.entries(fakta.apent).map(([d, o]) => ({
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: 'https://schema.org/' + dagNavn[d],
  opens: String(o.fra).padStart(2, '0') + ':00',
  closes: (o.bar > 24 ? String(o.bar - 24).padStart(2, '0') : String(o.bar)) + ':00',
}));
apningstider.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Saturday', opens: '12:00', closes: '15:00' });

const graf = {
  '@context': 'https://schema.org', '@type': 'Restaurant',
  name: 'GIMI restaurant og bar', description: t.no.heroUnder,
  address: { '@type': 'PostalAddress', streetAddress: fakta.adresse, postalCode: fakta.postnr.split(' ')[0], addressLocality: 'Stavanger', addressCountry: 'NO' },
  telephone: fakta.tlfIntl, email: fakta.epost,
  servesCuisine: ['Nordisk', 'Grill'], priceRange: '200–500 NOK',
  acceptsReservations: fakta.booking, sameAs: [fakta.instagram],
  openingHoursSpecification: apningstider,
  hasMenu: { '@type': 'Menu', hasMenuSection: meny.map((g) => ({
    '@type': 'MenuSection', name: g.gruppe.no,
    hasMenuItem: g.retter.map((r) => ({ '@type': 'MenuItem', name: r.n.no, description: r.b.no,
      offers: { '@type': 'Offer', price: String(r.pris), priceCurrency: 'NOK' } })),
  })) },
};

// ---------- byggeklosser ----------
const navLenker = [['#sitte', 'sitteDiskNavn'], ['#meny', 'navMeny'], ['#ilden', 'navIlden'], ['#baren', 'navBaren'], ['#besok', 'navBesok']];
const nav = (klasse) => navLenker.map(([h, k]) =>
  `<a href="${h}" ${A(k)}>${T(k)}</a>`).join(klasse === 'mnav' ? '\n  ' : '\n    ');

const bookBtn = (klasse, nøkkel) =>
  `<a class="${klasse}" href="${fakta.booking}" target=_blank rel=noopener><span ${A(nøkkel)}>${T(nøkkel)}</span><span aria-hidden=true>&#8599;</span></a>`;

const shead = (indexKey, kickerKey, titleKey, leadKey, html) => `
    <div class=shead>
      <div>
        <p class=lab ${A(indexKey)}>${T(indexKey)}</p>
        <h2 class="disp h-l" ${A(titleKey, html)}>${html ? t.no[titleKey] : T(titleKey)}</h2>
      </div>
      ${leadKey ? `<p class=lead ${A(leadKey)}>${T(leadKey)}</p>` : '<div></div>'}
    </div>`;

// ---------- seksjoner ----------
const topp = `
<div class=top>
  <a class=mark href="#top" aria-label="GIMI"><img src="/img/gimi/logo.webp" alt="GIMI" width=142 height=308></a>
  <nav>
    ${nav()}
  </nav>
  <div class=top-r>
    <div class=lang role=group aria-label="Språk / Language">
      <button type=button id=lang-no data-lang=no aria-pressed=true>NO</button>
      <button type=button id=lang-en data-lang=en aria-pressed=false>EN</button>
    </div>
    <button class=burger type=button id=burger aria-expanded=false aria-controls=mnav data-attr=aria-label ${A('menuOpen')} aria-label="${T('menuOpen')}"><span></span><span></span><span></span></button>
  </div>
</div>
<nav class=mnav id=mnav aria-label=Meny hidden>
  ${nav('mnav')}
</nav>`;

const hero = `
<section class=hero id=top>
  <div class=hero__img>
    <img src="/img/gimi/hero-kamskjell.webp" alt="Illustrativt nærbilde av en rett fra kjøkkenet" width=1536 height=1024 fetchpriority=high>
  </div>
  <div class="wrap hero__in">
    <p class=status id=status hidden><i aria-hidden=true></i><span id=status-text></span></p>
    <h1 class="disp h-xl" ${A('heroOver')}>${T('heroOver')}</h1>
    <p class=hero__sub ${A('heroUnder')}>${T('heroUnder')}</p>
    <div class=hero__cta>
      ${bookBtn('btn', 'heroBook')}
      <a class=tlink href="#meny"><span ${A('heroMenuLink')}>${T('heroMenuLink')}</span><span aria-hidden=true>&#8595;</span></a>
    </div>
    <p class=hero__note ${A('heroBookNote')}>${T('heroBookNote')}</p>
    <div class=hero__foot>
      <span>${esc(fakta.adresse)}, ${esc(fakta.postnr)}</span>
      <span ${A('besokDager')}>${T('besokDager')}</span>
      <span>${esc(fakta.tlf)}</span>
    </div>
  </div>
</section>`;

const sitte = `
<section class="sit sec" id=sitte>
  <div class=wrap>
    ${shead('sitteIndex', 'sitteKicker', 'sitteTitle', null)}
    <div class=sit__cards>
      <a class=sit__card href="${fakta.booking}" target=_blank rel=noopener>
        <img src="/img/gimi/k-naer.webp" alt="" width=1120 height=1400 loading=lazy decoding=async>
        <div class=sit__ov>
          <p class=sit__n>01</p>
          <h3 ${A('sitteDiskNavn')}>${T('sitteDiskNavn')}</h3>
          <p class=sit__line ${A('sitteDiskLinje')}>${T('sitteDiskLinje')}</p>
          <p class=sit__note ${A('sitteDiskNote')}>${T('sitteDiskNote')}</p>
        </div>
      </a>
      <a class=sit__card href="${fakta.booking}" target=_blank rel=noopener>
        <img src="/img/gimi/b-hender.webp" alt="" width=1120 height=1400 loading=lazy decoding=async>
        <div class=sit__ov>
          <p class=sit__n>02</p>
          <h3 ${A('sitteBordNavn')}>${T('sitteBordNavn')}</h3>
          <p class=sit__line ${A('sitteBordLinje')}>${T('sitteBordLinje')}</p>
          <p class=sit__note ${A('sitteBordNote')}>${T('sitteBordNote')}</p>
        </div>
      </a>
    </div>
  </div>
</section>`;

const mosaikk = `
<div class=mos aria-hidden=true>
  <img src="/img/gimi/k-mat.webp" alt="" width=800 height=724 loading=lazy decoding=async>
  <img src="/img/gimi/b-lys.webp" alt="" width=640 height=706 loading=lazy decoding=async>
  <img src="/img/gimi/b-glass.webp" alt="" width=1120 height=1400 loading=lazy decoding=async>
</div>`;

const giValg = [['lett', 'giLett'], ['grill', 'giGrill'], ['glass', 'giGlass'], ['dele', 'giDele']];
const startKort = `<div class=gi__out>
        <div>
          <p class=gi__pre ${A('giPrefix')}>${T('giPrefix')}</p>
          <h3 class=gi__name ${AB(startRett.n.no, startRett.n.en)}>${esc(startRett.n.no)}</h3>
          <p class=gi__desc ${AB(startRett.b.no, startRett.b.en)}>${esc(startRett.b.no)}</p>
        </div>
        <div class=gi__side>
          ${bookBtn('btn btn--ghost', 'giBook')}
          <button type=button class=gi__again ${A('giAgain')}>${T('giAgain')}</button>
        </div>
      </div>`;

const gi = `
<section class="gi sec blue" id=gimeg>
  <div class=wrap>
    ${shead('giIndex', 'giKicker', 'giTitle', 'giBody')}
    <div class=gi__choices>
      ${giValg.map(([tag, k]) => `<button type=button class=gi__c data-gi="${tag}" aria-pressed=${tag === 'grill'} ${A(k)}>${T(k)}</button>`).join('\n      ')}
    </div>
    <div id=gi-result aria-live=polite>
      ${startKort}
    </div>
  </div>
</section>`;

const ild = `
<section class=ild id=ilden>
  <div class=ild__bg><img src="/img/gimi/k-skaal.webp" alt="" width=933 height=1400 loading=lazy decoding=async></div>
  <div class="wrap ild__in">
    <p class=lab ${A('ildIndex')}>${T('ildIndex')}</p>
    <h2 class="disp h-l" ${A('ildTitle')}>${T('ildTitle')}</h2>
    <ul class=ild__list>
      ${fraIlden.map((r) => `<li><b ${AB(r.n.no, r.n.en)}>${esc(r.n.no)}</b><span ${AB(r.b.no, r.b.en)}>${esc(r.b.no)}</span></li>`).join('\n      ')}
    </ul>
  </div>
</section>`;

const menySeksjon = `
<section class="meny sec" id=meny>
  <div class=wrap>
    ${shead('menyIndex', 'menyKicker', 'menyTitle', null)}
    ${meny.map((g) => `<div class=meny__g>
      <h3 ${AB(g.gruppe.no, g.gruppe.en)}>${esc(g.gruppe.no)}</h3>
      ${g.retter.map((r) => `<article class=meny__i>
        <div>
          <h4 ${AB(r.n.no, r.n.en)}>${esc(r.n.no)}</h4>
          <p ${AB(r.b.no, r.b.en)}>${esc(r.b.no)}</p>
          <small ${AB(r.a.no, r.a.en)}>${esc(r.a.no)}</small>
        </div>
        <b>${r.pris}</b>
      </article>`).join('\n      ')}
    </div>`).join('\n    ')}
    <div class=meny__foot>
      <span ${A('menyFoot')}>${T('menyFoot')}</span>
      <span ${A('menyFoot2')}>${T('menyFoot2')}</span>
    </div>
  </div>
</section>`;

const bar = `
<section class=bar id=baren>
  <div class=bar__split>
    <div class=bar__img><img src="/img/gimi/b-shaker.webp" alt="Illustrativt bilde av en bartender som ferdigstiller en cocktail" width=1400 height=1050 loading=lazy decoding=async></div>
    <div class=bar__copy>
      <p class=lab ${A('barIndex')}>${T('barIndex')}</p>
      <h2 class="disp h-l" ${A('barTitle')}>${T('barTitle')}</h2>
      <div class=bar__hours>
        <span ${A('barH1')}>${T('barH1')}</span><b ${A('barH1b')}>${T('barH1b')}</b>
        <span ${A('barH2')}>${T('barH2')}</span><b ${A('barH2b')}>${T('barH2b')}</b>
      </div>
      <ul class=bar__list>
        ${glasset.map((d) => `<li ${AB(d.n.no, d.n.en)}>${esc(d.n.no)}</li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</section>`;

const rom = `
<section class="rom sec" id=rommet>
  <div class=wrap>
    ${shead('romIndex', 'romKicker', 'romTitle', null, 1)}
    <figure class=rom__img>
      <img src="/img/gimi/b-rom.webp" alt="Illustrativt bilde fra lokalet" width=1400 height=619 loading=lazy decoding=async>
      <figcaption class=rom__cap ${A('romFoto')}>${T('romFoto')}</figcaption>
    </figure>
    <div class=rom__stats>
      ${[['romStat1', 'romStat1b'], ['romStat2', 'romStat2b'], ['romStat3', 'romStat3b']].map(([a, b]) =>
        `<div class=rom__s><b ${A(a)}>${T(a)}</b><span ${A(b)}>${T(b)}</span></div>`).join('\n      ')}
    </div>
    <blockquote class="quote quote--big">
      <p ${A('ossQuote')}>${T('ossQuote')}</p>
      <cite ${A('ossQuoteBy')}>${T('ossQuoteBy')}</cite>
    </blockquote>
    <div class=rom__bro>
      <p class=lab ${A('ossKicker')}>${T('ossKicker')}</p>
      <h3 class="disp h-m" ${A('ossTitle', 1)}>${t.no.ossTitle}</h3>
      <p class=lead ${A('ossBody')}>${T('ossBody')}</p>
    </div>
  </div>
</section>`;

const selskap = `
<section class="sit sec blue" id=selskap>
  <div class=wrap>
    ${shead('selskapIndex', 'selskapKicker', 'selskapTitle', null, 1)}
    <div class=bes__cta>
      <a class=btn href="mailto:${fakta.epost}"><span ${A('selskapCta')}>${T('selskapCta')}</span><span aria-hidden=true>&#8599;</span></a>
      <span class=body ${A('selskapNote')}>${T('selskapNote')}</span>
    </div>
  </div>
</section>`;

const besok = `
<section class="bes sec" id=besok>
  <div class=wrap>
    ${shead('besokIndex', 'besokKicker', 'besokTitle', null, 1)}
    <div class=bes__grid>
      <div class=bes__c>
        <p class="lab lab-ash" ${A('besokAdr')}>${T('besokAdr')}</p>
        <p>${esc(fakta.adresse)}<br>${esc(fakta.postnr)}</p>
        <a class=tlink href="${fakta.kart}" target=_blank rel=noopener><span ${A('besokVei')}>${T('besokVei')}</span><span aria-hidden=true>&#8599;</span></a>
      </div>
      <div class=bes__c>
        <p class="lab lab-ash" ${A('besokRest')}>${T('besokRest')}</p>
        <p><span ${A('besokDager')}>${T('besokDager')}</span> ${T('besokTid')}<br><span ${A('besokLunsj')}>${T('besokLunsj')}</span> ${T('besokLunsjTid')}</p>
      </div>
      <div class=bes__c>
        <p class="lab lab-ash" ${A('besokKontakt')}>${T('besokKontakt')}</p>
        <p><a href="tel:${fakta.tlfIntl}">${esc(fakta.tlf)}</a><br><a href="mailto:${fakta.epost}">${esc(fakta.epost)}</a></p>
        <a class=tlink href="${fakta.instagram}" target=_blank rel=noopener>Instagram<span aria-hidden=true>&#8599;</span></a>
      </div>
    </div>
    <div class=bes__cta>
      ${bookBtn('btn', 'heroBook')}
      <span class=body ${A('heroBookNote')}>${T('heroBookNote')}</span>
    </div>
  </div>
</section>`;

const footer = `
<footer class=foot>
  <div class="wrap foot__in">
    <span class=foot__mark><img src="/img/gimi/logo.webp" alt="GIMI" width=142 height=308 loading=lazy></span>
    <p class=foot__tag ${A('footTag')}>${T('footTag')}</p>
    <p class=foot__note ${A('footConcept')}>${T('footConcept')}</p>
  </div>
</footer>
<div class=bookbar>${bookBtn('btn', 'heroBook')}</div>`;

// ---------- klientkode ----------
const kort = (o) => JSON.stringify(o);
const skript = `
<script>
(function(){
  "use strict";
  var POOL = ${kort(pool)};
  var APENT = ${kort(fakta.apent)};
  var TXT = ${kort({
    no: { giPrefix: t.no.giPrefix, giAgain: t.no.giAgain, giBook: t.no.giBook, statusOpen: t.no.statusOpen, statusOpenUntil: t.no.statusOpenUntil, statusBarUntil: t.no.statusBarUntil, statusOpensToday: t.no.statusOpensToday, statusOpensAt: t.no.statusOpensAt, statusClosed: t.no.statusClosed, statusLunch: t.no.statusLunch, dager: t.no.dager },
    en: { giPrefix: t.en.giPrefix, giAgain: t.en.giAgain, giBook: t.en.giBook, statusOpen: t.en.statusOpen, statusOpenUntil: t.en.statusOpenUntil, statusBarUntil: t.en.statusBarUntil, statusOpensToday: t.en.statusOpensToday, statusOpensAt: t.en.statusOpensAt, statusClosed: t.en.statusClosed, statusLunch: t.en.statusLunch, dager: t.en.dager },
  })};
  var BOOKING = ${kort(fakta.booking)};
  var START_TAG = 'grill', START_I = ${startIndeks};
  var lang = 'no';
  var $ = function(id){ return document.getElementById(id); };

  /* ---- språk ---- */
  function bytt(l){
    lang = (l === 'en') ? 'en' : 'no';
    document.documentElement.lang = lang;
    var n = document.querySelectorAll('[data-no][data-en]');
    for (var i = 0; i < n.length; i++){
      var el = n[i], v = el.getAttribute('data-' + lang);
      if (v === null) continue;
      var at = el.getAttribute('data-attr');
      if (at) el.setAttribute(at, v);
      else if (el.hasAttribute('data-html')) el.innerHTML = v;
      else el.textContent = v;
    }
    var a = $('lang-no'), b = $('lang-en');
    if (a) a.setAttribute('aria-pressed', String(lang === 'no'));
    if (b) b.setAttribute('aria-pressed', String(lang === 'en'));
    try { localStorage.setItem('gimi-lang', lang); } catch(e){}
    visStatus();
    if (sisteTag) vis(sisteTag, true);
  }
  var lb = document.querySelectorAll('.lang button');
  for (var i = 0; i < lb.length; i++) lb[i].addEventListener('click', function(){ bytt(this.getAttribute('data-lang')); });

  /* ---- mobilmeny ---- */
  var bg = $('burger'), mn = $('mnav');
  if (bg && mn){
    bg.addEventListener('click', function(){
      var open = bg.getAttribute('aria-expanded') === 'true';
      bg.setAttribute('aria-expanded', String(!open));
      mn.hidden = open;
      document.body.style.overflow = open ? '' : 'hidden';
    });
    var ml = mn.querySelectorAll('a');
    for (var j = 0; j < ml.length; j++) ml[j].addEventListener('click', function(){
      bg.setAttribute('aria-expanded', 'false'); mn.hidden = true; document.body.style.overflow = '';
    });
  }

  /* ---- live åpent-status ---- */
  function klokke(h){
    if (h === 24) return '24.00';
    var hel = Math.floor(h) % 24;
    return (hel < 10 ? '0' : '') + hel + '.00';
  }
  function finn(now){
    var d = now.getDay(), h = now.getHours() + now.getMinutes() / 60, i, nd;
    var forrige = APENT[(d + 6) % 7];
    if (forrige && forrige.bar > 24 && h < (forrige.bar - 24)) return { apen: true, til: forrige.bar, bar: true };
    var idag = APENT[d];
    if (idag){
      if (idag.lunsj && h >= idag.lunsj[0] && h < idag.lunsj[1]) return { apen: true, lunsj: true };
      if (h >= idag.fra && h < idag.bar) return { apen: true, til: (h < idag.til) ? idag.til : idag.bar, bar: h >= idag.til };
      if (h < idag.fra) return { apen: false, iDag: idag.fra };
    }
    for (i = 1; i <= 7; i++){ nd = (d + i) % 7; if (APENT[nd]) return { apen: false, dag: nd, fra: APENT[nd].fra }; }
    return { apen: false };
  }
  function visStatus(){
    var boks = $('status'), tx = $('status-text');
    if (!boks || !tx) return;
    var s = finn(new Date()), tt = TXT[lang], ut;
    boks.classList.toggle('on', !!s.apen);
    if (s.apen && s.lunsj) ut = tt.statusLunch;
    else if (s.apen) ut = tt.statusOpen + ' · ' + (s.bar ? tt.statusBarUntil : tt.statusOpenUntil) + ' ' + klokke(s.til);
    else if (s.iDag !== undefined) ut = tt.statusOpensToday + ' ' + klokke(s.iDag);
    else if (s.dag !== undefined) ut = tt.statusOpensAt + ' ' + tt.dager[s.dag] + ' ' + klokke(s.fra);
    else ut = tt.statusClosed;
    tx.textContent = ut;
    boks.hidden = false;
  }

  /* ---- gi meg noe ---- */
  var sisteTag = null, sisteI = {};
  sisteI[START_TAG] = START_I;
  function velg(tag){
    var l = POOL[tag] || [];
    if (!l.length) return null;
    if (l.length === 1) return l[0];
    var f = sisteI[tag], n;
    do { n = Math.floor(Math.random() * l.length); } while (n === f);
    sisteI[tag] = n;
    return l[n];
  }
  function vis(tag, behold){
    var boks = $('gi-result');
    if (!boks) return;
    var r = behold ? POOL[tag][sisteI[tag]] : velg(tag);
    if (!r) return;
    sisteTag = tag;
    var tt = TXT[lang];
    boks.innerHTML = '<div class="gi__out' + (behold ? '' : ' gi--in') + '">' +
      '<div><p class=gi__pre></p><h3 class=gi__name></h3><p class=gi__desc></p>' +
      (r.a ? '<small class=gi__all></small>' : '') + '</div>' +
      '<div class=gi__side>' + (r.pris ? '<span class=gi__price></span>' : '') +
      '<a class="btn btn--ghost" href="' + BOOKING + '" target=_blank rel=noopener></a>' +
      '<button type=button class=gi__again></button></div></div>';
    // Tekst settes med textContent — innhold skal aldri tolkes som markup.
    boks.querySelector('.gi__pre').textContent = tt.giPrefix;
    boks.querySelector('.gi__name').textContent = r.n[lang];
    boks.querySelector('.gi__desc').textContent = r.b[lang];
    if (r.a) boks.querySelector('.gi__all').textContent = r.a[lang];
    if (r.pris) boks.querySelector('.gi__price').textContent = r.pris + ',-';
    boks.querySelector('.btn').textContent = tt.giBook;
    var ig = boks.querySelector('.gi__again');
    ig.textContent = tt.giAgain;
    ig.addEventListener('click', function(){ vis(tag); });
    var v = document.querySelectorAll('.gi__c');
    for (var k = 0; k < v.length; k++) v[k].setAttribute('aria-pressed', String(v[k].getAttribute('data-gi') === tag));
  }
  var valg = document.querySelectorAll('.gi__c');
  for (var v2 = 0; v2 < valg.length; v2++) valg[v2].addEventListener('click', function(){ vis(this.getAttribute('data-gi')); });
  var startIgjen = document.querySelector('#gi-result .gi__again');
  if (startIgjen) startIgjen.addEventListener('click', function(){ vis(START_TAG); });

  /* ---- oppstart ---- */
  try { if (localStorage.getItem('gimi-lang') === 'en') bytt('en'); } catch(e){}
  visStatus();
  setInterval(visStatus, 60000);
})();
</script>`;

// ---------- sammenstilling ----------
const url = 'https://staymotion.no/gimi';
const tittel = 'GIMI restaurant og bar — visuelt konsept';
const beskrivelse = 'Et uforpliktende visuelt nettsidekonsept for GIMI restaurant og bar i Stavanger, utviklet av StayMotion.';

const html = `<!doctype html>
<html lang=no>
<head>
<meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name=theme-color content="#0E0B09">
<title>${esc(tittel)}</title>
<meta name=description content="${esc(beskrivelse)}">
<meta name=robots content="noindex,nofollow">
<link rel=canonical href="${url}">
<link rel=icon type="image/webp" href="/img/gimi/logo.webp">
<link rel=preconnect href="https://fonts.googleapis.com">
<link rel=preconnect href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,300..900&display=swap" rel=stylesheet>
<meta property="og:type" content=website>
<meta property="og:title" content="${esc(tittel)}">
<meta property="og:description" content="${esc(beskrivelse)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://staymotion.no/img/gimi/hero-kamskjell.webp">
<meta name="twitter:card" content=summary_large_image>
<script type="application/ld+json">
${JSON.stringify(graf, null, 1)}
</script>
<style>${STIL}</style>
</head>
<body>
<a class=skip href="#main" ${A('skip')}>${T('skip')}</a>
${topp}
<main id=main>
${hero}
${mosaikk}
${sitte}
${gi}
${ild}
${menySeksjon}
${bar}
${rom}
${selskap}
${besok}
</main>
${footer}
${skript}
</body>
</html>`;

fs.writeFileSync(`${ROT}/gimi.html`, html);
console.log('  ✓ gimi.html', Math.round(html.length / 1024) + 'kB');
console.log('    Gi meg noe:', Object.keys(pool).map((k) => k + ':' + pool[k].length).join(' '), '| start:', startRett.n.no, '#' + startIndeks);
