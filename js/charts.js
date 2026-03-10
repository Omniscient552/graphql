// charts.js — SVG Charts
//   renderXPChart   : XP per transaction (bar chart)
//   renderAuditChart: Audit ratio (donut chart)

export function renderCharts(data) {
  renderXPChart(data.xpTransactions);
  renderAuditChart(data.auditStats);
}

// ── XP bar chart ─────────────────────────────────────────────────────────────

function renderXPChart(transactions) {
  const container = document.getElementById('chartXPBody');
  if (!container) return;

  if (!transactions?.length) {
    container.innerHTML = `<p class="chart-empty">No XP data found.</p>`;
    return;
  }

  const bars = transactions.map(t => ({
    date:  new Date(t.createdAt),
    xp:    t.amount,
    label: t.path?.split('/').pop() || '—',
  }));

  const maxXP  = Math.max(...bars.map(b => b.xp));
  const BAR_W  = 15;
  const GAP    = 10;
  const PAD    = { top: 24, right: 24, bottom: 36, left: 56 };
  const H      = 300;
  const innerW = bars.length * (BAR_W + GAP) - GAP;
  const W      = PAD.left + innerW + PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const scaleY = (xp) => (xp / (maxXP || 1)) * innerH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    value: Math.round(maxXP * f),
    y:     PAD.top + innerH - scaleY(maxXP * f),
  }));

  const xLabels = getSpreadIndices(bars.length, 4).map(i => ({
    label: formatChartDate(bars[i].date),
    x:     PAD.left + i * (BAR_W + GAP) + BAR_W / 2,
  }));

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
      ><title>${tip}</title></rect>`;
  }).join('');

  container.innerHTML = `
    <svg
      viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
      xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="XP per transaction bar chart"
      style="display:block;"
    >
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

      ${xLabels.map(l => `
        <text
          x="${l.x.toFixed(1)}" y="${(PAD.top + innerH + 18).toFixed(1)}"
          text-anchor="middle"
          font-size="10" fill="#a0a0a0" font-family="DM Sans, sans-serif"
        >${l.label}</text>
      `).join('')}

      ${barsSVG}

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

// ── Audit donut chart ────────────────────────────────────────────────────────

function renderAuditChart(auditStats) {
  const container = document.getElementById('chartAuditBody');
  if (!container) return;

  const done     = auditStats.done     || 0;
  const received = auditStats.received || 0;
  const total    = done + received;

  if (total === 0) {
    container.innerHTML = `<p class="chart-empty">No audit data found.</p>`;
    return;
  }

  const donePct     = done / total;
  const receivedPct = received / total;
  const W = 280, H = 280, cx = W / 2, cy = H / 2;
  const R = 100, r = 66;
  const gap = 3;

  const doneSlice     = donutSlice(cx, cy, 0,              donePct * 360 - gap, R, r);
  const receivedSlice = donutSlice(cx, cy, donePct * 360 + gap / 2, 360 - gap / 2, R, r);

  container.innerHTML = `
    <div class="audit-chart-wrap">
      <svg
        viewBox="0 0 ${W} ${H}"
        xmlns="http://www.w3.org/2000/svg"
        class="audit-chart-svg"
        role="img" aria-label="Audit ratio donut chart"
      >
        <path d="${doneSlice}" fill="#8b5cf6">
          <title>Done: ${formatXP(done)} (${Math.round(donePct * 100)}%)</title>
        </path>
        <path d="${receivedSlice}" fill="#e4e4e0">
          <title>Received: ${formatXP(received)} (${Math.round(receivedPct * 100)}%)</title>
        </path>
        <text
          x="${cx}" y="${cy - 8}"
          text-anchor="middle" dominant-baseline="middle"
          font-size="30" font-weight="300"
          fill="#1a1a1a" font-family="DM Sans, sans-serif" letter-spacing="-0.5"
        >${auditStats.ratio}</text>
        <text
          x="${cx}" y="${cy + 14}"
          text-anchor="middle"
          font-size="18" fill="#a0a0a0" font-family="DM Sans, sans-serif"
        >ratio</text>
      </svg>

      <div class="audit-legend">
        ${legendItem('#8b5cf6', 'Done',     done,     donePct)}
        ${legendItem('#e4e4e0', 'Received', received, receivedPct, true)}
      </div>
    </div>
  `;
}

function legendItem(color, label, value, pct, bordered = false) {
  const borderStyle = bordered ? 'border:1px solid #ccc;' : '';
  return `
    <div class="audit-legend-item">
      <div class="audit-legend-header">
        <div class="audit-legend-dot" style="background:${color};${borderStyle}"></div>
        <span class="audit-legend-label">${label}</span>
      </div>
      <span class="audit-legend-value">${formatXP(value)}</span>
      <span class="audit-legend-pct">${Math.round(pct * 100)}%</span>
    </div>
  `;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function donutSlice(cx, cy, startAngle, endAngle, outerR, innerR) {
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

function getSpreadIndices(length, count) {
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const indices = [0];
  const step    = (length - 1) / (count - 1);
  for (let i = 1; i < count - 1; i++) indices.push(Math.round(i * step));
  indices.push(length - 1);
  return [...new Set(indices)];
}

function formatChartDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatXP(n) {
  if (n == null)        return '—';
  if (n >= 1_000_000)   return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000)       return `${(n / 1_000).toFixed(1)} kB`;
  return `${n} B`;
}