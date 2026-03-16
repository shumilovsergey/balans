// ═══════════════════════════════════════════════════════
//  DATA — hardcoded mock
//  Future: replace with  await fetch('/api/weight').then(r => r.json())
//  Expected shape: [{ date: 'YYYY-MM-DD', kg: number }, ...]
// ═══════════════════════════════════════════════════════
const WEIGHT_DATA = [
  { date: '2026-01-01', kg: 87.2 },
  { date: '2026-01-03', kg: 86.9 },
  { date: '2026-01-05', kg: 87.1 },
  { date: '2026-01-07', kg: 86.8 },
  { date: '2026-01-09', kg: 86.5 },
  { date: '2026-01-11', kg: 86.7 },
  { date: '2026-01-13', kg: 86.4 },
  { date: '2026-01-15', kg: 86.2 },
  { date: '2026-01-17', kg: 86.5 },
  { date: '2026-01-19', kg: 86.0 },
  { date: '2026-01-21', kg: 85.9 },
  { date: '2026-01-23', kg: 86.1 },
  { date: '2026-01-25', kg: 85.7 },
  { date: '2026-01-27', kg: 85.5 },
  { date: '2026-01-29', kg: 85.3 },
  { date: '2026-01-31', kg: 85.6 },
  { date: '2026-02-02', kg: 85.2 },
  { date: '2026-02-04', kg: 85.0 },
  { date: '2026-02-06', kg: 85.3 },
  { date: '2026-02-08', kg: 84.9 },
  { date: '2026-02-10', kg: 84.7 },
  { date: '2026-02-12', kg: 85.0 },
  { date: '2026-02-14', kg: 84.6 },
  { date: '2026-02-16', kg: 84.4 },
  { date: '2026-02-18', kg: 84.7 },
  { date: '2026-02-20', kg: 84.3 },
  { date: '2026-02-22', kg: 84.1 },
  { date: '2026-02-24', kg: 84.3 },
  { date: '2026-02-26', kg: 84.0 },
  { date: '2026-02-28', kg: 83.8 },
  { date: '2026-03-02', kg: 83.6 },
  { date: '2026-03-04', kg: 83.9 },
  { date: '2026-03-06', kg: 83.5 },
  { date: '2026-03-08', kg: 83.3 },
  { date: '2026-03-10', kg: 83.6 },
  { date: '2026-03-12', kg: 83.2 },
  { date: '2026-03-14', kg: 83.1 },
  { date: '2026-03-16', kg: 83.0 },
  // 2026-03-17 (today) — not entered yet, user fills via input
];

// ── Config ──────────────────────────────────────────────
const TODAY = '2026-03-17';
let currentPeriod = 'week';

// Runtime today entry (persists across period switches this session)
let todayEntry = WEIGHT_DATA.find(d => d.date === TODAY) || null;

// ── Helpers ─────────────────────────────────────────────
function parseDate(str) { return new Date(str + 'T00:00:00'); }

function getFilteredData(period) {
  const now = parseDate(TODAY);
  const cutoff = new Date(now);
  if (period === 'week')  cutoff.setDate(cutoff.getDate() - 6);
  if (period === 'month') cutoff.setDate(cutoff.getDate() - 29);
  if (period === 'year')  cutoff.setFullYear(cutoff.getFullYear() - 1);

  const base = WEIGHT_DATA.filter(d => parseDate(d.date) >= cutoff);
  // Inject today's entry if saved this session
  if (todayEntry && !base.find(d => d.date === TODAY)) {
    base.push(todayEntry);
  }
  return base.sort((a, b) => a.date.localeCompare(b.date));
}

function fmt(kg) { return kg.toFixed(1) + ' kg'; }

function xLabel(dateStr, period) {
  const d = parseDate(dateStr);
  if (period === 'week')  return d.toLocaleDateString('en', { weekday: 'short' });
  if (period === 'month') return d.getDate() + '/' + (d.getMonth() + 1);
  return d.toLocaleDateString('en', { month: 'short' });
}

