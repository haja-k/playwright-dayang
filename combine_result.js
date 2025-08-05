const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const TEMP_DIR = path.join(__dirname, 'chatbot-temp');
const OUTPUT_FILE = 'chatbot-responses-combined.xlsx';

if (!fs.existsSync(TEMP_DIR)) {
  throw new Error('Temp results not found');
}

const files = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.json'));
if (files.length === 0) throw new Error('No user result files found');

const allResults = files.flatMap(file => {
  const content = fs.readFileSync(path.join(TEMP_DIR, file));
  return JSON.parse(content.toString());
});

// ---------------------------
// 🟩 Apdex Classification Per Response
// ---------------------------

function classifyApdex(firstResponseTime) {
  const time = Number(firstResponseTime);
  if (isNaN(time) || time < 0) return 'Unknown';
  if (time < 20000) return 'Satisfactory';
  if (time <= 26000) return 'Tolerable';
  if (time <= 29000) return 'Frustrated';
  return 'Unknown';
}

// Count categories
const apdexSummary = {
  Satisfactory: 0,
  Tolerable: 0,
  Frustrated: 0,
  Unknown: 0
};

// Add apdex rating and count
allResults.forEach(r => {
  const rating = classifyApdex(r.firstResponseTime);
  r.apdexRating = rating;
  apdexSummary[rating] = (apdexSummary[rating] || 0) + 1;
});

const total = allResults.length;

// ---------------------------
// ✅ Write to Excel
// ---------------------------

const worksheetData = [
  ['User', 'User Message', 'Bot Response', 'Full Response Time (ms)', 'First Response Time (ms)', 'CPU Usage (%)', 'Memory Usage (RSS %)', 'Apdex Rating'],
  ...allResults.map(r => [
    r.user,
    r.message,
    r.response,
    typeof r.fullResponseTime === 'number' ? r.fullResponseTime : '',
    typeof r.firstResponseTime === 'number' ? r.firstResponseTime : '',
    r.cpuUsagePercent ?? '',
    r.memoryUsageRSS ?? '',
    r.apdexRating
  ])
];

const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'All Responses');

// ---------------------------
// 🟨 Add Apdex Summary Sheet
// ---------------------------

const apdexSummarySheetData = [
  ['APDEX Category', 'Count', 'Percentage'],
  ['Satisfactory', apdexSummary.Satisfactory, ((apdexSummary.Satisfactory / total) * 100).toFixed(1) + '%'],
  ['Tolerable', apdexSummary.Tolerable, ((apdexSummary.Tolerable / total) * 100).toFixed(1) + '%'],
  ['Frustrated', apdexSummary.Frustrated, ((apdexSummary.Frustrated / total) * 100).toFixed(1) + '%'],
  ['Unknown', apdexSummary.Unknown, ((apdexSummary.Unknown / total) * 100).toFixed(1) + '%'],
  ['Total Responses', total, '100%'],
  [],
  ['Apdex Score', ((apdexSummary.Satisfactory + 0.5 * apdexSummary.Tolerable) / total).toFixed(3)]
];

const apdexWorksheet = xlsx.utils.aoa_to_sheet(apdexSummarySheetData);
xlsx.utils.book_append_sheet(workbook, apdexWorksheet, 'Apdex Summary');

// ---------------------------
// 💾 Save Excel File
// ---------------------------

xlsx.writeFile(workbook, OUTPUT_FILE);
console.log(`✅ Combined Excel file created: ${OUTPUT_FILE}`);

// ---------------------------
// 📈 Console Output Summary
// ---------------------------

console.log('\n📈 APDEX Category Summary (per response):');
for (const category of ['Satisfactory', 'Tolerable', 'Frustrated', 'Unknown']) {
  const count = apdexSummary[category];
  const percent = ((count / total) * 100).toFixed(1);
  console.log(`• ${category}: ${count} (${percent}%)`);
}

const apdexScore = ((apdexSummary.Satisfactory + 0.5 * apdexSummary.Tolerable) / total).toFixed(3);
console.log(`• Apdex Score: ${apdexScore}`);
