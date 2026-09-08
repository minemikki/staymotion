import type { AnalyzeAdapter, AnalyzeInput, ProposedIssue } from './contract';
import type { IncidentCategory, IncidentSeverity } from '../domain/types';
import { ownerRoleFor } from '../domain/followup';

/**
 * Deterministic Norwegian rules adapter — the demo/local stand-in for a real
 * extraction model. Ported from the proven capture-parse.js so the iPhone
 * behaviour is preserved:
 *   "Det lekker vann fra fryseboksen og den står på 1 grad."
 *   → Vedlikehold (lekkasje) + Temperaturavvik (1 °C)
 * It is NOT an AI model and the result is labelled source: 'local-rules'.
 */

const NUMBER_WORDS: Record<string, number> = {
  null: 0, en: 1, ett: 1, 'én': 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, sju: 7, syv: 7, 'åtte': 8, ni: 9, ti: 10,
  elleve: 11, tolv: 12, tretten: 13, fjorten: 14, femten: 15, seksten: 16, sytten: 17, atten: 18, nitten: 19, tjue: 20,
};

export function normalize(text: string): string {
  let t = String(text || '').toLowerCase().replace(/[«»"]/g, '').trim();
  for (const w of Object.keys(NUMBER_WORDS)) {
    t = t.replace(new RegExp('(^|[^a-zæøå])' + w + '(?=[^a-zæøå]|$)', 'g'), '$1' + NUMBER_WORDS[w]);
  }
  return t.replace(/minus\s*(\d)/g, '-$1').replace(/pluss\s*(\d)/g, '$1');
}

export function extractTemperature(norm: string): number | null {
  let m = norm.match(/(-?\d+(?:[,.]\d+)?)\s*(?:°|grader?|celsius|c\b)/);
  if (!m) m = norm.match(/(?:temperatur\w*|står på|viser|ligger på)\s*(?:er\s*)?(-?\d+(?:[,.]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

type Equip = { name: string; kind: 'freezer' | 'fridge' | 'machine' | 'facility' | 'unknown' };
export function detectEquipment(norm: string): Equip {
  const num = (norm.match(/(?:nummer|nr\.?|#)\s*(\d+)/) || [])[1];
  const def = (n: string) => (num ? `${n} ${num}` : n);
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

export function detectDepartment(norm: string): string | undefined {
  if (/kjøkken/.test(norm)) return 'Kjøkken';
  if (/\bbar(en)?\b/.test(norm)) return 'Bar';
  if (/lager/.test(norm)) return 'Lager';
  if (/toalett|wc/.test(norm)) return 'Toalett';
  if (/uteservering|terrasse/.test(norm)) return 'Uteservering';
  if (/resepsjon|lobby/.test(norm)) return 'Resepsjon';
  if (/spisesal|restaurant|lokalet|salen/.test(norm)) return 'Sal';
  return undefined;
}

const ev = (norm: string, re: RegExp) => (norm.match(re) || [''])[0];

let seq = 0;
function issue(p: Omit<ProposedIssue, 'clientKey' | 'suggestedOwnerRole'> & { suggestedOwnerRole?: ProposedIssue['suggestedOwnerRole'] }): ProposedIssue {
  seq += 1;
  return { clientKey: `p${Date.now().toString(36)}${seq}`, suggestedOwnerRole: p.suggestedOwnerRole || ownerRoleFor(p.category, p.severity), ...p } as ProposedIssue;
}

export function analyzeWithRules(input: AnalyzeInput): { transcript: string; issues: ProposedIssue[]; warnings?: string[] } {
  const norm = normalize(input.text);
  let eq = detectEquipment(norm);
  if (eq.kind === 'unknown' && input.hasPhoto) eq = { name: 'Se vedlagt bilde', kind: 'unknown' };
  const dept = detectDepartment(norm) || input.context?.department;
  const temp = extractTemperature(norm);
  const out: ProposedIssue[] = [];
  const warnings: string[] = [];

  if (/lekk|drypp|renner vann|vann på gulvet|vann fra|oversvøm/.test(norm)) {
    out.push(issue({ category: 'maintenance', title: 'Vannlekkasje oppdaget', equipment: eq.name, department: dept, severity: 'medium', requiresConfirmation: false, suggestedAction: 'Varsle vedlikehold', confidence: 'high', evidence: ev(norm, /lekk\w*|drypp\w*|vann[^,.]*/) }));
  }

  if (temp !== null && /grad|°|temperatur|frys|kjøl|kald|varm/.test(norm)) {
    const bad = (eq.kind === 'freezer' && temp > -18) || (eq.kind === 'fridge' && temp > 4) || eq.kind === 'unknown';
    const sev: IncidentSeverity = bad ? 'critical' : 'low';
    out.push(issue({ category: 'temperature', title: bad ? 'Temperatur må kontrolleres' : 'Temperatur registrert', equipment: eq.name, department: dept, measurement: { value: temp, unit: '°C', raw: `${String(temp).replace('.', ',')} °C` }, severity: sev, requiresConfirmation: true, suggestedAction: bad ? 'Varsle skiftleder' : 'Logget i temperaturkontroll', confidence: eq.kind === 'unknown' ? 'medium' : 'high', evidence: ev(norm, /-?\d+(?:[,.]\d+)?\s*(?:°|grader?|celsius|c\b)|står på\s*-?\d+|viser\s*-?\d+/) }));
    if (eq.kind === 'unknown') warnings.push('Utstyr ble ikke gjenkjent — sjekk hvilken enhet målingen gjelder.');
  }

  if (/virker ikke|fungerer ikke|ødelagt|defekt|stoppet|går ikke|er død|starter ikke|knust/.test(norm)) {
    out.push(issue({ category: 'maintenance', title: `${eq.name} fungerer ikke`, equipment: eq.name, department: dept, severity: 'medium', requiresConfirmation: false, suggestedAction: 'Varsle vedlikehold', confidence: 'high', evidence: ev(norm, /virker ikke|fungerer ikke|ødelagt|defekt|stoppet|går ikke|er død|starter ikke|knust/) }));
  }

  if (/mangler|leverans|tomt for|tom for|gått ut av|ikke fått/.test(norm)) {
    const qty = (norm.match(/(\d+)\s*(kasser?|flasker?|kartonger?|poser?|kg|liter)/) || [])[0];
    out.push(issue({ category: 'supply', title: /tomt for|tom for|gått ut/.test(norm) ? 'Varebeholdning tom' : 'Leveranse mangler', equipment: qty || 'Varer', department: dept || 'Lager', severity: 'medium', requiresConfirmation: false, suggestedAction: 'Varsle innkjøp', confidence: 'high', evidence: ev(norm, /mangler[^,.]*|leverans\w*[^,.]*|tomt? for[^,.]*/) }));
  }

  if (/skitten|skittent|søppel|griset|møkk|lukter|lukt\b|mugg|skadedyr|mus\b|fluer/.test(norm)) {
    const serious = /mugg|skadedyr|mus\b|fluer/.test(norm);
    out.push(issue({ category: 'hygiene', title: serious ? 'Hygienerisiko' : 'Renhold trengs', equipment: eq.kind === 'unknown' ? (dept || 'Område') : eq.name, department: dept, severity: serious ? 'critical' : 'low', requiresConfirmation: serious, suggestedAction: serious ? 'Varsle skiftleder' : 'Legg i renholdsrunde', confidence: 'high', evidence: ev(norm, /skitten\w*|søppel|griset|møkk|lukt\w*|mugg|skadedyr|mus\b|fluer/) }));
  }

  if (/skadet|skadd|brann|røyk|glatt|falt|skli/.test(norm)) {
    out.push(issue({ category: 'safety', title: /brann|røyk/.test(norm) ? 'Brann / røyk rapportert' : 'Sikkerhetsrisiko', equipment: eq.kind === 'unknown' ? (dept || 'Område') : eq.name, department: dept, severity: 'critical', requiresConfirmation: true, suggestedAction: 'Varsle skiftleder nå', confidence: 'high', evidence: ev(norm, /skadet|skadd|brann|røyk|glatt|falt|skli\w*/) }));
  }

  if (!out.length && norm) {
    out.push(issue({ category: 'other', title: 'Rapport til oppfølging', equipment: eq.name, department: dept, measurement: temp !== null ? { value: temp, unit: '°C', raw: `${temp} °C` } : undefined, severity: 'low', requiresConfirmation: false, suggestedAction: 'Send til skiftleder', confidence: 'low' }));
    warnings.push('Ingen kjent mønster i rapporten — send til skiftleder for vurdering.');
  }
  if (!norm && input.hasPhoto) {
    out.push(issue({ category: 'observation', title: 'Bilde lagt ved til kontroll', equipment: 'Se bilde', department: dept, severity: 'low', requiresConfirmation: false, suggestedAction: 'Send til skiftleder', confidence: 'low', evidence: 'demo' }));
    warnings.push('Bildeanalyse er ikke koblet på. Saken sendes med bildet som vedlegg.');
  }
  return { transcript: String(input.text || '').trim(), issues: out, warnings: warnings.length ? warnings : undefined };
}

export const rulesAdapter: AnalyzeAdapter = {
  name: 'local-rules',
  model: 'staymotion-rules-nb-v1',
  async analyze(input) { return { source: 'local-rules', ...analyzeWithRules(input) }; },
};

export const CATEGORY_LABEL: Record<IncidentCategory, string> = { maintenance: 'Vedlikehold', temperature: 'Temperaturavvik', supply: 'Leveranse', hygiene: 'Renhold', safety: 'HMS', observation: 'Observasjon', other: 'Driftsavvik' };
