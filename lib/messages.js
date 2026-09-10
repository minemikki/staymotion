// Norwegian outreach message generator for the sales engine.
// Short, human, one concrete observation, one clear action, sender identified.
// Never fabricates results, never uses false scarcity, never over-promises.
//
// Every generator takes a context object and returns { subject, body }.
//   ctx = {
//     company, contact (first name or ''), observation (Michael's real note),
//     senderName, studioName, contactEmail, contactPhone,
//     auditSummary (optional string), offer ('sprint'|'landing'|''),
//     bookingUrl (optional), priceLine (optional), depositLine (optional),
//   }

function firstName(ctx) { return (ctx.contact || '').trim().split(/\s+/)[0] || ''; }
function greet(ctx) { const f = firstName(ctx); return f ? 'Hei ' + f + '!' : 'Hei!'; }
function sig(ctx) {
  const who = (ctx.senderName || 'Michael') + ', ' + (ctx.studioName || 'StayMotion');
  const line = ctx.contactEmail ? '\n' + ctx.contactEmail : '';
  return 'Mvh ' + who + line;
}
// A single, honest observation sentence. Falls back to a neutral, non-fabricated
// opener if Michael hasn't written one yet.
function obs(ctx) {
  const o = (ctx.observation || '').trim();
  if (o) return o;
  return 'Jeg kikket innom nettsiden deres og har en konkret idé til hvordan den kan jobbe litt hardere for dere';
}
// A business-specific angle: the concrete consequence / opportunity for THIS
// company. Researched per lead (e.g. "folk som googler restaurant i Stavanger
// havner ofte hos naboen fordi dere ikke har en side som viser meny og bord").
// Optional — dropped if not provided. Never fabricates numbers or results.
function angle(ctx) { return (ctx.angle || '').trim(); }

