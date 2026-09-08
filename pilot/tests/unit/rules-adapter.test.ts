import { describe, expect, it } from 'vitest';
import { analyzeWithRules, extractTemperature, normalize } from '../../src/ai/rules-adapter';

describe('rules adapter (demo/local analyzer)', () => {
  it('splits the proven iPhone sentence into leak + temperature', () => {
    const r = analyzeWithRules({ text: 'Det lekker vann fra fryseboksen på kjøkkenet og den står på 1 grad.' });
    expect(r.issues).toHaveLength(2);
    expect(r.issues[0]).toMatchObject({ category: 'maintenance', title: 'Vannlekkasje oppdaget', equipment: 'Fryseboks', suggestedAction: 'Varsle vedlikehold', requiresConfirmation: false });
    expect(r.issues[1]).toMatchObject({ category: 'temperature', title: 'Temperatur må kontrolleres', equipment: 'Fryseboks', suggestedAction: 'Varsle skiftleder', requiresConfirmation: true, severity: 'critical' });
    expect(r.issues[1].measurement).toMatchObject({ value: 1, unit: '°C', raw: '1 °C' });
    expect(r.issues[1].department).toBe('Kjøkken');
  });
  it('handles number words and minus', () => {
    expect(extractTemperature(normalize('Fryser nummer to viser minus åtte igjen'))).toBe(-8);
    const r = analyzeWithRules({ text: 'Fryser nummer to viser minus åtte igjen' });
    expect(r.issues[0].equipment).toBe('Fryser 2');
    expect(r.issues[0].measurement?.raw).toBe('-8 °C');
  });
  it('freezer within range is logged, not escalated', () => {
    const r = analyzeWithRules({ text: 'Fryseren står på minus 20 grader' });
    expect(r.issues[0]).toMatchObject({ severity: 'low', suggestedAction: 'Logget i temperaturkontroll', requiresConfirmation: true });
  });
  it('photo + words uses the photo as equipment fallback', () => {
    const r = analyzeWithRules({ text: 'Den lekker her, og displayet viser 1 grad.', hasPhoto: true });
    expect(r.issues.map((i) => i.category)).toEqual(['maintenance', 'temperature']);
    expect(r.issues[0].equipment).toBe('Se vedlagt bilde');
    expect(r.issues[1].confidence).toBe('medium');
    expect(r.warnings?.length).toBeGreaterThan(0);
  });
  it('photo only produces one honest observation', () => {
    const r = analyzeWithRules({ text: '', hasPhoto: true });
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0]).toMatchObject({ category: 'observation', confidence: 'low' });
  });
  it('covers supply, hygiene, safety, broken', () => {
    expect(analyzeWithRules({ text: 'Vi mangler to kasser cola fra leveransen' }).issues[0]).toMatchObject({ category: 'supply', equipment: '2 kasser' });
    expect(analyzeWithRules({ text: 'Det lukter mugg på lageret' }).issues[0]).toMatchObject({ category: 'hygiene', severity: 'critical', requiresConfirmation: true });
    expect(analyzeWithRules({ text: 'Gulvet er glatt, noen kan falle' }).issues[0]).toMatchObject({ category: 'safety', severity: 'critical' });
    expect(analyzeWithRules({ text: 'Oppvaskmaskinen virker ikke' }).issues[0]).toMatchObject({ category: 'maintenance', title: 'Oppvaskmaskin fungerer ikke' });
  });
  it('falls back to a low-confidence generic issue', () => {
    const r = analyzeWithRules({ text: 'Alt er fint egentlig' });
    expect(r.issues[0]).toMatchObject({ category: 'other', confidence: 'low' });
  });
});
