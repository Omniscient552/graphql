// profile.js — View renderers

import { formatXP } from './charts.js';

// ── Sidebar ──────────────────────────────────────────────────────────────────

export function populateSidebarUser(data) {
  const { userInfo, auditStats, level } = data;
  const attrs     = userInfo?.attrs || {};
  const firstName = attrs.firstName || '';
  const lastName  = attrs.lastName  || '';
  const fullName  = [firstName, lastName].filter(Boolean).join(' ');
  const login     = userInfo?.login || '?';
  const initials  = fullName
    ? `${firstName[0]}${lastName[0]}`
    : login.slice(0, 2);

  setText('avatarInitials', initials.toUpperCase());
  setText('sidebarFullname', fullName || login);
  setText('sidebarLogin',    `@${login}`);
  setText('sidebarLevel',    ` ${level ?? '—'}`);
  setText('sidebarRatio',    ` ${auditStats.ratio ?? '—'}`);
}

// ── Overview ──────────────────────────────────────────────────────────────────

export function renderOverview(data) {
  const { totalXP, auditStats, projects } = data;

  const uniqueProjects = countUnique(projects);
  const passed         = projects.filter(p => p.grade >= 1).length;

  return `
    <section class="stats-grid">
      ${statCard('Total XP',      formatXP(totalXP))}
      ${statCard('Projects done', uniqueProjects)}
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

// ── Personal Info ─────────────────────────────────────────────────────────────

export function renderPersonalInfo(data) {
  const { userInfo } = data;
  const attrs  = userInfo?.attrs || {};
  const login  = userInfo?.login || '—';
  const joined = userInfo?.createdAt ? formatDate(new Date(userInfo.createdAt)) : '—';

  const batch = userInfo?.labels
    ?.find(l => l.labelName?.toLowerCase().includes('batch'))
    ?.labelName || '—';

  const maskedPhone = attrs.phone
    ? `${attrs.phone.slice(0, 2)}••••••${attrs.phone.slice(-3)}`
    : '—';

  const maskedId = attrs.idCardNumber
    ? `••••••${attrs.idCardNumber.slice(-2)}`
    : '—';

  return `
    <div class="info-grid">
      <div class="info-card">
        <p class="info-card-title">General</p>
        ${infoRow('First name',   attrs.firstName || '—')}
        ${infoRow('Last name',    attrs.lastName  || '—')}
        ${infoRow('Login',        login,              true)}
        ${infoRow('Joined',       joined)}
        ${infoRow('Batch',        batch)}
        ${infoRow('Gender',       attrs.gender    || '—')}
      </div>

      <div class="info-card">
        <p class="info-card-title">Contact</p>
        ${infoRow('Email',   maskEmail(attrs.email), true)}
        ${infoRow('Phone',   maskedPhone,            true)}
        ${infoRow('City',    attrs.addressCity    || '—')}
        ${infoRow('Country', attrs.addressCountry || '—')}
        ${infoRow('Street',  attrs.addressStreet  || '—')}
      </div>

      <div class="info-card">
        <p class="info-card-title">Identity</p>
        ${infoRow('Date of birth',  formatDOB(attrs.dateOfBirth))}
        ${infoRow('Place of birth', attrs.placeOfBirth     || '—')}
        ${infoRow('Country',        attrs.countryOfBirth   || '—')}
        ${infoRow('ID card',        maskedId)}
        ${infoRow('ID issued',      formatDOB(attrs.dateIssue))}
        ${infoRow('ID expires',     formatDOB(attrs.dateExpiring))}
        ${infoRow('Issuing auth',   attrs.issuingAuthority || '—')}
      </div>
    </div>
  `;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function renderProjects(data) {
  const { projects, xpPerProject } = data;

  // Attach XP amounts to each project by matching path
  const xpByPath = Object.fromEntries(xpPerProject.map(x => [x.path, x.amount]));
  for (const p of projects) {
    p.amount = xpByPath[p.path] ?? null;
  }

  const total  = countUnique(projects);
  const passed = projects.filter(p => p.grade >= 1).length;
  const failed = projects.filter(p => p.grade < 1).length;

  const rows = projects.length === 0
    ? `<tr>
        <td colspan="4" class="table-empty">No projects found</td>
       </tr>`
    : projects.map(p => {
        const name     = p.object?.name || p.path?.split('/').pop() || '—';
        const xp       = p.amount != null ? formatXP(p.amount) : '—';
        const isPassed = p.grade >= 1;
        const date     = p.createdAt ? formatDate(new Date(p.createdAt)) : '—';
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
          </tr>`;
      }).join('');

  return `
    <div style="display:flex;gap:14px;margin-bottom:28px;">
      ${statCard('Total',  total)}
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

// ── Piscines ──────────────────────────────────────────────────────────────────

export function renderPiscines(data) {
  const { piscines } = data;

  const piscineList = [
    { key: 'piscinego',    label: 'piscine-go'   },
    { key: 'piscine-js',   label: 'piscine-js'   },
    { key: 'piscine-rust', label: 'piscine-rust'  },
    { key: 'piscine-ai',   label: 'piscine-ai'   },
  ];

  const cards = piscineList.map(({ key, label }) => {
    const attempts = piscines[key];
    return attempts
      ? renderPiscineCard(label, attempts)
      : renderPiscineCardEmpty(label);
  }).join('');

  return `<div class="piscines-grid">${cards}</div>`;
}

function renderPiscineCard(label, attempts) {
  const anyPassed  = attempts.some(a => a.passed);
  const anyGraded  = attempts.some(a => a.grade != null);
  const badgeClass = anyPassed ? 'badge badge-pass' : anyGraded ? 'badge badge-fail' : 'badge badge-na';
  const badgeText  = anyPassed ? 'PASS' : anyGraded ? 'FAIL' : 'n/a';

  const attemptsHTML = attempts.map((a, i) => {
    const badge = a.grade == null ? 'badge badge-na' : a.passed ? 'badge badge-pass' : 'badge badge-fail';
    const text  = a.grade == null ? 'n/a' : a.passed ? 'PASS' : 'FAIL';
    return `
      <div class="piscine-attempt">
        <span class="piscine-attempt-num">Attempt ${i + 1}</span>
        <span class="piscine-attempt-date">${a.date ? formatDate(new Date(a.date)) : '—'}</span>
        <span class="piscine-attempt-grade">${a.grade != null ? a.grade.toFixed(2) : '—'}</span>
        <span class="${badge}">${text}</span>
      </div>`;
  }).join('');

  return `
    <div class="piscine-card">
      <div class="piscine-card-header">
        <div>
          <p class="piscine-card-name">${label}</p>
          <p class="piscine-card-date">${attempts.length} attempt${attempts.length > 1 ? 's' : ''}</p>
        </div>
        <span class="${badgeClass}">${badgeText}</span>
      </div>
      <div class="piscine-attempts">${attemptsHTML}</div>
    </div>`;
}

function renderPiscineCardEmpty(label) {
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
    </div>`;
}

// ── Shared components ─────────────────────────────────────────────────────────

function statCard(label, value) {
  return `
    <div class="stat-card">
      <p class="stat-label">${label}</p>
      <p class="stat-value">${value}</p>
    </div>`;
}

function infoRow(key, value, mono = false) {
  return `
    <div class="info-row">
      <span class="info-key">${key}</span>
      <span class="info-value ${mono ? 'mono' : ''}">${value}</span>
    </div>`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '—';
}

function countUnique(projects) {
  const keys = new Set(projects.map(p => p.object?.name || p.path));
  return keys.size;
}

function maskEmail(email) {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDOB(str) {
  if (!str) return '—';
  try   { return formatDate(new Date(str)); }
  catch { return str; }
}