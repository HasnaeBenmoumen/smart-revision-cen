// ─── MODULES CONFIG ───────────────────────────────────────────────────────────
const MODULES = [
  { id: 'neuro',       name: 'Introduction à la neuroéducation', icon: '🧠', color: 'purple' },
  { id: 'design',      name: 'Design Thinking',                  icon: '💡', color: 'yellow' },
  { id: 'prompt',      name: 'Ingénierie du prompting',          icon: '⚡', color: 'blue'   },
  { id: 'entrepre',    name: 'Culture entrepreneuriale',         icon: '🚀', color: 'orange' },
  { id: 'edtech',      name: 'Technologies de l\'éducation',     icon: '💻', color: 'cyan'   },
  { id: 'methodo',     name: 'Méthodologie de recherche',        icon: '🔬', color: 'green'  },
  { id: 'semio',       name: 'Sémiotique et Communication',      icon: '🗣️', color: 'pink'   },
  { id: 'seminaire',   name: 'Séminaire de recherche',           icon: '📚', color: 'indigo' },
];

const COLOR_MAP = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400' },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400'   },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
  cyan:   { bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'border-cyan-200',   dot: 'bg-cyan-400'   },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-400'  },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   dot: 'bg-pink-400'   },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-400' },
};

// Spaced repetition intervals in days
const INTERVALS = [1, 3, 7];

// ─── STATE ────────────────────────────────────────────────────────────────────
let notions = [];
let streak = 0;
let lastActiveDate = null;
let currentFilter = 'all';
let activeQuizId = null;
let isCardFlipped = false;

// ─── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  loadFromStorage();
  populateModuleSelect();
  renderDateHeader();
  renderAll();
  checkStreakReset();
}

function loadFromStorage() {
  notions = JSON.parse(localStorage.getItem('sr_notions') || '[]');
  streak = parseInt(localStorage.getItem('sr_streak') || '0');
  lastActiveDate = localStorage.getItem('sr_lastActive') || null;
}

function saveToStorage() {
  localStorage.setItem('sr_notions', JSON.stringify(notions));
  localStorage.setItem('sr_streak', streak.toString());
  localStorage.setItem('sr_lastActive', lastActiveDate || '');
}

