/* Språkbytter for staymotion.no
 *
 * Norsk er kilden: teksten står i HTML-en som den alltid har gjort, så siden
 * fungerer uten JavaScript og søkemotorer ser norsk innhold. Denne filen
 * bytter tekstnoder mot engelsk ved behov, og legger originalen til side så
 * bytte tilbake blir eksakt.
 *
 * Ordboken slår opp på den norske strengen. Det betyr null endringer i
 * markupen — ingen data-attributter å vedlikeholde, ingen id-er å synkronisere.
 * Mangler en oversettelse, blir norsk stående i stedet for å bli tom.
 */
(function () {
  'use strict';

  var EN = {
    // — navigasjon og topp —
    'Hopp til innhold': 'Skip to content',
    'Webdesign · Stavanger': 'Web design · Stavanger',
    'Arbeid': 'Work',
    'Slik funker det': 'How it works',
    'Priser': 'Pricing',
    'Om oss': 'About',
    'Kontakt': 'Contact',
    'Åpne meny': 'Open menu',
    'Lukk meny': 'Close menu',
    'Hovedmeny': 'Main menu',
    'StayMotion, til toppen': 'StayMotion, back to top',

    // — hero —
    'Nettsiden som får': 'The website that gets',
    'kunden til å': 'customers to',
    'ta kontakt.': 'get in touch.',
    'Vi designer og bygger nettsider for norske bedrifter. Fast pris, levert på dager — og hver side er bygget for én ting: at folk ringer, booker eller sender en melding.':
      'We design and build websites for Norwegian businesses. Fixed price, delivered in days — and every page is built for one thing: to make people call, book or send a message.',
    'Få et gratis førsteside-konsept': 'Get a free homepage concept',
    'Se priser': 'See pricing',
    'Før / standardoppsett': 'Before / stock template',
    'Etter / ny retning': 'After / new direction',
    'Sammenlign standardoppsett og ny designretning': 'Compare the stock template with the new design direction',
    'Dra for å se. Samme restaurant, ny retning.': 'Drag to compare. Same restaurant, new direction.',
    'Før': 'Before',
    'Etter': 'After',
    'Illustrert før/etter-konsept — ikke en faktisk kunde.': 'Illustrated before/after concept — not an actual client.',
    'Etter: ny nettside for Salt og Brød AS': 'After: new website for Salt og Brød AS',
    'Før: eldre nettside for Salt og Brød AS': 'Before: older website for Salt og Brød AS',

    // — løftet —
    'Det du får': 'What you get',
    'Kunden googler før de ringer.': 'Customers google you before they call.',
    'Det de finner på mobilen avgjør om de tar kontakt med deg — eller med naboen. Mange sider i Rogaland er utdaterte, trege eller finnes ikke.':
      'What they find on their phone decides whether they contact you — or the business next door. Many sites in Rogaland are outdated, slow, or missing entirely.',
    'Fast pris. Ingen byråprosess.': 'Fixed price. No agency process.',
    'Omfang og pris avtales før oppstart. Du snakker direkte med den som designer og bygger, og siden er live på dager — ikke måneder.':
      'Scope and price are agreed before we start. You deal directly with the person designing and building it, and the site goes live in days — not months.',
    'Bygget for handling.': 'Built to convert.',
    'Tydelig budskap, riktig rekkefølge, kontakt eller booking der folk forventer det. Hver seksjon har én jobb: flytte besøkeren nærmere en henvendelse.':
      'A clear message, the right order, contact or booking exactly where people expect it. Every section has one job: move the visitor closer to getting in touch.',

    // — arbeid —
    'Slik tenker vi.': 'How we think.',
    'Ett eget produkt vi har designet og bygget fra bunnen — og fire retninger for bransjene vi jobber mest mot. Konseptarbeid er merket som det.':
      'One product of our own, designed and built from scratch — plus four directions for the industries we work with most. Concept work is labelled as such.',
    'Eget produkt · ekte og live': 'Our own product · real and live',
    'SiamConnect — digital plattform.': 'SiamConnect — digital platform.',
    'Community, markedsplass, arrangementer og guider i ett produkt. Bevis på at vi designer og bygger hele digitale løsninger — ikke bare forsider.':
      'Community, marketplace, events and guides in one product. Proof that we design and build complete digital products — not just homepages.',
    'Se prosjektet': 'View the project',
    'SiamConnect — se prosjektet': 'SiamConnect — view the project',
    'SiamConnect — community-plattform på desktop': 'SiamConnect — community platform on desktop',
    'Bransjer vi bygger for': 'Industries we build for',
    'Retninger, ikke maler.': 'Directions, not templates.',
    'Hver side tegnes for bedriften den skal selge for. Velg din bransje, så starter vi med et førsteside-konsept — gratis.':
      'Every site is drawn for the business it has to sell for. Pick your industry and we will start with a homepage concept — free.',
    'Kveldene som blir lange.': 'The evenings that run long.',
    'Bestill bord': 'Book a table',
    'Restaurant & kafé': 'Restaurants & cafés',
    'Meny, stemning og bordbestilling ett trykk unna.': 'Menu, atmosphere and table booking one tap away.',
    'Få konsept': 'Get a concept',
    'Restaurant og kafé — få et førsteside-konsept': 'Restaurants and cafés — get a homepage concept',
    'Håndverk du kan stole på.': 'Craftsmanship you can rely on.',
    'Be om tilbud': 'Request a quote',
    'Håndverk & bygg': 'Trades & construction',
    'Tydelig hva dere gjør, hvor — og hvordan man ber om tilbud.': 'Clear about what you do, where — and how to request a quote.',
    'Håndverk og bygg — få et førsteside-konsept': 'Trades and construction — get a homepage concept',
    'Ta vare på deg — uten stress.': 'Look after yourself — without the fuss.',
    'Book time': 'Book an appointment',
    'Klinikk, frisør & skjønnhet': 'Clinics, salons & beauty',
    'Behandlinger, priser og timebestilling uten støy.': 'Treatments, prices and booking without the noise.',
    'Klinikk, frisør og skjønnhet — få et førsteside-konsept': 'Clinics, salons and beauty — get a homepage concept',
    'Book direkte. Ingen mellomledd.': 'Book direct. No middlemen.',
    'Se ledige datoer': 'See available dates',
    'Overnatting & opplevelser': 'Stays & experiences',
    'Vis stedet, vis prisen — og la gjesten booke direkte.': 'Show the place, show the price — and let guests book direct.',
    'Overnatting og opplevelser — få et førsteside-konsept': 'Stays and experiences — get a homepage concept',

    // — slik funker det —
    'Tre steg. Én uke.': 'Three steps. One week.',
    'Du trenger ikke kunne noe om nettsider. Du trenger 20 minutter, noen bilder og et ja.':
      'You do not need to know anything about websites. You need 20 minutes, a few photos and a yes.',
    'Start med et gratis konsept': 'Start with a free concept',
    'Konsept — gratis': 'Concept — free',
    'Send oss nettsiden din (eller bare navnet på bedriften). Vi lager et konkret forslag til ny forside: budskap, struktur og retning. Uforpliktende.':
      'Send us your website (or just the name of your business). We will produce a concrete proposal for a new homepage: message, structure and direction. No obligation.',
    'Du:': 'You:',
    '2 minutter på et skjema': '2 minutes on a form',
    'Design og bygg': 'Design and build',
    'Liker du retningen, avtaler vi omfang og fast pris. Vi skriver teksten, designer og bygger hele siden — mobil først, med kontakt eller booking der kunden forventer det.':
      'If you like the direction, we agree scope and a fixed price. We write the copy, design and build the whole site — mobile first, with contact or booking where customers expect it.',
    '20 min på telefon + logo og bilder': '20 min on the phone + logo and photos',
    'Godkjenning og lansering': 'Approval and launch',
    'Du ser gjennom og godkjenner. Vi publiserer, kobler domenet og setter opp Google-bedriftsprofil og grunnleggende lokal synlighet.':
      'You review and approve. We publish, connect the domain and set up your Google Business Profile and basic local visibility.',
    'Et ja — og siden er live': 'A yes — and the site is live',

    // — priser —
    'Fire tydelige valg.': 'Four clear options.',
    'Ingen overraskelser.': 'No surprises.',
    'Prisen er avtalt før vi starter, betaling skjer via sikker kortlenke, og du eier design, kode og innhold når prosjektet er betalt.':
      'The price is agreed before we start, payment goes through a secure card link, and you own the design, code and content once the project is paid.',
    'Mest valgt': 'Most chosen',
    'Komplett nettside': 'Complete website',
    '16 000 kr': 'NOK 16,000',
    '50 % ved oppstart · 50 % ved levering': '50% up front · 50% on delivery',
    'Hele nettsiden for bedriften din, satt opp og publisert — med domene, Google-bedriftsprofil og skjema som virker.':
      'Your complete business website, set up and published — with domain, Google Business Profile and forms that work.',
    'Forside og inntil fire undersider': 'Homepage and up to four subpages',
    'Skreddersydd design innen avtalt retning, mobiltilpasset': 'Custom design within the agreed direction, mobile friendly',
    'Vi bearbeider teksten — du gir oss råmaterialet': 'We shape the copy — you give us the raw material',
    'Kontaktskjema eller én standard bookingintegrasjon': 'Contact form or one standard booking integration',
    'Teknisk SEO-grunnmur og én Google-bedriftsprofil': 'Technical SEO foundation and one Google Business Profile',
    'Domene, hosting og publisering satt opp': 'Domain, hosting and publishing set up',
    'Se alt som er inkludert': 'See everything included',
    'Kart, åpningstider og klikk-for-å-ringe': 'Map, opening hours and click-to-call',
    'Hastighets- og kvalitetssjekk': 'Speed and quality check',
    'Grunnleggende tilgjengelighet': 'Basic accessibility',
    'Testet skjema med spam-beskyttelse': 'Tested form with spam protection',
    'Search Console og enkel besøksmåling': 'Search Console and simple visitor tracking',
    'To revisjonsrunder': 'Two rounds of revisions',
    'Kort overlevering': 'Short handover',
    '14 dagers feilretting etter lansering': '14 days of bug fixing after launch',
    'Betal oppstart — 8 000 kr': 'Pay deposit — NOK 8,000',
    'Sikker betaling via Stripe': 'Secure payment via Stripe',
    'Resten (8 000) betaler du': 'The remaining NOK 8,000 is due',
    'først når du har sett og godkjent siden.': 'only once you have seen and approved the site.',
    'Eller få et gratis konsept først': 'Or get a free concept first',
    'Landingsside': 'Landing page',
    '7 900 kr': 'NOK 7,900',
    'Betales ved oppstart': 'Paid up front',
    'Én sterk side som selger én ting — perfekt hvis du i dag bare har Instagram, Facebook eller ingenting.':
      'One strong page that sells one thing — ideal if today you only have Instagram, Facebook or nothing at all.',
    'Én mobiltilpasset salgsside': 'One mobile-friendly sales page',
    'Tydelig budskap, bilder og priser': 'Clear message, photos and prices',
    'Kontakt-/bookingskjema eller ring-knapp': 'Contact/booking form or call button',
    'Domene og publisering satt opp': 'Domain and publishing set up',
    'Klar ca. tre virkedager etter mottatt innhold': 'Ready roughly three working days after we receive your content',
    'Kjøp nå — 7 900 kr': 'Buy now — NOK 7,900',
    'Sikker betaling via Stripe · full pris ved oppstart': 'Secure payment via Stripe · full price up front',
    'Trenger du mer — eller hjelp videre?': 'Need more — or ongoing help?',
    'To roligere alternativer: et større skreddersydd prosjekt, eller løpende drift etter at siden er lansert.':
      'Two quieter options: a larger custom project, or ongoing care once the site has launched.',
    'Større, skreddersydd nettopplevelse': 'Larger, fully custom web experience',
    'Eget visuelt system, flere sider, CMS, booking og integrasjoner ved behov. Omfang og fast pris avtales før vi starter.':
      'Its own visual system, more pages, CMS, booking and integrations as needed. Scope and fixed price agreed before we start.',
    'fra 19 900 kr': 'from NOK 19,900',
    'Drift, endringer og oppfølging': 'Care, changes and follow-up',
    'Oppdateringer, teknisk støtte, analyse, SEO-finpuss og nye seksjoner etter lansering. Ingen binding.':
      'Updates, technical support, analytics, SEO refinement and new sections after launch. No lock-in.',
    'fra 1 490 kr': 'from NOK 1,490',
    'per måned': 'per month',
    'Google-bedriftsprofil': 'Google Business Profile',
    'Vi oppretter eller forbedrer én profil:': 'We create or improve one profile:',
    'Kategori, beskrivelse, kontaktinformasjon og åpningstider': 'Category, description, contact details and opening hours',
    'Kobler nettside, booking eller meny': 'Links your website, booking or menu',
    'Legger inn tjenester og bilder du leverer': 'Adds the services and photos you provide',
    'Hjelper med anmeldelseslenke eller QR-kode': 'Helps with a review link or QR code',
    'Du beholder eierskapet og gjennomfører eventuell Google-verifisering. Vi lover ikke en bestemt plassering i søk.':
      'You keep ownership and complete any Google verification yourself. We do not promise a particular position in search results.',
    'Domene og eierskap': 'Domain and ownership',
    'Vi kobler eksisterende domene eller hjelper dere å registrere et nytt. Hosting og publisering settes opp. Årlige domene- og tredjepartskostnader kommer i tillegg.':
      'We connect your existing domain or help you register a new one. Hosting and publishing are set up. Annual domain and third-party costs come in addition.',
    'Du eier det skreddersydde designet, koden og innholdet etter fullført betaling. Tredjepartstjenester, fonter og lisensierte bilder følger sine egne vilkår.':
      'You own the custom design, code and content once payment is complete. Third-party services, fonts and licensed images follow their own terms.',
    'Integrasjoner': 'Integrations',
    'Momentum inkluderer vanlige integrasjoner:': 'Momentum includes the common integrations:',
    'Kontaktskjema': 'Contact form',
    'Kalender eller eksisterende bookingsystem': 'Calendar or existing booking system',
    'Enkel analyse': 'Simple analytics',
    'Sosiale medier': 'Social media',
    'Spesialutviklet CRM, innlogging, nettbutikk, avansert booking, API-integrasjoner og automasjoner prises separat.':
      'Custom-built CRM, logins, online shops, advanced booking, API integrations and automations are quoted separately.',
    'Leveringstid:': 'Delivery time:',
    'Første komplette utkast innen fem virkedager etter at vi har mottatt innhold, nødvendige tilganger og oppstartbetaling. Tilbakemeldinger, domeneflytt og Google-verifisering kan påvirke når siden faktisk lanseres.':
      'First complete draft within five working days of receiving your content, the necessary access and the deposit. Your feedback, domain transfers and Google verification can affect when the site actually launches.',
    'Betaling: 50 % ved start, 50 % før lansering (Signatur 40 / 30 / 30).':
      'Payment: 50% at the start, 50% before launch (Signatur 40 / 30 / 30).',
    'Trenger du noe mer omfattende? Vi lager gjerne et skreddersydd tilbud.':
      'Need something more extensive? We are happy to put together a custom quote.',

    // — regnestykket —
    'Regnestykket': 'The maths',
    'Hva er én kunde til verdt?': 'What is one more customer worth?',
    'Ingen oppblåste løfter — bare enkel matte. Hvis en tydeligere side gjør at litt flere av de som allerede finner deg tar kontakt, betaler en komplett nettside seg ofte på første kunde. Dra i tallene dine.':
      'No inflated promises — just simple arithmetic. If a clearer site means slightly more of the people already finding you get in touch, a complete website often pays for itself on the first customer. Drag your own numbers.',
    'Illustrerende eksempel basert på dine egne tall — ikke en garanti eller en statistikk.':
      'An illustrative example based on your own numbers — not a guarantee or a statistic.',
    'Besøkende per måned': 'Visitors per month',
    'Konvertering i dag': 'Current conversion rate',
    'Verdi av én kunde': 'Value of one customer',
    'Besøkende per måned i prosent': 'Visitors per month',
    'Konvertering i dag i prosent': 'Current conversion rate, percent',
    'Verdi av én kunde i kroner': 'Value of one customer, in kroner',
    'hvis konverteringen bedres med bare ett prosentpoeng': 'if conversion improves by just one percentage point',

    // — om oss —
    'Ingen mellomledd.': 'No middlemen.',
    'Bare håndverk.': 'Just craft.',
    'StayMotion er uavhengig webdesign fra Stavanger. Du jobber direkte med den som designer og bygger — ingen mellomledd, ingen kontoansvarlige. Design og teknologi i samme hånd, så helheten henger sammen fra skisse til publisert side.':
      'StayMotion is independent web design from Stavanger. You work directly with the person who designs and builds — no middlemen, no account managers. Design and engineering in the same hands, so the whole thing holds together from sketch to published site.',
    'Ingen falske logoer, ingen oppdiktede anmeldelser. Konseptarbeid er merket som det.':
      'No fake logos, no invented reviews. Concept work is labelled as concept work.',
    'Denne siden er første bevis — bygget slik vi bygger for kunder.':
      'This site is the first piece of evidence — built the way we build for clients.',
    'Ekte resultater vises kun når dataene finnes.': 'Real results are shown only when the data exists.',
    'Mange lager nettsider uten egentlig å bry seg om resultatet.': 'Plenty of people build websites without really caring about the outcome.',
    'Jeg gjør det motsatte.': 'I do the opposite.',
    'Jeg vil at kunden min skal lykkes og sitte igjen med en side de er stolte av — for førsteinntrykket avgjør ofte om noen tar kontakt eller går videre. Derfor bygger jeg hver side som om det var min egen bedrift. Det er dette jeg brenner for.':
      'I want my client to succeed and to end up with a site they are proud of — because the first impression often decides whether someone gets in touch or moves on. So I build every site as if it were my own business. This is what I care about.',
    '— Michael, StayMotion': '— Michael, StayMotion',
    'Det vi gjør': 'What we do',
    'Webdesign': 'Web design',
    'Mobil først': 'Mobile first',
    'Landingssider': 'Landing pages',
    'Webutvikling': 'Web development',
    'Tekst og innhold': 'Copy and content',
    'SEO-grunnmur': 'SEO foundation',
    'Booking og skjema': 'Booking and forms',
    'Analyse': 'Analytics',
    'Konverteringsoptimalisering': 'Conversion optimisation',
    'Drift og oppfølging': 'Care and follow-up',

    // — spørsmål —
    'Spørsmål': 'Questions',
    'Før du starter.': 'Before you start.',
    'Hva koster en nettside?': 'What does a website cost?',
    'Momentum (komplett nettside) 16 000 kr og Første trekk (landingsside) 7 900 kr er faste priser. Signatur (større, skreddersydd) starter på 19 900 kr, og Videre (drift og oppfølging) på 1 490 kr per måned. Du får alltid fast pris før vi starter.':
      'Momentum (complete website) at NOK 16,000 and Første trekk (landing page) at NOK 7,900 are fixed prices. Signatur (larger, fully custom) starts at NOK 19,900, and Videre (care and follow-up) at NOK 1,490 per month. You always get a fixed price before we start.',
    'Hvor lang tid tar det?': 'How long does it take?',
    'Første komplette utkast av Momentum innen fem virkedager etter at vi har mottatt innhold, nødvendige tilganger og oppstartbetaling. Første trekk ca. tre virkedager. Når siden faktisk lanseres avhenger også av tilbakemeldingene dine, domeneflytt og eventuell Google-verifisering.':
      'The first complete draft of Momentum within five working days of receiving your content, the necessary access and the deposit. Første trekk takes roughly three working days. When the site actually launches also depends on your feedback, domain transfers and any Google verification.',
    'Hva er et gratis førsteside-konsept?': 'What is a free homepage concept?',
    'Et konkret forslag til hvordan forsiden din kan bli — budskap, struktur og retning — laget for din bedrift og sendt deg uforpliktende. Du ser en mulig vei før du bestemmer deg.':
      'A concrete proposal for what your homepage could become — message, structure and direction — made for your business and sent to you with no obligation. You see a possible route before you decide.',
    'Jeg har ingen bilder eller tekst. Går det?': 'I have no photos or copy. Is that a problem?',
    'Ja. Vi skriver teksten ut fra en kort samtale med deg. Bilder tar du med mobilen etter en enkel huskeliste vi sender, eller vi bruker gode illustrasjoner til dine egne er klare.':
      'No. We write the copy from a short conversation with you. You take the photos on your phone using a simple checklist we send, or we use good illustrations until your own are ready.',
    'Kan dere redesigne siden jeg har?': 'Can you redesign the site I already have?',
    'Ja — de fleste prosjekter er redesign. Vi beholder det som funker (innhold, SEO-verdi, integrasjoner) og bygger opplevelsen på nytt.':
      'Yes — most projects are redesigns. We keep what works (content, SEO value, integrations) and rebuild the experience.',
    'Eier jeg nettsiden?': 'Do I own the website?',
    'Ja. Design, kode og innhold er ditt når prosjektet er betalt. Ingen binding. Hosting og domene settes opp i ditt navn, eller vi drifter det gjennom Care.':
      'Yes. The design, code and content are yours once the project is paid. No lock-in. Hosting and domain are set up in your name, or we run them for you through Videre.',
    'Kan dere bygge booking, skjema og integrasjoner?': 'Can you build booking, forms and integrations?',
    'Ja — bookingsystemer, kontaktskjema, betaling, nyhetsbrev og CRM. Fortell oss hva bedriften din trenger for å gå rundt.':
      'Yes — booking systems, contact forms, payments, newsletters and CRM. Tell us what your business needs to run.',
    'Hva skjer etter lansering?': 'What happens after launch?',
    'Lanseringsstøtte er inkludert. Etterpå holder Care siden i utvikling — oppdateringer, analyse, små forbedringer og nye sider — eller du driver den selv.':
      'Launch support is included. After that, Videre keeps the site moving — updates, analytics, small improvements and new pages — or you run it yourself.',

    // — avslutning og bunn —
    'Neste trekk er ditt': 'The next move is yours',
    'Se hvordan': 'See what',
    'forsiden din': 'your homepage',
    'kan bli.': 'could become.',
    'Send nettsiden din og et par ord om bedriften. Du får et konkret førsteside-konsept — gratis og uforpliktende.':
      'Send us your website and a couple of lines about your business. You will get a concrete homepage concept — free, with no obligation.',
    'Eller skriv direkte: michael@staymotion.no': 'Or write directly: michael@staymotion.no',
    'Svar som regel innen én virkedag. Ingen binding, ingen press.': 'Usually answered within one working day. No lock-in, no pressure.',
    'Selvstendig webdesign i Stavanger. Nettsider, redesign og landingssider for bedrifter som vil videre.':
      'Independent web design in Stavanger. Websites, redesigns and landing pages for businesses ready to move.',
    'Meny': 'Menu',
    'Kunder': 'Clients',
    'Start prosjekt': 'Start a project',
    'Kundeportal': 'Client portal',
    'Personvern': 'Privacy',
    'Vilkår': 'Terms',
    'StayMotion · Org.nr 937 492 472 · Stavanger, Norge · © 2026':
      'StayMotion · Company reg. no. 937 492 472 · Stavanger, Norway · © 2026',
    'Design · Utvikling · Konvertering': 'Design · Development · Conversion',

    // — strenger som JavaScript bygger selv —
    'kunder / mnd': 'customers / mo',
    'kr ekstra omsetning per måned': 'in extra revenue per month',

    // — sidetittel og beskrivelse —
    'StayMotion — Nettsider som får kunden til å ta kontakt':
      'StayMotion — Websites that get customers to get in touch'
  };

  var KEY = 'sm-lang';
  var store = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  };

  // Tekstnodene samles én gang, med den norske originalen lagret ved siden av.
  // Script/style hoppes over — der er innholdet kode, ikke tekst.
  var nodes = null;
  function collect() {
    if (nodes) return nodes;
    nodes = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) nodes.push({ node: n, no: n.nodeValue });
    return nodes;
  }

  var ATTRS = ['aria-label', 'alt', 'title', 'placeholder'];
  var attrs = null;
  function collectAttrs() {
    if (attrs) return attrs;
    attrs = [];
    ATTRS.forEach(function (a) {
      [].forEach.call(document.querySelectorAll('[' + a + ']'), function (el) {
        attrs.push({ el: el, attr: a, no: el.getAttribute(a) });
      });
    });
    return attrs;
  }

  // Bytter bare selve ordet, og lar mellomrommene rundt stå — ellers kolliderer
  // tekst som "Du:" med etterfølgende mellomrom i markupen.
  function swap(original, lang) {
    var trimmed = original.trim();
    if (!trimmed) return original;
    var en = EN[trimmed];
    if (lang === 'en' && en) return original.replace(trimmed, en);
    return original;
  }

  function apply(lang) {
    collect().forEach(function (r) { r.node.nodeValue = swap(r.no, lang); });
    collectAttrs().forEach(function (r) {
      if (r.no != null) r.el.setAttribute(r.attr, swap(r.no, lang));
    });
    document.documentElement.lang = lang === 'en' ? 'en' : 'nb';
    var t = document.querySelector('title');
    if (t && !t.dataset.no) t.dataset.no = t.textContent;
    if (t) t.textContent = lang === 'en' ? (EN[t.dataset.no] || t.dataset.no) : t.dataset.no;
    [].forEach.call(document.querySelectorAll('[data-lang-btn]'), function (b) {
      var on = b.getAttribute('data-lang-btn') === lang;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('on', on);
    });
    window.SM_LANG = lang;
    document.dispatchEvent(new CustomEvent('sm:lang', { detail: { lang: lang } }));
  }

  // Norsk er standard, alltid. Nettleserspråk brukes bevisst IKKE: mange
  // nordmenn kjører engelsk nettleser, og ville da fått engelsk på en norsk
  // side. Engelsk er et valg brukeren tar, og valget huskes.
  function initial() {
    var saved = store.get();
    return saved === 'en' ? 'en' : 'no';
  }

  function set(lang) { store.set(lang); apply(lang); }

  window.SMLang = { set: set, get: function () { return window.SM_LANG || 'no'; }, t: function (s) {
    return window.SM_LANG === 'en' && EN[s] ? EN[s] : s;
  } };

  function boot() {
    [].forEach.call(document.querySelectorAll('[data-lang-btn]'), function (b) {
      b.addEventListener('click', function () { set(b.getAttribute('data-lang-btn')); });
    });
    apply(initial());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
