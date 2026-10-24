import { test, expect } from '@playwright/test';

const catalog = [{
  id: 'malaria-001', title: 'Fever and chills', specialty: 'Internal medicine',
  level: 'Clinical-year student', version: '1.0.0',
  appearance: 'Fictional adult patient', age: 24, sex: 'adult woman',
}];

async function mockCases(page) {
  await page.route('**/api/cases', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ cases: catalog }),
  }));
}

test('learner completes practice: dialogue, investigation and formative report', async ({ page }) => {
  await mockCases(page);
  await page.route('**/api/sessions', async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        session_id: 101, session_token: 'test-session-token',
        case_id: body.case_id, mode: body.mode, opening: 'I have had fever since yesterday.',
        examination: null,
        patient: { age: 24, sex: 'adult woman', appearance: 'Fictional patient', vitals: { Temperature: '38.9 °C' } },
      }),
    });
  });
  await page.route('**/api/sessions/101/chat', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'The fever started last night.' }),
  }));
  await page.route('**/api/sessions/101/investigations', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      test_id: 'malaria-rdt', name: 'Malaria rapid diagnostic test',
      result: 'Positive for malaria antigen.', interpretation: 'Interpret in clinical context.',
      appropriate: true, configured: true, image_available: false,
      indication: 'Fever in an endemic area',
      indication_feedback: 'The indication is plausible for this case.',
    }),
  }));
  await page.route('**/api/sessions/101/finish', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      status: 'formative_unvalidated', mode: 'practice', case_id: 'malaria-001',
      score: 70, hidden_case_diagnosis: 'Uncomplicated malaria',
      summary: 'Practice feedback is formative.', domains: [], critical_flags: [],
    }),
  }));

  await page.goto('/');
  await page.getByRole('button', { name: /Start practice/ }).click();
  await page.getByRole('button', { name: /Enter consultation room/ }).click();
  await expect(page.getByRole('heading', { name: 'Consultation room' })).toBeVisible();
  await expect(page.getByText('I have had fever since yesterday.')).toBeVisible();

  await page.getByPlaceholder(/Ask a clinical question/).fill('When did it start?');
  await page.getByRole('button', { name: 'Send ↗' }).click();
  await expect(page.getByText('The fever started last night.')).toBeVisible();

  await page.getByPlaceholder(/What clinical question will this test answer/).fill('Fever in a malaria-endemic area');
  await page.getByRole('button', { name: 'Request test →' }).click();
  await expect(page.getByText('Positive for malaria antigen.')).toBeVisible();

  await page.getByPlaceholder('Diagnosis A, diagnosis B, diagnosis C').fill('Malaria, viral illness');
  await page.getByPlaceholder('Your best-supported diagnosis').fill('Malaria');
  await page.getByPlaceholder(/Explain how the history/).fill('The positive test supports malaria in context.');
  await page.getByRole('button', { name: /Finish and get feedback/ }).click();
  await expect(page.getByRole('heading', { name: 'Clinical performance report' })).toBeVisible();
  await expect(page.getByText('Uncomplicated malaria')).toBeVisible();
});

test('learner joins controlled exam without exposed observations or result', async ({ page }) => {
  await mockCases(page);
  await page.route('**/api/sessions', async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        session_id: 202, session_token: 'test-exam-token',
        case_id: null, mode: body.mode, opening: 'I feel unwell.',
        examination: { duration: 10, title: 'Controlled examination' },
        patient: { age: 48, sex: 'adult man', appearance: 'Fictional patient', vitals: null },
      }),
    });
  });
  await page.route('**/api/sessions/202/finish', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      status: 'submitted_pending_educator_review', mode: 'exam',
      learner: 'Student', submitted_at: '2026-10-24T10:00:00Z',
      time_expired: false, summary: 'Your examination submission has been recorded.',
    }),
  }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Join an examination' }).click();
  await page.getByPlaceholder(/e.g. 7K2P9Q/).fill('ABCD1234');
  await page.getByRole('button', { name: /Begin examination/ }).click();
  await expect(page.getByRole('heading', { name: 'Clinical assessment encounter' })).toBeVisible();
  await expect(page.getByText(/observations are not disclosed/)).toBeVisible();
  await expect(page.getByText('EXAM MODE')).toBeVisible();
  await page.getByRole('button', { name: /Submit examination/ }).click();
  await expect(page.getByText('Awaiting educator review')).toBeVisible();
  await expect(page.getByText(/Your examination submission has been recorded/)).toBeVisible();
});
