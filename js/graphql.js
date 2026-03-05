// ============================================
//  js/graphql.js — All GraphQL queries
// ============================================

import { getJWT, clearJWT } from './auth.js';

const GRAPHQL_URL = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql';

// ── Core fetch wrapper ──────────────────────
async function query(gql, variables = {}) {
  const jwt = getJWT();

  if (!jwt) throw new Error('NOT_AUTHENTICATED');

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ query: gql, variables }),
  });

  if (response.status === 401) {
    clearJWT();
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    throw new Error(`Network error: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message || 'GraphQL error');
  }

  return json.data;
}

// ============================================
//  QUERY 1 — Basic user info (normal query)
// ============================================
export async function fetchUserInfo() {
  const data = await query(`
    {
      user {
        id
        login
        attrs
        createdAt
      }
    }
  `);
  return data?.user?.[0] || null;
}

// ============================================
//  QUERY 2 — XP transactions (normal + order)
// ============================================
export async function fetchXPTransactions() {
  const data = await query(`
    {
      transaction(
        where: { type: { _eq: "xp" } }
        order_by: { createdAt: asc }
      ) {
        id
        amount
        createdAt
        path
        objectId
      }
    }
  `);
  return data?.transaction || [];
}

// ============================================
//  QUERY 3 — Audit stats (done vs received)
// ============================================
export async function fetchAuditStats() {
  const [upData, downData] = await Promise.all([
    query(`{ transaction(where: { type: { _eq: "up"   } }) { amount } }`),
    query(`{ transaction(where: { type: { _eq: "down" } }) { amount } }`),
  ]);

  const totalUp   = (upData?.transaction   || []).reduce((s, t) => s + t.amount, 0);
  const totalDown = (downData?.transaction || []).reduce((s, t) => s + t.amount, 0);

  return {
    done:     totalUp,
    received: totalDown,
    ratio:    totalDown > 0 ? (totalUp / totalDown).toFixed(1) : '0.0',
  };
}

// ============================================
//  QUERY 4 — User level
// ============================================
export async function fetchUserLevel() {
  const data = await query(`
    {
      transaction(
        where: { type: { _eq: "level" } }
        order_by: { amount: desc }
        limit: 1
      ) {
        amount
      }
    }
  `);
  return data?.transaction?.[0]?.amount || 0;
}

// ============================================
//  QUERY 5 — Projects (nested: result → object)
// ============================================
export async function fetchProjects() {
  const data = await query(`
    {
      result(order_by: { createdAt: desc }) {
        id
        grade
        createdAt
        path
        object {
          id
          name
          type
        }
      }
    }
  `);
  return (data?.result || []).filter(r => r.object?.type === 'project');
}

// ============================================
//  QUERY 6 — Piscines (with arguments: _ilike)
// ============================================
export async function fetchPiscineResults() {
  const piscines = ['piscine-go', 'piscine-js', 'piscine-rust', 'piscine-ai'];
  const results  = {};

  for (const piscine of piscines) {
    const data = await query(
      `
      query GetPiscine($path: String!) {
        result(
          where: {
            path:  { _ilike: $path }
            grade: { _is_null: false }
          }
          order_by: { createdAt: desc }
          limit: 1
        ) {
          grade
          path
          createdAt
        }
      }
      `,
      { path: `%${piscine}%` }
    );

    const found = data?.result?.[0];
    results[piscine] = found
      ? { passed: found.grade >= 1, grade: found.grade, date: found.createdAt }
      : null;
  }

  return results;
}

// ============================================
//  QUERY 7 — XP per project (nested + grouped)
// ============================================
export async function fetchXPPerProject() {
  const data = await query(`
    {
      transaction(
        where: { type: { _eq: "xp" } }
        order_by: { amount: desc }
      ) {
        amount
        path
        objectId
        object {
          name
          type
        }
      }
    }
  `);

  const grouped = {};
  for (const t of (data?.transaction || [])) {
    const key  = t.objectId;
    const name = t.object?.name || t.path?.split('/').pop() || `#${key}`;
    if (!grouped[key]) grouped[key] = { name, amount: 0, path: t.path };
    grouped[key].amount += t.amount;
  }

  return Object.values(grouped)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

// ============================================
//  MAIN — fetch everything in parallel
// ============================================
export async function fetchAllProfileData() {
  const [
    userInfo,
    xpTransactions,
    auditStats,
    level,
    projects,
    piscines,
    xpPerProject,
  ] = await Promise.all([
    fetchUserInfo(),
    fetchXPTransactions(),
    fetchAuditStats(),
    fetchUserLevel(),
    fetchProjects(),
    fetchPiscineResults(),
    fetchXPPerProject(),
  ]);

  const totalXP = xpTransactions.reduce((s, t) => s + t.amount, 0);

  return {
    userInfo,
    totalXP,
    xpTransactions,
    auditStats,
    level,
    projects,
    piscines,
    xpPerProject,
  };
}