// app.js — SPA Router + Navigation

import { getJWT, saveJWT, clearJWT, signIn } from './auth.js';
import { fetchAllProfileData }               from './graphql.js';
import { populateSidebarUser,
         renderOverview, renderPersonalInfo,
         renderProjects, renderPiscines }    from './profile.js';
import { renderCharts }                      from './charts.js';

const app = document.getElementById('app');

let _currentView = 'overview';
let _profileData = null;

const VIEW_TITLES = {
  overview: 'Overview',
  personal: 'Personal Info',
  projects: 'Projects',
  piscines: 'Piscines',
};

// ── Entry point ───────────────────────────────────────────────────────────────

function init() {
  if (getJWT()) {
    renderProfile();
  } else {
    renderLogin();
  }
}

// ── Login view ────────────────────────────────────────────────────────────────

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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span id="errorText"></span>
          </div>

          <div class="field-group">
            <label class="field-label" for="identifier">Username or Email</label>
            <input class="field-input" type="text" id="identifier"
              placeholder="login or you@email.com" autocomplete="username" />
          </div>

          <div class="field-group">
            <label class="field-label" for="password">Password</label>
            <div class="input-wrapper">
              <input class="field-input" type="password" id="password"
                placeholder="••••••••" autocomplete="current-password" />
              <button type="button" class="toggle-password" id="togglePassword">
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

  const showError  = (msg) => { errorText.textContent = msg; errorBox.classList.add('visible'); };
  const hideError  = ()    => errorBox.classList.remove('visible');
  const setLoading = (on)  => { submitBtn.disabled = on; submitBtn.classList.toggle('loading', on); };

  const EYE_OPEN = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>`;
  const EYE_CLOSED = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>`;

  toggleBtn.addEventListener('click', () => {
    const isHidden = passwordIn.type === 'password';
    passwordIn.type  = isHidden ? 'text' : 'password';
    eyeIcon.innerHTML = isHidden ? EYE_CLOSED : EYE_OPEN;
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
      _currentView = 'overview';
      renderProfile();
    } catch (err) {
      showError(err.message);
      setLoading(false);
    }
  };

  submitBtn.addEventListener('click', handleSubmit);
  document.getElementById('identifier').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSubmit();
  });
  passwordIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSubmit();
  });
}

// ── Profile shell ─────────────────────────────────────────────────────────────

function renderProfile() {
  app.innerHTML = `
    <div class="profile-page fade-in">

      <button class="sidebar-toggle" id="sidebarToggle" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <div class="sidebar-overlay" id="sidebarOverlay"></div>

      <aside class="sidebar" id="sidebar">
        <div class="sidebar-user">
          <div class="avatar">
            <span class="avatar-initials" id="avatarInitials">?</span>
          </div>
          <p class="sidebar-fullname" id="sidebarFullname">—</p>
          <p class="sidebar-login"    id="sidebarLogin">—</p>
          <div class="sidebar-chips">
            <span class="sidebar-chip">
              <span class="sidebar-chip-label">Lvl</span>
              <span id="sidebarLevel">—</span>
            </span>
            <span class="sidebar-chip">
              <span class="sidebar-chip-label">Ratio</span>
              <span id="sidebarRatio">—</span>
            </span>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <nav class="sidebar-nav">
          <button class="nav-item active" data-view="overview">
            ${icon('grid')} Overview
          </button>
          <button class="nav-item" data-view="personal">
            ${icon('user')} Personal Info
          </button>
          <button class="nav-item" data-view="projects">
            ${icon('folder')} Projects
          </button>
          <button class="nav-item" data-view="piscines">
            ${icon('activity')} Piscines
          </button>

          <div class="sidebar-divider" style="margin:8px 0;"></div>

          <button class="btn-logout" id="logoutBtn">
            ${icon('log-out')} Sign out
          </button>
        </nav>

        <div class="sidebar-spacer"></div>
      </aside>

      <main class="main" id="mainContent">
        <header class="topbar">
          <h1 class="topbar-title" id="topbarTitle">Overview</h1>
          <p class="topbar-sub"    id="topbarSub">Welcome back</p>
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

        <div id="viewContent" style="display:none"></div>
      </main>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearJWT();
    _profileData = null;
    renderLogin();
  });

  document.getElementById('retryBtn').addEventListener('click', renderProfile);

  const sidebarEl = document.getElementById('sidebar');
  const overlayEl = document.getElementById('sidebarOverlay');
  const toggleBtn = document.getElementById('sidebarToggle');

  const openSidebar  = () => { sidebarEl.classList.add('open');    overlayEl.classList.add('visible');    document.body.style.overflow = 'hidden'; };
  const closeSidebar = () => { sidebarEl.classList.remove('open'); overlayEl.classList.remove('visible'); document.body.style.overflow = ''; };

  toggleBtn.addEventListener('click', () => {
    sidebarEl.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlayEl.addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeSidebar();
      switchView(btn.dataset.view);
    });
  });

  loadProfileData();
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadProfileData() {
  const loadingState = document.getElementById('loadingState');
  const errorState   = document.getElementById('errorState');
  const viewContent  = document.getElementById('viewContent');

  try {
    _profileData = await fetchAllProfileData();

    loadingState.style.display = 'none';
    viewContent.style.display  = 'block';

    populateSidebarUser(_profileData);

    const login = _profileData.userInfo?.login || '';
    document.getElementById('topbarSub').textContent = `@${login}`;
    document.title = `${login}'s Profile — 01`;

    switchView(_currentView, true);

  } catch (err) {
    console.error(err);

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

// ── View switching ────────────────────────────────────────────────────────────

function switchView(view, skipNavUpdate = false) {
  if (!_profileData) return;
  _currentView = view;

  if (!skipNavUpdate) {
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
  }

  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = VIEW_TITLES[view] || 'Profile';

  const container = document.getElementById('viewContent');
  if (!container) return;

  switch (view) {
    case 'overview':
      container.innerHTML = renderOverview(_profileData);
      renderCharts(_profileData);
      break;
    case 'personal':
      container.innerHTML = renderPersonalInfo(_profileData);
      break;
    case 'projects':
      container.innerHTML = renderProjects(_profileData);
      break;
    case 'piscines':
      container.innerHTML = renderPiscines(_profileData);
      break;
    default:
      container.innerHTML = renderOverview(_profileData);
      renderCharts(_profileData);
  }
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function icon(name) {
  const icons = {
    grid: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3"  y="3"  width="7" height="7"/>
      <rect x="14" y="3"  width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3"  y="14" width="7" height="7"/>
    </svg>`,
    user: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`,
    folder: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>`,
    activity: `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>`,
    'log-out': `<svg style="width:15px;height:15px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>`,
  };
  return icons[name] || '';
}

// ── Start ─────────────────────────────────────────────────────────────────────

init();