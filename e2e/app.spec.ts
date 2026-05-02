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

test('load reports page and show custom date filter inputs', async ({ page }) => {
  await page.goto('/reports');

  await expect(page.getByText('Today')).toBeVisible();
  await expect(page.getByText('Custom')).toBeVisible();
  const customButton = page.locator('ion-segment-button[value="custom"]');
  await customButton.click({ force: true });
  await expect(customButton).toHaveClass(/segment-button-checked/);
  await expect(page.locator('input[type="date"]').first()).toBeVisible();
  await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
});

test('load settings page and require PIN before managing admin pages', async ({ page }) => {
  await page.goto('/settings');

  await expect(page.getByText('Manage Services')).toBeVisible();
  await expect(page.getByText('Manage Products')).toBeVisible();

  await page.getByText('Manage Services').click();
  const serviceAlert = page.locator('ion-alert').last();
  await expect(serviceAlert.getByText('Enter PIN')).toBeVisible();
  await serviceAlert.getByRole('button', { name: 'OK' }).click();
  await serviceAlert.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await page.getByText('Manage Products').click();
  const productAlert = page.locator('ion-alert').last();
  await expect(productAlert.getByText('Enter PIN')).toBeVisible();
  await productAlert.getByRole('button', { name: 'OK' }).click();
  await productAlert.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
