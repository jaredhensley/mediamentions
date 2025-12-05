#!/usr/bin/env node
/**
 * Media Mentions Coverage Monitor
 *
 * Tracks coverage improvements across all clients by comparing
 * automated system results with manual tracking baselines.
 *
 * Usage: node monitor-coverage.js
 */

const { runQuery } = require('./src/db');
const fs = require('fs');
const path = require('path');

// Manual tracking baselines (from agent analysis)
const BASELINES = {
  'Equitable Food Initiative': { manual: 82, expected: 33 },
  'Full Tilt Marketing': { manual: 4, expected: 4 },
  'Bushwick Commission': { manual: 2, expected: 1 },
  'North Dakota 250': { manual: 39, expected: 0 }, // PDF-only, unfixable
  'Todd Greiner Farms': { manual: 0, expected: 0 }, // No baseline
  'Michigan Asparagus Advisory Board': { manual: 0, expected: 0 },
  'North Carolina Sweetpotato Commission': { manual: 0, expected: 0 },
  'Texas Watermelon Association': { manual: 0, expected: 0 },
  'South Texas Onion Committee': { manual: 0, expected: 0 },
  'Colombia Avocado Board': { manual: 2, expected: 2 },
  'Dakota Angus': { manual: 0, expected: 0 },
  'G&R Farms': { manual: 0, expected: 0 }
};

console.log('Media Mentions Coverage Monitor');
console.log('='.repeat(80));
console.log(`Report Date: ${new Date().toISOString().split('T')[0]}`);
console.log('180-Day Window: June 7 - December 4, 2025');
console.log('='.repeat(80));
console.log();

// Get all clients
const clients = runQuery('SELECT id, name FROM clients ORDER BY name');

let totalManual = 0;
let totalAutomated = 0;
let totalExpected = 0;
const results = [];

clients.forEach(client => {
  const baseline = BASELINES[client.name] || { manual: 0, expected: 0 };

  // Get automated mentions count
  const [count] = runQuery(
    'SELECT COUNT(*) as count FROM mediaMentions WHERE clientId = @p0',
    [client.id]
  );

  const automated = count.count;
  const manual = baseline.manual;
  const expected = baseline.expected;

  totalManual += manual;
  totalAutomated += automated;
  totalExpected += expected;

  let coverage = 0;
  let status = '';

  if (manual > 0) {
    coverage = (automated / manual * 100).toFixed(1);

    if (automated >= expected) {
      status = '✅';
    } else if (automated >= expected * 0.75) {
      status = '🟡';
    } else {
      status = '🔴';
    }
  } else {
    status = '⚪'; // No baseline
  }

  results.push({
    name: client.name,
    manual,
    automated,
    expected,
    coverage,
    status
  });
});

// Print results
console.log('CLIENT COVERAGE REPORT');
console.log('-'.repeat(80));
console.log();

results.forEach(r => {
  console.log(`${r.status} ${r.name}`);
  console.log(`   Manual: ${r.manual} | Automated: ${r.automated} | Expected: ${r.expected}`);

  if (r.manual > 0) {
    console.log(`   Coverage: ${r.coverage}%`);
  } else {
    console.log(`   Coverage: N/A (no baseline)`);
  }

  if (r.automated > 0 && r.manual > 0) {
    const diff = r.automated - r.expected;
    if (diff > 0) {
      console.log(`   Performance: +${diff} above expected ✨`);
    } else if (diff < 0) {
      console.log(`   Performance: ${diff} below expected`);
    } else {
      console.log(`   Performance: On target`);
    }
  }

  console.log();
});

console.log('='.repeat(80));
console.log('SUMMARY STATISTICS');
console.log('='.repeat(80));
console.log();
console.log(`Total Manual Mentions: ${totalManual}`);
console.log(`Total Automated Mentions: ${totalAutomated}`);
console.log(`Total Expected: ${totalExpected}`);
console.log();

if (totalManual > 0) {
  const overallCoverage = (totalAutomated / totalManual * 100).toFixed(1);
  const expectedCoverage = (totalExpected / totalManual * 100).toFixed(1);
  console.log(`Overall Coverage: ${overallCoverage}%`);
  console.log(`Expected Coverage: ${expectedCoverage}%`);
  console.log();

  if (totalAutomated >= totalExpected) {
    console.log(`✅ ON TRACK: Meeting or exceeding expected coverage`);
  } else {
    console.log(`🔴 BELOW TARGET: ${totalExpected - totalAutomated} mentions below expected`);
  }
}

// Highlight critical clients
console.log();
console.log('CRITICAL CLIENTS TO MONITOR:');
console.log('-'.repeat(80));
console.log();

const critical = [
  { name: 'Full Tilt Marketing', reason: 'Industry realignment - should go 0% → 100%' },
  { name: 'Equitable Food Initiative', reason: 'Added ECIP - should improve 28% → 40%' },
  { name: 'Todd Greiner Farms', reason: 'TGF abbreviation - significant improvement expected' }
];

critical.forEach(c => {
  const result = results.find(r => r.name === c.name);
  if (result) {
    console.log(`${result.status} ${c.name}`);
    console.log(`   ${c.reason}`);
    console.log(`   Current: ${result.automated}/${result.expected} expected`);
    console.log();
  }
});

// Status legend
console.log('='.repeat(80));
console.log('STATUS LEGEND:');
console.log('-'.repeat(80));
console.log('✅ Meeting or exceeding expected coverage');
console.log('🟡 75-99% of expected coverage (close)');
console.log('🔴 Below 75% of expected coverage');
console.log('⚪ No baseline data available');
console.log();

// Save report
const reportPath = path.join(__dirname, 'coverage-report.json');
const report = {
  date: new Date().toISOString(),
  totalManual,
  totalAutomated,
  totalExpected,
  overallCoverage: totalManual > 0 ? (totalAutomated / totalManual * 100).toFixed(1) : 'N/A',
  clients: results
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📊 Report saved to: ${reportPath}`);
console.log();
