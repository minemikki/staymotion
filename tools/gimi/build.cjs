// Bygger gimi.html — konseptsiden for GIMI restaurant og bar.
//   node tools/gimi/build.cjs
//
// Egen visuell identitet, ikke StayMotion-skallet: dette er GIMI sin merkevare.
// Alt tekstinnhold ligger i content.cjs, all stil i style.cjs.

const fs = require('fs');
const { t, meny, glasset, fraIlden, fakta } = require('./content.cjs');
const STIL = require('./style.cjs');
const ROT = __dirname + '/../..';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Tospråklighet: hvert element bærer begge språk som attributter, og JS bytter
// tekstinnholdet. Da ligger alt innhold i HTML-en fra første render — ingenting
// venter på JavaScript for å bli lesbart.
const A = (key, html) => `data-no="${esc(t.no[key])}" data-en="${esc(t.en[key])}"${html ? ' data-html' : ''}`;
const T = (key) => esc(t.no[key]);
const RAW = (key) => t.no[key];
// For innhold som ikke ligger i t (menylinjer o.l.)
const AB = (no, en, html) => `data-no="${esc(no)}" data-en="${esc(en)}"${html ? ' data-html' : ''}`;

// ---------- "Gi meg noe": kurven av forslag ----------
const pool = { lett: [], grill: [], glass: [], dele: [] };
for (const g of meny) {
  for (const r of g.retter) {
    for (const tag of r.tags) {
      if (pool[tag]) pool[tag].push({ n: r.n, b: r.b, a: r.a, pris: r.pris });
    }
  }
}
for (const r of fraIlden) {
  for (const tag of r.tags) {
    if (pool[tag]) pool[tag].push({ n: r.n, b: r.b, a: null, pris: null });
  }
}
for (const d of glasset) pool.glass.push({ n: d.n, b: d.b, a: null, pris: null });

// ---------- strukturerte data ----------
// Siden er noindex (den er et konsept, ikke GIMIs offisielle side), så dette
// er med for å vise hva de faktisk ville fått — ikke for å bli indeksert.
const dagNavn = { 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
const apningstider = Object.entries(fakta.apent).map(([d, o]) => ({
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: 'https://schema.org/' + dagNavn[d],
  opens: String(o.fra).padStart(2, '0') + ':00',
  closes: (o.bar > 24 ? String(o.bar - 24).padStart(2, '0') : String(o.bar).padStart(2, '0')) + ':00',
}));
apningstider.push({
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: 'https://schema.org/Saturday', opens: '12:00', closes: '15:00',
});

const graf = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'GIMI restaurant og bar',
  description: t.no.heroBody,
  address: {
    '@type': 'PostalAddress',
    streetAddress: fakta.adresse,
    postalCode: fakta.postnr.split(' ')[0],
    addressLocality: 'Stavanger',
    addressCountry: 'NO',
  },
  telephone: fakta.tlfIntl,
  email: fakta.epost,
  servesCuisine: ['Nordisk', 'Grill'],
  priceRange: '200–500 NOK',
  acceptsReservations: fakta.booking,
  sameAs: [fakta.instagram],
  openingHoursSpecification: apningstider,
  hasMenu: {
    '@type': 'Menu',
    hasMenuSection: meny.map((g) => ({
      '@type': 'MenuSection',
      name: g.gruppe.no,
      hasMenuItem: g.retter.map((r) => ({
        '@type': 'MenuItem',
        name: r.n.no,
        description: r.b.no,
        offers: { '@type': 'Offer', price: String(r.pris), priceCurrency: 'NOK' },
      })),
    })),
  },
};

