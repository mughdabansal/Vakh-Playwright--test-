const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripAnsi(str) {
  if (!str) return '';
  // Strip ANSI escape codes
  return String(str).replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function formatDuration(ms) {
  if (!ms || isNaN(ms)) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function getRelativeTime(timestamp) {
  try {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diffSecs = Math.max(0, Math.floor((now - then) / 1000));
    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} min${Math.floor(diffSecs / 60) === 1 ? '' : 's'} ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hour${Math.floor(diffSecs / 3600) === 1 ? '' : 's'} ago`;
    return `${Math.floor(diffSecs / 86400)} day${Math.floor(diffSecs / 86400) === 1 ? '' : 's'} ago`;
  } catch (e) {
    return '';
  }
}

function extractTests(suite, parentSuiteName = '') {
  let list = [];
  const currentSuiteName = suite.title ? (parentSuiteName ? `${parentSuiteName} › ${suite.title}` : suite.title) : parentSuiteName;
  const currentFile = suite.file || '';

  if (suite.specs) {
    for (const spec of suite.specs) {
      const tests = spec.tests || [];
      for (const t of tests) {
        const results = t.results || [];
        const finalResult = results[results.length - 1] || null;
        
        let status = 'passed';
        if (t.status === 'unexpected' || (finalResult && (finalResult.status === 'failed' || finalResult.status === 'timedOut'))) {
          status = 'failed';
        } else if (t.status === 'flaky' || results.some(r => r.status === 'failed' || r.status === 'timedOut')) {
          status = 'flaky';
        } else if (t.status === 'skipped' || (finalResult && finalResult.status === 'skipped')) {
          status = 'skipped';
        }

        let totalDuration = 0;
        let lastError = null;
        const attempts = results.map((r, i) => {
          totalDuration += (r.duration || 0);
          if (r.error && !lastError) {
            lastError = r.error;
          }
          return {
            attempt: i + 1,
            status: r.status,
            duration: r.duration || 0,
            durationFormatted: formatDuration(r.duration || 0),
            error: r.error ? {
              message: stripAnsi(r.error.message || ''),
              stack: stripAnsi(r.error.stack || '')
            } : null
          };
        });

        // Derive test ID if present in title
        const idMatch = spec.title.match(/^(TC_[A-Z0-9_]+|API_[A-Z0-9_]+):?/);
        const testId = idMatch ? idMatch[1] : `TEST_${String(list.length + 1).padStart(3, '0')}`;
        const cleanTitle = spec.title.replace(/^(TC_[A-Z0-9_]+|API_[A-Z0-9_]+):?\s*/, '');

        list.push({
          id: testId,
          title: spec.title,
          cleanTitle: cleanTitle,
          file: (currentFile || (suite.file || '')).replace(/\\/g, '/'),
          line: spec.line || 0,
          column: spec.column || 0,
          suite: currentSuiteName,
          project: t.projectName || 'chromium',
          status: status,
          duration: totalDuration,
          durationFormatted: formatDuration(totalDuration),
          attemptsCount: attempts.length,
          attempts: attempts,
          error: lastError ? {
            message: stripAnsi(lastError.message || ''),
            stack: stripAnsi(lastError.stack || '')
          } : null
        });
      }
    }
  }

  if (suite.suites) {
    for (const sub of suite.suites) {
      list = list.concat(extractTests(sub, currentSuiteName));
    }
  }

  return list;
}

function loadLastRunData(reportsDir, resultsJsonPath, lastUpdated) {
  let gitSha = '';
  let gitBranch = 'main';
  try {
    gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    gitSha = '073e926';
  }

  const ciWorkflow = process.env.GITHUB_WORKFLOW || '';
  const ciJob = process.env.GITHUB_JOB || '';
  const ciRunId = process.env.GITHUB_RUN_ID || null;
  const ciRunNumber = process.env.GITHUB_RUN_NUMBER || null;
  const ciEvent = process.env.GITHUB_EVENT_NAME || 'manual';
  const ciActor = process.env.GITHUB_ACTOR || 'Developer';
  const ciSha = (process.env.GITHUB_SHA || gitSha || '').slice(0, 7);
  const ciRef = process.env.GITHUB_REF_NAME || gitBranch || 'main';

  let rawData = null;
  if (fs.existsSync(resultsJsonPath)) {
    try {
      rawData = JSON.parse(fs.readFileSync(resultsJsonPath, 'utf8'));
    } catch (e) {
      console.warn('Could not parse results.json for last run:', e.message);
    }
  }

  let tests = [];
  let stats = {
    startTime: new Date().toISOString(),
    duration: 0,
    expected: 0,
    unexpected: 0,
    flaky: 0,
    skipped: 0
  };

  if (rawData) {
    if (rawData.stats) {
      stats.startTime = rawData.stats.startTime || stats.startTime;
      stats.duration = rawData.stats.duration || 0;
      stats.expected = rawData.stats.expected || 0;
      stats.unexpected = rawData.stats.unexpected || 0;
      stats.flaky = rawData.stats.flaky || 0;
      stats.skipped = rawData.stats.skipped || 0;
    }

    if (rawData.suites) {
      for (const s of rawData.suites) {
        tests = tests.concat(extractTests(s));
      }
    }
  }

  // Calculate test summary metrics
  const totalTests = tests.length;
  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const flakyTests = tests.filter(t => t.status === 'flaky').length;
  const skippedTests = tests.filter(t => t.status === 'skipped').length;
  
  const passRate = totalTests > 0 ? (((passedTests + flakyTests) / totalTests) * 100).toFixed(1) : '100.0';
  const overallStatus = failedTests === 0 ? (totalTests > 0 ? 'PASSED' : 'IDLE') : 'FAILED';
  
  // Detect targeted spec files
  const filesDetected = Array.from(new Set(tests.map(t => path.basename(t.file)))).filter(Boolean);
  const browsersDetected = Array.from(new Set(tests.map(t => t.project))).filter(Boolean);

  let suiteLabel = 'Playwright Test Suite';
  if (filesDetected.length > 0) {
    if (filesDetected.some(f => f.includes('sanity'))) {
      suiteLabel = 'Versioned Sanity Suites';
    } else if (filesDetected.length === 1) {
      const f = filesDetected[0];
      if (f.includes('activity')) suiteLabel = 'Activity & Notifications Page Suite';
      else if (f.includes('post')) suiteLabel = 'Create Post & Polls Suite';
      else if (f.includes('home')) suiteLabel = 'Home & Feed Page Suite';
      else if (f.includes('chat')) suiteLabel = 'Chat & Collaboration Page Suite';
      else if (f.includes('explore')) suiteLabel = 'Explore & Discovery Page Suite';
      else if (f.includes('login')) suiteLabel = 'Authentication & Login Page Suite';
      else if (f.includes('api')) suiteLabel = 'Risk-Tiered Backend API Suite';
      else suiteLabel = f.replace('.spec.ts', ' Suite');
    } else {
      suiteLabel = `${filesDetected.length} Test Suites (${filesDetected.slice(0, 2).join(', ')}${filesDetected.length > 2 ? '...' : ''})`;
    }
  }

  const workflowDisplayName = ciWorkflow || suiteLabel;
  const runTimestampFormatted = new Date(stats.startTime).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });
  const relativeTime = getRelativeTime(stats.startTime);

  // Load and update persistent run history
  const historyPath = path.join(reportsDir, 'last-run-history.json');
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) {}
  }

  const currentRunEntry = {
    id: ciRunId ? `run-${ciRunId}` : `local-${Date.parse(stats.startTime) || Date.now()}`,
    runNumber: ciRunNumber,
    runUrl: ciRunId ? `https://github.com/mughdabansal/Vakh-Playwright--test-/actions/runs/${ciRunId}` : null,
    timestamp: stats.startTime,
    formattedTime: runTimestampFormatted,
    workflow: workflowDisplayName,
    event: ciEvent,
    actor: ciActor,
    sha: ciSha,
    ref: ciRef,
    totalTests,
    passedTests,
    failedTests,
    flakyTests,
    durationMs: stats.duration,
    durationFormatted: formatDuration(stats.duration),
    status: overallStatus,
    suiteLabel
  };

  // Add current run if not duplicate
  const existsIndex = history.findIndex(h => h.id === currentRunEntry.id || (h.timestamp === currentRunEntry.timestamp && h.totalTests === currentRunEntry.totalTests));
  if (existsIndex >= 0) {
    history[existsIndex] = currentRunEntry;
  } else {
    history.unshift(currentRunEntry);
  }
  history = history.slice(0, 15); // Keep last 15 runs

  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write last-run-history.json:', e.message);
  }

  return {
    lastUpdated,
    overallStatus,
    suiteLabel,
    workflowDisplayName,
    ciRunId,
    ciRunNumber,
    ciEvent,
    ciActor,
    ciSha,
    ciRef,
    ciRunUrl: currentRunEntry.runUrl,
    runner: process.env.CI ? 'GitHub Actions (Ubuntu 24.04)' : 'Local Environment',
    startTime: stats.startTime,
    runTimestampFormatted,
    relativeTime,
    durationMs: stats.duration,
    durationFormatted: formatDuration(stats.duration),
    totalTests,
    passedTests,
    failedTests,
    flakyTests,
    skippedTests,
    passRate,
    badgeText: `${passedTests}/${totalTests} Passed`,
    filesDetected,
    browsersDetected: browsersDetected.length > 0 ? browsersDetected : ['chromium'],
    tests,
    history
  };
}

