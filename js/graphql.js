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
//  QUERY 1 — User info + labels (nested query)
//  labels → batch name (e.g. "Batch 2")
//  attrs  → firstName, lastName, city
// ============================================
export async function fetchUserInfo() {
  const data = await query(`
    {
      user {
        id
        login
        attrs
        createdAt
        labels {
          labelName
        }
      }
    }
  `);
  return data?.user?.[0] || null;
}

// ============================================
//  QUERY 2 — XP transactions (normal + order)
//  FIX: filter out negative amounts (raid penalties)
// ============================================
export async function fetchXPTransactions() {
  const data = await query(`
    {
      transaction(
        where: {
          type:   { _eq: "xp" }
          amount: { _gt: 0 }
        }
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
//  QUERY 4 — User level via event_user
//  eventId 96 = main curriculum (astanahub)
// ============================================
export async function fetchUserLevel(userId) {
  const data = await query(
    `
    query GetLevel($userId: Int!) {
      event_user(
        where: {
          userId:  { _eq: $userId }
          eventId: { _eq: 96 }
        }
        limit: 1
      ) {
        level
      }
    }
    `,
    { userId: parseInt(userId) }
  );
  return data?.event_user?.[0]?.level || 0;
}

// ============================================
//  QUERY 4b — Total XP (bytes)
//  XP stored in bytes, filtered to main module
// ============================================
export async function fetchTotalXPBytes() {
  const data = await query(`
    {
      transaction_aggregate(
        where: {
          type:   { _eq: "xp" }
          amount: { _gt: 0 }
          path:   { _ilike: "%/astanahub/module/%" }
        }
      ) {
        aggregate {
          sum { amount }
        }
      }
    }
  `);
  return data?.transaction_aggregate?.aggregate?.sum?.amount || 0;
}

// ============================================
//  QUERY 5 — Projects (nested: result → object)
//  Only type: "project", not exercises/raids
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
//  FIX: use /astanahub/ path prefix
// ============================================
export async function fetchPiscineResults() {
  const piscines = ['piscinego', 'piscine-js', 'piscine-rust', 'piscine-ai'];
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
//  FIX: filter negative amounts + only positive XP
// ============================================
export async function fetchXPPerProject() {
  const data = await query(`
    {
      transaction(
        where: {
          type:   { _eq: "xp" }
          amount: { _gt: 0 }
        }
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
  // Step 1: get user info first (need userId for level query)
  const userInfo = await fetchUserInfo();
  const userId   = userInfo?.id;

  // Step 2: fetch everything else in parallel
  const [
    xpTransactions,
    totalXPBytes,
    auditStats,
    level,
    projects,
    piscines,
    xpPerProject,
  ] = await Promise.all([
    fetchXPTransactions(),
    fetchTotalXPBytes(),
    fetchAuditStats(),
    fetchUserLevel(userId),
    fetchProjects(),
    fetchPiscineResults(),
    fetchXPPerProject(),
  ]);

  // XP is stored in bytes — convert to kB for display
  const totalXP = Math.round(totalXPBytes / 1000);

  return {
    userInfo,
    totalXP,
    totalXPBytes,
    xpTransactions,
    auditStats,
    level,
    projects,
    piscines,
    xpPerProject,
  };
}