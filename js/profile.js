// ============================================
//  js/profile.js — Populate DOM with data
// ============================================

export function populateProfile(data) {
  const {
    userInfo,
    totalXP,
    auditStats,
    level,
    projects,
    piscines,
  } = data;

  populateSidebar({ userInfo, totalXP, auditStats, level, piscines });
  populateTopbar(userInfo);
  populateStats({ totalXP, auditStats, projects });
  populateProjects(projects);
}

// ============================================
//  SIDEBAR
// ============================================
function populateSidebar({ userInfo, totalXP, auditStats, level, piscines }) {
  const login = userInfo?.login || '?';
  setText('avatarInitials', login.slice(0, 2));
  setText('userLogin',      login);

  // Member since
  if (userInfo?.createdAt) {
    const date = new Date(userInfo.createdAt);
    setText('userSince', `Since ${formatMonth(date)}`);
  }

  // Level
  setText('userLevel', level ?? '—');

  // XP bar — progress within current level
  // Approximate: each level needs level * 1000 XP
  const xpForCurrentLevel = level > 0 ? (level - 1) * 1000 : 0;
  const xpForNextLevel    = level * 1000;
  const xpInLevel         = totalXP - xpForCurrentLevel;
  const xpNeeded          = xpForNextLevel - xpForCurrentLevel;
  const pct               = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));

  setTimeout(() => {
    const fill = document.getElementById('xpBarFill');
    if (fill) fill.style.width = `${pct}%`;
  }, 150);

  setText('xpLabel', `${formatXP(totalXP)} XP total`);

  // Audit
  setText('auditRatio',    auditStats.ratio ?? '—');
  setText('auditDone',     formatXP(auditStats.done));
  setText('auditReceived', formatXP(auditStats.received));

  // Batch
  const batch = extractBatch(userInfo);
  setText('userBatch', batch);

  // Piscines
  populatePiscines(piscines);
}

function populatePiscines(piscines) {
  const container = document.getElementById('piscineList');
  if (!container) return;

  const labels = {
    'piscine-go':   'piscine-go',
    'piscine-js':   'piscine-js',
    'piscine-rust': 'piscine-rust',
    'piscine-ai':   'piscine-ai',
  };

  const rows = Object.entries(labels).map(([key, label]) => {
    const result = piscines[key];

    let badgeClass, badgeText;
    if (!result) {
      badgeClass = 'badge badge-na';
      badgeText  = 'n/a';
    } else if (result.passed) {
      badgeClass = 'badge badge-pass';
      badgeText  = 'PASS';
    } else {
      badgeClass = 'badge badge-fail';
      badgeText  = 'FAIL';
    }

    return `
      <div class="piscine-item">
        <span class="piscine-name">${label}</span>
        <span class="${badgeClass}">${badgeText}</span>
      </div>
    `;
  });

  container.innerHTML = rows.join('');
}

// ============================================
//  TOPBAR
// ============================================
function populateTopbar(userInfo) {
  const login = userInfo?.login || 'there';
  setText('topbarSub', `@${login}`);
}

// ============================================
//  STAT CARDS
// ============================================
function populateStats({ totalXP, auditStats, projects }) {
  setText('statXP', formatXP(totalXP));

  const passed   = projects.filter(p => p.grade >= 1);
  const total    = projects.length;
  const passRate = total > 0
    ? Math.round((passed.length / total) * 100)
    : 0;

  setText('statProjects',   total);
  setText('statPassRate',   `${passRate}%`);
  setText('statAuditRatio', auditStats.ratio);
  setText('projectsBadge',  total);
}

// ============================================
//  PROJECTS TABLE
// ============================================
function populateProjects(projects) {
  const tbody = document.getElementById('projectsBody');
  if (!tbody) return;

  if (projects.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4"
          style="text-align:center;color:var(--text-muted);padding:24px 0;">
          No projects found
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = projects.map(p => {
    const name   = p.object?.name || p.path?.split('/').pop() || '—';
    const grade  = p.grade != null ? p.grade.toFixed(2) : '—';
    const passed = p.grade >= 1;
    const date   = p.createdAt ? formatDate(new Date(p.createdAt)) : '—';

    return `
      <tr>
        <td><span class="project-name" title="${name}">${name}</span></td>
        <td><span class="grade-value">${grade}</span></td>
        <td>
          <span class="status-badge ${passed ? 'pass' : 'fail'}">
            ${passed ? 'PASS' : 'FAIL'}
          </span>
        </td>
        <td><span class="date-value">${date}</span></td>
      </tr>
    `;
  }).join('');
}

// ============================================
//  HELPERS
// ============================================

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

// 123456 → "123.5k",  1234567 → "1.2M"
function formatXP(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// "12 Jan 2024"
function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// "Jan 2024"
function formatMonth(date) {
  return date.toLocaleDateString('en-GB', {
    month: 'short', year: 'numeric',
  });
}

// Extract batch from userInfo.attrs
function extractBatch(userInfo) {
  if (!userInfo) return '—';

  const attrs = userInfo.attrs;
  if (attrs) {
    const parsed = typeof attrs === 'string' ? tryParse(attrs) : attrs;
    if (parsed?.batchId)   return `Batch ${parsed.batchId}`;
    if (parsed?.cohort)    return parsed.cohort;
    if (parsed?.batch)     return parsed.batch;
    if (parsed?.promotion) return parsed.promotion;
  }

  return '—';
}

function tryParse(str) {
  try   { return JSON.parse(str); }
  catch { return null; }
}