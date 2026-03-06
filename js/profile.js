// ============================================
//  js/profile.js — View renderers
//  Each view is a separate function that
//  returns an HTML string for <main>
// ============================================

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
  setText('sidebarLevel', `Lvl ${level ?? '—'}`);
  setText('sidebarRatio', `${auditStats.ratio ?? '—'} ratio`);
}

// ============================================
//  VIEW: OVERVIEW
// ============================================
export function renderOverview(data) {
  const { totalXP, auditStats, projects } = data;
  const passed   = projects.filter(p => p.grade >= 1);
  const total    = projects.length;
  const passRate = total > 0 ? Math.round((passed.length / total) * 100) : 0;

  return `
    <section class="stats-grid">
      ${statCard('Total XP',      formatXP(totalXP))}
      ${statCard('Projects done', total)}
      ${statCard('Pass rate',     `${passRate}%`)}
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
        <div class="chart-body" id="chartAuditBody"></div>
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
        ${infoRow('Email',        attrs.email       || '—', true)}
        ${infoRow('Phone',        attrs.phone       || '—', true)}
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
        ${infoRow('ID card',        attrs.idCardNumber ? '••••••' + attrs.idCardNumber.slice(-3) : '—')}
        ${infoRow('ID issued',      formatDOB(attrs.dateIssue))}
        ${infoRow('ID expires',     formatDOB(attrs.dateExpiring))}
        ${infoRow('Issuing auth',   attrs.issuingAuthority   || '—')}
      </div>

      <!-- Emergency -->
      <div class="info-card">
        <p class="info-card-title">Emergency contact</p>
        ${infoRow('Name',         [attrs.emergencyFirstName, attrs.emergencyLastName].filter(Boolean).join(' ') || '—')}
        ${infoRow('Phone',        attrs.emergencyTel          || '—', true)}
        ${infoRow('Affiliation',  attrs.emergencyAffiliation  || '—')}
        ${infoRow('Medical info', attrs.medicalInfo            || '—')}
      </div>

    </div>
  `;
}

// ============================================
//  VIEW: PROJECTS
// ============================================
export function renderProjects(data) {
  const { projects } = data;
  const total  = projects.length;
  const passed = projects.filter(p => p.grade >= 1).length;
  const failed = total - passed;

  const rows = projects.length === 0
    ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px 0;">
        No projects found
       </td></tr>`
    : projects.map(p => {
        const name   = p.object?.name || p.path?.split('/').pop() || '—';
        const grade  = p.grade != null ? p.grade.toFixed(2) : '—';
        const isPassed = p.grade >= 1;
        const date   = p.createdAt ? formatDate(new Date(p.createdAt)) : '—';

        return `
          <tr>
            <td><span class="project-name" title="${name}">${name}</span></td>
            <td><span class="grade-value">${grade}</span></td>
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
      ${statCard('Pass rate', total > 0 ? `${Math.round((passed/total)*100)}%` : '—')}
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
              <th>Grade</th>
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
    const result = piscines[key];

    if (!result) {
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

    const badgeClass = result.passed ? 'badge badge-pass' : 'badge badge-fail';
    const badgeText  = result.passed ? 'PASS' : 'FAIL';
    const date       = result.date ? formatDate(new Date(result.date)) : '—';
    const grade      = result.grade != null ? result.grade.toFixed(2) : '—';

    return `
      <div class="piscine-card">
        <div class="piscine-card-header">
          <div>
            <p class="piscine-card-name">${label}</p>
            <p class="piscine-card-date">${date}</p>
          </div>
          <span class="${badgeClass}">${badgeText}</span>
        </div>
        <div class="piscine-grade-row">
          <span class="piscine-grade-label">Grade</span>
          <span class="piscine-grade-value">${grade}</span>
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

// XP is already converted to kB in graphql.js (bytes / 1000)
// So we just display with kB suffix
function formatXP(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)} kB`;
  return `${n} B`;
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