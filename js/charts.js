// ============================================
//  js/charts.js — SVG Charts
//  Chart 1: XP over time (line chart)
//  Chart 2: Audit ratio (donut chart)
// ============================================

export function renderCharts(data) {
  renderXPChart(data.xpTransactions);
  renderAuditChart(data.auditStats);
}

// ============================================
//  CHART 1 — XP per transaction (bar chart)
//  Each bar = how much XP earned in that transaction
// ============================================
function renderXPChart(transactions) {
  const container = document.getElementById('chartXPBody');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">No XP data found.</p>`;
    return;
  }

  // Each bar is one transaction
  const bars = transactions.map(t => ({
    date:  new Date(t.createdAt),
    xp:    t.amount,
    label: t.path?.split('/').pop() || '—',
  }));

  const maxXP = Math.max(...bars.map(b => b.xp));

  // SVG dimensions — width is dynamic based on bar count
  const BAR_W  = 5;    // bar width px
  const GAP    = 2;    // gap between bars px
  const PAD    = { top: 24, right: 24, bottom: 36, left: 56 };
  const H      = 300;
  const innerW = bars.length * (BAR_W + GAP) - GAP;
  const W      = PAD.left + innerW + PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const scaleY = (xp) => (xp / (maxXP || 1)) * innerH;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    value: Math.round(maxXP * f),
    y:     PAD.top + innerH - scaleY(maxXP * f),
  }));

  // X-axis labels — spread 4 evenly
  const xLabelIndices = getSpreadIndices(bars.length, 4);
  const xLabels = xLabelIndices.map(i => ({
    label: formatChartDate(bars[i].date),
    x:     PAD.left + i * (BAR_W + GAP) + BAR_W / 2,
  }));

  // Build bars SVG
  const barsSVG = bars.map((b, i) => {
    const x   = PAD.left + i * (BAR_W + GAP);
    const bh  = Math.max(1, scaleY(b.xp));
    const y   = PAD.top + innerH - bh;
    const tip = `${formatChartDate(b.date)} — ${b.label}: +${formatXP(b.xp)}`;
    return `
      <rect
        x="${x.toFixed(1)}" y="${y.toFixed(1)}"
        width="${BAR_W}" height="${bh.toFixed(1)}"
        fill="#8b5cf6" opacity="0.75" rx="2"
      >
        <title>${tip}</title>
      </rect>
    `;
  }).join('');


  container.innerHTML = `
    <svg
      viewBox="0 0 ${W} ${H}"
      width="${W}"
      height="${H}"
      xmlns="http://www.w3.org/2000/svg"
      style="display:block;"
      role="img"
      aria-label="XP per transaction bar chart"
    >
      <!-- Y grid lines + labels -->
      ${yTicks.map(t => `
        <line
          x1="${PAD.left}" y1="${t.y.toFixed(1)}"
          x2="${PAD.left + innerW}" y2="${t.y.toFixed(1)}"
          stroke="#e4e4e0" stroke-width="1"
        />
        <text
          x="${PAD.left - 8}" y="${t.y.toFixed(1)}"
          text-anchor="end" dominant-baseline="middle"
          font-size="10" fill="#a0a0a0" font-family="DM Mono, monospace"
        >${formatXP(t.value)}</text>
      `).join('')}

      <!-- X axis labels -->
      ${xLabels.map(l => `
        <text
          x="${l.x.toFixed(1)}"
          y="${(PAD.top + innerH + 18).toFixed(1)}"
          text-anchor="middle"
          font-size="10" fill="#a0a0a0" font-family="DM Sans, sans-serif"
        >${l.label}</text>
      `).join('')}

      <!-- Bars -->
      ${barsSVG}

      <!-- Axes -->
      <line
        x1="${PAD.left}" y1="${PAD.top}"
        x2="${PAD.left}" y2="${PAD.top + innerH}"
        stroke="#e4e4e0" stroke-width="1"
      />
      <line
        x1="${PAD.left}" y1="${PAD.top + innerH}"
        x2="${PAD.left + innerW}" y2="${PAD.top + innerH}"
        stroke="#e4e4e0" stroke-width="1"
      />
    </svg>
  `;
}

