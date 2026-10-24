import { test, expect } from '@playwright/test';

const cases = [
  { id: 'malaria-001', title: 'Fever and chills', specialty: 'Internal medicine', sex: 'adult woman', appearance: 'Fictional patient' },
  { id: 'respiratory-severe-001', title: 'Severe respiratory presentation', specialty: 'Emergency medicine', sex: 'adult man', appearance: 'Fictional patient' },
  { id: 'burn-001', title: 'Burn injury', specialty: 'Emergency medicine', sex: 'adult man', appearance: 'Fictional patient' },
  { id: 'trauma-001', title: 'Road traffic trauma', specialty: 'Trauma surgery', sex: 'adult woman', appearance: 'Fictional patient' },
  { id: 'pregnancy-001', title: 'Pregnancy with severe headache', specialty: 'Obstetrics', sex: 'pregnant woman', appearance: 'Fictional patient' },
  { id: 'pediatric-001', title: 'Child with fever and fast breathing', specialty: 'Pediatrics', sex: 'child', appearance: 'Fictional patient' },
];

test('case library presents a deliberate mix of patient skin tones and patient groups', async ({ page }) => {
  await page.route('**/api/cases', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ cases }),
  }));

  await page.goto('/');
  const portraits = page.locator('.case-card .case-emoji');
  await expect(portraits).toHaveCount(6);
  const renderedPortraits = await portraits.evaluateAll(nodes =>
    nodes.map(node => getComputedStyle(node, '::before').content)
  );
  expect(renderedPortraits).toEqual([
    '"👩🏻"', '"👨🏿"', '"👨🏽"', '"👩🏾"', '"🤰🏼"', '"🧒🏿"',
  ]);
  expect(new Set(renderedPortraits).size).toBe(6);
  await expect(page.getByText('Fictional patient').first()).toBeVisible();
});
