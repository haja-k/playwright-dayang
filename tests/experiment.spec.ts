import { test, expect } from '@playwright/test';

test('validates bot response to economic question', async ({ page }) => {
  // Go to the page (this is a good practice to start each test with)
  await page.goto('YOUR_BOT_APPLICATION_URL_HERE');

  // 1. First set of actions
  await page.getByRole('textbox', { name: 'Talk to Bot' }).click();
  await page.getByRole('textbox', { name: 'Talk to Bot' }).fill('How do the economic sectors and enablers interact to drive economic prosperity in Sarawak?');
  await page.getByRole('button').filter({ hasText: /^$/ }).click();

  // 2. Add assertions for the first set of actions
  // The bot's response should be visible. Let's assume the response appears in a div with a specific class or role.
  // You would need to find the correct locator. For example, maybe there's a div with the text "Digital Transformation".
  await expect(page.getByText('Digital Transformation', { exact: true })).toBeVisible();
  await expect(page.getByText('Education & Human Capital', { exact: true })).toBeVisible();
  await expect(page.getByText('Renewable Energy', { exact: true })).toBeVisible();

  // You might also want to assert that a specific citation button is now present.
  await expect(page.getByText('CITATIONS')).toBeVisible();

  // 3. Second set of actions
  await page.getByRole('textbox', { name: 'Talk to Bot' }).click();
  await page.getByRole('textbox', { name: 'Talk to Bot' }).fill('What are the differences between seven strategic thrusts and seven enablers?');
  await page.getByRole('button').filter({ hasText: /^$/ }).click();

  // 4. Add assertions for the second set of actions
  await expect(page.getByText('Seven Strategic Thrusts:')).toBeVisible();
  await expect(page.getByText('Seven Enablers:', { exact: true })).toBeVisible();

  // Now, we need to make sure the second citations button is visible.
  await expect(page.getByText('CITATIONS').nth(1)).toBeVisible();
});