function generateLastRunViewHtml(data) {
  const isPassing = data.overallStatus === 'PASSED';
  const statusColor = isPassing ? 'var(--success)' : 'var(--danger)';
  const statusBadgeClass = isPassing ? 'passed' : 'failed';
  const statusGlow = isPassing ? 'var(--success-glow)' : 'rgba(239, 68, 68, 0.2)';

  // Build rows for detailed test cases
  const rowsHtml = (data.tests || []).map((t, idx) => {
    const isPass = t.status === 'passed';
    const isFlaky = t.status === 'flaky';
    const isFail = t.status === 'failed';
    const statusClass = isPass ? 'passed' : (isFlaky ? 'orange' : (isFail ? 'failed' : 'browser'));
    const statusLabel = isPass ? 'PASSED' : (isFlaky ? 'FLAKY (PASSED)' : (isFail ? 'FAILED' : 'SKIPPED'));

    const browserIcon = t.project === 'firefox' ? '🦊' : (t.project === 'webkit' ? '🧭' : (t.project === 'edge' ? '🌊' : '🌐'));
    const searchBlob = `${t.id} ${t.title} ${t.cleanTitle} ${t.file} ${t.project} ${t.status} ${t.error ? t.error.message : ''}`.toLowerCase();

    const attemptsHtml = (t.attempts || []).map(a => {
      const aColor = a.status === 'passed' ? 'var(--success)' : 'var(--danger)';
      const aIcon = a.status === 'passed' ? '✅' : '❌';
      return `
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; padding: 0.25rem 0.6rem; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 6px;">
          <span>${aIcon} Attempt ${a.attempt}:</span>
          <span style="color: ${aColor}; font-weight: 600; text-transform: uppercase;">${a.status}</span>
          <span style="color: var(--text-dim);">(${a.durationFormatted})</span>
        </div>
      `;
    }).join('');

    const errorHtml = t.error ? `
      <div style="margin-top: 0.85rem; padding: 0.85rem 1rem; background: #130a0d; border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #f87171; display: flex; align-items: center; gap: 0.4rem;">
            <span>⚠️ Execution Failure Diagnostics</span>
          </div>
          <button class="btn-github" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="copyTestError('error-text-${idx}')">
            📋 Copy Trace
          </button>
        </div>
        <pre id="error-text-${idx}" style="margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: #fca5a5; white-space: pre-wrap; word-break: break-all; max-height: 240px; overflow-y: auto; background: transparent; border: none; padding: 0;">${escapeHtml(t.error.message)}

${escapeHtml(t.error.stack || '')}</pre>
      </div>
    ` : '';

    return `
      <div class="lastrun-test-card" data-status="${t.status}" data-browser="${t.project}" data-search="${escapeHtml(searchBlob)}" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 0.75rem; overflow: hidden; transition: all 0.2s ease;">
        <div class="lastrun-card-header" style="padding: 0.9rem 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; cursor: pointer; user-select: none;" onclick="toggleLastRunCard('lastrun-detail-${idx}')">
          <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 0;">
            <span class="badge ${statusClass}" style="flex-shrink: 0; font-size: 0.74rem;">${statusLabel}</span>
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <code style="font-weight: 700; color: #60a5fa; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">${escapeHtml(t.id)}</code>
                <span style="font-weight: 600; color: var(--text); font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(t.cleanTitle)}</span>
              </div>
              <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 0.2rem; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                <span>📄 ${escapeHtml(t.file)}:${t.line}</span>
                <span>•</span>
                <span>${browserIcon} ${escapeHtml(t.project)}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 1rem; flex-shrink: 0;">
            <div style="text-align: right;">
              <div style="font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 0.88rem; color: #34d399;">${t.durationFormatted}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim);">${t.attemptsCount} attempt${t.attemptsCount === 1 ? '' : 's'}</div>
            </div>
            <span id="chevron-lastrun-detail-${idx}" style="font-size: 0.85rem; color: var(--text-muted); transition: transform 0.2s ease;">▼</span>
          </div>
        </div>

        <div id="lastrun-detail-${idx}" class="lastrun-card-body" style="display: ${isFail ? 'block' : 'none'}; padding: 0.85rem 1.15rem 1.15rem; border-top: 1px solid var(--border-subtle); background: var(--card-bg-subtle);">
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.65rem;">
            <strong>Suite Hierarchy:</strong> <code>${escapeHtml(t.suite)}</code>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
            ${attemptsHtml}
          </div>

          ${errorHtml}
        </div>
      </div>
    `;
  }).join('\n');

  // Build History Rows
  const historyRowsHtml = (data.history || []).map(h => {
    const isHPass = h.status === 'PASSED';
    const hBadge = isHPass ? 'passed' : 'failed';
    const linkHtml = h.runUrl ? `<a href="${h.runUrl}" target="_blank" style="color: #60a5fa; text-decoration: none; font-weight: 600;">#${h.runNumber || h.id} ↗</a>` : `<span style="color: var(--text-dim);">${h.id}</span>`;
    
    return `
      <tr>
        <td style="white-space: nowrap; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;">
          ${linkHtml}
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text); font-size: 0.85rem;">${escapeHtml(h.workflow)}</div>
          <div style="font-size: 0.72rem; color: var(--text-dim);">${escapeHtml(h.event)} &bull; ${escapeHtml(h.ref)} &bull; ${escapeHtml(h.sha)}</div>
        </td>
        <td style="white-space: nowrap;">
          <span class="badge ${hBadge}">${h.status}</span>
        </td>
        <td style="white-space: nowrap; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: #34d399;">
          ${h.passedTests} / ${h.totalTests} (${h.failedTests > 0 ? h.failedTests + ' fail' : 'all pass'})
        </td>
        <td style="white-space: nowrap; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--text-muted);">
          ${h.durationFormatted}
        </td>
        <td style="white-space: nowrap; font-size: 0.78rem; color: var(--text-dim);">
          ${escapeHtml(h.formattedTime)}
        </td>
      </tr>
    `;
  }).join('\n');

  return `
    <!-- ==================== VIEW: LAST RUN TESTS & EXECUTION TELEMETRY ==================== -->
    <div id="view-lastrun" class="view-content">
      
      <!-- Last Run Hero Header -->
      <div class="panel" style="background: radial-gradient(circle at top right, ${statusGlow}, var(--bg-card) 60%); border: 1px solid var(--border); margin-bottom: 1.5rem; position: relative; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.4rem;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${statusColor}; box-shadow: 0 0 12px ${statusColor}; animation: pulseBeacon 2s infinite;"></span>
              <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: ${statusColor};">
                Latest Job Telemetry
              </span>
              <span style="font-size: 0.78rem; color: var(--text-dim);">&bull;</span>
              <span style="font-size: 0.8rem; color: var(--text-muted);">${data.relativeTime}</span>
            </div>
            <h2 style="font-size: 1.6rem; font-weight: 800; margin: 0; color: var(--text); letter-spacing: -0.02em;">
              ${escapeHtml(data.workflowDisplayName)}
            </h2>
            <p style="font-size: 0.86rem; color: var(--text-muted); margin-top: 0.35rem; max-width: 780px;">
              Target Suite: <code style="color: #93c5fd; font-weight: 600;">${escapeHtml(data.suiteLabel)}</code> &bull; Execution synchronized at <strong>${escapeHtml(data.runTimestampFormatted)}</strong>.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span class="badge ${statusBadgeClass}" style="font-size: 0.95rem; padding: 0.45rem 1rem; border-radius: 9999px;">
              ${data.overallStatus}: ${data.passedTests} / ${data.totalTests} Passed (${data.passRate}%)
            </span>
            ${data.ciRunUrl ? `
              <a href="${data.ciRunUrl}" target="_blank" class="btn-github" style="display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none; padding: 0.45rem 0.9rem; font-size: 0.82rem;">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                GitHub Actions Run #${data.ciRunNumber || ''} ↗
              </a>
            ` : ''}
            <a href="last-run.html" target="_blank" class="btn-github" style="display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none; padding: 0.45rem 0.9rem; font-size: 0.82rem; background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.4); color: #93c5fd;">
              <span>🌐 Standalone Page ↗</span>
            </a>
          </div>
        </div>

        <!-- Telemetry Details Bar -->
        <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; font-size: 0.8rem;">
          <div>
            <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">CI / Execution Runner</div>
            <div style="color: var(--text); font-weight: 600; margin-top: 0.15rem;">${escapeHtml(data.runner)}</div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Trigger Event</div>
            <div style="color: var(--text); font-weight: 600; margin-top: 0.15rem;"><code>${escapeHtml(data.ciEvent)}</code> by <strong>${escapeHtml(data.ciActor)}</strong></div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Branch & Commit</div>
            <div style="color: var(--text); font-weight: 600; margin-top: 0.15rem;">
              <code style="color: #60a5fa;">${escapeHtml(data.ciRef)}</code> (<code style="color: #a78bfa;">${escapeHtml(data.ciSha)}</code>)
            </div>
          </div>
          <div>
            <div style="color: var(--text-dim); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Active Browsers</div>
            <div style="color: var(--text); font-weight: 600; margin-top: 0.15rem;">
              ${data.browsersDetected.map(b => `<span class="badge browser" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${b}</span>`).join(' ')}
            </div>
          </div>
        </div>
      </div>

      <!-- Key KPI Stat Cards -->
      <div class="grid-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 1.5rem;">
        <div class="stat-card blue">
          <div class="label">Total Scenarios Run</div>
          <div class="value">${data.totalTests}</div>
          <div class="subtext"><span>📋</span> ${data.filesDetected.length} spec file${data.filesDetected.length === 1 ? '' : 's'} included</div>
        </div>

        <div class="stat-card green">
          <div class="label">Passed Cleanly</div>
          <div class="value">${data.passedTests}</div>
          <div class="subtext"><span>✅</span> Zero retries required</div>
        </div>

        <div class="stat-card ${data.failedTests > 0 ? 'red' : 'green'}">
          <div class="label">Failures / Timeouts</div>
          <div class="value" style="color: ${data.failedTests > 0 ? '#f87171' : 'var(--text)'};">${data.failedTests}</div>
          <div class="subtext"><span>${data.failedTests > 0 ? '❌' : '🛡️'}</span> ${data.failedTests > 0 ? 'Attention required' : 'Zero test failures'}</div>
        </div>

        <div class="stat-card orange">
          <div class="label">Flaky Recovered</div>
          <div class="value" style="color: #fbbf24;">${data.flakyTests}</div>
          <div class="subtext"><span>⚡</span> Passed after retry attempts</div>
        </div>

        <div class="stat-card purple">
          <div class="label">Total Duration</div>
          <div class="value" style="font-size: 1.45rem;">${data.durationFormatted}</div>
          <div class="subtext"><span>⏱️</span> Playwright total test run time</div>
        </div>
      </div>

      <!-- Interactive Filtering and Search Controls -->
      <div class="panel" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          
          <!-- Status Pills -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Status:</span>
            <button class="lastrun-status-pill active" onclick="filterLastRunStatus('all', this)">
              All (${data.totalTests})
            </button>
            <button class="lastrun-status-pill" onclick="filterLastRunStatus('passed', this)">
              ✅ Passed (${data.passedTests})
            </button>
            <button class="lastrun-status-pill" onclick="filterLastRunStatus('flaky', this)">
              ⚡ Flaky (${data.flakyTests})
            </button>
            <button class="lastrun-status-pill" onclick="filterLastRunStatus('failed', this)">
              ❌ Failed (${data.failedTests})
            </button>
          </div>

          <!-- Browser Filter Pills -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase;">Browser:</span>
            <button class="lastrun-browser-pill active" onclick="filterLastRunBrowser('all', this)">
              All
            </button>
            <button class="lastrun-browser-pill" onclick="filterLastRunBrowser('chromium', this)">
              Chromium
            </button>
            <button class="lastrun-browser-pill" onclick="filterLastRunBrowser('firefox', this)">
              Firefox
            </button>
            <button class="lastrun-browser-pill" onclick="filterLastRunBrowser('webkit', this)">
              WebKit
            </button>
            <button class="lastrun-browser-pill" onclick="filterLastRunBrowser('edge', this)">
              Edge
            </button>
          </div>

          <!-- Actions -->
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <button class="btn-github" style="font-size: 0.75rem; padding: 0.35rem 0.7rem;" onclick="toggleAllLastRunCards(true)">
              ➕ Expand All
            </button>
            <button class="btn-github" style="font-size: 0.75rem; padding: 0.35rem 0.7rem;" onclick="toggleAllLastRunCards(false)">
              ➖ Collapse All
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div style="margin-top: 0.85rem; display: flex; align-items: center; gap: 0.75rem;">
          <div style="position: relative; flex: 1;">
            <input 
              type="text" 
              id="lastRunSearchInput" 
              placeholder="Search by test ID (e.g. TC_ACT_001), description, spec file, or assertion keyword..." 
              style="width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.55rem 0.85rem 0.55rem 2.2rem; color: var(--text); font-size: 0.84rem; outline: none; font-family: inherit;"
              oninput="filterLastRunTests()"
            />
            <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 0.9rem; color: var(--text-dim); pointer-events: none;">🔍</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">
            Showing <strong id="lastRunVisibleCount" style="color: #60a5fa;">${data.totalTests}</strong> of ${data.totalTests} tests
          </div>
        </div>
      </div>

      <!-- Test Cases List -->
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text); margin: 0;">
            🧪 Test Executions in this Run (${data.totalTests})
          </h3>
          <span style="font-size: 0.78rem; color: var(--text-dim);">
            Click any row to inspect execution attempts, durations, and diagnostics
          </span>
        </div>

        <div id="lastRunTestsContainer">
          ${rowsHtml || '<div class="panel" style="text-align: center; color: var(--text-dim); padding: 2rem;">No test executions found in results.json.</div>'}
        </div>
      </div>

      <!-- Recent Job Runs History Table -->
      <div class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">📜 Historical Job Executions & Comparison</div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">
              Comparison against previous automated workflows and test suites
            </p>
          </div>
          <span class="badge browser">${data.history.length} Runs Recorded</span>
        </div>

        <div style="overflow-x: auto;">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border);">
                <th style="text-align: left; padding: 0.65rem 0.85rem; font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Run / ID</th>
                <th style="text-align: left; padding: 0.65rem 0.85rem; font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Workflow / Trigger</th>
                <th style="text-align: left; padding: 0.65rem 0.85rem; font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Status</th>
                <th style="text-align: left; padding: 0.65rem 0.85rem; font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Scenarios</th>
                <th style="text-align: left; padding: 0.65rem 0.85rem; font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Duration</th>
                <th style="text-align: left; padding: 0.65rem 0.85rem; font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${historyRowsHtml || '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No historical runs recorded yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

function generateStandaloneLastRunHtml(data, cssTheme, fullIndexHtml) {
  // Extract head styling and scripts from fullIndexHtml or provide standalone template
  const viewHtml = generateLastRunViewHtml(data);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eve Vakh — Latest Test Run Telemetry & Execution Status</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --bg-elevated: #111827;
      --bg-card: #141e33;
      --border: #1f293d;
      --border-subtle: #2d3748;
      --text: #f9fafb;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.15);
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.15);
      --warning: #f59e0b;
      --danger: #ef4444;
      --purple: #8b5cf6;
      --input-bg: #0f172a;
      --card-bg-subtle: #0f172a;
      --btn-github-bg: #1e293b;
      --btn-github-text: #f1f5f9;
    }
    [data-theme="light"] {
      --bg: #f4f8f5;
      --bg-elevated: #ffffff;
      --bg-card: #ffffff;
      --border: #d6e5dc;
      --border-subtle: #e5f0ea;
      --text: #132a21;
      --text-muted: #3d6352;
      --text-dim: #5c8572;
      --accent: #059669;
      --accent-glow: rgba(5, 150, 105, 0.18);
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.2);
      --warning: #d97706;
      --danger: #dc2626;
      --purple: #7c3aed;
      --input-bg: #ffffff;
      --card-bg-subtle: #f8fbf9;
      --btn-github-bg: linear-gradient(135deg, #059669, #047857);
      --btn-github-text: #ffffff;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      padding: 1.5rem;
      line-height: 1.5;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .panel-title { font-size: 1.15rem; font-weight: 700; color: var(--text); }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.1rem 1.25rem;
    }
    .stat-card .label { font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); font-weight: 700; letter-spacing: 0.05em; }
    .stat-card .value { font-size: 1.85rem; font-weight: 800; margin: 0.2rem 0; color: var(--text); font-family: 'JetBrains Mono', monospace; }
    .stat-card .subtext { font-size: 0.78rem; color: var(--text-muted); }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .badge.passed { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge.failed { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge.orange { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge.browser { background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3); }
    .btn-github {
      background: var(--btn-github-bg);
      color: var(--btn-github-text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.4rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-github:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .lastrun-status-pill, .lastrun-browser-pill {
      background: var(--bg-card);
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: 9999px;
      padding: 0.35rem 0.8rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .lastrun-status-pill:hover, .lastrun-browser-pill:hover {
      color: var(--text);
      border-color: #60a5fa;
    }
    .lastrun-status-pill.active, .lastrun-browser-pill.active {
      background: #3b82f6;
      color: #ffffff;
      border-color: #3b82f6;
    }
    .lastrun-test-card:hover {
      border-color: rgba(96, 165, 250, 0.4) !important;
      transform: translateY(-1px);
    }
    .data-table th, .data-table td { padding: 0.75rem 0.85rem; }
    .data-table tr:hover { background: rgba(255, 255, 255, 0.02); }
    @keyframes pulseBeacon {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    .view-content { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.5rem;">⏱️</span>
        <div>
          <h1 style="font-size: 1.35rem; font-weight: 800; color: var(--text); margin: 0;">Eve Vakh &bull; Latest Test Run Status</h1>
          <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 0.15rem;">Automated CI/CD & Playwright Execution Telemetry</p>
        </div>
      </div>
      <div>
        <a href="index.html" class="btn-github" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
          &larr; Back to Full Dashboard
        </a>
      </div>
    </div>

    ${viewHtml}

    <footer style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); text-align: center; font-size: 0.8rem; color: var(--text-dim);">
      Eve Vakh Test Suite &bull; Auto-generated from results.json &bull; Last updated: ${escapeHtml(data.lastUpdated)}
    </footer>
  </div>

  <script>
    let currentLastRunStatus = 'all';
    let currentLastRunBrowser = 'all';

    function filterLastRunStatus(status, btn) {
      currentLastRunStatus = status;
      document.querySelectorAll('.lastrun-status-pill').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      filterLastRunTests();
    }

    function filterLastRunBrowser(browser, btn) {
      currentLastRunBrowser = browser;
      document.querySelectorAll('.lastrun-browser-pill').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      filterLastRunTests();
    }

    function filterLastRunTests() {
      const query = (document.getElementById('lastRunSearchInput')?.value || '').trim().toLowerCase();
      const cards = document.querySelectorAll('.lastrun-test-card');
      let visible = 0;

      cards.forEach(card => {
        const status = card.getAttribute('data-status');
        const browser = card.getAttribute('data-browser');
        const searchBlob = card.getAttribute('data-search') || '';

        const statusMatch = currentLastRunStatus === 'all' || status === currentLastRunStatus;
        const browserMatch = currentLastRunBrowser === 'all' || browser === currentLastRunBrowser;
        const queryMatch = !query || searchBlob.includes(query);

        if (statusMatch && browserMatch && queryMatch) {
          card.style.display = 'block';
          visible++;
        } else {
          card.style.display = 'none';
        }
      });

      const countEl = document.getElementById('lastRunVisibleCount');
      if (countEl) countEl.textContent = visible;
    }

    function toggleLastRunCard(id) {
      const el = document.getElementById(id);
      const chevron = document.getElementById('chevron-' + id);
      if (!el) return;
      if (el.style.display === 'none' || !el.style.display) {
        el.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
      } else {
        el.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
      }
    }

    function toggleAllLastRunCards(expand) {
      document.querySelectorAll('.lastrun-card-body').forEach(b => {
        b.style.display = expand ? 'block' : 'none';
      });
      document.querySelectorAll('[id^=\"chevron-lastrun-detail-\"]').forEach(c => {
        c.style.transform = expand ? 'rotate(180deg)' : 'rotate(0deg)';
      });
    }

    function copyTestError(id) {
      const text = document.getElementById(id)?.innerText || '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        alert('Trace copied to clipboard!');
      }).catch(err => {
        console.error('Copy failed', err);
      });
    }
  </script>
</body>
</html>
  `;
}

module.exports = {
  loadLastRunData,
  generateLastRunViewHtml,
  generateStandaloneLastRunHtml
};
