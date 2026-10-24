import { test, expect } from '@playwright/test';

test('learner completes a practice encounter from history to feedback', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Bestie Clinical Sim/);
  await expect(page.getByRole('heading', { name: /Practise the decisions/ })).toBeVisible();

  await page.getByRole('button', { name: /Start practice/ }).click();
  await expect(page.getByRole('heading', { name: 'Prepare your practice session' })).toBeVisible();
  await page.getByRole('button', { name: /Enter consultation room/ }).click();
  await expect(page.getByRole('heading', { name: 'Consultation room' })).toBeVisible();

  const chat = page.getByPlaceholder(/Ask a clinical question/);
  await chat.fill('When did the fever start?');
  await page.getByRole('button', { name: /^Send/ }).click();
  await expect(page.locator('.chat-window')).toContainText('fever started yesterday evening');

  await page.getByPlaceholder('What clinical question will this test answer?')
    .fill('Fever and chills in a malaria-endemic setting');
  await page.getByRole('button', { name: /Request test/ }).click();
  await expect(page.locator('.result-list')).toContainText('Positive for malaria antigen');

  await page.getByPlaceholder('Diagnosis A, diagnosis B, diagnosis C')
    .fill('malaria, viral illness');
  await page.getByPlaceholder('Your best-supported diagnosis').fill('Uncomplicated malaria');
  await page.getByPlaceholder(/Explain how the history/).fill(
    'The positive malaria test supports the diagnosis; assess severity and reassess the response.');
  await page.getByRole('button', { name: /Finish and get feedback/ }).click();

  await expect(page.getByRole('heading', { name: 'Clinical performance report' })).toBeVisible();
  await expect(page.getByText(/Uncomplicated malaria/)).toBeVisible();
  await expect(page.getByText('Domain feedback')).toBeVisible();
});

test('educator creates an exam and learner submits without seeing the answer key', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Educator console/ }).click();
  await expect(page.getByRole('heading', { name: 'Create an examination' })).toBeVisible();
  await page.getByRole('button', { name: /Create exam and generate code/ }).click();

  const code = page.locator('.created-code strong');
  await expect(code).toBeVisible();
  const examCode = (await code.textContent()).trim();
  expect(examCode.length).toBeGreaterThanOrEqual(7);

  await page.getByRole('button', { name: /Join examination/ }).click();
  await page.getByPlaceholder(/e.g. 7K2P9Q/).fill(examCode);
  await page.getByRole('button', { name: /Begin examination/ }).click();
  await expect(page.getByRole('heading', { name: 'Clinical assessment encounter' })).toBeVisible();
  await expect(page.getByText('Diagnosis hidden')).toBeVisible();
  await expect(page.getByText('Get a hint')).toHaveCount(0);

  await page.getByRole('button', { name: /Submit examination/ }).click();
  await expect(page.getByRole('heading', { name: 'Awaiting educator review' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('malaria-001');
  await expect(page.locator('body')).not.toContainText('FORMATIVE DEMONSTRATION SCORE');
});