// ---------- seksjoner ----------
const header = `
<div class=concept-bar>
  <span ${A('conceptBar')}>${T('conceptBar')}</span>
  <span class=concept-bar__note ${A('conceptNote')}>${T('conceptNote')}</span>
</div>
<header class=site-header aria-label=Hovedmeny>
  <a class=brand href="#top" aria-label="GIMI – til toppen"><img src="/img/gimi/logo.webp" alt=GIMI width=142 height=308></a>
  <nav>
    <a href="#meny" ${A('navMeny')}>${T('navMeny')}</a>
    <a href="#ilden" ${A('navIlden')}>${T('navIlden')}</a>
    <a href="#oss" ${A('navOss')}>${T('navOss')}</a>
    <a href="#baren" ${A('navBaren')}>${T('navBaren')}</a>
    <a href="#besok" ${A('navBesok')}>${T('navBesok')}</a>
  </nav>
  <div class=head-right>
    <div class=langsw role=group aria-label="Språk / Language">
      <button type=button id=lang-no data-lang=no aria-pressed=true>NO</button>
      <button type=button id=lang-en data-lang=en aria-pressed=false>EN</button>
    </div>
    <button class=menu-toggle type=button id=menu-toggle aria-expanded=false aria-controls=mobile-nav ${A('menuOpen')} data-attr=aria-label aria-label="${T('menuOpen')}">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<nav class=mobile-nav id=mobile-nav aria-label=Mobilmeny hidden>
  <a href="#meny" ${A('navMeny')}>${T('navMeny')}</a>
  <a href="#ilden" ${A('navIlden')}>${T('navIlden')}</a>
  <a href="#oss" ${A('navOss')}>${T('navOss')}</a>
  <a href="#baren" ${A('navBaren')}>${T('navBaren')}</a>
  <a href="#besok" ${A('navBesok')}>${T('navBesok')}</a>
</nav>`;

const hero = `
<section class=hero id=top aria-labelledby=hero-title>
  <div class=hero__copy>
    <p class=eyebrow ${A('heroEyebrow')}>${T('heroEyebrow')}</p>
    <p class=status id=status hidden><span class=status__dot aria-hidden=true></span><span id=status-text></span></p>
    <h1 id=hero-title><span ${A('heroTitleA')}>${T('heroTitleA')}</span><br><em ${A('heroTitleB')}>${T('heroTitleB')}</em></h1>
    <p class=hero__lead ${A('heroLead')}>${T('heroLead')}</p>
    <p class=hero__body ${A('heroBody')}>${T('heroBody')}</p>
    <div class=hero__actions>
      <a class="button button--light" href="${fakta.booking}" target=_blank rel=noopener><span ${A('heroBook')}>${T('heroBook')}</span> <span aria-hidden=true>↗</span></a>
      <a class="text-link text-link--light" href="#meny"><span ${A('heroMenuLink')}>${T('heroMenuLink')}</span> <span aria-hidden=true>↓</span></a>
    </div>
    <div class=hero__details aria-label="Praktisk informasjon">
      <span>${esc(fakta.adresse)}</span>
      <span ${A('besokDager')}>${T('besokDager')}</span>
      <span>${esc(fakta.tlf)}</span>
    </div>
  </div>
  <div class=hero__visual>
    <img class=hero__image src="/img/gimi/hero-kamskjell.webp" alt="Illustrativt nærbilde av kamskjell med reddik, fingerlime og urter" width=1536 height=1024 fetchpriority=high>
    <div class=hero__image-caption>
      <span ${A('heroCaptionA')}>${T('heroCaptionA')}</span>
      <strong ${A('heroCaptionB')}>${T('heroCaptionB')}</strong>
    </div>
  </div>
</section>
<div class=ticker aria-hidden=true>
  <div class=ticker__track>
    ${[0, 1].map(() => `<span ${A('tickerA')}>${T('tickerA')}</span><i>◆</i><span ${A('tickerB')}>${T('tickerB')}</span><i>◆</i><span ${A('tickerC')}>${T('tickerC')}</span><i>◆</i>`).join('\n    ')}
  </div>
</div>`;

// Startkortet i "Gi meg noe". Server-rendret, slik at boksen aldri står tom
// og modulen viser hva den gjør uten at man må trykke først.
const startRett = fraIlden[0]; // Negima
const startIndeks = pool.grill.indexOf(pool.grill.find((r) => r.n.no === startRett.n.no));
const startKort = `<div class=gi__card>
        <div>
          <p class=gi__prefix ${A('giPrefix')}>${T('giPrefix')}</p>
          <h3 class=gi__name ${AB(startRett.n.no, startRett.n.en)}>${esc(startRett.n.no)}</h3>
          <p class=gi__desc ${AB(startRett.b.no, startRett.b.en)}>${esc(startRett.b.no)}</p>
        </div>
        <div class=gi__side>
          <div class=gi__actions>
            <a class="button button--deep" href="${fakta.booking}" target=_blank rel=noopener><span ${A('giBook')}>${T('giBook')}</span> <span aria-hidden=true>\u2197</span></a>
            <button type=button class=gi__again ${A('giAgain')}>${T('giAgain')}</button>
          </div>
        </div>
      </div>`;

