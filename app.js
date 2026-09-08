/* StayMotion demo — behaviour.
 * Roles, tasks, capture sheet (speech + photo → proposed issues), manager
 * decisions, HQ "Spør StayMotion". Parsing lives in capture-parse.js.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- toast ---------------- */
  var toastEl = $('toast'), toastT = null;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  /* ---------------- roles ---------------- */
  var views = $$('.view');
  var ROLE_META = {
    employee: { name: 'Jonas', role: 'Kjøkkenmedarbeider', where: 'Sabi Sushi · Stavanger' },
    manager: { name: 'Emma', role: 'Restaurantsjef', where: 'Sabi Sushi · Stavanger' },
    chain: { name: 'Henrik', role: 'Driftsdirektør', where: 'Sabi Sushi · 12 lokasjoner' }
  };
  function showRole(r, keepScroll) {
    if (!ROLE_META[r]) r = 'employee';
    views.forEach(function (v) { v.classList.toggle('on', v.id === r); });
    $$('[data-switch]').forEach(function (b) { b.classList.toggle('on', b.dataset.switch === r); b.setAttribute('aria-current', b.dataset.switch === r ? 'page' : 'false'); });
    $$('[data-role]').forEach(function (b) { b.classList.toggle('on', b.dataset.role === r); });
    $('meName').textContent = ROLE_META[r].name; $('meRole').textContent = ROLE_META[r].role; $('whereTop').textContent = ROLE_META[r].where;
    if (!keepScroll) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', '?role=' + r); } catch (e) {}
  }
  $$('[data-switch]').forEach(function (b) { b.addEventListener('click', function () { showRole(b.dataset.switch); }); });
  $$('[data-role]').forEach(function (b) { b.addEventListener('click', function () { showRole(b.dataset.role); }); });
  showRole((new URLSearchParams(location.search).get('role')) || 'employee', true);

  /* ---------------- employee tasks ---------------- */
  var tasks = $$('[data-task]');
  function updateTaskState() {
    var left = tasks.filter(function (t) { return !t.classList.contains('done'); }).length;
    $('taskCount').textContent = left;
    var title = $('stateTitle'), sub = $('stateSub'), card = $('stateCard');
    if (left === 0) { title.textContent = 'Alt er gjort.'; sub.textContent = 'Ha en fin vakt. StayMotion sier fra hvis noe dukker opp.'; card.classList.add('alldone'); }
    else if (left === 1) { title.textContent = 'Nesten klar.'; sub.textContent = 'Én ting igjen før åpning.'; card.classList.remove('alldone'); }
    else { title.textContent = 'Du er klar.'; sub.textContent = 'Bare ' + (left === 2 ? 'to' : left) + ' ting før åpning.'; card.classList.remove('alldone'); }
  }
  tasks.forEach(function (t) {
    var c = t.querySelector('.check');
    c.addEventListener('click', function () {
      var done = t.classList.toggle('done');
      c.textContent = done ? '✓' : ''; c.setAttribute('aria-pressed', done ? 'true' : 'false');
      updateTaskState();
      if (done) toast(t.dataset.task === 'temp' ? 'Logget i temperaturkontroll' : 'Merket som gjort');
    });
  });

  /* ---------------- manager decisions ---------------- */
  $$('[data-decide]').forEach(function (b) {
    b.addEventListener('click', function () {
      var item = b.closest('.need-i'); item.classList.add('handled');
      item.querySelector('.handledtag').textContent = '✓ ' + b.dataset.decide;
      var open = $$('.need-i:not(.handled)').length;
      $('needCount').textContent = open ? (open + (open === 1 ? ' sak' : ' saker')) : 'Ingenting akkurat nå';
      $('needCountText').textContent = open === 0 ? 'Ingenting' : (open === 1 ? 'Én sak' : open + ' saker');
      if (open === 0) { $('calmTitle').textContent = 'Alt er håndtert.'; }
      toast('StayMotion følger opp videre');
    });
  });

  /* ---------------- HQ ask ---------------- */
  var ANSWERS = [
    [/risiko|risk|oppmerksom|verst|dårligst/, 'Bergen har høyest driftsrisiko akkurat nå (78). Sju kjøleavvik på 30 dager mot 2,5 i snitt, og to enheter står for nesten alt. Én sak venter på beslutning: servicebesøk på kjøledisk 1.'],
    [/opplær|kurs|sertif|hms-kurs|mangler/, 'Fire ansatte mangler obligatorisk opplæring: to i Bergen (allergener), én i Oslo (brannvern) og én i Trondheim (alkoholhåndtering). StayMotion har sendt påminnelse og frist er fredag.'],
    [/vedlikehold|åpne|7 dager|sju dager|lenge/, 'Tre vedlikeholdssaker har vært åpne over sju dager: avtrekk i Bergen (11 d), oppvaskmaskin i Oslo (9 d) og dørlås på lager i Sandnes (8 d). Alle er purret to ganger. Bergen-saken bør eskaleres.'],
    [/kjøl|frys|temperatur/, 'Kjøleavvik er konsentrert i Bergen (7) og Stavanger (2). Mønsteret er natt til mandag etter fullt lager. Anbefalt: servicebesøk på Bergen kjøledisk 1 og ny kjølerutine søndag kveld.'],
    [/leveran|leverandør|mangler kasser/, 'Samme leverandør har levert mangelfullt sju ganger på 30 dager, alltid mandag, i tre lokasjoner. En samlet leverandørsak med dokumentasjon ligger klar til sending.'],
    [/best|flink|god/, 'Stavanger (97) og Sandnes (95) ligger øverst. Begge har fullført åpningsrutinene før plan hver dag de siste to ukene.']
  ];
  function ask(q) {
    var a = $('askAnswer'); var text = (q || '').trim();
    if (!text) { a.innerHTML = '<b>Prøv for eksempel</b>«Hvilken lokasjon har høyest risiko?»'; a.classList.add('on'); return; }
    var hit = ANSWERS.filter(function (p) { return p[0].test(text.toLowerCase()); })[0];
    a.innerHTML = '<b>StayMotion</b>' + (hit ? hit[1] : 'Jeg har ikke nok data til å svare sikkert på det ennå. Spør gjerne om risiko, opplæring, vedlikehold, kjøl eller leveranser.');
    a.classList.add('on');
  }
  $('askForm').addEventListener('submit', function (e) { e.preventDefault(); ask($('askInput').value); });
  $$('#askChips .chip').forEach(function (c) { c.addEventListener('click', function () { $('askInput').value = c.dataset.q; ask(c.dataset.q); }); });

  /* ================= CAPTURE ================= */
  var modal = $('captureModal'), body = $('sheetBody'), foot = $('sheetFoot');
  var orb = $('orb'), liveWords = $('liveWords'), statusEl = $('captureStatus'), hintEl = $('captureHint'), bars = $('bars');
  var recPane = $('recPane'), flow = $('flow'), successPane = $('successPane'), transcriptEl = $('transcript'), issuesBox = $('issues');
  var photoBox = $('photo'), photoImg = $('photoImg'), photoNote = $('photoNote'), cameraInput = $('cameraInput');
  var typePane = $('typePane'), typeInput = $('typeInput');

  var state = { mode: 'voice', listening: false, finalText: '', interimText: '', photoUrl: null, issues: [], editing: {}, registered: false };
  var recognition = null, fallbackStream = null, recorder = null, lastFocus = null;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setStep(step, title) { $('sheetStep').textContent = step; $('sheetTitle').textContent = title; }
  function setFoot(html) { foot.innerHTML = html || ''; }
  function scrollBodyTop() { body.scrollTop = 0; }

  function openModal(mode) {
    state = { mode: mode || 'voice', listening: false, finalText: '', interimText: '', photoUrl: null, issues: [], editing: {}, registered: false };
    lastFocus = document.activeElement;
    modal.classList.add('on'); document.body.style.overflow = 'hidden'; modal.querySelector('.sheet').classList.remove('done');
    photoBox.classList.add('hidden'); photoNote.classList.add('hidden'); flow.classList.add('hidden'); successPane.classList.add('hidden'); recPane.classList.remove('hidden'); typePane.classList.add('hidden'); bars.classList.add('hidden');
    orb.classList.remove('listening'); orb.setAttribute('aria-pressed', 'false');
    liveWords.textContent = 'Det du sier vises her …'; liveWords.classList.add('empty');
    setFoot('');
    if (state.mode === 'camera') {
      setStep('Rapporter med bilde', 'Ta eller velg et bilde');
      statusEl.textContent = 'Legg ved et bilde først'; hintEl.textContent = 'Etterpå kan du fortelle hva du ser.';
      cameraInput.value = ''; cameraInput.click();
    } else {
      setStep('Fortell StayMotion', 'Hva har skjedd?');
      statusEl.textContent = 'Trykk for å starte'; hintEl.textContent = 'Snakk naturlig. Du trenger ikke fylle ut et skjema.';
    }
    scrollBodyTop();
    setTimeout(function () { orb.focus({ preventScroll: true }); }, 50);
  }
  function closeModal() {
    stopListening(true);
    modal.classList.remove('on'); document.body.style.overflow = '';
    if (state.photoUrl) { try { URL.revokeObjectURL(state.photoUrl); } catch (e) {} }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  $('openVoice').addEventListener('click', function () { openModal('voice'); });
  $('openCamera').addEventListener('click', function () { openModal('camera'); });
  $('closeModal').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('on')) closeModal(); });

  /* ---- live transcript ---- */
  function renderLive() {
    var f = state.finalText.trim(), i = state.interimText.trim();
    if (!f && !i) { liveWords.textContent = state.listening ? 'Lytter …' : 'Det du sier vises her …'; liveWords.classList.add('empty'); return; }
    liveWords.classList.remove('empty');
    liveWords.innerHTML = escapeHtml(f) + (i ? ' <span class="interim">' + escapeHtml(i) + '</span>' : '');
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---- speech ---- */
  function startListening() {
    if (state.listening) return;
    state.finalText = ''; state.interimText = '';
    if (SR) {
      recognition = new SR();
      recognition.lang = 'nb-NO'; recognition.continuous = true; recognition.interimResults = true;
      recognition.onstart = function () { onListenStart(); };
      recognition.onresult = function (e) {
        state.interimText = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var txt = e.results[i][0].transcript;
          if (e.results[i].isFinal) state.finalText += (state.finalText ? ' ' : '') + txt.trim(); else state.interimText += txt;
        }
        renderLive();
      };
      recognition.onerror = function (e) {
        if (e.error === 'aborted') return;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { state.listening = false; orbOff(); statusEl.textContent = 'Mikrofonen er ikke tillatt'; hintEl.textContent = 'Gi tilgang i nettleseren, eller skriv i stedet.'; showTypePane(); return; }
        statusEl.textContent = 'Prøv igjen'; hintEl.textContent = 'Talegjenkjenningen stoppet. Trykk for å starte på nytt.';
      };
      recognition.onend = function () { if (state.listening) finishListening(); };
      try { recognition.start(); } catch (e) { startFallbackRecording(); }
    } else startFallbackRecording();
  }
  async function startFallbackRecording() {
    try {
      fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(fallbackStream); recorder.start();
      onListenStart();
      liveWords.textContent = 'Lyd tas opp. Talegjenkjenning støttes ikke i denne nettleseren — skriv gjerne teksten under.'; liveWords.classList.remove('empty');
      showTypePane();
    } catch (e) {
      statusEl.textContent = 'Mikrofon kunne ikke åpnes'; hintEl.textContent = 'Skriv hva som har skjedd i stedet.'; showTypePane();
    }
  }
  function onListenStart() {
    state.listening = true; orb.classList.add('listening'); orb.setAttribute('aria-pressed', 'true'); orb.setAttribute('aria-label', 'Stopp opptak');
    bars.classList.remove('hidden'); statusEl.textContent = 'Lytter …'; hintEl.textContent = 'Trykk igjen når du er ferdig.'; renderLive();
  }
  function orbOff() { orb.classList.remove('listening'); orb.setAttribute('aria-pressed', 'false'); orb.setAttribute('aria-label', 'Start opptak'); bars.classList.add('hidden'); }
  function teardownAudio() {
    if (recognition) { try { recognition.onend = null; recognition.stop(); } catch (e) {} recognition = null; }
    if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch (e) {} } recorder = null;
    if (fallbackStream) { fallbackStream.getTracks().forEach(function (t) { t.stop(); }); fallbackStream = null; }
  }
  function finishListening() {
    state.listening = false; orbOff(); teardownAudio();
    var text = (state.finalText || state.interimText).trim();
    if (text) presentIssues(text);
    else { statusEl.textContent = 'Jeg hørte ikke nok'; hintEl.textContent = 'Prøv igjen og snakk litt nærmere telefonen, eller skriv i stedet.'; renderLive(); }
  }
  function stopListening(silent) {
    if (!state.listening) { teardownAudio(); return; }
    state.listening = false; orbOff(); teardownAudio();
    if (!silent) { var text = (state.finalText || state.interimText).trim(); if (text) presentIssues(text); }
  }
  orb.addEventListener('click', function () { state.listening ? finishListening() : startListening(); });

  /* ---- typed fallback ---- */
  function showTypePane() { typePane.classList.remove('hidden'); $('toggleType').textContent = 'Skjul tekstfelt'; }
  $('toggleType').addEventListener('click', function () {
    var hidden = typePane.classList.toggle('hidden');
    $('toggleType').textContent = hidden ? 'Skriv i stedet' : 'Skjul tekstfelt';
    if (!hidden) typeInput.focus();
  });
  $('typeGo').addEventListener('click', function () { var t = typeInput.value.trim(); if (!t) { typeInput.focus(); return; } stopListening(true); presentIssues(t); });
  typeInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('typeGo').click(); } });

  /* ---- photo ---- */
  cameraInput.addEventListener('change', function () {
    var file = cameraInput.files && cameraInput.files[0]; if (!file) return;
    if (!modal.classList.contains('on')) openModal('camera');
    if (state.photoUrl) { try { URL.revokeObjectURL(state.photoUrl); } catch (e) {} }
    state.photoUrl = URL.createObjectURL(file);
    photoImg.src = state.photoUrl; photoBox.classList.remove('hidden'); photoNote.classList.remove('hidden');
    setStep('Rapporter med bilde', 'Fortell hva du ser');
    statusEl.textContent = 'Bildet er lagt ved'; hintEl.textContent = 'Trykk og fortell hva som er galt — f.eks. «Den lekker her, og displayet viser 1 grad».';
    if (!flow.classList.contains('hidden')) renderIssues(); // photo added after proposals: keep them
    setFoot('<button class="btn ghost" id="photoOnly" type="button">Send bare bildet</button>');
    $('photoOnly').addEventListener('click', function () { presentIssues(''); });
    scrollBodyTop();
  });
  $('removePhoto').addEventListener('click', function () {
    if (state.photoUrl) { try { URL.revokeObjectURL(state.photoUrl); } catch (e) {} }
    state.photoUrl = null; photoBox.classList.add('hidden'); photoNote.classList.add('hidden');
    if (flow.classList.contains('hidden')) { setFoot(''); statusEl.textContent = 'Trykk for å starte'; hintEl.textContent = 'Snakk naturlig. Du trenger ikke fylle ut et skjema.'; }
    else renderIssues();
  });

  /* ---- proposals ---- */
  function presentIssues(text) {
    var parsed = window.StayMotionParse.parseReport(text, { hasPhoto: !!state.photoUrl });
    state.issues = parsed.issues.map(function (x) { x.confirmed = false; x.checked = false; return x; });
    state.editing = {}; state.registered = false;
    transcriptEl.textContent = parsed.transcript; transcriptEl.contentEditable = 'false';
    $('parserTag').textContent = parsed.source === 'local-rules' ? 'demo · regler' : 'StayMotion AI';
    recPane.classList.add('hidden'); successPane.classList.add('hidden'); flow.classList.remove('hidden');
    document.querySelector('.understood').classList.toggle('hidden', !parsed.transcript);
    transcriptEl.classList.toggle('hidden', !parsed.transcript); document.querySelector('.tools').classList.toggle('hidden', !parsed.transcript);
    setStep(state.photoUrl ? 'Bilde + tale' : 'Fortell StayMotion', 'Sjekk før du registrerer');
    renderIssues(); scrollBodyTop();
  }

  var LABEL = { equipment: 'Utstyr / område', measure: 'Måling', action: 'Oppfølging', title: 'Hva' };
  function renderIssues() {
    var arr = state.issues, n = arr.length, open = arr.filter(function (x) { return !x.confirmed; });
    $('issueHeading').textContent = n === 0 ? 'Ingen saker igjen' : n === 1 ? 'Jeg fant én ting' : 'Jeg fant ' + (n === 2 ? 'to' : n) + ' ting';
    if (!n) { issuesBox.innerHTML = '<div class="emptyissues">Ingen forslag. <button class="linkbtn" id="againEmpty" type="button">Snakk igjen</button></div>'; setFoot(''); var ae = $('againEmpty'); if (ae) ae.addEventListener('click', retake); return; }
    issuesBox.innerHTML = arr.map(function (x, i) {
      var ed = !!state.editing[x.id];
      var unsure = x.confidence !== 'high' ? '<span class="unsure" title="Usikker tolkning">◔ sjekk</span>' : '';
      var field = function (k, v) {
        return '<div class="field' + (k === 'action' ? ' wide' : '') + '"><label>' + LABEL[k] + '</label>' +
          (ed ? '<input data-f="' + k + '" data-id="' + x.id + '" value="' + escapeHtml(v || '') + '" aria-label="' + LABEL[k] + '">' :
            '<b>' + escapeHtml(v || '—') + (k === 'equipment' ? unsure : '') + '</b>') + '</div>';
      };
      var confirmRow = x.critical && !x.confirmed ? '<label class="confirmrow req"><input type="checkbox" data-chk="' + x.id + '"' + (x.checked ? ' checked' : '') + '> ' +
        (x.cls === 'temperature' ? 'Jeg bekrefter at målingen er lest av på enheten' : 'Jeg bekrefter at dette er riktig') + '</label>' : '';
      return '<article class="issue' + (x.confirmed ? ' confirmed' : '') + '" data-issue="' + x.id + '">' +
        '<div class="top"><span class="n" aria-hidden="true">' + (i + 1) + '</span><div class="ttl">' +
          (ed ? '<div class="field"><label>Hva</label><input data-f="title" data-id="' + x.id + '" value="' + escapeHtml(x.title) + '" aria-label="Hva"></div>' : '<strong>' + escapeHtml(x.title) + '</strong>') +
          '<div class="type ' + x.cls + '"><span class="dot" aria-hidden="true"></span>' + escapeHtml(x.type) + '</div></div></div>' +
        '<div class="fields">' + field('equipment', x.equipment) + field('measure', x.measure) + field('action', x.action) + '</div>' +
        confirmRow +
        '<div class="donestrip">✓ Registrert · ' + escapeHtml(x.action) + '</div>' +
        '<div class="acts">' +
          (ed ? '<button class="btn sm primary" data-save="' + x.id + '" type="button">Lagre</button>' : '<button class="btn sm soft" data-edit="' + x.id + '" type="button">Endre</button>') +
          '<button class="btn sm danger" data-remove="' + x.id + '" type="button">Fjern</button><span class="spacer"></span>' +
          (n > 1 ? '<button class="btn sm ghost" data-one="' + x.id + '" type="button"' + (x.critical && !x.checked ? ' disabled' : '') + '>Registrer denne</button>' : '') +
        '</div></article>';
    }).join('');
    // footer
    var needChk = open.some(function (x) { return x.critical && !x.checked; });
    if (state.registered) setFoot('');
    else setFoot('<button class="btn ghost" id="cancelAll" type="button">Avbryt</button><button class="btn primary" id="confirmAll" type="button"' + (needChk || !open.length ? ' disabled' : '') + '>' +
      (open.length > 1 ? 'Registrer ' + (open.length === 2 && n === 2 ? 'begge' : 'alle ' + open.length) : 'Registrer') + '</button>');
    var ca = $('confirmAll'); if (ca) ca.addEventListener('click', function () { registerIssues(open.map(function (x) { return x.id; })); });
    var cc = $('cancelAll'); if (cc) cc.addEventListener('click', closeModal);
    // wire card actions
    $$('[data-edit]', issuesBox).forEach(function (b) { b.addEventListener('click', function () { state.editing[b.dataset.edit] = true; renderIssues(); var f = issuesBox.querySelector('input[data-id="' + b.dataset.edit + '"]'); if (f) f.focus(); }); });
    $$('[data-save]', issuesBox).forEach(function (b) { b.addEventListener('click', function () { saveEdits(b.dataset.save); }); });
    $$('[data-remove]', issuesBox).forEach(function (b) { b.addEventListener('click', function () { removeIssue(b.dataset.remove); }); });
    $$('[data-one]', issuesBox).forEach(function (b) { b.addEventListener('click', function () { registerIssues([b.dataset.one]); }); });
    $$('[data-chk]', issuesBox).forEach(function (c) { c.addEventListener('change', function () { var x = byId(c.dataset.chk); if (x) x.checked = c.checked; renderIssues(); }); });
    $$('input[data-f]', issuesBox).forEach(function (inp) { inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveEdits(inp.dataset.id); } }); });
  }
  function byId(id) { return state.issues.filter(function (x) { return x.id === id; })[0]; }
  function saveEdits(id) {
    var x = byId(id); if (!x) return;
    $$('input[data-id="' + id + '"]', issuesBox).forEach(function (inp) { var v = inp.value.trim(); x[inp.dataset.f] = v || (inp.dataset.f === 'measure' ? null : x[inp.dataset.f]); });
    delete state.editing[id]; renderIssues(); toast('Endringen er lagret');
  }
  function removeIssue(id) {
    var el = issuesBox.querySelector('[data-issue="' + id + '"]');
    var done = function () { state.issues = state.issues.filter(function (x) { return x.id !== id; }); delete state.editing[id]; renderIssues(); toast('Forslaget er fjernet'); };
    if (el && !reduce) { el.classList.add('removing'); setTimeout(done, 220); } else done();
  }
  function registerIssues(ids) {
    var now = new Date(), hh = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    ids.forEach(function (id) { var x = byId(id); if (x) { x.confirmed = true; x.at = hh; } });
    var left = state.issues.filter(function (x) { return !x.confirmed; });
    if (left.length) { renderIssues(); toast('Registrert. ' + left.length + ' igjen å sjekke.'); return; }
    // all done → success state that keeps context (transcript + photo stay above)
    state.registered = true;
    var reg = state.issues.filter(function (x) { return x.confirmed; });
    flow.classList.add('hidden'); successPane.classList.remove('hidden'); modal.querySelector('.sheet').classList.add('done');
    setStep('Ferdig', 'Takk, det er registrert');
    $('successTitle').textContent = reg.length > 1 ? (reg.length === 2 ? 'Begge er registrert.' : reg.length + ' saker er registrert.') : 'Registrert.';
    $('successText').textContent = reg.length > 1 ? 'Hver sak er sendt til riktig oppfølging. Du trenger ikke gjøre mer.' : 'Saken er sendt til riktig oppfølging. Du trenger ikke gjøre mer.';
    $('successSummary').innerHTML = reg.map(function (x) {
      return '<div class="sumrow"><span class="type ' + x.cls + '">' + escapeHtml(x.type) + '</span><div><b>' + escapeHtml(x.title) + '</b><div class="small">' + escapeHtml(x.equipment) + (x.measure ? ' · ' + escapeHtml(x.measure) : '') + ' → ' + escapeHtml(x.action) + '</div></div><span class="at">' + x.at + '</span></div>';
    }).join('') + (state.photoUrl ? '<div class="sumrow"><span class="type">Bilde</span><div><b>Bilde lagt ved</b><div class="small">Følger saken til den som skal fikse det</div></div><span class="at"></span></div>' : '');
    setFoot('<button class="btn ghost" id="another" type="button">Ny rapport</button><button class="btn primary" id="doneBtn" type="button">Ferdig</button>');
    $('another').addEventListener('click', function () { var m = state.mode; closeModal(); openModal(m === 'camera' ? 'voice' : m); });
    $('doneBtn').addEventListener('click', closeModal);
    scrollBodyTop();
    if (navigator.vibrate && !reduce) { try { navigator.vibrate(12); } catch (e) {} }
  }

  /* ---- transcript editing / retake ---- */
  $('editTranscript').addEventListener('click', function () {
    if (transcriptEl.contentEditable === 'true') { transcriptEl.contentEditable = 'false'; $('editTranscript').textContent = 'Rediger teksten'; presentIssues(transcriptEl.textContent.trim()); toast('Tolket på nytt'); return; }
    transcriptEl.contentEditable = 'true'; transcriptEl.focus(); $('editTranscript').textContent = 'Tolk på nytt';
    var r = document.createRange(); r.selectNodeContents(transcriptEl); r.collapse(false); var s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  transcriptEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' && transcriptEl.contentEditable === 'true') { e.preventDefault(); $('editTranscript').click(); } });
  function retake() {
    modal.querySelector('.sheet').classList.remove('done');
    flow.classList.add('hidden'); successPane.classList.add('hidden'); recPane.classList.remove('hidden');
    state.finalText = ''; state.interimText = ''; state.issues = []; renderLive();
    setStep(state.photoUrl ? 'Bilde + tale' : 'Fortell StayMotion', state.photoUrl ? 'Fortell hva du ser' : 'Hva har skjedd?');
    statusEl.textContent = 'Trykk for å starte'; hintEl.textContent = 'Snakk naturlig. Du trenger ikke fylle ut et skjema.';
    setFoot(state.photoUrl ? '<button class="btn ghost" id="photoOnly2" type="button">Send bare bildet</button>' : '');
    var po = $('photoOnly2'); if (po) po.addEventListener('click', function () { presentIssues(''); });
    scrollBodyTop(); orb.focus({ preventScroll: true });
  }
  $('retake').addEventListener('click', retake);

  // expose a tiny hook for automated demos/tests (not used by the UI)
  window.__staymotion = { presentIssues: presentIssues, openModal: openModal, state: function () { return state; } };
})();
