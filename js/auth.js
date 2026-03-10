// auth.js — JWT helpers

const DOMAIN     = '01.tomorrow-school.ai';
const SIGNIN_URL = `https://${DOMAIN}/api/auth/signin`;

export function getJWT() {
  return localStorage.getItem('jwt');
}

export function saveJWT(token) {
  localStorage.setItem('jwt', token);
}

export function clearJWT() {
  localStorage.removeItem('jwt');
}

export function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getUserIdFromJWT() {
  const jwt = getJWT();
  if (!jwt) return null;
  const payload = decodeJWT(jwt);
  return (
    payload?.['https://hasura.io/jwt/claims']?.['x-hasura-user-id'] ||
    payload?.sub ||
    null
  );
}

export async function signIn(identifier, password) {
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

  const raw = await response.text();
  const jwt = raw.replace(/^"|"$/g, '').trim();

  if (!jwt) {
    throw new Error('Unexpected server response. Please try again.');
  }

  return jwt;
}