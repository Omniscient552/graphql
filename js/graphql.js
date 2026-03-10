// graphql.js — All GraphQL queries

import { getJWT, clearJWT } from './auth.js';

const GRAPHQL_URL  = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql';
const MAIN_EVENT_ID = 96;

// ── Core fetch wrapper ──────────────────────────────────────────────────────

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

// ── Query helpers ───────────────────────────────────────────────────────────

function sumAmounts(rows) {
  return (rows || []).reduce((sum, t) => sum + t.amount, 0);
}

// ── Queries ─────────────────────────────────────────────────────────────────

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

export async function fetchXPTransactions() {
  const data = await query(`
    {
      user {
        transactions(
          where: {
            type:    { _eq: "xp" }
            path:    { _nlike: "%checkpoint-zero%" }
            amount:  { _gt: 0 }
            eventId: { _eq: ${MAIN_EVENT_ID} }
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

export async function fetchAuditStats() {
  const [upData, downData] = await Promise.all([
    query(`{ transaction(where: { type: { _eq: "up"   } }) { amount } }`),
    query(`{ transaction(where: { type: { _eq: "down" } }) { amount } }`),
  ]);

  const done     = sumAmounts(upData?.transaction);
  const received = sumAmounts(downData?.transaction);

  return {
    done,
    received,
    ratio: received > 0 ? (done / received).toFixed(1) : '0.0',
  };
}

export async function fetchUserLevel(userId) {
  const data = await query(
    `
    query GetLevel($userId: Int!) {
      event_user(
        where: {
          userId:  { _eq: $userId }
          eventId: { _eq: ${MAIN_EVENT_ID} }
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

export async function fetchTotalXP() {
  const data = await query(`
    {
      user {
        transactions_aggregate(
          where: {
            type:    { _eq: "xp" }
            amount:  { _gt: 0 }
            eventId: { _eq: ${MAIN_EVENT_ID} }
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

  const results  = data?.result || [];
  const seenPass = new Set();
  const filtered = [];

  for (const r of results) {
    const key    = r.object?.name || r.path;
    const passed = r.grade >= 1;

    if (passed) {
      if (seenPass.has(key)) continue;
      seenPass.add(key);
    }

    filtered.push(r);
  }

  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function fetchPiscineResults() {
  const piscines = [
    { key: 'piscinego',    path: '/astanahub/piscinego'           },
    { key: 'piscine-js',   path: '/astanahub/module/piscine-js'   },
    { key: 'piscine-ai',   path: '/astanahub/module/piscine-ai'   },
    { key: 'piscine-rust', path: '/astanahub/module/piscine-rust'  },
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

    results[key] = attempts.length === 0
      ? null
      : attempts.map(r => ({
          grade:  r.grade,
          passed: r.grade != null && r.grade >= 1,
          date:   r.createdAt,
        }));
  }

  return results;
}

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

  return Object.values(grouped).sort((a, b) => b.amount - a.amount);
}

// ── Aggregate fetch ──────────────────────────────────────────────────────────

export async function fetchAllProfileData() {
  const userInfo = await fetchUserInfo();
  const userId   = userInfo?.id;

  const [
    xpTransactions,
    totalXP,
    auditStats,
    level,
    projects,
    piscines,
    xpPerProject,
  ] = await Promise.all([
    fetchXPTransactions(),
    fetchTotalXP(),
    fetchAuditStats(),
    fetchUserLevel(userId),
    fetchProjects(),
    fetchPiscineResults(),
    fetchXPPerProject(),
  ]);

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