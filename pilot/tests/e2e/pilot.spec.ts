import { expect, test, type Page } from '@playwright/test';

/**
 * StayMotion pilot — critical flows (mega prompt §15).
 * Runs against the local/demo DataProvider (NEXT_PUBLIC_STAYMOTION_MODE=local), so every test
 * starts from a fresh seeded tenant (fresh browser context ⇒ fresh localStorage).
 */

const SENTENCE = 'Det lekker vann fra fryseboksen og den står på 1 grad.';

// A tiny 1×1 PNG used for photo attachment tests.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');

// Deterministic SpeechRecognition stand-in: emits window.__speechText as one final result.
const SPEECH_MOCK = `
  class FakeSR {
    constructor(){ this.lang=''; this.continuous=false; this.interimResults=false; this.onstart=null; this.onend=null; this.onerror=null; this.onresult=null; }
    start(){ setTimeout(()=>{
      if (window.__speechDeny) { this.onerror && this.onerror({ error: 'not-allowed' }); this.onend && this.onend(); return; }
      this.onstart && this.onstart();
      const text = window.__speechText || '';
      setTimeout(()=>{ this.onresult && this.onresult({ resultIndex:0, results:[{ isFinal:false, 0:{ transcript: text.slice(0, 12) } }] }); }, 40);
      setTimeout(()=>{ this.onresult && this.onresult({ resultIndex:0, results:[{ isFinal:true, 0:{ transcript: text }, length:1 }] }); }, 120);
    }, 10); }
    stop(){ /* handle calls onEnd itself */ }
    abort(){}
  }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = FakeSR;
`;

const errors: Record<string, string[]> = {};
test.beforeEach(async ({ page }, info) => {
  errors[info.testId] = [];
  page.on('pageerror', (e) => errors[info.testId].push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|fonts\.g|net::ERR|ERR_/.test(t)) return; // blocked network in sandbox (Google Fonts)
    errors[info.testId].push(t);
  });
  await page.addInitScript(SPEECH_MOCK);
  // Sandboxed CI has no outbound network: fail font requests fast instead of letting them hang page load.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});
test.afterEach(async ({}, info) => {
  expect(errors[info.testId] ?? [], 'no console/page errors in normal flows').toEqual([]);
});

async function signIn(page: Page, role: 'employee' | 'location_manager' | 'owner' | 'shift_lead') {
  await page.goto('/signin');
  await page.getByTestId(`persona-${role}`).first().click();
  await page.waitForURL(/\/(employee|manager|hq)/);
}
/** Speak into the Signal on Employee Today: tap starts, tap stops → analysis → confirmation panel. */
async function speak(page: Page, text: string) {
  await page.evaluate((t) => { (window as unknown as { __speechText: string }).__speechText = t; }, text);
  await page.getByTestId('open-voice').click();
  await expect(page.getByTestId('open-voice')).toHaveAttribute('data-state', /listening|pressed/);
  await expect(page.getByTestId('live')).toContainText(text); // wait for the final result, not just the interim words
  await page.getByTestId('open-voice').click(); // stop → analyze
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('found')).toBeVisible();
}
/** Typed fallback on Employee Today (inline under the Signal). */
async function typeReport(page: Page, text: string) {
  await page.getByTestId('signal-type-toggle').click();
  await page.getByTestId('signal-type-input').fill(text);
  await page.getByTestId('signal-type-go').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('found')).toBeVisible();
}
/** Typed input inside the Capture sheet (camera flow). */
async function typeInSheet(page: Page, text: string) {
  await page.getByTestId('toggle-type').click();
  await page.getByTestId('type-input').fill(text);
  await page.getByTestId('type-go').click();
  await expect(page.getByTestId('found')).toBeVisible();
}

/** Registers one plain (non-confirmation) incident as the employee, then signs in as the manager. */
async function employeeReportsThenManager(page: Page, text: string) {
  await signIn(page, 'employee');
  await typeReport(page, text);
  await page.getByTestId('confirm-all').click();
  await expect(page.getByTestId('success')).toBeVisible();
  await page.goto('/signin'); await page.getByTestId('persona-location_manager').click();
  await expect(page.getByTestId('needs')).toBeVisible();
}

