const fs = require('fs');
const sider = require(__dirname + '/content.cjs');
const visuals = require(__dirname + '/visuals.cjs');
const VISSTIL = require(__dirname + '/style.cjs');
const shell = JSON.parse(fs.readFileSync(__dirname + '/shell.json', 'utf8'));
const ROT = __dirname + '/../..';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Sidespesifikk stil. Arver alt fra forsiden, legger bare til det de nye
// seksjonene trenger.
const EKSTRA = `
.lp-hero{padding:clamp(72px,10vw,132px) 0 clamp(48px,6vw,72px)}
.lp-hero h1{max-width:16ch}
.lp-hero .lead{max-width:52ch;margin-top:24px;font-size:clamp(17px,2vw,20px);line-height:1.55;color:var(--ink2)}
.lp-hero .hero-cta{margin-top:34px}
.lp-band{background:var(--obsidian);color:var(--on-dark);padding:clamp(64px,8vw,104px) 0}
.lp-band h2{color:var(--on-dark)}
.lp-band .lp-item p{color:var(--on-dark-muted)}
.lp-band .lp-item{border-color:var(--line-dark)}
.lp-grid{display:grid;gap:0;margin-top:44px}
.lp-item{border-top:1px solid var(--line);padding:26px 0}
.lp-item h3{font-size:clamp(19px,2.2vw,23px);letter-spacing:-.03em;margin:0 0 10px}
.lp-item p{margin:0;color:var(--muted);font-size:16px;line-height:1.65;max-width:62ch}
.lp-sec{padding:clamp(64px,8vw,104px) 0}
.lp-cta{background:var(--pearl);padding:clamp(56px,7vw,88px) 0;border-top:1px solid var(--line)}
.lp-cta .wrap{display:grid;gap:26px}
.lp-cta h2{max-width:18ch}
.lp-cta p{color:var(--muted);max-width:52ch;margin:0}
.crumb{font-size:13px;color:var(--faint);margin-bottom:22px}
.crumb a{border-bottom:1px solid transparent}
.crumb a:hover{border-bottom-color:currentColor}
@media(min-width:820px){
  .lp-grid{grid-template-columns:1fr 1fr;gap:0 56px}
  .lp-cta .wrap{grid-template-columns:1.1fr .9fr;align-items:end;gap:56px}
}
@media(max-width:760px){
  .lp-hero{padding-top:56px}
  .lp-item{padding:22px 0}
  .lp-hero .hero-cta .primary{width:100%}
}
`;

function liste(punkter, moerk) {
  return `<div class="lp-grid">` + punkter.map(([t, b]) =>
    `<div class="lp-item"><h3>${esc(t)}</h3><p>${esc(b)}</p></div>`).join('') + `</div>`;
}

for (const s of sider) {
  const v = visuals[s.slug.replace('nettside-', '')];
  if (!v) throw new Error('Mangler visuelt oppsett for ' + s.slug);
  const url = `https://staymotion.no/${s.slug}`;
  const graf = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Forsiden', item: 'https://staymotion.no/' },
        { '@type': 'ListItem', position: 2, name: s.etikett, item: url }
      ]},
      { '@type': 'Service', '@id': url + '#tjeneste',
        name: s.h1.join(' ').replace(/\s+/g, ' '),
        serviceType: 'Webdesign',
        description: s.beskrivelse,
        provider: { '@id': 'https://staymotion.no/#virksomhet' },
        areaServed: [{ '@type': 'City', name: 'Stavanger' }, { '@type': 'AdministrativeArea', name: 'Rogaland' }],
        offers: [
          { '@type': 'Offer', name: 'Første trekk', price: '7900', priceCurrency: 'NOK' },
          { '@type': 'Offer', name: 'Momentum', price: '16000', priceCurrency: 'NOK' }
        ]
      },
      { '@type': 'FAQPage', inLanguage: 'nb-NO',
        mainEntity: s.faq.map(([q, a]) => ({ '@type': 'Question', name: q,
          acceptedAnswer: { '@type': 'Answer', text: a } })) }
    ]
  };

  const html = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f5f5f2">
