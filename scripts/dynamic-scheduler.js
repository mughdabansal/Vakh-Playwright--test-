#!/usr/bin/env node

/**
 * Dynamic Workflow Scheduler for Load Testing and API Suites
 * 
 * Recalculates and updates GitHub Actions cron schedule dynamically after every run,
 * introducing variable off-peak time windows and randomized minute offsets to prevent
 * predictable execution times and capture authentic system performance.
 */

const fs = require('fs');
const path = require('path');

const WORKFLOW_DEFAULTS = {
  'load-testing': {
    name: 'Load Testing Suite',
    relPath: path.join('.github', 'workflows', 'load-testing.yml'),
    // Historical cadence: Sun (0) and Thu (4) UTC (~every 3-4 days)
    targetDaysOfWeek: [0, 4],
    minDaysInterval: 3,
    maxDaysInterval: 4,
    // Off-peak hours in UTC (20:00 to 03:00 UTC = 01:30 to 08:30 IST)
    allowedHoursUtc: [20, 21, 22, 23, 0, 1, 2, 3],
  },
  'test-api': {
    name: 'API Risk-Tiered & Security Test Suites',
    relPath: path.join('.github', 'workflows', 'test-api.yml'),
    // Historical cadence: Wed (3) and Sat (6) UTC (~every 3-4 days)
    targetDaysOfWeek: [3, 6],
    minDaysInterval: 3,
    maxDaysInterval: 4,
    // Off-peak hours in UTC (19:00 to 02:00 UTC = 00:30 to 07:30 IST)
    allowedHoursUtc: [19, 20, 21, 22, 23, 0, 1, 2],
  }
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Format date in IST (UTC +5:30)
 */
function formatIST(date) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  const hours = String(istDate.getUTCHours()).padStart(2, '0');
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const dayName = DAY_NAMES[istDate.getUTCDay()];
  const dateStr = istDate.toUTCString().slice(5, 16);
  return `${dayName}, ${dateStr} at ${hours}:${minutes} IST`;
}

/**
 * Format date in UTC
 */
function formatUTC(date) {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const dayName = DAY_NAMES[date.getUTCDay()];
  const dateStr = date.toUTCString().slice(5, 16);
  return `${dayName}, ${dateStr} at ${hours}:${minutes} UTC`;
}

/**
 * Parse CLI arguments
 */
