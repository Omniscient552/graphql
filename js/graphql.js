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
      user {
        transactions(
          where: {
            type:    { _eq: "xp" }
            path:    { _nlike: "%checkpoint-zero%"}
            amount:  { _gt: 0 }
            eventId: { _eq: 96 }
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
    }
  `);
  return data?.user?.[0]?.transactions || [];
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
      user {
        transactions_aggregate(
          where: {
            type:    { _eq: "xp" }
            amount:  { _gt: 0 }
            eventId: { _eq: 96 }
          }
        ) {
          aggregate {
            sum { amount }
          }
        }
      }
    }
  `);
  return data?.user?.[0]?.transactions_aggregate?.aggregate?.sum?.amount || 0;
}

// ============================================
//  QUERY 5 — Projects (nested: result → object)
//  Filtered to main curriculum, deduplicated:
//  - group by project name
//  - keep PASS over FAIL
//  - if same status, keep latest by createdAt
// ============================================
export async function fetchProjects() {
  const data = await query(`
    {
      result(
        order_by: { createdAt: desc }
        where: {
          path:   { _nilike: "%piscine-ai%" }
          object: { type: { _eq: "project" } }
        }
      ) {
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

  const results = data?.result || [];

  // Dedup: if multiple PASS for same project → keep only latest PASS
  // But keep all FAILs
  const seenPass = new Set();
  const filtered = [];

  for (const r of results) {
    const key    = r.object?.name || r.path;
    const passed = r.grade >= 1;

    if (passed) {
      if (seenPass.has(key)) continue; // skip duplicate PASS
      seenPass.add(key);
    }

    filtered.push(r);
  }

  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ============================================
//  QUERY 6 — Piscines (with exact paths)
//  Returns all attempts per piscine
// ============================================
export async function fetchPiscineResults() {
  const piscines = [
    { key: 'piscinego',    path: '/astanahub/piscinego'          },
    { key: 'piscine-js',   path: '/astanahub/module/piscine-js'  },
    { key: 'piscine-ai',   path: '/astanahub/module/piscine-ai'  },
    { key: 'piscine-rust', path: '/astanahub/module/piscine-rust' },
  ];

  const results = {};

  for (const { key, path } of piscines) {
    const data = await query(
      `
      query GetPiscine($path: String!) {
        result(
          where: { path: { _eq: $path } }
          order_by: { createdAt: asc }
        ) {
          grade
          path
          createdAt
        }
      }
      `,
      { path }
    );

    const attempts = data?.result || [];

    if (attempts.length === 0) {
      results[key] = null;
      continue;
    }

    // All attempts, each with passed flag
    results[key] = attempts.map(r => ({
      grade:  r.grade,
      passed: r.grade != null && r.grade >= 1,
      date:   r.createdAt,
    }));
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
    .sort((a, b) => b.amount - a.amount);
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

  const totalXP = totalXPBytes;

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