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
//  CHART 1 — XP over time (line chart)
// ============================================
function renderXPChart(transactions) {
  const container = document.getElementById('chartXPBody');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;">No XP data found.</p>`;
    return;
  }

  // Build cumulative XP points
  let cumulative = 0;
  const points = transactions.map(t => {
    cumulative += t.amount;
    return {
      date:  new Date(t.createdAt),
      xp:    cumulative,
    };
  });

  // SVG dimensions
  const W      = 600;
  const H      = 200;
  const PAD    = { top: 16, right: 16, bottom: 36, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top  - PAD.bottom;

  // Scales
  const minDate  = points[0].date.getTime();
  const maxDate  = points[points.length - 1].date.getTime();
  const maxXP    = points[points.length - 1].xp;

  const scaleX = (date) =>
    PAD.left + ((date.getTime() - minDate) / (maxDate - minDate || 1)) * innerW;

  const scaleY = (xp) =>
    PAD.top + innerH - (xp / (maxXP || 1)) * innerH;

  // Build polyline points string
  const polylinePoints = points
    .map(p => `${scaleX(p.date).toFixed(1)},${scaleY(p.xp).toFixed(1)}`)
    .join(' ');

  // Area fill path (close below the line)
  const firstX = scaleX(points[0].date).toFixed(1);
  const lastX  = scaleX(points[points.length - 1].date).toFixed(1);
  const baseY  = (PAD.top + innerH).toFixed(1);

  const areaPath =
    `M ${firstX},${baseY} ` +
    points.map(p => `L ${scaleX(p.date).toFixed(1)},${scaleY(p.xp).toFixed(1)}`).join(' ') +
    ` L ${lastX},${baseY} Z`;

  // Y-axis labels (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    value: Math.round(maxXP * f),
    y:     scaleY(maxXP * f),
  }));

  // X-axis labels (first + last + 2 middle)
  const xLabelIndices = getSpreadIndices(points.length, 4);
  const xLabels = xLabelIndices.map(i => ({
    label: formatChartDate(points[i].date),
    x:     scaleX(points[i].date),
  }));

  // Tooltip dots — only every Nth point to avoid clutter
  const step = Math.max(1, Math.floor(points.length / 20));
  const dots = points
    .filter((_, i) => i % step === 0 || i === points.length - 1)
    .map(p => ({
      cx:    scaleX(p.date).toFixed(1),
      cy:    scaleY(p.xp).toFixed(1),
      label: `${formatChartDate(p.date)}: ${formatXP(p.xp)}`,
    }));

  container.innerHTML = `
    <svg
      viewBox="0 0 ${W} ${H}"
      xmlns="http://www.w3.org/2000/svg"
      style="width:100%;height:auto;overflow:visible;"
      role="img"
      aria-label="XP over time chart"
    >
      <defs>
        <!-- Gradient fill under line -->
        <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#8b5cf6" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.01"/>
        </linearGradient>

        <!-- Clip to chart area -->
        <clipPath id="xpClip">
          <rect
            x="${PAD.left}" y="${PAD.top}"
            width="${innerW}" height="${innerH}"
          />
        </clipPath>
      </defs>

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

      <!-- Area fill (clipped) -->
      <path
        d="${areaPath}"
        fill="url(#xpGradient)"
        clip-path="url(#xpClip)"
      />

      <!-- Line (clipped) -->
      <polyline
        points="${polylinePoints}"
        fill="none"
        stroke="#8b5cf6"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
        clip-path="url(#xpClip)"
      />

      <!-- Interactive dots with tooltips -->
      ${dots.map(d => `
        <circle
          cx="${d.cx}" cy="${d.cy}" r="3"
          fill="#8b5cf6" stroke="#fff" stroke-width="1.5"
          clip-path="url(#xpClip)"
        >
          <title>${d.label}</title>
        </circle>
      `).join('')}

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
  const W   = 220;
  const H   = 220;
  const cx  = W / 2;
  const cy  = H / 2;
  const R   = 76;   // outer radius
  const r   = 50;   // inner radius (donut hole)

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
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">

      <!-- Donut SVG -->
      <svg
        viewBox="0 0 ${W} ${H}"
        xmlns="http://www.w3.org/2000/svg"
        style="width:160px;height:160px;flex-shrink:0;"
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
      <div style="display:flex;flex-direction:column;gap:14px;">

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