const giValg = [['lett', 'giLett'], ['grill', 'giGrill'], ['glass', 'giGlass'], ['dele', 'giDele']];
const gi = `
<section class=gi id=gimeg aria-labelledby=gi-title>
  <div class=gi__inner>
    <div class=section-index ${A('giIndex')}>${T('giIndex')}</div>
    <div class=gi__head>
      <p class="kicker" style="margin-top:1.4rem" ${A('giKicker')}>${T('giKicker')}</p>
      <h2 id=gi-title ${A('giTitle')}>${T('giTitle')}</h2>
      <p ${A('giBody')}>${T('giBody')}</p>
    </div>
    <div class=gi__choices>
      ${giValg.map(([tag, key]) => `<button type=button class=gi__choice data-gi="${tag}" aria-pressed=false><span ${A(key)}>${T(key)}</span> <i aria-hidden=true>→</i></button>`).join('\n      ')}
    </div>
    <div class=gi__result id=gi-result aria-live=polite>
      ${startKort}
    </div>
  </div>
</section>`;

const ild = `
<section class=ild id=ilden aria-labelledby=ild-title>
  <div class=ild__inner>
    <div class="section-index section-index--ember" ${A('ildIndex')}>${T('ildIndex')}</div>
    <div class=ild__top>
      <div>
        <p class="kicker kicker--ember" style="margin-top:1.4rem" ${A('ildKicker')}>${T('ildKicker')}</p>
        <h2 id=ild-title ${A('ildTitle')}>${T('ildTitle')}</h2>
      </div>
      <div>
        <p class=ild__body ${A('ildBody')}>${T('ildBody')}</p>
        <p class=ild__body ${A('ildBody2')}>${T('ildBody2')}</p>
      </div>
    </div>
    <div class=ild__facts>
      ${[['ildF1', 'ildF1b'], ['ildF2', 'ildF2b'], ['ildF3', 'ildF3b']].map(([a, b]) =>
        `<div class=ild__fact><b ${A(a)}>${T(a)}</b><span ${A(b)}>${T(b)}</span></div>`).join('\n      ')}
    </div>
    <div class=ild__dishes>
      <h3 class=ild__dishesTitle ${A('ildRetterTitle')}>${T('ildRetterTitle')}</h3>
      ${fraIlden.map((r) => `<article class=ild__dish><h3 ${AB(r.n.no, r.n.en)}>${esc(r.n.no)}</h3><p ${AB(r.b.no, r.b.en)}>${esc(r.b.no)}</p></article>`).join('\n      ')}
    </div>
  </div>
</section>`;

const oss = `
<section class=oss id=oss aria-labelledby=oss-title>
  <div class=oss__inner>
    <div class=section-index ${A('ossIndex')}>${T('ossIndex')}</div>
    <div class=oss__content>
      <p class=kicker ${A('ossKicker')}>${T('ossKicker')}</p>
      <h2 id=oss-title ${A('ossTitle', 1)}>${RAW('ossTitle')}</h2>
      <div class=oss__text>
        <div>
          <p ${A('ossBody')}>${T('ossBody')}</p>
          <p ${A('ossBody2')}>${T('ossBody2')}</p>
        </div>
        <blockquote class=oss__quote>
          <p ${A('ossQuote')}>${T('ossQuote')}</p>
          <cite ${A('ossQuoteBy')}>${T('ossQuoteBy')}</cite>
        </blockquote>
      </div>
    </div>
  </div>
</section>`;

const rom = `
<section class=rom id=rommet aria-labelledby=rom-title>
  <div class=rom__split>
    <div class=rom__image>
      <img src="/img/gimi/bar-cocktail.jpg" alt="Illustrativt bilde fra lokalet: baren og gjester en kveld" width=1448 height=1086 loading=lazy decoding=async>
      <span class=image-label ${A('romLabel')}>${T('romLabel')}</span>
    </div>
    <div class=rom__copy>
      <div class="section-index section-index--light" ${A('romIndex')}>${T('romIndex')}</div>
      <p class="kicker kicker--light" style="margin-top:1.4rem" ${A('romKicker')}>${T('romKicker')}</p>
      <h2 id=rom-title ${A('romTitle', 1)}>${RAW('romTitle')}</h2>
      <p ${A('romBody')}>${T('romBody')}</p>
      <p ${A('romBody2')}>${T('romBody2')}</p>
    </div>
  </div>
  <div class=rom__stats>
    ${[['romStat1', 'romStat1b'], ['romStat2', 'romStat2b'], ['romStat3', 'romStat3b']].map(([a, b]) =>
      `<div class=rom__stat><b ${A(a)}>${T(a)}</b><span ${A(b)}>${T(b)}</span></div>`).join('\n    ')}
  </div>
  <div class=rom__nabo>
    <h3 ${A('naboTitle')}>${T('naboTitle')}</h3>
    <p ${A('naboBody')}>${T('naboBody')}</p>
  </div>
</section>`;

