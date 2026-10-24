import { test, expect } from '@playwright/test';

test('learner completes the practice workflow from case selection to feedback', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Practise the decisions/i })).toBeVisible();
  await page.getByRole('button', { name: /Start practice/i }).click();
  await expect(page.getByRole('heading', { name: /Prepare your practice session/i })).toBeVisible();
  await page.getByRole('button', { name: /Enter consultation room/i }).click();
  await expect(page.getByRole('heading', { name: /Consultation room/i })).toBeVisible();

  const chat = page.getByPlaceholder(/Ask a clinical question/i);
  await chat.fill('When did the fever start?');
  await page.getByRole('button', { name: /Send/i }).click();
  await expect(page.getByText(/The fever started yesterday evening/i)).toBeVisible();

  await page.getByLabel('Clinical indication').fill('Fever and chills in a malaria-endemic setting');
  await page.getByRole('button', { name: /Request test/i }).click();
  await expect(page.getByText(/Positive for malaria antigen/i)).toBeVisible();

  await page.getByPlaceholder(/Diagnosis A, diagnosis B/i).fill('Malaria, viral illness');
  await page.getByPlaceholder(/Your best-supported diagnosis/i).fill('Malaria');
  await page.getByLabel(/Follow-up and safety-netting/i).check();
  await page.getByLabel(/Appropriate treatment per current local guideline/i).check();
  await page.getByPlaceholder(/Explain how the history/i).fill('The positive rapid test supports the leading diagnosis.');
  await page.getByRole('button', { name: /Finish and get feedback/i }).click();
  await expect(page.getByRole('heading', { name: /Clinical performance report/i })).toBeVisible();
  await expect(page.getByText(/formative_unvalidated/i)).toBeVisible();
});

test('educator creates an exam and learner submits without seeing the answer key', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Educator console/i }).click();
  await expect(page.getByRole('heading', { name: /Create an examination/i })).toBeVisible();
  await page.getByRole('button', { name: /Create exam and generate code/i }).click();
  const code = (await page.locator('.created-code strong').textContent())?.trim();
  expect(code).toBeTruthy();

  await page.getByRole('button', { name: /Join examination/i }).click();
  await page.getByPlaceholder(/e.g. 7K2P9Q/i).fill(code);
  await page.getByRole('button', { name: /Begin examination/i }).click();
  await expect(page.getByRole('heading', { name: /Clinical assessment encounter/i })).toBeVisible();
  await expect(page.getByText(/Diagnosis hidden/i)).toBeVisible();

  await page.getByPlaceholder(/Diagnosis A, diagnosis B/i).fill('Malaria, viral illness');
  await page.getByPlaceholder(/Your best-supported diagnosis/i).fill('Malaria');
  await page.getByLabel(/Appropriate treatment per current local guideline/i).check();
  await page.getByLabel(/Follow-up and safety-netting/i).check();
  await page.getByPlaceholder(/Explain how the history/i).fill('The findings support the working diagnosis.');
  await page.getByRole('button', { name: /Submit examination/i }).click();
  await expect(page.getByRole('heading', { name: /Awaiting educator review/i })).toBeVisible();
  await expect(page.getByText(/submitted_pending_educator_review/i)).toBeVisible();
  await expect(page.getByText(/hidden_case_diagnosis/i)).toHaveCount(0);
});
