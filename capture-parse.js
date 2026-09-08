/* StayMotion Capture — local, deterministic report parser (DEMO).
 *
 * This is NOT a production AI model. It is a rule-based stand-in so the demo
 * behaves predictably on stage and offline. It is shaped like the contract a
 * future server endpoint will return, so the UI never needs to change:
 *
 *   parseReport(text, ctx) -> {
 *     source: 'local-rules',            // future: 'ai-endpoint'
 *     transcript: string,
 *     issues: [{
 *       id, type, cls, title, equipment, area, measure, action,
 *       severity: 'info' | 'warn' | 'critical',
 *       critical: boolean,              // compliance-critical → needs explicit confirmation
 *       confidence: 'high' | 'medium' | 'low',
 *       evidence: string                // the words that triggered the rule
 *     }]
 *   }
 *
 * Exposed as window.StayMotionParse (classic script, works from file:// too).
 */
(function () {
  'use strict';

  var NUMBER_WORDS = {
    'null': 0, 'en': 1, 'ett': 1, 'én': 1, 'to': 2, 'tre': 3, 'fire': 4, 'fem': 5, 'seks': 6,
    'sju': 7, 'syv': 7, 'åtte': 8, 'ni': 9, 'ti': 10, 'elleve': 11, 'tolv': 12, 'tretten': 13,
    'fjorten': 14, 'femten': 15, 'seksten': 16, 'sytten': 17, 'atten': 18, 'nitten': 19, 'tjue': 20
  };

  function normalize(text) {
    var t = String(text || '').toLowerCase().replace(/[«»"]/g, '').trim();
    Object.keys(NUMBER_WORDS).forEach(function (w) {
      t = t.replace(new RegExp('(^|[^a-zæøå])' + w + '(?=[^a-zæøå]|$)', 'g'), '$1' + NUMBER_WORDS[w]);
    });
    t = t.replace(/minus\s*(\d)/g, '-$1').replace(/pluss\s*(\d)/g, '$1');
    return t;
  }

  // "1 grad", "-8 grader", "8 °", "temperaturen er 12" → number or null
  function extractTemperature(norm) {
    var m = norm.match(/(-?\d+(?:[,.]\d+)?)\s*(?:°|grader?|celsius|c\b)/);
    if (!m) {
      var m2 = norm.match(/(?:temperatur\w*|står på|viser|ligger på)\s*(?:er\s*)?(-?\d+(?:[,.]\d+)?)/);
      if (m2) m = m2;
    }
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  }

  function detectEquipment(norm) {
    var num = (norm.match(/(?:nummer|nr\.?|#)\s*(\d+)/) || [])[1];
    var def = function (name) { return num ? name + ' ' + num : name; };
    if (/fryseboks/.test(norm)) return { name: def('Fryseboks'), kind: 'freezer' };
    if (/frys(er|eren|eskap|erom)|fryser/.test(norm)) return { name: def('Fryser'), kind: 'freezer' };
    if (/kjøledisk/.test(norm)) return { name: def('Kjøledisk'), kind: 'fridge' };
    if (/kjøle(skap|rom)|kjøleskap|kjølen/.test(norm)) return { name: def('Kjøleskap'), kind: 'fridge' };
    if (/oppvask/.test(norm)) return { name: 'Oppvaskmaskin', kind: 'machine' };
    if (/kaffemaskin|kaffetrakter/.test(norm)) return { name: 'Kaffemaskin', kind: 'machine' };
    if (/ismaskin/.test(norm)) return { name: 'Ismaskin', kind: 'machine' };
    if (/avtrekk|vifte/.test(norm)) return { name: 'Avtrekk', kind: 'machine' };
    if (/stekeovn|ovn|komfyr|grill|frityr/.test(norm)) return { name: 'Ovn / komfyr', kind: 'machine' };
    if (/toalett|wc|do\b/.test(norm)) return { name: 'Toalett', kind: 'facility' };
    if (/vask|kran|sluk/.test(norm)) return { name: 'Vask / avløp', kind: 'facility' };
    if (/gulv/.test(norm)) return { name: 'Gulv', kind: 'facility' };
    if (/dør|lås/.test(norm)) return { name: 'Dør / lås', kind: 'facility' };
    return { name: 'Utstyr / område', kind: 'unknown' };
  }

  function detectArea(norm) {
    if (/kjøkken/.test(norm)) return 'Kjøkken';
    if (/\bbar(en)?\b/.test(norm)) return 'Bar';
    if (/lager/.test(norm)) return 'Lager';
    if (/toalett|wc/.test(norm)) return 'Toalett';
    if (/uteservering|terrasse/.test(norm)) return 'Uteservering';
    if (/resepsjon|lobby/.test(norm)) return 'Resepsjon';
    if (/rom\s*\d+/.test(norm)) return 'Rom ' + norm.match(/rom\s*(\d+)/)[1];
    if (/spisesal|restaurant|lokalet/.test(norm)) return 'Spisesal';
    return null;
  }

  function evidence(norm, re) { var m = norm.match(re); return m ? m[0] : ''; }

  var counter = 0;
  function issue(o) {
    counter += 1;
    return {
      id: 'i' + Date.now().toString(36) + counter,
      type: o.type, cls: o.cls, title: o.title,
      equipment: o.equipment, area: o.area || null,
      measure: o.measure || null, action: o.action,
      severity: o.severity || 'warn', critical: !!o.critical,
      confidence: o.confidence || 'high', evidence: o.evidence || ''
    };
  }

  function parseReport(text, ctx) {
    ctx = ctx || {};
    var norm = normalize(text);
    var eq = detectEquipment(norm);
    if (eq.kind === 'unknown' && ctx.hasPhoto) eq = { name: 'Se vedlagt bilde', kind: 'unknown' };
    var area = detectArea(norm);
    var temp = extractTemperature(norm);
    var out = [];

    // 1) Leak / water
    if (/lekk|drypp|renner vann|vann på gulvet|vann fra|oversvøm/.test(norm)) {
      out.push(issue({
        type: 'Vedlikehold', cls: 'maintenance', title: 'Vannlekkasje oppdaget',
        equipment: eq.name, area: area, measure: null, action: 'Varsle vedlikehold',
        severity: 'warn', evidence: evidence(norm, /lekk\w*|drypp\w*|vann[^,.]*/)
      }));
    }

    // 2) Temperature deviation (compliance-critical)
    var tempContext = /grad|°|temperatur|frys|kjøl|kald|varm/.test(norm);
    if (temp !== null && tempContext) {
      var bad = (eq.kind === 'freezer' && temp > -18) || (eq.kind === 'fridge' && temp > 4) || eq.kind === 'unknown';
      out.push(issue({
        type: 'Temperaturavvik', cls: 'temperature',
        title: bad ? 'Temperatur må kontrolleres' : 'Temperatur registrert',
        equipment: eq.name, area: area,
        measure: (temp > 0 ? '' : '') + String(temp).replace('.', ',') + ' °C',
        action: bad ? 'Varsle skiftleder' : 'Logget i temperaturkontroll',
        severity: bad ? 'critical' : 'info', critical: true,
        confidence: eq.kind === 'unknown' ? 'medium' : 'high',
        evidence: evidence(norm, /-?\d+(?:[,.]\d+)?\s*(?:°|grader?|celsius|c\b)|står på\s*-?\d+|viser\s*-?\d+/)
      }));
    }

    // 3) Broken / not working
    if (/virker ikke|fungerer ikke|ødelagt|defekt|stoppet|går ikke|er død|starter ikke|knust/.test(norm)) {
      out.push(issue({
        type: 'Vedlikehold', cls: 'maintenance', title: eq.name + ' fungerer ikke',
        equipment: eq.name, area: area, action: 'Varsle vedlikehold', severity: 'warn',
        evidence: evidence(norm, /virker ikke|fungerer ikke|ødelagt|defekt|stoppet|går ikke|er død|starter ikke|knust/)
      }));
    }

    // 4) Delivery / stock
    if (/mangler|leverans|tomt for|tom for|gått ut av|ikke fått/.test(norm)) {
      var qty = (norm.match(/(\d+)\s*(kasser?|flasker?|kartonger?|poser?|kg|liter)/) || [])[0];
      out.push(issue({
        type: 'Leveranse', cls: 'supply', title: /tomt for|tom for|gått ut/.test(norm) ? 'Varebeholdning tom' : 'Leveranse mangler',
        equipment: qty ? qty : 'Varer', area: area || 'Lager', action: 'Varsle innkjøp', severity: 'warn',
        evidence: evidence(norm, /mangler[^,.]*|leverans\w*[^,.]*|tomt? for[^,.]*/)
      }));
    }

    // 5) Cleanliness / hygiene
    if (/skitten|skittent|søppel|griset|møkk|lukter|lukt\b|mugg|skadedyr|mus\b|fluer/.test(norm)) {
      out.push(issue({
        type: 'Renhold', cls: 'hygiene', title: /mugg|skadedyr|mus\b|fluer/.test(norm) ? 'Hygienerisiko' : 'Renhold trengs',
        equipment: eq.kind === 'unknown' ? (area || 'Område') : eq.name, area: area, action: /mugg|skadedyr|mus\b|fluer/.test(norm) ? 'Varsle skiftleder' : 'Legg i renholdsrunde',
        severity: /mugg|skadedyr|mus\b|fluer/.test(norm) ? 'critical' : 'info',
        evidence: evidence(norm, /skitten\w*|søppel|griset|møkk|lukt\w*|mugg|skadedyr|mus\b|fluer/)
      }));
    }

    // 6) Safety
    if (/skadet|skadd|brann|røyk|glatt|falt|skli/.test(norm)) {
      out.push(issue({
        type: 'HMS', cls: 'safety', title: /brann|røyk/.test(norm) ? 'Brann / røyk rapportert' : 'Sikkerhetsrisiko',
        equipment: eq.kind === 'unknown' ? (area || 'Område') : eq.name, area: area,
        action: 'Varsle skiftleder nå', severity: 'critical', critical: true,
        evidence: evidence(norm, /skadet|skadd|brann|røyk|glatt|falt|skli\w*/)
      }));
    }

    // Fallback: something was said but no rule matched
    if (!out.length && norm) {
      out.push(issue({
        type: 'Driftsavvik', cls: 'generic', title: 'Rapport til oppfølging',
        equipment: eq.name, area: area, measure: temp !== null ? String(temp).replace('.', ',') + ' °C' : null,
        action: 'Send til skiftleder', severity: 'info', confidence: 'low', evidence: ''
      }));
    }

    // Photo without words: demo-assisted observation, clearly labelled
    if (!norm && ctx.hasPhoto) {
      out.push(issue({
        type: 'Observasjon', cls: 'generic', title: 'Bilde lagt ved til kontroll',
        equipment: 'Se bilde', area: null, action: 'Send til skiftleder', severity: 'info',
        confidence: 'low', evidence: 'demo'
      }));
    }

    return { source: 'local-rules', transcript: String(text || '').trim(), issues: out };
  }

  window.StayMotionParse = { parseReport: parseReport, normalize: normalize, extractTemperature: extractTemperature, detectEquipment: detectEquipment };
})();
