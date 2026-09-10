// Norwegian outreach message generator for the sales engine.
//
// WRITING PRINCIPLES (why these read the way they do)
//
// These are built on what actually moves a busy owner to reply, not on
// salesy energy. Every lever here is one you can defend out loud:
//
//   1. Their world first. The reader's business opens the mail; StayMotion
//      shows up late and briefly. Nobody replies to an intro about you.
//   2. Specific beats clever. One real observation proves a human looked.
//      Vague flattery reads as mail-merge and gets deleted.
//   3. Tension, never insult. Name the gap between how good they are and
//      what their site shows. Gaps make people act; criticism makes them
//      defensive.
//   4. Give before asking. A concept that already exists beats one that is
//      offered. Reciprocity only works when the gift is real.
//   5. Ask a question they answer in their own head. Self-persuasion holds
//      far better than a claim from a stranger.
//   6. Make the yes tiny. "Vil du se den?" costs nothing. A 30-minute
//      meeting costs a lot. Earn the meeting on the second step.
//   7. Hand them the exit. "Si ifra, så hører du ikke fra meg igjen"
//      lowers resistance and raises replies. It also happens to be decent.
//   8. Short. Every extra line costs answers.
//
// HARD LIMITS — these are the difference between persuasion and manipulation:
//   - No invented numbers, results, customers or testimonials.
//   - No false urgency and no fake scarcity. The only scarcity used is true:
//     Michael is one person and can take a few projects at a time.
//   - No claim about ranking, traffic or revenue.
//   - Risk-reversal lines only describe terms that genuinely apply
//     (fixed price agreed up front, balance due after approval, two
//     revision rounds included).
//
// Every generator takes a context object and returns { subject, body }.
//   ctx = {
//     company, contact (first name or ''), observation (Michael's real note),
//     angle (the concrete consequence for THIS business, researched per lead),
//     conceptUrl (link to a concept already built for them — strongest opener),
//     senderName, studioName, contactEmail, contactPhone,
//     offer ('sprint'|'landing'|…), bookingUrl, priceLine, depositLine, deliver
//   }

function firstName(ctx) { return (ctx.contact || '').trim().split(/\s+/)[0] || ''; }
function greet(ctx) { const f = firstName(ctx); return f ? 'Hei ' + f + '!' : 'Hei!'; }
function co(ctx) { return (ctx.company || '').trim(); }
function sig(ctx) {
  const who = (ctx.senderName || 'Michael') + ', ' + (ctx.studioName || 'StayMotion');
  const line = ctx.contactEmail ? '\n' + ctx.contactEmail : '';
  return 'Mvh ' + who + line;
}
// The one real observation. Falls back to something honest and non-fabricated
// when Michael hasn't written a note for this lead yet.
function obs(ctx) {
  const o = (ctx.observation || '').trim();
  if (o) return o.replace(/[.\s]+$/, '');
  return 'Jeg kom over ' + (co(ctx) || 'dere') + ' på nett i går';
}
// The business-specific consequence. Optional; dropped when empty.
function angle(ctx) { return (ctx.angle || '').trim(); }
function link(ctx) { return (ctx.conceptUrl || '').trim(); }

