// GIMI — visuell identitet.
// Bygger videre på paletten og typografien som allerede er etablert i konseptet:
// dyp blå, blush, papir, skarpe hjørner, ingen avrundinger. Nytt er glo-aksenten,
// som kun brukes der ilden faktisk er temaet — og en ordentlig serif-kursiv
// (Instrument Serif) i stedet for Georgia, som er der personligheten sitter.

module.exports = `
:root{
  --ink:#11131b;--blue:#526792;--blue-deep:#202b4a;--blue-soft:#7c8eb8;
  --blush:#eed9d1;--blush-light:#f8f0eb;--paper:#f2f0eb;--white:#fffdf8;
  --line:rgba(17,19,27,.18);--line-soft:rgba(17,19,27,.1);
  --ember:#e0662f;--ember-soft:#f3a877;--ember-deep:#9c3a12;--char:#15100d;
  --pad:clamp(1.35rem,4vw,5rem);--max:1560px;
  --serif:"Instrument Serif",Georgia,"Times New Roman",serif;
  --sans:"Helvetica Neue",Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;color:var(--ink);background:var(--paper);font-family:var(--sans);font-size:16px;line-height:1.45;-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:inherit}
img{display:block;width:100%}
h1,h2,h3,p{margin-top:0}
h1,h2{letter-spacing:-.055em;font-weight:500;line-height:.94}
h2{font-size:clamp(3.1rem,7vw,7.4rem)}
em{font-family:var(--serif);font-weight:400;font-style:italic}
button{font-family:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--ember);outline-offset:3px}
.skip-link{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.skip-link:focus{position:fixed;z-index:1000;top:1rem;left:1rem;width:auto;height:auto;clip:auto;padding:.8rem 1rem;background:var(--white)}

/* ---------- konseptbanner + header ---------- */
.concept-bar{position:relative;z-index:30;min-height:30px;display:flex;align-items:center;justify-content:center;gap:1.25rem;padding:.4rem 1rem;background:var(--blush);color:var(--blue-deep);font-size:.68rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.concept-bar__note{opacity:.62}
.site-header{position:absolute;z-index:20;top:30px;left:0;right:0;height:124px;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding:0 var(--pad);color:var(--white);border-bottom:1px solid rgba(255,255,255,.28)}
.brand{width:46px;flex:none;display:flex;align-items:center}
.brand img{width:100%;height:auto;filter:brightness(0) invert(1)}
.site-header nav{display:flex;gap:clamp(1.4rem,2.6vw,3rem)}
.site-header nav a{text-decoration:none;font-size:.82rem;transition:opacity .2s ease}
.site-header nav a:hover{opacity:.62}
.head-right{display:flex;align-items:center;gap:1.5rem}

/* ---------- språkbryter ---------- */
.langsw{display:flex;align-items:center;gap:0;border:1px solid rgba(255,255,255,.42);flex:none}
.langsw button{min-width:38px;min-height:30px;padding:0 .5rem;border:0;background:transparent;color:inherit;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.62;transition:opacity .2s ease,background .2s ease}
.langsw button[aria-pressed=true]{background:var(--blush);color:var(--blue-deep);opacity:1}
.langsw button:hover{opacity:1}

/* ---------- hero ---------- */
.hero{position:relative;min-height:calc(100svh - 30px);display:grid;grid-template-columns:minmax(420px,.82fr) 1.18fr;overflow:hidden;background:var(--blue-deep);isolation:isolate;color:var(--white)}
.hero__copy{position:relative;z-index:3;display:flex;flex-direction:column;justify-content:center;min-width:0;padding:10.4rem clamp(2rem,5vw,6.5rem) 3.8rem var(--pad);background:radial-gradient(circle at 14% 74%,rgba(124,142,184,.46),transparent 34%),var(--blue-deep)}
.hero__copy::after{content:"";position:absolute;top:12.4rem;right:0;bottom:3.8rem;width:1px;background:rgba(255,255,255,.2)}
.eyebrow,.kicker{margin-bottom:1.4rem;font-size:.72rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
.hero h1{margin:0 0 2.2rem;max-width:8ch;font-size:clamp(5.4rem,9vw,10.2rem);line-height:.76;letter-spacing:-.075em}
.hero h1 em{display:inline-block;margin-left:.62em;color:var(--blush);font-size:.92em}
.hero__lead{max-width:590px;margin-bottom:.85rem;font-family:var(--serif);font-size:clamp(1.4rem,2.2vw,2.15rem);line-height:1.16}
.hero__body{max-width:530px;margin-bottom:2.4rem;color:rgba(255,255,255,.76);font-size:1rem}
.hero__actions{display:flex;align-items:center;gap:2rem}
.button{display:inline-flex;align-items:center;justify-content:space-between;gap:1rem;min-width:190px;min-height:52px;padding:1rem 1.25rem;text-decoration:none;font-weight:700;border:0;transition:transform .22s ease,background .22s ease}
.button:hover{transform:translateY(-3px)}
.button--light{background:var(--blush);color:var(--blue-deep)}
.button--light:hover{background:var(--white)}
.button--ember{background:var(--ember);color:var(--white)}
.button--ember:hover{background:var(--ember-deep)}
.button--deep{background:var(--blue-deep);color:var(--white)}
.button--deep:hover{background:var(--ink)}
.text-link{display:inline-flex;gap:1.3rem;align-items:center;width:fit-content;padding-bottom:.35rem;border-bottom:1px solid currentColor;text-decoration:none;font-weight:600}
.text-link--light{color:var(--white)}
.hero__details{display:flex;gap:0;margin-top:auto;padding-top:2.3rem;border-top:1px solid rgba(255,255,255,.34);color:rgba(255,255,255,.78);font-size:.78rem}
.hero__details span{padding:0 1.3rem;border-right:1px solid rgba(255,255,255,.4)}
.hero__details span:first-child{padding-left:0}
.hero__details span:last-child{border-right:0}
.hero__visual{position:relative;min-width:0;overflow:hidden;background:#1b1c21}
.hero__visual::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(36,45,73,.34),transparent 35%),linear-gradient(0deg,rgba(8,8,12,.3),transparent 38%);pointer-events:none}
.hero__image{height:100%;object-fit:cover;object-position:58% center}
.hero__image-caption{position:absolute;z-index:2;right:clamp(1.5rem,4vw,4.5rem);bottom:3.8rem;display:flex;flex-direction:column;padding:1.15rem 1.4rem;border-left:1px solid rgba(255,255,255,.6);color:var(--white);font-family:var(--serif);font-style:italic}
.hero__image-caption span{font-size:.8rem}
.hero__image-caption strong{font-size:1.45rem;font-weight:400}

/* ---------- live åpent-status ---------- */
.status{display:inline-flex;align-items:center;gap:.55rem;margin-bottom:1.4rem;padding:.42rem .8rem;border:1px solid rgba(255,255,255,.4);font-size:.7rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;width:fit-content}
.status__dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--blue-soft)}
.status.is-open{border-color:rgba(224,102,47,.75);color:var(--ember-soft)}
.status.is-open .status__dot{background:var(--ember);box-shadow:0 0 0 0 rgba(224,102,47,.65);animation:pulse 2.6s ease-out infinite}
@keyframes pulse{70%{box-shadow:0 0 0 9px rgba(224,102,47,0)}100%{box-shadow:0 0 0 0 rgba(224,102,47,0)}}
.status__sub{font-weight:400;letter-spacing:.06em;opacity:.72;text-transform:none}

/* ---------- hamburger ---------- */
.menu-toggle{display:none;position:relative;width:44px;height:44px;padding:0;border:0;background:transparent;color:inherit}
.menu-toggle span{position:absolute;left:11px;width:22px;height:2px;background:currentColor;transition:transform .25s ease,opacity .25s ease}
.menu-toggle span:nth-child(1){top:16px}
.menu-toggle span:nth-child(2){top:22px}
.menu-toggle span:nth-child(3){top:28px}
.menu-toggle[aria-expanded=true] span:nth-child(1){top:22px;transform:rotate(45deg)}
.menu-toggle[aria-expanded=true] span:nth-child(2){opacity:0}
.menu-toggle[aria-expanded=true] span:nth-child(3){top:22px;transform:rotate(-45deg)}

/* ---------- ticker ---------- */
.ticker{overflow:hidden;background:var(--blush);border-bottom:1px solid var(--blue)}
.ticker__track{display:flex;align-items:center;width:max-content;animation:ticker 30s linear infinite;padding:1.35rem 0;color:var(--blue);font-family:var(--serif);font-size:clamp(1.2rem,2vw,2rem);font-style:italic}
.ticker__track span{padding:0 2rem}
.ticker__track i{font-size:.6rem;font-style:normal}
@keyframes ticker{to{transform:translateX(-50%)}}

/* ---------- generelt seksjonsoppsett ---------- */
.section{max-width:var(--max);margin:0 auto;padding:clamp(5rem,10vw,10rem) var(--pad)}
.section-index{padding-bottom:1.2rem;border-bottom:1px solid var(--line);color:var(--blue);font-size:.7rem;font-weight:700;letter-spacing:.17em;text-transform:uppercase}
.section-index--light{color:var(--blush);border-color:rgba(255,255,255,.25)}
.section-index--ember{color:var(--ember-soft);border-color:rgba(224,102,47,.34)}
.kicker{color:var(--blue)}
.kicker--light{color:var(--blush)}
.kicker--ember{color:var(--ember-soft)}

/* ---------- 01 Gi meg noe ---------- */
.gi{background:var(--blush-light);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.gi__inner{max-width:var(--max);margin:0 auto;padding:clamp(4.5rem,8vw,8rem) var(--pad)}
.gi__head{max-width:760px;margin-bottom:3rem}
.gi__head h2{margin-bottom:1.4rem;font-size:clamp(2.8rem,6vw,6rem)}
.gi__head p{margin:0;max-width:52ch;font-size:1.08rem;line-height:1.6;color:rgba(17,19,27,.74)}
.gi__choices{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--ink);border-left:1px solid var(--ink)}
.gi__choice{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:104px;padding:1.4rem 1.5rem;border:0;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);background:transparent;color:var(--ink);font-family:var(--serif);font-style:italic;font-size:clamp(1.25rem,2vw,1.7rem);text-align:left;line-height:1.1;transition:background .22s ease,color .22s ease}
.gi__choice i{font-style:normal;font-size:.85rem;opacity:.45;transition:opacity .22s ease,transform .22s ease}
.gi__choice:hover{background:var(--white)}
.gi__choice:hover i{opacity:1;transform:translateX(3px)}
.gi__choice[aria-pressed=true]{background:var(--blue-deep);color:var(--white)}
.gi__choice[aria-pressed=true] i{opacity:.8}
.gi__result{margin-top:2.5rem;min-height:210px;display:flex;align-items:center;padding:2.2rem 2.4rem;background:var(--white);border:1px solid var(--line)}
.gi__empty{margin:0;color:rgba(17,19,27,.42);font-family:var(--serif);font-style:italic;font-size:1.5rem}
.gi__card{display:grid;grid-template-columns:1fr auto;align-items:start;gap:2rem 3rem;width:100%}
.gi__prefix{margin:0 0 .5rem;color:var(--blue);font-size:.7rem;font-weight:700;letter-spacing:.17em;text-transform:uppercase}
.gi__name{margin:0 0 .55rem;font-size:clamp(2rem,4vw,3.4rem);letter-spacing:-.045em;line-height:.98}
.gi__desc{margin:0 0 .7rem;max-width:46ch;font-family:var(--serif);font-size:1.3rem;line-height:1.35;color:rgba(17,19,27,.8)}
.gi__allerg{display:block;color:var(--blue);font-size:.76rem}
.gi__side{display:flex;flex-direction:column;align-items:flex-end;gap:1.1rem;text-align:right}
.gi__price{font-family:var(--serif);font-size:2.4rem;line-height:1;white-space:nowrap}
.gi__actions{display:flex;flex-direction:column;align-items:flex-end;gap:.75rem}
.gi__again{padding:0 0 .3rem;border:0;border-bottom:1px solid currentColor;background:transparent;color:var(--blue);font-size:.85rem;font-weight:600}
.gi__again:hover{color:var(--ink)}
.gi--in{animation:giIn .42s cubic-bezier(.2,.7,.2,1)}
@keyframes giIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* ---------- 02 Ilden ---------- */
.ild{position:relative;background:var(--char);color:var(--white);overflow:hidden;isolation:isolate}
.ild::before{content:"";position:absolute;z-index:0;left:50%;bottom:-38%;width:min(1200px,140%);aspect-ratio:1;transform:translateX(-50%);background:radial-gradient(circle,rgba(224,102,47,.42) 0%,rgba(156,58,18,.2) 34%,transparent 66%);pointer-events:none}
.ild::after{content:"";position:absolute;z-index:0;right:-10%;top:-18%;width:min(760px,90%);aspect-ratio:1;background:radial-gradient(circle,rgba(224,102,47,.16),transparent 62%);pointer-events:none}
.ild__inner{position:relative;z-index:1;max-width:var(--max);margin:0 auto;padding:clamp(5rem,9vw,9rem) var(--pad)}
.ild__top{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,6vw,7rem);align-items:end;margin-bottom:clamp(3rem,6vw,5.5rem)}
.ild h2{margin-bottom:0;font-size:clamp(2.9rem,6.4vw,6.8rem)}
.ild h2 em{color:var(--ember-soft)}
.ild__body{margin:0 0 1.2rem;font-size:1.1rem;line-height:1.66;color:rgba(255,253,248,.76)}
.ild__body:last-child{margin-bottom:0}
.ild__body strong{color:var(--ember-soft);font-weight:400;font-family:var(--serif);font-style:italic}
.ild__facts{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(255,255,255,.22)}
.ild__fact{padding:1.6rem 2rem 1.8rem 0;border-right:1px solid rgba(255,255,255,.14)}
.ild__fact+.ild__fact{padding-left:2rem}
.ild__fact:last-child{border-right:0}
.ild__fact b{display:block;margin-bottom:.4rem;font-family:var(--serif);font-style:italic;font-size:1.55rem;font-weight:400;color:var(--ember-soft)}
.ild__fact span{font-size:.9rem;color:rgba(255,253,248,.6)}
.ild__dishes{margin-top:clamp(3rem,6vw,5rem)}
.ild__dishesTitle{margin:0 0 1.6rem;color:var(--ember-soft);font-size:.7rem;font-weight:700;letter-spacing:.17em;text-transform:uppercase}
.ild__dish{display:grid;grid-template-columns:minmax(190px,.32fr) 1fr;gap:1rem 2.5rem;padding:1.5rem 0;border-top:1px solid rgba(255,255,255,.16)}
.ild__dish:last-child{border-bottom:1px solid rgba(255,255,255,.16)}
.ild__dish h3{margin:0;font-family:var(--serif);font-style:italic;font-size:clamp(1.6rem,3vw,2.3rem);font-weight:400;letter-spacing:-.01em}
.ild__dish p{margin:0;align-self:center;font-size:1.02rem;line-height:1.55;color:rgba(255,253,248,.72)}

/* ---------- 03 Om oss ---------- */
.oss{background:var(--paper)}
.oss__inner{max-width:var(--max);margin:0 auto;padding:clamp(5rem,9vw,9rem) var(--pad);display:grid;grid-template-columns:1fr 4fr;gap:clamp(2rem,6vw,8rem)}
.oss__content{max-width:1120px}
.oss h2{margin-bottom:3rem;max-width:14ch}
.oss h2 em{color:var(--blue)}
.oss__text{display:grid;grid-template-columns:minmax(300px,600px) 1fr;gap:clamp(2rem,5vw,5rem);align-items:start}
.oss__text p{margin:0 0 1.2rem;font-size:1.14rem;line-height:1.66}
.oss__text p:last-child{margin-bottom:0}
.oss__quote{margin:0;padding-left:2rem;border-left:2px solid var(--blue)}
.oss__quote p{margin:0 0 1rem;font-family:var(--serif);font-style:italic;font-size:clamp(1.6rem,2.6vw,2.3rem);line-height:1.18;color:var(--blue-deep)}
.oss__quote cite{font-style:normal;font-size:.8rem;color:var(--blue);letter-spacing:.04em}

/* ---------- 04 Rommet ---------- */
.rom{background:var(--blue-deep);color:var(--white)}
.rom__split{display:grid;grid-template-columns:1.05fr .95fr;min-height:660px}
.rom__image{position:relative;overflow:hidden;min-height:340px}
.rom__image img{height:100%;object-fit:cover;object-position:53% center}
.image-label{position:absolute;left:2rem;bottom:2rem;padding:.7rem 1rem;background:var(--blush);color:var(--blue-deep);font-family:var(--serif);font-style:italic}
.rom__copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(3.5rem,6vw,7rem)}
.rom h2{margin-bottom:1.8rem;font-size:clamp(2.7rem,4.6vw,5.4rem)}
.rom h2 em{color:var(--blush)}
.rom__copy p{max-width:56ch;margin:0 0 1.1rem;color:rgba(255,253,248,.74);font-size:1.06rem;line-height:1.64}
.rom__copy p:last-of-type{margin-bottom:0}
.rom__stats{display:grid;grid-template-columns:repeat(3,1fr);max-width:var(--max);margin:0 auto;padding:0 var(--pad)}
.rom__stat{padding:2.4rem 2rem 2.6rem 0;border-top:1px solid rgba(255,255,255,.2);border-right:1px solid rgba(255,255,255,.14)}
.rom__stat+.rom__stat{padding-left:2rem}
.rom__stat:last-child{border-right:0}
.rom__stat b{display:block;font-family:var(--serif);font-size:clamp(2.6rem,5vw,4rem);font-weight:400;line-height:1;color:var(--blush)}
.rom__stat span{display:block;margin-top:.55rem;font-size:.88rem;color:rgba(255,253,248,.6)}
.rom__nabo{max-width:var(--max);margin:0 auto;padding:clamp(2.5rem,5vw,4rem) var(--pad) clamp(4rem,7vw,6rem);display:grid;grid-template-columns:minmax(220px,.4fr) 1fr;gap:1rem 3rem;align-items:start}
.rom__nabo h3{margin:0;font-family:var(--serif);font-style:italic;font-weight:400;font-size:clamp(1.5rem,2.6vw,2.1rem);color:var(--blush)}
.rom__nabo p{margin:0;max-width:60ch;color:rgba(255,253,248,.7);font-size:1.02rem;line-height:1.6}

/* ---------- 05 Menyen ---------- */
.menu-section{max-width:none;background:var(--blush-light);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.menu-intro,.menu-groups,.menu-foot{max-width:calc(var(--max) - var(--pad)*2);margin-left:auto;margin-right:auto}
.menu-intro{display:grid;grid-template-columns:1.1fr .7fr;align-items:end;gap:clamp(2rem,5vw,5rem);margin-bottom:4rem}
.menu-intro h2{margin-bottom:0}
.menu-intro>p{max-width:520px;margin:0;font-size:1.1rem;line-height:1.6}
.menu-group+.menu-group{margin-top:3.2rem}
.menu-group>h3{margin:0 0 .4rem;padding-bottom:1rem;border-bottom:1px solid var(--ink);font-family:var(--serif);font-style:italic;font-weight:400;font-size:1.7rem}
.menu-item{display:grid;grid-template-columns:1fr auto;gap:.4rem 2rem;padding:1.35rem 0;border-bottom:1px solid var(--line)}
.menu-item h4{margin:0 0 .2rem;font-size:clamp(1.2rem,1.9vw,1.55rem);font-weight:500;letter-spacing:-.03em}
.menu-item p{margin:0 0 .5rem;color:rgba(17,19,27,.72)}
.menu-item small{color:var(--blue);font-size:.78rem}
.menu-item strong{font-family:var(--serif);font-size:1.3rem;font-weight:400;white-space:nowrap}
.menu-foot{display:flex;justify-content:space-between;gap:2rem;padding-top:1.8rem;font-size:.8rem;color:rgba(17,19,27,.66)}
.menu-foot p{max-width:600px;margin:0}

/* ---------- 06 Baren ---------- */
.bar-section{display:grid;grid-template-columns:1.18fr .82fr;min-height:760px;background:var(--blue-deep);color:var(--white)}
.bar-section__image{position:relative;overflow:hidden;min-height:320px}
.bar-section__image img{height:100%;object-fit:cover;object-position:53% center}
.bar-section__copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(3.5rem,7vw,8rem)}
.bar-section .section-index--light{margin-bottom:clamp(2.4rem,5vw,5rem)}
.bar-section h2{margin-bottom:2rem;font-size:clamp(2.7rem,4.6vw,6rem)}
.bar-section__copy>p:not(.kicker){max-width:570px;margin:0 0 1.1rem;color:rgba(255,255,255,.74);font-size:1.06rem;line-height:1.64}
.bar-hours{display:grid;grid-template-columns:1fr auto;gap:.8rem 2rem;margin-top:2.8rem;padding-top:1.3rem;border-top:1px solid rgba(255,255,255,.3)}
.bar-hours span{color:rgba(255,255,255,.65)}

/* ---------- 07 Lørdagslunsj ---------- */
.lunsj{background:var(--blush)}
.lunsj__inner{max-width:var(--max);margin:0 auto;padding:clamp(3.5rem,6vw,5.5rem) var(--pad);display:grid;grid-template-columns:1fr auto;align-items:center;gap:2rem 4rem}
.lunsj h2{margin:0 0 .8rem;font-size:clamp(2.4rem,4.6vw,4.4rem);color:var(--blue-deep)}
.lunsj p{margin:0;max-width:54ch;color:rgba(32,43,74,.78);font-size:1.05rem;line-height:1.6}
.lunsj .kicker{color:var(--blue-deep);opacity:.72}

/* ---------- 08 Selskap ---------- */
.selskap{background:var(--ink);color:var(--white)}
.selskap__inner{max-width:var(--max);margin:0 auto;padding:clamp(5rem,9vw,9rem) var(--pad);display:grid;grid-template-columns:1fr 1fr;gap:clamp(2.5rem,6vw,7rem);align-items:end}
.selskap h2{margin:1.4rem 0 0;font-size:clamp(2.7rem,5.4vw,5.8rem)}
.selskap h2 em{color:var(--blush)}
.selskap p{margin:0 0 2rem;max-width:56ch;color:rgba(255,253,248,.74);font-size:1.08rem;line-height:1.66}
.selskap__note{margin:1.2rem 0 0;font-size:.85rem;color:rgba(255,253,248,.5)}

/* ---------- 09 FAQ ---------- */
.faq{background:var(--paper)}
.faq__inner{max-width:var(--max);margin:0 auto;padding:clamp(4.5rem,8vw,8rem) var(--pad)}
.faq h2{margin:1.4rem 0 3rem;max-width:16ch}
.faq details{border-top:1px solid var(--line)}
.faq details:last-of-type{border-bottom:1px solid var(--line)}
.faq summary{display:flex;align-items:center;justify-content:space-between;gap:2rem;padding:1.5rem 0;cursor:pointer;list-style:none;font-size:clamp(1.05rem,1.7vw,1.3rem);font-weight:500}
.faq summary::-webkit-details-marker{display:none}
.faq summary .pm{flex:none;color:var(--blue);font-size:1.3rem;line-height:1;transition:transform .25s ease}
.faq details[open] summary .pm{transform:rotate(45deg)}
.faq .a{padding:0 0 1.6rem;max-width:70ch;color:rgba(17,19,27,.72);font-size:1.02rem;line-height:1.66}

/* ---------- 10 Besøk ---------- */
.visit{background:var(--paper)}
.visit__inner{max-width:var(--max);margin:0 auto;padding:0 var(--pad) clamp(5rem,9vw,9rem);display:grid;grid-template-columns:1fr 4fr;gap:clamp(2rem,6vw,8rem)}
.visit__headline{grid-column:2}
.visit h2{margin:1.4rem 0 3.4rem}
.visit h2 em{color:var(--blue)}
.visit__grid{grid-column:2;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink)}
.visit__grid>div{min-height:250px;padding:1.5rem 2rem 1.5rem 0;border-right:1px solid var(--line)}
.visit__grid>div+div{padding-left:2rem}
.visit__grid>div:last-child{border-right:0}
.visit__label{color:var(--blue);font-size:.68rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
.visit__grid p{margin:1.4rem 0 1.8rem;font-family:var(--serif);font-size:1.32rem;line-height:1.5}
.visit__grid p a{text-decoration:none;border-bottom:1px solid var(--line)}
.visit__stemning{grid-column:2;margin:2.6rem 0 0;max-width:62ch;font-family:var(--serif);font-style:italic;font-size:clamp(1.2rem,2vw,1.6rem);line-height:1.35;color:var(--blue)}

/* ---------- footer ---------- */
footer{display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:2rem;padding:3rem var(--pad);background:var(--blush);color:var(--blue-deep)}
footer img{width:46px;height:auto}
footer p{margin-bottom:0}
.footer__concept{max-width:440px;text-align:right;font-size:.72rem;opacity:.64}

/* ---------- fast bookinglinje på mobil ---------- */
.bookbar{position:fixed;z-index:25;left:0;right:0;bottom:0;display:none;padding:.7rem var(--pad) calc(.7rem + env(safe-area-inset-bottom));background:var(--blue-deep);border-top:1px solid rgba(255,255,255,.2)}
.bookbar .button{width:100%;min-height:50px}

/* ---------- responsivt ---------- */
@media (max-width:1080px){
  .gi__choices{grid-template-columns:repeat(2,1fr)}
  .ild__top{grid-template-columns:1fr;gap:2rem;align-items:start}
  .oss__text{grid-template-columns:1fr;gap:2.2rem}
  .selskap__inner{grid-template-columns:1fr;align-items:start}
}
@media (max-width:980px){
  .hero{grid-template-columns:1fr;grid-template-rows:minmax(340px,48svh) auto;min-height:calc(100svh - 30px)}
  .hero__copy{grid-row:2;min-height:0;padding:4rem var(--pad) 2.5rem}
  .hero__copy::after{display:none}
  .hero__visual{grid-row:1;height:auto}
  .hero__image{object-position:62% 58%}
  .oss__inner,.visit__inner{grid-template-columns:1fr}
  .visit__headline,.visit__grid,.visit__stemning{grid-column:1}
  .rom__split,.bar-section{grid-template-columns:1fr}
  .rom__image{height:520px}
  .bar-section__image{height:520px}
  .rom__nabo{grid-template-columns:1fr;gap:.8rem}
  .menu-intro{grid-template-columns:1fr;gap:1.4rem}
  .lunsj__inner{grid-template-columns:1fr}
}
@media (max-width:720px){
  :root{--pad:1.25rem}
  h2{font-size:clamp(2.75rem,13vw,4rem);line-height:.98}
  .concept-bar{min-height:32px;padding:.35rem .75rem;font-size:.56rem;letter-spacing:.11em;white-space:nowrap}
  .concept-bar__note{display:none}
  .site-header{top:32px;height:76px;padding:0 var(--pad);border-bottom-color:rgba(255,255,255,.38)}
  .site-header nav{display:none}
  .brand{width:auto;height:50px}
  .brand img{width:auto;height:100%}
  .head-right{gap:.7rem}
  .langsw button{min-width:34px;min-height:32px;font-size:.62rem}
  .menu-toggle{display:block}
  .mobile-nav{display:flex;position:fixed;z-index:19;inset:32px 0 0;flex-direction:column;justify-content:center;gap:1.6rem;padding:6.5rem var(--pad) 2rem;background:radial-gradient(circle at 85% 80%,rgba(114,129,170,.46),transparent 36%),var(--blue-deep);color:var(--white);font-size:2rem;font-family:var(--serif);font-style:italic}
  .mobile-nav[hidden]{display:none}
  .mobile-nav a{text-decoration:none}
  .hero{grid-template-rows:clamp(235px,35svh,315px) auto;min-height:calc(100svh - 32px)}
  .hero__copy{grid-row:2;justify-content:flex-start;padding:2.15rem var(--pad) 1.4rem;background:radial-gradient(circle at 100% 100%,rgba(114,129,170,.42),transparent 38%),var(--blue-deep)}
  .hero__visual{grid-row:1;height:auto}
  .hero__visual::after{background:linear-gradient(180deg,rgba(11,13,20,.08) 45%,rgba(36,45,73,.65) 100%),linear-gradient(90deg,rgba(15,18,29,.22),transparent 58%)}
  .hero__image{object-position:64% 61%}
  .eyebrow,.kicker{margin-bottom:.85rem;font-size:.66rem;letter-spacing:.18em}
  .status{margin-bottom:1rem;padding:.35rem .65rem;font-size:.62rem}
  .hero h1{margin-bottom:1.25rem;font-size:clamp(4.25rem,20vw,5.7rem);line-height:.76}
  .hero h1 em{margin-left:.36em}
  .hero__lead{max-width:21rem;margin-bottom:.65rem;font-size:1.22rem;line-height:1.18}
  .hero__body{max-width:22rem;margin-bottom:1.45rem;font-size:.94rem;line-height:1.5}
  .hero__actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1.15rem;align-items:center}
  .button{min-width:0;padding:.9rem 1rem}
  .text-link{gap:.7rem;white-space:nowrap}
  .hero__details{display:grid;grid-template-columns:1.28fr .8fr 1fr;margin-top:1.65rem;padding-top:1rem;font-size:.68rem}
  .hero__details span{min-width:0;padding:0 .65rem;line-height:1.35}
  .hero__details span:first-child{padding-left:0}
  .hero__image-caption{right:1.25rem;bottom:1.15rem;padding:.7rem .85rem}
  .hero__image-caption span{font-size:.68rem}
  .hero__image-caption strong{font-size:1.15rem}
  .ticker__track{padding:.85rem 0;font-size:1.08rem}
  .ticker__track span{padding:0 1.2rem}
  .section{padding-top:4.5rem;padding-bottom:4.5rem}
  .section-index{padding-bottom:.8rem;font-size:.64rem}
  .gi__choices{grid-template-columns:1fr;border-left:0}
  .gi__choice{min-height:78px;padding:1.1rem 0;border-right:0}
  .gi__result{margin-top:1.8rem;padding:1.5rem 1.35rem;min-height:0}
  .gi__card{grid-template-columns:1fr;gap:1.4rem}
  .gi__side{align-items:flex-start;text-align:left}
  .gi__actions{align-items:flex-start}
  .gi__price{font-size:2rem}
  .gi__desc{font-size:1.12rem}
  .ild__facts{grid-template-columns:1fr}
  .ild__fact,.ild__fact+.ild__fact{padding:1.2rem 0;border-right:0;border-bottom:1px solid rgba(255,255,255,.14)}
  .ild__dish{grid-template-columns:1fr;gap:.5rem;padding:1.2rem 0}
  .oss__quote{padding-left:1.2rem}
  .rom__image,.bar-section__image{height:auto;min-height:0;aspect-ratio:4/3;max-width:100%}
  .rom__stats{grid-template-columns:1fr}
  .rom__stat,.rom__stat+.rom__stat{padding:1.4rem 0;border-right:0}
  .rom__stat:first-child{border-top:1px solid rgba(255,255,255,.2)}
  .rom__stat+.rom__stat{border-top:1px solid rgba(255,255,255,.14)}
  .rom__copy,.bar-section__copy{padding:3.5rem var(--pad)}
  .menu-item{grid-template-columns:1fr auto}
  .menu-item small{display:block;line-height:1.4}
  .menu-foot{flex-direction:column;gap:.45rem;padding-top:1.25rem}
  .visit__grid{grid-template-columns:1fr}
  .visit__grid>div,.visit__grid>div+div{min-height:0;padding:1.5rem 0;border-right:0;border-bottom:1px solid var(--line)}
  .visit__grid>div:last-child{border-bottom:0}
  .visit__grid p{margin:1rem 0 1.2rem;font-size:1.18rem}
  footer{grid-template-columns:auto 1fr;gap:1rem 1.25rem;padding-top:2.25rem;padding-bottom:2.25rem}
  footer img{width:38px}
  footer>p:not(.footer__concept){font-size:.88rem}
  .footer__concept{grid-column:1/-1;max-width:30rem;text-align:left}
  .bookbar{display:block}
  body{padding-bottom:72px}
}
@media (max-width:390px){
  .hero h1{font-size:clamp(3.9rem,19vw,4.7rem)}
  .hero__body{display:none}
  .hero__details{grid-template-columns:1.25fr .75fr 1fr;font-size:.64rem}
  .hero__details span{padding:0 .45rem}
}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .ticker__track{animation:none}
  .status.is-open .status__dot{animation:none}
  .gi--in{animation:none}
  .button:hover{transform:none}
}
`;
