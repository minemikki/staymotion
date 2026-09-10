// CSS for det visuelle laget. Arver farger og typografi fra forsiden;
// legger bare til det telefonen og fotostripa trenger.
module.exports = `
/* ---- hero i to spalter, med telefonen ved siden av teksten ---- */
.lp-hero{padding:clamp(52px,7vw,96px) 0 clamp(44px,5vw,64px);
  /* Gløden bak telefonen strekker seg utenfor spalta med vilje. Uten dette
     lager den vannrett scroll på mobil. clip, ikke hidden: hidden ville laget
     en scroll-container av heroen. */
  overflow-x:clip}
.lp-hero .wrap{display:grid;gap:clamp(38px,5vw,64px)}
.lp-hero .lp-copy{min-width:0}
@media(min-width:980px){
  .lp-hero .wrap{grid-template-columns:1.02fr .98fr;align-items:center;gap:clamp(48px,5vw,88px)}
  .lp-hero h1{max-width:14ch}
}

/* ---- telefonen ---- */
.dev{position:relative;display:flex;flex-direction:column;align-items:center;isolation:isolate}
.dev::before{content:"";position:absolute;inset:-6% -14% -10%;background:radial-gradient(closest-side,rgba(18,72,255,.16),transparent 74%);filter:blur(6px);z-index:-1}
.pho{position:relative;width:min(296px,72vw);aspect-ratio:9/17.4;
  /* Uten min-height:0 lar flex telefonen vokse til innholdet i stedet for å
     holde formatet — da ruller ingenting, rammen bare blir lengre. */
  min-height:0;flex:none;border-radius:46px;padding:9px;
  background:linear-gradient(158deg,#3a3e48,#101116 46%,#2c2f37);
  box-shadow:0 70px 130px -56px rgba(10,20,60,.8),0 10px 30px -18px rgba(10,20,60,.5),inset 0 1px 0 rgba(255,255,255,.14);
  transform:rotate(-1.4deg)}
.pho::after{content:"";position:absolute;left:50%;top:19px;transform:translateX(-50%);width:82px;height:23px;border-radius:20px;background:#08090c;z-index:3}
.scr{height:100%;min-height:0;border-radius:38px;overflow:hidden;display:flex;flex-direction:column;font-size:11.5px;line-height:1.4;position:relative}

.s-top{display:flex;align-items:center;justify-content:space-between;padding:40px 18px 0;font-size:9px;letter-spacing:.16em;text-transform:uppercase;opacity:.75}
.s-top i{width:17px;height:1.5px;background:currentColor;box-shadow:0 5px 0 currentColor;opacity:.8}
.s-head{padding:22px 18px 16px}
.s-kick{display:block;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.s-head h5{margin:9px 0 0;font-weight:400;font-size:26px;line-height:1.02;letter-spacing:-.045em;max-width:11ch}
.s-tabs{display:flex;gap:16px;padding:0 18px 12px;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase}
.s-tabs b{font-weight:600;padding-bottom:5px;border-bottom:1.5px solid currentColor}
.s-tabs span{opacity:.45;padding-bottom:5px}
.s-list{padding:4px 18px;display:grid;gap:11px}
.s-row{display:grid;gap:2px;padding-bottom:10px;border-bottom:1px solid currentColor;border-color:color-mix(in srgb,currentColor 16%,transparent)}
.s-row em{font-style:normal;font-size:12.5px;letter-spacing:-.02em}
.s-row span{font-size:10px;opacity:.55}
.s-bar{margin-top:auto;padding:14px 18px 26px}
.s-bar span{display:block;text-align:center;border-radius:8px;padding:11px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:600}

/* håndverker-skjerm */
.s-ba{margin:2px 18px 0;height:92px;border-radius:9px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;position:relative}
.s-ba .ba{display:flex;align-items:flex-end;padding:7px 9px;font-size:8px;letter-spacing:.12em;text-transform:uppercase}
.s-ba .ba-a{background:linear-gradient(160deg,#9ba0a8,#6d7178);color:#f2f2f0}
.s-ba .ba-b{background:linear-gradient(160deg,#e9e7df,#cfcabb);color:#22242a}
.s-chips{display:flex;flex-wrap:wrap;gap:6px;padding:13px 18px 0}
.s-chips span{font-size:9px;padding:5px 9px;border-radius:50px;border:1px solid currentColor;border-color:color-mix(in srgb,currentColor 22%,transparent);opacity:.8}
.s-form{padding:14px 18px 0;display:grid;gap:7px}
.s-fld{font-size:9.5px;padding:9px 10px;border-radius:7px;opacity:.62;background:color-mix(in srgb,currentColor 7%,transparent);border:1px solid color-mix(in srgb,currentColor 14%,transparent)}
.s-fld-img{display:flex;align-items:center;gap:7px}
.s-fld-img::before{content:"";width:13px;height:13px;border-radius:3px;border:1px dashed currentColor;opacity:.7;flex:none}

/* klinikk-skjerm */
.s-slots{display:flex;gap:6px;padding:16px 18px 0}
.s-slots span{font-size:9px;padding:7px 9px;border-radius:6px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);opacity:.62}
.s-slots .on{opacity:1;font-weight:600;border-color:currentColor}

/* overnatting-skjerm */
.s-cal{padding:6px 18px 0}
.s-cal-h{display:flex;justify-content:space-between;font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.72;margin-bottom:9px}
.s-days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.s-days i{font-style:normal;font-size:8.5px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:5px;background:color-mix(in srgb,currentColor 10%,transparent)}
.s-days i.x{opacity:.2}
.s-days i.v{background:#f2f6ff;color:#0e1a2f;font-weight:600}
.s-sum{display:flex;justify-content:space-between;align-items:baseline;margin:16px 18px 0;padding-top:11px;border-top:1px solid color-mix(in srgb,currentColor 18%,transparent);font-size:10px}
.s-sum b{font-size:13px;font-weight:500;letter-spacing:-.02em}
.s-sum span{opacity:.6}

/* ---- telefonen ruller innholdet, som om noen blar gjennom siden ----
   Topplinja, overskriften og bestill-knappen ligger utenfor rulleområdet,
   slik de er festet i en ekte app. Ren CSS: ingen JS, ingen scroll-lytter,
   ingenting som kan henge. Masken lar innholdet tone ut i kantene i stedet
   for å bli kuttet med en hard strek.
   Avstanden settes per skjerm, siden de har ulikt mye innhold. */
.s-scroll{flex:1;min-height:0;overflow:hidden;position:relative;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 10px,#000 calc(100% - 22px),transparent 100%);
  mask-image:linear-gradient(180deg,transparent 0,#000 10px,#000 calc(100% - 22px),transparent 100%)}
.s-scrollin{animation:s-bla 21s cubic-bezier(.42,0,.22,1) infinite;will-change:transform}
@keyframes s-bla{
  0%,13%    {transform:translateY(0)}
  40%,53%   {transform:translateY(calc(var(--sc) * -.5))}
  74%,86%   {transform:translateY(calc(var(--sc) * -1))}
  100%      {transform:translateY(0)}
}
/* Bevegelse som ikke kan stoppes gir kvalme for noen. Respekter valget. */
@media (prefers-reduced-motion: reduce){ .s-scrollin{animation:none} }

/* fargetemaer — samme palett som bransjekortene på forsiden */
.t-rest{background:linear-gradient(178deg,#1d1512 0%,#120e0c 62%);color:#f4ebe0;--sc:205px}
.t-rest .s-bar span{background:#e8c9a0;color:#1a1412}
.t-craft{background:linear-gradient(178deg,#f4f3ee,#e4e3dc);color:#16171a;--sc:86px}
.t-craft .s-bar span{background:var(--cobalt);color:#fff}
.t-clin{background:linear-gradient(178deg,#f0f6f4,#dde8e6);color:#0f2a2a;--sc:144px}
.t-clin .s-bar span{background:#0f2a2a;color:#fff}
.t-stay{background:linear-gradient(178deg,#101c31,#0a1120);color:#e9eefb;--sc:160px}
.t-stay .s-bar span{background:#fff;color:#0f1a2e}

/* liten notis som svever ved siden av telefonen */
.dev .chip{position:absolute;z-index:2;right:-6px;bottom:9%;display:grid;gap:2px;background:#fff;border:1px solid var(--line);border-radius:12px;
  padding:11px 14px;box-shadow:0 28px 56px -30px rgba(10,20,60,.6);max-width:170px}
.dev .chip b{font-size:12.5px;font-weight:500;letter-spacing:-.02em;display:flex;align-items:center;gap:7px}
.dev .chip b::before{content:"";width:7px;height:7px;border-radius:50%;background:#1fae5a;flex:none}
.dev .chip span{font-size:11px;color:var(--muted)}
.dev .note{margin:20px 0 0;font-size:11.5px;color:var(--faint);text-align:center}
@media(max-width:979px){
  .dev .chip{right:max(0px,calc(50% - 196px));bottom:22%}
}
@media(max-width:420px){.dev .chip{display:none}}

/* ---- stemningsbildet ----
   Ikke en stripe over hele bredden. Bildet står i en seksjon sammen med en
   linje som sier hva det har med saken å gjøre, i to spalter — da hører det
   til siden i stedet for å ligge der tilfeldig.
   Mindre bilde er også skarpere: 640 px vist mot 1100 px kilde tåler
   skjermer med høy pikseltetthet, der full bredde ble strukket og uklart. */
.lp-foto{padding:0 0 clamp(58px,7vw,90px)}
.lp-foto .wrap{display:grid;gap:clamp(22px,3vw,40px);align-items:center}
.lp-foto figure{margin:0;min-width:0}
.lp-foto .ramme{position:relative;border-radius:16px;overflow:hidden;
  border:1px solid var(--line);background:var(--pearl2);
  box-shadow:0 30px 60px -42px rgba(10,20,60,.40), 0 2px 5px -3px rgba(10,20,60,.10)}
.lp-foto .ramme::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22)}
.lp-foto img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover}
.lp-foto .poeng{margin:0;font-size:clamp(16.5px,1.5vw,19px);line-height:1.55;color:var(--ink2);max-width:34ch}
.lp-foto .kilde{margin:14px 0 0;font-size:12.5px;line-height:1.5;color:var(--faint);max-width:44ch}
@media(min-width:861px){
  .lp-foto .wrap{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)}
}
@media(max-width:860px){
  .lp-foto .ramme{border-radius:13px}
  .lp-foto img{aspect-ratio:3/2}
}

/* ---- bildet gjentas i liten skala i løsningsseksjonen ---- */
.lp-sec .sec-visual{margin:0 0 36px;border-radius:16px;overflow:hidden;border:1px solid var(--line)}
`;