function parseArgs(args) {
  const options = {
    workflow: 'load-testing',
    dryRun: false,
    mode: 'dow', // 'dow' (day-of-week) or 'dom' (day-of-month / exact date)
    customHours: null,
    customFile: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--workflow=')) {
      const val = arg.split('=')[1].toLowerCase().trim();
      options.workflow = val === 'api' || val === 'test-api' ? 'test-api' : 'load-testing';
    } else if (arg.startsWith('--file=')) {
      options.customFile = arg.split('=')[1].trim();
    } else if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1].toLowerCase().trim();
    } else if (arg.startsWith('--hours=')) {
      const val = arg.split('=')[1];
      if (val.includes('-')) {
        const [start, end] = val.split('-').map(n => parseInt(n, 10));
        options.customHours = [];
        for (let h = start; h <= end; h++) options.customHours.push(h);
      } else {
        options.customHours = val.split(',').map(n => parseInt(n.trim(), 10));
      }
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

/**
 * Calculate dynamic next execution time
 */
function calculateNextSchedule(workflowKey, options = {}, baseDate = new Date()) {
  const config = WORKFLOW_DEFAULTS[workflowKey] || WORKFLOW_DEFAULTS['load-testing'];
  const allowedHours = options.customHours && options.customHours.length > 0
    ? options.customHours
    : config.allowedHoursUtc;

  // 1. Pick a dynamic random hour from allowed off-peak hours
  const randomHour = allowedHours[Math.floor(Math.random() * allowedHours.length)];

  // 2. Pick a dynamic random minute (0 to 59)
  const randomMinute = Math.floor(Math.random() * 60);

  // 3. Determine next execution day
  const currentDOW = baseDate.getUTCDay();
  let nextDOW;

  if (config.targetDaysOfWeek && config.targetDaysOfWeek.length > 0) {
    // Find next day in rotating cycle
    const sorted = [...config.targetDaysOfWeek].sort((a, b) => a - b);
    const subsequent = sorted.find(d => d > currentDOW);
    nextDOW = subsequent !== undefined ? subsequent : sorted[0];
  } else {
    // Default to adding 3 or 4 days
    const intervalDays = Math.random() < 0.5 ? config.minDaysInterval : config.maxDaysInterval;
    nextDOW = (currentDOW + intervalDays) % 7;
  }

  // Calculate day difference
  let daysUntil = nextDOW - currentDOW;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  // Create exact next run Date object in UTC
  const nextRunDate = new Date(baseDate.getTime());
  nextRunDate.setUTCDate(nextRunDate.getUTCDate() + daysUntil);
  nextRunDate.setUTCHours(randomHour, randomMinute, 0, 0);

  // Formulate cron expression
  let cronExpr;
  if (options.mode === 'dom') {
    // Exact day of month: minute hour day-of-month month *
    const dom = nextRunDate.getUTCDate();
    const month = nextRunDate.getUTCMonth() + 1;
    cronExpr = `${randomMinute} ${randomHour} ${dom} ${month} *`;
  } else {
    // Standard Day of Week: minute hour * * day-of-week
    cronExpr = `${randomMinute} ${randomHour} * * ${nextDOW}`;
  }

  return {
    workflowKey,
    workflowName: config.name,
    cron: cronExpr,
    nextRunDate,
    dayOfWeek: nextDOW,
    dayName: DAY_NAMES[nextDOW],
    hourUtc: randomHour,
    minuteUtc: randomMinute,
    formattedUTC: formatUTC(nextRunDate),
    formattedIST: formatIST(nextRunDate),
    daysUntil,
  };
}

/**
 * Update the workflow file with the new dynamic schedule
 */
function updateWorkflowSchedule(filePath, scheduleResult, isDryRun = false) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow file not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Match the on.schedule block:
  // schedule:
  //   - cron: '...'
  // or with comments
  const scheduleRegex = /schedule:\s*\n(?:\s*#[^\n]*\n)*\s*-\s*cron:\s*['"][^'"]+['"]/;

  if (!scheduleRegex.test(content)) {
    throw new Error(`Could not find valid 'schedule:' block in ${filePath}`);
  }

  // Extract previous cron for logging
  const currentMatch = content.match(/-\s*cron:\s*['"]([^'"]+)['"]/);
  const previousCron = currentMatch ? currentMatch[1] : 'unknown';

  const newScheduleBlock = `schedule:\n    # Dynamic schedule: automatically recalculated after every run\n    # Next execution: ${scheduleResult.formattedUTC} (${scheduleResult.formattedIST})\n    - cron: '${scheduleResult.cron}'`;

  const updatedContent = content.replace(scheduleRegex, newScheduleBlock);

  if (!isDryRun) {
    fs.writeFileSync(filePath, updatedContent, 'utf8');
  }

  return {
    previousCron,
    newCron: scheduleResult.cron,
    updated: !isDryRun,
  };
}

/**
 * Save schedule metadata for dashboard / summary consumption
 */
function recordScheduleReport(reportsDir, reportData) {
  try {
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const reportPath = path.join(reportsDir, 'dynamic-schedule-state.json');
    let state = {};
    if (fs.existsSync(reportPath)) {
      try {
        state = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      } catch (e) {}
    }
    state[reportData.workflowKey] = {
      ...reportData,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(reportPath, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not persist dynamic schedule state:', err.message);
  }
}

/**
 * Write GitHub Actions step summary if running in CI
 */
function writeGitHubStepSummary(scheduleResult, previousCron) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const summaryMarkdown = `
### 🔄 Dynamic Schedule Updated for Next Run

| Property | Value |
| :--- | :--- |
| **Workflow** | \`${scheduleResult.workflowName}\` |
| **Next Target Run (UTC)** | **${scheduleResult.formattedUTC}** |
| **Next Target Run (IST)** | **${scheduleResult.formattedIST}** |
| **New Cron Expression** | \`${scheduleResult.cron}\` |
| **Prior Cron Expression** | \`${previousCron}\` |
| **Interval / Shift** | +${scheduleResult.daysUntil} days (Dynamic Minute: \`${scheduleResult.minuteUtc}\`, Dynamic Hour: \`${scheduleResult.hourUtc}:00 UTC\`) |

> ℹ️ *The scheduled trigger time is dynamic and automatically recalculated after every run to avoid static test cadence bias.*
`;

  try {
    fs.appendFileSync(summaryFile, summaryMarkdown, 'utf8');
  } catch (err) {
    console.warn('Could not write to GITHUB_STEP_SUMMARY:', err.message);
  }
}

/**
 * Main execution
 */
function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(__dirname, '..');
  const config = WORKFLOW_DEFAULTS[options.workflow] || WORKFLOW_DEFAULTS['load-testing'];
  const targetFile = options.customFile
    ? path.resolve(process.cwd(), options.customFile)
    : path.resolve(rootDir, config.relPath);

  console.log(`\n========================================================`);
  console.log(`   🕒 DYNAMIC WORKFLOW SCHEDULE GENERATOR`);
  console.log(`   Workflow: ${config.name} (${options.workflow})`);
  console.log(`   Target File: ${targetFile}`);
  console.log(`   Dry Run:  ${options.dryRun ? 'YES (No files modified)' : 'NO (Applying update)'}`);
  console.log(`========================================================\n`);

  const schedule = calculateNextSchedule(options.workflow, options);
  const updateResult = updateWorkflowSchedule(targetFile, schedule, options.dryRun);

  console.log(`✅ Previous Cron: ${updateResult.previousCron}`);
  console.log(`🚀 New Dynamic Cron: ${updateResult.newCron}`);
  console.log(`📅 Next Run (UTC): ${schedule.formattedUTC}`);
  console.log(`🇮🇳 Next Run (IST): ${schedule.formattedIST}`);
  console.log(`⏱️ Shift: +${schedule.daysUntil} days | Dynamic Hour: ${schedule.hourUtc} UTC | Dynamic Minute: ${schedule.minuteUtc}`);
  console.log(`📝 Status: ${options.dryRun ? 'DRY-RUN COMPLETE' : 'WORKFLOW FILE UPDATED SUCCESSFULLY'}\n`);

  if (!options.dryRun) {
    const reportsDir = path.resolve(rootDir, 'test-reports');
    recordScheduleReport(reportsDir, {
      ...schedule,
      previousCron: updateResult.previousCron,
    });
    writeGitHubStepSummary(schedule, updateResult.previousCron);
  }

  return schedule;
}

if (require.main === module) {
  main();
}

module.exports = {
  calculateNextSchedule,
  updateWorkflowSchedule,
  WORKFLOW_DEFAULTS,
  DAY_NAMES,
};

