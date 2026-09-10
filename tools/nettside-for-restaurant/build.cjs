// Egen SEO-landingsside, /nettside-for-restaurant — én bespoke side, ikke en
// av de fire bransjesidene i tools/bransjesider (som deler én mal). Denne har
// sin egen retning (asymmetrisk hero, browser-frame-preview i stedet for
// telefon), så den fortjener sitt eget lille byggeskript i stedet for å
// tvinges inn i den delte malen.
//
// Kjør: node tools/nettside-for-restaurant/build.cjs
//
// Gjenbruker header/footer/global stil fra tools/bransjesider/shell.json —
// samme kilde som de fire bransjesidene — så denne siden aldri kan drifte
// fra forsidens navigasjon og merkevare. Hent shell.json på nytt der hvis
// forsidens header/footer endres (se README i den mappa).

const fs = require('fs');
const shell = JSON.parse(fs.readFileSync(__dirname + '/../bransjesider/shell.json', 'utf8'));
const ROT = __dirname + '/../..';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Samme fiks som bransjesidene: header/footer er hentet fra index.html der
// "#top", "#arbeid" osv. peker på seksjoner PÅ FORSIDEN. På en underside
// finnes ikke de id-ene, så uten dette ville logo og meny ikke gjort noe.
const tilForsiden = (html) => html.replace(/href="#/g, 'href="/#');
const header = tilForsiden(shell.header);
const footer = tilForsiden(shell.footer);

const url = 'https://staymotion.no/nettside-for-restaurant';
const tittel = 'Nettside for restaurant i Stavanger · StayMotion';
const beskrivelse = 'Vi bygger raske restaurantsider som gjør det enkelt å finne menyen, bestille bord og velge dere. Fast pris, levert på 5 dager, mobil først.';

// Enkle, universelt gjenkjennelige strek-ikoner. Ingen ikonbibliotek, ingen
// ekstra nettverkskall — bare inline SVG, samme filosofi som resten av siden.
const ikonMobil = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="8" height="16" rx="2"/><path d="M9.6 15h.8"/></svg>';
const ikonKalender = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 12l2 2 4-4.5"/></svg>';
const ikonSok = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6"/><path d="M13.5 13.5 18 18"/></svg>';

const graf = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Forsiden', item: 'https://staymotion.no/' },
      { '@type': 'ListItem', position: 2, name: 'Nettside for restaurant', item: url },
    ] },
    { '@type': 'Service', '@id': url + '#tjeneste',
      name: 'Nettside for restaurant',
      serviceType: 'Webdesign',
      description: beskrivelse,
      provider: { '@id': 'https://staymotion.no/#virksomhet' },
      areaServed: [{ '@type': 'City', name: 'Stavanger' }, { '@type': 'AdministrativeArea', name: 'Rogaland' }],
      offers: [
        { '@type': 'Offer', name: 'Første trekk', price: '7900', priceCurrency: 'NOK' },
        { '@type': 'Offer', name: 'Momentum', price: '16000', priceCurrency: 'NOK' },
      ],
    },
    { '@type': 'FAQPage', inLanguage: 'nb-NO',
      mainEntity: [
        ['Kan dere legge inn menyen vår slik den er i dag?', 'Ja. Send den som PDF, bilde eller Word-dokument, så skriver vi den inn som ekte tekst på siden — søkbar, lesbar på mobil, og enkel for deg å endre selv når sesongen skifter.'],
        ['Vi bruker allerede et bookingsystem for bordbestilling. Går det an å koble det til?', 'Som regel ja. De fleste norske bookingsystemer for restaurant kan legges rett inn i siden, så gjesten aldri forlater den for å bestille bord. Fortell hvilket dere bruker, så sjekker vi.'],
        ['Hva koster en nettside for restaurant, og hvor fort er den klar?', 'Momentum er en komplett nettside med meny, bilder, kart og bordbestilling til fast pris 16 000 kr, første utkast innen 5 virkedager. Trenger dere bare én sterk side, koster Første trekk 7 900 kr. Alle priser står samlet under priser.'],
        ['Vi har ikke gode bilder av lokalet ennå. Er det et problem?', 'Nei. Vi hjelper med hva som er verdt å ta bilde av, og bruker gjerne bildene dere allerede har på Google eller Instagram som utgangspunkt for retning, selv om selve bildene i den ferdige siden skal være deres egne.'],
      ],
    },
  ],
};

