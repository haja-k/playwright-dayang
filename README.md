# Playwright Dayang

### Playwright Study

- I am new to testing using Playwright and this is my space to study it with one of the products I led that has been deployed to production.

## Project Overview

This repository contains experiments and performance/load tests using [Playwright](https://playwright.dev/) for chatbot applications deployed in production environments, specifically for Sarawak Government digital products (such as SCSPedia). The goal is to automate testing, analyze bot responses, and measure system performance under various user loads.

## Features

- **Automated End-to-End Tests**: Simulates chatbot user interactions, including login, sending questions, and verifying bot responses.
- **Load Testing**: Supports running concurrent user sessions and sending multiple questions per user to evaluate the system under stress.
- **Performance Measurement**: Calculates CPU and memory usage, classifies response times using Apdex ratings ("Satisfactory", "Tolerable", "Frustrated").
- **Result Aggregation**: Combines individual test results into comprehensive Excel sheets and summary statistics.
- **Configurable Test Scripts**: Tests can use either fixed questions or a random selection loaded from an Excel file.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (>= v16)
- [Playwright](https://playwright.dev/) and dependencies (see Dockerfile/build section)
- Optionally, [xlsx](https://www.npmjs.com/package/xlsx) npm package for advanced test data handling

### Installation

To install dependencies with Docker:
```sh
docker build -t playwright-dayang .
```

To install dependencies locally:
```sh
npm install
npx playwright install --with-deps
```

### Test Execution

#### Run with Docker

```sh
docker run --rm -it playwright-dayang
```

#### Run Locally

```sh
bash playwright.sh
```

#### Code Generation (Optional)

You can generate Playwright test code with:
```sh
npx playwright codegen https://scspedia.tnt.sarawak.gov.my/chat/oDDWixigVYHSIDCW --output=tests/scspedia.spec.ts
```

## Repository Structure

- `dayang.spec.js`, `scspedia.spec.js` – Main test scripts automating user and chatbot actions.
- `playwright.config.js` – Playwright test configuration.
- `playwright.sh` – Test automation shell script (supports CI runners).
- `combine_result.js` – Aggregates test results and generates summary Excel files.
- `Dockerfile` – Containerization for consistent reproducible test environments.
- `tests/` – Directory for additional and experimental test scripts.

## Example Test Scenario

```typescript
// tests/experiment.spec.ts
import { test, expect } from '@playwright/test';

test('validates bot response to economic question', async ({ page }) => {
  await page.goto('YOUR_BOT_APPLICATION_URL_HERE');
  await page.getByRole('textbox', { name: 'Talk to Bot' }).fill('How do the economic sectors and enablers interact to drive economic prosperity in Sarawak?');
  await page.getByRole('button').click();
  await expect(page.getByText('Digital Transformation', { exact: true })).toBeVisible();
});
```

## Performance Analysis

- Test scripts calculate system resource usage and Apdex ratings for chatbot response times.
- Summaries are saved to files such as `load-test-summary.json` and visual HTML reports via Playwright's built-in reporter.

## License

See [LICENSE](LICENSE) for details. This project is open source under a permissive license.

## Notes

- For advanced/randomized question testing, ensure `questions.xlsx` is present and install the `xlsx` library.
- Some scripts are experiments and may require adaptation to your deployed bot's actual locators, URLs, and credentials.

## Contributing

As this is a learning space, pull requests, suggestions, and improvements are welcome!