test('01 demo/local sign-in lands each persona on its home', async ({ page }) => {
  await signIn(page, 'employee'); await expect(page).toHaveURL(/\/employee/);
  await expect(page.getByTestId('state')).toBeVisible();
  await page.goto('/signin'); await page.getByTestId('persona-location_manager').click(); await expect(page).toHaveURL(/\/manager/);
  await page.goto('/signin'); await page.getByTestId('persona-owner').click(); await expect(page).toHaveURL(/\/hq/);
});

test('02 onboarding creates organization + location and lands the owner on manager home', async ({ page }) => {
  await page.goto('/signin');
  await page.getByTestId('start-onboarding').click();
  await page.getByTestId('org-name').fill('Bryggen Café');
  await page.getByTestId('owner-name').fill('Kari Test');
  await page.getByTestId('ob-next').click();
  await page.getByTestId('loc-name').fill('Bergen sentrum');
  await page.getByTestId('ob-next').click(); // departments (pre-filled)
  await page.getByTestId('ob-next').click(); // routines (pre-filled)
  await page.getByTestId('ob-next').click(); // people
  await page.getByTestId('emp-name').fill('Ola Ansatt');
  await page.getByTestId('emp-add').click();
  await page.getByTestId('ob-finish').click();
  await expect(page).toHaveURL(/\/manager\?welcome=1/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Velkommen, Kari');
  await expect(page.getByText('Bryggen Café').locator('visible=true').first()).toBeVisible();
  // the new org is selectable on the sign-in screen next time
  await page.goto('/signin');
  await expect(page.getByText('Bryggen Café')).toBeVisible();
});

test('03 employee sees tasks from the provider and a completed task persists across reload', async ({ page }) => {
  await signIn(page, 'employee');
  const tasks = page.getByTestId('task');
  await expect(tasks.first()).toBeVisible();
  const before = await tasks.count();
  expect(before).toBeGreaterThan(0);
  const done = page.locator('[data-testid="task"] button[aria-pressed="true"]');
  const doneBefore = await done.count();
  const countBefore = await page.getByTestId('task-count').textContent();
  await page.locator('[data-testid="task"] button[aria-pressed="false"]').first().click(); // done tasks move to the end of the list
  await expect(done).toHaveCount(doneBefore + 1);
  await expect(page.getByTestId('task-count')).toHaveText(String(Number(countBefore) - 1));
  await page.reload();
  await expect(page.getByTestId('task').first()).toBeVisible();
  await expect(page.locator('[data-testid="task"] button[aria-pressed="true"]')).toHaveCount(doneBefore + 1);
});

test('04 typed Capture with one issue proposes a single incident', async ({ page }) => {
  await signIn(page, 'employee');
  await typeReport(page, 'Oppvaskmaskinen virker ikke');
  await expect(page.getByTestId('issue')).toHaveCount(1);
  await expect(page.getByTestId('issue')).toContainText('Oppvaskmaskin');
});

test('05 the proven sentence becomes two separate issues (voice mocked)', async ({ page }) => {
  await signIn(page, 'employee');
  await speak(page, SENTENCE);
  await expect(page.getByTestId('found')).toContainText('to ting');
  const issues = page.getByTestId('issue');
  await expect(issues).toHaveCount(2);
  await expect(issues.nth(0)).toContainText('Vannlekkasje');
  await expect(issues.nth(0)).toContainText('Varsle vedlikehold');
  await expect(issues.nth(1)).toContainText('Temperatur');
  await expect(issues.nth(1)).toContainText('1 °C');
  await expect(page.getByTestId('transcript')).toContainText(SENTENCE);
});

test('06 an issue can be edited before registration', async ({ page }) => {
  await signIn(page, 'employee');
  await typeReport(page, SENTENCE);
  await page.getByTestId('issue').first().getByTestId('edit').click();
  await page.getByTestId('edit-equipment').fill('Fryser 2');
  await page.getByTestId('save-edit').click();
  await expect(page.getByTestId('issue').first()).toContainText('Fryser 2');
});

test('07 an incorrect issue can be removed', async ({ page }) => {
  await signIn(page, 'employee');
  await typeReport(page, SENTENCE);
  await page.getByTestId('issue').first().getByTestId('remove').click();
  await expect(page.getByTestId('issue')).toHaveCount(1);
  await expect(page.getByTestId('found')).toContainText('én ting');
});

test('08 compliance-critical issues require explicit confirmation before registration', async ({ page }) => {
  await signIn(page, 'employee');
  await typeReport(page, 'Kjøleskapet står på 9 grader');
  await expect(page.getByTestId('confirm-all')).toBeDisabled();
  await page.getByTestId('confirm-check').check();
  await expect(page.getByTestId('confirm-all')).toBeEnabled();
});

test('09 registration succeeds and shows a success state with both issues', async ({ page }) => {
  await signIn(page, 'employee');
  await typeReport(page, SENTENCE);
  await page.getByTestId('confirm-check').check();
  await page.getByTestId('confirm-all').click();
  await expect(page.getByTestId('success')).toBeVisible();
  await expect(page.getByTestId('success')).toContainText('Begge er registrert');
  await expect(page.getByTestId('success').locator('.sumrow')).toHaveCount(2);
  await page.getByTestId('done').click();
  await expect(page.getByTestId('mine')).toContainText('Vannlekkasje');
});

test('10 issues can be registered individually', async ({ page }) => {
  await signIn(page, 'employee');
  await typeReport(page, SENTENCE);
  await page.getByTestId('issue').first().getByTestId('register-one').click();
  await expect(page.getByTestId('issue').first()).toContainText('Registrert');
  await expect(page.getByTestId('confirm-all')).toContainText('Registrer');
  await page.getByTestId('confirm-check').check();
  await page.getByTestId('confirm-all').click();
  await expect(page.getByTestId('success')).toBeVisible();
});

test('11 manager sees the incidents the employee just registered', async ({ page }) => {
  await signIn(page, 'employee');
  await typeReport(page, 'Oppvaskmaskinen virker ikke');
  await page.getByTestId('confirm-all').click();
  await expect(page.getByTestId('success')).toBeVisible();
  await page.goto('/signin'); await page.getByTestId('persona-location_manager').click();
  await expect(page.getByTestId('needs')).toContainText('Oppvaskmaskin');
});

test('12 acknowledge persists after refresh', async ({ page }) => {
  await employeeReportsThenManager(page, 'Oppvaskmaskinen virker ikke');
  const acks = page.getByTestId('ack');
  await expect(acks.first()).toBeVisible();
  const before = await acks.count();
  expect(before).toBeGreaterThan(0);
  await acks.first().click();
  await expect(acks).toHaveCount(before - 1);
  await page.reload();
  await expect(page.getByTestId('ack')).toHaveCount(before - 1);
});

test('13 resolve persists after refresh and updates the calm state', async ({ page }) => {
  await employeeReportsThenManager(page, 'Lampen over disken er ødelagt');
  const items = page.getByTestId('need-item');
  await expect(items.first()).toBeVisible();
  const before = await items.count();
  await page.getByTestId('resolve').first().click();
  await expect(items).toHaveCount(before - 1);
  await page.reload();
  await expect(page.getByTestId('calm')).toBeVisible();
  await expect(page.getByTestId('need-item')).toHaveCount(before - 1);
});

test('14 HQ aggregates locations, points at the outlier and answers from real data', async ({ page }) => {
  await signIn(page, 'owner');
  await expect(page.getByTestId('loc')).toHaveCount(2);
  await expect(page.getByTestId('insight')).toBeVisible();
  await page.getByRole('button', { name: 'Hvilken lokasjon har høyest risiko?' }).click();
  await expect(page.getByTestId('answer')).toContainText(/Bergen|Stavanger/);
});

test('15 photo + typed context registers with the image attached', async ({ page }) => {
  await signIn(page, 'employee');
  await page.getByTestId('open-camera').click();
  await page.getByTestId('camera-input').setInputFiles({ name: 'fryser.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByTestId('photo')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Bildet følger saken'); // honest: no computer vision claimed
  await typeInSheet(page, 'Den lekker her, og displayet viser 1 grad.');
  await expect(page.getByTestId('issue')).toHaveCount(2);
  await expect(page.getByTestId('issue').first()).toContainText('Se vedlagt bilde');
  await page.getByTestId('confirm-check').check();
  await page.getByTestId('confirm-all').click();
  await expect(page.getByTestId('success')).toContainText('Bilde lagt ved');
});

test('16 role gating: employee cannot open manager or HQ views', async ({ page }) => {
  await signIn(page, 'employee');
  await page.goto('/manager'); await expect(page).toHaveURL(/\/employee/);
  await page.goto('/hq'); await expect(page).toHaveURL(/\/employee/);
  await page.goto('/signin'); await page.getByTestId('persona-location_manager').click();
  await page.goto('/hq'); await expect(page).toHaveURL(/\/manager/);
});

test('17 no session → redirected to sign-in', async ({ page }) => {
  await page.goto('/employee'); await expect(page).toHaveURL(/\/signin/);
  await page.goto('/'); await expect(page).toHaveURL(/\/signin/);
});

test('18 mobile 390×844: no horizontal overflow on any view', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone-13', 'viewport-specific');
  for (const role of ['employee', 'location_manager', 'owner'] as const) {
    await signIn(page, role);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, `${role} overflow`).toBeLessThanOrEqual(0);
  }
  await page.screenshot({ path: `test-results/shots/${info.project.name}-hq.png` });
});

