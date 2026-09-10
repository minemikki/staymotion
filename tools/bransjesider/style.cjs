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

.s-top{display:flex;align-items:center;justify-content:space-between;padding:34px 18px 0;font-size:9px;letter-spacing:.15em;text-transform:uppercase;opacity:.85}
.s-brand{display:flex;align-items:center;gap:8px}
.s-logo{width:20px;height:20px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;
  font-size:9.5px;font-weight:800;letter-spacing:0;text-transform:uppercase;
  background:color-mix(in srgb, currentColor 16%, transparent)}
.s-menu{width:16px;height:1.5px;background:currentColor;box-shadow:0 5px 0 currentColor;opacity:.7}
.s-head{padding:16px 18px 14px}
.s-kick{display:block;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.s-head h5{margin:9px 0 0;font-weight:400;font-size:26px;line-height:1.02;letter-spacing:-.045em;max-width:11ch}
.s-tabs{display:flex;gap:6px;padding:2px 18px 14px;font-size:9px;letter-spacing:.08em;text-transform:uppercase}
.s-tabs b,.s-tabs span{padding:6px 13px;border-radius:50px}
.s-tabs b{font-weight:700;background:color-mix(in srgb, currentColor 15%, transparent)}
.s-tabs span{opacity:.5;font-weight:500}
.s-list{padding:6px 18px;display:grid;gap:7px}
.s-row{display:flex;align-items:center;gap:11px;padding:10px 11px;border-radius:13px;
  background:color-mix(in srgb, currentColor 5.5%, transparent)}
.s-ic{width:29px;height:29px;border-radius:9px;flex:none;display:flex;align-items:center;justify-content:center;
  font-size:10.5px;font-weight:800;background:color-mix(in srgb, currentColor 13%, transparent)}
.s-rt{flex:1;min-width:0;display:grid;gap:2px}
.s-rt em{font-style:normal;font-size:12px;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.s-rt span{font-size:9.5px;opacity:.58}
.s-pr{font-size:11px;font-weight:700;letter-spacing:-.01em;opacity:.9;flex:none;white-space:nowrap}
.s-bar{margin-top:auto;padding:14px 18px 26px}
.s-bar span{display:flex;align-items:center;justify-content:center;gap:8px;border-radius:11px;padding:13px;
  font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;
  box-shadow:0 14px 26px -14px rgba(0,0,0,.4)}
.s-bar span::after{content:"\\2192";font-weight:400;font-size:12px}

/* håndverker-skjerm */
.s-ba{margin:2px 18px 0;height:106px;border-radius:13px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;position:relative;
  box-shadow:0 12px 22px -16px rgba(0,0,0,.35)}
.s-ba .ba{display:flex;align-items:flex-end;padding:9px 11px;font-size:8.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.s-ba .ba-a{background:linear-gradient(160deg,#a3a9b1,#6d7178);color:#f2f2f0}
.s-ba .ba-b{background:linear-gradient(160deg,#eeece3,#cfcabb);color:#22242a}
.s-cap{padding:9px 18px 0;font-size:9.5px;opacity:.6}
.s-chips{display:flex;flex-wrap:wrap;gap:6px;padding:13px 18px 0}
.s-chips span{font-size:9px;font-weight:600;padding:6px 11px;border-radius:50px;border:1px solid currentColor;border-color:color-mix(in srgb,currentColor 22%,transparent);opacity:.75}
.s-chips .on{opacity:1;border-color:transparent}
.s-form{padding:14px 18px 0;display:grid;gap:7px}
.s-fld{position:relative;font-size:9.5px;font-weight:500;padding:10px 12px 10px 30px;border-radius:9px;opacity:.7;
  background:color-mix(in srgb,currentColor 6.5%, transparent);border:1px solid color-mix(in srgb,currentColor 13%,transparent)}
.s-fld::before{content:"";position:absolute;left:11px;top:50%;transform:translateY(-50%);
  width:7px;height:7px;border-radius:50%;background:color-mix(in srgb,currentColor 45%,transparent)}
.s-fld-img{display:flex;align-items:center;gap:7px;padding-left:30px}
.s-fld-img::before{content:"";left:11px;top:50%;transform:translateY(-50%);position:absolute;
  width:12px;height:12px;border-radius:3px;border:1.4px dashed currentColor;opacity:.75;background:none}

/* klinikk-skjerm */
.s-slots{display:flex;gap:7px;padding:14px 18px 0;flex-wrap:wrap}
.s-slots span{font-size:9.5px;font-weight:600;padding:8px 12px;border-radius:10px;
  background:color-mix(in srgb,currentColor 6%, transparent);opacity:.62}
.s-slots .on{opacity:1;box-shadow:0 8px 16px -10px rgba(0,0,0,.4)}

/* overnatting-skjerm */
.s-cal{padding:6px 18px 0}
.s-cal-h{display:flex;justify-content:space-between;font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.72;margin-bottom:9px}
.s-days{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.s-days i{font-style:normal;font-size:8.5px;font-weight:500;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;background:color-mix(in srgb,currentColor 9%,transparent)}
.s-days i.x{opacity:.2}
.s-days i.v{background:#f2f6ff;color:#0e1a2f;font-weight:600}
.s-sum{display:flex;justify-content:space-between;align-items:center;margin:14px 18px 0;padding:12px 14px;
  border-radius:12px;background:color-mix(in srgb,currentColor 6%, transparent);font-size:10px}
.s-sum b{font-size:13.5px;font-weight:700;letter-spacing:-.02em;display:block}
.s-sum em{font-style:normal;font-size:9.5px;opacity:.6;display:block;margin-top:1px}
.s-sum span{opacity:.7;font-weight:600;font-size:11px}

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
.t-rest{background:linear-gradient(178deg,#1d1512 0%,#120e0c 62%);color:#f4ebe0;--sc:256px}
.t-rest .s-bar span{background:#e8c9a0;color:#1a1412}
.t-craft{background:linear-gradient(178deg,#f4f3ee,#e4e3dc);color:#16171a;--sc:138px}
.t-craft .s-bar span{background:var(--cobalt);color:#fff}
.t-craft .s-chips .on{background:var(--cobalt);color:#fff}
.t-clin{background:linear-gradient(178deg,#f0f6f4,#dde8e6);color:#0f2a2a;--sc:177px}
.t-clin .s-bar span{background:#0f2a2a;color:#fff}
.t-clin .s-slots .on{background:#0f2a2a;color:#fff}
.t-stay{background:linear-gradient(178deg,#101c31,#0a1120);color:#e9eefb;--sc:187px}
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

/* ---- bildet gjentas i liten skala i løsningsseksjonen ---- */
.lp-sec .sec-visual{margin:0 0 36px;border-radius:16px;overflow:hidden;border:1px solid var(--line)}
`;