// ── Smooth path (Catmull-Rom → cubic bezier) ────────────
function smoothPath(pts) {
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const t = 0.35;
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x},${p2.y}`;
  }
  return d;
}

// ── Draw chart ──────────────────────────────────────────
let _chartPts  = [];  // current screen points — shared with interaction layer
let _chartMeta = {}; // PAD, W, H, cW, cH

function drawChart(data) {
  const svg = document.getElementById('weight-chart');
  if (!svg) return;

  const W = svg.clientWidth  || 280;
  const H = svg.clientHeight || 160;
  const PAD = { top: 12, right: 12, bottom: 28, left: 36 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top  - PAD.bottom;

  if (data.length === 0) {
    svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle"
      fill="#9E9088" font-size="13" font-family="DM Sans,sans-serif">No data</text>`;
    _chartPts = [];
    return;
  }

  const weights  = data.map(d => d.kg);
  const minKg    = Math.min(...weights) - 1.5;
  const maxKg    = Math.max(...weights) + 1.5;
  const dates    = data.map(d => parseDate(d.date).getTime());
  const minTs    = dates[0];
  const maxTs    = dates[dates.length - 1];
  const rangeTs  = maxTs - minTs || 1;

  function xPx(ts) { return PAD.left + ((ts - minTs) / rangeTs) * cW; }
  function yPx(kg) { return PAD.top  + (1 - (kg - minKg) / (maxKg - minKg)) * cH; }

  const pts = data.map(d => ({
    x: xPx(parseDate(d.date).getTime()),
    y: yPx(d.kg),
    kg: d.kg,
    date: d.date,
  }));

  _chartPts  = pts;
  _chartMeta = { PAD, W, H, cW, cH };

  const linePath = smoothPath(pts);
  const areaPath = linePath
    + ` L ${pts[pts.length-1].x},${PAD.top + cH}`
    + ` L ${pts[0].x},${PAD.top + cH} Z`;

  // Y grid + labels
  const yLevels  = [minKg + 1, (minKg + maxKg) / 2, maxKg - 1];
  const gridLines = yLevels.map(kg => {
    const y = yPx(kg);
    return `
      <line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W - PAD.right}" y2="${y.toFixed(1)}"
        stroke="rgba(26,24,23,.06)" stroke-width="1"/>
      <text x="${PAD.left - 4}" y="${(y + 4).toFixed(1)}"
        text-anchor="end" fill="#9E9088" font-size="9" font-family="DM Sans,sans-serif">
        ${kg.toFixed(0)}
      </text>`;
  }).join('');

  // X labels
  const labelCount = Math.min(data.length, currentPeriod === 'week' ? 7 : currentPeriod === 'month' ? 5 : 6);
  const step = Math.max(1, Math.floor(data.length / labelCount));
  const xLabels = data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map(d => {
      const x = xPx(parseDate(d.date).getTime());
      return `<text x="${x.toFixed(1)}" y="${H - 4}"
        text-anchor="middle" fill="#9E9088" font-size="9" font-family="DM Sans,sans-serif">
        ${xLabel(d.date, currentPeriod)}
      </text>`;
    }).join('');

  // Today dashed marker
  const todayX = xPx(parseDate(TODAY).getTime());
  const todayMarker = (todayX >= PAD.left && todayX <= W - PAD.right && !todayEntry)
    ? `<line x1="${todayX.toFixed(1)}" y1="${PAD.top}" x2="${todayX.toFixed(1)}" y2="${PAD.top + cH}"
        stroke="#C4895A" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>`
    : '';

  // Dots — pointer-events:none so overlay stays in control
  const dots = pts.map(p => {
    const isToday = p.date === TODAY;
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}"
      r="${isToday ? 4 : 2.5}"
      fill="${isToday ? '#B84C2A' : '#fff'}"
      stroke="#B84C2A" stroke-width="${isToday ? 2 : 1.5}"
      pointer-events="none"/>`;
  }).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#B84C2A" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#B84C2A" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridLines}
    <path d="${areaPath}" fill="url(#areaGrad)"/>
    <path d="${linePath}" fill="none" stroke="#B84C2A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${todayMarker}
    ${dots}
    ${xLabels}
  `;

  // Re-attach interaction overlay after innerHTML wipe
  attachChartInteraction();
}