const menySeksjon = `
<section class="menu-section section" id=meny aria-labelledby=meny-title>
  <div class=menu-intro>
    <div>
      <p class=kicker ${A('menyKicker')}>${T('menyKicker')}</p>
      <h2 id=meny-title ${A('menyTitle')}>${T('menyTitle')}</h2>
    </div>
    <p ${A('menyBody')}>${T('menyBody')}</p>
  </div>
  <div class=menu-groups>
    ${meny.map((g) => `<div class=menu-group>
      <h3 ${AB(g.gruppe.no, g.gruppe.en)}>${esc(g.gruppe.no)}</h3>
      ${g.retter.map((r) => `<article class=menu-item>
        <div>
          <h4 ${AB(r.n.no, r.n.en)}>${esc(r.n.no)}</h4>
          <p ${AB(r.b.no, r.b.en)}>${esc(r.b.no)}</p>
          <small ${AB(r.a.no, r.a.en)}>${esc(r.a.no)}</small>
        </div>
        <strong>${r.pris}</strong>
      </article>`).join('\n      ')}
    </div>`).join('\n    ')}
  </div>
  <div class=menu-foot>
    <p ${A('menyFoot')}>${T('menyFoot')}</p>
    <span ${A('menyFoot2')}>${T('menyFoot2')}</span>
  </div>
</section>`;

const bar = `
<section class=bar-section id=baren aria-labelledby=bar-title>
  <div class=bar-section__image>
    <img src="/img/gimi/bar-cocktail.jpg" alt="Illustrativt bilde av en bartender som ferdigstiller en cocktail" width=1448 height=1086 loading=lazy decoding=async>
    <span class=image-label ${A('barLabel')}>${T('barLabel')}</span>
  </div>
  <div class=bar-section__copy>
    <div class="section-index section-index--light" ${A('barIndex')}>${T('barIndex')}</div>
    <p class="kicker kicker--light" ${A('barKicker')}>${T('barKicker')}</p>
    <h2 id=bar-title ${A('barTitle')}>${T('barTitle')}</h2>
    <p ${A('barBody')}>${T('barBody')}</p>
    <p ${A('barBody2')}>${T('barBody2')}</p>
    <div class=bar-hours>
      <span ${A('barH1')}>${T('barH1')}</span><strong ${A('barH1b')}>${T('barH1b')}</strong>
      <span ${A('barH2')}>${T('barH2')}</span><strong ${A('barH2b')}>${T('barH2b')}</strong>
    </div>
  </div>
</section>`;

const lunsj = `
<section class=lunsj aria-labelledby=lunsj-title>
  <div class=lunsj__inner>
    <div>
      <p class=kicker ${A('lunsjKicker')}>${T('lunsjKicker')}</p>
      <h2 id=lunsj-title ${A('lunsjTitle')}>${T('lunsjTitle')}</h2>
      <p ${A('lunsjBody')}>${T('lunsjBody')}</p>
    </div>
    <a class="button button--deep" href="${fakta.booking}" target=_blank rel=noopener><span ${A('lunsjCta')}>${T('lunsjCta')}</span> <span aria-hidden=true>↗</span></a>
  </div>
</section>`;

const selskap = `
<section class=selskap aria-labelledby=selskap-title>
  <div class=selskap__inner>
    <div>
      <div class="section-index section-index--light" ${A('selskapIndex')}>${T('selskapIndex')}</div>
      <p class="kicker kicker--light" style="margin-top:1.4rem" ${A('selskapKicker')}>${T('selskapKicker')}</p>
      <h2 id=selskap-title ${A('selskapTitle', 1)}>${RAW('selskapTitle')}</h2>
    </div>
    <div>
      <p ${A('selskapBody')}>${T('selskapBody')}</p>
      <a class="button button--ember" href="mailto:${fakta.epost}"><span ${A('selskapCta')}>${T('selskapCta')}</span> <span aria-hidden=true>↗</span></a>
      <p class=selskap__note ${A('selskapNote')}>${T('selskapNote')}</p>
    </div>
  </div>
</section>`;

