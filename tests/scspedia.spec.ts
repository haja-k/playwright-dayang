import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('');
  await page.getByRole('tab', { name: 'Login with Password' }).click();
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.locator('#usrid').fill('');
  await page.locator('#usrid').press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Start Chat' }).click();
  await page.getByRole('textbox', { name: 'Talk to Bot' }).click();
  await page.getByRole('textbox', { name: 'Talk to Bot' }).fill('How does the PCDS 2030 plan aim to achieve social inclusivity for all Sarawakians, and what specific strategies or initiatives are outlined to support this goal?');
  await page.getByRole('button').nth(2).click();
  await page.getByText('Workflow Process Thinking… (').click();
  await page.getByText('Thinking… (click to collapse)').click();
  await page.getByText('CITATIONS').click();
  await page.locator('#check-circle #Solid').click();
});