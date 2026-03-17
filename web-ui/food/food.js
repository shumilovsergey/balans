(function () {

// ── Persistent state across screen navigations ────────────
if (!window._food) {
  window._food = {
    MEAL_DB: [
      { id: 1, name: 'Oatmeal',           category: 'morning', grams: 250, calories: 230, protein: 8,  fat: 4,  carbs: 40 },
      { id: 2, name: 'Eggs & Toast',      category: 'morning', grams: 200, calories: 380, protein: 20, fat: 15, carbs: 35 },
      { id: 3, name: 'Greek Yogurt',      category: 'morning', grams: 150, calories: 120, protein: 12, fat: 3,  carbs: 10 },
      { id: 4, name: 'Chicken Salad',     category: 'day',     grams: 350, calories: 420, protein: 35, fat: 12, carbs: 28 },
      { id: 5, name: 'Pasta Bolognese',   category: 'day',     grams: 400, calories: 550, protein: 22, fat: 18, carbs: 70 },
      { id: 6, name: 'Vegetable Soup',    category: 'day',     grams: 300, calories: 180, protein: 8,  fat: 5,  carbs: 25 },
      { id: 7, name: 'Grilled Salmon',    category: 'evening', grams: 300, calories: 480, protein: 42, fat: 22, carbs: 2  },
      { id: 8, name: 'Steak & Veggies',   category: 'evening', grams: 400, calories: 620, protein: 50, fat: 28, carbs: 15 },
      { id: 9, name: 'Cottage Cheese',    category: 'evening', grams: 200, calories: 180, protein: 24, fat: 5,  carbs: 8  },
    ],
    nextId:   10,
    todayLog: new Set(),
  };
}

const st = window._food;

// ── Local UI state ────────────────────────────────────────
let curSec  = 'morning';
let formCat = 'morning';

// ── SVG icons ─────────────────────────────────────────────
const ICO_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>`;
const ICO_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const ICO_PLUS  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

// ── Panel switching ───────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.food-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('panel-' + name).classList.remove('hidden');
}

// ── Render meal list ──────────────────────────────────────
function renderList() {
  const list  = document.getElementById('meal-list');
  const meals = st.MEAL_DB.filter(m => m.category === curSec);

  const mealsHtml = meals.map(m => {
    const sel = st.todayLog.has(m.id);
    return `
      <div class="meal-card ${sel ? 'selected' : ''}">
        <button class="sel-circle" data-id="${m.id}" title="Select">${ICO_CHECK}</button>
        <div class="meal-info">
          <div class="meal-name">${m.name}</div>
          <div class="meal-meta">P·${m.protein}g &nbsp;F·${m.fat}g &nbsp;C·${m.carbs}g &nbsp;·&nbsp; ${m.grams}g</div>
        </div>
        <span class="meal-kcal">${m.calories}</span>
        <button class="del-circle" data-id="${m.id}" title="Delete">${ICO_TRASH}</button>
      </div>`;
  }).join('');

  list.innerHTML = mealsHtml + `
    <div class="add-row">
      <div class="add-circle">${ICO_PLUS}</div>
    </div>`;

  list.querySelectorAll('.sel-circle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = +btn.dataset.id;
      st.todayLog.has(id) ? st.todayLog.delete(id) : st.todayLog.add(id);
      renderList();
      updateSummary();
    });
  });

  list.querySelectorAll('.del-circle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = +btn.dataset.id;
      st.MEAL_DB = st.MEAL_DB.filter(m => m.id !== id);
      st.todayLog.delete(id);
      renderList();
      updateSummary();
    });
  });

  list.querySelector('.add-row').addEventListener('click', () => openForm());
}

// ── Summary ───────────────────────────────────────────────
function updateSummary() {
  const selected = st.MEAL_DB.filter(m => st.todayLog.has(m.id));
  const total = selected.reduce((a, m) => ({
    kcal: a.kcal + m.calories,
    p:    a.p    + m.protein,
    f:    a.f    + m.fat,
    c:    a.c    + m.carbs,
  }), { kcal: 0, p: 0, f: 0, c: 0 });

  document.getElementById('total-kcal').textContent = total.kcal;
  const macrosEl = document.getElementById('log-macros');
  if (selected.length === 0) {
    macrosEl.textContent = 'Select meals above';
  } else {
    macrosEl.innerHTML = `P&nbsp;${total.p.toFixed(0)}g<br>F&nbsp;${total.f.toFixed(0)}g &nbsp;C&nbsp;${total.c.toFixed(0)}g`;
  }
}

// ── Tabs ──────────────────────────────────────────────────
function initTabs() {
  document.getElementById('select-tabs').querySelectorAll('.sec-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('select-tabs').querySelectorAll('.sec-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      curSec = btn.dataset.sec;
      renderList();
    });
  });
}

// ── Form panel ────────────────────────────────────────────
function openForm() {
  formCat = curSec;

  ['f-name', 'f-grams', 'f-kcal', 'f-protein', 'f-fat', 'f-carbs'].forEach(fid => {
    document.getElementById(fid).value = '';
  });

  document.getElementById('form-cat-toggle').querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === formCat);
  });

  showPanel('form');
  document.getElementById('f-name').focus();
}

function closeForm() {
  showPanel('select');
}

function saveMeal() {
  const name     = document.getElementById('f-name').value.trim();
  const grams    = parseFloat(document.getElementById('f-grams').value)   || 0;
  const calories = parseFloat(document.getElementById('f-kcal').value)    || 0;
  const protein  = parseFloat(document.getElementById('f-protein').value) || 0;
  const fat      = parseFloat(document.getElementById('f-fat').value)     || 0;
  const carbs    = parseFloat(document.getElementById('f-carbs').value)   || 0;

  if (!name) { document.getElementById('f-name').focus(); return; }

  st.MEAL_DB.push({ id: st.nextId++, name, category: formCat, grams, calories, protein, fat, carbs });

  // Switch back and show the tab matching the saved category
  curSec = formCat;
  document.getElementById('select-tabs').querySelectorAll('.sec-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sec === curSec);
  });

  showPanel('select');
  renderList();
}

function initCatToggle() {
  document.getElementById('form-cat-toggle').querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('form-cat-toggle').querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      formCat = btn.dataset.cat;
    });
  });
}

// ── Boot ──────────────────────────────────────────────────
initTabs();
initCatToggle();

document.getElementById('btn-save-log').addEventListener('click', () => {
  const btn = document.getElementById('btn-save-log');
  btn.style.background = 'var(--day)';
  setTimeout(() => { btn.style.background = ''; }, 1200);
});

document.getElementById('btn-close-form').addEventListener('click', closeForm);
document.getElementById('btn-save-meal').addEventListener('click', saveMeal);

renderList();
updateSummary();

})();
