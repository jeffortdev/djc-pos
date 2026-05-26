# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> load reports page and show custom date filter inputs
- Location: e2e\app.spec.ts:32:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Custom')
Expected: visible
Error: strict mode violation: getByText('Custom') resolved to 3 elements:
    1) <ion-label _ngcontent-ng-c3756322497="" class="sc-ion-label-md-h md sc-ion-label-md sc-ion-label-md-s hydrated">…</ion-label> aka getByText('Custom', { exact: true })
    2) <ion-card-title role="heading" aria-level="2" _ngcontent-ng-c3756322497="" class="ion-inherit-color md hydrated">Top Repeat Customers</ion-card-title> aka getByRole('heading', { name: 'Top Repeat Customers' })
    3) <p class="empty" _ngcontent-ng-c3756322497="">No customers with a phone number found for this p…</p> aka getByText('No customers with a phone')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Custom')

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e8]:
    - banner [ref=e9]:
      - generic [ref=e11]:
        - img "logo" [ref=e16]
        - button [ref=e19] [cursor=pointer]:
          - generic [ref=e20]:
            - generic:
              - img:
                - generic:
                  - img
      - tablist [ref=e24]:
        - generic:
          - generic [ref=e25] [cursor=pointer]:
            - tab "Today":
              - generic:
                - generic:
                  - generic: Today
          - generic [ref=e26] [cursor=pointer]:
            - tab "Week" [selected]:
              - generic:
                - generic:
                  - generic: Week
          - generic [ref=e27] [cursor=pointer]:
            - tab "Month":
              - generic:
                - generic:
                  - generic: Month
          - generic [ref=e28] [cursor=pointer]:
            - tab "Custom":
              - generic:
                - generic:
                  - generic: Custom
    - main [ref=e29]:
      - generic [ref=e31]:
        - generic:
          - generic [ref=e32]:
            - generic [ref=e34] [cursor=pointer]: All
            - generic [ref=e36] [cursor=pointer]: Cash
            - generic [ref=e38] [cursor=pointer]: Card
            - generic [ref=e40] [cursor=pointer]: GCash
          - generic [ref=e41]:
            - generic:
              - heading "vs Previous Week" [level=2] [ref=e43]:
                - generic: vs Previous Week
              - generic [ref=e45]:
                - generic [ref=e46]:
                  - generic [ref=e47]: ₱0.00
                  - generic [ref=e48]: "prev: ₱0.00"
                  - generic [ref=e49]:
                    - img [ref=e50]:
                      - img [ref=e52]
                    - text: —
                  - generic [ref=e53]: Revenue
                - generic [ref=e54]:
                  - generic [ref=e55]: "0"
                  - generic [ref=e56]: "prev: 0"
                  - generic [ref=e57]:
                    - img [ref=e58]:
                      - img [ref=e60]
                    - text: —
                  - generic [ref=e61]: Transactions
                - generic [ref=e62]:
                  - generic [ref=e63]: ₱0.00
                  - generic [ref=e64]: "prev: ₱0.00"
                  - generic [ref=e65]:
                    - img [ref=e66]:
                      - img [ref=e68]
                    - text: —
                  - generic [ref=e69]: Avg Ticket
          - generic [ref=e70]:
            - generic:
              - heading "Daily Revenue" [level=2] [ref=e72]:
                - generic: Daily Revenue
              - generic [ref=e74]:
                - generic [ref=e78]: Wed
                - generic [ref=e82]: Thu
                - generic [ref=e86]: Fri
                - generic [ref=e90]: Sat
                - generic [ref=e94]: Sun
                - generic [ref=e98]: Mon
                - generic [ref=e102]: Tue
          - generic [ref=e103]:
            - generic:
              - heading "Top Services" [level=2] [ref=e105]:
                - generic: Top Services
              - paragraph [ref=e107]: No service sales this period.
          - generic [ref=e108]:
            - generic:
              - heading "Top Products" [level=2] [ref=e110]:
                - generic: Top Products
              - paragraph [ref=e112]: No product sales this period.
          - generic [ref=e113]:
            - generic:
              - generic [ref=e114]:
                - generic:
                  - heading "Top Repeat Customers" [level=2] [ref=e115]:
                    - generic: Top Repeat Customers
                  - generic [ref=e116]:
                    - generic [ref=e117]:
                      - button "Week" [ref=e118] [cursor=pointer]
                      - button "Month" [ref=e119] [cursor=pointer]
                      - button "Year" [ref=e120] [cursor=pointer]
                    - generic [ref=e121]:
                      - generic [ref=e122]: Top
                      - spinbutton [ref=e123]: "10"
              - paragraph [ref=e125]: No customers with a phone number found for this period.
          - generic [ref=e126]:
            - generic:
              - heading "Current Stock Levels" [level=2] [ref=e128]:
                - generic: Current Stock Levels
              - generic [ref=e130]:
                - generic [ref=e131]:
                  - generic [ref=e132]: Product
                  - generic [ref=e133]: Stock
                  - generic [ref=e134]: Avg/day
                  - generic [ref=e135]: Days left
                  - generic [ref=e136]: Status
                - generic [ref=e137]:
                  - generic [ref=e138]: Detergent Powder
                  - generic [ref=e139]: 0 pcs
                  - generic [ref=e140]: "0"
                  - generic [ref=e141]: ∞
                  - generic [ref=e142]: No sales
                - generic [ref=e143]:
                  - generic [ref=e144]: Fabric Softener
                  - generic [ref=e145]: 0 pcs
                  - generic [ref=e146]: "0"
                  - generic [ref=e147]: ∞
                  - generic [ref=e148]: No sales
                - generic [ref=e149]:
                  - generic [ref=e150]: Laundry Bag
                  - generic [ref=e151]: 0 pcs
                  - generic [ref=e152]: "0"
                  - generic [ref=e153]: ∞
                  - generic [ref=e154]: No sales
                - generic [ref=e155]:
                  - generic [ref=e156]: Stain Remover Spray
                  - generic [ref=e157]: 0 pcs
                  - generic [ref=e158]: "0"
                  - generic [ref=e159]: ∞
                  - generic [ref=e160]: No sales
                - generic [ref=e161]:
                  - generic [ref=e162]: Garment Protect Cover
                  - generic [ref=e163]: 0 pcs
                  - generic [ref=e164]: "0"
                  - generic [ref=e165]: ∞
                  - generic [ref=e166]: No sales
  - tablist [ref=e167]:
    - generic:
      - tab "POS" [ref=e169] [cursor=pointer]:
        - generic [ref=e170]:
          - generic:
            - img [ref=e171]:
              - img [ref=e173]
            - generic [ref=e178]: POS
      - tab "Dashboard" [ref=e180] [cursor=pointer]:
        - generic [ref=e181]:
          - generic:
            - img [ref=e182]:
              - img [ref=e184]
            - generic [ref=e189]: Dashboard
      - tab "History" [ref=e191] [cursor=pointer]:
        - generic [ref=e192]:
          - generic:
            - img [ref=e193]:
              - img [ref=e195]
            - generic [ref=e199]: History
      - tab "Reports" [selected] [ref=e201] [cursor=pointer]:
        - generic [ref=e202]:
          - generic:
            - img [ref=e203]:
              - img [ref=e205]
            - generic [ref=e211]: Reports
      - tab "Settings" [ref=e213] [cursor=pointer]:
        - generic [ref=e214]:
          - generic:
            - img [ref=e215]:
              - img [ref=e217]
            - generic [ref=e219]: Settings
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('load POS page and verify key components', async ({ page }) => {
  4  |   await page.goto('/pos');
  5  | 
  6  |   await expect(page.getByText('Order')).toBeVisible();
  7  |   await expect(page.getByText('Services')).toBeVisible();
  8  |   await page.getByText('Products').click();
  9  |   await expect(page.getByText('Order')).toBeVisible();
  10 | });
  11 | 
  12 | test('load dashboard page and validate KPI cards', async ({ page }) => {
  13 |   await page.goto('/dashboard');
  14 | 
  15 |   await expect(page.getByText('Cash in Register')).toBeVisible();
  16 |   await expect(page.locator('.kpi-label', { hasText: 'Revenue' })).toBeVisible();
  17 |   await page.getByRole('button', { name: 'Week' }).click();
  18 |   await page.getByRole('button', { name: 'Month' }).click();
  19 |   await expect(page.getByText('Sales Summary')).toBeVisible();
  20 | });
  21 | 
  22 | test('load transactions page and switch tabs', async ({ page }) => {
  23 |   await page.goto('/transactions');
  24 | 
  25 |   await expect(page.getByText('Sales')).toBeVisible();
  26 |   await expect(page.getByText('Cash')).toBeVisible();
  27 |   const cashButton = page.locator('ion-segment-button[value="cash"]');
  28 |   await cashButton.click({ force: true });
  29 |   await expect(cashButton).toHaveClass(/segment-button-checked/);
  30 | });
  31 | 
  32 | test('load reports page and show custom date filter inputs', async ({ page }) => {
  33 |   await page.goto('/reports');
  34 | 
  35 |   await expect(page.getByText('Today')).toBeVisible();
> 36 |   await expect(page.getByText('Custom')).toBeVisible();
     |                                          ^ Error: expect(locator).toBeVisible() failed
  37 |   const customButton = page.locator('ion-segment-button[value="custom"]');
  38 |   await customButton.click({ force: true });
  39 |   await expect(customButton).toHaveClass(/segment-button-checked/);
  40 |   await expect(page.locator('input[type="date"]').first()).toBeVisible();
  41 |   await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
  42 | });
  43 | 
  44 | test('load settings page and require PIN before managing admin pages', async ({ page }) => {
  45 |   await page.goto('/settings');
  46 | 
  47 |   await expect(page.getByText('Manage Services')).toBeVisible();
  48 |   await expect(page.getByText('Manage Products')).toBeVisible();
  49 | 
  50 |   await page.getByText('Manage Services').click();
  51 |   const serviceAlert = page.locator('ion-alert').last();
  52 |   await expect(serviceAlert.getByText('Enter PIN')).toBeVisible();
  53 |   await serviceAlert.getByRole('button', { name: 'OK' }).click();
  54 |   await serviceAlert.getByRole('button', { name: 'Cancel' }).click();
  55 |   await expect(page).toHaveURL(/\/settings$/);
  56 | 
  57 |   await page.getByText('Manage Products').click();
  58 |   const productAlert = page.locator('ion-alert').last();
  59 |   await expect(productAlert.getByText('Enter PIN')).toBeVisible();
  60 |   await productAlert.getByRole('button', { name: 'OK' }).click();
  61 |   await productAlert.getByRole('button', { name: 'Cancel' }).click();
  62 |   await expect(page).toHaveURL(/\/settings$/);
  63 | });
  64 | 
```