const html = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f5f5f2">
<title>${esc(tittel)}</title>
<meta name="description" content="${esc(beskrivelse)}">
<meta name="robots" content="noindex,nofollow">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preload" href="/fonts/inter-tight-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/img/bransje/restaurant.webp" as="image">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(tittel)}">
<meta property="og:description" content="${esc(beskrivelse)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://staymotion.no/img/bransje/restaurant.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://staymotion.no/img/bransje/restaurant.webp">
<script type="application/ld+json">
${JSON.stringify(graf, null, 1)}
</script>
<style>${shell.style}
/* ================= /nettside-for-restaurant — sidespesifikk ================= */
.rst-hero{padding:clamp(48px,7vw,88px) 0 clamp(56px,7vw,96px);position:relative;overflow-x:clip}
.rst-hero .wrap{display:grid;gap:clamp(40px,6vw,72px)}
.crumb{font-size:13px;color:var(--faint);margin-bottom:20px}
.crumb a{border-bottom:1px solid transparent}
.crumb a:hover{border-bottom-color:currentColor}
.rst-eyebrow{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--cobalt)}
.rst-h1{margin-top:16px;font-size:clamp(40px,5.6vw,70px);font-weight:700;line-height:.98;letter-spacing:-.045em;max-width:12ch}
.rst-lead{margin-top:22px;font-size:clamp(16.5px,1.6vw,19px);line-height:1.6;color:var(--ink2);max-width:46ch}
.rst-cta{margin-top:32px;display:flex;flex-wrap:wrap;align-items:center;gap:20px 26px}
.rst-benefits{margin-top:34px;display:flex;flex-wrap:wrap;gap:22px 30px;padding-top:26px;border-top:1px solid var(--line)}
.rst-benefits li{list-style:none;display:flex;align-items:center;gap:9px;font-size:14px;color:var(--muted)}
.rst-benefits svg{width:17px;height:17px;flex:none;color:var(--cobalt)}
.rst-benefits ul{display:contents}