// ============================================
//  CHART 2 — Audit ratio (donut chart)
// ============================================
function renderAuditChart(auditStats) {
  const container = document.getElementById('chartAuditBody');
  if (!container) return;

  const done     = auditStats.done     || 0;
  const received = auditStats.received || 0;
  const total    = done + received;

  if (total === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">No audit data found.</p>`;
    return;
  }

  // Donut geometry
  const W   = 280;
  const H   = 280;
  const cx  = W / 2;
  const cy  = H / 2;
  const R   = 100;   // outer radius
  const r   = 66;   // inner radius (donut hole)

  const donePct     = done / total;
  const receivedPct = received / total;

  // Arc helper: returns SVG path for a donut slice
  function donutSlice(startAngle, endAngle, outerR, innerR) {
    const toRad = (deg) => (deg - 90) * (Math.PI / 180);

    const x1 = cx + outerR * Math.cos(toRad(startAngle));
    const y1 = cy + outerR * Math.sin(toRad(startAngle));
    const x2 = cx + outerR * Math.cos(toRad(endAngle));
    const y2 = cy + outerR * Math.sin(toRad(endAngle));

    const x3 = cx + innerR * Math.cos(toRad(endAngle));
    const y3 = cy + innerR * Math.sin(toRad(endAngle));
    const x4 = cx + innerR * Math.cos(toRad(startAngle));
    const y4 = cy + innerR * Math.sin(toRad(startAngle));

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  const doneAngle     = donePct * 360;
  const receivedAngle = receivedPct * 360;

  // Gap between slices (degrees)
  const gap = total > 0 ? 3 : 0;

  const doneSlice     = donutSlice(0,                   doneAngle - gap,     R, r);
  const receivedSlice = donutSlice(doneAngle + gap / 2, 360 - gap / 2,       R, r);

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;flex-direction:column;">

      <!-- Donut SVG -->
      <svg
        viewBox="0 0 ${W} ${H}"
        xmlns="http://www.w3.org/2000/svg"
        style="width:200px;height:200px;flex-shrink:0;"
        role="img"
        aria-label="Audit ratio donut chart"
      >
        <!-- Done slice -->
        <path d="${doneSlice}" fill="#8b5cf6">
          <title>Done: ${formatXP(done)} (${Math.round(donePct * 100)}%)</title>
        </path>

        <!-- Received slice -->
        <path d="${receivedSlice}" fill="#e4e4e0">
          <title>Received: ${formatXP(received)} (${Math.round(receivedPct * 100)}%)</title>
        </path>

        <!-- Center label: ratio -->
        <text
          x="${cx}" y="${cy - 8}"
          text-anchor="middle" dominant-baseline="middle"
          font-size="22" font-weight="300"
          fill="#1a1a1a" font-family="DM Sans, sans-serif"
          letter-spacing="-0.5"
        >${auditStats.ratio}</text>

        <text
          x="${cx}" y="${cy + 14}"
          text-anchor="middle"
          font-size="10" fill="#a0a0a0"
          font-family="DM Sans, sans-serif"
        >ratio</text>
      </svg>

      <!-- Legend -->
      <div style="display:flex;flex-direction:row ;gap:14px;">

        <div style="display:flex;flex-direction:column;gap:3px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#8b5cf6;flex-shrink:0;"></span>
            <span style="font-size:12px;color:#6b6b6b;font-family:'DM Sans',sans-serif;">Done</span>
          </div>
          <span style="font-size:18px;font-weight:300;letter-spacing:-0.02em;
            color:#1a1a1a;font-family:'DM Sans',sans-serif;padding-left:18px;">
            ${formatXP(done)}
          </span>
          <span style="font-size:11px;color:#a0a0a0;font-family:'DM Mono',monospace;padding-left:18px;">
            ${Math.round(donePct * 100)}%
          </span>
        </div>

        <div style="display:flex;flex-direction:column;gap:3px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#e4e4e0;
              border:1px solid #ccc;flex-shrink:0;"></span>
            <span style="font-size:12px;color:#6b6b6b;font-family:'DM Sans',sans-serif;">Received</span>
          </div>
          <span style="font-size:18px;font-weight:300;letter-spacing:-0.02em;
            color:#1a1a1a;font-family:'DM Sans',sans-serif;padding-left:18px;">
            ${formatXP(received)}
          </span>
          <span style="font-size:11px;color:#a0a0a0;font-family:'DM Mono',monospace;padding-left:18px;">
            ${Math.round(receivedPct * 100)}%
          </span>
        </div>
  
      </div>
    </div>
  `;
}

// ============================================
//  HELPERS
// ============================================

// Pick N evenly spread indices from array length
function getSpreadIndices(length, count) {
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const indices = [0];
  const step = (length - 1) / (count - 1);
  for (let i = 1; i < count - 1; i++) {
    indices.push(Math.round(i * step));
  }
  indices.push(length - 1);
  return [...new Set(indices)];
}

// "Jan '24"
function formatChartDate(date) {
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

// XP already in kB (converted in graphql.js)
function formatXP(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)} kB`;
  return `${n} B`;
}