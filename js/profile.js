// ============================================
//  js/profile.js — View renderers
//  Each view is a separate function that
//  returns an HTML string for <main>
// ============================================

import { formatXP } from './charts.js';

// ── Entry point called by app.js ────────────
export function populateProfile(data) {
  populateSidebarUser(data);
}

// ── Fill static sidebar user block ──────────
export function populateSidebarUser(data) {
  const { userInfo, totalXP, auditStats, level } = data;
  const attrs     = userInfo?.attrs || {};
  const firstName = attrs.firstName || '';
  const lastName  = attrs.lastName  || '';
  const fullName  = [firstName, lastName].filter(Boolean).join(' ');
  const login     = userInfo?.login || '?';

  const initials = fullName
    ? `${firstName[0]}${lastName[0]}`
    : login.slice(0, 2);

  setText('avatarInitials', initials.toUpperCase());
  setText('sidebarFullname', fullName || login);
  setText('sidebarLogin', `@${login}`);
  setText('sidebarLevel', ` ${level ?? '—'}`);
  setText('sidebarRatio', ` ${auditStats.ratio ?? '—'}`);
}

// ============================================
//  VIEW: OVERVIEW
// ============================================
export function renderOverview(data) {
  const { totalXP, auditStats, projects } = data;

  // Unique projects via Map
  const uniqueMap = new Map();
  for (const p of projects) {
    const key = p.object?.name || p.path;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, true);
    }
  }
  const total    = uniqueMap.size;
  const passed   = projects.filter(p => p.grade >= 1).length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return `
    <section class="stats-grid">
      ${statCard('Total XP',      formatXP(totalXP))}
      ${statCard('Projects done', total)}
      ${statCard('Audit ratio',   auditStats.ratio ?? '—')}
    </section>

    <section class="charts-section">
      <div class="chart-card">
        <div class="chart-card-header">
          <h2 class="chart-title">XP over time</h2>
          <p class="chart-sub">Cumulative XP growth</p>
        </div>
        <div class="chart-body" id="chartXPBody"></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <h2 class="chart-title">Audit ratio</h2>
          <p class="chart-sub">Done vs received</p>
        </div>
        <div class="chart-body chart-body--static" id="chartAuditBody"></div>
      </div>
    </section>
  `;
}

// ============================================
//  VIEW: PERSONAL INFO
// ============================================
export function renderPersonalInfo(data) {
  const { userInfo } = data;
  const attrs  = userInfo?.attrs  || {};
  const login  = userInfo?.login  || '—';
  const joined = userInfo?.createdAt
    ? formatDate(new Date(userInfo.createdAt))
    : '—';

  // Batch from labels
  const labels = userInfo?.labels || [];
  const batch  = labels.find(l => l.labelName?.toLowerCase().includes('batch'))
    ?.labelName || '—';

  return `
    <div class="info-grid">

      <!-- General -->
      <div class="info-card">
        <p class="info-card-title">General</p>
        ${infoRow('First name',   attrs.firstName   || '—')}
        ${infoRow('Last name',    attrs.lastName    || '—')}
        ${infoRow('Login',        login,               true)}
        ${infoRow('Joined',       joined)}
        ${infoRow('Batch',        batch)}
        ${infoRow('Gender',       attrs.gender      || '—')}
      </div>

      <!-- Contact -->
      <div class="info-card">
        <p class="info-card-title">Contact</p>
        ${infoRow('Email',        maskEmail(attrs.email),  true)}
        ${infoRow('Phone',        attrs.phone ? attrs.phone.slice(0,2) + '••••••' + attrs.phone.slice(-3) : '-',  true)}
        ${infoRow('City',         attrs.addressCity || '—')}
        ${infoRow('Country',      attrs.addressCountry || '—')}
        ${infoRow('Street',       attrs.addressStreet  || '—')}
      </div>

      <!-- Identity -->
      <div class="info-card">
        <p class="info-card-title">Identity</p>
        ${infoRow('Date of birth',  formatDOB(attrs.dateOfBirth))}
        ${infoRow('Place of birth', attrs.placeOfBirth       || '—')}
        ${infoRow('Country',        attrs.countryOfBirth     || '—')}
        ${infoRow('ID card',        attrs.idCardNumber ? '••••••' + attrs.idCardNumber.slice(-2) : '—')}
        ${infoRow('ID issued',      formatDOB(attrs.dateIssue))}
        ${infoRow('ID expires',     formatDOB(attrs.dateExpiring))}
        ${infoRow('Issuing auth',   attrs.issuingAuthority   || '—')}
      </div>

    </div>
  `;
}

