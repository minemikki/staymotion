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
  const attention = health.filter((h) => h.score < 80);
  const avgOpen = health.length ? health.reduce((a, h) => a + h.openIncidents, 0) / health.length : 0;
  const totalOpen = health.reduce((a, h) => a + h.openIncidents, 0);
  const totalCritical = health.reduce((a, h) => a + h.criticalIncidents, 0);
  // Headline names the exception (or calm) instead of a scorecard verdict — HQ asks "where is the risk?"
  const headline = health.length === 0 ? 'Ingen lokasjoner ennå.' : outlier ? `${outlier.name} skiller seg ut.` : totalCritical ? `${totalCritical} kritisk${totalCritical > 1 ? 'e saker' : ' sak'} venter på beslutning.` : attention.length ? `${attention.length} av ${health.length} lokasjoner trenger oppmerksomhet.` : 'Alt er i rute på tvers av lokasjonene.';
  const totalLate = health.reduce((a, h) => a + h.needsAttention, 0);
  const patterns = health.flatMap((h) => h.recurring.map((r) => ({ ...r, loc: h.name }))).sort((a, b) => b.count - a.count);
  const topRec = patterns[0];

  function ask(text: string) {
    const t = text.toLowerCase();
    if (!t.trim()) { setAnswer('Prøv for eksempel: «Hvilken lokasjon har høyest risiko?»'); return; }
    if (/risiko|verst|oppmerksom/.test(t)) setAnswer(outlier ? `${outlier.name} skiller seg ut med driftshelse ${outlier.score}: ${outlier.openIncidents} åpne saker, ${outlier.criticalIncidents} kritiske. Resten ligger på ${Math.round(hs.filter((h) => h !== outlier).reduce((a, h) => a + h.score, 0) / Math.max(1, hs.length - 1))} i snitt.` : hs.length ? `Ingen lokasjon skiller seg klart ut akkurat nå. Laveste er ${hs[0].name} (${hs[0].score}).` : 'Ingen lokasjoner registrert ennå.');
    else if (/kjøl|frys|temperatur|gjenta|mønster/.test(t)) setAnswer(topRec ? `${topRec.label} i ${topRec.loc} har skjedd ${topRec.count} ganger på 30 dager. Det er det tydeligste mønsteret i dataene nå.` : 'Ingen gjentakende avvik på samme utstyr siste 30 dager.');
    else if (/åpne|saker|vedlikehold/.test(t)) setAnswer(`${totalOpen} åpne saker totalt, ${totalLate} over frist.`);
    else if (/rutine|oppgave|fullfør/.test(t)) setAnswer(hs.map((h) => `${h.name}: ${Math.round(h.taskCompletion * 100)} %`).join(' · ') || 'Ingen data.');
    else setAnswer('Jeg svarer på risiko, mønstre, åpne saker og rutiner ut fra det som faktisk er registrert. Opplæring og leverandører kommer når de dataene finnes.');
  }

  return (
    <div className="wrapW rise">
      <div className="eyebrow">Kjede / HQ · {session.organizationName}</div>
      <h1 className="h1">{headline}</h1>
      <p className="lead">Du ser unntak og mønstre, ikke hundrevis av små hendelser.</p>

      <div className="ops-metrics" aria-label="Kjedeoversikt" style={{ marginTop: 22 }}>
        <div className="m-now"><span>Åpne saker</span><strong>{totalOpen}</strong><small>på tvers av {health.length} lokasjon{health.length === 1 ? '' : 'er'}</small></div>
        <div className={totalCritical ? 'm-now' : 'm-done'}><span>Kritiske</span><strong>{totalCritical}</strong><small>venter på beslutning</small></div>
        <div className="m-watch"><span>Over frist</span><strong>{totalLate}</strong><small>løftet automatisk</small></div>
      </div>

      <section className="sect" id="risiko" aria-labelledby="h-risk">
        <div className="sect-h"><h2 id="h-risk">Risiko</h2><span className="small">hvor trengs hjelp</span></div>
        <div className="dark insight" data-testid="insight">
          <span className="pill dim"><span className="dot" aria-hidden />StayMotion ser</span>
          {outlier ? (<>
            <h3>{outlier.name} har {outlier.openIncidents} åpne saker mot {avgOpen.toFixed(1)} i snitt.</h3>
            <p>{outlier.recurring[0] ? `${outlier.recurring[0].label} går igjen (${outlier.recurring[0].count} ganger). ` : ''}{outlier.criticalIncidents ? `${outlier.criticalIncidents} kritisk${outlier.criticalIncidents > 1 ? 'e' : ''} venter på beslutning.` : 'Ingen kritiske akkurat nå.'}</p>
            <div className="evid">
              <div><span>Åpne saker · {outlier.name}</span><b>{outlier.openIncidents}</b></div>
              <div><span>Snitt andre lokasjoner</span><b>{avgOpen.toFixed(1)}</b></div>
              <div><span>Over frist</span><b>{outlier.needsAttention}</b></div>
              <div><span>Anbefalt</span><b>{outlier.recurring[0] ? 'Servicebesøk på utstyret' : 'Ring lederen, avklar åpne saker'}</b></div>
            </div>
          </>) : (<>
            <h3>{health.length ? 'Ingen lokasjon skiller seg ut.' : 'Ingen data ennå.'}</h3>
            <p>{health.length ? 'Når én lokasjon får klart flere saker enn de andre, vises det her med tallene bak.' : 'Innsikt vises når det finnes registreringer å bygge på.'}</p>
          </>)}
        </div>
      </section>

      <section className="sect" id="monstre" aria-labelledby="h-pat">
        <div className="sect-h"><h2 id="h-pat">Mønstre</h2><span className="small">siste 30 dager</span></div>
        {patterns.length === 0 ? <div className="empty"><b>Ingen gjentakende avvik.</b>Når samme utstyr får flere saker på 30 dager, vises det her med en anbefaling.</div> : (
          <div className="hq-grid">
            {patterns.slice(0, 4).map((p) => (
              <div className="insight-card" key={`${p.loc}-${p.label}`}>
                <span className="pill ai"><span className="dot" aria-hidden />{p.loc}</span>
                <h3>{p.label}</h3>
                <p>{p.count} ganger på 30 dager. Gjentatte avvik på samme enhet er som regel billigere å løse med service enn med matsvinn.</p>
                <div className="rec"><b>Anbefalt:</b><span>Bestill service og be lokasjonen bekrefte neste avlesning i appen.</span></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="sect" id="lokasjoner" aria-labelledby="h-locs">
        <div className="sect-h"><h2 id="h-locs">Lokasjoner</h2><span className="small">driftshelse · beregnet nå</span></div>
        <div className="card pad">
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
      </section>

      <section className="sect" id="spor" aria-labelledby="h-ask">
        <div className="sect-h"><h2 id="h-ask">Spør StayMotion</h2></div>
        <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <input className="input" placeholder="Spør om driften på tvers av lokasjoner …" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Spør StayMotion" />
          <button className="btn primary sm" type="submit">Spør</button>
        </form>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {['Hvilken lokasjon har høyest risiko?', 'Hvilke avvik gjentar seg?', 'Hvor mange saker er åpne?'].map((c) => <button key={c} type="button" className="btn sm ghost" onClick={() => { setQ(c); ask(c); }}>{c}</button>)}
        </div>
        {answer && <div className="answer" aria-live="polite" data-testid="answer"><b>StayMotion</b>{answer}</div>}
        <p className="small" style={{ marginTop: 10 }}>Svarene bygger kun på registrerte saker og rutiner i denne organisasjonen.</p>
      </section>
    </div>
  );
}
