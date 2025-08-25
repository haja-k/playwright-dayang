#!/bin/bash

# playwright_test.sh - Playwright Load Testing Script

set -e  # Exit on any error

echo "🎭 Starting Playwright Load Tests..."

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is not installed on this runner"
    echo "Please install Node.js on your GitLab runner or use a Docker executor"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Check if playwright directory exists
if [ ! -d "playwright" ]; then
    echo "❌ Playwright directory not found!"
    exit 1
fi

# Change to playwright directory
cd playwright

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm ci

# Install Playwright browsers if needed
echo "🌐 Installing/updating Playwright browsers..."
npx playwright install --with-deps

# Run Playwright tests
echo "🏃 Running Playwright load tests..."
npx playwright test scspedia.spec.ts --reporter=html

echo "📊 Generating test summary..."

# Generate summary report from individual user results
node -e "
const fs = require('fs');
const path = require('path');

console.log('🔍 Looking for test results...');
const tempDir = path.join(__dirname, 'chatbot-temp');

if (!fs.existsSync(tempDir)) {
    console.log('❌ No test results found - chatbot-temp directory does not exist');
    process.exit(0);
}

const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.json'));
console.log('📁 Found result files:', files.length);

if (files.length === 0) {
    console.log('❌ No JSON result files found in chatbot-temp');
    process.exit(0);
}

const allResults = [];

files.forEach(file => {
    try {
        const filePath = path.join(tempDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        allResults.push(...data);
        console.log('✅ Loaded results from:', file);
    } catch (error) {
        console.error('❌ Error reading file:', file, error.message);
    }
});

if (allResults.length === 0) {
    console.log('❌ No test data found in result files');
    process.exit(0);
}

console.log('📊 Processing', allResults.length, 'test results...');

// Calculate summary statistics
const summary = {
    totalTests: allResults.length,
    apdexDistribution: {},
    averageFirstResponse: 0,
    averageFullResponse: 0,
    minFirstResponse: 0,
    maxFirstResponse: 0,
    minFullResponse: 0,
    maxFullResponse: 0,
    timeouts: allResults.filter(r => r.firstResponseTime === -1).length
};

// Filter valid response times
const validFirstResponses = allResults.filter(r => r.firstResponseTime > 0);
const allFullResponses = allResults.filter(r => r.fullResponseTime > 0);

if (validFirstResponses.length > 0) {
    summary.averageFirstResponse = Math.round(
        validFirstResponses.reduce((sum, r) => sum + r.firstResponseTime, 0) / validFirstResponses.length
    );
    summary.minFirstResponse = Math.min(...validFirstResponses.map(r => r.firstResponseTime));
    summary.maxFirstResponse = Math.max(...validFirstResponses.map(r => r.firstResponseTime));
}

if (allFullResponses.length > 0) {
    summary.averageFullResponse = Math.round(
        allFullResponses.reduce((sum, r) => sum + r.fullResponseTime, 0) / allFullResponses.length
    );
    summary.minFullResponse = Math.min(...allFullResponses.map(r => r.fullResponseTime));
    summary.maxFullResponse = Math.max(...allFullResponses.map(r => r.fullResponseTime));
}

// Count Apdex distribution
allResults.forEach(r => {
    const rating = r.apdexRating || 'Unknown';
    summary.apdexDistribution[rating] = (summary.apdexDistribution[rating] || 0) + 1;
});

// Calculate Apdex percentages
const apdexPercentages = {};
Object.keys(summary.apdexDistribution).forEach(rating => {
    apdexPercentages[rating] = ((summary.apdexDistribution[rating] / summary.totalTests) * 100).toFixed(1) + '%';
});

// Save summary
fs.writeFileSync('load-test-summary.json', JSON.stringify(summary, null, 2));

// Display results
console.log('');
console.log('🎯 LOAD TEST SUMMARY');
console.log('==========================================');
console.log('📊 Total Tests:', summary.totalTests);
console.log('⏱️  Timeouts:', summary.timeouts);
console.log('📈 Average First Response:', summary.averageFirstResponse + 'ms');
console.log('📈 Average Full Response:', summary.averageFullResponse + 'ms');
console.log('⚡ Response Time Range (First):', summary.minFirstResponse + 'ms -', summary.maxFirstResponse + 'ms');
console.log('⚡ Response Time Range (Full):', summary.minFullResponse + 'ms -', summary.maxFullResponse + 'ms');
console.log('');
console.log('🎯 APDEX DISTRIBUTION:');
Object.keys(summary.apdexDistribution).forEach(rating => {
    console.log('  ' + rating + ':', summary.apdexDistribution[rating], '(' + apdexPercentages[rating] + ')');
});
console.log('==========================================');

console.log('✅ Summary saved to load-test-summary.json');
"

# Return to root directory
cd ..

echo "✅ Playwright tests completed successfully!"