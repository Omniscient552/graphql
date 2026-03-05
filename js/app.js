// ============================================
//  js/app.js — SPA Router (ES Module entry)
// ============================================

import { getJWT, saveJWT, clearJWT, signIn } from './auth.js';
import { fetchAllProfileData }               from './graphql.js';
import { populateProfile }                   from './profile.js';
import { renderCharts }                      from './charts.js';

const app = document.getElementById('app');

// ── Entry point ──────────────────────────────
function init() {
  if (getJWT()) {
    renderProfile();
  } else {
    renderLogin();
  }
}

// ============================================
//  LOGIN VIEW
// ============================================
function renderLogin() {
  app.innerHTML = `
    <div class="login-page fade-in">

      <div class="login-panel-left">
        <div class="brand">
          <span class="brand-dot"></span>
          <span class="brand-name">01 Profile</span>
        </div>
        <div class="panel-text">
          <p class="panel-tagline">Your journey,<br/>visualized.</p>
          <p class="panel-sub">Track XP, audits, projects<br/>and your growth over time.</p>
        </div>
        <div class="panel-decoration">
          <div class="circle c1"></div>
          <div class="circle c2"></div>
          <div class="circle c3"></div>
        </div>
      </div>

      <div class="login-panel-right">
        <div class="form-container">

          <div class="form-header">
            <h1 class="form-title">Sign in</h1>
            <p class="form-subtitle">Use your username or email</p>
          </div>

          <div id="errorBox" class="error-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span id="errorText"></span>
          </div>

          <div class="field-group">
            <label class="field-label" for="identifier">Username or Email</label>
            <input class="field-input" type="text" id="identifier"
              placeholder="mkapan or you@email.com" autocomplete="username" />
          </div>

          <div class="field-group">
            <label class="field-label" for="password">Password</label>
            <div class="input-wrapper">
              <input class="field-input" type="password" id="password"
                placeholder="••••••••" autocomplete="current-password" />
              <button type="button" class="toggle-password" id="togglePassword" aria-label="Toggle password">
                <svg id="eyeIcon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <button class="btn-submit" id="submitBtn" type="button">
            <span class="btn-text">Sign in</span>
            <span class="btn-loader"></span>
          </button>

        </div>
      </div>
    </div>
  `;

  bindLoginEvents();
}