// ── Chart interaction (Grafana-style crosshair + tooltip) ──
function attachChartInteraction() {
  const svg     = document.getElementById('weight-chart');
  const tooltip = document.getElementById('chart-tooltip');
  if (!svg || !tooltip || _chartPts.length === 0) return;

  const { PAD, W, H, cW, cH } = _chartMeta;

  // Transparent overlay captures all pointer events
  const ns = 'http://www.w3.org/2000/svg';
  const overlay = document.createElementNS(ns, 'rect');
  overlay.setAttribute('x', PAD.left);
  overlay.setAttribute('y', PAD.top);
  overlay.setAttribute('width', cW);
  overlay.setAttribute('height', cH);
  overlay.setAttribute('fill', 'transparent');
  overlay.style.cursor = 'crosshair';
  svg.appendChild(overlay);

  // Crosshair group (vertical line + snapping dot)
  const g = document.createElementNS(ns, 'g');

  const vline = document.createElementNS(ns, 'line');
  vline.setAttribute('y1', PAD.top);
  vline.setAttribute('y2', PAD.top + cH);
  vline.setAttribute('stroke', 'rgba(26,24,23,0.22)');
  vline.setAttribute('stroke-width', '1');
  vline.setAttribute('stroke-dasharray', '4,3');

  const snapDot = document.createElementNS(ns, 'circle');
  snapDot.setAttribute('r', '5');
  snapDot.setAttribute('fill', '#B84C2A');
  snapDot.setAttribute('stroke', '#fff');
  snapDot.setAttribute('stroke-width', '2.5');

  g.appendChild(vline);
  g.appendChild(snapDot);
  g.style.display = 'none';
  g.setAttribute('pointer-events', 'none'); // never intercept — overlay handles all
  svg.appendChild(g);

  function clientXFromEvent(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function onPointerMove(e) {
    if (_chartPts.length === 0) return;
    const svgRect = svg.getBoundingClientRect();
    const rawX    = (clientXFromEvent(e) - svgRect.left) * (W / svgRect.width);

    // Snap to nearest data point
    let nearest = _chartPts[0];
    for (const p of _chartPts) {
      if (Math.abs(p.x - rawX) < Math.abs(nearest.x - rawX)) nearest = p;
    }

    // Move crosshair
    g.style.display = '';
    vline.setAttribute('x1', nearest.x);
    vline.setAttribute('x2', nearest.x);
    snapDot.setAttribute('cx', nearest.x);
    snapDot.setAttribute('cy', nearest.y);

    // Format tooltip content
    const d = parseDate(nearest.date);
    const dateStr = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    tooltip.innerHTML = `
      <div class="tt-date">${dateStr}</div>
      <div class="tt-row">
        <span class="tt-dot"></span>
        <span class="tt-val">${nearest.kg} kg</span>
      </div>`;
    tooltip.style.display = 'block';

    // Position tooltip — flip left if near right edge
    const wrapRect  = svg.closest('.chart-wrap').getBoundingClientRect();
    const cursorX   = clientXFromEvent(e) - wrapRect.left;
    const ttW       = tooltip.offsetWidth || 120;
    const margin    = 10;
    const leftPos   = cursorX + margin + ttW > wrapRect.width
      ? cursorX - ttW - margin
      : cursorX + margin;
    tooltip.style.left = Math.max(4, leftPos) + 'px';
    tooltip.style.top  = '10px';
  }

  function onPointerLeave() {
    g.style.display  = 'none';
    tooltip.style.display = 'none';
  }

  overlay.addEventListener('mousemove',  onPointerMove);
  overlay.addEventListener('mouseleave', onPointerLeave);
  overlay.addEventListener('touchmove',  e => { e.preventDefault(); onPointerMove(e); }, { passive: false });
  overlay.addEventListener('touchend',   onPointerLeave);
}

// ── Update stats ─────────────────────────────────────────
function updateStats(data) {
  if (data.length === 0) {
    ['stat-avg','stat-min','stat-max'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    return;
  }
  const weights = data.map(d => d.kg);
  const avg = weights.reduce((s, v) => s + v, 0) / weights.length;
  document.getElementById('stat-avg').textContent = avg.toFixed(1);
  document.getElementById('stat-min').textContent = Math.min(...weights).toFixed(1);
  document.getElementById('stat-max').textContent = Math.max(...weights).toFixed(1);
}

// ── Refresh (period switch or data update) ───────────────
function refresh() {
  const data = getFilteredData(currentPeriod);
  drawChart(data);
  updateStats(data);
}

// ── Today input ──────────────────────────────────────────
function initTodayInput() {
  const input  = document.getElementById('weight-input');
  const btn    = document.getElementById('save-btn');
  const note   = document.getElementById('save-note');
  const label  = document.getElementById('today-date-label');

  const d = parseDate(TODAY);
  label.textContent = d.toLocaleDateString('en', { month: 'long', day: 'numeric' });

  // Pre-fill if today already has a value
  if (todayEntry) {
    input.value = todayEntry.kg;
    note.textContent = 'Saved today — you can still update it';
  }

  btn.addEventListener('click', () => {
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 30 || val > 300) {
      note.textContent = 'Enter a valid weight (30–300 kg)';
      return;
    }

    // Save/overwrite today's entry
    todayEntry = { date: TODAY, kg: Math.round(val * 10) / 10 };

    // Update WEIGHT_DATA in place (future: POST /api/weight)
    const idx = WEIGHT_DATA.findIndex(d => d.date === TODAY);
    if (idx >= 0) WEIGHT_DATA[idx] = todayEntry;
    else WEIGHT_DATA.push(todayEntry);

    const now = new Date();
    const time = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    note.textContent = `Saved at ${time}`;

    refresh(); // re-draw chart with new point
  });
}

// ── Period toggle ────────────────────────────────────────
function initPeriodToggle() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      refresh();
    });
  });
}

// ── Boot ─────────────────────────────────────────────────
initPeriodToggle();
initTodayInput();
refresh();