const TYPES = {
  email1: {
    label: 'Første e-post',
    build(ctx) {
      const c = ctx.company || 'dere';
      const a = angle(ctx);
      const lines = [greet(ctx), '', obs(ctx) + '.'];
      if (a) { lines.push('', a); }
      lines.push(
        '',
        'Jeg driver ' + (ctx.studioName || 'StayMotion') + ' og lager moderne, mobiltilpassede nettsider for lokale bedrifter her i Rogaland. '
          + 'Jeg lager gjerne et kort, gratis forslag til hvordan forsiden deres kan bli — helt uforpliktende, ingen binding.',
        '',
        'Vil du at jeg lager et utkast?',
        '',
        sig(ctx));
      return { subject: 'Idé til ' + c + ' sin nettside', body: lines.join('\n') };
    },
  },
  form1: {
    label: 'Første kontaktskjema-melding',
    build(ctx) {
      const a = angle(ctx);
      const lines = [greet(ctx), '', obs(ctx) + '.'];
      if (a) { lines.push('', a); }
      lines.push(
        '',
        'Jeg lager nettsider for lokale bedrifter her i Rogaland (' + (ctx.studioName || 'StayMotion') + '). Kan jeg lage et kort, gratis forslag til forsiden deres? Helt uforpliktende.');
      if (ctx.contactEmail) lines.push('', 'Svar gjerne til ' + ctx.contactEmail + '.');
      lines.push('', sig(ctx));
      return { subject: 'Idé til ' + (ctx.company || 'nettsiden deres'), body: lines.join('\n') };
    },
  },
  followup3: {
    label: 'Oppfølging etter 3 dager',
    build(ctx) {
      const c = ctx.company || 'dere';
      return {
        subject: 'Re: Idé til ' + c + ' sin nettside',
        body: [
          greet(ctx),
          '',
          'Jeg sendte en idé for et par dager siden og vet at innbokser fylles fort. '
            + 'Tilbudet om et kort, gratis forslag til forsiden deres står ved lag.',
          '',
          'Skal jeg lage utkastet?',
          '',
          sig(ctx),
        ].join('\n'),
      };
    },
  },
  followup7: {
    label: 'Oppfølging etter 7 dager',
    build(ctx) {
      const c = ctx.company || 'dere';
      return {
        subject: 'Re: Idé til ' + c + ' sin nettside',
        body: [
          greet(ctx),
          '',
          'Siste vennlige dytt fra meg — jeg vil ikke mase. Hvis en oppdatert nettside kan være aktuelt '
            + 'for dere i høst, tar jeg gjerne en kort prat. Hvis ikke, ønsker jeg dere lykke til videre.',
          '',
          sig(ctx),
        ].join('\n'),
      };
    },
  },
  interested: {
    label: 'Svar når kunden viser interesse',
    build(ctx) {
      return {
        subject: 'Så hyggelig — her er hvordan vi kan gjøre det',
        body: [
          greet(ctx),
          '',
          'Så gøy at dette er interessant! Kort om hvordan jeg jobber: jeg lager en moderne, '
            + 'mobiltilpasset nettside med tydelig struktur, tekst og kontaktmuligheter, og leverer '
            + 'som regel innen rundt fem virkedager etter at jeg har fått innholdet.',
          '',
          'Har du 15 minutter til en kort prat, så jeg forstår hva dere trenger? '
            + (ctx.bookingUrl ? 'Du kan velge et tidspunkt her: ' + ctx.bookingUrl : 'Foreslå gjerne et tidspunkt som passer.'),
          '',
          sig(ctx),
        ].join('\n'),
      };
    },
  },
  callinvite: {
    label: 'Invitasjon til 15-min samtale',
    build(ctx) {
      return {
        subject: '15 minutter på telefon?',
        body: [
          greet(ctx),
          '',
          'Skal vi ta en kjapp prat på 15 minutter? Da hører jeg hva dere trenger og kan si '
            + 'ærlig om jeg er rett match — helt uforpliktende.',
          '',
          (ctx.bookingUrl ? 'Velg et tidspunkt her: ' + ctx.bookingUrl
            : (ctx.contactPhone ? 'Ring meg gjerne på ' + ctx.contactPhone + ', eller foreslå et tidspunkt.' : 'Foreslå gjerne et tidspunkt som passer.')),
          '',
          sig(ctx),
        ].join('\n'),
      };
    },
  },
  proposal: {
    label: 'Tilbudsmelding',
    build(ctx) {
      const offer = ctx.offer === 'landing' ? 'Landingsside' : 'Komplett nettside';
      return {
        subject: 'Tilbud fra ' + (ctx.studioName || 'StayMotion') + ' — ' + (ctx.company || ''),
        body: [
          greet(ctx),
          '',
          'Takk for praten. Her er tilbudet mitt:',
          '',
          (ctx.studioName || 'StayMotion') + ' ' + offer + (ctx.priceLine ? ' — ' + ctx.priceLine : ''),
          (ctx.depositLine ? ctx.depositLine : ''),
          '',
          'Jeg starter så snart oppstartsbetalingen er mottatt og innholdet er på plass. '
            + 'Si ifra hvis du vil at jeg sender en betalingslenke, så er vi i gang.',
          '',
          sig(ctx),
        ].filter(Boolean).join('\n'),
      };
    },
  },
  paymentreminder: {
    label: 'Påminnelse om oppstartsbetaling',
    build(ctx) {
      return {
        subject: 'Klar til å starte når du er',
        body: [
          greet(ctx),
          '',
          'Bare en vennlig påminnelse: jeg holder av tid til prosjektet deres og starter så snart '
            + 'oppstartsbetalingen er registrert.',
          (ctx.bookingUrl ? 'Betalingslenke: ' + ctx.bookingUrl : 'Si ifra, så sender jeg betalingslenken på nytt.'),
          '',
          sig(ctx),
        ].join('\n'),
      };
    },
  },
};

export const MESSAGE_TYPES = Object.keys(TYPES).map((k) => ({ id: k, label: TYPES[k].label }));

export function generateMessage(type, ctx = {}) {
  const t = TYPES[type];
  if (!t) return null;
  const msg = t.build(ctx);
  // Guardrails against over-promising / false scarcity slipping in via observation.
  return { type, label: t.label, subject: msg.subject.trim(), body: msg.body.trim() };
}

export function generateAll(ctx = {}) {
  return Object.keys(TYPES).map((k) => generateMessage(k, ctx));
}