test('19 small iPhone 375×667: capture sheet scrolls and footer actions stay reachable', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone-se', 'viewport-specific');
  await signIn(page, 'employee');
  await typeReport(page, SENTENCE);
  const body = page.getByTestId('sheet-body');
  const scrollable = await body.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(scrollable).toBe(true);
  await page.getByTestId('confirm-all').scrollIntoViewIfNeeded();
  const box = await page.getByTestId('confirm-all').boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(667);
  await expect(page.getByTestId('confirm-all')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-capture.png` });
});

test('20 desktop 1440×900: sidebar navigation and manager view', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'viewport-specific');
  await signIn(page, 'owner');
  await expect(page.getByRole('complementary', { name: 'Meny' })).toBeVisible();
  await page.getByRole('complementary', { name: 'Meny' }).getByRole('link', { name: 'Oversikt' }).click();
  await expect(page).toHaveURL(/\/manager/);
  await expect(page.getByTestId('calm')).toBeVisible();
  await page.screenshot({ path: `test-results/shots/${info.project.name}-manager.png`, fullPage: true });
});

test('21 touch targets: primary controls are at least 44px tall on mobile', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'mobile-only');
  await signIn(page, 'employee');
  for (const id of ['open-voice', 'open-camera']) {
    const b = await page.getByTestId(id).boundingBox();
    expect(b?.height ?? 0, id).toBeGreaterThanOrEqual(44);
  }
  const check = await page.getByTestId('task').first().getByRole('button').boundingBox();
  expect(check?.height ?? 0).toBeGreaterThanOrEqual(40);
});

test('22 reduced-motion mode: the full capture flow still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await signIn(page, 'employee');
  await speak(page, 'Fryseren står på minus 20 grader');
  await expect(page.getByTestId('issue')).toHaveCount(1);
  await page.getByTestId('confirm-check').check();
  await page.getByTestId('confirm-all').click();
  await expect(page.getByTestId('success')).toBeVisible();
});

test('23 microphone denied → inline typed fallback, page stays usable', async ({ page }) => {
  await page.addInitScript(() => { (window as unknown as { __speechDeny: boolean }).__speechDeny = true; });
  await signIn(page, 'employee');
  await page.getByTestId('open-voice').click();
  await expect(page.getByTestId('open-voice')).toHaveAttribute('data-state', 'error');
  await expect(page.getByTestId('signal-type-input')).toBeVisible();
  await expect(page.getByTestId('task').first()).toBeVisible(); // rest of the page still works
  await page.getByTestId('signal-type-input').fill('Oppvaskmaskinen virker ikke');
  await page.getByTestId('signal-type-go').click();
  await expect(page.getByTestId('found')).toBeVisible();
});

test('24 empty transcript → calm hint, no panel, back to idle', async ({ page }) => {
  await signIn(page, 'employee');
  await page.evaluate(() => { (window as unknown as { __speechText: string }).__speechText = ''; });
  await page.getByTestId('open-voice').click();
  await expect(page.getByTestId('open-voice')).toHaveAttribute('data-state', /listening|pressed/);
  await page.getByTestId('open-voice').click();
  await expect(page.getByTestId('open-voice')).toHaveAttribute('data-state', 'idle');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/hørte ikke nok/)).toBeVisible();
});

test('25 sent state after registration, then back to idle', async ({ page }) => {
  await signIn(page, 'employee');
  await typeReport(page, 'Oppvaskmaskinen virker ikke');
  await page.getByTestId('confirm-all').click();
  await expect(page.getByTestId('success')).toBeVisible();
  await page.getByTestId('done').click();
  await expect(page.getByTestId('open-voice')).toHaveAttribute('data-state', 'sent');
  await expect(page.getByText('Lederen får beskjed')).toBeVisible();
});