/* ---- previewen: browser-frame + overlappende menykort + ankrede markører ---- */
.rst-preview{position:relative;isolation:isolate}
.rst-preview::before{content:"";position:absolute;top:-10%;right:-8%;width:min(60vw,620px);height:min(60vw,620px);background:radial-gradient(closest-side,rgba(18,72,255,.20),transparent 72%);filter:blur(8px);z-index:-1;pointer-events:none}
.rst-frame-wrap{position:relative;max-width:600px;margin-inline:auto}
.rst-frame{border-radius:16px;overflow:hidden;background:#0c0d10;box-shadow:0 60px 110px -50px rgba(10,20,60,.55),0 12px 30px -18px rgba(10,20,60,.35)}
.rst-bar{display:flex;align-items:center;gap:7px;padding:11px 14px;background:#15161a}
.rst-bar i{width:8px;height:8px;border-radius:50%;background:#3a3c44}
.rst-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;background:#0c0d10;color:#f4ebe0;font-size:12.5px}
.rst-nav .rst-brand{font-weight:700;letter-spacing:-.01em;font-size:13.5px}
.rst-nav .rst-links{display:flex;gap:18px;opacity:.6}
.rst-nav .rst-book{flex:none;padding:8px 14px;border-radius:8px;background:#e8c9a0;color:#1a1412;font-weight:700;font-size:11.5px;letter-spacing:.02em}
.rst-shot{position:relative;aspect-ratio:16/10}
.rst-shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.rst-shot::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,9,6,.74) 0%,rgba(8,9,6,.18) 34%,rgba(8,9,6,.05) 60%,rgba(8,9,6,.4) 100%)}
.rst-shot .txt{position:absolute;left:20px;right:20px;top:16px;z-index:1;color:#f6f1e6}
.rst-shot h2{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:clamp(19px,2.6vw,25px);letter-spacing:-.01em;line-height:1.08}
.rst-shot p{margin:6px 0 0;font-size:12px;opacity:.82}

.rst-menu{position:absolute;left:-5%;bottom:-8%;width:min(44%,178px);background:#fff;border-radius:13px;padding:13px 14px 14px;
  box-shadow:0 26px 50px -26px rgba(10,20,60,.45),0 2px 8px -4px rgba(10,20,60,.15);z-index:2}
.rst-menu h3{margin:0 0 9px;font-size:12.5px;font-weight:700;letter-spacing:-.01em;display:flex;align-items:center;justify-content:space-between;color:var(--ink)}
.rst-menu h3 i{width:14px;height:10px;position:relative;flex:none}
.rst-menu h3 i::before,.rst-menu h3 i::after,.rst-menu h3 i span{content:"";position:absolute;left:0;right:0;height:1.4px;background:var(--ink);opacity:.7}
.rst-menu h3 i::before{top:0}.rst-menu h3 i span{top:4.5px}.rst-menu h3 i::after{bottom:0}
.rst-menu ul{list-style:none;margin:0;padding:0;display:grid;gap:7px}
.rst-menu li{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--ink2);padding:7px 2px;border-top:1px solid var(--line)}
.rst-menu li:first-child{border-top:0}
.rst-menu li span:last-child{opacity:.4;font-size:10px}

.rst-markers{list-style:none;margin:20px 0 0;padding:0;display:grid;gap:12px}
.rst-markers li{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:50px;
  padding:10px 16px 10px 12px;box-shadow:0 10px 24px -18px rgba(10,20,60,.3);width:fit-content}
.rst-markers .ic{width:26px;height:26px;border-radius:50%;background:#eef2ff;color:var(--cobalt);display:flex;align-items:center;justify-content:center;flex:none}
.rst-markers .ic svg{width:14px;height:14px}
.rst-markers span{font-size:13.5px;font-weight:500;color:var(--ink)}
.rst-note{margin:22px 0 0;font-size:12.5px;color:var(--faint);text-align:center}

@media(min-width:900px){
  .rst-hero .wrap{grid-template-columns:.92fr 1.08fr;align-items:center}
  .rst-preview{padding-left:8px}
  .rst-frame-wrap{margin-inline:0 0 0 auto}
  .rst-markers{position:absolute;right:clamp(-64px,-6vw,-18px);top:16%;margin:0}
  .rst-markers li:nth-child(2){margin-left:22px}
  .rst-markers li:nth-child(3){margin-left:44px}
}
@media(max-width:899px){
  .rst-frame-wrap{max-width:440px}
  .rst-markers{margin-top:44px;justify-items:start}
  .rst-markers li{margin-inline:auto}
}
@media(max-width:520px){
  .rst-menu{left:2%;bottom:-7%;width:min(56%,168px)}
  .rst-frame-wrap{max-width:100%}
}

/* ---- steg: "Fra Google-søk til reservert bord" ---- */
.rst-steps-sec{padding:clamp(64px,8vw,104px) 0;position:relative;overflow:hidden}
.rst-steps-sec::before{content:"";position:absolute;top:10%;left:50%;transform:translateX(-50%);width:min(70vw,760px);height:280px;background:radial-gradient(closest-side,rgba(18,72,255,.08),transparent 74%);pointer-events:none}
.rst-steps{position:relative;margin-top:clamp(40px,5vw,60px);display:grid;gap:0}
.rst-step{position:relative;display:grid;gap:14px}
.rst-step .n{font-size:clamp(46px,4.4vw,60px);font-weight:600;letter-spacing:-.04em;line-height:.9;
  background:linear-gradient(135deg,var(--cobalt),#7f9bff);-webkit-background-clip:text;background-clip:text;color:transparent}
.rst-step h3{margin:0;font-size:19px;font-weight:500;letter-spacing:-.03em}
.rst-step p{margin:0;font-size:14.5px;color:var(--muted);line-height:1.55;max-width:30ch}
@media(min-width:820px){
  .rst-steps{grid-template-columns:1fr auto 1fr auto 1fr;align-items:start}
  .rst-arrow{align-self:center;height:1px;background:linear-gradient(90deg,var(--line),var(--cobalt) 70%,var(--line));position:relative;top:-40px;width:100%;min-width:36px}
  .rst-arrow::after{content:"";position:absolute;right:-1px;top:50%;transform:translateY(-50%) rotate(45deg);width:6px;height:6px;border-top:1.5px solid var(--cobalt);border-right:1.5px solid var(--cobalt)}
}
@media(max-width:819px){
  .rst-steps{gap:30px;padding-left:26px;border-left:1.5px solid var(--line)}
  .rst-step{padding-left:4px}
  .rst-step .n{position:absolute;left:-26px;top:-6px;font-size:15px;-webkit-text-fill-color:#fff;background:var(--cobalt);color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;letter-spacing:0}
  .rst-arrow{display:none}
}

/* ---- konkret / faq / cta: samme rytme som resten av siden ---- */
.rst-sec{padding:clamp(56px,7vw,92px) 0}
.rst-sec .lead{margin-top:16px}
.rst-list{margin-top:36px;display:grid;gap:0}
.rst-list .item{border-top:1px solid var(--line);padding:24px 0;display:grid;gap:8px}
.rst-list .item h3{margin:0;font-size:18px;font-weight:500;letter-spacing:-.02em}
.rst-list .item p{margin:0;color:var(--muted);font-size:15px;line-height:1.6;max-width:60ch}
@media(min-width:820px){.rst-list{grid-template-columns:1fr 1fr;gap:0 48px}}
.rst-cta-band{background:var(--pearl2);border-top:1px solid var(--line);padding:clamp(56px,7vw,88px) 0}
.rst-cta-band .wrap{display:grid;gap:26px}
@media(min-width:820px){.rst-cta-band .wrap{grid-template-columns:1.1fr .9fr;align-items:end;gap:56px}}
</style>
</head>
<body>
<a class="skip" href="#hovedinnhold">Hopp til innhold</a>
${header}
<main id="hovedinnhold">

<section class="rst-hero" id="top" aria-labelledby="rst-h1">
  <div class="wrap">
    <div class="rst-copy">
      <p class="crumb"><a href="/">Forsiden</a> &rsaquo; Nettside for restaurant</p>
      <span class="rst-eyebrow">Nettside for restaurant</span>
      <h1 class="rst-h1" id="rst-h1">En nettside som fyller bordene.</h1>
      <p class="rst-lead">Vi bygger raske restaurantsider som gj&oslash;r det enkelt &aring; finne menyen, bestille bord og velge dere.</p>
      <div class="rst-cta">
        <a class="primary" href="/start.html?type=konsept&amp;bransje=restaurant">F&aring; et gratis konsept <span class="arrow" aria-hidden="true">&#8599;&#65038;</span></a>
        <a class="text-link" href="/nettside-restaurant">Se restaurant-eksempel <span class="arrow" aria-hidden="true">&#8599;&#65038;</span></a>
      </div>
      <ul class="rst-benefits">
        <li>${ikonKalender.replace('20 20','20 20')}<span>Fast pris</span></li>
        <li>${ikonMobil}<span>Levert p&aring; 5 dager</span></li>
        <li>${ikonSok}<span>Mobil f&oslash;rst</span></li>
      </ul>
    </div>

    <div class="rst-preview">
      <div class="rst-frame-wrap">
        <div class="rst-frame">
          <div class="rst-bar"><i></i><i></i><i></i></div>
          <div class="rst-nav">
            <span class="rst-brand">Brasserie Vik</span>
            <span class="rst-links"><span>Hjem</span><span>Meny</span><span>Om oss</span><span>Kontakt</span></span>
            <span class="rst-book">Bestill bord</span>
          </div>
          <div class="rst-shot">
            <img src="/img/bransje/restaurant.webp" alt="Illustrert eksempel p&aring; en restaurantside: stemningsbilde av bistrobordet med lys og vin, forsidetekst og &eacute;n bestill bord-knapp" width="1100" height="506" loading="eager" fetchpriority="high" decoding="async">
            <div class="txt">
              <h2>Mat som samler mennesker.</h2>
              <p>Sesongbasert mat i hjertet av byen.</p>
            </div>
          </div>
        </div>
        <div class="rst-menu" aria-hidden="true">
          <h3>Meny <i><span></span></i></h3>
          <ul>
            <li><span>Forretter</span><span>&rsaquo;</span></li>
            <li><span>Hovedretter</span><span>&rsaquo;</span></li>
            <li><span>Desserter</span><span>&rsaquo;</span></li>
          </ul>
        </div>
      </div>
      <ul class="rst-markers" aria-hidden="true">
        <li><span class="ic">${ikonMobil}</span><span>Meny p&aring; mobil</span></li>
        <li><span class="ic">${ikonKalender}</span><span>Bordbestilling</span></li>
        <li><span class="ic">${ikonSok}</span><span>Google-synlighet</span></li>
      </ul>
      <p class="rst-note">Illustrert eksempel &ndash; tilpasses restauranten.</p>
    </div>
  </div>
</section>

<section class="rst-steps-sec" aria-labelledby="rst-steg-tittel">
  <div class="wrap">
    <span class="label">Slik henger det sammen</span>
    <h2 class="h-l" id="rst-steg-tittel" style="margin-top:12px">Fra Google-s&oslash;k til reservert bord.</h2>
    <div class="rst-steps">
      <div class="rst-step"><span class="n">01</span><h3>Bli funnet</h3><p>Lokale s&oslash;k og teknisk SEO.</p></div>
      <div class="rst-arrow" aria-hidden="true"></div>
      <div class="rst-step"><span class="n">02</span><h3>Frist med menyen</h3><p>Retter, bilder og &aring;pningstider.</p></div>
      <div class="rst-arrow" aria-hidden="true"></div>
      <div class="rst-step"><span class="n">03</span><h3>Gj&oslash;r det enkelt</h3><p>Kort vei til bordbestilling.</p></div>
    </div>
  </div>
</section>

<section class="rst-sec" aria-labelledby="rst-konkret-tittel">
  <div class="wrap">
    <span class="label">Hva du faktisk f&aring;r</span>
    <h2 class="h-l" id="rst-konkret-tittel" style="margin-top:12px">Alt en gjest trenger, uten &aring; lete.</h2>
    <p class="lead">Ikke bare et pent forsidebilde. Det som faktisk avgj&oslash;r om noen bestiller bord fra mobilen klokka elleve p&aring; en fredag.</p>
    <div class="rst-list">
      <div class="item"><h3>Menyen som ekte tekst</h3><p>Ikke PDF eller et bilde man m&aring; zoome i. Retter og priser leses like godt p&aring; mobil som p&aring; skjerm, og du endrer dem selv n&aring;r sesongen skifter.</p></div>
      <div class="item"><h3>Bordbestilling uten telefon</h3><p>Vi kobler bookingsystemet dere allerede bruker, eller setter opp et skjema. Gjesten bestiller n&aring;r de bestemmer seg &mdash; ogs&aring; utenom &aring;pningstid.</p></div>
      <div class="item"><h3>&Aring;pningstider som stemmer</h3><p>Satt opp b&aring;de p&aring; siden og i Google-bedriftsprofilen, s&aring; de sier det samme &eacute;tt sted.</p></div>
      <div class="item"><h3>Bilder som selger stemningen</h3><p>Maten og rommet f&aring;r plass, beskj&aelig;ret og optimalisert s&aring; siden fortsatt laster raskt p&aring; mobilnett.</p></div>
    </div>
  </div>
</section>

<section class="rst-sec faq" style="padding-top:0" aria-labelledby="rst-faq-tittel">
  <div class="wrap">
    <div class="sec-head"><div><span class="label">Sp&oslash;rsm&aring;l</span><h2 class="h-l" id="rst-faq-tittel">Det vi f&aring;r oftest.</h2></div></div>
    <div class="list">
      <details><summary>Kan dere legge inn menyen v&aring;r slik den er i dag?<span class="pm" aria-hidden="true">+</span></summary><div class="a">Ja. Send den som PDF, bilde eller Word-dokument, s&aring; skriver vi den inn som ekte tekst p&aring; siden &mdash; s&oslash;kbar, lesbar p&aring; mobil, og enkel for deg &aring; endre selv n&aring;r sesongen skifter.</div></details>
      <details><summary>Vi bruker allerede et bookingsystem for bordbestilling. G&aring;r det an &aring; koble det til?<span class="pm" aria-hidden="true">+</span></summary><div class="a">Som regel ja. De fleste norske bookingsystemer for restaurant kan legges rett inn i siden, s&aring; gjesten aldri forlater den for &aring; bestille bord. Fortell hvilket dere bruker, s&aring; sjekker vi.</div></details>
      <details><summary>Hva koster en nettside for restaurant, og hvor fort er den klar?<span class="pm" aria-hidden="true">+</span></summary><div class="a">Momentum er en komplett nettside med meny, bilder, kart og bordbestilling til fast pris 16 000 kr, f&oslash;rste utkast innen 5 virkedager. Trenger dere bare &eacute;n sterk side, koster F&oslash;rste trekk 7 900 kr. Alle priser st&aring;r samlet <a href="/#priser">under priser</a>.</div></details>
      <details><summary>Vi har ikke gode bilder av lokalet enn&aring;. Er det et problem?<span class="pm" aria-hidden="true">+</span></summary><div class="a">Nei. Vi hjelper med hva som er verdt &aring; ta bilde av. Se <a href="/#arbeid">eksempler p&aring; arbeidet v&aring;rt</a> for &aring; se hva vi mener med retning og stemning.</div></details>
    </div>
  </div>
</section>

<section class="rst-cta-band" aria-labelledby="rst-cta-tittel">
  <div class="wrap">
    <div>
      <span class="label">Neste trekk er ditt</span>
      <h2 class="h-l" id="rst-cta-tittel" style="margin-top:14px">Se hvordan restaurantsiden deres kan bli.</h2>
    </div>
    <div>
      <p style="margin-bottom:22px;color:var(--muted)">Send nettsiden deres, eller bare navnet p&aring; restauranten. Du f&aring;r et konkret forslag &mdash; gratis og uforpliktende. Har du sp&oslash;rsm&aring;l f&oslash;rst, <a href="/#kontakt">ta kontakt</a>.</p>
      <a class="primary" href="/start.html?type=konsept&amp;bransje=restaurant">F&aring; et gratis konsept <span class="arrow" aria-hidden="true">&#8599;&#65038;</span></a>
    </div>
  </div>
</section>

</main>
${footer}
${shell.script}
</body>
</html>`;

fs.writeFileSync(`${ROT}/nettside-for-restaurant.html`, html);
console.log('  ✓ nettside-for-restaurant.html', Math.round(html.length / 1024) + 'kB');
