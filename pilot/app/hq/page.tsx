'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shell } from '@/src/ui/Shell';
import { getProvider } from '@/src/data';
import type { DataProvider } from '@/src/data/provider';
import type { LocationHealth } from '@/src/domain/types';
import { actorOf, type Session } from '@/src/session/session';

export default function HQPage() {
  return <Shell view="hq">{(s) => <HQ session={s} />}</Shell>;
}

function HQ({ session }: { session: Session }) {
  const [health, setHealth] = useState<LocationHealth[] | null>(null);
  const [q, setQ] = useState(''); const [answer, setAnswer] = useState('');
  const actor = useMemo(() => actorOf(session), [session]); // stable per session, so load/effects don't loop
  const load = useCallback(async (p: DataProvider) => { await p.runFollowUp(actor); setHealth(await p.locationHealth(actor, session.organizationId)); }, [actor, session]);
  useEffect(() => { getProvider().then(load); }, [load]);

  if (!health) return <div className="small">Laster …</div>;
  const hs: LocationHealth[] = health;
  const sorted = [...health].sort((a, b) => a.score - b.score);
  const outlier = sorted.length > 1 && sorted[0].score < sorted[1].score - 8 ? sorted[0] : null;
  const attention = health.filter((h) => h.score < 80).length;
  // Headline names the exception (or calm) instead of a scorecard verdict — HQ asks "where is the risk?"
  const headline = health.length === 0 ? 'Ingen lokasjoner ennå.' : outlier ? `${outlier.name} skiller seg ut.` : attention ? `${attention} av ${health.length} lokasjoner trenger oppmerksomhet.` : 'Alt er i rute på tvers av lokasjonene.';
  const avgOpen = health.length ? health.reduce((a, h) => a + h.openIncidents, 0) / health.length : 0;
  const topRec = health.flatMap((h) => h.recurring.map((r) => ({ ...r, loc: h.name }))).sort((a, b) => b.count - a.count)[0];

  function ask(text: string) {
    const t = text.toLowerCase();
    if (!t.trim()) { setAnswer('Prøv for eksempel: «Hvilken lokasjon har høyest risiko?»'); return; }
    if (/risiko|verst|oppmerksom/.test(t)) setAnswer(outlier ? `${outlier.name} skiller seg ut med driftshelse ${outlier.score}: ${outlier.openIncidents} åpne saker, ${outlier.criticalIncidents} kritiske. Resten ligger på ${Math.round(hs.filter((h) => h !== outlier).reduce((a, h) => a + h.score, 0) / Math.max(1, hs.length - 1))} i snitt.` : hs.length ? `Ingen lokasjon skiller seg klart ut akkurat nå. Laveste er ${hs[0].name} (${hs[0].score}).` : 'Ingen lokasjoner registrert ennå.');
    else if (/kjøl|frys|temperatur|gjenta|mønster/.test(t)) setAnswer(topRec ? `${topRec.label} i ${topRec.loc} har skjedd ${topRec.count} ganger på 30 dager. Det er det tydeligste mønsteret i dataene nå.` : 'Ingen gjentakende avvik på samme utstyr siste 30 dager.');
    else if (/åpne|saker|vedlikehold/.test(t)) setAnswer(`${hs.reduce((a, h) => a + h.openIncidents, 0)} åpne saker totalt, ${hs.reduce((a, h) => a + h.needsAttention, 0)} over frist.`);
    else if (/rutine|oppgave|fullfør/.test(t)) setAnswer(hs.map((h) => `${h.name}: ${Math.round(h.taskCompletion * 100)} %`).join(' · ') || 'Ingen data.');
    else setAnswer('Jeg svarer på risiko, mønstre, åpne saker og rutiner ut fra det som faktisk er registrert. Opplæring og leverandører kommer når de dataene finnes.');
  }

  return (
    <div className="wrapW rise">
      <div className="eyebrow">Kjede / HQ · {session.organizationName}</div>
      <h1 className="h1">{headline}</h1>
      <p className="lead">Du ser unntak og mønstre, ikke hundrevis av små hendelser.</p>

      <div className="hq">
        <div className="card pad">
          <div className="sect-h" style={{ marginBottom: 8 }}><h2>Lokasjoner</h2><span className="small">driftshelse · beregnet nå</span></div>
          {health.length === 0 ? <div className="empty"><b>Ingen lokasjoner.</b>Legg til den første i onboarding.</div> : (
            <div className="locs" data-testid="locs">
              {[...health].sort((a, b) => b.score - a.score).map((h) => (
                <div key={h.locationId} className={'loc' + (outlier?.locationId === h.locationId ? ' warn' : '')} data-testid="loc">
                  <div><strong>{h.name}</strong><span>{h.openIncidents === 0 ? 'Alt i rute' : `${h.openIncidents} åpen${h.openIncidents > 1 ? 'e saker' : ' sak'}${h.needsAttention ? ` · ${h.needsAttention} over frist` : ''}`} · {Math.round(h.taskCompletion * 100)} % rutiner</span></div>
                  <b>{h.score}</b>
                  <div className="bar"><i style={{ width: `${h.score}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          <div className="small" style={{ marginTop: 12 }}>Score: 100 minus 4 per åpen sak, 8 per kritisk, 6 per sak over frist, og opptil 20 for uferdige rutiner.</div>
        </div>

        <div className="dark insight" style={{ padding: 24 }} data-testid="insight">
          <div className="pill dim"><span className="dot" />StayMotion ser</div>
          {outlier ? (<>
            <h3>{outlier.name} har {outlier.openIncidents} åpne saker mot {avgOpen.toFixed(1)} i snitt.</h3>
            <p>{outlier.recurring[0] ? `${outlier.recurring[0].label} går igjen (${outlier.recurring[0].count} ganger). ` : ''}{outlier.criticalIncidents ? `${outlier.criticalIncidents} kritisk${outlier.criticalIncidents > 1 ? 'e' : ''} venter på beslutning.` : 'Ingen kritiske akkurat nå.'}</p>
            <div className="evid">
              <div><span>Åpne saker · {outlier.name}</span><b>{outlier.openIncidents}</b></div>
              <div><span>Snitt andre lokasjoner</span><b>{avgOpen.toFixed(1)}</b></div>
              <div><span>Over frist</span><b>{outlier.needsAttention}</b></div>
              <div><span>Foreslått tiltak</span><b>{outlier.recurring[0] ? 'Servicebesøk på utstyret' : 'Følg opp åpne saker'}</b></div>
            </div>
          </>) : (<>
            <h3>{health.length ? 'Ingen lokasjon skiller seg ut.' : 'Ingen data ennå.'}</h3>
            <p>{health.length ? 'Når én lokasjon får klart flere saker enn de andre, vises det her med tallene bak.' : 'Innsikt vises når det finnes registreringer å bygge på.'}</p>
          </>)}
        </div>
      </div>

      <div className="sect">
        <div className="sect-h"><h2>Spør StayMotion</h2></div>
        <form className="ask" style={{ display: 'flex', gap: 8, padding: 6, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 18 }} onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <input className="input" style={{ border: 0, background: 'transparent', boxShadow: 'none' }} placeholder="Spør om driften på tvers av lokasjoner …" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Spør StayMotion" />
          <button className="btn primary sm" type="submit">Spør</button>
        </form>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {['Hvilken lokasjon har høyest risiko?', 'Hvilke avvik gjentar seg?', 'Hvor mange saker er åpne?'].map((c) => <button key={c} type="button" className="btn sm ghost" onClick={() => { setQ(c); ask(c); }}>{c}</button>)}
        </div>
        {answer && <div className="card pad" style={{ marginTop: 12, background: 'var(--mintwash)', color: 'var(--mint-ink)', border: 0 }} aria-live="polite" data-testid="answer"><b style={{ display: 'block', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>StayMotion</b>{answer}</div>}
        <p className="small" style={{ marginTop: 10 }}>Svarene bygger kun på registrerte saker og rutiner i denne organisasjonen.</p>
      </div>
    </div>
  );
}
