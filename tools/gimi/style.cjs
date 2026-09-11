// GIMI — visuell identitet, andre retning.
//
// Bygget etter research på amerikanske topprestauranter med gode nettsider.
// Registeret er Bestia/Kann: varm kullsvart bunn, glo som eneste aksent,
// liten sperret minuskel-ordmerke, én display-font brukt kun i hero- og
// seksjonsskala, og nesten ingen UI-chrome. Skarpe hjørner overalt —
// ingen avrundinger, ingen kort med skygge.
//
// Bevisst énstemt mørk: dette er merkevaren, ikke et tema som skal snus.
// Derfor males bakgrunn og hver farge eksplisitt.

module.exports = `
:root{
  /* GIMIs egen palett: varm sand og den blaa fra logoen (#51618F). */
  --ground:#E9DFD6;--raised:#E1D5CA;--raised2:#F2EBE4;
  --blue:#51618F;--blue-deep:#3B4870;--blue-soft:#8A93B2;--cream:#FAF6F1;
  --ember:#3B4870;--ember-l:#7E86A6;--ember-d:#2A3455;
  --fire:#E1D5CA;--on-fire:#2B3350;
  --bone:#2B3350;--ash:#6E7392;--ash-d:#949AB4;
  --line:#D2C4B5;--line-l:#BEAE9C;
  --pad:clamp(1.4rem,5vw,6rem);--max:1680px;
  --disp:"Fraunces",Georgia,"Times New Roman",serif;
  --sans:"Archivo","Helvetica Neue",Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;background:var(--ground)}
body{margin:0;background:var(--ground);color:var(--bone);font-family:var(--sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:inherit;text-decoration:none}
img{display:block;width:100%}
h1,h2,h3,h4,p{margin:0}
button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit}
::selection{background:var(--ember);color:var(--bone)}
:focus-visible{outline:2px solid var(--ember);outline-offset:4px}
.skip{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.skip:focus{position:fixed;z-index:100;top:1rem;left:1rem;width:auto;height:auto;clip:auto;padding:.8rem 1rem;background:var(--bone);color:var(--ground)}

/* ---------- felles ---------- */
.wrap{max-width:var(--max);margin:0 auto;padding-left:var(--pad);padding-right:var(--pad)}
.sec{padding-block:clamp(5rem,11vw,11rem)}
.disp{font-family:var(--disp);font-weight:400;letter-spacing:-.03em;line-height:.92;text-wrap:balance}
.h-xl{font-size:clamp(3.2rem,9.4vw,9rem)}
.h-l{font-size:clamp(2.3rem,5.4vw,5.4rem)}
.h-m{font-size:clamp(1.8rem,3.1vw,2.9rem)}
.lab{font-family:var(--sans);font-size:.7rem;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--ember)}
.lab-ash{color:var(--ash)}
.rule{height:1px;background:var(--line);border:0;margin:0}
.lead{font-size:clamp(1.05rem,1.5vw,1.3rem);line-height:1.62;color:var(--ash);max-width:56ch}
.body{font-size:1.02rem;line-height:1.68;color:var(--ash)}

/* ---------- ordmerke ---------- */
.mark{display:block;flex:none;height:72px}
.mark img{width:auto;height:100%}

/* ---------- knapper ---------- */
.btn{display:inline-flex;align-items:center;gap:.85rem;min-height:52px;padding:0 1.5rem;font-size:.82rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;background:var(--ember);color:#fff;transition:background .2s ease}
.btn:hover{background:var(--ember-d)}
.btn--ghost{background:transparent;color:var(--bone);box-shadow:inset 0 0 0 1px var(--line-l)}
.btn--ghost:hover{background:var(--raised2);box-shadow:inset 0 0 0 1px var(--ash-d)}
.tlink{display:inline-flex;align-items:center;gap:.7rem;font-size:.82rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ember-l);padding-bottom:.35rem;box-shadow:inset 0 -1px 0 currentColor}
.tlink:hover{color:var(--bone)}
.ic{width:.95em;height:.95em;flex:none}

/* ---------- topplinje ---------- */
.top{position:sticky;z-index:30;top:0;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding:1.1rem var(--pad);background:var(--ground);border-bottom:1px solid var(--line)}
.top nav{display:flex;gap:clamp(1.5rem,2.6vw,2.8rem)}
.top nav a{font-size:.76rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--blue-deep);opacity:.82;transition:opacity .2s}
.top nav a:hover{opacity:1}
.top-r{display:flex;align-items:center;gap:1.4rem}
.lang{display:flex;box-shadow:inset 0 0 0 1px var(--line-l)}
.lang button{min-width:40px;min-height:32px;font-size:.66rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--blue-deep);opacity:.72;transition:.2s}
.lang button[aria-pressed=true]{background:var(--blue);color:var(--cream);opacity:1}
.lang button:hover{opacity:1}
.burger{display:none;position:relative;width:44px;height:44px}
.burger span{position:absolute;left:11px;width:22px;height:1.5px;background:var(--blue-deep);transition:transform .25s ease,opacity .25s ease}
.burger span:nth-child(1){top:17px}
.burger span:nth-child(2){top:22px}
.burger span:nth-child(3){top:27px}
.burger[aria-expanded=true] span:nth-child(1){top:22px;transform:rotate(45deg)}
.burger[aria-expanded=true] span:nth-child(2){opacity:0}
.burger[aria-expanded=true] span:nth-child(3){top:22px;transform:rotate(-45deg)}
.mnav{display:none;position:fixed;z-index:19;inset:0;flex-direction:column;justify-content:center;gap:1.5rem;padding:6rem var(--pad) 3rem;background:var(--blue);color:var(--cream)}
.mnav a{font-family:var(--disp);font-size:2.4rem;letter-spacing:-.02em;color:var(--cream)}
.mnav[hidden]{display:none}

/* ---------- hero ---------- */
.hero{position:relative;min-height:78svh;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;background:var(--ground);isolation:isolate}
.hero__img{position:absolute;inset:0;z-index:-2}
.hero__img img{width:100%;height:100%;object-fit:cover;object-position:56% 46%;filter:brightness(.88) saturate(1.02) contrast(1.01);
  animation:heroLive 22s ease-in-out infinite alternate;transform-origin:56% 46%}
@keyframes heroLive{0%{transform:scale(1.0)}100%{transform:scale(1.05)}}
.hero::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:linear-gradient(180deg,rgba(22,20,26,.46) 0%,rgba(22,20,26,.06) 26%,rgba(22,20,26,.32) 68%,rgba(22,20,26,.58) 100%),
             linear-gradient(98deg,rgba(20,18,24,.64) 0%,rgba(20,18,24,.22) 44%,transparent 68%)}
.hero__in{width:100%;padding-block:clamp(3rem,7vw,6rem) clamp(2rem,4vw,3.2rem)}
.hero h1{max-width:11ch;margin-top:1.6rem;color:#FBF6EE}
.hero__sub{margin-top:1.8rem;max-width:46ch;font-size:clamp(1rem,1.35vw,1.16rem);line-height:1.6;color:rgba(251,246,238,.93)}
.hero__cta{display:flex;flex-wrap:wrap;align-items:center;gap:1.2rem 2rem;margin-top:2.6rem}
.hero__note{margin-top:1.5rem;font-size:.82rem;color:rgba(251,246,238,.8)}
.hero__foot{display:flex;flex-wrap:wrap;gap:.6rem 2.4rem;margin-top:clamp(2.4rem,5vw,4rem);padding-top:1.5rem;border-top:1px solid rgba(251,246,238,.32);font-size:.78rem;letter-spacing:.06em;color:rgba(251,246,238,.82)}

/* live åpent-status */
.status{display:inline-flex;align-items:center;gap:.6rem;font-size:.7rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(251,246,238,.84)}
.status i{width:6px;height:6px;flex:none;border-radius:50%;background:rgba(251,246,238,.62)}
.status.on{color:#FBF8F3}
.status.on i{background:var(--ember);box-shadow:0 0 0 0 rgba(217,98,46,.6);animation:pulse 2.8s ease-out infinite}
@keyframes pulse{70%{box-shadow:0 0 0 8px rgba(217,98,46,0)}100%{box-shadow:0 0 0 0 rgba(217,98,46,0)}}

/* ---------- seksjonshode ---------- */
.shead{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:clamp(1.6rem,4vw,5rem);align-items:end;padding-bottom:clamp(2.4rem,5vw,4rem)}
.shead h2{margin-top:1.2rem}

/* ---------- 01 to måter å sitte på ---------- */
.sit{background:var(--ground);border-top:1px solid var(--line)}
.sit__grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--line)}
.sit__col{display:flex;flex-direction:column;padding:clamp(2.4rem,4vw,3.6rem) clamp(1.6rem,3vw,3rem) clamp(2.6rem,5vw,4rem) 0}
.sit__col+.sit__col{border-left:1px solid var(--line);padding-left:clamp(1.6rem,3vw,3rem)}
.sit__n{font-size:.72rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--ember)}
.sit__col h3{margin-top:1rem;font-family:var(--disp);font-weight:400;font-size:clamp(2rem,3.4vw,3.1rem);letter-spacing:-.03em;line-height:1}
.sit__line{margin-top:.5rem;font-family:var(--disp);font-style:italic;font-size:1.25rem;color:var(--ember-l)}
.sit__col p.body{margin-top:1.4rem;max-width:44ch}
.sit__note{margin-top:auto;padding-top:1.6rem;border-top:1px solid var(--line);font-size:.8rem;color:var(--ash-d)}

/* ---------- 02 gi meg noe ---------- */
.gi{background:var(--raised);border-top:1px solid var(--line)}
.gi__choices{display:flex;flex-wrap:wrap;gap:.6rem 2.6rem;padding-block:clamp(1.6rem,3vw,2.4rem);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.gi__c{font-family:var(--disp);font-style:italic;font-weight:400;font-size:clamp(1.5rem,3vw,2.6rem);letter-spacing:-.02em;color:var(--ash);transition:color .2s ease;padding:.2rem 0}
.gi__c:hover{color:var(--bone)}
.gi__c[aria-pressed=true]{color:var(--ember)}
.gi__out{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:2rem 4rem;align-items:start;padding-top:clamp(2.2rem,4vw,3.4rem)}
.gi__pre{font-size:.7rem;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--ember)}
.gi__name{margin-top:1rem;font-family:var(--disp);font-weight:400;font-size:clamp(2rem,4.2vw,3.6rem);letter-spacing:-.035em;line-height:.98}
.gi__desc{margin-top:1rem;max-width:46ch;font-size:1.12rem;line-height:1.6;color:var(--ash)}
.gi__all{display:block;margin-top:1rem;font-size:.76rem;letter-spacing:.05em;color:var(--ash-d)}
.gi__side{display:flex;flex-direction:column;align-items:flex-start;gap:1.4rem}
.gi__price{font-family:var(--disp);font-size:clamp(2rem,3.4vw,3rem);color:var(--bone)}
.gi__again{font-size:.78rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ash);box-shadow:inset 0 -1px 0 currentColor;padding-bottom:.3rem}
.gi__again:hover{color:var(--bone)}
.gi--in{animation:fade .4s cubic-bezier(.2,.7,.2,1)}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ---------- 03 ilden ---------- */
.ild{position:relative;background:#1A1720;color:var(--cream);overflow:hidden;isolation:isolate}

.ild__facts{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line-l);margin-top:clamp(2rem,4vw,3rem)}
.ild__f{padding:1.8rem 2rem 2rem 0;border-right:1px solid var(--line)}
.ild__f+.ild__f{padding-left:2rem}
.ild__f:last-child{border-right:0}
.ild__f b{display:block;font-family:var(--disp);font-style:italic;font-weight:400;font-size:1.6rem;color:var(--bone)}
.ild__f span{display:block;margin-top:.5rem;font-size:.92rem;color:var(--ash)}
.ild__dishes{margin-top:clamp(3rem,6vw,5rem)}
.ild__d{display:grid;grid-template-columns:minmax(180px,.3fr) 1fr;gap:.6rem 3rem;padding-block:1.7rem;border-top:1px solid var(--line)}
.ild__d:last-child{border-bottom:1px solid var(--line)}
.ild__d h3{font-family:var(--disp);font-weight:400;font-size:clamp(1.6rem,2.5vw,2.2rem);letter-spacing:-.02em;line-height:1}
.ild__d p{align-self:center;font-size:1.02rem;line-height:1.6;color:var(--ash)}

/* ---------- 04 menyen ---------- */
.meny{background:var(--raised);border-top:1px solid var(--line)}
.meny__g+.meny__g{margin-top:clamp(2.6rem,5vw,4rem)}
.meny__g>h3{padding-bottom:1rem;border-bottom:1px solid var(--line-l);font-family:var(--disp);font-style:italic;font-weight:400;font-size:1.5rem;color:var(--ember-l)}
.meny__i{display:grid;grid-template-columns:1fr auto;gap:.35rem 2.5rem;padding-block:1.4rem;border-bottom:1px solid var(--line)}
.meny__i h4{font-size:clamp(1.15rem,1.8vw,1.45rem);font-weight:500;letter-spacing:-.02em;color:var(--bone)}
.meny__i p{margin-top:.3rem;font-size:.98rem;color:var(--ash)}
.meny__i small{display:block;margin-top:.5rem;font-size:.74rem;letter-spacing:.05em;color:var(--ash-d)}
.meny__i b{font-family:var(--disp);font-weight:400;font-size:1.4rem;color:var(--bone);white-space:nowrap}
.meny__foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.6rem 2rem;margin-top:2rem;font-size:.82rem;color:var(--ash-d)}

/* ---------- 05 baren ---------- */
.bar{background:var(--ground);border-top:1px solid var(--line)}
.bar__grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(2rem,5vw,6rem);align-items:start}
.bar__d{padding-block:1.5rem;border-top:1px solid var(--line)}
.bar__d:last-of-type{border-bottom:1px solid var(--line)}
.bar__d h3{font-family:var(--disp);font-weight:400;font-size:clamp(1.5rem,2.4vw,2rem);letter-spacing:-.02em;line-height:1.05}
.bar__d p{margin-top:.55rem;max-width:46ch;font-size:1rem;line-height:1.6;color:var(--ash)}
.bar__hours{display:grid;grid-template-columns:1fr auto;gap:.9rem 2rem;margin-top:2.4rem;padding-top:1.4rem;border-top:1px solid var(--line)}
.bar__hours span{font-size:.94rem;color:var(--ash)}
.bar__hours b{font-family:var(--disp);font-weight:400;font-size:1.2rem;color:var(--bone)}

/* ---------- 06 rommet og brødrene ---------- */
.rom{background:var(--raised);border-top:1px solid var(--line)}
.rom__img{position:relative;aspect-ratio:21/9;overflow:hidden;margin-top:clamp(2rem,4vw,3rem)}
.rom__img img{width:100%;height:100%;object-fit:cover;object-position:50% 40%;filter:brightness(.8) saturate(.95)}
.rom__cap{position:absolute;left:0;top:0;padding:.8rem 1.2rem;background:var(--ember);color:#fff;font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase}
.rom__stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:clamp(2rem,4vw,3rem);border-top:1px solid var(--line)}
.rom__s{padding:1.8rem 2rem 0 0;border-right:1px solid var(--line)}
.rom__s+.rom__s{padding-left:2rem}
.rom__s:last-child{border-right:0}
.rom__s b{display:block;font-family:var(--disp);font-weight:400;font-size:clamp(2rem,3.3vw,2.7rem);line-height:1;color:var(--bone)}
.rom__s span{display:block;margin-top:.6rem;font-size:.9rem;color:var(--ash)}
.rom__story{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(2rem,5vw,6rem);margin-top:clamp(3rem,6vw,5rem)}
.rom__story p+p{margin-top:1.1rem}
.quote{padding-left:1.8rem;border-left:2px solid var(--ember)}
.quote p{font-family:var(--disp);font-style:italic;font-weight:400;font-size:clamp(1.4rem,2vw,1.9rem);line-height:1.22;color:var(--bone)}
.quote cite{display:block;margin-top:1rem;font-style:normal;font-size:.78rem;letter-spacing:.08em;color:var(--ash-d)}
.nabo{margin-top:clamp(2.4rem,5vw,4rem);padding-top:1.6rem;border-top:1px solid var(--line);display:grid;grid-template-columns:minmax(0,.36fr) minmax(0,1fr);gap:1rem 3rem}
.nabo h3{font-family:var(--disp);font-style:italic;font-weight:400;font-size:1.5rem;color:var(--ember-l)}

/* ---------- selskap ---------- */
.sel__grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(2rem,5vw,6rem);align-items:start;margin-top:clamp(1.4rem,3vw,2rem)}
.sel__body{max-width:46ch;font-size:1.1rem;line-height:1.65}
.sel__cta{margin-top:clamp(2rem,4vw,2.6rem)}
.sel__stats{border-top:1px solid rgba(250,246,241,.26)}
.sel__s{display:grid;grid-template-columns:auto 1fr;gap:0 1.6rem;align-items:baseline;padding-block:1.6rem;border-bottom:1px solid rgba(250,246,241,.26)}
.sel__s b{font-family:var(--disp);font-weight:400;font-size:clamp(1.8rem,3vw,2.4rem);line-height:1;white-space:nowrap}
.sel__s span{font-size:.94rem;line-height:1.5;color:rgba(250,246,241,.8)}

/* ---------- 07 besøk ---------- */
.bes{background:var(--ground);border-top:1px solid var(--line)}
.bes__big{font-family:var(--disp);font-weight:300;font-size:clamp(2.2rem,5.6vw,4.6rem);letter-spacing:-.02em;line-height:1.05;color:var(--blue);overflow-wrap:break-word}
.bes__grid{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);margin-top:clamp(2rem,4vw,3rem)}
.bes__c{padding:1.9rem 2rem 2rem 0;border-right:1px solid var(--line)}
.bes__c+.bes__c{padding-left:2rem}
.bes__c:last-child{border-right:0}
.bes__c p{margin-top:1.1rem;font-family:var(--disp);font-size:1.32rem;line-height:1.45;color:var(--bone)}
.bes__c .tlink{margin-top:1.4rem}
.bes__cta{display:flex;flex-wrap:wrap;align-items:center;gap:1.2rem 2rem;margin-top:clamp(2.6rem,5vw,4rem)}
.bes__mood{margin-top:clamp(2.4rem,5vw,3.6rem);max-width:62ch;font-family:var(--disp);font-style:italic;font-size:clamp(1.2rem,2vw,1.7rem);line-height:1.35;color:var(--ash)}

/* ---------- footer ---------- */
.foot{background:var(--blue);color:var(--cream);padding-block:clamp(3rem,6vw,5rem)}
.foot__in{display:grid;grid-template-columns:auto 1fr auto;gap:2rem clamp(2.5rem,6vw,6rem);align-items:end}
.foot__note{max-width:34ch;font-size:.76rem;line-height:1.62;color:rgba(250,246,241,.6);text-align:right}

/* ---------- fast bookinglinje på mobil ---------- */

/* ---------- responsivt ---------- */
@media (max-width:1080px){
  .shead{grid-template-columns:1fr;align-items:start}
  .gi__out{grid-template-columns:1fr}
  .bar__grid,.rom__story{grid-template-columns:1fr}
  .nabo{grid-template-columns:1fr;gap:.8rem}
  .sel__grid{grid-template-columns:1fr;gap:2.4rem}
}
@media (max-width:820px){
  .sit__grid{grid-template-columns:1fr}
  .sit__col{padding-right:0}
  .sit__col+.sit__col{border-left:0;border-top:1px solid var(--line);padding-left:0;padding-top:clamp(2.2rem,5vw,3rem)}
  .ild__facts,.rom__stats,.bes__grid{grid-template-columns:1fr}
  .ild__f,.ild__f+.ild__f,.rom__s,.rom__s+.rom__s,.bes__c,.bes__c+.bes__c{padding:1.5rem 0;border-right:0;border-bottom:1px solid var(--line)}
  .ild__f:last-child,.rom__s:last-child,.bes__c:last-child{border-bottom:0}
  .ild__d{grid-template-columns:1fr;gap:.4rem}
  .rom__img{aspect-ratio:4/3}
}
@media (max-width:720px){
  :root{--pad:1.3rem}
  .top{padding:1.2rem var(--pad)}
  .top nav{display:none}
  .top .btn{display:none}
  .burger{display:block}
  .mnav{display:flex}
  .mark{height:48px}
  .hero{min-height:auto}
  .hero::after{background:linear-gradient(180deg,rgba(20,18,24,.66) 0%,rgba(20,18,24,.52) 28%,rgba(20,18,24,.70) 66%,rgba(20,18,24,.86) 100%)}
  .hero__img img{object-position:62% 40%;filter:brightness(.82) saturate(1.02)}
  .hero__img img{object-position:60% 44%}
  .hero h1{max-width:8ch}
  .hero__sub,.hero__note,.hero__foot{display:none}
  .hero__cta{gap:1rem;margin-top:2rem}
  .hero__cta .tlink{display:none}
  .hero__cta .btn{width:100%;justify-content:center}
  .gi__choices{flex-direction:column;gap:.2rem}
  .gi__c{font-size:1.7rem}
  .meny__i{grid-template-columns:1fr auto}
  .quote{padding-left:1.1rem}
  .bes__cta .btn{width:100%;justify-content:center}
  .foot__in{grid-template-columns:1fr;gap:1.4rem}
  .foot__note{text-align:left;max-width:40ch}
  .foot__mark{height:86px}
}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .status.on i{animation:none}
  .gi--in{animation:none}
  .hero__img img{animation:none}
}

/* Ilden staar paa varm glo-brunn, saa den trenger egne tekstfarger */
.ild .lab{color:rgba(250,246,241,.72)}

/* Heroen ligger over foto: aksentlenka trenger en lysere glo der */
.hero .tlink{color:#FBF8F3}
.hero .tlink:hover{color:#FFFFFF}

/* Heroen ligger over foto: naer-svart knapp forsvinner der, saa den snus */
.hero .btn{background:var(--cream);color:var(--blue-deep)}
.hero .btn:hover{background:#FFFFFF}

/* ---------- seksjoner i heldekkende blaatt ----------
   Bryter opp sanden og gir siden rytme. GIMIs egen blaa, ikke en oppfunnet. */
.blue{background:var(--blue);color:var(--cream);border-top:0}
.blue h2,.blue h3,.blue h4,.blue .gi__name,.blue .gi__price{color:var(--cream)}
.blue .lab{color:var(--sand,#E9DFD6)}
.blue .lab-ash{color:rgba(250,246,241,.62)}
.blue .lead,.blue .body,.blue p{color:rgba(250,246,241,.8)}
.blue .btn{background:var(--cream);color:var(--blue-deep)}
.blue .btn:hover{background:#FFFFFF}
.blue .btn--ghost{background:transparent;color:var(--cream);box-shadow:inset 0 0 0 1px rgba(250,246,241,.42)}
.blue .btn--ghost:hover{background:rgba(250,246,241,.1);box-shadow:inset 0 0 0 1px rgba(250,246,241,.7)}
.blue .gi__choices{border-color:rgba(250,246,241,.26)}
.blue .gi__c{color:rgba(250,246,241,.56)}
.blue .gi__c:hover{color:var(--cream)}
.blue .gi__c[aria-pressed=true]{color:#FFFFFF}
.blue .gi__pre{color:var(--sand,#E9DFD6)}
.blue .gi__desc{color:rgba(250,246,241,.82)}
.blue .gi__all{color:rgba(250,246,241,.58)}
.blue .gi__again{color:rgba(250,246,241,.74)}
.blue .gi__again:hover{color:var(--cream)}
.blue .shead{border-color:rgba(250,246,241,.26)}

/* Logoen: liten i toppen, stor som avslutning i footeren */
.foot__mark{display:block;height:clamp(104px,13vw,178px)}
.foot__mark img{width:auto;height:100%;filter:brightness(0) invert(1)}
.foot__tag{margin-top:1.2rem;font-size:.95rem;line-height:1.6;color:rgba(250,246,241,.78);max-width:34ch}

/* Mobilmenyen legger seg under den klebrige toppen, ikke over den */
.mnav{padding-top:7.5rem}

/* ---------- bildestripe under heroen ---------- */
.mos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px 0 0;background:var(--ground)}
.mos img{width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;display:block}

/* ---------- to maater aa sitte paa: bildekort ---------- */
.sit__cards{display:grid;grid-template-columns:1fr 1fr;gap:clamp(.8rem,1.6vw,1.6rem)}
.sit__card{position:relative;display:block;aspect-ratio:4/5;overflow:hidden;background:var(--blue-deep);color:var(--cream)}
.sit__card img{width:100%;height:100%;object-fit:cover;filter:brightness(.78) saturate(1.02);transition:transform .9s cubic-bezier(.2,.7,.2,1)}
.sit__card:hover img{transform:scale(1.045)}
.sit__ov{position:absolute;inset:auto 0 0;padding:clamp(1.4rem,3vw,2.6rem);background:linear-gradient(180deg,transparent 0%,rgba(20,18,26,.62) 55%,rgba(20,18,26,.86) 100%)}
.sit__card .sit__n{color:rgba(250,246,241,.7)}
.sit__card h3{margin-top:.6rem;color:var(--cream);font-family:var(--disp);font-weight:400;letter-spacing:-.03em;line-height:1;font-size:clamp(2.1rem,3.8vw,3.5rem)}
.sit__card .sit__line{color:rgba(250,246,241,.85)}
.sit__card .sit__note{margin-top:1rem;padding-top:.9rem;border-top:1px solid rgba(250,246,241,.28);color:rgba(250,246,241,.7)}

/* ---------- ilden som fotoparti ---------- */
.ild__bg{position:absolute;inset:0;z-index:-1}
.ild__bg img{width:100%;height:100%;object-fit:cover;object-position:40% 50%;filter:brightness(.52) saturate(.95)}
.ild__bg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(20,18,26,.72) 0%,rgba(20,18,26,.3) 55%,rgba(20,18,26,.5) 100%)}
.ild__in{padding-block:clamp(6rem,13vw,13rem)}
.ild h2{color:var(--cream);max-width:12ch}
.ild__list{list-style:none;margin:clamp(2rem,4vw,3.2rem) 0 0;padding:1.6rem 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:1.6rem 2.4rem;border-top:1px solid rgba(250,246,241,.28)}
.ild__list b{display:block;font-family:var(--disp);font-weight:400;font-size:clamp(1.6rem,2.3vw,2.1rem);letter-spacing:-.02em;line-height:1;color:var(--cream)}
.ild__list span{display:block;margin-top:.5rem;font-size:.92rem;line-height:1.5;color:rgba(250,246,241,.72);max-width:32ch}

/* ---------- baren: foto + tider + navn ---------- */
.bar__split{display:grid;grid-template-columns:1.1fr .9fr;min-height:680px}
.bar__img{overflow:hidden}
.bar__img img{width:100%;height:100%;object-fit:cover;object-position:52% 50%}
.bar__copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(3rem,6vw,6rem)}
.bar__copy h2{margin-top:1.2rem}
.bar__list{list-style:none;margin:2.2rem 0 0;padding:0;display:grid;gap:.55rem}
.bar__list li{font-family:var(--disp);font-style:italic;font-size:clamp(1.3rem,2vw,1.7rem);color:var(--ash);padding:.35rem 0;border-top:1px solid var(--line)}
.bar__list li:first-child{border-top:0}

/* ---------- rommet: stort sitat og en setning om broedrene ---------- */
.quote--big{margin-top:clamp(3rem,6vw,5rem);padding-left:0;border-left:0}
.quote--big p{font-size:clamp(1.8rem,3.4vw,3.3rem);max-width:22ch;line-height:1.1}
.rom__bro{margin-top:clamp(3rem,6vw,5rem);padding-top:clamp(2rem,4vw,3rem);border-top:1px solid var(--line);max-width:64ch}
.rom__bro h3{margin-top:1rem}
.rom__bro .lead{margin-top:1.2rem}

@media (max-width:820px){
  .sit__cards{grid-template-columns:1fr}
  .sit__card{aspect-ratio:4/3}
  .ild__list{grid-template-columns:1fr}
  .bar__split{grid-template-columns:1fr;min-height:0}
  .bar__img{aspect-ratio:4/3}
  .mos img{aspect-ratio:3/4}
}
@media (max-width:720px){
  .bar__copy{padding:3rem var(--pad)}
}

/* Ankerhopp lander under den klebrige toppen */
section[id],#top{scroll-margin-top:112px}
@media (max-width:720px){section[id],#top{scroll-margin-top:90px}}
`;