function populateModuleSelect() {
  const sel = document.getElementById('moduleSelect');
  MODULES.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.icon} ${m.name}`;
    sel.appendChild(opt);
  });
}

function renderDateHeader() {
  const el = document.getElementById('todayDate');
  const now = new Date();
  el.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── STREAK ───────────────────────────────────────────────────────────────────
function checkStreakReset() {
  const today = todayStr();
  if (lastActiveDate && lastActiveDate !== today) {
    const last = new Date(lastActiveDate);
    const diff = Math.floor((new Date(today) - last) / 86400000);
    if (diff > 1) { streak = 0; saveToStorage(); }
  }
  document.getElementById('streakCount').textContent = streak;
}

function incrementStreak() {
  const today = todayStr();
  if (lastActiveDate !== today) {
    streak++;
    lastActiveDate = today;
    saveToStorage();
    document.getElementById('streakCount').textContent = streak;
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getStatus(notion) {
  const today = todayStr();
  const nextDate = notion.revisionDates[notion.currentStep];
  if (!nextDate) return 'done';
  if (nextDate <= today) return 'today';
  return 'upcoming';
}

function getModule(id) {
  return MODULES.find(m => m.id === id) || MODULES[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── ADD NOTION ───────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById('addModal').classList.remove('hidden');
  document.getElementById('addForm').reset();
}

function closeAddModal() {
  document.getElementById('addModal').classList.add('hidden');
}

function addNotion(e) {
  e.preventDefault();
  const moduleId = document.getElementById('moduleSelect').value;
  const title    = document.getElementById('conceptTitle').value.trim();
  const question = document.getElementById('conceptQuestion').value.trim();
  const answer   = document.getElementById('conceptAnswer').value.trim();

  const today = todayStr();
  const notion = {
    id: Date.now().toString(),
    moduleId,
    title,
    question,
    answer,
    createdAt: today,
    revisionDates: INTERVALS.map(d => addDays(today, d)),
    currentStep: 0,
    completedSteps: [],
  };

  notions.unshift(notion);
  saveToStorage();
  closeAddModal();
  renderAll();
}

// ─── FILTER ───────────────────────────────────────────────────────────────────
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active-filter'));
  document.getElementById('filter-' + f).classList.add('active-filter');
  renderCards();
}

function getFilteredNotions() {
  return notions.filter(n => {
    const s = getStatus(n);
    if (currentFilter === 'all') return true;
    if (currentFilter === 'today') return s === 'today';
    if (currentFilter === 'done') return s === 'done';
    if (currentFilter === 'upcoming') return s === 'upcoming';
    return true;
  });
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderAll() {
  updateCounts();
  renderCards();
  document.getElementById('streakCount').textContent = streak;
  const done = notions.filter(n => getStatus(n) === 'done').length;
  document.getElementById('totalDone').textContent = done;
}

function updateCounts() {
  const all      = notions.length;
  const today    = notions.filter(n => getStatus(n) === 'today').length;
  const done     = notions.filter(n => getStatus(n) === 'done').length;
  const upcoming = notions.filter(n => getStatus(n) === 'upcoming').length;

  document.getElementById('count-all').textContent      = all;
  document.getElementById('count-today').textContent    = today;
  document.getElementById('count-done').textContent     = done;
  document.getElementById('count-upcoming').textContent = upcoming;
}

function renderCards() {
  const grid  = document.getElementById('cardsGrid');
  const empty = document.getElementById('emptyState');
  const items = getFilteredNotions();

  grid.innerHTML = '';

  if (items.length === 0) {
    empty.classList.remove('hidden');
    empty.classList.add('flex');
    return;
  }

  empty.classList.add('hidden');
  empty.classList.remove('flex');

  items.forEach(n => {
    grid.appendChild(buildCard(n));
  });
}

function buildCard(notion) {
  const mod    = getModule(notion.moduleId);
  const colors = COLOR_MAP[mod.color];
  const status = getStatus(notion);
  const nextDate = notion.revisionDates[notion.currentStep];
  const step   = notion.currentStep + 1;
  const totalSteps = INTERVALS.length;

  const card = document.createElement('div');
  card.className = `card-hover bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4 cursor-default`;

  // Status badge
  let badgeHtml = '';
  if (status === 'today') {
    badgeHtml = `<span class="badge-today text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1"><i class="fa-solid fa-bell text-xs"></i> À réviser</span>`;
  } else if (status === 'done') {
    badgeHtml = `<span class="badge-done text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1"><i class="fa-solid fa-check text-xs"></i> Validée</span>`;
  } else {
    badgeHtml = `<span class="badge-upcoming text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1"><i class="fa-solid fa-clock text-xs"></i> ${formatDate(nextDate)}</span>`;
  }

  // Progress dots
  let dotsHtml = '';
  for (let i = 0; i < totalSteps; i++) {
    const filled = i < notion.currentStep || status === 'done';
    dotsHtml += `<div class="w-2 h-2 rounded-full ${filled ? colors.dot : 'bg-slate-200'}"></div>`;
  }

  // Revision schedule
  let scheduleHtml = notion.revisionDates.map((d, i) => {
    const done = i < notion.currentStep || status === 'done';
    return `<span class="text-xs px-2 py-0.5 rounded-full ${done ? 'bg-green-100 text-green-600 line-through' : 'bg-slate-100 text-slate-500'}">J+${INTERVALS[i]}</span>`;
  }).join('');

  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-9 h-9 ${colors.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0">${mod.icon}</div>
        <div class="min-w-0">
          <p class="text-xs font-medium ${colors.text} truncate">${mod.name}</p>
          <h3 class="text-sm font-semibold text-slate-800 leading-tight mt-0.5 line-clamp-2">${notion.title}</h3>
        </div>
      </div>
      ${badgeHtml}
    </div>

    <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">${notion.question}</p>

    <div class="flex items-center justify-between">
      <div class="flex gap-1 items-center">
        ${dotsHtml}
        <span class="text-xs text-slate-400 ml-1">${status === 'done' ? '3/3' : `${notion.currentStep}/3`}</span>
      </div>
      <div class="flex gap-1">${scheduleHtml}</div>
    </div>

    <div class="flex gap-2 pt-1 border-t border-slate-50">
      ${status !== 'done' ? `
        <button onclick="openQuiz('${notion.id}')" class="flex-1 gradient-bg text-white text-xs font-semibold py-2.5 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-play text-xs"></i> Réviser
        </button>
      ` : `
        <button onclick="openQuiz('${notion.id}')" class="flex-1 bg-slate-100 text-slate-600 text-xs font-semibold py-2.5 rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-eye text-xs"></i> Revoir
        </button>
      `}
      <button onclick="deleteNotion('${notion.id}')" class="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition text-xs">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;

  return card;
}

// ─── QUIZ ─────────────────────────────────────────────────────────────────────
function openQuiz(id) {
  const notion = notions.find(n => n.id === id);
  if (!notion) return;

  activeQuizId = id;
  isCardFlipped = false;

  const mod = getModule(notion.moduleId);
  document.getElementById('quizModuleIcon').textContent = mod.icon;
  document.getElementById('quizModuleName').textContent = mod.name;
  document.getElementById('quizQuestion').textContent = notion.question;
  document.getElementById('quizAnswer').textContent = notion.answer;

  const inner = document.getElementById('quizCardInner');
  inner.classList.remove('flipped');

  document.getElementById('quizModal').classList.remove('hidden');
}

function closeQuizModal() {
  document.getElementById('quizModal').classList.add('hidden');
  activeQuizId = null;
}

function flipQuizCard() {
  isCardFlipped = !isCardFlipped;
  const inner = document.getElementById('quizCardInner');
  inner.classList.toggle('flipped', isCardFlipped);
}

function markRevision(success) {
  if (!activeQuizId) return;
  const notion = notions.find(n => n.id === activeQuizId);
  if (!notion) return;

  if (success) {
    if (notion.currentStep < INTERVALS.length) {
      notion.completedSteps.push(notion.currentStep);
      notion.currentStep++;
    }
    incrementStreak();
  }

  saveToStorage();
  closeQuizModal();
  renderAll();
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
function deleteNotion(id) {
  if (!confirm('Supprimer cette notion ?')) return;
  notions = notions.filter(n => n.id !== id);
  saveToStorage();
  renderAll();
}

// ─── FILTER STYLES ────────────────────────────────────────────────────────────
const styleEl = document.createElement('style');
styleEl.textContent = `
  .filter-btn {
    background: white;
    color: #64748b;
    border: 1px solid #e2e8f0;
  }
  .filter-btn:hover {
    background: #f8fafc;
  }
  .active-filter {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    border-color: transparent !important;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
document.head.appendChild(styleEl);

// ─── CLOSE MODALS ON OVERLAY CLICK ───────────────────────────────────────────
document.getElementById('addModal').addEventListener('click', function(e) {
  if (e.target === this) closeAddModal();
});
document.getElementById('quizModal').addEventListener('click', function(e) {
  if (e.target === this) closeQuizModal();
});

// ─── START ────────────────────────────────────────────────────────────────────


init();