// ============================================
//  VIEW: PROJECTS
// ============================================
export function renderProjects(data) {
  const { projects, xpPerProject } = data;
  // console.log(projects)

  // Count unique projects via Map
  // key = project name, value = true if any attempt passed
  const uniqueMap = new Map();
  for (const p of projects) {
    const key = p.object?.name || p.path;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, true);
    }
  }

  for (const p of projects) {
    for (const xp of xpPerProject) {
      if (p.path === xp.path){
        p.amount = xp.amount
        console.log("Path: ", p.path, "Amount: ", p.amount)
      }
    }
  }

  const total  = uniqueMap.size;
  const passed = projects.filter(p => p.grade >= 1).length;
  const failed = projects.filter(p => p.grade < 1).length;

  const rows = projects.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px 0;">
        No projects found
       </td></tr>`
    : projects.map(p => {
        const name   = p.object?.name || p.path?.split('/').pop() || '—';
        const xp  = p.amount != null ? formatXP(p.amount) : '—';
        const isPassed = p.grade >= 1;
        const date   = p.createdAt ? formatDate(new Date(p.createdAt)) : '—';

        return `
          <tr>
            <td><span class="project-name" title="${name}">${name}</span></td>
            <td><span class="xp-value">${xp}</span></td>
            <td>
              <span class="status-badge ${isPassed ? 'pass' : 'fail'}">
                ${isPassed ? 'PASS' : 'FAIL'}
              </span>
            </td>
            <td><span class="date-value">${date}</span></td>
          </tr>
        `;
      }).join('');

  return `
    <div style="display:flex;gap:14px;margin-bottom:28px;">
      ${statCard('Total', total)}
      ${statCard('Passed', passed)}
      ${statCard('Failed', failed)}
    </div>

    <div class="projects-section">
      <div class="section-header">
        <h2 class="section-title">All projects</h2>
        <span class="section-badge">${total}</span>
      </div>
      <div class="table-wrap">
        <table class="projects-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>XP</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================
//  VIEW: PISCINES
// ============================================
export function renderPiscines(data) {
  const { piscines } = data;

  const piscineList = [
    { key: 'piscinego',    label: 'piscine-go'   },
    { key: 'piscine-js',   label: 'piscine-js'   },
    { key: 'piscine-rust', label: 'piscine-rust'  },
    { key: 'piscine-ai',   label: 'piscine-ai'   },
  ];

  const cards = piscineList.map(({ key, label }) => {
    const attempts = piscines[key]; // now an array of attempts or null

    if (!attempts) {
      return `
        <div class="piscine-card not-attempted">
          <div class="piscine-card-header">
            <div>
              <p class="piscine-card-name">${label}</p>
              <p class="piscine-card-date">Not attempted</p>
            </div>
            <span class="badge badge-na">n/a</span>
          </div>
          <div class="piscine-grade-row">
            <span class="piscine-grade-label">Grade</span>
            <span class="piscine-grade-value">—</span>
          </div>
        </div>
      `;
    }

    // Final status: PASS if any attempt passed
    const anyPassed   = attempts.some(a => a.passed);
    const anyGraded   = attempts.some(a => a.grade != null);
    const finalBadge  = anyPassed ? 'badge badge-pass' : anyGraded ? 'badge badge-fail' : 'badge badge-na';
    const finalText   = anyPassed ? 'PASS' : anyGraded ? 'FAIL' : 'n/a';

    // Attempts rows (oldest first = asc order from API)
    const attemptsHTML = attempts.map((a, i) => {
      const badge = a.grade == null ? 'badge badge-na' : a.passed ? 'badge badge-pass' : 'badge badge-fail';
      const text  = a.grade == null ? 'n/a' : a.passed ? 'PASS' : 'FAIL';
      const date  = a.date ? formatDate(new Date(a.date)) : '—';
      const grade = a.grade != null ? a.grade.toFixed(2) : '—';
      return `
        <div class="piscine-attempt">
          <span class="piscine-attempt-num">Attempt ${i + 1}</span>
          <span class="piscine-attempt-date">${date}</span>
          <span class="piscine-attempt-grade">${grade}</span>
          <span class="${badge}">${text}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="piscine-card">
        <div class="piscine-card-header">
          <div>
            <p class="piscine-card-name">${label}</p>
            <p class="piscine-card-date">${attempts.length} attempt${attempts.length > 1 ? 's' : ''}</p>
          </div>
          <span class="${finalBadge}">${finalText}</span>
        </div>
        <div class="piscine-attempts">
          ${attemptsHTML}
        </div>
      </div>
    `;
  }).join('');

  return `<div class="piscines-grid">${cards}</div>`;
}

// ============================================
//  HELPERS — shared small components
// ============================================
function statCard(label, value) {
  return `
    <div class="stat-card">
      <p class="stat-label">${label}</p>
      <p class="stat-value">${value}</p>
    </div>
  `;
}

function infoRow(key, value, mono = false) {
  return `
    <div class="info-row">
      <span class="info-key">${key}</span>
      <span class="info-value ${mono ? 'mono' : ''}">${value}</span>
    </div>
  `;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

// ma*****@gmail.com
function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDOB(str) {
  if (!str) return '—';
  try {
    return formatDate(new Date(str));
  } catch {
    return str;
  }
}