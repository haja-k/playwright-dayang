// scspedia.spec.ts
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Temporary directory to save results
const TEMP_DIR = path.join(__dirname, 'chatbot-temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// =======================================================================
//                       CONFIGURATION
// =======================================================================
const userTest = 30; // Number of concurrent users
const questionsPerUser = 1; // Number of questions to send per user
const fixedQuestions = [
  // "What kind of information do you have?",
  "How does the PCDS 2030 plan aim to achieve social inclusivity for all Sarawakians, and what specific strategies or initiatives are outlined to support this goal?",
  // "What is the summary of PCDS 2030 plan?"
];

let selectedQuestions = fixedQuestions;

console.log(`✅ Loaded ${selectedQuestions.length} messages from source.`);
console.log(`✅ Simulating ${userTest} users, each sending ${questionsPerUser} random messages.`);

// =======================================================================
//                       PERFORMANCE UTILITY FUNCTIONS
// =======================================================================
function getCpuUsageSnapshot() {
  const cpus = os.cpus();
  return cpus.map(cpu => {
    const { user, nice, sys, idle, irq } = cpu.times;
    return { user, nice, sys, idle, irq };
  });
}

function calculateCpuDelta(start, end) {
  let totalIdle = 0, totalTotal = 0;
  for (let i = 0; i < start.length; i++) {
    const s = start[i], e = end[i];
    const idle = e.idle - s.idle;
    const total = Object.keys(s).reduce((acc, key) => acc + (e[key] - s[key]), 0);
    totalIdle += idle;
    totalTotal += total;
  }
  return 1 - (totalIdle / totalTotal);
}

function getRSSMemoryUsagePercent() {
  const rss = process.memoryUsage().rss;
  const total = os.totalmem();
  return ((rss / total) * 100).toFixed(2) + '%';
}

function classifyApdex(firstResponseTime) {
  if (typeof firstResponseTime !== 'number' || firstResponseTime < 0) return 'Unknown';
  if (firstResponseTime < 20000) return 'Satisfactory';
  if (firstResponseTime < 26000) return 'Tolerable';
  if (firstResponseTime < 29000) return 'Frustrated';
  return 'Unknown';
}

function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// =======================================================================
//                       PLAYWRIGHT TEST
// =======================================================================
test.setTimeout(6000000);

test.describe.parallel('Concurrent chatbot users - Production (Load Test)', () => {
  for (let userId = 1; userId <= userTest; userId++) {
    test(`User ${userId}`, async ({ page }) => {
      // 1. Perform the login steps.
      await page.goto('xxx');
      await page.getByRole('tab', { name: 'Login with Password' }).click();
      await page.getByRole('textbox', { name: 'Username' }).click();
      await page.locator('#usrid').fill('xxx');
      await page.getByRole('textbox', { name: 'Password' }).click();
      await page.getByRole('textbox', { name: 'Password' }).fill('xxx');
      await page.getByRole('button', { name: 'Login' }).click();

      
      // // Get the frame locator for the chatbot iframe.
      // const frameLocator = page.frameLocator('iframe[title="dify chatbot bubble window"]');
      
      // 3. Click the "Start Chat" button inside the iframe.
      await page.getByRole('button', { name: 'Start Chat' }).click();
      
      const responseLocator = await page.locator('.relative > .markdown-body');
      // const checkCircleLocator = page.locator('#check-circle #Solid');
      const checkCircleLocator = page.getByText('CITATIONS')

      // Now, proceed with the rest of the test logic, using the fixed questions.
      const questionsToAsk = getRandomItems(selectedQuestions, questionsPerUser);
      const results = [];

      for (const question of questionsToAsk) {
        const cpuBefore = getCpuUsageSnapshot();
        const initialAnswerCount = await responseLocator.count();
        const initialCheckCount = await checkCircleLocator.count();

        await page.getByRole('textbox', { name: 'Talk to Bot' }).fill(question);
        await page.getByRole('button').nth(2).click();

        const startTime = Date.now();

        let newResponse;
        try {
          await expect(responseLocator).toHaveCount(initialAnswerCount + 1, { timeout: 30000 });
          newResponse = responseLocator.nth(initialAnswerCount);
        } catch {
          console.warn(`⏱️ User ${userId}: No new response within 30s for question: "${question}"`);
          results.push({
            user: `User ${userId}`,
            message: question,
            response: 'Timeout: No response received',
            fullResponseTime: 30000,
            firstResponseTime: -1,
            apdexRating: 'Unknown',
            cpuUsagePercent: 'N/A',
            memoryUsageRSS: getRSSMemoryUsagePercent()
          });
          continue;
        }

        let firstResponseTime = -1;
        const pollStart = Date.now();
        const maxWait = 30000;

        while (Date.now() - pollStart < maxWait) {
          const finalResponseCount = await newResponse.locator('[data-response="final-response"]').count();
          const holdResponseCount = await newResponse.locator('[data-response="hold-response"]').count();

          if (finalResponseCount > 0 && holdResponseCount === 0) {
            firstResponseTime = Date.now() - startTime;
            break;
          }

          await page.waitForTimeout(300);
        }

        try {
          await expect(checkCircleLocator).toHaveCount(initialCheckCount + 1, { timeout: 30000 });
        } catch {
          console.warn(`⏱️ User ${userId}: Check-circle not found in time for question: "${question}"`);
        }
        
        const cpuAfter = getCpuUsageSnapshot();
        const cpuLoad = calculateCpuDelta(cpuBefore, cpuAfter);
        const rssPercent = getRSSMemoryUsagePercent();
        const answerText = await newResponse.textContent();
        const cleanAnswer = answerText?.trim().replace(/\s+/g, ' ') || 'No response';

        results.push({
          user: `User ${userId}`,
          message: question,
          response: cleanAnswer,
          fullResponseTime: Date.now() - startTime,
          firstResponseTime,
          apdexRating: classifyApdex(firstResponseTime),
          cpuUsagePercent: (cpuLoad * 100).toFixed(2) + '%',
          memoryUsageRSS: rssPercent
        });
      }

      const filePath = path.join(TEMP_DIR, `user-${userId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
      console.log(`💾 Saved responses for User ${userId} to ${filePath}`);

      if (results.length !== questionsToAsk.length) {
        console.warn(`⚠️ WARNING: Expected ${questionsToAsk.length} responses but got ${results.length}`);
      }
    });
  }
});