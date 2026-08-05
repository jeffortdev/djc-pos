import { test, expect } from '@playwright/test';

test('load POS page and verify key components', async ({ page }) => {
  await page.goto('/pos');

  await expect(page.getByText('Order')).toBeVisible();
  await expect(page.getByText('Services')).toBeVisible();
  await page.getByText('Products').click();
  await expect(page.getByText('Order')).toBeVisible();
});

test('load dashboard page and validate KPI cards', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByText('Cash in Register')).toBeVisible();
  await expect(page.locator('.kpi-label', { hasText: 'Revenue' })).toBeVisible();
  await page.getByRole('button', { name: 'Week' }).click();
  await page.getByRole('button', { name: 'Month' }).click();
  await expect(page.getByText('Sales Summary')).toBeVisible();
});

test('load transactions page and switch tabs', async ({ page }) => {
  await page.goto('/transactions');

  await expect(page.getByText('Sales')).toBeVisible();
  await expect(page.getByText('Cash')).toBeVisible();
  const cashButton = page.locator('ion-segment-button[value="cash"]');
  await cashButton.click({ force: true });
  await expect(cashButton).toHaveClass(/segment-button-checked/);
});

test('reports page requires admin PIN before showing report data', async ({ page }) => {
  await page.goto('/reports');

  const pinAlert = page.locator('ion-alert').last();
  await expect(pinAlert.getByText('Admin PIN Required')).toBeVisible();

  // Wrong PIN shows an error and keeps the PIN alert open for another attempt
  await pinAlert.locator('input[type="password"]').fill('0000');
  await pinAlert.getByRole('button', { name: 'OK' }).click();
  const errorAlert = page.locator('ion-alert').last();
  await expect(errorAlert.getByText('Incorrect PIN')).toBeVisible();
  await errorAlert.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('ion-alert').last().getByText('Admin PIN Required')).toBeVisible();

  // Cancelling redirects away instead of allowing access
  await page.locator('ion-alert').last().getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/pos$/);
});

test('load reports page and show custom date filter inputs after correct PIN', async ({ page }) => {
  await page.goto('/reports');

  const pinAlert = page.locator('ion-alert').last();
  await expect(pinAlert.getByText('Admin PIN Required')).toBeVisible();
  await pinAlert.locator('input[type="password"]').fill('1234');
  await pinAlert.getByRole('button', { name: 'OK' }).click();

  await expect(page.getByText('Today')).toBeVisible();
  await expect(page.locator('ion-segment-button[value="custom"] ion-label')).toBeVisible();
  const customButton = page.locator('ion-segment-button[value="custom"]');
  await customButton.click({ force: true });
  await expect(customButton).toHaveClass(/segment-button-checked/);
  await expect(page.locator('input[type="date"]').first()).toBeVisible();
  await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
});

test('load settings page and navigate directly to admin pages (PIN enforced on destination)', async ({ page }) => {
  await page.goto('/settings');

  await expect(page.getByText('Manage Services')).toBeVisible();
  await expect(page.getByText('Manage Products')).toBeVisible();
  await expect(page.getByText('Manage Customers')).toBeVisible();

  await page.getByText('Manage Services').click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.locator('ion-alert').last().getByText('Admin PIN Required')).toBeVisible();
});

test('services page requires admin PIN; wrong PIN keeps it locked, correct PIN unlocks it', async ({ page }) => {
  await page.goto('/services');

  const alert = page.locator('ion-alert').last();
  await expect(alert.getByText('Admin PIN Required')).toBeVisible();
  await alert.locator('input[type="password"]').fill('0000');
  await alert.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('ion-alert').last().getByText('Incorrect PIN')).toBeVisible();
  await page.locator('ion-alert').last().getByRole('button', { name: 'OK' }).click();

  const retryAlert = page.locator('ion-alert').last();
  await expect(retryAlert.getByText('Admin PIN Required')).toBeVisible();
  await retryAlert.locator('input[type="password"]').fill('1234');
  await retryAlert.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByPlaceholder('Filter services…')).toBeVisible();
});

test('products page requires admin PIN; correct PIN reveals product list', async ({ page }) => {
  await page.goto('/products');

  const alert = page.locator('ion-alert').last();
  await expect(alert.getByText('Admin PIN Required')).toBeVisible();
  await alert.locator('input[type="password"]').fill('1234');
  await alert.getByRole('button', { name: 'OK' }).click();

  await expect(page.getByPlaceholder('Filter products…')).toBeVisible();
});

test('load customers-admin page and filter the customer list', async ({ page }) => {
  await page.goto('/customers');

  const alert = page.locator('ion-alert').last();
  await expect(alert.getByText('Admin PIN Required')).toBeVisible();
  await alert.locator('input[type="password"]').fill('1234');
  await alert.getByRole('button', { name: 'OK' }).click();

  await expect(page.getByText(/All Customers/)).toBeVisible();
  const search = page.getByPlaceholder('Search by name or phone…');
  await expect(search).toBeVisible();
  await search.fill('zzz-no-such-customer');
  await expect(page.getByText('No customers match your search.')).toBeVisible();
});

test('cancelling the admin PIN prompt redirects to /pos for every protected route', async ({ page }) => {
  for (const route of ['/services', '/products', '/customers']) {
    await page.goto(route);
    const alert = page.locator('ion-alert').last();
    await expect(alert.getByText('Admin PIN Required')).toBeVisible();
    await alert.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/pos$/);
  }
});
