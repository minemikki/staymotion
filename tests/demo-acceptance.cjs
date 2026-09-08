const {chromium,devices}=require('playwright-core');const S=(process.env.SHOTS||'/tmp');
const MOCK_SR=`
window.__srQueue=[];
class MockSR{constructor(){this.lang='';this.continuous=false;this.interimResults=false;}
 start(){const self=this;setTimeout(()=>{self.onstart&&self.onstart();},30);
  const say=window.__srQueue.shift()||'';const words=say.split(' ');let i=0;
  self._t=setInterval(()=>{ if(i<words.length){i++;const part=words.slice(0,i).join(' ');
     self.onresult&&self.onresult({resultIndex:0,results:[Object.assign([{transcript:part}],{isFinal:false})]});}
   else{clearInterval(self._t);self.onresult&&self.onresult({resultIndex:0,results:[Object.assign([{transcript:say}],{isFinal:true})]});} },40);}
 stop(){clearInterval(this._t);const self=this;setTimeout(()=>self.onend&&self.onend(),20);}
 abort(){this.stop();}}
window.SpeechRecognition=MockSR;window.webkitSpeechRecognition=MockSR;`;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const errors=[];const results=[];
function ok(name,cond,extra){results.push((cond?'PASS ':'FAIL ')+name+(extra?' — '+extra:''));}
async function newPage(vp,mobile){const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,isMobile:!!mobile,hasTouch:!!mobile,userAgent:mobile?devices['iPhone 13'].userAgent:undefined});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push('PAGEERROR '+e.message));p.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text());});
 await p.addInitScript(MOCK_SR);await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());return p;}
const shot=(p,n)=>p.screenshot({path:S+'/'+n+'.jpg',type:'jpeg',quality:82});

// ---- MOBILE 390x844
let p=await newPage({width:390,height:844},true);
await p.goto('http://127.0.0.1:8090/app.html?role=employee');await p.waitForTimeout(600);
await shot(p,'m-employee');
// 1. complete a task
await p.click('[data-task="temp"] .check');await p.waitForTimeout(300);
ok('1 complete task → count 1', (await p.textContent('#taskCount'))==='1');
await shot(p,'m-employee-task');
// 2. open capture
await p.click('#openVoice');await p.waitForTimeout(500);ok('2 sheet opens', await p.isVisible('#captureModal .sheet'));
await shot(p,'m-capture-idle');
// 3. simple issue
await p.evaluate(()=>window.__srQueue.push('Oppvaskmaskinen virker ikke'));
await p.click('#orb');await p.waitForTimeout(250);await shot(p,'m-capture-listening');await p.waitForTimeout(500);
await p.click('#orb');await p.waitForTimeout(400);
const tr1=await p.textContent('#transcript');ok('3 transcript appears', /Oppvaskmaskinen virker ikke/.test(tr1), tr1);
ok('3b one issue', (await p.$$('.issue')).length===1);
await shot(p,'m-capture-one');
// 4./5. two-issue sentence
await p.click('#retake');await p.waitForTimeout(200);
await p.evaluate(()=>window.__srQueue.push('Det lekker vann fra fryseboksen og den står på 1 grad.'));
await p.click('#orb');await p.waitForTimeout(1200);await p.click('#orb');await p.waitForTimeout(400);
const issues=await p.$$eval('.issue .ttl strong',els=>els.map(e=>e.textContent));
ok('5 two separate issues', issues.length===2, JSON.stringify(issues));
const types=await p.$$eval('.issue .type',els=>els.map(e=>e.textContent.trim()));
ok('5b types Vedlikehold + Temperaturavvik', types.join('|').includes('Vedlikehold')&&types.join('|').includes('Temperaturavvik'), types.join('|'));
await shot(p,'m-capture-two');
// 6. edit / remove / confirm safely
ok('6a Registrer begge disabled until confirmation', await p.isDisabled('#confirmAll'));
await p.click('[data-edit]');await p.waitForTimeout(200);await shot(p,'m-capture-edit');
await p.fill('.issue input[data-f="equipment"]','Fryseboks 2');await p.click('[data-save]');await p.waitForTimeout(250);
ok('6b edit saved', (await p.textContent('.issue .fields'))?.includes('Fryseboks 2'));
await p.check('[data-chk]');await p.waitForTimeout(250);ok('6c confirm enabled after checkbox', !(await p.isDisabled('#confirmAll')));
// register one individually
await p.click('.issue:nth-child(2) [data-one]');await p.waitForTimeout(300);
ok('6d individual register → 1 confirmed', (await p.$$('.issue.confirmed')).length===1);
await shot(p,'m-capture-partial');
await p.click('#confirmAll');await p.waitForTimeout(500);
ok('6e success visible', await p.isVisible('#successPane'));
ok('6e2 summary lists 2', (await p.$$('#successSummary .sumrow')).length===2);
await shot(p,'m-capture-success');
await p.click('#doneBtn');await p.waitForTimeout(300);
// remove flow
await p.evaluate(()=>window.__staymotion.openModal('voice'));await p.evaluate(()=>window.__srQueue.push('Det lekker vann fra fryseboksen og den står på 1 grad.'));
await p.click('#orb');await p.waitForTimeout(1200);await p.click('#orb');await p.waitForTimeout(400);
await p.click('.issue:nth-child(1) [data-remove]');await p.waitForTimeout(400);
ok('6f remove leaves 1', (await p.$$('.issue')).length===1);
await p.click('#closeModal');await p.waitForTimeout(200);
// 7./8. camera + speech
await p.click('#openCamera');await p.waitForTimeout(300);
await p.setInputFiles('#cameraInput','img/statement-room.jpg');await p.waitForTimeout(400);
ok('7 photo visible', await p.isVisible('#photo img'));ok('7b demo note visible', await p.isVisible('#photoNote'));
await shot(p,'m-photo');
await p.evaluate(()=>window.__srQueue.push('Den lekker her, og displayet viser 1 grad.'));
await p.click('#orb');await p.waitForTimeout(1000);await p.click('#orb');await p.waitForTimeout(400);
ok('8 photo coexists with issues', (await p.isVisible('#photo img')) && (await p.$$('.issue')).length===2);
await shot(p,'m-photo-issues');
await p.check('[data-chk]');await p.click('#confirmAll');await p.waitForTimeout(400);
ok('8b photo in summary', (await p.textContent('#successSummary'))?.includes('Bilde'));
await shot(p,'m-photo-success');
// 10. chrome/safe-area: rolebar bottom within viewport, topbar sticky
const rb=await p.$eval('.rolebar',e=>e.getBoundingClientRect().bottom);ok('10 rolebar inside viewport', rb<=844, String(rb));
await p.click('#closeModal');
// 9. manager & chain mobile
await p.click('[data-switch="manager"]');await p.waitForTimeout(500);await shot(p,'m-manager');
await p.click('[data-decide]');await p.waitForTimeout(300);await shot(p,'m-manager-decided');
await p.click('[data-switch="chain"]');await p.waitForTimeout(500);await shot(p,'m-chain');
await p.click('#askChips .chip');await p.waitForTimeout(300);ok('9 ask answers', await p.isVisible('#askAnswer.on'));
// horizontal overflow check
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);ok('10b no horizontal overflow', !ov);
await p.close();

