// @ts-check
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// NOTE: xlsx library is required for this script. Make sure it's installed.
// import * as xlsx from 'xlsx';

// Temporary directory to save results
const TEMP_DIR = path.join(__dirname, 'chatbot-temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// =======================================================================
//                           CONFIGURATION
// =======================================================================
const userTest = 30; // Number of concurrent users
const questionsPerUser = 5; // Number of questions to send per user
const firstIndexQuestion = 0;
const secondIndexQuestion = 33;

// Flag to use fixed questions or random from the source.
// If using random, make sure 'questions.xlsx' exists.
const useRandomQuestions = true;

// Pre-defined questions for a fixed-set test if not using random.
const fixedQuestions = [
  "What is a SEG Portal?",
  "What is SarawakID?",
  "I cant register my SarawakID bc it says that my IC has been registered before, what should i do",
  "What is the difference between SarawakID and SarawakID Corp?",
  "If I want to enroll in the Senior Citizen Health Benefit, what are some of the eligibility?",
  "How much is the fee for upgrading the registration class in the electrical field?",
  "Check the gas bill 056-G2299 and seb bill 201166495100.",
  "May I know which agency has my talikhidmat case assigned to? Case number: 20240325-0006"
];

let selectedQuestions = [];

if (useRandomQuestions) {
  // NOTE: This part requires the xlsx library to be installed and 'questions.xlsx' to exist.
  try {
    // const workbook = xlsx.readFile('questions.xlsx');
    // const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // const jsonData = xlsx.utils.sheet_to_json(sheet);
    // const allQuestions = jsonData
    //   .map(row => row['Test Script'])
    //   .filter(msg => typeof msg === 'string' && msg.trim().length > 0);
    // selectedQuestions = allQuestions.slice(firstIndexQuestion, secondIndexQuestion);
    
    // Using a placeholder for now to avoid the xlsx dependency issue in this example.
    // In a real scenario, uncomment the above block and remove this line.
    selectedQuestions = fixedQuestions; 

  } catch (error) {
    console.error("Failed to load questions from Excel. Using fixed questions instead.");
    selectedQuestions = fixedQuestions;
  }
} else {
  selectedQuestions = fixedQuestions;
}

console.log(`✅ Loaded ${selectedQuestions.length} messages from source.`);
console.log(`✅ Simulating ${userTest} users, each sending ${questionsPerUser} random messages.`);

// =======================================================================
//                        PERFORMANCE UTILITY FUNCTIONS
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
//                              PLAYWRIGHT TEST
// =======================================================================
test.setTimeout(6000000); // Set a very long timeout for the entire test run

test.describe.parallel('Concurrent chatbot users - Aivie (Load Test)', () => {
  for (let userId = 1; userId <= userTest; userId++) {
    test(`User ${userId}`, async ({ page }) => {
      // Navigate and open the chatbot
      await page.goto('https://aivie-tnt.sains.com.my/dayang_azure');
      await page.getByRole('img').click();

      const frameLocator = page.frameLocator('iframe[title="dify chatbot bubble window"]');
      const responseLocator = frameLocator.locator('.chat-answer-container .markdown-body');
      const checkCircleLocator = frameLocator.locator('#check-circle');

      // Wait for the initial greeting
      try {
        await expect(responseLocator).toHaveCount(1, { timeout: 30000 });
      } catch {
        console.warn(`⏱️ User ${userId}: Greeting not found within 30s. Proceeding...`);
      }

      const questionsToAsk = getRandomItems(selectedQuestions, questionsPerUser);
      const results = [];

      for (const question of questionsToAsk) {
        const cpuBefore = getCpuUsageSnapshot();
        const initialAnswerCount = await responseLocator.count();
        const initialCheckCount = await checkCircleLocator.count();

        await frameLocator.getByRole('textbox', { name: 'Talk to Bot' }).fill(question);
        await frameLocator.getByRole('button').filter({ hasText: /^$/ }).click();

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