const faq = `
<section class=faq aria-labelledby=faq-title>
  <div class=faq__inner>
    <div class=section-index ${A('faqIndex')}>${T('faqIndex')}</div>
    <h2 id=faq-title ${A('faqTitle')}>${T('faqTitle')}</h2>
    ${t.no.faq.map(([q, a], i) => `<details>
      <summary><span ${AB(q, t.en.faq[i][0])}>${esc(q)}</span><span class=pm aria-hidden=true>+</span></summary>
      <div class=a ${AB(a, t.en.faq[i][1])}>${esc(a)}</div>
    </details>`).join('\n    ')}
  </div>
</section>`;

const besok = `
<section class=visit id=besok aria-labelledby=besok-title>
  <div class=visit__inner>
    <div class=section-index ${A('besokIndex')}>${T('besokIndex')}</div>
    <div class=visit__headline>
      <p class=kicker ${A('besokKicker')}>${T('besokKicker')}</p>
      <h2 id=besok-title ${A('besokTitle', 1)}>${RAW('besokTitle')}</h2>
    </div>
    <div class=visit__grid>
      <div>
        <span class=visit__label ${A('besokAdr')}>${T('besokAdr')}</span>
        <p>${esc(fakta.adresse)}<br>${esc(fakta.postnr)}</p>
        <a class=text-link href="${fakta.kart}" target=_blank rel=noopener><span ${A('besokVei')}>${T('besokVei')}</span> <span aria-hidden=true>↗</span></a>
      </div>
      <div>
        <span class=visit__label ${A('besokRest')}>${T('besokRest')}</span>
        <p><span ${A('besokDager')}>${T('besokDager')}</span><br>${T('besokTid')}</p>
        <p><span ${A('besokLunsj')}>${T('besokLunsj')}</span><br>${T('besokLunsjTid')}</p>
      </div>
      <div>
        <span class=visit__label ${A('besokKontakt')}>${T('besokKontakt')}</span>
        <p><a href="tel:${fakta.tlfIntl}">${esc(fakta.tlf)}</a><br><a href="mailto:${fakta.epost}">${esc(fakta.epost)}</a></p>
        <a class=text-link href="${fakta.instagram}" target=_blank rel=noopener>Instagram <span aria-hidden=true>↗</span></a>
      </div>
    </div>
    <p class=visit__stemning ${A('stemning')}>${T('stemning')}</p>
  </div>
</section>`;

const footer = `
<footer>
  <img src="/img/gimi/logo.webp" alt=GIMI width=142 height=308 loading=lazy>
  <p ${A('footTag')}>${T('footTag')}</p>
  <p class=footer__concept ${A('footConcept')}>${T('footConcept')}</p>
</footer>
<div class=bookbar>
  <a class="button button--light" href="${fakta.booking}" target=_blank rel=noopener><span ${A('heroBook')}>${T('heroBook')}</span> <span aria-hidden=true>↗</span></a>
</div>`;

