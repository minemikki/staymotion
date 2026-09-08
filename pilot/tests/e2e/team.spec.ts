import { expect, test } from '@playwright/test';

/** Team / access flow in local mode. Real Supabase authorization is enforced by migrations 0004–0005. */
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
});

test('manager can open Team and add an employee with employee as the safe default role', async ({ page }) => {
  await page.goto('/signin');
  await page.getByTestId('persona-location_manager').first().click();
  await expect(page).toHaveURL(/\/manager/);

  await page.getByRole('link', { name: 'Team' }).first().click();
  await expect(page).toHaveURL(/\/team/);
  await expect(page.getByRole('heading', { name: 'Riktige folk. Riktig tilgang.' })).toBeVisible();

  await expect(page.getByTestId('team-role')).toHaveValue('employee');
  await page.getByTestId('team-name').fill('Nora Test');
  await page.getByTestId('team-email').fill('nora@example.no');
  await page.getByTestId('team-add').click();

  await expect(page.getByText('Nora Test')).toBeVisible();
  await expect(page.getByText(/Ansatt · nora@example\.no/)).toBeVisible();
});

test('employee cannot navigate directly to Team', async ({ page }) => {
  await page.goto('/signin');
  await page.getByTestId('persona-employee').first().click();
  await expect(page).toHaveURL(/\/employee/);

  await page.goto('/team');
  await expect(page).toHaveURL(/\/employee/);
  await expect(page.getByRole('link', { name: 'Team' })).toHaveCount(0);
});