// ---- 11. small iPhone SE 375x667 long result scroll
p=await newPage({width:375,height:667},true);
await p.goto('http://127.0.0.1:8090/app.html?role=employee');await p.waitForTimeout(400);
await p.click('#openCamera');await p.setInputFiles('#cameraInput','img/statement-room.jpg');await p.waitForTimeout(300);
await p.evaluate(()=>window.__srQueue.push('Det lekker vann fra fryseboksen på kjøkkenet og den står på 1 grad og oppvaskmaskinen virker ikke og vi mangler to kasser cola og det lukter mugg på lageret'));
await p.click('#orb');await p.waitForTimeout(2200);await p.click('#orb');await p.waitForTimeout(500);
const n=(await p.$$('.issue')).length;
const sc=await p.$eval('#sheetBody',e=>({sh:e.scrollHeight,ch:e.clientHeight}));
ok('11 long result scrolls inside sheet', sc.sh>sc.ch, JSON.stringify(sc)+' issues='+n);
const footVisible=await p.$eval('#sheetFoot',e=>{const r=e.getBoundingClientRect();return r.bottom<=window.innerHeight&&r.top>0;});ok('11b footer stays visible', footVisible);
await shot(p,'se-long-top');await p.$eval('#sheetBody',e=>e.scrollTop=e.scrollHeight);await p.waitForTimeout(200);await shot(p,'se-long-bottom');
await p.close();

// ---- DESKTOP 1440x900
p=await newPage({width:1440,height:900},false);
for(const r of ['employee','manager','chain']){await p.goto('http://127.0.0.1:8090/app.html?role='+r);await p.waitForTimeout(500);await shot(p,'d-'+r);}
await p.goto('http://127.0.0.1:8090/app.html?role=employee');await p.click('#openVoice');await p.evaluate(()=>window.__srQueue.push('Det lekker vann fra fryseboksen og den står på 1 grad.'));
await p.click('#orb');await p.waitForTimeout(1200);await p.click('#orb');await p.waitForTimeout(400);await shot(p,'d-capture-two');
// typed fallback
await p.click('#retake');await p.click('#toggleType');await p.fill('#typeInput','Kjøleskapet står på 9 grader');await p.click('#typeGo');await p.waitForTimeout(300);
ok('typed fallback works', (await p.$$('.issue')).length===1);
await p.close();
// reduced motion sanity
p=await newPage({width:390,height:844},true);await p.emulateMedia({reducedMotion:'reduce'});await p.goto('http://127.0.0.1:8090/app.html');await p.waitForTimeout(300);ok('reduced-motion loads', await p.isVisible('#employee'));await p.close();
await b.close();
console.log(results.join('\n'));console.log('\nERRORS:',errors.length?errors.join('\n'):'none');
})().catch(e=>{console.error(e);process.exit(1)});
