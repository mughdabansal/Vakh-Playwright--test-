const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  calculateNextSchedule,
  updateWorkflowSchedule,
  WORKFLOW_DEFAULTS,
  DAY_NAMES
} = require('./dynamic-scheduler');

console.log('Running Dynamic Scheduler Unit Tests...\n');

// Test 1: Calculate Schedule returns valid cron and date objects
{
  const result = calculateNextSchedule('load-testing', {}, new Date('2026-10-30T10:00:00Z'));
  assert(result.cron, 'Should have a cron string');
  assert(result.nextRunDate instanceof Date, 'Should return a valid Date instance');
  assert(result.minuteUtc >= 0 && result.minuteUtc <= 59, 'Minute should be between 0 and 59');
  assert(WORKFLOW_DEFAULTS['load-testing'].allowedHoursUtc.includes(result.hourUtc), 'Hour should be within allowed off-peak UTC hours');
  assert(WORKFLOW_DEFAULTS['load-testing'].targetDaysOfWeek.includes(result.dayOfWeek), 'Target day should be in target days of week');
  assert(result.formattedUTC.includes('UTC'), 'Formatted UTC string should include UTC');
  assert(result.formattedIST.includes('IST'), 'Formatted IST string should include IST');
  console.log('✔ Test 1 Passed: Schedule calculation produces valid outputs');
}

// Test 2: Variance across multiple calls
{
  const minutes = new Set();
  const crons = new Set();
  for (let i = 0; i < 20; i++) {
    const s = calculateNextSchedule('test-api', {}, new Date('2026-10-30T10:00:00Z'));
    minutes.add(s.minuteUtc);
    crons.add(s.cron);
  }
  assert(minutes.size > 1, 'Minutes should vary across runs');
  assert(crons.size > 1, 'Cron expressions should vary across runs');
  console.log(`✔ Test 2 Passed: Dynamic variance verified (${crons.size} unique crons across 20 samples)`);
}

// Test 3: Workflow File Update (Mock file)
{
  const tempFilePath = path.join(__dirname, 'temp-test-workflow.yml');
  const sampleWorkflow = `name: Test Suite

on:
  schedule:
    # Initial static schedule
    - cron: '30 22 * * 0,4'
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "hello"
`;

  try {
    fs.writeFileSync(tempFilePath, sampleWorkflow, 'utf8');

    // First dynamic update
    const schedule1 = {
      workflowKey: 'load-testing',
      cron: '17 21 * * 4',
      formattedUTC: 'Thursday, 05 Nov 2026 at 21:17 UTC',
      formattedIST: 'Friday, 06 Nov 2026 at 02:47 IST',
      daysUntil: 4
    };

    const res1 = updateWorkflowSchedule(tempFilePath, schedule1, false);
    assert.strictEqual(res1.previousCron, '30 22 * * 0,4');
    assert.strictEqual(res1.newCron, '17 21 * * 4');

    const content1 = fs.readFileSync(tempFilePath, 'utf8');
    assert(content1.includes("- cron: '17 21 * * 4'"));
    assert(content1.includes('Dynamic schedule: automatically recalculated after every run'));
    assert(content1.includes('jobs:'), 'Subsequent jobs block should remain intact');

    // Second consecutive dynamic update (verifying regex works on already dynamically updated block)
    const schedule2 = {
      workflowKey: 'load-testing',
      cron: '42 23 * * 0',
      formattedUTC: 'Sunday, 08 Nov 2026 at 23:42 UTC',
      formattedIST: 'Monday, 09 Nov 2026 at 05:12 IST',
      daysUntil: 3
    };

    const res2 = updateWorkflowSchedule(tempFilePath, schedule2, false);
    assert.strictEqual(res2.previousCron, '17 21 * * 4');
    assert.strictEqual(res2.newCron, '42 23 * * 0');

    const content2 = fs.readFileSync(tempFilePath, 'utf8');
    assert(content2.includes("- cron: '42 23 * * 0'"));
    assert(!content2.includes("- cron: '17 21 * * 4'"), 'Old cron should be replaced');
    assert(content2.includes('jobs:'), 'Jobs block must still remain intact');

    console.log('✔ Test 3 Passed: Consecutive file updates work seamlessly without corrupting workflow');
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

// Test 4: Custom hour constraints and DOM mode
{
  const customSched = calculateNextSchedule('load-testing', {
    mode: 'dom',
    customHours: [2, 3]
  }, new Date('2026-10-30T10:00:00Z'));

  assert([2, 3].includes(customSched.hourUtc), 'Hour should respect customHours filter');
  const cronParts = customSched.cron.split(' ');
  assert.strictEqual(cronParts.length, 5, 'Cron must have 5 parts');
  assert.strictEqual(cronParts[4], '*', 'Day of week should be * in DOM mode');
  console.log('✔ Test 4 Passed: Custom options and DOM mode work as expected');
}

console.log('\nAll Dynamic Scheduler unit tests passed successfully! 🎉');