// ---------- klientkode ----------
const skript = `
<script>
(function(){
  "use strict";
  var POOL = ${JSON.stringify(pool)};
  var APENT = ${JSON.stringify(fakta.apent)};
  var TXT = ${JSON.stringify({
    no: { giPrefix: t.no.giPrefix, giAgain: t.no.giAgain, giBook: t.no.giBook, statusOpen: t.no.statusOpen, statusOpenUntil: t.no.statusOpenUntil, statusBarUntil: t.no.statusBarUntil, statusOpensToday: t.no.statusOpensToday, statusOpensAt: t.no.statusOpensAt, statusClosed: t.no.statusClosed, statusLunch: t.no.statusLunch, dager: t.no.dager, menuOpen: t.no.menuOpen },
    en: { giPrefix: t.en.giPrefix, giAgain: t.en.giAgain, giBook: t.en.giBook, statusOpen: t.en.statusOpen, statusOpenUntil: t.en.statusOpenUntil, statusBarUntil: t.en.statusBarUntil, statusOpensToday: t.en.statusOpensToday, statusOpensAt: t.en.statusOpensAt, statusClosed: t.en.statusClosed, statusLunch: t.en.statusLunch, dager: t.en.dager, menuOpen: t.en.menuOpen },
  })};
  var BOOKING = ${JSON.stringify(fakta.booking)};
  var lang = 'no';
  var $ = function(id){ return document.getElementById(id); };

  /* ---------- språk ---------- */
  function bytt(l){
    lang = (l === 'en') ? 'en' : 'no';
    document.documentElement.lang = (lang === 'en') ? 'en' : 'no';
    var noder = document.querySelectorAll('[data-no][data-en]');
    for (var i = 0; i < noder.length; i++){
      var el = noder[i], v = el.getAttribute('data-' + lang);
      if (v === null) continue;
      var attr = el.getAttribute('data-attr');
      if (attr) el.setAttribute(attr, v);
      else if (el.hasAttribute('data-html')) el.innerHTML = v;
      else el.textContent = v;
    }
    var nob = $('lang-no'), enb = $('lang-en');
    if (nob) nob.setAttribute('aria-pressed', String(lang === 'no'));
    if (enb) enb.setAttribute('aria-pressed', String(lang === 'en'));
    try { localStorage.setItem('gimi-lang', lang); } catch(e){}
    visStatus();
    if (sisteTag) visForslag(sisteTag, true);
  }
  var lb = document.querySelectorAll('.langsw button');
  for (var i = 0; i < lb.length; i++){
    lb[i].addEventListener('click', function(){ bytt(this.getAttribute('data-lang')); });
  }

  /* ---------- mobilmeny ---------- */
  var btn = $('menu-toggle'), nav = $('mobile-nav');
  if (btn && nav){
    btn.addEventListener('click', function(){
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      nav.hidden = open;
    });
    var lenker = nav.querySelectorAll('a');
    for (var j = 0; j < lenker.length; j++){
      lenker[j].addEventListener('click', function(){
        btn.setAttribute('aria-expanded', 'false');
        nav.hidden = true;
      });
    }
  }

  /* ---------- live åpent-status ---------- */
  function klokke(h){
    // Kjøkkenet stenger «24.00», ikke «00.00» — men baren til 25 skal vise 01.00.
    if (h === 24) return '24.00';
    var hel = Math.floor(h) % 24;
    return (hel < 10 ? '0' : '') + hel + '.00';
  }
  function finnStatus(now){
    var d = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    var i, nd;
    // Fortsatt inne i gårsdagens sene økt? (baren til 01 fredag og lørdag)
    var forrige = APENT[(d + 6) % 7];
    if (forrige && forrige.bar > 24 && h < (forrige.bar - 24)){
      return { apen: true, til: forrige.bar, bar: true };
    }
    var i_dag = APENT[d];
    if (i_dag){
      if (i_dag.lunsj && h >= i_dag.lunsj[0] && h < i_dag.lunsj[1]){
        return { apen: true, lunsj: true, til: i_dag.lunsj[1] };
      }
      if (h >= i_dag.fra && h < i_dag.bar){
        return { apen: true, til: (h < i_dag.til) ? i_dag.til : i_dag.bar, bar: h >= i_dag.til };
      }
      if (h < i_dag.fra) return { apen: false, iDag: i_dag.fra };
    }
    for (i = 1; i <= 7; i++){
      nd = (d + i) % 7;
      if (APENT[nd]) return { apen: false, dag: nd, fra: APENT[nd].fra };
    }
    return { apen: false };
  }
  function visStatus(){
    var boks = $('status'), tekst = $('status-text');
    if (!boks || !tekst) return;
    var s = finnStatus(new Date()), tt = TXT[lang], ut;
    boks.classList.toggle('is-open', !!s.apen);
    if (s.apen && s.lunsj){
      ut = tt.statusLunch;
    } else if (s.apen){
      ut = tt.statusOpen + ' · ' + (s.bar ? tt.statusBarUntil : tt.statusOpenUntil) + ' ' + klokke(s.til);
    } else if (s.iDag !== undefined){
      ut = tt.statusOpensToday + ' ' + klokke(s.iDag);
    } else if (s.dag !== undefined){
      ut = tt.statusOpensAt + ' ' + tt.dager[s.dag] + ' ' + klokke(s.fra);
    } else {
      ut = tt.statusClosed;
    }
    tekst.textContent = ut;
    boks.hidden = false;
  }

  /* ---------- "Gi meg noe" ---------- */
  var START_TAG = 'grill', START_INDEKS = ${startIndeks};
  // Startkortet ligger allerede i HTML-en. Vi kjenner tilstanden det står i,
  // slik at "gi meg noe annet" ikke serverer det samme igjen. sisteTag holdes
  // null inntil noen faktisk velger noe — da bytter språkbytte tekstene via
  // data-attributtene på startkortet i stedet for å bygge det på nytt.
  var sisteTag = null, sisteIndeks = {};
  sisteIndeks[START_TAG] = START_INDEKS;
  function velg(tag){
    var liste = POOL[tag] || [];
    if (!liste.length) return null;
    if (liste.length === 1) return liste[0];
    var forrige = sisteIndeks[tag], n;
    do { n = Math.floor(Math.random() * liste.length); } while (n === forrige);
    sisteIndeks[tag] = n;
    return liste[n];
  }
  function visForslag(tag, behold){
    var boks = $('gi-result');
    if (!boks) return;
    var r = behold ? POOL[tag][sisteIndeks[tag]] : velg(tag);
    if (!r) return;
    sisteTag = tag;
    var tt = TXT[lang];
    var h = '<div class="gi__card' + (behold ? '' : ' gi--in') + '">' +
      '<div>' +
        '<p class=gi__prefix>' + tt.giPrefix + '</p>' +
        '<h3 class=gi__name></h3>' +
        '<p class=gi__desc></p>' +
        (r.a ? '<small class=gi__allerg></small>' : '') +
      '</div>' +
      '<div class=gi__side>' +
        (r.pris ? '<span class=gi__price>' + r.pris + ',-</span>' : '') +
        '<div class=gi__actions>' +
          '<a class="button button--deep" href="' + BOOKING + '" target=_blank rel=noopener>' + tt.giBook + ' <span aria-hidden=true>↗</span></a>' +
          '<button type=button class=gi__again>' + tt.giAgain + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    boks.innerHTML = h;
    // Tekst settes med textContent, aldri innerHTML — innholdet skal aldri
    // kunne tolkes som markup.
    boks.querySelector('.gi__name').textContent = r.n[lang];
    boks.querySelector('.gi__desc').textContent = r.b[lang];
    if (r.a) boks.querySelector('.gi__allerg').textContent = r.a[lang];
    boks.querySelector('.gi__again').addEventListener('click', function(){ visForslag(tag); });
    var valg = document.querySelectorAll('.gi__choice');
    for (var k = 0; k < valg.length; k++){
      valg[k].setAttribute('aria-pressed', String(valg[k].getAttribute('data-gi') === tag));
    }
  }
  var valg = document.querySelectorAll('.gi__choice');
  for (var v = 0; v < valg.length; v++){
    valg[v].addEventListener('click', function(){ visForslag(this.getAttribute('data-gi')); });
  }
  var startIgjen = document.querySelector('#gi-result .gi__again');
  if (startIgjen) startIgjen.addEventListener('click', function(){ visForslag(START_TAG); });

  /* ---------- oppstart ---------- */
  try {
    var lagret = localStorage.getItem('gimi-lang');
    if (lagret === 'en') bytt('en');
  } catch(e){}
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
<meta name=theme-color content="#202b4a">
<title>${esc(tittel)}</title>
<meta name=description content="${esc(beskrivelse)}">
<meta name=robots content="noindex,nofollow">
<link rel=canonical href="${url}">
<link rel=icon type="image/webp" href="/img/gimi/logo.webp">
<link rel=preconnect href="https://fonts.googleapis.com">
<link rel=preconnect href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel=stylesheet>
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
<a class=skip-link href="#main" ${A('skip')}>${T('skip')}</a>
${header}
<main id=main>
${hero}
${gi}
${ild}
${oss}
${rom}
${menySeksjon}
${bar}
${lunsj}
${selskap}
${faq}
${besok}
</main>
${footer}
${skript}
</body>
</html>`;

fs.writeFileSync(`${ROT}/gimi.html`, html);
console.log('  ✓ gimi.html', Math.round(html.length / 1024) + 'kB');
console.log('    Gi meg noe — forslag per valg:', Object.keys(pool).map((k) => k + ':' + pool[k].length).join(' '));