function bindLoginEvents() {
  const submitBtn  = document.getElementById('submitBtn');
  const toggleBtn  = document.getElementById('togglePassword');
  const passwordIn = document.getElementById('password');
  const eyeIcon    = document.getElementById('eyeIcon');
  const errorBox   = document.getElementById('errorBox');
  const errorText  = document.getElementById('errorText');

  const showError = (msg) => {
    errorText.textContent = msg;
    errorBox.classList.add('visible');
  };

  const hideError = () => errorBox.classList.remove('visible');

  const setLoading = (on) => {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
  };

  toggleBtn.addEventListener('click', () => {
    const hidden = passwordIn.type === 'password';
    passwordIn.type = hidden ? 'text' : 'password';
    eyeIcon.innerHTML = hidden
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
         <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
         <line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
         <circle cx="12" cy="12" r="3"/>`;
  });

  const handleSubmit = async () => {
    hideError();
    const identifier = document.getElementById('identifier').value.trim();
    const password   = document.getElementById('password').value;

    if (!identifier || !password) {
      showError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const jwt = await signIn(identifier, password);
      saveJWT(jwt);
      renderProfile();
    } catch (err) {
      showError(err.message);
      setLoading(false);
    }
  };

  submitBtn.addEventListener('click', handleSubmit);

  // Enter key support
  [document.getElementById('identifier'), passwordIn].forEach(el =>
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); })
  );
}

// ============================================
//  PROFILE VIEW
// ============================================
function renderProfile() {
  app.innerHTML = `
    <div class="profile-page fade-in">

      <aside class="sidebar">
        <div class="sidebar-profile">
          <div class="avatar">
            <span class="avatar-initials" id="avatarInitials">?</span>
          </div>
          <div>
            <p class="sidebar-login" id="userLogin">—</p>
            <p class="sidebar-since" id="userSince"></p>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <div class="sidebar-section">
          <p class="sidebar-label">Level</p>
          <p class="sidebar-value" id="userLevel">—</p>
          <div class="xp-bar-track">
            <div class="xp-bar-fill" id="xpBarFill" style="width:0%"></div>
          </div>
          <p class="xp-bar-label" id="xpLabel">0 XP</p>
        </div>

        <div class="sidebar-divider"></div>

        <div class="sidebar-section">
          <p class="sidebar-label">Audit Ratio</p>
          <p class="sidebar-value" id="auditRatio">—</p>
          <div class="audit-row">
            <div class="audit-item">
              <span class="audit-dot dot-done"></span>
              <span class="audit-text">Done <strong id="auditDone">—</strong></span>
            </div>
            <div class="audit-item">
              <span class="audit-dot dot-recv"></span>
              <span class="audit-text">Received <strong id="auditReceived">—</strong></span>
            </div>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <div class="sidebar-section">
          <p class="sidebar-label">Batch</p>
          <p class="sidebar-value sidebar-value--sm" id="userBatch">—</p>
        </div>

        <div class="sidebar-divider"></div>

        <div class="sidebar-section">
          <p class="sidebar-label">Piscines</p>
          <div class="piscine-list" id="piscineList">
            <p style="font-size:12px;color:var(--text-muted)">Loading...</p>
          </div>
        </div>

        <div class="sidebar-spacer"></div>

        <button class="btn-logout" id="logoutBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign out
        </button>
      </aside>

      <main class="main">
        <header class="topbar">
          <h1 class="topbar-title">Profile</h1>
          <p class="topbar-sub" id="topbarSub">Welcome back</p>
        </header>

        <div class="loading-state" id="loadingState">
          <div class="spinner"></div>
          <p>Fetching your data...</p>
        </div>

        <div class="error-state" id="errorState" style="display:none">
          <p class="error-state-icon">⚠️</p>
          <p class="error-state-msg" id="profileErrorMsg">Something went wrong.</p>
          <button class="btn-retry" id="retryBtn">Try again</button>
        </div>

        <div id="profileContent" style="display:none">

          <section class="stats-grid">
            <div class="stat-card">
              <p class="stat-label">Total XP</p>
              <p class="stat-value" id="statXP">—</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Projects done</p>
              <p class="stat-value" id="statProjects">—</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Pass rate</p>
              <p class="stat-value" id="statPassRate">—</p>
            </div>
            <div class="stat-card">
              <p class="stat-label">Audit ratio</p>
              <p class="stat-value" id="statAuditRatio">—</p>
            </div>
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

          <section class="projects-section">
            <div class="section-header">
              <h2 class="section-title">Projects</h2>
              <span class="section-badge" id="projectsBadge">0</span>
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
                <tbody id="projectsBody"></tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearJWT();
    renderLogin();
  });

  document.getElementById('retryBtn').addEventListener('click', renderProfile);

  loadProfileData();
}

// ── Fetch & display profile data ─────────────
async function loadProfileData() {
  const loadingState   = document.getElementById('loadingState');
  const errorState     = document.getElementById('errorState');
  const profileContent = document.getElementById('profileContent');

  try {
    const data = await fetchAllProfileData();

    loadingState.style.display   = 'none';
    profileContent.style.display = 'block';

    populateProfile(data);
    renderCharts(data);

  } catch (err) {
    console.error(err);

    // Session expired → back to login
    if (err.message === 'SESSION_EXPIRED' || err.message === 'NOT_AUTHENTICATED') {
      clearJWT();
      renderLogin();
      return;
    }

    loadingState.style.display = 'none';
    errorState.style.display   = 'flex';
    document.getElementById('profileErrorMsg').textContent =
      err.message || 'Failed to load profile data.';
  }
}

// ── Start ─────────────────────────────────────
init();