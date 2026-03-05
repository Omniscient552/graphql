// ============================================
//  js/auth.js — Login & JWT management
//  Domain: 01.tomorrow-school.ai
// ============================================

const DOMAIN   = '01.tomorrow-school.ai';
const SIGNIN_URL = `https://${DOMAIN}/api/auth/signin`;

// ── If already logged in → go straight to profile ──
if (localStorage.getItem('jwt')) {
  window.location.href = 'index.html';
}

// ── DOM refs ──
const form       = document.getElementById('loginForm');
const submitBtn  = document.getElementById('submitBtn');
const errorBox   = document.getElementById('errorBox');
const errorText  = document.getElementById('errorText');
const toggleBtn  = document.getElementById('togglePassword');
const passwordIn = document.getElementById('password');
const eyeIcon    = document.getElementById('eyeIcon');

// ── Toggle password visibility ──
toggleBtn.addEventListener('click', () => {
  const isHidden = passwordIn.type === 'password';
  passwordIn.type = isHidden ? 'text' : 'password';

  // Swap icon: eye ↔ eye-off
  eyeIcon.innerHTML = isHidden
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
       <circle cx="12" cy="12" r="3"/>`;
});

// ── Show / hide error ──
function showError(msg) {
  errorText.textContent = msg;
  errorBox.classList.add('visible');
}

function hideError() {
  errorBox.classList.remove('visible');
}

// ── Set loading state ──
function setLoading(on) {
  submitBtn.disabled = on;
  submitBtn.classList.toggle('loading', on);
}

// ── Main login handler ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const identifier = document.getElementById('identifier').value.trim();
  const password   = document.getElementById('password').value;

  // Basic front-end validation
  if (!identifier || !password) {
    showError('Please fill in all fields.');
    return;
  }

  setLoading(true);

  try {
    const jwt = await signIn(identifier, password);
    localStorage.setItem('jwt', jwt);
    // Redirect to profile
    window.location.href = 'index.html';

  } catch (err) {
    showError(err.message);
    setLoading(false);
  }
});

// ── signIn — makes the actual API call ──
async function signIn(identifier, password) {
  // Credentials: "identifier:password" → base64
  const credentials = btoa(`${identifier}:${password}`);

  const response = await fetch(SIGNIN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid username or password.');
  }

  if (!response.ok) {
    throw new Error(`Server error (${response.status}). Please try again later.`);
  }

  // The endpoint returns a plain JWT string (sometimes wrapped in quotes)
  const raw = await response.text();
  const jwt = raw.replace(/^"|"$/g, '').trim(); // strip surrounding quotes if any

  if (!jwt) {
    throw new Error('Unexpected server response. Please try again.');
  }

  return jwt;
}

// ============================================
//  Exported helpers — used by other JS files
// ============================================

/**
 * Returns the stored JWT or null
 */
function getJWT() {
  return localStorage.getItem('jwt');
}

/**
 * Clears JWT and redirects to login
 */
function logout() {
  localStorage.removeItem('jwt');
  window.location.href = 'login.html';
}

/**
 * Decodes the JWT payload (no verification — client side only)
 * Returns the payload object
 */
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}