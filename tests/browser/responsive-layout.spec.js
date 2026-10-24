import { test, expect } from '@playwright/test';

const cases = [
  { id: 'malaria-001', title: 'Fever and chills', specialty: 'Internal medicine', sex: 'adult woman' },
  { id: 'respiratory-severe-001', title: 'Severe respiratory presentation', specialty: 'Emergency medicine', sex: 'adult man' },
  { id: 'burn-001', title: 'Burn injury', specialty: 'Emergency medicine', sex: 'adult man' },
  { id: 'trauma-001', title: 'Road traffic trauma', specialty: 'Trauma surgery', sex: 'adult woman' },
  { id: 'pregnancy-001', title: 'Pregnancy with severe headache', specialty: 'Obstetrics', sex: 'pregnant woman' },
  { id: 'pediatric-001', title: 'Child with fever and fast breathing', specialty: 'Pediatrics', sex: 'child' },
];

for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'tablet', width: 768, height: 1024 }]) {
  test(`learning lab remains usable at ${viewport.name} width without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.route('**/api/cases', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cases }),
    }));

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Choose a clinical scenario' })).toBeVisible();
    await expect(page.locator('.case-card')).toHaveCount(6);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
    await page.getByRole('button', { name: /Practise this case/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Prepare your practice session' })).toBeVisible();
  });
}