<title>${esc(s.tittel)}</title>
<meta name="description" content="${esc(s.beskrivelse)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="preload" href="/fonts/inter-tight-400-latin.woff2" as="font" type="font/woff2" crossorigin>
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(s.tittel)}">
<meta property="og:description" content="${esc(s.beskrivelse)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="https://staymotion.no/img/bransje/${v.foto.fil}">
<meta name="twitter:image" content="https://staymotion.no/img/bransje/${v.foto.fil}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
${JSON.stringify(graf, null, 1)}
</script>
<style>${shell.style}${EKSTRA}${VISSTIL}</style>
</head>
<body>
<a class="skip" href="#hovedinnhold">Hopp til innhold</a>
${shell.header}
<main id="hovedinnhold">

<section class="lp-hero">
  <div class="wrap">
    <div class="lp-copy">
      <p class="crumb"><a href="/">Forsiden</a> &rsaquo; ${esc(s.etikett)}</p>
      <span class="label">${esc(s.etikett)} &middot; Stavanger og Rogaland</span>
      <h1 class="h-xl" style="margin-top:18px"><span>${esc(s.h1[0])}</span><br><span class="accent">${esc(s.h1[1])}</span></h1>
      <p class="lead">${esc(s.ingress)}</p>
      <div class="hero-cta">
        <a class="primary" href="/start.html?type=redesign&amp;bransje=${s.bransje}">F&aring; et gratis f&oslash;rsteside-konsept <span class="arrow" aria-hidden="true">&#8599;&#65038;</span></a>
        <a class="text-link" href="/#priser">Se priser <span class="arrow" aria-hidden="true">&#8595;&#65038;</span></a>
      </div>
    </div>

    <div class="dev rv">
      <div class="pho">${v.skjerm}</div>
      <div class="chip"><b>${v.chip[0]}</b><span>${v.chip[1]}</span></div>
      <p class="note">Illustrert konsept &mdash; ikke en faktisk kunde.</p>
    </div>
  </div>
</section>

<section class="lp-band">
  <div class="wrap">
    <h2 class="h-l">${esc(s.problem.tittel)}</h2>
    ${liste(s.problem.punkter, true)}
  </div>
</section>

<section class="lp-sec">
  <div class="wrap">
    <h2 class="h-l">${esc(s.losning.tittel)}</h2>
    ${liste(s.losning.punkter, false)}
  </div>
</section>

<section class="lp-sec faq" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head"><div><span class="label">Sp&oslash;rsm&aring;l</span><h2 class="h-l">Det vi f&aring;r oftest.</h2></div></div>
    <div class="list">
      ${s.faq.map(([q, a]) => `<details><summary>${esc(q)}<span class="pm" aria-hidden="true">+</span></summary><div class="a">${esc(a)}</div></details>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="lp-cta">
  <div class="wrap">
    <div>
      <span class="label">Neste trekk er ditt</span>
      <h2 class="h-l" style="margin-top:14px">Se hvordan forsiden deres kan bli.</h2>
    </div>
    <div>
      <p style="margin-bottom:22px">Send nettsiden deres, eller bare navnet p&aring; bedriften. Du f&aring;r et konkret forslag &mdash; gratis og uforpliktende.</p>
      <a class="primary" href="/start.html?type=konsept&amp;bransje=${s.bransje}">F&aring; et gratis f&oslash;rsteside-konsept <span class="arrow" aria-hidden="true">&#8599;&#65038;</span></a>
    </div>
  </div>
</section>

</main>
${shell.footer}
${shell.script}
</body>
</html>`;
  fs.writeFileSync(`${ROT}/${s.fil}`, html);
  console.log('  ✓', s.fil, Math.round(html.length / 1024) + 'kB');
}