const TYPES = {
  email1: {
    label: 'Første e-post',
    build(ctx) {
      const c = co(ctx) || 'dere';
      const url = link(ctx);
      const a = angle(ctx);
      const L = [greet(ctx), '', obs(ctx) + '.'];
      if (a) L.push('', a);

      if (url) {
        // Strongest version: the gift already exists. Nothing is being asked
        // for except a look.
        L.push('',
          'Jeg tok meg friheten til å lage et utkast på hvordan forsiden deres kunne sett ut:',
          url,
          '',
          'Det koster ingenting og forplikter dere ikke til noe — jeg lagde det fordi jeg hadde lyst.',
          '',
          'Treffer det, tar jeg gjerne en kort prat. Gjør det ikke det, si bare ifra.');
      } else {
        L.push('',
          'Jeg lager nettsider for lokale bedrifter her i Rogaland. Jeg kan sette opp et kort forslag '
            + 'til hvordan forsiden deres kunne sett ut — gratis, og uten at dere binder dere til noe.',
          '',
          'Vil du se det?');
      }
      L.push('', sig(ctx));
      if (!url) L.push('', 'P.S. Er dette ikke aktuelt, si ifra — så hører du ikke fra meg igjen.');
      return {
        subject: url ? ('Lagde et utkast til ' + c) : ('Rask idé til ' + c),
        body: L.join('\n'),
      };
    },
  },

  form1: {
    label: 'Første kontaktskjema-melding',
    build(ctx) {
      // Contact forms are often length-limited and read by whoever is on shift,
      // so this is the tightest version of the same move.
      const a = angle(ctx);
      const L = [greet(ctx), '', obs(ctx) + '.'];
      if (a) L.push('', a);
      L.push('',
        'Jeg lager nettsider for lokale bedrifter her i Rogaland (' + (ctx.studioName || 'StayMotion') + '). '
          + 'Kan jeg lage et kort forslag til forsiden deres? Gratis, ingen binding.');
      if (ctx.contactEmail) L.push('', 'Svar gjerne til ' + ctx.contactEmail + '.');
      L.push('', sig(ctx));
      return { subject: 'Rask idé til ' + (co(ctx) || 'nettsiden deres'), body: L.join('\n') };
    },
  },

  followup3: {
    label: 'Oppfølging etter 3 dager',
    build(ctx) {
      const c = co(ctx) || 'dere';
      // Deliberately does NOT repeat the pitch. One question they answer
      // themselves, plus a way out.
      return {
        subject: 'Re: Rask idé til ' + c,
        body: [
          greet(ctx),
          '',
          'Kort oppfølging — jeg vet innbokser fylles fort.',
          '',
          'Ett spørsmål: hvis noen googler ' + c + ' på mobilen i kveld, finner de det de leter etter '
            + 'på ti sekunder?',
          '',
          'Er svaret ja, skal jeg ikke plage deg mer. Er du i tvil, lager jeg utkastet — det tar meg '
            + 'en kveld og koster deg ingenting.',
          '',
          sig(ctx),
        ].join('\n'),
      };
    },
  },

  followup7: {
    label: 'Oppfølging etter 7 dager',
    build(ctx) {
      const c = co(ctx) || 'dere';
      // The close-the-loop mail. Highest reply rate in a cold sequence, and the
      // only honest way to stop: actually stop.
      return {
        subject: 'Lukker denne',
        body: [
          greet(ctx),
          '',
          'Jeg regner med at timingen ikke er riktig nå, og det er helt greit — da lukker jeg saken '
            + 'her og lar deg være i fred.',
          '',
          'Skulle det bli aktuelt senere, er det bare å svare på denne. Jeg er én mann og tar noen få '
            + 'prosjekter om gangen, så det er greit å si ifra i god tid.',
          '',
          'Lykke til videre med ' + c + '!',
          '',
          sig(ctx),
        ].join('\n'),
      };
    },
  },

  interested: {
    label: 'Svar når kunden viser interesse',
    build(ctx) {
      // They leaned in. Now remove risk and shrink the next step. The line
      // about not being the right match is deliberate: disqualifying yourself
      // is the fastest way to be believed.
      const L = [
        greet(ctx),
        '',
        'Så bra! Kort om hvordan jeg jobber, så du vet nøyaktig hva du går til:',
        '',
        'Du får fast pris før vi starter — ingen timepris som løper. Halvparten ved oppstart, '
          + 'resten først når du har sett siden og godkjent den. To revisjonsrunder er inkludert.',
        '',
        'Første komplette utkast innen fem virkedager etter at jeg har fått innhold, tilganger og '
          + 'oppstartbetaling.',
        '',
        'Har du 15 minutter på telefon denne uken? Da hører jeg hva dere trenger — og sier ærlig '
          + 'ifra hvis jeg ikke er rett match.',
      ];
      if (ctx.bookingUrl) L.push('', 'Velg et tidspunkt her: ' + ctx.bookingUrl);
      L.push('', sig(ctx));
      return { subject: 'Så bra — her er hvordan jeg jobber', body: L.join('\n') };
    },
  },

  callinvite: {
    label: 'Invitasjon til 15-min samtale',
    build(ctx) {
      return {
        subject: '15 minutter?',
        body: [
          greet(ctx),
          '',
          'Skal vi ta 15 minutter på telefon?',
          '',
          'Jeg spør hva dere trenger, du får høre hva det koster, og så vet vi begge om det er noe '
            + 'å gå videre på. Ingen presentasjon, ingen binding.',
          '',
          (ctx.bookingUrl ? 'Velg et tidspunkt her: ' + ctx.bookingUrl
            : (ctx.contactPhone ? 'Ring meg gjerne på ' + ctx.contactPhone + ', eller foreslå et tidspunkt.'
              : 'Foreslå gjerne et tidspunkt som passer.')),
          '',
          sig(ctx),
        ].join('\n'),
      };
    },
  },

  proposal: {
    label: 'Tilbudsmelding',
    build(ctx) {
      // Name + plain-language description; the name never stands alone.
      const OFFERS = {
        landing: 'Første trekk (landingsside)',
        sprint: 'Momentum (komplett nettside)',
        signature: 'Signatur (skreddersydd nettopplevelse)',
        care: 'Videre (drift og oppfølging)',
      };
      const offer = OFFERS[ctx.offer] || OFFERS.sprint;
      // Built by pushing so the blank spacer lines survive — filtering the whole
      // array with Boolean would strip them and jam the paragraphs together.
      const L = [greet(ctx), '', 'Takk for praten. Her er tilbudet:', ''];
      L.push(offer + (ctx.priceLine ? ' — ' + ctx.priceLine : ''));
      if (ctx.depositLine) L.push(ctx.depositLine);
      if (ctx.deliver) L.push('Levering: ' + ctx.deliver);
      L.push('',
        'Resten betaler du først når du har sett siden og godkjent den. To revisjonsrunder er '
          + 'inkludert, så du får justert det du vil ha justert.',
        '',
        'Si "kjør", så sender jeg betalingslenken og setter i gang så snart innholdet er på plass.',
        '',
        sig(ctx));
      return { subject: 'Tilbud — ' + (co(ctx) || (ctx.studioName || 'StayMotion')), body: L.join('\n') };
    },
  },

  paymentreminder: {
    label: 'Påminnelse om oppstartsbetaling',
    build(ctx) {
      const c = co(ctx) || 'prosjektet';
      return {
        subject: 'Holder av tid til ' + c,
        body: [
          greet(ctx),
          '',
          'Jeg holder av tid til ' + c + ' og starter så snart oppstartbetalingen er registrert.',
          '',
          (ctx.bookingUrl ? 'Betalingslenke: ' + ctx.bookingUrl
            : 'Si ifra, så sender jeg betalingslenken på nytt.'),
          '',
          'Har det endret seg, si bare ifra — da frigjør jeg tiden til noen andre. Helt uproblematisk.',
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
  return { type, label: t.label, subject: msg.subject.trim(), body: msg.body.trim() };
}

export function generateAll(ctx = {}) {
  return Object.keys(TYPES).map((k) => generateMessage(k, ctx));
}
